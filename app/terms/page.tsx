import type { Metadata } from 'next'
import { LegalPageLayout } from '@/components/legal/legal-page-layout'
import { siteConfig } from '@/lib/site-config'

export const metadata: Metadata = {
  title: `Terms & Conditions | ${siteConfig.productName}`,
  description: `Terms governing use of ${siteConfig.productName}.`,
}

const LAST_UPDATED = 'September 7, 2026'

export default function TermsPage() {
  return (
    <LegalPageLayout title="Terms & Conditions" lastUpdated={LAST_UPDATED}>
      <section>
        <h2 className="text-lg font-semibold text-ink">1. Agreement</h2>
        <p className="mt-2">
          These Terms &amp; Conditions (&quot;Terms&quot;) are a binding agreement between{' '}
          {siteConfig.legalName} (&quot;Company,&quot; &quot;we,&quot; &quot;us&quot;) and
          the organization that authorizes use of {siteConfig.productName} (&quot;Customer&quot;)
          and each individual user (&quot;User&quot;). By accessing or using the service,
          you agree to these Terms.
        </p>
      </section>

      <section>
        <h2 className="text-lg font-semibold text-ink">2. Service description</h2>
        <p className="mt-2">
          {siteConfig.productName} is a software-as-a-service platform for permit
          coordination, document management, checklist tracking, and internal review
          workflows. The service is a business tool—it does not file permits with
          government agencies on your behalf unless explicitly agreed in a separate written
          statement of work.
        </p>
      </section>

      <section>
        <h2 className="text-lg font-semibold text-ink">3. Accounts and access</h2>
        <ul className="mt-2 list-disc space-y-1 pl-5">
          <li>Access is provided to authorized Users only.</li>
          <li>Customer is responsible for User credentials and role assignments.</li>
          <li>Users must keep passwords confidential and notify us of unauthorized access.</li>
          <li>We may suspend access for security, legal, or Terms violations.</li>
        </ul>
      </section>

      <section>
        <h2 className="text-lg font-semibold text-ink">4. Customer data and responsibilities</h2>
        <p className="mt-2">
          Customer retains ownership of data entered into the service. Customer represents
          that it has all rights and consents needed to upload documents and personal
          information about its customers, contractors, and projects. Customer is
          responsible for the accuracy of permit submissions to authorities and for
          compliance with applicable building codes, licensing, and privacy laws.
        </p>
      </section>

      <section>
        <h2 className="text-lg font-semibold text-ink">5. Acceptable use</h2>
        <p className="mt-2">You agree not to:</p>
        <ul className="mt-2 list-disc space-y-1 pl-5">
          <li>Use the service for unlawful purposes or to store malware</li>
          <li>Attempt to bypass security or access another User&apos;s data without authorization</li>
          <li>Reverse engineer the service except where permitted by law</li>
          <li>Upload content that infringes third-party intellectual property rights</li>
          <li>Misrepresent permit status, approvals, or regulatory compliance</li>
        </ul>
      </section>

      <section>
        <h2 className="text-lg font-semibold text-ink">6. AI features disclaimer</h2>
        <p className="mt-2">
          Optional AI-assisted features provide automated suggestions only. AI outputs may
          be incomplete or incorrect. They are not legal, engineering, architectural, or
          permitting advice. Users must independently verify all checklist items, document
          requirements, and jurisdiction rules before submission. Company disclaims
          liability for decisions made based on AI-generated content.
        </p>
      </section>

      <section>
        <h2 className="text-lg font-semibold text-ink">7. Third-party services</h2>
        <p className="mt-2">
          The service integrates with third-party data sources (e.g. Esri geocoding,
          Florida property records) and optional AI providers. Those services are subject
          to their own terms. We are not responsible for third-party availability or
          accuracy.
        </p>
      </section>

      <section>
        <h2 className="text-lg font-semibold text-ink">8. Fees and payment</h2>
        <p className="mt-2">
          Fees, billing cycles, and payment terms are set forth in your order form,
          subscription agreement, or invoice. Unless otherwise stated, fees are non-refundable
          except as described in our Refund Policy or required by law.
        </p>
      </section>

      <section>
        <h2 className="text-lg font-semibold text-ink">9. Intellectual property</h2>
        <p className="mt-2">
          We own the service, software, branding, and documentation. Customer receives a
          limited, non-exclusive, non-transferable right to use the service during the
          subscription term. Customer grants us a license to host and process Customer
          data solely to provide the service.
        </p>
      </section>

      <section>
        <h2 className="text-lg font-semibold text-ink">10. Confidentiality</h2>
        <p className="mt-2">
          Each party will protect the other&apos;s confidential information using reasonable
          care and use it only for purposes of the relationship. This obligation does not
          apply to information that is public, independently developed, or rightfully
          received from a third party.
        </p>
      </section>

      <section>
        <h2 className="text-lg font-semibold text-ink">11. Warranty disclaimer</h2>
        <p className="mt-2">
          THE SERVICE IS PROVIDED &quot;AS IS&quot; AND &quot;AS AVAILABLE.&quot; TO THE
          MAXIMUM EXTENT PERMITTED BY LAW, WE DISCLAIM ALL WARRANTIES, EXPRESS OR IMPLIED,
          INCLUDING MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE, AND NON-INFRINGEMENT.
          WE DO NOT WARRANT THAT THE SERVICE WILL BE ERROR-FREE, UNINTERRUPTED, OR THAT
          PERMITS WILL BE APPROVED BY ANY AUTHORITY.
        </p>
      </section>

      <section>
        <h2 className="text-lg font-semibold text-ink">12. Limitation of liability</h2>
        <p className="mt-2">
          TO THE MAXIMUM EXTENT PERMITTED BY LAW, COMPANY&apos;S TOTAL LIABILITY ARISING
          OUT OF OR RELATED TO THESE TERMS OR THE SERVICE WILL NOT EXCEED THE AMOUNTS PAID
          BY CUSTOMER TO COMPANY IN THE TWELVE (12) MONTHS BEFORE THE CLAIM. WE ARE NOT
          LIABLE FOR INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES,
          OR FOR LOST PROFITS, DATA, OR BUSINESS OPPORTUNITIES, EVEN IF ADVISED OF THE
          POSSIBILITY.
        </p>
        <p className="mt-2">
          Some jurisdictions do not allow certain limitations; in those cases, our liability
          is limited to the greatest extent permitted by law.
        </p>
      </section>

      <section>
        <h2 className="text-lg font-semibold text-ink">13. Indemnification</h2>
        <p className="mt-2">
          Customer will defend and indemnify Company against claims arising from Customer
          data, Customer&apos;s use of the service in violation of these Terms, or
          Customer&apos;s permit submissions and regulatory compliance.
        </p>
      </section>

      <section>
        <h2 className="text-lg font-semibold text-ink">14. Term and termination</h2>
        <p className="mt-2">
          These Terms remain in effect while you use the service. Either party may
          terminate per the subscription agreement. Upon termination, access ends and we
          will delete or return Customer data per our data retention practices and
          applicable law, unless retention is required.
        </p>
      </section>

      <section>
        <h2 className="text-lg font-semibold text-ink">15. Governing law</h2>
        <p className="mt-2">
          These Terms are governed by the laws of the State of {siteConfig.governingLawState},{' '}
          {siteConfig.governingLawCountry}, without regard to conflict-of-law principles.
          Exclusive venue for disputes shall be state or federal courts located in{' '}
          {siteConfig.governingLawState}, unless otherwise required by mandatory consumer
          protection laws in your jurisdiction.
        </p>
      </section>

      <section>
        <h2 className="text-lg font-semibold text-ink">16. Contact</h2>
        <p className="mt-2">
          Questions about these Terms:{' '}
          <a href={`mailto:${siteConfig.email}`} className="underline-offset-2 hover:underline">
            {siteConfig.email}
          </a>
          <br />
          {siteConfig.legalName}, {siteConfig.address}
        </p>
      </section>
    </LegalPageLayout>
  )
}
