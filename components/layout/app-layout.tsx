'use client'

import { NavProvider } from './nav-context'
import { MobileNav } from './mobile-nav'
import { SidebarPanel } from './sidebar'
import { BandHeader } from './band-header'
import { AssistantChat } from '@/components/ai/assistant-chat'

export function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <NavProvider>
      <div className="flex h-screen flex-col bg-canvas">
        <a href="#main-content" className="pp-skip-link">
          Skip to main content
        </a>

        <BandHeader />

        <MobileNav>
          <SidebarPanel id="mobile-navigation" className="h-full w-60" />
        </MobileNav>

        <main
          id="main-content"
          tabIndex={-1}
          className="flex-1 overflow-y-auto px-4 py-5 focus:outline-none md:px-10 md:py-6"
        >
          {children}
        </main>

        <AssistantChat />
      </div>
    </NavProvider>
  )
}
