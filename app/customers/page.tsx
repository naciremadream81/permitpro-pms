/**
 * Customers List Page
 * 
 * Displays a list of all customers with search and pagination.
 */

import { AppLayout } from '@/components/layout/app-layout'
import { PageHeader } from '@/components/layout/page-header'
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
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}) {
  const resolvedSearchParams = await searchParams
  const data = await getCustomers(resolvedSearchParams)

  return (
    <AppLayout>
      <div className="mx-auto max-w-6xl">
        <PageHeader
          title="Customers"
          description="All customers"
          actions={
            <Link href="/customers/new">
              <Button>New Customer</Button>
            </Link>
          }
        />

        <section aria-label="Customer register" className="pt-5">
          <p className="text-xs font-medium uppercase tracking-[0.08em] text-muted">
            Register — {data.total} customer{data.total !== 1 ? 's' : ''}
          </p>
          <div className="mt-1 overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th className="px-4 py-2 text-left text-xs font-medium uppercase tracking-[0.08em] text-muted">Name</th>
                  <th className="px-4 py-2 text-left text-xs font-medium uppercase tracking-[0.08em] text-muted">Contact</th>
                  <th className="px-4 py-2 text-left text-xs font-medium uppercase tracking-[0.08em] text-muted">Email</th>
                  <th className="px-4 py-2 text-left text-xs font-medium uppercase tracking-[0.08em] text-muted">Phone</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {data.customers.map((customer) => (
                  <tr key={customer.id} className="transition-colors hover:bg-surface-inset">
                    <td className="px-4 py-2.5">
                      <Link
                        href={`/customers/${customer.id}`}
                        className="font-bold text-accent hover:underline"
                      >
                        {customer.name}
                      </Link>
                    </td>
                    <td className="px-4 py-2.5 text-muted">{customer.contactName || '—'}</td>
                    <td className="px-4 py-2.5 text-muted">{customer.email || '—'}</td>
                    <td className="px-4 py-2.5 text-muted">{customer.phone || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </AppLayout>
  )
}
