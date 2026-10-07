#!/usr/bin/env node
/**
 * verificar — confirma, num computador novo (Mac ou Windows), que o Rumo funciona todo:
 * Node, testes automáticos, Claude Code (resposta, resposta aos bocados, pesquisa na web),
 * Google Calendar e Gmail, painel local, atalho/app, arranque com o sistema, lembretes,
 * notificações, privacidade dos dados pessoais e sincronização.
 *
 * Cada verificação diz ✔ (funciona), ! (funciona com um reparo), ✖ (não funciona, e como
 * resolver), ? (só tu podes confirmar) ou – (saltada). No fim fica um relatório em
 * .sync/verificacao.txt (fora do git, sem dados pessoais) para mostrares ao Claude.
 *
 * Uso: node scripts/verificar.mjs [--rapido] [--sem-notificacao] [--sem-perguntas]
 *   --rapido           salta os testes automáticos e tudo o que chama o Claude (não gasta limite)
 *   --sem-notificacao  não envia a notificação de teste
 *   --sem-perguntas    não pergunta nada (o que só tu podes ver fica «por confirmar»)
 *
 * Zero dependências (Node >= 18).
 */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import readline from 'node:readline';
import { execFileSync, spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2);
const RAPIDO = args.includes('--rapido');
const SEM_NOTIFICACAO = args.includes('--sem-notificacao');
const PERGUNTAR = !args.includes('--sem-perguntas') && process.stdin.isTTY;
const MAC = process.platform === 'darwin';
const WIN = process.platform === 'win32';
const HOME = os.homedir();
const UID = typeof process.getuid === 'function' ? process.getuid() : 0;

// Ficheiros pessoais: têm de ficar fora do git (CLAUDE.md, Privacidade).
const PESSOAIS = [
  'rotina/tarefas.md', 'rotina/rotina.md', 'rotina/emails.json', 'rotina/agenda.json', 'rotina/foco.json',
  'escrita/voz.md', 'escrita/painel.json', 'lingua/erros-frequentes.md', 'lingua/glossario.md',
  'financas/orcamento.csv', 'financas/regras.csv', 'financas/contas.csv', 'financas/objetivos.md',
  'carreira/cv.md', 'carreira/perfil.md', 'carreira/candidaturas.csv', 'carreira/vagas.csv',
  'carreira/cargos.json', 'carreira/vagas-fora.json', 'pensar/conversas/conversar.json', 'config/rumo.json',
];
// Os que fazem falta para o Rumo ser útil (os outros criam-se sozinhos quando são precisos).
const IMPORTANTES = { 'carreira/cv.md': 'corre /cv no Claude Code, ou /sincronizar se já o tens noutro computador', 'rotina/tarefas.md': 'corre /sincronizar ou /hoje', 'config/rumo.json': 'copia este ficheiro do outro computador (tem o endereço da tua página no claude.ai); não corras /rumo, senão ficas com duas páginas' };

// ---------------------------------------------------------------- saída

const cor = process.stdout.isTTY && !process.env.NO_COLOR;
const pinta = (c, s) => (cor ? `\x1b[${c}m${s}\x1b[0m` : s);
const SIMBOLO = { ok: pinta(32, '✔'), aviso: pinta(33, '!'), falha: pinta(31, '✖'), confirmar: pinta(36, '?'), saltado: pinta(90, '–') };
const resultados = [];
let grupoAtual = '';

function grupo(nome) {
  grupoAtual = nome;
  console.log(`\n${pinta(1, nome)}`);
}

/**
 * Corre uma verificação. A função devolve um texto (✔ com esse detalhe) ou
 * { estado, detalhe, solucao }; se lançar um erro, é ✖ com a mensagem (e `e.solucao`, se houver).
 */
