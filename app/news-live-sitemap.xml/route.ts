import { liveNews, sitemapXml } from "@/lib/cms/live";
import { SITE_URL } from "@/lib/i18n";

// A sitemap that is built when it is asked for, not when the site was built: the pilot's proof that
// a crawler sees a story the same day it is published. Nothing here is force-static on a server.

// `revalidate = 0` is what makes this a per-request route on a server (a route handler with no
// dynamic config is baked at build time). The Pages preview renders it once from the committed copy;
// its export gate needs the static params below, which name nothing.
export const revalidate = 0;

export function generateStaticParams() {
  return [];
}

export async function GET() {
  // The published set is the same in both languages: one read, then both locales written out.
  // An outage serves the committed copy rather than an empty sitemap.
  const { items } = await liveNews("th");
  return new Response(sitemapXml(items, SITE_URL), {
    headers: { "content-type": "application/xml; charset=utf-8", "cache-control": "no-store" },
  });
}
