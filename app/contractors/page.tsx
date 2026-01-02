/**
 * Contractors List Page
 * 
 * Displays a list of all contractors with search and pagination.
 */

import { AppLayout } from '@/components/layout/app-layout'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { prisma } from '@/lib/prisma'
import Link from 'next/link'

async function getContractors(searchParams: { [key: string]: string | string[] | undefined }) {
  const search = typeof searchParams.search === 'string' ? searchParams.search : ''
  const page = parseInt(typeof searchParams.page === 'string' ? searchParams.page : '1')
  const limit = 20
  const skip = (page - 1) * limit

  const where = search
    ? {
        OR: [
          { companyName: { contains: search, mode: 'insensitive' } },
          { licenseNumber: { contains: search, mode: 'insensitive' } },
          { email: { contains: search, mode: 'insensitive' } },
        ],
      }
    : {}

  const [contractors, total] = await Promise.all([
    prisma.contractor.findMany({
      where,
      skip,
      take: limit,
      orderBy: { companyName: 'asc' },
    }),
    prisma.contractor.count({ where }),
  ])

  return { contractors, total, page, limit, totalPages: Math.ceil(total / limit) }
}

export default async function ContractorsPage({
  searchParams,
}: {
  searchParams: { [key: string]: string | string[] | undefined }
}) {
  const data = await getContractors(searchParams)

  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold text-gray-900">Contractors</h1>
          <Button>New Contractor</Button>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>All Contractors ({data.total})</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="px-4 py-2 text-left text-sm font-medium text-gray-700">Company</th>
                    <th className="px-4 py-2 text-left text-sm font-medium text-gray-700">License</th>
                    <th className="px-4 py-2 text-left text-sm font-medium text-gray-700">Email</th>
                    <th className="px-4 py-2 text-left text-sm font-medium text-gray-700">Phone</th>
                  </tr>
                </thead>
                <tbody>
                  {data.contractors.map((contractor) => (
                    <tr key={contractor.id} className="border-b hover:bg-gray-50">
                      <td className="px-4 py-2">
                        <Link
                          href={`/contractors/${contractor.id}`}
                          className="text-sm text-blue-600 hover:underline"
                        >
                          {contractor.companyName}
                        </Link>
                      </td>
                      <td className="px-4 py-2 text-sm">{contractor.licenseNumber || '-'}</td>
                      <td className="px-4 py-2 text-sm">{contractor.email || '-'}</td>
                      <td className="px-4 py-2 text-sm">{contractor.phone || '-'}</td>
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

