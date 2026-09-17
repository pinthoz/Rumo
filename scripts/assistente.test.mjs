// Testes dos scripts das áreas Rotina (tarefas e lembretes) e Finanças. Executar: npm test
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { parseTask, formatTask, planFor, addDays, nextDate, reminder, startupLine } from './rotina.mjs';
import { parseWhen, scheduleFrom, notifyCommand, plan, plistFor, parseMinutes } from './lembretes.mjs';
import { toNumber, toDate, parseCsv, categorize, summarize, recurring, money } from './financas.mjs';

const here = path.dirname(fileURLToPath(import.meta.url));
let root;
const run = (script, ...args) => {
  const r = spawnSync(process.execPath, [path.join(here, script), ...args], {
    env: { ...process.env, ASSISTENTE_ROOT: root, ROTINA_HOJE: '2026-09-17' },
    encoding: 'utf8',
  });
  return { code: r.status, out: r.stdout + r.stderr };
};
const file = (...p) => path.join(root, ...p);
const write = (rel, text) => {
  fs.mkdirSync(path.dirname(file(rel)), { recursive: true });
  fs.writeFileSync(file(rel), text);
};

before(() => {
  root = fs.mkdtempSync(path.join(os.tmpdir(), 'assistente-'));
});
after(() => fs.rmSync(root, { recursive: true, force: true }));

// ---------------------------------------------------------------- rotina

test('parseTask/formatTask: ida e volta', () => {
  const t = parseTask('- [ ] Pagar seguro do carro !1 @casa ^2026-09-20 ≈15m ~2');
  assert.deepEqual(
    { title: t.title, prio: t.prio, ctxs: t.ctxs, due: t.due, est: t.est, postponed: t.postponed, done: t.done },
    { title: 'Pagar seguro do carro', prio: 1, ctxs: ['casa'], due: '2026-09-20', est: '15m', postponed: 2, done: false },
  );
  assert.equal(formatTask(t), '- [ ] Pagar seguro do carro !1 @casa ^2026-09-20 ≈15m ~2');
  assert.equal(parseTask('- [x] Ligar ao banco ✓2026-09-10').doneOn, '2026-09-10');
  assert.equal(parseTask('texto normal'), null);
  assert.equal(parseTask('- [ ] Ler 1!2 páginas').title, 'Ler 1!2 páginas', 'só reconhece tokens isolados');
});

test('planFor: foco por prioridade e prazo; caixa e "algum dia" ficam de fora', () => {
  const mk = (line, section = 'Tarefas') => ({ ...parseTask(line), section });
  const tasks = [
    mk('- [ ] Baixa sem prazo !3'),
    mk('- [ ] Normal atrasada ^2026-09-10 ~4'),
    mk('- [ ] Urgente !1 ^2026-09-30'),
    mk('- [ ] Normal para hoje ^2026-09-17'),
    mk('- [ ] Ideia solta', 'Caixa de entrada'),
    mk('- [ ] Aprender piano !1', 'Algum dia'),
  ];
  const p = planFor(tasks, '2026-09-17');
  assert.deepEqual(p.focus.map((t) => t.title), ['Urgente', 'Normal atrasada', 'Normal para hoje']);
  assert.deepEqual(p.overdue.map((t) => t.title), ['Normal atrasada']);
  assert.deepEqual(p.chronic.map((t) => t.title), ['Normal atrasada']);
  assert.equal(p.inbox.length, 1);
  assert.equal(addDays('2026-12-31', 1), '2027-01-01');
});

