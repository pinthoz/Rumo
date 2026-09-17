// Testes do cwos. Executar: node --test scripts/
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { parseFrontmatter, parseTable, proseOf, styleMetrics } from './cwos.mjs';

const here = path.dirname(fileURLToPath(import.meta.url));
const repo = path.resolve(here, '..');
const cli = path.join(here, 'cwos.mjs');
let root;

const run = (...args) => {
  const r = spawnSync(process.execPath, [cli, ...args], { env: { ...process.env, CWOS_ROOT: root }, encoding: 'utf8' });
  return { code: r.status, out: r.stdout + r.stderr };
};
const proj = (...p) => path.join(root, 'escrita', 'projetos', 't', ...p);
const edit = (rel, fn) => fs.writeFileSync(proj(rel), fn(fs.readFileSync(proj(rel), 'utf8')));

before(() => {
  root = fs.mkdtempSync(path.join(os.tmpdir(), 'cwos-'));
  fs.cpSync(path.join(repo, 'escrita', 'templates'), path.join(root, 'escrita', 'templates'), { recursive: true });
  fs.cpSync(path.join(here, 'data'), path.join(root, 'scripts', 'data'), { recursive: true });
});
after(() => fs.rmSync(root, { recursive: true, force: true }));

test('parseFrontmatter: escalares, listas inline e em bloco', () => {
  const { data, body } = parseFrontmatter('---\nid: char-a\nname: "Ana"\naliases: [A, "Aninhas"]\ndepends_on:\n  - loc-x\n  - loc-y\nempty:\n---\ncorpo');
  assert.equal(data.id, 'char-a');
  assert.equal(data.name, 'Ana');
  assert.deepEqual(data.aliases, ['A', 'Aninhas']);
  assert.deepEqual(data.depends_on, ['loc-x', 'loc-y']);
  assert.equal(data.empty, '');
  assert.equal(body, 'corpo');
  assert.equal(parseFrontmatter('sem frontmatter').data, null);
});

test('parseTable e proseOf', () => {
  const rows = parseTable('| id | Ord |\n|---|---|\n| ev-a | 1 |\n| ev-b | 2 |');
  assert.deepEqual(rows, [{ id: 'ev-a', ord: '1' }, { id: 'ev-b', ord: '2' }]);
  const prose = proseOf('## Scene sheet\n- x\n## Texto\nOlá mundo.\n<!-- nota -->\n## Notas\nfora');
  assert.equal(prose.trim(), 'Olá mundo.');
});

test('styleMetrics conta frases e diálogo', () => {
  const m = styleMetrics('Ela entrou. A sala estava vazia e fria.\n\n— Está alguém?\n\nNinguém respondeu.');
  assert.equal(m.frases, 4);
  assert.equal(m.paragrafos, 3);
  assert.equal(m.dialogo_pct, 33.3);
});

test('style e cliches funcionam sobre textos soltos, sem projeto ativo', () => {
  const loose = path.join(root, 'texto-solto.md');
  fs.writeFileSync(loose, 'Era uma noite escura e tempestuosa. Ele saiu.\n\nNinguém reparou.');
  const s = run('style', loose);
  assert.equal(s.code ?? 0, 0, s.out);
  assert.match(s.out, /frases\s+3/);
  assert.match(run('cliches', loose).out, /texto-solto\.md:1\s+"numa noite escura|texto-solto\.md:1\s+"era uma noite escura/);
  assert.equal(run('validate').code, 2, 'sem ficheiros continua a exigir projeto');
});

test('new cria projeto, ativa-o e valida sem erros', () => {
  const r = run('new', 't', '--profile', 'long', '--title', 'Teste');
  assert.equal(r.code ?? 0, 0, r.out);
  assert.match(fs.readFileSync(path.join(root, 'escrita', 'projetos', 'ACTIVE.md'), 'utf8'), /^@t\/PROJECT\.md/m);
  assert.ok(fs.existsSync(proj('world/rules.md')));
  const v = run('validate');
  assert.equal(v.code, 0, v.out);
  assert.equal(run('new', 't').code, 2, 'não deve sobrescrever');
});

