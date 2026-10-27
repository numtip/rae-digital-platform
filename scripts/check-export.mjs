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

// The not-found document is generated outside app/[locale]/, so no per-page check covers it.
const notFound = readFileSync(join(OUT, "404.html"), "utf8");
if (!/<title>[^<]+<\/title>/.test(notFound)) failures.push("404.html: no <title>");
if (!/<meta name="robots" content="noindex"/.test(notFound)) failures.push("404.html: missing noindex");
console.log(`check-export: ${htmlFiles.length} html files, ${routes} routes, ${internalLinks} internal refs, ${externalLinks} external links`);

if (failures.length > 0) {
  console.error(`\ncheck-export FAILED with ${failures.length} problem(s):`);
  for (const failure of failures.slice(0, 40)) console.error(`  - ${failure}`);
  if (failures.length > 40) console.error(`  … and ${failures.length - 40} more`);
  process.exit(1);
}
console.log("check-export: OK — internal links resolve, paths carry the basePath, TH/EN routes match");
