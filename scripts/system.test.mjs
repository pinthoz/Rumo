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
  assert.equal(skills.length, 29);
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
  const expected = ['hoje', 'feito', 'lembretes', 'foco', 'rumo', 'sincronizar', 'semana', 'travado', 'captura', 'rever', 'gastos', 'financas', 'investir', 'pensar', 'pt', 'en', 'brief', 'architect', 'character', 'world', 'outline', 'scene', 'draft', 'critique', 'edit', 'factcheck', 'continuity', 'polish', 'qa', 'final'];
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
