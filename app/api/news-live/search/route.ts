import { liveNews, searchNews, staticExportOnly } from "@/lib/cms/live";
import { isLocale } from "@/lib/i18n";

// Fresh search over the live set: the same read the list page does, so a story published a minute
// ago is already findable. JSON only — a query string is echoed as data, never as markup.
//
// shortcut: substring match over title and body, capped at SEARCH_LIMIT; swap in the site's
// index/scoring if the pilot's list grows past a few hundred articles.

// A static export renders this once, against no runtime: declare no params so the Pages build
// accepts the route, then answer empty there instead of reading a request it cannot have.
export function generateStaticParams() {
  return [];
}

export async function GET(request: Request) {
  if (staticExportOnly) return Response.json({ stale: false, items: [] });
  const params = new URL(request.url).searchParams;
  const locale = params.get("locale") ?? "th";
  if (!isLocale(locale)) return Response.json({ error: "INVALID_LOCALE" }, { status: 400 });
  const query = (params.get("q") ?? "").slice(0, 200);

  const { items, stale } = await liveNews(locale);
  return Response.json({
    stale,
    items: searchNews(items, query).map((item) => ({
      nid: item.nid,
      title: item.title,
      date: item.date,
      url: `/${locale}/news-live/${item.nid}/`,
    })),
  });
}
