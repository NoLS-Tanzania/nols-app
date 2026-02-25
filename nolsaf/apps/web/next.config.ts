import type { NextConfig } from 'next';

/**
 * IMPORTANT: rewrites run on the Next.js server.
 * Use API_ORIGIN for server-to-server proxying.
 * In production, do NOT default to localhost; require explicit configuration.
 */
const apiOriginRaw = process.env.API_ORIGIN || process.env.NEXT_PUBLIC_API_URL || '';
const apiOrigin = (apiOriginRaw || (process.env.NODE_ENV === 'production' ? '' : 'http://localhost:4000')).replace(/\/$/, '');

if (!apiOrigin) {
  throw new Error('Missing API_ORIGIN. Set API_ORIGIN to your API base URL (e.g. https://api.nolsaf.com).');
}
const socketOrigin = (process.env.NEXT_PUBLIC_SOCKET_URL || '').replace(/\/$/, '');

const nextConfig: NextConfig = {
  reactStrictMode: true,
  transpilePackages: ['@nolsaf/shared'],
  output: 'standalone',
  experimental: {
    // Allow larger proxied bodies for draft property submissions in development.
    // Without this, Next will truncate bodies >10MB when proxying /api/*.
    proxyClientMaxBodySize: '25mb',
  },
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'img.youtube.com', pathname: '/**' },
      { protocol: 'https', hostname: 'res.cloudinary.com', pathname: '/**' },
      { protocol: 'https', hostname: 'api.mapbox.com', pathname: '/**' },
      { protocol: 'https', hostname: '*.mapbox.com', pathname: '/**' },
      { protocol: 'http', hostname: 'localhost', pathname: '/**' },
      { protocol: 'http', hostname: '127.0.0.1', pathname: '/**' },
    ],
  },
  turbopack: {},
  async headers() {
    const connectSrc = [
      "'self'",
      'http://127.0.0.1:4000',
      'http://localhost:4000',
      'http://localhost:3001',
      'https:',
      'ws:',
      'wss:',
      'https://api.mapbox.com',
      'https://events.mapbox.com',
      apiOrigin,
      socketOrigin,
    ].filter(Boolean);

    return [
      {
        source: '/:path*',
        headers: [
          {
            key: 'Content-Security-Policy',
            value: `default-src 'self'; script-src 'self' 'unsafe-eval' 'unsafe-inline' https://api.mapbox.com https://events.mapbox.com; style-src 'self' 'unsafe-inline' https://api.mapbox.com; img-src 'self' blob: data: https: http: res.cloudinary.com img.youtube.com https://api.mapbox.com https://*.mapbox.com; font-src 'self' data:; worker-src 'self' blob:; media-src 'self' blob: data: https:; connect-src ${connectSrc.join(' ')}; frame-ancestors 'self'; frame-src 'self' https:;`,
          },
        ],
      },
    ];
  },
  async rewrites() {
    return {
      // beforeFiles: rewrites run before filesystem/page checks.
      // Use for rewrites that must always apply (uploads, webhooks, API proxies, socket.io).
      beforeFiles: [
        // Favicon/app-icon compatibility: Next metadata routes here are `/icon` and `/apple-icon`.
        // Many browsers still request `/favicon.ico` and some tooling uses `/icon.png`.
        { source: '/favicon.ico', destination: '/icon' },
        { source: '/apple-touch-icon.png', destination: '/apple-icon' },
        { source: '/icon.png', destination: '/icon' },
        { source: '/apple-icon.png', destination: '/apple-icon' },

        // Map health probes (API exposes these at the root, not under /api)
        { source: '/api/health', destination: `${apiOrigin}/health` },
        { source: '/api/ready', destination: `${apiOrigin}/ready` },
        { source: '/api/live', destination: `${apiOrigin}/live` },
        { source: '/api/:path*', destination: `${apiOrigin}/api/:path*` },

        { source: '/uploads/:path*', destination: `${apiOrigin}/uploads/:path*` },
        { source: '/webhooks/:path*', destination: `${apiOrigin}/webhooks/:path*` },
        // Explicit socket.io rewrites to ensure both base and nested paths proxy
        { source: '/socket.io', destination: `${apiOrigin}/socket.io/` },
        { source: '/socket.io/', destination: `${apiOrigin}/socket.io/` },
        { source: '/socket.io/:path*', destination: `${apiOrigin}/socket.io/:path*` },
      ],

      // afterFiles: rewrites run AFTER Next.js pages/filesystem checks.
      // This ensures Next.js pages (e.g. /admin/owners/[id], /admin/users/[id]) are served
      // by the Next.js router first, and only fall through to the API proxy if no page is found.
      // This prevents the catch-all proxy from accidentally swallowing RSC navigation requests
      // for page routes that exist in the Next.js app.
      afterFiles: [
        {
          // Proxy legacy /admin/* routes to the API backend.
          // IMPORTANT: This runs AFTER Next.js pages, so Next.js admin pages always win.
          // The exclusion list is kept for safety but the afterFiles ordering is the main guard.
          source:
            '/admin/:path((?!cancellations/\\d+$|bookings/\\d+$|owners/\\d+$|properties/\\d+$|revenue/\\d+$|users/\\d+$|management/.*|drivers/audit/.*|profile$|profile/).*)',
          destination: `${apiOrigin}/admin/:path*`,
        },
        // NOTE: /owner/* proxy removed — all owner API calls use /api/owner/...
        // (proxied via the beforeFiles /api/:path* rule). The /owner/* URL namespace
        // is reserved entirely for Next.js pages so no catch-all proxy is needed here.
      ],

      fallback: [],
    };
  },
};

export default nextConfig;
