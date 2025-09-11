import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  // Check if the request is for the login page or static assets
  if (request.nextUrl.pathname === '/login' || 
      request.nextUrl.pathname.startsWith('/_next') ||
      request.nextUrl.pathname.startsWith('/favicon') ||
      request.nextUrl.pathname.startsWith('/public')) {
    return NextResponse.next();
  }

  // Check if the request is for API routes (allow them to pass through)
  if (request.nextUrl.pathname.startsWith('/api/')) {
    return NextResponse.next();
  }

  // Check for authentication in cookies
  const isAuthenticated = request.cookies.get('isAuthenticated')?.value === 'true';
  
  // If not authenticated, redirect to login page
  if (!isAuthenticated) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     */
    '/((?!_next/static|_next/image|favicon.ico|public).*)',
  ],
};
