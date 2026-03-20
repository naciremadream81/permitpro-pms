# Permit Management UI Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a multi-role citizen/admin UI layer with role-aware dashboards, a 3-step permit application wizard, and supporting pages — all built on top of the existing Next.js 14 + Tailwind + Prisma app.

**Architecture:** Layer a `RoleContext` (admin/citizen toggle) on top of the existing next-auth session system. Admin views leverage the existing Prisma-backed pages; citizen views use mock data. Pages detect the active role via `useRole()` and render the appropriate UI. No new backend routes are added — citizen interactions are client-side with localStorage persistence.

**Tech Stack:** Next.js 14 App Router, TypeScript, Tailwind CSS, React Context, lucide-react, existing `@/components/ui/*`, `@/lib/utils`

---

## File Map

### New files
| Path | Responsibility |
|------|---------------|
| `context/RoleContext.tsx` | Role state (admin/citizen), `useRole()`, `toggleRole()` |
| `lib/mock-data.ts` | Static mock arrays for applications, contractors, approvals, users, stats |
| `components/ui/stat-card.tsx` | Reusable metric card with icon, value, label, optional trend |
| `components/ui/progress-steps.tsx` | Horizontal step progress indicator (1–N steps) |
| `components/ui/data-table.tsx` | Generic table with column config, status filter pills |
| `components/ui/approval-queue.tsx` | Approval queue widget (list of pending items with action buttons) |
| `components/ui/empty-state.tsx` | Friendly empty state with icon, heading, and CTA |
| `components/layout/role-switcher.tsx` | Toggle button (Admin / Citizen) that calls `toggleRole()` |
| `components/layout/citizen-layout.tsx` | Top-nav layout for citizen pages (replaces sidebar) |
| `app/applications/page.tsx` | Role-aware: admin=all submissions table; citizen=my apps |
| `app/approvals/page.tsx` | Role-aware: admin=approval queue with actions; citizen=read-only status |
| `app/users/page.tsx` | Role-aware: admin=user management table; citizen=profile/support |
| `app/new-application/page.tsx` | 3-step permit wizard (citizen-only, localStorage persistence) |

### Modified files
| Path | Change |
|------|--------|
| `app/layout.tsx` | Wrap children with `<RoleProvider>` |
| `components/layout/header.tsx` | Add global search, notification icon, `RoleSwitcher` |
| `components/layout/sidebar.tsx` | Add Applications, Approvals links; hide admin items when citizen |
| `app/dashboard/page.tsx` | Convert to client component, branch on `useRole()` |
| `app/reports/page.tsx` | Branch on `useRole()`: admin=charts/exports; citizen=history |
| `lib/utils.ts` | Add `Pending`, `InReview`, `Overdue`, `Approved`, `Rejected` to `getStatusColor` |

---

## Task 1: RoleContext + Mock Data Foundation

**Files:**
- Create: `context/RoleContext.tsx`
- Create: `lib/mock-data.ts`
- Modify: `app/layout.tsx`

- [ ] **Step 1: Create `context/RoleContext.tsx`**

```tsx
// context/RoleContext.tsx
'use client'

import { createContext, useContext, useState, ReactNode } from 'react'

export type Role = 'admin' | 'citizen'

interface RoleContextType {
  role: Role
  toggleRole: () => void
}

const RoleContext = createContext<RoleContextType | null>(null)

export function RoleProvider({ children }: { children: ReactNode }) {
  const [role, setRole] = useState<Role>('admin')

  const toggleRole = () => {
    setRole((prev) => (prev === 'admin' ? 'citizen' : 'admin'))
  }

  return (
    <RoleContext.Provider value={{ role, toggleRole }}>
      {children}
    </RoleContext.Provider>
  )
}

export function useRole(): RoleContextType {
  const ctx = useContext(RoleContext)
  if (!ctx) throw new Error('useRole must be used within RoleProvider')
  return ctx
}
```

- [ ] **Step 2: Create `lib/mock-data.ts`**

```ts
// lib/mock-data.ts
// Mock data for citizen/demo views — replace with API calls when backend is ready

export type PermitStatus = 'Pending' | 'InReview' | 'Approved' | 'Rejected' | 'Overdue'

export interface MockApplication {
  id: string
  permitType: string
  address: string
  ownerName: string
  submittedDate: string
  status: PermitStatus
  contractorName: string
}

export interface MockContractor {
  id: string
  name: string
  company: string
  licenseNumber: string
  phone: string
  email: string
  address: string
}

export interface MockApproval {
  id: string
  applicantName: string
  address: string
  permitType: string
  submittedDate: string
  reviewerNote?: string
}

export interface MockUser {
  id: string
  name: string
  email: string
  role: 'admin' | 'reviewer' | 'citizen'
  department?: string
  joinedDate: string
}

export const mockApplications: MockApplication[] = [
  { id: 'APP-001', permitType: 'Fence', address: '123 Maple St', ownerName: 'Jane Smith', submittedDate: '2026-03-01', status: 'InReview', contractorName: 'BuildRight LLC' },
  { id: 'APP-002', permitType: 'Renovation', address: '456 Oak Ave', ownerName: 'Carlos Rivera', submittedDate: '2026-02-20', status: 'Approved', contractorName: 'Premier Builds' },
  { id: 'APP-003', permitType: 'Deck', address: '789 Pine Rd', ownerName: 'Marcus Lee', submittedDate: '2026-02-15', status: 'Pending', contractorName: 'TBD' },
  { id: 'APP-004', permitType: 'Shed', address: '321 Elm Blvd', ownerName: 'Sarah Johnson', submittedDate: '2026-01-30', status: 'Overdue', contractorName: 'HomeBase Contractors' },
  { id: 'APP-005', permitType: 'Addition', address: '654 Cedar Ln', ownerName: 'David Kim', submittedDate: '2026-03-10', status: 'Rejected', contractorName: 'SkyHigh Builders' },
  { id: 'APP-006', permitType: 'Pool', address: '987 Birch Dr', ownerName: 'Emily Chen', submittedDate: '2026-03-12', status: 'Pending', contractorName: 'AquaPro Inc' },
  { id: 'APP-007', permitType: 'Fence', address: '246 Walnut Ct', ownerName: 'James Wilson', submittedDate: '2026-03-05', status: 'InReview', contractorName: 'FenceMasters' },
  { id: 'APP-008', permitType: 'Solar Panels', address: '135 Ash Way', ownerName: 'Priya Patel', submittedDate: '2026-02-28', status: 'Approved', contractorName: 'SunPower Installs' },
]

export const mockContractors: MockContractor[] = [
  { id: 'CON-001', name: 'Tom Bradley', company: 'BuildRight LLC', licenseNumber: 'CA-12345', phone: '(555) 100-2000', email: 'tom@buildright.com', address: '100 Construction Ave, Springfield, CA 90001' },
  { id: 'CON-002', name: 'Angela Reyes', company: 'Premier Builds', licenseNumber: 'CA-67890', phone: '(555) 200-3000', email: 'angela@premierbuilds.com', address: '200 Builder St, Springfield, CA 90002' },
  { id: 'CON-003', name: 'Kevin Park', company: 'HomeBase Contractors', licenseNumber: 'CA-11223', phone: '(555) 300-4000', email: 'kevin@homebase.com', address: '300 Homeowner Blvd, Springfield, CA 90003' },
  { id: 'CON-004', name: 'Lisa Turner', company: 'SkyHigh Builders', licenseNumber: 'CA-44556', phone: '(555) 400-5000', email: 'lisa@skyhigh.com', address: '400 Skyview Dr, Springfield, CA 90004' },
  { id: 'CON-005', name: 'Marco Santos', company: 'AquaPro Inc', licenseNumber: 'CA-77889', phone: '(555) 500-6000', email: 'marco@aquapro.com', address: '500 Pool Lane, Springfield, CA 90005' },
]

export const mockApprovals: MockApproval[] = [
  { id: 'APP-003', applicantName: 'Marcus Lee', address: '789 Pine Rd', permitType: 'Deck', submittedDate: '2026-02-15' },
  { id: 'APP-006', applicantName: 'Emily Chen', address: '987 Birch Dr', permitType: 'Pool', submittedDate: '2026-03-12' },
  { id: 'APP-001', applicantName: 'Jane Smith', address: '123 Maple St', permitType: 'Fence', submittedDate: '2026-03-01', reviewerNote: 'Waiting on survey documents' },
]

export const mockUsers: MockUser[] = [
  { id: 'USR-001', name: 'Alice Thornton', email: 'alice@city.gov', role: 'admin', department: 'Planning', joinedDate: '2023-01-15' },
  { id: 'USR-002', name: 'Bob Martinez', email: 'bob@city.gov', role: 'reviewer', department: 'Inspections', joinedDate: '2023-06-20' },
  { id: 'USR-003', name: 'Carol Hughes', email: 'carol@city.gov', role: 'reviewer', department: 'Zoning', joinedDate: '2024-02-10' },
  { id: 'USR-004', name: 'Derek Owens', email: 'derek@city.gov', role: 'admin', department: 'Administration', joinedDate: '2022-11-05' },
]

export const mockAdminStats = {
  totalApplications: 142,
  pending: 34,
  approved: 87,
  overdue: 12,
}

export const mockCitizenStats = {
  inReview: 1,
  approved: 1,
  rejected: 0,
}

// Citizen's own applications (subset)
export const myApplications: MockApplication[] = mockApplications.slice(0, 3)
```

- [ ] **Step 3: Wrap `app/layout.tsx` with `RoleProvider`**

Edit `app/layout.tsx` — import `RoleProvider` and wrap `<Providers>`:

```tsx
import { RoleProvider } from '@/context/RoleContext'

// Inside RootLayout, change:
<Providers>
  <RoleProvider>
    {children}
  </RoleProvider>
</Providers>
```

- [ ] **Step 4: Commit**

