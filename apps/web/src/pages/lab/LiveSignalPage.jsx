import React, { useState, useEffect, useMemo } from 'react';
import { Helmet } from 'react-helmet';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, ReferenceLine, Legend } from 'recharts';
import apiServerClient from '@/lib/apiServerClient.js';

// ── Math ──────────────────────────────────────────────────────────────────────

function computeSignal(spy, lookback) {
  const results = [];
  let cumSig = 1, cumBH = 1;
  for (let i = lookback; i < spy.length; i++) {
    let cum = 1;
    for (let j = i - lookback; j < i; j++) cum *= (1 + spy[j].ret);
    const isLong = cum > 1;
    const ret = spy[i].ret;
    const sigRet = isLong ? ret : 0;
    cumSig *= (1 + sigRet);
    cumBH  *= (1 + ret);
    results.push({ date: spy[i].date, signal: +cumSig.toFixed(4), buyHold: +cumBH.toFixed(4), sigRet, ret, isLong });
  }
  return results;
}

function computeStats(results) {
  const rets = results.map(r => r.sigRet);
  const n = rets.length;
  if (n < 3) return null;
  const mean  = rets.reduce((s, r) => s + r, 0) / n;
  const std   = Math.sqrt(rets.reduce((s, r) => s + (r - mean) ** 2, 0) / (n - 1));
  const sharpe = std > 0 ? (mean / std) * Math.sqrt(12) : 0;

  // Sortino (downside std only)
  const downRets = rets.filter(r => r < 0);
  const downStd = downRets.length > 1
    ? Math.sqrt(downRets.reduce((s, r) => s + r ** 2, 0) / downRets.length)
    : 0;
  const sortino = downStd > 0 ? (mean * 12) / (downStd * Math.sqrt(12)) : sharpe;

  let peak = 0, maxDD = 0;
  for (const r of results) {
    if (r.signal > peak) peak = r.signal;
    const dd = peak > 0 ? (peak - r.signal) / peak : 0;
    if (dd > maxDD) maxDD = dd;
  }

  const finalV = results[results.length - 1]?.signal ?? 1;
  const cagr   = Math.pow(finalV, 12 / n) - 1;
  const active = rets.filter(r => r !== 0);
  const winRate = active.length ? active.filter(r => r > 0).length / active.length : 0;

  return {
    cagr:    (cagr * 100).toFixed(1),
    sharpe:  sharpe.toFixed(2),
    sortino: sortino.toFixed(2),
    maxDD:   (maxDD * 100).toFixed(1),
    winRate: (winRate * 100).toFixed(0),
    annVol:  (std * Math.sqrt(12) * 100).toFixed(1),
    longPct: active.length ? ((active.length / n) * 100).toFixed(0) : '0',
    nMonths: n,
  };
}

// ── Component ─────────────────────────────────────────────────────────────────

const METRICS = [
  { key: 'cagr',    label: 'CAGR',          fmt: v => `${v}%`  },
  { key: 'sharpe',  label: 'SHARPE',         fmt: v => v        },
  { key: 'sortino', label: 'SORTINO',        fmt: v => v        },
  { key: 'maxDD',   label: 'MAX DD',         fmt: v => `-${v}%` },
  { key: 'winRate', label: 'WIN RATE',       fmt: v => `${v}%`  },
  { key: 'annVol',  label: 'ANN VOL',        fmt: v => `${v}%`  },
  { key: 'longPct', label: '% IN MARKET',   fmt: v => `${v}%`  },
  { key: 'nMonths', label: 'MONTHS',         fmt: v => v        },
];

const CustomTooltip = ({ active, payload }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-card border border-border p-2 font-mono text-[10px] space-y-0.5">
      <p className="text-muted-foreground mb-1">{payload[0]?.payload?.date}</p>
      {payload.map(p => (
        <p key={p.dataKey}>
          <span className="text-muted-foreground">{p.dataKey === 'signal' ? 'SIGNAL  ' : 'B&H     '}</span>
          <span style={{ color: p.color }}>{p.value?.toFixed(3)}</span>
        </p>
      ))}
    </div>
  );
};

