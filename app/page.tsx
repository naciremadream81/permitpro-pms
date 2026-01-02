/**
 * Home Page
 * 
 * Redirects to dashboard if authenticated, otherwise to login page.
 */

import { redirect } from 'next/navigation'
import { getSession } from '@/lib/auth-helpers'

export default async function HomePage() {
  const session = await getSession()
  
  if (session) {
    redirect('/dashboard')
  } else {
    redirect('/login')
  }
}
