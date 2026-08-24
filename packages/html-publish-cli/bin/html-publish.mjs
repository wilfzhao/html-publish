#!/usr/bin/env node

import { createHash, randomUUID } from 'node:crypto';
import { createWriteStream } from 'node:fs';
import { chmod, mkdir, mkdtemp, readFile, readdir, rm, stat, writeFile } from 'node:fs/promises';
import { homedir, tmpdir } from 'node:os';
import path from 'node:path';
import process from 'node:process';
import { execSync, spawn } from 'node:child_process';
import archiver from 'archiver';

const CLI_VERSION = '0.1.7';
const CONFIG_NAME = '.html-publish.json';
const DEFAULT_SERVER = process.env.HTML_PUBLISH_SERVER || 'http://localhost:8088';
const IGNORE = ['.git/**', 'node_modules/**', '.next/**', '.env', '.env.*', '*.pem', '*.key', CONFIG_NAME];

function usage() {
  console.log(`HTML Publish CLI ${CLI_VERSION}

Usage:
  html-publish login [--server URL]
  html-publish whoami
  html-publish projects [query]
  html-publish link --project ID_OR_NAME [--server URL]
  html-publish inspect
  html-publish deploy [--version VERSION] [--note TEXT] [--skip-build]
  html-publish status DEPLOYMENT_ID

Environment:
  HTML_PUBLISH_SERVER  Override the server URL
  HTML_PUBLISH_TOKEN   Use a token without storing it`);
}

function parseArgs(argv) {
  const positional = [];
  const flags = {};
  for (let i = 0; i < argv.length; i += 1) {
    const item = argv[i];
    if (!item.startsWith('--')) {
      positional.push(item);
      continue;
    }
    const [name, inline] = item.slice(2).split('=', 2);
    if (inline !== undefined) flags[name] = inline;
    else if (argv[i + 1] && !argv[i + 1].startsWith('--')) flags[name] = argv[++i];
    else flags[name] = true;
  }
  return { positional, flags };
}

function credentialPath() {
  const base = process.env.XDG_CONFIG_HOME || path.join(homedir(), '.config');
  return path.join(base, 'html-publish', 'credentials.json');
}

function normalizeServer(value) {
  return String(value || DEFAULT_SERVER).replace(/\/+$/, '');
}

async function readStoredCredentials() {
  try {
    const stored = JSON.parse(await readFile(credentialPath(), 'utf8'));
    if (stored?.schemaVersion === 2 && Array.isArray(stored.credentials)) return stored.credentials;
    return stored?.token ? [stored] : [];
  } catch {
    return [];
  }
}

async function readEnvironmentCredentials() {
  if (process.env.HTML_PUBLISH_TOKEN) {
    return { server: normalizeServer(process.env.HTML_PUBLISH_SERVER), token: process.env.HTML_PUBLISH_TOKEN };
  }
  return null;
}

async function saveCredentials(credentials) {
  const target = credentialPath();
  const existing = await readStoredCredentials();
  const credentialKey = credentials.project?.id || credentials.token;
  const retained = existing.filter((item) => {
    if (normalizeServer(item.server) !== normalizeServer(credentials.server)) return true;
    return (item.project?.id || item.token) !== credentialKey;
  });
  await mkdir(path.dirname(target), { recursive: true });
  await writeFile(target, `${JSON.stringify({
    schemaVersion: 2,
    credentials: [credentials, ...retained],
  }, null, 2)}\n`, { mode: 0o600 });
  await chmod(target, 0o600);
}

function openBrowser(url) {
  try {
    const command = process.platform === 'darwin' ? 'open' : process.platform === 'win32' ? 'cmd' : 'xdg-open';
    const args = process.platform === 'win32' ? ['/c', 'start', '', url] : [url];
    const child = spawn(command, args, { detached: true, stdio: 'ignore' });
    child.unref();
    return true;
  } catch {
    return false;
  }
}

