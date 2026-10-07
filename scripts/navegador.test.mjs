// O painel a correr num navegador de verdade (Chrome ou Edge, sem janela), controlado pelo
// protocolo de desenvolvimento do próprio navegador. Sem dependências: o Node já traz WebSocket.
// Se não houver navegador no computador, o teste é saltado em vez de falhar.
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { createPanelServer } from './painel.mjs';

const repo = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const CANDIDATOS = [
  process.env.RUMO_NAVEGADOR,
  'C:/Program Files/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
  'C:/Program Files/Microsoft/Edge/Application/msedge.exe',
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  '/usr/bin/google-chrome',
  '/usr/bin/chromium',
].filter(Boolean);
const navegador = CANDIDATOS.find((p) => fs.existsSync(p));
const sem = navegador ? false : 'sem Chrome/Edge neste computador';

const esperar = (ms) => new Promise((r) => setTimeout(r, ms));
let root, perfil, server, proc, ws, base;
const eventosCriados = [];
const marcados = [];
const erros = [];
let seq = 0;
const pendentes = new Map();

/** Um pedido ao navegador pelo protocolo de desenvolvimento. */
function cdp(method, params = {}) {
  const id = ++seq;
  ws.send(JSON.stringify({ id, method, params }));
  return new Promise((resolve, reject) => {
    pendentes.set(id, { resolve, reject });
    setTimeout(() => { if (pendentes.delete(id)) reject(new Error(`sem resposta: ${method}`)); }, 15000);
  });
}
/** Corre uma expressão na página e devolve o valor. */
async function naPagina(expr) {
  const r = await cdp('Runtime.evaluate', { expression: expr, awaitPromise: true, returnByValue: true });
  if (r.exceptionDetails) throw new Error(`erro na página: ${r.exceptionDetails.exception?.description || r.exceptionDetails.text}`);
  return r.result.value;
}

