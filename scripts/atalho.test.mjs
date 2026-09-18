// Testes do ícone e do atalho do Rumo. Executar: npm test
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { drawLogo, png, ico } from './atalho.mjs';

test('logótipo: disco, agulha laranja e ponto branco ao centro', () => {
  const size = 64;
  const px = drawLogo(size);
  const at = (x, y) => [...px.subarray((y * size + x) * 4, (y * size + x) * 4 + 4)];
  assert.deepEqual(at(0, 0), [0, 0, 0, 0], 'os cantos ficam transparentes');
  const centro = at(size / 2, size / 2);
  assert.ok(centro[0] > 200 && centro[1] > 200 && centro[2] > 200, 'o centro é claro');
  const agulha = at(size / 2, size / 2 - 10);
  assert.ok(agulha[0] > agulha[2] && agulha[0] > 120, 'a agulha é laranja');
  assert.equal(at(size / 2, 4)[3], 255, 'o disco chega perto do topo');
});

test('png: assinatura e dimensões corretas', () => {
  const buf = png(32);
  assert.deepEqual([...buf.subarray(0, 8)], [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  assert.equal(buf.readUInt32BE(16), 32);
  assert.equal(buf.readUInt32BE(20), 32);
});

test('ico: uma entrada por tamanho, com deslocamentos que batem certo', () => {
  const buf = ico([32, 16]);
  assert.equal(buf.readUInt16LE(2), 1, 'tipo ícone');
  assert.equal(buf.readUInt16LE(4), 2, 'duas imagens');
  for (const i of [0, 1]) {
    const at = 6 + i * 16;
    const size = buf.readUInt32LE(at + 8);
    const off = buf.readUInt32LE(at + 12);
    assert.equal(buf[at], [32, 16][i]);
    assert.ok(off + size <= buf.length, 'a imagem cabe no ficheiro');
    assert.equal(buf[off], 0x89, 'cada entrada é um PNG');
  }
});
