/**
 * Next.js Middleware
 * 
 * Simple route filtering middleware that doesn't require Prisma/Edge runtime compatibility.
 * 
 * This middleware:
 * - Allows public routes (login, API auth) to pass through
 * - Allows all API routes to pass through (they handle their own auth)
 * - Redirects unauthenticated page requests to login before protected server pages render
 * 
 * IMPORTANT: We inspect the JWT directly here instead of importing the full
 * NextAuth config. That keeps middleware Edge-safe and avoids bundling Prisma.
 */

import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { getToken } from 'next-auth/jwt'

/**
 * Middleware function that runs on every request
 * 
 * This is a lightweight middleware that only handles route filtering.
 * Actual authentication checks happen in:
 * - API routes: using getSession() from lib/auth-helpers
 * - Protected pages: this middleware redirects unauthenticated requests before render
 * - Client components: using useSession() from next-auth/react
 * 
 * Note: API routes still perform their own auth checks because they need route-
 * specific 401/403 handling and role enforcement.
 */
export async function middleware(request: NextRequest) {
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

  const token = await getToken({
    req: request,
    secret: process.env.AUTH_SECRET ?? process.env.NEXTAUTH_SECRET,
  })

  if (!token) {
    const loginUrl = new URL('/login', nextUrl)
    loginUrl.searchParams.set('callbackUrl', nextUrl.href)
    return NextResponse.redirect(loginUrl)
  }

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