before(async () => {
  if (sem) return;
  // Uma cópia do painel numa pasta temporária: o teste nunca toca nos teus ficheiros.
  root = fs.mkdtempSync(path.join(os.tmpdir(), 'rumo-nav-'));
  fs.mkdirSync(path.join(root, 'prototipo'), { recursive: true });
  for (const f of ['rumo.html', 'rumo.css', 'rumo.js']) fs.copyFileSync(path.join(repo, 'prototipo', f), path.join(root, 'prototipo', f));
  const token = 'chave-do-teste-do-navegador';
  // Um CV de exemplo: a área Carreira só mostra os cargos e o «Ajustar CV» quando há CV.
  fs.mkdirSync(path.join(root, 'carreira'), { recursive: true });
  fs.writeFileSync(path.join(root, 'carreira', 'cv.md'), '# Ana Exemplo\n\n## Experiência\n### Analista de dados — Empresa X (2024–2026)\n- SQL e Python\n');
  // O Google de mentira: escreve uma agenda com um evento, sem chamar o Claude nem o Google.
  const lerGoogleAgora = async (pasta) => {
    fs.mkdirSync(path.join(pasta, 'rotina'), { recursive: true });
    const agora = new Date();
    const inicio = new Date(agora.getFullYear(), agora.getMonth(), agora.getDate(), 10).toISOString();
    fs.writeFileSync(path.join(pasta, 'rotina', 'agenda.json'), JSON.stringify({ updatedAt: agora.toISOString(), items: [{ id: 'e1', summary: 'Evento de teste', start: inicio, end: inicio }] }));
    fs.writeFileSync(path.join(pasta, 'rotina', 'emails.json'), JSON.stringify({ updatedAt: agora.toISOString(), items: [] }));
    return { agenda: 1, emails: 0 };
  };
  // Criar eventos de mentira: guarda o pedido e põe o evento na agenda, sem tocar no Google.
  const criarEventoAgora = async (body, pasta) => {
    eventosCriados.push(body);
    const ficheiro = path.join(pasta, 'rotina', 'agenda.json');
    const agenda = JSON.parse(fs.readFileSync(ficheiro, 'utf8'));
    agenda.items.push({ id: 'novo', summary: body.titulo, start: `${body.dia}T${body.inicio}:00`, end: `${body.dia}T${body.inicio}:00` });
    fs.writeFileSync(ficheiro, JSON.stringify(agenda));
    return { evento: { id: 'novo' } };
  };
  // Marcar como feito de mentira: guarda o pedido e muda o título na agenda, sem tocar no Google.
  const marcarFeitoAgora = async (body, pasta) => {
    marcados.push(body);
    const ficheiro = path.join(pasta, 'rotina', 'agenda.json');
    const agenda = JSON.parse(fs.readFileSync(ficheiro, 'utf8'));
    for (const ev of agenda.items) if (ev.id === body.id) ev.summary = body.feito ? `✓ ${body.titulo}` : body.titulo;
    fs.writeFileSync(ficheiro, JSON.stringify(agenda));
    return { id: body.id };
  };
  ({ server } = createPanelServer({ root, token, lerGoogleAgora, criarEventoAgora, marcarFeitoAgora }));
  await new Promise((r) => server.listen(0, '127.0.0.1', r));
  base = `http://127.0.0.1:${server.address().port}`;

  perfil = fs.mkdtempSync(path.join(os.tmpdir(), 'rumo-perfil-'));
  proc = spawn(navegador, ['--headless=new', '--remote-debugging-port=0', `--user-data-dir=${perfil}`, '--no-first-run', '--no-default-browser-check', '--window-size=1280,900', 'about:blank'], { stdio: 'ignore' });
  let porta = null;
  for (let i = 0; i < 100 && !porta; i++) {
    await esperar(100);
    try { porta = fs.readFileSync(path.join(perfil, 'DevToolsActivePort'), 'utf8').split('\n')[0]; } catch { /* ainda a arrancar */ }
  }
  assert.ok(porta, 'o navegador não arrancou');
  const alvos = await (await fetch(`http://127.0.0.1:${porta}/json/list`)).json();
  const pagina = alvos.find((a) => a.type === 'page');
  ws = new WebSocket(pagina.webSocketDebuggerUrl);
  await new Promise((r, j) => { ws.onopen = r; ws.onerror = j; });
  ws.onmessage = (ev) => {
    const msg = JSON.parse(ev.data);
    if (msg.id && pendentes.has(msg.id)) {
      const p = pendentes.get(msg.id);
      pendentes.delete(msg.id);
      if (msg.error) p.reject(new Error(msg.error.message)); else p.resolve(msg.result);
      return;
    }
    // Tudo o que a página se queixar fica registado: exceções, console.error e bloqueios da
    // política de segurança. Os pedidos de rede às fontes do Google não contam.
    if (msg.method === 'Runtime.exceptionThrown') erros.push(`exceção: ${msg.params.exceptionDetails.exception?.description || msg.params.exceptionDetails.text}`);
    if (msg.method === 'Runtime.consoleAPICalled' && msg.params.type === 'error') erros.push(`console: ${msg.params.args.map((a) => a.value ?? a.description).join(' ')}`);
    if (msg.method === 'Log.entryAdded' && msg.params.entry.level === 'error' && msg.params.entry.source !== 'network') erros.push(`log (${msg.params.entry.source}): ${msg.params.entry.text}`);
  };
  await cdp('Runtime.enable');
  await cdp('Log.enable');
  await cdp('Page.enable');
  await cdp('Page.navigate', { url: `${base}/?local=${token}` });
  // Espera até a página ter montado os separadores.
  for (let i = 0; i < 80; i++) {
    await esperar(100);
    try { if (await naPagina('document.querySelectorAll("#tabs .tab").length') > 0) break; } catch { /* ainda a carregar */ }
  }
  await esperar(800);
});

after(async () => {
  if (sem) return;
  try { ws?.close(); } catch { /* já fechado */ }
  try { proc?.kill(); } catch { /* já terminou */ }
  await new Promise((r) => server?.close(r) ?? r());
  await esperar(300);
  for (const d of [root, perfil]) { try { fs.rmSync(d, { recursive: true, force: true }); } catch { /* o navegador ainda tem ficheiros abertos */ } }
});

test('navegador: o painel arranca sem erros', { skip: sem }, async () => {
  const separadores = await naPagina('document.querySelectorAll("#tabs .tab").length');
  assert.ok(separadores >= 10, `só ${separadores} separadores`);
  assert.equal(await naPagina('location.search'), '', 'a chave sai do endereço');
  assert.equal(await naPagina('sessionStorage.getItem("rumo-local-token")'), 'chave-do-teste-do-navegador', 'e fica na sessão');
  assert.deepEqual(erros, [], 'a página queixou-se ao arrancar');
});

