#!/usr/bin/env node
/**
 * atalho — cria o atalho "Rumo" (com o logótipo) que abre o painel local sem janela.
 *
 * O ícone é desenhado aqui a partir do mesmo logótipo da página (bússola: disco,
 * anel e agulha) e gravado em prototipo/rumo.ico. O atalho em si (Rumo.lnk) tem
 * caminhos deste computador, por isso não vai para o git: gera-se com este script.
 *
 * Zero dependências (Node >= 18). Uso: node scripts/atalho.mjs [criar|remover]
 */
import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(process.env.ASSISTENTE_ROOT || path.join(path.dirname(fileURLToPath(import.meta.url)), '..'));
const ICO = path.join(ROOT, 'prototipo', 'rumo.ico');
const LNK = path.join(ROOT, 'Rumo.lnk');
const VBS = path.join(ROOT, 'scripts', 'abrir.vbs');
const SIZES = [256, 128, 64, 48, 32, 16];

// Cores do painel: fundo escuro da marca, anel claro e agulha no laranja do Rumo.
const INK = [22, 48, 43, 255];
const RING = [211, 220, 217, 255];
const ACCENT = [200, 111, 18, 255];
const DOT = [255, 255, 255, 255];

const CRC = (() => {
  const table = new Int32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    table[n] = c;
  }
  return (buf) => {
    let c = -1;
    for (const b of buf) c = table[(c ^ b) & 0xff] ^ (c >>> 8);
    return (c ^ -1) >>> 0;
  };
})();

function chunk(type, data) {
  const out = Buffer.alloc(8 + data.length + 4);
  out.writeUInt32BE(data.length, 0);
  out.write(type, 4, 'ascii');
  data.copy(out, 8);
  out.writeUInt32BE(CRC(out.subarray(4, 8 + data.length)), 8 + data.length);
  return out;
}

/** Desenha o logótipo em RGBA, com 4×4 amostras por pixel para as curvas não ficarem serrilhadas. */
export function drawLogo(size) {
  const px = Buffer.alloc(size * size * 4);
  const c = size / 2;
  const S = 4;
  const shade = (x, y) => {
    const dx = x - c;
    const dy = y - c;
    const d = Math.hypot(dx, dy);
    if (d > size * 0.48) return null;                                  // fora do disco
    if (d < size * 0.055) return DOT;                                  // centro
    // Agulha: losango alto (as proporções do logótipo da página: 3,5 de largura por 10 de altura).
    if (Math.abs(dx) / (size * 0.11) + Math.abs(dy) / (size * 0.3125) <= 1) return ACCENT;
    if (d > size * 0.40 && d < size * 0.455) return RING;              // anel
    return INK;
  };
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const acc = [0, 0, 0, 0];
      for (let sy = 0; sy < S; sy++) {
        for (let sx = 0; sx < S; sx++) {
          const col = shade(x + (sx + 0.5) / S, y + (sy + 0.5) / S) || [0, 0, 0, 0];
          for (let i = 0; i < 4; i++) acc[i] += col[i];
        }
      }
      const at = (y * size + x) * 4;
      for (let i = 0; i < 4; i++) px[at + i] = Math.round(acc[i] / (S * S));
    }
  }
  return px;
}

export function png(size) {
  const px = drawLogo(size);
  const raw = Buffer.alloc((size * 4 + 1) * size);
  for (let y = 0; y < size; y++) {
    raw[y * (size * 4 + 1)] = 0; // filtro "none"
    px.copy(raw, y * (size * 4 + 1) + 1, y * size * 4, (y + 1) * size * 4);
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8;   // bits por canal
  ihdr[9] = 6;   // RGBA
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', zlib.deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

/** ICO com um PNG por tamanho (suportado no Windows desde o Vista). */
export function ico(sizes = SIZES) {
  const images = sizes.map((s) => ({ s, data: png(s) }));
  const header = Buffer.alloc(6 + images.length * 16);
  header.writeUInt16LE(0, 0);
  header.writeUInt16LE(1, 2);
  header.writeUInt16LE(images.length, 4);
  let offset = header.length;
  images.forEach((img, i) => {
    const at = 6 + i * 16;
    header[at] = img.s >= 256 ? 0 : img.s;
    header[at + 1] = img.s >= 256 ? 0 : img.s;
    header.writeUInt16LE(1, at + 4);      // planos
    header.writeUInt16LE(32, at + 6);     // bits por pixel
    header.writeUInt32LE(img.data.length, at + 8);
    header.writeUInt32LE(offset, at + 12);
    offset += img.data.length;
  });
  return Buffer.concat([header, ...images.map((x) => x.data)]);
}

const VBS_BODY = [
  "' Gerado por scripts/atalho.mjs: abre o Rumo local sem mostrar nenhuma janela.",
  'Set fso = CreateObject("Scripting.FileSystemObject")',
  'raiz = fso.GetParentFolderName(fso.GetParentFolderName(WScript.ScriptFullName))',
  'Set sh = CreateObject("WScript.Shell")',
  'sh.CurrentDirectory = raiz',
  'sh.Run "cmd /c node scripts\\painel.mjs abrir", 0, False',
  '',
].join('\r\n');

function createShortcut() {
  const ps = [
    '$sh = New-Object -ComObject WScript.Shell',
    `$lnk = $sh.CreateShortcut(${JSON.stringify(LNK)})`,
    '$lnk.TargetPath = "$env:SystemRoot\\System32\\wscript.exe"',
    `$lnk.Arguments = '"${VBS}"'`,
    `$lnk.WorkingDirectory = ${JSON.stringify(ROOT)}`,
    `$lnk.IconLocation = ${JSON.stringify(`${ICO},0`)}`,
    '$lnk.Description = "Abrir o Rumo no navegador"',
    '$lnk.Save()',
  ].join('; ');
  execFileSync('powershell.exe', ['-NoProfile', '-NonInteractive', '-Command', ps], { stdio: 'pipe' });
}

export function main(argv = process.argv.slice(2)) {
  const cmd = argv[0] || 'criar';
  if (cmd === 'remover') {
    fs.rmSync(LNK, { force: true });
    console.log('Atalho removido.');
    return;
  }
  fs.mkdirSync(path.dirname(ICO), { recursive: true });
  fs.writeFileSync(ICO, ico());
  fs.writeFileSync(VBS, VBS_BODY);
  if (process.platform !== 'win32') {
    console.log(`Ícone gravado em ${path.relative(ROOT, ICO)}. O atalho com ícone só existe no Windows; noutros sistemas usa "npm run painel".`);
    return;
  }
  createShortcut();
  console.log(`Atalho "Rumo" criado na pasta do projeto (${path.relative(ROOT, LNK)}), com o logótipo. Clica duas vezes para abrir o painel.`);
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) main();
