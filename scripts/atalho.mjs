#!/usr/bin/env node
/**
 * atalho — cria o atalho "Rumo" (com o logótipo) que abre o painel local sem janela.
 *
 * O ícone é desenhado aqui a partir do mesmo logótipo da página (bússola: disco,
 * anel e agulha) e gravado em prototipo/rumo.ico. O atalho em si (Rumo.lnk) tem
 * caminhos deste computador, por isso não vai para o git: gera-se com este script.
 *
 * `arranque` põe o painel a arrancar sozinho quando se entra no Windows (sem abrir o navegador);
 * `sem-arranque` desfaz isso.
 *
 * Zero dependências (Node >= 18). Uso: node scripts/atalho.mjs [criar|remover|arranque|sem-arranque]
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
// O arranque com o Windows liga o painel sem abrir o navegador: fica pronto para quando o abrires.
const VBS_ARRANQUE = path.join(ROOT, 'scripts', 'arranque.vbs');
const STARTUP = path.join(process.env.APPDATA || '', 'Microsoft', 'Windows', 'Start Menu', 'Programs', 'Startup', 'Rumo.lnk');
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

const vbs = (extra = '') => [
  "' Gerado por scripts/atalho.mjs: abre o Rumo local sem mostrar nenhuma janela.",
  'Set fso = CreateObject("Scripting.FileSystemObject")',
  'raiz = fso.GetParentFolderName(fso.GetParentFolderName(WScript.ScriptFullName))',
  'Set sh = CreateObject("WScript.Shell")',
  'sh.CurrentDirectory = raiz',
  `sh.Run "cmd /c node scripts\\painel.mjs abrir${extra}", 0, False`,
  '',
].join('\r\n');
const VBS_BODY = vbs();

function createShortcut(lnk = LNK, script = VBS, descricao = 'Abrir o Rumo no navegador') {
  const ps = [
    '$sh = New-Object -ComObject WScript.Shell',
    `$lnk = $sh.CreateShortcut(${JSON.stringify(lnk)})`,
    '$lnk.TargetPath = "$env:SystemRoot\\System32\\wscript.exe"',
    `$lnk.Arguments = '"${script}"'`,
    `$lnk.WorkingDirectory = ${JSON.stringify(ROOT)}`,
    `$lnk.IconLocation = ${JSON.stringify(`${ICO},0`)}`,
    `$lnk.Description = ${JSON.stringify(descricao)}`,
    '$lnk.Save()',
  ].join('; ');
  execFileSync('powershell.exe', ['-NoProfile', '-NonInteractive', '-Command', ps], { stdio: 'pipe' });
}

// ---------------------------------------------------------------- Mac

/** ICNS com PNG por dentro (o formato que o macOS usa desde o 10.7): 128, 256, 512 e 1024 px. */
export function icns(tipos = [['ic07', 128], ['ic08', 256], ['ic09', 512], ['ic10', 1024]]) {
  const entradas = tipos.map(([tipo, s]) => {
    const data = png(s);
    const cab = Buffer.alloc(8);
    cab.write(tipo, 0, 'ascii');
    cab.writeUInt32BE(data.length + 8, 4);
    return Buffer.concat([cab, data]);
  });
  const corpo = Buffer.concat(entradas);
  const cab = Buffer.alloc(8);
  cab.write('icns', 0, 'ascii');
  cab.writeUInt32BE(corpo.length + 8, 4);
  return Buffer.concat([cab, corpo]);
}

const xml = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const sh = (s) => `'${String(s).replace(/'/g, `'\\''`)}'`;
export const MAC_LABEL = 'pt.rumo.painel';

/**
 * O que fazer no Mac, como uma lista de passos (escrever, apagar, correr), para se poder
 * verificar sem estar num Mac.
 * - `criar`: Rumo.app na pasta do projeto, com o logótipo; abre o painel sem Terminal.
 * - `arranque`: um LaunchAgent liga o painel ao entrar no Mac, sem abrir o navegador.
 * O node vai com o caminho completo: as apps e o launchd não veem o PATH do Terminal.
 */
export function planoMac(acao, { root = ROOT, home = process.env.HOME || '', node = process.execPath, uid = typeof process.getuid === 'function' ? process.getuid() : 501 } = {}) {
  const app = path.join(root, 'Rumo.app');
  const agente = path.join(home, 'Library', 'LaunchAgents', `${MAC_LABEL}.plist`);
  const painel = path.join(root, 'scripts', 'painel.mjs');
  if (acao === 'remover') return [{ remove: app }];
  if (acao === 'sem-arranque') {
    return [{ cmd: 'launchctl', args: ['bootout', `gui/${uid}`, agente], optional: true }, { remove: agente }];
  }
  if (acao === 'arranque') {
    const plist = `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>Label</key><string>${MAC_LABEL}</string>
  <key>ProgramArguments</key><array><string>${xml(node)}</string><string>${xml(painel)}</string><string>servir</string><string>--no-open</string></array>
  <key>WorkingDirectory</key><string>${xml(root)}</string>
  <key>RunAtLoad</key><true/>
  <key>StandardErrorPath</key><string>${xml(path.join(root, '.sync', 'painel-arranque.log'))}</string>
