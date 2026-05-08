import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  // Get the session cookie
  const sessionCookie = request.cookies.get('session');

  // Define protected routes
  const protectedRoutes = ['/'];
  const isProtectedRoute = protectedRoutes.includes(request.nextUrl.pathname);

  // If accessing a protected route without a session cookie, redirect to login
  if (isProtectedRoute && !sessionCookie) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  // If accessing login/signup pages with a valid session, redirect to home
  if ((request.nextUrl.pathname === '/login' || request.nextUrl.pathname === '/signup') && sessionCookie) {
    return NextResponse.redirect(new URL('/', request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!api|_next/static|_next/image|favicon.ico).*)',
  ],
};