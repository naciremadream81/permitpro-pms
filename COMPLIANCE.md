# Compliance & Legal Risk Register

**Last reviewed:** September 7, 2026  
**Product:** PermitPro — B2B permit coordination platform  
**Primary jurisdiction:** Florida, United States

This document summarizes legal/compliance posture after the September 2026 audit. **It is not legal advice.** Have qualified counsel review before production launch.

---

## What was implemented

| Area | Status |
|------|--------|
| Privacy Policy (`/privacy`) | ✅ Added — public route |
| Terms & Conditions (`/terms`) | ✅ Added — public route |
| Cookie Policy (`/cookies`) | ✅ Added — public route |
| Refund Policy (`/refund`) | ✅ Added — public route |
| Cookie information notice | ✅ Added — dismissal only; does not control CDN-injected tracking |
| Business details in footer | ✅ Added — configurable via env vars |
| Form data collection notices | ✅ Added on customer, contractor, permit create forms |
| AI data disclosures | ✅ Added on assistant + permit validator |
| Demo credentials on login | ✅ Hidden unless `NEXT_PUBLIC_SHOW_DEMO_CREDENTIALS=true` |
| Accessibility improvements | ✅ Login h1, review-queue AppLayout + tabs, form labels, contrast fixes |
| Fake reviews / marketing claims | ✅ None found in app UI; AI claims softened |

---

## Analytics & tracking audit

| Source | In app code? | Action |
|--------|--------------|--------|
| Google Analytics / gtag | ❌ Not present | None needed |
| Vercel Analytics | ❌ Not present | None needed |
| Mixpanel / Hotjar / PostHog | ❌ Not present | None needed |
| NextAuth session cookies | ✅ Required | Disclosed in Cookie Policy |
| Cloudflare Web Analytics (CDN) | ⚠️ Deployment-level only | Disable optional tracking until a deployment-level consent mechanism gates it; the notice is informational only |

**Conclusion:** No in-app behavioral analytics. Cookie consent is required for optional CDN analytics only; strictly necessary auth cookies do not need opt-in.

---

## Third-party data flows

| Service | Data sent | Disclosed? |
|---------|-----------|------------|
| Esri ArcGIS (geocoding) | Project addresses, coordinates | ✅ Privacy Policy + permit form notice |
| Florida statewide cadastral (ArcGIS) | Geocoded coordinates | ✅ Privacy Policy |
| Anthropic / Google AI (if API routes added) | Chat messages, permit context | ✅ AI notices + Privacy Policy |
| Cloudflare (hosting/CDN) | IP, request metadata | ✅ Privacy Policy (if analytics enabled) |

---

## Images & copyright

- **No content images** (`<img>` / `next/image`) in the application UI.
- UI uses **Lucide React SVG icons** (ISC license) with `aria-hidden` where decorative.
- **User-uploaded documents** (PDFs, scans) are customer/contractor content — your organization is responsible for rights to upload and store them. Terms place this obligation on the customer.

---

## Applicable laws & frameworks (flag for counsel)

### United States — Federal
- **FTC Act** — truthful advertising; no deceptive claims (AI outputs must not be presented as guaranteed approvals).
- **CAN-SPAM** — if email notifications are enabled (`NotificationEvent` schema supports EMAIL but no sender is implemented yet).
- **ADA / Section 508** — accessibility for users with disabilities (ongoing obligation; improvements made, full WCAG 2.1 AA audit recommended).

### Florida
- **Florida Digital Bill of Rights (FDBR)** — may apply depending on revenue and data volume; review with counsel.
- **Florida building/permit regulations** — product assists coordination; does not replace licensed professional or AHJ requirements.

### California (if CA users or CA resident data)
- **CCPA/CPRA** — privacy rights, “Do Not Sell” (we do not sell data); policy includes CCPA section.

