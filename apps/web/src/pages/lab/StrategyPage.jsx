import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Helmet } from 'react-helmet';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, ReferenceLine } from 'recharts';
import apiServerClient from '@/lib/apiServerClient.js';

// ── Math ──────────────────────────────────────────────────────────────────────

function alignDates(data) {
  const tickers = Object.keys(data);
  if (!tickers.length) return { dates: [], series: {} };
  const sets = tickers.map(t => new Set(data[t].map(r => r.date)));
  const common = data[tickers[0]].map(r => r.date).filter(d => sets.every(s => s.has(d)));
  const series = {};
  for (const t of tickers) {
    const map = Object.fromEntries(data[t].map(r => [r.date, r.ret]));
    series[t] = common.map(d => ({ date: d, ret: map[d] ?? 0 }));
  }
  return { dates: common, series };
}

function computeStrategy(data, lookback, skipMonths, topN) {
  const tickers = Object.keys(data);
  const { dates, series } = alignDates(data);
  if (dates.length < lookback + skipMonths + 2) return [];

  const results = [];
  let cumPort = 1, cumSPY = 1;
  const minIdx = lookback + skipMonths;

  for (let i = minIdx; i < dates.length; i++) {
    const scores = {};
    for (const t of tickers) {
      const startIdx = i - lookback - skipMonths;
      const endIdx   = i - skipMonths - 1;
      if (startIdx < 0 || endIdx < startIdx) continue;
      let cum = 1;
      for (let j = startIdx; j <= endIdx; j++) cum *= (1 + series[t][j].ret);
      scores[t] = cum - 1;
    }
    if (Object.keys(scores).length < tickers.length) continue;

    const ranked   = Object.entries(scores).sort((a, b) => b[1] - a[1]);
    const selected = ranked.slice(0, topN).map(([t]) => t);

    let portRet = 0, cnt = 0;
    for (const t of selected) {
      portRet += series[t][i]?.ret ?? 0;
      cnt++;
    }
    if (cnt) portRet /= cnt;

    const spyRet = series['SPY']?.[i]?.ret ?? 0;
    cumPort *= (1 + portRet);
    cumSPY  *= (1 + spyRet);

    results.push({
      date: dates[i],
      port: +cumPort.toFixed(4),
      spy:  +cumSPY.toFixed(4),
      portRet,
      spyRet,
      selected: selected.join(' / '),
      topScore: +ranked[0][1].toFixed(3),
      botScore: +ranked[ranked.length - 1][1].toFixed(3),
    });
  }
  return results;
}

function computeStats(results, retKey = 'portRet') {
  const rets = results.map(r => r[retKey]);
  const n = rets.length;
  if (n < 3) return null;
  const mean = rets.reduce((s, r) => s + r, 0) / n;
  const std  = Math.sqrt(rets.reduce((s, r) => s + (r - mean) ** 2, 0) / (n - 1));
  const sharpe = std > 0 ? (mean / std) * Math.sqrt(12) : 0;

  const cumKey = retKey === 'portRet' ? 'port' : 'spy';
  let peak = 0, maxDD = 0;
  for (const r of results) {
    if (r[cumKey] > peak) peak = r[cumKey];
    const dd = peak > 0 ? (peak - r[cumKey]) / peak : 0;
    if (dd > maxDD) maxDD = dd;
  }

  const finalV = results[results.length - 1]?.[cumKey] ?? 1;
  const cagr   = Math.pow(finalV, 12 / n) - 1;
  const winRate = rets.filter(r => r > 0).length / n;

  return {
    cagr:    (cagr * 100).toFixed(1),
    sharpe:  sharpe.toFixed(2),
    maxDD:   (maxDD * 100).toFixed(1),
    winRate: (winRate * 100).toFixed(0),
    annVol:  (std * Math.sqrt(12) * 100).toFixed(1),
  };
}

// ── Custom tooltip ────────────────────────────────────────────────────────────

