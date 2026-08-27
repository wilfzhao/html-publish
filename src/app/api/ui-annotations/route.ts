import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { hasProjectAccess } from '@/lib/project-access';

function serialize(annotation: any) {
  return {
    id: annotation.id,
    projectId: annotation.projectId,
    versionId: annotation.versionId,
    pagePath: annotation.pagePath,
    selector: annotation.selector,
    leftSelector: annotation.leftSelector,
    rightSelector: annotation.rightSelector,
    leftOffset: annotation.leftOffset,
    rightOffset: annotation.rightOffset,
    anchorRelative: annotation.anchorRelative,
    anchorVersion: annotation.anchorVersion,
    x: annotation.x,
    y: annotation.y,
    width: annotation.width,
    height: annotation.height,
    requirement: annotation.requirement,
    keep: annotation.keep,
    createdAt: annotation.createdAt,
  };
}

export async function GET(req: NextRequest) {
  const versionId = req.nextUrl.searchParams.get('versionId');
  if (!versionId) return NextResponse.json({ error: 'versionId required' }, { status: 400 });

  const annotations = await prisma.uiAnnotation.findMany({
    where: { versionId },
    orderBy: { createdAt: 'asc' },
  });
  return NextResponse.json(annotations.map(serialize));
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { projectId, versionId, pagePath, selector, leftSelector, rightSelector, leftOffset, rightOffset, anchorRelative, anchorVersion, x, y, width, height, requirement, keep } = body;
  if (!projectId || !versionId || !String(requirement || '').trim()) {
    return NextResponse.json({ error: 'projectId, versionId and requirement required' }, { status: 400 });
  }
  const project = await prisma.project.findUnique({ where: { id: projectId } });
  if (!project) return NextResponse.json({ error: 'Project not found' }, { status: 404 });
  if (project.visibility === 'PASSWORD' && project.password && !hasProjectAccess(req, project.id, project.password)) {
    return NextResponse.json({ error: 'Project password required' }, { status: 401 });
  }
  const version = await prisma.version.findFirst({ where: { id: versionId, projectId } });
  if (!version) return NextResponse.json({ error: 'Version not found' }, { status: 404 });

  const annotation = await prisma.uiAnnotation.create({
    data: {
      projectId,
      versionId,
      pagePath: typeof pagePath === 'string' ? pagePath : '/',
      selector: typeof selector === 'string' ? selector : null,
      leftSelector: typeof leftSelector === 'string' ? leftSelector : null,
      rightSelector: typeof rightSelector === 'string' ? rightSelector : null,
      leftOffset: Number.isFinite(leftOffset) ? Number(leftOffset) : null,
      rightOffset: Number.isFinite(rightOffset) ? Number(rightOffset) : null,
      anchorRelative: anchorRelative === true,
      anchorVersion: anchorVersion === 4 ? 4 : anchorVersion === 3 ? 3 : anchorVersion === 2 ? 2 : 1,
      x: Number(x) || 0,
      y: Number(y) || 0,
      width: Number(width) || 0,
      height: Number(height) || 0,
      requirement: String(requirement).trim().slice(0, 1000),
      keep: typeof keep === 'string' && keep.trim() ? keep.trim().slice(0, 1000) : null,
    },
  });
  return NextResponse.json(serialize(annotation), { status: 201 });
}
