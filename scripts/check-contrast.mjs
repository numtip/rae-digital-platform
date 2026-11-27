// WCAG AA contrast gate over the exported pages, light and dark. Run after a preview export:
//   NEXT_PUBLIC_SITE_URL=https://numtip.github.io/rae-digital-platform npm run build:export
//   node scripts/check-contrast.mjs
//
// Why it exists: M08 asks for 0 AA contrast failures and nothing measured them. Four small-text
// elements shipped below 4.5:1 in light mode — the 404 label, the two empty "no newer/older
// story" slots and the search-result kind label — because the same rule was applied by hand in
// some places (see the comments in app/[locale]/news/events/page.tsx and app/[locale]/page.tsx)
// and forgotten in others. The 404 page was also unreadable under `prefers-color-scheme: dark`.
//
// How it decides: the export is static HTML with the Tailwind classes still in the markup, so
// the effective colours can be resolved without a browser. Each element inherits the nearest
// ancestor's text and background token; a bare `text-*`/`bg-*` on the element wins the light
// pass and a `dark:` twin wins the dark one. Ratios come from the tokens read out of
// app/globals.css, so changing a colour re-checks every page. Body text needs 4.5:1, large text
// (text-2xl and up) 3:1 — WCAG 2.2 AA.
//
// Two rules keep it honest rather than merely green:
//  * a bare colour utility naming a token the script does not know is a hard error, because
//    "unknown" used to mean "inherit" and silently graded the wrong pair;
//  * an export with no pages, or no text, fails instead of passing vacuously.
//
// Limits, so nobody trusts it further than it goes: hover/focus/active and other variant-only
// colours describe another state and are skipped; alpha backgrounds (`bg-brand-700/75` behind
// the hero) and background images are not measurable; client-only branches (search results after
// a query) are not in the export. Those stay a human check. Exit code 1 on any failure.

import { readFileSync, readdirSync, statSync, existsSync } from "node:fs";
import { join, relative } from "node:path";

const OUT = process.env.EXPORT_DIR ?? "out";
const THEME = process.env.THEME_CSS ?? "app/globals.css";

if (!existsSync(OUT) || !existsSync(THEME)) {
  console.error(`check-contrast: needs ${OUT}/ and ${THEME} — run the preview export build first`);
  process.exit(1);
}

// Tailwind's own palette, for the shades the site uses but does not define as project tokens.
// Project colours come from @theme below.
const PALETTE = {
  white: "#ffffff",
  "neutral-100": "#f5f5f5",
  "neutral-200": "#e5e5e5",
  "neutral-300": "#d4d4d4",
  "neutral-400": "#a3a3a3",
  "neutral-500": "#737373",
  "neutral-600": "#525252",
  "neutral-700": "#404040",
  "neutral-800": "#262626",
  "neutral-900": "#171717",
  "neutral-950": "#0a0a0a",
  "red-700": "#b91c1c",
};

