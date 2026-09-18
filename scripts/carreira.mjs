#!/usr/bin/env node
/**
 * carreira — procura de emprego sobre carreira/: as vagas encontradas e as candidaturas.
 *
 *   candidaturas.csv  id;empresa;cargo;local;estado;nota;data;proximo;fonte;link;obs
 *   vagas.csv         id;visto;fonte;empresa;cargo;local;link;publicada   (tudo o que a procura já viu)
 *   fontes.csv        fonte;alvo;nome;palavras;local   (onde procurar; criado a partir de fontes.modelo.csv)
 *   .procura.json     hora da última consulta de cada fonte
 *
 * Fontes com API pública: landing, greenhouse, ashby, lever, remotive, remoteok, arbeitnow,
 * himalayas e itjobs (este precisa de ITJOBS_API_KEY). Cada linha de fontes.csv é consultada no
 * máximo uma vez por dia: é o que o Remotive pede (até 4 por dia) e mais do que chega para as outras.
 *
 * O LinkedIn não está aqui de propósito: não tem API pública e os termos dele proíbem recolha
 * automática. Pesquisa-se só a pedido, pelo Claude, sem sessão iniciada (skill procurar-vagas).
 *
 * Ideias de organização inspiradas no career-ops (MIT, github.com/career-ops-hq/career-ops).
 * Zero dependências (Node >= 18). Uso: node scripts/carreira.mjs help
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseCsv } from './financas.mjs';

const ROOT = path.resolve(process.env.ASSISTENTE_ROOT || path.join(path.dirname(fileURLToPath(import.meta.url)), '..'));
const DIR = path.join(ROOT, 'carreira');
const APPS = path.join(DIR, 'candidaturas.csv');
const SEEN = path.join(DIR, 'vagas.csv');
const SOURCES = path.join(DIR, 'fontes.csv');
const SOURCES_MODEL = path.join(DIR, 'fontes.modelo.csv');
const STAMPS = path.join(DIR, '.procura.json');

export const APP_COLS = ['id', 'empresa', 'cargo', 'local', 'estado', 'nota', 'data', 'proximo', 'fonte', 'link', 'obs'];
export const SEEN_COLS = ['id', 'visto', 'fonte', 'empresa', 'cargo', 'local', 'link', 'publicada'];

/** Estados por ordem de avanço. Os quatro primeiros estão "em curso". */
export const ESTADOS = ['guardada', 'candidatei', 'entrevista', 'proposta', 'aceite', 'recusada', 'sem-resposta', 'desisti'];
export const ATIVOS = ['guardada', 'candidatei', 'entrevista', 'proposta'];
/** Dias até ao próximo contacto, quando o estado muda e não se indica outra data. */
export const SEGUIMENTO = { candidatei: 7, entrevista: 3 };
/** Sem mudanças há este tempo, uma candidatura "candidatei" provavelmente não vai ter resposta. */
export const PARADA_DIAS = 21;
const MIN_HOURS_BETWEEN = 20;
const USER_AGENT = 'Rumo/0.1 (assistente pessoal; uma consulta por dia)';

class CliError extends Error {}

const fold = (s) => String(s ?? '').normalize('NFD').replace(/\p{M}/gu, '').toLowerCase().trim();
const pad = (n) => String(n).padStart(2, '0');
const isoDay = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const localToday = () => isoDay(new Date());
export const addDays = (day, n) => {
  const d = new Date(`${day}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
};
export const daysBetween = (a, b) => Math.round((new Date(`${b}T12:00:00Z`) - new Date(`${a}T12:00:00Z`)) / 86400000);

/** Hash curto e determinístico (djb2), para ids estáveis de vagas sem id numérico. */
export function hashId(s) {
  let h = 5381;
  for (const ch of String(s)) h = ((h << 5) + h + ch.codePointAt(0)) >>> 0;
  return h.toString(36);
}

/** A mesma vaga pode aparecer em duas fontes (ex.: LinkedIn e Greenhouse): compara empresa + cargo. */
export const sameJobKey = (x) => `${fold(x.empresa).replace(/[^a-z0-9]/g, '')}|${fold(x.cargo).replace(/[^a-z0-9]/g, '')}`;

// ---------------------------------------------------------------- CSV

function readRows(file, model) {
  if (!fs.existsSync(file) && model && fs.existsSync(model)) fs.copyFileSync(model, file);
  if (!fs.existsSync(file)) return [];
  const rows = parseCsv(fs.readFileSync(file, 'utf8').replace(/^﻿/, ''), ';');
  const head = (rows.shift() || []).map(fold);
  return rows.map((r) => Object.fromEntries(head.map((h, i) => [h, (r[i] ?? '').trim()])));
}

const cell = (v) => (/[;"\n]/.test(String(v ?? '')) ? `"${String(v).replace(/"/g, '""')}"` : String(v ?? ''));

