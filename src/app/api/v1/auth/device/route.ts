import { randomBytes } from 'crypto';
import { NextRequest, NextResponse } from 'next/server';
import { hashDeviceCode } from '@/lib/api-auth';
import { prisma } from '@/lib/db';
import { getPublicBaseUrl } from '@/lib/public-url';

function userCode() { const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; return Array.from(randomBytes(8), (value) => chars[value % chars.length]).join(''); }
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const deviceCode = randomBytes(32).toString('base64url');
  let code = userCode();
  while (await prisma.deviceAuthorization.findUnique({ where: { userCode: code } })) code = userCode();
  const expiresAt = new Date(Date.now() + 600000);
  await prisma.deviceAuthorization.create({ data: { deviceCodeHash: hashDeviceCode(deviceCode), userCode: code, clientName: typeof body.clientName === 'string' ? body.clientName.slice(0, 100) : 'HTML Publish CLI', expiresAt } });
  const url = new URL('/connect', getPublicBaseUrl(req));
  url.searchParams.set('code', code);
  if (typeof body.project === 'string' && body.project.trim()) url.searchParams.set('project', body.project.trim().slice(0, 200));
  return NextResponse.json({ deviceCode, userCode: code, verificationUri: url.toString(), expiresAt, interval: 2 }, { status: 201 });
}
export async function GET(req: NextRequest) {
  const code = req.nextUrl.searchParams.get('code')?.trim().toUpperCase();
  if (!code) return NextResponse.json({ error: 'Code required' }, { status: 400 });
  const item = await prisma.deviceAuthorization.findUnique({ where: { userCode: code }, select: { userCode: true, clientName: true, status: true, expiresAt: true, projectId: true } });
  return !item || item.expiresAt <= new Date() ? NextResponse.json({ error: 'Authorization code expired' }, { status: 404 }) : NextResponse.json(item);
}
