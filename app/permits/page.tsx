/**
 * Permits List Page
 * 
 * Displays a paginated list of all permit packages with filtering and search capabilities.
 * Provides quick access to permit details and status information.
 */

import { AppLayout } from '@/components/layout/app-layout'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { StatusBadge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { prisma } from '@/lib/prisma'
import { formatDate, formatPermitType } from '@/lib/utils'
import Link from 'next/link'

async function getPermits(searchParams: { [key: string]: string | string[] | undefined }) {
  const search = typeof searchParams.search === 'string' ? searchParams.search : ''
  const status = typeof searchParams.status === 'string' ? searchParams.status : undefined
  const permitType = typeof searchParams.permitType === 'string' ? searchParams.permitType : undefined
  const billingStatus = typeof searchParams.billingStatus === 'string' ? searchParams.billingStatus : undefined
  const page = parseInt(typeof searchParams.page === 'string' ? searchParams.page : '1')
  const limit = 20
  const skip = (page - 1) * limit

  const where: Record<string, unknown> = {}
  
  // Note: SQLite doesn't support case-insensitive mode, but it's case-insensitive for ASCII by default
  if (search) {
    where.OR = [
      { projectName: { contains: search } },
      { projectAddress: { contains: search } },
      { permitNumber: { contains: search } },
      { customer: { name: { contains: search } } },
      { contractor: { companyName: { contains: search } } },
    ]
  }
  
  if (status) where.status = status
  if (permitType) where.permitType = permitType
  if (billingStatus) where.billingStatus = billingStatus

  const [permits, total] = await Promise.all([
    prisma.permitPackage.findMany({
      where,
      skip,
      take: limit,
      include: {
        customer: { select: { id: true, name: true } },
        contractor: { select: { id: true, companyName: true } },
        tasks: {
          where: { status: { not: 'Completed' } },
          orderBy: { dueDate: 'asc' },
          take: 1,
        },
      },
      orderBy: { openedDate: 'desc' },
    }),
    prisma.permitPackage.count({ where }),
  ])

  return { permits, total, page, limit, totalPages: Math.ceil(total / limit) }
}

export default async function PermitsPage({
  searchParams,
}: {
  searchParams: { [key: string]: string | string[] | undefined }
}) {
  const data = await getPermits(searchParams)

  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold text-gray-900">Permits</h1>
          <Link href="/permits/new">
            <Button>New Permit</Button>
          </Link>
        </div>

        {/* Filters */}
        <Card>
          <CardHeader>
            <CardTitle>Filters</CardTitle>
          </CardHeader>
          <CardContent>
            <form method="get" className="flex gap-4">
              <input
                type="text"
                name="search"
                placeholder="Search permits..."
                defaultValue={searchParams.search}
                className="flex-1 rounded-md border border-gray-300 px-3 py-2"
              />
              <select
                name="status"
                defaultValue={searchParams.status}
                className="rounded-md border border-gray-300 px-3 py-2"
              >
                <option value="">All Statuses</option>
                <option value="New">New</option>
                <option value="Submitted">Submitted</option>
                <option value="InReview">In Review</option>
                <option value="RevisionsNeeded">Revisions Needed</option>
                <option value="Approved">Approved</option>
                <option value="Issued">Issued</option>
                <option value="Inspections">Inspections</option>
                <option value="FinaledClosed">Finaled/Closed</option>
              </select>
              <Button type="submit">Filter</Button>
            </form>
          </CardContent>
        </Card>

        {/* Permits Table */}
        <Card>
          <CardHeader>
            <CardTitle>All Permits ({data.total})</CardTitle>
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
                    <th className="px-4 py-2 text-left text-sm font-medium text-gray-700">Type</th>
                    <th className="px-4 py-2 text-left text-sm font-medium text-gray-700">Status</th>
                    <th className="px-4 py-2 text-left text-sm font-medium text-gray-700">Billing</th>
                    <th className="px-4 py-2 text-left text-sm font-medium text-gray-700">Opened</th>
                  </tr>
                </thead>
                <tbody>
                  {data.permits.map((permit) => (
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
                      <td className="px-4 py-2 text-sm">{formatPermitType(permit.permitType)}</td>
                      <td className="px-4 py-2">
                        <StatusBadge status={permit.status} />
                      </td>
                      <td className="px-4 py-2">
                        <StatusBadge status={permit.billingStatus} />
                      </td>
                      <td className="px-4 py-2 text-sm text-gray-600">
                        {formatDate(permit.openedDate)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {data.totalPages > 1 && (
              <div className="mt-4 flex items-center justify-between">
                <p className="text-sm text-gray-600">
                  Page {data.page} of {data.totalPages}
                </p>
                <div className="flex gap-2">
                  {data.page > 1 && (
                    <Link href={`?page=${data.page - 1}`}>
                      <Button variant="outline" size="sm">Previous</Button>
                    </Link>
                  )}
                  {data.page < data.totalPages && (
                    <Link href={`?page=${data.page + 1}`}>
                      <Button variant="outline" size="sm">Next</Button>
                    </Link>
                  )}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  )
}