function writeRows(file, cols, rows) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, `${[cols.join(';'), ...rows.map((r) => cols.map((c) => cell(r[c])).join(';'))].join('\n')}\n`);
}

export const loadApps = () => readRows(APPS);
export const saveApps = (rows) => writeRows(APPS, APP_COLS, rows);
export const loadSeen = () => readRows(SEEN);
export const saveSeen = (rows) => writeRows(SEEN, SEEN_COLS, rows);
const loadSources = () => readRows(SOURCES, SOURCES_MODEL).filter((r) => r.fonte && !r.fonte.startsWith('#'));

// ---------------------------------------------------------------- fontes

const titleCase = (slug) => String(slug || '').split('-').filter(Boolean).map((w) => w[0].toUpperCase() + w.slice(1)).join(' ');
const dayOf = (v) => {
  if (v === undefined || v === null || v === '') return '';
  // Em UTC, para o dia não depender do fuso de quem corre o script.
  if (typeof v === 'number') return new Date(v > 1e12 ? v : v * 1000).toISOString().slice(0, 10);
  return String(v).slice(0, 10);
};
const joinPlaces = (...xs) => xs.flat().filter(Boolean).join(', ');

/**
 * Converte a resposta de cada fonte em vagas {id, empresa, cargo, local, link, publicada}.
 * Os nomes dos campos foram lidos de respostas reais (setembro de 2026). O Landing.jobs, o
 * Ashby e o Lever não devolvem o nome da empresa: vem do URL ou da coluna `nome` de fontes.csv.
 */
