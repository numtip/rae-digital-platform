import type { NextConfig } from "next";

// GitHub Pages preview build: static export served from /<repo>/.
// Only the pages-preview workflow sets NEXT_PAGES_PREVIEW=1; CI and the future
// production host build normally (no export), so server features stay available.
const preview = process.env.NEXT_PAGES_PREVIEW === "1";

// GitHub Pages keeps the default; VPS staging sets NEXT_PREVIEW_BASE_PATH=/rae-digital-staging.
const previewBasePath =
  process.env.NEXT_PREVIEW_BASE_PATH?.replace(/\/$/, "") || "/rae-digital-platform";
// A SERVER build can also live under a sub-path: the canonical public site is
// https://raeservice.mju.ac.th/rae-landing/ (NEXT_SERVER_BASE_PATH=/rae-landing), while the admin host
// serves the same code at the root. basePath is compiled in, so each path needs its own build and its own
// distDir (NEXT_DIST_DIR); both read the one CMS and the one database.
const serverBasePath = preview ? "" : (process.env.NEXT_SERVER_BASE_PATH ?? "").replace(/\/$/, "");
const basePath = preview ? previewBasePath : serverBasePath;
// The admin host must not compete with the canonical site in search results.
const noindex = process.env.NEXT_NOINDEX === "1";

// A server deployment can put the whole desk behind one hostname and let this process proxy the CMS
// API on the same origin: NEXT_CMS_API_PROXY=http://127.0.0.1:13317 turns `/cms-api/*` into
// `/v1/*` on the loopback runtime. Then the browser talks to one origin (no CORS), the API needs no
// public hostname of its own, and one access policy covers the desk and the API together. Unset —
// as in CI and on Pages — this adds nothing.
const cmsApiProxy = process.env.NEXT_CMS_API_PROXY?.replace(/\/$/, "");

const nextConfig: NextConfig = {
  reactStrictMode: true,
  ...(!preview && process.env.NEXT_DIST_DIR ? { distDir: process.env.NEXT_DIST_DIR } : {}),
  ...(!preview && noindex
    ? { async headers() { return [{ source: "/:path*", headers: [{ key: "X-Robots-Tag", value: "noindex, nofollow" }] }]; } }
    : {}),
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
        ...(serverBasePath ? { basePath: serverBasePath } : {}),
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
  // `trailingSlash` would answer every `/cms-api/...` call with a 308 first. Browsers keep the
  // method and body across a 308, but the hop doubles every API call and any client that does not
  // follow 308 for POST silently sees the redirect instead of the answer. Only the desk
  // deployment (proxy configured) turns the normalisation off; the site's own builds keep it.
  ...(cmsApiProxy ? { skipTrailingSlashRedirect: true } : {}),
  env: { NEXT_PUBLIC_BASE_PATH: basePath },
};

export default nextConfig;
