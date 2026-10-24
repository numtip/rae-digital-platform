// Run one read-only expression in a page and print the JSON result.
// Usage: node cdp_eval.mjs <url> <port> <width> <height> "<expression>"
const [url, port, vw, vh, rawExpression] = process.argv.slice(2);
const fsMod = await import('node:fs');
const expression = rawExpression && fsMod.existsSync(rawExpression) ? fsMod.readFileSync(rawExpression, 'utf8') : rawExpression;
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
await new Promise((r) => setTimeout(r, 6500));
const r = await S('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true });
console.log(JSON.stringify(r.result.value ?? r.exceptionDetails?.text, null, 1));
await send('Target.closeTarget', { targetId });
ws.close(); process.exit(0);
