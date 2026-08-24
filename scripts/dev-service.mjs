import { closeSync, existsSync, mkdirSync, openSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { execFileSync, spawn } from 'node:child_process';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const runDirectory = path.join(projectRoot, '.run');
const pidPath = path.join(runDirectory, 'dev-server.pid');
const logPath = path.join(runDirectory, 'dev-server.log');
const nextBin = path.join(projectRoot, 'node_modules', 'next', 'dist', 'bin', 'next');

function readPid() {
  if (!existsSync(pidPath)) return null;
  const pid = Number.parseInt(readFileSync(pidPath, 'utf8').trim(), 10);
  return Number.isInteger(pid) && pid > 0 ? pid : null;
}

function isRunning(pid) {
  if (!pid) return false;
  try {
    process.kill(pid, 0);
    return true;
  } catch {
    return false;
  }
}

function findListenerPid() {
  try {
    const output = execFileSync('lsof', ['-t', '-iTCP:8088', '-sTCP:LISTEN'], {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
    });
    const pid = Number.parseInt(output.trim().split(/\s+/)[0], 10);
    return Number.isInteger(pid) && pid > 0 ? pid : null;
  } catch {
    return null;
  }
}

function cleanStalePid() {
  // `next dev` may replace its launcher with a child server process. The port
  // listener is therefore a more reliable source of truth than the saved PID.
  const listenerPid = findListenerPid();
  if (listenerPid) {
    mkdirSync(runDirectory, { recursive: true });
    writeFileSync(pidPath, `${listenerPid}\n`);
    return listenerPid;
  }

  const pid = readPid();
  if (pid && isRunning(pid)) return pid;
  rmSync(pidPath, { force: true });
  return null;
}

function start() {
  mkdirSync(runDirectory, { recursive: true });
  const existingPid = cleanStalePid();
  if (existingPid) {
    console.log(`HTML Publish is already running (PID ${existingPid}).`);
    return;
  }

  const logFd = openSync(logPath, 'a');
  const child = spawn(process.execPath, [nextBin, 'dev', '--webpack', '-p', '8088'], {
    cwd: projectRoot,
    detached: true,
    env: process.env,
    stdio: ['ignore', logFd, logFd],
  });

  child.unref();
  closeSync(logFd);
  writeFileSync(pidPath, `${child.pid}\n`);
  console.log(`HTML Publish started on http://localhost:8088 (PID ${child.pid}).`);
  console.log(`Log: ${logPath}`);
}

function stop() {
  const pid = cleanStalePid();
  if (!pid) {
    console.log('HTML Publish is not running.');
    return;
  }

  try {
    process.kill(-pid, 'SIGTERM');
  } catch {
    process.kill(pid, 'SIGTERM');
  }
  rmSync(pidPath, { force: true });
  console.log(`HTML Publish stopped (PID ${pid}).`);
}

function status() {
  const pid = cleanStalePid();
  if (!pid) {
    console.log('HTML Publish is stopped.');
    process.exitCode = 1;
    return;
  }
  console.log(`HTML Publish is running on http://localhost:8088 (PID ${pid}).`);
  console.log(`Log: ${logPath}`);
}

const command = process.argv[2];
if (command === 'start') start();
else if (command === 'stop') stop();
else if (command === 'status') status();
else {
  console.error('Usage: node scripts/dev-service.mjs <start|stop|status>');
  process.exitCode = 1;
}
