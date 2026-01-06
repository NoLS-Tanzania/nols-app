/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    domains: ['img.youtube.com', 'res.cloudinary.com', 'api.mapbox.com'],
  },
  webpack: (config, { dev, isServer }) => {
    // Fix sourcemap warnings in development
    if (dev && !isServer) {
      config.devtool = 'eval-source-map';
    }
    return config;
  },
  async headers() {
    // Allow blob: and data: for local previews, and Cloudinary/YouTube assets
    return [
      {
        source: '/:path*',
        headers: [
          {
            key: 'Content-Security-Policy',
            value: "default-src 'self'; script-src 'self' 'unsafe-eval' 'unsafe-inline' https://api.mapbox.com https://events.mapbox.com; style-src 'self' 'unsafe-inline' https://api.mapbox.com; img-src 'self' blob: data: https: http: res.cloudinary.com img.youtube.com https://api.mapbox.com https://*.mapbox.com; font-src 'self' data:; worker-src 'self' blob:; media-src 'self' blob: data: https:; connect-src 'self' http://127.0.0.1:4000 http://localhost:4000 http://localhost:3001 https: ws: https://api.mapbox.com https://events.mapbox.com; frame-ancestors 'self'; frame-src 'self' https:;",
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
      { source: '/api/:path*', destination: 'http://127.0.0.1:4000/api/:path*' },
      // Exclude page routes from /admin rewrite - these will be served by Next.js pages
      // The pattern uses negative lookahead to exclude specific routes
      { 
        // NOTE: include /admin/management/* (Next pages) as excluded too.
        // Also exclude user detail pages (users/:id) so Next.js serves them, not the API proxy
        source: '/admin/:path((?!cancellations/\\d+$|bookings/\\d+$|owners/\\d+$|properties/\\d+$|revenue/\\d+$|users/\\d+$|management/.*).*)', 
        destination: 'http://127.0.0.1:4000/admin/:path*' 
      },
      // Exclude known Owner page routes from proxying to API. Keep legacy API paths like `/owner/bookings/:id`.
      {
        // NOTE: exclude owner UI pages so Next.js serves them, not the API proxy.
        source: '/owner/:path((?!bookings$|bookings/recent$|bookings/recents$|bookings/validate$|bookings/checked-in$|bookings/checked-in/\\d+$|bookings/check-out$|invoices$|invoices/new$|invoices/\\d+$|revenue$|revenue/.*).*)',
        destination: 'http://127.0.0.1:4000/owner/:path*'
      },
      { source: '/uploads/:path*', destination: 'http://127.0.0.1:4000/uploads/:path*' },
      { source: '/webhooks/:path*', destination: 'http://127.0.0.1:4000/webhooks/:path*' },
      // Explicit socket.io rewrites to ensure both base and nested paths proxy
      { source: '/socket.io', destination: 'http://127.0.0.1:4000/socket.io/' },
      { source: '/socket.io/', destination: 'http://127.0.0.1:4000/socket.io/' },
      { source: '/socket.io/:path*', destination: 'http://127.0.0.1:4000/socket.io/:path*' },
    ];
  },
};

module.exports = nextConfig;
