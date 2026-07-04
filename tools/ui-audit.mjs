// CDP audit harness: screenshots + horizontal-overflow + console-error detection.
// Requires serve-local.js running on :4000 (and the API on :3001 for live data).
//
// Usage:
//   node tools/ui-audit.mjs                         # 8 key pages, desktop+mobile
//   node tools/ui-audit.mjs --all                   # every route, desktop only
//   node tools/ui-audit.mjs --theme brown --tag x   # theme + filename tag
//   node tools/ui-audit.mjs --pages /,/about        # explicit routes
import { spawn } from 'node:child_process';
import { writeFileSync, mkdirSync } from 'node:fs';
import path from 'node:path';

const EDGE = 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe';
const BASE = 'http://localhost:4000';
const OUT = path.join(import.meta.dirname, 'shots');
mkdirSync(OUT, { recursive: true });

const KEY_PAGES = ['/', '/projects', '/about', '/recruiter', '/contact', '/lab', '/research', '/news'];
const ALL_PAGES = [
  '/', '/about', '/projects', '/contact', '/news', '/recruiter', '/ai',
  '/research', '/research/deflated-sharpe', '/research/svi-calibration', '/research/hmm-regime-detection',
  '/markets', '/glossary', '/disclaimers', '/coursework', '/regime',
  '/lab', '/lab/library', '/lab/yield-curve', '/lab/var', '/lab/distributions', '/lab/stochastic',
  '/lab/order-book', '/lab/regimes', '/lab/notes', '/lab/quiz', '/lab/optimizer', '/lab/factors',
  '/lab/pead', '/lab/iv-surface', '/lab/dcf', '/lab/ic-vault', '/lab/risk', '/lab/live-signal',
  '/lab/strategy', '/lab/backtest-stats', '/lab/microstructure', '/lab/options-analytics',
  '/lab/fixed-income-adv', '/lab/ml-finance', '/lab/latency', '/lab/sim',
];

const args = process.argv.slice(2);
const getArg = (name, dflt) => {
  const i = args.indexOf('--' + name);
  return i >= 0 ? args[i + 1] : dflt;
};
const THEME = getArg('theme', 'dark');
const TAG = getArg('tag', '');
const ALL = args.includes('--all');
const PAGES = getArg('pages', null)?.split(',') ?? (ALL ? ALL_PAGES : KEY_PAGES);
const VIEWPORTS = ALL
  ? [{ name: 'desktop', width: 1440, height: 900, mobile: false }]
  : [
      { name: 'desktop', width: 1440, height: 900, mobile: false },
      { name: 'mobile', width: 390, height: 844, mobile: true, scale: 2 },
    ];

const PORT = 9223;

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

async function connect(wsUrl) {
  const ws = new WebSocket(wsUrl);
  await new Promise((res, rej) => { ws.onopen = res; ws.onerror = rej; });
  let id = 0;
  const pending = new Map();
  const listeners = [];
  ws.onmessage = (e) => {
    const msg = JSON.parse(e.data);
    if (msg.id && pending.has(msg.id)) {
      const { resolve, reject } = pending.get(msg.id);
      pending.delete(msg.id);
      msg.error ? reject(new Error(msg.error.message)) : resolve(msg.result);
    } else if (msg.method) {
      listeners.forEach(fn => fn(msg));
    }
  };
  return {
    send: (method, params = {}) => new Promise((resolve, reject) => {
      const mid = ++id;
      pending.set(mid, { resolve, reject });
      ws.send(JSON.stringify({ id: mid, method, params }));
    }),
    on: (fn) => listeners.push(fn),
    close: () => ws.close(),
  };
}

// Find elements wider than the viewport and report short selectors.
const OVERFLOW_JS = `(() => {
  const vw = document.documentElement.clientWidth;
  const sw = document.documentElement.scrollWidth;
  const offenders = [];
  if (sw > vw + 1) {
    const all = document.querySelectorAll('body *');
    for (const el of all) {
      const r = el.getBoundingClientRect();
      if (r.width > vw + 1 || r.right > vw + 8) {
        if (offenders.some(o => o.el.contains(el))) continue;
        offenders.push({ el, right: Math.round(r.right), width: Math.round(r.width) });
      }
      if (offenders.length > 12) break;
    }
  }
  const sel = (el) => {
    let s = el.tagName.toLowerCase();
    if (el.id) s += '#' + el.id;
    const cls = (el.className && typeof el.className === 'string') ? el.className.split(/\\s+/).slice(0, 4).join('.') : '';
    if (cls) s += '.' + cls;
    const txt = (el.textContent || '').trim().slice(0, 40).replace(/\\s+/g, ' ');
    return s + (txt ? ' :: "' + txt + '"' : '');
  };
  const bodyText = document.body.innerText || '';
  return JSON.stringify({
    viewportWidth: vw,
    scrollWidth: sw,
    overflows: sw > vw + 1,
    offenders: offenders.map(o => ({ selector: sel(o.el), right: o.right, width: o.width })),
    textLength: bodyText.length,
    stuckLoading: bodyText.trim() === 'LOADING...',
    crashed: bodyText.includes('SOMETHING WENT WRONG'),
  });
})()`;

