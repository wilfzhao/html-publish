import { execFile } from 'child_process';
import { existsSync } from 'fs';
import { mkdir, rename, rm } from 'fs/promises';
import path from 'path';
import { promisify } from 'util';
import { coversDirectory } from '@/lib/storage-paths';

const execFileAsync = promisify(execFile);

const browserCandidates = [
  process.env.CHROME_PATH,
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  '/Applications/Chromium.app/Contents/MacOS/Chromium',
  '/usr/bin/google-chrome',
  '/usr/bin/google-chrome-stable',
  '/usr/bin/chromium',
  '/usr/bin/chromium-browser',
].filter((candidate): candidate is string => Boolean(candidate));

export function getCoverPath(projectId: string, versionNumber: number) {
  return path.join(coversDirectory, `${projectId}-v${versionNumber}.png`);
}

export async function generateProjectCover(options: {
  projectId: string;
  versionNumber: number;
  previewUrl: string;
}) {
  const browserPath = browserCandidates.find(existsSync);
  if (!browserPath) {
    throw new Error('No Chrome/Chromium executable found. Set CHROME_PATH to enable project covers.');
  }

  await mkdir(coversDirectory, { recursive: true });

  const coverPath = getCoverPath(options.projectId, options.versionNumber);
  const temporaryPath = `${coverPath}.${process.pid}-${Date.now()}.tmp.png`;

  try {
    await execFileAsync(
      browserPath,
      [
        '--headless',
        '--disable-gpu',
        '--no-sandbox',
        '--hide-scrollbars',
        '--window-size=1280,720',
        '--virtual-time-budget=10000',
        `--screenshot=${temporaryPath}`,
        options.previewUrl,
      ],
      { timeout: 20000 }
    );

    if (!existsSync(temporaryPath)) {
      throw new Error('Browser completed without creating a screenshot');
    }

    await rename(temporaryPath, coverPath);
    return coverPath;
  } finally {
    await rm(temporaryPath, { force: true }).catch(() => undefined);
  }
}
