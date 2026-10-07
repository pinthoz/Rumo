import { test, after } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { createPanelServer, DEFAULT_PORT } from './painel.mjs';

const root = fs.mkdtempSync(path.join(os.tmpdir(), 'rumo-painel-'));
fs.mkdirSync(path.join(root, 'prototipo'), { recursive: true });
fs.mkdirSync(path.join(root, 'rotina'), { recursive: true });
fs.writeFileSync(path.join(root, 'prototipo', 'rumo.html'), '<title>Rumo teste</title>');
fs.writeFileSync(path.join(root, 'prototipo', 'rumo.css'), 'body { color: black; }');
fs.writeFileSync(path.join(root, 'prototipo', 'rumo.js'), 'console.log(1);');
fs.writeFileSync(path.join(root, 'rotina', 'rotina.modelo.md'), '# Rotina-base\n\n## Horários\n- manhã\n');
fs.writeFileSync(path.join(root, 'rotina', 'emails.json'), JSON.stringify({
  updatedAt: '2026-09-17T08:00:00Z',
  items: [
    { id: 'm1', from: 'Ana', subject: 'Reunião', date: '2026-09-17', action: 'Confirmar presença', deadline: '2026-09-18', url: 'https://mail.google.com/mail/u/0/#inbox/m1' },
    { id: 'm2', subject: 'Ligação perigosa', action: 'Ignorar', url: 'javascript:alert(1)' },
  ],
}));

const token = 'segredo-de-teste';
const { server } = createPanelServer({ root, token });
await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
const base = `http://127.0.0.1:${server.address().port}`;
const api = (url, options = {}) => fetch(`${base}${url}`, { ...options, headers: { 'X-Rumo-Token': token, 'Content-Type': 'application/json', ...(options.headers || {}) } });

test('painel local: usa uma porta estável para conservar os dados do navegador', () => {
  assert.equal(DEFAULT_PORT, 43117);
});

after(async () => {
  await new Promise((resolve) => server.close(resolve));
  fs.rmSync(root, { recursive: true, force: true });
});

test('painel local: serve a UI e exige token na API', async () => {
  const page = await fetch(base);
  assert.equal(page.status, 200);
  assert.match(await page.text(), /Rumo teste/);
  assert.equal((await fetch(`${base}/api/files`)).status, 403);
  const list = await (await api('/api/files')).json();
  assert.ok(list.files.some((x) => x.id === 'rotina'));
});

test('painel local: serve apenas metadados seguros dos emails', async () => {
  const data = await (await api('/api/emails')).json();
  assert.equal(data.items.length, 2);
  assert.equal(data.items[0].subject, 'Reunião');
  assert.equal(data.items[0].url, 'https://mail.google.com/mail/u/0/#inbox/m1');
  assert.equal(data.items[1].url, '');
});

test('painel local: lê o modelo, grava atomicamente e cria backup', async () => {
  let doc = await (await api('/api/files/rotina')).json();
  assert.equal(doc.exists, false);
  assert.match(doc.content, /Rotina-base/);

  let res = await api('/api/files/rotina', { method: 'PUT', body: JSON.stringify({ content: '# A minha rotina\r\n' }) });
  assert.equal(res.status, 200);
  assert.equal(fs.readFileSync(path.join(root, 'rotina', 'rotina.md'), 'utf8'), '# A minha rotina\n');

  res = await api('/api/files/rotina', { method: 'PUT', body: JSON.stringify({ content: '# Nova rotina\n' }) });
  assert.equal(res.status, 200);
  const backups = fs.readdirSync(path.join(root, '.sync', 'backups', 'config', 'rotina'));
  assert.equal(backups.length, 1);
  doc = await (await api('/api/files/rotina')).json();
  assert.equal(doc.exists, true);
  assert.equal(doc.content, '# Nova rotina\n');
});

