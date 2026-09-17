#!/usr/bin/env node
/**
 * sincronizar — junta os ficheiros locais com os dados do Rumo (a página no Claude).
 *
 * Fluxo (orquestrado pelo comando /sincronizar do Claude Code):
 *   1. O Claude lê os documentos da página (Artifact read_db → pasta com um .json por documento).
 *   2. `fundir --remoto <pasta> --saida <pasta>` funde tudo, a três vias, com a base da última
 *      sincronização, escreve os ficheiros locais e prepara os documentos a enviar + plano.json.
 *   3. O Claude envia-os (Artifact write_db) e, se correr bem, `confirmar` grava a nova base.
 *
 * Locais: rotina/tarefas.md · financas/movimentos/AAAA-MM.csv · financas/orcamento.csv ·
 *         financas/regras.csv · financas/contas.csv
 * Página: tarefas · fin-index · fin-AAAA-MM · orcamento · regras · contas
 *
 * Zero dependências (Node >= 18). Uso: node scripts/sincronizar.mjs help
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseTask, formatTask } from './rotina.mjs';
import { parseCsv, toNumber } from './financas.mjs';

const ROOT = path.resolve(process.env.ASSISTENTE_ROOT || path.join(path.dirname(fileURLToPath(import.meta.url)), '..'));
const TASKS_FILE = path.join(ROOT, 'rotina', 'tarefas.md');
const TASKS_MODEL = path.join(ROOT, 'rotina', 'tarefas.modelo.md');
const FIN = path.join(ROOT, 'financas');
const MOV = path.join(FIN, 'movimentos');
const SYNC = path.join(ROOT, '.sync');
const BASE = path.join(SYNC, 'base.json');
const PENDING = path.join(SYNC, 'base.pendente.json');
const SECTIONS = { inbox: 'Caixa de entrada', tasks: 'Tarefas', someday: 'Algum dia' };

class CliError extends Error {}

const fold = (s) => String(s ?? '').normalize('NFD').replace(/\p{M}/gu, '').toLowerCase().trim();
const readIf = (f) => (fs.existsSync(f) ? fs.readFileSync(f, 'utf8').replace(/^\uFEFF/, '') : null);
const json = (o) => JSON.stringify(o);
export const newId = () => Math.random().toString(36).slice(2, 8) + Date.now().toString(36).slice(-4);

/** Hash curto e determinístico (djb2) — ids estáveis para movimentos sem id. */
export function hashId(s) {
  let h = 5381;
  for (const ch of s) h = ((h << 5) + h + ch.codePointAt(0)) >>> 0;
  return `m${h.toString(36)}`;
}

// ---------------------------------------------------------------- tarefas

