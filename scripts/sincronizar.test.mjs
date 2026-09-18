// Testes da sincronização entre os ficheiros locais e o Rumo. Executar: npm test
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { mdToTasks, tasksToMd, mergeById, sameTask, keyMovements, mergeMap, mergeRules, readRemote, sameApp, resolveApp, recentJobs } from './sincronizar.mjs';

const here = path.dirname(fileURLToPath(import.meta.url));
let root;
const file = (...p) => path.join(root, ...p);
const write = (rel, text) => {
  fs.mkdirSync(path.dirname(file(rel)), { recursive: true });
  fs.writeFileSync(file(rel), text);
};
const read = (rel) => fs.readFileSync(file(rel), 'utf8');
const run = (...args) => {
  const r = spawnSync(process.execPath, [path.join(here, 'sincronizar.mjs'), ...args], { env: { ...process.env, ASSISTENTE_ROOT: root }, encoding: 'utf8' });
  return { code: r.status, out: r.stdout + r.stderr };
};
const remoteDoc = (dir, name, data, version = 3) => {
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, `${name}.json`), JSON.stringify({ id: name, data, version, updatedAt: '2026-09-17T10:00:00Z' }));
};

before(() => {
  root = fs.mkdtempSync(path.join(os.tmpdir(), 'sync-'));
});
after(() => fs.rmSync(root, { recursive: true, force: true }));

