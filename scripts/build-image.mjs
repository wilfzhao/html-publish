#!/usr/bin/env node

import { execFileSync, spawnSync } from 'node:child_process';
import { readFile } from 'node:fs/promises';
import process from 'node:process';

const image = process.env.HTML_PUBLISH_IMAGE || 'harbor.dgmed.cn/sjwj/html-publish';
const packageJson = JSON.parse(await readFile(new URL('../package.json', import.meta.url), 'utf8'));
const release = process.argv.includes('--release');
const push = process.argv.includes('--push');

function git(args) {
  try {
    return execFileSync('git', args, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim();
  } catch {
    return '';
  }
}

const commit = git(['rev-parse', 'HEAD']);
const shortCommit = commit.slice(0, 7) || 'unknown';
const dirty = Boolean(git(['status', '--porcelain']));
const exactTag = git(['describe', '--tags', '--exact-match', 'HEAD']);

if (release && (dirty || exactTag !== `v${packageJson.version}`)) {
  console.error(`Release builds require a clean working tree tagged v${packageJson.version}.`);
  process.exit(1);
}

const buildDate = new Date().toISOString();
const primaryTag = release ? `v${packageJson.version}` : `dev-${shortCommit}${dirty ? '-dirty' : ''}`;
const args = [
  'buildx', 'build', '.',
  '--build-arg', `APP_VERSION=${packageJson.version}`,
  '--build-arg', `GIT_COMMIT=${commit || 'unknown'}`,
  '--build-arg', `BUILD_DATE=${buildDate}`,
  '--build-arg', `RELEASE_BUILD=${release}`,
  '-t', `${image}:${primaryTag}`,
];
if (release) args.push('-t', `${image}:latest`);
args.push(push ? '--push' : '--load');

console.log(`Building ${image}:${primaryTag}`);
const result = spawnSync('docker', args, { stdio: 'inherit' });
process.exit(result.status ?? 1);
