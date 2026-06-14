/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
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
