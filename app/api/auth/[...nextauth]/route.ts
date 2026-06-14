/**
 * NextAuth API Route Handler (v5)
 * 
 * This route handles all authentication requests using NextAuth.js v5.
 * The route uses the handlers exported from the auth.ts file.
 * 
 * In NextAuth v5, the route handler pattern:
 * - Uses the `handlers` object exported from the auth configuration
 * - GET and POST handlers are exported directly
 * - The route pattern remains the same: /api/auth/[...nextauth]
 * 
 * This route handles:
 * - POST /api/auth/signin - User sign in
 * - POST /api/auth/signout - User sign out
 * - GET /api/auth/session - Get current session
 * - GET /api/auth/csrf - Get CSRF token
 * - And other NextAuth endpoints
 */

import { handlers } from '@/auth'

// Export the handlers for GET and POST requests
// These handle all authentication-related requests
export const { GET, POST } = handlers

