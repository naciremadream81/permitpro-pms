'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { usePathname } from 'next/navigation'
import { useSession } from 'next-auth/react'
import { useTheme } from 'next-themes'
import { Menu, Moon, Sun, X, LogOut, ChevronDown } from 'lucide-react'
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
    <header className="flex-shrink-0 bg-band text-band-foreground">
      {/* Top row: wordmark + meta + controls */}
      <div className="flex h-14 items-center justify-between gap-4 border-b border-white/10 px-4 md:px-8">
        <Link
          href="/dashboard"
          className="flex items-baseline gap-px text-[17px] font-semibold tracking-tight text-band-foreground focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-band-foreground"
        >
          <span className="font-bold">Permit</span>
          <span className="font-light opacity-70">Pro</span>
        </Link>

        <div className="flex items-center gap-1 md:gap-2">
          {/* Session info — desktop only */}
          <div className="mr-2 hidden text-right text-[12px] text-band-dim sm:block">
            {mounted && (
              <span suppressHydrationWarning>
                {new Date().toLocaleDateString('en-US', {
                  weekday: 'short',
                  month: 'short',
                  day: 'numeric',
                })}
                {' · '}
              </span>
            )}
            <span className="font-medium text-band-foreground">
              {session?.user?.name ?? '—'}
            </span>
            <span className="ml-1 capitalize opacity-60">{role}</span>
          </div>

          <button
            type="button"
            onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
            aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
            className="rounded p-1.5 text-band-dim transition-colors hover:bg-white/10 hover:text-band-foreground focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-band-foreground"
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
            className="rounded p-1.5 text-band-dim transition-colors hover:bg-white/10 hover:text-band-foreground focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-band-foreground"
          >
            <LogOut className="h-4 w-4" aria-hidden />
          </Link>

          <button
            type="button"
            onClick={toggleMobile}
            aria-expanded={mobileOpen}
            aria-controls="mobile-navigation"
            aria-label={mobileOpen ? 'Close navigation' : 'Open navigation'}
            className="rounded p-1.5 text-band-foreground transition-colors hover:bg-white/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-band-foreground md:hidden"
          >
            {mobileOpen ? <X className="h-5 w-5" aria-hidden /> : <Menu className="h-5 w-5" aria-hidden />}
          </button>
        </div>
      </div>

      {/* Nav row — desktop only */}
      <nav
        className="hidden items-center gap-1 px-4 md:flex md:px-8"
        aria-label="Main"
        style={{ height: '40px' }}
      >
        {mainNav.map(item => (
          <Link
            key={item.href}
            href={item.href}
            className={cn('pp-band-link px-3', isNavItemActive(pathname, item.href) && 'active')}
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
                'pp-band-link px-3',
                isAdminSectionActive(pathname) && !isNavItemActive(pathname, '/settings') && 'active'
              )}
            >
              Admin
            </Link>
            {settingsItem && (
              <Link
                href={settingsItem.href}
                className={cn('pp-band-link px-3', isNavItemActive(pathname, settingsItem.href) && 'active')}
                aria-current={isNavItemActive(pathname, settingsItem.href) ? 'page' : undefined}
              >
                {settingsItem.name}
              </Link>
            )}
          </>
        )}
      </nav>
    </header>
  )
}
