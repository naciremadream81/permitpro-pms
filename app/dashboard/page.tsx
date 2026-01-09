/**
 * Dashboard Page
 * 
 * Main dashboard displaying key performance indicators (KPIs) and overview
 * of permit packages, including status breakdowns and recent activity.
 */

// Force dynamic rendering since this page uses database queries
export const dynamic = 'force-dynamic'

import { AppLayout } from '@/components/layout/app-layout'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { StatusBadge } from '@/components/ui/badge'
import { prisma } from '@/lib/prisma'
import { formatDate } from '@/lib/utils'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { getSession } from '@/lib/auth-helpers'
import { redirect } from 'next/navigation'

async function getDashboardData() {
  const [
    totalPermits,
    permitsByStatus,
    permitsWaitingOnBilling,
    recentPermits,
  ] = await Promise.all([
    prisma.permitPackage.count({
      where: {
        status: {
          not: 'FinaledClosed',
        },
      },
    }),
    prisma.permitPackage.groupBy({
      by: ['status'],
      _count: true,
      where: {
        status: {
          not: 'FinaledClosed',
        },
      },
    }),
    prisma.permitPackage.count({
      where: {
        billingStatus: {
          in: ['NotSent', 'SentToBilling'],
        },
        status: {
          in: ['Approved', 'Issued'],
        },
      },
    }),
    prisma.permitPackage.findMany({
      take: 10,
      include: {
        customer: {
          select: { id: true, name: true },
        },
        contractor: {
          select: { id: true, companyName: true },
        },
        tasks: {
          where: { status: { not: 'Completed' } },
          orderBy: { dueDate: 'asc' },
          take: 1,
        },
      },
      orderBy: { openedDate: 'desc' },
    }),
  ])

  return {
    totalPermits,
    permitsByStatus,
    permitsWaitingOnBilling,
    recentPermits,
  }
}

export default async function DashboardPage() {
  // Check authentication
  const session = await getSession()
  
  if (!session) {
    redirect('/login')
  }

  const data = await getDashboardData()

  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
          <Link href="/permits/new">
            <Button>New Permit</Button>
          </Link>
        </div>

        {/* KPI Cards */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Active Permits</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{data.totalPermits}</div>
              <p className="text-xs text-gray-500">Currently in progress</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Waiting on Billing</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{data.permitsWaitingOnBilling}</div>
              <p className="text-xs text-gray-500">Ready for billing</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">In Review</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {data.permitsByStatus.find((p) => p.status === 'InReview')?._count || 0}
              </div>
              <p className="text-xs text-gray-500">Under county review</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">New Permits</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {data.permitsByStatus.find((p) => p.status === 'New')?._count || 0}
              </div>
              <p className="text-xs text-gray-500">Awaiting submission</p>
            </CardContent>
          </Card>
        </div>

        {/* Status Breakdown */}
        <Card>
          <CardHeader>
            <CardTitle>Permits by Status</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {data.permitsByStatus.map((status) => (
                <div key={status.status} className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">
                    {status.status.replace(/([A-Z])/g, ' $1').trim()}
                  </span>
                  <span className="text-sm font-semibold">{status._count}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Recent Permits */}
        <Card>
          <CardHeader>
            <CardTitle>Recent Permits</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="px-4 py-2 text-left text-sm font-medium text-gray-700">ID</th>
                    <th className="px-4 py-2 text-left text-sm font-medium text-gray-700">Project</th>
                    <th className="px-4 py-2 text-left text-sm font-medium text-gray-700">Customer</th>
                    <th className="px-4 py-2 text-left text-sm font-medium text-gray-700">Contractor</th>
                    <th className="px-4 py-2 text-left text-sm font-medium text-gray-700">Status</th>
                    <th className="px-4 py-2 text-left text-sm font-medium text-gray-700">Next Task</th>
                  </tr>
                </thead>
                <tbody>
                  {data.recentPermits.map((permit) => (
                    <tr key={permit.id} className="border-b hover:bg-gray-50">
                      <td className="px-4 py-2">
                        <Link
                          href={`/permits/${permit.id}`}
                          className="text-sm text-blue-600 hover:underline"
                        >
                          {permit.id.slice(0, 8)}...
                        </Link>
                      </td>
                      <td className="px-4 py-2 text-sm">{permit.projectName}</td>
                      <td className="px-4 py-2 text-sm">{permit.customer.name}</td>
                      <td className="px-4 py-2 text-sm">{permit.contractor.companyName}</td>
                      <td className="px-4 py-2">
                        <StatusBadge status={permit.status} />
                      </td>
                      <td className="px-4 py-2 text-sm">
                        {permit.tasks[0] ? (
                          <span className="text-gray-600">
                            {permit.tasks[0].name}
                            {permit.tasks[0].dueDate && (
                              <span className="text-gray-400">
                                {' '}(Due: {formatDate(permit.tasks[0].dueDate)})
                              </span>
                            )}
                          </span>
                        ) : (
                          <span className="text-gray-400">No tasks</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  )
}

