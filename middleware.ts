/**
 * Next.js Middleware
 * 
 * Simple route filtering middleware that doesn't require Prisma/Edge runtime compatibility.
 * 
 * This middleware:
 * - Allows public routes (login, API auth) to pass through
 * - Allows all API routes to pass through (they handle their own auth)
 * - For protected pages, authentication is checked in the page component itself
 * 
 * IMPORTANT: We're not using NextAuth's auth() wrapper here because:
 * 1. It would require loading Prisma Client, which doesn't work in Edge runtime
 * 2. Since we're using JWT strategy, authentication is handled at the page/API route level
 * 
 * If you need to use NextAuth v5's auth() wrapper in middleware in the future:
 * - The wrapper provides the request with an `auth` property (not a destructurable field)
 * - Correct pattern: `export default auth((req) => { const session = req.auth; ... })`
 * - Incorrect pattern: `const { nextUrl, auth } = req` (auth will be undefined)
 * - The session is available as `req.auth`, not as a destructured variable
 */

import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

/**
 * Middleware function that runs on every request
 * 
 * This is a lightweight middleware that only handles route filtering.
 * Actual authentication checks happen in:
 * - API routes: using getSession() from lib/auth-helpers
 * - Server components: using getSession() from lib/auth-helpers
 * - Client components: using useSession() from next-auth/react
 * 
 * Note: We only destructure `nextUrl` from the request. If using NextAuth's auth()
 * wrapper, the session would be available as `req.auth` (a property), not as a
 * destructurable field. Attempting to destructure `auth` would result in `undefined`.
 */
export function middleware(request: NextRequest) {
  // Only destructure nextUrl - do NOT attempt to destructure 'auth' from request
  // If using NextAuth v5's auth() wrapper, access session via req.auth property
  const { nextUrl } = request

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

  // For protected pages, authentication is checked in the page component itself
  // This allows for more granular control and better error handling
  return NextResponse.next()
}

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

