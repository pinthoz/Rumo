#!/usr/bin/env node
/**
 * financas — registo e controlo de gastos sobre financas/.
 *
 *   movimentos/AAAA-MM.csv   data;descricao;valor;categoria;conta   (valor < 0 = despesa)
 *   regras.csv               padrao;categoria     (o texto contido na descrição define a categoria)
 *   orcamento.csv            categoria;limite     (limite mensal de despesa, em euros)
 *   contas.csv               conta;tipo;saldo;data
 *
 * A categoria "Transferências" é ignorada nos totais (movimentos entre contas próprias).
 * Zero dependências (Node >= 18). Uso: node scripts/financas.mjs help
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(process.env.ASSISTENTE_ROOT || path.join(path.dirname(fileURLToPath(import.meta.url)), '..'));
const DIR = path.join(ROOT, 'financas');
const MOV = path.join(DIR, 'movimentos');
const HEADER = ['data', 'descricao', 'valor', 'categoria', 'conta'];
const TRANSFER = 'transferencias';

class CliError extends Error {}

const fold = (s) => String(s ?? '').normalize('NFD').replace(/\p{M}/gu, '').toLowerCase().trim();
const read = (f) => fs.readFileSync(f, 'utf8').replace(/^\uFEFF/, '');
export const money = (n) => {
  const [int, dec] = Math.abs(n).toFixed(2).split('.');
  return `${n < 0 ? '-' : ''}${int.replace(/\B(?=(\d{3})+(?!\d))/g, ' ')},${dec} €`;
};

// ---------------------------------------------------------------- CSV e conversões

export function parseCsv(text, sep) {
  const rows = [];
  let row = [];
  let cell = '';
  let quoted = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (quoted) {
      if (c === '"' && text[i + 1] === '"') cell += text[i++];
      else if (c === '"') quoted = false;
      else cell += c;
    } else if (c === '"') quoted = true;
    else if (c === sep) {
      row.push(cell);
      cell = '';
    } else if (c === '\n' || c === '\r') {
      if (c === '\r' && text[i + 1] === '\n') i++;
      row.push(cell);
      rows.push(row);
      row = [];
      cell = '';
    } else cell += c;
  }
  if (cell || row.length) rows.push([...row, cell]);
  return rows.filter((r) => r.some((x) => x.trim()));
}

const detectSep = (line) => ([';', ',', '\t'].map((s) => [s, line.split(s).length]).sort((a, b) => b[1] - a[1])[0][0]);

const csvCell = (v) => (/[;"\n]/.test(String(v)) ? `"${String(v).replace(/"/g, '""')}"` : String(v));

/** Aceita "1.234,56", "-12,30", "12.30", "1 234,56 €", "(12,30)". */
export function toNumber(s) {
  let t = String(s ?? '').replace(/[€\s\u00a0]/g, '');
  if (!t) return NaN;
  const neg = /^\(.*\)$/.test(t);
  t = t.replace(/[()]/g, '');
  const lastComma = t.lastIndexOf(',');
  const lastDot = t.lastIndexOf('.');
  if (lastComma > lastDot) t = t.replace(/\./g, '').replace(',', '.');
  else if (lastDot > lastComma && lastComma !== -1) t = t.replace(/,/g, '');
  const n = Number(t);
  return neg ? -n : n;
}

/** Aceita AAAA-MM-DD, DD/MM/AAAA, DD-MM-AAAA, DD.MM.AAAA. */
export function toDate(s) {
  const t = String(s ?? '').trim();
  let m = t.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (m) return `${m[1]}-${m[2]}-${m[3]}`;
  m = t.match(/^(\d{1,2})[/.-](\d{1,2})[/.-](\d{4})/);
  if (m) return `${m[3]}-${m[2].padStart(2, '0')}-${m[1].padStart(2, '0')}`;
  return null;
}

function readTable(file) {
  if (!fs.existsSync(file)) return [];
  const text = read(file);
  const rows = parseCsv(text, detectSep(text.split(/\r?\n/)[0]));
  const head = rows.shift()?.map(fold) ?? [];
  return rows.map((r) => Object.fromEntries(head.map((h, i) => [h, (r[i] ?? '').trim()])));
}

