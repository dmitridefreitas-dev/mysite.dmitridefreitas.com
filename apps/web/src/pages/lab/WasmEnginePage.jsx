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
const N_WARMUP_OPS = 20_000;

// ── Native benchmark receipts ─────────────────────────────────────────────────
// Verbatim from github.com/dmitridefreitas-dev/matching-engine README and
// results/ CSVs: AMD Ryzen 7 7730U, clang++ (LLVM-MinGW) -O2, single thread
// pinned to one core, warmup replay excluded, median of 3 runs, TSC-timed per
// operation (~5–10ns rdtsc-pair cost included). FastBook = optimized engine,
// MapBook = std::map reference oracle. Latencies in nanoseconds.
const NATIVE = {
  flows: [
    {
      key: 'lobster',
      label: 'LOBSTER REPLAY — AMZN, 261K OPS',
      sub: '269,748 messages · 2012-06-21 sample day · real order flow',
      fast: { p50: 30, p90: 120, p99: 330, p999: 510, mops: 14.1, speedup: '2.08×' },
      map:  { p50: 110, p90: 190, p99: 360, p999: 881, mops: 6.8 },
    },
    {
      key: 'synthetic',
      label: 'SYNTHETIC FLOW — 1M OPS',
      sub: '55/25/10/10 submit/cancel/market/reduce · seeded, reproducible',
      fast: { p50: 30, p90: 150, p99: 460, p999: 1300, mops: 11.9, speedup: '2.16×' },
      map:  { p50: 100, p90: 350, p99: 1072, p999: 3900, mops: 5.5 },
    },
  ],
  maxNs: 3900, // shared log scale across panels
};

const fmtNs = (ns) => (ns >= 1000 ? `${(ns / 1000).toFixed(1)} µs` : `${ns} ns`);
// log-scale bar width so 30ns and 3.9µs are comparable on one axis
const barPct = (ns) => Math.max(3, (Math.log10(ns / 10) / Math.log10(NATIVE.maxNs / 10)) * 100);

