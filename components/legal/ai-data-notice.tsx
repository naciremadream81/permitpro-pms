import Link from 'next/link'
import { legalRoutes } from '@/lib/site-config'

interface AiDataNoticeProps {
  compact?: boolean
}

/**
 * Disclosure before AI features send user or permit data to external model providers.
 */
export function AiDataNotice({ compact = false }: AiDataNoticeProps) {
  if (compact) {
    return (
      <p className="text-[11px] leading-relaxed text-muted">
        Your messages and relevant permit context are sent to third-party AI providers. Responses may be inaccurate. Do
        not rely on them for legal or compliance decisions.{' '}
        <Link
          href={legalRoutes.privacy}
          className="underline-offset-2 hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--focus-ring)]"
        >
          Privacy Policy
        </Link>
      </p>
    )
  }

  return (
    <div
      role="note"
      className="rounded-md border border-border bg-surface-inset px-3 py-2 text-xs leading-relaxed text-muted"
    >
      <p>
        <strong className="font-medium text-ink">AI disclosure:</strong> This feature
        may send your messages and relevant permit context to third-party AI providers
        (e.g. Anthropic or Google) for processing. Outputs are suggestions only—not
        legal, engineering, or permitting advice. Verify all information before
        submission to authorities.{' '}
        <Link
          href={legalRoutes.privacy}
          className="font-medium text-ink underline-offset-2 hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--focus-ring)]"
        >
          Privacy Policy
        </Link>
      </p>
    </div>
  )
}
