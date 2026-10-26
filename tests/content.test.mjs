// Content gate. Runs with `npm test` (node:test, no dependencies, no build needed)
// against the raw content files, which is where an unsourced or insecure value would
// be introduced in the first place.
//
// It deliberately reads the TypeScript sources as text: importing them would need the
// Next alias resolver (`@/…`) and a build, and this gate must stay runnable in CI and
// on a fresh clone in under a second.

import { test } from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
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

test("the homepage carries no unsourced statistics", () => {
  // The four figures on the old homepage came from the design reference, not from an office
  // publication, and a visitor reads a big number as a fact. Two checks: no statistics-shaped
  // key survives, and no digit appears in the homepage sections at all — a figure reintroduced
  // under a different key, or pasted into a title, is caught by the second one. If real
  // figures are ever approved, replace this with a check that each value carries `source` and
  // `as_of` (ADR-0002).
  for (const [locale, file] of [["Thai", "th"], ["English", "en"]]) {
    const src = read(join(CONTENT, file, "site.ts"));
    assert.ok(!/(stats|figures|numbers|counter)s*:\s*\{/.test(src), `${locale} site.ts still declares a statistics block`);
    const from = src.indexOf("  sections: {");
    const to = src.indexOf("  notFound: {");
    assert.ok(from > 0 && to > from, `${locale} site.ts has no sections block to check`);
    // comments are documentation, not data
    const sections = src.slice(from, to).split("\n").filter((line) => !line.trim().startsWith("//")).join("\n");
    const digits = sections.match(/[^\n]*\d[^\n]*/g) ?? [];
    assert.deepEqual(digits, [], `${locale} homepage sections contain digits (a statistic?):\n${digits.join("\n")}`);
  }
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

test("the typeface is self-hosted, complete WOFF2 and stays out of Google", () => {
  // The build used to fetch Sarabun from fonts.googleapis.com through next/font/google, so a
  // network blip failed the build. Keeping the files in the repo is only half the fix: they
  // must stay complete files (a truncated download would still "exist") and no layout may go
  // back to Google. Each guarantee below was checked against a deliberately broken copy.
  const dir = join(process.cwd(), "assets", "fonts", "sarabun");
  const so = readFileSync(join(dir, "SOURCE.md"), "utf8");
  const weights = { Regular: "400", Medium: "500", SemiBold: "600", Bold: "700" };

  for (const [name, weight] of Object.entries(weights)) {
    const file = `Sarabun-${name}.woff2`;
    const buf = readFileSync(join(dir, file));
    // WOFF2 magic is "wOF2"; the WOFF2 header carries the exact byte length it expects, so a
    // truncated file is caught here rather than silently shipped.
    assert.equal(buf.subarray(0, 4).toString("latin1"), "wOF2", `${file} is not a WOFF2 file`);
    assert.equal(buf.readUInt32BE(8), buf.length, `${file} length field disagrees with the file size (truncated or padded)`);
    const sha = createHash("sha256").update(buf).digest("hex");
    assert.ok(so.includes(sha), `${file} sha256 ${sha} is not recorded in SOURCE.md`);
    assert.ok(so.includes(`(\`${weight}\`)`) || so.includes(`${weight}`), `SOURCE.md does not record weight ${weight} for ${file}`);
  }
  assert.match(readFileSync(join(dir, "OFL.txt"), "utf8"), /SIL Open Font License/);

  // Both quote styles, because a formatter switch should not silently reintroduce the fetch.
  for (const layout of ["app/[locale]/layout.tsx", "app/layout.tsx"].filter((p) => existsSync(join(process.cwd(), p)))) {
    const src = readFileSync(join(process.cwd(), layout), "utf8");
    assert.ok(!/from\s+["']next\/font\/google["']/.test(src), `${layout} still fetches fonts from Google`);
    if (src.includes("localFont")) {
      assert.ok(src.includes("assets/fonts/sarabun/"), `${layout} does not point at the committed files`);
    }
  }
});

test("every path in the repository is either Apache-licensed or named as excluded", () => {
  // Policy A2 licenses the app source; A1/A4 exclude the institutional material. This gate
  // walks the repository root and fails if a path is neither licensed nor explicitly named in
  // NOTICE — the failure mode it prevents is a new asset directory landing in the repo and
  // silently reading as Apache-2.0 licensed.
  const LICENSED = [
    "app", "cms-runtime", "components", "deploy", "lib", "prisma", "scripts", "tests",
    "package.json", "next.config.ts", "tsconfig.json", "postcss.config.mjs", "eslint.config.mjs",
    "Dockerfile.staging", "docker-compose.staging.yml",
  ];
  // Generated or non-creative files: Next writes next-env.d.ts and the tsbuildinfo cache,
  // .gitignore/.nvmrc/package-lock.json describe the repo rather than express anything, and
  // public/ is judged by its own excluded sub-trees (asserted below).
  const META = [
    "LICENSE", "NOTICE", "README.md", "package-lock.json", ".gitignore", ".nvmrc",
    "node_modules", "out", ".next", ".git", ".github", "public",
    "next-env.d.ts", "tsconfig.tsbuildinfo",
  ];
  const notice = readFileSync(join(process.cwd(), "NOTICE"), "utf8");

  const present = readdirSync(process.cwd()).filter((name) => !META.includes(name) && !name.startsWith("."));
  const unexplained = present.filter(
    (name) => !LICENSED.includes(name) && !notice.includes(`${name}/`) && !notice.includes(name),
  );
  assert.deepEqual(unexplained, [], `paths neither licensed nor named in NOTICE:\n${unexplained.join("\n")}`);

  // the excluded trees the policy names must actually be named in NOTICE
  for (const excluded of ["content/", "public/images/news/", "public/images/about/", "public/images/brand/", "design/stitch/", "docs/"]) {
    assert.ok(notice.includes(excluded), `NOTICE does not name the excluded tree ${excluded}`);
  }
});

test("NOTICE separates declared policy from verified facts from open questions", () => {
  // The owner asked for owner-declared rights, independently verified ownership and unresolved
  // authority to be distinguishable at a glance, so the three parts must exist by name.
  const notice = readFileSync(join(process.cwd(), "NOTICE"), "utf8");
  for (const heading of ["PART A — OWNER-DECLARED RIGHTS POLICY", "PART B — INDEPENDENTLY VERIFIED FACTS", "PART C — UNRESOLVED AUTHORITY"]) {
    assert.ok(notice.includes(heading), `NOTICE is missing ${heading}`);
  }
  assert.match(notice, /Apache License, Version 2\.0/);
  assert.match(notice, /Copyright \d{4} Prinya/);
});
