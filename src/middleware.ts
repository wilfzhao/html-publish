import { NextRequest, NextResponse } from 'next/server';

export function middleware(req: NextRequest) {
  const path = req.nextUrl.pathname;

  // Skip API routes, static files, and public routes
  if (
    path.startsWith('/api/') ||
    path.startsWith('/_next/') ||
    path.startsWith('/favicon.ico') ||
    path.startsWith('/p/') ||
    path.startsWith('/login') ||
    path.startsWith('/') ||
    path.startsWith('/health')
  ) {
    return NextResponse.next();
  }

  // Protect dashboard and project routes
  if (path.startsWith('/dashboard') || path.startsWith('/project/')) {
    const session = req.cookies.get('session');
    if (!session) {
      return NextResponse.redirect(new URL('/login', req.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/dashboard/:path*', '/project/:path*', '/settings/:path*'],
};
