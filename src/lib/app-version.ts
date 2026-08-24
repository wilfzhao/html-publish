import { execFileSync } from 'child_process';
import packageJson from '../../package.json';

export interface AppVersionInfo {
  version: string;
  displayVersion: string;
  commit: string | null;
  dirty: boolean;
  release: boolean;
  buildDate: string | null;
}

function git(args: string[]) {
  try {
    return execFileSync('git', args, {
      cwd: process.cwd(),
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
    }).trim();
  } catch {
    return '';
  }
}

export function getAppVersionInfo(): AppVersionInfo {
  const version = process.env.HTML_PUBLISH_VERSION?.trim() || packageJson.version;
  const release = process.env.HTML_PUBLISH_RELEASE === 'true';
  const commit = process.env.HTML_PUBLISH_GIT_COMMIT?.trim() || git(['rev-parse', '--short=7', 'HEAD']) || null;
  const dirty = release ? false : Boolean(git(['status', '--porcelain']));
  const buildDate = process.env.HTML_PUBLISH_BUILD_DATE?.trim() || null;

  const displayVersion = release
    ? version
    : `${version}-dev${commit ? `+${commit}` : ''}${dirty ? '.dirty' : ''}`;

  return { version, displayVersion, commit, dirty, release, buildDate };
}
