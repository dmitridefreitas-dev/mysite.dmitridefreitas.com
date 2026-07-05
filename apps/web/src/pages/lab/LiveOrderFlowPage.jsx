import React, { useEffect, useRef, useState } from 'react';
import { Helmet } from 'react-helmet';
import { Github, ExternalLink } from 'lucide-react';

// ── Live order flow — real Binance L2 depth, synchronized correctly ──────────
// JS port of the tested TypeScript implementation in
// github.com/dmitridefreitas-dev/orderflow-visualizer (see repo for the
// unit-tested state machine; the sync rules below are Binance's documented
// snapshot+diff algorithm).

class OrderBook {
  constructor() { this.bids = []; this.asks = []; this.lastUpdateId = 0; }
  applySnapshot(bids, asks, lastUpdateId) {
    const toLv = ([p, q]) => ({ price: Number(p), qty: Number(q) });
    this.bids = bids.map(toLv).filter(l => l.qty > 0).sort((a, b) => b.price - a.price);
    this.asks = asks.map(toLv).filter(l => l.qty > 0).sort((a, b) => a.price - b.price);
    this.lastUpdateId = lastUpdateId;
  }
  _search(side, price) {
    const arr = side === 'bid' ? this.bids : this.asks;
    const before = (a, b) => (side === 'bid' ? a > b : a < b);
    let lo = 0, hi = arr.length - 1;
    while (lo <= hi) {
      const mid = (lo + hi) >>> 1;
      const p = arr[mid].price;
      if (p === price) return mid;
      if (before(p, price)) lo = mid + 1; else hi = mid - 1;
    }
    return -lo - 1;
  }
  setLevel(side, price, qty) {
    const arr = side === 'bid' ? this.bids : this.asks;
    const idx = this._search(side, price);
    if (idx >= 0) { if (qty === 0) arr.splice(idx, 1); else arr[idx] = { price, qty }; }
    else if (qty > 0) arr.splice(-idx - 1, 0, { price, qty });
  }
  bestBid() { return this.bids[0]; }
  bestAsk() { return this.asks[0]; }
  mid() { const b = this.bestBid(), a = this.bestAsk(); return b && a ? (b.price + a.price) / 2 : undefined; }
  spreadBps() { const b = this.bestBid(), a = this.bestAsk(), m = this.mid(); return b && a && m ? ((a.price - b.price) / m) * 1e4 : undefined; }
}

// Cont-Kukanov-Stoikov order-flow imbalance contribution at the touch.
function ofiContribution(pb, pa, cb, ca) {
  let e = 0;
  if (cb.price >= pb.price) e += cb.qty;
  if (cb.price <= pb.price) e -= pb.qty;
  if (ca.price <= pa.price) e -= ca.qty;
  if (ca.price >= pa.price) e += pa.qty;
  return e;
}

const SYMBOLS = ['BTCUSDT', 'ETHUSDT', 'SOLUSDT'];

// binance.com geo-blocks some regions (HTTP 451 in the US); binance.us serves
// the identical depth API. Try global first, fail over automatically.
const HOSTS = [
  { rest: 'https://api.binance.com', ws: 'wss://stream.binance.com:9443' },
  { rest: 'https://api.binance.us', ws: 'wss://stream.binance.us:9443' },
];

