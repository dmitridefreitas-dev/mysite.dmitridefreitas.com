import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Helmet } from 'react-helmet';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ReferenceLine, ResponsiveContainer, Cell } from 'recharts';
import { Search, Clock, RefreshCw } from 'lucide-react';

const API_BASE = window.location.hostname === 'localhost'
  ? '/hcgi/api'
  : 'https://newsapi-xspv.onrender.com';

// ── Market hours (ET) ─────────────────────────────────────────────────────────────

function getLocalMarketStatus() {
  const et = new Date(new Date().toLocaleString('en-US', { timeZone: 'America/New_York' }));
  const day = et.getDay(), mins = et.getHours() * 60 + et.getMinutes();
  if (day === 0 || day === 6) return 'CLOSED';
  if (mins >= 9 * 60 + 30 && mins < 16 * 60) return 'OPEN';
  if (mins >= 4 * 60 && mins < 9 * 60 + 30) return 'PRE';
  return 'CLOSED';
}

function isCryptoSymbol(sym) {
  return sym.includes('-USD') || sym.includes('-USDT') || sym.includes('-BTC');
}

// ── Simulated LOB engine ──────────────────────────────────────────────────────────

function buildBook(mid, bid, ask) {
  const spread = Math.max(ask - bid, mid * 0.0001);
  const tick   = spread / 2;
  const bids = [], asks = [];
  for (let i = 0; i < 15; i++) {
    bids.push({ price: +(bid  - i * tick).toFixed(2), size: Math.round(Math.random() * 800 + 100) });
    asks.push({ price: +(ask  + i * tick).toFixed(2), size: Math.round(Math.random() * 800 + 100) });
  }
  return { bids, asks, mid };
}

function tickBook(book, newMid) {
  const shift = newMid !== undefined ? newMid - book.mid : 0;
  const bids = book.bids.map(b => ({
    price: +(b.price + shift).toFixed(2),
    size: Math.max(10, b.size + Math.round((Math.random() - 0.48) * 120)),
  }));
  const asks = book.asks.map(a => ({
    price: +(a.price + shift).toFixed(2),
    size: Math.max(10, a.size + Math.round((Math.random() - 0.48) * 120)),
  }));
  // Occasionally nudge mid
  let mid = newMid ?? book.mid;
  if (newMid === undefined && Math.random() < 0.08) {
    const d = (Math.random() > 0.5 ? 1 : -1) * mid * 0.0001;
    mid = +(mid + d).toFixed(4);
    bids.forEach(b => b.price = +(b.price + d).toFixed(4));
    asks.forEach(a => a.price = +(a.price + d).toFixed(4));
  }
  return { bids, asks, mid };
}

function applyMarketOrder(book, side, qty) {
  let rem = qty, fillPx = 0, fillQty = 0;
  const levels = side === 'BUY'
    ? [...book.asks].sort((a, b) => a.price - b.price)
    : [...book.bids].sort((a, b) => b.price - a.price);
  for (const lvl of levels) {
    if (rem <= 0) break;
    const take = Math.min(rem, lvl.size);
    fillPx += lvl.price * take; fillQty += take;
    lvl.size -= take; rem -= take;
  }
  const refill = (arr, sign) => arr.length < 12
    ? [...arr.filter(l => l.size > 0), { price: +(arr[arr.length - 1]?.price + sign * 0.01).toFixed(2), size: Math.round(Math.random() * 500 + 200) }]
    : arr.filter(l => l.size > 0);
  return {
    bids: side === 'SELL' ? refill([...book.bids].sort((a,b)=>b.price-a.price), -1) : book.bids,
    asks: side === 'BUY'  ? refill([...book.asks].sort((a,b)=>a.price-b.price),  1) : book.asks,
    mid: book.mid,
    fill: fillQty > 0 ? { side, qty: fillQty, price: +(fillPx / fillQty).toFixed(4) } : null,
  };
}

// ── Preset symbols ────────────────────────────────────────────────────────────────

