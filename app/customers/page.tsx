/**
 * Customers List Page
 * 
 * Displays a list of all customers with search and pagination.
 */

import { AppLayout } from '@/components/layout/app-layout'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { prisma } from '@/lib/prisma'
import Link from 'next/link'

async function getCustomers(searchParams: { [key: string]: string | string[] | undefined }) {
  const search = typeof searchParams.search === 'string' ? searchParams.search : ''
  const page = parseInt(typeof searchParams.page === 'string' ? searchParams.page : '1')
  const limit = 20
  const skip = (page - 1) * limit

  // Note: SQLite doesn't support case-insensitive mode, but it's case-insensitive for ASCII by default
  const where = search
    ? {
        OR: [
          { name: { contains: search } },
          { contactName: { contains: search } },
          { email: { contains: search } },
        ],
      }
    : {}

  const [customers, total] = await Promise.all([
    prisma.customer.findMany({
      where,
      skip,
      take: limit,
      orderBy: { name: 'asc' },
    }),
    prisma.customer.count({ where }),
  ])

  return { customers, total, page, limit, totalPages: Math.ceil(total / limit) }
}

export default async function CustomersPage({
  searchParams,
}: {
  searchParams: { [key: string]: string | string[] | undefined }
}) {
  const data = await getCustomers(searchParams)

  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold text-gray-900">Customers</h1>
          <Link href="/customers/new">
            <Button>New Customer</Button>
          </Link>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>All Customers ({data.total})</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="px-4 py-2 text-left text-sm font-medium text-gray-700">Name</th>
                    <th className="px-4 py-2 text-left text-sm font-medium text-gray-700">Contact</th>
                    <th className="px-4 py-2 text-left text-sm font-medium text-gray-700">Email</th>
                    <th className="px-4 py-2 text-left text-sm font-medium text-gray-700">Phone</th>
                  </tr>
                </thead>
                <tbody>
                  {data.customers.map((customer) => (
                    <tr key={customer.id} className="border-b hover:bg-gray-50">
                      <td className="px-4 py-2">
                        <Link
                          href={`/customers/${customer.id}`}
                          className="text-sm text-blue-600 hover:underline"
                        >
                          {customer.name}
                        </Link>
                      </td>
                      <td className="px-4 py-2 text-sm">{customer.contactName || '-'}</td>
                      <td className="px-4 py-2 text-sm">{customer.email || '-'}</td>
                      <td className="px-4 py-2 text-sm">{customer.phone || '-'}</td>
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

