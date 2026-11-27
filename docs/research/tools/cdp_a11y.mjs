// WCAG-oriented static measurements: contrast of visible text, heading order, tap targets.
// Usage: node cdp_a11y.mjs <url> <port> <width> <height> <tag>
const [url, port, vw, vh, tag] = process.argv.slice(2);
const { webSocketDebuggerUrl } = await (await fetch(`http://127.0.0.1:${port}/json/version`)).json();
const ws = new WebSocket(webSocketDebuggerUrl);
await new Promise((r) => (ws.onopen = r));
let seq = 0; const pending = new Map();
ws.onmessage = (m) => { const x = JSON.parse(m.data); if (x.id && pending.has(x.id)) { const p = pending.get(x.id); pending.delete(x.id); x.error ? p.reject(new Error(JSON.stringify(x.error))) : p.resolve(x.result); } };
const send = (m, p = {}, sessionId) => new Promise((resolve, reject) => { const id = ++seq; pending.set(id, { resolve, reject }); ws.send(JSON.stringify({ id, method: m, params: p, sessionId })); });
const { targetId } = await send('Target.createTarget', { url: 'about:blank' });
const { sessionId } = await send('Target.attachToTarget', { targetId, flatten: true });
const S = (m, p) => send(m, p, sessionId);
await S('Page.enable');
await S('Emulation.setDeviceMetricsOverride', { width: +vw, height: +vh, deviceScaleFactor: 1, mobile: +vw < 500 });
await S('Page.navigate', { url });
await new Promise((r) => setTimeout(r, 6000));

const expr = String.raw`
(() => {
  const parse = (c) => { const m = c.match(/rgba?\(([^)]+)\)/); if (!m) return null; const p = m[1].split(',').map(Number); return { r: p[0], g: p[1], b: p[2], a: p.length > 3 ? p[3] : 1 }; };
  const lum = ({ r, g, b }) => { const f = (v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); }; return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b); };
  const ratio = (a, b) => { const l1 = lum(a), l2 = lum(b); return ((Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05)); };
  const bgOf = (el) => {
    let c = el;
    while (c && c !== document.documentElement) {
      const cs = getComputedStyle(c);
      const bg = parse(cs.backgroundColor);
      if (bg && bg.a > 0.85) return bg;
      if (cs.backgroundImage && cs.backgroundImage !== 'none') return { image: true };
      c = c.parentElement;
    }
    const body = parse(getComputedStyle(document.body).backgroundColor);
    return body && body.a > 0.85 ? body : { r: 255, g: 255, b: 255, a: 1 };
  };
  const sel = (el) => { let s = el.tagName.toLowerCase(); if (el.id) s += '#' + el.id; const c = (el.className || '').toString().trim().split(/\s+/).filter(Boolean).slice(0, 2); if (c.length) s += '.' + c.join('.'); return s; };

  const bad = []; const skipped = { imageBg: 0, noText: 0 };
  const els = [...document.querySelectorAll('body *')].slice(0, 4000);
  for (const el of els) {
    const own = [...el.childNodes].filter((n) => n.nodeType === 3).map((n) => n.textContent).join('').trim();
    if (own.length < 2) continue;
    const r = el.getBoundingClientRect(); if (r.width < 4 || r.height < 4) continue;
    const cs = getComputedStyle(el);
    if (cs.visibility === 'hidden' || cs.display === 'none' || Number(cs.opacity) < 0.5) continue;
    const fg = parse(cs.color); if (!fg || fg.a < 0.5) { skipped.noText++; continue; }
    const bg = bgOf(el); if (bg.image) { skipped.imageBg++; continue; }
    const cr = ratio(fg, bg);
    const size = parseFloat(cs.fontSize); const bold = Number(cs.fontWeight) >= 700;
    const large = size >= 24 || (size >= 18.66 && bold);
    const need = large ? 3 : 4.5;
    if (cr < need) bad.push({ sel: sel(el), text: own.replace(/\s+/g, ' ').slice(0, 40), color: cs.color, bg: 'rgb(' + bg.r + ',' + bg.g + ',' + bg.b + ')', ratio: Math.round(cr * 100) / 100, need, size });
  }
  bad.sort((a, b) => a.ratio - b.ratio);

  // heading order
  const hs = [...document.querySelectorAll('h1,h2,h3,h4,h5,h6')].filter((h) => h.getBoundingClientRect().height > 0).map((h) => +h.tagName[1]);
  const order = [];
  for (let i = 0; i < hs.length; i++) { if (i === 0 && hs[i] !== 1) order.push('first-heading-is-h' + hs[i]); else if (i > 0 && hs[i] - hs[i - 1] > 1) order.push('jump h' + hs[i - 1] + '->h' + hs[i]); }

  // tap targets (mobile relevance)
  const interactive = [...document.querySelectorAll('a,button,input,select,[role="button"],[onclick]')].filter((e) => { const r = e.getBoundingClientRect(); const cs = getComputedStyle(e); return r.width > 0 && r.height > 0 && cs.display !== 'none'; });
  const small = interactive.filter((e) => { const r = e.getBoundingClientRect(); return r.height < 24 || r.width < 24; });

  // links without discernible text
  const emptyLinks = [...document.querySelectorAll('a')].filter((a) => { const t = (a.textContent || '').trim(); const lab = a.getAttribute('aria-label') || a.getAttribute('title'); const img = a.querySelector('img[alt]:not([alt=""])'); return !t && !lab && !img && a.getBoundingClientRect().width > 0; });

  return {
    contrast: { checked: els.length, belowAA: bad.length, imageBgSkipped: skipped.imageBg, worst: bad.slice(0, 12) },
    headingOrder: { count: hs.length, issues: [...new Set(order)].slice(0, 6) },
    tapTargets: { interactive: interactive.length, under24: small.length, sample: small.slice(0, 6).map((e) => sel(e) + ' ' + Math.round(e.getBoundingClientRect().height) + 'x' + Math.round(e.getBoundingClientRect().width)) },
    emptyLinks: emptyLinks.length,
    lang: document.documentElement.lang || null,
    title: document.title,
  };
})()`;
const r = await S('Runtime.evaluate', { expression: expr, returnByValue: true });
const fs = await import('node:fs');
fs.writeFileSync(`EVIDENCE/notes/a11y_${tag}_${vw}.json`, JSON.stringify(r.result.value, null, 1));
const v = r.result.value;
console.log(JSON.stringify({ tag, vw, belowAA: v.contrast.belowAA, checked: v.contrast.checked, imgBg: v.contrast.imageBgSkipped, headingIssues: v.headingOrder, tap: v.tapTargets, emptyLinks: v.emptyLinks, lang: v.lang }));
await send('Target.closeTarget', { targetId });
ws.close(); process.exit(0);
