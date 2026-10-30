// Integrity gate on the exported site. Run after a preview export:
//   NEXT_PAGES_PREVIEW=1 NEXT_PUBLIC_SITE_URL=https://example npm run build
//   node scripts/check-export.mjs
//
// Checks, all of which have caught real bugs in this project before:
//  1. every internal link resolves to a file that exists in out/
//     (the basePath bug shipped three 404ing images because nobody checked this)
//  2. every Thai page has an English twin and vice versa (TH/EN parity)
//  3. no dead anchors (href="#" or href="")
//  4. no plain-http link or asset
//  5. the not-found document carries a <title> and stays noindex (it shipped with
//     neither, because 404.html is built outside app/[locale]/ and no metadata export
//     reached it)
//  6. every control in the site header is a 44px tap target (the utility-bar links
//     shipped 28x16 and 38x16 at 375px, and the menu button 40x40, while the nav links
//     beside them were already 44px)
//  7. the search index does not index a document category as an item at /documents
//     (it did, so the row appeared twice and the documents chip counted each twice)
//
// Exit code 1 on any failure, so CI fails instead of shipping.

import { readFileSync, readdirSync, statSync, existsSync } from "node:fs";
import { join, relative } from "node:path";

const OUT = process.env.EXPORT_DIR ?? "out";
const BASE = process.env.BASE_PATH ?? "/rae-digital-platform";

if (!existsSync(OUT)) {
  console.error(`check-export: ${OUT}/ not found — run the preview export build first`);
  process.exit(1);
}

function walk(dir) {
  return readdirSync(dir).flatMap((name) => {
    const full = join(dir, name);
    return statSync(full).isDirectory() ? walk(full) : [full];
  });
}

const files = walk(OUT);
const htmlFiles = files.filter((f) => f.endsWith(".html"));
const failures = [];

