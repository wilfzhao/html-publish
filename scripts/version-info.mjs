#!/usr/bin/env node

import { execFileSync } from 'node:child_process';
import { readFile } from 'node:fs/promises';
import process from 'node:process';

const root = new URL('../', import.meta.url);
const packageJson = JSON.parse(await readFile(new URL('package.json', root), 'utf8'));

function git(args) {
  try {
    return execFileSync('git', args, { cwd: root, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim();
  } catch {
    return '';
  }
}

const commit = git(['rev-parse', '--short=7', 'HEAD']) || null;
const dirty = Boolean(git(['status', '--porcelain']));
const exactTag = git(['describe', '--tags', '--exact-match', 'HEAD']);
const release = !dirty && exactTag === `v${packageJson.version}`;
const displayVersion = release
  ? packageJson.version
  : `${packageJson.version}-dev${commit ? `+${commit}` : ''}${dirty ? '.dirty' : ''}`;
const info = { version: packageJson.version, displayVersion, commit, dirty, release, tag: exactTag || null };

if (process.argv.includes('--json')) console.log(JSON.stringify(info, null, 2));
else console.log(displayVersion);
