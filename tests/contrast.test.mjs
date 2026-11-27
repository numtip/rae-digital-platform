// Fixture tests for scripts/check-contrast.mjs. The gate's whole job is to be right about which
// colour a text node actually sits on, and its skip/inherit rules are exactly the kind that fail
// silently — so each rule is pinned here against a tiny export, with no build and no browser.
//
// Run with the rest: `npm test` (node --test tests/*.test.mjs).

import { test } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const SCRIPT = "scripts/check-contrast.mjs";

// pages: { "<relative file>": "<body markup>" } — each wrapped in a minimal document.
// extraCss: appended to the real app/globals.css and passed as THEME_CSS, to pin how aliases resolve.
function run(pages, extraCss) {
  const dir = mkdtempSync(join(tmpdir(), "rae-contrast-"));
  try {
    for (const [file, markup] of Object.entries(pages)) {
      const target = join(dir, file);
      mkdirSync(join(target, ".."), { recursive: true });
      writeFileSync(
        target,
        `<!DOCTYPE html><html lang="th"><body class="bg-surface-50 text-neutral-900">${markup}</body></html>`,
      );
    }
    const env = { ...process.env, EXPORT_DIR: dir };
    if (extraCss !== undefined) {
      const theme = join(dir, "theme.css");
      writeFileSync(theme, `${readFileSync("app/globals.css", "utf8")}\n${extraCss}\n`);
      env.THEME_CSS = theme;
    }
    const out = spawnSync(process.execPath, [SCRIPT], {
      cwd: process.cwd(),
      env,
      encoding: "utf8",
    });
    return { status: out.status, output: `${out.stdout}${out.stderr}` };
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

test("a low-contrast body text node fails, and names the pair", () => {
  const { status, output } = run({ "p/index.html": '<div class="bg-white"><p class="text-gold-600">kind</p></div>' });
  assert.equal(status, 1);
  assert.match(output, /gold-600 on white is 2\.7\d+:1/);
});

test("a 4.24:1 pair passes as a heading and fails as body text", () => {
  const heading = run({ "h/index.html": '<div class="bg-brand-600"><h2 class="text-3xl text-gold-500">big</h2></div>' });
  assert.equal(heading.status, 0, heading.output);
  const body = run({ "b/index.html": '<div class="bg-brand-600"><p class="text-base text-gold-500">small</p></div>' });
  assert.equal(body.status, 1);
  assert.match(body.output, /needs 4\.5:1/);
});

test("an inherited colour is resolved through the ancestors", () => {
  const { status, output } = run({ "i/index.html": '<div class="bg-white"><div class="px-4"><span class="text-neutral-300">muted</span></div></div>' });
  assert.equal(status, 1);
  // neutral-300 on white is 1.47:1 — the case where an unknown token used to be graded as "inherit".
  assert.match(output, /neutral-300 on white is 1\.4\d+:1/);
});

test("hover:, focus: and other variant-only colours are not this element's colour", () => {
  const { status, output } = run({ "v/index.html": '<div class="bg-white"><p class="text-neutral-700 hover:text-gold-500 focus:text-gold-600">ok</p></div>' });
  assert.equal(status, 0, output);
});

test("an HTML comment is not text on the page", () => {
  const { status, output } = run({ "c/index.html": '<div class="bg-brand-700"><!-- --><p class="text-white">ok</p></div>' });
  assert.equal(status, 0, output);
});

test("a colour token the script cannot resolve is an error, not an inherit", () => {
  const { status, output } = run({ "u/index.html": '<p class="text-purple-700">x</p>' });
  assert.equal(status, 1);
  assert.match(output, /purple-700/);
});

test("the dark pass follows globals.css, where the body background is unlayered", () => {
  // Exactly the 404 page's shape: the light colours sit on <body>, so in dark mode the unlayered
  // body rule makes the page near-black while these utilities stay light.
  const light = run({ "n/index.html": '<p class="text-neutral-800">title</p>' });
  assert.equal(light.status, 1);
  assert.match(light.output, /dark: neutral-800 on neutral-950 is 1\.3\d+:1/);
  const fixed = run({ "n/index.html": '<p class="text-neutral-800 dark:text-neutral-100">title</p>' });
  assert.equal(fixed.status, 0, fixed.output);
});

test("a bare opacity utility is skipped, a variant of it is not", () => {
  const bare = run({ "o/index.html": '<p class="text-gold-600 opacity-60">faded</p>' });
  assert.equal(bare.status, 0, bare.output);
  const variant = run({ "o/index.html": '<button class="bg-white text-neutral-900 disabled:opacity-60"><span class="text-gold-600">kind</span></button>' });
  assert.equal(variant.status, 1, "disabled:opacity-60 must not exempt the element's normal state");
});

test("an empty export fails instead of passing vacuously", () => {
  const { status, output } = run({});
  assert.equal(status, 1);
  assert.match(output, /no text found/);
});

// --- shadcn-style alias tokens: `--color-x: var(--x)` with the value in :root / the dark media query ---

test("the real shadcn aliases resolve: primary on its foreground passes, primary on primary fails", () => {
  const ok = run({ "a/index.html": '<div class="bg-primary"><p class="text-primary-foreground">ok</p></div>' });
  assert.equal(ok.status, 0, ok.output);
  const bad = run({ "b/index.html": '<div class="bg-primary"><p class="text-primary">same</p></div>' });
  assert.equal(bad.status, 1);
  assert.match(bad.output, /primary on primary is 1\.000:1/);
});

test("an alias is followed to its hex, not graded as inherit", () => {
  const css = ":root { --weak: var(--color-neutral-300); }\n@theme inline { --color-weak: var(--weak); }";
  const { status, output } = run({ "w/index.html": '<div class="bg-white"><p class="text-weak">x</p></div>' }, css);
  assert.equal(status, 1);
  assert.match(output, /weak on white is 1\.4\d+:1/);
});

test("the dark pass reads the alias value from the prefers-color-scheme: dark block", () => {
  // Light value is dark enough on white; the dark override (#0a0a0a) vanishes on the dark page.
  const css = [
    ":root { --sem: #171717; }",
    "@media (prefers-color-scheme: dark) { :root { --sem: #0a0a0a; } }",
    "@theme inline { --color-sem: var(--sem); }",
  ].join("\n");
  const { status, output } = run({ "d/index.html": '<div class="bg-white dark:bg-neutral-950"><p class="text-sem">x</p></div>' }, css);
  assert.equal(status, 1);
  assert.match(output, /dark: sem on neutral-950 is 1\.0\d+:1/);
  assert.doesNotMatch(output, /(^|\n)\s*- [^\n]*: sem on white/); // the light pass is fine
});

test("an alias chain through another alias resolves in both modes", () => {
  const css = [
    ":root { --inner: #ffffff; --outer: var(--inner); }",
    "@media (prefers-color-scheme: dark) { :root { --inner: #000000; } }",
    "@theme inline { --color-chain: var(--outer); }",
  ].join("\n");
  // white-on-brand-700 passes in light; in dark the same text is black on neutral-950.
  const { status, output } = run({ "c/index.html": '<div class="bg-brand-700 dark:bg-neutral-950"><p class="text-chain">x</p></div>' }, css);
  assert.equal(status, 1);
  assert.match(output, /dark: chain on neutral-950/);
});

test("an alias that cannot be resolved, a 3-digit hex and a cycle are errors, not silent", () => {
  const missing = run({ "m/index.html": "<p>x</p>" }, "@theme inline { --color-ghost: var(--nowhere); }");
  assert.equal(missing.status, 1);
  assert.match(missing.output, /--nowhere is not declared/);
  const short = run({ "s/index.html": "<p>x</p>" }, ":root { --tiny: #fff; }\n@theme inline { --color-tiny: var(--tiny); }");
  assert.equal(short.status, 1);
  assert.match(short.output, /6-digit hex/);
  const loop = run({ "l/index.html": "<p>x</p>" }, ":root { --a: var(--b); --b: var(--a); }\n@theme inline { --color-loop: var(--a); }");
  assert.equal(loop.status, 1);
  assert.match(loop.output, /alias cycle/);
});