async function verifica(nome, fn) {
  const inicio = Date.now();
  let r;
  try {
    const v = await fn();
    r = typeof v === 'object' && v !== null ? { estado: 'ok', ...v } : { estado: 'ok', detalhe: v || '' };
  } catch (e) {
    r = { estado: 'falha', detalhe: e.message, solucao: e.solucao };
  }
  const tempo = Date.now() - inicio > 3000 ? pinta(90, ` (${Math.round((Date.now() - inicio) / 1000)} s)`) : '';
  console.log(`  ${SIMBOLO[r.estado]} ${nome}${r.detalhe ? pinta(90, ` — ${r.detalhe}`) : ''}${tempo}`);
  if (r.solucao && r.estado !== 'ok') console.log(`      ${pinta(33, '→')} ${r.solucao}`);
  resultados.push({ grupo: grupoAtual, nome, ...r });
  return r;
}
const falha = (mensagem, solucao) => Object.assign(new Error(mensagem), { solucao });
const saltado = (motivo) => ({ estado: 'saltado', detalhe: motivo });

function pergunta(texto) {
  if (!PERGUNTAR) return Promise.resolve(null);
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  return new Promise((ok) => rl.question(`      ${pinta(36, '?')} ${texto} [s/n] `, (resp) => { rl.close(); ok(/^s/i.test(resp.trim())); }));
}

