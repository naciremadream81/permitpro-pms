/**
 * NextAuth API Route Handler
 * 
 * This route handles all authentication requests using NextAuth.js
 * with a credentials provider for internal user authentication.
 */

import NextAuth from 'next-auth'
import { authConfig } from '@/auth.config'

const handler = NextAuth(authConfig)

export { handler as GET, handler as POST }

