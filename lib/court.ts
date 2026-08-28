/**
 * Ball-in-court grouping — presentation-layer only.
 *
 * Maps existing PermitStatus values onto "who holds the ball" so the
 * Operations Board can group work by ownership. No schema or query-shape
 * changes; this is a pure view-model mapping.
 *
 * "contractor" (waiting on contractor docs/tasks) can't be derived from
 * status alone — statusToCourt() stays pure status->court. See
 * resolveCourt() below for the task-aware override the board uses.
 */

export type Court = 'us' | 'contractor' | 'county' | 'field' | 'closed'

const STATUS_TO_COURT: Record<string, Court> = {
  New: 'us',
  RevisionsNeeded: 'us',
  Approved: 'us',
  Submitted: 'county',
  InReview: 'county',
  Issued: 'field',
  Inspections: 'field',
  FinaledClosed: 'closed',
  Canceled: 'closed',
}

/**
 * Open tasks whose names match these patterns are internal coordinator work
 * (billing handoff, county follow-up), not contractor-blocking. They should
 * not move a package into the "With contractor" court bucket.
 */
const INTERNAL_TASK_NAME_PATTERNS: RegExp[] = [
  /\bbilling\b/i,
  /send to billing/i,
  /follow up with (the )?county/i,
  /county follow[- ]?up/i,
]

export function isInternalTaskName(name: string): boolean {
  return INTERNAL_TASK_NAME_PATTERNS.some((pattern) => pattern.test(name))
}

/** True when at least one open task should block on the contractor. */
export function hasContractorBlockingTask(tasks: { name: string }[]): boolean {
  return tasks.some((task) => !isInternalTaskName(task.name))
}

/**
 * Prisma filter for packages with at least one open, contractor-blocking task.
 * Used by /permits?court=contractor and the dashboard distribution bar.
 */
export function openContractorBlockingTaskFilter() {
  return {
    some: {
      status: { not: 'Completed' as const },
      NOT: {
        OR: [
          { name: { contains: 'billing' } },
          { name: { contains: 'Billing' } },
          { name: { contains: 'county follow' } },
          { name: { contains: 'County follow' } },
          { name: { contains: 'Follow up with county' } },
          { name: { contains: 'follow up with county' } },
          { name: { contains: 'follow up with the county' } },
        ],
      },
    },
  }
}

export function statusToCourt(status: string): Court {
  return STATUS_TO_COURT[status] ?? 'us'
}

/**
 * Task-aware override of statusToCourt(), for views that have loaded a
 * package's open tasks (e.g. the Operations Board). A package whose status
 * alone would put it in 'us' or 'field' but that still has an incomplete
 * contractor-blocking task gets reassigned to 'contractor'. Internal tasks
 * (billing, county follow-up) do not trigger this override. 'county' and
 * 'closed' are never reassigned this way.
 */
export function resolveCourt(status: string, openTasks: { name: string }[]): Court {
  const base = statusToCourt(status)
  if (hasContractorBlockingTask(openTasks) && (base === 'us' || base === 'field')) {
    return 'contractor'
  }
  return base
}

/** Inverse mapping, for filtering queries by court (e.g. /permits?court=us). */
export function courtToStatuses(court: Court): string[] {
  return Object.entries(STATUS_TO_COURT)
    .filter(([, c]) => c === court)
    .map(([status]) => status)
}

export function isCourt(value: string | undefined): value is Court {
  return (
    value === 'us' ||
    value === 'contractor' ||
    value === 'county' ||
    value === 'field' ||
    value === 'closed'
  )
}

export interface CourtMeta {
  label: string
  description: string
  /** Tailwind class painting the court's solid color as background */
  barClass: string
  /** Tailwind class painting the court's color as text */
  textClass: string
  /** Label for the days counter column */
  daysLabel: string
}

export const COURT_ORDER: Court[] = ['us', 'contractor', 'county', 'field', 'closed']

export const COURT_META: Record<Court, CourtMeta> = {
  us: {
    label: 'Our court',
    description: 'Revisions to return, intakes to assemble, approvals to action',
    barClass: 'bg-court-us',
    textClass: 'text-court-us',
    daysLabel: 'days held',
  },
  contractor: {
    label: 'With contractor',
    description: 'Waiting on the contractor — open tasks outstanding on the package',
    barClass: 'bg-court-contractor',
    textClass: 'text-court-contractor',
    daysLabel: 'days waiting',
  },
  county: {
    label: 'With jurisdiction',
    description: 'Submitted or in plan review — watch for comment cycles',
    barClass: 'bg-court-county',
    textClass: 'text-court-county',
    daysLabel: 'days out',
  },
  field: {
    label: 'Fieldwork',
    description: 'Issued — inspections in progress',
    barClass: 'bg-court-field',
    textClass: 'text-court-field',
    daysLabel: 'days open',
  },
  closed: {
    label: 'Closing',
    description: 'Finaled or canceled — confirm billing and archive',
    barClass: 'bg-court-closed',
    textClass: 'text-court-closed',
    daysLabel: 'days',
  },
}
