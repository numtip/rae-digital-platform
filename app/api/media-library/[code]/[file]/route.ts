import { cmsBase, staticExportOnly } from "@/lib/cms/live";
import { MEDIA_CODE, MEDIA_FILE } from "@/lib/cms/media-library";

// The browser cannot reach the CMS on loopback, so a released library image is read from the runtime here and
// handed on. The runtime serves published assets on this path and answers 404 for a draft or an archived one,
// so this route keeps no state of its own — only the path shape is re-checked, because a path segment reaching
// the runtime is a trust boundary.
//
// shortcut: the bytes are proxied on every cache miss; put a CDN or a local cache in front when the gallery
// outgrows a handful of readers.

// Per request on a server: a route handler with no dynamic config would be baked at build time.
export const revalidate = 0;

// The Pages preview must bake at least one path for a dynamic route. There is nothing to bake on a static
// host — the gallery page itself is a 404 there (no runtime, so no released assets) — so it writes one 404.
export function generateStaticParams() {
  return staticExportOnly ? [{ code: "RAE-MD-0000", file: "0000000000000000.jpg" }] : [];
}

export async function GET(_request: Request, { params }: { params: Promise<{ code: string; file: string }> }) {
  if (staticExportOnly) return new Response(null, { status: 404 });
  const { code, file } = await params;
  if (!MEDIA_CODE.test(code) || !MEDIA_FILE.test(file)) return new Response(null, { status: 404 });

  let upstream: Response;
  try {
    upstream = await fetch(`${cmsBase()}/v1/public/media/${code}/${file}`, { cache: "no-store" });
  } catch {
    // The image is an outage, not the page: a broken photo must not fail the document.
    return new Response(null, { status: 502 });
  }
  if (!upstream.ok || !upstream.body) return new Response(null, { status: 404 });

  return new Response(upstream.body, {
    headers: {
      "content-type": upstream.headers.get("content-type") ?? "application/octet-stream",
      "cache-control": "public, max-age=60, stale-while-revalidate=300",
      // The runtime sends these for a library file; keep them on the proxied answer too.
      "x-content-type-options": "nosniff",
      "content-security-policy": "default-src 'none'; sandbox",
    },
  });
}
