// Content gate. Runs with `npm test` (node:test, no dependencies, no build needed)
// against the raw content files, which is where an unsourced or insecure value would
// be introduced in the first place.
//
// It deliberately reads the TypeScript sources as text: importing them would need the
// Next alias resolver (`@/…`) and a build, and this gate must stay runnable in CI and
// on a fresh clone in under a second.

import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";

const CONTENT = join(process.cwd(), "content");

function walk(dir) {
  return readdirSync(dir).flatMap((name) => {
    const full = join(dir, name);
    return statSync(full).isDirectory() ? walk(full) : [full];
  });
}

const files = walk(CONTENT).filter((f) => f.endsWith(".ts"));
const read = (f) => readFileSync(f, "utf8");
const rel = (f) => f.slice(process.cwd().length + 1);

test("every content file exists in both locales", () => {
  // Compare names, not counts: a count check passes when one file per locale is renamed.
  const name = (f) => f.slice(f.indexOf("/content/") + "/content/".length).replace(/^(th|en)\//, "");
  const th = files.filter((f) => f.includes("/th/")).map(name).sort();
  const en = files.filter((f) => f.includes("/en/")).map(name).sort();
  assert.ok(th.length > 0, "no Thai content files found");
  assert.deepEqual(en, th, `locale file sets differ — th only: ${th.filter((n) => !en.includes(n))}, en only: ${en.filter((n) => !th.includes(n))}`);
});

test("every url in content is https", () => {
  const bad = [];
  for (const file of files) {
    for (const m of read(file).matchAll(/url:\s*"([^"]+)"/g)) {
      if (!m[1].startsWith("https://")) bad.push(`${rel(file)}: ${m[1]}`);
    }
  }
  assert.deepEqual(bad, [], `non-https urls:\n${bad.join("\n")}`);
});

test("every source block names when it was retrieved", () => {
  // Check ALL blocks in a file, not just the first: a page with two sources is legal.
  const missing = [];
  for (const file of files) {
    const src = read(file);
    for (const m of src.matchAll(/source:\s*\{([^}]*)\}/g)) {
      if (!m[1].includes("retrieved:")) missing.push(`${rel(file)}: ${m[1].trim().slice(0, 50)}`);
    }
  }
  assert.deepEqual(missing, [], `source block without retrieved:\n${missing.join("\n")}`);
});

test("unverified statistics stay labelled as sample data", () => {
  const th = read(join(CONTENT, "th/site.ts"));
  const en = read(join(CONTENT, "en/site.ts"));
  // The four homepage figures are not published by the office, so the page must keep
  // saying so. If real figures are ever approved, replace this test with a check for
  // `source` + `as_of` on each value (ADR-0002).
  assert.match(th.slice(th.indexOf("stats: {")), /ตัวอย่าง/, "Thai statistics lost the sample-data label");
  assert.match(en.slice(en.indexOf("stats: {")), /mock-up/, "English statistics lost the sample-data label");
});

test("no unresolved translation markers in content VALUES", () => {
  // A value left as the literal TODO(translate) means a key shipped untranslated.
  // The comment that documents the convention must not trip the gate, so only
  // quoted occurrences count.
  const hits = [];
  for (const file of files) {
    for (const m of read(file).matchAll(/"([^"]*TODO\(translate\)[^"]*)"/g)) hits.push(`${rel(file)}: ${m[1].slice(0, 60)}`);
  }
  assert.deepEqual(hits, [], "untranslated values:\n" + hits.join("\n"));
});

test("English news derives photo presence from the Thai source", () => {
  // Four stories have no photo on the office's own page. The English file must not
  // restate that: it derives the set, so the two locales cannot drift and the exported
  // pages cannot point at files that were never downloaded. The behavioural proof is
  // scripts/check-export.mjs; this guard stops someone hardcoding images again.
  const en = read(join(CONTENT, "en/news.ts"));
  assert.match(en, /HAS_PHOTO/, "English news no longer derives which items have a photo");
  assert.match(en, /thNews\.items/, "English news no longer reads the Thai source of truth");
});

test("news items all carry a source date and a stable id", () => {
  const src = read(join(CONTENT, "th/news.ts"));
  const enSrc = read(join(CONTENT, "en/news.ts"));
  const items = src.slice(src.indexOf("items: ["));
  const ids = [...items.matchAll(/nid: "(\d+)"/g)].map((m) => m[1]);
  const isos = [...items.matchAll(/dateIso: "([\d-]+)"/g)].map((m) => m[1]);
  const enIds = [...enSrc.matchAll(/item\("(\d+)"/g)].map((m) => m[1]);
  assert.deepEqual(enIds, ids, "English news ids must match the Thai list, in order");
  assert.ok(ids.length > 0, "no news items found");
  assert.equal(ids.length, isos.length, `${ids.length} items but ${isos.length} dates`);
  assert.equal(new Set(ids).size, ids.length, "duplicate nid in news items");
  for (const iso of isos) assert.match(iso, /^\d{4}-\d{2}-\d{2}$/, `bad dateIso ${iso}`);
  const sorted = [...isos].sort().reverse();
  assert.deepEqual(isos, sorted, "news items must be ordered newest first");
});
