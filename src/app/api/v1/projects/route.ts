import { NextRequest, NextResponse } from 'next/server';
import { authenticateProjectToken } from '@/lib/api-auth';
import { prisma } from '@/lib/db';
export async function GET(req: NextRequest) {
  const token = await authenticateProjectToken(req);
  if (!token) return NextResponse.json({ error: { code: 'UNAUTHORIZED', message: 'A valid project token is required.' } }, { status: 401 });
  const query = req.nextUrl.searchParams.get('query')?.trim();
  const items = await prisma.project.findMany({ where: { id: token.projectId, ...(query ? { OR: [{ id: query }, { slug: query }, { name: { contains: query } }] } : {}) }, select: { id: true, slug: true, name: true, description: true, currentVersionId: true, updatedAt: true } });
  return NextResponse.json({ items });
}
