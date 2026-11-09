import type { NextConfig } from "next";

// The Express API runs separately (default :4000). Proxying it under /api
// keeps the browser same-origin in development, so the Authorization header
// travels without any CORS setup on the web side.
const API_ORIGIN = process.env.API_ORIGIN ?? "http://localhost:4000";

const nextConfig: NextConfig = {
  async rewrites() {
    return [
      {
        source: "/api/:path*",
        destination: `${API_ORIGIN}/api/:path*`,
      },
    ];
  },
};

export default nextConfig;
