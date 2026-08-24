import { NextRequest } from 'next/server';

export function getPublicBaseUrl(req: NextRequest) {
  const configured = process.env.HTML_PUBLISH_PUBLIC_URL?.trim();
  if (configured) return configured.replace(/\/+$/, '');

  const forwardedHost = req.headers.get('x-forwarded-host')?.split(',')[0]?.trim();
  const host = forwardedHost || req.headers.get('host');
  const forwardedProtocol = req.headers.get('x-forwarded-proto')?.split(',')[0]?.trim();
  const protocol = forwardedProtocol || req.nextUrl.protocol.replace(/:$/, '');
  return host ? `${protocol}://${host}` : req.nextUrl.origin;
}
