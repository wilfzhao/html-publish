import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const userCode = typeof body.userCode === 'string' ? body.userCode.trim().toUpperCase() : '';
  const projectId = typeof body.projectId === 'string' ? body.projectId : '';
  if (!userCode || !projectId) return NextResponse.json({ error: 'Code and project are required' }, { status: 400 });
  const [authorization, project] = await Promise.all([prisma.deviceAuthorization.findUnique({ where: { userCode } }), prisma.project.findUnique({ where: { id: projectId }, select: { id: true, name: true, slug: true } })]);
  if (!authorization || authorization.expiresAt <= new Date() || authorization.status !== 'PENDING') return NextResponse.json({ error: 'Authorization request is no longer active' }, { status: 410 });
  if (!project) return NextResponse.json({ error: 'Project not found' }, { status: 404 });
  await prisma.deviceAuthorization.update({ where: { id: authorization.id }, data: { status: 'APPROVED', projectId, approvedAt: new Date() } });
  return NextResponse.json({ success: true, project });
}
