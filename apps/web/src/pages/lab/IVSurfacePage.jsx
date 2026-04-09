import React, { useState, useCallback } from 'react';
import { Helmet } from 'react-helmet';
import {
  ScatterChart, Scatter, XAxis, YAxis, Tooltip,
  CartesianGrid, ResponsiveContainer, Legend, ReferenceLine,
  LineChart, Line,
} from 'recharts';

const API_BASE = window.location.hostname === 'localhost'
  ? '/hcgi/api'
  : 'https://newsapi-xspv.onrender.com';

// ── Colour scheme per expiry ──────────────────────────────────────────────────
const COLORS = ['#22c55e','#6366f1','#f97316','#06b6d4','#ec4899','#a855f7','#eab308','#ef4444'];

// ── IV → background colour for heatmap cells ─────────────────────────────────
function ivBg(iv) {
  // iv is 0–1 (e.g. 0.20 = 20 %)
  const t = Math.min(iv / 0.6, 1);
  if (t < 0.33) {
    const s = t / 0.33;
    return `hsl(${Math.round(200 - s * 60)},65%,38%)`;
  } else if (t < 0.67) {
    const s = (t - 0.33) / 0.34;
    return `hsl(${Math.round(140 - s * 110)},65%,38%)`;
  } else {
    const s = (t - 0.67) / 0.33;
    return `hsl(${Math.round(30 - s * 30)},75%,${Math.round(38 - s * 6)}%)`;
  }
}

// ── Custom tooltip ─────────────────────────────────────────────────────────────
const SmileTooltip = ({ active, payload }) => {
  if (!active || !payload?.length) return null;
  const d = payload[0]?.payload;
  if (!d) return null;
  return (
    <div className="bg-card border border-border p-2 font-mono text-[10px] space-y-0.5">
      <p className="text-muted-foreground">Moneyness: {d.x.toFixed(1)}%</p>
      <p>IV: <span style={{ color: payload[0].fill }}>{d.y.toFixed(2)}%</span></p>
      {d.type && <p className="text-muted-foreground/60">{d.type.toUpperCase()}</p>}
    </div>
  );
};

const TermTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-card border border-border p-2 font-mono text-[10px]">
      <p className="text-muted-foreground">{label} DTE</p>
      <p>ATM IV: <span className="text-primary">{payload[0]?.value?.toFixed(2)}%</span></p>
    </div>
  );
};

// ── Helpers ───────────────────────────────────────────────────────────────────
function computeSmileData(surface, spot) {
  return surface.map(exp => ({
    label: `${exp.dte}d`,
    expiry: exp.expiry,
    dte: exp.dte,
    data: exp.strikes
      .map(s => ({
        x: +(s.strike / spot * 100).toFixed(2),
        y: +(s.iv * 100).toFixed(3),
        type: s.type,
      }))
      .filter(s => s.x >= 75 && s.x <= 130)
      .sort((a, b) => a.x - b.x),
  }));
}

function atmIV(strikes, spot) {
  if (!strikes.length) return null;
  const sorted = [...strikes].sort((a, b) => Math.abs(a.strike - spot) - Math.abs(b.strike - spot));
  return sorted[0]?.iv ?? null;
}

function skewIV(strikes, spot, pct) {
  // Find IV closest to given moneyness %
  const target = spot * pct;
  const sorted = [...strikes].sort((a, b) => Math.abs(a.strike - target) - Math.abs(b.strike - target));
  return sorted[0]?.iv ?? null;
}