// Colour tokens, resolved per mode. A token is either a hex (`--color-brand-600: #014D35`) or an alias
// (`--color-primary: var(--primary)`, with `--primary: var(--color-brand-600)` in :root and a different
// value inside `@media (prefers-color-scheme: dark)`). An alias is followed until it reaches a hex, in the
// light declarations for the light pass and the dark overrides on top of them for the dark pass.
// Anything that does not end in a 6-digit hex is a hard error: grading it as "inherit" is the silent
// failure this gate exists to prevent.
const stripComments = (css) => css.replace(/\/\*[\s\S]*?\*\//g, "");

function splitDark(css) {
  let light = "";
  let dark = "";
  let rest = css;
  const open = /@media\s*\(\s*prefers-color-scheme\s*:\s*dark\s*\)\s*\{/;
  for (let m = open.exec(rest); m; m = open.exec(rest)) {
    let depth = 1;
    let i = m.index + m[0].length;
    while (i < rest.length && depth > 0) {
      if (rest[i] === "{") depth++;
      else if (rest[i] === "}") depth--;
      i++;
    }
    light += rest.slice(0, m.index);
    dark += rest.slice(m.index + m[0].length, i - 1);
    rest = rest.slice(i);
  }
  return { light: light + rest, dark };
}

const declarations = (css) => {
  const map = new Map();
  for (const m of css.matchAll(/(--[\w-]+)\s*:\s*([^;{}]+);/g)) map.set(m[1], m[2].trim());
  return map;
};

const themeSource = splitDark(stripComments(readFileSync(THEME, "utf8")));
const lightDecls = declarations(themeSource.light);
const darkDecls = new Map([...lightDecls, ...declarations(themeSource.dark)]);

const resolveErrors = [];
function resolveColour(name, decls, trail = []) {
  if (trail.includes(name)) throw new Error(`alias cycle ${[...trail, name].join(" -> ")}`);
  const raw = decls.get(name) ?? (name.startsWith("--color-") ? PALETTE[name.slice("--color-".length)] : undefined);
  if (raw === undefined) throw new Error(`${name} is not declared in ${THEME} and is not a Tailwind palette colour`);
  if (/^#[0-9a-fA-F]{6}$/.test(raw)) return raw.toLowerCase();
  const alias = raw.match(/^var\(\s*(--[\w-]+)\s*\)$/);
  if (alias) return resolveColour(alias[1], decls, [...trail, name]);
  throw new Error(`${name}: ${raw} is neither a 6-digit hex nor a single var() alias`);
}

const colourNames = new Set([
  ...Object.keys(PALETTE),
  ...[...darkDecls.keys()].filter((n) => n.startsWith("--color-")).map((n) => n.slice("--color-".length)),
]);
const tokens = {}; // light
const darkTokens = {};
for (const name of colourNames) {
  for (const [target, decls] of [[tokens, lightDecls], [darkTokens, darkDecls]]) {
    try {
      target[name] = resolveColour(`--color-${name}`, decls);
    } catch (error) {
      resolveErrors.push(`${target === tokens ? "light" : "dark"}: ${error.message}`);
    }
  }
}
if (resolveErrors.length > 0) {
  console.error(`check-contrast: ${resolveErrors.length} colour token(s) in ${THEME} cannot be resolved to a hex:`);
  for (const item of [...new Set(resolveErrors)]) console.error(`  - ${item}`);
  process.exit(1);
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

// A colour utility the palette says exists. `text-sm` and `bg-clip-text` are not colours, so the
// shape decides which names must resolve: a family name plus a numeric step.
const COLOUR_SHAPE = /^[a-z]+-\d+$/;

function colourTokens(className, prefix, dark) {
  const found = [];
  for (const utility of className.split(/\s+/)) {
    const parts = utility.split(":");
    const name = parts.pop();
    if (!name.startsWith(prefix)) continue;
    const modifiers = parts;
    const wanted = dark ? modifiers.length === 1 && modifiers[0] === "dark" : modifiers.length === 0;
    if (!wanted) continue;
    const token = name.slice(prefix.length);
    if (token.includes("/")) continue; // an alpha composite has no single background
    if (tokens[token]) found.push(token);
    else if (COLOUR_SHAPE.test(token)) found.push(`?${token}`); // caught below, never inherited
  }
  return found;
}

const SKIP_CONTENT = /^(script|style|head|template|noscript|svg)$/i;
const VOID = /^(img|br|hr|input|meta|link|source|path|circle|rect|line|polyline|polygon|use)$/i;

function walk(dir) {
  return readdirSync(dir).flatMap((name) => {
    const full = join(dir, name);
    return statSync(full).isDirectory() ? walk(full) : [full];
  });
}

const failures = [];
const unknown = new Set();
let textNodes = 0;

const htmlFiles = walk(OUT).filter((f) => f.endsWith(".html"));
for (const file of htmlFiles) {
  const html = readFileSync(file, "utf8").replace(/<!--[\s\S]*?-->/g, ""); // React's `<!-- -->` separators are not text
  const page = relative(OUT, file);
  // Stack of open elements: light and dark colours a text node inside would use.
  const stack = [{ tag: "root", fg: "neutral-900", bg: "white", dfg: "neutral-100", dbg: "neutral-950", large: false, skip: false }];
  for (const m of html.matchAll(/<(\/?)([a-zA-Z][\w-]*)([^>]*)>|([^<]+)/g)) {
    if (m[4] !== undefined) {
      const text = m[4].replace(/&[a-z#0-9]+;/gi, "x").trim();
      const current = stack[stack.length - 1];
      if (!text || current.skip) continue;
      textNodes++;
      const need = current.large ? 3 : 4.5;
      const pairs = [
        ["", current.fg, current.bg, tokens],
        ["dark: ", current.dfg, current.dbg, darkTokens],
      ];
      for (const [label, fg, bg, palette] of pairs) {
        if (fg.startsWith("?") || bg.startsWith("?")) continue;
        const ratio = contrast(palette[fg], palette[bg]);
        if (ratio < need) {
          failures.push(
            `${page}: ${label}${fg} on ${bg} is ${ratio.toFixed(3)}:1, needs ${need}:1 — "${text.slice(0, 50)}"`,
          );
        }
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
    const pick = (list) => {
      for (const token of list) if (token.startsWith("?")) unknown.add(`${page}: class ${token.slice(1)}`);
      return list.filter((token) => !token.startsWith("?")).pop();
    };
    const lightFg = pick(colourTokens(className, "text-", false));
    const lightBg = pick(colourTokens(className, "bg-", false));
    const fg = lightFg ?? parent.fg;
    const bg = lightBg ?? parent.bg;
    // A colour with no `dark:` twin keeps its light value in dark mode; only an element with no
    // colour of its own inherits the dark colour from its parent.
    const dfg = pick(colourTokens(className, "text-", true)) ?? lightFg ?? parent.dfg;
    const dbg = pick(colourTokens(className, "bg-", true)) ?? lightBg ?? parent.dbg;
    stack.push({
      tag,
      // globals.css sets the body background and text colour in an unlayered rule, which beats
      // the layered utilities: in dark mode <body> is neutral-950/neutral-100 whatever classes it
      // carries. Model that, or the dark pass grades a page that is not the one being served.
      fg: /^body$/i.test(tag) ? "neutral-900" : fg,
      bg: /^body$/i.test(tag) ? "surface-50" : bg,
      dfg: /^body$/i.test(tag) ? "neutral-100" : dfg,
      dbg: /^body$/i.test(tag) ? "neutral-950" : dbg,
      large: parent.large || /\btext-(2xl|3xl|4xl|5xl|6xl)\b/.test(className),
      skip:
        parent.skip ||
        SKIP_CONTENT.test(tag) ||
        /(^|\s)hidden(\s|$)/.test(className) ||
        /(^|\s)opacity-\d/.test(className) ||
        /(^|\s)sr-only\b/.test(className),
    });
  }
}

console.log(`check-contrast: ${htmlFiles.length} pages, ${textNodes} text nodes (light + dark)`);

if (htmlFiles.length === 0 || textNodes === 0) {
  console.error(`check-contrast: no text found in ${OUT}/ — the export is empty or the path is wrong`);
  process.exit(1);
}
if (unknown.size > 0) {
  console.error(`\ncheck-contrast: ${unknown.size} colour class(es) name a token this script cannot resolve:`);
  for (const item of unknown) console.error(`  - ${item}`);
  console.error("  add the token to app/globals.css @theme or to PALETTE in this script");
  process.exit(1);
}
if (failures.length > 0) {
  console.error(`\ncheck-contrast FAILED with ${failures.length} node(s) below WCAG AA:`);
  for (const failure of failures.slice(0, 40)) console.error(`  - ${failure}`);
  if (failures.length > 40) console.error(`  … and ${failures.length - 40} more`);
  process.exit(1);
}
console.log("check-contrast: OK — every body text node is at least 4.5:1, every heading at least 3:1, light and dark");
