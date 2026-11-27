// Deterministic CDP probe for public website evidence capture.
// Usage: node cdp_probe.mjs <url> <port> <slug> <viewportWidth> <viewportHeight> <outDir>
// Read-only: navigates one disposable tab, extracts DOM/CSS/perf facts, writes JSON + PNG.
import fs from 'node:fs';
import path from 'node:path';

const [url, port, slug, vw, vh, outDir] = process.argv.slice(2);
const H = Number(vh), W = Number(vw);

const versionRes = await fetch(`http://127.0.0.1:${port}/json/version`);
const { webSocketDebuggerUrl } = await versionRes.json();
const ws = new WebSocket(webSocketDebuggerUrl);
await new Promise((r, j) => { ws.onopen = r; ws.onerror = j; });

let seq = 0;
const pending = new Map();
const events = [];
ws.onmessage = (m) => {
  const msg = JSON.parse(m.data);
  if (msg.id && pending.has(msg.id)) {
    const { resolve, reject } = pending.get(msg.id);
    pending.delete(msg.id);
    msg.error ? reject(new Error(JSON.stringify(msg.error))) : resolve(msg.result);
  } else if (msg.method) events.push(msg);
};
const send = (method, params = {}, sessionId) => new Promise((resolve, reject) => {
  const id = ++seq;
  pending.set(id, { resolve, reject });
  ws.send(JSON.stringify({ id, method, params, sessionId }));
});
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const { targetId } = await send('Target.createTarget', { url: 'about:blank' });
const { sessionId } = await send('Target.attachToTarget', { targetId, flatten: true });
const S = (method, params) => send(method, params, sessionId);

await S('Page.enable');
await S('Runtime.enable');
await S('Network.enable');
await S('Emulation.setDeviceMetricsOverride', { width: W, height: H, deviceScaleFactor: 1, mobile: W < 500 });
if (W < 500) {
  await S('Emulation.setUserAgentOverride', {
    userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1',
    platform: 'iPhone',
  });
}

const navs = [];
const reqFail = [];
await S('Page.navigate', { url });
const deadline = Date.now() + 45000;
let loaded = false;
while (Date.now() < deadline) {
  await sleep(250);
  if (events.some((e) => e.method === 'Page.loadEventFired')) { loaded = true; break; }
}
await sleep(3500); // allow late JS/lazy content and fonts

