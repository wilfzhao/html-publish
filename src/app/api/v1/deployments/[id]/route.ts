import { NextRequest, NextResponse } from 'next/server';
import { authenticateProjectToken } from '@/lib/api-auth';
import { prisma } from '@/lib/db';
export async function GET(req: NextRequest, { params }: RouteContext<'/api/v1/deployments/[id]'>) {
  const { id } = await params;
  const deployment = await prisma.deployment.findUnique({ where: { id }, include: { project: { select: { id: true, slug: true, name: true } } } });
  if (!deployment) return NextResponse.json({ error: { code: 'NOT_FOUND', message: 'Deployment not found.' } }, { status: 404 });
  if (!(await authenticateProjectToken(req, deployment.projectId))) return NextResponse.json({ error: { code: 'UNAUTHORIZED', message: 'A valid project token is required.' } }, { status: 401 });
  return NextResponse.json({ deployment });
}
