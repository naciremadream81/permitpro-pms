import type { Metadata } from 'next'
import { LegalPageLayout } from '@/components/legal/legal-page-layout'
import { siteConfig } from '@/lib/site-config'

export const metadata: Metadata = {
  title: `Privacy Policy | ${siteConfig.productName}`,
  description: `How ${siteConfig.legalName} collects, uses, and protects personal information.`,
}

const LAST_UPDATED = 'September 7, 2026'

export default function PrivacyPolicyPage() {
  return (
    <LegalPageLayout title="Privacy Policy" lastUpdated={LAST_UPDATED}>
      <section>
        <h2 className="text-lg font-semibold text-ink">1. Who we are</h2>
        <p className="mt-2">
          {siteConfig.legalName} (&quot;we,&quot; &quot;us,&quot; or &quot;our&quot;)
          operates {siteConfig.productName}, a business-to-business permit coordination
          and document management platform. This Privacy Policy explains how we collect,
          use, disclose, and protect information when you use our service.
        </p>
        <p className="mt-2">
          <strong>Controller:</strong> {siteConfig.legalName}<br />
          <strong>Address:</strong> {siteConfig.address}<br />
          <strong>Contact:</strong>{' '}
          <a href={`mailto:${siteConfig.email}`} className="underline-offset-2 hover:underline">
            {siteConfig.email}
          </a>
        </p>
      </section>

      <section>
        <h2 className="text-lg font-semibold text-ink">2. Scope</h2>
        <p className="mt-2">
          This policy applies to authorized users of {siteConfig.productName} (employees
          and contractors of our business customers) and visitors to our login and legal
          pages. It does not cover third-party websites linked from the service.
        </p>
      </section>

      <section>
        <h2 className="text-lg font-semibold text-ink">3. Information we collect</h2>
        <ul className="mt-2 list-disc space-y-1 pl-5">
          <li>
            <strong>Account data:</strong> name, email address, password (stored as a
            cryptographic hash), and role.
          </li>
          <li>
            <strong>Customer and contractor records:</strong> names, contact details,
            addresses, license numbers, insurance dates, and notes entered by your
            organization.
          </li>
          <li>
            <strong>Permit packages:</strong> project names, addresses, jurisdiction
            details, documents, checklists, review notes, and activity logs.
          </li>
          <li>
            <strong>Uploaded files:</strong> permits, licenses, insurance certificates,
            W-9 forms, and related documents you upload.
          </li>
          <li>
            <strong>Technical data:</strong> session cookies, IP address, browser type,
            and server logs needed to operate and secure the service.
          </li>
          <li>
            <strong>AI assistant usage (if enabled):</strong> chat messages and permit
            context you submit to AI features.
          </li>
        </ul>
        <p className="mt-2">
          We collect only information reasonably necessary to provide permit coordination
          services. Do not submit sensitive categories of data (e.g. Social Security
          numbers, full payment card numbers) unless required for a specific workflow
          and permitted by your organization&apos;s policies.
        </p>
      </section>

      <section>
        <h2 className="text-lg font-semibold text-ink">4. How we use information</h2>
        <ul className="mt-2 list-disc space-y-1 pl-5">
          <li>Authenticate users and maintain sessions</li>
          <li>Store and manage permit packages, customers, contractors, and documents</li>
          <li>Support internal review workflows and operational reporting</li>
          <li>Look up property and jurisdiction data to assist permit preparation</li>
          <li>Provide optional AI-assisted suggestions (when configured)</li>
          <li>Protect against fraud, abuse, and security incidents</li>
          <li>Comply with legal obligations</li>
        </ul>
        <p className="mt-2">
          We do not sell personal information. We do not use in-app behavioral advertising
          or marketing analytics.
        </p>
      </section>

      <section>
        <h2 className="text-lg font-semibold text-ink">5. Legal bases (where applicable)</h2>
        <p className="mt-2">
          For users in jurisdictions that require a legal basis (including the EEA/UK under
          GDPR): we process data based on contract performance (providing the service to
          your organization), legitimate interests (security, product improvement), and
          legal obligations. Where we act as a processor on behalf of your organization,
          your organization is the controller and determines the lawful basis for
          customer/contractor data you enter.
        </p>
      </section>

      <section>
        <h2 className="text-lg font-semibold text-ink">6. Third-party subprocessors</h2>
        <p className="mt-2">We may share information with service providers that help us operate the platform, including:</p>
        <ul className="mt-2 list-disc space-y-1 pl-5">
          <li>
            <strong>Hosting and infrastructure</strong> (e.g. cloud servers, CDN) — to
            deliver the application
          </li>
          <li>
            <strong>Esri ArcGIS</strong> — to geocode project addresses and retrieve
            Florida statewide property parcel data (addresses/coordinates only as needed)
          </li>
          <li>
            <strong>AI providers</strong> (e.g. Anthropic, Google) — when AI features
            are enabled and you submit prompts or permit context
          </li>
          <li>
            <strong>Authentication</strong> — session management via NextAuth (JWT cookies)
          </li>
        </ul>
        <p className="mt-2">
          Optional CDN-level analytics (e.g. Cloudflare Web Analytics), if enabled at
          deployment, may collect anonymized usage metrics. See our Cookie Policy.
        </p>
      </section>

      <section>
        <h2 className="text-lg font-semibold text-ink">7. Data retention</h2>
        <p className="mt-2">
          We retain data for as long as your organization&apos;s account is active or as
          needed to provide the service, comply with law, resolve disputes, and enforce
          agreements. Uploaded documents and permit records are retained according to your
          organization&apos;s operational needs and applicable record-keeping requirements.
        </p>
      </section>

      <section>
        <h2 className="text-lg font-semibold text-ink">8. Security</h2>
        <p className="mt-2">
          We use industry-standard measures including access controls, encrypted transport
          (HTTPS), password hashing, and role-based permissions. No method of transmission
          or storage is 100% secure; report suspected incidents to{' '}
          <a href={`mailto:${siteConfig.email}`} className="underline-offset-2 hover:underline">
            {siteConfig.email}
          </a>
          .
        </p>
      </section>

      <section>
        <h2 className="text-lg font-semibold text-ink">9. Your rights</h2>
        <p className="mt-2">
          Depending on your location, you may have rights to access, correct, delete,
          restrict, or port personal information, and to object to certain processing.
        </p>
        <ul className="mt-2 list-disc space-y-1 pl-5">
          <li>
            <strong>California (CCPA/CPRA):</strong> California residents may request
            disclosure, deletion, and correction of personal information. We do not sell
            or share personal information for cross-context behavioral advertising.
          </li>
          <li>
            <strong>Florida:</strong> Florida users may have rights under the Florida
            Digital Bill of Rights where applicable to our processing activities.
          </li>
          <li>
            <strong>EEA/UK:</strong> You may lodge a complaint with your local supervisory
            authority. Contact us first at {siteConfig.email}.
          </li>
        </ul>
        <p className="mt-2">
          Authorized users should contact their organization administrator for data entered
          on behalf of customers or contractors. Direct requests to{' '}
          <a href={`mailto:${siteConfig.email}`} className="underline-offset-2 hover:underline">
            {siteConfig.email}
          </a>
          .
        </p>
      </section>

      <section>
        <h2 className="text-lg font-semibold text-ink">10. Children</h2>
        <p className="mt-2">
          {siteConfig.productName} is a business service not directed to children under 16.
          We do not knowingly collect information from children.
        </p>
      </section>

      <section>
        <h2 className="text-lg font-semibold text-ink">11. International transfers</h2>
        <p className="mt-2">
          If you access the service from outside the United States, your information may
          be processed in the United States or other countries where our providers operate.
          We take steps to ensure appropriate safeguards where required by law.
        </p>
      </section>

      <section>
        <h2 className="text-lg font-semibold text-ink">12. Changes</h2>
        <p className="mt-2">
          We may update this policy. Material changes will be posted on this page with an
          updated &quot;Last updated&quot; date. Continued use after changes constitutes
          acceptance where permitted by law.
        </p>
      </section>
    </LegalPageLayout>
  )
}
