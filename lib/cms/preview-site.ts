import type { NewsRecord } from "./news-workflow.ts";
import { SAFE_ID } from "./media.ts";

// A published-only bridge from the CMS runtime to static files. It exists so an editor can look at
// what the public site would render without any draft reaching GitHub Pages: the script writes into
// a git-ignored directory and nothing here publishes anything.

export type PreviewMedia = {
  url: string;
  captionTh: string;
  captionEn: string;
  altTh: string;
  altEn: string;
};

export type PreviewArticle = {
  id: string;
  titleTh: string;
  titleEn: string;
  source: string;
  bodyTh: string[];
  bodyEn: string[];
  media: PreviewMedia[];
};

export class PreviewRejected extends Error {
  constructor(message: string) {
    super(message);
    this.name = "PreviewRejected";
  }
}

const escape = (value: string) =>
  value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");

// The export endpoint already filters to published items; this refuses anything that would still be
// wrong to publish — an id that could escape the output directory, a missing translation, no body.
export function assertPreviewable(item: PreviewArticle) {
  if (!SAFE_ID.test(item.id)) throw new PreviewRejected(`unsafe article id: ${item.id}`);
  if (!item.titleTh.trim() || !item.titleEn.trim()) throw new PreviewRejected(`${item.id} is missing a title in one language`);
  if (item.bodyTh.length === 0 || item.bodyEn.length === 0) throw new PreviewRejected(`${item.id} is missing a body in one language`);
  for (const media of item.media) {
    if (!SAFE_ID.test(item.id)) throw new PreviewRejected(`unsafe media reference in ${item.id}`);
    if (!media.captionTh.trim() || !media.captionEn.trim() || !media.altTh.trim() || !media.altEn.trim()) {
      throw new PreviewRejected(`${item.id} has an image without bilingual captions or alt text`);
    }
  }
}

const page = (title: string, locale: string, inner: string) => `<!doctype html>
<html lang="${locale}">
<head><meta charset="utf-8" /><title>${escape(title)}</title><meta name="viewport" content="width=device-width, initial-scale=1" /><meta name="robots" content="noindex, nofollow" /></head>
<body style="margin:0 auto;max-width:44rem;padding:1.5rem;font-family:system-ui,sans-serif;line-height:1.7">
${inner}
</body></html>`;

export function renderArticlePage(item: PreviewArticle, locale: "th" | "en") {
  const thai = locale === "th";
  const body = (thai ? item.bodyTh : item.bodyEn).map((paragraph) => `<p>${escape(paragraph)}</p>`).join("\n");
  const figures = item.media
    .map(
      (media) => `<figure style="margin:1rem 0"><img src="${escape(media.url)}" alt="${escape(thai ? media.altTh : media.altEn)}" style="width:100%;height:auto;border-radius:0.375rem" /><figcaption style="font-size:0.875rem;color:#525252">${escape(thai ? media.captionTh : media.captionEn)}</figcaption></figure>`,
    )
    .join("\n");
  const heading = thai ? item.titleTh : item.titleEn;
  return page(heading, thai ? "th" : "en", `<article><h1>${escape(heading)}</h1>
<p style="font-size:0.875rem;color:#525252">${escape(thai ? item.titleEn : item.titleTh)}</p>
${body}
${figures}
<p style="font-size:0.875rem"><a href="${escape(item.source)}" rel="noreferrer">${escape(item.source)}</a></p>
</article>`);
}

export function renderIndexPage(items: PreviewArticle[]) {
  const rows = items
    .map(
      (item) => `<li><a href="${item.id}/th.html">${escape(item.titleTh)}</a><br /><a href="${item.id}/en.html">${escape(item.titleEn)}</a></li>`,
    )
    .join("\n");
  return page("CMS preview", "th", `<h1>ข่าวที่เผยแพร่แล้ว (ตัวอย่าง)</h1>
<p style="font-size:0.875rem;color:#525252">ไฟล์ชุดนี้สร้างจาก CMS ภายในเครื่อง เฉพาะข่าวที่เผยแพร่แล้ว ไม่ได้ถูก deploy ขึ้นเว็บสาธารณะ</p>
<ul>${rows}</ul>`);
}

// The export is untrusted input from another process; anything beyond a published article is a bug
// worth failing on, not something to write out.
export function articlesFromExport(payload: { articles?: (Partial<PreviewArticle> & { status?: string })[] }): PreviewArticle[] {
  const articles = payload.articles ?? [];
  return articles.map((article) => {
    if (article.status && article.status !== "published") {
      throw new PreviewRejected(`${article.id} is ${article.status}, not published`);
    }
    const item: PreviewArticle = {
      id: String(article.id ?? ""),
      titleTh: String(article.titleTh ?? ""),
      titleEn: String(article.titleEn ?? ""),
      source: String(article.source ?? ""),
      bodyTh: article.bodyTh ?? [],
      bodyEn: article.bodyEn ?? [],
      media: article.media ?? [],
    };
    assertPreviewable(item);
    return item;
  });
}

export type PreviewFile = { path: string; contents: string };

// Paths only. Writing them is the caller's job, so the caller decides where they land.
export function previewFiles(items: PreviewArticle[]): PreviewFile[] {
  const files: PreviewFile[] = [{ path: "index.html", contents: renderIndexPage(items) }];
  for (const item of items) {
    files.push({ path: `${item.id}/th.html`, contents: renderArticlePage(item, "th") });
    files.push({ path: `${item.id}/en.html`, contents: renderArticlePage(item, "en") });
  }
  return files;
}

// Kept next to the writers so a type import never drifts.
export type { NewsRecord };
