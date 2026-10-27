import type { NextConfig } from "next";

// GitHub Pages preview build: static export served from /<repo>/.
// Only the pages-preview workflow sets NEXT_PAGES_PREVIEW=1; CI and the future
// production host build normally (no export), so server features stay available.
const preview = process.env.NEXT_PAGES_PREVIEW === "1";

// GitHub Pages keeps the default; VPS staging sets NEXT_PREVIEW_BASE_PATH=/rae-digital-staging.
const previewBasePath =
  process.env.NEXT_PREVIEW_BASE_PATH?.replace(/\/$/, "") || "/rae-digital-platform";
const basePath = preview ? previewBasePath : "";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // `/th/` and `/en/` are the canonical form (issue #17), so `/th` redirects to
  // `/th/` and every internal href keeps one shape.
  trailingSlash: true,
  ...(preview
    ? {
        output: "export" as const,
        basePath,
        assetPrefix: basePath || undefined,
        images: { unoptimized: true },
      }
    : {
        // Not supported with output: "export" — the preview build ships a static
        // /index.html redirect instead (see the pages-preview workflow).
        async redirects() {
          return [
            // 307, not 308: the default locale may still change before launch and
            // browsers cache a permanent redirect hard.
            { source: "/", destination: "/th/", permanent: false },
          ];
        },
      }),
  env: { NEXT_PUBLIC_BASE_PATH: basePath },
};

export default nextConfig;
