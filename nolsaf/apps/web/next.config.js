/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    domains: ['img.youtube.com', 'res.cloudinary.com'],
  },
  async headers() {
    // Allow blob: and data: for local previews, and Cloudinary/YouTube assets
    return [
      {
        source: '/:path*',
        headers: [
          {
            key: 'Content-Security-Policy',
            value: "default-src 'self'; script-src 'self' 'unsafe-eval' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' blob: data: https: http: res.cloudinary.com img.youtube.com; media-src 'self' blob: data: https:; connect-src 'self' http://127.0.0.1:4000 http://localhost:4000 http://localhost:3001 https: ws:; frame-ancestors 'self'; frame-src 'self' https:;",
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
      { source: '/socket.io/:path*', destination: 'http://127.0.0.1:4000/socket.io/:path*' },
    ];
  },
};

module.exports = nextConfig;
