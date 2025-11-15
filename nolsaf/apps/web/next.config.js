/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
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
