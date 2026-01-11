import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  reactStrictMode: true,
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
    return [
      {
        source: '/:path*',
        headers: [
          {
            key: 'Content-Security-Policy',
            value:
              "default-src 'self'; script-src 'self' 'unsafe-eval' 'unsafe-inline' https://api.mapbox.com https://events.mapbox.com; style-src 'self' 'unsafe-inline' https://api.mapbox.com; img-src 'self' blob: data: https: http: res.cloudinary.com img.youtube.com https://api.mapbox.com https://*.mapbox.com; font-src 'self' data:; worker-src 'self' blob:; media-src 'self' blob: data: https:; connect-src 'self' http://127.0.0.1:4000 http://localhost:4000 http://localhost:3001 https: ws: https://api.mapbox.com https://events.mapbox.com; frame-ancestors 'self'; frame-src 'self' https:;",
          },
        ],
      },
    ];
  },
  async rewrites() {
    return [
      { source: '/api/:path*', destination: 'http://127.0.0.1:4000/api/:path*' },
      // Exclude Next page routes under /admin/management/*, user detail pages, and profile page from being proxied to the API.
      { source: '/admin/:path((?!management/.*|users/\\d+$|profile$|profile/).*)', destination: 'http://127.0.0.1:4000/admin/:path*' },
      // Exclude known Owner page routes from proxying to API. Keep legacy API paths like `/owner/bookings/:id`.
      // Note: group-stays detail pages (/owner/group-stays/:id) should NOT match this pattern, so they're served by Next.js
      { source: '/owner/:path((?!bookings$|bookings/recent$|bookings/recents$|bookings/validate$|bookings/checked-in$|bookings/checked-in/\\d+$|bookings/check-out$|invoices$|invoices/new$|invoices/\\d+$|revenue$|revenue/.*|group-stays$|group-stays/\\d+|group-stays/claims$|group-stays/claims/my-claims$).*)', destination: 'http://127.0.0.1:4000/owner/:path*' },
      { source: '/uploads/:path*', destination: 'http://127.0.0.1:4000/uploads/:path*' },
      { source: '/webhooks/:path*', destination: 'http://127.0.0.1:4000/webhooks/:path*' },
      { source: '/socket.io', destination: 'http://127.0.0.1:4000/socket.io/' },
      { source: '/socket.io/', destination: 'http://127.0.0.1:4000/socket.io/' },
      { source: '/socket.io/:path*', destination: 'http://127.0.0.1:4000/socket.io/:path*' },
    ];
  },
};

export default nextConfig;