async function deviceLogin(server, projectHint) {
  const response = await fetch(`${server}/api/v1/auth/device`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ clientName: `HTML Publish CLI ${CLI_VERSION}`, project: projectHint || undefined }),
  });
  if (!response.ok) throw new Error(`Unable to start browser authorization: ${response.statusText}`);
  const authorization = await response.json();
  console.log(`\nApprove publishing in your browser:\n${authorization.verificationUri}\n`);
  console.log(`Code: ${authorization.userCode}`);
  const browserOpened = process.env.HTML_PUBLISH_NO_BROWSER
    ? false
    : openBrowser(authorization.verificationUri);
  if (!browserOpened) console.log('Open the URL above manually.');
  console.log('Waiting for approval...');

  const expiresAt = new Date(authorization.expiresAt).getTime();
  const interval = Math.max(Number(authorization.interval) || 2, 1) * 1000;
  while (Date.now() < expiresAt) {
    await new Promise((resolve) => setTimeout(resolve, interval));
    const tokenResponse = await fetch(`${server}/api/v1/auth/device/token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ deviceCode: authorization.deviceCode }),
    });
    const data = await tokenResponse.json().catch(() => ({}));
    if (tokenResponse.ok) {
      const credentials = { server, token: data.token, project: data.project };
      await saveCredentials(credentials);
      console.log(`Connected to ${data.project.name}.`);
      return credentials;
    }
    if (data?.error?.code !== 'AUTHORIZATION_PENDING') {
      throw new Error(data?.error?.message || 'Browser authorization failed.');
    }
  }
  throw new Error('Browser authorization expired. Run the command again.');
}

async function ensureCredentials(serverOverride, projectHint) {
  const environmentCredentials = await readEnvironmentCredentials();
  if (environmentCredentials) return environmentCredentials;

  const stored = await readStoredCredentials();
  const server = normalizeServer(serverOverride);
  const normalizedHint = String(projectHint || '').trim().toLowerCase();
  const current = stored.find((item) => {
    if (!item?.token || normalizeServer(item.server) !== server) return false;
    if (!normalizedHint) return true;
    if (!item.project) return false;
    return item.project.id?.toLowerCase() === normalizedHint
      || item.project.slug?.toLowerCase() === normalizedHint
      || item.project.name?.trim().toLowerCase() === normalizedHint;
  });
  if (current) return { ...current, server };
  return deviceLogin(server, projectHint);
}

async function api(credentials, pathname, options = {}) {
  const response = await fetch(`${credentials.server}${pathname}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${credentials.token}`,
      ...(options.headers || {}),
    },
  });
  const data = await response.json().catch(() => ({ error: { message: response.statusText } }));
  if (!response.ok) {
    const detail = data?.error?.message || data?.error || response.statusText;
    const code = data?.error?.code ? `${data.error.code}: ` : '';
    throw new Error(`${code}${detail}`);
  }
  return data;
}

async function findProjectConfig(start = process.cwd()) {
  let directory = path.resolve(start);
  while (true) {
    const candidate = path.join(directory, CONFIG_NAME);
    try {
      return { path: candidate, directory, config: JSON.parse(await readFile(candidate, 'utf8')) };
    } catch (error) {
      if (error?.code !== 'ENOENT') throw new Error(`Cannot read ${candidate}: ${error.message}`);
    }
    const parent = path.dirname(directory);
    if (parent === directory) return null;
    directory = parent;
  }
}

async function listProjects(credentials, query = '') {
  const suffix = query ? `?query=${encodeURIComponent(query)}` : '';
  return api(credentials, `/api/v1/projects${suffix}`);
}

async function detectOutput(projectRoot, config) {
  if (config.outputDirectory) return path.resolve(projectRoot, config.outputDirectory);
  for (const candidate of ['dist', 'build', 'out']) {
    const absolute = path.join(projectRoot, candidate);
    try {
      if ((await stat(absolute)).isDirectory()) return absolute;
    } catch {}
  }
  return projectRoot;
}

async function countFiles(directory) {
  let count = 0;
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    if (['.git', 'node_modules', '.next'].includes(entry.name) || entry.name === CONFIG_NAME || entry.name.startsWith('.env')) continue;
    if (entry.isDirectory()) count += await countFiles(path.join(directory, entry.name));
    else if (entry.isFile()) count += 1;
  }
  return count;
}

async function zipDirectory(directory) {
  const tempDirectory = await mkdtemp(path.join(tmpdir(), 'html-publish-'));
  const target = path.join(tempDirectory, 'artifact.zip');
  await new Promise((resolve, reject) => {
    const output = createWriteStream(target);
    const archive = archiver('zip', { zlib: { level: 9 } });
    output.on('close', resolve);
    output.on('error', reject);
    archive.on('error', reject);
    archive.pipe(output);
    archive.glob('**/*', { cwd: directory, dot: true, ignore: IGNORE });
    archive.finalize();
  });
  return { target, cleanup: () => rm(tempDirectory, { recursive: true, force: true }) };
}

function gitValue(projectRoot, command) {
  try {
    return execSync(command, { cwd: projectRoot, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim();
  } catch {
    return '';
  }
}

async function inspect(configRecord) {
  if (!configRecord) throw new Error(`No ${CONFIG_NAME} found. Run \`html-publish link --project ...\` first.`);
  const outputDirectory = await detectOutput(configRecord.directory, configRecord.config);
  const entryFile = configRecord.config.entryFile || 'index.html';
  const entryPath = path.join(outputDirectory, entryFile);
  const entry = await stat(entryPath).catch(() => null);
  if (!entry?.isFile()) throw new Error(`Entry file not found: ${entryPath}`);
  return {
    projectId: configRecord.config.projectId,
    projectSlug: configRecord.config.projectSlug,
    projectRoot: configRecord.directory,
    outputDirectory,
    entryFile,
    fileCount: await countFiles(outputDirectory),
    buildCommand: configRecord.config.buildCommand || null,
  };
}

async function commandLogin(flags) {
  const server = normalizeServer(flags.server);
  const token = flags.token || process.env.HTML_PUBLISH_TOKEN;
  if (token) {
    if (!String(token).startsWith('hp_')) throw new Error('Invalid token format. Expected a token beginning with hp_.');
    const credentials = { server, token };
    const projects = await listProjects(credentials);
    await saveCredentials(credentials);
    console.log(`Connected to ${projects.items[0]?.name || 'project'}.`);
    return credentials;
  }
  return deviceLogin(server);
}

