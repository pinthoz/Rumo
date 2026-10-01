// Testes do ícone e do atalho do Rumo. Executar: npm test
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { drawLogo, png, ico, icns, planoMac, MAC_LABEL } from './atalho.mjs';

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

test('icns (Mac): cabeçalho, tamanho total e um PNG por entrada', () => {
  const buf = icns([['ic07', 128], ['ic08', 256]]);
  assert.equal(buf.toString('ascii', 0, 4), 'icns');
  assert.equal(buf.readUInt32BE(4), buf.length, 'o tamanho declarado é o do ficheiro');
  let at = 8;
  for (const tipo of ['ic07', 'ic08']) {
    assert.equal(buf.toString('ascii', at, at + 4), tipo);
    assert.equal(buf[at + 8], 0x89, 'cada entrada é um PNG');
    at += buf.readUInt32BE(at + 4);
  }
  assert.equal(at, buf.length, 'as entradas ocupam o ficheiro todo');
});

test('Mac: a app abre o painel com o node e o caminho completos', () => {
  const passos = planoMac('criar', { root: '/Users/ana/Rumo', home: '/Users/ana', node: '/opt/homebrew/bin/node', uid: 501 });
  const script = passos.find((p) => /[\\/]MacOS[\\/]Rumo$/.test(p.write || ''));
  assert.equal(script.mode, 0o755, 'executável');
  assert.match(script.content, /^#!\/bin\/sh/);
  assert.match(script.content, /'\/opt\/homebrew\/bin\/node' '[^']*painel\.mjs' abrir/);
  const info = passos.find((p) => /Info\.plist$/.test(p.write || ''));
  assert.match(info.content, /<key>CFBundleExecutable<\/key><string>Rumo<\/string>/);
  assert.match(info.content, /<key>CFBundleIconFile<\/key><string>rumo<\/string>/);
  assert.ok(passos.some((p) => /rumo\.icns$/.test(p.write || '')), 'leva o ícone');
});

test('Mac: o arranque usa um LaunchAgent que liga o painel sem abrir o navegador', () => {
  const passos = planoMac('arranque', { root: '/Users/ana/Rumo', home: '/Users/ana', node: '/usr/local/bin/node', uid: 501 });
  const plist = passos.find((p) => p.write);
  assert.match(plist.write.replace(/\\/g, '/'), /\/Users\/ana\/Library\/LaunchAgents\/pt\.rumo\.painel\.plist$/);
  assert.match(plist.content, new RegExp(`<string>${MAC_LABEL}</string>`));
  assert.match(plist.content, /<string>servir<\/string><string>--no-open<\/string>/);
  assert.match(plist.content, /<key>RunAtLoad<\/key><true\/>/);
  assert.deepEqual(passos.at(-1), { cmd: 'launchctl', args: ['bootstrap', 'gui/501', plist.write] });
  const desfazer = planoMac('sem-arranque', { root: '/Users/ana/Rumo', home: '/Users/ana', uid: 501 });
  assert.ok(desfazer.some((p) => p.remove === plist.write), 'sem-arranque apaga o mesmo ficheiro');
});