const LiveOrderFlowPage = () => {
  const canvasRef = useRef(null);
  const [symbol, setSymbol] = useState('BTCUSDT');
  const [status, setStatus] = useState('connecting…');
  const [stats, setStats] = useState(null);

  useEffect(() => {
    const book = new OrderBook();
    let ws = null;
    let hostIdx = 0;
    let state = 'buffering';
    let buffer = [];
    let prevBest = null;
    let ofiSum = 0;
    const ofiVals = [];
    const ofiHistory = [];
    let raf = 0;
    let dead = false;

    const applyDiff = (e) => {
      const expected = book.lastUpdateId + 1;
      if (e.u < expected) return;                    // stale, predates snapshot
      if (e.U > expected) { void resync('sequence gap'); return; }
      for (const [p, q] of e.b) book.setLevel('bid', Number(p), Number(q));
      for (const [p, q] of e.a) book.setLevel('ask', Number(p), Number(q));
      book.lastUpdateId = e.u;
      const b = book.bestBid(), a = book.bestAsk();
      if (b && a) {
        if (prevBest) {
          const contrib = ofiContribution(prevBest.b, prevBest.a, b, a);
          ofiSum += contrib; ofiVals.push(contrib);
          if (ofiVals.length > 300) ofiSum -= ofiVals.shift();
          ofiHistory.push(ofiSum);
          if (ofiHistory.length > 240) ofiHistory.shift();
        }
        prevBest = { b, a };
      }
    };

    const resync = async (reason) => {
      if (dead) return;
      state = 'buffering'; buffer = []; prevBest = null;
      setStatus(`syncing (${reason})…`);
      try {
        const res = await fetch(`${HOSTS[hostIdx].rest}/api/v3/depth?symbol=${symbol}&limit=1000`);
        if (!res.ok) throw new Error(`snapshot HTTP ${res.status}`);
        const snap = await res.json();
        if (dead) return;
        book.applySnapshot(snap.bids, snap.asks, snap.lastUpdateId);
        state = 'synced';
        const pending = buffer; buffer = [];
        for (const e of pending) { if (state === 'synced') applyDiff(e); }
        setStatus(`${symbol} · live${hostIdx === 1 ? ' · binance.us' : ''}`);
      } catch (err) {
        if (hostIdx + 1 < HOSTS.length) { failover(); return; }
        setStatus(`snapshot failed (${err.message}) — retrying in 3s`);
        setTimeout(() => { if (!dead) void resync('retry'); }, 3000);
      }
    };

    const openWs = () => {
      ws = new WebSocket(`${HOSTS[hostIdx].ws}/ws/${symbol.toLowerCase()}@depth@100ms`);
      ws.onopen = () => void resync('initial');
      ws.onmessage = (msg) => {
        const e = JSON.parse(msg.data);
        if (state === 'buffering') buffer.push(e);
        else if (state === 'synced') applyDiff(e);
      };
      ws.onerror = () => { if (!dead && hostIdx + 1 < HOSTS.length) failover(); else setStatus('websocket error — exchange unreachable from this network'); };
      ws.onclose = () => { if (!dead && state !== 'buffering') setStatus('disconnected'); };
    };

    const failover = () => {
      if (dead) return;
      hostIdx += 1;
      setStatus(`global endpoint unavailable — switching to binance.us…`);
      try { ws?.close(); } catch { /* already closed */ }
      state = 'buffering'; buffer = [];
      openWs();
    };

    openWs();

    const draw = () => {
      const canvas = canvasRef.current;
      if (canvas) {
        const ctx = canvas.getContext('2d');
        const w = canvas.width, h = canvas.height;
        ctx.fillStyle = '#05070f'; ctx.fillRect(0, 0, w, h);
        const depthH = Math.floor(h * 0.7);
        const n = Math.min(60, book.bids.length, book.asks.length);
        const m = book.mid();
        if (n >= 2 && m !== undefined) {
          const cum = (levels) => { let acc = 0; return levels.slice(0, n).map(l => ({ price: l.price, cum: (acc += l.qty) })); };
          const bc = cum(book.bids), ac = cum(book.asks);
          const pMin = bc[bc.length - 1].price, pMax = ac[ac.length - 1].price;
          const qMax = Math.max(bc[bc.length - 1].cum, ac[ac.length - 1].cum);
          const X = p => ((p - pMin) / (pMax - pMin)) * w;
          const Y = q => depthH - (q / qMax) * (depthH - 20);
          ctx.strokeStyle = '#141b2e';
          for (let i = 1; i < 4; i++) { ctx.beginPath(); ctx.moveTo(0, depthH * i / 4); ctx.lineTo(w, depthH * i / 4); ctx.stroke(); }
          const side = (pts, color) => {
            ctx.beginPath(); ctx.moveTo(X(pts[0].price), depthH);
            pts.forEach(pt => ctx.lineTo(X(pt.price), Y(pt.cum)));
            ctx.lineTo(X(pts[pts.length - 1].price), depthH); ctx.closePath();
            ctx.fillStyle = color + '26'; ctx.fill();
            ctx.beginPath();
            pts.forEach((pt, i) => { const px = X(pt.price), py = Y(pt.cum); if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py); });
            ctx.strokeStyle = color; ctx.lineWidth = 1.5; ctx.stroke();
          };
          side(bc, '#22c55e'); side(ac, '#ef4444');
          ctx.setLineDash([4, 4]); ctx.strokeStyle = '#4a7ab5';
          ctx.beginPath(); ctx.moveTo(X(m), 0); ctx.lineTo(X(m), depthH); ctx.stroke(); ctx.setLineDash([]);
          // OFI sparkline
          const top = depthH + 14, oh = h - top - 8;
          ctx.fillStyle = '#96a5c3'; ctx.font = '10px monospace';
          ctx.fillText('ORDER-FLOW IMBALANCE (rolling 300 updates)', 8, top);
          if (ofiHistory.length > 1) {
            const maxAbs = Math.max(1e-9, ...ofiHistory.map(Math.abs));
            const midY = top + oh / 2 + 4;
            ctx.strokeStyle = '#141b2e'; ctx.beginPath(); ctx.moveTo(0, midY); ctx.lineTo(w, midY); ctx.stroke();
            ctx.beginPath();
            ofiHistory.forEach((v, i) => {
              const px = (i / (ofiHistory.length - 1)) * w;
              const py = midY - (v / maxAbs) * (oh / 2 - 8);
              if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
            });
            ctx.strokeStyle = ofiHistory[ofiHistory.length - 1] >= 0 ? '#22c55e' : '#ef4444';
            ctx.lineWidth = 1.5; ctx.stroke();
          }
          setStats({
            mid: m, spread: book.spreadBps(),
            bidLevels: book.bids.length, askLevels: book.asks.length,
            ofi: ofiSum,
          });
        }
      }
      raf = requestAnimationFrame(draw);
    };
    raf = requestAnimationFrame(draw);

    return () => { dead = true; cancelAnimationFrame(raf); ws?.close(); };
  }, [symbol]);

  return (
    <>
      <Helmet>
        <title>Live Order Flow — Lab — Dmitri De Freitas</title>
        <meta name="description" content="Live Binance L2 order book, synchronized with the documented snapshot+diff algorithm, with cumulative depth and Cont-Kukanov-Stoikov order-flow imbalance rendered in real time." />
      </Helmet>
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
          <div>
            <h1 className="font-mono text-xl font-bold tracking-tight">LIVE ORDER FLOW</h1>
            <p className="font-mono text-[11px] text-muted-foreground mt-1">
              Real L2 depth from Binance's public WebSocket — synchronized with the exchange's documented
              snapshot+diff algorithm (stale-drop, straddle rule, gap→resync), not naive appends.
            </p>
          </div>
          <div className="flex items-center gap-2">
            {SYMBOLS.map(s => (
              <button key={s} onClick={() => setSymbol(s)}
                className={`font-mono text-[11px] px-3 h-8 border transition-colors ${symbol === s ? 'bg-primary text-primary-foreground border-primary' : 'border-border text-muted-foreground hover:text-foreground'}`}>
                {s.replace('USDT', '')}
              </button>
            ))}
          </div>
        </div>

        <div className="border border-border bg-muted/10 px-4 py-2 mb-3 flex flex-wrap gap-x-6 gap-y-1 font-mono text-[11px]">
          <span className="text-terminal-green">{status}</span>
          {stats && (
            <>
              <span className="text-muted-foreground">MID <span className="text-foreground tabular-nums">{stats.mid.toFixed(2)}</span></span>
              <span className="text-muted-foreground">SPREAD <span className="text-foreground tabular-nums">{stats.spread?.toFixed(2)} bps</span></span>
              <span className="text-muted-foreground">LEVELS <span className="text-foreground tabular-nums">{stats.bidLevels}b / {stats.askLevels}a</span></span>
              <span className="text-muted-foreground">OFI <span className={`tabular-nums ${stats.ofi >= 0 ? 'text-terminal-green' : 'text-destructive'}`}>{stats.ofi.toFixed(2)}</span></span>
            </>
          )}
        </div>

        <div className="border border-border">
          <canvas ref={canvasRef} width={1400} height={520} className="w-full block" style={{ maxHeight: '60vh' }} />
        </div>

        <div className="mt-4 flex flex-wrap gap-4 font-mono text-[11px]">
          <a href="https://github.com/dmitridefreitas-dev/orderflow-visualizer" target="_blank" rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 text-primary hover:underline underline-offset-4">
            <Github className="h-3.5 w-3.5" /> SOURCE + UNIT-TESTED SYNC STATE MACHINE
          </a>
          <span className="text-muted-foreground inline-flex items-center gap-1.5">
            <ExternalLink className="h-3.5 w-3.5" /> Data: Binance public WebSocket · no keys, everything runs in your browser
          </span>
        </div>
      </div>
    </>
  );
};

export default LiveOrderFlowPage;
