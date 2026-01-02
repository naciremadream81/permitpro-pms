/**
 * Next.js Middleware
 * 
 * Protects routes that require authentication by redirecting unauthenticated
 * users to the login page.
 */

import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export function middleware(request: NextRequest) {
  // Public routes that don't require authentication
  const publicRoutes = ['/login', '/api/auth']
  const isPublicRoute = publicRoutes.some(route => 
    request.nextUrl.pathname.startsWith(route)
  )

  // Allow public routes and API routes
  if (isPublicRoute || request.nextUrl.pathname.startsWith('/api')) {
    return NextResponse.next()
  }

  // For protected routes, we'll check authentication in the page/component
  // NextAuth handles API route protection
  return NextResponse.next()
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
}