export const PARSERS = {
  landing: (d) =>
    (Array.isArray(d) ? d : []).map((j) => ({
      id: `lj-${j.id}`,
      empresa: titleCase(String(j.url || '').match(/\/at\/([^/]+)\//)?.[1]),
      cargo: j.title,
      local: joinPlaces((j.locations || []).map((l) => l.city), j.remote ? 'Remoto' : ''),
      link: j.url,
      publicada: dayOf(j.published_at),
    })),
  greenhouse: (d, src) =>
    (d?.jobs || []).map((j) => ({
      id: `gh-${j.id}`,
      empresa: j.company_name || src.nome || titleCase(src.alvo),
      cargo: j.title,
      local: j.location?.name || '',
      link: j.absolute_url,
      publicada: dayOf(j.first_published || j.updated_at),
    })),
  ashby: (d, src) =>
    (d?.jobs || [])
      .filter((j) => j.isListed !== false)
      .map((j) => ({
        id: `ab-${j.id}`,
        empresa: src.nome || titleCase(src.alvo),
        cargo: String(j.title || '').trim(),
        local: joinPlaces(j.location, (j.secondaryLocations || []).map((s) => s.location), j.isRemote ? 'Remoto' : ''),
        link: j.jobUrl,
        publicada: dayOf(j.publishedAt),
      })),
  lever: (d, src) =>
    (Array.isArray(d) ? d : []).map((j) => ({
      id: `lv-${j.id}`,
      empresa: src.nome || titleCase(src.alvo),
      cargo: j.text,
      local: joinPlaces(j.categories?.location, j.workplaceType === 'remote' ? 'Remoto' : ''),
      link: j.hostedUrl,
      publicada: dayOf(j.createdAt),
    })),
  remotive: (d) =>
    (d?.jobs || []).map((j) => ({
      id: `rm-${j.id}`,
      empresa: j.company_name,
      cargo: j.title,
      local: `Remoto (${j.candidate_required_location || 'sem restrição indicada'})`,
      link: j.url,
      publicada: dayOf(j.publication_date),
    })),
  // O primeiro elemento é o aviso legal, não uma vaga.
  remoteok: (d) =>
    (Array.isArray(d) ? d : [])
      .filter((j) => j && j.id && j.position)
      .map((j) => ({
        id: `ro-${j.id}`,
        empresa: j.company,
        cargo: j.position,
        local: j.location ? `Remoto (${j.location})` : 'Remoto',
        link: j.url,
        publicada: dayOf(j.date),
      })),
  arbeitnow: (d) =>
    (d?.data || []).map((j) => ({
      id: `an-${hashId(j.slug)}`,
      empresa: j.company_name,
      cargo: j.title,
      local: joinPlaces(j.location, j.remote ? 'Remoto' : ''),
      link: j.url,
      publicada: dayOf(j.created_at),
    })),
  himalayas: (d) =>
    (d?.jobs || []).map((j) => ({
      id: `hi-${hashId(j.guid || j.applicationLink)}`,
      empresa: j.companyName,
      cargo: j.title,
      local: `Remoto (${(j.locationRestrictions || []).join(', ') || 'qualquer país'})`,
      link: j.applicationLink || j.guid,
      publicada: dayOf(j.pubDate),
    })),
  // Formato da documentação oficial (itjobs.pt/api/docs/job); o link segue o padrão público /oferta/<id>/<slug>.
  itjobs: (d) =>
    (d?.results || []).map((j) => ({
      id: `it-${j.id}`,
      empresa: j.company?.name || '',
      cargo: j.title,
      local: joinPlaces((j.locations || []).map((l) => (typeof l === 'string' ? l : l?.name))),
      link: `https://www.itjobs.pt/oferta/${j.id}/${j.slug || ''}`,
      publicada: dayOf(j.publishedAt),
    })),
};

const firstWords = (src) => String(src.palavras || '').split(',').map((s) => s.trim()).filter(Boolean);
const enc = encodeURIComponent;

/** Pedido HTTP de cada fonte (sem o executar), para se poder testar e mostrar em --dry. */
export function requestFor(src, env = process.env) {
  const alvo = String(src.alvo || '').trim();
  const need = (what) => {
    if (!alvo) throw new CliError(`${src.fonte}: falta o ${what} na coluna "alvo" de fontes.csv`);
    return enc(alvo);
  };
  switch (src.fonte) {
    case 'landing':
      return { url: 'https://landing.jobs/api/v1/jobs?limit=50' };
    case 'greenhouse':
      return { url: `https://boards-api.greenhouse.io/v1/boards/${need('identificador da empresa')}/jobs` };
    case 'ashby':
      return { url: `https://api.ashbyhq.com/posting-api/job-board/${need('identificador da empresa')}` };
    case 'lever':
      return { url: `https://api.lever.co/v0/postings/${need('identificador da empresa')}?mode=json` };
    case 'remotive':
      // Os parâmetros de filtro são ignorados pela API pública: filtra-se aqui.
      return { url: 'https://remotive.com/api/remote-jobs' };
    case 'remoteok':
      return { url: `https://remoteok.com/api${alvo ? `?tag=${enc(alvo)}` : ''}` };
    case 'arbeitnow':
      return { url: 'https://www.arbeitnow.com/api/job-board-api' };
    case 'himalayas': {
      const q = firstWords(src)[0];
      return { url: q ? `https://himalayas.app/jobs/api/search?q=${enc(q)}` : 'https://himalayas.app/jobs/api?limit=20' };
    }
    case 'itjobs': {
      const key = env.ITJOBS_API_KEY;
      if (!key) return { skip: 'sem ITJOBS_API_KEY (pede-se grátis em itjobs.pt/api)' };
      const q = firstWords(src).join(',') || alvo;
      if (!q) throw new CliError('itjobs: indica palavras de pesquisa');
      return {
        url: 'https://api.itjobs.pt/job/search.json',
        method: 'POST',
        body: `api_key=${enc(key)}&q=${enc(q)}&limit=50`,
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        label: 'https://api.itjobs.pt/job/search.json (POST)',
      };
    }
    default:
      throw new CliError(`fonte desconhecida "${src.fonte}" (${Object.keys(PARSERS).join(', ')})`);
  }
}

/** Mantém as vagas cujo cargo tem alguma das palavras e cujo local bate com algum dos locais. */
export function matches(job, src) {
  const words = firstWords(src).map(fold);
  const places = String(src.local || '').split(',').map((s) => fold(s)).filter(Boolean);
  const title = fold(job.cargo);
  const where = fold(job.local);
  const okWords = !words.length || words.some((w) => title.includes(w));
  const okPlace = !places.length || places.some((p) => where.includes(p) || (['remoto', 'remote'].includes(p) && where.includes('remot')));
  return okWords && okPlace;
}

const sourceKey = (src) => `${src.fonte}|${src.alvo || ''}|${src.palavras || ''}|${src.local || ''}`;
const fixtureName = (src) => `${src.fonte}${src.alvo ? `-${src.alvo}` : ''}.json`;

async function fetchSource(src) {
  const req = requestFor(src);
  if (req.skip) return { skipped: req.skip };
  // Nos testes, as respostas vêm de ficheiros e nunca da rede.
  if (process.env.CARREIRA_FIXTURES) {
    const f = path.join(process.env.CARREIRA_FIXTURES, fixtureName(src));
    if (!fs.existsSync(f)) return { error: `sem ficheiro de teste ${path.basename(f)}` };
    return { data: JSON.parse(fs.readFileSync(f, 'utf8')) };
  }
  try {
    const res = await fetch(req.url, {
      method: req.method || 'GET',
      body: req.body,
      headers: { 'User-Agent': USER_AGENT, Accept: 'application/json', ...(req.headers || {}) },
      signal: AbortSignal.timeout(25000),
    });
    if (!res.ok) return { error: `HTTP ${res.status}` };
    return { data: await res.json() };
  } catch (err) {
    return { error: err.name === 'TimeoutError' ? 'sem resposta em 25 s' : err.message };
  }
}

// ---------------------------------------------------------------- candidaturas

export function findApp(apps, ref) {
  const r = fold(ref);
  const exact = apps.find((a) => fold(a.id) === r);
  if (exact) return exact;
  const pre = apps.filter((a) => fold(a.id).startsWith(r));
  if (pre.length === 1) return pre[0];
  if (pre.length > 1) throw new CliError(`"${ref}" corresponde a ${pre.length} candidaturas: ${pre.map((a) => a.id).join(', ')}`);
  throw new CliError(`não encontrei a candidatura "${ref}" (vê os ids com: lista --todas)`);
}

/** Aplica uma mudança de estado. Devolve uma cópia; não mexe no original. */
export function changeState(app, estado, today, { proximo, obs } = {}) {
  if (!ESTADOS.includes(estado)) throw new CliError(`estado desconhecido "${estado}" (${ESTADOS.join(', ')})`);
  let next = app.proximo || '';
  if (proximo === 'nao') next = '';
  else if (proximo) next = proximo;
  else if (!ATIVOS.includes(estado)) next = '';
  else if (SEGUIMENTO[estado] && estado !== app.estado) next = addDays(today, SEGUIMENTO[estado]);
  const note = obs ? [app.obs, `${today}: ${obs}`].filter(Boolean).join(' | ') : app.obs || '';
  return { ...app, estado, data: today, proximo: next, obs: note };
}

export function summarize(apps, seen, today) {
  const byState = Object.fromEntries(ESTADOS.map((e) => [e, 0]));
  for (const a of apps) if (byState[a.estado] !== undefined) byState[a.estado]++;
  const sent = apps.filter((a) => a.estado !== 'guardada').length;
  const replied = apps.filter((a) => ['entrevista', 'proposta', 'aceite', 'recusada'].includes(a.estado)).length;
  const due = apps.filter((a) => ATIVOS.includes(a.estado) && a.proximo && a.proximo <= today);
  const stale = apps.filter((a) => a.estado === 'candidatei' && a.data && daysBetween(a.data, today) >= PARADA_DIAS);
  const newWeek = seen.filter((v) => v.visto && daysBetween(v.visto, today) <= 7).length;
  return {
    byState,
    active: ATIVOS.reduce((s, e) => s + byState[e], 0),
    sent,
    replied,
    responseRate: sent ? replied / sent : null,
    due,
    stale,
    newWeek,
  };
}

/**
 * Próximos passos, já ordenados por urgência. A intenção é que a pessoa não
 * tenha de interpretar o pipeline: abre a agenda e começa pela primeira linha.
 */
export function nextActions(apps, seen, today) {
  const actions = [];
  const taken = new Set([...apps.map((a) => a.id), ...apps.map(sameJobKey)]);
  const add = (item, priority, action, reason) => actions.push({ item, priority, action, reason });

  for (const app of apps) {
    if (!ATIVOS.includes(app.estado)) continue;
    if (app.proximo && app.proximo <= today) {
      const action = app.estado === 'guardada' ? 'decidir candidatura' : app.estado === 'candidatei' ? 'fazer seguimento' : app.estado === 'entrevista' ? 'preparar ou agradecer entrevista' : 'rever e negociar proposta';
      add(app, 0, action, app.proximo < today ? `em atraso desde ${app.proximo}` : 'marcado para hoje');
    } else if (app.estado === 'guardada' && !app.proximo) {
      add(app, 1, 'avaliar e decidir candidatura', app.nota ? `avaliação ${app.nota}/5` : 'ainda sem avaliação');
    } else if (app.estado === 'candidatei' && app.data && daysBetween(app.data, today) >= PARADA_DIAS && !app.proximo) {
      add(app, 2, 'decidir se fica sem resposta', `sem notícias há ${daysBetween(app.data, today)} dias`);
    } else if (['entrevista', 'proposta'].includes(app.estado) && !app.proximo) {
      add(app, 2, app.estado === 'entrevista' ? 'definir o próximo passo da entrevista' : 'definir prazo para decidir a proposta', 'sem data marcada');
    }
  }

  for (const job of seen) {
    if (!job.visto || daysBetween(job.visto, today) > 7 || taken.has(job.id) || taken.has(sameJobKey(job))) continue;
    add(job, 3, 'ver se vale a pena', `encontrada em ${job.visto}`);
  }

  return actions.sort((a, b) => a.priority - b.priority || (a.item.proximo || '9999').localeCompare(b.item.proximo || '9999') || (b.item.nota || '').localeCompare(a.item.nota || '') || (b.item.data || b.item.visto || '').localeCompare(a.item.data || a.item.visto || ''));
}

// ---------------------------------------------------------------- comandos

const today = (flags) => flags.data || process.env.ROTINA_HOJE || localToday();
const line = (a, day) => {
  const age = a.data ? daysBetween(a.data, day) : null;
  const bits = [
    a.nota ? `${a.nota}/5` : '',
    age !== null ? (age === 0 ? 'hoje' : `há ${age} d`) : '',
    a.proximo ? (a.proximo <= day ? `⚠ contactar (${a.proximo})` : `próximo contacto ${a.proximo}`) : '',
  ].filter(Boolean);
  return `  ${a.id.padEnd(14)} ${a.cargo} · ${a.empresa}${a.local ? ` · ${a.local}` : ''}${bits.length ? `  [${bits.join(' · ')}]` : ''}`;
};

async function cmdProcurar(_, flags) {
  const day = today(flags);
  let sources = loadSources();
  if (!sources.length) throw new CliError('carreira/fontes.csv está vazio. Acrescenta pelo menos uma linha (vê fontes.modelo.csv).');
  if (flags.fonte) sources = sources.filter((s) => s.fonte === flags.fonte);
  if (!sources.length) throw new CliError(`nenhuma linha de fontes.csv com a fonte "${flags.fonte}"`);
  // Uma pesquisa pontual não deve obrigar ninguém a editar fontes.csv.
  if (flags.palavras || flags.local) {
    sources = sources.map((s) => ({ ...s, palavras: flags.palavras || s.palavras, local: flags.local || s.local }));
  }

  const stamps = fs.existsSync(STAMPS) ? JSON.parse(fs.readFileSync(STAMPS, 'utf8')) : {};
  const seen = loadSeen();
  const apps = loadApps();
  const knownIds = new Set([...seen.map((v) => v.id), ...apps.map((a) => a.id)]);
  const knownKeys = new Set([...seen, ...apps].map(sameJobKey));
  const found = [];
  const now = Date.now();

  for (const src of sources) {
    const label = `${src.fonte}${src.alvo ? `/${src.alvo}` : ''}${src.palavras ? ` "${src.palavras}"` : ''}`;
    const last = stamps[sourceKey(src)];
    if (!flags.forcar && last && (now - Date.parse(last)) / 3600000 < MIN_HOURS_BETWEEN) {
      console.log(`  – ${label}: consultada há menos de ${MIN_HOURS_BETWEEN} h (usa --forcar para repetir)`);
      continue;
    }
    if (flags.dry) {
      const req = requestFor(src);
      console.log(`  [consultaria] ${label}: ${req.skip || req.label || req.url}`);
      continue;
    }
    const res = await fetchSource(src);
    if (res.skipped) {
      console.log(`  – ${label}: ${res.skipped}`);
      continue;
    }
    if (res.error) {
      console.log(`  ✗ ${label}: ${res.error}`);
      continue;
    }
    stamps[sourceKey(src)] = new Date(now).toISOString();
    const jobs = PARSERS[src.fonte](res.data, src).filter((j) => j.cargo && j.link && matches(j, src));
    let added = 0;
    for (const j of jobs) {
      if (knownIds.has(j.id) || knownKeys.has(sameJobKey(j))) continue;
      knownIds.add(j.id);
      knownKeys.add(sameJobKey(j));
      found.push({ ...j, fonte: src.fonte, visto: day });
      added++;
    }
    console.log(`  ✓ ${label}: ${jobs.length} com as palavras, ${added} nova(s)`);
  }
  if (flags.dry) return;

  fs.mkdirSync(DIR, { recursive: true });
  fs.writeFileSync(STAMPS, JSON.stringify(stamps, null, 2));
  if (found.length) writeRows(SEEN, SEEN_COLS, [...seen, ...found]);

  console.log(`\n${found.length} vaga(s) nova(s).`);
  for (const j of found.slice(0, 30)) console.log(`  ${j.id.padEnd(14)} ${j.cargo} · ${j.empresa} · ${j.local || '—'}  (${j.fonte})\n  ${' '.repeat(14)} ${j.link}`);
  if (found.length > 30) console.log(`  … e mais ${found.length - 30}. Vê todas com: node scripts/carreira.mjs novas`);
  if (found.length) console.log('\nPara guardar uma: node scripts/carreira.mjs guardar <id>');

  if (flags.notificar && found.length) {
    const { notify } = await import('./lembretes.mjs');
    const top = found.slice(0, 3).map((j) => `${j.cargo} (${j.empresa})`).join('; ');
    notify('Rumo · Carreira', `${found.length} vaga${found.length > 1 ? 's' : ''} nova${found.length > 1 ? 's' : ''}: ${top}${found.length > 3 ? '…' : ''}`);
  }
}

function cmdNovas(_, flags) {
  const day = today(flags);
  const days = Number(flags.dias ?? 1);
  const apps = loadApps();
  const saved = new Set([...apps.map((a) => a.id), ...apps.map(sameJobKey)]);
  const list = loadSeen().filter((v) => v.visto && daysBetween(v.visto, day) < days && !saved.has(v.id) && !saved.has(sameJobKey(v)));
  if (!list.length) return console.log(`Sem vagas novas por guardar ${days === 1 ? 'hoje' : `nos últimos ${days} dias`}.`);
  console.log(`${list.length} vaga(s) por decidir:`);
  for (const v of list) console.log(`  ${v.id.padEnd(14)} ${v.cargo} · ${v.empresa} · ${v.local || '—'}  (${v.fonte}, ${v.visto})\n  ${' '.repeat(14)} ${v.link}`);
}

function addApp(app) {
  const apps = loadApps();
  const dup = apps.find((a) => a.id === app.id || sameJobKey(a) === sameJobKey(app));
  if (dup) throw new CliError(`já está na lista: ${dup.id} (${dup.cargo} · ${dup.empresa}, ${dup.estado})`);
  saveApps([...apps, app]);
  return app;
}

function parseNote(v) {
  if (v === undefined || v === '') return '';
  const n = Number(String(v).replace(',', '.'));
  if (!(n >= 1 && n <= 5)) throw new CliError(`--nota tem de ser de 1 a 5 (recebi "${v}")`);
  return String(Math.round(n * 10) / 10).replace('.', ',');
}

function cmdGuardar([ref], flags) {
  if (!ref) throw new CliError('Uso: guardar <id da vaga> [--nota 1-5]');
  const seen = loadSeen();
  const pre = seen.filter((x) => x.id.startsWith(ref));
  const v = seen.find((x) => x.id === ref) || (pre.length === 1 ? pre[0] : null);
  if (!v && pre.length > 1) throw new CliError(`"${ref}" corresponde a ${pre.length} vagas: ${pre.slice(0, 5).map((x) => x.id).join(', ')}…`);
  if (!v) throw new CliError(`não encontrei a vaga "${ref}" em carreira/vagas.csv (para uma vaga de fora, usa: adicionar)`);
  const app = addApp({ id: v.id, empresa: v.empresa, cargo: v.cargo, local: v.local, estado: 'guardada', nota: parseNote(flags.nota), data: today(flags), proximo: '', fonte: v.fonte, link: v.link, obs: '' });
  console.log(`Guardada: ${app.id} · ${app.cargo} · ${app.empresa}`);
}

function cmdAdicionar(_, flags) {
  if (!flags.empresa || !flags.cargo) throw new CliError('Uso: adicionar --empresa "…" --cargo "…" [--link …] [--local …] [--fonte linkedin] [--estado guardada] [--nota 1-5] [--obs "…"]');
  const estado = flags.estado || 'guardada';
  if (!ESTADOS.includes(estado)) throw new CliError(`estado desconhecido "${estado}"`);
  const day = today(flags);
  let app = {
    id: `c-${hashId(`${fold(flags.empresa)}|${fold(flags.cargo)}|${flags.link || ''}`)}`,
    empresa: flags.empresa.trim(),
    cargo: flags.cargo.trim(),
    local: (flags.local || '').trim(),
    estado: 'guardada',
    nota: parseNote(flags.nota),
    data: day,
    proximo: '',
    fonte: (flags.fonte || 'manual').trim(),
    link: (flags.link || '').trim(),
    obs: '',
  };
  if (estado !== 'guardada') app = changeState(app, estado, day, { proximo: flags.proximo });
  if (flags.obs) app.obs = `${day}: ${flags.obs}`;
  addApp(app);
  console.log(`Adicionada: ${app.id} · ${app.cargo} · ${app.empresa} (${app.estado}${app.proximo ? `, próximo contacto ${app.proximo}` : ''})`);
}

function cmdMudar([ref, estado], flags) {
  if (!ref || !estado) throw new CliError(`Uso: mudar <id> <estado> [--proximo AAAA-MM-DD|nao] [--obs "…"]\nEstados: ${ESTADOS.join(', ')}`);
  const apps = loadApps();
  const app = findApp(apps, ref);
  const next = changeState(app, estado, today(flags), { proximo: flags.proximo, obs: flags.obs });
  saveApps(apps.map((a) => (a === app ? next : a)));
  console.log(`${next.id}: ${app.estado} → ${next.estado}${next.proximo ? ` · próximo contacto ${next.proximo}` : ''}`);
}

function cmdLista(_, flags) {
  const day = today(flags);
  const apps = loadApps();
  const states = flags.estado ? [flags.estado] : flags.todas ? ESTADOS : ATIVOS;
  let shown = 0;
  for (const e of states) {
    const group = apps.filter((a) => a.estado === e).sort((a, b) => (a.proximo || '9999').localeCompare(b.proximo || '9999') || b.data.localeCompare(a.data));
    if (!group.length) continue;
    console.log(`\n${e} (${group.length})`);
    for (const a of group) console.log(line(a, day));
    shown += group.length;
  }
  if (!shown) console.log(apps.length ? 'Nada nesses estados. Para ver todas: lista --todas' : 'Ainda não há candidaturas. Começa com: guardar <id> ou adicionar.');
}

function cmdResumo(_, flags) {
  const day = today(flags);
  const s = summarize(loadApps(), loadSeen(), day);
  console.log(`Em curso: ${s.active}  (guardadas ${s.byState.guardada} · candidatei ${s.byState.candidatei} · entrevista ${s.byState.entrevista} · proposta ${s.byState.proposta})`);
  console.log(`Fechadas: aceite ${s.byState.aceite} · recusada ${s.byState.recusada} · sem resposta ${s.byState['sem-resposta']} · desisti ${s.byState.desisti}`);
  console.log(`Taxa de resposta: ${s.responseRate === null ? '— (ainda não há candidaturas enviadas)' : `${Math.round(s.responseRate * 100)}% (${s.replied} de ${s.sent} enviadas)`}`);
  console.log(`Vagas novas nos últimos 7 dias: ${s.newWeek}`);
  if (s.due.length) {
    console.log(`\nContactar agora (${s.due.length}):`);
    for (const a of s.due) console.log(line(a, day));
  }
  if (s.stale.length) {
    console.log(`\nSem notícias há ${PARADA_DIAS}+ dias (talvez "sem-resposta"?):`);
    for (const a of s.stale) console.log(line(a, day));
  }
}

function cmdAgenda(_, flags) {
  const day = today(flags);
  const actions = nextActions(loadApps(), loadSeen(), day);
  if (!actions.length) return console.log('Nada urgente. Próximo passo: procurar vagas novas com /procurar.');
  console.log(`Próximos passos (${actions.length}) — começa pelo primeiro:\n`);
  for (const [i, x] of actions.entries()) {
    console.log(`${String(i + 1).padStart(2)}. ${x.action}: ${x.item.cargo} · ${x.item.empresa}  [${x.reason}]`);
  }
  const first = actions[0];
  console.log(`\nAgora: ${first.action} — ${first.item.cargo} · ${first.item.empresa}.`);
}

function cmdHelp() {
  console.log(`carreira — node scripts/carreira.mjs <comando>

  procurar [--palavras "…"] [--local "…"] [--fonte f] [--forcar] [--notificar] [--dry]
                             consulta as fontes de carreira/fontes.csv (cada uma no máximo 1 vez por dia)
  novas [--dias N]           vagas encontradas nos últimos N dias (1) ainda por guardar
  guardar <id> [--nota 1-5]  passa uma vaga encontrada para a lista de candidaturas
  adicionar --empresa … --cargo … [--link --local --fonte --estado --nota --obs]
                             acrescenta uma vaga de fora (ex.: colada do LinkedIn)
  mudar <id> <estado> [--proximo AAAA-MM-DD|nao] [--obs "…"]
                             muda o estado; candidatei → próximo contacto em ${SEGUIMENTO.candidatei} dias, entrevista → ${SEGUIMENTO.entrevista}
  lista [--estado e | --todas]   candidaturas em curso, por estado
  resumo                     contagens, taxa de resposta e o que está por contactar
  agenda                     próximos passos ordenados; começa pelo primeiro

Estados: ${ESTADOS.join(' · ')}
Fontes: ${Object.keys(PARSERS).join(' · ')}  (o LinkedIn pesquisa-se a pedido, com /procurar)
Opção: --data AAAA-MM-DD (simula outro dia)`);
}

const COMMANDS = {
  procurar: cmdProcurar,
  novas: cmdNovas,
  guardar: cmdGuardar,
  adicionar: cmdAdicionar,
  mudar: cmdMudar,
  lista: cmdLista,
  resumo: cmdResumo,
  agenda: cmdAgenda,
  help: cmdHelp,
};

const BOOLEAN_FLAGS = new Set(['forcar', 'notificar', 'dry', 'todas']);

export async function main(argv) {
  const [cmd = 'help', ...rest] = argv;
  const args = [];
  const flags = {};
  for (let i = 0; i < rest.length; i++) {
    if (['--help', '-h'].includes(rest[i])) return cmdHelp();
    if (rest[i].startsWith('--')) {
      const name = rest[i].slice(2);
      flags[name] = BOOLEAN_FLAGS.has(name) ? true : rest[++i];
    } else args.push(rest[i]);
  }
  const fn = COMMANDS[cmd];
  if (!fn) {
    console.error(`Comando desconhecido: ${cmd}\n`);
    cmdHelp();
    process.exitCode = 2;
    return;
  }
  try {
    await fn(args, flags);
  } catch (err) {
    if (!(err instanceof CliError)) throw err;
    console.error(`carreira: ${err.message}`);
    process.exitCode = 2;
  }
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) await main(process.argv.slice(2));
