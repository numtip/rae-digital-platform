// Fixture tests for scripts/check-contrast.mjs. The gate's whole job is to be right about which
// colour a text node actually sits on, and its skip/inherit rules are exactly the kind that fail
// silently — so each rule is pinned here against a tiny export, with no build and no browser.
//
// Run with the rest: `npm test` (node --test tests/*.test.mjs).

import { test } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const SCRIPT = "scripts/check-contrast.mjs";

// pages: { "<relative file>": "<body markup>" } — each wrapped in a minimal document.
function run(pages) {
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
    const out = spawnSync(process.execPath, [SCRIPT], {
      cwd: process.cwd(),
      env: { ...process.env, EXPORT_DIR: dir },
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