test('painel em segundo plano: arranca sozinho, reutiliza e desliga', async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'rumo-fundo-'));
  fs.mkdirSync(path.join(dir, 'prototipo'), { recursive: true });
  fs.writeFileSync(path.join(dir, 'prototipo', 'rumo.html'), '<title>Rumo fundo</title>');
  const here = path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1'));
  const run = (...args) => spawnSync(process.execPath, [path.join(here, 'painel.mjs'), ...args], {
    env: { ...process.env, ASSISTENTE_ROOT: dir, RUMO_PANEL_TOKEN: '', RUMO_SEM_CLAUDE: '1' }, encoding: 'utf8',
  });
  const port = 43219;
  try {
    const first = run('abrir', '--port', String(port), '--no-open');
    assert.equal(first.status, 0, first.stderr);
    assert.match(first.stdout, /segundo plano/);
    const state = JSON.parse(fs.readFileSync(path.join(dir, '.sync', 'painel.json'), 'utf8'));
    assert.equal(state.port, port);
    assert.ok(state.pid > 0);

    const page = await fetch(`http://127.0.0.1:${port}/`);
    assert.match(await page.text(), /Rumo fundo/);

    const again = run('abrir', '--port', String(port), '--no-open');
    assert.match(again.stdout, /Já estava a correr/);
    // A chave mantém-se entre arranques, senão o endereço guardado deixava de servir.
    assert.ok(again.stdout.includes(state.token), 'o endereço devolvido tem de trazer a mesma chave');

    assert.match(run('estado').stdout, /A correr em segundo plano/);
    assert.match(run('parar').stdout, /desligado/);
    assert.equal(fs.existsSync(path.join(dir, '.sync', 'painel.json')), false);

    // Depois de parar e voltar a abrir, a chave é a mesma: um separador aberto continua a servir.
    run('abrir', '--port', String(port), '--no-open');
    const depois = JSON.parse(fs.readFileSync(path.join(dir, '.sync', 'painel.json'), 'utf8'));
    assert.equal(depois.token, state.token, 'reiniciar o painel não pode mudar a chave');

    // Um painel arrancado antes de o código mudar (git pull) é reiniciado ao abrir o Rumo.
    const ficheiroEstado = path.join(dir, '.sync', 'painel.json');
    fs.writeFileSync(ficheiroEstado, JSON.stringify({ ...depois, desde: '2000-01-01T00:00:00.000Z' }));
    const reaberto = run('abrir', '--port', String(port), '--no-open');
    assert.match(reaberto.stdout, /A correr em segundo plano/, 'com código mais recente, arranca de novo');
    const novo = JSON.parse(fs.readFileSync(ficheiroEstado, 'utf8'));
    assert.notEqual(novo.pid, depois.pid, 'é outro processo');
    assert.equal(novo.token, state.token, 'e a chave continua a mesma');
    assert.match(run('abrir', '--port', String(port), '--no-open').stdout, /Já estava a correr/, 'sem mudanças, reaproveita');
    // Um pedido que este servidor não conhece explica o que fazer.
    const desconhecido = await (await fetch(`http://127.0.0.1:${port}/api/nao-existe`, { headers: { 'X-Rumo-Token': state.token } })).json();
    assert.match(desconhecido.error, /desatualizado/);
    run('parar');
  } finally {
    const leftover = (() => { try { return JSON.parse(fs.readFileSync(path.join(dir, '.sync', 'painel.json'), 'utf8')).pid; } catch { return null; } })();
    if (leftover) { try { process.kill(leftover); } catch { /* já parou */ } }
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test('painel local: serve a agenda sem convidados nem descrições', async () => {
  fs.writeFileSync(path.join(root, 'rotina', 'agenda.json'), JSON.stringify({
    updatedAt: '2026-09-18T07:00:00Z',
    items: [
      { id: 'e1', summary: 'Dentista', start: '2026-09-18T10:00:00+01:00', end: '2026-09-18T10:45:00+01:00', location: 'Clínica', url: 'https://calendar.google.com/e1', convidados: ['x@y.pt'], description: 'segredo' },
      { id: 'e2', summary: 'Feriado', start: '2026-09-20', end: '2026-09-21', url: 'javascript:alert(1)' },
      { id: 'e3', start: '2026-09-21T09:00:00+01:00' },
    ],
  }));
  const data = await (await api('/api/agenda')).json();
  assert.equal(data.items.length, 2, 'eventos sem título ficam de fora');
  assert.deepEqual(Object.keys(data.items[0]).sort(), ['end', 'id', 'location', 'start', 'summary', 'url']);
  assert.equal(data.items[0].url, 'https://calendar.google.com/e1');
  assert.equal(data.items[1].url, '', 'ligações que não sejam https são descartadas');
});

test('painel local: a política de segurança deixa passar só o leitor de PDF', async () => {
  const csp = (await fetch(base)).headers.get('content-security-policy');
  assert.match(csp, /script-src [^;]*https:\/\/cdnjs\.cloudflare\.com/, 'pdf.js tem de poder carregar');
  assert.match(csp, /worker-src [^;]*blob:/, 'o worker do pdf.js corre a partir de blob:');
  assert.doesNotMatch(csp, /script-src [^;]*\*/, 'nada de origens abertas');
  assert.match(csp, /default-src 'self'/);
});

test('painel local: sem Claude Code, a ponte falha com uma mensagem útil', async () => {
  const { askClaude } = await import('./painel.mjs');
  await assert.rejects(() => askClaude('olá', { cli: 'claude-que-nao-existe-12345', timeout: 8000 }));
});

test('painel local: a resposta do Claude chega aos bocados e inteira no fim', async () => {
  const { askClaude } = await import('./painel.mjs');
  // Um Claude de mentira que fala stream-json: lê o pedido e responde em dois bocados.
  const falso = path.join(root, 'claude-falso.mjs');
  fs.writeFileSync(falso, `
    let entrada = '';
    process.stdin.on('data', (d) => { entrada += d; });
    process.stdin.on('end', () => {
      const pedido = JSON.parse(entrada.trim()).message.content;
      const ev = (text) => console.log(JSON.stringify({ type: 'stream_event', event: { delta: { type: 'text_delta', text } } }));
      console.log('isto não é JSON');
      ev('Olá, '); ev(pedido);
      console.log(JSON.stringify({ type: 'result', is_error: false, result: 'Olá, ' + pedido }));
    });`);
  const bocados = [];
  const texto = await askClaude('mundo', { cli: [process.execPath, falso], timeout: 8000, onDelta: (d) => bocados.push(d) });
  assert.deepEqual(bocados, ['Olá, ', 'mundo']);
  assert.equal(texto, 'Olá, mundo');

  // Um resultado com erro (por exemplo, limite da conta) chega à página com o motivo.
  const comErro = path.join(root, 'claude-erro.mjs');
  fs.writeFileSync(comErro, `process.stdin.resume(); process.stdin.on('end', () => console.log(JSON.stringify({ type: 'result', is_error: true, result: 'Limite atingido' })));`);
  await assert.rejects(() => askClaude('x', { cli: [process.execPath, comErro], timeout: 8000 }), /Limite atingido/);
});

test('painel local: em modo aos bocados, os erros também chegam numa linha', async () => {
  const antes = process.env.RUMO_CLAUDE_CLI;
  process.env.RUMO_CLAUDE_CLI = 'claude-inexistente-stream';
  try {
    const res = await api('/api/claude', { method: 'POST', body: JSON.stringify({ prompt: 'olá', stream: true }) });
    assert.equal(res.status, 200);
    assert.match(res.headers.get('content-type'), /ndjson/);
    const linhas = (await res.text()).trim().split('\n').map((l) => JSON.parse(l));
    assert.ok(linhas.at(-1).error, 'a última linha diz o que falhou');
  } finally {
    if (antes === undefined) delete process.env.RUMO_CLAUDE_CLI; else process.env.RUMO_CLAUDE_CLI = antes;
  }
});

test('painel local: a API do Claude recusa pedidos vazios e exige token', async () => {
  const semToken = await fetch(`${base}/api/claude`, { method: 'POST', body: JSON.stringify({ prompt: 'olá' }) });
  assert.equal(semToken.status, 403);
  const vazio = await api('/api/claude', { method: 'POST', body: JSON.stringify({ prompt: '   ' }) });
  assert.equal(vazio.status, 400);
});

test('painel local: só aliases de modelo conhecidos chegam à linha de comandos', async () => {
  const { MODELOS } = await import('./painel.mjs');
  assert.deepEqual(MODELOS, ['haiku', 'sonnet', 'opus']);
});

test('painel local: limites do Claude sem dados da conta', async () => {
  const casa = fs.mkdtempSync(path.join(os.tmpdir(), 'rumo-casa-'));
  const { readLimits } = await import('./painel.mjs');
  assert.equal((await readLimits(casa, { live: false })).disponivel, false, 'sem ficheiro, não inventa');
  fs.writeFileSync(path.join(casa, '.claude.json'), JSON.stringify({
    cachedUsageUtilization: {
      fetchedAtMs: 1789676658147,
      accountUuid: 'nao-deve-sair-daqui',
      utilization: {
        five_hour: { utilization: 98, resets_at: '2026-09-17T22:10:00Z' },
        seven_day: { utilization: 70, resets_at: '2026-09-19T02:00:00Z' },
        seven_day_opus: null,
      },
    },
  }));
  const lido = await readLimits(casa, { live: false });
  assert.equal(lido.cincoHoras.utilizacao, 98);
  assert.equal(lido.seteDias.reposicao, '2026-09-19T02:00:00Z');
  assert.equal(lido.opus, null);
  assert.doesNotMatch(JSON.stringify(lido), /nao-deve-sair-daqui|accountUuid/, 'nada da conta é exposto');
  fs.rmSync(casa, { recursive: true, force: true });
});

test('painel local: as vagas encontradas ficam guardadas em carreira/vagas.csv', async () => {
  const { guardarVagas, lerVagas } = await import('./painel.mjs');
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'rumo-vagas-'));
  try {
    const primeira = guardarVagas([
      { cargo: 'AI Engineer', empresa: 'Acme', local: 'Porto · Remoto', link: 'https://exemplo.pt/1', fonte: 'linkedin' },
      { cargo: 'Data Scientist', empresa: 'Beta', local: 'Lisboa', link: 'javascript:alert(1)', fonte: 'linkedin' },
      { cargo: '', empresa: 'Sem cargo', local: '' },
    ], dir);
    assert.equal(primeira.guardadas, 2, 'vagas sem cargo ficam de fora');

    const csv = fs.readFileSync(path.join(dir, 'carreira', 'vagas.csv'), 'utf8');
    assert.match(csv, /^id;visto;fonte;empresa;cargo;local;link;publicada/, 'usa as colunas da área Carreira');
    assert.match(csv, /Acme;AI Engineer/);
    assert.doesNotMatch(csv, /javascript:/, 'só entram ligações https');

    // A mesma vaga outra vez não duplica, e as anteriores continuam lá.
    const segunda = guardarVagas([{ cargo: 'AI Engineer', empresa: 'Acme', local: 'Porto', link: 'https://exemplo.pt/1' }], dir);
    assert.equal(segunda.guardadas, 0);
    assert.equal(segunda.total, 2);
    assert.equal(lerVagas(dir).length, 2, 'ficam disponíveis sem pesquisar outra vez');
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test('painel local: finanças ficam em CSV e Markdown com cópia de segurança', async () => {
  let res = await api('/api/financas');
  assert.equal(res.status, 200);
  assert.equal((await res.json()).exists, false);

  const writes = [
    ['/api/financas/month/2026-09', { items: [
      { d: '2026-09-03', desc: 'Supermercado; bairro', v: -42.5, cat: 'Supermercado', acc: 'CGD' },
      { d: '2026-09-01', desc: 'Salário', v: 1500, cat: 'Salário', acc: 'CGD' },
    ] }],
    ['/api/financas/budget', { limits: { Supermercado: 250, Lazer: 60 } }],
    ['/api/financas/rules', { items: [{ p: 'continente', cat: 'Supermercado' }] }],
    ['/api/financas/accounts', { items: [{ nome: 'Conta principal', tipo: 'à ordem', saldo: 1200.5, data: '2026-09-18' }] }],
    ['/api/financas/goals', { content: '# Objetivos financeiros\n\n- Fundo de emergência: 6 meses\n' }],
  ];
  for (const [url, body] of writes) {
    res = await api(url, { method: 'PUT', body: JSON.stringify(body) });
    assert.equal(res.status, 200, url);
  }

  assert.match(fs.readFileSync(path.join(root, 'financas', 'movimentos', '2026-09.csv'), 'utf8'), /"Supermercado; bairro"/);
  assert.match(fs.readFileSync(path.join(root, 'financas', 'orcamento.csv'), 'utf8'), /Supermercado;250/);
  assert.match(fs.readFileSync(path.join(root, 'financas', 'regras.csv'), 'utf8'), /continente;Supermercado/);
  assert.match(fs.readFileSync(path.join(root, 'financas', 'contas.csv'), 'utf8'), /Conta principal;à ordem;1200\.5/);
  assert.match(fs.readFileSync(path.join(root, 'financas', 'objetivos.md'), 'utf8'), /Fundo de emergência/);

  const loaded = await (await api('/api/financas')).json();
  assert.equal(loaded.exists, true);
  assert.equal(loaded.fin.months['2026-09'].mov.length, 2);
  assert.equal(loaded.fin.months['2026-09'].mov[0].desc, 'Supermercado; bairro');
  assert.equal(loaded.fin.budget.Supermercado, 250);
  assert.equal(loaded.fin.accounts[0].saldo, 1200.5);
  assert.equal(loaded.present.goals, true);

  await api('/api/financas/budget', { method: 'PUT', body: JSON.stringify({ limits: { Supermercado: 300 } }) });
  const backups = fs.readdirSync(path.join(root, '.sync', 'backups', 'financas', 'orcamento.csv'));
  assert.equal(backups.length, 1, 'alterar um ficheiro cria uma cópia da versão anterior');
});

test('painel local: ideias, rascunhos, voz e correções ficam num ficheiro com cópia de segurança', async () => {
  let res = await api('/api/escrita');
  assert.equal(res.status, 200);
  assert.equal((await res.json()).exists, false);

  const payload = {
    ideas: [{ id: 'i1', title: 'Um ensaio', body: 'Explorar esta ideia.', tags: ['ensaio'], status: 'a-desenvolver', created: '2026-09-18', updated: '2026-09-18' }],
    notes: [{ d: '2026-09-18', tema: 'Tema', resumo: 'Síntese', proximo: 'Procurar exemplos' }],
    drafts: [{ id: 'r1', title: 'Primeiro rascunho', content: 'Era uma vez.', objective: 'Contar', audience: 'Leitores', status: 'rascunho', created: '2026-09-18', updated: '2026-09-18' }],
    errors: [{ lang: 'pt', de: 'á reunião', para: 'a reunião', regra: 'Sem acento.', vezes: 2 }],
    voice: { amostras: ['Um texto meu.'], perfil: 'Frases curtas.', confirmado: true },
  };
  res = await api('/api/escrita', { method: 'PUT', body: JSON.stringify(payload) });
  assert.equal(res.status, 200);
  const file = path.join(root, 'escrita', 'painel.json');
  assert.equal(fs.existsSync(file), true);
  const loaded = await (await api('/api/escrita')).json();
  assert.equal(loaded.exists, true);
  assert.equal(loaded.data.ideas[0].title, 'Um ensaio');
  assert.equal(loaded.data.drafts[0].content, 'Era uma vez.');
  assert.equal(loaded.data.voice.confirmado, true);

  payload.drafts[0].content = 'Era uma vez, num lugar distante.';
  await api('/api/escrita', { method: 'PUT', body: JSON.stringify(payload) });
  const backups = fs.readdirSync(path.join(root, '.sync', 'backups', 'escrita', 'painel.json'));
  assert.equal(backups.length, 1);
});

test('painel local: os pedidos ao Claude correm um de cada vez', async () => {
  const { askClaude } = await import('./painel.mjs');
  // Um "claude" de mentira: escreve quando começa e quando acaba, para se ver a sobreposição.
  const marcas = [];
  const tres = [1, 2, 3].map((n) => askClaude(`pedido ${n}`, { cli: 'claude-inexistente-xyz', timeout: 3000 })
    .then(() => marcas.push(`fim ${n}`), () => marcas.push(`fim ${n}`)));
  await Promise.all(tres);
  assert.deepEqual(marcas, ['fim 1', 'fim 2', 'fim 3'], 'terminam pela ordem de entrada, sem se atropelarem');
});

test('painel local: serve a página, os estilos e a lógica, sem scripts embutidos na política', async () => {
  for (const [caminho, tipo] of [['/', 'text/html'], ['/rumo.css', 'text/css'], ['/rumo.js', 'text/javascript']]) {
    const r = await fetch(base + caminho);
    assert.equal(r.status, 200, caminho);
    assert.ok(r.headers.get('content-type').startsWith(tipo), caminho);
  }
  const csp = (await fetch(base)).headers.get('content-security-policy');
  assert.doesNotMatch(csp.match(/script-src[^;]*/)[0], /unsafe-inline/, 'scripts só de ficheiros, nunca embutidos');
  assert.equal((await fetch(base + '/../package.json')).status, 403, 'nada fora da lista de ficheiros');
});

test('painel local: as cópias de segurança têm limite', async () => {
  const { escreverComCopia, COPIAS_POR_FICHEIRO } = await import('./painel.mjs');
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'rumo-copias-'));
  try {
    const alvo = path.join(dir, 'notas.md');
    for (let i = 0; i < COPIAS_POR_FICHEIRO + 7; i++) {
      escreverComCopia(dir, alvo, `versão ${i}\n`, 'teste', '.md');
      await new Promise((r) => setTimeout(r, 2)); // nomes de cópia diferentes (vão pela hora)
    }
    const copias = fs.readdirSync(path.join(dir, '.sync', 'backups', 'teste'));
    assert.equal(copias.length, COPIAS_POR_FICHEIRO, 'nunca mais do que o limite');
    assert.equal(fs.readFileSync(alvo, 'utf8'), `versão ${COPIAS_POR_FICHEIRO + 6}\n`, 'o ficheiro fica com a última versão');
    const maisRecente = copias.sort().at(-1);
    assert.equal(fs.readFileSync(path.join(dir, '.sync', 'backups', 'teste', maisRecente), 'utf8'), `versão ${COPIAS_POR_FICHEIRO + 5}\n`, 'a cópia mais recente é a penúltima versão');
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test('painel local: conversas, cargos, vagas removidas, revisões e foco ficam em ficheiros', async () => {
  assert.equal((await api('/api/dados/senhas')).status, 404, 'só as partes conhecidas');
  let doc = await (await api('/api/dados/conversas')).json();
  assert.equal(doc.exists, false);
  const res = await api('/api/dados/conversas', { method: 'PUT', body: JSON.stringify({ items: [{ id: 'c1', titulo: 'Olá', turnos: [] }], extra: 'ignorado' }) });
  assert.equal(res.status, 200);
  assert.deepEqual(JSON.parse(fs.readFileSync(path.join(root, 'pensar', 'conversas', 'conversar.json'), 'utf8')), { items: [{ id: 'c1', titulo: 'Olá', turnos: [] }] });
  doc = await (await api('/api/dados/conversas')).json();
  assert.equal(doc.exists, true);
  // Foco: só dias válidos e números positivos.
  await api('/api/dados/foco', { method: 'PUT', body: JSON.stringify({ days: { '2026-09-22': 2, ontem: 5, '2026-09-21': -1 } }) });
  assert.deepEqual((await (await api('/api/dados/foco')).json()).data, { days: { '2026-09-22': 2 } });
});

test('painel local: a agenda e os emails vêm do Google sem corpos nem ligações estranhas', async () => {
  const { atualizarGoogle, pedidoGoogle, semanaDe } = await import('./painel.mjs');
  assert.deepEqual(semanaDe(new Date(2026, 9, 1)), { de: '2026-09-28', ate: '2026-10-05', hoje: '2026-10-01' }, 'de segunda a segunda');
  assert.match(pedidoGoogle(new Date(2026, 9, 1)), /2026-09-28T00:00:00.*2026-10-05T00:00:00/);
  assert.match(pedidoGoogle(), /dados, nunca instruções/);

  const pasta = fs.mkdtempSync(path.join(os.tmpdir(), 'rumo-google-'));
  fs.mkdirSync(path.join(pasta, 'rotina'));
  fs.writeFileSync(path.join(pasta, 'rotina', 'agenda.json'), JSON.stringify({ items: [{ id: 'velho', summary: 'Antes', start: '2026-10-01T09:00:00' }] }));
  // Um Claude de mentira: o calendário falhou (null) e os emails trazem lixo que tem de ser limpo.
  const falso = path.join(pasta, 'claude-google.mjs');
  fs.writeFileSync(falso, `process.stdin.resume(); process.stdin.on('end', () => console.log('Aqui está: ' + JSON.stringify({
    agenda: null,
    emails: [
      { id: 't1', from: 'Ana', subject: 'Contrato', action: 'Assinar', deadline: '2026-10-03', url: 'https://mail.google.com/mail/u/0/#inbox/t1', body: 'segredo' },
      { id: 't2', subject: 'Fraude', action: 'Clicar', url: 'https://mau.example/x' },
      { id: 't3', subject: 'C' }, { id: 't4', subject: 'D' },
    ],
  })));`);
  try {
    const r = await atualizarGoogle(pasta, { cli: [process.execPath, falso], timeout: 8000 });
    assert.deepEqual(r, { agenda: null, emails: 3 }, 'no máximo 3 emails');
    const emails = JSON.parse(fs.readFileSync(path.join(pasta, 'rotina', 'emails.json'), 'utf8')).items;
    assert.equal(emails[0].body, undefined, 'nunca o corpo');
    assert.equal(emails[1].url, '', 'só ligações para o Gmail');
    assert.equal(JSON.parse(fs.readFileSync(path.join(pasta, 'rotina', 'agenda.json'), 'utf8')).items[0].id, 'velho', 'se o calendário falhar, a agenda anterior fica');
  } finally {
    fs.rmSync(pasta, { recursive: true, force: true });
  }
});

test('painel local (Mac): sem o PATH do Terminal, ainda encontra o claude e o node', async () => {
  const { completarPath } = await import('./painel.mjs');
  const env = { PATH: ['/usr/bin', '/bin'].join(path.delimiter) };
  const resultado = completarPath(env, '/Users/ana').split(path.delimiter);
  assert.ok(resultado.includes(path.join('/Users/ana', '.local', 'bin')), 'instalador oficial do Claude Code');
  assert.ok(resultado.includes('/opt/homebrew/bin'), 'Homebrew');
  assert.ok(resultado.includes(path.dirname(process.execPath)), 'a pasta deste node');
  assert.deepEqual(resultado.slice(0, 2), ['/usr/bin', '/bin'], 'o que já lá estava fica primeiro');
});

test('painel local: a versão do CV ajustada a um cargo fica à parte, sem tocar no cv.md', async () => {
  fs.mkdirSync(path.join(root, 'carreira'), { recursive: true });
  fs.writeFileSync(path.join(root, 'carreira', 'cv.md'), '# CV original\n');
  let res = await api('/api/cv-versao', { method: 'POST', body: JSON.stringify({ cargo: 'Product Analyst (Júnior)', markdown: '# CV para PA\n' }) });
  assert.equal(res.status, 200);
  assert.equal((await res.json()).file, 'carreira/cvs/cv-product-analyst-junior.md');
  assert.equal(fs.readFileSync(path.join(root, 'carreira', 'cvs', 'cv-product-analyst-junior.md'), 'utf8'), '# CV para PA\n');
  assert.equal(fs.readFileSync(path.join(root, 'carreira', 'cv.md'), 'utf8'), '# CV original\n', 'o original não muda');
  // Um nome de cargo com caminhos não sai da pasta.
  res = await api('/api/cv-versao', { method: 'POST', body: JSON.stringify({ cargo: '../../segredo', markdown: 'x' }) });
  assert.equal((await res.json()).file, 'carreira/cvs/cv-segredo.md');
  assert.equal((await api('/api/cv-versao', { method: 'POST', body: JSON.stringify({ cargo: 'X', markdown: '  ' }) })).status, 400);
});

test('painel local: criar um evento valida tudo e põe-no logo na agenda', async () => {
  const { argumentosEvento, criarEvento } = await import('./painel.mjs');
  assert.deepEqual(argumentosEvento({ titulo: 'Jantar', dia: '2026-10-08', inicio: '23:30', duracao: 60, fuso: 'Europe/Lisbon' }),
    { summary: 'Jantar', timeZone: 'Europe/Lisbon', startTime: '2026-10-08T23:30:00', endTime: '2026-10-09T00:30:00' }, 'passa da meia-noite');
  assert.equal(argumentosEvento({ titulo: 'Férias', dia: '2026-12-31', diaInteiro: true }).endTime, '2027-01-01T00:00:00');
  for (const mau of [{ dia: '2026-10-08', inicio: '10:00', duracao: 30 }, { titulo: 'x', dia: 'amanhã', inicio: '10:00', duracao: 30 }, { titulo: 'x', dia: '2026-10-08', inicio: '25:00', duracao: 30 }, { titulo: 'x', dia: '2026-10-08', inicio: '10:00', duracao: 0 }]) {
    assert.throws(() => argumentosEvento(mau));
  }
  assert.equal(argumentosEvento({ titulo: 'x', dia: '2026-10-08', diaInteiro: true, fuso: 'nada; rm -rf' }).timeZone, 'Europe/Lisbon', 'fuso estranho é ignorado');
  // A API recusa dados inválidos antes de chamar o Claude.
  assert.equal((await api('/api/agenda/evento', { method: 'POST', body: JSON.stringify({ titulo: '', dia: '2026-10-08' }) })).status, 400);

  const pasta = fs.mkdtempSync(path.join(os.tmpdir(), 'rumo-evento-'));
  const pedido = path.join(pasta, 'pedido.txt');
  const falso = path.join(pasta, 'claude-evento.mjs');
  fs.writeFileSync(falso, `let t = ''; process.stdin.on('data', (d) => { t += d; }); process.stdin.on('end', () => { require('fs').writeFileSync(${JSON.stringify(pedido)}, t); console.log('{"ok": true, "id": "ev9", "url": "https://www.google.com/calendar/event?eid=ev9"}'); });`.replace("require('fs')", "(await import('node:fs'))").replace("process.stdin.on('end', () =>", "process.stdin.on('end', async () =>"));
  try {
    const r = await criarEvento({ titulo: 'Dentista', dia: '2026-10-08', inicio: '10:00', duracao: 45, local: 'Clínica' }, pasta, { cli: [process.execPath, falso], timeout: 8000 });
    assert.equal(r.evento.summary, 'Dentista');
    assert.match(fs.readFileSync(pedido, 'utf8'), /"startTime":"2026-10-08T10:00:00","endTime":"2026-10-08T10:45:00","location":"Clínica"/, 'o Claude recebe os argumentos exatos');
    const agenda = JSON.parse(fs.readFileSync(path.join(pasta, 'rotina', 'agenda.json'), 'utf8'));
    assert.deepEqual(agenda.items.map((e) => [e.id, e.summary, e.start]), [['ev9', 'Dentista', '2026-10-08T10:00:00']], 'já aparece na agenda do painel');
    assert.equal(agenda.items[0].url, 'https://www.google.com/calendar/event?eid=ev9');
  } finally {
    fs.rmSync(pasta, { recursive: true, force: true });
  }
});
