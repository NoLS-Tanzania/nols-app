/** @type {import('next').NextConfig} */
// IMPORTANT: rewrites run on the Next.js server. Do not depend on NEXT_PUBLIC_API_URL here
// (it is often set to the web origin and would cause /api/* to stop proxying and 404).
// Use API_ORIGIN for server-to-server proxying, with a safe dev default.
const apiOrigin = (process.env.API_ORIGIN || 'http://127.0.0.1:4000').replace(/\/$/, '');
const socketOrigin = (process.env.NEXT_PUBLIC_SOCKET_URL || '').replace(/\/$/, '');

const nextConfig = {
  reactStrictMode: true,
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
    domains: ['img.youtube.com', 'res.cloudinary.com', 'api.mapbox.com'],
  },
  turbopack: {},
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

    // Allow blob: and data: for local previews, and Cloudinary/YouTube assets
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
    // Proxy common API/socket routes to the local API during development to avoid CORS issues.
    // This keeps the browser same-origin and is safe for local dev only.
    // IMPORTANT: Next.js checks for page routes FIRST before applying rewrites.
    // However, to be safe, we exclude known page routes from the rewrite.
    return [
      { source: '/api/:path*', destination: `${apiOrigin}/api/:path*` },
      // Exclude page routes from /admin rewrite - these will be served by Next.js pages
      // The pattern uses negative lookahead to exclude specific routes
      { 
        // NOTE: include /admin/management/* (Next pages) as excluded too.
        // Also exclude user detail pages (users/:id) and profile page so Next.js serves them, not the API proxy
        source: '/admin/:path((?!cancellations/\\d+$|bookings/\\d+$|owners/\\d+$|properties/\\d+$|revenue/\\d+$|users/\\d+$|management/.*|drivers/audit/.*|profile$|profile/).*)', 
        destination: `${apiOrigin}/admin/:path*` 
      },
      // Exclude known Owner page routes from proxying to API. Keep legacy API paths like `/owner/bookings/:id`.
      {
        // NOTE: exclude owner UI pages so Next.js serves them, not the API proxy.
        source: '/owner/:path((?!bookings$|bookings/recent$|bookings/recents$|bookings/validate$|bookings/checked-in$|bookings/checked-in/\\d+$|bookings/check-out$|invoices$|invoices/new$|invoices/\\d+$|revenue$|revenue/.*|group-stays$|group-stays/\\d+$|group-stays/claims$|group-stays/claims/my-claims$|properties/availability$|properties/\\d+/availability$|properties/\\d+/availability/.*|properties/\\d+/layout$).*)',
        destination: `${apiOrigin}/owner/:path*`
      },
      { source: '/uploads/:path*', destination: `${apiOrigin}/uploads/:path*` },
      { source: '/webhooks/:path*', destination: `${apiOrigin}/webhooks/:path*` },
      // Explicit socket.io rewrites to ensure both base and nested paths proxy
      { source: '/socket.io', destination: `${apiOrigin}/socket.io/` },
      { source: '/socket.io/', destination: `${apiOrigin}/socket.io/` },
      { source: '/socket.io/:path*', destination: `${apiOrigin}/socket.io/:path*` },
    ];
  },
};

module.exports = nextConfig;
