import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { readFile } from 'fs/promises';
import path from 'path';

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
          take: 1,
          select: { number: true },
        },
      },
    });

    if (!project) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    const versionNum = versionStr
      ? parseInt(versionStr, 10)
      : project.versions?.[0]?.number || 1;

    const versionDir = path.join(process.cwd(), 'uploads', project.id, `v${versionNum}`);
    const fullPath = path.join(versionDir, filePath);

    // Security: prevent path traversal
    if (!fullPath.startsWith(versionDir)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    let fileBuffer: Buffer;
    try {
      fileBuffer = await readFile(fullPath);
    } catch {
      try {
        fileBuffer = await readFile(path.join(versionDir, 'index.html'));
      } catch {
        return NextResponse.json({ error: 'File not found' }, { status: 404 });
      }
    }

    const ext = filePath.split('.').pop()?.toLowerCase() || '';
    const contentType = CONTENT_TYPES[ext] || 'application/octet-stream';

    return new NextResponse(new Uint8Array(fileBuffer), {
      status: 200,
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=3600',
        'Content-Security-Policy': "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self' data:",
        'X-Frame-Options': 'DENY',
      },
    });
  } catch (error) {
    console.error('Asset error:', error);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
