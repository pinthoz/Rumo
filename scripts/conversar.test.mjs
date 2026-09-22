// O formatador das respostas do Claude no separador Conversar (dentro de prototipo/rumo.html).
// O painel não tem navegador nos testes: monta-se aqui um DOM mínimo e corre-se a função real.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const html = fs.readFileSync(path.join(root, 'prototipo', 'rumo.html'), 'utf8');
const script = fs.readFileSync(path.join(root, 'prototipo', 'rumo.js'), 'utf8');
const bloco = script.slice(script.indexOf('const linkSeguro'), script.indexOf('// ---------- conversas guardadas'));

function criar(tag) {
  return {
    tag,
    atributos: {},
    childNodes: [],
    set textContent(v) { this.childNodes = [String(v)]; },
    get textContent() { return this.childNodes.map((f) => (typeof f === 'string' ? f : f.textContent)).join(''); },
    append(...xs) { this.childNodes.push(...xs.filter((x) => x != null && x !== false)); },
    replaceChildren(...xs) { this.childNodes = xs.filter((x) => x != null && x !== false); },
  };
}
const h = (tag, attrs = {}, ...kids) => {
  const el = criar(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (k === 'text') el.textContent = v;
    else el.atributos[k] = v;
  }
  el.append(...kids.flat());
  return el;
};
const { formatar, linkSeguro } = new Function('h', 'URL', `${bloco}; return { formatar, linkSeguro };`)(h, URL);
/** Todas as etiquetas usadas, por ordem, para comparar com o esperado. */
const etiquetas = (el) => el.childNodes.flatMap((f) => (typeof f === 'string' ? [] : [f.tag, ...etiquetas(f)]));
const procurar = (el, tag) => el.childNodes.flatMap((f) => (typeof f === 'string' ? [] : [...(f.tag === tag ? [f] : []), ...procurar(f, tag)]));

test('conversar: títulos, listas e parágrafos saem com a etiqueta certa', () => {
  const caixa = criar('div');
  formatar(['## Resumo', '', 'Primeiro parágrafo.', '', '- um', '- dois', '', '1. passo um', '2. passo dois'].join('\n'), caixa);
  assert.deepEqual(etiquetas(caixa), ['h3', 'p', 'ul', 'li', 'li', 'ol', 'li', 'li']);
  assert.equal(procurar(caixa, 'li')[0].textContent, 'um');
  assert.match(caixa.textContent, /Primeiro parágrafo\./);
});

test('conversar: negrito, itálico e código dentro da linha', () => {
  const caixa = criar('div');
  formatar('Gastaste **120 €** em *restaurantes*, corre `npm test`.', caixa);
  assert.deepEqual(etiquetas(caixa), ['p', 'strong', 'em', 'code']);
  assert.equal(procurar(caixa, 'strong')[0].textContent, '120 €');
  assert.equal(procurar(caixa, 'code')[0].textContent, 'npm test');
  // O texto à volta não se perde.
  assert.match(caixa.textContent, /^Gastaste .* em .*, corre .*\.$/);
});

test('conversar: blocos de código ficam intactos', () => {
  const caixa = criar('div');
  formatar(['Faz assim:', '', '```', 'node scripts/financas.mjs resumo', '```'].join('\n'), caixa);
  assert.deepEqual(etiquetas(caixa), ['p', 'pre', 'code']);
  assert.equal(procurar(caixa, 'code')[0].textContent, 'node scripts/financas.mjs resumo');
});

test('conversar: só passam ligações https', () => {
  assert.equal(linkSeguro('https://exemplo.pt'), 'https://exemplo.pt/');
  assert.equal(linkSeguro('http://exemplo.pt'), '');
  assert.equal(linkSeguro('javascript:alert(1)'), '');
  const caixa = criar('div');
  formatar('Vê em [seguro](https://clientebancario.bportugal.pt) e em [mau](javascript:alert(1)).', caixa);
  const ligacoes = procurar(caixa, 'a');
  assert.equal(ligacoes.length, 1, 'a ligação perigosa não vira link');
  assert.equal(ligacoes[0].atributos.rel, 'noopener noreferrer');
  assert.match(caixa.textContent, /mau/, 'mas o texto dela continua visível');
});

test('conversar: texto simples nunca desaparece', () => {
  const caixa = criar('div');
  formatar('Uma frase normal, sem nada de especial.', caixa);
  assert.equal(caixa.textContent, 'Uma frase normal, sem nada de especial.');
  const vazio = criar('div');
  formatar('', vazio);
  assert.equal(vazio.childNodes.length, 1, 'uma resposta vazia não rebenta o desenho');
});
