'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { legalRoutes, siteConfig } from '@/lib/site-config'

const STORAGE_KEY = 'permitpro-cookie-consent'

type ConsentState = 'pending' | 'essential-only'

function readConsent(): ConsentState {
  if (typeof window === 'undefined') return 'pending'
  try {
    if (localStorage.getItem(STORAGE_KEY) === 'essential-only') return 'essential-only'
  } catch {
    // Storage can be unavailable in private or restricted browsers.
  }
  return 'pending'
}

export function CookieConsentBanner() {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    setVisible(readConsent() === 'pending')
  }, [])

  function save(value: ConsentState) {
    try {
      localStorage.setItem(STORAGE_KEY, value)
    } catch {
      // Dismiss for this visit even when preferences cannot be persisted.
    }
    setVisible(false)
  }

  if (!visible) return null

  return (
    <div
      role="dialog"
      aria-labelledby="cookie-consent-title"
      aria-describedby="cookie-consent-desc"
      className="fixed inset-x-0 bottom-0 z-[200] border-t border-border bg-surface p-4 shadow-card-md md:px-10"
    >
      <div className="mx-auto flex max-w-5xl flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div className="max-w-2xl">
          <h2 id="cookie-consent-title" className="text-sm font-semibold text-ink">
            Cookie information
          </h2>
          <p id="cookie-consent-desc" className="mt-1 text-xs leading-relaxed text-muted">
            We use strictly necessary session cookies to keep you signed in.{' '}
            {siteConfig.cdnAnalyticsEnabled
              ? 'Our hosting provider may use analytics. This notice does not control tracking added by the hosting provider.'
              : 'We do not load marketing or behavioral analytics cookies in this application.'}{' '}
            See our{' '}
            <Link
              href={legalRoutes.cookies}
              className="font-medium text-ink underline-offset-2 hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--focus-ring)]"
            >
              Cookie Policy
            </Link>{' '}
            and{' '}
            <Link
              href={legalRoutes.privacy}
              className="font-medium text-ink underline-offset-2 hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--focus-ring)]"
            >
              Privacy Policy
            </Link>
            .
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => save('essential-only')}
            className="border border-border bg-canvas px-4 py-2 text-xs font-medium text-ink hover:bg-surface-inset focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--focus-ring)]"
          >
            Dismiss notice
          </button>

        </div>
      </div>
    </div>
  )
}