```bash
git add context/RoleContext.tsx lib/mock-data.ts app/layout.tsx
git commit -m "feat: add RoleContext and mock data foundation"
```

---

## Task 2: Extend Status Utilities + UI Components (StatCard, StatusBadge, ProgressSteps)

**Files:**
- Modify: `lib/utils.ts`
- Create: `components/ui/stat-card.tsx`
- Create: `components/ui/progress-steps.tsx`

- [ ] **Step 1: Add missing status colors to `lib/utils.ts`**

In `getStatusColor`, add these entries to the `statusColors` record (citizen-facing statuses):

```ts
'InReview': 'bg-yellow-100 text-yellow-800',
'Overdue': 'bg-red-100 text-red-800',
// Approved and Rejected already exist; add display aliases:
'Pending': 'bg-gray-100 text-gray-800',
```

Note: `Approved` and `Rejected` already exist in `getStatusColor`. Verify `InReview` and `Overdue` are added without duplicating `Pending`.

- [ ] **Step 2: Create `components/ui/stat-card.tsx`**

```tsx
// components/ui/stat-card.tsx
import { LucideIcon } from 'lucide-react'
import { cn } from '@/lib/utils'

interface StatCardProps {
  title: string
  value: string | number
  subtitle?: string
  icon?: LucideIcon
  iconColor?: string
  trend?: { value: number; label: string }
  className?: string
}

export function StatCard({
  title,
  value,
  subtitle,
  icon: Icon,
  iconColor = 'text-blue-600',
  trend,
  className,
}: StatCardProps) {
  return (
    <div className={cn('rounded-xl border border-gray-200 bg-white p-6 shadow-sm', className)}>
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium text-gray-500">{title}</p>
        {Icon && (
          <div className={cn('rounded-lg bg-gray-50 p-2', iconColor)}>
            <Icon className="h-5 w-5" />
          </div>
        )}
      </div>
      <div className="mt-2">
        <p className="text-3xl font-bold text-gray-900">{value}</p>
        {subtitle && <p className="mt-1 text-xs text-gray-500">{subtitle}</p>}
      </div>
      {trend && (
        <div className="mt-3 flex items-center gap-1">
          <span className={cn('text-xs font-medium', trend.value >= 0 ? 'text-green-600' : 'text-red-600')}>
            {trend.value >= 0 ? '↑' : '↓'} {Math.abs(trend.value)}%
          </span>
          <span className="text-xs text-gray-400">{trend.label}</span>
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 3: Create `components/ui/progress-steps.tsx`**

```tsx
// components/ui/progress-steps.tsx
import { cn } from '@/lib/utils'
import { Check } from 'lucide-react'

interface Step {
  label: string
  description?: string
}

interface ProgressStepsProps {
  steps: Step[]
  currentStep: number // 0-indexed
  className?: string
}

