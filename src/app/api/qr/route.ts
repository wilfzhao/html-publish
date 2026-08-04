import { NextRequest, NextResponse } from 'next/server';

// Simple QR code generator — uses a public QR API
// For production, generate server-side with a library like qrcode
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const url = searchParams.get('url');

  if (!url) {
    return NextResponse.json({ error: 'url required' }, { status: 400 });
  }

  // Use a simple QR code API to generate the image
  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(url)}`;

  return NextResponse.redirect(qrUrl);
}
