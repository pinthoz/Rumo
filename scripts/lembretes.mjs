#!/usr/bin/env node
/**
 * lembretes — notificações do sistema e agendamento dos lembretes da área Rotina.
 *
 *   Windows: notificação toast (PowerShell, sem módulos extra) + Agendador de Tarefas (schtasks),
 *            lançado por um .vbs para não abrir janelas.
 *   macOS:   notificação via osascript + LaunchAgents (launchd).
 *   Linux:   notificação via notify-send (o agendamento fica a cargo do cron do utilizador).
 *
 * O texto de cada lembrete é gerado por `rotina.mjs lembrete <tipo>`, sem modelo de IA.
 * Opcionalmente (--vagas HH:MM), agenda também a procura diária de vagas da área Carreira
 * (`carreira.mjs procurar --notificar`). É a única tarefa agendada que usa a rede, por isso
 * nunca se instala sem ser pedida, e tem um lançador próprio para não mexer nos lembretes.
 * Zero dependências (Node >= 18). Uso: node scripts/lembretes.mjs help
 */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync, spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROTINA = path.join(HERE, 'rotina.mjs');
const CARREIRA = path.join(HERE, 'carreira.mjs');
export const KINDS = ['manha', 'tarde', 'prazo', 'semana'];
/** Tarefa agendada da área Carreira: não é um lembrete e só existe se for pedida. */
export const JOB = 'vagas';
const DEFAULTS = { manha: '09:00', tarde: '18:30', prazo: '15:00', semana: 'dom-17:00' };
const DAYS = { dom: 0, seg: 1, ter: 2, qua: 3, qui: 4, sex: 5, sab: 6 };
const WIN_DAYS = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];
const LABEL = (kind) => (kind === JOB ? 'pt.assistente.vagas' : `pt.assistente.lembrete.${kind}`);
const WIN_TASK = (kind) => (kind === JOB ? 'Assistente\\Procura de vagas' : `Assistente\\Lembrete ${kind}`);
const ALL = [...KINDS, JOB];

export class CliError extends Error {}

// ---------------------------------------------------------------- horários

export function parseWhen(kind, value) {
  const m = String(value ?? '').match(/^(?:(dom|seg|ter|qua|qui|sex|sab)-)?(\d{1,2}):(\d{2})$/);
  if (!m || Number(m[2]) > 23 || Number(m[3]) > 59 || (m[1] && kind !== 'semana')) {
    throw new CliError(`Horário inválido para "${kind}": "${value}". Usa HH:MM${kind === 'semana' ? ' ou dia-HH:MM (ex.: dom-17:00)' : ''}.`);
  }
  return { kind, hour: Number(m[2]), minute: Number(m[3]), weekday: kind === 'semana' ? DAYS[m[1] || 'dom'] : null };
}

