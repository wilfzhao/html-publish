import { randomBytes } from 'crypto';
import { NextRequest, NextResponse } from 'next/server';
import { hashDeviceCode } from '@/lib/api-auth';
import { prisma } from '@/lib/db';
import { getPublicBaseUrl } from '@/lib/public-url';

function userCode() { const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; return Array.from(randomBytes(8), (value) => chars[value % chars.length]).join(''); }
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const projectHint = typeof body.project === 'string' ? body.project.trim().slice(0, 200) : '';
  let targetProject: { id: string; name: string; slug: string; icon: string | null } | null = null;
  if (projectHint) {
    const matches = await prisma.project.findMany({
      where: { OR: [{ id: projectHint }, { slug: projectHint }, { name: projectHint }] },
      select: { id: true, name: true, slug: true, icon: true },
      take: 2,
    });
    if (matches.length === 0) {
      return NextResponse.json({ error: { code: 'PROJECT_NOT_FOUND', message: `Project "${projectHint}" was not found.` } }, { status: 404 });
    }
    if (matches.length > 1) {
      return NextResponse.json({ error: { code: 'AMBIGUOUS_PROJECT', message: `Multiple projects are named "${projectHint}". Use the project ID or slug.` } }, { status: 409 });
    }
    targetProject = matches[0];
  }
  const deviceCode = randomBytes(32).toString('base64url');
  let code = userCode();
  while (await prisma.deviceAuthorization.findUnique({ where: { userCode: code } })) code = userCode();
  const expiresAt = new Date(Date.now() + 600000);
  await prisma.deviceAuthorization.create({ data: { deviceCodeHash: hashDeviceCode(deviceCode), userCode: code, clientName: typeof body.clientName === 'string' ? body.clientName.slice(0, 100) : 'HTML Publish CLI', projectId: targetProject?.id, expiresAt } });
  const url = new URL('/connect', getPublicBaseUrl(req));
  url.searchParams.set('code', code);
  if (targetProject) url.searchParams.set('project', targetProject.slug);
  return NextResponse.json({ deviceCode, userCode: code, verificationUri: url.toString(), expiresAt, interval: 2 }, { status: 201 });
}
export async function GET(req: NextRequest) {
  const code = req.nextUrl.searchParams.get('code')?.trim().toUpperCase();
  if (!code) return NextResponse.json({ error: 'Code required' }, { status: 400 });
  const item = await prisma.deviceAuthorization.findUnique({
    where: { userCode: code },
    select: {
      userCode: true,
      clientName: true,
      status: true,
      expiresAt: true,
      projectId: true,
      project: { select: { id: true, name: true, slug: true, icon: true } },
    },
  });
  return !item || item.expiresAt <= new Date() ? NextResponse.json({ error: 'Authorization code expired' }, { status: 404 }) : NextResponse.json(item);
}
