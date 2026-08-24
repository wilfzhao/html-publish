import AdmZip from 'adm-zip';
import { mkdir, rename, rm, writeFile } from 'fs/promises';
import path from 'path';

const MAX_FILES = Number.parseInt(process.env.MAX_DEPLOY_FILES || '2000', 10);
const MAX_EXTRACTED_SIZE = Number.parseInt(process.env.MAX_DEPLOY_EXTRACTED_SIZE || '104857600', 10);
const SENSITIVE_NAME = /(^|\/)(\.env(?:\.|$)|\.git(?:\/|$)|id_rsa(?:\.|$)|id_ed25519(?:\.|$)|.*\.(?:pem|key|p12))$/i;

export class ArtifactError extends Error {
  constructor(public code: string, message: string) {
    super(message);
  }
}

function safeRelativePath(input: string): string {
  const normalized = input.replace(/\\/g, '/').replace(/^\.\//, '');
  if (!normalized || normalized.includes('\0') || path.posix.isAbsolute(normalized)) {
    throw new ArtifactError('UNSAFE_PATH', `Unsafe artifact path: ${input}`);
  }
  const clean = path.posix.normalize(normalized);
  if (clean === '..' || clean.startsWith('../')) {
    throw new ArtifactError('UNSAFE_PATH', `Artifact path escapes the deployment: ${input}`);
  }
  if (SENSITIVE_NAME.test(clean)) {
    throw new ArtifactError('SENSITIVE_FILE', `Sensitive file is not allowed: ${clean}`);
  }
  return clean;
}

function isSymlink(entry: AdmZip.IZipEntry): boolean {
  const unixMode = (entry.header.attr >>> 16) & 0o170000;
  return unixMode === 0o120000;
}

export async function stageArtifact(options: {
  buffer: Buffer;
  filename: string;
  entryFile: string;
  stagingDir: string;
}): Promise<{ entryFile: string; fileCount: number }> {
  const { buffer, filename, stagingDir } = options;
  const requestedEntry = safeRelativePath(options.entryFile || 'index.html');
  await rm(stagingDir, { recursive: true, force: true });
  await mkdir(stagingDir, { recursive: true });

  let fileCount = 0;
  let totalSize = 0;

  if (/\.zip$/i.test(filename)) {
    let zip: AdmZip;
    try {
      zip = new AdmZip(buffer);
    } catch {
      throw new ArtifactError('INVALID_ARCHIVE', 'The uploaded ZIP cannot be read.');
    }

    const entries = zip.getEntries().filter((entry) => !entry.isDirectory);
    if (entries.length === 0) throw new ArtifactError('EMPTY_ARCHIVE', 'The ZIP contains no files.');
    if (entries.length > MAX_FILES) throw new ArtifactError('TOO_MANY_FILES', `The deployment exceeds ${MAX_FILES} files.`);

    for (const entry of entries) {
      const relative = safeRelativePath(entry.entryName);
      if (isSymlink(entry)) throw new ArtifactError('SYMLINK_NOT_ALLOWED', `Symlinks are not allowed: ${relative}`);
      totalSize += entry.header.size;
      if (totalSize > MAX_EXTRACTED_SIZE) {
        throw new ArtifactError('ARTIFACT_TOO_LARGE', 'The extracted deployment is too large.');
      }
      const destination = path.resolve(stagingDir, relative);
      const root = path.resolve(stagingDir) + path.sep;
      if (!destination.startsWith(root)) throw new ArtifactError('UNSAFE_PATH', `Unsafe artifact path: ${relative}`);
      await mkdir(path.dirname(destination), { recursive: true });
      await writeFile(destination, entry.getData());
      fileCount += 1;
    }
  } else if (/\.html?$/i.test(filename)) {
    const htmlName = safeRelativePath(requestedEntry || filename);
    await writeFile(path.join(stagingDir, htmlName), buffer);
    fileCount = 1;
  } else {
    throw new ArtifactError('UNSUPPORTED_ARTIFACT', 'Only .html and .zip artifacts are supported.');
  }

  const entryPath = path.resolve(stagingDir, requestedEntry);
  if (!entryPath.startsWith(path.resolve(stagingDir) + path.sep)) {
    throw new ArtifactError('UNSAFE_ENTRY_FILE', 'The entry file is outside the deployment.');
  }
  try {
    const { stat } = await import('fs/promises');
    if (!(await stat(entryPath)).isFile()) throw new Error('not a file');
  } catch {
    throw new ArtifactError('ENTRY_FILE_NOT_FOUND', `Entry file not found: ${requestedEntry}`);
  }

  return { entryFile: requestedEntry, fileCount };
}

export async function promoteArtifact(stagingDir: string, targetDir: string) {
  await mkdir(path.dirname(targetDir), { recursive: true });
  await rename(stagingDir, targetDir);
}