async function main() {
  const edge = spawn(EDGE, [
    '--headless=new', '--disable-gpu', `--remote-debugging-port=${PORT}`,
    '--no-first-run', '--user-data-dir=' + path.join(OUT, '..', 'edge-profile'),
    'about:blank',
  ], { stdio: 'ignore' });

  let targets;
  for (let i = 0; i < 40; i++) {
    try {
      const res = await fetch(`http://localhost:${PORT}/json/list`);
      targets = await res.json();
      if (targets.length) break;
    } catch { /* not ready */ }
    await sleep(250);
  }
  if (!targets?.length) { console.error('Edge devtools not reachable'); edge.kill(); process.exit(1); }

  const page = targets.find(t => t.type === 'page');
  const cdp = await connect(page.webSocketDebuggerUrl);
  await cdp.send('Page.enable');
  await cdp.send('Runtime.enable');

  // Collect console errors + uncaught exceptions per page
  let errors = [];
  cdp.on((msg) => {
    if (msg.method === 'Runtime.exceptionThrown') {
      errors.push('EXCEPTION: ' + (msg.params.exceptionDetails?.exception?.description ?? msg.params.exceptionDetails?.text ?? '?').split('\n')[0]);
    } else if (msg.method === 'Runtime.consoleAPICalled' && msg.params.type === 'error') {
      const txt = msg.params.args.map(a => a.value ?? a.description ?? '').join(' ').split('\n')[0];
      errors.push('console.error: ' + txt.slice(0, 200));
    }
  });

  const report = [];
  let failures = 0;

  for (const vp of VIEWPORTS) {
    await cdp.send('Emulation.setDeviceMetricsOverride', {
      width: vp.width, height: vp.height, deviceScaleFactor: vp.scale || 1, mobile: vp.mobile,
    });
    if (vp.mobile) await cdp.send('Emulation.setTouchEmulationEnabled', { enabled: true });

    for (const p of PAGES) {
      errors = [];
      await cdp.send('Page.addScriptToEvaluateOnNewDocument', {
        source: `
          localStorage.setItem('theme', ${JSON.stringify(THEME)});
          localStorage.setItem('readingMode', 'simple');
        `,
      });
      await cdp.send('Page.navigate', { url: BASE + p });
      await sleep(4500); // SPA render + lazy chunk + entrance animations

      const { result } = await cdp.send('Runtime.evaluate', { expression: OVERFLOW_JS, returnByValue: true });
      const info = JSON.parse(result.value);

      const shot = await cdp.send('Page.captureScreenshot', { format: 'png' });
      const slug = (p === '/' ? 'home' : p.replace(/\//g, '_').replace(/^_/, ''));
      const file = path.join(OUT, `${slug}-${vp.name}${TAG ? '-' + TAG : ''}.png`);
      writeFileSync(file, Buffer.from(shot.data, 'base64'));

      const pageErrors = [...errors];
      const bad = info.overflows || info.stuckLoading || info.crashed || pageErrors.some(e => e.startsWith('EXCEPTION'));
      if (bad) failures++;

      report.push({ page: p, viewport: vp.name, ...info, errors: pageErrors, file });
      console.log(
        `${bad ? 'FAIL' : ' ok '} ${vp.name.padEnd(7)} ${p.padEnd(24)} ` +
        `text=${String(info.textLength).padStart(5)} ` +
        (info.overflows ? `OVERFLOW sw=${info.scrollWidth} ` : '') +
        (info.stuckLoading ? 'STUCK-LOADING ' : '') +
        (info.crashed ? 'ERROR-BOUNDARY ' : '') +
        (pageErrors.length ? `errors=${pageErrors.length}` : '')
      );
      if (info.offenders?.length) console.log('    ' + info.offenders.map(o => `[${o.width}w] ${o.selector}`).join('\n    '));
      for (const e of pageErrors.slice(0, 4)) console.log('    ' + e);
    }
  }

  writeFileSync(path.join(OUT, `report${TAG ? '-' + TAG : ''}.json`), JSON.stringify(report, null, 2));
  console.log(`\n${report.length - failures}/${report.length} passed`);
  cdp.close();
  edge.kill();
}

main().catch(e => { console.error(e); process.exit(1); });
