// Minimal CDP screenshotter — drives installed Edge headlessly via Node built-ins.
// Usage: node tools/shot.mjs <url> <outFile> [widthxheight] [waitMs]
import { spawn } from 'node:child_process';
import { mkdtempSync } from 'node:fs';
import { writeFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const EDGE = 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe';
const url = process.argv[2] || 'http://127.0.0.1:3000/';
const out = process.argv[3] || 'shot.png';
const [w, h] = (process.argv[4] || '1366x900').split('x').map(Number);
const waitMs = Number(process.argv[5] || 4000);
const PORT = 9223;

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const udd = mkdtempSync(path.join(os.tmpdir(), 'edge-cdp-'));

const edge = spawn(EDGE, [
  '--headless=new', `--remote-debugging-port=${PORT}`, `--user-data-dir=${udd}`,
  '--no-first-run', '--no-default-browser-check', '--disable-gpu', '--hide-scrollbars',
  `--window-size=${w},${h}`, 'about:blank',
], { stdio: 'ignore' });

async function getJSON(p) {
  const r = await fetch(`http://127.0.0.1:${PORT}${p}`);
  return r.json();
}

let msgId = 0;
function rpc(ws, pending, method, params = {}, sessionId) {
  return new Promise((resolve, reject) => {
    const id = ++msgId;
    pending.set(id, { resolve, reject });
    ws.send(JSON.stringify({ id, method, params, sessionId }));
  });
}

try {
  let version;
  for (let i = 0; i < 50; i++) {
    try { version = await getJSON('/json/version'); break; } catch { await sleep(200); }
  }
  const ws = new WebSocket(version.webSocketDebuggerUrl);
  const pending = new Map();
  const events = [];
  ws.addEventListener('message', (e) => {
    const m = JSON.parse(e.data);
    if (m.id && pending.has(m.id)) {
      const { resolve, reject } = pending.get(m.id);
      pending.delete(m.id);
      m.error ? reject(new Error(JSON.stringify(m.error))) : resolve(m.result);
    } else if (m.method) {
      events.push(m);
    }
  });
  await new Promise((r) => ws.addEventListener('open', r));

  const { targetId } = await rpc(ws, pending, 'Target.createTarget', { url: 'about:blank' });
  const { sessionId } = await rpc(ws, pending, 'Target.attachToTarget', { targetId, flatten: true });
  await rpc(ws, pending, 'Page.enable', {}, sessionId);
  await rpc(ws, pending, 'Runtime.enable', {}, sessionId);
  await rpc(ws, pending, 'Page.navigate', { url }, sessionId);
  await sleep(waitMs);

  // collect console errors
  const consoleErrors = events
    .filter((e) => e.method === 'Runtime.consoleAPICalled' && e.params?.type === 'error')
    .map((e) => e.params.args.map((a) => a.value ?? a.description ?? '').join(' '));
  const exceptions = events
    .filter((e) => e.method === 'Runtime.exceptionThrown')
    .map((e) => e.params?.exceptionDetails?.exception?.description || e.params?.exceptionDetails?.text);

  const { data } = await rpc(ws, pending, 'Page.captureScreenshot', { format: 'png', captureBeyondViewport: false }, sessionId);
  writeFileSync(out, Buffer.from(data, 'base64'));
  console.log('SAVED', out);
  if (consoleErrors.length) console.log('CONSOLE_ERRORS:\n' + consoleErrors.join('\n'));
  if (exceptions.length) console.log('EXCEPTIONS:\n' + exceptions.join('\n'));
  ws.close();
} catch (err) {
  console.error('ERR', err.message);
} finally {
  edge.kill();
  await sleep(300);
  process.exit(0);
}
