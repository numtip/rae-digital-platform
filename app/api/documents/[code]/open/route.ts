import { cmsBase, staticExportOnly } from "@/lib/cms/live";

// The counted way to a registered file: the registry records one download, then the reader is sent to
// the file where it lives (Microsoft 365, ADR-0004). The destination comes from the CMS record, never
// from the request, so this cannot be used as an open redirect.
const CODE = /^RAE-DC-\d{4,}$/;

// Per request on a server (a counted redirect must never be baked). The Pages preview needs one baked
// path for a dynamic route; it writes a single 404 and the open route exists only on a server.
export const revalidate = 0;

export function generateStaticParams() {
  return staticExportOnly ? [{ code: "RAE-DC-0000" }] : [];
}

export async function GET(request: Request, { params }: { params: Promise<{ code: string }> }) {
  if (staticExportOnly) return new Response(null, { status: 404 });
  const { code } = await params;
  if (!CODE.test(code)) return new Response("Not found", { status: 404 });
  try {
    const counted = await fetch(`${cmsBase()}/v1/public/documents/${code}/download`, {
      method: "POST",
      // Pass the client address on so the CMS limits per reader, not per this process.
      headers: { "cf-connecting-ip": request.headers.get("cf-connecting-ip") ?? "" },
      cache: "no-store",
      signal: AbortSignal.timeout(4000),
    });
    if (counted.status === 429) return new Response("Too many requests", { status: 429, headers: { "retry-after": counted.headers.get("retry-after") ?? "60" } });
    if (!counted.ok) return new Response("Not found", { status: 404 });
    const { url } = (await counted.json()) as { url?: string };
    if (!url || new URL(url).hostname !== "maejo365-my.sharepoint.com") return new Response("Not found", { status: 404 });
    return Response.redirect(url, 302);
  } catch {
    return new Response("Service unavailable", { status: 503 });
  }
}
