/**
 * Session Provider Component
 * 
 * Wraps the application with NextAuth session provider for client-side
 * session access in React components.
 */

'use client'

import { SessionProvider } from 'next-auth/react'

export function Providers({ children }: { children: React.ReactNode }) {
  return <SessionProvider>{children}</SessionProvider>
}