test('add valida prefixos e cria entidades', () => {
  assert.equal(run('add', 'character', 'ines').code, 2);
  assert.equal(run('add', 'character', 'char-ines', 'Inês', 'Tavares').code ?? 0, 0);
  assert.equal(run('add', 'character', 'char-ines').code, 2, 'id duplicado');
  run('add', 'location', 'loc-farmacia', 'Farmácia', 'Central');
  run('add', 'scene', 'sc-01', 'Abertura');
  assert.match(fs.readFileSync(proj('characters/char-ines.md'), 'utf8'), /name: "Inês Tavares"/);
  assert.ok(fs.existsSync(proj('world/loc-farmacia.md')));
});

test('validate deteta referências partidas, estados inválidos e canon sobre rejeitado', () => {
  edit('manuscript/scenes/sc-01.md', (s) => s.replace('pov:', 'pov: char-fantasma'));
  let v = run('validate');
  assert.equal(v.code, 1);
  assert.match(v.out, /pov → "char-fantasma" não existe/);
  edit('manuscript/scenes/sc-01.md', (s) => s.replace('pov: char-fantasma', 'pov: char-ines').replace('location:', 'location: loc-farmacia'));

  edit('characters/char-ines.md', (s) => s.replace('status: PROPOSTA', 'status: CANON').replace('depends_on: []', 'depends_on: [loc-farmacia]'));
  edit('world/loc-farmacia.md', (s) => s.replace('status: PROPOSTA', 'status: REJEITADO'));
  v = run('validate');
  assert.match(v.out, /CANON depende de "loc-farmacia" que está REJEITADO/);
  assert.match(v.out, /cena usa "loc-farmacia" que está REJEITADO/);

  edit('world/loc-farmacia.md', (s) => s.replace('status: REJEITADO', 'status: TALVEZ'));
  assert.match(run('validate').out, /status inválido "TALVEZ"/);
  edit('world/loc-farmacia.md', (s) => s.replace('status: TALVEZ', 'status: PROPOSTA'));
  v = run('validate');
  assert.equal(v.code, 0, v.out);
  assert.match(v.out, /CANON assenta em "loc-farmacia" que ainda é PROPOSTA/);
});

test('timeline: eventos indexados, ordem e referências verificadas', () => {
  edit('story/timeline.md', (s) => s + '| ev-b | 2 | dia 2 | Segundo | char-ines | loc-farmacia | PROVISIONAL | |\n| ev-a | 1 | dia 1 | Primeiro | char-zeca | | PROVISIONAL | |\n');
  const v = run('validate');
  assert.match(v.out, /"ev-a" \(ord 1\) vem depois de "ev-b"/);
  assert.match(v.out, /ev-a\]: characters → "char-zeca" não existe/);
  edit('story/timeline.md', (s) => s.replace('| ev-a | 1 | dia 1 | Primeiro | char-zeca', '| ev-c | 3 | dia 3 | Terceiro | char-ines'));
  assert.equal(run('validate').code, 0);
});

test('deps mostra impacto transitivo; context lista ficheiros; index é gerado', () => {
  const d = run('deps', 'loc-farmacia');
  assert.match(d.out, /1\. char-ines via depends_on/);
  assert.match(d.out, /sc-01 via (pov|location)/);
  const c = run('context', 'sc-01');
  assert.match(c.out, /characters\/char-ines\.md/);
  assert.match(c.out, /world\/rules\.md/);
  run('index');
  const idx = fs.readFileSync(proj('editorial/canon-index.md'), 'utf8');
  assert.match(idx, /\| ev-b \| Segundo \| PROVISIONAL \|/);
  assert.match(idx, /\| char-ines \| Inês Tavares \| CANON \|/);
});