export default function LiveSignalPage() {
  const [spyData, setSpyData]   = useState(null);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState(null);
  const [lookback, setLookback] = useState(3);

  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        const res  = await apiServerClient.fetch('/market-data/yf-monthly?tickers=SPY&months=60');
        const json = await res.json();
        if (json.data?.SPY?.length) setSpyData(json.data.SPY);
        else setError(json.errors?.SPY ?? 'No SPY data returned');
      } catch (e) { setError(e.message); }
      finally { setLoading(false); }
    })();
  }, []);

  const results = useMemo(() => spyData ? computeSignal(spyData, lookback) : null, [spyData, lookback]);
  const stats   = useMemo(() => results ? computeStats(results) : null, [results]);
  const current = results?.[results.length - 1];
  const startDate = results?.[0]?.date;

  return (
    <>
      <Helmet><title>DDF · LAB — Live Signal</title></Helmet>
      <div className="min-h-screen px-4 sm:px-6 lg:px-8 py-8">
        <div className="max-w-5xl mx-auto space-y-6">

          {/* Header */}
          <div className="border-b border-border pb-5">
            <p className="font-mono text-[9px] text-primary tracking-widest mb-1">DDF·LAB / LIVE SIGNAL</p>
            <h1 className="font-mono text-xl font-bold tracking-tight text-foreground">SPY Time-Series Momentum</h1>
            <p className="font-mono text-[10px] text-muted-foreground mt-1 max-w-xl leading-relaxed">
              Simple rule: go long SPY when its trailing {lookback}-month return is positive, hold cash otherwise.
              Rebalances monthly. Track record from {startDate ?? '···'} to {current?.date ?? '···'}.
            </p>
          </div>

          {loading && <p className="font-mono text-xs text-muted-foreground animate-pulse">FETCHING SPY DATA FROM ALPHA VANTAGE...</p>}
          {error   && <p className="font-mono text-xs text-destructive">ERROR: {error}</p>}

          {/* Signal state cards */}
          {!loading && current && stats && (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="border border-border p-4 bg-muted/10 sm:col-span-1">
                <p className="font-mono text-[9px] text-muted-foreground tracking-widest mb-2">CURRENT SIGNAL</p>
                <p className={`font-mono text-3xl font-bold ${current.isLong ? 'text-terminal-green' : 'text-muted-foreground'}`}>
                  {current.isLong ? 'LONG' : 'FLAT'}
                </p>
                <p className="font-mono text-[9px] text-muted-foreground mt-1">{current.date}</p>
              </div>
              {[
                { label: 'CAGR',   value: `${parseFloat(stats.cagr) >= 0 ? '+' : ''}${stats.cagr}%`, color: parseFloat(stats.cagr) >= 0 ? 'text-terminal-green' : 'text-destructive' },
                { label: 'SHARPE', value: stats.sharpe, color: parseFloat(stats.sharpe) >= 0.5 ? 'text-terminal-green' : 'text-foreground' },
                { label: 'MAX DD', value: `-${stats.maxDD}%`, color: 'text-destructive' },
              ].map(({ label, value, color }) => (
                <div key={label} className="border border-border p-4 bg-muted/10">
                  <p className="font-mono text-[9px] text-muted-foreground tracking-widest mb-2">{label}</p>
                  <p className={`font-mono text-2xl font-bold ${color}`}>{value}</p>
                </div>
              ))}
            </div>
          )}

          {/* Lookback selector */}
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-mono text-[9px] text-muted-foreground tracking-widest">LOOKBACK</span>
            {[1, 3, 6, 12].map(n => (
              <button key={n} onClick={() => setLookback(n)}
                className={`font-mono text-[10px] tracking-widest border px-3 py-1 transition-colors ${
                  lookback === n ? 'border-primary text-primary bg-primary/10' : 'border-border text-muted-foreground hover:border-primary/40'
                }`}>
                {n}M
              </button>
            ))}
          </div>

          {/* Equity curve */}
          {results && (
            <div className="border border-border">
              <div className="bg-muted/30 border-b border-border px-4 py-2 flex items-center justify-between">
                <span className="font-mono text-[9px] text-muted-foreground tracking-widest">EQUITY CURVE (INDEXED · 1.0 = STARTING VALUE)</span>
                <div className="flex items-center gap-4">
                  <span className="font-mono text-[9px] flex items-center gap-1.5 text-muted-foreground">
                    <span className="inline-block w-4 h-0.5" style={{ background: 'hsl(var(--primary))' }} /> SIGNAL
                  </span>
                  <span className="font-mono text-[9px] flex items-center gap-1.5 text-muted-foreground">
                    <span className="inline-block w-4 h-0.5 bg-muted-foreground opacity-60" /> BUY &amp; HOLD
                  </span>
                </div>
              </div>
              <div className="p-4">
                <ResponsiveContainer width="100%" height={260}>
                  <LineChart data={results} margin={{ top: 5, right: 10, left: -10, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" strokeOpacity={0.5} />
                    <XAxis dataKey="date" tick={{ fontSize: 8, fontFamily: 'monospace', fill: 'hsl(var(--muted-foreground))' }}
                      tickLine={false} interval={Math.floor(results.length / 7)} />
                    <YAxis tick={{ fontSize: 8, fontFamily: 'monospace', fill: 'hsl(var(--muted-foreground))' }}
                      tickLine={false} axisLine={false} tickFormatter={v => v.toFixed(2)} />
                    <Tooltip content={<CustomTooltip />} />
                    <ReferenceLine y={1} stroke="hsl(var(--border))" strokeDasharray="4 4" />
                    <Line type="monotone" dataKey="signal"  stroke="hsl(var(--primary))" strokeWidth={1.5} dot={false} />
                    <Line type="monotone" dataKey="buyHold" stroke="hsl(var(--muted-foreground))" strokeWidth={1} dot={false} strokeOpacity={0.6} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}

          {/* Full stats table */}
          {stats && (
            <div className="border border-border">
              <div className="bg-muted/30 border-b border-border px-4 py-2">
                <span className="font-mono text-[9px] text-muted-foreground tracking-widest">
                  PERFORMANCE · {lookback}M LOOKBACK · {stats.nMonths} MONTHS OF DATA
                </span>
              </div>
              <div className="grid grid-cols-4 sm:grid-cols-8">
                {METRICS.map(({ key, label, fmt }, i) => (
                  <div key={key} className={`px-3 py-3 ${i < METRICS.length - 1 ? 'border-r border-border' : ''}`}>
                    <p className="font-mono text-[8px] text-muted-foreground tracking-widest mb-1">{label}</p>
                    <p className="font-mono text-xs font-bold text-foreground">{fmt(stats[key])}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Methodology */}
          <div className="border border-border/40 p-4 bg-muted/5 space-y-2">
            <p className="font-mono text-[9px] text-muted-foreground tracking-widest">METHODOLOGY</p>
            <p className="font-mono text-[9px] text-muted-foreground/70 leading-relaxed">
              Each month, compute the trailing {lookback}-month total return of SPY. If positive: hold SPY next month.
              If negative: hold cash (0%). Monthly rebalancing assumed. No transaction costs, bid/ask spread, or taxes modeled.
              This is a simple time-series momentum rule — not a complete trading strategy. Past performance is not
              indicative of future results. Data: Yahoo Finance monthly adjusted close.
            </p>
          </div>

        </div>
      </div>
    </>
  );
}
