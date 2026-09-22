// Integridade do sistema: skills, agents, comandos e templates referem-se uns aos outros corretamente.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseFrontmatter } from './cwos.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const dir = (...p) => path.join(root, '.claude', ...p);
const load = (f) => ({ file: path.relative(root, f), ...parseFrontmatter(fs.readFileSync(f, 'utf8')) });

const skills = fs.readdirSync(dir('skills')).map((n) => ({ name: n, ...load(dir('skills', n, 'SKILL.md')) }));
const agents = fs.readdirSync(dir('agents')).filter((f) => f.endsWith('.md')).map((f) => load(dir('agents', f)));
const commands = fs.readdirSync(dir('commands')).filter((f) => f.endsWith('.md')).map((f) => ({ name: f.slice(0, -3), ...load(dir('commands', f)) }));
const skillNames = new Set(skills.map((s) => s.name));
const agentNames = new Set(agents.map((a) => a.data.name));
const KNOWN_TOOLS = new Set(['Read', 'Grep', 'Glob', 'Bash', 'Write', 'Edit', 'WebSearch', 'WebFetch']);

test('skills: frontmatter, nome = pasta, secções obrigatórias', () => {
  assert.equal(skills.length, 32);
  for (const s of skills) {
    assert.equal(s.data?.name, s.name, s.file);
    assert.ok(s.data.description?.length > 40, `${s.file}: description curta`);
    for (const h of ['Propósito', 'Quando usar', 'Quando NÃO usar', 'Processo', 'Output', 'Critérios de qualidade', 'Dependências']) {
      assert.match(s.body, new RegExp(`^## ${h}`, 'm'), `${s.file}: falta "## ${h}"`);
    }
  }
});

test('agents: skills pré-carregadas existem, tools conhecidas, secções obrigatórias', () => {
  assert.equal(agents.length, 12);
  for (const a of agents) {
    assert.equal(`${a.data.name}.md`, path.basename(a.file));
    for (const s of String(a.data.skills || '').split(',').map((x) => x.trim()).filter(Boolean)) {
      assert.ok(skillNames.has(s), `${a.file}: skill inexistente "${s}"`);
    }
    for (const t of String(a.data.tools).split(',').map((x) => x.trim())) assert.ok(KNOWN_TOOLS.has(t), `${a.file}: tool "${t}"`);
    for (const h of ['Missão', 'Competências', 'Contexto necessário', 'Ferramentas autorizadas', 'Procedimento', 'Output', 'Critérios de sucesso', 'Limitações']) {
      assert.match(a.body, new RegExp(`^## ${h}`, 'm'), `${a.file}: falta "## ${h}"`);
    }
  }
});

test('agents de crítica não podem editar o manuscrito', () => {
  for (const name of ['scene-editor', 'dialogue-editor', 'literary-editor', 'continuity-editor', 'devils-advocate', 'quality-controller', 'fact-checker']) {
    const a = agents.find((x) => x.data.name === name);
    assert.ok(!/\bEdit\b/.test(a.data.tools), `${name} não deve ter Edit`);
  }
  assert.ok(!/\bWrite\b/.test(agents.find((x) => x.data.name === 'devils-advocate').data.tools));
});

test('comandos: sem colisão com skills e referências válidas', () => {
  for (const c of commands) {
    assert.ok(!skillNames.has(c.name), `/${c.name} colide com a skill homónima`);
    assert.ok(c.data?.description, `${c.file}: sem description`);
    assert.match(c.body, /\$ARGUMENTS/, `${c.file}: não passa $ARGUMENTS`);
    for (const [, ref] of c.body.matchAll(/`([a-z]+(?:-[a-z]+)+|[a-z]+)`/g)) {
      if (/^(new|use|status|tudo)$/.test(ref)) continue;
      if (skillNames.has(ref) || agentNames.has(ref)) continue;
      if (/skill|agent/.test(c.body.slice(Math.max(0, c.body.indexOf(ref) - 12), c.body.indexOf(ref)))) {
        assert.fail(`${c.file}: referência desconhecida "${ref}"`);
      }
    }
  }
  const expected = ['hoje', 'feito', 'lembretes', 'foco', 'rumo', 'sincronizar', 'semana', 'travado', 'captura', 'rever', 'gastos', 'financas', 'investir', 'vaga', 'procurar', 'candidaturas', 'pensar', 'pt', 'en', 'brief', 'architect', 'character', 'world', 'outline', 'scene', 'draft', 'critique', 'edit', 'factcheck', 'continuity', 'polish', 'qa', 'final'];
  for (const e of expected) assert.ok(commands.some((c) => c.name === e), `falta /${e}`);
  for (const e of ['dialogue', 'pacing', 'voice', 'research']) assert.ok(skillNames.has(e), `/${e} deve ser servido pela skill`);
});

test('agents e skills referidos em CLAUDE.md e docs existem', () => {
  const texts = ['CLAUDE.md', 'escrita/CLAUDE.md', 'escrita/docs/agents.md', 'escrita/docs/skills.md', 'escrita/docs/workflow.md', 'docs/guia.md'].map((f) => fs.readFileSync(path.join(root, f), 'utf8')).join('\n');
  for (const [, ref] of texts.matchAll(/(?:skill|agent)s? `([a-z-]+)`/g)) {
    assert.ok(skillNames.has(ref) || agentNames.has(ref), `referência desconhecida: ${ref}`);
  }
});

test('templates usados pelo cwos existem', () => {
  const src = fs.readFileSync(path.join(root, 'scripts', 'cwos.mjs'), 'utf8');
  for (const [, t] of src.matchAll(/'([a-z-]+\.md)'/g)) {
    if (['PROJECT.md', 'ACTIVE.md', 'canon-index.md'].includes(t) || t.includes('/')) continue;
    assert.ok(fs.existsSync(path.join(root, 'escrita', 'templates', t)), `template em falta: ${t}`);
  }
});

