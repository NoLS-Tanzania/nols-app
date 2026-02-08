import type { NextConfig } from 'next';

// IMPORTANT: rewrites run on the Next.js server. Do not depend on NEXT_PUBLIC_API_URL here
// (it is often set to the web origin and would cause /api/* to stop proxying and 404).
// Use API_ORIGIN for server-to-server proxying, with a safe dev default.
const apiOrigin = (process.env.API_ORIGIN || 'http://127.0.0.1:4000').replace(/\/$/, '');
const socketOrigin = (process.env.NEXT_PUBLIC_SOCKET_URL || '').replace(/\/$/, '');

const nextConfig: NextConfig = {
  reactStrictMode: true,
  output: 'standalone', // Enable standalone output for Docker
  experimental: {
    // Allow larger proxied bodies for draft property submissions in development.
    // Without this, Next will truncate bodies >10MB when proxying /api/*.
    proxyClientMaxBodySize: '25mb',
  },
  images: {
    // Use remotePatterns instead of deprecated domains
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'img.youtube.com',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'res.cloudinary.com',
        pathname: '/**',
      },
      {
        protocol: 'http',
        hostname: 'localhost',
        pathname: '/**',
      },
      {
        protocol: 'http',
        hostname: '127.0.0.1',
        pathname: '/**',
      },
    ],
    // Keep domains for backward compatibility during transition
    domains: ['img.youtube.com', 'res.cloudinary.com'],
  },
  webpack: (config, { dev, isServer }) => {
    // Fix sourcemap warnings in development
    if (dev && !isServer) {
      config.devtool = 'eval-source-map';
    }
    return config;
  },
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
            value:
              `default-src 'self'; script-src 'self' 'unsafe-eval' 'unsafe-inline' https://api.mapbox.com https://events.mapbox.com; style-src 'self' 'unsafe-inline' https://api.mapbox.com; img-src 'self' blob: data: https: http: res.cloudinary.com img.youtube.com https://api.mapbox.com https://*.mapbox.com; font-src 'self' data:; worker-src 'self' blob:; media-src 'self' blob: data: https:; connect-src ${connectSrc.join(' ')}; frame-ancestors 'self'; frame-src 'self' https:;`,
          },
        ],
      },
    ];
  },
  async redirects() {
    return [
      {
        source: '/admin/reports',
        destination: '/admin/management/reports/revenue',
        permanent: false,
      },
      {
        source: '/admin/reports/:path*',
        destination: '/admin/management/reports/revenue',
        permanent: false,
      },
    ];
  },
  async rewrites() {
    return [
      { source: '/api/:path*', destination: `${apiOrigin}/api/:path*` },
      // Exclude Next page routes under /admin/management/*, user detail pages, and profile page from being proxied to the API.
      { source: '/admin/:path((?!management/.*|drivers/audit/.*|users/\\d+$|profile$|profile/).*)', destination: `${apiOrigin}/admin/:path*` },
      // Exclude known Owner page routes from proxying to API. Keep legacy API paths like `/owner/bookings/:id`.
      // Note: group-stays detail pages (/owner/group-stays/:id) should NOT match this pattern, so they're served by Next.js
      { source: '/owner/:path((?!bookings$|bookings/recent$|bookings/recents$|bookings/validate$|bookings/checked-in$|bookings/checked-in/\\d+$|bookings/check-out$|invoices$|invoices/new$|invoices/\\d+$|revenue$|revenue/.*|group-stays$|group-stays/\\d+|group-stays/claims$|group-stays/claims/my-claims$).*)', destination: `${apiOrigin}/owner/:path*` },
      { source: '/uploads/:path*', destination: `${apiOrigin}/uploads/:path*` },
      { source: '/webhooks/:path*', destination: `${apiOrigin}/webhooks/:path*` },
      { source: '/socket.io', destination: `${apiOrigin}/socket.io/` },
      { source: '/socket.io/', destination: `${apiOrigin}/socket.io/` },
      { source: '/socket.io/:path*', destination: `${apiOrigin}/socket.io/:path*` },
    ];
  },
};

export default nextConfig;