const CustomTooltip = ({ active, payload }) => {
  if (!active || !payload?.length) return null;
  const d = payload[0]?.payload;
  return (
    <div className="bg-card border border-border p-2 font-mono text-[10px] space-y-0.5">
      <p className="text-muted-foreground mb-1">{d?.date}</p>
      {payload.map(p => (
        <p key={p.dataKey}>
          <span className="text-muted-foreground">{p.dataKey === 'port' ? 'STRAT   ' : p.dataKey === 'portNoSkip' ? 'NO-SKIP ' : 'SPY B&H '}</span>
          <span style={{ color: p.color }}>{p.value?.toFixed(3)}</span>
        </p>
      ))}
      {d?.selected && <p className="text-muted-foreground mt-1 pt-1 border-t border-border/50">HELD: {d.selected}</p>}
    </div>
  );
};

// ── Page ──────────────────────────────────────────────────────────────────────

const TICKERS  = ['SPY', 'GLD', 'TLT'];
const TICKER_LABELS = { SPY: 'US Stocks', GLD: 'Gold', TLT: 'Long Bonds' };

export default function StrategyPage() {
  const [rawData, setRawData]   = useState(null);
  const [loading, setLoading]   = useState(false);
  const [error,   setError]     = useState(null);
  const [lookback,  setLookback]  = useState(12);
  const [topN,      setTopN]      = useState(1);
  const [skipMonths,setSkipMonths]= useState(1);

  const load = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const res  = await apiServerClient.fetch(`/market-data/yf-monthly?tickers=${TICKERS.join(',')}&months=72`);
      const json = await res.json();
      const failed = Object.keys(json.errors || {});
      if (failed.length && failed.length >= TICKERS.length) throw new Error(`Failed: ${failed.join(', ')}`);
      setRawData(json.data || {});
    } catch (e) { setError(e.message); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  // Strategy with skip (the "correct" version)
  const resultsSkip = useMemo(() => {
    if (!rawData) return null;
    return computeStrategy(rawData, lookback, skipMonths, topN);
  }, [rawData, lookback, skipMonths, topN]);

  // Strategy without skip (the "naive" version — shows reversal effect)
  const resultsNoSkip = useMemo(() => {
    if (!rawData) return null;
    return computeStrategy(rawData, lookback, 0, topN);
  }, [rawData, lookback, topN]);

  // Merge for chart overlay
  const chartData = useMemo(() => {
    if (!resultsSkip || !resultsNoSkip) return null;
    const noSkipMap = Object.fromEntries(resultsNoSkip.map(r => [r.date, r.port]));
    return resultsSkip.map(r => ({
      ...r,
      portNoSkip: noSkipMap[r.date] ?? null,
    }));
  }, [resultsSkip, resultsNoSkip]);

  const statsSkip   = useMemo(() => resultsSkip   ? computeStats(resultsSkip)   : null, [resultsSkip]);
  const statsNoSkip = useMemo(() => resultsNoSkip ? computeStats(resultsNoSkip) : null, [resultsNoSkip]);
  const statsSPY    = useMemo(() => resultsSkip   ? computeStats(resultsSkip, 'spyRet') : null, [resultsSkip]);

  return (
    <>
      <Helmet><title>DDF · LAB — Strategy Research</title></Helmet>
      <div className="min-h-screen px-4 sm:px-6 lg:px-8 py-8">
        <div className="max-w-6xl mx-auto space-y-6">

          {/* Header */}
          <div className="border-b border-border pb-5">
            <p className="font-mono text-[9px] text-primary tracking-widest mb-1">DDF·LAB / STRATEGY RESEARCH</p>
            <h1 className="font-mono text-xl font-bold tracking-tight text-foreground">Cross-Asset Momentum</h1>
            <p className="font-mono text-[10px] text-muted-foreground mt-1 max-w-2xl leading-relaxed">
              Each month, rank SPY, GLD, and TLT by their trailing {lookback}-month return (skipping the most recent {skipMonths} month{skipMonths !== 1 ? 's' : ''}
              to avoid the short-term reversal effect). Hold the top {topN} asset{topN > 1 ? 's' : ''} equally weighted.
              Compare against the naive version without the skip — the gap is the reversal effect.
            </p>
          </div>

          {/* Controls */}
          <div className="border border-border p-4 grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <p className="font-mono text-[9px] text-muted-foreground tracking-widest mb-2">LOOKBACK WINDOW</p>
              <div className="flex gap-2">
                {[3, 6, 9, 12].map(n => (
                  <button key={n} onClick={() => setLookback(n)}
                    className={`font-mono text-[10px] tracking-widest border px-3 py-1 transition-colors ${
                      lookback === n ? 'border-primary text-primary bg-primary/10' : 'border-border text-muted-foreground hover:border-primary/40'
                    }`}>
                    {n}M
                  </button>
                ))}
              </div>
            </div>
            <div>
              <p className="font-mono text-[9px] text-muted-foreground tracking-widest mb-2">SKIP RECENT (REVERSAL GUARD)</p>
              <div className="flex gap-2">
                {[0, 1, 2].map(n => (
                  <button key={n} onClick={() => setSkipMonths(n)}
                    className={`font-mono text-[10px] tracking-widest border px-3 py-1 transition-colors ${
                      skipMonths === n ? 'border-primary text-primary bg-primary/10' : 'border-border text-muted-foreground hover:border-primary/40'
                    }`}>
                    {n}M
                  </button>
                ))}
              </div>
            </div>
            <div>
              <p className="font-mono text-[9px] text-muted-foreground tracking-widest mb-2">TOP N ASSETS</p>
              <div className="flex gap-2">
                {[1, 2, 3].map(n => (
                  <button key={n} onClick={() => setTopN(n)}
                    className={`font-mono text-[10px] tracking-widest border px-3 py-1 transition-colors ${
                      topN === n ? 'border-primary text-primary bg-primary/10' : 'border-border text-muted-foreground hover:border-primary/40'
                    }`}>
                    {n}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {loading && <p className="font-mono text-xs text-muted-foreground animate-pulse">FETCHING SPY · GLD · TLT DATA FROM ALPHA VANTAGE...</p>}
          {error   && <p className="font-mono text-xs text-destructive">ERROR: {error}</p>}

          {/* Equity curve */}
          {chartData && (
            <div className="border border-border">
              <div className="bg-muted/30 border-b border-border px-4 py-2 flex items-center justify-between flex-wrap gap-2">
                <span className="font-mono text-[9px] text-muted-foreground tracking-widest">EQUITY CURVE (INDEXED · 1.0)</span>
                <div className="flex items-center gap-4">
                  {[
                    { key: 'port',       label: `${lookback}-${skipMonths} MOM`,  color: 'hsl(var(--primary))' },
                    { key: 'portNoSkip', label: `${lookback}-0 MOM (NO SKIP)`,   color: '#f97316' },
                    { key: 'spy',        label: 'SPY B&H',                        color: 'hsl(var(--muted-foreground))' },
                  ].map(({ key, label, color }) => (
                    <span key={key} className="font-mono text-[9px] flex items-center gap-1.5 text-muted-foreground">
                      <span className="inline-block w-4 h-0.5" style={{ background: color }} />
                      {label}
                    </span>
                  ))}
                </div>
              </div>
              <div className="p-4">
                <ResponsiveContainer width="100%" height={280}>
                  <LineChart data={chartData} margin={{ top: 5, right: 10, left: -10, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" strokeOpacity={0.5} />
                    <XAxis dataKey="date" tick={{ fontSize: 8, fontFamily: 'monospace', fill: 'hsl(var(--muted-foreground))' }}
                      tickLine={false} interval={Math.floor(chartData.length / 7)} />
                    <YAxis tick={{ fontSize: 8, fontFamily: 'monospace', fill: 'hsl(var(--muted-foreground))' }}
                      tickLine={false} axisLine={false} tickFormatter={v => v.toFixed(2)} />
                    <Tooltip content={<CustomTooltip />} />
                    <ReferenceLine y={1} stroke="hsl(var(--border))" strokeDasharray="4 4" />
                    <Line type="monotone" dataKey="port"       stroke="hsl(var(--primary))"          strokeWidth={2}   dot={false} />
                    <Line type="monotone" dataKey="portNoSkip" stroke="#f97316"                       strokeWidth={1.5} dot={false} strokeOpacity={0.8} />
                    <Line type="monotone" dataKey="spy"        stroke="hsl(var(--muted-foreground))"  strokeWidth={1}   dot={false} strokeOpacity={0.5} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}

          {/* Stats comparison table */}
          {statsSkip && statsNoSkip && statsSPY && (
            <div className="border border-border">
              <div className="bg-muted/30 border-b border-border px-4 py-2">
                <span className="font-mono text-[9px] text-muted-foreground tracking-widest">STRATEGY COMPARISON</span>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full font-mono text-[10px]">
                  <thead>
                    <tr className="border-b border-border">
                      <th className="text-left px-4 py-2 text-muted-foreground font-normal tracking-widest text-[9px]">METRIC</th>
                      <th className="text-right px-4 py-2 text-primary tracking-widest text-[9px] font-normal">{lookback}-{skipMonths} MOM ✓</th>
                      <th className="text-right px-4 py-2 text-[#f97316] tracking-widest text-[9px] font-normal">{lookback}-0 MOM ✗</th>
                      <th className="text-right px-4 py-2 text-muted-foreground tracking-widest text-[9px] font-normal">SPY B&amp;H</th>
                    </tr>
                  </thead>
                  <tbody>
                    {[
                      { key: 'cagr',    label: 'CAGR',       fmt: v => `${v}%`  },
                      { key: 'sharpe',  label: 'SHARPE',     fmt: v => v        },
                      { key: 'maxDD',   label: 'MAX DD',     fmt: v => `-${v}%` },
                      { key: 'winRate', label: 'WIN RATE',   fmt: v => `${v}%`  },
                      { key: 'annVol',  label: 'ANN VOL',    fmt: v => `${v}%`  },
                    ].map(({ key, label, fmt }) => (
                      <tr key={key} className="border-b border-border/40 last:border-0">
                        <td className="px-4 py-2 text-muted-foreground tracking-widest text-[9px]">{label}</td>
                        <td className="px-4 py-2 text-right text-foreground font-bold">{fmt(statsSkip[key])}</td>
                        <td className="px-4 py-2 text-right text-muted-foreground">{fmt(statsNoSkip[key])}</td>
                        <td className="px-4 py-2 text-right text-muted-foreground">{fmt(statsSPY[key])}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Universe + hypothesis */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="border border-border p-4 bg-muted/5">
              <p className="font-mono text-[9px] text-muted-foreground tracking-widest mb-3">UNIVERSE</p>
              {TICKERS.map(t => (
                <div key={t} className="flex items-center justify-between mb-1.5">
                  <span className="font-mono text-[10px] text-primary">{t}</span>
                  <span className="font-mono text-[10px] text-muted-foreground">{TICKER_LABELS[t]}</span>
                </div>
              ))}
            </div>
            <div className="border border-border p-4 bg-muted/5">
              <p className="font-mono text-[9px] text-muted-foreground tracking-widest mb-3">WHY THE SKIP MATTERS</p>
              <p className="font-mono text-[9px] text-muted-foreground/80 leading-relaxed">
                The most recent month of returns carries a short-term reversal effect — assets that rallied sharply
                often give back gains in the immediate next period. Skipping 1 month of the lookback (the "12-1"
                convention in cross-sectional momentum) removes this contamination. The orange line above shows
                what happens without the skip: lower Sharpe, deeper drawdowns.
              </p>
            </div>
          </div>

          <p className="font-mono text-[9px] text-muted-foreground/40">
            MONTHLY ADJUSTED CLOSE · ALPHA VANTAGE · LONG-ONLY · NO TRANSACTION COSTS · NOT INVESTMENT ADVICE
          </p>

        </div>
      </div>
    </>
  );
}
