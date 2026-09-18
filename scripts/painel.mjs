#!/usr/bin/env node
/** Painel local do Rumo: serve o artifact e permite editar apenas ficheiros pessoais autorizados. */
import crypto from 'node:crypto';
import fs from 'node:fs';
import http from 'node:http';
import os from 'node:os';
import path from 'node:path';
import { execFile, spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { parseCsv, toNumber as parseFinanceNumber } from './financas.mjs';
// As mesmas colunas e a mesma forma de comparar vagas que a área Carreira usa.
import { SEEN_COLS, sameJobKey as chaveVaga, hashId as hashCurto } from './carreira.mjs';

const ROOT = path.resolve(process.env.ASSISTENTE_ROOT || path.join(path.dirname(fileURLToPath(import.meta.url)), '..'));
const MAX_BODY = 1024 * 1024;
export const DEFAULT_PORT = 43117;
// Estado do painel em segundo plano: porta, chave e pid. Fica em .sync/ (fora do git).
const STATE_FILE = (root = ROOT) => path.join(root, '.sync', 'painel.json');

export const FILE_DEFS = [
  { id: 'rotina', group: 'Rotina', label: 'A minha rotina', description: 'Horários, blocos de foco, hábitos e momentos de revisão.', file: 'rotina/rotina.md', model: 'rotina/rotina.modelo.md' },
  { id: 'perfil-carreira', group: 'Carreira', label: 'O que procuro', description: 'Cargos, local, salário, limites e ritmo da procura.', file: 'carreira/perfil.md', model: 'carreira/perfil.modelo.md' },
  { id: 'cv', group: 'Carreira', label: 'O meu CV', description: 'Experiência, projetos, formação e competências usadas para avaliar vagas.', file: 'carreira/cv.md', model: 'carreira/cv.modelo.md' },
  { id: 'objetivos-financeiros', group: 'Finanças', label: 'Objetivos financeiros', description: 'Situação, objetivos, prazos e perfil para investir.', file: 'financas/objetivos.md', model: 'financas/objetivos.modelo.md' },
  { id: 'glossario', group: 'Língua', label: 'O meu glossário', description: 'Termos e traduções que queres usar sempre da mesma forma.', file: 'lingua/glossario.md', model: 'lingua/glossario.modelo.md' },
  { id: 'erros-frequentes', group: 'Língua', label: 'Erros frequentes', description: 'Correções que queres recordar nos textos seguintes.', file: 'lingua/erros-frequentes.md', model: 'lingua/erros-frequentes.modelo.md' },
  { id: 'voz', group: 'Escrita', label: 'A minha voz', description: 'Características confirmadas da tua forma de escrever.', file: 'escrita/voz.md', model: 'escrita/voz.modelo.md' },
];
const BY_ID = new Map(FILE_DEFS.map((x) => [x.id, x]));

function shortText(value, max = 300) {
  return String(value ?? '').replace(/[\r\n\t]+/g, ' ').replace(/\s{2,}/g, ' ').trim().slice(0, max);
}

export function readEmails(root = ROOT) {
  const file = path.join(root, 'rotina', 'emails.json');
  if (!fs.existsSync(file)) return { updatedAt: null, items: [] };
  try {
    const source = JSON.parse(fs.readFileSync(file, 'utf8'));
    const items = (Array.isArray(source.items) ? source.items : []).slice(0, 10).map((item, index) => {
      let url = '';
      try {
        const candidate = new URL(String(item.url || ''));
        if (candidate.protocol === 'https:' && candidate.hostname === 'mail.google.com') url = candidate.href;
      } catch { /* ligação ausente ou inválida */ }
      return {
        id: shortText(item.id || `email-${index + 1}`, 120),
        from: shortText(item.from, 180),
        subject: shortText(item.subject, 240),
        date: shortText(item.date, 30),
        action: shortText(item.action, 300),
        deadline: /^\d{4}-\d{2}-\d{2}$/.test(String(item.deadline || '')) ? String(item.deadline) : '',
        url,
      };
    }).filter((item) => item.subject || item.action);
    return { updatedAt: shortText(source.updatedAt, 40) || null, items };
  } catch {
    return { updatedAt: null, items: [], error: 'A lista de emails não pôde ser lida. Executa /hoje para a atualizar.' };
  }
}

/** Agenda deixada pelo /hoje (rotina/agenda.json): só o essencial, sem convidados nem descrições. */
export function readAgenda(root = ROOT) {
  const file = path.join(root, 'rotina', 'agenda.json');
  if (!fs.existsSync(file)) return { updatedAt: null, items: [] };
  try {
    const source = JSON.parse(fs.readFileSync(file, 'utf8'));
    const items = (Array.isArray(source.items) ? source.items : []).slice(0, 100).map((item, index) => {
      let url = '';
      try {
        const candidate = new URL(String(item.url || ''));
        if (candidate.protocol === 'https:') url = candidate.href;
      } catch { /* sem ligação */ }
      return {
        id: shortText(item.id || `ev-${index + 1}`, 120),
        summary: shortText(item.summary ?? item.titulo, 200),
        start: shortText(item.start ?? item.inicio, 40),
        end: shortText(item.end ?? item.fim, 40),
        location: shortText(item.location ?? item.local, 200),
        url,
      };
    }).filter((item) => item.start && item.summary);
    return { updatedAt: shortText(source.updatedAt, 40) || null, items };
  } catch {
    return { updatedAt: null, items: [], error: 'A agenda não pôde ser lida. Executa /hoje para a atualizar.' };
  }
}

/**
 * Pergunta ao Claude Code que está instalado neste computador (`claude -p`), para o painel
 * local ter as funções de IA sem chave de API: usa a sessão dele, como qualquer comando.
 * Corre em modo restrito e numa pasta temporária: sem ferramentas que corram código e sem
 * as regras do projeto. O texto vem do próprio utilizador, na página dele.
 */
export const MODELOS = ['haiku', 'sonnet', 'opus'];

export function askClaude(prompt, { timeout = 180000, cli = process.env.RUMO_CLAUDE_CLI || 'claude', model = '', web = false } = {}) {
  return new Promise((resolve, reject) => {
    // Só aliases conhecidos: o que vem da página nunca entra tal e qual na linha de comandos.
    const escolha = MODELOS.includes(model) ? ['--model', model] : [];
    // Por omissão, modo restrito (sem ferramentas). Com `web`, abre-se só a pesquisa na web,
    // que é o que a procura de vagas precisa; nunca ferramentas que corram comandos.
    // WebFetch entra para confirmar filtros (remoto, data) na própria página da vaga: sem isso,
    // só há excertos de pesquisa e a resposta honesta seria sempre "não consigo confirmar".
    // Passa a lista como um único argumento. `--allowedTools` aceita vários valores e,
    // no Windows, podia engolir os argumentos seguintes ou deixar a chamada sem pedido.
    // `--tools` limita realmente esta execução às duas ferramentas de leitura da web.
    const ferramentas = web
      ? ['--restricted', '--tools', 'WebSearch,WebFetch', '--allowedTools', 'WebSearch,WebFetch']
      : ['--restricted'];
    // O pedido vai por stdin: como argumento, o Windows parte-o nos espaços.
    const child = spawn(cli, ['-p', '--output-format', 'text', ...ferramentas, ...escolha], {
      cwd: os.tmpdir(),
      windowsHide: true,
      shell: process.platform === 'win32', // no Windows o "claude" é um .cmd
    });
    child.stdin.on('error', () => { /* o processo pode fechar antes de ler tudo */ });
    child.stdin.end(prompt);
    let out = '';
    let err = '';
    const timer = setTimeout(() => { child.kill(); reject(new Error('demorou demasiado')); }, timeout);
    child.stdout.on('data', (d) => { out += d; });
    child.stderr.on('data', (d) => { err += d; });
    child.on('error', () => { clearTimeout(timer); reject(new Error('nao-instalado')); });
    child.on('close', (code) => {
      clearTimeout(timer);
      if (code === 0 && out.trim()) resolve(out.trim());
      else {
        // O Claude Code escreve alguns erros úteis (por exemplo, limite da conta) em stdout.
        // Não os escondas atrás de uma mensagem genérica no painel.
        const detalhe = (err.trim() || out.trim()).split(/\r?\n/).filter(Boolean).pop();
        reject(new Error(detalhe || `o Claude terminou com o código ${code}`));
      }
    });
  });
}

// ---------------------------------------------------------------- finanças locais

const FINANCE_HEADERS = {
  movements: ['data', 'descricao', 'valor', 'categoria', 'conta'],
  rules: ['padrao', 'categoria'],
  budget: ['categoria', 'limite'],
  accounts: ['conta', 'tipo', 'saldo', 'data'],
};
const csvCell = (value) => (/[;"\n\r]/.test(String(value ?? '')) ? `"${String(value ?? '').replace(/"/g, '""')}"` : String(value ?? ''));
const csvText = (header, rows) => `${[header, ...rows].map((row) => row.map(csvCell).join(';')).join('\n')}\n`;
const financeFile = (root, relative) => path.join(root, 'financas', relative);

function readCsvRows(file, model = '') {
  const source = fs.existsSync(file) ? file : model && fs.existsSync(model) ? model : '';
  if (!source) return [];
  const text = fs.readFileSync(source, 'utf8').replace(/^\uFEFF/, '');
  const first = text.split(/\r?\n/, 1)[0] || '';
  const sep = [';', ',', '\t'].map((s) => [s, first.split(s).length]).sort((a, b) => b[1] - a[1])[0][0];
  const rows = parseCsv(text, sep);
  const head = (rows.shift() || []).map((x) => String(x).normalize('NFD').replace(/\p{M}/gu, '').toLowerCase().trim());
  return rows.map((row) => Object.fromEntries(head.map((name, i) => [name, String(row[i] ?? '').trim()])));
}

/** Escreve primeiro num temporário e guarda a versão anterior fora da pasta de dados. */
function writeFinanceFile(root, relative, content) {
  const target = financeFile(root, relative);
  fs.mkdirSync(path.dirname(target), { recursive: true });
  const normalized = String(content).replace(/\r\n/g, '\n').replace(/\s*$/, '\n');
  if (fs.existsSync(target) && fs.readFileSync(target, 'utf8').replace(/\r\n/g, '\n') === normalized) return false;
  if (fs.existsSync(target)) {
    const stamp = new Date().toISOString().replace(/[:.]/g, '-');
    const safe = relative.replace(/[\\/]/g, '__').replace(/[^a-zA-Z0-9_.-]/g, '_');
    const backup = path.join(root, '.sync', 'backups', 'financas', safe, `${stamp}${path.extname(relative) || '.txt'}`);
    fs.mkdirSync(path.dirname(backup), { recursive: true });
    fs.copyFileSync(target, backup);
  }
  const temp = `${target}.${process.pid}.${Date.now()}.tmp`;
  fs.writeFileSync(temp, normalized, { encoding: 'utf8', flag: 'wx' });
  fs.renameSync(temp, target);
  return true;
}

export function readFinance(root = ROOT) {
  const dir = financeFile(root, 'movimentos');
  const monthFiles = fs.existsSync(dir)
    ? fs.readdirSync(dir).filter((name) => /^\d{4}-\d{2}\.csv$/.test(name)).sort()
    : [];
  const months = {};
  for (const name of monthFiles) {
    const month = name.slice(0, 7);
    const rows = readCsvRows(path.join(dir, name));
    months[month] = { mov: rows.map((row, index) => ({
      id: `file-${month}-${index + 1}`,
      d: /^\d{4}-\d{2}-\d{2}$/.test(row.data) ? row.data : `${month}-01`,
      desc: shortText(row.descricao, 500),
      v: parseFinanceNumber(row.valor) || 0,
      cat: shortText(row.categoria, 100),
      acc: shortText(row.conta, 120),
    })).filter((row) => row.desc) };
  }
  const rulesFile = financeFile(root, 'regras.csv');
  const budgetFile = financeFile(root, 'orcamento.csv');
  const accountsFile = financeFile(root, 'contas.csv');
  const goalsFile = financeFile(root, 'objetivos.md');
  const rules = readCsvRows(rulesFile, financeFile(root, 'regras.modelo.csv'))
    .map((row) => ({ p: shortText(row.padrao, 160), cat: shortText(row.categoria, 100) })).filter((row) => row.p && row.cat);
  const budget = Object.fromEntries(readCsvRows(budgetFile, financeFile(root, 'orcamento.modelo.csv'))
    .map((row) => [shortText(row.categoria, 100), parseFinanceNumber(row.limite)])
    .filter(([cat, limit]) => cat && Number.isFinite(limit) && limit > 0));
  const accounts = readCsvRows(accountsFile, financeFile(root, 'contas.modelo.csv'))
    .map((row, index) => ({
      id: `file-account-${index + 1}`,
      nome: shortText(row.conta, 160), tipo: shortText(row.tipo, 60),
      saldo: parseFinanceNumber(row.saldo) || 0,
      data: /^\d{4}-\d{2}-\d{2}$/.test(row.data) ? row.data : '',
    })).filter((row) => row.nome);
  const goals = fs.existsSync(goalsFile) ? fs.readFileSync(goalsFile, 'utf8') : '';
  const present = {
    movements: monthFiles.length > 0,
    rules: fs.existsSync(rulesFile), budget: fs.existsSync(budgetFile),
    accounts: fs.existsSync(accountsFile), goals: fs.existsSync(goalsFile),
  };
  const exists = Object.values(present).some(Boolean);
  return { exists, present, fin: { months, index: Object.keys(months).sort(), budget, rules, accounts }, goals };
}

export function writeFinancePart(part, body, root = ROOT) {
  if (part.startsWith('month/')) {
    const month = part.slice(6);
    if (!/^\d{4}-\d{2}$/.test(month)) throw new Error('mes-invalido');
    const items = (Array.isArray(body.items) ? body.items : []).slice(0, 20000).map((item) => {
      const d = String(item.d || '');
      const value = Number(item.v);
      if (!new RegExp(`^${month.replace('-', '\\-')}-\\d{2}$`).test(d) || !shortText(item.desc, 500) || !Number.isFinite(value)) return null;
      return [d, shortText(item.desc, 500), String(value), shortText(item.cat, 100), shortText(item.acc, 120)];
    }).filter(Boolean);
    return writeFinanceFile(root, `movimentos/${month}.csv`, csvText(FINANCE_HEADERS.movements, items));
  }
  if (part === 'budget') {
    const source = body && typeof body.limits === 'object' && !Array.isArray(body.limits) ? body.limits : {};
    const rows = Object.entries(source).slice(0, 200).map(([cat, value]) => [shortText(cat, 100), Number(value)]).filter(([cat, value]) => cat && Number.isFinite(value) && value > 0);
    return writeFinanceFile(root, 'orcamento.csv', csvText(FINANCE_HEADERS.budget, rows));
  }
  if (part === 'rules') {
    const rows = (Array.isArray(body.items) ? body.items : []).slice(0, 500)
      .map((item) => [shortText(item.p, 160), shortText(item.cat, 100)]).filter(([pattern, cat]) => pattern && cat);
    return writeFinanceFile(root, 'regras.csv', csvText(FINANCE_HEADERS.rules, rows));
  }
  if (part === 'accounts') {
    const rows = (Array.isArray(body.items) ? body.items : []).slice(0, 500).map((item) => {
      const value = Number(item.saldo);
      const name = shortText(item.nome, 160);
      if (!name || !Number.isFinite(value)) return null;
      return [name, shortText(item.tipo, 60), String(value), /^\d{4}-\d{2}-\d{2}$/.test(String(item.data || '')) ? item.data : ''];
    }).filter(Boolean);
    return writeFinanceFile(root, 'contas.csv', csvText(FINANCE_HEADERS.accounts, rows));
  }
  if (part === 'goals') {
    if (typeof body.content !== 'string') throw new Error('conteudo-invalido');
    return writeFinanceFile(root, 'objetivos.md', body.content.slice(0, 100000));
  }
  throw new Error('parte-desconhecida');
}

// ---------------------------------------------------------------- ideias e escrita locais

const writingFile = (root) => path.join(root, 'escrita', 'painel.json');
const cleanDate = (value) => /^\d{4}-\d{2}-\d{2}(?:T[\d:.+-]+Z?)?$/.test(String(value || '')) ? String(value) : '';
const cleanId = (value, fallback) => shortText(value, 80).replace(/[^a-zA-Z0-9_-]/g, '') || fallback;

/** Mantém o ficheiro pequeno e previsível, mesmo que o navegador envie dados estranhos. */
function cleanWritingState(source = {}) {
  const ideas = (Array.isArray(source.ideas) ? source.ideas : []).slice(0, 100).map((item, index) => ({
    id: cleanId(item.id, `idea-${index + 1}`),
    title: shortText(item.title || item.titulo || 'Sem título', 160),
    body: String(item.body || item.text || '').slice(0, 6000),
    tags: (Array.isArray(item.tags) ? item.tags : String(item.tags || '').split(',')).map((x) => shortText(x, 40)).filter(Boolean).slice(0, 8),
    status: ['capturada', 'a-desenvolver', 'pronta'].includes(item.status) ? item.status : 'capturada',
    created: cleanDate(item.created || item.d),
    updated: cleanDate(item.updated || item.d),
  })).filter((item) => item.title || item.body);
  const notes = (Array.isArray(source.notes) ? source.notes : []).slice(0, 60).map((item) => ({
    d: cleanDate(item.d), tema: shortText(item.tema || 'Sem título', 160),
    resumo: String(item.resumo || '').slice(0, 5000), proximo: String(item.proximo || '').slice(0, 1000),
  })).filter((item) => item.tema || item.resumo);
  const drafts = (Array.isArray(source.drafts) ? source.drafts : []).slice(0, 40).map((item, index) => ({
    id: cleanId(item.id, `draft-${index + 1}`), title: shortText(item.title || 'Sem título', 160),
    content: String(item.content || '').slice(0, 20000), objective: shortText(item.objective, 300),
    audience: shortText(item.audience, 200), status: ['rascunho', 'em-revisao', 'final'].includes(item.status) ? item.status : 'rascunho',
    created: cleanDate(item.created), updated: cleanDate(item.updated), sourceIdeaId: cleanId(item.sourceIdeaId, ''),
  })).filter((item) => item.title || item.content);
  const errors = (Array.isArray(source.errors) ? source.errors : []).slice(0, 200).map((item) => ({
    lang: item.lang === 'en' ? 'en' : 'pt', de: shortText(item.de, 300), para: shortText(item.para, 300),
    regra: shortText(item.regra, 600), vezes: Math.max(1, Math.min(999, Number(item.vezes) || 1)),
  })).filter((item) => item.de && item.para);
  const voiceSource = source.voice && typeof source.voice === 'object' ? source.voice : {};
  const voice = {
    amostras: (Array.isArray(voiceSource.amostras) ? voiceSource.amostras : []).slice(0, 5).map((x) => String(x).slice(0, 6000)).filter(Boolean),
    perfil: String(voiceSource.perfil || '').slice(0, 12000), confirmado: voiceSource.confirmado === true,
  };
  return { version: 1, updatedAt: cleanDate(source.updatedAt) || new Date().toISOString(), ideas, notes, drafts, errors, voice };
}

export function readWriting(root = ROOT) {
  const file = writingFile(root);
  if (!fs.existsSync(file)) return { exists: false, data: cleanWritingState() };
  try { return { exists: true, data: cleanWritingState(JSON.parse(fs.readFileSync(file, 'utf8'))) }; }
  catch { return { exists: false, error: 'O ficheiro de ideias e escrita não pôde ser lido.', data: cleanWritingState() }; }
}

export function writeWriting(body, root = ROOT) {
  const target = writingFile(root);
  const cleaned = cleanWritingState({ ...body, updatedAt: new Date().toISOString() });
  if (fs.existsSync(target)) {
    try {
      const before = cleanWritingState(JSON.parse(fs.readFileSync(target, 'utf8')));
      const withoutTime = (value) => { const copy = { ...value }; delete copy.updatedAt; return JSON.stringify(copy); };
      if (withoutTime(before) === withoutTime(cleaned)) return false;
    } catch { /* o ficheiro inválido será substituído, depois de ficar no backup */ }
  }
  const content = `${JSON.stringify(cleaned, null, 2)}\n`;
  fs.mkdirSync(path.dirname(target), { recursive: true });
  if (fs.existsSync(target)) {
    const stamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backup = path.join(root, '.sync', 'backups', 'escrita', 'painel.json', `${stamp}.json`);
    fs.mkdirSync(path.dirname(backup), { recursive: true });
    fs.copyFileSync(target, backup);
  }
  const temp = `${target}.${process.pid}.${Date.now()}.tmp`;
  fs.writeFileSync(temp, content, { encoding: 'utf8', flag: 'wx' });
  fs.renameSync(temp, target);
  return true;
}

/**
 * Estado dos limites do Claude, tal como o Claude Code o guardou da última vez (~/.claude.json).
 * É uma cópia local: só fica mais recente quando o Claude Code volta a consultá-la.
 * Devolve apenas percentagens e horas de reposição — nunca identificadores da conta.
 */
/**
 * Vagas encontradas: ficam em carreira/vagas.csv, o mesmo ficheiro que a procura do computador
 * usa. Assim continuam disponíveis depois de fechar o painel, sem ter de pesquisar outra vez.
 */
const vagasFile = (root) => path.join(root, 'carreira', 'vagas.csv');
const celulaCsv = (v) => (/[;"\n]/.test(String(v ?? '')) ? `"${String(v).replace(/"/g, '""')}"` : String(v ?? ''));

export function lerVagas(root = ROOT) {
  const file = vagasFile(root);
  if (!fs.existsSync(file)) return [];
  const linhas = parseCsv(fs.readFileSync(file, 'utf8').replace(/^﻿/, ''), ';');
  const cabecalho = (linhas.shift() || []).map((c) => c.trim().toLowerCase());
  return linhas
    .map((r) => Object.fromEntries(cabecalho.map((c, i) => [c, (r[i] ?? '').trim()])))
    .filter((v) => v.cargo && v.empresa);
}

/** Acrescenta as vagas novas (sem repetir id nem empresa+cargo) e devolve quantas entraram. */
export function guardarVagas(items, root = ROOT) {
  const atuais = lerVagas(root);
  const ids = new Set(atuais.map((v) => v.id));
  const chaves = new Set(atuais.map(chaveVaga));
  const hoje = new Date().toISOString().slice(0, 10);
  const novas = [];
  for (const item of Array.isArray(items) ? items : []) {
    const v = {
      id: shortText(item.id, 60) || `li-${hashCurto(`${item.link || ''}${item.cargo}${item.empresa}`)}`,
      visto: /^\d{4}-\d{2}-\d{2}$/.test(String(item.visto || '')) ? String(item.visto) : hoje,
      fonte: shortText(item.fonte, 40) || 'pesquisa',
      empresa: shortText(item.empresa, 120),
      cargo: shortText(item.cargo, 160),
      local: shortText(item.local, 200),
      link: /^https:\/\//.test(String(item.link || '')) ? shortText(item.link, 500) : '',
      publicada: shortText(item.publicada, 30),
    };
    if (!v.empresa || !v.cargo || ids.has(v.id) || chaves.has(chaveVaga(v))) continue;
    ids.add(v.id);
    chaves.add(chaveVaga(v));
    novas.push(v);
  }
  if (novas.length) {
    const todas = [...atuais, ...novas];
    fs.mkdirSync(path.dirname(vagasFile(root)), { recursive: true });
    fs.writeFileSync(vagasFile(root), `${[SEEN_COLS.join(';'), ...todas.map((v) => SEEN_COLS.map((c) => celulaCsv(v[c])).join(';'))].join('\n')}\n`);
  }
  return { guardadas: novas.length, total: atuais.length + novas.length };
}

const janelaLimite = (x) => (x && typeof x.utilization === 'number' ? { utilizacao: x.utilization, reposicao: x.resets_at || null } : null);

/** Cópia local que o Claude Code guardou da última vez que consultou os limites. */
function limitesEmCache(home) {
  const file = path.join(home, '.claude.json');
  if (!fs.existsSync(file)) return { disponivel: false, motivo: 'sem-ficheiro' };
  try {
    const cache = JSON.parse(fs.readFileSync(file, 'utf8')).cachedUsageUtilization;
    if (!cache?.utilization) return { disponivel: false, motivo: 'sem-dados' };
    return {
      disponivel: true,
      origem: 'cache',
      lidoEm: cache.fetchedAtMs ? new Date(cache.fetchedAtMs).toISOString() : null,
      cincoHoras: janelaLimite(cache.utilization.five_hour),
      seteDias: janelaLimite(cache.utilization.seven_day),
      opus: janelaLimite(cache.utilization.seven_day_opus),
    };
  } catch {
    return { disponivel: false, motivo: 'ilegivel' };
  }
}

/**
 * Limites agora: pergunta-se à mesma origem que o Claude Code usa, com a credencial que já está
 * neste computador (só leitura). A credencial nunca sai daqui nem entra na resposta ao navegador.
 * Se falhar (sem sessão, sem rede), fica a cópia em cache.
 */
export async function readLimits(home = os.homedir(), { live = true } = {}) {
  if (live) {
    try {
      const cred = JSON.parse(fs.readFileSync(path.join(home, '.claude', '.credentials.json'), 'utf8'));
      const token = cred?.claudeAiOauth?.accessToken;
      if (token) {
        const r = await fetch('https://api.anthropic.com/api/oauth/usage', {
          headers: { Authorization: `Bearer ${token}`, 'anthropic-beta': 'oauth-2025-04-20' },
          signal: AbortSignal.timeout(8000),
        });
        if (r.ok) {
          const u = await r.json();
          return {
            disponivel: true,
            origem: 'direto',
            lidoEm: new Date().toISOString(),
            cincoHoras: janelaLimite(u.five_hour),
            seteDias: janelaLimite(u.seven_day),
            opus: janelaLimite(u.seven_day_opus),
          };
        }
      }
    } catch { /* sem rede ou sessão expirada: fica a cache */ }
  }
  return limitesEmCache(home);
}

const json = (res, status, value) => {
  const body = JSON.stringify(value);
  res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', 'Content-Length': Buffer.byteLength(body), 'Cache-Control': 'no-store' });
  res.end(body);
};

function authorized(req, token) {
  const host = String(req.headers.host || '').split(':')[0].replace(/^\[|\]$/g, '');
  return ['127.0.0.1', 'localhost', '::1'].includes(host) && req.headers['x-rumo-token'] === token;
}

function readDef(root, def) {
  const target = path.join(root, def.file);
  const model = path.join(root, def.model);
  const exists = fs.existsSync(target);
  const source = exists ? target : model;
  return { ...def, exists, content: fs.existsSync(source) ? fs.readFileSync(source, 'utf8') : `# ${def.label}\n` };
}

function atomicWrite(root, def, content) {
  const target = path.join(root, def.file);
  fs.mkdirSync(path.dirname(target), { recursive: true });
  if (fs.existsSync(target)) {
    const stamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backup = path.join(root, '.sync', 'backups', 'config', def.id, `${stamp}.md`);
    fs.mkdirSync(path.dirname(backup), { recursive: true });
    fs.copyFileSync(target, backup);
  }
  const temp = `${target}.${process.pid}.${Date.now()}.tmp`;
  fs.writeFileSync(temp, content, { encoding: 'utf8', flag: 'wx' });
  fs.renameSync(temp, target);
}

async function bodyOf(req) {
  const chunks = [];
  let size = 0;
  for await (const chunk of req) {
    size += chunk.length;
    if (size > MAX_BODY) throw new Error('too_large');
    chunks.push(chunk);
  }
  return JSON.parse(Buffer.concat(chunks).toString('utf8') || '{}');
}

export function createPanelServer({ token = crypto.randomBytes(24).toString('base64url'), root = ROOT, htmlFile = path.join(root, 'prototipo', 'rumo.html') } = {}) {
  const server = http.createServer(async (req, res) => {
    try {
      const url = new URL(req.url, 'http://127.0.0.1');
      if (url.pathname === '/' && req.method === 'GET') {
        const html = fs.readFileSync(htmlFile);
        res.writeHead(200, {
          'Content-Type': 'text/html; charset=utf-8',
          'Content-Length': html.length,
          'Cache-Control': 'no-store',
          // cdnjs só para o leitor de PDF do CV (pdf.js), carregado a pedido; o worker precisa de blob:.
          'Content-Security-Policy': "default-src 'self'; script-src 'self' 'unsafe-inline' https://cdnjs.cloudflare.com; worker-src 'self' blob: https://cdnjs.cloudflare.com; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src https://fonts.gstatic.com; connect-src 'self' https://cdnjs.cloudflare.com; img-src 'self' data:;",
        });
        return res.end(html);
      }
      if (!url.pathname.startsWith('/api/') || !authorized(req, token)) return json(res, 403, { error: 'Acesso recusado.' });
      if (url.pathname === '/api/emails' && req.method === 'GET') return json(res, 200, readEmails(root));
      if (url.pathname === '/api/agenda' && req.method === 'GET') return json(res, 200, readAgenda(root));
      if (url.pathname === '/api/vagas' && req.method === 'GET') return json(res, 200, { items: lerVagas(root) });
      if (url.pathname === '/api/vagas' && req.method === 'POST') {
        const body = await bodyOf(req);
        const resultado = guardarVagas(body.items, root);
        return json(res, 200, { ...resultado, items: lerVagas(root) });
      }
      if (url.pathname === '/api/financas' && req.method === 'GET') return json(res, 200, readFinance(root));
      const financeMatch = url.pathname.match(/^\/api\/financas\/(month\/\d{4}-\d{2}|budget|rules|accounts|goals)$/);
      if (financeMatch && req.method === 'PUT') {
        const body = await bodyOf(req);
        const changed = writeFinancePart(financeMatch[1], body, root);
        return json(res, 200, { ok: true, changed });
      }
      if (url.pathname === '/api/escrita' && req.method === 'GET') return json(res, 200, readWriting(root));
      if (url.pathname === '/api/escrita' && req.method === 'PUT') {
        const body = await bodyOf(req);
        const changed = writeWriting(body, root);
        return json(res, 200, { ok: true, changed });
      }
      if (url.pathname === '/api/limites' && (req.method === 'GET' || req.method === 'POST')) {
        return json(res, 200, await readLimits());
      }
      if (url.pathname === '/api/claude' && req.method === 'POST') {
        const body = await bodyOf(req);
        const prompt = String(body.prompt ?? '').slice(0, 60000);
        if (!prompt.trim()) return json(res, 400, { error: 'Pedido vazio.' });
        try {
          const web = body.web === true;
          return json(res, 200, { text: await askClaude(prompt, { model: String(body.modelo ?? ''), web, timeout: web ? 300000 : 180000 }) });
        } catch (e) {
          const msg = e.message === 'nao-instalado'
            ? 'O Claude Code não está instalado neste computador (ou não está no PATH).'
            : e.message === 'demorou demasiado' ? 'O Claude demorou demasiado. Tenta outra vez.' : `O Claude não respondeu: ${e.message}`;
          return json(res, 502, { error: msg });
        }
      }
      if (url.pathname === '/api/files' && req.method === 'GET') {
        return json(res, 200, { files: FILE_DEFS.map((d) => { const x = readDef(root, d); return { id: x.id, group: x.group, label: x.label, description: x.description, exists: x.exists }; }) });
      }
      const match = url.pathname.match(/^\/api\/files\/([a-z-]+)$/);
      const def = match && BY_ID.get(match[1]);
      if (!def) return json(res, 404, { error: 'Ficheiro desconhecido.' });
      if (req.method === 'GET') return json(res, 200, readDef(root, def));
      if (req.method === 'PUT') {
        const body = await bodyOf(req);
        if (typeof body.content !== 'string') return json(res, 400, { error: 'Conteúdo inválido.' });
        atomicWrite(root, def, body.content.replace(/\r\n/g, '\n').replace(/\s*$/, '\n'));
        return json(res, 200, { ok: true, exists: true });
      }
      return json(res, 405, { error: 'Operação não permitida.' });
    } catch (err) {
      return json(res, err.message === 'too_large' ? 413 : 400, { error: err.message === 'too_large' ? 'O documento é demasiado grande.' : 'Não foi possível processar o pedido.' });
    }
  });
  return { server, token };
}

export function readState(root = ROOT) {
  try { return JSON.parse(fs.readFileSync(STATE_FILE(root), 'utf8')); } catch { return null; }
}
function writeState(state, root = ROOT) {
  fs.mkdirSync(path.dirname(STATE_FILE(root)), { recursive: true });
  fs.writeFileSync(STATE_FILE(root), `${JSON.stringify(state, null, 2)}\n`, { mode: 0o600 });
}
/** Só apaga o estado se for mesmo deste processo: um arranque falhado não pode
 *  deitar abaixo o registo do painel que já está de pé. */
function clearState(root = ROOT, pid = null) {
  if (pid !== null && readState(root)?.pid !== pid) return;
  try { fs.rmSync(STATE_FILE(root), { force: true }); } catch { /* já não existe */ }
}

/** O painel está mesmo a responder nesta porta? (o pid guardado pode ser de um processo morto) */
export function ping(port, timeout = 800) {
  return new Promise((resolve) => {
    const req = http.get({ host: '127.0.0.1', port, path: '/', timeout }, (res) => {
      res.resume();
      resolve(res.statusCode === 200);
    });
    req.on('timeout', () => { req.destroy(); resolve(false); });
    req.on('error', () => resolve(false));
  });
}

/** Lança o servidor sem janela nenhuma: no Windows por wscript, nos outros destacado. */
function spawnBackground(port, root = ROOT) {
  const script = fileURLToPath(import.meta.url);
  const args = ['servir', '--port', String(port), '--no-open'];
  if (process.platform === 'win32') {
    const vbs = path.join(root, '.sync', 'painel.vbs');
    const q = (s) => String(s).replace(/"/g, '""');
    fs.mkdirSync(path.dirname(vbs), { recursive: true });
    fs.writeFileSync(vbs, [
      "' Gerado por scripts/painel.mjs: arranca o painel local sem abrir nenhuma janela.",
      'Set sh = CreateObject("WScript.Shell")',
      `sh.Run """${q(process.execPath)}"" ""${q(script)}"" ${args.join(' ')}", 0, False`,
      '',
    ].join('\r\n'));
    const child = spawn('wscript.exe', [vbs], { detached: true, stdio: 'ignore', windowsHide: true });
    child.unref();
    return;
  }
  const child = spawn(process.execPath, [script, ...args], { detached: true, stdio: 'ignore' });
  child.unref();
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/** Arranca o painel (se ainda não estiver de pé) e devolve o endereço com a chave. */
export async function ensureRunning({ port = DEFAULT_PORT, root = ROOT, wait = 8000 } = {}) {
  const state = readState(root);
  if (state?.port && await ping(state.port)) return { ...state, started: false };
  // Porta ocupada sem estado nosso: é um painel de outra versão, aberto à mão num terminal.
  if (await ping(port)) throw new Error(`Já está um painel a responder em http://127.0.0.1:${port}. Fecha a janela onde o abriste (ou termina esse processo) e tenta outra vez.`);
  clearState(root);
  spawnBackground(port, root);
  const until = Date.now() + wait;
  while (Date.now() < until) {
    await sleep(200);
    const fresh = readState(root);
    if (fresh?.port && await ping(fresh.port)) return { ...fresh, started: true };
  }
  throw new Error('O painel não arrancou a tempo. Corre "node scripts/painel.mjs servir" para veres o erro.');
}

function stopRunning(root = ROOT) {
  const state = readState(root);
  if (!state?.pid) { clearState(root); return false; }
  try { process.kill(state.pid); } catch { /* já tinha terminado */ }
  clearState(root);
  return true;
}

function openBrowser(url) {
  const [cmd, args] = process.platform === 'win32'
    ? ['cmd.exe', ['/c', 'start', '', url]]
    : process.platform === 'darwin' ? ['open', [url]] : ['xdg-open', [url]];
  const child = execFile(cmd, args, { windowsHide: true }, () => {});
  child.unref();
}

/** Servidor em primeiro plano. É o que corre dentro do processo de segundo plano. */
export async function serve(argv = []) {
  const noOpen = argv.includes('--no-open');
  const at = argv.indexOf('--port');
  // Uma porta estável mantém o mesmo armazenamento local do navegador entre sessões.
  // Usa --port 0 apenas quando for mesmo necessário escolher uma porta aleatória.
  const port = at >= 0 ? Number(argv[at + 1]) : DEFAULT_PORT;
  // A chave mantém-se entre arranques, para o endereço guardado continuar a servir.
  const token = process.env.RUMO_PANEL_TOKEN || readState()?.token || undefined;
  const { server, token: live } = createPanelServer({ token });
  await new Promise((resolve, reject) => server.listen(port, '127.0.0.1', resolve).once('error', reject));
  const url = `http://127.0.0.1:${server.address().port}/?local=${encodeURIComponent(live)}`;
  writeState({ port: server.address().port, token: live, pid: process.pid, url, desde: new Date().toISOString() });
  const bye = () => { clearState(ROOT, process.pid); process.exit(0); };
  process.on('SIGINT', bye);
  process.on('SIGTERM', bye);
  process.on('exit', () => clearState(ROOT, process.pid));
  console.log(`Rumo local: ${url}`);
  if (!noOpen) openBrowser(url);
  return { server, url };
}

export async function main(argv = process.argv.slice(2)) {
  const [cmd = 'abrir', ...rest] = argv[0]?.startsWith('--') ? ['abrir', ...argv] : argv;
  if (cmd === 'servir') return serve(rest);
  if (cmd === 'parar') {
    console.log(stopRunning() ? 'Painel desligado.' : 'O painel não estava a correr.');
    return;
  }
  if (cmd === 'estado') {
    const state = readState();
    if (state?.port && await ping(state.port)) console.log(`A correr em segundo plano desde ${state.desde}\n${state.url}`);
    else console.log('Não está a correr. Usa "node scripts/painel.mjs" ou o atalho "Abrir Rumo".');
    return;
  }
  if (cmd !== 'abrir') {
    console.log('painel — node scripts/painel.mjs <comando>\n\n  abrir (padrão)  arranca em segundo plano (se preciso) e abre no navegador\n  parar           desliga o painel\n  estado          diz se está a correr e em que endereço\n  servir          corre em primeiro plano (para ver erros)');
    return;
  }
  const at = rest.indexOf('--port');
  const state = await ensureRunning({ port: at >= 0 ? Number(rest[at + 1]) : DEFAULT_PORT });
  console.log(`Rumo local: ${state.url}`);
  console.log(state.started ? 'A correr em segundo plano. Podes fechar esta janela; para desligar, "node scripts/painel.mjs parar".' : 'Já estava a correr em segundo plano.');
  if (!rest.includes('--no-open')) openBrowser(state.url);
  return state;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) await main();
