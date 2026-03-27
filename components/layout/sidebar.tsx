/**
 * Sidebar Navigation Component — Phase 2
 *
 * Role-aware navigation with Review Queue, Admin section
 * (Jurisdictions, Export Profiles), and Reports.
 * Stays dark in both light and dark modes as a design accent.
 */

'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useSession } from 'next-auth/react'
import { cn } from '@/lib/utils'
import {
  LayoutDashboard,
  FileText,
  Users,
  Wrench,
  BarChart3,
  Settings,
  LogOut,
  ClipboardCheck,
  MapPin,
  Package,
  ChevronDown,
  ChevronRight,
  Flag,
} from 'lucide-react'
import { useState } from 'react'

interface NavItem {
  name: string
  href: string
  icon: React.ElementType
}

const mainNav: NavItem[] = [
  { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { name: 'Permits', href: '/permits', icon: FileText },
  { name: 'Customers', href: '/customers', icon: Users },
  { name: 'Contractors', href: '/contractors', icon: Wrench },
  { name: 'Review Queue', href: '/review-queue', icon: ClipboardCheck },
  { name: 'Reports', href: '/reports', icon: BarChart3 },
]

const adminNav: NavItem[] = [
  { name: 'Counties', href: '/admin/counties', icon: Flag },
  { name: 'Jurisdictions', href: '/admin/jurisdictions', icon: MapPin },
  { name: 'Export Profiles', href: '/admin/export-profiles', icon: Package },
  { name: 'Settings', href: '/settings', icon: Settings },
]

function NavLink({ item, pathname }: { item: NavItem; pathname: string }) {
  const Icon = item.icon
  const isActive = pathname === item.href || pathname?.startsWith(item.href + '/')
  return (
    <Link
      href={item.href}
      className={cn(
        'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
        isActive
          ? 'bg-gray-700 text-white'
          : 'text-gray-300 hover:bg-gray-700 hover:text-white'
      )}
    >
      <Icon className="h-4 w-4 flex-shrink-0" />
      {item.name}
    </Link>
  )
}

export function Sidebar() {
  const pathname = usePathname()
  const { data: session } = useSession()
  const isAdmin = session?.user?.role === 'admin'
  const [adminOpen, setAdminOpen] = useState(
    adminNav.some(i => pathname === i.href || pathname?.startsWith(i.href + '/'))
  )

  return (
    <div className="flex h-screen w-56 flex-col bg-gray-900 text-white flex-shrink-0">
      <div className="flex h-14 items-center border-b border-gray-800 px-4">
        <h1 className="text-base font-bold tracking-tight">PermitPro</h1>
      </div>

      <nav className="flex-1 overflow-y-auto space-y-0.5 px-2 py-3">
        {mainNav.map(item => (
          <NavLink key={item.name} item={item} pathname={pathname} />
        ))}

        {isAdmin && (
          <div className="pt-3">
            <button
              onClick={() => setAdminOpen(o => !o)}
              className="flex w-full items-center justify-between px-3 py-1.5 text-xs font-semibold uppercase tracking-widest text-gray-500 hover:text-gray-400"
            >
              Admin
              {adminOpen
                ? <ChevronDown className="h-3.5 w-3.5" />
                : <ChevronRight className="h-3.5 w-3.5" />}
            </button>
            {adminOpen && (
              <div className="mt-0.5 space-y-0.5">
                {adminNav.map(item => (
                  <NavLink key={item.name} item={item} pathname={pathname} />
                ))}
              </div>
            )}
          </div>
        )}
      </nav>

      <div className="border-t border-gray-800 p-2 space-y-0.5">
        {session?.user && (
          <div className="px-3 py-2">
            <p className="text-xs font-medium text-gray-300 truncate">{session.user.name}</p>
            <p className="text-xs text-gray-500 capitalize">{session.user.role ?? 'coordinator'}</p>
          </div>
        )}
        <Link
          href="/api/auth/signout"
          className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-gray-400 transition-colors hover:bg-gray-700 hover:text-white"
        >
          <LogOut className="h-4 w-4" />
          Sign Out
        </Link>
      </div>
    </div>
  )
}
