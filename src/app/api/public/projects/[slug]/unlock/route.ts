import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { createProjectAccessToken, projectAccessCookieName, verifyProjectPassword } from '@/lib/project-access';

export async function POST(req: NextRequest, { params }: RouteContext<'/api/public/projects/[slug]/unlock'>) {
  const { slug } = await params;
  const body = await req.json().catch(() => ({}));
  const project = await prisma.project.findUnique({ where: { slug }, select: { id: true, password: true, expireAt: true } });
  if (!project) return NextResponse.json({ error: 'Project not found' }, { status: 404 });
  if (project.expireAt && project.expireAt <= new Date()) return NextResponse.json({ error: 'This prototype has expired' }, { status: 410 });
  if (!project.password || typeof body.password !== 'string' || !(await verifyProjectPassword(body.password, project.password))) return NextResponse.json({ error: 'Invalid password' }, { status: 401 });
  const response = NextResponse.json({ success: true });
  response.cookies.set(projectAccessCookieName(project.id), createProjectAccessToken(project.id, project.password), { httpOnly: true, sameSite: 'lax', secure: process.env.NODE_ENV === 'production', maxAge: 86400, path: '/' });
  return response;
}
