/**
 * App Layout Component
 * 
 * Main layout wrapper that provides the sidebar and header structure
 * for all authenticated pages in the application.
 */

'use client'

import { Sidebar } from './sidebar'
import { Header } from './header'

export function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-screen bg-gray-50">
      <Sidebar />
      <div className="flex flex-1 flex-col overflow-hidden">
        <Header />
        <main className="flex-1 overflow-y-auto p-6">
          {children}
        </main>
      </div>
    </div>
  )
}

