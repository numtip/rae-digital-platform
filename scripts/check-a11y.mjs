// Structural accessibility gate over the exported pages (WCAG 2.2 A/AA items that are decidable from static
// HTML). Complements check-contrast.mjs; a browser/axe run and screen-reader passes stay a human check.
//   npm run build:export && node scripts/check-a11y.mjs
// Per page: <html lang> equals the route locale; exactly one <h1>; a <main id="main-content">; a skip link to it;
// every <img> has an alt attribute; every <a> and <button> has an accessible name; every form control has a
// label (for/id, wrapping label, aria-label); ids are unique; no heading level is skipped downward by more than
// one (h2 -> h4); no positive tabindex. Exit code 1 on any failure.
import { readFileSync, readdirSync, statSync, existsSync } from "node:fs";
import { join, relative } from "node:path";

const OUT = process.env.EXPORT_DIR ?? "out";
if (!existsSync(OUT)) {
  console.error(`check-a11y: needs ${OUT}/ — run the preview export build first`);
  process.exit(1);
}

const files = [];
(function walk(dir) {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) walk(p);
    else if (name === "index.html" && /^(th|en)\//.test(relative(OUT, p))) files.push(p);
  }
})(OUT);
if (files.length === 0) {
  console.error("check-a11y: no localized pages found — refusing to pass vacuously");
  process.exit(1);
}

const failures = [];
let skipped = 0;
const strip = (html) => html.replace(/<script[\s\S]*?<\/script>/gi, "").replace(/<style[\s\S]*?<\/style>/gi, "").replace(/<!--[\s\S]*?-->/g, "");
const attr = (tag, name) => new RegExp(`\\s${name}\\s*=\\s*("([^"]*)"|'([^']*)')`, "i").exec(tag)?.slice(2).find((v) => v !== undefined);
const hasAttr = (tag, name) => new RegExp(`\\s${name}(\\s|=|>|/)`, "i").test(tag);
const textOf = (html) => html.replace(/<[^>]*>/g, " ").replace(/&nbsp;|\s+/g, " ").trim();

for (const file of files) {
  const rel = relative(OUT, file);
  const locale = rel.split("/")[0];
  const raw = readFileSync(file, "utf8");
  // The Pages preview bakes a Next 404 shell for server-only routes (the desk, the counted document route): not a page.
  if (raw.includes("NEXT_HTTP_ERROR_FALLBACK;404")) {
    skipped += 1;
    continue;
  }
  const html = strip(raw);
  const fail = (msg) => failures.push(`${rel}: ${msg}`);

  const lang = attr(/<html[^>]*>/i.exec(html)?.[0] ?? "", "lang");
  if (lang !== locale) fail(`<html lang="${lang}"> should be "${locale}"`);
  const h1 = (html.match(/<h1[\s>]/gi) ?? []).length;
  if (h1 !== 1) fail(`${h1} <h1> elements (need exactly 1)`);
  if (!/<main[^>]*id="main-content"/i.test(html)) fail('no <main id="main-content">');
  if (!/<a[^>]*href="#main-content"/i.test(html)) fail("no skip link to #main-content");

  for (const m of html.matchAll(/<img\b[^>]*>/gi)) if (!hasAttr(m[0], "alt")) fail(`<img> without alt: ${m[0].slice(0, 80)}`);

  for (const m of html.matchAll(/<(a|button)\b([^>]*)>([\s\S]*?)<\/\1>/gi)) {
    if (m[1] === "a" && !/\shref=/i.test(m[2])) continue;
    const name = textOf(m[3]) || attr(m[2], "aria-label") || attr(m[2], "title") || attr(m[2], "aria-labelledby") || (/<img[^>]*\salt="[^"]+"/i.test(m[3]) ? "img" : "") || (/<svg[^>]*aria-label/i.test(m[3]) ? "svg" : "");
    if (!name) fail(`<${m[1]}> without an accessible name: ${m[0].slice(0, 90)}`);
  }

  const labelFor = new Set([...html.matchAll(/<label\b[^>]*\sfor="([^"]+)"/gi)].map((m) => m[1]));
  const wrapped = [...html.matchAll(/<label\b[^>]*>([\s\S]*?)<\/label>/gi)].map((m) => m[1]);
  for (const m of html.matchAll(/<(input|select|textarea)\b[^>]*>/gi)) {
    const tag = m[0];
    const type = (attr(tag, "type") ?? "text").toLowerCase();
    if (["hidden", "submit", "button", "reset", "image"].includes(type)) continue;
    const id = attr(tag, "id");
    const named = attr(tag, "aria-label") || attr(tag, "aria-labelledby") || (id && labelFor.has(id)) || wrapped.some((w) => w.includes(tag));
    if (!named) fail(`form control without a label: ${tag.slice(0, 90)}`);
  }

  const ids = [...html.matchAll(/<[a-z][^>]*\sid="([^"]+)"/gi)].map((m) => m[1]);
  const dup = ids.filter((id, i) => ids.indexOf(id) !== i);
  for (const id of new Set(dup)) fail(`duplicate id "${id}"`);

  let prev = 0;
  for (const m of html.matchAll(/<h([1-6])[\s>]/gi)) {
    const level = Number(m[1]);
    if (prev && level > prev + 1) fail(`heading level jumps from h${prev} to h${level}`);
    prev = level;
  }
  if (/\stabindex="[1-9]/.test(html)) fail("positive tabindex");
}

if (failures.length) {
  const shown = failures.slice(0, 40);
  console.error(`check-a11y: ${failures.length} problem(s) in ${files.length} pages\n  - ${shown.join("\n  - ")}${failures.length > shown.length ? `\n  … and ${failures.length - shown.length} more` : ""}`);
  process.exit(1);
}
console.log(`check-a11y: ${files.length - skipped} pages OK (${skipped} server-only 404 shells skipped) — lang, single h1, main + skip link, alt, names, labels, unique ids, heading order`);