// ---------------------------------------------------------------- dados

function loadMovements() {
  if (!fs.existsSync(MOV)) return [];
  return fs
    .readdirSync(MOV)
    .filter((f) => /^\d{4}-\d{2}\.csv$/.test(f))
    .sort()
    .flatMap((f) => readTable(path.join(MOV, f)).map((r) => ({ ...r, valor: toNumber(r.valor) })));
}

function saveMovements(rows) {
  fs.mkdirSync(MOV, { recursive: true });
  const byMonth = new Map();
  for (const r of rows) {
    const k = r.data.slice(0, 7);
    if (!byMonth.has(k)) byMonth.set(k, []);
    byMonth.get(k).push(r);
  }
  for (const [month, list] of byMonth) {
    list.sort((a, b) => a.data.localeCompare(b.data));
    const lines = list.map((r) => [r.data, r.descricao, r.valor.toFixed(2).replace('.', ','), r.categoria || '', r.conta || ''].map(csvCell).join(';'));
    fs.writeFileSync(path.join(MOV, `${month}.csv`), [HEADER.join(';'), ...lines].join('\n') + '\n');
  }
}

function loadRules() {
  return readTable(path.join(DIR, 'regras.csv')).filter((r) => r.padrao && r.categoria);
}

export const categorize = (desc, rules) => rules.find((r) => fold(desc).includes(fold(r.padrao)))?.categoria ?? '';

const key = (r) => [r.data, fold(r.descricao), r.valor.toFixed(2), fold(r.conta)].join('|');

// ---------------------------------------------------------------- comandos

const ALIASES = {
  data: ['data', 'data mov', 'data mov.', 'data movimento', 'data lancamento', 'data operacao', 'data valor', 'date'],
  descricao: ['descricao', 'descritivo', 'movimento', 'designacao', 'description', 'detalhes'],
  valor: ['valor', 'montante', 'montante (eur)', 'importancia', 'amount', 'valor (eur)'],
  debito: ['debito', 'debito (eur)', 'debit'],
  credito: ['credito', 'credito (eur)', 'credit'],
};

