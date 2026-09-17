#!/usr/bin/env node
/**
 * rotina — tarefas, plano do dia e revisão semanal sobre rotina/tarefas.md.
 *
 * Formato de uma tarefa (tudo opcional exceto o título):
 *   - [ ] Pagar seguro do carro !1 @casa ^2026-09-20 ≈15m ~2
 *   !1..!3 prioridade (2 por omissão) · @contexto · ^prazo · ≈estimativa · ~vezes adiada
 *   *diaria | *semanal | *mensal | *anual — ao marcar como feita, cria a próxima
 *   Concluída: - [x] … ✓2026-09-17
 *
 * Zero dependências (Node >= 18). Uso: node scripts/rotina.mjs help
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { notify } from './lembretes.mjs';

const ROOT = path.resolve(process.env.ASSISTENTE_ROOT || path.join(path.dirname(fileURLToPath(import.meta.url)), '..'));
const FILE = path.join(ROOT, 'rotina', 'tarefas.md');
const MODEL = path.join(ROOT, 'rotina', 'tarefas.modelo.md'); // no git; o tarefas.md é pessoal e fica fora
const INBOX = 'Caixa de entrada';
const SOMEDAY = 'Algum dia';
const CHRONIC = 3; // adiamentos a partir dos quais uma tarefa é "crónica"

class CliError extends Error {}

const fold = (s) => s.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase();
const pad = (n) => String(n).padStart(2, '0');
const localToday = () => {
  const d = new Date();
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
};
export const addDays = (iso, n) => {
  const d = new Date(`${iso}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
};
const daysBetween = (a, b) => Math.round((new Date(`${b}T12:00:00Z`) - new Date(`${a}T12:00:00Z`)) / 86400000);

export function parseTask(line) {
  const m = line.match(/^\s*- \[( |x|X)\] (.*)$/);
  if (!m) return null;
  let text = m[2];
  const take = (re) => {
    const r = text.match(re);
    if (r) text = text.replace(r[0], '');
    return r?.[1];
  };
  // Os tokens só contam isolados (precedidos de espaço): "1!2 páginas" não é prioridade.
  const doneOn = take(/(?:^|\s+)✓(\d{4}-\d{2}-\d{2})(?!\S)/);
  const due = take(/(?:^|\s+)\^(\d{4}-\d{2}-\d{2})(?!\S)/);
  const prio = take(/(?:^|\s+)!([123])(?!\S)/);
  const postponed = take(/(?:^|\s+)~(\d+)(?!\S)/);
  const est = take(/(?:^|\s+)≈(\d+[mh])(?!\S)/);
  const repeat = take(/(?:^|\s+)\*(diaria|semanal|mensal|anual)(?!\S)/);
  const id = take(/(?:^|\s+)id:([a-z0-9]+)(?!\S)/);
  const ctxs = [...text.matchAll(/(?:^|\s)@([\p{L}\p{N}_-]+)/gu)].map((x) => x[1]);
  text = text.replace(/(?:^|\s+)@[\p{L}\p{N}_-]+/gu, '').trim();
  return {
    done: m[1] !== ' ',
    title: text,
    prio: prio ? Number(prio) : 2,
    ctxs,
    due,
    est,
    postponed: postponed ? Number(postponed) : 0,
    repeat,
    doneOn,
    id,
  };
}

/** Próxima data de uma tarefa recorrente (fim de mês ajustado: 31 jan → 28/29 fev). */
export function nextDate(iso, repeat) {
  if (repeat === 'diaria') return addDays(iso, 1);
  if (repeat === 'semanal') return addDays(iso, 7);
  const [y, m, d] = iso.split('-').map(Number);
  const months = repeat === 'anual' ? 12 : 1;
  const target = new Date(Date.UTC(y, m - 1 + months, 1));
  const lastDay = new Date(Date.UTC(target.getUTCFullYear(), target.getUTCMonth() + 1, 0)).getUTCDate();
  target.setUTCDate(Math.min(d, lastDay));
  return target.toISOString().slice(0, 10);
}

export function formatTask(t) {
  return [
    `- [${t.done ? 'x' : ' '}] ${t.title}`,
    t.prio !== 2 ? `!${t.prio}` : '',
    ...t.ctxs.map((c) => `@${c}`),
    t.due ? `^${t.due}` : '',
    t.est ? `≈${t.est}` : '',
    t.repeat ? `*${t.repeat}` : '',
    t.postponed ? `~${t.postponed}` : '',
    t.doneOn ? `✓${t.doneOn}` : '',
    t.id ? `id:${t.id}` : '',
  ]
    .filter(Boolean)
    .join(' ');
}

