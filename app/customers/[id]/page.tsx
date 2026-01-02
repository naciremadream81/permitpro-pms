/**
 * Customer Detail Page
 * 
 * Displays comprehensive information about a single customer,
 * including contact details and their permit packages.
 */

import { AppLayout } from '@/components/layout/app-layout'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { StatusBadge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { prisma } from '@/lib/prisma'
import { formatDate } from '@/lib/utils'
import Link from 'next/link'
import { notFound } from 'next/navigation'

async function getCustomer(id: string) {
  const customer = await prisma.customer.findUnique({
    where: { id },
    include: {
      permitPackages: {
        include: {
          contractor: {
            select: {
              id: true,
              companyName: true,
            },
          },
        },
        orderBy: { openedDate: 'desc' },
      },
    },
  })

  return customer
}

export default async function CustomerDetailPage({
  params,
}: {
  params: { id: string }
}) {
  const customer = await getCustomer(params.id)

  if (!customer) {
    notFound()
  }

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">{customer.name}</h1>
            {customer.contactName && (
              <p className="text-gray-600">Contact: {customer.contactName}</p>
            )}
          </div>
          <div className="flex gap-2">
            <Link href="/customers">
              <Button variant="outline">Back to Customers</Button>
            </Link>
          </div>
        </div>

        {/* Customer Information */}
        <Card>
          <CardHeader>
            <CardTitle>Contact Information</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-2">
              {customer.contactName && (
                <div>
                  <p className="text-sm font-medium text-gray-500">Contact Name</p>
                  <p className="text-sm">{customer.contactName}</p>
                </div>
              )}
              {customer.phone && (
                <div>
                  <p className="text-sm font-medium text-gray-500">Phone</p>
                  <p className="text-sm">{customer.phone}</p>
                </div>
              )}
              {customer.email && (
                <div>
                  <p className="text-sm font-medium text-gray-500">Email</p>
                  <a
                    href={`mailto:${customer.email}`}
                    className="text-sm text-blue-600 hover:underline"
                  >
                    {customer.email}
                  </a>
                </div>
              )}
              {customer.mainAddress && (
                <div>
                  <p className="text-sm font-medium text-gray-500">Main Address</p>
                  <p className="text-sm">{customer.mainAddress}</p>
                </div>
              )}
              {customer.notes && (
                <div className="md:col-span-2">
                  <p className="text-sm font-medium text-gray-500">Notes</p>
                  <p className="text-sm whitespace-pre-wrap">{customer.notes}</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Permit Packages */}
        <Card>
          <CardHeader>
            <CardTitle>Permit Packages ({customer.permitPackages.length})</CardTitle>
          </CardHeader>
          <CardContent>
            {customer.permitPackages.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b">
                      <th className="px-4 py-2 text-left text-sm font-medium text-gray-700">
                        Project Name
                      </th>
                      <th className="px-4 py-2 text-left text-sm font-medium text-gray-700">
                        Type
                      </th>
                      <th className="px-4 py-2 text-left text-sm font-medium text-gray-700">
                        Status
                      </th>
                      <th className="px-4 py-2 text-left text-sm font-medium text-gray-700">
                        Contractor
                      </th>
                      <th className="px-4 py-2 text-left text-sm font-medium text-gray-700">
                        Opened Date
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {customer.permitPackages.map((permit) => (
                      <tr key={permit.id} className="border-b hover:bg-gray-50">
                        <td className="px-4 py-2">
                          <Link
                            href={`/permits/${permit.id}`}
                            className="text-sm text-blue-600 hover:underline"
                          >
                            {permit.projectName}
                          </Link>
                        </td>
                        <td className="px-4 py-2 text-sm">{permit.permitType}</td>
                        <td className="px-4 py-2">
                          <StatusBadge status={permit.status} />
                        </td>
                        <td className="px-4 py-2">
                          <Link
                            href={`/contractors/${permit.contractor.id}`}
                            className="text-sm text-blue-600 hover:underline"
                          >
                            {permit.contractor.companyName}
                          </Link>
                        </td>
                        <td className="px-4 py-2 text-sm">
                          {formatDate(permit.openedDate)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="text-gray-500">No permit packages for this customer</p>
            )}
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  )
}

