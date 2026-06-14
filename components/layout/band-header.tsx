'use client'

/**
 * BandHeader — Unigrid masthead band.
 *
 * Replaces the sidebar + top header shell: deep teal band with the wordmark,
 * session meta, and the primary navigation as an underlined link row.
 * Mobile keeps the existing drawer (toggled from the band).
 */

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { usePathname } from 'next/navigation'
import { useSession } from 'next-auth/react'
import { useTheme } from 'next-themes'
import { Menu, Moon, Sun, X, LogOut } from 'lucide-react'
import { cn } from '@/lib/utils'
import {
  adminNav,
  isAdminRole,
  isAdminSectionActive,
  isNavItemActive,
  mainNav,
} from '@/lib/nav-config'
import { useNav } from './nav-context'

export function BandHeader() {
  const pathname = usePathname()
  const { data: session } = useSession()
  const { theme, setTheme } = useTheme()
  const { mobileOpen, toggleMobile } = useNav()
  const [mounted, setMounted] = useState(false)

  useEffect(() => setMounted(true), [])

  const role = session?.user?.role ?? 'coordinator'
  const isAdmin = isAdminRole(role)
  const settingsItem = adminNav.find(item => item.href === '/settings')

  return (
    <header className="flex-shrink-0 bg-band px-4 pt-4 text-band-foreground md:px-10 md:pt-5">
      <div className="flex items-baseline justify-between gap-4 pb-3 md:pb-4">
        <Link
          href="/dashboard"
          className="text-2xl font-extrabold uppercase leading-none tracking-tight [font-stretch:115%] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-band-foreground md:text-[28px]"
        >
          Permit<span className="font-light [font-stretch:100%]">Pro</span>
        </Link>

        <div className="flex items-center gap-3 md:gap-4">
          <div className="hidden text-right text-[11px] font-medium uppercase tracking-[0.08em] text-band-dim sm:block">
            {mounted && (
              <span suppressHydrationWarning>
                {new Date().toLocaleDateString('en-US', {
                  weekday: 'short',
                  month: 'short',
                  day: 'numeric',
                  year: 'numeric',
                })}
                {' · '}
              </span>
            )}
            <span className="font-semibold text-band-foreground">
              {session?.user?.name ?? '—'}
            </span>
            {' · '}
            {role}
          </div>

          <button
            type="button"
            onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
            aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
            className="p-1.5 text-band-dim transition-colors hover:text-band-foreground focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-band-foreground"
          >
            {!mounted ? (
              <span className="block h-4 w-4" />
            ) : theme === 'dark' ? (
              <Sun className="h-4 w-4" aria-hidden />
            ) : (
              <Moon className="h-4 w-4" aria-hidden />
            )}
          </button>

          <Link
            href="/api/auth/signout"
            aria-label="Sign out"
            className="p-1.5 text-band-dim transition-colors hover:text-band-foreground focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-band-foreground"
          >
            <LogOut className="h-4 w-4" aria-hidden />
          </Link>

          <button
            type="button"
            onClick={toggleMobile}
            aria-expanded={mobileOpen}
            aria-controls="mobile-navigation"
            aria-label={mobileOpen ? 'Close navigation' : 'Open navigation'}
            className="p-1.5 text-band-foreground focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-band-foreground md:hidden"
          >
            {mobileOpen ? <X className="h-5 w-5" aria-hidden /> : <Menu className="h-5 w-5" aria-hidden />}
          </button>
        </div>
      </div>

      <nav className="hidden gap-7 md:flex" aria-label="Main">
        {mainNav.map(item => (
          <Link
            key={item.href}
            href={item.href}
            className={cn('pp-band-link', isNavItemActive(pathname, item.href) && 'active')}
            aria-current={isNavItemActive(pathname, item.href) ? 'page' : undefined}
          >
            {item.name}
          </Link>
        ))}
        {isAdmin && (
          <>
            <Link
              href="/admin/counties"
              className={cn(
                'pp-band-link',
                isAdminSectionActive(pathname) && !isNavItemActive(pathname, '/settings') && 'active'
              )}
            >
              Admin
            </Link>
            {settingsItem && (
              <Link
                href={settingsItem.href}
                className={cn('pp-band-link', isNavItemActive(pathname, settingsItem.href) && 'active')}
                aria-current={isNavItemActive(pathname, settingsItem.href) ? 'page' : undefined}
              >
                {settingsItem.name}
              </Link>
            )}
          </>
        )}
      </nav>
      {/* Mobile: nav lives in the drawer; keep band bottom edge */}
      <div className="pb-3 md:hidden" />
    </header>
  )
}
