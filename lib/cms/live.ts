import { request as httpRequest } from "node:http";
import type { NewsItem } from "../../content/th/news.ts";
import { foldForSearch } from "../search-text.ts";
import { articlesFromExport, type PreviewArticle } from "./preview-site.ts";
import {
  articleView,
  newsItemFrom,
  siteArticles,
  type Locale,
  type PublishedGalleryItem,
} from "./published-site.ts";

// Server-only. This module holds the CMS session token, so nothing that ships to a browser may
// import it: the pages and route handlers that call it run on the server, and the token is never
// put in a response.
//
// The pilot's whole point: read the published set at request time from the runtime on loopback,
// instead of a file that has to be committed and rebuilt. Every conversion rule (ids, image paths,
// dates, bilingual copy) is the one lib/cms/published-site.ts already applies, so the live page
// and the rebuilt page cannot disagree.

// One revalidation window for the whole pilot: the pages' `revalidate` and the CMS read's cache
// entry. Publishing purges the tag, so a new article never waits the window out.
export const NEWS_WINDOW = 30;
export const NEWS_TAG = "news-live";

/** The runtime answered nothing usable. Callers fall back to the last committed copy. */
export class CmsUnavailable extends Error {
  constructor(message: string, options?: ErrorOptions) {
    super(message, options);
    this.name = "CmsUnavailable";
  }
}

// Read at call time, not import time, so a test can point one call at a stand-in server.
// Never a public hostname: the runtime listens on loopback and stays there.
export const cmsBase = () => (process.env.RAE_CMS_API ?? "http://127.0.0.1:3321").replace(/\/$/, "");

// One session per process, re-minted on expiry. Keyed by base so a changed base cannot reuse it.
let session: { base: string; token: string } | null = null;

// A POST fetch inside an ISR render makes Next treat the whole page as dynamic ("used no-store
// fetch"), and this client's only POST is the login. It goes over node:http instead; every read
// stays on fetch, where the cache entry and its tag live.
function postLogin(url: string, payload: string): Promise<{ status: number; body: string }> {
  return new Promise((resolve, reject) => {
    const request = httpRequest(
      url,
      {
        method: "POST",
        headers: { "content-type": "application/json", "content-length": Buffer.byteLength(payload) },
      },
      (response) => {
        let body = "";
        response.setEncoding("utf8");
        response.on("data", (chunk) => (body += chunk));
        response.on("end", () => resolve({ status: response.statusCode ?? 0, body }));
      },
    );
    request.on("error", reject);
    request.end(payload);
  });
}

async function login(base: string): Promise<string> {
  const userId = process.env.RAE_CMS_USER ?? "";
  const password = process.env.RAE_CMS_PASSWORD ?? "";
  if (!userId || !password) throw new CmsUnavailable("RAE_CMS_USER/RAE_CMS_PASSWORD are not set");
  let answer: { status: number; body: string };
  try {
    answer = await postLogin(`${base}/v1/login`, JSON.stringify({ userId, password }));
  } catch (error) {
    throw new CmsUnavailable(`CMS at ${base} is unreachable`, { cause: error });
  }
  if (answer.status !== 200) throw new CmsUnavailable(`CMS login answered ${answer.status}`);
  const body = JSON.parse(answer.body) as { token?: string };
  if (!body.token) throw new CmsUnavailable("CMS login returned no token");
  return body.token;
}

async function bearer(base: string): Promise<string> {
  if (session?.base !== base) session = { base, token: await login(base) };
  return session.token;
}

async function request(path: string, retry = true): Promise<Response> {
  const base = cmsBase();
  const token = await bearer(base);
  let response: Response;
  try {
    // Cached for the same window the pages revalidate on, and tagged so the publish hook can drop
    // it immediately. A `no-store` read here would make every page render dynamic instead of ISR.
    response = await fetch(`${base}${path}`, {
      headers: { authorization: `Bearer ${token}` },
      next: { revalidate: NEWS_WINDOW, tags: [NEWS_TAG] },
    });
  } catch (error) {
    throw new CmsUnavailable(`CMS ${path} is unreachable`, { cause: error });
  }
  // Sessions expire (30 min idle / 8 h absolute). One 401 means log in again once, never a loop.
  if (response.status === 401 && retry) {
    session = null;
    return request(path, false);
  }
  if (!response.ok) throw new CmsUnavailable(`CMS ${path} answered ${response.status}`);
  return response;
}

