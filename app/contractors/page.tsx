/**
 * Contractors List Page
 *
 * Displays a list of all contractors with search, pagination, and compliance filters.
 */

import { AppLayout } from '@/components/layout/app-layout'
import { PageHeader } from '@/components/layout/page-header'
import { Button } from '@/components/ui/button'
import { prisma } from '@/lib/prisma'
import Link from 'next/link'

const COMPLIANCE_WARN_DAYS = 30

function isExpiringComplianceFilter(
  searchParams: { [key: string]: string | string[] | undefined }
): boolean {
  const value = searchParams.compliance
  if (typeof value === 'string') return value === 'expiring'
  return false
}

async function getContractors(searchParams: { [key: string]: string | string[] | undefined }) {
  const search = typeof searchParams.search === 'string' ? searchParams.search : ''
  const complianceExpiring = isExpiringComplianceFilter(searchParams)
  const page = parseInt(typeof searchParams.page === 'string' ? searchParams.page : '1')
  const limit = 20
  const skip = (page - 1) * limit

  const where: Record<string, unknown> = {}

  if (search) {
    where.OR = [
      { companyName: { contains: search, mode: 'insensitive' } },
      { licenseNumber: { contains: search, mode: 'insensitive' } },
      { email: { contains: search, mode: 'insensitive' } },
    ]
  }

  if (complianceExpiring) {
    const complianceCutoff = new Date(Date.now() + COMPLIANCE_WARN_DAYS * 24 * 60 * 60 * 1000)
    where.contractorDocuments = {
      some: {
        isSuperseded: false,
        expirationDate: { lt: complianceCutoff },
      },
    }
  }

  const [contractors, total] = await Promise.all([
    prisma.contractor.findMany({
      where,
      skip,
      take: limit,
      orderBy: { companyName: 'asc' },
    }),
    prisma.contractor.count({ where }),
  ])

  return { contractors, total, page, limit, totalPages: Math.ceil(total / limit), complianceExpiring }
}

export default async function ContractorsPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}) {
  const resolvedSearchParams = await searchParams
  const data = await getContractors(resolvedSearchParams)
  const search = typeof resolvedSearchParams.search === 'string' ? resolvedSearchParams.search : ''

  return (
    <AppLayout>
      <div className="mx-auto max-w-6xl">
        <PageHeader
          title="Contractors"
          description={
            data.complianceExpiring
              ? `Contractors with compliance documents expiring within ${COMPLIANCE_WARN_DAYS} days`
              : 'All contractors'
          }
          actions={
            <Link href="/contractors/new">
              <Button>New Contractor</Button>
            </Link>
          }
        />

        <form method="get" className="flex flex-col gap-3 border-b border-border py-4 sm:flex-row sm:items-center">
          {data.complianceExpiring && <input type="hidden" name="compliance" value="expiring" />}
          <label htmlFor="contractors-search" className="sr-only">
            Search contractors
          </label>
          <input
            id="contractors-search"
            type="search"
            name="search"
            placeholder="Search company, license, email…"
            defaultValue={search}
            className="pp-input flex-1"
          />
          <Button type="submit">Search</Button>
        </form>

        {data.complianceExpiring && (
          <div className="flex flex-wrap items-baseline justify-between gap-2 border-b border-border py-2.5 text-sm">
            <span className="flex items-baseline gap-3">
              <span className="border border-warning px-2 py-0.5 text-xs font-bold uppercase tracking-[0.1em] text-warning">
                Expiring
              </span>
              <span className="text-ink">
                Compliance documents expiring within {COMPLIANCE_WARN_DAYS} days
              </span>
            </span>
            <Link
              href="/contractors"
              className="text-xs font-bold uppercase tracking-[0.08em] text-accent hover:underline"
            >
              Clear filter
            </Link>
          </div>
        )}

        <section aria-label="Contractor register" className="pt-5">
          <p className="text-xs font-medium uppercase tracking-[0.08em] text-muted">
            Register — {data.total} contractor{data.total !== 1 ? 's' : ''}
          </p>
          <div className="mt-1 overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th className="px-4 py-2 text-left text-xs font-medium uppercase tracking-[0.08em] text-muted">Company</th>
                  <th className="px-4 py-2 text-left text-xs font-medium uppercase tracking-[0.08em] text-muted">License</th>
                  <th className="px-4 py-2 text-left text-xs font-medium uppercase tracking-[0.08em] text-muted">Email</th>
                  <th className="px-4 py-2 text-left text-xs font-medium uppercase tracking-[0.08em] text-muted">Phone</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {data.contractors.map((contractor) => (
                  <tr key={contractor.id} className="transition-colors hover:bg-surface-inset">
                    <td className="px-4 py-2.5">
                      <Link
                        href={`/contractors/${contractor.id}`}
                        className="font-bold text-accent hover:underline"
                      >
                        {contractor.companyName}
                      </Link>
                    </td>
                    <td className="px-4 py-2.5 text-muted">{contractor.licenseNumber || '—'}</td>
                    <td className="px-4 py-2.5 text-muted">{contractor.email || '—'}</td>
                    <td className="px-4 py-2.5 text-muted">{contractor.phone || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {data.contractors.length === 0 && (
            <p className="border-b border-border py-8 text-center text-sm text-muted">
              {data.complianceExpiring
                ? 'No contractors match the expiring compliance filter.'
                : 'No contractors found.'}
            </p>
          )}
        </section>
      </div>
    </AppLayout>
  )
}
