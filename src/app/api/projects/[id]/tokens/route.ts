import { randomBytes } from 'crypto';
import { NextRequest, NextResponse } from 'next/server';
import { hashApiToken, TOKEN_PREFIX } from '@/lib/api-auth';
import { prisma } from '@/lib/db';

export async function GET(_req: NextRequest, { params }: RouteContext<'/api/projects/[id]/tokens'>) {
  const { id } = await params;
  const items = await prisma.apiToken.findMany({ where: { projectId: id }, orderBy: { createdAt: 'desc' }, select: { id: true, name: true, tokenPrefix: true, scopes: true, expiresAt: true, lastUsedAt: true, revokedAt: true, createdAt: true } });
  return NextResponse.json({ items });
}
export async function POST(req: NextRequest, { params }: RouteContext<'/api/projects/[id]/tokens'>) {
  const { id } = await params;
  const project = await prisma.project.findUnique({ where: { id } });
  if (!project) return NextResponse.json({ error: 'Project not found' }, { status: 404 });
  const body = await req.json().catch(() => ({}));
  const name = typeof body.name === 'string' && body.name.trim() ? body.name.trim().slice(0, 100) : 'AI Publish';
  const days = Math.min(Math.max(Number(body.expiresInDays) || 90, 1), 365);
  const token = TOKEN_PREFIX + randomBytes(32).toString('base64url');
  const item = await prisma.apiToken.create({ data: { projectId: id, userId: project.ownerId, name, tokenPrefix: token.slice(0, 11), tokenHash: hashApiToken(token), expiresAt: new Date(Date.now() + days * 86400000) } });
  return NextResponse.json({ id: item.id, name: item.name, token, tokenPrefix: item.tokenPrefix, expiresAt: item.expiresAt, warning: 'This token is shown only once. Store it securely.' }, { status: 201 });
}
