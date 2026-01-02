/**
 * Header Component
 * 
 * Provides the top header bar for the application.
 * Displays user information and quick actions.
 */

'use client'

import { useSession } from 'next-auth/react'

export function Header() {
  const { data: session } = useSession()

  return (
    <header className="flex h-16 items-center justify-between border-b border-gray-200 bg-white px-6">
      <div className="flex items-center gap-4">
        <h2 className="text-lg font-semibold text-gray-900">
          Permit Processing & Document Management
        </h2>
      </div>
      <div className="flex items-center gap-4">
        {session?.user && (
          <div className="flex items-center gap-3">
            <div className="text-right">
              <p className="text-sm font-medium text-gray-900">{session.user.name}</p>
              <p className="text-xs text-gray-500">{session.user.email}</p>
            </div>
            <div className="h-8 w-8 rounded-full bg-blue-600 flex items-center justify-center text-white text-sm font-medium">
              {session.user.name?.charAt(0).toUpperCase()}
            </div>
          </div>
        )}
      </div>
    </header>
  )
}

