/**
 * Permits List Page
 *
 * Displays a paginated list of all permit packages with filtering and search capabilities.
 */

import { AppLayout } from '@/components/layout/app-layout'
import { PageHeader } from '@/components/layout/page-header'
import { StatusBadge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { prisma } from '@/lib/prisma'
import { formatDate, formatPermitType, formatStatus } from '@/lib/utils'
import { COURT_META, courtToStatuses, isCourt, type Court } from '@/lib/court'
import Link from 'next/link'

const STALL_DAYS = 3

const COURT_BALL_TEXT: Record<Court, string> = {
  us: 'in our court',
  contractor: 'with the contractor',
  county: 'with the jurisdiction',
  field: 'in the field',
  closed: 'closing out',
}

const thClass =
  'px-4 py-2 text-left text-xs font-medium uppercase tracking-[0.08em] text-muted'
const tdLinkClass =
  'text-xs font-bold tracking-[0.06em] text-accent hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent'

function buildPermitsQuery(
  searchParams: { [key: string]: string | string[] | undefined },
  overrides: { page?: number } = {}
): string {
  const params = new URLSearchParams()

  const search = typeof searchParams.search === 'string' ? searchParams.search : ''
  const status = typeof searchParams.status === 'string' ? searchParams.status : ''
  const court = typeof searchParams.court === 'string' ? searchParams.court : ''
  const stalled =
    searchParams.stalled === '1' || searchParams.stalled === 'true'
  const page =
    overrides.page ??
    parseInt(typeof searchParams.page === 'string' ? searchParams.page : '1', 10)

  if (search) params.set('search', search)
  if (status) params.set('status', status)
  if (court) params.set('court', court)
  if (stalled) params.set('stalled', '1')
  if (page > 1) params.set('page', String(page))

  const query = params.toString()
  return query ? `?${query}` : ''
}

async function getPermits(searchParams: { [key: string]: string | string[] | undefined }) {
  const search = typeof searchParams.search === 'string' ? searchParams.search : ''
  const status = typeof searchParams.status === 'string' ? searchParams.status : undefined
  const permitType = typeof searchParams.permitType === 'string' ? searchParams.permitType : undefined
  const billingStatus = typeof searchParams.billingStatus === 'string' ? searchParams.billingStatus : undefined
  const stalled =
    searchParams.stalled === '1' ||
    searchParams.stalled === 'true'
  const page = parseInt(typeof searchParams.page === 'string' ? searchParams.page : '1')
  const limit = 20
  const skip = (page - 1) * limit

  const where: Record<string, unknown> = {}
  const andClauses: Record<string, unknown>[] = []

  if (stalled) {
    const stallThreshold = new Date(Date.now() - STALL_DAYS * 24 * 60 * 60 * 1000)
    andClauses.push({
      status: { notIn: ['FinaledClosed', 'Canceled', 'Approved'] },
      OR: [
        { lastActivityAt: { lt: stallThreshold } },
        { lastActivityAt: null, openedDate: { lt: stallThreshold } },
      ],
    })
  }

  if (search) {
    andClauses.push({
      OR: [
        { projectName: { contains: search } },
        { projectAddress: { contains: search } },
        { permitNumber: { contains: search } },
        { customer: { name: { contains: search } } },
        { contractor: { companyName: { contains: search } } },
      ],
    })
  }

  if (andClauses.length === 1) {
    Object.assign(where, andClauses[0])
  } else if (andClauses.length > 1) {
    where.AND = andClauses
  }

  const court = typeof searchParams.court === 'string' ? searchParams.court : undefined
  if (status && !stalled) {
    where.status = status
  } else if (!stalled && isCourt(court)) {
    // 'contractor' isn't a real status bucket (see lib/court.ts) — this
    // list query has no per-package task data to resolve it precisely, so
    // it falls back to the status-based statuses ('us' + 'field') that are
    // eligible for the contractor override on the board.
    where.status = {
      in:
        court === 'contractor'
          ? [...courtToStatuses('us'), ...courtToStatuses('field')]
          : courtToStatuses(court),
    }
  }
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
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}) {
  const resolvedSearchParams = await searchParams
  const data = await getPermits(resolvedSearchParams)
  const stalledFilter =
    resolvedSearchParams.stalled === '1' ||
    resolvedSearchParams.stalled === 'true'
  const statusFilter =
    typeof resolvedSearchParams.status === 'string' && resolvedSearchParams.status.length > 0
      ? resolvedSearchParams.status
      : undefined
  const courtParam = typeof resolvedSearchParams.court === 'string' ? resolvedSearchParams.court : undefined
  const courtFilter = !statusFilter && !stalledFilter && isCourt(courtParam) ? courtParam : undefined
  // Mirrors the where.status fallback in getPermits() above — 'contractor'
  // has no real statuses of its own, so the banner lists the 'us' + 'field'
  // statuses actually being queried for it.
  const courtFilterStatuses = courtFilter
    ? courtFilter === 'contractor'
      ? [...courtToStatuses('us'), ...courtToStatuses('field')]
      : courtToStatuses(courtFilter)
    : []

  return (
    <AppLayout>
      <div className="mx-auto max-w-6xl">
        <PageHeader
          title="Permits"
          description={
            stalledFilter
              ? `Stalled packages — no activity in ${STALL_DAYS}+ days`
              : statusFilter
                ? `${formatStatus(statusFilter)} packages`
                : courtFilter
                  ? `${COURT_META[courtFilter].label} — ${COURT_META[courtFilter].description.toLowerCase()}`
                  : 'All permit packages'
          }
          actions={
            <Link href="/permits/new">
              <Button>New permit</Button>
            </Link>
          }
        />

        <form
          method="get"
          className="flex flex-col gap-3 border-b border-border py-4 sm:flex-row sm:items-center"
        >
          {stalledFilter && <input type="hidden" name="stalled" value="1" />}
          {courtFilter && <input type="hidden" name="court" value={courtFilter} />}
          <label htmlFor="permits-search" className="sr-only">
            Search permits
          </label>
          <input
            id="permits-search"
            type="search"
            name="search"
            placeholder="Search permit no., address, customer…"
            defaultValue={typeof resolvedSearchParams.search === 'string' ? resolvedSearchParams.search : ''}
            className="pp-input flex-1"
          />
          <label htmlFor="permits-status" className="sr-only">
            Filter by status
          </label>
          <select
            id="permits-status"
            name="status"
            defaultValue={statusFilter ?? ''}
            className="pp-input sm:w-48"
          >
            <option value="">All statuses</option>
            <option value="New">New</option>
            <option value="Submitted">Submitted</option>
            <option value="InReview">In review</option>
            <option value="RevisionsNeeded">Revisions needed</option>
            <option value="Approved">Approved</option>
            <option value="Issued">Issued</option>
            <option value="Inspections">Inspections</option>
            <option value="FinaledClosed">Finaled / closed</option>
          </select>
          <Button type="submit">Filter</Button>
        </form>

        {courtFilter && (
          <div className="flex flex-wrap items-baseline justify-between gap-2 border-b border-border py-2.5 text-sm">
            <span className="flex items-baseline gap-3">
              <span className={`border px-2 py-0.5 text-xs font-bold uppercase tracking-[0.1em] ${COURT_META[courtFilter].textClass} border-current`}>
                {COURT_META[courtFilter].label}
              </span>
              <span className="text-ink">
                Showing packages where the ball is {COURT_BALL_TEXT[courtFilter]} ({courtFilterStatuses.map(formatStatus).join(', ')})
              </span>
            </span>
            <Link
              href="/permits"
              className="text-xs font-bold uppercase tracking-[0.08em] text-accent hover:underline"
            >
              Clear filter
            </Link>
          </div>
        )}

        {(stalledFilter || statusFilter) && (
          <div className="flex flex-wrap items-baseline justify-between gap-2 border-b border-border py-2.5 text-sm">
            <span className="flex items-baseline gap-3">
              <span
                className={
                  stalledFilter
                    ? 'border border-urgent px-2 py-0.5 text-xs font-bold uppercase tracking-[0.1em] text-urgent'
                    : 'border border-ink px-2 py-0.5 text-xs font-bold uppercase tracking-[0.1em] text-ink'
                }
              >
                {stalledFilter ? 'Stalled' : 'Filtered'}
              </span>
              <span className="text-ink">
                {stalledFilter
                  ? 'Showing stalled packages only'
                  : `Showing ${formatStatus(statusFilter!)} packages only`}
              </span>
            </span>
            <Link
              href="/permits"
              className="text-xs font-bold uppercase tracking-[0.08em] text-accent hover:underline"
            >
              Clear filter
            </Link>
          </div>
        )}

        <section aria-label="Permit register" className="pt-5">
          <p className="text-xs font-medium uppercase tracking-[0.08em] text-muted">
            Register — {data.total} permit{data.total !== 1 ? 's' : ''}
          </p>
          <div className="mt-1 overflow-x-auto">
            <table className="w-full text-sm" aria-label="Permit packages">
              <caption className="sr-only">All permit packages matching current filters</caption>
              <thead>
                <tr className="border-b border-border">
                  <th scope="col" className={thClass}>No.</th>
                  <th scope="col" className={thClass}>Project</th>
                  <th scope="col" className={thClass}>Customer</th>
                  <th scope="col" className={thClass}>Contractor</th>
                  <th scope="col" className={thClass}>Type</th>
                  <th scope="col" className={thClass}>Status</th>
                  <th scope="col" className={thClass}>Billing</th>
                  <th scope="col" className={thClass}>Opened</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {data.permits.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="px-4 py-10 text-center text-sm text-muted">
                      No permits match the current filters.
                    </td>
                  </tr>
                ) : (
                  data.permits.map((permit) => (
                    <tr key={permit.id} className="transition-colors hover:bg-surface-inset">
                      <td className="whitespace-nowrap px-4 py-2.5">
                        <Link href={`/permits/${permit.id}`} className={tdLinkClass}>
                          {permit.permitNumber ?? `${permit.id.slice(0, 8).toUpperCase()}…`}
                        </Link>
                      </td>
                      <td className="px-4 py-2.5 font-bold text-ink">
                        {permit.projectName}
                        {permit.projectAddress && (
                          <span className="block text-xs font-normal text-muted">
                            {permit.projectAddress}
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-2.5 text-muted">{permit.customer.name}</td>
                      <td className="px-4 py-2.5 text-muted">{permit.contractor.companyName}</td>
                      <td className="px-4 py-2.5 text-muted">{formatPermitType(permit.permitType)}</td>
                      <td className="px-4 py-2.5">
                        <StatusBadge status={permit.status} />
                      </td>
                      <td className="px-4 py-2.5">
                        <StatusBadge status={permit.billingStatus} />
                      </td>
                      <td className="whitespace-nowrap px-4 py-2.5 text-xs text-muted">
                        {formatDate(permit.openedDate)}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          <div className="mt-0 flex flex-wrap items-center justify-between gap-2 border-t border-border pt-3">
            <p className="text-xs font-bold uppercase tracking-[0.1em] text-muted">
              Page {data.page} of {Math.max(data.totalPages, 1)}
            </p>
            {data.totalPages > 1 && (
              <div className="flex gap-2">
                {data.page > 1 && (
                  <Link href={buildPermitsQuery(resolvedSearchParams, { page: data.page - 1 })}>
                    <Button variant="outline" size="sm">
                      ← Previous
                    </Button>
                  </Link>
                )}
                {data.page < data.totalPages && (
                  <Link href={buildPermitsQuery(resolvedSearchParams, { page: data.page + 1 })}>
                    <Button variant="outline" size="sm">
                      Next →
                    </Button>
                  </Link>
                )}
              </div>
            )}
          </div>
        </section>
      </div>
    </AppLayout>
  )
}
