import React, { useEffect, useRef, useState } from 'react';
import { Helmet } from 'react-helmet';
import { Github, Cpu, Play } from 'lucide-react';

// ── WASM matching engine playground ──────────────────────────────────────────
// Loads the actual C++ FastBook engine (github.com/dmitridefreitas-dev/
// matching-engine) compiled to WebAssembly, lets you trade against it, and
// races it against an equivalent JavaScript engine on the same synthetic
// order-flow shape.

// Compact JS matching engine used ONLY as the benchmark baseline: same
// semantics (price-time priority, maker-price fills, partial fills), plain
// JS data structures. It exists to answer "what does the same workload cost
// in JavaScript?" — the WASM engine is the differentially-fuzzed one.
class JsBook {
  constructor() {
    this.levels = { buy: new Map(), sell: new Map() };  // price -> array of {id, qty}
    this.prices = { buy: [], sell: [] };                // sorted: buy desc, sell asc
    this.index = new Map();                             // id -> {side, price}
  }
  _insertPrice(side, price) {
    const arr = this.prices[side];
    const before = (a, b) => (side === 'buy' ? a > b : a < b);
    let lo = 0, hi = arr.length - 1;
    while (lo <= hi) {
      const mid = (lo + hi) >>> 1;
      if (arr[mid] === price) return;
      if (before(arr[mid], price)) lo = mid + 1; else hi = mid - 1;
    }
    arr.splice(lo, 0, price);
  }
  _removePriceIfEmpty(side, price) {
    if (this.levels[side].get(price)?.length) return;
    this.levels[side].delete(price);
    const arr = this.prices[side];
    const idx = arr.indexOf(price); // small arrays near the touch; fine for a baseline
    if (idx >= 0) arr.splice(idx, 1);
  }
  _match(takerId, side, limitPrice, qty, fills) {
    const opp = side === 'buy' ? 'sell' : 'buy';
    const crossed = (p) => (side === 'buy' ? p <= limitPrice : p >= limitPrice);
    while (qty > 0 && this.prices[opp].length && crossed(this.prices[opp][0])) {
      const price = this.prices[opp][0];
      const queue = this.levels[opp].get(price);
      while (qty > 0 && queue.length) {
        const maker = queue[0];
        const traded = Math.min(qty, maker.qty);
        fills.push({ taker: takerId, maker: maker.id, price, quantity: traded });
        maker.qty -= traded; qty -= traded;
        if (maker.qty === 0) { queue.shift(); this.index.delete(maker.id); }
      }
      this._removePriceIfEmpty(opp, price);
    }
    return qty;
  }
  submitLimit(id, side, price, qty, fills) {
    const remaining = this._match(id, side, price, qty, fills);
    if (remaining > 0) {
      let queue = this.levels[side].get(price);
      if (!queue) { queue = []; this.levels[side].set(price, queue); this._insertPrice(side, price); }
      queue.push({ id, qty: remaining });
      this.index.set(id, { side, price });
    }
    return remaining;
  }
  submitMarket(id, side, qty, fills) {
    return this._match(id, side, side === 'buy' ? Infinity : 0, qty, fills);
  }
  cancel(id) {
    const ref = this.index.get(id);
    if (!ref) return false;
    const queue = this.levels[ref.side].get(ref.price);
    const i = queue.findIndex(o => o.id === id);
    if (i < 0) return false;
    queue.splice(i, 1);
    this.index.delete(id);
    this._removePriceIfEmpty(ref.side, ref.price);
    return true;
  }
  reduce(id, newQty) {
    const ref = this.index.get(id);
    if (!ref) return false;
    const order = this.levels[ref.side].get(ref.price)?.find(o => o.id === id);
    if (!order || newQty >= order.qty) return false;
    if (newQty === 0) return this.cancel(id);
    order.qty = newQty;
    return true;
  }
}

