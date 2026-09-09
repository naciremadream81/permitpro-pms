import Link from 'next/link'
import { siteConfig } from '@/lib/site-config'
import { LegalNavLinks } from './legal-nav-links'

interface LegalPageLayoutProps {
  title: string
  lastUpdated: string
  children: React.ReactNode
}

export function LegalPageLayout({
  title,
  lastUpdated,
  children,
}: LegalPageLayoutProps) {
  return (
    <div className="min-h-screen bg-canvas text-ink">
      <a href="#legal-main" className="pp-skip-link">
        Skip to main content
      </a>

      <header className="border-b border-border bg-surface px-4 py-4 md:px-10">
        <div className="mx-auto flex max-w-3xl flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <Link
            href="/login"
            className="text-sm font-semibold text-ink no-underline hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--focus-ring)]"
          >
            {siteConfig.productName}
          </Link>
          <LegalNavLinks
            className="text-xs text-muted"
            linkClassName="text-muted underline-offset-2 hover:text-ink hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--focus-ring)]"
          />
        </div>
      </header>

      <main
        id="legal-main"
        tabIndex={-1}
        className="mx-auto max-w-3xl px-4 py-10 md:px-6 focus:outline-none"
      >
        <h1 className="text-3xl font-bold tracking-tight text-ink">{title}</h1>
        <p className="mt-2 text-sm text-muted">Last updated: {lastUpdated}</p>

        <div className="prose-legal mt-8 space-y-6 text-sm leading-relaxed text-ink">
          {children}
        </div>
      </main>

      <footer className="border-t border-border bg-surface px-4 py-6 md:px-10">
        <div className="mx-auto max-w-3xl text-xs text-muted">
          <p>
            © {siteConfig.copyrightYear} {siteConfig.legalName}. All rights
            reserved.
          </p>
          <p className="mt-1">{siteConfig.address}</p>
          <p className="mt-2">
            <a
              href={`mailto:${siteConfig.email}`}
              className="underline-offset-2 hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--focus-ring)]"
            >
              {siteConfig.email}
            </a>
            {siteConfig.phone && (
              <>
                {' · '}
                <a
                  href={`tel:${siteConfig.phone.replace(/\D/g, '')}`}
                  className="underline-offset-2 hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--focus-ring)]"
                >
                  {siteConfig.phone}
                </a>
              </>
            )}
          </p>
        </div>
      </footer>
    </div>
  )
}
