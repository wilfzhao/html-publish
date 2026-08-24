import { randomBytes } from 'crypto';
import { NextRequest, NextResponse } from 'next/server';
import { hashApiToken, hashDeviceCode, TOKEN_PREFIX } from '@/lib/api-auth';
import { prisma } from '@/lib/db';
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  if (typeof body.deviceCode !== 'string') return NextResponse.json({ error: { code: 'INVALID_REQUEST', message: 'Device code required' } }, { status: 400 });
  const item = await prisma.deviceAuthorization.findUnique({ where: { deviceCodeHash: hashDeviceCode(body.deviceCode) }, include: { project: true } });
  if (!item || item.expiresAt <= new Date()) return NextResponse.json({ error: { code: 'EXPIRED_TOKEN', message: 'Authorization expired' } }, { status: 410 });
  if (item.status !== 'APPROVED' || !item.project) return NextResponse.json({ error: { code: 'AUTHORIZATION_PENDING', message: 'Authorization pending' } }, { status: 428 });
  if (item.consumedAt) return NextResponse.json({ error: { code: 'INVALID_GRANT', message: 'Authorization already consumed' } }, { status: 409 });
  const token = TOKEN_PREFIX + randomBytes(32).toString('base64url');
  await prisma.$transaction([prisma.apiToken.create({ data: { projectId: item.project.id, userId: item.project.ownerId, name: item.clientName || 'HTML Publish CLI', tokenPrefix: token.slice(0, 11), tokenHash: hashApiToken(token), expiresAt: new Date(Date.now() + 90 * 86400000) } }), prisma.deviceAuthorization.update({ where: { id: item.id }, data: { status: 'CONSUMED', consumedAt: new Date() } })]);
  return NextResponse.json({ token, tokenType: 'Bearer', project: { id: item.project.id, slug: item.project.slug, name: item.project.name } });
}
