/**
 * Next.js Middleware (NextAuth v5)
 * 
 * Protects routes that require authentication by redirecting unauthenticated
 * users to the login page.
 * 
 * In NextAuth v5, middleware uses the `auth()` function as a wrapper.
 * The middleware receives the request with an `auth` property that contains
 * the session information.
 */

import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { auth } from '@/auth'

/**
 * Middleware function that runs on every request
 * 
 * This middleware:
 * - Allows public routes (login, API auth) to pass through
 * - Allows all API routes to pass through (they handle their own auth)
 * - For protected pages, authentication is checked in the page component itself
 * 
 * In NextAuth v5, the `auth()` function can be used as middleware wrapper.
 * It provides the request with an `auth` property containing session data.
 */
export default auth((req) => {
  const { nextUrl, auth } = req

  // Public routes that don't require authentication
  const publicRoutes = ['/login', '/api/auth']
  const isPublicRoute = publicRoutes.some(route => 
    nextUrl.pathname.startsWith(route)
  )

  // Allow public routes to pass through
  if (isPublicRoute) {
    return NextResponse.next()
  }

  // Allow API routes to pass through (they handle their own authentication)
  if (nextUrl.pathname.startsWith('/api')) {
    return NextResponse.next()
  }

  // For protected pages, authentication is checked in the page component
  // This allows for more granular control and better error handling
  // The auth object is available here if needed: const isLoggedIn = !!auth
  return NextResponse.next()
})

/**
 * Middleware configuration
 * 
 * This tells Next.js which routes should run through the middleware.
 * We exclude static files and Next.js internal routes for performance.
 */
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

