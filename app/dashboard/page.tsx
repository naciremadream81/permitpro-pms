/**
 * Dashboard Page — Phase 2
 *
 * Role-aware operational metrics: stalled count, contractor expirations,
 * review backlog, system alerts strip, and a My Work section.
 */

export const dynamic = 'force-dynamic'

import { AppLayout } from '@/components/layout/app-layout'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { StatusBadge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { prisma } from '@/lib/prisma'
import { formatDate } from '@/lib/utils'
import Link from 'next/link'
import { getSession } from '@/lib/auth-helpers'
import { redirect } from 'next/navigation'
import {
  AlertTriangle,
  Clock,
  ShieldAlert,
  ClipboardCheck,
  PackageOpen,
  MessageSquare,
  ChevronRight,
  TrendingUp,
} from 'lucide-react'

// ─── Data Fetching ────────────────────────────────────────────────────────────

async function getDashboardData(userId: string, role: string) {
  const STALL_DAYS = 3
  const stallThreshold = new Date(Date.now() - STALL_DAYS * 24 * 60 * 60 * 1000)
  const WARN_DAYS = 30
  const now = new Date()

  const [
    activeCount,
    stalledCount,
    reviewBacklog,
    openReviewComments,
    contractorAlerts,
    myPackages,
    recentPermits,
    permitsByStatus,
  ] = await Promise.all([
    // Active (non-closed) packages
    prisma.permitPackage.count({
      where: { status: { notIn: ['FinaledClosed', 'Canceled'] } },
    }),

    // Stalled packages
    prisma.permitPackage.count({
      where: {
        status: { notIn: ['FinaledClosed', 'Canceled', 'Approved'] },
        OR: [
          { lastActivityAt: { lt: stallThreshold } },
          { lastActivityAt: null, openedDate: { lt: stallThreshold } },
        ],
      },
    }),

    // Review queue depth (assigned or in-review)
    prisma.reviewAssignment.count({
      where: {
        status: { in: ['ASSIGNED', 'IN_REVIEW'] },
        ...(role === 'reviewer' ? { reviewerId: userId } : {}),
      },
    }),

    // Open (unresolved) review comments
    prisma.reviewComment.count({
      where: { isResolved: false },
    }),

    // Contractor compliance alerts (expired or expiring within 30 days)
    prisma.contractorDocument.count({
      where: {
        isSuperseded: false,
        expirationDate: { lt: new Date(now.getTime() + WARN_DAYS * 24 * 60 * 60 * 1000) },
        status: { not: 'EXPIRED' },
      },
    }),

    // My packages (coordinator view)
    role !== 'reviewer'
      ? prisma.permitPackage.findMany({
          where: {
            coordinatorId: userId,
            status: { notIn: ['FinaledClosed', 'Canceled'] },
          },
          include: {
            customer: { select: { name: true } },
            contractor: { select: { companyName: true } },
            jurisdiction: { select: { name: true } },
          },
          orderBy: { lastActivityAt: 'asc' },
          take: 8,
        })
      : [],

    // Recent permits (admin overview)
    role === 'admin'
      ? prisma.permitPackage.findMany({
          take: 8,
          include: {
            customer: { select: { id: true, name: true } },
            contractor: { select: { id: true, companyName: true } },
          },
          orderBy: { openedDate: 'desc' },
        })
      : [],

    // Status breakdown
    prisma.permitPackage.groupBy({
      by: ['status'],
      _count: true,
      where: { status: { notIn: ['FinaledClosed', 'Canceled'] } },
    }),
  ])

  return {
    activeCount,
    stalledCount,
    reviewBacklog,
    openReviewComments,
    contractorAlerts,
    myPackages,
    recentPermits,
    permitsByStatus,
  }
}

// ─── Alert Strip ──────────────────────────────────────────────────────────────

function AlertStrip({ stalled, contractorAlerts, openComments }: {
  stalled: number
  contractorAlerts: number
  openComments: number
}) {
  const alerts = [
    stalled > 0 && { href: '/reports', icon: Clock, color: 'text-red-600 bg-red-50 border-red-200', label: `${stalled} stalled package${stalled !== 1 ? 's' : ''}`, sub: 'No activity >3 days' },
    contractorAlerts > 0 && { href: '/reports', icon: ShieldAlert, color: 'text-yellow-700 bg-yellow-50 border-yellow-200', label: `${contractorAlerts} compliance doc${contractorAlerts !== 1 ? 's' : ''} expiring`, sub: 'Within 30 days' },
    openComments > 0 && { href: '/review-queue', icon: MessageSquare, color: 'text-purple-700 bg-purple-50 border-purple-200', label: `${openComments} open review comment${openComments !== 1 ? 's' : ''}`, sub: 'Awaiting resolution' },
  ].filter(Boolean) as { href: string; icon: typeof Clock; color: string; label: string; sub: string }[]

  if (alerts.length === 0) return null

  return (
    <div className="flex flex-wrap gap-3">
      {alerts.map((a, i) => {
        const Icon = a.icon
        return (
          <Link key={i} href={a.href} className={`flex items-center gap-3 border rounded-lg px-4 py-3 flex-1 min-w-52 hover:opacity-80 transition-opacity ${a.color}`}>
            <Icon className="h-5 w-5 flex-shrink-0" />
            <div>
              <div className="text-sm font-semibold">{a.label}</div>
              <div className="text-xs opacity-70">{a.sub}</div>
            </div>
            <ChevronRight className="h-4 w-4 ml-auto opacity-50" />
          </Link>
        )
      })}
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default async function DashboardPage() {
  const session = await getSession()
  if (!session) redirect('/login')

  const role = session.user.role ?? 'coordinator'
  const data = await getDashboardData(session.user.id, role)

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
            <p className="text-sm text-gray-500 capitalize">{role} view</p>
          </div>
          {role !== 'reviewer' && (
            <Link href="/permits/new">
              <Button>New Permit</Button>
            </Link>
          )}
        </div>

        {/* System alerts strip */}
        <AlertStrip
          stalled={data.stalledCount}
          contractorAlerts={data.contractorAlerts}
          openComments={data.openReviewComments}
        />

        {/* KPI Cards */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">Active Packages</CardTitle>
              <PackageOpen className="h-4 w-4 text-gray-400" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{data.activeCount}</div>
              <p className="text-xs text-gray-500 mt-0.5">In progress</p>
            </CardContent>
          </Card>

          <Card className={data.stalledCount > 0 ? 'border-red-200' : ''}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">Stalled</CardTitle>
              <Clock className={`h-4 w-4 ${data.stalledCount > 0 ? 'text-red-500' : 'text-gray-400'}`} />
            </CardHeader>
            <CardContent>
              <div className={`text-2xl font-bold ${data.stalledCount > 0 ? 'text-red-600' : ''}`}>
                {data.stalledCount}
              </div>
              <p className="text-xs text-gray-500 mt-0.5">No activity &gt;3 days</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">
                {role === 'reviewer' ? 'My Review Queue' : 'Review Backlog'}
              </CardTitle>
              <ClipboardCheck className="h-4 w-4 text-gray-400" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{data.reviewBacklog}</div>
              <p className="text-xs text-gray-500 mt-0.5">
                <Link href="/review-queue" className="hover:underline text-blue-600">View queue</Link>
              </p>
            </CardContent>
          </Card>

          <Card className={data.contractorAlerts > 0 ? 'border-yellow-200' : ''}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">Compliance Alerts</CardTitle>
              <ShieldAlert className={`h-4 w-4 ${data.contractorAlerts > 0 ? 'text-yellow-500' : 'text-gray-400'}`} />
            </CardHeader>
            <CardContent>
              <div className={`text-2xl font-bold ${data.contractorAlerts > 0 ? 'text-yellow-600' : ''}`}>
                {data.contractorAlerts}
              </div>
              <p className="text-xs text-gray-500 mt-0.5">Docs expiring/expired</p>
            </CardContent>
          </Card>
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          {/* My Work (coordinator) or Review Queue (reviewer) */}
          <div className="lg:col-span-2">
            {role !== 'reviewer' && data.myPackages.length > 0 && (
              <Card>
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base">My Packages</CardTitle>
                    <Link href="/permits" className="text-xs text-blue-600 hover:underline">View all</Link>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b">
                          <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">Project</th>
                          <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">Status</th>
                          <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">Jurisdiction</th>
                          <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">Last Activity</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y">
                        {data.myPackages.map(pkg => {
                          const last = pkg.lastActivityAt ?? pkg.openedDate
                          const daysIdle = Math.floor((Date.now() - last.getTime()) / (1000 * 60 * 60 * 24))
                          return (
                            <tr key={pkg.id} className="hover:bg-gray-50">
                              <td className="px-3 py-2">
                                <Link href={`/permits/${pkg.id}`} className="text-blue-600 hover:underline font-medium">{pkg.projectName}</Link>
                                <div className="text-xs text-gray-400">{pkg.customer.name}</div>
                              </td>
                              <td className="px-3 py-2"><StatusBadge status={pkg.status} /></td>
                              <td className="px-3 py-2 text-gray-600 text-xs">{pkg.jurisdiction?.name ?? pkg.county ?? '—'}</td>
                              <td className="px-3 py-2">
                                <span className={`text-xs font-medium ${daysIdle >= 3 ? 'text-red-600' : 'text-gray-500'}`}>
                                  {daysIdle === 0 ? 'Today' : `${daysIdle}d ago`}
                                </span>
                              </td>
                            </tr>
                          )
                        })}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>
            )}

            {role === 'admin' && data.recentPermits.length > 0 && (
              <Card>
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base">Recent Permits</CardTitle>
                    <Link href="/permits" className="text-xs text-blue-600 hover:underline">View all</Link>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b">
                          <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">Project</th>
                          <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">Customer</th>
                          <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">Status</th>
                          <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">Opened</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y">
                        {data.recentPermits.map(permit => (
                          <tr key={permit.id} className="hover:bg-gray-50">
                            <td className="px-3 py-2">
                              <Link href={`/permits/${permit.id}`} className="text-blue-600 hover:underline font-medium">{permit.projectName}</Link>
                            </td>
                            <td className="px-3 py-2 text-gray-600">{permit.customer.name}</td>
                            <td className="px-3 py-2"><StatusBadge status={permit.status} /></td>
                            <td className="px-3 py-2 text-xs text-gray-500">{formatDate(permit.openedDate)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>
            )}

            {role === 'reviewer' && (
              <Card>
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base">My Review Queue</CardTitle>
                    <Link href="/review-queue" className="text-xs text-blue-600 hover:underline flex items-center gap-1">
                      View all <ChevronRight className="h-3 w-3" />
                    </Link>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-gray-500">
                    You have <strong>{data.reviewBacklog}</strong> active assignment{data.reviewBacklog !== 1 ? 's' : ''}.{' '}
                    <Link href="/review-queue" className="text-blue-600 hover:underline">Go to queue</Link>
                  </p>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Status breakdown + quick links */}
          <div className="space-y-4">
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center gap-2">
                  <TrendingUp className="h-4 w-4 text-gray-400" />
                  <CardTitle className="text-base">Status Breakdown</CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {data.permitsByStatus
                    .sort((a, b) => b._count - a._count)
                    .map(s => (
                      <div key={s.status} className="flex items-center justify-between">
                        <span className="text-sm text-gray-600">{s.status.replace(/([A-Z])/g, ' $1').trim()}</span>
                        <span className="text-sm font-semibold tabular-nums">{s._count}</span>
                      </div>
                    ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Quick Links</CardTitle>
              </CardHeader>
              <CardContent>
                <nav className="space-y-1">
                  {[
                    { href: '/reports', label: 'Pipeline Report', icon: AlertTriangle },
                    { href: '/review-queue', label: 'Review Queue', icon: ClipboardCheck },
                    ...(role === 'admin' ? [
                      { href: '/admin/jurisdictions', label: 'Jurisdictions', icon: PackageOpen },
                      { href: '/contractors', label: 'Contractor Compliance', icon: ShieldAlert },
                    ] : []),
                  ].map(link => {
                    const Icon = link.icon
                    return (
                      <Link
                        key={link.href}
                        href={link.href}
                        className="flex items-center gap-2.5 text-sm text-gray-600 hover:text-blue-600 px-2 py-1.5 rounded hover:bg-gray-50 transition-colors"
                      >
                        <Icon className="h-4 w-4 text-gray-400" />
                        {link.label}
                      </Link>
                    )
                  })}
                </nav>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </AppLayout>
  )
}
