#!/usr/bin/env node
/**
 * cwos — CLI do módulo de escrita criativa (escrita/).
 *
 * Operações determinísticas sobre o projeto ativo: scaffolding, validação,
 * índice de canon, análise de dependências, contexto seletivo, contagens,
 * menções de entidades, estilometria, clichés e diffs de estado de canon.
 *
 * Zero dependências (Node >= 18). Uso: node scripts/cwos.mjs help
 */
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(process.env.CWOS_ROOT || path.join(path.dirname(fileURLToPath(import.meta.url)), '..'));
const PROJECTS = path.join(ROOT, 'escrita', 'projetos');
const TEMPLATES = path.join(ROOT, 'escrita', 'templates');
const DATA = path.join(ROOT, 'scripts', 'data');

const STATUSES = ['CANON', 'PROVISIONAL', 'PROPOSTA', 'REJEITADO', 'RETCON'];
const STAGES = ['rascunho', 'revisto', 'final'];
const CONFIDENCE = ['VERIFIED', 'LIKELY', 'UNCERTAIN', 'FICTIONALIZED'];
const REF_FIELDS = ['depends_on', 'pov', 'characters', 'location', 'prev', 'events', 'facts', 'superseded_by'];
const REQUIRED_FILES = ['PROJECT.md', 'project/brief.md', 'project/style-guide.md', 'editorial/decisions.md'];
const SKIP_DIRS = ['archive/', 'editorial/', 'export/', 'manuscript/drafts/'];
const PROSE_DIRS = ['manuscript/scenes/', 'manuscript/chapters/'];
const ID_RE = /^[a-z][a-z0-9]*-[a-z0-9-]+$/;
const WORD_RE = /[\p{L}\p{N}]+(?:[-'’][\p{L}\p{N}]+)*/gu;
const MENTIONABLE = ['character', 'location', 'culture', 'institution', 'technology', 'history', 'object'];

// type -> prefixo de id, pastas candidatas (a primeira que existir), template
const TYPES = {
  character: { prefix: 'char-', dirs: ['characters'], tpl: 'character.md' },
  location: { prefix: 'loc-', dirs: ['world/locations', 'world'], tpl: 'world-entry.md' },
  culture: { prefix: 'cul-', dirs: ['world/cultures', 'world'], tpl: 'world-entry.md' },
  institution: { prefix: 'inst-', dirs: ['world/institutions', 'world'], tpl: 'world-entry.md' },
  technology: { prefix: 'tech-', dirs: ['world/technology', 'world'], tpl: 'world-entry.md' },
  history: { prefix: 'hist-', dirs: ['world/history', 'world'], tpl: 'world-entry.md' },
  object: { prefix: 'obj-', dirs: ['world/objects', 'world'], tpl: 'world-entry.md' },
  scene: { prefix: 'sc-', dirs: ['manuscript/scenes'], tpl: 'scene.md' },
  fact: { prefix: 'fact-', dirs: ['research/notes'], tpl: 'research-note.md' },
  event: { prefix: 'ev-', dirs: [], tpl: null }, // linhas da tabela em story/timeline.md
  report: { prefix: '', dirs: ['editorial/reports'], tpl: 'editorial-report.md' },
  qa: { prefix: '', dirs: ['editorial/qa', 'editorial/reports'], tpl: 'qa-report.md' },
};

const BASE_FILES = {
  'PROJECT.md': 'project.md',
  'project/brief.md': 'brief.md',
  'project/style-guide.md': 'style-guide.md',
  'story/premise.md': 'premise.md',
  'story/outline.md': 'outline.md',
  'story/timeline.md': 'timeline.md',
  'research/sources.md': 'sources.md',
  'editorial/decisions.md': 'decisions.md',
};
const SHORT_DIRS = ['characters', 'world', 'research/notes', 'manuscript/scenes', 'editorial/reports', 'archive'];
const LONG_DIRS = [...SHORT_DIRS, 'manuscript/chapters', 'editorial/qa'];
const LONG_FILES = { ...BASE_FILES, 'story/structure.md': 'structure.md', 'world/rules.md': 'world-rules.md' };
const PROFILES = {
  short: { dirs: SHORT_DIRS, files: BASE_FILES },
  long: { dirs: LONG_DIRS, files: LONG_FILES },
  universe: {
    dirs: [...LONG_DIRS, ...['locations', 'cultures', 'institutions', 'technology', 'history', 'objects'].map((d) => `world/${d}`)],
    files: LONG_FILES,
  },
};

// ---------------------------------------------------------------- utilidades

const read = (f) => fs.readFileSync(f, 'utf8');
const arr = (v) => (Array.isArray(v) ? v : v ? [v] : []).map(String).filter(Boolean);
const today = () => new Date().toISOString().slice(0, 10);
const fold = (s) => s.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase();
const escapeRe = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const posix = (p) => p.split(path.sep).join('/');

class CliError extends Error {}

export function parseFrontmatter(text) {
  const m = text.match(/^---\r?\n([\s\S]*?)\r?\n---[ \t]*(?:\r?\n|$)/);
  if (!m) return { data: null, body: text };
  const data = {};
  let lastKey = null;
  for (const raw of m[1].split(/\r?\n/)) {
    if (!raw.trim() || raw.trim().startsWith('#')) continue;
    const item = raw.match(/^\s+-\s+(.*)$/);
    if (item && lastKey) {
      if (!Array.isArray(data[lastKey])) data[lastKey] = [];
      data[lastKey].push(scalar(item[1]));
      continue;
    }
    const kv = raw.match(/^([A-Za-z_][\w-]*):\s*(.*)$/);
    if (!kv) continue;
    lastKey = kv[1];
    data[kv[1]] = parseValue(kv[2]);
  }
  return { data, body: text.slice(m[0].length) };
}

function scalar(s) {
  s = s.trim();
  return /^(["']).*\1$/.test(s) ? s.slice(1, -1) : s;
}

function parseValue(v) {
  v = v.replace(/\s+#.*$/, '').trim();
  if (v.startsWith('[') && v.endsWith(']')) return v.slice(1, -1).split(',').map(scalar).filter(Boolean);
  return scalar(v);
}

export function parseTable(body) {
  const lines = body.split(/\r?\n/).filter((l) => /^\s*\|/.test(l));
  if (lines.length < 2) return [];
  const cells = (l) => l.trim().replace(/^\||\|$/g, '').split('|').map((c) => c.trim());
  const header = cells(lines[0]).map((h) => fold(h));
  return lines
    .slice(2)
    .map((l) => {
      const c = cells(l);
      return Object.fromEntries(header.map((h, j) => [h, c[j] ?? '']));
    })
    .filter((r) => Object.values(r).some(Boolean));
}

/**
 * Texto narrativo de um ficheiro: a secção "## Texto" se existir, senão o corpo todo.
 * O que fica de fora é substituído por linhas vazias, para os números de linha baterem certo.
 */
export function proseOf(body) {
  const blank = (s) => s.replace(/[^\n]/g, '');
  body = body.replace(/<!--[\s\S]*?-->/g, blank);
  const m = body.match(/^##\s+Texto\s*$/m);
  if (m) {
    const start = m.index + m[0].length;
    const end = body.slice(start).search(/^##\s+/m);
    const stop = end === -1 ? body.length : start + end;
    body = blank(body.slice(0, start)) + body.slice(start, stop) + blank(body.slice(stop));
  }
  return body
    .split('\n')
    .map((l) => (/^\s*#/.test(l) ? '' : l))
    .join('\n');
}

/** Número de linhas ocupadas pelo frontmatter (para converter linhas do corpo em linhas do ficheiro). */
const headerLines = (text, body) => text.slice(0, text.length - body.length).split('\n').length - 1;

function walk(dir) {
  if (!fs.existsSync(dir)) return [];
  const out = [];
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) out.push(...walk(p));
    else if (e.name.endsWith('.md')) out.push(p);
  }
  return out.sort();
}

function levenshtein(a, b) {
  const dp = Array.from({ length: b.length + 1 }, (_, j) => j);
  for (let i = 1; i <= a.length; i++) {
    let prev = dp[0];
    dp[0] = i;
    for (let j = 1; j <= b.length; j++) {
      const tmp = dp[j];
      dp[j] = Math.min(dp[j] + 1, dp[j - 1] + 1, prev + (a[i - 1] === b[j - 1] ? 0 : 1));
      prev = tmp;
    }
  }
  return dp[b.length];
}

function fill(template, vars) {
  return template.replace(/\{\{(\w+)\}\}/g, (all, k) => (k in vars ? vars[k] : all));
}

// ---------------------------------------------------------------- projeto

function activeSlug() {
  const f = path.join(PROJECTS, 'ACTIVE.md');
  if (!fs.existsSync(f)) return null;
  const m = read(f).match(/^@([\w.-]+)\/PROJECT\.md/m);
  return m ? m[1] : null;
}

function projectDir(flags) {
  const slug = flags.project || activeSlug();
  if (!slug) throw new CliError('Nenhum projeto ativo. Usa `cwos new <slug>` ou `cwos use <slug>`.');
  const dir = path.join(PROJECTS, slug);
  if (!fs.existsSync(dir)) throw new CliError(`Projeto não encontrado: escrita/projetos/${slug}`);
  return { slug, dir };
}

function writeActive(slug) {
  fs.mkdirSync(PROJECTS, { recursive: true });
  const body = slug
    ? `<!-- Gerido por \`node scripts/cwos.mjs use <slug>\`. Não editar à mão. -->\nProjeto ativo: \`escrita/projetos/${slug}/\` — os caminhos de projeto (story/, characters/, ...) são relativos a esta pasta.\n\n@${slug}/PROJECT.md\n`
    : `<!-- Gerido por \`node scripts/cwos.mjs use <slug>\`. -->\nNenhum projeto ativo. Cria um com \`node scripts/cwos.mjs new <slug>\`.\n`;
  fs.writeFileSync(path.join(PROJECTS, 'ACTIVE.md'), body);
}

function loadDocs(dir) {
  return walk(dir)
    .map((f) => {
      const rel = posix(path.relative(dir, f));
      const text = read(f);
      const { data, body } = parseFrontmatter(text);
      return { rel, data, body, offset: headerLines(text, body) };
    })
    .filter((d) => !SKIP_DIRS.some((s) => d.rel.startsWith(s)));
}

function buildModel(dir) {
  const docs = loadDocs(dir);
  const entities = new Map();
  const errors = [];
  const add = (e) => {
    if (entities.has(e.id)) errors.push(`id duplicado "${e.id}": ${entities.get(e.id).rel} e ${e.rel}`);
    else entities.set(e.id, e);
  };
  for (const d of docs) {
    if (!d.data?.id) continue;
    add({
      id: d.data.id,
      type: d.data.type,
      name: d.data.name || d.data.title || d.data.id,
      aliases: arr(d.data.aliases),
      status: d.data.status,
      stage: d.data.stage,
      rel: d.rel,
      data: d.data,
    });
  }
  const tl = docs.find((d) => d.rel === 'story/timeline.md');
  if (tl) {
    for (const row of parseTable(tl.body)) {
      if (!ID_RE.test(row.id || '')) continue;
      add({
        id: row.id,
        type: 'event',
        name: row.evento || row.id,
        aliases: [],
        status: row.status,
        rel: 'story/timeline.md',
        data: {
          ord: row.ord,
          characters: (row.personagens || '').split(/[,;\s]+/).filter((x) => ID_RE.test(x)),
          location: ID_RE.test(row.local || '') ? row.local : '',
        },
      });
    }
  }
  const reverse = new Map();
  for (const e of entities.values()) {
    for (const [field, target] of refsOf(e)) {
      if (!reverse.has(target)) reverse.set(target, []);
      reverse.get(target).push({ from: e.id, field });
    }
  }
  return { docs, entities, reverse, errors };
}

function refsOf(e) {
  return REF_FIELDS.flatMap((f) => arr(e.data[f]).map((t) => [f, t]));
}

function namesOf(e) {
  return [e.name, ...e.aliases].filter((n) => n && n.length >= 3 && !n.includes('{{'));
}

function mentionRe(name) {
  return new RegExp(`(?<![\\p{L}\\p{N}])${escapeRe(name)}(?![\\p{L}\\p{N}])`, 'gu');
}

function proseFiles(dir, docs, files) {
  if (files.length) {
    return files.map((f) => {
      const abs = path.resolve(f);
      const text = read(abs);
      const { body } = parseFrontmatter(text);
      return { rel: posix(path.relative(dir, abs)), text: '\n'.repeat(headerLines(text, body)) + proseOf(body) };
    });
  }
  return docs
    .filter((d) => PROSE_DIRS.some((p) => d.rel.startsWith(p)))
    .map((d) => ({ rel: d.rel, text: '\n'.repeat(d.offset) + proseOf(d.body) }));
}

// ---------------------------------------------------------------- comandos

function cmdNew([slug], flags) {
  if (!slug || !/^[a-z0-9][a-z0-9-]*$/.test(slug)) throw new CliError('Uso: new <slug> [--profile short|long|universe] [--title "Título"]');
  const profile = flags.profile || 'short';
  const p = PROFILES[profile];
  if (!p) throw new CliError(`Perfil desconhecido: ${profile}. Opções: ${Object.keys(PROFILES).join(', ')}`);
  const dir = path.join(PROJECTS, slug);
  if (fs.existsSync(dir)) throw new CliError(`Já existe: escrita/projetos/${slug}`);
  const vars = { slug, title: flags.title || slug, profile, date: today() };
  for (const d of p.dirs) fs.mkdirSync(path.join(dir, d), { recursive: true });
  for (const [dest, tpl] of Object.entries(p.files)) {
    const out = path.join(dir, dest);
    fs.mkdirSync(path.dirname(out), { recursive: true });
    fs.writeFileSync(out, fill(read(path.join(TEMPLATES, tpl)), vars));
  }
  writeActive(slug);
  console.log(`Criado escrita/projetos/${slug} (perfil ${profile}) e definido como projeto ativo.`);
  console.log('Próximo passo: /brief <ideia>');
}

function cmdUse([slug]) {
  if (!slug) throw new CliError('Uso: use <slug>  (ou "use --none")');
  if (slug === '--none') return writeActive(null);
  if (!fs.existsSync(path.join(PROJECTS, slug, 'PROJECT.md'))) throw new CliError(`Projeto inválido: escrita/projetos/${slug}`);
  writeActive(slug);
  console.log(`Projeto ativo: ${slug}`);
}

function cmdAdd([type, id, ...nameParts], flags) {
  const t = TYPES[type];
  if (!t || !t.tpl) throw new CliError(`Uso: add <${Object.keys(TYPES).filter((k) => TYPES[k].tpl).join('|')}> <id> [nome]`);
  if (!id || (t.prefix && (!id.startsWith(t.prefix) || !ID_RE.test(id)))) {
    throw new CliError(`id inválido para ${type}: deve ser minúsculas com prefixo "${t.prefix}" (ex.: ${t.prefix || 'relatorio-'}exemplo)`);
  }
  const { dir } = projectDir(flags);
  const { entities } = buildModel(dir);
  if (entities.has(id)) throw new CliError(`id já existe: ${id} (${entities.get(id).rel})`);
  const sub = t.dirs.find((d) => fs.existsSync(path.join(dir, d))) || t.dirs[0];
  const name = nameParts.join(' ') || id;
  const fileName = (type === 'report' || type === 'qa') && !/^\d{4}-/.test(id) ? `${today()}-${id}.md` : `${id}.md`;
  const out = path.join(dir, sub, fileName);
  if (fs.existsSync(out)) throw new CliError(`Ficheiro já existe: ${posix(path.relative(dir, out))}`);
  fs.mkdirSync(path.dirname(out), { recursive: true });
  fs.writeFileSync(out, fill(read(path.join(TEMPLATES, t.tpl)), { id, name, type, date: today() }));
  console.log(posix(path.relative(ROOT, out)));
}

export function validate(dir) {
  const { docs, entities, errors } = buildModel(dir);
  const warnings = [];
  for (const f of REQUIRED_FILES) if (!fs.existsSync(path.join(dir, f))) errors.push(`ficheiro obrigatório em falta: ${f}`);

  for (const d of docs) {
    const inScenes = d.rel.startsWith('manuscript/scenes/');
    const inNotes = d.rel.startsWith('research/notes/');
    const needsFm = ['story/', 'characters/', 'world/'].some((p) => d.rel.startsWith(p)) || inScenes || inNotes;
    if (/(^|\/)(index|README)\.md$/.test(d.rel)) continue;
    if (!d.data) {
      if (needsFm) errors.push(`${d.rel}: sem frontmatter`);
      continue;
    }
    if (JSON.stringify(d.data).includes('{{')) warnings.push(`${d.rel}: frontmatter com placeholders {{...}} por preencher`);
    if (!needsFm) continue;
    const need = ['id', 'type', inScenes ? 'stage' : inNotes ? 'confidence' : 'status'];
    for (const k of need) if (!d.data[k]) errors.push(`${d.rel}: campo "${k}" em falta`);
  }

  for (const e of entities.values()) {
    const where = e.type === 'event' ? `${e.rel} [${e.id}]` : e.rel;
    const t = TYPES[e.type];
    if (t?.prefix && !e.id.startsWith(t.prefix)) warnings.push(`${where}: id "${e.id}" não usa o prefixo "${t.prefix}" do tipo ${e.type}`);
    if (e.type === 'scene') {
      if (!STAGES.includes(e.stage)) errors.push(`${where}: stage inválido "${e.stage}" (${STAGES.join('|')})`);
    } else if (e.type === 'fact') {
      if (!CONFIDENCE.includes(e.data.confidence)) errors.push(`${where}: confidence inválida "${e.data.confidence}" (${CONFIDENCE.join('|')})`);
    } else if (e.status !== undefined && !STATUSES.includes(e.status)) {
      errors.push(`${where}: status inválido "${e.status}" (${STATUSES.join('|')})`);
    }
    if (e.status === 'RETCON' && !e.data.superseded_by) warnings.push(`${where}: RETCON sem "superseded_by"`);
    for (const [field, target] of refsOf(e)) {
      const t2 = entities.get(target);
      if (!t2) {
        errors.push(`${where}: ${field} → "${target}" não existe`);
        continue;
      }
      if (field === 'superseded_by') continue;
      if (e.status === 'CANON' && ['REJEITADO', 'RETCON'].includes(t2.status)) {
        errors.push(`${where}: CANON depende de "${target}" que está ${t2.status}`);
      } else if (e.status === 'CANON' && t2.status === 'PROPOSTA') {
        warnings.push(`${where}: CANON assenta em "${target}" que ainda é PROPOSTA`);
      }
      if (e.type === 'scene' && ['REJEITADO', 'RETCON'].includes(t2.status)) {
        errors.push(`${where}: cena usa "${target}" que está ${t2.status}`);
      } else if (e.type === 'scene' && e.stage === 'final' && t2.status && t2.status !== 'CANON') {
        warnings.push(`${where}: cena final usa "${target}" que não é CANON (${t2.status})`);
      }
    }
  }

  const srcDoc = docs.find((d) => d.rel === 'research/sources.md');
  const sourceIds = new Set(srcDoc ? parseTable(srcDoc.body).map((r) => r.id || r['#']).filter(Boolean) : []);
  for (const e of entities.values()) {
    if (e.type !== 'fact') continue;
    for (const s of arr(e.data.sources)) {
      if (!/^https?:/.test(s) && !sourceIds.has(s)) warnings.push(`${e.rel}: fonte "${s}" não está em research/sources.md`);
    }
  }

  const events = [...entities.values()].filter((e) => e.type === 'event');
  for (let i = 1; i < events.length; i++) {
    const a = events[i - 1].data.ord;
    const b = events[i].data.ord;
    if (!a || !b) continue;
    const bad = !isNaN(a) && !isNaN(b) ? Number(b) < Number(a) : b < a;
    if (bad) warnings.push(`story/timeline.md: "${events[i].id}" (ord ${b}) vem depois de "${events[i - 1].id}" (ord ${a}) — fora de ordem`);
  }
  return { errors, warnings, count: entities.size };
}

function cmdValidate(_, flags) {
  const { slug, dir } = projectDir(flags);
  const { errors, warnings, count } = validate(dir);
  for (const e of errors) console.log(`ERRO    ${e}`);
  for (const w of warnings) console.log(`AVISO   ${w}`);
  console.log(`\n${slug}: ${count} entidades · ${errors.length} erro(s) · ${warnings.length} aviso(s)`);
  if (errors.length) process.exitCode = 1;
}

function cmdIndex(_, flags) {
  const { slug, dir } = projectDir(flags);
  const { entities, reverse, errors } = buildModel(dir);
  const all = [...entities.values()];
  const byStatus = STATUSES.map((s) => `${s} ${all.filter((e) => e.status === s).length}`).join(' · ');
  const link = (rel) => `[${rel}](../${rel})`;
  const out = [
    '# Canon Index',
    '',
    `> Gerado por \`node scripts/cwos.mjs index\` em ${today()} para \`${slug}\`. Não editar à mão — edita os ficheiros de origem.`,
    '',
    `**${all.length} entidades** — ${byStatus}`,
    '',
  ];
  if (errors.length) out.push(`> ⚠ ${errors.length} erro(s) de modelo — corre \`cwos validate\`.`, '');
  const types = [...new Set(all.map((e) => e.type || '(sem tipo)'))].sort();
  for (const type of types) {
    const rows = all.filter((e) => (e.type || '(sem tipo)') === type).sort((a, b) => (type === 'event' ? 0 : a.id.localeCompare(b.id)));
    const isScene = type === 'scene';
    const isFact = type === 'fact';
    out.push(`## ${type}`, '', `| id | nome | ${isScene ? 'stage' : isFact ? 'confiança' : 'status'} | ficheiro | depende de | referido por |`, '|---|---|---|---|---|---|');
    for (const e of rows) {
      const deps = refsOf(e).map(([, t]) => t);
      const by = [...new Set((reverse.get(e.id) || []).map((r) => r.from))];
      const state = isScene ? e.stage : isFact ? e.data.confidence : e.status;
      const name = [e.name, ...e.aliases].join(' / ').replace(/\|/g, '\\|');
      out.push(`| ${e.id} | ${name} | ${state || '—'} | ${link(e.rel)} | ${deps.join(', ') || '—'} | ${by.join(', ') || '—'} |`);
    }
    out.push('');
  }
  const outFile = path.join(dir, 'editorial', 'canon-index.md');
  if (flags.check) {
    // Compara sem a linha com a data de geração; não escreve nada.
    const strip = (s) => s.replace(/^> Gerado por .*$/m, '');
    const current = fs.existsSync(outFile) ? read(outFile) : '';
    const fresh = strip(current) === strip(out.join('\n'));
    console.log(fresh ? 'canon-index atualizado.' : 'canon-index DESATUALIZADO ou em falta — corre `cwos index`.');
    if (!fresh) process.exitCode = 1;
    return;
  }
  fs.mkdirSync(path.dirname(outFile), { recursive: true });
  fs.writeFileSync(outFile, out.join('\n'));
  console.log(`Escrito escrita/projetos/${slug}/editorial/canon-index.md (${all.length} entidades)`);
}

function cmdDeps([id], flags) {
  if (!id) throw new CliError('Uso: deps <id>');
  const { dir } = projectDir(flags);
  const { docs, entities, reverse } = buildModel(dir);
  const e = entities.get(id);
  if (!e) throw new CliError(`id desconhecido: ${id}`);
  console.log(`${e.id} — ${e.name} [${e.status || e.stage || '—'}] (${e.rel})\n`);
  console.log('Depende de:');
  for (const [f, t] of refsOf(e)) console.log(`  ${f}: ${t}${entities.has(t) ? ` (${entities.get(t).rel})` : '  ✗ NÃO EXISTE'}`);
  console.log('\nImpacto (quem depende disto, transitivo):');
  const seen = new Set([id]);
  let frontier = [id];
  let depth = 1;
  let any = false;
  while (frontier.length) {
    const next = [];
    for (const cur of frontier) {
      for (const r of reverse.get(cur) || []) {
        if (seen.has(r.from)) continue;
        seen.add(r.from);
        next.push(r.from);
        any = true;
        const src = entities.get(r.from);
        console.log(`  ${'  '.repeat(depth - 1)}${depth}. ${r.from} via ${r.field} → ${cur} [${src.status || src.stage || '—'}] (${src.rel})`);
      }
    }
    frontier = next;
    depth++;
  }
  if (!any) console.log('  (nenhuma referência estruturada)');
  const names = namesOf(e);
  if (names.length) {
    console.log(`\nMenções textuais (${names.join(', ')}):`);
    let found = false;
    for (const d of docs) {
      if (d.rel === e.rel) continue;
      const lines = d.body.split(/\r?\n/);
      const hits = lines.flatMap((l, i) => (names.some((n) => mentionRe(n).test(l)) ? [i + 1 + d.offset] : []));
      if (hits.length) {
        found = true;
        console.log(`  ${d.rel}: linhas ${hits.slice(0, 12).join(', ')}${hits.length > 12 ? ' …' : ''}`);
      }
    }
    if (!found) console.log('  (nenhuma)');
  }
}

function cmdContext([id], flags) {
  if (!id) throw new CliError('Uso: context <scene-id>');
  const { slug, dir } = projectDir(flags);
  const { entities } = buildModel(dir);
  const sc = entities.get(id);
  if (!sc) throw new CliError(`id desconhecido: ${id}`);
  const list = new Map();
  const push = (rel, why) => {
    if (rel && fs.existsSync(path.join(dir, rel)) && !list.has(rel)) list.set(rel, why);
  };
  push(sc.rel, 'a própria cena / scene sheet');
  push('project/style-guide.md', 'voz e regras de estilo');
  push('project/brief.md', 'direção criativa (ler só se ainda não estiver em contexto)');
  const missing = [];
  for (const [field, t] of refsOf(sc)) {
    const e = entities.get(t);
    if (!e) {
      missing.push(t);
      continue;
    }
    if (field === 'prev') push(e.rel, `cena anterior (${t}) — ler sobretudo o final`);
    else push(e.rel, `${field}: ${t}`);
    if (e.type === 'location' || e.type === 'institution') push('world/rules.md', 'regras do mundo');
  }
  if (!sc.data.prev) push('story/outline.md', 'posição da cena no outline');
  console.log(`Contexto mínimo para ${id} (escrita/projetos/${slug}/):`);
  for (const [rel, why] of list) console.log(`  ${rel}  — ${why}`);
  if (missing.length) console.log(`\n✗ referências por resolver: ${missing.join(', ')}`);
}

function cmdWc(files, flags) {
  const { dir } = projectDir(flags);
  const docs = loadDocs(dir);
  const project = parseFrontmatter(read(path.join(dir, 'PROJECT.md'))).data || {};
  let total = 0;
  for (const { rel, text } of proseFiles(dir, docs, files)) {
    const n = (text.match(WORD_RE) || []).length;
    total += n;
    console.log(`${String(n).padStart(8)}  ${rel}`);
  }
  const target = Number(project.target_words);
  console.log(`${String(total).padStart(8)}  TOTAL${target ? `  (${Math.round((total / target) * 100)}% de ${target})` : ''}`);
}

function cmdMentions(files, flags) {
  const { dir } = projectDir(flags);
  const { docs, entities } = buildModel(dir);
  const prose = proseFiles(dir, docs, files);
  const ents = [...entities.values()].filter((e) => MENTIONABLE.includes(e.type));
  console.log('Menções por entidade:');
  for (const e of ents) {
    const counts = prose
      .map(({ rel, text }) => [rel, namesOf(e).reduce((s, n) => s + (text.match(mentionRe(n)) || []).length, 0)])
      .filter(([, n]) => n);
    const flag = counts.length && e.status && e.status !== 'CANON' ? `  ⚠ ${e.status}` : '';
    console.log(`  ${e.id.padEnd(24)} ${counts.map(([r, n]) => `${r}×${n}`).join(', ') || '—'}${flag}`);
  }
  const byRel = new Map([...entities.values()].filter((e) => e.type === 'scene').map((e) => [e.rel, e]));
  const undeclared = [];
  for (const { rel, text } of prose) {
    const sc = byRel.get(rel);
    if (!sc) continue;
    const declared = new Set(refsOf(sc).map(([, t]) => t));
    for (const e of ents) {
      if (!declared.has(e.id) && namesOf(e).some((n) => mentionRe(n).test(text))) undeclared.push(`${rel}: ${e.id}`);
    }
  }
  console.log('\nMencionados no texto mas ausentes do frontmatter da cena:');
  console.log(undeclared.length ? undeclared.map((u) => `  ${u}`).join('\n') : '  (nenhum)');
  const known = new Set(ents.flatMap((e) => namesOf(e).flatMap((n) => n.match(WORD_RE) || [])));
  const unknown = new Map();
  for (const { rel, text } of prose) {
    for (const m of text.matchAll(/\p{Lu}[\p{L}’'-]+/gu)) {
      const w = m[0];
      if (w.length < 3 || known.has(w)) continue;
      const before = text.slice(0, m.index).replace(/[ \t]+$/, '');
      const prev = before.slice(-1);
      const afterTitle = /(?<![\p{L}])(?:D|Dr|Dra|Sr|Sra|Srª|Prof|Profª|Eng|Mr|Mrs|Ms)\.$/u.test(before);
      if (!afterTitle && (!prev || /[\n.!?…—–:«"“(*_]/.test(prev))) continue; // início de frase ou fala
      if (!unknown.has(w)) unknown.set(w, new Set());
      unknown.get(w).add(rel);
    }
  }
  console.log('\nNomes próprios não indexados (fora de início de frase):');
  if (!unknown.size) console.log('  (nenhum)');
  for (const [w, rels] of unknown) console.log(`  ${w.padEnd(20)} ${[...rels].join(', ')}`);
  const pool = [...new Set([...known, ...unknown.keys()])];
  const pairs = [];
  for (let i = 0; i < pool.length; i++) {
    for (let j = i + 1; j < pool.length; j++) {
      const [a, b] = [pool[i], pool[j]];
      if (fold(a) === fold(b) || (Math.min(a.length, b.length) >= 5 && levenshtein(fold(a), fold(b)) === 1)) pairs.push(`${a} ≈ ${b}`);
    }
  }
  console.log('\nGrafias possivelmente inconsistentes:');
  console.log(pairs.length ? pairs.map((p) => `  ${p}`).join('\n') : '  (nenhuma)');
}

export function styleMetrics(text) {
  const words = text.match(WORD_RE) || [];
  const flat = text.replace(/\s+/g, ' ').trim();
  const sentences = flat ? flat.split(/(?<=[.!?…])\s+(?=[—–«"“\p{Lu}\p{N}])/u).filter((s) => (s.match(WORD_RE) || []).length) : [];
  const lens = sentences.map((s) => (s.match(WORD_RE) || []).length);
  const mean = lens.reduce((a, b) => a + b, 0) / (lens.length || 1);
  const sd = Math.sqrt(lens.reduce((a, b) => a + (b - mean) ** 2, 0) / (lens.length || 1));
  const paras = text.split(/\n\s*\n/).map((p) => p.trim()).filter(Boolean);
  const dialogue = paras.filter((p) => /^[—–«"“]/.test(p)).length;
  const lower = words.map((w) => w.toLowerCase());
  const mente = lower.filter((w) => w.length > 6 && w.endsWith('mente')).length;
  const freq = new Map();
  for (const w of lower) if (w.length >= 5) freq.set(w, (freq.get(w) || 0) + 1);
  const r1 = (x) => Math.round(x * 10) / 10;
  return {
    palavras: words.length,
    frases: lens.length,
    media_frase: r1(mean),
    desvio_frase: r1(sd),
    frases_curtas_pct: r1((100 * lens.filter((l) => l < 8).length) / (lens.length || 1)),
    frases_longas_pct: r1((100 * lens.filter((l) => l > 30).length) / (lens.length || 1)),
    paragrafos: paras.length,
    media_paragrafo: r1(words.length / (paras.length || 1)),
    dialogo_pct: r1((100 * dialogue) / (paras.length || 1)),
    adverbios_mente_por_1000: r1((1000 * mente) / (words.length || 1)),
    ttr: r1((100 * new Set(lower).size) / (lower.length || 1)),
    repetidas: [...freq].filter(([, n]) => n >= 3).sort((a, b) => b[1] - a[1]).slice(0, 8).map(([w, n]) => `${w}×${n}`).join(', '),
  };
}

/** Com ficheiros explícitos, os comandos de texto funcionam sem projeto ativo (textos soltos). */
function textDir(files, flags) {
  if (!files.length) return projectDir(flags).dir;
  try {
    return projectDir(flags).dir;
  } catch (err) {
    if (err instanceof CliError) return ROOT;
    throw err;
  }
}

function cmdStyle(files, flags) {
  const dir = textDir(files, flags);
  const prose = proseFiles(dir, files.length ? [] : loadDocs(dir), files);
  const rows = prose.map(({ rel, text }) => [rel, styleMetrics(text)]);
  if (prose.length > 1) rows.push(['TOTAL', styleMetrics(prose.map((p) => p.text).join('\n\n'))]);
  for (const [rel, m] of rows) {
    console.log(`\n${rel}`);
    for (const [k, v] of Object.entries(m)) console.log(`  ${k.padEnd(26)} ${v}`);
  }
  if (!rows.length) console.log('Sem texto no manuscrito.');
}

function readList(f) {
  if (!fs.existsSync(f)) return [];
  return read(f).split(/\r?\n/).map((l) => l.replace(/#.*/, '').trim()).filter(Boolean);
}

function cmdCliches(files, flags) {
  const dir = textDir(files, flags);
  const projectFile = path.join(dir, 'PROJECT.md');
  const project = fs.existsSync(projectFile) ? parseFrontmatter(read(projectFile)).data || {} : {};
  const lang = String(project.language || 'pt').slice(0, 2).toLowerCase();
  const list = [...readList(path.join(DATA, `cliches-${lang}.txt`)), ...readList(path.join(dir, 'editorial/style/cliches-extra.txt'))];
  const allow = new Set(readList(path.join(dir, 'editorial/style/cliches-allow.txt')).map(fold));
  if (!list.length) throw new CliError(`Sem lista de clichés para "${lang}" (scripts/data/cliches-${lang}.txt)`);
  let hits = 0;
  for (const { rel, text } of proseFiles(dir, files.length ? [] : loadDocs(dir), files)) {
    text.split(/\r?\n/).forEach((line, i) => {
      const l = fold(line);
      for (const c of list) {
        if (l.includes(fold(c))) {
          hits++;
          console.log(`${rel}:${i + 1}  "${c}"${allow.has(fold(c)) ? '  [deliberado — avaliar execução]' : ''}`);
        }
      }
    });
  }
  console.log(`\n${hits} ocorrência(s). Um cliché não é automaticamente um erro: pergunta se é deliberado.`);
}

function cmdCanonDiff([ref = 'HEAD'], flags) {
  const { slug, dir } = projectDir(flags);
  const { entities } = buildModel(dir);
  const git = (...args) => execFileSync('git', ['-C', ROOT, ...args], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] });
  try {
    git('rev-parse', '--verify', ref);
  } catch {
    throw new CliError(`Referência git inválida ou repositório sem git: ${ref}`);
  }
  const oldCache = new Map();
  const readAt = (rel) => {
    if (!oldCache.has(rel)) {
      let text = null;
      try {
        text = git('show', `${ref}:escrita/projetos/${slug}/${rel}`);
      } catch {}
      oldCache.set(rel, text);
    }
    return oldCache.get(rel);
  };
  // Impressão digital do conteúdo de uma entidade, ignorando `updated` e fins de linha.
  const fingerprint = (e, text) => {
    const { data, body } = parseFrontmatter(text.replace(/\r\n/g, '\n'));
    if (e.type === 'event') {
      const row = parseTable(body).find((r) => r.id === e.id);
      return row ? { status: row.status, sig: JSON.stringify(row) } : null;
    }
    if (data?.id !== e.id) return null;
    const { updated, ...rest } = data;
    return { status: data.status, sig: JSON.stringify(rest) + body };
  };
  const nowText = (e) => read(path.join(dir, e.rel));
  const decisionsPath = path.join(dir, 'editorial/decisions.md');
  const decisions = fs.existsSync(decisionsPath) ? read(decisionsPath) : '';
  let changes = 0;
  let unlogged = 0;
  const oldDecisions = readAt('editorial/decisions.md') ?? '';
  const count = (text, id) => (text.match(mentionRe(id)) || []).length;
  const mark = (needsLog, logged) => (needsLog ? (logged ? '  ✓ registado' : '  ✗ SEM REGISTO em editorial/decisions.md') : '');
  let edits = 0;
  for (const e of entities.values()) {
    if (!e.status) continue;
    const oldText = readAt(e.rel);
    const before = oldText === null ? null : fingerprint(e, oldText);
    // Registado = o id aparece mais vezes em decisions.md do que aparecia em <ref> (entrada nova).
    const logged = count(decisions, e.id) > count(oldDecisions, e.id);
    if (before?.status !== e.status) {
      changes++;
      const needsLog = ['CANON', 'RETCON', 'REJEITADO'].includes(e.status);
      if (needsLog && !logged) unlogged++;
      console.log(`${e.id.padEnd(24)} ${before?.status ?? '(novo)'} → ${e.status}${mark(needsLog, logged)}`);
    } else if (e.status === 'CANON' && before.sig !== fingerprint(e, nowText(e))?.sig) {
      // Canon que mantém o estado mas mudou de conteúdo também exige registo.
      edits++;
      if (!logged) unlogged++;
      console.log(`${e.id.padEnd(24)} CANON com conteúdo alterado${mark(true, logged)}`);
    }
  }
  console.log(`\n${changes} alteração(ões) de estado e ${edits} de conteúdo em CANON desde ${ref}; ${unlogged} sem registo de decisão.`);
  if (unlogged) process.exitCode = 1;
}

function cmdHelp() {
  console.log(`cwos — CLI da área Escrita do Rumo  (node scripts/cwos.mjs <comando>)

Projeto
  new <slug> [--profile short|long|universe] [--title "T"]   cria projeto e ativa-o
  use <slug> | use --none                                   muda o projeto ativo
  add <tipo> <id> [nome]    cria ficheiro a partir do template
                            tipos: ${Object.keys(TYPES).filter((k) => TYPES[k].tpl).join(', ')}

Canon
  validate                  estrutura, frontmatter, referências, estados, timeline
  index [--check]           gera editorial/canon-index.md (--check: só verifica se está atual)
  deps <id>                 dependências + impacto transitivo + menções textuais
  canon-diff [ref]          mudanças de status (e de conteúdo em CANON) desde um commit
  context <scene-id>        lista mínima de ficheiros a ler antes de escrever/rever

Texto (default: todo o manuscript/; ou ficheiros indicados)
  wc [ficheiros]            contagem de palavras (vs target_words)
  mentions [ficheiros]      entidades mencionadas, não declaradas na cena, nomes não indexados, grafias
  style [ficheiros]         estilometria (frases, parágrafos, diálogo, repetições)
  cliches [ficheiros]       expressões gastas (scripts/data + editorial/style)

Opção global: --project <slug>`);
}

const COMMANDS = {
  new: cmdNew,
  use: cmdUse,
  add: cmdAdd,
  validate: cmdValidate,
  index: cmdIndex,
  deps: cmdDeps,
  context: cmdContext,
  wc: cmdWc,
  mentions: cmdMentions,
  style: cmdStyle,
  cliches: cmdCliches,
  'canon-diff': cmdCanonDiff,
  help: cmdHelp,
};

export function main(argv) {
  const [cmd = 'help', ...rest] = argv;
  const positional = [];
  const flags = {};
  for (let i = 0; i < rest.length; i++) {
    if (['--help', '-h'].includes(rest[i])) return cmdHelp();
    if (rest[i] === '--check') flags.check = true;
    else if (rest[i].startsWith('--') && rest[i] !== '--none') flags[rest[i].slice(2)] = rest[++i];
    else positional.push(rest[i]);
  }
  const unknown = Object.keys(flags).filter((k) => !['project', 'profile', 'title', 'check'].includes(k));
  if (unknown.length) {
    console.error(`cwos: opção desconhecida: --${unknown[0]}`);
    process.exitCode = 2;
    return;
  }
  const fn = COMMANDS[cmd];
  if (!fn) {
    console.error(`Comando desconhecido: ${cmd}\n`);
    cmdHelp();
    process.exitCode = 2;
    return;
  }
  try {
    fn(positional, flags);
  } catch (err) {
    if (!(err instanceof CliError)) throw err;
    console.error(`cwos: ${err.message}`);
    process.exitCode = 2;
  }
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) main(process.argv.slice(2));
