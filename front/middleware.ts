import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  // Check for session cookie (Django usually sets 'sessionid' or similar)
  // Or check for custom token if stored in cookies.
  // For this project, assuming session based auth where backend sets cookie.
  // However, client-side often uses 'isAuthenticated' flag.
  // Middleware cannot access localStorage.
  // If backend sets HttpOnly cookie 'sessionid', we can check that.

  const session = request.cookies.get('sessionid');

  // Protected routes
  if (request.nextUrl.pathname.startsWith('/dashboard') ||
    request.nextUrl.pathname.startsWith('/oneonone/pages')) {

    if (!session) {
      return NextResponse.redirect(new URL('/login', request.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/dashboard/:path*',
    '/oneonone/pages/:path*'
  ],
};
