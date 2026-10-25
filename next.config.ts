import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // `/th/` and `/en/` are the canonical form (issue #17), so `/th` redirects to
  // `/th/` and every internal href keeps one shape.
  trailingSlash: true,
  async redirects() {
    return [
      // 307, not 308: the default locale may still change before launch and
      // browsers cache a permanent redirect hard.
      { source: "/", destination: "/th/", permanent: false },
    ];
  },
};

export default nextConfig;
