import type { NextConfig } from "next";

// GitHub Pages preview build: static export served from /<repo>/.
// Only the pages-preview workflow sets NEXT_PAGES_PREVIEW=1; CI and the future
// production host build normally (no export), so server features stay available.
const preview = process.env.NEXT_PAGES_PREVIEW === "1";
const basePath = preview ? "/rae-digital-platform" : "";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  ...(preview
    ? {
        output: "export" as const,
        basePath,
        assetPrefix: basePath || undefined,
        images: { unoptimized: true },
      }
    : {}),
  env: { NEXT_PUBLIC_BASE_PATH: basePath },
};

export default nextConfig;
