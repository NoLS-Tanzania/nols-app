/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
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
    return [
      { source: '/api/:path*', destination: 'http://127.0.0.1:4000/api/:path*' },
      { source: '/admin/:path*', destination: 'http://127.0.0.1:4000/admin/:path*' },
      { source: '/owner/:path*', destination: 'http://127.0.0.1:4000/owner/:path*' },
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
