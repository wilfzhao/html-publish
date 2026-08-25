import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { readFile } from 'fs/promises';
import path from 'path';
import { getVersionUploadDirectory } from '@/lib/storage-paths';
import { hasProjectAccess } from '@/lib/project-access';

const CONTENT_TYPES: Record<string, string> = {
  html: 'text/html', htm: 'text/html', css: 'text/css',
  js: 'application/javascript', json: 'application/json',
  png: 'image/png', jpg: 'image/jpeg', jpeg: 'image/jpeg',
  gif: 'image/gif', svg: 'image/svg+xml', webp: 'image/webp',
  ico: 'image/x-icon', woff: 'font/woff', woff2: 'font/woff2',
  ttf: 'font/ttf', map: 'application/json',
};

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;
  try {
    const { searchParams } = new URL(req.url);
    const filePath = searchParams.get('path') || 'index.html';
    const versionStr = searchParams.get('v');

    const project = await prisma.project.findUnique({
      where: { slug },
      include: {
        versions: {
          orderBy: { number: 'desc' },
          select: { number: true, label: true, entryFile: true },
        },
      },
    });

    if (!project) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }
    if (project.visibility === 'PASSWORD' && project.password && !hasProjectAccess(req, project.id, project.password)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const numericVersion = versionStr ? Number.parseInt(versionStr, 10) : null;
    const selectedVersion = versionStr
      ? project.versions.find((version) => version.number === numericVersion)
        || project.versions.find((version) => version.label === versionStr)
      : project.versions[0];

    if (!selectedVersion) {
      return NextResponse.json({ error: 'Version not found' }, { status: 404 });
    }

    const versionDir = getVersionUploadDirectory(project.id, selectedVersion.number);
    let servedPath = path.resolve(versionDir, filePath);

    // Security: prevent path traversal
    if (!servedPath.startsWith(`${versionDir}${path.sep}`)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Determine fallback entry file (prefer the version's entryFile)
    let fileBuffer: Buffer;
    try {
      fileBuffer = await readFile(servedPath);
    } catch {
      servedPath = path.resolve(versionDir, selectedVersion.entryFile || 'index.html');
      if (!servedPath.startsWith(`${versionDir}${path.sep}`)) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      }
      try {
        fileBuffer = await readFile(servedPath);
      } catch {
        return NextResponse.json({ error: 'File not found' }, { status: 404 });
      }
    }

    const ext = servedPath.split('.').pop()?.toLowerCase() || '';
    const contentType = CONTENT_TYPES[ext] || 'application/octet-stream';

    // For HTML files, inject a base tag so relative URLs resolve to /api/assets/<slug>/path=<relative>
    if (ext === 'html' || ext === 'htm') {
      const htmlStr = fileBuffer.toString('utf-8');
      const versionKey = selectedVersion.label || String(selectedVersion.number);
      const baseHref = `/api/assets/${slug}/?v=${encodeURIComponent(versionKey)}&path=`;
      let modifiedHtml = htmlStr.replace(
        /<head(\s[^>]*)?>/,
        `<head$1>\n<base href="${baseHref}">`
      );
      if (modifiedHtml !== htmlStr) {
        fileBuffer = Buffer.from(modifiedHtml, 'utf-8');
      }
    }

    return new NextResponse(Uint8Array.from(fileBuffer), {
      status: 200,
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=3600',
        'Content-Security-Policy': "default-src *; script-src * 'unsafe-inline' 'unsafe-eval'; style-src * 'unsafe-inline'; img-src * data: blob:; font-src * data:; frame-src *; media-src *; object-src *; connect-src *;",
        'X-Frame-Options': 'SAMEORIGIN',
        'Access-Control-Allow-Origin': '*',
      },
    });
  } catch (error) {
    console.error('Asset error:', error);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
