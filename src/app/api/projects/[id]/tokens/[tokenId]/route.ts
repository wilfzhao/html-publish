import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { hasProjectAccess } from '@/lib/project-access';
export async function DELETE(req: NextRequest, { params }: RouteContext<'/api/projects/[id]/tokens/[tokenId]'>) {
  const { id, tokenId } = await params;
  const project = await prisma.project.findUnique({ where: { id } });
  if (!project) return NextResponse.json({ error: 'Project not found' }, { status: 404 });
  if (project.visibility === 'PASSWORD' && project.password && !hasProjectAccess(req, project.id, project.password)) return NextResponse.json({ error: 'Project password required' }, { status: 401 });
  const result = await prisma.apiToken.updateMany({ where: { id: tokenId, projectId: id, revokedAt: null }, data: { revokedAt: new Date() } });
  return result.count ? NextResponse.json({ success: true }) : NextResponse.json({ error: 'Token not found' }, { status: 404 });
}
