// Full-page screenshot capture (no probe) with a high clip cap.
// Usage: node cdp_shots.mjs <url> <port> <slug> <width> <height>
const [url, port, slug, vw, vh] = process.argv.slice(2);
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
await new Promise((r) => setTimeout(r, 7000));
// scroll to bottom to trigger lazy content, then back
await S('Runtime.evaluate', { expression: 'window.scrollTo(0, document.body.scrollHeight); 1' });
await new Promise((r) => setTimeout(r, 2500));
await S('Runtime.evaluate', { expression: 'window.scrollTo(0, 0); 1' });
await new Promise((r) => setTimeout(r, 1200));
const m = await S('Page.getLayoutMetrics');
const h = Math.min(Math.ceil(m.cssContentSize.height), 20000);
const shot = await S('Page.captureScreenshot', { format: 'png', captureBeyondViewport: true, clip: { x: 0, y: 0, width: +vw, height: h, scale: 1 } });
const vp = await S('Page.captureScreenshot', { format: 'jpeg', quality: 80 });
const fs = await import('node:fs');
fs.writeFileSync(`EVIDENCE/screenshots/full_${slug}_${vw}.png`, Buffer.from(shot.data, 'base64'));
fs.writeFileSync(`EVIDENCE/screenshots/viewport_${slug}_${vw}.jpg`, Buffer.from(vp.data, 'base64'));
console.log(JSON.stringify({ slug, vw, fullHeight: h, cssHeight: Math.round(m.cssContentSize.height) }));
await send('Target.closeTarget', { targetId });
ws.close(); process.exit(0);
