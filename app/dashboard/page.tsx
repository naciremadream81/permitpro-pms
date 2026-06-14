/**
 * Operations Board — Unigrid reference screen (Phase 2).
 *
 * Attention-first home, organized by ball-in-court: a flat distribution bar
 * of the active pipeline, then work grouped by who holds the ball
 * (our court → with jurisdiction → fieldwork), each row led by a days-held
 * counter. Court grouping is presentation-only (lib/court.ts).
 *
 * Flagged data tweaks vs. the previous dashboard (same query surface, view
 * needs only): packages include their next open task, and the work-list
 * `take` was raised 8 → 25 so court groups aren't artificially truncated.
 */

export const dynamic = 'force-dynamic'

import { AppLayout } from '@/components/layout/app-layout'
import { PageHeader } from '@/components/layout/page-header'
import { StatusBadge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { prisma } from '@/lib/prisma'
import type { Prisma } from '@/lib/generated/prisma'
import { cn } from '@/lib/utils'
import { statusToCourt, COURT_META, COURT_ORDER, type Court } from '@/lib/court'
import Link from 'next/link'
import { getSession } from '@/lib/auth-helpers'
import { redirect } from 'next/navigation'

const STALL_DAYS = 3
const COMPLIANCE_WARN_DAYS = 30

// ─── Data fetching ────────────────────────────────────────────────────────────

const packageInclude = {
  customer: { select: { id: true, name: true } },
  contractor: { select: { id: true, companyName: true } },
  jurisdiction: { select: { name: true } },
  tasks: {
    where: { status: { not: 'Completed' } },
    orderBy: { dueDate: 'asc' },
    take: 1,
  },
} satisfies Prisma.PermitPackageInclude

async function getBoardData(userId: string, role: string) {
  const stallThreshold = new Date(Date.now() - STALL_DAYS * 24 * 60 * 60 * 1000)
  const complianceCutoff = new Date(Date.now() + COMPLIANCE_WARN_DAYS * 24 * 60 * 60 * 1000)

  const [
    stalledCount,
    openReviewComments,
    contractorAlerts,
    myPackages,
    teamPackages,
    reviewAssignments,
    permitsByStatus,
  ] = await Promise.all([
    prisma.permitPackage.count({
      where: {
        status: { notIn: ['FinaledClosed', 'Canceled', 'Approved'] },
        OR: [
          { lastActivityAt: { lt: stallThreshold } },
          { lastActivityAt: null, openedDate: { lt: stallThreshold } },
        ],
      },
    }),

    prisma.reviewComment.count({ where: { isResolved: false } }),

    prisma.contractorDocument.count({
      where: { isSuperseded: false, expirationDate: { lt: complianceCutoff } },
    }),

    role !== 'reviewer'
      ? prisma.permitPackage.findMany({
          where: {
            coordinatorId: userId,
            status: { notIn: ['FinaledClosed', 'Canceled'] },
          },
          include: packageInclude,
          orderBy: { lastActivityAt: 'asc' },
          take: 25,
        })
      : [],

    role === 'admin'
      ? prisma.permitPackage.findMany({
          where: { status: { notIn: ['FinaledClosed', 'Canceled'] } },
          include: packageInclude,
          orderBy: { lastActivityAt: 'asc' },
          take: 25,
        })
      : [],

    role === 'reviewer'
      ? prisma.reviewAssignment.findMany({
          where: {
            reviewerId: userId,
            status: { in: ['ASSIGNED', 'IN_REVIEW'] },
          },
          include: {
            package: {
              include: {
                customer: { select: { name: true } },
                jurisdiction: { select: { name: true } },
              },
            },
          },
          orderBy: { assignedAt: 'asc' },
          take: 25,
        })
      : [],

    prisma.permitPackage.groupBy({
      by: ['status'],
      _count: true,
      where: { status: { notIn: ['FinaledClosed', 'Canceled'] } },
    }),
  ])

  return {
    stalledCount,
    openReviewComments,
    contractorAlerts,
    myPackages,
    teamPackages,
    reviewAssignments,
    permitsByStatus,
  }
}

// ─── View helpers ─────────────────────────────────────────────────────────────

type BoardPackage = Awaited<ReturnType<typeof getBoardData>>['myPackages'][number]

function daysSince(date: Date | null | undefined, fallback: Date): number {
  const base = date ?? fallback
  return Math.max(0, Math.floor((Date.now() - base.getTime()) / (1000 * 60 * 60 * 24)))
}

function packageDays(pkg: BoardPackage, court: Court): number {
  if (court === 'field' || court === 'closed') return daysSince(pkg.openedDate, pkg.openedDate)
  return daysSince(pkg.lastActivityAt, pkg.openedDate)
}

function nextActionFor(pkg: BoardPackage): string {
  if (pkg.tasks[0]) return pkg.tasks[0].name
  switch (statusToCourt(pkg.status)) {
    case 'county':
      return 'Await county response'
    case 'field':
      return 'Coordinate inspections'
    case 'closed':
      return '—'
    default:
      return 'Review package'
  }
}

function groupByCourt(packages: BoardPackage[]): Map<Court, BoardPackage[]> {
  const groups = new Map<Court, BoardPackage[]>()
  for (const pkg of packages) {
    const court = statusToCourt(pkg.status)
    const list = groups.get(court) ?? []
    list.push(pkg)
    groups.set(court, list)
  }
  for (const list of Array.from(groups.values())) {
    list.sort((a, b) => packageDays(b, statusToCourt(b.status)) - packageDays(a, statusToCourt(a.status)))
  }
  return groups
}

function roleDescription(role: string): string {
  switch (role) {
    case 'admin':
      return 'Team pipeline grouped by who holds the ball'
    case 'reviewer':
      return 'Assignments awaiting your review'
    default:
      return 'Your packages grouped by who holds the ball'
  }
}

// ─── Components ───────────────────────────────────────────────────────────────

function NoticeRow({
  href,
  mark,
  markClass,
  count,
  children,
}: {
  href: string
  mark: string
  markClass: string
  count: number
  children: React.ReactNode
}) {
  return (
    <Link
      href={href}
      className="group flex items-baseline gap-4 border-b border-border py-2.5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
    >
      <span
        className={cn(
          'whitespace-nowrap border px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.1em]',
          markClass
        )}
      >
        {mark}
      </span>
      <span className="flex-1 text-sm text-ink group-hover:underline">{children}</span>
      <span className="text-sm font-bold text-muted">{count} →</span>
    </Link>
  )
}

function DistributionBar({ counts }: { counts: Record<Court, number> }) {
  const active = COURT_ORDER.filter(c => c !== 'closed' && counts[c] > 0)
  const total = active.reduce((sum, c) => sum + counts[c], 0)
  if (total === 0) return null

  return (
    <section aria-label="Active pipeline by court" className="border-b-2 border-ink pb-5 pt-4">
      <p className="mb-2.5 text-[11px] font-bold uppercase tracking-[0.14em] text-muted">
        Active pipeline — {total} package{total !== 1 ? 's' : ''} by court
      </p>
      <div className="flex h-8" role="img" aria-label={active.map(c => `${COURT_META[c].label}: ${counts[c]}`).join(', ')}>
        {active.map(court => (
          <div
            key={court}
            style={{ flexGrow: counts[court] }}
            className={cn(
              'grid min-w-[2.5rem] place-items-center text-[13px] font-bold text-white',
              COURT_META[court].barClass
            )}
          >
            {counts[court]}
          </div>
        ))}
      </div>
      <div className="mt-2.5 flex flex-wrap gap-x-6 gap-y-1">
        {active.map(court => (
          <Link
            key={court}
            href={`/permits?court=${court}`}
            className="flex items-center gap-2 text-xs text-muted hover:text-ink hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
          >
            <i className={cn('h-2.5 w-2.5', COURT_META[court].barClass)} aria-hidden />
            <b className="font-bold text-ink">{counts[court]}</b> {COURT_META[court].label.toLowerCase()}
          </Link>
        ))}
      </div>
    </section>
  )
}

const colHead =
  'text-[10px] font-bold uppercase tracking-[0.14em] text-muted'

function PackageRow({ pkg, court }: { pkg: BoardPackage; court: Court }) {
  const days = packageDays(pkg, court)
  const stalled = court !== 'closed' && days >= STALL_DAYS && statusToCourt(pkg.status) !== 'field'
  const nextAction = nextActionFor(pkg)

  return (
    <Link
      href={`/permits/${pkg.id}`}
      className="grid grid-cols-[64px_1fr] items-center gap-x-4 gap-y-1 border-b border-border py-3 transition-colors hover:bg-surface-inset focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent md:grid-cols-[80px_1.7fr_1fr_150px_1.2fr] md:gap-x-5"
    >
      <span className={cn('text-[26px] font-extrabold leading-none', stalled ? 'text-urgent' : 'text-ink')}>
        {days}
        <span className="mt-1 block text-[9px] font-semibold uppercase tracking-[0.12em] text-muted">
          {COURT_META[court].daysLabel}
          {stalled && <span className="sr-only"> — stalled</span>}
        </span>
      </span>

      <span className="min-w-0">
        <span className="block text-[11px] font-bold tracking-[0.08em] text-muted">
          {pkg.permitNumber ?? pkg.id.slice(0, 8).toUpperCase()}
        </span>
        <span className="block truncate text-[15px] font-bold text-ink">{pkg.projectName}</span>
        <span className="block truncate text-xs text-muted">
          {pkg.projectAddress} — {pkg.jurisdiction?.name ?? pkg.county ?? '—'}
        </span>
      </span>

      <span className="hidden min-w-0 text-[13px] text-ink md:block">
        <span className="block truncate">{pkg.customer.name}</span>
        <span className="block truncate text-xs text-muted">{pkg.contractor.companyName}</span>
      </span>

      <span className="hidden md:block">
        <StatusBadge status={pkg.status} />
      </span>

      <span className={cn('hidden truncate text-[13px] md:block', stalled ? 'font-semibold text-urgent' : 'text-ink')}>
        {nextAction}
      </span>
    </Link>
  )
}

function CourtGroup({ court, packages }: { court: Court; packages: BoardPackage[] }) {
  const meta = COURT_META[court]
  return (
    <section className="pt-8" aria-label={meta.label}>
      <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1 border-b-4 border-ink pb-2">
        <span className={cn('text-4xl font-extrabold leading-none', meta.textClass)}>
          {packages.length}
        </span>
        <h2 className={cn('text-base font-extrabold uppercase tracking-[0.08em]', meta.textClass)}>
          {meta.label}
        </h2>
        <span className="text-[13px] text-muted">{meta.description}</span>
      </div>
      <div className="hidden grid-cols-[80px_1.7fr_1fr_150px_1.2fr] gap-x-5 border-b border-ink py-1.5 md:grid">
        <span className={colHead}>{meta.daysLabel}</span>
        <span className={colHead}>Package</span>
        <span className={colHead}>Customer / Contractor</span>
        <span className={colHead}>Stage</span>
        <span className={colHead}>Next action</span>
      </div>
      {packages.map(pkg => (
        <PackageRow key={pkg.id} pkg={pkg} court={court} />
      ))}
    </section>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default async function DashboardPage() {
  const session = await getSession()
  if (!session) redirect('/login')

  const role = session.user.role ?? 'coordinator'
  const data = await getBoardData(session.user.id, role)

  const courtCounts: Record<Court, number> = { us: 0, county: 0, field: 0, closed: 0 }
  for (const s of data.permitsByStatus) {
    courtCounts[statusToCourt(s.status)] += s._count
  }

  const usingTeamFallback = role === 'admin' && data.myPackages.length === 0
  const boardPackages = usingTeamFallback ? data.teamPackages : data.myPackages
  const groups = groupByCourt(boardPackages)
  const hasNotices =
    data.stalledCount > 0 || data.contractorAlerts > 0 || data.openReviewComments > 0

  return (
    <AppLayout>
      <div className="mx-auto max-w-6xl">
        <PageHeader
          title="Operations Board"
          description={roleDescription(role)}
          actions={
            role !== 'reviewer' ? (
              <Link href="/permits/new">
                <Button>+ New Permit</Button>
              </Link>
            ) : undefined
          }
        />

        {hasNotices && (
          <section aria-label="Notices" className="pt-4">
            <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-muted">
              Notices — requires action
            </p>
            {data.stalledCount > 0 && (
              <NoticeRow
                href="/permits?stalled=1"
                mark="Stalled"
                markClass="border-urgent text-urgent"
                count={data.stalledCount}
              >
                <b className="font-semibold">{data.stalledCount} package{data.stalledCount !== 1 ? 's' : ''}</b>{' '}
                with no activity in {STALL_DAYS}+ days
              </NoticeRow>
            )}
            {data.contractorAlerts > 0 && (
              <NoticeRow
                href="/contractors?compliance=expiring"
                mark="Expiring"
                markClass="border-warning text-warning"
                count={data.contractorAlerts}
              >
                <b className="font-semibold">
                  {data.contractorAlerts} contractor compliance doc{data.contractorAlerts !== 1 ? 's' : ''}
                </b>{' '}
                expire within {COMPLIANCE_WARN_DAYS} days
              </NoticeRow>
            )}
            {data.openReviewComments > 0 && (
              <NoticeRow
                href="/review-queue?comments=open"
                mark="Comments"
                markClass="border-status-info text-status-info"
                count={data.openReviewComments}
              >
                <b className="font-semibold">
                  {data.openReviewComments} review comment{data.openReviewComments !== 1 ? 's' : ''}
                </b>{' '}
                remain unresolved
              </NoticeRow>
            )}
          </section>
        )}

        <div className="pt-5">
          <DistributionBar counts={courtCounts} />
        </div>

        {usingTeamFallback && data.teamPackages.length > 0 && (
          <p className="pt-4 text-sm text-muted">
            No packages assigned to you personally — showing the team pipeline.
          </p>
        )}

        {role === 'reviewer' ? (
          <section className="pt-8" aria-label="Your review queue">
            <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1 border-b-4 border-ink pb-2">
              <span className="text-4xl font-extrabold leading-none text-court-county">
                {data.reviewAssignments.length}
              </span>
              <h2 className="text-base font-extrabold uppercase tracking-[0.08em] text-court-county">
                Your review queue
              </h2>
              <span className="text-[13px] text-muted">oldest assignments first</span>
              <Link
                href="/review-queue"
                className="ml-auto text-xs font-bold uppercase tracking-[0.08em] text-accent hover:underline"
              >
                Open review queue →
              </Link>
            </div>
            {data.reviewAssignments.length === 0 ? (
              <p className="py-10 text-center text-sm text-muted">
                You&apos;re caught up — no active review assignments.
              </p>
            ) : (
              data.reviewAssignments.map(assignment => (
                <Link
                  key={assignment.id}
                  href={`/permits/${assignment.package.id}`}
                  className="grid grid-cols-[64px_1fr] items-center gap-x-4 border-b border-border py-3 transition-colors hover:bg-surface-inset focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent md:grid-cols-[80px_1.7fr_1fr_150px] md:gap-x-5"
                >
                  <span className="text-[26px] font-extrabold leading-none text-ink">
                    {daysSince(assignment.assignedAt, assignment.assignedAt)}
                    <span className="mt-1 block text-[9px] font-semibold uppercase tracking-[0.12em] text-muted">
                      days assigned
                    </span>
                  </span>
                  <span className="min-w-0">
                    <span className="block truncate text-[15px] font-bold text-ink">
                      {assignment.package.projectName}
                    </span>
                    <span className="block truncate text-xs text-muted">
                      {assignment.package.customer.name}
                    </span>
                  </span>
                  <span className="hidden truncate text-[13px] text-muted md:block">
                    {assignment.package.jurisdiction?.name ?? assignment.package.county ?? '—'}
                  </span>
                  <span className="hidden md:block">
                    <StatusBadge status={assignment.status} />
                  </span>
                </Link>
              ))
            )}
          </section>
        ) : boardPackages.length === 0 ? (
          <section className="border-b border-border py-14 text-center">
            <p className="font-bold uppercase tracking-[0.06em] text-ink">Nothing on your board</p>
            <p className="mx-auto mt-1 max-w-sm text-sm text-muted">
              Start a new permit package or browse the full list to pick up work from the team.
            </p>
            <div className="mt-5 flex flex-wrap items-center justify-center gap-2">
              <Link href="/permits/new">
                <Button>+ New Permit</Button>
              </Link>
              <Link href="/permits">
                <Button variant="outline">Browse all permits</Button>
              </Link>
            </div>
          </section>
        ) : (
          COURT_ORDER.map(court => {
            const packages = groups.get(court)
            if (!packages || packages.length === 0) return null
            return <CourtGroup key={court} court={court} packages={packages} />
          })
        )}

        <div className="mt-12 flex flex-wrap justify-between gap-2 border-t-4 border-ink pt-3 text-[11px] font-semibold uppercase tracking-[0.1em] text-muted">
          <span>
            {data.contractorAlerts > 0
              ? `${data.contractorAlerts} compliance doc${data.contractorAlerts !== 1 ? 's' : ''} expiring — see Contractors`
              : 'Contractor compliance: no expirations within 30 days'}
          </span>
          <span>PermitPro PMS · Operations Board</span>
        </div>
      </div>
    </AppLayout>
  )
}
