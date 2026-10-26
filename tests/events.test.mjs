import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

// /news/events/ derives its list from the Thai news archive instead of a separate event
// file, so the invariants it depends on are asserted here rather than trusted.

const thai = readFileSync("content/th/news.ts", "utf8");
const items = thai.slice(thai.indexOf("items: ["));
const nids = [...items.matchAll(/\n      nid: "(\d+)",/g)].map((m) => m[1]);
const isos = [...items.matchAll(/\n      dateIso: "([^"]+)",/g)].map((m) => m[1]);
const types = [...items.matchAll(/\n      type: "([^"]*)",/g)].map((m) => m[1]);

test("every news item has a date, an id and a type the events page can rely on", () => {
  assert.ok(nids.length > 0, "no news items were parsed — check the file shape");
  assert.equal(isos.length, nids.length, "an item is missing dateIso");
  assert.equal(types.length, nids.length, "an item is missing type");
  assert.equal(new Set(nids).size, nids.length, "duplicate nid");
  for (const iso of isos) {
    assert.match(iso, /^\d{4}-\d{2}-\d{2}$/);
    assert.equal(new Date(`${iso}T00:00:00Z`).toISOString().slice(0, 10), iso, `bad date ${iso}`);
  }
  for (const type of types) assert.ok(type.trim().length > 0, "an item has an empty type");
});

test("the archive stays newest-first, which is the order the events page renders", () => {
  const sorted = [...isos].sort().reverse();
  assert.deepEqual(isos, sorted);
});

test("the activity filter uses the prefix the data actually carries", () => {
  const source = readFileSync("lib/i18n.ts", "utf8");
  const prefix = source.match(/const ACTIVITY_TYPE_PREFIX = "([^"]+)"/)?.[1];
  assert.ok(prefix, "lib/i18n.ts no longer declares ACTIVITY_TYPE_PREFIX");
  const activity = types.filter((type) => type.startsWith(prefix));
  assert.ok(activity.length > 0, `no news item is typed "${prefix}…" — the events page would be empty`);
  assert.ok(activity.length < types.length, "every item is an activity; the news filter is meaningless");
});

test("the events route is reachable, bilingual and indexed", () => {
  const sitemap = readFileSync("app/sitemap.ts", "utf8");
  assert.match(sitemap, /news\/events/);
  const newsIndex = readFileSync("components/news-index.tsx", "utf8");
  assert.match(newsIndex, /\/news\/events/);
  const page = readFileSync("app/[locale]/news/events/page.tsx", "utf8");
  assert.match(page, /splitActivities/);
  assert.match(page, /upcoming\.length > 0/);
});
