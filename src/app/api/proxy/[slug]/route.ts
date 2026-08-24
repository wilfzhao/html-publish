import { NextRequest, NextResponse } from 'next/server';
import { readFile } from 'fs/promises';
import path from 'path';
import { prisma } from '@/lib/db';
import { getVersionUploadDirectory } from '@/lib/storage-paths';

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

    const numericVersion = versionStr ? Number.parseInt(versionStr, 10) : null;
    const selectedVersion = versionStr
      ? project.versions.find((version) => version.number === numericVersion)
        || project.versions.find((version) => version.label === versionStr)
      : project.versions[0];

    if (!selectedVersion) {
      return NextResponse.json({ error: 'Version not found' }, { status: 404 });
    }

    const versionDir = getVersionUploadDirectory(project.id, selectedVersion.number);
    let servedPath = path.join(versionDir, filePath);

    if (!servedPath.startsWith(`${versionDir}${path.sep}`)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    let fileBuffer: Buffer;
    try {
      fileBuffer = await readFile(servedPath);
    } catch {
      servedPath = path.join(versionDir, selectedVersion.entryFile || 'index.html');
      try {
        fileBuffer = await readFile(servedPath);
      } catch {
        return NextResponse.json({ error: 'File not found' }, { status: 404 });
      }
    }

    const ext = servedPath.split('.').pop()?.toLowerCase() || '';
    const contentType = CONTENT_TYPES[ext] || 'application/octet-stream';

    if (ext === 'html' || ext === 'htm') {
      const htmlStr = fileBuffer.toString('utf-8');
      const versionKey = selectedVersion.label || String(selectedVersion.number);
      const assetPrefix = `/api/assets/${slug}/?v=${encodeURIComponent(versionKey)}&path=`;

      const proxyScript = `
<script>
(function() {
  var prefix = ${JSON.stringify(assetPrefix)};
  document.querySelectorAll('link[href]').forEach(function(link) {
    var href = link.getAttribute('href');
    if (href && !href.startsWith('http') && !href.startsWith('data:') && !href.startsWith('//') && !href.startsWith('/api/assets/')) {
      link.setAttribute('href', prefix + encodeURIComponent(href));
    }
  });
  document.querySelectorAll('script[src]').forEach(function(script) {
    var src = script.getAttribute('src');
    if (src && !src.startsWith('http') && !src.startsWith('data:') && !src.startsWith('//') && !src.startsWith('/api/assets/')) {
      script.setAttribute('src', prefix + encodeURIComponent(src));
    }
  });
  document.querySelectorAll('img[src], a[href], form[action]').forEach(function(el) {
    var attr = el.getAttribute('src') || el.getAttribute('href') || el.getAttribute('action');
    if (attr && !attr.startsWith('http') && !attr.startsWith('data:') && !attr.startsWith('//') && !attr.startsWith('mailto:') && !attr.startsWith('javascript:') && !attr.startsWith('/api/assets/')) {
      var name = el.tagName.toLowerCase() === 'a' ? 'href' : el.tagName.toLowerCase() === 'form' ? 'action' : 'src';
      el.setAttribute(name, prefix + encodeURIComponent(attr));
    }
  });
})();
<\/script>
`;

      let modifiedHtml = htmlStr.replace(/<head(\s[^>]*)?>/, function(match) {
        return '<head' + match.slice(5) + proxyScript;
      });
      if (modifiedHtml === htmlStr) {
        modifiedHtml = proxyScript + htmlStr;
      }
      fileBuffer = Buffer.from(modifiedHtml, 'utf-8');
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
    console.error('Proxy error:', error);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
