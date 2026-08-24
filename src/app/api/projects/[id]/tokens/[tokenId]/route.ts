import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
export async function DELETE(_req: NextRequest, { params }: RouteContext<'/api/projects/[id]/tokens/[tokenId]'>) {
  const { id, tokenId } = await params;
  const result = await prisma.apiToken.updateMany({ where: { id: tokenId, projectId: id, revokedAt: null }, data: { revokedAt: new Date() } });
  return result.count ? NextResponse.json({ success: true }) : NextResponse.json({ error: 'Token not found' }, { status: 404 });
}
