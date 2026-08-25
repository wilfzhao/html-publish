import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const userCode = typeof body.userCode === 'string' ? body.userCode.trim().toUpperCase() : '';
  const requestedProjectId = typeof body.projectId === 'string' ? body.projectId : '';
  if (!userCode) return NextResponse.json({ error: 'Code is required' }, { status: 400 });
  const authorization = await prisma.deviceAuthorization.findUnique({ where: { userCode } });
  if (!authorization || authorization.expiresAt <= new Date() || authorization.status !== 'PENDING') return NextResponse.json({ error: 'Authorization request is no longer active' }, { status: 410 });
  if (authorization.projectId && requestedProjectId && authorization.projectId !== requestedProjectId) {
    return NextResponse.json({ error: 'The requested project cannot be changed.' }, { status: 409 });
  }
  const projectId = authorization.projectId || requestedProjectId;
  if (!projectId) return NextResponse.json({ error: 'Project is required' }, { status: 400 });
  const project = await prisma.project.findUnique({ where: { id: projectId }, select: { id: true, name: true, slug: true } });
  if (!project) return NextResponse.json({ error: 'Project not found' }, { status: 404 });
  await prisma.deviceAuthorization.update({ where: { id: authorization.id }, data: { status: 'APPROVED', projectId, approvedAt: new Date() } });
  return NextResponse.json({ success: true, project });
}