export function mdToTasks(text, today) {
  const lines = (text ?? '').split(/\r?\n/);
  const firstHeading = lines.findIndex((l) => /^##\s+/.test(l));
  const header = (firstHeading === -1 ? lines : lines.slice(0, firstHeading)).join('\n').trimEnd();
  const tasks = [];
  let section = '';
  let inComment = false;
  let assigned = 0;
  for (const line of lines) {
    const opens = line.includes('<!--');
    const closes = line.includes('-->');
    if (inComment || opens) {
      inComment = !closes && (inComment || opens);
      continue;
    }
    const h = line.match(/^##\s+(.*)$/);
    if (h) section = h[1].trim();
    const t = parseTask(line);
    if (!t) continue;
    if (!t.id) assigned++;
    tasks.push({
      id: t.id || newId(),
      t: t.title,
      p: t.prio,
      due: t.due || '',
      rep: t.repeat || '',
      adiada: t.postponed || 0,
      feita: t.doneOn || (t.done ? today : null),
      inbox: section === SECTIONS.inbox,
      algumDia: section === SECTIONS.someday,
      ctx: t.ctxs,
      est: t.est || '',
    });
  }
  return { tasks, header, assigned };
}

export function tasksToMd(tasks, header) {
  const line = (t) =>
    formatTask({
      done: !!t.feita,
      title: t.t,
      prio: Number(t.p) || 2,
      ctxs: t.ctx || [],
      due: t.due || undefined,
      est: t.est || undefined,
      repeat: t.rep || undefined,
      postponed: Number(t.adiada) || 0,
      doneOn: t.feita || undefined,
      id: t.id,
    });
  const block = (title, list) => [`## ${title}`, ...list.map(line)].join('\n');
  return `${[
    header || '# Tarefas',
    block(SECTIONS.inbox, tasks.filter((t) => t.inbox)),
    block(SECTIONS.tasks, tasks.filter((t) => !t.inbox && !t.algumDia)),
    block(SECTIONS.someday, tasks.filter((t) => !t.inbox && t.algumDia)),
  ].join('\n\n')}\n`;
}

const normTask = (x) => ({
  t: x.t || '',
  p: Number(x.p) || 2,
  due: x.due || '',
  rep: x.rep || '',
  adiada: Number(x.adiada) || 0,
  feita: x.feita || '',
  inbox: !!x.inbox,
  algumDia: !!x.algumDia,
});
export const sameTask = (a, b) => json(normTask(a)) === json(normTask(b));

/**
 * Fusão a três vias por id. Sem base (primeira vez), tudo o que existe de um lado entra.
 * `resolve(l, r)` escolhe quando os dois lados mudaram o mesmo registo.
 */
export function mergeById(local, remote, base, { same, resolve }) {
  const L = new Map(local.map((x) => [x.id, x]));
  const R = new Map(remote.map((x) => [x.id, x]));
  const B = new Map((base || []).map((x) => [x.id, x]));
  const order = [...L.keys(), ...[...R.keys()].filter((id) => !L.has(id))];
  const result = [];
  const conflicts = [];
  const stats = { fromLocal: 0, fromRemote: 0, deleted: 0 };
  for (const id of order) {
    const l = L.get(id);
    const r = R.get(id);
    const b = B.get(id);
    if (l && r) {
      if (same(l, r)) result.push({ ...r, ...l });
      else {
        const lChanged = !b || !same(l, b);
        const rChanged = !b || !same(r, b);
        if (lChanged && !rChanged) {
          result.push({ ...r, ...l });
          stats.fromLocal++;
        } else if (rChanged && !lChanged) {
          result.push({ ...l, ...r });
          stats.fromRemote++;
        } else {
          const w = resolve(l, r);
          result.push(w === l ? { ...r, ...l } : { ...l, ...r });
          conflicts.push({ id, what: 'alterado nos dois lados', chosen: w === l ? 'computador' : 'página', local: l, remote: r });
        }
      }
    } else if (l) {
      if (!b) {
        result.push(l);
        stats.fromLocal++;
      } else if (same(l, b)) stats.deleted++;
      else {
        result.push(l);
        conflicts.push({ id, what: 'apagado na página mas alterado no computador: mantido', chosen: 'computador', local: l });
      }
    } else if (!b) {
      result.push(r);
      stats.fromRemote++;
    } else if (same(r, b)) stats.deleted++;
    else {
      result.push(r);
      conflicts.push({ id, what: 'apagado no computador mas alterado na página: mantido', chosen: 'página', remote: r });
    }
  }
  return { result, conflicts, stats };
}

// Em conflito numa tarefa: ganha a que está feita; senão, a da página (normalmente a alteração mais recente).
const resolveTask = (l, r) => (l.feita && !r.feita ? l : r);

// ---------------------------------------------------------------- finanças

function readCsvTable(file) {
  const text = readIf(file) ?? readIf(file.replace(/\.csv$/, '.modelo.csv'));
  if (!text) return [];
  const first = text.split(/\r?\n/)[0];
  const sep = first.split(';').length >= first.split(',').length ? ';' : ',';
  const rows = parseCsv(text, sep);
  const head = (rows.shift() || []).map(fold);
  return rows.map((r) => Object.fromEntries(head.map((h, i) => [h, (r[i] ?? '').trim()])));
}
const cell = (v) => (/[;"\n]/.test(String(v)) ? `"${String(v).replace(/"/g, '""')}"` : String(v));
const writeCsv = (file, header, rows) => {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, `${[header.join(';'), ...rows.map((r) => r.map(cell).join(';'))].join('\n')}\n`);
};
const money = (n) => n.toFixed(2).replace('.', ',');

/** Dá a cada movimento um id determinístico (data, descrição, valor, conta e ocorrência). */
export function keyMovements(list) {
  const seen = new Map();
  return list.map((m) => {
    const k = [m.d, fold(m.desc), Number(m.v).toFixed(2), fold(m.acc)].join('|');
    const n = (seen.get(k) || 0) + 1;
    seen.set(k, n);
    return { ...m, id: hashId(`${k}#${n}`) };
  });
}
const sameMov = (a, b) => (a.cat || '') === (b.cat || '');
const resolveMov = (l, r) => (r.cat ? r : l);

function localMonths() {
  if (!fs.existsSync(MOV)) return {};
  const out = {};
  for (const f of fs.readdirSync(MOV).filter((x) => /^\d{4}-\d{2}\.csv$/.test(x))) {
    out[f.slice(0, 7)] = readCsvTable(path.join(MOV, f)).map((r) => ({
      d: r.data,
      desc: r.descricao,
      v: toNumber(r.valor),
      cat: r.categoria || '',
      acc: r.conta || '',
    }));
  }
  return out;
}

export function mergeMap(local, remote, base) {
  const out = {};
  const changes = [];
  for (const k of new Set([...Object.keys(local), ...Object.keys(remote)])) {
    const l = local[k];
    const r = remote[k];
    const b = base ? base[k] : undefined;
    let v;
    if (l === r) v = l;
    else if (l !== b && r === b) v = l;
    else if (r !== b && l === b) v = r;
    else {
      v = r ?? l;
      changes.push(`${k}: ${l ?? '—'} (computador) vs ${r ?? '—'} (página) → ${v}`);
    }
    if (v !== undefined && v !== null && v !== '' && Number(v) > 0) out[k] = Number(v);
  }
  return { result: out, conflicts: changes };
}

export function mergeRules(local, remote, base) {
  const eq = (a, b) => json(a) === json(b);
  if (eq(local, remote)) return { result: local, note: '' };
  if (base && eq(local, base)) return { result: remote, note: 'regras atualizadas a partir da página' };
  if (base && eq(remote, base)) return { result: local, note: 'regras atualizadas a partir do computador' };
  const seen = new Set(remote.map((r) => fold(r.p)));
  return {
    result: [...remote, ...local.filter((r) => !seen.has(fold(r.p)))],
    note: base ? 'regras alteradas nos dois lados: juntei as duas listas (ordem da página primeiro)' : '',
  };
}

const accId = (nome) => `acc-${hashId(fold(nome))}`;
const sameAcc = (a, b) => a.tipo === b.tipo && Number(a.saldo) === Number(b.saldo) && a.data === b.data;
const resolveAcc = (l, r) => ((l.data || '') > (r.data || '') ? l : r);

// ---------------------------------------------------------------- página

export function readRemote(dir) {
  const docs = {};
  const versions = {};
  const walk = (d) => {
    for (const e of fs.readdirSync(d, { withFileTypes: true })) {
      const p = path.join(d, e.name);
      if (e.isDirectory()) walk(p);
      else if (e.name === 'versoes.json') {
        // { "<documento>": <versão> } — escrito pelo Claude a partir da resposta do read_db.
        for (const [doc, v] of Object.entries(JSON.parse(fs.readFileSync(p, 'utf8')))) versions[doc] = Number(v);
      } else if (e.name.endsWith('.json')) {
        const raw = JSON.parse(fs.readFileSync(p, 'utf8'));
        const wrapped = raw && typeof raw === 'object' && raw.data && typeof raw.data === 'object' && ('version' in raw || 'updatedAt' in raw);
        docs[e.name.slice(0, -5)] = { data: wrapped ? raw.data : raw, version: wrapped ? raw.version : undefined };
      }
    }
  };
  if (fs.existsSync(dir)) walk(dir);
  for (const [doc, v] of Object.entries(versions)) if (docs[doc] && docs[doc].version === undefined) docs[doc].version = v;
  return docs;
}

// ---------------------------------------------------------------- fundir

export function fuse({ remote, today, base }) {
  const report = [];
  const send = {};
  const localWrites = [];

  // --- tarefas
  const md = readIf(TASKS_FILE);
  const { tasks: localTasks, header, assigned } = mdToTasks(md ?? readIf(TASKS_MODEL) ?? '', today);
  const remoteTasks = remote.tarefas?.data?.items;
  let finalTasks = localTasks;
  if (remoteTasks) {
    const m = mergeById(localTasks, remoteTasks, base?.tasks, { same: sameTask, resolve: resolveTask });
    finalTasks = m.result;
    report.push(`Tarefas: ${m.stats.fromLocal} do computador, ${m.stats.fromRemote} da página, ${m.stats.deleted} apagadas, ${m.conflicts.length} conflito(s).`);
    for (const c of m.conflicts) report.push(`  ⚠ "${(c.local || c.remote).t}": ${c.what} (ficou a versão do ${c.chosen})`);
  } else if (md !== null) {
    report.push(`Tarefas: a página ainda não tinha lista; enviadas ${localTasks.length}.`);
  }
  if (assigned) report.push(`  ${assigned} tarefa(s) receberam um id (id:…) no tarefas.md.`);
  if (md !== null || remoteTasks) {
    const newMd = tasksToMd(finalTasks, header || (md === null ? '# Tarefas' : ''));
    if (newMd !== md) localWrites.push({ file: TASKS_FILE, content: newMd });
    if (!remoteTasks || json(remoteTasks) !== json(finalTasks)) send.tarefas = { items: finalTasks };
  }

  // --- finanças
  const lMonths = localMonths();
  const remoteIndex = remote['fin-index']?.data?.months;
  const localBudgetRows = readCsvTable(path.join(FIN, 'orcamento.csv'));
  const localBudget = Object.fromEntries(localBudgetRows.filter((r) => toNumber(r.limite) > 0).map((r) => [r.categoria, toNumber(r.limite)]));
  const localHasFinance = Object.keys(lMonths).length > 0 || Object.keys(localBudget).length > 0;
  const nextBase = { tasks: finalTasks.map((t) => ({ ...t })), months: {}, budget: {}, rules: [], accounts: [] };

  if (remoteIndex || localHasFinance) {
    const months = [...new Set([...Object.keys(lMonths), ...(remoteIndex || [])])].sort();
    let fromL = 0;
    let fromR = 0;
    let del = 0;
    let conf = 0;
    for (const m of months) {
      const l = keyMovements(lMonths[m] || []);
      const rDoc = remote[`fin-${m}`]?.data?.mov;
      const r = keyMovements(rDoc || []);
      const merged = mergeById(l, r, base?.months?.[m], { same: sameMov, resolve: resolveMov });
      fromL += merged.stats.fromLocal;
      fromR += merged.stats.fromRemote;
      del += merged.stats.deleted;
      conf += merged.conflicts.length;
      const rows = merged.result.sort((a, b) => a.d.localeCompare(b.d));
      nextBase.months[m] = rows.map((x) => ({ ...x }));
      const csvRows = rows.map((x) => [x.d, x.desc, money(Number(x.v)), x.cat || '', x.acc || '']);
      const file = path.join(MOV, `${m}.csv`);
      const csvNow = readIf(file);
      const csvNew = `${['data;descricao;valor;categoria;conta', ...csvRows.map((r2) => r2.map(cell).join(';'))].join('\n')}\n`;
      if (csvNow !== null ? csvNow !== csvNew : rows.length > 0) localWrites.push({ file, content: csvNew });
      const remoteNow = keyMovements(rDoc || []);
      if (!rDoc || json(remoteNow.map((x) => [x.id, x.cat || ''])) !== json(rows.map((x) => [x.id, x.cat || ''])) || rDoc.length !== rows.length) {
        send[`fin-${m}`] = { mov: rows };
      }
    }
    report.push(`Movimentos: ${fromL} do computador, ${fromR} da página, ${del} apagados, ${conf} com categoria diferente (ficou a da página).`);
    if (!remoteIndex || json(remoteIndex) !== json(months)) send['fin-index'] = { months };

    // orçamento
    const remoteBudget = remote.orcamento?.data?.limits || {};
    const b = mergeMap(localBudget, remoteBudget, base?.budget);
    nextBase.budget = b.result;
    for (const c of b.conflicts) report.push(`  ⚠ Orçamento ${c}`);
    if (json(remoteBudget) !== json(b.result) || !remote.orcamento) send.orcamento = { limits: b.result };
    if (json(localBudget) !== json(b.result)) {
      const cats = [...new Set([...localBudgetRows.map((r) => r.categoria), ...Object.keys(b.result)])];
      localWrites.push({ csv: path.join(FIN, 'orcamento.csv'), header: ['categoria', 'limite'], rows: cats.map((c) => [c, b.result[c] ?? '']) });
    }

    // regras
    const localRules = readCsvTable(path.join(FIN, 'regras.csv')).filter((r) => r.padrao && r.categoria).map((r) => ({ p: r.padrao, cat: r.categoria }));
    const remoteRules = remote.regras?.data?.rules;
    const rr = remoteRules ? mergeRules(localRules, remoteRules, base?.rules) : { result: localRules, note: '' };
    nextBase.rules = rr.result;
    if (rr.note) report.push(`  ${rr.note}`);
    if (!remoteRules || json(remoteRules) !== json(rr.result)) send.regras = { rules: rr.result };
    if (json(localRules) !== json(rr.result)) localWrites.push({ csv: path.join(FIN, 'regras.csv'), header: ['padrao', 'categoria'], rows: rr.result.map((r) => [r.p, r.cat]) });

    // contas
    const localAcc = readCsvTable(path.join(FIN, 'contas.csv'))
      .filter((r) => r.conta)
      .map((r) => ({ id: accId(r.conta), nome: r.conta, tipo: r.tipo || '', saldo: toNumber(r.saldo), data: r.data || '' }));
    const remoteAcc = (remote.contas?.data?.items || []).map((a) => ({ ...a, id: accId(a.nome) }));
    const ma = mergeById(localAcc, remoteAcc, base?.accounts, { same: sameAcc, resolve: resolveAcc });
    nextBase.accounts = ma.result;
    if (ma.stats.fromLocal || ma.stats.fromRemote || ma.stats.deleted) {
      report.push(`Contas: ${ma.stats.fromLocal} do computador, ${ma.stats.fromRemote} da página, ${ma.stats.deleted} apagadas (em conflito fica o saldo com data mais recente).`);
    }
    if (!remote.contas || json(remote.contas.data.items) !== json(ma.result)) send.contas = { items: ma.result };
    if (json(localAcc) !== json(ma.result)) {
      localWrites.push({ csv: path.join(FIN, 'contas.csv'), header: ['conta', 'tipo', 'saldo', 'data'], rows: ma.result.map((a) => [a.nome, a.tipo, money(Number(a.saldo)), a.data]) });
    }
  } else {
    report.push('Finanças: sem dados em nenhum dos lados.');
  }

  return { report, send, localWrites, nextBase };
}

// ---------------------------------------------------------------- CLI

function cmdFundir(flags) {
  if (!flags.remoto || !flags.saida) throw new CliError('Uso: fundir --remoto <pasta com os documentos da página> --saida <pasta para os documentos a enviar> [--dry]');
  const remote = readRemote(path.resolve(flags.remoto));
  const base = fs.existsSync(BASE) ? JSON.parse(fs.readFileSync(BASE, 'utf8')) : null;
  const today = flags.hoje || new Date().toISOString().slice(0, 10);
  const { report, send, localWrites, nextBase } = fuse({ remote, today, base });

  console.log(base ? `Última sincronização: ${base.when}` : 'Primeira sincronização (sem base): nada é apagado, tudo é juntado.');
  console.log(report.join('\n'));

  const out = path.resolve(flags.saida);
  const plan = Object.entries(send).map(([doc, data]) => ({ doc, file: path.join(out, `${doc}.json`), if_version: remote[doc]?.version }));
  if (flags.dry) {
    console.log(`\n[simulação] ficheiros locais a mudar: ${localWrites.map((w) => path.relative(ROOT, w.file || w.csv)).join(', ') || 'nenhum'}`);
    console.log(`[simulação] documentos a enviar: ${plan.map((p) => p.doc).join(', ') || 'nenhum'}`);
    return;
  }
  for (const w of localWrites) {
    if (w.file) {
      fs.mkdirSync(path.dirname(w.file), { recursive: true });
      fs.writeFileSync(w.file, w.content);
    } else writeCsv(w.csv, w.header, w.rows);
  }
  fs.mkdirSync(out, { recursive: true });
  for (const p of plan) fs.writeFileSync(p.file, JSON.stringify(send[p.doc], null, 2));
  fs.writeFileSync(path.join(out, 'plano.json'), JSON.stringify(plan, null, 2));
  fs.mkdirSync(SYNC, { recursive: true });
  fs.writeFileSync(PENDING, JSON.stringify({ ...nextBase, when: new Date().toISOString() }));

  console.log(`\nFicheiros locais atualizados: ${localWrites.length}`);
  console.log(`Documentos a enviar para a página: ${plan.length} (plano em ${path.join(out, 'plano.json')})`);
  if (plan.some((p) => p.if_version === undefined && Object.keys(remote).includes(p.doc))) {
    console.log('Aviso: alguns documentos da página vieram sem versão; o envio não fica protegido contra edições simultâneas.');
  }
  console.log('Depois de enviar tudo com sucesso: node scripts/sincronizar.mjs confirmar');
}

function cmdConfirmar() {
  if (!fs.existsSync(PENDING)) throw new CliError('Não há nenhuma sincronização por confirmar.');
  fs.renameSync(PENDING, BASE);
  console.log('Sincronização confirmada.');
}

function cmdEstado() {
  if (!fs.existsSync(BASE)) return console.log('Ainda não houve nenhuma sincronização.');
  const b = JSON.parse(fs.readFileSync(BASE, 'utf8'));
  console.log(`Última sincronização: ${b.when} · ${b.tasks.length} tarefas · ${Object.keys(b.months).length} meses`);
  if (fs.existsSync(PENDING)) console.log('Há uma sincronização por confirmar (o envio para a página pode ter falhado). Volta a correr /sincronizar.');
}

function cmdHelp() {
  console.log(`sincronizar — node scripts/sincronizar.mjs <comando>

  fundir --remoto <pasta> --saida <pasta> [--dry] [--hoje AAAA-MM-DD]
                  funde os ficheiros locais com os documentos da página
  confirmar       grava a nova base depois de o envio para a página correr bem
  estado          mostra quando foi a última sincronização

Normalmente não se usa à mão: o comando /sincronizar do Claude Code faz tudo.`);
}

export function main(argv) {
  const [cmd = 'help', ...rest] = argv;
  const flags = {};
  for (let i = 0; i < rest.length; i++) {
    if (rest[i] === '--dry') flags.dry = true;
    else if (rest[i].startsWith('--')) flags[rest[i].slice(2)] = rest[++i];
  }
  try {
    if (cmd === 'fundir') cmdFundir(flags);
    else if (cmd === 'confirmar') cmdConfirmar();
    else if (cmd === 'estado') cmdEstado();
    else cmdHelp();
  } catch (err) {
    if (!(err instanceof CliError)) throw err;
    console.error(`sincronizar: ${err.message}`);
    process.exitCode = 2;
  }
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) main(process.argv.slice(2));
