/**
 * Full-page screenshots at a real device viewport, over the DevTools protocol.
 *
 * Run: node scripts/screenshot.mjs <url> <out.png> [width] [height] [scale]
 *   node scripts/screenshot.mjs http://localhost:5183/?qa=content shot.png 390 844 2
 *
 * Set CHROME_PATH if Chrome is not where this expects it.
 *
 * Chrome's --screenshot flag is not usable for this site: --window-size cannot go
 * below 500px and it doubles as the layout viewport, so a tall window makes
 * 100svh mean the window height and the hero swells to thousands of pixels.
 * Emulation.setDeviceMetricsOverride sets a true device viewport instead, and
 * captureBeyondViewport stitches the whole page without redefining svh.
 *
 * The capture also walks the page top to bottom before shooting, so lazy iframes
 * and IntersectionObserver reveals (src/art/ScrollMark.tsx) have fired.
 */
import { spawn } from 'node:child_process';
import { writeFileSync } from 'node:fs';

const [, , url, out, w = '390', h = '844', scale = '2'] = process.argv;
const CHROME = process.env.CHROME_PATH
  || 'C:/Users/agbm9/AppData/Local/ms-playwright/chromium-1232/chrome-win64/chrome.exe';
const PORT = 9333 + (process.pid % 500);

const chrome = spawn(CHROME, [
  '--headless=new', '--no-sandbox', '--hide-scrollbars',
  // Google Maps paints through WebGL; software GL keeps it visible in headless
  '--use-gl=swiftshader', '--enable-unsafe-swiftshader',
  `--remote-debugging-port=${PORT}`, '--window-size=1200,900', 'about:blank',
], { stdio: 'ignore' });

const wait = (ms) => new Promise((r) => setTimeout(r, ms));

async function targets() {
  for (let i = 0; i < 60; i++) {
    try {
      const res = await fetch(`http://127.0.0.1:${PORT}/json/list`);
      const list = await res.json();
      const page = list.find((t) => t.type === 'page');
      if (page?.webSocketDebuggerUrl) return page.webSocketDebuggerUrl;
    } catch { /* not up yet */ }
    await wait(120);
  }
  throw new Error('devtools never came up');
}

const ws = new WebSocket(await targets());
await new Promise((r) => { ws.onopen = r; });

let id = 0;
const pending = new Map();
ws.onmessage = (event) => {
  const msg = JSON.parse(event.data);
  if (msg.id && pending.has(msg.id)) { pending.get(msg.id)(msg); pending.delete(msg.id); }
};
const send = (method, params = {}) => new Promise((resolve) => {
  const mid = ++id;
  pending.set(mid, resolve);
  ws.send(JSON.stringify({ id: mid, method, params }));
});

await send('Page.enable');
await send('Emulation.setDeviceMetricsOverride', {
  width: Number(w), height: Number(h), deviceScaleFactor: Number(scale), mobile: Number(w) < 700,
});
await send('Page.navigate', { url });
await wait(3500);
// walk the whole page so lazy iframes and IntersectionObserver reveals all fire
const height = (await send('Runtime.evaluate', {
  expression: 'document.body.scrollHeight', returnByValue: true,
})).result.result.value;
for (let y = 0; y < height; y += 600) {
  await send('Runtime.evaluate', { expression: `window.scrollTo(0, ${y}); void 0` });
  await wait(220);
}
await wait(4000);
await send('Runtime.evaluate', { expression: 'window.scrollTo(0, 0); void 0' });
await wait(1200);

const shot = await send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: true });
writeFileSync(out, Buffer.from(shot.result.data, 'base64'));
console.log('wrote', out);

ws.close();
chrome.kill();
process.exit(0);
