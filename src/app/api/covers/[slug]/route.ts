import { existsSync } from 'fs';
import { readFile } from 'fs/promises';
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { generateProjectCover, getCoverPath } from '@/lib/project-cover';
import { getPublicBaseUrl } from '@/lib/public-url';

function placeholder() {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1280 720"><rect width="1280" height="720" fill="#eef2ff"/><rect x="535" y="125" width="210" height="210" rx="58" fill="#4f46e5"/><circle cx="640" cy="183" r="18" fill="#ff8068"/><path d="M590 234c28 32 72 32 100 0" fill="none" stroke="#fff" stroke-width="15" stroke-linecap="round"/></svg>`;
  return new NextResponse(svg, { headers: { 'Content-Type': 'image/svg+xml; charset=utf-8', 'Cache-Control': 'no-store' } });
}

export async function GET(req: NextRequest, { params }: RouteContext<'/api/covers/[slug]'>) {
  const { slug } = await params;
  try {
    const project = await prisma.project.findUnique({ where: { slug }, select: { id: true, currentVersionId: true, visibility: true, expireAt: true } });
    if (!project?.currentVersionId) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    if (project.expireAt && project.expireAt <= new Date()) return NextResponse.json({ error: 'This prototype has expired' }, { status: 410 });
    const requested = Number(req.nextUrl.searchParams.get('v'));
    const version = await prisma.version.findFirst({ where: { projectId: project.id, ...(Number.isInteger(requested) && requested > 0 ? { number: requested } : { id: project.currentVersionId }) }, select: { number: true } });
    if (!version) return new NextResponse(null, { status: 404 });
    const coverPath = getCoverPath(project.id, version.number);
    if (!existsSync(coverPath) && process.env.ENABLE_COVER_SCREENSHOTS === 'true') {
      await generateProjectCover({ projectId: project.id, versionNumber: version.number, previewUrl: `${getPublicBaseUrl(req)}/p/${slug}/v/${version.number}` });
    }
    if (!existsSync(coverPath)) return placeholder();
    return new NextResponse(await readFile(coverPath), { headers: { 'Content-Type': 'image/png', 'Cache-Control': project.visibility === 'PUBLIC' ? 'public, max-age=86400' : 'private, no-store' } });
  } catch (error) {
    console.error('Cover generation error:', error);
    return placeholder();
  }
}