function cmdImportar([file], flags) {
  if (!file || !fs.existsSync(file)) throw new CliError('Uso: importar <extrato.csv> [--conta nome] [--colunas "data=Data Mov.,descricao=Descrição,valor=Montante"]');
  const text = read(file);
  const lines = text.split(/\r?\n/);
  const custom = Object.fromEntries(
    (flags.colunas || '').split(',').filter(Boolean).map((p) => p.split('=').map((x) => fold(x))),
  );
  const names = (k) => (custom[k] ? [custom[k]] : ALIASES[k]);
  // Os bancos põem linhas de cabeçalho antes da tabela: procurar a linha com os nomes das colunas.
  const headerAt = lines.findIndex((l) => {
    const cells = l.split(detectSep(l)).map((c) => fold(c.replace(/"/g, '')));
    return cells.some((c) => names('data').includes(c)) && cells.some((c) => [...names('valor'), ...ALIASES.debito].includes(c));
  });
  if (headerAt === -1) throw new CliError('Não encontrei a linha de cabeçalho (data + valor/débito). Usa --colunas para indicar os nomes.');
  const sep = flags.sep || detectSep(lines[headerAt]);
  const rows = parseCsv(lines.slice(headerAt).join('\n'), sep);
  const head = rows.shift().map(fold);
  const col = (k) => head.findIndex((h) => names(k).includes(h));
  const [iD, iDesc, iV, iDeb, iCred] = [col('data'), col('descricao'), col('valor'), col('debito'), col('credito')];
  if (iDesc === -1) throw new CliError(`Não encontrei a coluna da descrição. Colunas: ${head.join(', ')}`);

  const rules = loadRules();
  const conta = flags.conta || 'principal';
  const incoming = [];
  let skipped = 0;
  for (const r of rows) {
    const data = toDate(r[iD]);
    const hasDebCred = (r[iCred] || '').trim() || (r[iDeb] || '').trim();
    const valor =
      iV !== -1 ? toNumber(r[iV]) : hasDebCred ? (toNumber(r[iCred]) || 0) - Math.abs(toNumber(r[iDeb]) || 0) : NaN;
    if (!data || Number.isNaN(valor)) {
      skipped++;
      continue;
    }
    const descricao = (r[iDesc] || '').replace(/\s+/g, ' ').trim();
    incoming.push({ data, descricao, valor, categoria: categorize(descricao, rules), conta });
  }
  const existing = loadMovements();
  const seen = new Map();
  for (const r of existing) seen.set(key(r), (seen.get(key(r)) || 0) + 1);
  const added = [];
  let dup = 0;
  for (const r of incoming) {
    const k = key(r);
    if (seen.get(k)) {
      seen.set(k, seen.get(k) - 1);
      dup++;
    } else added.push(r);
  }
  saveMovements([...existing, ...added]);
  const uncat = added.filter((r) => !r.categoria).length;
  console.log(`Importados ${added.length} movimentos (conta "${conta}"); ${dup} já existiam; ${skipped} linhas ignoradas; ${uncat} sem categoria.`);
  if (uncat) console.log('Próximo passo: node scripts/financas.mjs categorizar');
}

function cmdCategorizar() {
  const rules = loadRules();
  const rows = loadMovements();
  let changed = 0;
  for (const r of rows) {
    if (r.categoria) continue;
    r.categoria = categorize(r.descricao, rules);
    if (r.categoria) changed++;
  }
  if (changed) saveMovements(rows);
  const groups = new Map();
  for (const r of rows.filter((x) => !x.categoria)) {
    const g = groups.get(r.descricao) || { n: 0, total: 0 };
    g.n++;
    g.total += r.valor;
    groups.set(r.descricao, g);
  }
  console.log(`${changed} movimentos categorizados pelas regras.`);
  if (!groups.size) return console.log('Nenhum movimento sem categoria.');
  console.log(`\nSem categoria (${groups.size} descrições) — acrescenta regras em financas/regras.csv:`);
  for (const [d, g] of [...groups].sort((a, b) => a[1].total - b[1].total)) console.log(`  ${money(g.total).padStart(14)}  ×${g.n}  ${d}`);
}

export function summarize(rows, month, budget) {
  const inMonth = rows.filter((r) => r.data.startsWith(month) && fold(r.categoria) !== TRANSFER);
  const income = inMonth.filter((r) => r.valor > 0).reduce((s, r) => s + r.valor, 0);
  const spent = inMonth.filter((r) => r.valor < 0).reduce((s, r) => s + r.valor, 0);
  const prevMonths = [...new Set(rows.map((r) => r.data.slice(0, 7)))].filter((m) => m < month).sort().slice(-3);
  const byCat = new Map();
  for (const r of inMonth.filter((x) => x.valor < 0)) {
    const c = r.categoria || '(sem categoria)';
    byCat.set(c, (byCat.get(c) || 0) - r.valor);
  }
  for (const b of budget) if (!byCat.has(b.categoria)) byCat.set(b.categoria, 0);
  const cats = [...byCat].map(([cat, total]) => {
    const limit = toNumber(budget.find((b) => fold(b.categoria) === fold(cat))?.limite);
    const prev = prevMonths.length
      ? rows
          .filter((r) => prevMonths.includes(r.data.slice(0, 7)) && (r.categoria || '(sem categoria)') === cat && r.valor < 0)
          .reduce((s, r) => s - r.valor, 0) / prevMonths.length
      : null;
    return { cat, total, limit: Number.isNaN(limit) ? null : limit, avg: prev };
  });
  cats.sort((a, b) => b.total - a.total);
  const top = inMonth.filter((r) => r.valor < 0).sort((a, b) => a.valor - b.valor).slice(0, 5);
  const budgeted = cats.filter((c) => c.limit !== null);
  const budgetUse = {
    limit: budgeted.reduce((s, c) => s + c.limit, 0),
    spent: budgeted.reduce((s, c) => s + c.total, 0),
  };
  return {
    income,
    spent,
    balance: income + spent,
    rate: income ? (income + spent) / income : null,
    cats,
    top,
    prevMonths,
    count: inMonth.length,
    budget: budgetUse,
  };
}

/** Despesas que se repetem (mesma descrição, sem números) em pelo menos 2 dos últimos N meses com dados. */
export function recurring(rows, lastN = 3) {
  const months = [...new Set(rows.map((r) => r.data.slice(0, 7)))].sort().slice(-lastN);
  const norm = (d) => fold(d).replace(/\d+/g, ' ').replace(/[^\p{L} ]/gu, ' ').replace(/\s+/g, ' ').trim();
  const groups = new Map();
  for (const r of rows) {
    const month = r.data.slice(0, 7);
    if (r.valor >= 0 || !months.includes(month) || fold(r.categoria) === TRANSFER) continue;
    const k = norm(r.descricao);
    if (!k) continue;
    const g = groups.get(k) || { label: r.descricao, categoria: r.categoria, months: new Set(), total: 0 };
    g.months.add(month);
    g.total -= r.valor;
    g.label = r.descricao;
    groups.set(k, g);
  }
  return {
    months,
    items: [...groups.values()]
      .filter((g) => g.months.size >= 2)
      .map((g) => ({ label: g.label, categoria: g.categoria, monthsSeen: g.months.size, monthly: g.total / g.months.size }))
      .sort((a, b) => b.monthly - a.monthly),
  };
}

function cmdResumo([month], flags) {
  const rows = loadMovements();
  if (!rows.length) throw new CliError('Ainda não há movimentos. Começa por: importar <extrato.csv>');
  month = month || rows.map((r) => r.data.slice(0, 7)).sort().at(-1);
  const s = summarize(rows, month, readTable(path.join(DIR, 'orcamento.csv')));
  if (!s.count) throw new CliError(`Sem movimentos em ${month}.`);
  console.log(`Resumo ${month}  (${s.count} movimentos, sem transferências)\n`);
  console.log(`  Receitas   ${money(s.income).padStart(14)}`);
  console.log(`  Despesas   ${money(s.spent).padStart(14)}`);
  console.log(`  Saldo      ${money(s.balance).padStart(14)}${s.rate !== null ? `   (poupança ${Math.round(s.rate * 100)}%)` : ''}`);
  const avgHead = s.prevMonths.length ? `média ${s.prevMonths.length}m` : '';
  console.log(`\n  ${'categoria'.padEnd(22)}${'gasto'.padStart(13)}${'limite'.padStart(13)}  ${'uso'.padStart(5)}  ${avgHead.padStart(12)}`);
  for (const c of s.cats) {
    const pct = c.limit ? c.total / c.limit : null;
    const flag = pct === null ? '' : pct > 1 ? ' ❌' : pct >= 0.9 ? ' ⚠' : '';
    console.log(
      `  ${c.cat.padEnd(22)}${money(c.total).padStart(13)}${(c.limit !== null ? money(c.limit) : '—').padStart(13)}  ${(pct !== null ? `${Math.round(pct * 100)}%` : '').padStart(5)}  ${(c.avg !== null ? money(c.avg) : '').padStart(12)}${flag}`,
    );
  }
  if (s.budget.limit > 0) {
    const left = s.budget.limit - s.budget.spent;
    console.log(`\n  Orçamento: gasto ${money(s.budget.spent)} de ${money(s.budget.limit)} → ${left >= 0 ? `disponível ${money(left)}` : `ultrapassado em ${money(-left)}`}`);
    const today = flags.data || new Date().toISOString().slice(0, 10);
    if (today.startsWith(month) && left > 0) {
      const [y, m, d] = today.split('-').map(Number);
      const daysLeft = new Date(Date.UTC(y, m, 0)).getUTCDate() - d + 1;
      console.log(`  Restam ${daysLeft} dias → cerca de ${money(left / daysLeft)} por dia nas categorias orçamentadas`);
    }
  } else {
    console.log('\n  Orçamento: sem limites definidos em financas/orcamento.csv');
  }
  console.log('\n  Maiores despesas:');
  for (const r of s.top) console.log(`    ${r.data}  ${money(r.valor).padStart(12)}  ${r.descricao}${r.categoria ? '' : '  (sem categoria)'}`);
}

function cmdRecorrentes() {
  const { months, items } = recurring(loadMovements());
  if (months.length < 2) throw new CliError('São precisos pelo menos 2 meses de movimentos para detetar despesas recorrentes.');
  console.log(`Despesas recorrentes (em 2+ de ${months.join(', ')}):\n`);
  if (!items.length) return console.log('  (nenhuma)');
  for (const i of items) console.log(`  ${money(i.monthly).padStart(12)}/mês  ${i.monthsSeen}/${months.length} meses  ${i.label}${i.categoria ? `  [${i.categoria}]` : ''}`);
  console.log(`\nTotal recorrente: cerca de ${money(items.reduce((s, i) => s + i.monthly, 0))}/mês`);
  console.log('Nota: a deteção é por descrição; confirma cada linha (pode incluir compras repetidas que não são fixas).');
}

function cmdPatrimonio(_, flags) {
  const accounts = readTable(path.join(DIR, 'contas.csv'));
  if (!accounts.length) throw new CliError('financas/contas.csv não existe ou está vazio. Copia financas/contas.modelo.csv e preenche os saldos.');
  const today = flags.data || new Date().toISOString().slice(0, 10);
  const byType = new Map();
  let total = 0;
  console.log('Contas:');
  for (const a of accounts) {
    const v = toNumber(a.saldo);
    if (Number.isNaN(v)) continue;
    total += v;
    byType.set(a.tipo, (byType.get(a.tipo) || 0) + v);
    const age = a.data ? Math.round((new Date(today) - new Date(toDate(a.data))) / 86400000) : null;
    const stale = age === null ? '  (sem data)' : age > 35 ? `  ⚠ saldo com ${age} dias` : '';
    console.log(`  ${a.conta.padEnd(24)} ${(a.tipo || '').padEnd(14)} ${money(v).padStart(14)}${stale}`);
  }
  console.log('\nPor tipo:');
  for (const [t, v] of byType) console.log(`  ${(t || '(sem tipo)').padEnd(24)} ${money(v).padStart(14)}`);
  console.log(`\nTotal: ${money(total)}`);
}

function cmdHelp() {
  console.log(`financas — node scripts/financas.mjs <comando>

  importar <extrato.csv> [--conta nome] [--colunas "data=…,descricao=…,valor=…"]
                          importa um extrato bancário (CSV), sem duplicar movimentos
  categorizar             aplica financas/regras.csv e lista o que falta categorizar
  resumo [AAAA-MM]        receitas, despesas, poupança, orçamento e quanto ainda se pode gastar
  recorrentes             despesas fixas e subscrições (repetidas nos últimos 3 meses)
  patrimonio              saldos por conta e por tipo (financas/contas.csv)

Opção: --data AAAA-MM-DD (simula outro dia)`);
}

const COMMANDS = {
  importar: cmdImportar,
  categorizar: cmdCategorizar,
  resumo: cmdResumo,
  recorrentes: cmdRecorrentes,
  patrimonio: cmdPatrimonio,
  help: cmdHelp,
};

export function main(argv) {
  const [cmd = 'help', ...rest] = argv;
  const args = [];
  const flags = {};
  for (let i = 0; i < rest.length; i++) {
    if (['--help', '-h'].includes(rest[i])) return cmdHelp();
    if (rest[i].startsWith('--')) flags[rest[i].slice(2)] = rest[++i];
    else args.push(rest[i]);
  }
  const fn = COMMANDS[cmd];
  if (!fn) {
    console.error(`Comando desconhecido: ${cmd}\n`);
    cmdHelp();
    process.exitCode = 2;
    return;
  }
  try {
    fn(args, flags);
  } catch (err) {
    if (!(err instanceof CliError)) throw err;
    console.error(`financas: ${err.message}`);
    process.exitCode = 2;
  }
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) main(process.argv.slice(2));
