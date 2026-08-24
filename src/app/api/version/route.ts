import { NextResponse } from 'next/server';
import { getAppVersionInfo } from '@/lib/app-version';

export const dynamic = 'force-dynamic';

export async function GET() {
  return NextResponse.json(getAppVersionInfo(), {
    headers: { 'Cache-Control': 'no-store' },
  });
}
