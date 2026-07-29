/**
 * Next.js Middleware
 *
 * Protects page routes by verifying the JWT session cookie (Edge-safe — no Prisma).
 * API routes handle their own authentication; public paths are excluded.
 */

import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { getToken } from 'next-auth/jwt'

const PUBLIC_PREFIXES = ['/login', '/api/auth']

export async function middleware(request: NextRequest) {
  const { nextUrl } = request
  const pathname = nextUrl.pathname

  const isPublic = PUBLIC_PREFIXES.some((route) => pathname.startsWith(route))
  if (isPublic) {
    return NextResponse.next()
  }

  // API routes enforce auth in their handlers
  if (pathname.startsWith('/api')) {
    return NextResponse.next()
  }

  const secret = process.env.AUTH_SECRET ?? process.env.NEXTAUTH_SECRET
  const token = await getToken({ req: request, secret })

  if (!token) {
    const loginUrl = new URL('/login', request.url)
    loginUrl.searchParams.set('callbackUrl', pathname)
    return NextResponse.redirect(loginUrl)
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
}
