import Link from 'next/link'
import { legalRoutes } from '@/lib/site-config'

interface FormDataNoticeProps {
  /** Short description of what data this form collects. */
  purpose: string
  /** Whether third-party services receive data from this form (e.g. geocoding). */
  thirdParty?: string
}

/**
 * Point-of-collection notice for forms that store personal or business data.
 */
export function FormDataNotice({ purpose, thirdParty }: FormDataNoticeProps) {
  return (
    <div
      role="note"
      className="rounded-md border border-border bg-surface-inset px-3 py-2.5 text-xs leading-relaxed text-muted"
    >
      <p>
        <strong className="font-medium text-ink">Data use:</strong> {purpose}{' '}
        Only provide information needed for permit coordination. See our{' '}
        <Link
          href={legalRoutes.privacy}
          className="font-medium text-ink underline-offset-2 hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--focus-ring)]"
        >
          Privacy Policy
        </Link>
        .
      </p>
      {thirdParty && (
        <p className="mt-1.5">
          <strong className="font-medium text-ink">Third parties:</strong>{' '}
          {thirdParty}
        </p>
      )}
    </div>
  )
}