// A URL path maps to a file: /x/y/ -> x/y/index.html, /x/y -> x/y or x/y.html
function resolvePath(pathname) {
  const withoutBase = pathname.startsWith(BASE) ? pathname.slice(BASE.length) : pathname;
  const clean = withoutBase.split("#")[0].split("?")[0];
  const rel = clean.replace(/^\//, "");
  const candidates = [
    join(OUT, rel, "index.html"),
    join(OUT, rel),
    join(OUT, `${rel}.html`),
  ];
  return candidates.some((c) => existsSync(c) && statSync(c).isFile());
}

let internalLinks = 0;
let externalLinks = 0;

for (const file of htmlFiles) {
  const html = readFileSync(file, "utf8");
  const page = relative(OUT, file);

  for (const m of html.matchAll(/href="([^"]+)"/g)) {
    const href = m[1];
    if (/^(tel:|mailto:|javascript:)/i.test(href)) continue;
    if (href.startsWith("http://")) {
      failures.push(`${page}: plain-http link ${href}`);
      continue;
    }
    if (href.startsWith("https://")) {
      externalLinks++;
      continue;
    }
    if (href === "#" || href === "") {
      failures.push(`${page}: dead control ${JSON.stringify(href)}`);
      continue;
    }
    if (href.startsWith("#")) continue; // in-page anchor, checked by the browser
    internalLinks++;
    if (!resolvePath(href)) failures.push(`${page}: broken internal link ${href}`);
  }

  // Every control in the header is a 44px tap target. The utility-bar search and language
  // links were 28x16 and 38x16 at 375px — the two controls a phone reader taps first — and
  // the icon-only menu button was 40x40, while the nav links beside them were already 44px.
  const header = html.match(/<header[\s\S]*?<\/header>/)?.[0] ?? "";
  for (const control of header.matchAll(/<(?:a|summary)\b[^>]*>/g)) {
    if (!/class="[^"]*\bmin-h-11\b/.test(control[0])) {
      failures.push(`${page}: header control under 44px tall, no min-h-11: ${control[0].slice(0, 90)}`);
    }
  }
  // The menu button carries no visible text, so it needs the width as well as the height.
  for (const summary of header.matchAll(/<summary\b[^>]*>/g)) {
    if (!/class="[^"]*\bmin-w-11\b/.test(summary[0])) {
      failures.push(`${page}: header menu button under 44px wide, no min-w-11`);
    }
  }

  for (const m of html.matchAll(/src="([^"]+)"/g)) {
    const src = m[1];
    if (src.startsWith("http://")) failures.push(`${page}: plain-http asset ${src}`);
    if (!src.startsWith("/")) continue;
    const rel = src.startsWith(BASE) ? src.slice(BASE.length) : src;
    internalLinks++;
    if (!existsSync(join(OUT, rel.replace(/^\//, "")))) failures.push(`${page}: missing asset ${src}`);
  }

  // srcset entries point at the resized photos, which are easy to forget
  for (const m of html.matchAll(/srcSet="([^"]+)"/gi)) {
    for (const candidate of m[1].split(",")) {
      const url = candidate.trim().split(/\s+/)[0];
      if (!url.startsWith("/")) continue;
      const rel = url.startsWith(BASE) ? url.slice(BASE.length) : url;
      internalLinks++;
      if (!existsSync(join(OUT, rel.replace(/^\//, "")))) failures.push(`${page}: missing srcset asset ${url}`);
    }
  }
  // The share card and the structured data must name the same image: they are read by different
  // machines (a social scraper, a crawler) and they drifted once — the JSON-LD one carried the
  // basePath twice, so every article advertised an image URL that 404s.
  const ogImage = html.match(/<meta property="og:image" content="([^"]+)"/)?.[1];
  const ldImage = html.match(/"image":\["([^"]+)"\]/)?.[1];
  if (ogImage && ldImage && ogImage !== ldImage) {
    failures.push(`${page}: JSON-LD image ${ldImage} differs from og:image ${ogImage}`);
  }
}

// TH/EN parity over the exported routes
const pages = new Set(
  htmlFiles
    .map((f) => relative(OUT, f).replace(/\\/g, "/"))
    .filter((p) => p !== "404.html" && p.endsWith("index.html"))
    .map((p) => p.replace(/\/index\.html$/, "")),
);
for (const page of [...pages].sort()) {
  const m = page.match(/^(th|en)(\/.*)?$/);
  if (!m) continue;
  const other = m[1] === "th" ? "en" : "th";
  const twin = `${other}${m[2] ?? ""}`;
  if (!pages.has(twin)) failures.push(`parity: /${page}/ has no /${twin}/`);
}

const routes = [...pages].length;

// Share cards must describe the page they sit on. The layout used to hard-code
// openGraph url/title/description to the locale home, so every shared subpage opened
// the homepage; scope this to the URLs the site asks crawlers to index. Twitter had the
// same bug, so its title is held to the same rule.
const sitemapLocs = [...readFileSync(join(OUT, "sitemap.xml"), "utf8").matchAll(/<loc>([^<]+)<\/loc>/g)].map(
  (m) => m[1],
);
// One site name per locale, not one per page: each locale uses the office's own name from
// `content/<locale>`, and a page that writes its own value shows up as a second entry.
const siteNames = { th: new Set(), en: new Set() };
for (const loc of sitemapLocs) {
  const path = new URL(loc).pathname.replace(BASE, "").replace(/^\/|\/$/g, "");
  const file = join(OUT, path, "index.html");
  if (!existsSync(file)) {
    failures.push(`sitemap: ${loc} has no exported page`);
    continue;
  }
  const html = readFileSync(file, "utf8");
  const ogUrl = (html.match(/<meta property="og:url" content="([^"]*)"/) || [])[1];
  const ogTitle = (html.match(/<meta property="og:title" content="([^"]*)"/) || [])[1] ?? "";
  const twitterTitle = (html.match(/<meta name="twitter:title" content="([^"]*)"/) || [])[1] ?? "";
  const title = (html.match(/<title>([^<]*)<\/title>/) || [])[1] ?? "";
  if (ogUrl !== loc) failures.push(`${loc}: og:url is ${ogUrl ?? "(missing)"}`);
  if (!ogTitle || !title.startsWith(ogTitle)) failures.push(`${loc}: og:title "${ogTitle}" is not this page's title`);
  if (!twitterTitle || !title.startsWith(twitterTitle))
    failures.push(`${loc}: twitter:title "${twitterTitle || "(missing)"}" is not this page's title`);
  // A page that sets its own openGraph replaces the layout's object, so the site-wide fields
  // have to be asserted per page: the news detail page dropped all three from every article
  // card while the homepage kept them, which no other check could see.
  const siteName = (html.match(/<meta property="og:site_name" content="([^"]*)"/) || [])[1];
  const ogLocale = (html.match(/<meta property="og:locale" content="([^"]*)"/) || [])[1];
  const alternate = (html.match(/<meta property="og:locale:alternate" content="([^"]*)"/) || [])[1];
  const language = path === "en" || path.startsWith("en/") ? "en" : "th";
  if (!siteName) failures.push(`${loc}: no og:site_name`);
  else siteNames[language].add(siteName);
  const expected = language === "en" ? "en_US" : "th_TH";
  if (ogLocale !== expected) failures.push(`${loc}: og:locale is ${ogLocale ?? "(missing)"}, expected ${expected}`);
  if (!alternate || alternate === ogLocale)
    failures.push(`${loc}: og:locale:alternate is ${alternate ?? "(missing)"}`);
}
for (const [language, names] of Object.entries(siteNames)) {
  if (names.size > 1) failures.push(`og:site_name has ${names.size} ${language} values: ${[...names].join(" | ")}`);
}

// The search index is serialised into the search page, and a document category was once
// indexed twice: at its own page and again as an item at /documents, which duplicated the
// row in the results and doubled the documents chip. Only "href" and "kind" are read —
// "text" arrives as a flight reference, so the entries cannot be parsed as JSON.
for (const locale of ["th", "en"]) {
  const file = join(OUT, locale, "search", "index.html");
  if (!existsSync(file)) continue;
  const html = readFileSync(file, "utf8").replaceAll('\\"', '"');
  const hubItems = html.match(new RegExp(`"href":"/${locale}/documents","kind":"item"`, "g")) ?? [];
  if (hubItems.length > 0) {
    failures.push(`/${locale}/search/: ${hubItems.length} search entries are items at /documents, not at their category page`);
  }
}

// The not-found document is generated outside app/[locale]/, so no per-page check covers it.
const notFound = readFileSync(join(OUT, "404.html"), "utf8");
if (!/<title>[^<]+<\/title>/.test(notFound)) failures.push("404.html: no <title>");
if (!/<meta name="robots" content="noindex"/.test(notFound)) failures.push("404.html: missing noindex");
console.log(`check-export: ${htmlFiles.length} html files, ${routes} routes, ${internalLinks} internal refs, ${externalLinks} external links, ${sitemapLocs.length} share cards`);

if (failures.length > 0) {
  console.error(`\ncheck-export FAILED with ${failures.length} problem(s):`);
  for (const failure of failures.slice(0, 40)) console.error(`  - ${failure}`);
  if (failures.length > 40) console.error(`  … and ${failures.length - 40} more`);
  process.exit(1);
}
console.log("check-export: OK — internal links resolve, paths carry the basePath, TH/EN routes match");
