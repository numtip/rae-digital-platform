// Inspect block-level layout of the top of a page at a given viewport.
// Usage: node cdp_layout.mjs <url> <port> <width> <height> [tag]
const [url, port, vw, vh, tag = 'layout'] = process.argv.slice(2);
const { webSocketDebuggerUrl } = await (await fetch(`http://127.0.0.1:${port}/json/version`)).json();
const ws = new WebSocket(webSocketDebuggerUrl);
await new Promise((r) => (ws.onopen = r));
let seq = 0; const pending = new Map();
ws.onmessage = (m) => { const x = JSON.parse(m.data); if (x.id && pending.has(x.id)) { const p = pending.get(x.id); pending.delete(x.id); x.error ? p.reject(new Error(JSON.stringify(x.error))) : p.resolve(x.result); } };
const send = (method, params = {}, sessionId) => new Promise((resolve, reject) => { const id = ++seq; pending.set(id, { resolve, reject }); ws.send(JSON.stringify({ id, method, params, sessionId })); });
const { targetId } = await send('Target.createTarget', { url: 'about:blank' });
const { sessionId } = await send('Target.attachToTarget', { targetId, flatten: true });
const S = (m, p) => send(m, p, sessionId);
await S('Page.enable');
await S('Emulation.setDeviceMetricsOverride', { width: +vw, height: +vh, deviceScaleFactor: 1, mobile: +vw < 500 });
await S('Page.navigate', { url });
await new Promise((r) => setTimeout(r, 6000));
const expr = `(() => {
  const out = [];
  const walk = (el, d) => {
    if (d > 3) return;
    for (const c of el.children) {
      const r = c.getBoundingClientRect();
      if (r.height < 8) continue;
      const cs = getComputedStyle(c);
      out.push({ d, tag: c.tagName, cls: (c.className || '').toString().slice(0, 70), id: c.id, top: Math.round(r.top + scrollY), h: Math.round(r.height), w: Math.round(r.width), bg: cs.backgroundColor, bgimg: cs.backgroundImage.slice(0, 60), pos: cs.position, hidden: cs.display === 'none' || cs.visibility === 'hidden' });
      if (out.length < 40) walk(c, d + 1);
    }
  };
  walk(document.body, 0);
  const imgsBroken = [...document.images].filter((i) => i.complete && i.naturalWidth === 0).map((i) => i.src.slice(0, 90));
  const heroImg = [...document.querySelectorAll('.carousel-item, .carousel img, [class*="banner" i] img')].map((e) => { const r = e.getBoundingClientRect(); return { cls: (e.className||'').toString().slice(0,50), w: Math.round(r.width), h: Math.round(r.height), src: (e.currentSrc||e.src||'').slice(-60) }; });
  const menuToggle = [...document.querySelectorAll('[class*="navbar-toggler" i], [class*="hamburger" i], [class*="menu-toggle" i], button[aria-controls]')].map((e) => ({ cls: (e.className||'').toString().slice(0,60), vis: e.getBoundingClientRect().width > 0 }));
  return { blocks: out, imgsBroken, heroImg, menuToggle, scrollW: document.documentElement.scrollWidth, innerW: innerWidth };
})()`;
const r = await S('Runtime.evaluate', { expression: expr, returnByValue: true });
const fs = await import('node:fs');
fs.writeFileSync(`EVIDENCE/notes/layout_${tag}_${vw}.json`, JSON.stringify(r.result.value, null, 1));
console.log(JSON.stringify({ ok: true, tag, blocks: r.result.value.blocks.length }));
await send('Target.closeTarget', { targetId });
ws.close(); process.exit(0);
