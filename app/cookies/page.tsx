import type { Metadata } from 'next'
import { LegalPageLayout } from '@/components/legal/legal-page-layout'
import { siteConfig } from '@/lib/site-config'

export const metadata: Metadata = {
  title: `Cookie Policy | ${siteConfig.productName}`,
  description: `How ${siteConfig.productName} uses cookies and similar technologies.`,
}

const LAST_UPDATED = 'September 7, 2026'

export default function CookiePolicyPage() {
  return (
    <LegalPageLayout title="Cookie Policy" lastUpdated={LAST_UPDATED}>
      <section>
        <h2 className="text-lg font-semibold text-ink">1. What are cookies?</h2>
        <p className="mt-2">
          Cookies are small text files stored on your device when you visit a website.
          They help websites remember your session, preferences, and—when used—aggregate
          usage statistics.
        </p>
      </section>

      <section>
        <h2 className="text-lg font-semibold text-ink">2. How we use cookies</h2>
        <p className="mt-2">
          {siteConfig.productName} is a authenticated business application. We use cookies
          sparingly and do not load third-party advertising or behavioral tracking scripts
          in the application code.
        </p>
      </section>

      <section>
        <h2 className="text-lg font-semibold text-ink">3. Cookies we use</h2>
        <div className="mt-3 overflow-x-auto">
          <table className="w-full border-collapse text-left text-xs">
            <thead>
              <tr className="border-b border-border">
                <th className="py-2 pr-4 font-semibold text-ink">Name / type</th>
                <th className="py-2 pr-4 font-semibold text-ink">Purpose</th>
                <th className="py-2 pr-4 font-semibold text-ink">Duration</th>
                <th className="py-2 font-semibold text-ink">Category</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              <tr>
                <td className="py-2 pr-4 align-top font-mono text-[11px]">
                  next-auth.session-token (or __Secure-* variant)
                </td>
                <td className="py-2 pr-4 align-top">
                  Keeps you signed in after authentication
                </td>
                <td className="py-2 pr-4 align-top">Session / up to 30 days</td>
                <td className="py-2 align-top">
                  <strong>Strictly necessary</strong>
                </td>
              </tr>
              <tr>
                <td className="py-2 pr-4 align-top font-mono text-[11px]">
                  next-auth.csrf-token
                </td>
                <td className="py-2 pr-4 align-top">
                  Protects login and sign-out requests from cross-site request forgery
                </td>
                <td className="py-2 pr-4 align-top">Session</td>
                <td className="py-2 align-top">
                  <strong>Strictly necessary</strong>
                </td>
              </tr>
              <tr>
                <td className="py-2 pr-4 align-top font-mono text-[11px]">
                  next-auth.callback-url
                </td>
                <td className="py-2 pr-4 align-top">
                  Remembers where to redirect after login
                </td>
                <td className="py-2 pr-4 align-top">Session</td>
                <td className="py-2 align-top">
                  <strong>Strictly necessary</strong>
                </td>
              </tr>
              <tr>
                <td className="py-2 pr-4 align-top font-mono text-[11px]">
                  permitpro-cookie-consent (localStorage)
                </td>
                <td className="py-2 pr-4 align-top">
                  Records dismissal of the cookie information notice
                </td>
                <td className="py-2 pr-4 align-top">Until cleared</td>
                <td className="py-2 align-top">
                  <strong>Functional</strong>
                </td>
              </tr>
              {siteConfig.cdnAnalyticsEnabled && (
                <tr>
                  <td className="py-2 pr-4 align-top font-mono text-[11px]">
                    _cf_bm / cf_clearance (Cloudflare)
                  </td>
                  <td className="py-2 pr-4 align-top">
                    Security and optional privacy-preserving analytics at the CDN layer
                  </td>
                  <td className="py-2 pr-4 align-top">Varies</td>
                  <td className="py-2 align-top">
                    <strong>Analytics / security</strong> (optional)
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      <section>
        <h2 className="text-lg font-semibold text-ink">4. Do you need cookie consent?</h2>
        <p className="mt-2">
          <strong>Strictly necessary cookies</strong> (authentication and security) do not
          require consent under EU ePrivacy rules and similar frameworks because the service
          cannot function without them.
        </p>
        <p className="mt-2">
          {siteConfig.cdnAnalyticsEnabled
            ? 'The application notice cannot control analytics injected by a hosting provider. Optional tracking must remain disabled until the deployment provides a separate consent mechanism that prevents tracking before consent and honors refusal.'
            : 'We do not currently load optional analytics cookies in the application. If your hosting provider adds analytics at the CDN level, enable NEXT_PUBLIC_CDN_ANALYTICS_ENABLED and the consent banner will reflect that.'}
        </p>
      </section>

      <section>
        <h2 className="text-lg font-semibold text-ink">5. Managing cookies</h2>
        <p className="mt-2">
          You can clear cookies through your browser settings. Clearing authentication
          cookies will sign you out. To show the cookie notice again, clear site data for this
          domain or remove the <code className="text-[11px]">permitpro-cookie-consent</code>{' '}
          entry from localStorage.
        </p>
      </section>

      <section>
        <h2 className="text-lg font-semibold text-ink">6. Contact</h2>
        <p className="mt-2">
          Questions:{' '}
          <a href={`mailto:${siteConfig.email}`} className="underline-offset-2 hover:underline">
            {siteConfig.email}
          </a>
        </p>
      </section>
    </LegalPageLayout>
  )
}