async function commandLink(flags) {
  const query = flags.project;
  if (!query || query === true) throw new Error('Pass --project with a project ID, slug, or name.');
  let credentials = await ensureCredentials(flags.server, String(query));
  let result;
  try {
    result = await listProjects(credentials, String(query));
  } catch {
    credentials = await deviceLogin(credentials.server, String(query));
    result = await listProjects(credentials, String(query));
  }
  if (result.items.length === 0) {
    credentials = await deviceLogin(credentials.server, String(query));
    result = await listProjects(credentials, String(query));
  }
  if (result.items.length === 0) throw new Error(`No accessible project matched "${query}".`);
  if (result.items.length > 1) throw new Error(`Multiple projects matched "${query}". Use the exact ID or slug.`);
  const project = result.items[0];
  let buildCommand;
  try {
    const packageJson = JSON.parse(await readFile(path.join(process.cwd(), 'package.json'), 'utf8'));
    if (packageJson?.scripts?.build) buildCommand = 'npm run build';
  } catch {}
  const config = {
    schemaVersion: 1,
    server: credentials.server,
    projectId: project.id,
    projectSlug: project.slug,
    entryFile: 'index.html',
    ...(buildCommand ? { buildCommand } : {}),
  };
  await writeFile(path.join(process.cwd(), CONFIG_NAME), `${JSON.stringify(config, null, 2)}\n`);
  console.log(`Linked ${process.cwd()} to ${project.name} (${project.slug}).`);
}

async function commandDeploy(flags) {
  const configRecord = await findProjectConfig();
  if (!configRecord) throw new Error(`No ${CONFIG_NAME} found. Run \`html-publish link --project ...\` first.`);
  const config = configRecord.config;
  if (config.buildCommand && !flags['skip-build']) {
    console.log(`Running ${config.buildCommand}...`);
    execSync(config.buildCommand, { cwd: configRecord.directory, stdio: 'inherit', shell: true });
  }

  const details = await inspect(configRecord);
  const credentials = await ensureCredentials(config.server, config.projectId);
  const zipped = await zipDirectory(details.outputDirectory);
  try {
    const bytes = await readFile(zipped.target);
    const artifactHash = createHash('sha256').update(bytes).digest('hex');
    const form = new FormData();
    form.append('artifact', new Blob([bytes], { type: 'application/zip' }), 'prototype.zip');
    form.append('note', String(flags.note || `Published ${new Date().toISOString()}`));
    if (flags.version && flags.version !== true) form.append('version', String(flags.version));
    form.append('entryFile', details.entryFile.replace(/\\/g, '/'));
    form.append('artifactHash', artifactHash);
    form.append('sourceClient', 'html-publish-cli');
    form.append('sourceVersion', CLI_VERSION);
    form.append('gitCommit', gitValue(configRecord.directory, 'git rev-parse HEAD'));
    form.append('gitBranch', gitValue(configRecord.directory, 'git branch --show-current'));

    console.log(`Uploading ${details.fileCount} files to ${config.projectSlug}...`);
    const result = await api(credentials, `/api/v1/projects/${encodeURIComponent(config.projectId)}/deployments`, {
      method: 'POST',
      headers: { 'Idempotency-Key': String(flags['idempotency-key'] || randomUUID()) },
      body: form,
    });
    console.log(JSON.stringify({
      success: true,
      project: result.project?.name || config.projectSlug,
      version: result.version?.label || result.version?.number,
      deploymentId: result.deployment?.id,
      previewUrl: result.previewUrl,
      versionUrl: result.versionUrl,
    }, null, 2));
  } finally {
    await zipped.cleanup();
  }
}

async function main() {
  const [command, ...rest] = process.argv.slice(2);
  const { positional, flags } = parseArgs(rest);
  if (!command || ['help', '--help', '-h'].includes(command)) return usage();
  if (command === 'login') return commandLogin(flags);
  if (command === 'whoami' || command === 'projects') {
    const credentials = await ensureCredentials(flags.server);
    const result = await listProjects(credentials, positional.join(' '));
    console.log(JSON.stringify(result, null, 2));
    return;
  }
  if (command === 'link') return commandLink(flags);
  if (command === 'inspect') {
    console.log(JSON.stringify(await inspect(await findProjectConfig()), null, 2));
    return;
  }
  if (command === 'deploy') return commandDeploy(flags);
  if (command === 'status') {
    if (!positional[0]) throw new Error('Pass a deployment ID.');
    const config = await findProjectConfig();
    const credentials = await ensureCredentials(config?.config?.server, config?.config?.projectId);
    console.log(JSON.stringify(await api(credentials, `/api/v1/deployments/${encodeURIComponent(positional[0])}`), null, 2));
    return;
  }
  throw new Error(`Unknown command: ${command}`);
}

main().catch((error) => {
  console.error(`html-publish: ${error.message}`);
  process.exitCode = 1;
});
