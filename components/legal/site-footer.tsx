import { siteConfig } from '@/lib/site-config'
import { LegalNavLinks } from './legal-nav-links'

export function SiteFooter() {
  return (
    <footer
      role="contentinfo"
      className="mt-auto border-t border-border bg-surface px-4 py-4 md:px-10"
    >
      <div className="flex flex-col gap-3 text-xs text-muted sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="font-medium text-ink">{siteConfig.legalName}</p>
          <p className="mt-0.5">{siteConfig.address}</p>
          <p className="mt-1">
            <a
              href={`mailto:${siteConfig.supportEmail}`}
              className="underline-offset-2 hover:text-ink hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--focus-ring)]"
            >
              {siteConfig.supportEmail}
            </a>
            {' · '}
            <a
              href={`tel:${siteConfig.phone.replace(/\D/g, '')}`}
              className="underline-offset-2 hover:text-ink hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--focus-ring)]"
            >
              {siteConfig.phone}
            </a>
          </p>
          <p className="mt-2">
            © {siteConfig.copyrightYear} {siteConfig.legalName}. All rights
            reserved.
          </p>
        </div>
        <LegalNavLinks
          className="shrink-0 leading-relaxed"
          linkClassName="text-muted underline-offset-2 hover:text-ink hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--focus-ring)]"
          separator=" | "
        />
      </div>
    </footer>
  )
}