test('mdToTasks / tasksToMd: secções, tokens e ids atribuídos', () => {
  const md = [
    '# Tarefas',
    '<!--',
    '  - [ ] Exemplo ignorado',
    '-->',
    '',
    '## Caixa de entrada',
    '- [ ] Ideia solta',
    '',
    '## Tarefas',
    '- [ ] Pagar renda !1 @casa ^2026-10-08 *mensal ~1 id:abc123',
    '- [x] Ligar à Joana ✓2026-09-16',
    '',
    '## Algum dia',
    '- [ ] Aprender piano',
  ].join('\n');
  const { tasks, header, assigned } = mdToTasks(md, '2026-09-17');
  assert.equal(assigned, 3);
  assert.equal(tasks.length, 4);
  assert.match(header, /^# Tarefas\n<!--/);
  const renda = tasks.find((t) => t.id === 'abc123');
  assert.deepEqual(
    { t: renda.t, p: renda.p, due: renda.due, rep: renda.rep, adiada: renda.adiada, ctx: renda.ctx, inbox: renda.inbox },
    { t: 'Pagar renda', p: 1, due: '2026-10-08', rep: 'mensal', adiada: 1, ctx: ['casa'], inbox: false },
  );
  assert.equal(tasks.find((t) => t.t === 'Ideia solta').inbox, true);
  assert.equal(tasks.find((t) => t.t === 'Aprender piano').algumDia, true);
  assert.equal(tasks.find((t) => t.t === 'Ligar à Joana').feita, '2026-09-16');

  const out = tasksToMd(tasks, header);
  assert.match(out, /## Tarefas\n- \[ \] Pagar renda !1 @casa \^2026-10-08 \*mensal ~1 id:abc123\n- \[x\] Ligar à Joana ✓2026-09-16 id:[a-z0-9]+/);
  const again = mdToTasks(out, '2026-09-17');
  assert.equal(again.assigned, 0, 'depois de escrito, todas têm id');
  assert.deepEqual(again.tasks.map((t) => t.id), tasks.map((t) => t.id));
});

test('mergeById: fusão a três vias', () => {
  const t = (id, extra = {}) => ({ id, t: `T${id}`, p: 2, due: '', rep: '', adiada: 0, feita: null, inbox: false, algumDia: false, ...extra });
  const opts = { same: sameTask, resolve: (l, r) => (l.feita && !r.feita ? l : r) };

  // primeira vez: junta tudo
  let m = mergeById([t('a'), t('b')], [t('b'), t('c')], null, opts);
  assert.deepEqual(m.result.map((x) => x.id), ['a', 'b', 'c']);

  const base = [t('a'), t('b'), t('c'), t('d')];
  m = mergeById(
    [t('a', { feita: '2026-09-17' }), t('b'), t('c', { t: 'mudado no pc' }), t('e')], // a feita no pc; d apagada no pc; e nova no pc
    [t('a'), t('b', { adiada: 1 }), t('d'), t('f')], // b adiada na página; c apagada na página; f nova na página
    base,
    opts,
  );
  const byId = Object.fromEntries(m.result.map((x) => [x.id, x]));
  assert.equal(byId.a.feita, '2026-09-17', 'mudança só no computador');
  assert.equal(byId.b.adiada, 1, 'mudança só na página');
  assert.equal(byId.c.t, 'mudado no pc', 'apagada num lado mas alterada no outro: mantida');
  assert.ok(!byId.d, 'apagada no computador e intacta na página: apagada');
  assert.ok(byId.e && byId.f, 'novas dos dois lados');
  assert.equal(m.conflicts.length, 1);

  m = mergeById([t('a', { t: 'pc' })], [t('a', { t: 'página' })], [t('a')], opts);
  assert.equal(m.result[0].t, 'página', 'alterada nos dois lados: fica a da página');
  m = mergeById([t('a', { feita: '2026-09-17' })], [t('a', { adiada: 2 })], [t('a')], opts);
  assert.equal(m.result[0].feita, '2026-09-17', 'mas uma tarefa feita nunca volta a ficar por fazer');
});

test('keyMovements, mergeMap e mergeRules', () => {
  const mv = { d: '2026-09-03', desc: 'COMPRA CONTINENTE', v: -45.2, acc: 'CGD' };
  const k = keyMovements([mv, { ...mv }, { ...mv, v: -10 }]);
  assert.notEqual(k[0].id, k[1].id, 'duas compras iguais no mesmo dia são movimentos diferentes');
  assert.equal(keyMovements([{ ...mv, desc: 'compra continente' }])[0].id, k[0].id, 'o id não depende de maiúsculas');

  assert.deepEqual(mergeMap({ Casa: 700 }, {}, null).result, { Casa: 700 });
  assert.deepEqual(mergeMap({ Casa: 700, Lazer: 50 }, { Casa: 650, Lazer: 50 }, { Casa: 700, Lazer: 50 }).result, { Casa: 650, Lazer: 50 });
  const conflict = mergeMap({ Casa: 800 }, { Casa: 650 }, { Casa: 700 });
  assert.deepEqual([conflict.result, conflict.conflicts.length], [{ Casa: 650 }, 1]);

  const A = [{ p: 'lidl', cat: 'Supermercado' }];
  const B = [{ p: 'uber', cat: 'Transportes' }];
  assert.deepEqual(mergeRules(A, [...A, ...B], A).result, [...A, ...B]);
  assert.deepEqual(mergeRules([...B, ...A], A, A).result, [...B, ...A]);
  assert.deepEqual(mergeRules(B, [{ p: 'glovo', cat: 'Restauração' }], A).result.map((r) => r.p), ['glovo', 'uber']);
});

test('readRemote aceita documentos com e sem envelope', () => {
  const dir = file('rr');
  remoteDoc(path.join(dir, 'data', 'users', 'u_1'), 'tarefas', { items: [] }, 7);
  fs.writeFileSync(path.join(dir, 'regras.json'), JSON.stringify({ rules: [] }));
  fs.writeFileSync(path.join(dir, 'contas.json'), JSON.stringify({ items: [] }));
  fs.writeFileSync(path.join(dir, 'versoes.json'), JSON.stringify({ contas: 9 }));
  const docs = readRemote(dir);
  assert.deepEqual(docs.tarefas, { data: { items: [] }, version: 7 });
  assert.deepEqual(docs.regras, { data: { rules: [] }, version: undefined });
  assert.deepEqual(docs.contas, { data: { items: [] }, version: 9 }, 'versões vêm do versoes.json (formato real do read_db)');
  assert.ok(!docs.versoes, 'versoes.json não é um documento');
});

test('CLI: primeira sincronização, confirmação e apagamento na sincronização seguinte', () => {
  write('rotina/tarefas.md', '# Tarefas\n\n## Caixa de entrada\n\n## Tarefas\n- [ ] IRS !1 ^2026-09-20\n- [ ] Seguro\n\n## Algum dia\n');
  write('financas/movimentos/2026-09.csv', 'data;descricao;valor;categoria;conta\n2026-09-03;COMPRA CONTINENTE;-45,20;Supermercado;CGD\n');
  write('financas/orcamento.csv', 'categoria;limite\nSupermercado;200\nCasa;\n');
  write('financas/regras.csv', 'padrao;categoria\ncontinente;Supermercado\n');

  const remote1 = file('remoto1');
  remoteDoc(remote1, 'tarefas', { items: [{ id: 'web1', t: 'Ideia do telemóvel', p: 2, due: '', rep: '', adiada: 0, feita: null, inbox: true }] }, 4);

  let r = run('fundir', '--remoto', remote1, '--saida', file('saida1'), '--dry');
  assert.equal(r.code ?? 0, 0, r.out);
  assert.match(r.out, /Primeira sincronização/);
  assert.match(r.out, /\[simulação\] documentos a enviar: tarefas, fin-2026-09, fin-index, orcamento, regras, contas/);
  assert.doesNotMatch(read('rotina/tarefas.md'), /id:/, '--dry não mexe nos ficheiros');

  r = run('fundir', '--remoto', remote1, '--saida', file('saida1'));
  assert.equal(r.code ?? 0, 0, r.out);
  assert.match(r.out, /Tarefas: 2 do computador, 1 da página, 0 apagadas/);
  const md = read('rotina/tarefas.md');
  assert.match(md, /## Caixa de entrada\n- \[ \] Ideia do telemóvel id:web1/);
  assert.match(md, /- \[ \] IRS !1 \^2026-09-20 id:[a-z0-9]+/);
  const plan = JSON.parse(read('saida1/plano.json'));
  assert.equal(plan.find((p) => p.doc === 'tarefas').if_version, 4);
  assert.equal(plan.find((p) => p.doc === 'orcamento').if_version, undefined, 'documento novo não leva versão');
  const sentTasks = JSON.parse(read('saida1/tarefas.json')).items;
  assert.equal(sentTasks.length, 3);
  const sentMonth = JSON.parse(read('saida1/fin-2026-09.json')).mov;
  assert.equal(sentMonth[0].desc, 'COMPRA CONTINENTE');
  assert.deepEqual(JSON.parse(read('saida1/orcamento.json')), { limits: { Supermercado: 200 } });
  assert.ok(!fs.existsSync(file('.sync/base.json')), 'a base só é gravada depois de confirmar');

  assert.match(run('confirmar').out, /confirmada/);
  assert.match(run('estado').out, /3 tarefas · 1 meses/);

  // Na página: a Ideia foi apagada, IRS ficou feita, um gasto novo; no computador: Seguro mudou de título.
  const irsId = sentTasks.find((t) => t.t === 'IRS').id;
  const remote2 = file('remoto2');
  remoteDoc(remote2, 'tarefas', { items: sentTasks.filter((t) => t.id !== 'web1').map((t) => (t.id === irsId ? { ...t, feita: '2026-09-17' } : t)) }, 5);
  remoteDoc(remote2, 'fin-index', { months: ['2026-09'] }, 1);
  remoteDoc(remote2, 'fin-2026-09', { mov: [...sentMonth, { id: 'x', d: '2026-09-10', desc: 'Farmácia', v: -12.5, cat: 'Saúde', acc: 'dinheiro' }] }, 2);
  remoteDoc(remote2, 'orcamento', { limits: { Supermercado: 250 } }, 2);
  remoteDoc(remote2, 'regras', JSON.parse(read('saida1/regras.json')), 1);
  remoteDoc(remote2, 'contas', { items: [] }, 1);
  write('rotina/tarefas.md', read('rotina/tarefas.md').replace('[ ] Seguro', '[ ] Renovar seguro'));

  r = run('fundir', '--remoto', remote2, '--saida', file('saida2'));
  assert.equal(r.code ?? 0, 0, r.out);
  assert.match(r.out, /Tarefas: 1 do computador, 1 da página, 1 apagadas, 0 conflito/);
  const md2 = read('rotina/tarefas.md');
  assert.doesNotMatch(md2, /Ideia do telemóvel/);
  assert.match(md2, /- \[x\] IRS !1 \^2026-09-20 ✓2026-09-17/);
  assert.match(md2, /Renovar seguro/);
  assert.match(read('financas/movimentos/2026-09.csv'), /2026-09-10;Farmácia;-12,50;Saúde;dinheiro/);
  assert.match(read('financas/orcamento.csv'), /Supermercado;250/);
  const plan2 = JSON.parse(read('saida2/plano.json')).map((p) => p.doc);
  assert.deepEqual(plan2, ['tarefas'], 'só vai para a página o que mudou no computador');
});

test('carreira: igualdade, conflitos e vagas por decidir', () => {
  const a = { id: 'gh-1', empresa: 'Anthropic', cargo: 'Research Engineer', estado: 'candidatei', data: '2026-09-10', nota: '4,5' };
  assert.ok(sameApp(a, { ...a, extra: 'campo da página' }), 'campos a mais não contam');
  assert.ok(!sameApp(a, { ...a, estado: 'entrevista' }));
  const later = { ...a, estado: 'entrevista', data: '2026-09-15' };
  assert.equal(resolveApp(later, a), later, 'ganha a mudança mais recente');
  assert.equal(resolveApp(a, later), later, 'a ordem dos argumentos não importa: ganha a data mais recente');
  assert.equal(resolveApp({ ...a, obs: 'pc' }, { ...a, obs: 'página' }).obs, 'página', 'empate: fica a página');

  const seen = [
    { id: 'lj-1', visto: '2026-09-17', empresa: 'Damia', cargo: 'Data Scientist' },
    { id: 'lj-2', visto: '2026-09-16', empresa: 'Anthropic', cargo: 'Research Engineer' },
    { id: 'lj-3', visto: '2026-08-01', empresa: 'Velha', cargo: 'Antiga' },
    { id: 'gh-1', visto: '2026-09-15', empresa: 'Anthropic', cargo: 'Research Engineer' },
  ];
  assert.deepEqual(recentJobs(seen, [a], '2026-09-17').map((v) => v.id), ['lj-1'], 'sem as guardadas (por id ou empresa+cargo) e sem as antigas');
  assert.equal(recentJobs(seen, [], '2026-09-17', { max: 2 }).length, 2);
});

test('CLI: candidaturas nos dois sentidos, vagas só para a página', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'sync-carreira-'));
  const runIn = (...args) => {
    const r = spawnSync(process.execPath, [path.join(here, 'sincronizar.mjs'), ...args], { env: { ...process.env, ASSISTENTE_ROOT: dir }, encoding: 'utf8' });
    return { code: r.status, out: r.stdout + r.stderr };
  };
  const put = (rel, text) => {
    fs.mkdirSync(path.dirname(path.join(dir, rel)), { recursive: true });
    fs.writeFileSync(path.join(dir, rel), text);
  };
  const get = (rel) => fs.readFileSync(path.join(dir, rel), 'utf8');
  try {
    // Sem nada da Carreira, nada muda para quem não usa a área.
    let r = runIn('fundir', '--remoto', path.join(dir, 'nada'), '--saida', path.join(dir, 's0'), '--dry');
    assert.doesNotMatch(r.out, /Candidaturas|Vagas/);

    put('carreira/candidaturas.csv', 'id;empresa;cargo;local;estado;nota;data;proximo;fonte;link;obs\ngh-1;Anthropic;Research Engineer;London;candidatei;4,5;2026-09-10;2026-09-17;greenhouse;https://x/1;"2026-09-10: enviei; pelo site"\n');
    put('carreira/vagas.csv', `id;visto;fonte;empresa;cargo;local;link;publicada\nlj-9;${new Date().toISOString().slice(0, 10)};landing;Damia;Data Scientist;Lisbon;https://landing.jobs/at/damia/x;2026-09-01\n`);
    const remote1 = path.join(dir, 'r1');
    remoteDoc(remote1, 'carreira', { items: [{ id: 'web-1', empresa: 'Catawiki', cargo: 'Senior Data Scientist', local: 'Lisboa', estado: 'guardada', nota: '', data: '2026-09-16', proximo: '', fonte: 'linkedin', link: 'https://pt.linkedin.com/jobs/view/1', obs: '' }] }, 2);

    r = runIn('fundir', '--remoto', remote1, '--saida', path.join(dir, 's1'));
    assert.equal(r.code ?? 0, 0, r.out);
    assert.match(r.out, /Candidaturas: 1 do computador, 1 da página, 0 apagadas, 0 conflito/);
    assert.match(r.out, /Vagas por decidir enviadas para a página: 1/);
    const csvNow = get('carreira/candidaturas.csv');
    assert.match(csvNow, /web-1;Catawiki;Senior Data Scientist;Lisboa;guardada/);
    assert.match(csvNow, /"2026-09-10: enviei; pelo site"/, 'o ; dentro das notas sobrevive');
    const sent = JSON.parse(get('s1/carreira.json')).items;
    assert.equal(sent.length, 2);
    assert.equal(sent.find((x) => x.id === 'gh-1').obs, '2026-09-10: enviei; pelo site');
    assert.deepEqual(JSON.parse(get('s1/vagas.json')).items.map((v) => v.id), ['lj-9']);
    const plan = JSON.parse(get('s1/plano.json'));
    assert.equal(plan.find((p) => p.doc === 'carreira').if_version, 2);
    runIn('confirmar');

    // Na página: a Anthropic passou a entrevista; a vaga lj-9 foi guardada. No computador: nada.
    const remote2 = path.join(dir, 'r2');
    remoteDoc(remote2, 'carreira', { items: [
      ...sent.map((x) => (x.id === 'gh-1' ? { ...x, estado: 'entrevista', data: '2026-09-18', proximo: '2026-09-21' } : x)),
      { id: 'lj-9', empresa: 'Damia', cargo: 'Data Scientist', local: 'Lisbon', estado: 'guardada', nota: '', data: '2026-09-18', proximo: '', fonte: 'landing', link: 'https://landing.jobs/at/damia/x', obs: '' },
    ] }, 3);
    remoteDoc(remote2, 'vagas', JSON.parse(get('s1/vagas.json')), 1);
    r = runIn('fundir', '--remoto', remote2, '--saida', path.join(dir, 's2'));
    assert.equal(r.code ?? 0, 0, r.out);
    assert.match(r.out, /Candidaturas: 0 do computador, 2 da página, 0 apagadas, 0 conflito/);
    assert.match(get('carreira/candidaturas.csv'), /gh-1;Anthropic;Research Engineer;London;entrevista;4,5;2026-09-18;2026-09-21/);
    assert.match(r.out, /Vagas por decidir enviadas para a página: 0/, 'a vaga guardada sai da lista');
    const plan2 = JSON.parse(get('s2/plano.json')).map((p) => p.doc);
    assert.deepEqual(plan2, ['vagas'], 'a lista de candidaturas já está igual nos dois lados');
    assert.match(runIn('confirmar').out, /confirmada/);
    assert.match(runIn('estado').out, /3 candidaturas/);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test('CV: só o Markdown viaja, nos dois sentidos, sem perder a versão do computador', () => {
  const cvTexto = (quem) => `# Ana\n\n## Resumo\n${quem}\n`;
  const remoto = file('remoto-cv');
  remoteDoc(remoto, 'cv', { markdown: cvTexto('versão da página') }, 3);
  let r = run('fundir', '--remoto', remoto, '--saida', file('saida-cv'));
  assert.equal(r.code ?? 0, 0, r.out);
  assert.match(read('carreira/cv.md'), /versão da página/, 'o CV da página desce para carreira/cv.md');
  assert.match(r.out, /CV: ficou a versão da página/);
  assert.ok(!fs.existsSync(file('saida-cv/cv.json')), 'não devolve à página o que já lá está');
  run('confirmar');

  // Agora só o computador muda: sobe.
  write('carreira/cv.md', cvTexto('versão do computador'));
  r = run('fundir', '--remoto', remoto, '--saida', file('saida-cv2'));
  assert.match(JSON.parse(read('saida-cv2/cv.json')).markdown, /versão do computador/);
  run('confirmar');

  // Os dois lados mudam: fica a da página e a do computador é guardada ao lado.
  write('carreira/cv.md', cvTexto('novo no computador'));
  const remoto2 = file('remoto-cv2');
  remoteDoc(remoto2, 'cv', { markdown: cvTexto('novo na página') }, 4);
  r = run('fundir', '--remoto', remoto2, '--saida', file('saida-cv3'));
  assert.match(read('carreira/cv.md'), /novo na página/);
  assert.match(read('carreira/cv.md.anterior'), /novo no computador/);
  assert.match(r.out, /⚠ CV alterado dos dois lados/);
});