// Deterministic flow with the same statistical shape as the repo's
// generate_flow(): 55/25/10/10 submit/cancel/reduce/market mix, random-walk
// mid, ~25% aggressive. (Same shape — not bit-identical: the C++ generator
// uses mt19937_64; this one uses mulberry32.)
function generateJsFlow(operations, seed) {
  let a = seed >>> 0;
  const rnd = () => { a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  const roll = (n) => Math.floor(rnd() * n);
  const ops = [];
  const issued = [];
  let mid = 10000, nextId = 1;
  for (let i = 0; i < operations; i++) {
    if (roll(10) < 3) { mid += roll(2) === 0 ? 1 : -1; mid = Math.max(116, Math.min(19984, mid)); }
    const dice = roll(100);
    if (dice < 55 || issued.length === 0) {
      const side = roll(2) === 0 ? 'buy' : 'sell';
      const aggressive = roll(100) < 25;
      const offset = 1 + roll(12);
      const price = aggressive
        ? (side === 'buy' ? mid + roll(3) : mid - roll(3))
        : (side === 'buy' ? mid - offset : mid + offset);
      const id = nextId++;
      issued.push(id);
      ops.push({ kind: 'limit', id, side, price: Math.max(100, Math.min(20000, price)), qty: 1 + roll(100) });
    } else if (dice < 80) {
      ops.push({ kind: 'cancel', id: issued[roll(issued.length)] });
    } else if (dice < 90) {
      ops.push({ kind: 'reduce', id: issued[roll(issued.length)], qty: 1 + roll(50) });
    } else {
      ops.push({ kind: 'market', id: nextId++, side: roll(2) === 0 ? 'buy' : 'sell', qty: 1 + roll(80) });
    }
  }
  return ops;
}

function runJsBenchmark(operations, seed) {
  const ops = generateJsFlow(operations, seed);
  const book = new JsBook();
  const fills = [];
  let fillCount = 0;
  const t0 = performance.now();
  for (const op of ops) {
    fills.length = 0;
    if (op.kind === 'limit') { book.submitLimit(op.id, op.side, op.price, op.qty, fills); fillCount += fills.length; }
    else if (op.kind === 'market') { book.submitMarket(op.id, op.side, op.qty, fills); fillCount += fills.length; }
    else if (op.kind === 'cancel') book.cancel(op.id);
    else book.reduce(op.id, op.qty);
  }
  const ms = performance.now() - t0;
  return { ops: operations, millis: ms, opsPerSec: (operations * 1000) / ms, fills: fillCount };
}

const N_BENCH_OPS = 200_000;

const WasmEnginePage = () => {
  const modRef = useRef(null);
  const bookRef = useRef(null);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState(null);
  const [ladder, setLadder] = useState({ bids: [], asks: [] });
  const [fills, setFills] = useState([]);
  const [openOrders, setOpenOrders] = useState(0);
  const [form, setForm] = useState({ side: 'buy', type: 'limit', price: '100.00', qty: '10' });
  const [bench, setBench] = useState(null);
  const [running, setRunning] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const createLobEngine = (await import(/* @vite-ignore */ `${window.location.origin}/lob_engine.js`)).default;
        const mod = await createLobEngine();
        if (cancelled) return;
        modRef.current = mod;
        // Prices in integer cents: ladder $1.00 – $200.00.
        bookRef.current = new mod.WasmBook(100, 20000);
        seedBook();
        setReady(true);
      } catch (e) {
        setError(String(e?.message ?? e));
      }
    })();
    return () => { cancelled = true; bookRef.current?.delete?.(); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const refresh = () => {
    const book = bookRef.current;
    setLadder({
      bids: book.levels(true, 10),
      asks: book.levels(false, 10),
    });
    setOpenOrders(book.openOrders());
  };

  const seedBook = () => {
    const book = bookRef.current;
    for (let i = 1; i <= 8; i++) {
      book.submitLimit(true, 10000 - i * 5, 20 + i * 7);
      book.submitLimit(false, 10000 + i * 5, 18 + i * 6);
    }
    refresh();
  };

  const submit = () => {
    const book = bookRef.current;
    if (!book) return;
    const qty = Math.max(1, Math.floor(Number(form.qty)));
    const priceTicks = Math.round(Number(form.price) * 100);
    if (form.type === 'limit' && !(priceTicks >= 100 && priceTicks <= 20000)) {
      setError('price must be between $1.00 and $200.00'); return;
    }
    setError(null);
    if (form.type === 'limit') book.submitLimit(form.side === 'buy', priceTicks, qty);
    else book.submitMarket(form.side === 'buy', qty);
    const newFills = book.lastFills().map(f => ({ ...f, ts: Date.now() }));
    setFills(prev => [...newFills.reverse(), ...prev].slice(0, 12));
    refresh();
  };

  const runBench = () => {
    setRunning(true);
    // Let the UI paint before the busy loop.
    setTimeout(() => {
      try {
        const wasm = modRef.current.runBenchmark(N_BENCH_OPS, 42);
        const js = runJsBenchmark(N_BENCH_OPS, 42);
        setBench({ wasm, js });
      } finally {
        setRunning(false);
      }
    }, 30);
  };

  const fmtPrice = (t) => (t / 100).toFixed(2);

  return (
    <>
      <Helmet>
        <title>WASM Matching Engine — Lab — Dmitri De Freitas</title>
        <meta name="description" content="The C++ FastBook matching engine compiled to WebAssembly: submit orders against the real engine in your browser and race it against an equivalent JavaScript implementation." />
      </Helmet>
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-5">
          <h1 className="font-mono text-xl font-bold tracking-tight flex items-center gap-2">
            <Cpu className="h-5 w-5 text-primary" /> WASM MATCHING ENGINE
          </h1>
          <p className="font-mono text-[11px] text-muted-foreground mt-1 max-w-2xl">
            This is the actual C++20 FastBook engine — differentially fuzzed against a reference implementation,
            14.1M ops/s native — compiled to WebAssembly and running in your browser right now. Same code,
            same maker-price semantics, zero servers.
          </p>
        </div>

        {error && <p className="font-mono text-[11px] text-destructive mb-3">{error}</p>}
        {!ready && !error && <p className="font-mono text-[11px] text-muted-foreground">LOADING ENGINE…</p>}

        {ready && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {/* Order entry */}
            <div className="border border-border p-4">
              <p className="font-mono text-[10px] text-primary tracking-widest mb-3">ORDER ENTRY</p>
              <div className="space-y-2 font-mono text-[11px]">
                <div className="flex gap-2">
                  {['buy', 'sell'].map(s => (
                    <button key={s} onClick={() => setForm(f => ({ ...f, side: s }))}
                      className={`flex-1 h-8 border uppercase tracking-widest ${form.side === s ? (s === 'buy' ? 'bg-terminal-green/20 border-terminal-green text-terminal-green' : 'bg-destructive/20 border-destructive text-destructive') : 'border-border text-muted-foreground'}`}>
                      {s}
                    </button>
                  ))}
                </div>
                <div className="flex gap-2">
                  {['limit', 'market'].map(t => (
                    <button key={t} onClick={() => setForm(f => ({ ...f, type: t }))}
                      className={`flex-1 h-8 border uppercase tracking-widest ${form.type === t ? 'bg-primary text-primary-foreground border-primary' : 'border-border text-muted-foreground'}`}>
                      {t}
                    </button>
                  ))}
                </div>
                {form.type === 'limit' && (
                  <label className="block">
                    <span className="text-muted-foreground">PRICE ($1.00–$200.00)</span>
                    <input value={form.price} onChange={e => setForm(f => ({ ...f, price: e.target.value }))}
                      className="w-full mt-1 bg-muted/20 border border-border px-2 h-8 text-foreground" />
                  </label>
                )}
                <label className="block">
                  <span className="text-muted-foreground">QUANTITY</span>
                  <input value={form.qty} onChange={e => setForm(f => ({ ...f, qty: e.target.value }))}
                    className="w-full mt-1 bg-muted/20 border border-border px-2 h-8 text-foreground" />
                </label>
                <button onClick={submit}
                  className="w-full h-9 bg-primary text-primary-foreground font-bold tracking-widest hover:bg-primary/90">
                  SUBMIT TO ENGINE
                </button>
                <p className="text-muted-foreground/80">open orders: {openOrders} · <button className="text-primary hover:underline" onClick={seedBook}>re-seed book</button></p>
              </div>
            </div>

            {/* Book ladder */}
            <div className="border border-border p-4">
              <p className="font-mono text-[10px] text-primary tracking-widest mb-3">BOOK (TOP 10 · aggregated)</p>
              <div className="grid grid-cols-2 gap-2 font-mono text-[11px]">
                <div>
                  <p className="text-terminal-green mb-1">BIDS</p>
                  {ladder.bids.map(l => (
                    <div key={l.price} className="flex justify-between tabular-nums">
                      <span className="text-terminal-green">{fmtPrice(l.price)}</span>
                      <span className="text-muted-foreground">{l.qty} ({l.orders})</span>
                    </div>
                  ))}
                  {ladder.bids.length === 0 && <p className="text-muted-foreground/60">empty</p>}
                </div>
                <div>
                  <p className="text-destructive mb-1">ASKS</p>
                  {ladder.asks.map(l => (
                    <div key={l.price} className="flex justify-between tabular-nums">
                      <span className="text-destructive">{fmtPrice(l.price)}</span>
                      <span className="text-muted-foreground">{l.qty} ({l.orders})</span>
                    </div>
                  ))}
                  {ladder.asks.length === 0 && <p className="text-muted-foreground/60">empty</p>}
                </div>
              </div>
              <p className="font-mono text-[10px] text-primary tracking-widest mt-4 mb-2">FILLS</p>
              <div className="font-mono text-[10px] space-y-0.5 max-h-32 overflow-y-auto">
                {fills.length === 0 && <p className="text-muted-foreground/60">cross the spread to trade — fills print at the maker's price</p>}
                {fills.map((f, i) => (
                  <p key={i} className="text-muted-foreground tabular-nums">
                    {f.quantity} @ {fmtPrice(f.price)} <span className="text-muted-foreground/60">taker #{f.taker} ← maker #{f.maker}</span>
                  </p>
                ))}
              </div>
            </div>

            {/* Benchmark */}
            <div className="border border-border p-4">
              <p className="font-mono text-[10px] text-primary tracking-widest mb-3">JS vs WASM — {N_BENCH_OPS.toLocaleString()} OPS</p>
              <button onClick={runBench} disabled={running}
                className="w-full h-9 border border-primary text-primary font-mono text-[11px] font-bold tracking-widest hover:bg-primary/10 disabled:opacity-50 inline-flex items-center justify-center gap-2">
                <Play className="h-3.5 w-3.5" /> {running ? 'RUNNING…' : 'RUN BENCHMARK'}
              </button>
              {bench && (
                <div className="mt-4 space-y-3 font-mono text-[11px]">
                  {[['WASM (C++ FastBook)', bench.wasm, 'bg-primary'], ['JavaScript baseline', bench.js, 'bg-muted-foreground/50']].map(([label, r, color]) => (
                    <div key={label}>
                      <div className="flex justify-between mb-1">
                        <span className="text-muted-foreground">{label}</span>
                        <span className="text-foreground tabular-nums">{(r.opsPerSec / 1e6).toFixed(2)}M ops/s</span>
                      </div>
                      <div className="h-2 bg-muted/30">
                        <div className={`h-2 ${color}`} style={{ width: `${Math.min(100, (r.opsPerSec / Math.max(bench.wasm.opsPerSec, bench.js.opsPerSec)) * 100)}%` }} />
                      </div>
                    </div>
                  ))}
                  <p className="text-muted-foreground/80 leading-relaxed">
                    WASM {(bench.wasm.opsPerSec / bench.js.opsPerSec).toFixed(1)}× faster on this run.
                    Same 55/25/10/10 op mix and book dynamics for both engines (streams are
                    shape-identical, not bit-identical — the C++ flow generator uses mt19937_64).
                    Native on a pinned core: 14.1M ops/s.
                  </p>
                </div>
              )}
            </div>
          </div>
        )}

        <div className="mt-5 font-mono text-[11px]">
          <a href="https://github.com/dmitridefreitas-dev/matching-engine" target="_blank" rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 text-primary hover:underline underline-offset-4">
            <Github className="h-3.5 w-3.5" /> ENGINE SOURCE · DIFFERENTIAL FUZZER · NATIVE BENCHMARKS · PDF REPORT
          </a>
        </div>
      </div>
    </>
  );
};

export default WasmEnginePage;
