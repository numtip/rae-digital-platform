import type { NextConfig } from "next";

// GitHub Pages preview build: static export served from /<repo>/.
// Only the pages-preview workflow sets NEXT_PAGES_PREVIEW=1; CI and the future
// production host build normally (no export), so server features stay available.
const preview = process.env.NEXT_PAGES_PREVIEW === "1";

// GitHub Pages keeps the default; VPS staging sets NEXT_PREVIEW_BASE_PATH=/rae-digital-staging.
const previewBasePath =
  process.env.NEXT_PREVIEW_BASE_PATH?.replace(/\/$/, "") || "/rae-digital-platform";
const basePath = preview ? previewBasePath : "";

// A server deployment can put the whole desk behind one hostname and let this process proxy the CMS
// API on the same origin: NEXT_CMS_API_PROXY=http://127.0.0.1:13317 turns `/cms-api/*` into
// `/v1/*` on the loopback runtime. Then the browser talks to one origin (no CORS), the API needs no
// public hostname of its own, and one access policy covers the desk and the API together. Unset —
// as in CI and on Pages — this adds nothing.
const cmsApiProxy = process.env.NEXT_CMS_API_PROXY?.replace(/\/$/, "");

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
        async rewrites() {
          return cmsApiProxy
            ? [{ source: "/cms-api/:path*", destination: `${cmsApiProxy}/:path*` }]
            : [];
        },
      }),
  env: { NEXT_PUBLIC_BASE_PATH: basePath },
};

export default nextConfig;