const expr = String.raw`
(() => {
  const vis = (el) => { const r = el.getBoundingClientRect(); const cs = getComputedStyle(el);
    return r.width > 0 && r.height > 0 && cs.visibility !== 'hidden' && cs.display !== 'none' && Number(cs.opacity) > 0.05; };
  const clean = (s) => (s || '').replace(/\s+/g, ' ').trim();
  const path = (el) => { const p = []; let c = el; for (let i = 0; i < 4 && c && c.tagName; i++) { p.unshift(c.tagName.toLowerCase() + (c.id ? '#' + c.id : '')); c = c.parentElement; } return p.join('>'); };
  const meta = (sel, attr = 'content') => { const e = document.querySelector(sel); return e ? e.getAttribute(attr) : null; };

  const navs = [];
  document.querySelectorAll('nav, header ul, .menu, .navbar, [role="navigation"]').forEach((n, i) => {
    if (i > 6 || !vis(n)) return;
    const links = [...n.querySelectorAll('a')].filter(vis).slice(0, 30).map((a) => ({ text: clean(a.textContent).slice(0, 48), href: a.getAttribute('href') }));
    if (links.length) navs.push({ sel: path(n), links });
  });

  const heads = [...document.querySelectorAll('h1,h2,h3')].filter(vis).slice(0, 40).map((h) => ({ t: h.tagName, text: clean(h.textContent).slice(0, 90), size: getComputedStyle(h).fontSize }));

  const rootVars = {};
  const rs = getComputedStyle(document.documentElement);
  for (let i = 0; i < rs.length && i < 400; i++) { const p = rs[i]; if (p.startsWith('--')) rootVars[p] = rs.getPropertyValue(p).trim().slice(0, 40); }

  const colorCount = {}, bgCount = {}, fontCount = {}, sizeCount = {};
  const bump = (o, k) => { if (k && k !== 'rgba(0, 0, 0, 0)') o[k] = (o[k] || 0) + 1; };
  const all = [...document.querySelectorAll('body *')].filter(vis).slice(0, 2500);
  for (const el of all) {
    const cs = getComputedStyle(el);
    bump(colorCount, cs.color); bump(bgCount, cs.backgroundColor);
    if (el.textContent && el.children.length === 0) { bump(fontCount, cs.fontFamily.split(',')[0].replace(/["']/g, '')); bump(sizeCount, cs.fontSize); }
  }
  const top = (o, n = 10) => Object.entries(o).sort((a, b) => b[1] - a[1]).slice(0, n).map(([k, v]) => ({ k, v }));

  const cssCount = {}, mediaRules = new Set(), cssHrefs = [];
  for (const sh of document.styleSheets) {
    try {
      cssHrefs.push(sh.href);
      for (const r of sh.cssRules || []) {
        if (r.type === 4) { mediaRules.add(String(r.conditionText || r.media.mediaText)); }
        if (r.selectorText) { r.selectorText.split(',').slice(0, 4).forEach((s) => { const t = s.trim(); if (/^[.#][A-Za-z]/.test(t)) cssCount[t.split(/[ .>:]/)[0]] = (cssCount[t.split(/[ .>:]/)[0]] || 0) + 1; }); }
        if (r.type === 4 && r.cssRules) for (const rr of r.cssRules) if (rr.selectorText) { const t = rr.selectorText.trim(); if (/^[.#][A-Za-z]/.test(t)) cssCount[t.split(/[ .>:]/)[0]] = (cssCount[t.split(/[ .>:]/)[0]] || 0) + 1; }
      }
    } catch (e) { /* cross-origin sheet */ }
  }

  const imgs = [...document.querySelectorAll('img')];
  const perf = performance.getEntriesByType('navigation')[0] || {};
  const res = performance.getEntriesByType('resource');
  const hosts = {};
  res.forEach((r) => { try { const h = new URL(r.name).host; hosts[h] = (hosts[h] || 0) + 1; } catch (e) {} });
  const byType = {};
  res.forEach((r) => { byType[r.initiatorType] = (byType[r.initiatorType] || 0) + 1; });

  const fonts = new Set();
  try { document.fonts.forEach((f) => fonts.add(f.family + ' ' + f.weight + ' ' + f.status)); } catch (e) {}
  const fontFaces = [];
  for (const sh of document.styleSheets) { try { for (const r of sh.cssRules || []) if (r.type === 5) fontFaces.push(clean((r.style && r.style.fontFamily) || '')); } catch (e) {} }

  const markers = {
    jquery: !!(window.jQuery && window.jQuery.fn && window.jQuery.fn.jquery) ? window.jQuery.fn.jquery : null,
    bootstrap: !!(window.bootstrap && window.bootstrap.Tooltip) ? 'js-present' : null,
    react: !!window.React || !!document.querySelector('#root[data-reactroot], [data-reactroot]'),
    vue: !!window.Vue || !!document.querySelector('[data-v-app]'),
    next: !!window.__NEXT_DATA__, nuxt: !!window.__NUXT__,
    angular: !!window.ng || !!document.querySelector('[ng-version]'),
    gtm: !!window.google_tag_manager, ga: typeof window.gtag === 'function',
    fbq: typeof window.fbq === 'function', recaptcha: !!window.grecaptcha,
  };

  const searchForms = [...document.querySelectorAll('form')].filter((f) => f.querySelector('input[type="search"], input[name*="search" i], input[name*="q" i], input[type="text"]') && vis(f)).length;
  const a11y = {
    lang: document.documentElement.lang || null,
    skipLink: !!document.querySelector('a[href^="#"][class*="skip" i], a.skip-link, a[href="#main"]'),
    landmarks: { header: document.querySelectorAll('header,[role="banner"]').length, nav: document.querySelectorAll('nav,[role="navigation"]').length, main: document.querySelectorAll('main,[role="main"]').length, footer: document.querySelectorAll('footer,[role="contentinfo"]').length },
    imgTotal: imgs.length, imgWithAlt: imgs.filter((i) => i.hasAttribute('alt')).length, imgEmptyAlt: imgs.filter((i) => i.getAttribute('alt') === '').length, imgNoAlt: imgs.filter((i) => !i.hasAttribute('alt')).length,
    ariaLabelCount: document.querySelectorAll('[aria-label],[aria-labelledby]').length,
    buttons: document.querySelectorAll('button').length,
    inputsWithoutLabel: [...document.querySelectorAll('input:not([type="hidden"]),select,textarea')].filter((i) => !i.labels?.length && !i.getAttribute('aria-label')).length,
    smallFonts: all.filter((el) => parseFloat(getComputedStyle(el).fontSize) < 12 && el.textContent.trim().length > 20).length,
  };

  return {
    title: document.title,
    meta: {
      description: meta('meta[name="description"]'), keywords: meta('meta[name="keywords"]'),
      viewport: meta('meta[name="viewport"]'), generator: meta('meta[name="generator"]'),
      ogSite: meta('meta[property="og:site_name"]'), ogImage: meta('meta[property="og:image"]'),
      ogTitle: meta('meta[property="og:title"]'), robots: meta('meta[name="robots"]'),
      canonical: meta('link[rel="canonical"]', 'href'), hreflang: [...document.querySelectorAll('link[rel="alternate"][hreflang]')].map((l) => l.hreflang + ':' + l.href),
      charset: document.characterSet,
    },
    h1: [...document.querySelectorAll('h1')].map((h) => clean(h.textContent).slice(0, 120)),
    headings: heads,
    navs,
    searchForms,
    counts: {
      a: document.querySelectorAll('a').length, img: imgs.length, form: document.querySelectorAll('form').length,
      iframe: document.querySelectorAll('iframe').length, video: document.querySelectorAll('video').length,
      section: document.querySelectorAll('section').length, article: document.querySelectorAll('article').length,
      table: document.querySelectorAll('table').length, button: document.querySelectorAll('button').length,
      svg: document.querySelectorAll('svg').length, picture: document.querySelectorAll('picture').length,
      elements: all.length,
    },
    widgetMarkers: {
      carousel: ['.carousel', '.swiper', '.slick-slider', '.owl-carousel', '[data-ride="carousel"]', '.slideshow'].filter((s) => document.querySelector(s)),
      tabs: ['.nav-tabs', '[role="tablist"]', '.tabs'].filter((s) => document.querySelector(s)),
      accordion: ['.accordion', '.faq', '.collapse'].filter((s) => document.querySelector(s)),
      modal: ['.modal', '[role="dialog"]'].filter((s) => document.querySelector(s)),
      cookieBanner: ['[class*="cookie" i]', '[id*="cookie" i]'].filter((s) => document.querySelector(s)).slice(0, 2),
      backToTop: ['[class*="back-to-top" i]', '[class*="scroll-top" i]', '[id*="toTop" i]'].filter((s) => document.querySelector(s)),
      langSwitch: ['[class*="lang" i]', 'a[hreflang]', '[id*="lang" i]'].filter((s) => document.querySelector(s)).slice(0, 3),
    },
    sticky: [...document.querySelectorAll('header, .navbar, [class*="header" i]')].filter((e) => { const p = getComputedStyle(e).position; return p === 'fixed' || p === 'sticky'; }).slice(0, 3).map((e) => path(e) + ':' + getComputedStyle(e).position),
    palette: { text: top(colorCount, 8), background: top(bgCount, 8), fontFamily: top(fontCount, 8), fontSize: top(sizeCount, 10) },
    cssVars: Object.keys(rootVars).length ? rootVars : null,
    css: { sheets: cssHrefs.length, sameOriginReadable: cssHrefs.filter(Boolean).length, mediaBreakpoints: [...mediaRules].slice(0, 20), topClasses: top(cssCount, 20), fontFaces: [...new Set(fontFaces)].slice(0, 10) },
    fontsLoaded: [...fonts].slice(0, 12),
    tech: markers,
    resources: { total: res.length, byType, bytes: res.reduce((a, r) => a + (r.transferSize || 0), 0), hosts: Object.entries(hosts).sort((a, b) => b[1] - a[1]).slice(0, 15) },
    perf: { ttfb: Math.round(perf.responseStart || 0), domContentLoaded: Math.round(perf.domContentLoadedEventEnd || 0), load: Math.round(perf.loadEventEnd || 0), transferSize: perf.transferSize || 0, decodedBodySize: perf.decodedBodySize || 0 },
    layout: { docWidth: document.documentElement.scrollWidth, viewport: innerWidth, horizontalOverflow: document.documentElement.scrollWidth > innerWidth + 2, docHeight: document.documentElement.scrollHeight },
    a11y,
    cookies: document.cookie.split(';').map((c) => c.split('=')[0].trim()).filter(Boolean),
    bodyBg: getComputedStyle(document.body).backgroundColor,
    bodyFont: getComputedStyle(document.body).fontFamily,
    bodyFontSize: getComputedStyle(document.body).fontSize,
  };
})()`;

