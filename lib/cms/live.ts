import { request as httpRequest } from "node:http";
import type { NewsItem } from "../../content/th/news.ts";
import { SAFE_ID } from "./media.ts";
import { isWithdrawn } from "./withdrawn.ts";
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
// The point: read the published set at request time from the runtime on loopback, instead of a file
// that has to be committed and rebuilt. Every conversion rule (ids, image paths, dates, bilingual
// copy) is the one lib/cms/published-site.ts already applies, so the live page and the rebuilt page
// cannot disagree.
//
// What is authoritative: the CMS. The committed copy under public/cms-published/ is a snapshot from
// the last sync and is only a stand-in for an outage — which is why lib/cms/withdrawn.ts exists: a
// story the office took down lives on in that snapshot, and the tombstone is what stops it coming
// back. Every path below (list, detail, sitemap, the app's own media proxy) reads the set from here,
// so filtering it here filters all of them.

// One revalidation window for the whole news surface: the pages' `revalidate` and the CMS read's
// cache entry. Publishing purges the tag, so a new article never waits the window out.
export const NEWS_WINDOW = 30;
export const NEWS_TAG = "cms-news";

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
  // The tombstone is an instruction from the office, not a guess about the CMS: the export can
  // still carry a story the hook already reported taken down, and it must not be rendered while
  // that is true. Both readers (the live set and the committed fallback) pass through here.
  return items
    .filter((article) => !isWithdrawn(article.id))
    .sort(newestFirst)
    .map((article) => toLive(locale, publicArticle(article)));
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

/** The last committed export — what the rebuild path ships. The outage fallback. */
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

/**
 * The canonical list: the archive and the published set, one card per id, newest first. A live
 * item wins a collision — the CMS is what the office actually published — and the archive keeps
 * its own order among itself because both sides arrive newest-first.
 */
export function mergedNews(archive: NewsItem[], live: NewsItem[]): NewsItem[] {
  const byId = new Map<string, NewsItem>();
  for (const item of [...live, ...archive]) if (!byId.has(item.nid)) byId.set(item.nid, item);
  return [...byId.values()].sort((a, b) => b.dateIso.localeCompare(a.dateIso));
}

/**
 * The publish hook's only credential. No secret configured means no caller can pass, and the
 * comparison is over the whole header rather than a prefix.
 */
export function revalidateAuthorized(header: string | null, secret = process.env.RAE_REVALIDATE_SECRET): boolean {
  return Boolean(secret) && header === secret;
}

/**
 * The hook's optional body, `{withdrawn:[ids]}`. No body is a valid "something changed" ping;
 * anything else that is not that shape is refused whole rather than half-applied, because a
 * malformed withdrawal notice is the one thing that must never be guessed at.
 */
export function readWithdrawn(raw: string): { ok: true; ids: string[] } | { ok: false } {
  if (!raw.trim()) return { ok: true, ids: [] };
  let body: unknown;
  try {
    body = JSON.parse(raw);
  } catch {
    return { ok: false };
  }
  if (typeof body !== "object" || body === null || Array.isArray(body)) return { ok: false };
  const value = (body as { withdrawn?: unknown }).withdrawn;
  if (value === undefined) return { ok: true, ids: [] };
  // A publish hook names a story or two; a hundred ids in one call is not a withdrawal notice.
  if (!Array.isArray(value) || value.length > 100) return { ok: false };
  if (!value.every((id) => typeof id === "string" && SAFE_ID.test(id))) return { ok: false };
  return { ok: true, ids: value as string[] };
}

/**
 * The GitHub Pages preview is a static export (`next.config.ts`), so it cannot run a route handler
 * on demand: each live route renders once there, against no runtime, and the pages it would serve
 * do not exist on Pages. Read at build time, not per request.
 */
export const staticExportOnly = process.env.NEXT_PAGES_PREVIEW === "1";

/**
 * Sitemap entries for the published ids the archive does not already list, in both languages — the
 * same pair the page head declares. `siteUrl` is passed in so this stays importable without the
 * content layer, and the caller passes whatever `liveNews` gave it, so an outage lists the
 * committed copy (minus tombstones) instead of an empty news section.
 */
export function liveSitemap(items: Pick<LiveNews, "nid" | "dateIso">[], listed: Set<string>, siteUrl: string) {
  return items
    .filter((item) => !listed.has(item.nid))
    .flatMap((item) => {
      const languages = {
        th: `${siteUrl}/th/news/${item.nid}/`,
        en: `${siteUrl}/en/news/${item.nid}/`,
        "x-default": `${siteUrl}/th/news/${item.nid}/`,
      };
      return (["th", "en"] as const).map((locale) => ({
        url: languages[locale],
        lastModified: item.dateIso || undefined,
        changeFrequency: "yearly" as const,
        priority: 0.4,
        alternates: { languages },
      }));
    });
}