const corre = (cmd, argv, opcoes = {}) => execFileSync(cmd, argv, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'], timeout: 30000, ...opcoes });
const existe = (rel) => fs.existsSync(path.join(ROOT, rel));
const git = (...a) => corre('git', a, { cwd: ROOT });

// ---------------------------------------------------------------- verificações

async function base() {
  grupo('1. Base');
  await verifica('Node.js 18 ou mais recente', () => {
    const maior = Number(process.versions.node.split('.')[0]);
    if (maior < 18) throw falha(`tens a ${process.versions.node}`, MAC ? 'instala uma versão recente: brew install node (ou nodejs.org)' : 'instala uma versão recente em nodejs.org');
    return `${process.versions.node} em ${process.execPath}`;
  });
  await verifica('Sistema', () => ({ estado: MAC || WIN ? 'ok' : 'aviso', detalhe: `${MAC ? 'macOS' : WIN ? 'Windows' : process.platform} ${os.release()} (${process.arch})`, solucao: MAC || WIN ? '' : 'o atalho, o arranque e os lembretes só existem no Mac e no Windows' }));
  await verifica('Ficheiros do Rumo', () => {
    const faltam = ['scripts/painel.mjs', 'prototipo/rumo.html', 'prototipo/rumo.js', 'prototipo/rumo.css', 'package.json'].filter((f) => !existe(f));
    if (faltam.length) throw falha(`faltam: ${faltam.join(', ')}`, 'copia o repositório inteiro outra vez (git clone)');
    return ROOT;
  });
  await verifica('Git', () => {
    try { return corre('git', ['--version']).trim(); } catch { throw falha('não encontrado', MAC ? 'instala com: xcode-select --install' : 'instala em git-scm.com'); }
  });
}

async function privacidade() {
  grupo('2. Dados pessoais e privacidade');
  await verifica('Nenhum ficheiro pessoal está no git', () => {
    let seguidos;
    try { seguidos = git('ls-files', '--', ...PESSOAIS).split('\n').filter(Boolean); } catch { return saltado('sem git nesta pasta'); }
    if (seguidos.length) throw falha(`estão no git: ${seguidos.join(', ')}`, 'tira-os do git sem os apagar: git rm --cached <ficheiro>, e confirma o .gitignore');
    return `${PESSOAIS.length} ficheiros verificados`;
  });
  await verifica('Os ficheiros pessoais que existem estão protegidos pelo .gitignore', () => {
    const presentes = PESSOAIS.filter(existe);
    if (!presentes.length) return { estado: 'aviso', detalhe: 'ainda não há ficheiros pessoais neste computador', solucao: 'corre /sincronizar para trazer os teus dados' };
    const r = spawnSync('git', ['check-ignore', ...presentes], { cwd: ROOT, encoding: 'utf8' });
    const ignorados = new Set(String(r.stdout || '').split(/\r?\n/).filter(Boolean).map((f) => f.replace(/\\/g, '/')));
    const expostos = presentes.filter((f) => !ignorados.has(f));
    if (expostos.length) throw falha(`não ignorados: ${expostos.join(', ')}`, 'acrescenta-os ao .gitignore');
    return `${presentes.length} protegidos`;
  });
  for (const [rel, como] of Object.entries(IMPORTANTES)) {
    await verifica(`Tens ${rel}`, () => (existe(rel) ? 'sim' : { estado: 'aviso', detalhe: 'ainda não', solucao: como }));
  }
  await verifica('Sincronização com o claude.ai configurada', () => {
    if (!existe('config/rumo.json')) return { estado: 'aviso', detalhe: 'sem config/rumo.json', solucao: IMPORTANTES['config/rumo.json'] };
    let url = '';
    try { url = JSON.parse(fs.readFileSync(path.join(ROOT, 'config/rumo.json'), 'utf8')).url || ''; } catch { throw falha('config/rumo.json não é JSON válido', 'copia-o outra vez do outro computador'); }
    if (!/^https:\/\/claude\.ai\//.test(url)) throw falha('config/rumo.json sem o endereço da página', IMPORTANTES['config/rumo.json']);
    const estado = spawnSync(process.execPath, [path.join(ROOT, 'scripts/sincronizar.mjs'), 'estado'], { cwd: ROOT, encoding: 'utf8' }).stdout.trim();
    return estado.split('\n')[0];
  });
}

async function testes() {
  grupo('3. Testes automáticos');
  if (RAPIDO) return verifica('npm test', () => saltado('--rapido'));
  await verifica('npm test (inclui o painel num navegador sem janela)', () => {
    const pacote = JSON.parse(fs.readFileSync(path.join(ROOT, 'package.json'), 'utf8'));
    const ficheiros = pacote.scripts.test.split(/\s+/).filter((x) => x.endsWith('.mjs'));
    const r = spawnSync(process.execPath, ['--test', ...ficheiros], { cwd: ROOT, encoding: 'utf8', timeout: 600000, env: { ...process.env, NO_COLOR: '1' } });
    const saida = `${r.stdout}${r.stderr}`;
    const n = (k) => Number((saida.match(new RegExp(`ℹ ${k} (\\d+)`)) || [])[1] || 0);
    const falhados = [...saida.matchAll(/^✖ (.+?) \(\d/gm)].map((m) => m[1]).filter((t) => !/\.mjs$/.test(t));
    const saltados = n('skipped');
    if (n('fail') || r.status !== 0) throw falha(`${n('fail')} de ${n('tests')} falharam: ${[...new Set(falhados)].slice(0, 4).join(' · ')}`, 'mostra este relatório ao Claude');
    if (saltados) return { estado: 'aviso', detalhe: `${n('pass')} passaram, ${saltados} saltados`, solucao: 'os testes no navegador precisam do Google Chrome ou do Microsoft Edge instalados' };
    return `${n('pass')} de ${n('tests')} passaram`;
  });
}

async function claude() {
  grupo('4. Claude Code');
  const painel = await import('./painel.mjs');
  painel.completarPath();
  let encontrado = '';
  await verifica('Claude Code instalado', () => {
    const nomes = WIN ? ['claude.exe', 'claude.cmd'] : ['claude'];
    for (const dir of String(process.env.PATH).split(path.delimiter)) {
      for (const n of nomes) if (dir && fs.existsSync(path.join(dir, n))) { encontrado = path.join(dir, n); break; }
      if (encontrado) break;
    }
    if (!encontrado) throw falha('não encontrado', MAC ? 'instala com: curl -fsSL https://claude.ai/install.sh | bash   e depois entra com: claude' : 'instala o Claude Code (claude.ai/download) e entra com: claude');
    const versao = (() => { try { return corre(encontrado, ['--version'], { shell: encontrado.endsWith('.cmd') }).trim(); } catch { return ''; } })();
    return `${versao || 'versão desconhecida'} em ${encontrado}`;
  });
  if (RAPIDO) {
    for (const n of ['Resposta do Claude através do painel', 'Pesquisa na internet (Investir, vagas)', 'Google Calendar e Gmail (agenda e emails automáticos)']) await verifica(n, () => saltado('--rapido'));
    return;
  }
  if (!encontrado) return;
  console.log(pinta(90, '    (as próximas três verificações chamam o Claude e gastam um pouco do teu limite)'));
  await verifica('Resposta do Claude através do painel (aos bocados, como no Conversar)', async () => {
    let bocados = 0;
    const inicio = Date.now();
    let primeira = 0;
    const texto = await painel.askClaude('Responde só com a palavra: funciona', {
      timeout: 120000, onDelta: () => { bocados++; if (!primeira) primeira = Date.now() - inicio; },
    }).catch((e) => { throw falha(e.message, /login|auth|log in|sess/i.test(e.message) ? 'entra na tua conta: corre claude no Terminal e segue as instruções' : 'corre claude no Terminal para ver se pede alguma coisa'); });
    if (!/funciona/i.test(texto)) return { estado: 'aviso', detalhe: `respondeu, mas de forma inesperada: «${texto.slice(0, 60)}»` };
    if (!bocados) return { estado: 'aviso', detalhe: 'respondeu, mas tudo de uma vez', solucao: 'atualiza o Claude Code: claude update' };
    return `primeira palavra aos ${(primeira / 1000).toFixed(1)} s`;
  });
  await verifica('Pesquisa na internet (Investir, ajustar CV a uma vaga)', async () => {
    const texto = await painel.askClaude('Usa o WebFetch para abrir https://example.com e responde só com o título da página.', { web: true, timeout: 180000 });
    if (!/example domain/i.test(texto)) throw falha(`não conseguiu ler a página: «${texto.slice(0, 80)}»`, 'confirma a ligação à internet; se o Claude Code pedir permissões, corre claude no Terminal uma vez');
    return 'leu example.com';
  });
  await verifica('Google Calendar e Gmail (agenda e emails automáticos)', async () => {
    // Numa pasta temporária: a verificação não mexe na tua agenda.json nem na emails.json.
    const pasta = fs.mkdtempSync(path.join(os.tmpdir(), 'rumo-verificar-'));
    try {
      const r = await painel.atualizarGoogle(pasta, { timeout: 240000 });
      const partes = [r.agenda === null ? null : `${r.agenda} eventos esta semana`, r.emails === null ? null : `${r.emails} emails a pedir ação`].filter(Boolean);
      if (r.agenda === null || r.emails === null) {
        return { estado: 'aviso', detalhe: `${r.agenda === null ? 'o Google Calendar' : 'o Gmail'} não respondeu; ${partes.join(', ')}`, solucao: 'em claude.ai → Definições → Conectores, liga o Google Calendar e o Gmail na mesma conta' };
      }
      return partes.join(', ');
    } catch (e) {
      throw falha(e.message, 'em claude.ai → Definições → Conectores, liga o Google Calendar e o Gmail na mesma conta do Claude Code');
    } finally {
      fs.rmSync(pasta, { recursive: true, force: true });
    }
  });
  painel.desligarClaude();
}

async function painelLocal() {
  grupo('5. Painel local');
  const painel = await import('./painel.mjs');
  const antes = painel.readState();
  const jaCorria = Boolean(antes && await painel.ping(antes.port));
  let estado = null;
  await verifica('Arranca em segundo plano', () => {
    const r = spawnSync(process.execPath, [path.join(ROOT, 'scripts/painel.mjs'), 'abrir', '--no-open'], { cwd: ROOT, encoding: 'utf8', timeout: 30000 });
    estado = painel.readState();
    if (r.status !== 0 || !estado) throw falha((r.stderr || r.stdout || 'não arrancou').trim().split('\n').pop(), 'corre node scripts/painel.mjs servir para ver o erro');
    return jaCorria ? `já estava a correr na porta ${estado.port}` : `a correr na porta ${estado.port}`;
  });
  if (!estado) return;
  const base = `http://127.0.0.1:${estado.port}`;
  const comChave = (url, o = {}) => fetch(`${base}${url}`, { ...o, headers: { 'X-Rumo-Token': estado.token, ...(o.headers || {}) } });
  await verifica('Serve a página, os estilos e a lógica', async () => {
    for (const f of ['/', '/rumo.css', '/rumo.js']) {
      const r = await fetch(`${base}${f}`);
      if (r.status !== 200) throw falha(`${f} respondeu ${r.status}`);
    }
    return 'rumo.html, rumo.css e rumo.js';
  });
  await verifica('Só responde com a chave de acesso', async () => {
    if ((await fetch(`${base}/api/files`)).status !== 403) throw falha('a API respondeu sem chave');
    if ((await comChave('/api/files')).status !== 200) throw falha('a API não aceitou a chave guardada');
    return 'sem chave: recusado; com chave: aceite';
  });
  await verifica('Política de segurança da página', async () => {
    const csp = (await fetch(base)).headers.get('content-security-policy') || '';
    if (!/default-src 'self'/.test(csp)) throw falha('sem política de segurança');
    return 'ativa';
  });
  await verifica('Lê os teus ficheiros (agenda, emails, finanças, escrita)', async () => {
    for (const f of ['/api/agenda', '/api/emails', '/api/financas', '/api/escrita']) {
      const r = await comChave(f);
      if (r.status !== 200) throw falha(`${f} respondeu ${r.status}`);
    }
    const agenda = await (await comChave('/api/agenda')).json();
    return agenda.updatedAt ? `agenda atualizada em ${new Date(agenda.updatedAt).toLocaleString('pt-PT')}` : 'agenda ainda vazia (atualiza-se sozinha com o painel ligado)';
  });
  await verifica('Mantém a chave depois de reiniciar', () => {
    spawnSync(process.execPath, [path.join(ROOT, 'scripts/painel.mjs'), 'parar'], { cwd: ROOT });
    spawnSync(process.execPath, [path.join(ROOT, 'scripts/painel.mjs'), 'abrir', '--no-open'], { cwd: ROOT, timeout: 30000 });
    const depois = painel.readState();
    if (!depois || depois.token !== estado.token) throw falha('a chave mudou: um separador aberto deixaria de funcionar', 'mostra este relatório ao Claude');
    return 'a mesma chave';
  });
  // Deixa o painel como estava: se não estava ligado, desliga-o.
  if (!jaCorria) spawnSync(process.execPath, [path.join(ROOT, 'scripts/painel.mjs'), 'parar'], { cwd: ROOT });
  await verifica('Abre no navegador', async () => {
    if (MAC && !fs.existsSync('/usr/bin/open')) throw falha('falta o comando open');
    const viu = await pergunta('Queres que abra o painel agora no navegador para confirmares?');
    if (viu === null) return { estado: 'confirmar', detalhe: 'abre-o pelo atalho e confirma que aparece' };
    if (!viu) return saltado('escolheste não abrir');
    spawnSync(process.execPath, [path.join(ROOT, 'scripts/painel.mjs'), 'abrir'], { cwd: ROOT, timeout: 30000 });
    const ok = await pergunta('O painel abriu no navegador, com os separadores do Rumo?');
    if (!ok) throw falha('não abriu', 'corre node scripts/painel.mjs servir e abre o endereço que aparecer');
    return 'confirmado por ti';
  });
}

/** O caminho do node que um ficheiro gerado usa ainda existe? (o Homebrew muda-o nas atualizações) */
function nodeDe(conteudo) {
  const m = conteudo.match(/<string>([^<]*node[^<]*)<\/string>/) || conteudo.match(/'([^']*\/node)'/);
  return m ? m[1] : '';
}

async function atalhoEArranque() {
  grupo('6. Atalho e arranque com o sistema');
  if (MAC) {
    const app = path.join(ROOT, 'Rumo.app');
    await verifica('App Rumo (Rumo.app)', () => {
      const exe = path.join(app, 'Contents', 'MacOS', 'Rumo');
      if (!fs.existsSync(exe)) throw falha('não existe', 'cria-a com: npm run atalho');
      if (!(fs.statSync(exe).mode & 0o111)) throw falha('não é executável', 'cria-a outra vez: npm run atalho');
      if (!fs.existsSync(path.join(app, 'Contents', 'Resources', 'rumo.icns'))) return { estado: 'aviso', detalhe: 'sem ícone', solucao: 'npm run atalho' };
      const node = nodeDe(fs.readFileSync(exe, 'utf8'));
      if (node && !fs.existsSync(node)) throw falha(`usa um node que já não existe (${node})`, 'cria-a outra vez: npm run atalho');
      return 'pronta; arrasta-a para a Dock ou para as Aplicações';
    });
    const agente = path.join(HOME, 'Library', 'LaunchAgents', 'pt.rumo.painel.plist');
    await verifica('Arranque ao entrar no Mac', () => {
      if (!fs.existsSync(agente)) return { estado: 'aviso', detalhe: 'desligado', solucao: 'para o painel arrancar sozinho: npm run atalho arranque' };
      const node = nodeDe(fs.readFileSync(agente, 'utf8'));
      if (node && !fs.existsSync(node)) throw falha(`usa um node que já não existe (${node})`, 'npm run atalho arranque');
      const r = spawnSync('launchctl', ['print', `gui/${UID}/pt.rumo.painel`], { encoding: 'utf8' });
      if (r.status !== 0) throw falha('o ficheiro existe, mas o macOS não o carregou', 'npm run atalho arranque');
      return 'ligado';
    });
  } else if (WIN) {
    await verifica('Atalho Rumo (Rumo.lnk)', () => (existe('Rumo.lnk') ? 'na pasta do projeto' : { estado: 'aviso', detalhe: 'não existe', solucao: 'cria-o com: npm run atalho' }));
    await verifica('Arranque ao entrar no Windows', () => {
      const lnk = path.join(process.env.APPDATA || '', 'Microsoft', 'Windows', 'Start Menu', 'Programs', 'Startup', 'Rumo.lnk');
      return fs.existsSync(lnk) ? 'ligado' : { estado: 'aviso', detalhe: 'desligado', solucao: 'para o painel arrancar sozinho: npm run atalho arranque' };
    });
  } else {
    await verifica('Atalho e arranque', () => saltado('só no Mac e no Windows'));
  }
}

async function lembretes() {
  grupo('7. Lembretes e notificações');
  const tipos = ['manha', 'tarde', 'prazo', 'semana', 'vagas'];
  await verifica('Lembretes agendados', () => {
    let ativos = [];
    let nodeEmFalta = '';
    if (MAC) {
      for (const t of tipos) {
        const label = t === 'vagas' ? 'pt.assistente.vagas' : `pt.assistente.lembrete.${t}`;
        const ficheiro = path.join(HOME, 'Library', 'LaunchAgents', `${label}.plist`);
        if (!fs.existsSync(ficheiro)) continue;
        const node = nodeDe(fs.readFileSync(ficheiro, 'utf8'));
        if (node && !fs.existsSync(node)) nodeEmFalta = node;
        if (spawnSync('launchctl', ['print', `gui/${UID}/${label}`]).status === 0) ativos.push(t);
      }
    } else if (WIN) {
      for (const t of tipos) {
        const nome = t === 'vagas' ? 'Assistente\\Procura de vagas' : `Assistente\\Lembrete ${t}`;
        if (spawnSync('schtasks', ['/Query', '/TN', nome], { windowsHide: true }).status === 0) ativos.push(t);
      }
    } else return saltado('só no Mac e no Windows');
    if (nodeEmFalta) throw falha(`os lembretes usam um node que já não existe (${nodeEmFalta})`, 'volta a instalá-los: node scripts/lembretes.mjs instalar');
    if (!ativos.length) return { estado: 'aviso', detalhe: 'nenhum', solucao: 'instala-os com: node scripts/lembretes.mjs instalar  (ou /lembretes no Claude Code)' };
    return `${ativos.length} de ${tipos.length}: ${ativos.join(', ')}`;
  });
  await verifica('Notificação de teste', async () => {
    if (SEM_NOTIFICACAO) return saltado('--sem-notificacao');
    const { notify } = await import('./lembretes.mjs');
    if (!notify('Rumo · verificação', 'Se estás a ler isto, as notificações funcionam.')) {
      throw falha('o sistema recusou mostrar a notificação', MAC ? 'Definições do Sistema → Notificações → Editor de Scripts: permitir' : 'Definições → Sistema → Notificações: ativar');
    }
    const viu = await pergunta('Apareceu uma notificação «Rumo · verificação»?');
    if (viu === null) return { estado: 'confirmar', detalhe: 'enviada; confirma se apareceu no canto do ecrã' };
    if (!viu) {
      throw falha('enviada, mas não apareceu', MAC
        ? 'Definições do Sistema → Notificações → Editor de Scripts (pode ter outro nome): permitir notificações; confirma também que o modo Foco/Não incomodar está desligado'
        : 'Definições → Sistema → Notificações: ativa as notificações e confirma que o «Não incomodar» está desligado');
    }
    return 'confirmada por ti';
  });
}

async function navegador() {
  grupo('8. Navegador');
  await verifica('Chrome ou Edge (para os testes no navegador)', () => {
    const candidatos = MAC
      ? ['/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', '/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge']
      : ['C:/Program Files/Google/Chrome/Application/chrome.exe', 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe', 'C:/Program Files/Microsoft/Edge/Application/msedge.exe'];
    const achado = candidatos.find((p) => fs.existsSync(p));
    if (!achado) return { estado: 'aviso', detalhe: 'não encontrado', solucao: 'o painel funciona noutros navegadores (Safari incluído); só os testes automáticos no navegador ficam saltados' };
    return achado;
  });
}

// ---------------------------------------------------------------- relatório

function relatorio() {
  const conta = (e) => resultados.filter((r) => r.estado === e).length;
  const linha = `${conta('ok')} a funcionar · ${conta('aviso')} com reparos · ${conta('falha')} com problemas · ${conta('confirmar')} por confirmar · ${conta('saltado')} saltadas`;
  console.log(`\n${pinta(1, 'Resumo')}: ${linha}`);
  const problemas = resultados.filter((r) => r.estado === 'falha');
  if (problemas.length) {
    console.log(pinta(31, '\nPara resolver:'));
    for (const p of problemas) console.log(`  ✖ ${p.nome}${p.solucao ? ` → ${p.solucao}` : ''}`);
  }
  // Relatório sem dados pessoais: só o estado de cada verificação e as mensagens de erro.
  const texto = [
    `Verificação do Rumo — ${new Date().toISOString()}`,
    `${MAC ? 'macOS' : WIN ? 'Windows' : process.platform} ${os.release()} · Node ${process.versions.node}${RAPIDO ? ' · modo rápido' : ''}`,
    linha, '',
    ...resultados.map((r) => `[${r.estado}] ${r.grupo} › ${r.nome}${r.detalhe ? ` — ${r.detalhe}` : ''}${r.solucao && r.estado !== 'ok' ? `\n    → ${r.solucao}` : ''}`),
    '',
  ].join('\n').replaceAll(HOME, '~');
  const ficheiro = path.join(ROOT, '.sync', 'verificacao.txt');
  fs.mkdirSync(path.dirname(ficheiro), { recursive: true });
  fs.writeFileSync(ficheiro, texto);
  console.log(pinta(90, `\nRelatório em .sync/verificacao.txt (sem dados pessoais). Se algo falhar, mostra-o ao Claude.`));
  return problemas.length ? 1 : 0;
}

console.log(pinta(1, 'Verificação do Rumo') + pinta(90, `  ${MAC ? 'macOS' : WIN ? 'Windows' : process.platform}${RAPIDO ? ' · modo rápido' : ''}`));
if (!RAPIDO) console.log(pinta(90, 'Demora uns 3 a 5 minutos. Para uma verificação sem testes nem Claude: --rapido'));
await base();
await privacidade();
await testes();
await claude();
await painelLocal();
await atalhoEArranque();
await lembretes();
await navegador();
process.exit(relatorio());