function PercentileLadder({ flow }) {
  const rows = [
    ['p50', flow.fast.p50, flow.map.p50],
    ['p90', flow.fast.p90, flow.map.p90],
    ['p99', flow.fast.p99, flow.map.p99],
    ['p99.9', flow.fast.p999, flow.map.p999],
  ];
  return (
    <div className="border border-border p-4">
      <p className="font-mono text-[10px] text-foreground font-bold tracking-widest">{flow.label}</p>
      <p className="font-mono text-[9px] text-muted-foreground/70 mb-3">{flow.sub}</p>
      <div className="space-y-2.5">
        {rows.map(([pct, fast, map]) => (
          <div key={pct} className="font-mono text-[10px]">
            <p className="text-muted-foreground tracking-widest text-[9px] mb-1">{pct}</p>
            {[
              ['FastBook', fast, 'bg-primary', 'text-primary'],
              ['std::map ref', map, 'bg-muted-foreground/40', 'text-muted-foreground'],
            ].map(([name, ns, barColor, txtColor]) => (
              <div key={name} className="flex items-center gap-2 mb-0.5">
                <div className="flex-1 h-2.5 bg-muted/20">
                  <div className={`h-2.5 ${barColor}`} style={{ width: `${barPct(ns)}%` }} />
                </div>
                <span className={`w-14 text-right tabular-nums ${txtColor}`}>{fmtNs(ns)}</span>
                <span className="w-20 text-muted-foreground/60 text-[9px]">{name}</span>
              </div>
            ))}
          </div>
        ))}
      </div>
      <div className="mt-3 pt-2 border-t border-border flex justify-between font-mono text-[10px]">
        <span className="text-muted-foreground">throughput</span>
        <span className="tabular-nums">
          <span className="text-primary font-bold">{flow.fast.mops}M ops/s</span>
          <span className="text-muted-foreground"> ({flow.fast.speedup}) vs {flow.map.mops}M</span>
        </span>
      </div>
    </div>
  );
}

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
        // Warmup pass for both engines: JS gets JIT-compiled, WASM gets any
        // lazy compilation out of the way. Warmup results are discarded.
        modRef.current.runBenchmark(N_WARMUP_OPS, 7);
        runJsBenchmark(N_WARMUP_OPS, 7);
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
            p50 30ns / p99 330ns / p99.9 510ns per op on a replayed AMZN market-data day — compiled to
            WebAssembly and running in your browser right now. Same code, same maker-price semantics, zero servers.
            Full latency distributions and methodology below.
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
                    A discarded {N_WARMUP_OPS.toLocaleString()}-op warmup pass runs first so the JS engine
                    is JIT-compiled before timing. Native distributions below.
                  </p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── Native tail latency — the receipts ─────────────────────────── */}
        <div className="mt-6 border border-primary/40">
          <div className="border-b border-primary/40 bg-primary/5 px-4 py-3">
            <p className="font-mono text-[9px] text-primary tracking-widest mb-1">
              NATIVE ENGINE · MEASURED, NOT AVERAGED
            </p>
            <h2 className="font-mono text-sm font-bold text-foreground">
              Tail Latency — p50 / p90 / p99 / p99.9
            </h2>
            <p className="font-mono text-[10px] text-muted-foreground mt-1 leading-relaxed max-w-3xl">
              A single throughput number hides the only thing that matters in a matching engine: the tail.
              These are per-operation latency distributions for the optimized engine (FastBook) against the
              std::map reference it is differentially fuzzed against — on real replayed order flow and on
              synthetic flow. Log-scale bars.
            </p>
          </div>

          <div className="p-4 space-y-4">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {NATIVE.flows.map((flow) => <PercentileLadder key={flow.key} flow={flow} />)}
            </div>

            {/* The bottleneck story */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <div className="border border-border p-4">
                <p className="font-mono text-[9px] text-primary tracking-widest mb-2">
                  WHAT THE TAIL REVEALED — v1 → v2, WITH RECEIPTS
                </p>
                <div className="font-mono text-[10px] text-muted-foreground leading-relaxed space-y-2">
                  <p>
                    v1&rsquo;s honest benchmark report flagged two problems its own average hid:
                    on the sparse LOBSTER book the best-level rescan walked long runs of empty price
                    ticks (a p99 tail <em>regression</em> vs the tree it was supposed to beat), and every
                    operation funneled through one shared <span className="text-foreground">std::unordered_map</span> ID
                    lookup.
                  </p>
                  <p>
                    v2 fixed exactly those two things and nothing else:
                    an <span className="text-foreground">occupancy bitmap</span> scans 64 price ticks per
                    machine instruction (find-first-set) instead of walking them, and an
                    open-addressed <span className="text-foreground">IdMap with linear probing and
                    backward-shift deletion</span> replaced the hash map.
                  </p>
                  <div className="border border-border/60 bg-muted/10 px-3 py-2 space-y-0.5 tabular-nums">
                    <p>LOBSTER p99&nbsp;&nbsp;&nbsp;<span className="text-muted-foreground/60">380 ns</span> → <span className="text-primary font-bold">330 ns</span></p>
                    <p>LOBSTER p99.9&nbsp;<span className="text-muted-foreground/60">751 ns</span> → <span className="text-primary font-bold">510 ns</span></p>
                    <p>throughput&nbsp;&nbsp;&nbsp;&nbsp;<span className="text-muted-foreground/60">10.7M</span> → <span className="text-primary font-bold">14.1M ops/s</span></p>
                    <p>p50&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;halved to <span className="text-primary font-bold">30 ns</span></p>
                  </div>
                  <p className="text-muted-foreground/70">
                    The v1 baseline is preserved in the repo (results/benchmarks_v1_baseline.csv) so the
                    before/after is checkable, not narrated.
                  </p>
                </div>
              </div>

              {/* Methodology */}
              <div className="border border-border p-4">
                <p className="font-mono text-[9px] text-primary tracking-widest mb-2">
                  MEASUREMENT METHODOLOGY
                </p>
                <ul className="font-mono text-[10px] text-muted-foreground leading-relaxed space-y-1.5">
                  <li>· AMD Ryzen 7 7730U (Windows 11) · clang++ (LLVM-MinGW) -O2</li>
                  <li>· Single thread pinned to one core; full warmup replay excluded from timing</li>
                  <li>· TSC-timed per operation — the ~5–10 ns rdtsc-pair cost is <span className="text-foreground">included</span> in every figure, not subtracted</li>
                  <li>· Median of 3 runs (min–max whiskers in the repo); identical op streams fed to both engines</li>
                  <li>· No GC or JIT to control for — native C++; the in-browser race above is a separate measurement with a discarded {N_WARMUP_OPS.toLocaleString()}-op JIT warmup pass per engine</li>
                  <li>· Correctness gated before speed: differential fuzz (25 seeds × 20k ops + a 200k-op session) asserting per-op equality of fills, returns, and book state — under ASan/UBSan in a gcc+clang CI matrix</li>
                  <li>· Full distributions, notebook, and PDF report in the repo below</li>
                </ul>
              </div>
            </div>
          </div>
        </div>

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