function load() {
  if (!fs.existsSync(FILE) && fs.existsSync(MODEL)) fs.copyFileSync(MODEL, FILE);
  if (!fs.existsSync(FILE)) throw new CliError('Não existe rotina/tarefas.md.');
  const lines = fs.readFileSync(FILE, 'utf8').split(/\r?\n/);
  const tasks = [];
  let section = '';
  let inComment = false;
  lines.forEach((line, i) => {
    // Linhas dentro de <!-- … --> (exemplos, instruções) não são tarefas.
    const opens = line.includes('<!--');
    const closes = line.includes('-->');
    if (inComment || opens) {
      inComment = !closes && (inComment || opens);
      return;
    }
    const h = line.match(/^##\s+(.*)$/);
    if (h) section = h[1].trim();
    const t = parseTask(line);
    if (t) tasks.push({ ...t, line: i, section });
  });
  return { lines, tasks };
}

function save(lines) {
  fs.writeFileSync(FILE, lines.join('\n'));
}

function find(tasks, query) {
  if (!query) throw new CliError('Indica parte do título da tarefa, entre aspas.');
  const q = fold(query);
  const open = tasks.filter((t) => !t.done);
  const exact = open.filter((t) => fold(t.title) === q);
  const hits = exact.length ? exact : open.filter((t) => fold(t.title).includes(q));
  if (!hits.length) throw new CliError(`Nenhuma tarefa por fazer contém "${query}".`);
  if (hits.length > 1) throw new CliError(`"${query}" é ambíguo:\n${hits.map((t) => `  - ${t.title}`).join('\n')}`);
  return hits[0];
}

const describe = (t, today) => {
  const bits = [t.title];
  if (t.prio !== 2) bits.push(`!${t.prio}`);
  if (t.due) {
    const late = daysBetween(t.due, today);
    bits.push(late > 0 ? `(atrasada ${late} dia${late > 1 ? 's' : ''})` : late === 0 ? '(hoje)' : `(prazo ${t.due})`);
  }
  if (t.est) bits.push(`≈${t.est}`);
  if (t.postponed) bits.push(`adiada ${t.postponed}×`);
  return bits.join('  ');
};

export function planFor(tasks, today) {
  const open = tasks.filter((t) => !t.done && t.section !== SOMEDAY && t.section !== INBOX);
  const overdue = open.filter((t) => t.due && t.due < today);
  const dueToday = open.filter((t) => t.due === today);
  const rank = (t) => [t.prio, t.due && t.due <= today ? 0 : 1, t.due || '9999', -t.postponed];
  const sorted = [...open].sort((a, b) => {
    const [x, y] = [rank(a), rank(b)];
    for (let i = 0; i < x.length; i++) if (x[i] !== y[i]) return x[i] < y[i] ? -1 : 1;
    return 0;
  });
  return {
    focus: sorted.slice(0, 3),
    overdue,
    dueToday,
    chronic: open.filter((t) => t.postponed >= CHRONIC),
    inbox: tasks.filter((t) => !t.done && t.section === INBOX),
  };
}

function cmdHoje(_, today) {
  const { tasks } = load();
  const p = planFor(tasks, today);
  const list = (arr) => (arr.length ? arr.map((t) => `  - ${describe(t, today)}`).join('\n') : '  (nada)');
  console.log(`Hoje, ${today}\n`);
  console.log('Foco (máx. 3):');
  console.log(p.focus.length ? p.focus.map((t, i) => `  ${i + 1}. ${describe(t, today)}`).join('\n') : '  (sem tarefas)');
  console.log(`\nAtrasadas (${p.overdue.length}):\n${list(p.overdue)}`);
  console.log(`\nCom prazo hoje (${p.dueToday.length}):\n${list(p.dueToday)}`);
  if (p.chronic.length) console.log(`\nAdiadas ${CHRONIC}+ vezes (partir em passos, delegar ou apagar):\n${list(p.chronic)}`);
  console.log(`\nCaixa de entrada: ${p.inbox.length} por triar`);
}

function cmdCaptura(args) {
  const text = args.join(' ').trim();
  if (!text) throw new CliError('Uso: captura "texto da tarefa"');
  const { lines } = load();
  const start = lines.findIndex((l) => new RegExp(`^##\\s+${INBOX}\\s*$`).test(l));
  if (start === -1) throw new CliError(`Falta a secção "## ${INBOX}" em rotina/tarefas.md.`);
  let end = lines.findIndex((l, i) => i > start && /^##\s+/.test(l));
  if (end === -1) end = lines.length;
  let at = end;
  while (at > start + 1 && !lines[at - 1].trim()) at--; // antes das linhas em branco finais da secção
  if (at === start + 1 && lines[at] !== undefined && !lines[at].trim()) at++; // secção vazia: manter a linha em branco após o título
  const insert = [`- [ ] ${text}`];
  if (/^##\s+/.test(lines[at] ?? '')) insert.push('');
  lines.splice(at, 0, ...insert);
  save(lines);
  console.log(`Capturado: ${text}`);
}

function update(query, today, fn) {
  const { lines, tasks } = load();
  const t = find(tasks, query);
  fn(t);
  lines[t.line] = formatTask(t);
  save(lines);
  return t;
}

function cmdAdiar([query, to], today, flags) {
  const target = flags.para || to || addDays(today, 1);
  const t = update(query, today, (x) => {
    x.postponed += 1;
    x.due = target;
  });
  console.log(`Adiada para ${target}: ${t.title} (adiada ${t.postponed}×)`);
  if (t.postponed >= CHRONIC) {
    console.log(`⚠ Já foi adiada ${t.postponed} vezes. Vale a pena perceber porquê: /travado "${t.title}"`);
  }
}

function cmdFeito([query], today) {
  const { lines, tasks } = load();
  const t = find(tasks, query);
  // A próxima ocorrência é uma tarefa nova: sem id (a sincronização atribui um).
  const next = t.repeat ? { ...t, id: undefined, done: false, doneOn: undefined, postponed: 0, due: nextDate(t.due || today, t.repeat) } : null;
  lines[t.line] = formatTask({ ...t, done: true, doneOn: today });
  if (next) lines.splice(t.line + 1, 0, formatTask(next));
  save(lines);
  console.log(`Feito: ${t.title}`);
  if (next) console.log(`Próxima (${t.repeat}): ${next.due}`);
}

function cmdSemana(_, today) {
  const { tasks } = load();
  const from = addDays(today, -6);
  const done = tasks.filter((t) => t.done && t.doneOn && t.doneOn >= from && t.doneOn <= today);
  const p = planFor(tasks, today);
  const postponed = tasks.filter((t) => !t.done && t.postponed).sort((a, b) => b.postponed - a.postponed).slice(0, 5);
  const list = (arr) => (arr.length ? arr.map((t) => `  - ${describe(t, today)}`).join('\n') : '  (nada)');
  console.log(`Semana ${from} → ${today}\n`);
  console.log(`Feitas (${done.length}):\n${done.length ? done.map((t) => `  - ${t.title} (${t.doneOn})`).join('\n') : '  (nada)'}`);
  console.log(`\nAtrasadas (${p.overdue.length}):\n${list(p.overdue)}`);
  console.log(`\nMais adiadas:\n${list(postponed)}`);
  console.log(`\nCaixa de entrada: ${p.inbox.length} por triar`);
}

/** Texto curto de um lembrete (título + corpo), ou null se não houver nada a lembrar. */
export function reminder(tasks, kind, today) {
  const p = planFor(tasks, today);
  const short = (t) => (t.title.length > 40 ? `${t.title.slice(0, 39)}…` : t.title);
  const active = tasks.filter((t) => !t.done && t.section !== SOMEDAY);
  if (kind === 'manha') {
    if (!p.focus.length) return { title: 'Bom dia', body: 'Sem tarefas planeadas. Abre /hoje para escolher as prioridades.' };
    const lines = p.focus.map((t, i) => `${i + 1}. ${short(t)}`);
    if (p.overdue.length) lines.push(`(${p.overdue.length} atrasada${p.overdue.length > 1 ? 's' : ''})`);
    return { title: 'Bom dia: as tuas prioridades', body: lines.join('\n') };
  }
  if (kind === 'prazo') {
    const due = active.filter((t) => t.due === today);
    return due.length ? { title: `Prazo hoje (${due.length})`, body: due.slice(0, 3).map(short).join('\n') } : null;
  }
  if (kind === 'tarde') {
    const doneToday = tasks.filter((t) => t.done && t.doneOn === today).length;
    const pending = active.filter((t) => t.due && t.due <= today);
    const tail = pending.length ? `Ainda com prazo até hoje: ${pending.slice(0, 2).map(short).join(', ')}${pending.length > 2 ? '…' : ''}` : 'Nada com prazo pendente.';
    return { title: 'Fecho do dia (2 min)', body: `Feitas hoje: ${doneToday}. ${tail}\nAbre /feito.` };
  }
  if (kind === 'semana') {
    const from = addDays(today, -6);
    const doneWeek = tasks.filter((t) => t.done && t.doneOn && t.doneOn >= from && t.doneOn <= today).length;
    return {
      title: 'Revisão semanal (15 min)',
      body: `Feitas: ${doneWeek} · Atrasadas: ${p.overdue.length} · Por triar: ${p.inbox.length}\nAbre /semana.`,
    };
  }
  throw new CliError('Tipo de lembrete: manha | tarde | prazo | semana');
}

/** Resumo de uma linha para mostrar ao abrir o Claude Code (hook SessionStart). */
export function startupLine(tasks, today) {
  const p = planFor(tasks, today);
  if (!p.focus.length) return 'Hoje: sem tarefas planeadas. /hoje para começar o dia.';
  const focus = p.focus.map((t, i) => `${i + 1}) ${t.title}${t.due && t.due < today ? ' (atrasada)' : ''}`).join('  ');
  const extra = [
    p.overdue.length ? `${p.overdue.length} atrasada${p.overdue.length > 1 ? 's' : ''}` : '',
    p.inbox.length ? `${p.inbox.length} por triar` : '',
  ].filter(Boolean);
  return `Hoje: ${focus}${extra.length ? `  · ${extra.join(' · ')}` : ''}\n/hoje para planear · /foco para começar já`;
}

/**
 * Chamado pelo hook de arranque: nunca falha (para não estragar a sessão) e não injeta nada no
 * contexto do modelo — só uma mensagem para o utilizador (systemMessage).
 */
function cmdArranque(_, today) {
  try {
    const line = startupLine(load().tasks, today);
    console.log(JSON.stringify({ systemMessage: line, suppressOutput: true }));
  } catch {
    // sem rotina/tarefas.md ou erro de leitura: não mostrar nada
  }
}

function cmdLembrete([kind], today, flags) {
  const r = reminder(load().tasks, kind, today);
  if (!r) return console.log('(nada a lembrar)');
  console.log(`${r.title}\n${r.body}`);
  if (flags.notificar) notify(r.title, r.body);
}

function cmdHelp() {
  console.log(`rotina — node scripts/rotina.mjs <comando>

  hoje                      foco do dia (máx. 3), atrasadas, prazos, tarefas crónicas
  captura "texto"           mete uma tarefa na caixa de entrada
  adiar "parte do título" [AAAA-MM-DD]   adia (amanhã por omissão) e conta o adiamento
  feito "parte do título"   marca como feita (se for recorrente, cria a próxima)
  semana                    revisão dos últimos 7 dias
  lembrete <manha|tarde|prazo|semana> [--notificar]
                            texto do lembrete (e notificação do sistema)
                            agendar: node scripts/lembretes.mjs instalar
  arranque                  resumo de 1 linha em JSON (usado pelo hook ao abrir o Claude Code)

Opções: --data AAAA-MM-DD (simula outro dia) · --para AAAA-MM-DD (em adiar)
Formato das tarefas: ver o topo de rotina/tarefas.md`);
}

const COMMANDS = {
  hoje: cmdHoje,
  captura: cmdCaptura,
  adiar: cmdAdiar,
  feito: cmdFeito,
  semana: cmdSemana,
  lembrete: cmdLembrete,
  arranque: cmdArranque,
  help: cmdHelp,
};

export function main(argv) {
  const [cmd = 'help', ...rest] = argv;
  const args = [];
  const flags = {};
  for (let i = 0; i < rest.length; i++) {
    if (['--help', '-h'].includes(rest[i])) return cmdHelp();
    if (rest[i] === '--notificar') flags.notificar = true;
    else if (rest[i].startsWith('--')) flags[rest[i].slice(2)] = rest[++i];
    else args.push(rest[i]);
  }
  const fn = COMMANDS[cmd];
  if (!fn) {
    console.error(`Comando desconhecido: ${cmd}\n`);
    cmdHelp();
    process.exitCode = 2;
    return;
  }
  const today = flags.data || process.env.ROTINA_HOJE || localToday();
  try {
    fn(args, today, flags);
  } catch (err) {
    if (!(err instanceof CliError)) throw err;
    console.error(`rotina: ${err.message}`);
    process.exitCode = 2;
  }
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) main(process.argv.slice(2));
