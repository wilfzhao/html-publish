import { createHmac, timingSafeEqual } from 'crypto';
import bcrypt from 'bcryptjs';
import type { NextRequest } from 'next/server';

export const PROJECT_ACCESS_COOKIE_PREFIX = 'hp_project_';

function signingSecret() {
  return process.env.NEXTAUTH_SECRET?.trim() || '';
}

export function projectAccessCookieName(projectId: string) {
  return `${PROJECT_ACCESS_COOKIE_PREFIX}${projectId}`;
}

export function createProjectAccessToken(projectId: string, passwordHash: string) {
  const secret = signingSecret();
  if (!secret) throw new Error('Project access signing secret is not configured');
  return createHmac('sha256', secret)
    .update(`html-publish:project-access:v1:${projectId}:${passwordHash}`)
    .digest('base64url');
}

export async function hashProjectPassword(password: string) {
  return bcrypt.hash(password, 12);
}

export async function verifyProjectPassword(password: string, stored: string) {
  if (stored.startsWith('$2')) return bcrypt.compare(password, stored);
  const a = Buffer.from(password);
  const b = Buffer.from(stored);
  return a.length === b.length && timingSafeEqual(a, b);
}

export function hasProjectAccess(req: NextRequest, projectId: string, passwordHash: string) {
  return hasProjectAccessCookie(
    req.cookies.get(projectAccessCookieName(projectId))?.value,
    projectId,
    passwordHash,
  );
}

export function hasProjectAccessCookie(actual: string | undefined, projectId: string, passwordHash: string) {
  if (!actual) return false;
  const expected = createProjectAccessToken(projectId, passwordHash);
  const a = Buffer.from(actual);
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}
