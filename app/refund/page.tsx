import type { Metadata } from 'next'
import { LegalPageLayout } from '@/components/legal/legal-page-layout'
import { siteConfig } from '@/lib/site-config'

export const metadata: Metadata = {
  title: `Refund Policy | ${siteConfig.productName}`,
  description: `Refund and cancellation terms for ${siteConfig.productName} subscriptions.`,
}

const LAST_UPDATED = 'September 7, 2026'

export default function RefundPolicyPage() {
  return (
    <LegalPageLayout title="Refund Policy" lastUpdated={LAST_UPDATED}>
      <section>
        <h2 className="text-lg font-semibold text-ink">1. Overview</h2>
        <p className="mt-2">
          {siteConfig.productName} is sold to businesses on a subscription or contracted
          basis. This Refund Policy explains how cancellations, refunds, and credits work.
          It supplements your order form, invoice, or master subscription agreement.
        </p>
      </section>

      <section>
        <h2 className="text-lg font-semibold text-ink">2. Subscription fees</h2>
        <ul className="mt-2 list-disc space-y-1 pl-5">
          <li>
            Subscription fees are billed in advance for the billing period shown on your
            invoice (monthly or annual, as agreed).
          </li>
          <li>
            Unless your agreement states otherwise, <strong>fees are non-refundable</strong>{' '}
            once a billing period has started, including partial months.
          </li>
          <li>
            Downgrades take effect at the next renewal date; we do not provide prorated
            refunds for unused features unless required by law or explicitly agreed in
            writing.
          </li>
        </ul>
      </section>

      <section>
        <h2 className="text-lg font-semibold text-ink">3. Free trials and promotions</h2>
        <p className="mt-2">
          If you receive a free trial or promotional credit, no payment is due during the
          trial unless you convert to a paid plan. Cancel before the trial ends to avoid
          charges. Promotional pricing applies only for the stated term.
        </p>
      </section>

      <section>
        <h2 className="text-lg font-semibold text-ink">4. Service credits</h2>
        <p className="mt-2">
          If we fail to meet a materially agreed service-level commitment documented in
          your contract, you may be eligible for a service credit (not a cash refund) for
          the affected period. Credits are applied to future invoices and expire per your
          agreement.
        </p>
      </section>

      <section>
        <h2 className="text-lg font-semibold text-ink">5. Cancellation</h2>
        <p className="mt-2">
          You may cancel by providing written notice to{' '}
          <a href={`mailto:${siteConfig.supportEmail}`} className="underline-offset-2 hover:underline">
            {siteConfig.supportEmail}
          </a>{' '}
          or through your account administrator. Cancellation stops future renewals;
          access continues through the end of the paid term unless otherwise agreed.
        </p>
      </section>

      <section>
        <h2 className="text-lg font-semibold text-ink">6. Chargebacks and disputes</h2>
        <p className="mt-2">
          Contact us before initiating a payment dispute. Unauthorized chargebacks may
          result in account suspension while we investigate.
        </p>
      </section>

      <section>
        <h2 className="text-lg font-semibold text-ink">7. Statutory rights</h2>
        <p className="mt-2">
          Nothing in this policy limits rights you cannot waive under applicable law,
          including certain consumer protection rules where the service is sold to
          consumers (this product is intended for business use). Florida and federal law
          may provide additional remedies in specific circumstances.
        </p>
      </section>

      <section>
        <h2 className="text-lg font-semibold text-ink">8. How to request a refund review</h2>
        <p className="mt-2">
          Email{' '}
          <a href={`mailto:${siteConfig.supportEmail}`} className="underline-offset-2 hover:underline">
            {siteConfig.supportEmail}
          </a>{' '}
          with your organization name, invoice number, and reason for the request. We
          respond within five (5) business days.
        </p>
        <p className="mt-2">
          {siteConfig.legalName}<br />
          {siteConfig.address}<br />
          {siteConfig.phone}
        </p>
      </section>
    </LegalPageLayout>
  )
}