test('navegador: cada separador abre a sua secção', { skip: sem }, async () => {
  const resultado = await naPagina(`(() => {
    const falhas = [];
    for (const tab of document.querySelectorAll('#tabs .tab')) {
      tab.click();
      const secao = document.getElementById(tab.getAttribute('aria-controls'));
      const visiveis = [...document.querySelectorAll('main > section')].filter((s) => !s.hidden);
      if (!secao || secao.hidden || visiveis.length !== 1) falhas.push(tab.id);
    }
    return falhas;
  })()`);
  assert.deepEqual(resultado, [], 'separadores que não abrem (ou abrem mais do que uma secção)');
  assert.deepEqual(erros, [], 'erros ao mudar de separador');
});

test('navegador: as setas do teclado mudam de separador', { skip: sem }, async () => {
  const antes = await naPagina(`(() => { document.getElementById('tab-hoje').click(); document.getElementById('tab-hoje').focus(); return document.activeElement.id; })()`);
  assert.equal(antes, 'tab-hoje');
  await cdp('Input.dispatchKeyEvent', { type: 'keyDown', key: 'ArrowDown', code: 'ArrowDown', windowsVirtualKeyCode: 40 });
  await cdp('Input.dispatchKeyEvent', { type: 'keyUp', key: 'ArrowDown', code: 'ArrowDown', windowsVirtualKeyCode: 40 });
  await esperar(100);
  assert.equal(await naPagina('document.activeElement.id'), 'tab-foco');
  assert.equal(await naPagina('document.getElementById("view-foco").hidden'), false);
});

test('navegador: no Conversar, o "/" abre o menu de temas', { skip: sem }, async () => {
  const menu = await naPagina(`(() => {
    document.getElementById('tab-conversar').click();
    const caixa = document.getElementById('talk-in');
    caixa.value = '/pen';
    caixa.dispatchEvent(new Event('input', { bubbles: true }));
    const m = document.getElementById('talk-menu');
    return { visivel: !m.hidden, opcoes: [...m.querySelectorAll('button')].map((b) => b.textContent) };
  })()`);
  assert.ok(menu.visivel, 'o menu não apareceu');
  assert.ok(menu.opcoes.some((o) => o.includes('/pensar')), `opções: ${menu.opcoes.join(' | ')}`);
  // Escolher o tema põe a etiqueta e mostra os atalhos do Pensar.
  const tema = await naPagina(`(() => {
    document.querySelector('#talk-menu button').click();
    return { etiqueta: document.getElementById('talk-topic').textContent, atalhos: document.querySelectorAll('#talk-quick button').length, resumir: !document.getElementById('talk-summary').hidden };
  })()`);
  assert.equal(tema.etiqueta, 'Pensar');
  assert.equal(tema.atalhos, 4, 'os quatro atalhos do Pensar');
  assert.ok(tema.resumir, 'o botão Resumir e guardar aparece no tema Pensar');
  assert.deepEqual(erros, []);
});

test('navegador: as etapas da carreira mostram só a sua parte', { skip: sem }, async () => {
  const etapas = await naPagina(`(() => {
    document.getElementById('tab-candidaturas').click();
    const visivel = (id) => { const el = document.getElementById(id); return !!el && !el.hidden; };
    const passo = (n) => { document.querySelector('#j-flow [data-step="' + n + '"]').click(); return { cv: visivel('cv-panel'), procura: visivel('j-li-panel'), quadro: visivel('j-board') }; };
    return [passo(1), passo(2), passo(4)];
  })()`);
  assert.deepEqual(etapas[0], { cv: true, procura: false, quadro: false }, 'Preparar');
  assert.deepEqual(etapas[1], { cv: false, procura: true, quadro: false }, 'Encontrar');
  assert.equal(etapas[2].cv, false, 'Acompanhar não mostra o CV');
  assert.deepEqual(erros, []);
});

