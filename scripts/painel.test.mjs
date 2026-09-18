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
    env: { ...process.env, ASSISTENTE_ROOT: dir, RUMO_PANEL_TOKEN: '' }, encoding: 'utf8',
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
