import {
  LayoutDashboard,
  FileText,
  Users,
  Wrench,
  BarChart3,
  Settings,
  ClipboardCheck,
  MapPin,
  Package,
  Flag,
  type LucideIcon,
} from 'lucide-react'

export interface NavItem {
  name: string
  href: string
  icon: LucideIcon
}

export const mainNav: NavItem[] = [
  { name: 'Board', href: '/dashboard', icon: LayoutDashboard },
  { name: 'Permits', href: '/permits', icon: FileText },
  { name: 'Customers', href: '/customers', icon: Users },
  { name: 'Contractors', href: '/contractors', icon: Wrench },
  { name: 'Review Queue', href: '/review-queue', icon: ClipboardCheck },
  { name: 'Reports', href: '/reports', icon: BarChart3 },
]

export const adminNav: NavItem[] = [
  { name: 'Counties', href: '/admin/counties', icon: Flag },
  { name: 'Jurisdictions', href: '/admin/jurisdictions', icon: MapPin },
  { name: 'Export Profiles', href: '/admin/export-profiles', icon: Package },
  { name: 'Settings', href: '/settings', icon: Settings },
]

export function isAdminRole(role: string | undefined | null): boolean {
  return role === 'admin'
}

export function isNavItemActive(pathname: string, href: string): boolean {
  return pathname === href || pathname.startsWith(href + '/')
}

export function isAdminSectionActive(pathname: string): boolean {
  return adminNav.some(item => isNavItemActive(pathname, item.href))
}