</dict>
</plist>
`;
    return [
      { cmd: 'launchctl', args: ['bootout', `gui/${uid}`, agente], optional: true },
      { write: agente, content: plist },
      { cmd: 'launchctl', args: ['bootstrap', `gui/${uid}`, agente] },
    ];
  }
  const info = `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>CFBundleName</key><string>Rumo</string>
  <key>CFBundleDisplayName</key><string>Rumo</string>
  <key>CFBundleIdentifier</key><string>${MAC_LABEL}.app</string>
  <key>CFBundleExecutable</key><string>Rumo</string>
  <key>CFBundleIconFile</key><string>rumo</string>
  <key>CFBundlePackageType</key><string>APPL</string>
  <key>CFBundleVersion</key><string>1</string>
  <key>LSUIElement</key><true/>
</dict>
</plist>
`;
  const script = [
    '#!/bin/sh',
    '# Gerado por scripts/atalho.mjs: abre o Rumo local no navegador, sem Terminal.',
    `cd ${sh(root)} && exec ${sh(node)} ${sh(painel)} abrir`,
    '',
  ].join('\n');
  return [
    { remove: app },
    { write: path.join(app, 'Contents', 'Info.plist'), content: info },
    { write: path.join(app, 'Contents', 'MacOS', 'Rumo'), content: script, mode: 0o755 },
    { write: path.join(app, 'Contents', 'Resources', 'rumo.icns'), content: icns() },
  ];
}

function executarMac(passos) {
  for (const p of passos) {
    if (p.remove) fs.rmSync(p.remove, { recursive: true, force: true });
    else if (p.write) {
      fs.mkdirSync(path.dirname(p.write), { recursive: true });
      fs.writeFileSync(p.write, p.content, p.mode ? { mode: p.mode } : undefined);
      if (p.mode) fs.chmodSync(p.write, p.mode);
    } else {
      try { execFileSync(p.cmd, p.args, { stdio: 'pipe' }); } catch (e) { if (!p.optional) throw e; }
    }
  }
}

const MENSAGENS_MAC = {
  criar: 'App "Rumo" criada na pasta do projeto (Rumo.app), com o logótipo. Arrasta-a para a Dock, para as Aplicações ou para a secretária; clica para abrir o painel.',
  remover: 'App Rumo removida.',
  arranque: 'O Rumo passa a arrancar sozinho quando entras no Mac, sem abrir o navegador. Para desfazer: npm run atalho sem-arranque',
  'sem-arranque': 'O Rumo já não arranca sozinho com o Mac.',
};

export function main(argv = process.argv.slice(2)) {
  if (process.platform === 'darwin') {
    const cmd = MENSAGENS_MAC[argv[0]] ? argv[0] : 'criar';
    executarMac(planoMac(cmd));
    console.log(MENSAGENS_MAC[cmd]);
    return;
  }
  const cmd = argv[0] || 'criar';
  if (cmd === 'sem-arranque') {
    fs.rmSync(STARTUP, { force: true });
    console.log('O Rumo já não arranca sozinho com o Windows.');
    return;
  }
  if (cmd === 'remover') {
    fs.rmSync(LNK, { force: true });
    console.log('Atalho removido.');
    return;
  }
  fs.mkdirSync(path.dirname(ICO), { recursive: true });
  fs.writeFileSync(ICO, ico());
  fs.writeFileSync(VBS, VBS_BODY);
  if (process.platform !== 'win32') {
    console.log(`Ícone gravado em ${path.relative(ROOT, ICO)}. O atalho com ícone existe no Windows e no Mac; noutros sistemas usa "npm run painel".`);
    return;
  }
  if (cmd === 'arranque') {
    fs.writeFileSync(VBS_ARRANQUE, vbs(' --no-open'));
    createShortcut(STARTUP, VBS_ARRANQUE, 'Ligar o Rumo em segundo plano');
    console.log('O Rumo passa a arrancar sozinho quando entras no Windows, sem abrir o navegador. Para desfazer: npm run atalho sem-arranque');
    return;
  }
  createShortcut();
  console.log(`Atalho "Rumo" criado na pasta do projeto (${path.relative(ROOT, LNK)}), com o logótipo. Clica duas vezes para abrir o painel.`);
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) main();
