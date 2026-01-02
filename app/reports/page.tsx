/**
 * Reports Page
 * 
 * Displays basic metrics and reports for permit management.
 */

import { AppLayout } from '@/components/layout/app-layout'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { prisma } from '@/lib/prisma'

async function getReportData() {
  const [
    totalPermits,
    permitsByStatus,
    permitsByType,
    permitsByBillingStatus,
  ] = await Promise.all([
    prisma.permitPackage.count(),
    prisma.permitPackage.groupBy({
      by: ['status'],
      _count: true,
    }),
    prisma.permitPackage.groupBy({
      by: ['permitType'],
      _count: true,
    }),
    prisma.permitPackage.groupBy({
      by: ['billingStatus'],
      _count: true,
    }),
  ])

  return {
    totalPermits,
    permitsByStatus,
    permitsByType,
    permitsByBillingStatus,
  }
}

export default async function ReportsPage() {
  const data = await getReportData()

  return (
    <AppLayout>
      <div className="space-y-6">
        <h1 className="text-3xl font-bold text-gray-900">Reports</h1>

        <div className="grid gap-4 md:grid-cols-2">
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

          <Card>
            <CardHeader>
              <CardTitle>Permits by Type</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {data.permitsByType.map((type) => (
                  <div key={type.permitType} className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">{type.permitType}</span>
                    <span className="text-sm font-semibold">{type._count}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Billing Status</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {data.permitsByBillingStatus.map((status) => (
                  <div key={status.billingStatus} className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">
                      {status.billingStatus.replace(/([A-Z])/g, ' $1').trim()}
                    </span>
                    <span className="text-sm font-semibold">{status._count}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Total Permits</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{data.totalPermits}</div>
            </CardContent>
          </Card>
        </div>
      </div>
    </AppLayout>
  )
}