### EU/UK (if EEA/UK users)
- **GDPR** — lawful basis, DPA with customers as controllers for end-customer PII, subprocessors list, international transfers.
- **ePrivacy** — essential cookies exempt; optional analytics need consent (banner supports this).

### B2B SaaS
- **Refund/chargeback** — Refund Policy added; align with actual billing.
- **DPA / BAA** — if handling health data or government contracts, additional agreements may be required.

---

## Remaining risks (action required before production)

### 🔴 High — requires your action

1. **Replace placeholder business details** — Set real values:
   - `NEXT_PUBLIC_BUSINESS_LEGAL_NAME`
   - `NEXT_PUBLIC_BUSINESS_ADDRESS`
   - `NEXT_PUBLIC_BUSINESS_EMAIL`
   - `NEXT_PUBLIC_BUSINESS_PHONE`
   - `NEXT_PUBLIC_SUPPORT_EMAIL`
   - `NEXT_PUBLIC_GOVERNING_LAW_STATE` (default: Florida)

2. **Attorney review of legal pages** — Templates are a starting point, not a substitute for counsel familiar with your entity, customers, and data flows.

3. **AI API routes missing** — UI calls `/api/ai/assistant` and `/api/ai/validate` but routes are not in the repo. Implement with DPAs/subprocessor agreements or disable UI until ready.

4. **Data Processing Agreement (DPA)** — B2B customers entering third-party PII need a signed DPA defining controller/processor roles.

5. **Production secrets** — Rotate demo passwords from seed data; never set `NEXT_PUBLIC_SHOW_DEMO_CREDENTIALS=true` in production.

### 🟡 Medium

6. **Email notifications** — Schema supports email channel; implement with CAN-SPAM-compliant footers and unsubscribe when built.

7. **Document retention policy** — Define how long permit files and PII are kept; implement automated deletion if required.

8. **WCAG 2.1 AA full audit** — Partial fixes applied; recommend automated scan (axe, Lighthouse) + manual keyboard/screen reader test on all flows.

9. **Permit detail form labels** — Some inline edit fields in `permit-detail-client.tsx` still lack `htmlFor`/`id` pairing.

10. **County admin checkboxes** — Some requirement checkboxes in county admin pages need explicit label association.

### 🟢 Low / informational

11. **No public marketing site** — Legal pages are linked from login and app footer; sufficient for authenticated B2B app.

12. **Seed/demo data** — Fictional customers in `prisma/seed.ts` are dev-only; not displayed as public testimonials.

13. **Guacamole vendored code** — Third-party Apache-licensed dependency in repo; not part of PermitPro user-facing product.

---

## Environment variables reference

```bash
# Required for accurate legal footer and policies
NEXT_PUBLIC_BUSINESS_LEGAL_NAME="Your Company LLC"
NEXT_PUBLIC_BUSINESS_ADDRESS="Your full postal address"
NEXT_PUBLIC_BUSINESS_EMAIL="legal@yourcompany.com"
NEXT_PUBLIC_SUPPORT_EMAIL="support@yourcompany.com"
NEXT_PUBLIC_BUSINESS_PHONE="+1 (xxx) xxx-xxxx"
NEXT_PUBLIC_GOVERNING_LAW_STATE="Florida"

# Only for local demos — NEVER true in production
NEXT_PUBLIC_SHOW_DEMO_CREDENTIALS=false

# Set true only if Cloudflare Web Analytics (or similar CDN beacon) is enabled
NEXT_PUBLIC_CDN_ANALYTICS_ENABLED=false
```

---

## Checklist for launch

- [ ] Attorney reviews Privacy, Terms, Cookie, and Refund policies
- [ ] Real business details in environment variables
- [ ] DPA template ready for B2B customers
- [ ] AI features implemented or disabled with signed subprocessor DPAs
- [ ] Cloudflare analytics flag matches actual deployment
- [ ] Demo credentials disabled in production
- [ ] Full accessibility audit completed
- [ ] Incident response / breach notification process documented