const PRESETS = [
  { sym: 'SPY',    label: 'SPY'    },
  { sym: 'AAPL',   label: 'AAPL'   },
  { sym: 'NVDA',   label: 'NVDA'   },
  { sym: 'TSLA',   label: 'TSLA'   },
  { sym: 'BTC-USD',label: 'BTC'    },
  { sym: 'ETH-USD',label: 'ETH'    },
  { sym: 'SOL-USD',label: 'SOL'    },
];

// ── Tooltip ───────────────────────────────────────────────────────────────────────

const BookTooltip = ({ active, payload }) => {
  if (!active || !payload?.length) return null;
  const d = payload[0]?.payload;
  return (
    <div className="border border-border bg-background p-2 font-mono text-[10px]">
      <p className={d?.side === 'BID' ? 'text-green-500' : 'text-red-400'}>{d?.side} @ {d?.price}</p>
      <p>size: {typeof d?.size === 'number' ? d.size.toLocaleString() : d?.size}</p>
      <p className="text-muted-foreground">cum: {typeof d?.cum === 'number' ? d.cum.toLocaleString() : '—'}</p>
    </div>
  );
};

// ── Component ─────────────────────────────────────────────────────────────────────

export default function OrderBookPage() {
  const [inputVal, setInputVal]   = useState('');
  const [symbol, setSymbol]       = useState('SPY');
  const [quoteData, setQuoteData] = useState(null);
  const [book, setBook]           = useState(null);
  const [status, setStatus]       = useState('idle');   // idle | loading | live | error
  const [paused, setPaused]       = useState(false);
  const [orderSize, setOrderSize] = useState(500);
  const [trades, setTrades]       = useState([]);
  const [localMktStatus, setLocalMktStatus] = useState(getLocalMarketStatus());

  const tickRef   = useRef(null);
  const fetchRef  = useRef(null);
  const bookRef   = useRef(null);  // keep latest book accessible in interval
  bookRef.current = book;

  // Update local market clock every minute
  useEffect(() => {
    const id = setInterval(() => setLocalMktStatus(getLocalMarketStatus()), 60000);
    return () => clearInterval(id);
  }, []);

  // ── Fetch quote ───────────────────────────────────────────────────────────────

  const fetchQuote = useCallback(async (sym) => {
    try {
      const res = await fetch(`${API_BASE}/market-data/quote?symbol=${encodeURIComponent(sym)}`);
      if (!res.ok) throw new Error('non-200');
      const data = await res.json();
      setQuoteData(data);
      return data;
    } catch {
      return null;
    }
  }, []);

  // ── Load symbol ───────────────────────────────────────────────────────────────

  const loadSymbol = useCallback(async (sym) => {
    clearInterval(tickRef.current);
    clearInterval(fetchRef.current);
    setBook(null);
    setQuoteData(null);
    setTrades([]);
    setStatus('loading');

    const data = await fetchQuote(sym);
    if (!data || !data.price) { setStatus('error'); return; }

    const mid  = data.price;
    const bid  = data.bid  ?? +(mid * (1 - 0.0002)).toFixed(4);
    const ask  = data.ask  ?? +(mid * (1 + 0.0002)).toFixed(4);
    const initial = buildBook(mid, bid, ask);
    setBook(initial);
    setStatus('live');

    // Tick book visually every 600ms
    tickRef.current = setInterval(() => {
      if (paused) return;
      setBook(prev => prev ? tickBook(prev) : prev);
    }, 600);

    // Re-fetch real price every 8s to keep mid accurate
    fetchRef.current = setInterval(async () => {
      const fresh = await fetchQuote(sym);
      if (fresh?.price) {
        setQuoteData(fresh);
        setBook(prev => prev ? tickBook(prev, fresh.price) : prev);
      }
    }, 8000);
  }, [fetchQuote, paused]);

  // Initial load
  useEffect(() => { loadSymbol('SPY'); }, []);

  // Cleanup
  useEffect(() => () => { clearInterval(tickRef.current); clearInterval(fetchRef.current); }, []);

  // Pause/resume ticking
  useEffect(() => {
    clearInterval(tickRef.current);
    if (!paused && status === 'live') {
      tickRef.current = setInterval(() => {
        setBook(prev => prev ? tickBook(prev) : prev);
      }, 600);
    }
    return () => clearInterval(tickRef.current);
  }, [paused, status]);

  const handleSearch = (e) => {
    e.preventDefault();
    const s = inputVal.trim().toUpperCase();
    if (!s) return;
    setSymbol(s);
    setInputVal('');
    loadSymbol(s);
  };

  const handlePreset = (sym) => {
    setSymbol(sym);
    setInputVal('');
    loadSymbol(sym);
  };

  const submitOrder = useCallback((side) => {
    setBook(prev => {
      if (!prev) return prev;
      const result = applyMarketOrder(prev, side, orderSize);
      if (result.fill) setTrades(t => [result.fill, ...t].slice(0, 20));
      return { ...result, mid: prev.mid };
    });
  }, [orderSize]);

  // ── Derived values ────────────────────────────────────────────────────────────

  const bestBid = book ? Math.max(...book.bids.map(b => b.price)) : 0;
  const bestAsk = book ? Math.min(...book.asks.map(a => a.price)) : 0;
  const spread  = book ? +(bestAsk - bestBid).toFixed(4) : 0;
  const mid     = book?.mid ?? 0;
  const isCrypto = isCryptoSymbol(symbol);

  const mktState  = quoteData?.marketState ?? (isCrypto ? 'REGULAR' : localMktStatus);
  const isOpen    = mktState === 'REGULAR' || isCrypto;
  const isClosed  = !isOpen;

  const depthData = book ? (() => {
    const bids = [...book.bids].sort((a, b) => b.price - a.price).slice(0, 12);
    const asks = [...book.asks].sort((a, b) => a.price - b.price).slice(0, 12);
    let cb = 0, ca = 0;
    return [
      ...bids.map(b => ({ price: b.price, size: b.size, cum: (cb += b.size), side: 'BID' })).reverse(),
      ...asks.map(a => ({ price: a.price, size: a.size, cum: (ca += a.size), side: 'ASK' })),
    ];
  })() : [];

  const fmtPrice = (v) => v == null ? '—' : v >= 1000
    ? v.toLocaleString('en-US', { maximumFractionDigits: 2 })
    : v < 1 ? v.toFixed(6) : v.toFixed(2);

  return (
    <>
      <Helmet><title>DDF·LAB — Order Book</title></Helmet>

      <div className="min-h-screen px-4 sm:px-6 lg:px-8 py-8">
        <div className="max-w-6xl mx-auto">

          {/* Header */}
          <div className="mb-6 border-b border-border pb-4">
            <p className="font-mono text-[9px] text-primary tracking-widest mb-1">[5] ORDER BOOK</p>
            <h1 className="font-mono text-xl font-bold tracking-tight text-foreground">Live Limit Order Book</h1>
            <p className="font-mono text-[10px] text-muted-foreground mt-1">
              Real prices via Yahoo Finance · simulated depth · equities + crypto · search any ticker
            </p>
          </div>

          {/* Search + presets */}
          <div className="mb-5 space-y-3">
            <form onSubmit={handleSearch} className="flex gap-2">
              <div className="relative flex-1 max-w-sm">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                <input
                  type="text"
                  value={inputVal}
                  onChange={e => setInputVal(e.target.value.toUpperCase())}
                  placeholder="Search ticker… AAPL, BTC-USD, MSFT…"
                  className="w-full pl-9 pr-3 py-2 font-mono text-[10px] tracking-wider bg-background border border-border focus:border-primary focus:outline-none text-foreground placeholder:text-muted-foreground"
                />
              </div>
              <button type="submit"
                className="font-mono text-[10px] tracking-widest px-4 py-2 border border-primary text-primary hover:bg-primary hover:text-primary-foreground transition-colors">
                LOAD
              </button>
            </form>

            {/* Presets */}
            <div className="flex flex-wrap gap-1.5">
              {PRESETS.map(p => (
                <button key={p.sym} onClick={() => handlePreset(p.sym)}
                  className={`font-mono text-[9px] tracking-widest px-2.5 py-1 border transition-colors ${
                    symbol === p.sym
                      ? 'border-primary bg-primary/10 text-primary'
                      : 'border-border text-muted-foreground hover:border-primary hover:text-foreground'
                  }`}>
                  {p.label}
                </button>
              ))}
              <button onClick={() => { clearInterval(tickRef.current); clearInterval(fetchRef.current); loadSymbol(symbol); }}
                className="font-mono text-[9px] text-muted-foreground border border-border px-2 py-1 hover:border-primary transition-colors flex items-center gap-1">
                <RefreshCw className="h-2.5 w-2.5" /> REFRESH
              </button>
              <button onClick={() => setPaused(p => !p)}
                className={`font-mono text-[9px] px-2.5 py-1 border transition-colors ml-auto ${
                  paused ? 'border-primary text-primary' : 'border-border text-muted-foreground'
                }`}>
                {paused ? '▶ RESUME' : '⏸ PAUSE'}
              </button>
            </div>
          </div>

          {/* Market closed / extended hours banner */}
          {isClosed && quoteData && (
            <div className="mb-5 border border-yellow-500/40 bg-yellow-500/5 p-4">
              <div className="flex items-start gap-3">
                <Clock className="h-4 w-4 text-yellow-500 shrink-0 mt-0.5" />
                <div className="flex-1">
                  <p className="font-mono text-[11px] font-bold text-yellow-500 tracking-widest">
                    MARKET {mktState} — {quoteData.shortName ?? symbol}
                  </p>
                  <p className="font-mono text-[9px] text-muted-foreground mt-0.5">
                    Close ${fmtPrice(quoteData.price)} · Prev close ${fmtPrice(quoteData.previousClose)}
                    · Regular hours Mon–Fri 09:30–16:00 ET
                  </p>
                </div>
                <div className="text-right shrink-0">
                  <p className="font-mono text-sm font-bold text-foreground tabular-nums">${fmtPrice(quoteData.price)}</p>
                  <p className={`font-mono text-[9px] tabular-nums ${(quoteData.changePercent ?? 0) >= 0 ? 'text-green-500' : 'text-red-400'}`}>
                    {(quoteData.changePercent ?? 0) >= 0 ? '+' : ''}{(quoteData.changePercent ?? 0).toFixed(2)}%
                  </p>
                </div>
              </div>

              {/* After-hours / pre-market row */}
              {(() => {
                const isPost = mktState === 'POST' || mktState === 'POSTPOST';
                const isPre  = mktState === 'PRE'  || mktState === 'PREPRE';
                const ahPrice = isPost ? quoteData.postMarketPrice
                              : isPre  ? quoteData.preMarketPrice
                              : quoteData.postMarketPrice ?? quoteData.preMarketPrice;
                const ahChg   = isPost ? quoteData.postMarketChangePercent
                              : isPre  ? quoteData.preMarketChangePercent
                              : quoteData.postMarketChangePercent ?? quoteData.preMarketChangePercent;
                const ahTime  = isPost ? quoteData.postMarketTime
                              : isPre  ? quoteData.preMarketTime
                              : quoteData.postMarketTime ?? quoteData.preMarketTime;
                const label   = isPre ? 'PRE-MARKET' : 'AFTER-HOURS';

                if (!ahPrice) return null;

                const ahChgFromClose = ahPrice - (quoteData.price ?? 0);
                const ahTs = ahTime ? new Date(ahTime * 1000).toLocaleTimeString('en-US', {
                  hour: '2-digit', minute: '2-digit', timeZone: 'America/New_York',
                }) : null;

                return (
                  <div className="mt-3 pt-3 border-t border-yellow-500/20 flex items-center gap-4">
                    <span className="font-mono text-[8px] tracking-widest text-yellow-500/80 border border-yellow-500/30 px-1.5 py-0.5">
                      {label}
                    </span>
                    <span className="font-mono text-sm font-bold text-foreground tabular-nums">
                      ${fmtPrice(ahPrice)}
                    </span>
                    <span className={`font-mono text-[10px] tabular-nums font-bold ${ahChgFromClose >= 0 ? 'text-green-500' : 'text-red-400'}`}>
                      {ahChgFromClose >= 0 ? '+' : ''}{fmtPrice(Math.abs(ahChgFromClose))}
                      &nbsp;({ahChg != null ? `${ahChg >= 0 ? '+' : ''}${ahChg.toFixed(2)}%` : '—'})
                    </span>
                    {ahTs && (
                      <span className="font-mono text-[8px] text-muted-foreground ml-auto">
                        as of {ahTs} ET
                      </span>
                    )}
                  </div>
                );
              })()}
            </div>
          )}

          {/* Loading / error */}
          {status === 'loading' && (
            <div className="flex items-center justify-center h-48 border border-dashed border-border">
              <p className="font-mono text-[10px] text-muted-foreground">Fetching {symbol}…</p>
            </div>
          )}
          {status === 'error' && (
            <div className="flex items-center justify-center h-48 border border-dashed border-red-400/40">
              <p className="font-mono text-[10px] text-red-400">Could not load {symbol} — check the ticker and try again</p>
            </div>
          )}

          {status === 'live' && book && (
            <>
              {/* Quote bar */}
              {quoteData && (
                <div className="flex flex-wrap items-center gap-4 mb-4 p-3 border border-border bg-muted/10 font-mono text-[10px]">
                  <div>
                    <p className="text-[8px] text-muted-foreground">{quoteData.shortName ?? symbol}</p>
                    <p className="text-sm font-bold text-foreground tabular-nums">${fmtPrice(quoteData.price)}</p>
                  </div>
                  <div>
                    <p className="text-[8px] text-muted-foreground">CHANGE</p>
                    <p className={`tabular-nums font-bold ${(quoteData.changePercent ?? 0) >= 0 ? 'text-green-500' : 'text-red-400'}`}>
                      {(quoteData.changePercent ?? 0) >= 0 ? '+' : ''}{(quoteData.changePercent ?? 0).toFixed(2)}%
                    </p>
                  </div>
                  {quoteData.volume != null && (
                    <div>
                      <p className="text-[8px] text-muted-foreground">VOLUME</p>
                      <p className="tabular-nums text-foreground">{quoteData.volume.toLocaleString()}</p>
                    </div>
                  )}
                  {quoteData.fiftyTwoWeekHigh && (
                    <div>
                      <p className="text-[8px] text-muted-foreground">52W RANGE</p>
                      <p className="tabular-nums text-foreground">
                        ${fmtPrice(quoteData.fiftyTwoWeekLow)} – ${fmtPrice(quoteData.fiftyTwoWeekHigh)}
                      </p>
                    </div>
                  )}
                  {/* After-hours inline (shown even during regular session) */}
                  {!isCrypto && quoteData?.postMarketPrice && (
                    <div className="border-l border-border pl-4">
                      <p className="text-[8px] text-muted-foreground tracking-widest">AFTER-HRS</p>
                      <p className="tabular-nums font-bold text-foreground">${fmtPrice(quoteData.postMarketPrice)}</p>
                      <p className={`text-[9px] tabular-nums ${(quoteData.postMarketChangePercent ?? 0) >= 0 ? 'text-green-500' : 'text-red-400'}`}>
                        {(quoteData.postMarketChangePercent ?? 0) >= 0 ? '+' : ''}{(quoteData.postMarketChangePercent ?? 0).toFixed(2)}%
                      </p>
                    </div>
                  )}
                  {!isCrypto && quoteData?.preMarketPrice && !quoteData?.postMarketPrice && (
                    <div className="border-l border-border pl-4">
                      <p className="text-[8px] text-muted-foreground tracking-widest">PRE-MKT</p>
                      <p className="tabular-nums font-bold text-foreground">${fmtPrice(quoteData.preMarketPrice)}</p>
                      <p className={`text-[9px] tabular-nums ${(quoteData.preMarketChangePercent ?? 0) >= 0 ? 'text-green-500' : 'text-red-400'}`}>
                        {(quoteData.preMarketChangePercent ?? 0) >= 0 ? '+' : ''}{(quoteData.preMarketChangePercent ?? 0).toFixed(2)}%
                      </p>
                    </div>
                  )}
                  <div className="ml-auto flex items-center gap-2">
                    <Clock className="h-3 w-3 text-muted-foreground" />
                    <span className={`tracking-widest font-bold text-[9px] ${isOpen ? 'text-green-500' : 'text-yellow-500'}`}>
                      {isCrypto ? '24/7' : mktState}
                    </span>
                  </div>
                </div>
              )}

              {/* Status strip */}
              <div className="flex flex-wrap gap-4 mb-4 p-3 border border-border bg-muted/5 font-mono text-[10px]">
                {[
                  ['MID',      fmtPrice(mid),      'text-foreground font-bold'],
                  ['BEST BID', fmtPrice(bestBid),   'text-green-500 font-bold'],
                  ['BEST ASK', fmtPrice(bestAsk),   'text-red-400 font-bold'],
                  ['SPREAD',   String(spread),      'text-primary'],
                  ['BID DEPTH', book.bids.reduce((s,b)=>s+b.size,0).toLocaleString(), 'text-foreground'],
                  ['ASK DEPTH', book.asks.reduce((s,a)=>s+a.size,0).toLocaleString(), 'text-foreground'],
                ].map(([k, v, cls]) => (
                  <div key={k}>
                    <p className="text-[8px] text-muted-foreground">{k}</p>
                    <p className={`tabular-nums ${cls}`}>{v}</p>
                  </div>
                ))}
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

                {/* Book ladder */}
                <div className="border border-border overflow-hidden">
                  <div className="grid grid-cols-3 border-b border-border px-3 py-1.5 bg-muted/20">
                    {['PRICE', 'SIZE', 'TOTAL'].map(h => (
                      <span key={h} className={`font-mono text-[9px] text-muted-foreground ${h !== 'PRICE' ? 'text-right' : ''}`}>{h}</span>
                    ))}
                  </div>

                  {/* Asks — highest first */}
                  {[...book.asks].sort((a, b) => b.price - a.price).slice(0, 8).map((a, i) => {
                    const maxS = Math.max(...book.asks.map(x => x.size));
                    const cumAsk = book.asks.filter(x => x.price <= a.price).reduce((s, x) => s + x.size, 0);
                    return (
                      <div key={`a${i}`} className="relative grid grid-cols-3 px-3 py-0.5 border-b border-border/20">
                        <div className="absolute inset-0" style={{ width: `${(a.size/maxS)*45}%`, background: 'rgba(239,68,68,0.07)' }} />
                        <span className="font-mono text-[10px] text-red-400 tabular-nums relative z-10">{fmtPrice(a.price)}</span>
                        <span className="font-mono text-[10px] tabular-nums text-right relative z-10">{a.size.toLocaleString()}</span>
                        <span className="font-mono text-[9px] text-muted-foreground tabular-nums text-right relative z-10">{cumAsk.toLocaleString()}</span>
                      </div>
                    );
                  })}

                  {/* Spread row */}
                  <div className="grid grid-cols-3 px-3 py-1 bg-primary/5 border-y border-primary/20">
                    <span className="font-mono text-[9px] text-primary">SPREAD</span>
                    <span className="font-mono text-[9px] text-primary text-right tabular-nums">{spread}</span>
                    <span className="font-mono text-[8px] text-muted-foreground text-right">
                      {mid > 0 ? (spread / mid * 100).toFixed(4) : 0}%
                    </span>
                  </div>

                  {/* Bids — highest first */}
                  {[...book.bids].sort((a, b) => b.price - a.price).slice(0, 8).map((b, i) => {
                    const maxS = Math.max(...book.bids.map(x => x.size));
                    const cumBid = book.bids.filter(x => x.price >= b.price).reduce((s, x) => s + x.size, 0);
                    return (
                      <div key={`b${i}`} className="relative grid grid-cols-3 px-3 py-0.5 border-b border-border/20">
                        <div className="absolute inset-0" style={{ width: `${(b.size/maxS)*45}%`, background: 'rgba(34,197,94,0.07)' }} />
                        <span className="font-mono text-[10px] text-green-500 tabular-nums relative z-10">{fmtPrice(b.price)}</span>
                        <span className="font-mono text-[10px] tabular-nums text-right relative z-10">{b.size.toLocaleString()}</span>
                        <span className="font-mono text-[9px] text-muted-foreground tabular-nums text-right relative z-10">{cumBid.toLocaleString()}</span>
                      </div>
                    );
                  })}
                </div>

                {/* Right column */}
                <div className="lg:col-span-2 space-y-4">

                  {/* Depth chart */}
                  <div className="border border-border p-4">
                    <p className="font-mono text-[10px] tracking-widest text-foreground mb-3">MARKET DEPTH (cumulative)</p>
                    <ResponsiveContainer width="100%" height={200}>
                      <BarChart data={depthData} margin={{ top: 4, right: 8, bottom: 4, left: 32 }}>
                        <XAxis dataKey="price" tick={{ fontFamily: 'monospace', fontSize: 8 }}
                          tickFormatter={v => fmtPrice(v)} interval="preserveStartEnd" />
                        <YAxis tick={{ fontFamily: 'monospace', fontSize: 8 }}
                          tickFormatter={v => v >= 1000 ? `${(v/1000).toFixed(1)}k` : v} />
                        <Tooltip content={<BookTooltip />} />
                        <ReferenceLine x={mid} stroke="rgba(99,102,241,0.4)" strokeDasharray="4 4" />
                        <Bar dataKey="cum" maxBarSize={18}>
                          {depthData.map((d, i) => (
                            <Cell key={i} fill={d.side === 'BID' ? 'rgba(34,197,94,0.65)' : 'rgba(239,68,68,0.65)'} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>

                  {/* Order entry */}
                  <div className="border border-border p-4">
                    <p className="font-mono text-[10px] tracking-widest text-foreground mb-3">SUBMIT MARKET ORDER (simulated)</p>
                    <div className="mb-3">
                      <div className="flex justify-between mb-1">
                        <span className="font-mono text-[9px] text-muted-foreground">ORDER SIZE (units)</span>
                        <span className="font-mono text-[9px] text-primary tabular-nums">{orderSize.toLocaleString()}</span>
                      </div>
                      <input type="range" min={1} max={5000} step={1} value={orderSize}
                        onChange={e => setOrderSize(parseInt(e.target.value))}
                        className="w-full h-1 accent-primary" />
                    </div>
                    <div className="flex gap-3">
                      <button onClick={() => submitOrder('BUY')}
                        className="flex-1 font-mono text-[11px] tracking-widest py-2.5 border border-green-500 text-green-500 hover:bg-green-500 hover:text-black transition-colors">
                        ▲ MARKET BUY
                      </button>
                      <button onClick={() => submitOrder('SELL')}
                        className="flex-1 font-mono text-[11px] tracking-widest py-2.5 border border-red-400 text-red-400 hover:bg-red-400 hover:text-black transition-colors">
                        ▼ MARKET SELL
                      </button>
                    </div>
                    {book.fill && (
                      <div className="mt-2 p-2 border border-border bg-muted/20">
                        <p className="font-mono text-[9px] text-muted-foreground">
                          LAST FILL — {book.fill?.side} {book.fill?.qty?.toLocaleString()} @ ${book.fill?.price}
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Trade log */}
                  {trades.length > 0 && (
                    <div className="border border-border p-4">
                      <p className="font-mono text-[10px] tracking-widest text-foreground mb-2">TRADE LOG</p>
                      <div className="space-y-1 max-h-28 overflow-y-auto">
                        {trades.map((t, i) => (
                          <div key={i} className="flex justify-between font-mono text-[9px]">
                            <span className={t.side === 'BUY' ? 'text-green-500' : 'text-red-400'}>{t.side}</span>
                            <span className="text-foreground tabular-nums">{t.qty.toLocaleString()}</span>
                            <span className="text-primary tabular-nums">@ {t.price}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  <p className="font-mono text-[8px] text-muted-foreground">
                    PRICES: Yahoo Finance (15-min delayed for equities, near-real-time for crypto) · DEPTH: simulated around real bid/ask · Re-fetches every 8s
                  </p>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </>
  );
}