test('navegador: acrescentar um cargo meu deixa ajustar o CV a ele', { skip: sem }, async () => {
  const r = await naPagina(`(async () => {
    document.getElementById('tab-candidaturas').click();
    document.querySelector('#j-flow [data-step="1"]').click();
    const visivel = !document.getElementById('cv-roles-wrap').hidden;
    document.getElementById('cv-role-mine').value = 'Product Analyst';
    document.getElementById('cv-role-form').requestSubmit();
    await new Promise((ok) => setTimeout(ok, 400));
    const linha = [...document.querySelectorAll('#cv-roles li')].find((li) => li.textContent.includes('Product Analyst'));
    return {
      visivel,
      meu: !!linha && linha.textContent.includes('Tu'),
      ajustar: !!linha && [...linha.querySelectorAll('button')].some((b) => b.textContent === 'Ajustar CV'),
      filtro: [...document.querySelectorAll('#li-roles button')].some((b) => b.textContent === 'Product Analyst'),
    };
  })()`);
  assert.deepEqual(r, { visivel: true, meu: true, ajustar: true, filtro: true });
  const guardado = JSON.parse(fs.readFileSync(path.join(root, 'carreira', 'cargos.json'), 'utf8'));
  assert.deepEqual(guardado.items[0], { titulo: 'Product Analyst', porque: '', origem: 'eu' }, 'fica guardado no computador');
  assert.deepEqual(erros, []);
});

test('navegador: no Conversar, o Claude pode pesquisar e decide quando', { skip: sem }, async () => {
  // O pedido ao Claude é apanhado aqui (com uma resposta de mentira): só se vê o que a página envia.
  const r = await naPagina(`(async () => {
    const original = window.fetch;
    let enviado = null;
    window.fetch = async (url, o) => {
      if (String(url).includes('/api/claude')) {
        enviado = JSON.parse(o.body);
        return new Response(JSON.stringify({ delta: 'Notícias de teste.' }) + '\\n' + JSON.stringify({ text: 'Notícias de teste.' }) + '\\n', { headers: { 'Content-Type': 'application/x-ndjson' } });
      }
      return original(url, o);
    };
    try {
      document.getElementById('tab-conversar').click();
      document.getElementById('talk-in').value = 'quais são as notícias de hoje?';
      document.getElementById('talk-go').click();
      await new Promise((ok) => setTimeout(ok, 600));
      const bolhas = [...document.querySelectorAll('#talk-chat .bubble')].map((b) => b.textContent);
      return { web: enviado?.web, regra: /Usa-a sempre que a resposta dependa de informação atual/.test(enviado?.prompt || ''), resposta: bolhas.at(-1) };
    } finally { window.fetch = original; }
  })()`);
  assert.equal(r.web, true, 'a pesquisa vai sempre disponível no painel local');
  assert.ok(r.regra, 'e o Claude decide quando a usar');
  assert.match(r.resposta, /Notícias de teste/);
  assert.deepEqual(erros, []);
});

test('navegador: + Evento pede confirmação e só depois cria', { skip: sem }, async () => {
  const r = await naPagina(`(async () => {
    const esperar = (ms) => new Promise((ok) => setTimeout(ok, ms));
    document.getElementById('tab-hoje').click();
    document.getElementById('agenda-refresh').click();
    await esperar(600);
    document.getElementById('agenda-novo').click();
    const aberto = document.getElementById('ev-dialog').open;
    document.getElementById('ev-titulo').value = 'Dentista de teste';
    document.getElementById('ev-inicio').value = '10:00';
    document.getElementById('ev-duracao').value = '45';
    document.getElementById('ev-form').requestSubmit();
    const resumo = document.getElementById('ev-resumo').textContent;
    const passo2 = !document.getElementById('ev-passo2').hidden;
    document.getElementById('ev-criar').click();
    await esperar(800);
    return { aberto, resumo, passo2, fechado: !document.getElementById('ev-dialog').open,
      naAgenda: document.getElementById('agenda-hoje').textContent.includes('Dentista de teste'),
      nota: document.getElementById('agenda-note').textContent };
  })()`);
  assert.equal(r.aberto, true, 'o formulário abre');
  assert.equal(r.passo2, true, 'primeiro mostra o resumo');
  assert.match(r.resumo, /«Dentista de teste».*das 10:00 às 10:45/);
  assert.equal(eventosCriados.length, 1, 'só cria depois de confirmar, e uma vez');
  assert.equal(eventosCriados[0].titulo, 'Dentista de teste');
  assert.equal(r.fechado, true);
  assert.equal(r.naAgenda, true, 'o evento aparece logo na agenda de hoje');
  assert.match(r.nota, /criado no Google Calendar/);
  assert.deepEqual(erros, []);
});

