import type { NextConfig } from 'next'

// Origins allowed to call the API from a browser
const ALLOWED_ORIGINS = [
  'http://localhost:5173',   // Vite dev server
  'http://localhost:5174',   // Vite secondary port
  'http://localhost:4173',   // Vite preview
  'https://app.ziort.com', // Production Vite SPA
  'https://www.ziort.com',
  'https://ziort.com',
]

const nextConfig: NextConfig = {
  async headers() {
    return [
      {
        source: '/api/:path*',
        headers: [
          { key: 'Access-Control-Allow-Methods', value: 'GET,POST,PUT,PATCH,DELETE,OPTIONS' },
          { key: 'Access-Control-Allow-Headers', value: 'Content-Type,Authorization,X-Requested-With' },
          { key: 'Access-Control-Max-Age', value: '86400' },
        ],
      },
    ]
  },
  images: {
    remotePatterns: [
      // Cloudflare R2 public bucket (Ziort1)
      { protocol: 'https', hostname: 'pub-90125e37d4424a689ad51a7f84b21916.r2.dev' },
      // R2 private endpoint (presigned URLs)
      { protocol: 'https', hostname: '*.r2.cloudflarestorage.com' },
      // Future custom domain
      { protocol: 'https', hostname: 'assets.ziort.com' },
    ],
    formats: ['image/avif', 'image/webp'],
  },
  // Compress responses
  compress: true,
  // Strict mode catches React issues early
  reactStrictMode: true,
  // Silence noisy build logs in CI
  logging: {
    fetches: { fullUrl: process.env.NODE_ENV === 'development' },
  },
}

export default nextConfig
