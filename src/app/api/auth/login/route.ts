import { NextResponse } from 'next/server';

// Demo login — in production, integrate with company SSO (OAuth2/SAML/CAS)
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { email, name } = body;
    if (!email) {
      return NextResponse.json({ error: 'Email required' }, { status: 400 });
    }

    return NextResponse.json({
      id: 'usr_' + Math.random().toString(36).slice(2, 8),
      name: name || email.split('@')[0],
      email,
      role: 'user',
    });
  } catch {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
  }
}
