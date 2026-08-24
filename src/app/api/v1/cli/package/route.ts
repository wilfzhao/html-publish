import archiver from 'archiver';
import { readFile } from 'fs/promises';
import path from 'path';
import { PassThrough } from 'stream';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  const root = path.join(process.cwd(), 'packages/html-publish-cli');
  const archive = archiver('tar', { gzip: true, gzipOptions: { level: 9 } });
  const output = new PassThrough();
  const chunks: Buffer[] = [];
  output.on('data', (chunk) => chunks.push(Buffer.from(chunk)));
  const completed = new Promise<void>((resolve, reject) => {
    output.on('end', resolve);
    output.on('error', reject);
    archive.on('error', reject);
  });
  archive.pipe(output);
  archive.append(await readFile(path.join(root, 'package.json')), { name: 'package/package.json' });
  archive.append(await readFile(path.join(root, 'bin/html-publish.mjs')), { name: 'package/bin/html-publish.mjs', mode: 0o755 });
  await archive.finalize();
  await completed;
  return new Response(Buffer.concat(chunks), { headers: { 'Content-Type': 'application/octet-stream', 'Content-Disposition': 'attachment; filename="html-publish-cli.tgz"', 'Cache-Control': 'no-store' } });
}