// ── Heatmap ───────────────────────────────────────────────────────────────────
function IVHeatmap({ surface, spot }) {
  // Build moneyness buckets: 80, 85, 90, 95, 100, 105, 110, 115, 120
  const buckets = [0.80, 0.85, 0.90, 0.95, 1.00, 1.05, 1.10, 1.15, 1.20];

  function getIV(strikes, pct) {
    const target = spot * pct;
    const nearby = strikes
      .filter(s => Math.abs(s.strike / target - 1) < 0.04)
      .sort((a, b) => Math.abs(a.strike - target) - Math.abs(b.strike - target));
    return nearby[0]?.iv ?? null;
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full font-mono text-[9px] border-collapse">
        <thead>
          <tr>
            <th className="text-left text-muted-foreground px-2 py-1 border border-border">EXPIRY / DTE</th>
            {buckets.map(b => (
              <th key={b} className={`text-center px-1.5 py-1 border border-border ${b === 1.00 ? 'text-primary' : 'text-muted-foreground'}`}>
                {b === 1.00 ? 'ATM' : `${Math.round(b * 100)}%`}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {surface.map(exp => (
            <tr key={exp.expiry}>
              <td className="text-muted-foreground px-2 py-1 border border-border whitespace-nowrap">
                {exp.expiry} <span className="opacity-50">({exp.dte}d)</span>
              </td>
              {buckets.map(b => {
                const iv = getIV(exp.strikes, b);
                return (
                  <td
                    key={b}
                    className="text-center px-1.5 py-1 border border-border"
                    style={iv != null ? { backgroundColor: ivBg(iv), color: '#fff' } : {}}
                  >
                    {iv != null ? (iv * 100).toFixed(1) + '%' : '—'}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────
export default function IVSurfacePage() {
  const [ticker,  setTicker]  = useState('QQQ');
  const [status,  setStatus]  = useState('idle');
  const [errorMsg,setErrorMsg]= useState('');
  const [result,  setResult]  = useState(null);

  const run = useCallback(async () => {
    const t = ticker.trim().toUpperCase();
    if (!t) { setErrorMsg('Enter a ticker.'); setStatus('error'); return; }
    setStatus('loading'); setErrorMsg('');
    try {
      const res  = await fetch(`${API_BASE}/market-data/options?ticker=${t}`);
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Failed to fetch options data.');
      if (!json.surface?.length) throw new Error('No options chain data returned.');
      setResult(json);
      setStatus('done');
    } catch (err) {
      setErrorMsg(err.message);
      setStatus('error');
    }
  }, [ticker]);

  const smileData  = result ? computeSmileData(result.surface, result.spot) : [];

  const termData = result
    ? result.surface.map(exp => ({
        dte: exp.dte,
        atm: +(( atmIV(exp.strikes, result.spot) ?? 0) * 100).toFixed(2),
      })).sort((a, b) => a.dte - b.dte)
    : [];

  // Skew metrics for nearest expiry with enough data
  const nearExp   = result?.surface?.find(e => e.dte >= 7);
  const skew25    = nearExp ? (skewIV(nearExp.strikes, result.spot, 0.95) ?? 0) - (skewIV(nearExp.strikes, result.spot, 1.05) ?? 0) : null;
  const atmNear   = nearExp ? atmIV(nearExp.strikes, result.spot) : null;

  return (
    <>
      <Helmet><title>DDF·LAB — IV Surface</title></Helmet>

      <div className="min-h-screen px-4 sm:px-6 lg:px-8 py-8">
        <div className="max-w-6xl mx-auto">

          {/* Header */}
          <div className="mb-6 border-b border-border pb-4">
            <p className="font-mono text-[9px] text-primary tracking-widest mb-1">[V] IV SURFACE</p>
            <h1 className="font-mono text-xl font-bold tracking-tight text-foreground">Implied Volatility Surface</h1>
            <p className="font-mono text-[10px] text-muted-foreground mt-1">
              Vol smile per expiry · ATM term structure · 25Δ skew · OTM put/call IV across the chain
            </p>
          </div>

          {/* Controls */}
          <div className="border border-border p-4 mb-6">
            <div className="flex flex-wrap gap-4 items-end">
              <div>
                <label className="font-mono text-[9px] text-muted-foreground tracking-widest block mb-1">TICKER</label>
                <input
                  value={ticker}
                  onChange={e => setTicker(e.target.value.toUpperCase())}
                  onKeyDown={e => e.key === 'Enter' && run()}
                  className="w-28 bg-background border border-border font-mono text-xs px-3 py-2 text-foreground focus:outline-none focus:border-primary uppercase"
                  placeholder="QQQ"
                  maxLength={8}
                />
              </div>
              <button
                onClick={run}
                disabled={status === 'loading'}
                className="px-6 py-2 border border-primary font-mono text-[10px] tracking-widest text-primary hover:bg-primary hover:text-primary-foreground transition-colors disabled:opacity-50"
              >
                {status === 'loading' ? 'FETCHING...' : '[LOAD →]'}
              </button>
            </div>
            <p className="font-mono text-[9px] text-muted-foreground/60 mt-3">
              · Up to 8 expirations · OTM puts for K &lt; spot, OTM calls for K ≥ spot · IV from Yahoo Finance
            </p>
            {status === 'error' && (
              <p className="font-mono text-[10px] text-destructive mt-2">ERROR: {errorMsg}</p>
            )}
          </div>

          {status === 'idle' && (
            <div className="border border-border p-8 text-center space-y-2">
              <p className="font-mono text-[10px] text-muted-foreground">Enter a ticker with listed options to visualize the IV surface.</p>
              <p className="font-mono text-[9px] text-muted-foreground/50">Try: QQQ · SPY · IWM · AAPL · TSLA · NVDA</p>
            </div>
          )}

          {status === 'loading' && (
            <div className="border border-border p-8 text-center">
              <p className="font-mono text-[10px] text-muted-foreground animate-pulse">FETCHING OPTIONS CHAIN...</p>
            </div>
          )}

          {status === 'done' && result && (
            <div className="space-y-6">

              {/* Key metrics */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {[
                  ['TICKER',       result.ticker],
                  ['SPOT',         `$${result.spot?.toFixed(2) ?? '—'}`],
                  ['EXPIRATIONS',  result.surface.length],
                  ['ATM IV (NEAR)', atmNear != null ? (atmNear * 100).toFixed(1) + '%' : '—'],
                ].map(([k, v]) => (
                  <div key={k} className="border border-border px-3 py-2">
                    <p className="font-mono text-[8px] text-muted-foreground tracking-widest">{k}</p>
                    <p className="font-mono text-sm font-bold text-primary mt-0.5">{v}</p>
                  </div>
                ))}
              </div>

              {/* Skew stats */}
              {nearExp && (
                <div className="border border-border p-3 grid grid-cols-2 sm:grid-cols-4 gap-4">
                  <div>
                    <p className="font-mono text-[8px] text-muted-foreground tracking-widest">NEAREST EXPIRY</p>
                    <p className="font-mono text-xs font-bold text-foreground mt-0.5">{nearExp.expiry} ({nearExp.dte}d)</p>
                  </div>
                  <div>
                    <p className="font-mono text-[8px] text-muted-foreground tracking-widest">25Δ SKEW (95/105)</p>
                    <p className={`font-mono text-xs font-bold mt-0.5 ${skew25 != null && skew25 > 0 ? 'text-primary' : 'text-foreground'}`}>
                      {skew25 != null ? (skew25 > 0 ? '+' : '') + (skew25 * 100).toFixed(2) + ' vols' : '—'}
                    </p>
                  </div>
                  <div>
                    <p className="font-mono text-[8px] text-muted-foreground tracking-widest">95% PUT IV</p>
                    <p className="font-mono text-xs font-bold text-foreground mt-0.5">
                      {skewIV(nearExp.strikes, result.spot, 0.95) != null
                        ? (skewIV(nearExp.strikes, result.spot, 0.95) * 100).toFixed(2) + '%' : '—'}
                    </p>
                  </div>
                  <div>
                    <p className="font-mono text-[8px] text-muted-foreground tracking-widest">105% CALL IV</p>
                    <p className="font-mono text-xs font-bold text-foreground mt-0.5">
                      {skewIV(nearExp.strikes, result.spot, 1.05) != null
                        ? (skewIV(nearExp.strikes, result.spot, 1.05) * 100).toFixed(2) + '%' : '—'}
                    </p>
                  </div>
                </div>
              )}

              {/* Vol smile chart */}
              <div className="border border-border p-4">
                <p className="font-mono text-[9px] text-muted-foreground tracking-widest mb-1">VOLATILITY SMILE</p>
                <p className="font-mono text-[8px] text-muted-foreground/60 mb-3">
                  {result.ticker} · X = strike / spot · Y = implied volatility %
                </p>
                <ResponsiveContainer width="100%" height={320}>
                  <ScatterChart margin={{ top: 10, right: 20, bottom: 20, left: 10 }}>
                    <CartesianGrid strokeDasharray="2 4" stroke="hsl(var(--border))" opacity={0.4} />
                    <XAxis
                      dataKey="x"
                      type="number"
                      name="Moneyness"
                      domain={[80, 125]}
                      tick={{ fontFamily: 'IBM Plex Mono', fontSize: 9 }}
                      tickFormatter={v => v + '%'}
                      label={{ value: 'MONEYNESS (%)', position: 'insideBottom', offset: -12, fontFamily: 'IBM Plex Mono', fontSize: 8, fill: 'hsl(var(--muted-foreground))' }}
                    />
                    <YAxis
                      dataKey="y"
                      type="number"
                      name="IV"
                      tick={{ fontFamily: 'IBM Plex Mono', fontSize: 9 }}
                      tickFormatter={v => v.toFixed(0) + '%'}
                      label={{ value: 'IV (%)', angle: -90, position: 'insideLeft', fontFamily: 'IBM Plex Mono', fontSize: 8, fill: 'hsl(var(--muted-foreground))' }}
                    />
                    <ReferenceLine x={100} stroke="hsl(var(--primary))" strokeDasharray="3 2" opacity={0.6}
                      label={{ value: 'ATM', position: 'top', fontFamily: 'IBM Plex Mono', fontSize: 8, fill: 'hsl(var(--primary))' }}
                    />
                    <Tooltip content={<SmileTooltip />} />
                    <Legend wrapperStyle={{ fontFamily: 'IBM Plex Mono', fontSize: 9, paddingTop: 16 }} />
                    {smileData.map((exp, i) => (
                      <Scatter
                        key={exp.label}
                        name={exp.label}
                        data={exp.data}
                        fill={COLORS[i % COLORS.length]}
                        line={{ stroke: COLORS[i % COLORS.length], strokeWidth: 1.5 }}
                        lineType="joint"
                        shape="circle"
                        r={2}
                      />
                    ))}
                  </ScatterChart>
                </ResponsiveContainer>
              </div>

              {/* ATM term structure */}
              {termData.length > 1 && (
                <div className="border border-border p-4">
                  <p className="font-mono text-[9px] text-muted-foreground tracking-widest mb-1">ATM IV TERM STRUCTURE</p>
                  <p className="font-mono text-[8px] text-muted-foreground/60 mb-3">
                    At-the-money implied volatility vs. days to expiry
                  </p>
                  <ResponsiveContainer width="100%" height={200}>
                    <LineChart data={termData} margin={{ top: 5, right: 20, bottom: 20, left: 10 }}>
                      <CartesianGrid strokeDasharray="2 4" stroke="hsl(var(--border))" opacity={0.4} />
                      <XAxis
                        dataKey="dte"
                        tick={{ fontFamily: 'IBM Plex Mono', fontSize: 9 }}
                        label={{ value: 'DAYS TO EXPIRY', position: 'insideBottom', offset: -12, fontFamily: 'IBM Plex Mono', fontSize: 8, fill: 'hsl(var(--muted-foreground))' }}
                      />
                      <YAxis
                        tick={{ fontFamily: 'IBM Plex Mono', fontSize: 9 }}
                        tickFormatter={v => v + '%'}
                      />
                      <Tooltip content={<TermTooltip />} />
                      <Line type="monotone" dataKey="atm" stroke="#22c55e" strokeWidth={1.5} dot={{ r: 3, fill: '#22c55e' }} name="ATM IV" />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              )}

              {/* Heatmap */}
              <div className="border border-border p-4">
                <p className="font-mono text-[9px] text-muted-foreground tracking-widest mb-3">IV SURFACE HEATMAP</p>
                <IVHeatmap surface={result.surface} spot={result.spot} />
                <p className="font-mono text-[8px] text-muted-foreground/40 mt-2">
                  · Values interpolated to nearest available strike within ±4% of target moneyness
                </p>
              </div>

              <p className="font-mono text-[8px] text-muted-foreground/40">
                · IV FROM YAHOO FINANCE OPTIONS CHAIN · OTM CONVENTION APPLIED · FOR RESEARCH/EDUCATIONAL USE ONLY
              </p>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
