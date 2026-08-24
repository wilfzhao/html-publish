import { createHash, timingSafeEqual } from 'crypto';
import { NextRequest } from 'next/server';
import { prisma } from '@/lib/db';

export const TOKEN_PREFIX = 'hp_';

export function hashApiToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

export function hashDeviceCode(code: string): string {
  return createHash('sha256').update(code).digest('hex');
}

export function getBearerToken(req: NextRequest): string | null {
  const header = req.headers.get('authorization');
  if (!header?.startsWith('Bearer ')) return null;
  const token = header.slice(7).trim();
  return token.startsWith(TOKEN_PREFIX) ? token : null;
}

export async function authenticateProjectToken(req: NextRequest, projectId?: string) {
  const rawToken = getBearerToken(req);
  if (!rawToken) return null;

  const digest = hashApiToken(rawToken);
  const record = await prisma.apiToken.findUnique({
    where: { tokenHash: digest },
    include: {
      project: { select: { id: true, slug: true, name: true } },
      user: { select: { id: true, name: true, email: true } },
    },
  });

  if (!record || record.revokedAt || (record.expiresAt && record.expiresAt <= new Date())) {
    return null;
  }
  if (projectId && record.projectId !== projectId) return null;
  if (!record.scopes.split(/\s+/).includes('project:deploy')) return null;

  const presented = Buffer.from(digest, 'hex');
  const stored = Buffer.from(record.tokenHash, 'hex');
  if (presented.length !== stored.length || !timingSafeEqual(presented, stored)) return null;

  void prisma.apiToken.update({
    where: { id: record.id },
    data: { lastUsedAt: new Date() },
  }).catch(() => undefined);

  return record;
}
