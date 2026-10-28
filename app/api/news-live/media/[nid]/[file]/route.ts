import { cmsBase, staticExportOnly } from "@/lib/cms/live";
import { SAFE_ID, SAFE_MEDIA_FILE } from "@/lib/cms/media";

// The browser cannot reach the CMS on loopback, so a published article's photo is read from the
// runtime here and handed on. A published article's images need no token (the runtime only gates a
// draft's), so this route carries none and a draft id cannot be fetched through it.
//
// shortcut: the bytes are proxied on every cache miss; put a CDN or a local cache in front when the
// pilot goes past a handful of readers.

// Per request on a server: a route handler with no dynamic config would be baked at build time.
export const revalidate = 0;

// The Pages preview must bake at least one path for a dynamic route. There is nothing to bake on a
// static host, so it writes one 404 and the live photo paths exist only on a server.
export function generateStaticParams() {
  return staticExportOnly ? [{ nid: "no-live-media", file: "00-00000000.jpg" }] : [];
}

export async function GET(_request: Request, { params }: { params: Promise<{ nid: string; file: string }> }) {
  if (staticExportOnly) return new Response(null, { status: 404 });
  const { nid, file } = await params;
  // Both are re-checked here: a path segment reaching the runtime is a trust boundary.
  if (!SAFE_ID.test(nid) || !SAFE_MEDIA_FILE.test(file)) return new Response(null, { status: 404 });

  let upstream: Response;
  try {
    upstream = await fetch(`${cmsBase()}/v1/media/${nid}/${file}`, { cache: "no-store" });
  } catch {
    // The image is an outage, not the page: a broken photo must not fail the document.
    return new Response(null, { status: 502 });
  }
  if (!upstream.ok || !upstream.body) return new Response(null, { status: 404 });

  return new Response(upstream.body, {
    headers: {
      "content-type": upstream.headers.get("content-type") ?? "application/octet-stream",
      "cache-control": "public, max-age=60, stale-while-revalidate=300",
    },
  });
}
