import { NextResponse } from 'next/server';

// Demo — always authenticated for local dev
export async function GET(_req: Request) {
  return NextResponse.json({
    authenticated: true,
    user: { id: 'user_demo', name: 'Demo User', email: 'demo@company.com' },
  });
}
