/**
 * Settings Page
 * 
 * Admin-only page for managing users and system settings.
 * Allows admins to add, edit, and delete users, and manage their roles.
 */

import { AppLayout } from '@/components/layout/app-layout'
import { SettingsClient } from './settings-client'
import { getSession, requireAdmin } from '@/lib/auth-helpers'
import { redirect } from 'next/navigation'

export default async function SettingsPage() {
  // Check authentication and admin role
  const session = await getSession()
  
  if (!session) {
    redirect('/login')
  }

  if (session.user?.role !== 'admin') {
    redirect('/dashboard')
  }

  return (
    <AppLayout>
      <SettingsClient />
    </AppLayout>
  )
}