let data = null;
try {
  const r = await S('Runtime.evaluate', { expression: expr, returnByValue: true, awaitPromise: false });
  data = r.result?.value ?? { evalError: r.exceptionDetails?.text };
} catch (e) { data = { evalError: String(e) }; }

const metrics = await S('Page.getLayoutMetrics').catch(() => null);
const shot = await S('Page.captureScreenshot', { format: 'png', captureBeyondViewport: true, clip: metrics ? {
  x: 0, y: 0, width: W, height: Math.min(metrics.cssContentSize.height, 6000), scale: 1 } : undefined }).catch(() => null);

const dir = path.resolve(outDir);
fs.mkdirSync(dir, { recursive: true });
const out = { url, finalUrl: events.filter((e) => e.method === 'Page.frameNavigated').map((e) => e.params.frame.url).pop(), port: Number(port), viewport: { w: W, h: H }, loaded, capturedAt: new Date().toISOString(), probe: data };
fs.writeFileSync(path.join(dir, `probe_${slug}_${W}.json`), JSON.stringify(out, null, 2));
if (shot?.data) fs.writeFileSync(path.join(dir, `shot_${slug}_${W}.png`), Buffer.from(shot.data, 'base64'));

await send('Target.closeTarget', { targetId });
ws.close();
console.log(JSON.stringify({ slug, ok: true, evalError: data?.evalError || null, shot: !!shot?.data, height: out.probe?.layout?.docHeight }));
process.exit(0);