// The browser cannot reach the loopback runtime, so a photo is fetched through this app's own
// proxy (app/api/news-live/media). The runtime's own path shape is what gets validated first.
const publicArticle = (article: PreviewArticle): PreviewArticle => ({
  ...article,
  media: article.media.map((media) => ({
    ...media,
    url: String(media.url).replace(/^\/v1\/media\//, "/api/news-live/media/"),
  })),
});

/** A list item and a detail view in one read: the list needs no second request per article. */
export type LiveNews = NewsItem & { body: string[]; gallery: PublishedGalleryItem[] };

function toLive(locale: Locale, article: PreviewArticle): LiveNews {
  const view = articleView(locale, article);
  return { ...newsItemFrom(locale, article), body: view.body, gallery: view.gallery };
}

// Newest first, like every other list on the site. An article the runtime exports without a
// publication stamp sorts last rather than pretending to be new.
const newestFirst = (a: PreviewArticle, b: PreviewArticle) => (b.publishedAt ?? "").localeCompare(a.publishedAt ?? "");

function live(items: PreviewArticle[], locale: Locale): LiveNews[] {
  return items.sort(newestFirst).map((article) => toLive(locale, publicArticle(article)));
}

/**
 * Every published article, as the site renders it. Throws `CmsUnavailable` when the runtime is
 * down or hands back something the export gate refuses.
 */
export async function publishedNews(locale: Locale): Promise<LiveNews[]> {
  const response = await request("/v1/export");
  const payload = (await response.json()) as Parameters<typeof articlesFromExport>[0];
  try {
    return live(articlesFromExport(payload), locale);
  } catch (error) {
    throw new CmsUnavailable(`CMS export rejected: ${(error as Error).message}`, { cause: error });
  }
}

/** The last committed export — what the rebuild path ships. The pilot's outage fallback. */
export function cachedNews(locale: Locale): LiveNews[] {
  return live(siteArticles(), locale);
}

/**
 * What a page renders: the live set, or — when the runtime is down or answers with something the
 * export gate refuses — the last committed copy, flagged so the page can say so. A reader never
 * gets a stack trace for an unreachable API.
 */
export async function liveNews(locale: Locale): Promise<{ items: LiveNews[]; stale: boolean }> {
  try {
    return { items: await publishedNews(locale), stale: false };
  } catch (error) {
    if (!(error instanceof CmsUnavailable)) throw error;
    return { items: cachedNews(locale), stale: true };
  }
}

// Fresh search over the same live read. JSON only, so no query ever reaches markup.
export const SEARCH_LIMIT = 20;

export function searchNews(items: LiveNews[], query: string): LiveNews[] {
  const needle = foldForSearch(query.trim());
  if (!needle) return [];
  return items
    .filter((item) => foldForSearch(`${item.title} ${item.body.join(" ")}`).includes(needle))
    .slice(0, SEARCH_LIMIT);
}

/**
 * The publish hook's only credential. No secret configured means no caller can pass, and the
 * comparison is over the whole header rather than a prefix.
 */
export function revalidateAuthorized(header: string | null, secret = process.env.RAE_REVALIDATE_SECRET): boolean {
  return Boolean(secret) && header === secret;
}

/**
 * The GitHub Pages preview is a static export (`next.config.ts`), so it cannot run a route handler
 * on demand: each live route renders once there, against no runtime, and the pages it would serve
 * do not exist on Pages. Read at build time, not per request.
 */
export const staticExportOnly = process.env.NEXT_PAGES_PREVIEW === "1";

const xmlEscape = (value: string) => value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

/**
 * The dynamic sitemap's body: both languages of every id, each naming the other — the same pair the
 * page head declares. `siteUrl` is passed in so this stays importable without the content layer.
 */
export function sitemapXml(items: Pick<LiveNews, "nid" | "dateIso">[], siteUrl: string): string {
  const loc = (locale: Locale, nid: string) => `${siteUrl}/${locale}/news-live/${nid}/`;
  const alternates = (nid: string) =>
    `<xhtml:link rel="alternate" hreflang="th" href="${xmlEscape(loc("th", nid))}"/>` +
    `<xhtml:link rel="alternate" hreflang="en" href="${xmlEscape(loc("en", nid))}"/>` +
    `<xhtml:link rel="alternate" hreflang="x-default" href="${xmlEscape(loc("th", nid))}"/>`;
  const entries = items
    .flatMap((item) =>
      (["th", "en"] as const).map(
        (locale) =>
          `<url><loc>${xmlEscape(loc(locale, item.nid))}</loc>` +
          (item.dateIso ? `<lastmod>${xmlEscape(item.dateIso)}</lastmod>` : "") +
          `${alternates(item.nid)}</url>`,
      ),
    )
    .join("");
  return (
    `<?xml version="1.0" encoding="UTF-8"?>` +
    `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">` +
    `${entries}</urlset>`
  );
}