test('mentions, cliches e wc sobre o texto da cena', () => {
  edit('manuscript/scenes/sc-01.md', (s) =>
    s.replace('## Texto\n', '## Texto\nA Inês Tavares abriu a porta com um nó na garganta. Lá fora, o Rodrigues esperava.\n\nFalou com a Ines e com o Rodrigues. Viu a D. Amélia.\n'),
  );
  const m = run('mentions');
  assert.match(m.out, /char-ines\s+manuscript\/scenes\/sc-01\.md×1/); // sem alias "Inês", só o nome completo conta
  assert.match(m.out, /Rodrigues/);
  assert.match(m.out, /Inês ≈ Ines/);
  assert.match(m.out, /Amélia/, 'nome depois de "D." não é início de frase');
  const c = run('cliches').out.match(/sc-01\.md:(\d+)\s+"nó na garganta"/);
  assert.ok(c, 'cliché detetado');
  const fileLine = fs.readFileSync(proj('manuscript/scenes/sc-01.md'), 'utf8').split('\n')[Number(c[1]) - 1];
  assert.match(fileLine, /nó na garganta/, 'o número de linha refere-se ao ficheiro');
  assert.match(run('wc').out, /\b28\s+TOTAL/);
});

test('canon-diff exige registo de decisão para promoções a CANON', () => {
  const git = (...a) => spawnSync('git', ['-C', root, ...a], { encoding: 'utf8' });
  if (git('init', '-q').status !== 0) return; // git indisponível
  git('-c', 'user.email=t@t', '-c', 'user.name=t', 'add', '-A');
  git('-c', 'user.email=t@t', '-c', 'user.name=t', 'commit', '-qm', 'base');
  edit('world/loc-farmacia.md', (s) => s.replace('status: PROPOSTA', 'status: CANON'));
  let r = run('canon-diff');
  assert.equal(r.code, 1);
  assert.match(r.out, /loc-farmacia\s+PROPOSTA → CANON\s+✗ SEM REGISTO/);
  edit('editorial/decisions.md', (s) => s + '\n## hoje\n- **Ids:** loc-farmacia\n');
  r = run('canon-diff');
  assert.equal(r.code ?? 0, 0, r.out);
  assert.match(r.out, /✓ registado/);

  // char-ines já era CANON no commit base: mudar só o conteúdo também exige registo.
  edit('characters/char-ines.md', (s) => s.replace('## FEARS', '## FEARS\nAltura.'));
  r = run('canon-diff');
  assert.equal(r.code, 1);
  assert.match(r.out, /char-ines\s+CANON com conteúdo alterado\s+✗ SEM REGISTO/);
  edit('editorial/decisions.md', (s) => s.replace('**Ids:** loc-farmacia', '**Ids:** loc-farmacia, char-ines'));
  assert.equal(run('canon-diff').code ?? 0, 0, 'entrada nova com o id conta como registo');
  edit('editorial/decisions.md', (s) => s.replace('**Ids:** loc-farmacia, char-ines', '**Ids:** loc-farmacia'));
  edit('characters/char-ines.md', (s) => s.replace('updated:', 'updated: 2099-01-01 #'));
  edit('characters/char-ines.md', (s) => s.replace('## FEARS\nAltura.', '## FEARS'));
  assert.doesNotMatch(run('canon-diff').out, /char-ines/, 'mudar só `updated` não conta');
});

test('mentions cruza texto com frontmatter; index --check não escreve', () => {
  assert.match(run('mentions').out, /ausentes do frontmatter da cena:\n\s+\(nenhum\)/);
  run('add', 'character', 'char-rui', 'Rui');
  edit('manuscript/scenes/sc-01.md', (s) => s.replace('## Texto\n', '## Texto\nO Rui entrou.\n'));
  assert.match(run('mentions').out, /sc-01\.md: char-rui/);

  const idx = proj('editorial/canon-index.md');
  const before = fs.readFileSync(idx, 'utf8');
  const r = run('index', '--check');
  assert.equal(r.code, 1, 'char-rui ainda não está no índice');
  assert.equal(fs.readFileSync(idx, 'utf8'), before, '--check não escreve');
  run('index');
  assert.equal(run('index', '--check').code ?? 0, 0);
});
