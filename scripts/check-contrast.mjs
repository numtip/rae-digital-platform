// WCAG AA contrast gate over the exported pages. Run after a preview export:
//   NEXT_PUBLIC_SITE_URL=https://numtip.github.io/rae-digital-platform npm run build:export
//   node scripts/check-contrast.mjs
//
// Why it exists: M08 asks for 0 AA contrast failures and nothing measured them. Two
// small-text elements shipped below 4.5:1 — the 404 label and the empty "no older story"
// slot — because the same rule was applied by hand in some places (see the comments in
// app/[locale]/news/events/page.tsx and app/[locale]/page.tsx) and forgotten in others.
//
// How it decides: the export is static HTML with Tailwind class names in the markup, so the
// effective colours can be resolved without a browser. Each element inherits the nearest
// ancestor's text and background token; a bare `text-*`/`bg-*` utility on the element wins.
// Ratio is computed from the tokens in app/globals.css, so changing a token re-checks every
// page. Body text needs 4.5:1, large text (h1/h2 or 24px+) 3:1 — WCAG 2.2 AA.
//
// Limits, so nobody trusts it further than it goes: only the rendered static HTML is checked.
// Hover/focus states, client-only branches (search results render after a query), and
// background images or alpha backgrounds (bg-brand-700/75) are not measurable this way, so a
// colour on those needs a human look. Exit code 1 on any failure, so it can gate CI.

import { readFileSync, readdirSync, statSync, existsSync } from "node:fs";
import { join, relative } from "node:path";

const OUT = process.env.EXPORT_DIR ?? "out";
const THEME = "app/globals.css";

if (!existsSync(OUT) || !existsSync(THEME)) {
  console.error(`check-contrast: needs ${OUT}/ and ${THEME} — run the preview export build first`);
  process.exit(1);
}

// Tailwind's own palette, for the neutral steps the site uses. Named here because these are
// platform values, not project tokens; project colours come from @theme.
const PALETTE = {
  white: "#ffffff",
  "neutral-100": "#f5f5f5",
  "neutral-200": "#e5e5e5",
  "neutral-500": "#737373",
  "neutral-600": "#525252",
  "neutral-700": "#404040",
  "neutral-800": "#262626",
  "neutral-900": "#171717",
  "neutral-950": "#0a0a0a",
};

const tokens = { ...PALETTE };
for (const m of readFileSync(THEME, "utf8").matchAll(/--color-([\w-]+):\s*(#[0-9a-fA-F]{6})\s*;/g)) {
  tokens[m[1]] = m[2];
}
for (const required of ["brand-500", "brand-600", "brand-700", "gold-500", "cream-50", "surface-50"]) {
  if (!tokens[required]) {
    console.error(`check-contrast: token --color-${required} missing from ${THEME}`);
    process.exit(1);
  }
}

const channel = (hex) => hex.replace("#", "").match(/../g).map((x) => parseInt(x, 16) / 255);
const linear = (c) => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
const luminance = (hex) => {
  const [r, g, b] = channel(hex).map(linear);
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};
const contrast = (fg, bg) => {
  const [hi, lo] = [luminance(fg), luminance(bg)].sort((a, b) => b - a);
  return (hi + 0.05) / (lo + 0.05);
};

// A bare token utility only: `hover:text-gold-500`, `dark:bg-neutral-950` and `bg-brand-700/75`
// describe another state or an unknown composite, so they say nothing about this element.
function bareTokens(className, prefix) {
  const found = [];
  for (const utility of className.split(/\s+/)) {
    if (!utility.startsWith(prefix) || utility.includes(":") || utility.includes("/")) continue;
    const name = utility.slice(prefix.length);
    if (tokens[name]) found.push(name);
  }
  return found;
}

const SKIP_CONTENT = /^(script|style|head|template|noscript)$/i;
const VOID = /^(img|br|hr|input|meta|link|source|path|circle|rect|line|polyline|polygon|use)$/i;

function walk(dir) {
  return readdirSync(dir).flatMap((name) => {
    const full = join(dir, name);
    return statSync(full).isDirectory() ? walk(full) : [full];
  });
}

const failures = [];
let textNodes = 0;

for (const file of walk(OUT).filter((f) => f.endsWith(".html"))) {
  const html = readFileSync(file, "utf8");
  const page = relative(OUT, file);
  // Stack of open elements, each carrying the colours a text node inside it would use.
  const stack = [{ tag: "root", fg: "neutral-900", bg: "white", large: false, skip: false }];
  for (const m of html.matchAll(/<(\/?)([a-zA-Z][\w-]*)([^>]*)>|([^<]+)/g)) {
    if (m[4] !== undefined) {
      const text = m[4].replace(/&[a-z#0-9]+;/gi, "x").trim();
      const current = stack[stack.length - 1];
      if (!text || current.skip) continue;
      textNodes++;
      const need = current.large ? 3 : 4.5;
      const ratio = contrast(tokens[current.fg], tokens[current.bg]);
      if (ratio < need) {
        failures.push(
          `${page}: ${current.fg} on ${current.bg} is ${ratio.toFixed(3)}:1, needs ${need}:1 — "${text.slice(0, 50)}"`,
        );
      }
      continue;
    }
    const [, closing, tag, attrs] = m;
    if (closing) {
      if (stack.length > 1 && stack[stack.length - 1].tag === tag) stack.pop();
      continue;
    }
    if (VOID.test(tag) || /\/$/.test(attrs)) continue;
    const parent = stack[stack.length - 1];
    const className = (attrs.match(/class="([^"]*)"/) ?? [])[1] ?? "";
    stack.push({
      tag,
      fg: bareTokens(className, "text-").pop() ?? parent.fg,
      bg: bareTokens(className, "bg-").pop() ?? parent.bg,
      large: parent.large || /^h1$/i.test(tag) || /\btext-(2xl|3xl|4xl|5xl|6xl)\b/.test(className),
      skip:
        parent.skip ||
        SKIP_CONTENT.test(tag) ||
        /aria-hidden="true"/.test(attrs) ||
        /\bopacity-\d/.test(className) ||
        /\bsr-only\b/.test(className),
    });
  }
}

console.log(`check-contrast: ${textNodes} text nodes, ${Object.keys(tokens).length} tokens`);
if (failures.length > 0) {
  console.error(`\ncheck-contrast FAILED with ${failures.length} node(s) below WCAG AA:`);
  for (const failure of failures.slice(0, 40)) console.error(`  - ${failure}`);
  if (failures.length > 40) console.error(`  … and ${failures.length - 40} more`);
  process.exit(1);
}
console.log("check-contrast: OK — every body text node is at least 4.5:1, every heading at least 3:1");
