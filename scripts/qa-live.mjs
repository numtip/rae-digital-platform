#!/usr/bin/env node
// Live QA sweep of the Pages preview: every sitemap URL, then image/link/meta checks.
const BASE = process.env.QA_BASE || "https://numtip.github.io/rae-digital-platform";
const LIMIT = Number(process.env.QA_LIMIT || 0);
// Sweep a local export: the sitemap still names the deployed origin, so requests are
// rewritten to BASE while every expected canonical/hreflang stays the published URL.
const SRC_ORIGIN = process.env.QA_SOURCE_ORIGIN || "";
const target = (url) => (SRC_ORIGIN && url.startsWith(SRC_ORIGIN) ? BASE + url.slice(SRC_ORIGIN.length) : url);

async function get(url) {
  const res = await fetch(url, { redirect: "follow", headers: { "user-agent": "rae-qa" } });
  return { status: res.status, body: res.ok ? await res.text() : "" };
}

const sitemapXml = (await get(`${BASE}/sitemap.xml`)).body;
const urls = [...sitemapXml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]);
const list = LIMIT ? urls.slice(0, LIMIT) : urls;

const problems = [];
let ok = 0;
const stats = { lang: 0, canonical: 0, hreflang: 0, h1: 0, skip: 0, hash: 0, img: 0, imgchecked: 0, jsonld: 0 };

for (const url of list) {
  let r;
  try {
    r = await get(target(url));
  } catch (e) {
    problems.push(`${url} FETCH FAIL ${e.message}`);
    continue;
  }
  if (r.status !== 200) { problems.push(`${url} HTTP ${r.status}`); continue; }
  ok++;
  const h = r.body;
  const path = new URL(url).pathname;
  const locale = path.includes("/en/") || path.endsWith("/en/") ? "en" : "th";

  const lang = (h.match(/<html[^>]+lang="([^"]+)"/) || [])[1];
  if (lang === locale) stats.lang++; else problems.push(`${url} html lang=${lang} expected ${locale}`);

  const canon = (h.match(/<link rel="canonical" href="([^"]+)"/) || [])[1];
  if (canon === url) stats.canonical++; else problems.push(`${url} canonical=${canon}`);

  const alt = [...h.matchAll(/<link rel="alternate" hrefLang="(th|en|x-default)" href="([^"]+)"/g)];
  if (alt.length === 3) stats.hreflang++; else problems.push(`${url} hreflang count=${alt.length}`);

  const h1 = (h.match(/<h1[\s>]/g) || []).length;
  if (h1 === 1) stats.h1++; else problems.push(`${url} h1 count=${h1}`);

  if (h.includes('id="main-content"')) stats.skip++; else problems.push(`${url} no #main-content`);

  const hash = (h.match(/href="#"/g) || []).length;
  if (hash) { stats.hash += hash; problems.push(`${url} href="#" x${hash}`); }

  if (h.includes('rel="canonical"') && h.includes("noindex")) {
    // only the exported not-found shell may carry noindex
    if (!/robots" content="noindex/.test(h)) problems.push(`${url} noindex present`);
  }

  const imgs = [...h.matchAll(/<img[^>]+src="([^"]+)"/g)].map((m) => m[1]);
  stats.img += imgs.length;
  for (const src of new Set(imgs)) {
    // src is already an absolute path that carries the basePath; prefixing BASE again
    // doubled it and reported every image as 404.
    const abs = src.startsWith("http") ? src : new URL(src.startsWith("/") ? src : `/${src}`, BASE).href;
    if (!src.startsWith("/rae-digital-platform/") && !src.startsWith("http")) {
      problems.push(`${url} img without basePath: ${src}`);
    }
    const ir = await fetch(abs, { method: "GET", headers: { range: "bytes=0-99" } });
    stats.imgchecked++;
    // 206 = the range request was honoured; both mean the file is served.
    if (ir.status !== 200 && ir.status !== 206) problems.push(`${url} img ${ir.status} ${src}`);
  }

  if (h.includes('application/ld+json')) stats.jsonld++;
}

console.log(JSON.stringify({ base: BASE, urls: list.length, ok, stats, problems: problems.length }, null, 1));
for (const p of problems.slice(0, 60)) console.log(" -", p);
