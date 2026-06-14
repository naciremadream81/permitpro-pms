/**
 * Ball-in-court grouping — presentation-layer only.
 *
 * Maps existing PermitStatus values onto "who holds the ball" so the
 * Operations Board can group work by ownership. No schema or query-shape
 * changes; this is a pure view-model mapping.
 *
 * Note: a future "contractor" court (waiting on contractor docs/tasks)
 * needs task/document signals, not status alone — deferred to Phase 3.
 */

export type Court = 'us' | 'county' | 'field' | 'closed'

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

export function statusToCourt(status: string): Court {
  return STATUS_TO_COURT[status] ?? 'us'
}

/** Inverse mapping, for filtering queries by court (e.g. /permits?court=us). */
export function courtToStatuses(court: Court): string[] {
  return Object.entries(STATUS_TO_COURT)
    .filter(([, c]) => c === court)
    .map(([status]) => status)
}

export function isCourt(value: string | undefined): value is Court {
  return value === 'us' || value === 'county' || value === 'field' || value === 'closed'
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

export const COURT_ORDER: Court[] = ['us', 'county', 'field', 'closed']

export const COURT_META: Record<Court, CourtMeta> = {
  us: {
    label: 'Our court',
    description: 'Revisions to return, intakes to assemble, approvals to action',
    barClass: 'bg-court-us',
    textClass: 'text-court-us',
    daysLabel: 'days held',
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