export function scheduleFrom(flags) {
  const off = String(flags.desativar || '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
  for (const k of off) if (!KINDS.includes(k)) throw new CliError(`--desativar: tipo desconhecido "${k}" (${KINDS.join(', ')})`);
  const list = KINDS.filter((k) => !off.includes(k)).map((k) => parseWhen(k, flags[k] || DEFAULTS[k]));
  // A procura de vagas só entra quando é pedida com uma hora.
  if (flags[JOB] !== undefined) list.push(parseWhen(JOB, flags[JOB]));
  return list;
}

const hhmm = (s) => `${String(s.hour).padStart(2, '0')}:${String(s.minute).padStart(2, '0')}`;
const describeWhen = (s) => (s.weekday === null ? `todos os dias às ${hhmm(s)}` : `${Object.keys(DAYS)[s.weekday]} às ${hhmm(s)}`);

// ---------------------------------------------------------------- notificação

// Toast nativo do Windows 10/11 via WinRT; se falhar, balão da área de notificação.
// O Windows deita fora, sem erro, os toasts de aplicações que não conhece: por isso o Rumo
// regista-se primeiro como aplicação de notificações (AppUserModelId), com nome e ícone próprios.
const PS_TOAST = `
$t = $env:ASSIST_TITLE; $b = $env:ASSIST_BODY
$app = 'Rumo.Assistente'
try {
  $key = "HKCU:\\SOFTWARE\\Classes\\AppUserModelId\\$app"
  if (-not (Test-Path $key)) { New-Item -Path $key -Force | Out-Null }
  New-ItemProperty -Path $key -Name DisplayName -Value 'Rumo' -PropertyType String -Force | Out-Null
  New-ItemProperty -Path $key -Name ShowInSettings -Value 1 -PropertyType DWord -Force | Out-Null
  if ($env:ASSIST_ICON -and (Test-Path $env:ASSIST_ICON)) {
    New-ItemProperty -Path $key -Name IconUri -Value $env:ASSIST_ICON -PropertyType String -Force | Out-Null
  }
} catch { }
try {
  [Windows.UI.Notifications.ToastNotificationManager, Windows.UI.Notifications, ContentType = WindowsRuntime] | Out-Null
  [Windows.Data.Xml.Dom.XmlDocument, Windows.Data.Xml.Dom.XmlDocument, ContentType = WindowsRuntime] | Out-Null
  $esc = [System.Security.SecurityElement]
  $xml = New-Object Windows.Data.Xml.Dom.XmlDocument
  $xml.LoadXml('<toast><visual><binding template="ToastGeneric"><text>' + $esc::Escape($t) + '</text><text>' + $esc::Escape($b) + '</text></binding></visual></toast>')
  [Windows.UI.Notifications.ToastNotificationManager]::CreateToastNotifier($app).Show([Windows.UI.Notifications.ToastNotification]::new($xml))
} catch {
  Add-Type -AssemblyName System.Windows.Forms, System.Drawing
  $n = New-Object System.Windows.Forms.NotifyIcon
  $n.Icon = [System.Drawing.SystemIcons]::Information
  $n.Visible = $true
  $n.ShowBalloonTip(10000, $t, $b, 'Info')
  Start-Sleep -Seconds 10
  $n.Dispose()
}
`;

export function notifyCommand(title, body, platform = process.platform) {
  if (platform === 'win32') {
    return {
      cmd: 'powershell.exe',
      args: ['-NoProfile', '-NonInteractive', '-WindowStyle', 'Hidden', '-EncodedCommand', Buffer.from(PS_TOAST, 'utf16le').toString('base64')],
      env: { ASSIST_TITLE: title, ASSIST_BODY: body, ASSIST_ICON: path.join(HERE, '..', 'prototipo', 'rumo.ico') },
    };
  }
  if (platform === 'darwin') {
    // Texto passado como argumentos: não há problemas de aspas.
    return {
      cmd: 'osascript',
      args: ['-e', 'on run argv', '-e', 'display notification (item 2 of argv) with title (item 1 of argv)', '-e', 'end run', title, body],
      env: {},
    };
  }
  return { cmd: 'notify-send', args: [title, body], env: {} };
}

export function notify(title, body) {
  const c = notifyCommand(title, body);
  try {
    execFileSync(c.cmd, c.args, { env: { ...process.env, ...c.env }, stdio: 'ignore', windowsHide: true });
    return true;
  } catch (err) {
    console.error(`Não foi possível mostrar a notificação (${c.cmd}): ${err.message}`);
    process.exitCode = 1;
    return false;
  }
}

// ---------------------------------------------------------------- instalação

const xmlEsc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

export function plistFor(s, node = process.execPath, script = s.kind === JOB ? CARREIRA : ROTINA) {
  const when =
    `<key>Hour</key><integer>${s.hour}</integer><key>Minute</key><integer>${s.minute}</integer>` +
    (s.weekday !== null ? `<key>Weekday</key><integer>${s.weekday}</integer>` : '');
  const argv = s.kind === JOB ? [node, script, 'procurar', '--notificar'] : [node, script, 'lembrete', s.kind, '--notificar'];
  const args = argv.map((a) => `<string>${xmlEsc(a)}</string>`).join('');
  return `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>Label</key><string>${LABEL(s.kind)}</string>
  <key>ProgramArguments</key><array>${args}</array>
  <key>StartCalendarInterval</key><dict>${when}</dict>
  <key>StandardErrorPath</key><string>${xmlEsc(path.join(os.tmpdir(), 'assistente-lembretes.log'))}</string>
</dict>
</plist>
`;
}

export function vbsLauncher(node = process.execPath, script = ROTINA) {
  const q = (s) => s.replace(/"/g, '""');
  return [
    "' Gerado por scripts/lembretes.mjs: corre o lembrete sem abrir nenhuma janela.",
    'Set sh = CreateObject("WScript.Shell")',
    `sh.Run """${q(node)}"" ""${q(script)}"" lembrete " & WScript.Arguments(0) & " --notificar", 0, False`,
    '',
  ].join('\r\n');
}

/** Lançador próprio da procura de vagas: separado para não mudar o dos lembretes já instalados. */
export function vbsJobLauncher(node = process.execPath, script = CARREIRA) {
  const q = (s) => s.replace(/"/g, '""');
  return [
    "' Gerado por scripts/lembretes.mjs: procura vagas novas sem abrir nenhuma janela.",
    'Set sh = CreateObject("WScript.Shell")',
    `sh.Run """${q(node)}"" ""${q(script)}"" procurar --notificar", 0, False`,
    '',
  ].join('\r\n');
}

/** Lista de ações (sem as executar) para instalar, remover ou consultar os lembretes. */
export function plan(action, platform, schedule, env = process.env) {
  const steps = [];
  if (platform === 'win32') {
    const dir = path.join(env.LOCALAPPDATA || os.homedir(), 'Assistente');
    const vbs = path.join(dir, 'lembrete.vbs');
    const jobVbs = path.join(dir, 'vagas.vbs');
    if (action === 'instalar') {
      steps.push({ write: vbs, content: vbsLauncher() });
      // A procura de vagas vai no fim, com o seu lançador: os lembretes ficam exatamente como eram.
      const ordered = [...schedule.filter((s) => s.kind !== JOB), ...schedule.filter((s) => s.kind === JOB)];
      for (const s of ordered) {
        const when = s.weekday === null ? ['/SC', 'DAILY'] : ['/SC', 'WEEKLY', '/D', WIN_DAYS[s.weekday]];
        const isJob = s.kind === JOB;
        if (isJob) steps.push({ write: jobVbs, content: vbsJobLauncher() });
        steps.push({
          info: `${isJob ? 'procura de vagas' : s.kind}: ${describeWhen(s)}`,
          cmd: 'schtasks',
          args: ['/Create', '/F', '/TN', WIN_TASK(s.kind), '/TR', isJob ? `wscript.exe "${jobVbs}"` : `wscript.exe "${vbs}" ${s.kind}`, ...when, '/ST', hhmm(s)],
        });
      }
    } else if (action === 'remover') {
      for (const k of ALL) steps.push({ cmd: 'schtasks', args: ['/Delete', '/F', '/TN', WIN_TASK(k)], optional: true });
      steps.push({ remove: vbs });
      steps.push({ remove: jobVbs });
      steps.push({ remove: dir, ifEmpty: true });
    } else {
      for (const k of ALL) steps.push({ info: k === JOB ? 'procura de vagas' : k, cmd: 'schtasks', args: ['/Query', '/TN', WIN_TASK(k), '/FO', 'LIST'], optional: true, show: true });
    }
    return steps;
  }
  if (platform === 'darwin') {
    const dir = path.join(env.HOME || os.homedir(), 'Library', 'LaunchAgents');
    const uid = typeof process.getuid === 'function' ? process.getuid() : 501;
    const file = (k) => path.join(dir, `${LABEL(k)}.plist`);
    if (action === 'instalar') {
      for (const s of schedule) {
        steps.push({ cmd: 'launchctl', args: ['bootout', `gui/${uid}`, file(s.kind)], optional: true });
        steps.push({ write: file(s.kind), content: plistFor(s) });
        steps.push({ info: `${s.kind === JOB ? 'procura de vagas' : s.kind}: ${describeWhen(s)}`, cmd: 'launchctl', args: ['bootstrap', `gui/${uid}`, file(s.kind)] });
      }
    } else if (action === 'remover') {
      for (const k of ALL) {
        steps.push({ cmd: 'launchctl', args: ['bootout', `gui/${uid}`, file(k)], optional: true });
        steps.push({ remove: file(k) });
      }
    } else {
      for (const k of ALL) steps.push({ info: k === JOB ? 'procura de vagas' : k, cmd: 'launchctl', args: ['print', `gui/${uid}/${LABEL(k)}`], optional: true, show: false });
    }
    return steps;
  }
  throw new CliError(`Agendamento automático só para Windows e macOS. Em Linux, usa o cron: "0 9 * * * node ${ROTINA} lembrete manha --notificar".`);
}

function execute(steps, dry) {
  let failed = 0;
  for (const s of steps) {
    if (dry) {
      if (s.write) console.log(`[escrever] ${s.write}`);
      else if (s.remove) console.log(`[apagar]   ${s.remove}`);
      else console.log(`[correr]   ${s.cmd} ${s.args.map((a) => (/\s/.test(a) ? `"${a}"` : a)).join(' ')}`);
      continue;
    }
    if (s.write) {
      fs.mkdirSync(path.dirname(s.write), { recursive: true });
      fs.writeFileSync(s.write, s.content);
      continue;
    }
    if (s.remove) {
      if (!s.ifEmpty) fs.rmSync(s.remove, { force: true });
      else if (fs.existsSync(s.remove) && !fs.readdirSync(s.remove).length) fs.rmdirSync(s.remove);
      continue;
    }
    try {
      const out = execFileSync(s.cmd, s.args, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'], windowsHide: true });
      if (s.info) console.log(`  ✓ ${s.info}`);
      if (s.show) console.log(out.split(/\r?\n/).filter((l) => /Next Run Time|Próxima|Status|Estado/i.test(l)).map((l) => `      ${l.trim()}`).join('\n'));
    } catch (err) {
      if (s.optional) {
        if (s.info) console.log(`  – ${s.info}: não instalado`);
        continue;
      }
      failed++;
      console.error(`  ✗ ${s.info || s.cmd}: ${(err.stderr || err.message).toString().trim()}`);
    }
  }
  if (failed) process.exitCode = 1;
}

// ---------------------------------------------------------------- temporizador

export function parseMinutes(value) {
  const n = Number(String(value ?? '').replace(',', '.'));
  if (!Number.isFinite(n) || n <= 0 || n > 180) throw new CliError(`Minutos inválidos: "${value}" (maior que 0 e até 180).`);
  return n;
}

/** Lança um processo em segundo plano que mostra a notificação daqui a N minutos. */
function startTimer(minutes, message, dry) {
  const args = [fileURLToPath(import.meta.url), '_esperar', String(Math.round(minutes * 60000)), 'Assistente', message];
  if (dry) return console.log(`[temporizador] ${minutes} min → "${message}"`);
  const child = spawn(process.execPath, args, { detached: true, stdio: 'ignore', windowsHide: true });
  child.unref();
  const end = new Date(Date.now() + minutes * 60000);
  console.log(`Temporizador: ${minutes} min (até às ${String(end.getHours()).padStart(2, '0')}:${String(end.getMinutes()).padStart(2, '0')}). Aviso: "${message}"`);
}

// ---------------------------------------------------------------- CLI

function cmdHelp() {
  console.log(`lembretes — node scripts/lembretes.mjs <comando>

  testar                      mostra já uma notificação de teste
  temporizador <min> ["texto"]  notificação daqui a N minutos (blocos de foco; por omissão "Pausa de 5 minutos")
  instalar [opções]           agenda os lembretes (Windows: Agendador de Tarefas · macOS: launchd)
  remover                     apaga todos os lembretes agendados
  estado                      mostra que lembretes estão instalados

Opções de instalar (horários por omissão entre parênteses):
  --manha HH:MM    (09:00)   as 3 prioridades do dia
  --tarde HH:MM    (18:30)   fecho do dia: /feito
  --prazo HH:MM    (15:00)   só avisa se houver tarefas com prazo hoje por fazer
  --semana dia-HH:MM (dom-17:00)  revisão semanal (dias: dom seg ter qua qui sex sab)
  --desativar prazo,semana   não instala esses lembretes
  --vagas HH:MM              também procura vagas novas todos os dias (área Carreira; usa a rede,
                             por isso só se instala com esta opção)
  --dry                      mostra o que faria, sem mudar nada

Para ver o texto de um lembrete sem notificação: node scripts/rotina.mjs lembrete manha`);
}

export function main(argv) {
  const [cmd = 'help', ...rest] = argv;
  if (cmd === '_esperar') {
    // Processo interno do temporizador: espera e notifica.
    const [ms, title, body] = rest;
    setTimeout(() => notify(title, body), Number(ms));
    return;
  }
  const flags = {};
  const positional = [];
  for (let i = 0; i < rest.length; i++) {
    const a = rest[i];
    if (['--help', '-h'].includes(a)) return cmdHelp();
    if (a === '--dry') flags.dry = true;
    else if (a.startsWith('--')) flags[a.slice(2)] = rest[++i];
    else positional.push(a);
  }
  if (positional.length && cmd !== 'temporizador') {
    console.error(`Argumento inesperado: ${positional[0]}`);
    process.exitCode = 2;
    return;
  }
  const platform = flags.plataforma || process.platform;
  try {
    if (cmd === 'help') return cmdHelp();
    if (cmd === 'testar') {
      if (notify('Assistente', 'Se estás a ler isto, as notificações funcionam.')) console.log('Notificação enviada.');
      return;
    }
    if (cmd === 'temporizador') {
      const [min, ...text] = positional;
      return startTimer(parseMinutes(min), text.join(' ').trim() || 'Pausa de 5 minutos. Depois: /foco ou /feito.', flags.dry);
    }
    if (!['instalar', 'remover', 'estado'].includes(cmd)) throw new CliError(`Comando desconhecido: ${cmd}`);
    const schedule = cmd === 'instalar' ? scheduleFrom(flags) : [];
    const steps = plan(cmd, platform, schedule);
    if (cmd === 'instalar') console.log(`A instalar ${schedule.length} lembrete(s) (${platform === 'win32' ? 'Windows' : 'macOS'}):`);
    if (cmd === 'estado') console.log('Lembretes:');
    execute(steps, flags.dry);
    if (cmd === 'instalar' && !flags.dry && !process.exitCode) {
      console.log('\nFeito. Experimenta já: node scripts/lembretes.mjs testar');
      if (platform === 'darwin') {
        console.log('No Mac, se a notificação não aparecer: Definições do Sistema → Notificações → permitir notificações para o Editor de Scripts (o nome pode variar com a versão do macOS).');
      }
    }
    if (cmd === 'remover' && !flags.dry) console.log('Lembretes removidos.');
  } catch (err) {
    if (!(err instanceof CliError)) throw err;
    console.error(`lembretes: ${err.message}`);
    process.exitCode = 2;
  }
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) main(process.argv.slice(2));