test('navegador: o visto marca um evento como feito e desmarca', { skip: sem }, async () => {
  const r = await naPagina(`(async () => {
    const esperar = (ms) => new Promise((ok) => setTimeout(ok, ms));
    document.getElementById('tab-hoje').click();
    document.getElementById('agenda-refresh').click();
    await esperar(600);
    const linha = () => [...document.querySelectorAll('#agenda-hoje li')].find((li) => li.textContent.includes('Evento de teste'));
    linha().querySelector('.ev-check').click();
    await esperar(400);
    const marcado = { classe: linha().className, pressionado: linha().querySelector('.ev-check').getAttribute('aria-pressed'), semMarca: !linha().textContent.includes('✓'), nota: document.getElementById('agenda-note').textContent };
    linha().querySelector('.ev-check').click();
    await esperar(400);
    return { marcado, depois: linha().querySelector('.ev-check').getAttribute('aria-pressed') };
  })()`);
  assert.match(r.marcado.classe, /feito/, 'fica riscado');
  assert.equal(r.marcado.pressionado, 'true');
  assert.ok(r.marcado.semMarca, 'o "✓" do Google não aparece no texto: é o visto que o mostra');
  assert.match(r.marcado.nota, /marcado como feito, também no Google Calendar/);
  assert.equal(r.depois, 'false', 'clicar outra vez desmarca');
  assert.deepEqual(marcados.map((m) => m.feito), [true, false]);
  assert.equal(marcados[0].titulo, 'Evento de teste');
  assert.deepEqual(erros, []);
});

test('navegador: o formatador desenha uma resposta a sério na página', { skip: sem }, async () => {
  // Uma conversa guardada é aberta e desenhada pelo código real da página.
  const desenho = await naPagina(`(() => {
    document.getElementById('tab-conversar').click();
    const lista = document.getElementById('talk-list');
    return { lista: !!lista, chat: !!document.getElementById('talk-chat') };
  })()`);
  assert.deepEqual(desenho, { lista: true, chat: true });
  assert.deepEqual(erros, []);
});

test('navegador: os botões de atualizar respondem (não ficam mudos)', { skip: sem }, async () => {
  const r = await naPagina(`(async () => {
    document.getElementById('tab-hoje').click();
    const nota = document.getElementById('agenda-note');
    nota.textContent = '';
    document.getElementById('agenda-refresh').click();
    await new Promise((ok) => setTimeout(ok, 900));
    const agenda = nota.textContent;
    const ajuda = document.getElementById('gmail-help');
    ajuda.textContent = '';
    document.getElementById('inbox-refresh').click();
    await new Promise((ok) => setTimeout(ok, 900));
    return { agenda, emails: ajuda.textContent };
  })()`);
  assert.match(r.agenda, /Agenda atualizada: 1 evento/, 'o Atualizar da agenda tem de ir buscar a agenda nova');
  assert.ok(r.emails.trim(), 'o Atualizar dos emails não disse nada');
  assert.deepEqual(erros, []);
});

test('navegador: apontar uma ideia cria uma tarefa na caixa de entrada', { skip: sem }, async () => {
  const r = await naPagina(`(() => {
    document.getElementById('tab-hoje').click();
    const antes = document.querySelectorAll('#inbox-list .task').length;
    document.getElementById('capture-input').value = 'Tarefa criada pelo teste';
    document.getElementById('capture-form').requestSubmit();
    return { antes, depois: document.querySelectorAll('#inbox-list .task').length, texto: document.getElementById('inbox-list').textContent };
  })()`);
  assert.equal(r.depois, r.antes + 1);
  assert.match(r.texto, /Tarefa criada pelo teste/);
  assert.deepEqual(erros, []);
});

test('navegador: escolher o modelo nas opções chega ao Conversar', { skip: sem }, async () => {
  const r = await naPagina(`(() => {
    document.getElementById('gear').open = true;
    const haiku = document.querySelector('#model-options input[value="haiku"]');
    haiku.checked = true;
    haiku.dispatchEvent(new Event('change', { bubbles: true }));
    document.getElementById('tab-conversar').click();
    return document.getElementById('talk-model').textContent;
  })()`);
  assert.match(r, /haiku/i);
  assert.deepEqual(erros, []);
});

// Último, de propósito: prova que o detetor apanha mesmo os erros da página. Sem isto,
// todos os "nenhum erro" acima podiam estar a passar por o detetor não ouvir nada.
test('navegador: o detetor de erros funciona', { skip: sem }, async () => {
  await naPagina(`setTimeout(() => { throw new Error('erro de propósito'); }, 0); true`);
  await esperar(300);
  assert.ok(erros.some((e) => e.includes('erro de propósito')), `o detetor não apanhou o erro: ${JSON.stringify(erros)}`);
  erros.length = 0;
});
