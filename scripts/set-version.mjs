#!/usr/bin/env node

import { readFile, writeFile } from 'node:fs/promises';

const version = process.argv[2]?.replace(/^v/, '');
if (!version || !/^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?$/.test(version)) {
  console.error('Usage: npm run version:set -- 0.1.8');
  process.exit(1);
}

async function readJson(path) {
  return JSON.parse(await readFile(path, 'utf8'));
}

async function writeJson(path, value) {
  await writeFile(path, `${JSON.stringify(value, null, 2)}\n`);
}

const packageJson = await readJson('package.json');
const packageLock = await readJson('package-lock.json');
const cliPackage = await readJson('packages/html-publish-cli/package.json');

packageJson.version = version;
packageLock.version = version;
packageLock.packages[''].version = version;
cliPackage.version = version;

await Promise.all([
  writeJson('package.json', packageJson),
  writeJson('package-lock.json', packageLock),
  writeJson('packages/html-publish-cli/package.json', cliPackage),
]);

const deploymentPath = 'deploy/kuboard.yaml';
const deployment = await readFile(deploymentPath, 'utf8');
await writeFile(
  deploymentPath,
  deployment.replace(
    /harbor\.dgmed\.cn\/sjwj\/html-publish:v[^\s]+/g,
    `harbor.dgmed.cn/sjwj/html-publish:v${version}`,
  ),
);

console.log(`Version synchronized to ${version}. Review, commit, and tag the release as v${version}.`);
