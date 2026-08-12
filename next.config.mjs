/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          {
            key: 'Content-Security-Policy',
            value: [
              "default-src 'self'",
              "base-uri 'self'",
              "form-action 'self'",
              "frame-ancestors 'none'",
              "img-src 'self' data: blob:",
              "font-src 'self' data:",
              "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
              "style-src 'self' 'unsafe-inline'",
              "connect-src 'self'",
            ].join('; '),
          },
          { key: 'Strict-Transport-Security', value: 'max-age=31536000; includeSubDomains' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
        ],
      },
    ];
  },
  eslint: {
    // Don't run ESLint during `next build` (App Hosting / Cloud Build). The
    // generated Prisma client lives in-tree at lib/generated/prisma and is
    // minified code that trips thousands of lint rules, which would fail the
    // production build. Type-checking (tsc) still runs; lint is for `npm run
    // lint` / CI, not the deploy build.
    ignoreDuringBuilds: true,
  },
  webpack: (config, { isServer }) => {
    if (isServer) {
      // Externalize the Cloud Storage SDK on the server build: webpack emits a
      // plain runtime require() without resolving it at build time. This lets
      // local/dev builds succeed without the package installed (the GCS adapter
      // in lib/storage.ts is only constructed when STORAGE_DRIVER=gcs), while
      // the literal require is still traced into the standalone output and
      // resolved at runtime in production, where package.json installs it.
      config.externals = [...(config.externals || []), '@google-cloud/storage'];
    }
    return config;
  },
};

export default nextConfig;