export function ProgressSteps({ steps, currentStep, className }: ProgressStepsProps) {
  return (
    <div className={cn('w-full', className)}>
      <div className="flex items-center">
        {steps.map((step, index) => {
          const isCompleted = index < currentStep
          const isCurrent = index === currentStep
          const isLast = index === steps.length - 1

          return (
            <div key={index} className={cn('flex items-center', !isLast && 'flex-1')}>
              {/* Circle */}
              <div className="flex flex-col items-center">
                <div
                  className={cn(
                    'flex h-9 w-9 items-center justify-center rounded-full border-2 text-sm font-semibold transition-colors',
                    isCompleted && 'border-blue-600 bg-blue-600 text-white',
                    isCurrent && 'border-blue-600 bg-white text-blue-600',
                    !isCompleted && !isCurrent && 'border-gray-300 bg-white text-gray-400'
                  )}
                >
                  {isCompleted ? <Check className="h-5 w-5" /> : index + 1}
                </div>
                <span
                  className={cn(
                    'mt-1 hidden text-xs font-medium sm:block',
                    isCurrent ? 'text-blue-600' : isCompleted ? 'text-gray-700' : 'text-gray-400'
                  )}
                >
                  {step.label}
                </span>
              </div>
              {/* Connector line */}
              {!isLast && (
                <div
                  className={cn(
                    'mb-4 h-0.5 flex-1 transition-colors',
                    index < currentStep ? 'bg-blue-600' : 'bg-gray-200'
                  )}
                />
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
```

- [ ] **Step 4: Commit**

```bash
git add lib/utils.ts components/ui/stat-card.tsx components/ui/progress-steps.tsx
git commit -m "feat: add StatCard, ProgressSteps, extend status colors"
```

---

## Task 3: DataTable, ApprovalQueue, EmptyState Components

**Files:**
- Create: `components/ui/data-table.tsx`
- Create: `components/ui/approval-queue.tsx`
- Create: `components/ui/empty-state.tsx`

- [ ] **Step 1: Create `components/ui/data-table.tsx`**

```tsx
// components/ui/data-table.tsx
'use client'

import { useState } from 'react'
import { cn, getStatusColor } from '@/lib/utils'

export interface Column<T> {
  key: keyof T
  header: string
  render?: (value: T[keyof T], row: T) => React.ReactNode
}

interface DataTableProps<T extends { id: string; status?: string }> {
  columns: Column<T>[]
  data: T[]
  filterKey?: keyof T
  filterOptions?: string[]
  emptyMessage?: string
}

export function DataTable<T extends { id: string; status?: string }>({
  columns,
  data,
  filterKey,
  filterOptions = [],
  emptyMessage = 'No records found.',
}: DataTableProps<T>) {
  const [activeFilter, setActiveFilter] = useState<string>('All')

  const filtered = activeFilter === 'All'
    ? data
    : data.filter((row) => filterKey && row[filterKey] === activeFilter)

  const filters = ['All', ...filterOptions]

  return (
    <div className="w-full">
      {/* Filter Pills */}
      {filterOptions.length > 0 && (
        <div className="mb-4 flex flex-wrap gap-2">
          {filters.map((f) => (
            <button
              key={f}
              onClick={() => setActiveFilter(f)}
              className={cn(
                'rounded-full px-3 py-1 text-xs font-medium transition-colors',
                activeFilter === f
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              )}
            >
              {f}
            </button>
          ))}
        </div>
      )}

      {/* Table */}
      <div className="overflow-x-auto rounded-xl border border-gray-200">
        <table className="w-full text-sm">
          <thead className="bg-gray-50">
            <tr>
              {columns.map((col) => (
                <th
                  key={String(col.key)}
                  className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500"
                >
                  {col.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 bg-white">
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={columns.length} className="px-4 py-8 text-center text-gray-400">
                  {emptyMessage}
                </td>
              </tr>
            ) : (
              filtered.map((row) => (
                <tr key={row.id} className="hover:bg-gray-50 transition-colors">
                  {columns.map((col) => (
                    <td key={String(col.key)} className="px-4 py-3">
                      {col.render
                        ? col.render(row[col.key], row)
                        : String(row[col.key] ?? '')}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
      <p className="mt-2 text-right text-xs text-gray-400">
        {filtered.length} of {data.length} records
      </p>
    </div>
  )
}
```

- [ ] **Step 2: Create `components/ui/approval-queue.tsx`**

```tsx
// components/ui/approval-queue.tsx
'use client'

import { useState } from 'react'
import { CheckCircle, XCircle, Clock, ChevronRight } from 'lucide-react'
import { MockApproval } from '@/lib/mock-data'
import { cn } from '@/lib/utils'

interface ApprovalQueueProps {
  items: MockApproval[]
  onApprove?: (id: string) => void
  onReject?: (id: string) => void
}

export function ApprovalQueue({ items: initial, onApprove, onReject }: ApprovalQueueProps) {
  const [items, setItems] = useState(initial)

  const handleApprove = (id: string) => {
    setItems((prev) => prev.filter((i) => i.id !== id))
    onApprove?.(id)
  }

  const handleReject = (id: string) => {
    setItems((prev) => prev.filter((i) => i.id !== id))
    onReject?.(id)
  }

  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center py-8 text-gray-400">
        <CheckCircle className="h-10 w-10 text-green-400" />
        <p className="mt-2 text-sm">Queue is clear — all caught up!</p>
      </div>
    )
  }

  return (
    <ul className="divide-y divide-gray-100">
      {items.map((item) => (
        <li key={item.id} className="flex items-center justify-between gap-4 py-3">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 shrink-0 text-yellow-500" />
              <p className="truncate text-sm font-medium text-gray-900">
                {item.applicantName} — {item.permitType}
              </p>
            </div>
            <p className="mt-0.5 truncate pl-6 text-xs text-gray-500">
              {item.address} · Submitted {item.submittedDate}
            </p>
            {item.reviewerNote && (
              <p className="mt-0.5 pl-6 text-xs text-orange-600">Note: {item.reviewerNote}</p>
            )}
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <button
              onClick={() => handleApprove(item.id)}
              className="rounded-lg bg-green-50 p-1.5 text-green-600 transition-colors hover:bg-green-100"
              title="Approve"
            >
              <CheckCircle className="h-5 w-5" />
            </button>
            <button
              onClick={() => handleReject(item.id)}
              className="rounded-lg bg-red-50 p-1.5 text-red-600 transition-colors hover:bg-red-100"
              title="Reject"
            >
              <XCircle className="h-5 w-5" />
            </button>
            <ChevronRight className="h-4 w-4 text-gray-300" />
          </div>
        </li>
      ))}
    </ul>
  )
}
```

- [ ] **Step 3: Create `components/ui/empty-state.tsx`**

```tsx
// components/ui/empty-state.tsx
import { LucideIcon } from 'lucide-react'
import { cn } from '@/lib/utils'

interface EmptyStateProps {
  icon: LucideIcon
  heading: string
  description?: string
  action?: React.ReactNode
  className?: string
}

export function EmptyState({ icon: Icon, heading, description, action, className }: EmptyStateProps) {
  return (
    <div className={cn('flex flex-col items-center justify-center py-16 text-center', className)}>
      <div className="rounded-full bg-gray-100 p-4">
        <Icon className="h-8 w-8 text-gray-400" />
      </div>
      <h3 className="mt-4 text-base font-semibold text-gray-900">{heading}</h3>
      {description && <p className="mt-1 max-w-sm text-sm text-gray-500">{description}</p>}
      {action && <div className="mt-6">{action}</div>}
    </div>
  )
}
```

- [ ] **Step 4: Commit**

```bash
git add components/ui/data-table.tsx components/ui/approval-queue.tsx components/ui/empty-state.tsx
git commit -m "feat: add DataTable, ApprovalQueue, and EmptyState components"
```

---

## Task 4: Role-Aware Layout (Header, Sidebar, RoleSwitcher, CitizenLayout)

**Files:**
- Create: `components/layout/role-switcher.tsx`
- Create: `components/layout/citizen-layout.tsx`
- Modify: `components/layout/header.tsx`
- Modify: `components/layout/sidebar.tsx`

- [ ] **Step 1: Create `components/layout/role-switcher.tsx`**

```tsx
// components/layout/role-switcher.tsx
'use client'

import { useRole } from '@/context/RoleContext'
import { ShieldCheck, User } from 'lucide-react'
import { cn } from '@/lib/utils'

export function RoleSwitcher() {
  const { role, toggleRole } = useRole()

  return (
    <button
      onClick={toggleRole}
      className={cn(
        'flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-semibold transition-all',
        role === 'admin'
          ? 'border-blue-200 bg-blue-50 text-blue-700 hover:bg-blue-100'
          : 'border-green-200 bg-green-50 text-green-700 hover:bg-green-100'
      )}
      title={`Currently: ${role}. Click to switch.`}
    >
      {role === 'admin' ? (
        <><ShieldCheck className="h-3.5 w-3.5" /> Admin View</>
      ) : (
        <><User className="h-3.5 w-3.5" /> Citizen View</>
      )}
    </button>
  )
}
```

- [ ] **Step 2: Update `components/layout/header.tsx`**

Replace the existing `Header` component with this enhanced version that adds search, notifications, and the role switcher:

```tsx
// components/layout/header.tsx
'use client'

import { useSession } from 'next-auth/react'
import { Bell, Search } from 'lucide-react'
import { RoleSwitcher } from './role-switcher'

export function Header() {
  const { data: session } = useSession()

  return (
    <header className="flex h-16 items-center justify-between border-b border-gray-200 bg-white px-6">
      {/* Left: Search */}
      <div className="flex items-center gap-3">
        <div className="relative hidden sm:block">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Search permits, applications..."
            className="h-9 w-64 rounded-lg border border-gray-200 bg-gray-50 pl-9 pr-4 text-sm text-gray-700 placeholder:text-gray-400 focus:border-blue-400 focus:bg-white focus:outline-none focus:ring-1 focus:ring-blue-400"
          />
        </div>
      </div>

      {/* Right: Role switcher, notifications, avatar */}
      <div className="flex items-center gap-3">
        <RoleSwitcher />

        <button className="relative rounded-lg p-2 text-gray-500 hover:bg-gray-100" title="Notifications">
          <Bell className="h-5 w-5" />
          {/* Notification dot */}
          <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-red-500" />
        </button>

        {session?.user && (
          <div className="flex items-center gap-2">
            <div className="hidden text-right sm:block">
              <p className="text-sm font-medium text-gray-900">{session.user.name}</p>
              <p className="text-xs text-gray-500 capitalize">{session.user.role ?? 'user'}</p>
            </div>
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-600 text-sm font-semibold text-white">
              {session.user.name?.charAt(0).toUpperCase()}
            </div>
          </div>
        )}
      </div>
    </header>
  )
}
```

- [ ] **Step 3: Update `components/layout/sidebar.tsx`**

Replace the sidebar with a role-aware version. Key changes: different nav items for admin vs citizen, updated styling to match the new design system (keeping dark sidebar but adding new nav items):

```tsx
// components/layout/sidebar.tsx
'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useSession } from 'next-auth/react'
import { useRole } from '@/context/RoleContext'
import { cn } from '@/lib/utils'
import {
  LayoutDashboard,
  FileText,
  Users,
  Wrench,
  BarChart3,
  Settings,
  LogOut,
  CheckSquare,
  PlusCircle,
  ClipboardList,
} from 'lucide-react'

const adminNav = [
  { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { name: 'Applications', href: '/applications', icon: ClipboardList },
  { name: 'Approvals', href: '/approvals', icon: CheckSquare },
  { name: 'Reports', href: '/reports', icon: BarChart3 },
  { name: 'Users', href: '/users', icon: Users },
]

const citizenNav = [
  { name: 'Home', href: '/dashboard', icon: LayoutDashboard },
  { name: 'My Applications', href: '/applications', icon: FileText },
  { name: 'Apply for Permit', href: '/new-application', icon: PlusCircle },
  { name: 'Permit Status', href: '/approvals', icon: CheckSquare },
]

export function Sidebar() {
  const pathname = usePathname()
  const { data: session } = useSession()
  const { role } = useRole()
  const isAdmin = session?.user?.role === 'admin'
  const nav = role === 'admin' ? adminNav : citizenNav

  return (
    <div className="flex h-screen w-64 flex-col bg-gray-900 text-white">
      <div className="flex h-16 items-center gap-3 border-b border-gray-800 px-6">
        <div className="rounded-lg bg-blue-600 p-1.5">
          <FileText className="h-4 w-4 text-white" />
        </div>
        <h1 className="text-lg font-bold">PermitPro</h1>
      </div>

      <nav className="flex-1 space-y-0.5 px-3 py-4">
        {nav.map((item) => {
          const Icon = item.icon
          const isActive = pathname === item.href || pathname?.startsWith(item.href + '/')
          return (
            <Link
              key={item.name}
              href={item.href}
              className={cn(
                'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors',
                isActive
                  ? 'bg-blue-600 text-white'
                  : 'text-gray-300 hover:bg-gray-800 hover:text-white'
              )}
            >
              <Icon className="h-4 w-4 shrink-0" />
              {item.name}
            </Link>
          )
        })}
        {role === 'admin' && isAdmin && (
          <>
            <div className="my-2 border-t border-gray-800" />
            <Link
              href="/settings"
              className={cn(
                'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors',
                pathname === '/settings' ? 'bg-blue-600 text-white' : 'text-gray-300 hover:bg-gray-800 hover:text-white'
              )}
            >
              <Settings className="h-4 w-4 shrink-0" />
              Settings
            </Link>
          </>
        )}
      </nav>

      <div className="border-t border-gray-800 p-4">
        {role === 'citizen' && (
          <Link
            href="/new-application"
            className="mb-3 flex w-full items-center justify-center gap-2 rounded-lg bg-blue-600 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 transition-colors"
          >
            <PlusCircle className="h-4 w-4" />
            Apply for Permit
          </Link>
        )}
        <Link
          href="/api/auth/signout"
          className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-gray-300 transition-colors hover:bg-gray-800 hover:text-white"
        >
          <LogOut className="h-4 w-4 shrink-0" />
          Sign Out
        </Link>
      </div>
    </div>
  )
}
```

- [ ] **Step 4: Create `components/layout/citizen-layout.tsx`**

A simplified top-nav layout for citizen-heavy pages (used as an alternative or within `AppLayout` for citizen role):

```tsx
// components/layout/citizen-layout.tsx
'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { FileText, PlusCircle, ClipboardList, HelpCircle, Bell } from 'lucide-react'
import { cn } from '@/lib/utils'
import { RoleSwitcher } from './role-switcher'

const citizenTopNav = [
  { name: 'Home', href: '/dashboard' },
  { name: 'Apply for Permit', href: '/new-application' },
  { name: 'My Applications', href: '/applications' },
  { name: 'Help', href: '/help' },
]

export function CitizenLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Top Nav */}
      <header className="sticky top-0 z-20 border-b border-gray-200 bg-white shadow-sm">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-blue-600 p-1.5">
              <FileText className="h-4 w-4 text-white" />
            </div>
            <span className="text-lg font-bold text-gray-900">PermitPro</span>
          </div>
          <nav className="hidden items-center gap-1 md:flex">
            {citizenTopNav.map((item) => (
              <Link
                key={item.name}
                href={item.href}
                className={cn(
                  'rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                  pathname === item.href
                    ? 'bg-blue-50 text-blue-700'
                    : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                )}
              >
                {item.name}
              </Link>
            ))}
          </nav>
          <div className="flex items-center gap-3">
            <RoleSwitcher />
            <Link
              href="/new-application"
              className="hidden rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 sm:block"
            >
              + New Permit
            </Link>
          </div>
        </div>
      </header>

      {/* Main */}
      <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
        {children}
      </main>
    </div>
  )
}
```

- [ ] **Step 5: Commit**

```bash
git add components/layout/role-switcher.tsx components/layout/citizen-layout.tsx components/layout/header.tsx components/layout/sidebar.tsx
git commit -m "feat: role-aware layout with RoleSwitcher, updated Header and Sidebar"
```

---

## Task 5: Role-Aware Dashboard

**Files:**
- Modify: `app/dashboard/page.tsx`

The existing dashboard is a server component with Prisma queries. We'll convert it to a hybrid: server shell that passes data to a client component for role branching.

- [ ] **Step 1: Create `app/dashboard/_components/DashboardClient.tsx`**

```tsx
// app/dashboard/_components/DashboardClient.tsx
'use client'

import { useRole } from '@/context/RoleContext'
import { AppLayout } from '@/components/layout/app-layout'
import { StatCard } from '@/components/ui/stat-card'
import { ApprovalQueue } from '@/components/ui/approval-queue'
import { DataTable, Column } from '@/components/ui/data-table'
import { StatusBadge } from '@/components/ui/badge'
import { EmptyState } from '@/components/ui/empty-state'
import {
  mockAdminStats,
  mockCitizenStats,
  mockApplications,
  myApplications,
  mockApprovals,
  MockApplication,
} from '@/lib/mock-data'
import { FileText, Clock, CheckCircle, AlertTriangle, PlusCircle } from 'lucide-react'
import Link from 'next/link'
import { getStatusColor } from '@/lib/utils'

const appColumns: Column<MockApplication>[] = [
  { key: 'id', header: 'ID' },
  { key: 'permitType', header: 'Type' },
  { key: 'address', header: 'Address' },
  { key: 'submittedDate', header: 'Submitted' },
  {
    key: 'status',
    header: 'Status',
    render: (val) => (
      <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${getStatusColor(String(val))}`}>
        {String(val)}
      </span>
    ),
  },
]

function AdminDashboard() {
  const stats = mockAdminStats
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Admin Dashboard</h1>
      </div>

      {/* Stat Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard title="Total Applications" value={stats.totalApplications} icon={FileText} iconColor="text-blue-600" subtitle="All time" />
        <StatCard title="Pending Review" value={stats.pending} icon={Clock} iconColor="text-yellow-600" subtitle="Awaiting action" />
        <StatCard title="Approved" value={stats.approved} icon={CheckCircle} iconColor="text-green-600" subtitle="This year" />
        <StatCard title="Overdue" value={stats.overdue} icon={AlertTriangle} iconColor="text-red-600" subtitle="Requires attention" />
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Recent Applications Table */}
        <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm lg:col-span-2">
          <h2 className="mb-4 text-base font-semibold text-gray-900">Recent Submissions</h2>
          <DataTable
            columns={appColumns}
            data={mockApplications}
            filterKey="status"
            filterOptions={['Pending', 'InReview', 'Approved', 'Rejected', 'Overdue']}
          />
        </div>

        {/* Approval Queue */}
        <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
          <h2 className="mb-4 text-base font-semibold text-gray-900">
            Approval Queue
            <span className="ml-2 rounded-full bg-yellow-100 px-2 py-0.5 text-xs text-yellow-700">
              {mockApprovals.length} pending
            </span>
          </h2>
          <ApprovalQueue items={mockApprovals} />
        </div>
      </div>
    </div>
  )
}

function CitizenDashboard() {
  const stats = mockCitizenStats
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">My Permits</h1>
          <p className="text-sm text-gray-500">Track your permit applications</p>
        </div>
        <Link
          href="/new-application"
          className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 transition-colors"
        >
          <PlusCircle className="h-4 w-4" />
          Apply for Permit
        </Link>
      </div>

      {/* Status Cards */}
      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard title="In Review" value={stats.inReview} icon={Clock} iconColor="text-yellow-600" subtitle="Being processed" />
        <StatCard title="Approved" value={stats.approved} icon={CheckCircle} iconColor="text-green-600" subtitle="Ready to proceed" />
        <StatCard title="Rejected" value={stats.rejected} icon={AlertTriangle} iconColor="text-red-600" subtitle="Needs attention" />
      </div>

      {/* My Applications */}
      <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
        <h2 className="mb-4 text-base font-semibold text-gray-900">My Recent Applications</h2>
        {myApplications.length === 0 ? (
          <EmptyState
            icon={FileText}
            heading="No applications yet"
            description="Start your first permit application and we'll guide you through the process."
            action={
              <Link href="/new-application" className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700">
                Apply Now
              </Link>
            }
          />
        ) : (
          <DataTable
            columns={appColumns}
            data={myApplications}
            filterKey="status"
            filterOptions={['Pending', 'InReview', 'Approved', 'Rejected']}
          />
        )}
      </div>
    </div>
  )
}

export function DashboardClient() {
  const { role } = useRole()
  return (
    <AppLayout>
      {role === 'admin' ? <AdminDashboard /> : <CitizenDashboard />}
    </AppLayout>
  )
}
```

- [ ] **Step 2: Update `app/dashboard/page.tsx`**

Replace the server component body with a redirect that renders the client component. Keep the auth check server-side:

```tsx
// app/dashboard/page.tsx
export const dynamic = 'force-dynamic'

import { redirect } from 'next/navigation'
import { getSession } from '@/lib/auth-helpers'
import { DashboardClient } from './_components/DashboardClient'

export default async function DashboardPage() {
  const session = await getSession()
  if (!session) redirect('/login')
  return <DashboardClient />
}
```

- [ ] **Step 3: Commit**

```bash
git add app/dashboard/page.tsx app/dashboard/_components/DashboardClient.tsx
git commit -m "feat: role-aware dashboard with admin metrics and citizen permit view"
```

---

## Task 6: Applications Page

**Files:**
- Create: `app/applications/page.tsx`

- [ ] **Step 1: Create `app/applications/page.tsx`**

```tsx
// app/applications/page.tsx
export const dynamic = 'force-dynamic'

import { redirect } from 'next/navigation'
import { getSession } from '@/lib/auth-helpers'
import { ApplicationsClient } from './_components/ApplicationsClient'

export default async function ApplicationsPage() {
  const session = await getSession()
  if (!session) redirect('/login')
  return <ApplicationsClient />
}
```

- [ ] **Step 2: Create `app/applications/_components/ApplicationsClient.tsx`**

```tsx
// app/applications/_components/ApplicationsClient.tsx
'use client'

import { useRole } from '@/context/RoleContext'
import { AppLayout } from '@/components/layout/app-layout'
import { DataTable, Column } from '@/components/ui/data-table'
import { EmptyState } from '@/components/ui/empty-state'
import { mockApplications, myApplications, MockApplication } from '@/lib/mock-data'
import { getStatusColor } from '@/lib/utils'
import { FileText, Eye, Edit, Trash2 } from 'lucide-react'
import Link from 'next/link'

const statusCell = (val: unknown) => (
  <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${getStatusColor(String(val))}`}>
    {String(val)}
  </span>
)

const adminColumns: Column<MockApplication>[] = [
  { key: 'id', header: 'App ID' },
  { key: 'ownerName', header: 'Applicant' },
  { key: 'permitType', header: 'Type' },
  { key: 'address', header: 'Address' },
  { key: 'contractorName', header: 'Contractor' },
  { key: 'submittedDate', header: 'Submitted' },
  { key: 'status', header: 'Status', render: statusCell },
  {
    key: 'id',
    header: 'Actions',
    render: (id) => (
      <div className="flex items-center gap-1">
        <button className="rounded p-1 text-gray-400 hover:text-blue-600" title="View"><Eye className="h-4 w-4" /></button>
        <button className="rounded p-1 text-gray-400 hover:text-green-600" title="Edit"><Edit className="h-4 w-4" /></button>
      </div>
    ),
  },
]

const citizenColumns: Column<MockApplication>[] = [
  { key: 'id', header: 'App ID' },
  { key: 'permitType', header: 'Permit Type' },
  { key: 'address', header: 'Property' },
  { key: 'submittedDate', header: 'Submitted' },
  { key: 'status', header: 'Status', render: statusCell },
]

function AdminApplications() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">All Applications</h1>
        <span className="rounded-lg bg-gray-100 px-3 py-1 text-sm text-gray-600">{mockApplications.length} total</span>
      </div>
      <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
        <DataTable
          columns={adminColumns}
          data={mockApplications}
          filterKey="status"
          filterOptions={['Pending', 'InReview', 'Approved', 'Rejected', 'Overdue']}
          emptyMessage="No applications found."
        />
      </div>
    </div>
  )
}

function CitizenApplications() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">My Applications</h1>
        <Link
          href="/new-application"
          className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 transition-colors"
        >
          + New Application
        </Link>
      </div>
      {myApplications.length === 0 ? (
        <EmptyState
          icon={FileText}
          heading="No applications yet"
          description="Submit your first permit application to get started."
          action={
            <Link href="/new-application" className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700">
              Apply Now
            </Link>
          }
        />
      ) : (
        <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
          <DataTable
            columns={citizenColumns}
            data={myApplications}
            filterKey="status"
            filterOptions={['Pending', 'InReview', 'Approved', 'Rejected']}
          />
        </div>
      )}
    </div>
  )
}

export function ApplicationsClient() {
  const { role } = useRole()
  return (
    <AppLayout>
      {role === 'admin' ? <AdminApplications /> : <CitizenApplications />}
    </AppLayout>
  )
}
```

- [ ] **Step 3: Commit**

```bash
git add app/applications/page.tsx app/applications/_components/ApplicationsClient.tsx
git commit -m "feat: role-aware Applications page"
```

---

## Task 7: Approvals Page

**Files:**
- Create: `app/approvals/page.tsx`
- Create: `app/approvals/_components/ApprovalsClient.tsx`

- [ ] **Step 1: Create `app/approvals/page.tsx`**

```tsx
// app/approvals/page.tsx
export const dynamic = 'force-dynamic'
import { redirect } from 'next/navigation'
import { getSession } from '@/lib/auth-helpers'
import { ApprovalsClient } from './_components/ApprovalsClient'

export default async function ApprovalsPage() {
  const session = await getSession()
  if (!session) redirect('/login')
  return <ApprovalsClient />
}
```

- [ ] **Step 2: Create `app/approvals/_components/ApprovalsClient.tsx`**

```tsx
// app/approvals/_components/ApprovalsClient.tsx
'use client'

import { useRole } from '@/context/RoleContext'
import { AppLayout } from '@/components/layout/app-layout'
import { ApprovalQueue } from '@/components/ui/approval-queue'
import { mockApprovals, myApplications } from '@/lib/mock-data'
import { getStatusColor } from '@/lib/utils'
import { CheckCircle, Clock, Info } from 'lucide-react'

function AdminApprovals() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Approval Queue</h1>
        <span className="flex items-center gap-1.5 rounded-lg bg-yellow-50 px-3 py-1.5 text-sm font-medium text-yellow-700">
          <Clock className="h-4 w-4" />
          {mockApprovals.length} pending
        </span>
      </div>
      <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
        <p className="mb-4 text-sm text-gray-500">
          Review pending permit applications. Use the approve or reject buttons to take action.
        </p>
        <ApprovalQueue items={mockApprovals} />
      </div>
    </div>
  )
}

function CitizenApprovals() {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">Permit Status</h1>
      <div className="rounded-xl border border-blue-100 bg-blue-50 p-4 flex items-start gap-3">
        <Info className="mt-0.5 h-5 w-5 shrink-0 text-blue-600" />
        <p className="text-sm text-blue-800">
          This page shows the approval status of your permit applications. Contact your local planning office for questions.
        </p>
      </div>
      <div className="space-y-4">
        {myApplications.map((app) => (
          <div key={app.id} className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="font-semibold text-gray-900">{app.permitType} — {app.address}</p>
                <p className="mt-0.5 text-sm text-gray-500">Application ID: {app.id} · Submitted {app.submittedDate}</p>
              </div>
              <span className={`mt-0.5 inline-flex shrink-0 items-center rounded-full px-3 py-1 text-xs font-semibold ${getStatusColor(app.status)}`}>
                {app.status}
              </span>
            </div>
            {app.status === 'InReview' && (
              <p className="mt-3 flex items-center gap-1.5 text-xs text-yellow-700">
                <Clock className="h-3.5 w-3.5" />
                Your application is currently under review. Expected decision within 5–10 business days.
              </p>
            )}
            {app.status === 'Approved' && (
              <p className="mt-3 flex items-center gap-1.5 text-xs text-green-700">
                <CheckCircle className="h-3.5 w-3.5" />
                Approved! You may proceed with your project. Check your email for the permit document.
              </p>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

export function ApprovalsClient() {
  const { role } = useRole()
  return (
    <AppLayout>
      {role === 'admin' ? <AdminApprovals /> : <CitizenApprovals />}
    </AppLayout>
  )
}
```

- [ ] **Step 3: Commit**

```bash
git add app/approvals/page.tsx app/approvals/_components/ApprovalsClient.tsx
git commit -m "feat: role-aware Approvals page"
```

---

## Task 8: Users Page

**Files:**
- Create: `app/users/page.tsx`
- Create: `app/users/_components/UsersClient.tsx`

- [ ] **Step 1: Create `app/users/page.tsx`**

```tsx
// app/users/page.tsx
export const dynamic = 'force-dynamic'
import { redirect } from 'next/navigation'
import { getSession } from '@/lib/auth-helpers'
import { UsersClient } from './_components/UsersClient'

export default async function UsersPage() {
  const session = await getSession()
  if (!session) redirect('/login')
  return <UsersClient />
}
```

- [ ] **Step 2: Create `app/users/_components/UsersClient.tsx`**

```tsx
// app/users/_components/UsersClient.tsx
'use client'

import { useRole } from '@/context/RoleContext'
import { AppLayout } from '@/components/layout/app-layout'
import { DataTable, Column } from '@/components/ui/data-table'
import { mockUsers, MockUser } from '@/lib/mock-data'
import { getStatusColor } from '@/lib/utils'
import { UserPlus, Phone, Mail, HelpCircle } from 'lucide-react'

const userRoleColor: Record<string, string> = {
  admin: 'bg-purple-100 text-purple-800',
  reviewer: 'bg-blue-100 text-blue-800',
  citizen: 'bg-gray-100 text-gray-700',
}

const adminColumns: Column<MockUser>[] = [
  { key: 'name', header: 'Name' },
  { key: 'email', header: 'Email' },
  {
    key: 'role',
    header: 'Role',
    render: (val) => (
      <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium capitalize ${userRoleColor[String(val)] ?? 'bg-gray-100 text-gray-700'}`}>
        {String(val)}
      </span>
    ),
  },
  { key: 'department', header: 'Department' },
  { key: 'joinedDate', header: 'Joined' },
]

function AdminUsers() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">User Management</h1>
        <button className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 transition-colors">
          <UserPlus className="h-4 w-4" />
          Add User
        </button>
      </div>
      <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
        <DataTable
          columns={adminColumns}
          data={mockUsers}
          filterKey="role"
          filterOptions={['admin', 'reviewer', 'citizen']}
        />
      </div>
    </div>
  )
}

function CitizenProfile() {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">My Account</h1>

      {/* Profile Card */}
      <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
        <h2 className="mb-4 text-base font-semibold text-gray-900">Profile</h2>
        <div className="flex items-center gap-4">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-blue-600 text-2xl font-bold text-white">
            J
          </div>
          <div>
            <p className="text-lg font-semibold text-gray-900">Jane Citizen</p>
            <p className="text-sm text-gray-500">jane@example.com</p>
            <span className="mt-1 inline-flex items-center rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-medium text-gray-700">Citizen</span>
          </div>
        </div>
      </div>

      {/* Support */}
      <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
        <h2 className="mb-4 text-base font-semibold text-gray-900">Need Help?</h2>
        <div className="space-y-3">
          <div className="flex items-center gap-3 text-sm text-gray-700">
            <Phone className="h-5 w-5 text-blue-500" />
            <span>Planning Office: (555) 555-0100</span>
          </div>
          <div className="flex items-center gap-3 text-sm text-gray-700">
            <Mail className="h-5 w-5 text-blue-500" />
            <span>permits@city.gov</span>
          </div>
          <div className="flex items-center gap-3 text-sm text-gray-700">
            <HelpCircle className="h-5 w-5 text-blue-500" />
            <a href="#" className="text-blue-600 hover:underline">Permit FAQ & Guide</a>
          </div>
        </div>
      </div>
    </div>
  )
}

export function UsersClient() {
  const { role } = useRole()
  return (
    <AppLayout>
      {role === 'admin' ? <AdminUsers /> : <CitizenProfile />}
    </AppLayout>
  )
}
```

- [ ] **Step 3: Commit**

```bash
git add app/users/page.tsx app/users/_components/UsersClient.tsx
git commit -m "feat: role-aware Users page (admin management / citizen profile)"
```

---

## Task 9: Reports Page (Role-Aware)

**Files:**
- Modify: `app/reports/page.tsx`

The existing `/reports` page uses Prisma. We keep the server shell and add a client component for role branching.

- [ ] **Step 1: Read current `app/reports/page.tsx`** to understand existing structure before modifying.

- [ ] **Step 2: Create `app/reports/_components/ReportsClient.tsx`**

```tsx
// app/reports/_components/ReportsClient.tsx
'use client'

import { useRole } from '@/context/RoleContext'
import { AppLayout } from '@/components/layout/app-layout'
import { StatCard } from '@/components/ui/stat-card'
import { mockAdminStats, myApplications } from '@/lib/mock-data'
import { BarChart3, Download, TrendingUp, FileText, Calendar } from 'lucide-react'
import { getStatusColor } from '@/lib/utils'

function AdminReports() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Reports & Analytics</h1>
        <button className="flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors shadow-sm">
          <Download className="h-4 w-4" />
          Export CSV
        </button>
      </div>

      {/* Summary Stats */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard title="Total Applications" value={mockAdminStats.totalApplications} icon={FileText} />
        <StatCard title="Approval Rate" value="61%" icon={TrendingUp} iconColor="text-green-600" subtitle="87 of 142 approved" />
        <StatCard title="Avg Processing Time" value="7.4 days" icon={Calendar} iconColor="text-blue-600" />
        <StatCard title="Overdue Rate" value="8.5%" icon={BarChart3} iconColor="text-red-600" subtitle="12 overdue" />
      </div>

      {/* Permit Type Breakdown */}
      <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
        <h2 className="mb-4 text-base font-semibold text-gray-900">Applications by Permit Type</h2>
        <div className="space-y-3">
          {[
            { type: 'Fence', count: 38, pct: 27 },
            { type: 'Renovation', count: 29, pct: 20 },
            { type: 'Addition', count: 24, pct: 17 },
            { type: 'Deck', count: 21, pct: 15 },
            { type: 'Pool', count: 17, pct: 12 },
            { type: 'Other', count: 13, pct: 9 },
          ].map((row) => (
            <div key={row.type} className="flex items-center gap-3">
              <span className="w-24 text-sm text-gray-700">{row.type}</span>
              <div className="flex-1 rounded-full bg-gray-100">
                <div className="h-2 rounded-full bg-blue-500" style={{ width: `${row.pct}%` }} />
              </div>
              <span className="w-12 text-right text-sm text-gray-500">{row.count}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Monthly Trend */}
      <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
        <h2 className="mb-1 text-base font-semibold text-gray-900">Monthly Submissions (2026)</h2>
        <p className="mb-4 text-xs text-gray-400">Mock data — connect to real analytics when backend is ready</p>
        <div className="flex items-end gap-3">
          {[
            { month: 'Jan', val: 18 },
            { month: 'Feb', val: 24 },
            { month: 'Mar', val: 31 },
          ].map((d) => (
            <div key={d.month} className="flex flex-col items-center gap-1">
              <span className="text-xs text-gray-500">{d.val}</span>
              <div className="w-12 rounded-t bg-blue-400" style={{ height: `${d.val * 3}px` }} />
              <span className="text-xs text-gray-500">{d.month}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

function CitizenReports() {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">My Permit History</h1>
      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard title="Total Submitted" value={myApplications.length} icon={FileText} />
        <StatCard title="Approved" value={myApplications.filter(a => a.status === 'Approved').length} icon={TrendingUp} iconColor="text-green-600" />
        <StatCard title="In Progress" value={myApplications.filter(a => a.status === 'InReview' || a.status === 'Pending').length} icon={Calendar} iconColor="text-blue-600" />
      </div>

      <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
        <h2 className="mb-4 text-base font-semibold text-gray-900">Application History</h2>
        <div className="space-y-3">
          {myApplications.map((app) => (
            <div key={app.id} className="flex items-center justify-between rounded-lg bg-gray-50 px-4 py-3">
              <div>
                <p className="text-sm font-medium text-gray-900">{app.permitType} — {app.address}</p>
                <p className="text-xs text-gray-500">Submitted {app.submittedDate}</p>
              </div>
              <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${getStatusColor(app.status)}`}>
                {app.status}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

export function ReportsClient() {
  const { role } = useRole()
  return (
    <AppLayout>
      {role === 'admin' ? <AdminReports /> : <CitizenReports />}
    </AppLayout>
  )
}
```

- [ ] **Step 3: Update `app/reports/page.tsx`**

Read the existing file and replace the body to use `ReportsClient`, keeping the auth check:

```tsx
// app/reports/page.tsx
export const dynamic = 'force-dynamic'
import { redirect } from 'next/navigation'
import { getSession } from '@/lib/auth-helpers'
import { ReportsClient } from './_components/ReportsClient'

export default async function ReportsPage() {
  const session = await getSession()
  if (!session) redirect('/login')
  return <ReportsClient />
}
```

- [ ] **Step 4: Commit**

```bash
git add app/reports/page.tsx app/reports/_components/ReportsClient.tsx
git commit -m "feat: role-aware Reports page with mock charts and citizen history"
```

---

## Task 10: New Application Wizard — Step 1 (Permit Details)

**Files:**
- Create: `app/new-application/page.tsx`
- Create: `app/new-application/_components/WizardShell.tsx`
- Create: `app/new-application/_components/Step1PermitDetails.tsx`

- [ ] **Step 1: Create `app/new-application/_components/WizardShell.tsx`**

This shell manages top-level wizard state, localStorage persistence, and step routing.

```tsx
// app/new-application/_components/WizardShell.tsx
'use client'

import { useState, useEffect } from 'react'
import { ProgressSteps } from '@/components/ui/progress-steps'
import { Step1PermitDetails } from './Step1PermitDetails'
import { Step2ContractorSelection } from './Step2ContractorSelection'
import { Step3ReviewSubmit } from './Step3ReviewSubmit'
import { useRole } from '@/context/RoleContext'
import { ShieldAlert } from 'lucide-react'

const STEPS = [
  { label: 'Permit Details' },
  { label: 'Contractor' },
  { label: 'Review & Submit' },
]

export interface PermitFormData {
  customerName: string
  propertyId: string
  propertyAddress: string
  permitType: string
  description: string
}

export interface ContractorData {
  id: string
  name: string
  company: string
  licenseNumber: string
  phone: string
  email: string
  address: string
}

export interface UploadedFile {
  name: string
  type: string
  size: number
}

const STORAGE_KEYS = {
  step: 'permit_wizard_step',
  permitData: 'permit_wizard_permit_data',
  contractor: 'permit_wizard_contractor',
  files: 'permit_wizard_files',
}

export function WizardShell() {
  const { role } = useRole()
  const [currentStep, setCurrentStep] = useState(0)
  const [permitData, setPermitData] = useState<PermitFormData>({
    customerName: '', propertyId: '', propertyAddress: '', permitType: '', description: '',
  })
  const [contractor, setContractor] = useState<ContractorData | null>(null)
  const [files, setFiles] = useState<UploadedFile[]>([])
  const [submitted, setSubmitted] = useState(false)

  // Restore from localStorage on mount
  useEffect(() => {
    try {
      const savedStep = localStorage.getItem(STORAGE_KEYS.step)
      const savedPermit = localStorage.getItem(STORAGE_KEYS.permitData)
      const savedContractor = localStorage.getItem(STORAGE_KEYS.contractor)
      const savedFiles = localStorage.getItem(STORAGE_KEYS.files)
      if (savedStep) setCurrentStep(Number(savedStep))
      if (savedPermit) setPermitData(JSON.parse(savedPermit))
      if (savedContractor) setContractor(JSON.parse(savedContractor))
      if (savedFiles) setFiles(JSON.parse(savedFiles))
    } catch (_) { /* ignore parse errors */ }
  }, [])

  const updatePermitData = (data: Partial<PermitFormData>) => {
    const updated = { ...permitData, ...data }
    setPermitData(updated)
    localStorage.setItem(STORAGE_KEYS.permitData, JSON.stringify(updated))
  }

  const updateContractor = (c: ContractorData | null) => {
    setContractor(c)
    if (c) localStorage.setItem(STORAGE_KEYS.contractor, JSON.stringify(c))
    else localStorage.removeItem(STORAGE_KEYS.contractor)
  }

  const updateFiles = (f: UploadedFile[]) => {
    setFiles(f)
    localStorage.setItem(STORAGE_KEYS.files, JSON.stringify(f))
  }

  const goToStep = (step: number) => {
    setCurrentStep(step)
    localStorage.setItem(STORAGE_KEYS.step, String(step))
  }

  const handleSubmit = () => {
    // Clear localStorage after successful submission
    Object.values(STORAGE_KEYS).forEach((k) => localStorage.removeItem(k))
    setSubmitted(true)
  }

  // Access control
  if (role !== 'citizen') {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 text-center">
        <div className="rounded-full bg-red-100 p-4">
          <ShieldAlert className="h-10 w-10 text-red-500" />
        </div>
        <h2 className="text-xl font-bold text-gray-900">Access Denied</h2>
        <p className="max-w-sm text-sm text-gray-500">
          This page is only available to citizens. Use the role switcher in the header to switch to Citizen View.
        </p>
      </div>
    )
  }

  if (submitted) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 text-center">
        <div className="rounded-full bg-green-100 p-4">
          <svg className="h-10 w-10 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <h2 className="text-2xl font-bold text-gray-900">Application Submitted!</h2>
        <p className="max-w-sm text-sm text-gray-500">
          Your permit application has been received. You'll receive a confirmation email shortly. Track your status in <strong>My Applications</strong>.
        </p>
        <div className="flex gap-3">
          <a href="/applications" className="rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-blue-700">
            View My Applications
          </a>
          <a href="/dashboard" className="rounded-lg border border-gray-200 bg-white px-5 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50">
            Back to Home
          </a>
        </div>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-2xl">
      {/* Sticky progress header */}
      <div className="sticky top-0 z-10 mb-8 rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
        <h1 className="mb-4 text-center text-lg font-bold text-gray-900">New Permit Application</h1>
        <ProgressSteps steps={STEPS} currentStep={currentStep} />
      </div>

      {currentStep === 0 && (
        <Step1PermitDetails
          data={permitData}
          files={files}
          onChange={updatePermitData}
          onFilesChange={updateFiles}
          onNext={() => goToStep(1)}
        />
      )}
      {currentStep === 1 && (
        <Step2ContractorSelection
          selected={contractor}
          onSelect={updateContractor}
          onBack={() => goToStep(0)}
          onNext={() => goToStep(2)}
        />
      )}
      {currentStep === 2 && (
        <Step3ReviewSubmit
          permitData={permitData}
          contractor={contractor}
          files={files}
          onBack={() => goToStep(1)}
          onSubmit={handleSubmit}
        />
      )}
    </div>
  )
}
```

- [ ] **Step 2: Create `app/new-application/_components/Step1PermitDetails.tsx`**

```tsx
// app/new-application/_components/Step1PermitDetails.tsx
'use client'

import { useState, useRef } from 'react'
import { PermitFormData, UploadedFile } from './WizardShell'
import { Upload, X, FileText, Image as ImageIcon, AlertCircle } from 'lucide-react'
import { cn } from '@/lib/utils'

const PERMIT_TYPES = ['Fence', 'Renovation', 'Addition', 'Deck', 'Pool', 'Shed', 'Solar Panels', 'Other']
const MAX_FILE_SIZE = 5 * 1024 * 1024 // 5MB
const ACCEPTED_TYPES = ['application/pdf', 'image/jpeg', 'image/png']

interface Props {
  data: PermitFormData
  files: UploadedFile[]
  onChange: (data: Partial<PermitFormData>) => void
  onFilesChange: (files: UploadedFile[]) => void
  onNext: () => void
}

export function Step1PermitDetails({ data, files, onChange, onFilesChange, onNext }: Props) {
  const [touched, setTouched] = useState<Record<string, boolean>>({})
  const [fileError, setFileError] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const required = ['customerName', 'propertyId', 'propertyAddress'] as const
  const errors: Partial<Record<keyof PermitFormData, string>> = {}
  if (!data.customerName.trim()) errors.customerName = 'Customer name is required'
  if (!data.propertyId.trim()) errors.propertyId = 'Property ID is required'
  if (!data.propertyAddress.trim()) errors.propertyAddress = 'Property address is required'

  const isValid = Object.keys(errors).length === 0
  const blur = (field: string) => setTouched((t) => ({ ...t, [field]: true }))

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = Array.from(e.target.files ?? [])
    setFileError(null)
    const newFiles: UploadedFile[] = []
    for (const f of selected) {
      if (!ACCEPTED_TYPES.includes(f.type)) {
        setFileError(`"${f.name}" is not a supported format (PDF, JPG, PNG only).`)
        return
      }
      if (f.size > MAX_FILE_SIZE) {
        setFileError(`"${f.name}" exceeds the 5MB size limit.`)
        return
      }
      newFiles.push({ name: f.name, type: f.type, size: f.size })
    }
    onFilesChange([...files, ...newFiles])
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  const removeFile = (index: number) => {
    onFilesChange(files.filter((_, i) => i !== index))
  }

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm space-y-5">
      <div>
        <h2 className="text-lg font-semibold text-gray-900">Step 1: Permit Details</h2>
        <p className="mt-1 text-sm text-gray-500">Tell us about the property and type of permit you need.</p>
      </div>

      {/* Customer Name */}
      <div>
        <label className="mb-1 block text-sm font-medium text-gray-700">
          Customer Name <span className="text-red-500">*</span>
        </label>
        <input
          value={data.customerName}
          onChange={(e) => onChange({ customerName: e.target.value })}
          onBlur={() => blur('customerName')}
          className={cn(
            'w-full rounded-lg border px-3 py-2.5 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500',
            touched.customerName && errors.customerName ? 'border-red-400' : 'border-gray-300'
          )}
          placeholder="e.g. Jane Smith"
        />
        {touched.customerName && errors.customerName && (
          <p className="mt-1 flex items-center gap-1 text-xs text-red-600"><AlertCircle className="h-3.5 w-3.5" />{errors.customerName}</p>
        )}
      </div>

      {/* Property ID */}
      <div>
        <label className="mb-1 block text-sm font-medium text-gray-700">
          Property ID <span className="text-red-500">*</span>
        </label>
        <input
          value={data.propertyId}
          onChange={(e) => onChange({ propertyId: e.target.value })}
          onBlur={() => blur('propertyId')}
          className={cn(
            'w-full rounded-lg border px-3 py-2.5 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500',
            touched.propertyId && errors.propertyId ? 'border-red-400' : 'border-gray-300'
          )}
          placeholder="e.g. 123-456-789"
        />
        {touched.propertyId && errors.propertyId && (
          <p className="mt-1 flex items-center gap-1 text-xs text-red-600"><AlertCircle className="h-3.5 w-3.5" />{errors.propertyId}</p>
        )}
      </div>

      {/* Property Address */}
      <div>
        <label className="mb-1 block text-sm font-medium text-gray-700">
          Property Address <span className="text-red-500">*</span>
        </label>
        <input
          value={data.propertyAddress}
          onChange={(e) => onChange({ propertyAddress: e.target.value })}
          onBlur={() => blur('propertyAddress')}
          className={cn(
            'w-full rounded-lg border px-3 py-2.5 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500',
            touched.propertyAddress && errors.propertyAddress ? 'border-red-400' : 'border-gray-300'
          )}
          placeholder="e.g. 123 Maple Street, Springfield, CA 90001"
        />
        {touched.propertyAddress && errors.propertyAddress && (
          <p className="mt-1 flex items-center gap-1 text-xs text-red-600"><AlertCircle className="h-3.5 w-3.5" />{errors.propertyAddress}</p>
        )}
      </div>

      {/* Permit Type */}
      <div>
        <label className="mb-1 block text-sm font-medium text-gray-700">Permit Type</label>
        <select
          value={data.permitType}
          onChange={(e) => onChange({ permitType: e.target.value })}
          className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="">Select a permit type...</option>
          {PERMIT_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
        </select>
      </div>

      {/* Description */}
      <div>
        <label className="mb-1 block text-sm font-medium text-gray-700">Project Description</label>
        <textarea
          value={data.description}
          onChange={(e) => onChange({ description: e.target.value })}
          rows={3}
          className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
          placeholder="Brief description of the project..."
        />
      </div>

      {/* File Upload */}
      <div>
        <label className="mb-1 block text-sm font-medium text-gray-700">Supporting Documents</label>
        <div
          className="cursor-pointer rounded-lg border-2 border-dashed border-gray-300 p-6 text-center hover:border-blue-400 hover:bg-blue-50 transition-colors"
          onClick={() => fileInputRef.current?.click()}
        >
          <Upload className="mx-auto h-8 w-8 text-gray-400" />
          <p className="mt-2 text-sm text-gray-600">Click to upload or drag and drop</p>
          <p className="text-xs text-gray-400">PDF, JPG, PNG — max 5MB per file</p>
        </div>
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept=".pdf,.jpg,.jpeg,.png"
          className="hidden"
          onChange={handleFileChange}
        />
        {fileError && (
          <p className="mt-2 flex items-center gap-1 text-xs text-red-600">
            <AlertCircle className="h-3.5 w-3.5" />{fileError}
          </p>
        )}
        {files.length > 0 && (
          <ul className="mt-3 space-y-2">
            {files.map((f, i) => (
              <li key={i} className="flex items-center justify-between rounded-lg bg-gray-50 px-3 py-2">
                <div className="flex items-center gap-2 min-w-0">
                  {f.type === 'application/pdf'
                    ? <FileText className="h-4 w-4 shrink-0 text-red-500" />
                    : <ImageIcon className="h-4 w-4 shrink-0 text-blue-500" />
                  }
                  <span className="truncate text-sm text-gray-700">{f.name}</span>
                  <span className="shrink-0 text-xs text-gray-400">({Math.round(f.size / 1024)}KB)</span>
                </div>
                <button onClick={() => removeFile(i)} className="ml-2 shrink-0 text-gray-400 hover:text-red-500">
                  <X className="h-4 w-4" />
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Navigation */}
      <div className="flex justify-end pt-2">
        <button
          onClick={onNext}
          disabled={!isValid}
          className="rounded-lg bg-blue-600 px-6 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50 transition-colors"
        >
          Next: Contractor →
        </button>
      </div>
    </div>
  )
}
```

- [ ] **Step 3: Create `app/new-application/page.tsx`**

```tsx
// app/new-application/page.tsx
'use client'

import { WizardShell } from './_components/WizardShell'
import { AppLayout } from '@/components/layout/app-layout'

// No server-side auth redirect here since role check is in WizardShell
// (AppLayout itself handles the session boundary via next-auth)
export default function NewApplicationPage() {
  return (
    <AppLayout>
      <WizardShell />
    </AppLayout>
  )
}
```

- [ ] **Step 4: Commit**

```bash
git add app/new-application/page.tsx app/new-application/_components/WizardShell.tsx app/new-application/_components/Step1PermitDetails.tsx
git commit -m "feat: new application wizard - Step 1 permit details with file upload"
```

---

## Task 11: New Application Wizard — Step 2 (Contractor Selection)

**Files:**
- Create: `app/new-application/_components/Step2ContractorSelection.tsx`

- [ ] **Step 1: Create `Step2ContractorSelection.tsx`**

```tsx
// app/new-application/_components/Step2ContractorSelection.tsx
'use client'

import { useState } from 'react'
import { mockContractors, MockContractor } from '@/lib/mock-data'
import { ContractorData } from './WizardShell'
import { PlusCircle, ChevronDown, AlertCircle, X } from 'lucide-react'
import { cn } from '@/lib/utils'

interface Props {
  selected: ContractorData | null
  onSelect: (c: ContractorData | null) => void
  onBack: () => void
  onNext: () => void
}

const EMPTY_NEW: ContractorData = { id: '', name: '', company: '', licenseNumber: '', phone: '', email: '', address: '' }

export function Step2ContractorSelection({ selected, onSelect, onBack, onNext }: Props) {
  // Local contractor list (starts from mock, can be extended)
  const [contractors, setContractors] = useState<MockContractor[]>(mockContractors)
  const [selectedId, setSelectedId] = useState(selected?.id ?? '')
  const [showAddForm, setShowAddForm] = useState(false)
  const [newContractor, setNewContractor] = useState<ContractorData>(EMPTY_NEW)
  const [addTouched, setAddTouched] = useState<Record<string, boolean>>({})

  // Validation for add-new form
  const addErrors: Partial<Record<keyof ContractorData, string>> = {}
  if (!newContractor.name.trim()) addErrors.name = 'Name is required'
  if (!newContractor.company.trim()) addErrors.company = 'Company is required'
  if (!newContractor.licenseNumber.trim()) addErrors.licenseNumber = 'License number is required'
  const addIsValid = Object.keys(addErrors).length === 0

  const handleSelect = (id: string) => {
    setSelectedId(id)
    const c = contractors.find((c) => c.id === id)
    if (c) {
      onSelect({ id: c.id, name: c.name, company: c.companyName ?? c.company ?? '', licenseNumber: c.licenseNumber, phone: c.phone, email: c.email, address: c.address })
    } else {
      onSelect(null)
    }
  }

  const handleAddContractor = () => {
    // Mark all fields as touched for validation display
    setAddTouched({ name: true, company: true, licenseNumber: true })
    if (!addIsValid) return

    const newId = `CON-${Date.now()}`
    const added: MockContractor = {
      id: newId,
      name: newContractor.name,
      companyName: newContractor.company,
      company: newContractor.company,
      licenseNumber: newContractor.licenseNumber,
      phone: newContractor.phone,
      email: newContractor.email,
      address: newContractor.address,
    } as MockContractor
    setContractors((prev) => [...prev, added])
    setSelectedId(newId)
    onSelect({ ...newContractor, id: newId })
    setShowAddForm(false)
    setNewContractor(EMPTY_NEW)
  }

  const canProceed = !!selectedId

  const blurAdd = (f: string) => setAddTouched((t) => ({ ...t, [f]: true }))

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm space-y-5">
      <div>
        <h2 className="text-lg font-semibold text-gray-900">Step 2: Contractor Selection</h2>
        <p className="mt-1 text-sm text-gray-500">Select the contractor who will perform the work.</p>
      </div>

      {/* Dropdown */}
      <div>
        <label className="mb-1 block text-sm font-medium text-gray-700">
          Select Contractor <span className="text-red-500">*</span>
        </label>
        <div className="relative">
          <select
            value={selectedId}
            onChange={(e) => handleSelect(e.target.value)}
            className="w-full appearance-none rounded-lg border border-gray-300 px-3 py-2.5 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 pr-10"
          >
            <option value="">-- Choose a contractor --</option>
            {contractors.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name} — {c.companyName ?? c.company}
              </option>
            ))}
          </select>
          <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
        </div>
      </div>

      {/* Selected contractor preview */}
      {selectedId && !showAddForm && (
        <div className="rounded-lg border border-blue-100 bg-blue-50 p-4 text-sm text-gray-700 space-y-1">
          {(() => {
            const c = contractors.find((c) => c.id === selectedId)
            if (!c) return null
            return (
              <>
                <p><span className="font-medium">Company:</span> {c.companyName ?? c.company}</p>
                <p><span className="font-medium">License:</span> {c.licenseNumber}</p>
                {c.phone && <p><span className="font-medium">Phone:</span> {c.phone}</p>}
                {c.email && <p><span className="font-medium">Email:</span> {c.email}</p>}
              </>
            )
          })()}
        </div>
      )}

      {/* Add New toggle */}
      {!showAddForm && (
        <button
          type="button"
          onClick={() => setShowAddForm(true)}
          className="flex items-center gap-2 text-sm font-medium text-blue-600 hover:text-blue-800 transition-colors"
        >
          <PlusCircle className="h-4 w-4" />
          Contractor not listed? Add new contractor
        </button>
      )}

      {/* Add New Form */}
      {showAddForm && (
        <div className="rounded-xl border border-gray-200 bg-gray-50 p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-gray-900">New Contractor Details</h3>
            <button onClick={() => setShowAddForm(false)} className="text-gray-400 hover:text-gray-600">
              <X className="h-5 w-5" />
            </button>
          </div>
          {(
            [
              { field: 'name', label: 'Contractor Name', placeholder: 'e.g. John Doe', required: true },
              { field: 'company', label: 'Company Name', placeholder: 'e.g. Ace Builders', required: true },
              { field: 'licenseNumber', label: 'License Number', placeholder: 'e.g. CA-12345', required: true },
              { field: 'phone', label: 'Phone', placeholder: '(555) 000-0000', required: false },
              { field: 'email', label: 'Email', placeholder: 'contractor@example.com', required: false },
              { field: 'address', label: 'Business Address', placeholder: '100 Main St, City, CA 90000', required: false },
            ] as const
          ).map(({ field, label, placeholder, required }) => (
            <div key={field}>
              <label className="mb-1 block text-xs font-medium text-gray-700">
                {label} {required && <span className="text-red-500">*</span>}
              </label>
              <input
                value={newContractor[field]}
                onChange={(e) => setNewContractor((prev) => ({ ...prev, [field]: e.target.value }))}
                onBlur={() => blurAdd(field)}
                className={cn(
                  'w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500',
                  addTouched[field] && addErrors[field] ? 'border-red-400' : 'border-gray-300'
                )}
                placeholder={placeholder}
              />
              {addTouched[field] && addErrors[field] && (
                <p className="mt-1 flex items-center gap-1 text-xs text-red-600">
                  <AlertCircle className="h-3.5 w-3.5" />{addErrors[field]}
                </p>
              )}
            </div>
          ))}
          <button
            onClick={handleAddContractor}
            className="w-full rounded-lg bg-blue-600 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 transition-colors"
          >
            Save Contractor & Select
          </button>
        </div>
      )}

      {/* Navigation */}
      <div className="flex items-center justify-between pt-2">
        <button
          onClick={onBack}
          className="rounded-lg border border-gray-200 bg-white px-5 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
        >
          ← Back
        </button>
        <button
          onClick={onNext}
          disabled={!canProceed}
          className="rounded-lg bg-blue-600 px-6 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50 transition-colors"
        >
          Next: Review →
        </button>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add app/new-application/_components/Step2ContractorSelection.tsx
git commit -m "feat: new application wizard - Step 2 contractor selection with add-new flow"
```

---

## Task 12: New Application Wizard — Step 3 (Review & Submit)

**Files:**
- Create: `app/new-application/_components/Step3ReviewSubmit.tsx`

- [ ] **Step 1: Create `Step3ReviewSubmit.tsx`**

```tsx
// app/new-application/_components/Step3ReviewSubmit.tsx
'use client'

import { useState } from 'react'
import { PermitFormData, ContractorData, UploadedFile } from './WizardShell'
import { FileText, Image as ImageIcon, CheckCircle, Loader2 } from 'lucide-react'

interface Props {
  permitData: PermitFormData
  contractor: ContractorData | null
  files: UploadedFile[]
  onBack: () => void
  onSubmit: () => void
}

function ReviewRow({ label, value }: { label: string; value?: string }) {
  if (!value) return null
  return (
    <div className="flex items-start gap-3 py-2">
      <span className="min-w-36 text-sm text-gray-500">{label}</span>
      <span className="text-sm font-medium text-gray-900">{value}</span>
    </div>
  )
}

export function Step3ReviewSubmit({ permitData, contractor, files, onBack, onSubmit }: Props) {
  const [submitting, setSubmitting] = useState(false)

  const handleSubmit = async () => {
    setSubmitting(true)
    // Simulate async submit delay (replace with real API call)
    await new Promise((r) => setTimeout(r, 1200))
    setSubmitting(false)
    onSubmit()
  }

  return (
    <div className="space-y-5">
      <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-gray-900">Step 3: Review & Submit</h2>
        <p className="mt-1 text-sm text-gray-500">Please confirm all details before submitting.</p>
      </div>

      {/* Permit Details Card */}
      <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
        <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-gray-500">Permit Details</h3>
        <div className="divide-y divide-gray-100">
          <ReviewRow label="Customer Name" value={permitData.customerName} />
          <ReviewRow label="Property ID" value={permitData.propertyId} />
          <ReviewRow label="Property Address" value={permitData.propertyAddress} />
          <ReviewRow label="Permit Type" value={permitData.permitType} />
          <ReviewRow label="Description" value={permitData.description} />
        </div>
      </div>

      {/* Contractor Card */}
      <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
        <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-gray-500">Contractor</h3>
        {contractor ? (
          <div className="divide-y divide-gray-100">
            <ReviewRow label="Name" value={contractor.name} />
            <ReviewRow label="Company" value={contractor.company} />
            <ReviewRow label="License #" value={contractor.licenseNumber} />
            <ReviewRow label="Phone" value={contractor.phone} />
            <ReviewRow label="Email" value={contractor.email} />
            <ReviewRow label="Address" value={contractor.address} />
          </div>
        ) : (
          <p className="text-sm text-gray-400 italic">No contractor selected</p>
        )}
      </div>

      {/* Documents Card */}
      {files.length > 0 && (
        <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
          <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-gray-500">Attached Documents ({files.length})</h3>
          <ul className="space-y-2">
            {files.map((f, i) => (
              <li key={i} className="flex items-center gap-2 text-sm text-gray-700">
                {f.type === 'application/pdf'
                  ? <FileText className="h-4 w-4 text-red-500" />
                  : <ImageIcon className="h-4 w-4 text-blue-500" />
                }
                <span>{f.name}</span>
                <span className="text-gray-400">({Math.round(f.size / 1024)}KB)</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Navigation */}
      <div className="flex items-center justify-between">
        <button
          onClick={onBack}
          disabled={submitting}
          className="rounded-lg border border-gray-200 bg-white px-5 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors disabled:opacity-50"
        >
          ← Back
        </button>
        <button
          onClick={handleSubmit}
          disabled={submitting}
          className="flex items-center gap-2 rounded-lg bg-green-600 px-6 py-2.5 text-sm font-semibold text-white hover:bg-green-700 disabled:opacity-70 transition-colors"
        >
          {submitting ? (
            <><Loader2 className="h-4 w-4 animate-spin" /> Submitting...</>
          ) : (
            <><CheckCircle className="h-4 w-4" /> Submit Application</>
          )}
        </button>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Fix TypeScript issue in `Step2ContractorSelection`**

`MockContractor` from mock-data.ts uses `companyName` but the interface is inconsistent. Ensure `MockContractor` has `companyName: string` in `lib/mock-data.ts` (already defined above). Verify no TypeScript errors with:

```bash
npx tsc --noEmit
```

Fix any errors before committing.

- [ ] **Step 3: Commit**

```bash
git add app/new-application/_components/Step3ReviewSubmit.tsx
git commit -m "feat: new application wizard - Step 3 review, submit, and success state"
```

---

## Task 13: Verify Build and Smoke Test

- [ ] **Step 1: Run TypeScript check**

```bash
npx tsc --noEmit
```
Expected: No errors.

- [ ] **Step 2: Run development build check**

```bash
npm run build
```
Expected: Successful build with no errors. Warnings about `dynamic` exports are acceptable.

- [ ] **Step 3: Fix any build errors**

Common issues to watch for:
- Missing `'use client'` directive on components that use hooks
- `RoleContext` used in server components (must only be used in client components)
- Missing imports
- `MockContractor` type shape mismatches

- [ ] **Step 4: Start dev server and verify pages load**

```bash
npm run dev
```
Manually verify:
- `/dashboard` loads and role toggle works
- `/applications` shows admin table vs citizen list
- `/approvals` shows queue vs status cards
- `/new-application` shows "Access Denied" for admin role; wizard for citizen role
- `/users` shows user table vs profile
- `/reports` shows charts vs history

- [ ] **Step 5: Final commit**

```bash
git add -A
git commit -m "feat: complete permit management UI with role-aware pages and application wizard"
```

---

## Appendix: Known Limitations & Future Work

- **Real backend:** Replace `mockApplications`, `mockContractors`, etc. in `lib/mock-data.ts` with `fetch()` calls to `/api/...` endpoints.
- **Contractor in mock data:** `MockContractor` uses `companyName` but `ContractorData` uses `company` — align these once the real API shape is decided.
- **File upload:** Currently saves metadata only (name, type, size) to localStorage. Wire up to a file upload API endpoint (e.g., the existing `/api/...` routes) to store actual files.
- **Role persistence:** `RoleContext` defaults to `'admin'` on page refresh. Consider persisting role to `localStorage` if needed.
- **Citizen auth:** Currently citizens share the same next-auth session as admins. When citizen self-registration is added, split the auth flows accordingly.
- **Mobile nav:** `CitizenLayout` hides top nav items below `md`. Add a hamburger menu for full mobile support.
