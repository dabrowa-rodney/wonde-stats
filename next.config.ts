import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  // Dashboards are read from disk at request time rather than shipped as static
  // assets, so that every request passes through the auth middleware. Vercel's
  // build tracer can't see those reads, so include the folder explicitly.
  outputFileTracingIncludes: {
    '/': ['./dashboards/**/*'],
    '/d/[...path]': ['./dashboards/**/*'],
    '/dashboard/[slug]': ['./dashboards/**/*'],
  },
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
          {
            key: 'Permissions-Policy',
            value: 'camera=(), microphone=(), geolocation=()',
          },
        ],
      },
    ]
  },
}

export default nextConfig
