/**
 * Public site and legal configuration.
 * Override via environment variables before production deployment.
 */

export const siteConfig = {
  productName: process.env.NEXT_PUBLIC_PRODUCT_NAME || 'PermitPro',
  productTagline:
    process.env.NEXT_PUBLIC_PRODUCT_TAGLINE ||
    'Permit Processing & Document Management',

  legalName:
    process.env.NEXT_PUBLIC_BUSINESS_LEGAL_NAME ||
    'PermitPro',
  address:
    process.env.NEXT_PUBLIC_BUSINESS_ADDRESS ||
    'Business address not provided',
  email:
    process.env.NEXT_PUBLIC_BUSINESS_EMAIL || 'legal@permitpro.icu',
  phone: process.env.NEXT_PUBLIC_BUSINESS_PHONE || '',
  supportEmail:
    process.env.NEXT_PUBLIC_SUPPORT_EMAIL || 'support@permitpro.icu',

  /** Primary jurisdiction for governing law (Florida-focused product). */
  governingLawState: process.env.NEXT_PUBLIC_GOVERNING_LAW_STATE || 'Florida',
  governingLawCountry: 'United States',

  /** Set NEXT_PUBLIC_SHOW_DEMO_CREDENTIALS=true only in local/dev demos. */
  showDemoCredentials:
    process.env.NEXT_PUBLIC_SHOW_DEMO_CREDENTIALS === 'true',

  /**
   * Optional third-party analytics at CDN/hosting layer (e.g. Cloudflare Web Analytics).
   * No in-app analytics SDK is loaded; this flag documents deployment-level tracking.
   */
  cdnAnalyticsEnabled:
    process.env.NEXT_PUBLIC_CDN_ANALYTICS_ENABLED === 'true',

  copyrightYear: new Date().getFullYear(),
} as const

export const legalRoutes = {
  privacy: '/privacy',
  terms: '/terms',
  cookies: '/cookies',
  refund: '/refund',
} as const

export const publicLegalPrefixes = Object.values(legalRoutes)
