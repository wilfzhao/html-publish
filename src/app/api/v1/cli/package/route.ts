import archiver from 'archiver';
import { readFile } from 'fs/promises';
import path from 'path';
import { PassThrough } from 'stream';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const packagedServerMarker = "const PACKAGED_SERVER = '';";

export async function GET(request: Request) {
  const requestedServer = new URL(request.url).searchParams.get('server')?.trim();
  if (!requestedServer) {
    return Response.json({ error: 'Missing server query parameter.' }, { status: 400 });
  }

  let server: string;
  try {
    const parsed = new URL(requestedServer);
    if (!['http:', 'https:'].includes(parsed.protocol)) throw new Error('Unsupported protocol');
    if (parsed.username || parsed.password) throw new Error('Credentials are not allowed');
    server = parsed.toString().replace(/\/$/, '');
  } catch {
    return Response.json({ error: 'Server must be a valid HTTP or HTTPS URL.' }, { status: 400 });
  }

  const root = path.join(process.cwd(), 'packages/html-publish-cli');
  const cliSource = await readFile(path.join(root, 'bin/html-publish.mjs'), 'utf8');
  if (!cliSource.includes(packagedServerMarker)) {
    return Response.json({ error: 'CLI server marker is missing.' }, { status: 500 });
  }
  const packagedCliSource = cliSource.replace(
    packagedServerMarker,
    `const PACKAGED_SERVER = ${JSON.stringify(server)};`,
  );
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
  archive.append(packagedCliSource, { name: 'package/bin/html-publish.mjs', mode: 0o755 });
  await archive.finalize();
  await completed;
  return new Response(Buffer.concat(chunks), { headers: { 'Content-Type': 'application/octet-stream', 'Content-Disposition': 'attachment; filename="html-publish-cli.tgz"', 'Cache-Control': 'no-store' } });
}