test('rotina CLI: captura, adiar (com alerta), feito, hoje e semana', () => {
  write('rotina/tarefas.md', '# Tarefas\n<!--\n  - [ ] Exemplo que não é tarefa !1\n-->\n\n## Caixa de entrada\n\n## Tarefas\n- [ ] Declaração de IRS !1 ^2026-09-15 ~2\n- [ ] Ligar à Joana\n\n## Algum dia\n');
  assert.match(run('rotina.mjs', 'captura', 'Comprar', 'lâmpadas').out, /Capturado: Comprar lâmpadas/);
  let md = fs.readFileSync(file('rotina/tarefas.md'), 'utf8');
  assert.match(md, /## Caixa de entrada\n\n- \[ \] Comprar lâmpadas\n\n## Tarefas/);

  const hoje = run('rotina.mjs', 'hoje').out;
  assert.match(hoje, /1\. Declaração de IRS  !1  \(atrasada 2 dias\)/);
  assert.match(hoje, /Caixa de entrada: 1 por triar/);
  assert.doesNotMatch(hoje, /Exemplo/, 'comentários HTML não contam');

  const adiar = run('rotina.mjs', 'adiar', 'irs');
  assert.match(adiar.out, /Adiada para 2026-09-18: Declaração de IRS \(adiada 3×\)/);
  assert.match(adiar.out, /⚠ Já foi adiada 3 vezes/);
  assert.match(fs.readFileSync(file('rotina/tarefas.md'), 'utf8'), /- \[ \] Declaração de IRS !1 \^2026-09-18 ~3/);

  assert.equal(run('rotina.mjs', 'feito', 'nada disto').code, 2);
  write('rotina/tarefas.md', fs.readFileSync(file('rotina/tarefas.md'), 'utf8').replace('Ligar à Joana', 'Ligar à Joana\n- [ ] Ligar ao banco'));
  assert.match(run('rotina.mjs', 'feito', 'ligar').out, /ambíguo/);
  assert.match(run('rotina.mjs', 'feito', 'ligar a joana').out, /Feito: Ligar à Joana/);
  md = fs.readFileSync(file('rotina/tarefas.md'), 'utf8');
  assert.match(md, /- \[x\] Ligar à Joana ✓2026-09-17/);

  const semana = run('rotina.mjs', 'semana').out;
  assert.match(semana, /Feitas \(1\):\n  - Ligar à Joana \(2026-09-17\)/);
  assert.match(semana, /Mais adiadas:\n  - Declaração de IRS/);
});

test('tarefas recorrentes: ao marcar feita cria a próxima, com fim de mês ajustado', () => {
  assert.equal(nextDate('2026-01-31', 'mensal'), '2026-02-28');
  assert.equal(nextDate('2028-01-31', 'mensal'), '2028-02-29');
  assert.equal(nextDate('2026-12-15', 'mensal'), '2027-01-15');
  assert.equal(nextDate('2026-09-17', 'semanal'), '2026-09-24');
  assert.equal(nextDate('2026-02-28', 'anual'), '2027-02-28');
  assert.equal(parseTask('- [ ] Pagar renda *mensal ^2026-09-08').repeat, 'mensal');

  write('rotina/tarefas.md', '## Caixa de entrada\n\n## Tarefas\n- [ ] Pagar renda !1 ^2026-09-08 *mensal ~1\n');
  const r = run('rotina.mjs', 'feito', 'renda');
  assert.match(r.out, /Próxima \(mensal\): 2026-10-08/);
  const md = fs.readFileSync(file('rotina/tarefas.md'), 'utf8');
  assert.match(md, /- \[x\] Pagar renda !1 \^2026-09-08 \*mensal ~1 ✓2026-09-17\n- \[ \] Pagar renda !1 \^2026-10-08 \*mensal\n/);
});

// ---------------------------------------------------------------- lembretes

test('reminder: textos de manhã, prazo, tarde e semana', () => {
  const mk = (line, section = 'Tarefas') => ({ ...parseTask(line), section });
  const tasks = [
    mk('- [ ] IRS !1 ^2026-09-15'),
    mk('- [ ] Seguro ^2026-09-17'),
    mk('- [ ] Ler contrato'),
    mk('- [x] Ligar à Joana ✓2026-09-17'),
    mk('- [x] Ginásio ✓2026-09-12'),
    mk('- [ ] Ideia', 'Caixa de entrada'),
  ];
  const d = '2026-09-17';
  assert.deepEqual(reminder(tasks, 'manha', d), { title: 'Bom dia: as tuas prioridades', body: '1. IRS\n2. Seguro\n3. Ler contrato\n(1 atrasada)' });
  assert.deepEqual(reminder(tasks, 'prazo', d), { title: 'Prazo hoje (1)', body: 'Seguro' });
  assert.equal(reminder(tasks, 'prazo', '2026-09-18'), null, 'sem prazos hoje não incomoda');
  assert.match(reminder(tasks, 'tarde', d).body, /^Feitas hoje: 1\. Ainda com prazo até hoje: IRS, Seguro\nAbre \/feito\.$/);
  assert.match(reminder(tasks, 'semana', d).body, /^Feitas: 2 · Atrasadas: 1 · Por triar: 1/);
  assert.equal(reminder([], 'manha', d).title, 'Bom dia');
  assert.throws(() => reminder(tasks, 'noite', d), /manha \| tarde/);
});

test('lembretes: horários, comandos de notificação e planos de instalação por plataforma', () => {
  assert.deepEqual(parseWhen('manha', '8:05'), { kind: 'manha', hour: 8, minute: 5, weekday: null });
  assert.equal(parseWhen('semana', 'sex-18:00').weekday, 5);
  assert.equal(parseWhen('semana', '10:00').weekday, 0, 'semana sem dia = domingo');
  assert.throws(() => parseWhen('manha', 'seg-09:00'), /inválido/);
  assert.throws(() => parseWhen('tarde', '24:00'), /inválido/);
  assert.deepEqual(scheduleFrom({ desativar: 'prazo,semana' }).map((s) => s.kind), ['manha', 'tarde']);
  assert.throws(() => scheduleFrom({ desativar: 'noite' }), /desconhecido/);

  const win = notifyCommand('Título', 'Corpo "com" <aspas>', 'win32');
  assert.equal(win.cmd, 'powershell.exe');
  assert.deepEqual(win.env, { ASSIST_TITLE: 'Título', ASSIST_BODY: 'Corpo "com" <aspas>' }, 'texto vai por variáveis de ambiente, sem escapes');
  assert.match(Buffer.from(win.args.at(-1), 'base64').toString('utf16le'), /ToastNotificationManager/);
  const mac = notifyCommand('T', 'B', 'darwin');
  assert.deepEqual([mac.cmd, ...mac.args.slice(-2)], ['osascript', 'T', 'B']);

  const schedule = scheduleFrom({ manha: '08:30', semana: 'dom-17:00', desativar: 'tarde,prazo' });
  const wPlan = plan('instalar', 'win32', schedule, { LOCALAPPDATA: 'C:\\L' });
  assert.equal(wPlan[0].write, path.join('C:\\L', 'Assistente', 'lembrete.vbs'));
  assert.match(wPlan[0].content, /sh\.Run """.+node.*"" "".+rotina\.mjs"" lembrete " & WScript\.Arguments\(0\) & " --notificar", 0, False/);
  assert.deepEqual(wPlan[1].args.slice(0, 4), ['/Create', '/F', '/TN', 'Assistente\\Lembrete manha']);
  assert.deepEqual(wPlan[1].args.slice(-4), ['/SC', 'DAILY', '/ST', '08:30']);
  assert.deepEqual(wPlan[2].args.slice(-6), ['/SC', 'WEEKLY', '/D', 'SUN', '/ST', '17:00']);
  assert.ok(plan('remover', 'win32', [], { LOCALAPPDATA: 'C:\\L' }).every((s) => s.optional || s.remove), 'remover nunca falha se não houver nada');

  const mPlan = plan('instalar', 'darwin', schedule, { HOME: '/Users/x' });
  const plist = mPlan.find((s) => s.write?.endsWith('pt.assistente.lembrete.semana.plist')).content;
  assert.match(plist, /<key>Hour<\/key><integer>17<\/integer><key>Minute<\/key><integer>0<\/integer><key>Weekday<\/key><integer>0<\/integer>/);
  assert.match(plist, /<string>lembrete<\/string><string>semana<\/string><string>--notificar<\/string>/);
  assert.equal(mPlan.filter((s) => s.cmd === 'launchctl' && s.args[0] === 'bootstrap').length, 2);
  assert.throws(() => plan('instalar', 'linux', schedule), /cron/);
  assert.match(plistFor({ kind: 'manha', hour: 9, minute: 0, weekday: null }, '/a&b/node'), /<string>\/a&amp;b\/node<\/string>/);
});

test('arranque: resumo de uma linha para o hook, sem falhar nunca', () => {
  const mk = (line, section = 'Tarefas') => ({ ...parseTask(line), section });
  const tasks = [mk('- [ ] IRS !1 ^2026-09-15'), mk('- [ ] Seguro'), mk('- [ ] Ideia', 'Caixa de entrada')];
  assert.equal(
    startupLine(tasks, '2026-09-17'),
    'Hoje: 1) IRS (atrasada)  2) Seguro  · 1 atrasada · 1 por triar\n/hoje para planear · /foco para começar já',
  );
  assert.match(startupLine([], '2026-09-17'), /sem tarefas planeadas/);

  write('rotina/tarefas.md', '## Tarefas\n- [ ] Seguro\n');
  const out = JSON.parse(run('rotina.mjs', 'arranque').out);
  assert.deepEqual(Object.keys(out).sort(), ['suppressOutput', 'systemMessage'], 'só mensagem para o utilizador, sem injetar contexto');
  assert.match(out.systemMessage, /1\) Seguro/);

  const r = spawnSync(process.execPath, [path.join(here, 'rotina.mjs'), 'arranque'], {
    env: { ...process.env, ASSISTENTE_ROOT: path.join(root, 'nao-existe') },
    encoding: 'utf8',
  });
  assert.equal(r.status, 0, 'sem tarefas.md o hook não pode falhar');
  assert.equal(r.stdout, '');
});

test('rotina CLI: sem tarefas.md, cria-o a partir do modelo', () => {
  const alt = fs.mkdtempSync(path.join(os.tmpdir(), 'assistente-modelo-'));
  try {
    const model = '# Tarefas\n\n## Caixa de entrada\n\n## Tarefas\n\n## Algum dia\n';
    fs.mkdirSync(path.join(alt, 'rotina'));
    fs.writeFileSync(path.join(alt, 'rotina', 'tarefas.modelo.md'), model);
    const r = spawnSync(process.execPath, [path.join(here, 'rotina.mjs'), 'captura', 'Primeira'], {
      env: { ...process.env, ASSISTENTE_ROOT: alt },
      encoding: 'utf8',
    });
    assert.equal(r.status, 0, r.stderr);
    assert.match(fs.readFileSync(path.join(alt, 'rotina', 'tarefas.md'), 'utf8'), /## Caixa de entrada\n\n- \[ \] Primeira/);
    assert.equal(fs.readFileSync(path.join(alt, 'rotina', 'tarefas.modelo.md'), 'utf8'), model, 'o modelo não muda');
  } finally {
    fs.rmSync(alt, { recursive: true, force: true });
  }
});

test('temporizador: validação e modo --dry', () => {
  assert.equal(parseMinutes('25'), 25);
  assert.equal(parseMinutes('0,5'), 0.5);
  for (const bad of ['0', '-5', 'abc', '181']) assert.throws(() => parseMinutes(bad), /Minutos inválidos/);
  assert.match(run('lembretes.mjs', 'temporizador', '25', '--dry').out, /\[temporizador\] 25 min → "Pausa de 5 minutos/);
  assert.match(run('lembretes.mjs', 'temporizador', '10', 'Volta', 'ao', 'IRS', '--dry').out, /10 min → "Volta ao IRS"/);
  assert.equal(run('lembretes.mjs', 'temporizador', 'x').code, 2);
  assert.equal(run('lembretes.mjs', 'estado', 'extra').code, 2, 'outros comandos não aceitam argumentos soltos');
});

test('rotina lembrete (CLI) e lembretes --dry não mexem no sistema', () => {
  write('rotina/tarefas.md', '## Caixa de entrada\n\n## Tarefas\n- [ ] Seguro ^2026-09-17\n');
  assert.match(run('rotina.mjs', 'lembrete', 'prazo').out, /^Prazo hoje \(1\)\nSeguro/);
  assert.equal(run('rotina.mjs', 'lembrete', 'noite').code, 2);
  const r = run('lembretes.mjs', 'instalar', '--dry', '--plataforma', 'darwin');
  assert.match(r.out, /\[escrever\] .*pt\.assistente\.lembrete\.manha\.plist/);
  assert.equal(run('lembretes.mjs', 'instalar', '--dry', '--manha', '9h').code, 2);
});

// ---------------------------------------------------------------- finanças

test('conversões: números e datas em formatos de bancos portugueses', () => {
  assert.equal(toNumber('1.234,56'), 1234.56);
  assert.equal(toNumber('-12,30 €'), -12.3);
  assert.equal(toNumber('12.30'), 12.3);
  assert.equal(toNumber('1,234.56'), 1234.56);
  assert.equal(toNumber('(45,00)'), -45);
  assert.ok(Number.isNaN(toNumber('')));
  assert.equal(toDate('05/09/2026'), '2026-09-05');
  assert.equal(toDate('2026-09-05'), '2026-09-05');
  assert.equal(toDate('Saldo'), null);
  assert.deepEqual(parseCsv('a;"b;c";"d ""e"""\n1;2;3\n', ';'), [['a', 'b;c', 'd "e"'], ['1', '2', '3']]);
  assert.equal(categorize('COMPRA CONTINENTE LISBOA', [{ padrao: 'continente', categoria: 'Supermercado' }]), 'Supermercado');
  assert.equal(money(-1234.5), '-1 234,50 €');
});

test('summarize: transferências fora dos totais; orçamento e média dos meses anteriores', () => {
  const rows = [
    { data: '2026-07-10', descricao: 'x', valor: -100, categoria: 'Casa' },
    { data: '2026-08-10', descricao: 'x', valor: -200, categoria: 'Casa' },
    { data: '2026-09-01', descricao: 'Salário', valor: 1500, categoria: 'Salário' },
    { data: '2026-09-02', descricao: 'Renda', valor: -700, categoria: 'Casa' },
    { data: '2026-09-03', descricao: 'Poupança', valor: -300, categoria: 'Transferências' },
    { data: '2026-09-04', descricao: '???', valor: -50, categoria: '' },
  ];
  const s = summarize(rows, '2026-09', [{ categoria: 'Casa', limite: '650' }, { categoria: 'Lazer', limite: '100' }]);
  assert.equal(s.income, 1500);
  assert.equal(s.spent, -750);
  assert.equal(Math.round(s.rate * 100), 50);
  const casa = s.cats.find((c) => c.cat === 'Casa');
  assert.deepEqual([casa.total, casa.limit, casa.avg], [700, 650, 150]);
  assert.ok(s.cats.find((c) => c.cat === 'Lazer' && c.total === 0), 'categorias orçamentadas aparecem mesmo sem gastos');
  assert.ok(s.cats.find((c) => c.cat === '(sem categoria)'));
  assert.deepEqual(s.budget, { limit: 750, spent: 700 }, 'orçamento só soma categorias com limite');
});

test('recurring: deteta despesas repetidas em meses diferentes, ignorando números na descrição', () => {
  const row = (data, descricao, valor, categoria = '') => ({ data, descricao, valor, categoria });
  const rows = [
    row('2026-07-05', 'NETFLIX 0712', -12.99, 'Subscrições'),
    row('2026-08-05', 'NETFLIX 0812', -12.99, 'Subscrições'),
    row('2026-09-05', 'NETFLIX 0912', -12.99, 'Subscrições'),
    row('2026-08-10', 'GINASIO', -30),
    row('2026-09-10', 'GINASIO', -30),
    row('2026-09-12', 'JANTAR ANIVERSARIO', -80, 'Restauração'),
    row('2026-08-01', 'TRF POUPANCA', -200, 'Transferências'),
    row('2026-09-01', 'TRF POUPANCA', -200, 'Transferências'),
    row('2026-06-05', 'ANTIGO', -5),
    row('2026-07-06', 'ANTIGO', -5),
  ];
  const { months, items } = recurring(rows);
  assert.deepEqual(months, ['2026-07', '2026-08', '2026-09']);
  assert.deepEqual(
    items.map((i) => [i.label, i.monthsSeen, Math.round(i.monthly * 100) / 100]),
    [
      ['GINASIO', 2, 30],
      ['NETFLIX 0912', 3, 12.99],
    ],
  );
});

test('financas CLI: importar extrato com preâmbulo, sem duplicar; categorizar; resumo; património', () => {
  write('financas/regras.csv', 'padrao;categoria\ncontinente;Supermercado\nordenado;Salário\n');
  write('financas/orcamento.csv', 'categoria;limite\nSupermercado;50\n');
  const extrato = [
    'Extrato de conta',
    'Conta: 0001',
    '',
    'Data Mov.;Data Valor;Descrição;Débito;Crédito;Saldo',
    '01/09/2026;01/09/2026;TRF ORDENADO EMPRESA;;1.500,00;1.600,00',
    '03/09/2026;03/09/2026;COMPRA CONTINENTE;45,20;;1.554,80',
    '03/09/2026;03/09/2026;COMPRA CONTINENTE;45,20;;1.509,60',
    '05/09/2026;05/09/2026;PAG SERV EDP;60,00;;1.449,60',
    'Saldo final;;;;;1.449,60',
  ].join('\n');
  write('extrato.csv', extrato);
  let r = run('financas.mjs', 'importar', file('extrato.csv'), '--conta', 'CGD');
  assert.match(r.out, /Importados 4 movimentos \(conta "CGD"\); 0 já existiam; 1 linhas ignoradas; 1 sem categoria/);
  r = run('financas.mjs', 'importar', file('extrato.csv'), '--conta', 'CGD');
  assert.match(r.out, /Importados 0 movimentos .*; 4 já existiam/, 'duas compras iguais no mesmo dia não são apagadas nem duplicadas');
  const csv = fs.readFileSync(file('financas/movimentos/2026-09.csv'), 'utf8');
  assert.match(csv, /^data;descricao;valor;categoria;conta\n2026-09-01;TRF ORDENADO EMPRESA;1500,00;Salário;CGD/);

  write('financas/regras.csv', 'padrao;categoria\ncontinente;Supermercado\nordenado;Salário\nedp;Casa\n');
  r = run('financas.mjs', 'categorizar');
  assert.match(r.out, /1 movimentos categorizados/);
  assert.match(r.out, /Nenhum movimento sem categoria/);

  r = run('financas.mjs', 'resumo');
  assert.match(r.out, /Resumo 2026-09/);
  assert.match(r.out, /Receitas\s+1 500,00 €/);
  assert.match(r.out, /Despesas\s+-150,40 €/);
  assert.match(r.out, /Supermercado\s+90,40 €\s+50,00 €\s+181% .*❌/);
  assert.match(r.out, /Orçamento: gasto 90,40 € de 50,00 € → ultrapassado em 40,40 €/);
  write('financas/orcamento.csv', 'categoria;limite\nSupermercado;150\n');
  r = run('financas.mjs', 'resumo', '--data', '2026-09-21');
  assert.match(r.out, /disponível 59,60 €\n  Restam 10 dias → cerca de 5,96 € por dia/);
  assert.equal(run('financas.mjs', 'recorrentes').code, 2, 'só há um mês de dados');

  write('financas/contas.csv', 'conta;tipo;saldo;data\nCGD;à ordem;1.449,60;2026-09-05\nPPR;investimento;5.000,00;2026-06-30\n');
  r = run('financas.mjs', 'patrimonio', '--data', '2026-09-17');
  assert.match(r.out, /PPR .*⚠ saldo com 79 dias/);
  assert.match(r.out, /Total: 6 449,60 €/);

  assert.equal(run('financas.mjs', 'importar', 'nao-existe.csv').code, 2);
});

test('financas CLI: sem regras.csv, cria-o a partir do modelo', () => {
  fs.rmSync(file('financas/regras.csv'));
  write('financas/regras.modelo.csv', 'padrao;categoria\nedp;Casa\n');
  run('financas.mjs', 'categorizar');
  assert.equal(fs.readFileSync(file('financas/regras.csv'), 'utf8'), 'padrao;categoria\nedp;Casa\n');
});