test('hook de arranque aponta para um comando existente e só mostra mensagem ao utilizador', () => {
  const settings = JSON.parse(fs.readFileSync(path.join(root, '.claude', 'settings.json'), 'utf8'));
  const hook = settings.hooks?.SessionStart?.[0]?.hooks?.[0];
  assert.ok(hook, 'falta o hook SessionStart');
  assert.match(hook.command, /scripts\/rotina\.mjs" arranque$/);
  assert.match(fs.readFileSync(path.join(root, 'scripts', 'rotina.mjs'), 'utf8'), /arranque: cmdArranque/);
});

// O painel está em três ficheiros: a página, os estilos e a lógica.
const painel = () => ({
  html: fs.readFileSync(path.join(root, 'prototipo', 'rumo.html'), 'utf8'),
  script: fs.readFileSync(path.join(root, 'prototipo', 'rumo.js'), 'utf8'),
  css: fs.readFileSync(path.join(root, 'prototipo', 'rumo.css'), 'utf8'),
});

test('artifact: a página carrega os seus ficheiros e não tem scripts embutidos', () => {
  const { html, css } = painel();
  assert.match(html, /<link rel="stylesheet" href="rumo\.css">/);
  assert.match(html, /<script src="rumo\.js"><\/script>/);
  // Sem scripts embutidos nem atributos on*: é isso que deixa o painel local
  // correr com uma política de segurança sem 'unsafe-inline' nos scripts.
  assert.doesNotMatch(html, /<script>/, 'script embutido na página');
  assert.doesNotMatch(html, /\son(click|change|input|submit|load|keydown)=/, 'atributo on* no HTML');
  assert.ok(css.length > 1000, 'o CSS parece vazio');
});

test('artifact: JavaScript válido, ids únicos e orientação de carreira presente', () => {
  const { html, script } = painel();
  assert.ok(script, 'falta o script do artifact');
  assert.doesNotThrow(() => new Function(script), 'JavaScript inválido no artifact');
  const ids = [...html.matchAll(/\sid="([^"]+)"/g)].map((m) => m[1]);
  assert.equal(new Set(ids).size, ids.length, 'há ids HTML repetidos');
  for (const id of ['mobile-view', 'j-next-panel', 'j-next-title', 'j-next-actions', 'j-next-count', 'gmail-panel', 'gmail-prev', 'gmail-next', 'gmail-position', 'cfg-offline', 'cfg-local', 'cfg-files', 'cfg-form']) assert.ok(ids.includes(id), `falta #${id}`);
  assert.match(html, /Procura de emprego, passo a passo/);
  assert.match(html, /<label class="mobile-nav" for="mobile-view">/);
});

// Os erros que apanhámos a olho (botões mudos, ids trocados) passam a ser apanhados aqui.
test('artifact: tudo o que o script procura existe no HTML', () => {
  const { html, script } = painel();
  const ids = new Set([...html.matchAll(/\sid="([^"]+)"/g)].map((m) => m[1]));
  // `focus-dot` é criado pelo próprio script, ao montar os separadores.
  const criadosPeloScript = new Set(['focus-dot']);

  const procurados = [...new Set([...script.matchAll(/\$\("([a-z0-9-]+)"\)/g)].map((m) => m[1]))];
  const emFalta = procurados.filter((id) => !ids.has(id) && !criadosPeloScript.has(id));
  assert.deepEqual(emFalta, [], 'o script procura ids que não existem no HTML');

  // Cada separador tem a sua secção, e cada atalho aponta para um separador real.
  const views = [...script.matchAll(/id: "([a-z-]+)", name:/g)].map((m) => m[1]);
  assert.ok(views.length >= 8, 'poucos separadores encontrados');
  for (const v of views) assert.ok(ids.has(`view-${v}`), `falta a secção #view-${v}`);
  for (const m of html.matchAll(/data-go-view="([a-z-]+)"/g)) {
    assert.ok(views.includes(m[1]), `atalho para um separador inexistente: ${m[1]}`);
  }
});

test('artifact: as etapas da carreira mostram secções que existem', () => {
  const { html, script } = painel();
  const ids = new Set([...html.matchAll(/\sid="([^"]+)"/g)].map((m) => m[1]));
  const bloco = script.match(/const ETAPAS = \{([\s\S]*?)\};/)?.[1];
  assert.ok(bloco, 'falta o mapa das etapas da carreira');
  const etapas = [...bloco.matchAll(/(\d): \[([^\]]*)\]/g)].map(([, n, lista]) => [Number(n), [...lista.matchAll(/"([a-z0-9-]+)"/g)].map((m) => m[1])]);
  assert.deepEqual(etapas.map(([n]) => n), [1, 2, 3, 4], 'as quatro etapas têm de estar todas');
  const vistas = new Set();
  for (const [n, seccoes] of etapas) {
    assert.ok(seccoes.length, `a etapa ${n} não mostra nada`);
    for (const id of seccoes) {
      assert.ok(ids.has(id), `a etapa ${n} aponta para #${id}, que não existe`);
      assert.ok(!vistas.has(id), `#${id} aparece em mais do que uma etapa`);
      vistas.add(id);
    }
  }
  // A barra de etapas tem de ter um botão por etapa.
  const passos = [...html.matchAll(/class="flow-step"[^>]*data-step="(\d)"/g)].map((m) => Number(m[1]));
  assert.deepEqual(passos, [1, 2, 3, 4]);
});
