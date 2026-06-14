'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useSession } from 'next-auth/react'
import { cn } from '@/lib/utils'
import {
  adminNav,
  isAdminRole,
  isAdminSectionActive,
  isNavItemActive,
  mainNav,
  type NavItem,
} from '@/lib/nav-config'
import { ChevronDown, ChevronRight, LogOut } from 'lucide-react'
import { useState } from 'react'
import { useNav } from './nav-context'

function NavLink({ item, pathname, onNavigate }: { item: NavItem; pathname: string; onNavigate?: () => void }) {
  const Icon = item.icon
  const active = isNavItemActive(pathname, item.href)

  return (
    <Link
      href={item.href}
      onClick={onNavigate}
      className={cn(
        'flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors',
        'text-muted hover:bg-surface hover:text-ink focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent',
        active && 'pp-nav-active font-semibold text-ink'
      )}
      aria-current={active ? 'page' : undefined}
    >
      <Icon className="h-4 w-4 flex-shrink-0" aria-hidden />
      {item.name}
    </Link>
  )
}

export function SidebarPanel({ className, id }: { className?: string; id?: string }) {
  const pathname = usePathname()
  const { data: session } = useSession()
  const { closeMobile } = useNav()
  const role = session?.user?.role ?? 'coordinator'
  const isAdmin = isAdminRole(role)
  const [adminOpen, setAdminOpen] = useState(isAdminSectionActive(pathname))

  const onNavigate = () => closeMobile()

  return (
    <aside
      id={id}
      className={cn(
        'flex h-full flex-col bg-surface-inset border-r border-border',
        className
      )}
    >
      <div className="flex h-14 items-center border-b border-border px-4">
        <Link
          href="/dashboard"
          onClick={onNavigate}
          className="text-base font-bold tracking-tight text-ink focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
        >
          PermitPro
        </Link>
      </div>

      <nav className="flex-1 space-y-0.5 overflow-y-auto px-2 py-3" aria-label="Main">
        {mainNav.map(item => (
          <NavLink key={item.name} item={item} pathname={pathname} onNavigate={onNavigate} />
        ))}

        {isAdmin && (
          <div className="pt-3">
            <button
              type="button"
              onClick={() => setAdminOpen(o => !o)}
              aria-expanded={adminOpen}
              className="flex w-full items-center justify-between rounded-md px-3 py-1.5 text-xs font-medium text-muted hover:text-ink focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
            >
              Administration
              {adminOpen ? (
                <ChevronDown className="h-3.5 w-3.5" aria-hidden />
              ) : (
                <ChevronRight className="h-3.5 w-3.5" aria-hidden />
              )}
            </button>
            {adminOpen && (
              <div className="mt-0.5 space-y-0.5" aria-label="Administration">
                {adminNav.map(item => (
                  <NavLink key={item.name} item={item} pathname={pathname} onNavigate={onNavigate} />
                ))}
              </div>
            )}
          </div>
        )}
      </nav>

      <div className="space-y-0.5 border-t border-border p-2">
        {session?.user && (
          <div className="px-3 py-2">
            <p className="truncate text-xs capitalize text-muted">{role}</p>
          </div>
        )}
        <Link
          href="/api/auth/signout"
          onClick={onNavigate}
          className="flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium text-muted transition-colors hover:bg-surface hover:text-ink focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
        >
          <LogOut className="h-4 w-4" aria-hidden />
          Sign out
        </Link>
      </div>
    </aside>
  )
}

/** @deprecated Use SidebarPanel inside MobileNav */
export function Sidebar() {
  return <SidebarPanel className="h-screen w-60 flex-shrink-0" />
}
