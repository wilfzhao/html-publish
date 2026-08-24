import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { hasProjectAccess } from '@/lib/project-access';

export async function GET(req: NextRequest, { params }: RouteContext<'/api/public/projects/[slug]'>) {
  const { slug } = await params;
  const project = await prisma.project.findUnique({ where: { slug }, include: { owner: { select: { name: true } }, versions: { orderBy: { number: 'desc' }, select: { id: true, number: true, label: true, note: true, createdAt: true } } } });
  if (!project) return NextResponse.json({ error: 'Project not found' }, { status: 404 });
  if (project.expireAt && project.expireAt <= new Date()) return NextResponse.json({ error: 'This prototype has expired' }, { status: 410 });
  if (project.visibility === 'PRIVATE') return NextResponse.json({ error: 'Project not found' }, { status: 404 });
  const locked = project.visibility === 'PASSWORD' && !!project.password && !hasProjectAccess(req, project.id, project.password);
  return NextResponse.json({ project: { id: project.id, slug: project.slug, name: project.name, description: project.description, icon: project.icon, owner: project.owner, currentVersionId: project.currentVersionId, visibility: project.visibility, locked, versions: locked ? [] : project.versions } });
}
