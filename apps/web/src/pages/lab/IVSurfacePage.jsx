import React, { useState, useCallback, useMemo } from 'react';
import { Helmet } from 'react-helmet';
import Plotly from 'plotly.js-dist-min';
import createPlotlyComponent from 'react-plotly.js/factory';
import {
  LineChart, Line, XAxis, YAxis, Tooltip,
  CartesianGrid, ResponsiveContainer, Legend,
} from 'recharts';
import { useTheme } from '@/contexts/ThemeContext.jsx';

const Plot = createPlotlyComponent(Plotly);

const API_BASE = window.location.hostname === 'localhost'
  ? '/hcgi/api'
  : 'https://newsapi-xspv.onrender.com';

// ── Moneyness grid for the surface ───────────────────────────────────────────
const MONEYNESS_STEPS = [75, 80, 85, 90, 95, 97.5, 100, 102.5, 105, 110, 115, 120, 125];

// ── IV colour for the 2D heatmap table ───────────────────────────────────────
function ivBg(iv) {
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

// ── Interpolate IV to a regular moneyness grid ────────────────────────────────
function interpolateIV(strikes, spot, moneynessSteps) {
  return moneynessSteps.map(m => {
    const target = spot * m / 100;
    const nearby = strikes
      .filter(s => Math.abs(s.strike / target - 1) < 0.05)
      .sort((a, b) => Math.abs(a.strike - target) - Math.abs(b.strike - target));
    return nearby[0]?.iv != null ? +(nearby[0].iv * 100).toFixed(3) : null;
  });
}

// ── ATM IV (closest strike to spot) ─────────────────────────────────────────
function atmIV(strikes, spot) {
  const sorted = [...strikes].sort((a, b) => Math.abs(a.strike - spot) - Math.abs(b.strike - spot));
  return sorted[0]?.iv ?? null;
}

// ── Skew: IV at a given moneyness ────────────────────────────────────────────
function skewIV(strikes, spot, pct) {
  const target = spot * pct;
  const sorted = [...strikes].sort((a, b) => Math.abs(a.strike - target) - Math.abs(b.strike - target));
  return sorted[0]?.iv ?? null;
}

// ── Term structure tooltip ────────────────────────────────────────────────────
const TermTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-card border border-border p-2 font-mono text-[10px]">
      <p className="text-muted-foreground">{label} DTE</p>
      <p>ATM IV: <span className="text-primary">{payload[0]?.value?.toFixed(2)}%</span></p>
    </div>
  );
};

// ── Page ─────────────────────────────────────────────────────────────────────
export default function IVSurfacePage() {
  const { theme } = useTheme();
  const [ticker,   setTicker]   = useState('QQQ');
  const [status,   setStatus]   = useState('idle');
  const [errorMsg, setErrorMsg] = useState('');
  const [result,   setResult]   = useState(null);

  const isDark = theme === 'dark';
  const paperBg   = isDark ? '#09090b' : '#ffffff';
  const textColor = isDark ? '#a1a1aa' : '#71717a';
  const gridColor = isDark ? '#27272a' : '#e4e4e7';

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

  // ── Build 3D surface data ─────────────────────────────────────────────────
  const { surfaceTrace, termData, nearExp } = useMemo(() => {
    if (!result) return { surfaceTrace: null, termData: [], nearExp: null };

    const { surface, spot } = result;
    const sortedExp = [...surface].sort((a, b) => a.dte - b.dte);

    // Z matrix: rows = expirations, cols = moneyness
    const z = sortedExp.map(exp => interpolateIV(exp.strikes, spot, MONEYNESS_STEPS));
    const y = sortedExp.map(e => e.dte);   // DTE axis
    const x = MONEYNESS_STEPS;              // moneyness axis

    const surfaceTrace = {
      type: 'surface',
      x, y, z,
      colorscale: [
        [0.0, '#22c55e'],
        [0.3, '#84cc16'],
        [0.5, '#eab308'],
        [0.7, '#f97316'],
        [1.0, '#ef4444'],
      ],
      colorbar: {
        title: { text: 'IV %', font: { family: 'IBM Plex Mono', size: 10, color: textColor } },
        tickfont: { family: 'IBM Plex Mono', size: 9, color: textColor },
        len: 0.6,
      },
      contours: {
        z: { show: true, usecolormap: true, highlightcolor: '#ffffff', project: { z: false } },
      },
      hovertemplate: 'Moneyness: %{x}%<br>DTE: %{y}<br>IV: %{z:.2f}%<extra></extra>',
    };

    const termData = sortedExp.map(exp => ({
      dte: exp.dte,
      atm: +((atmIV(exp.strikes, spot) ?? 0) * 100).toFixed(2),
    }));

    const nearExp = sortedExp.find(e => e.dte >= 7) || sortedExp[0];
    return { surfaceTrace, termData, nearExp };
  }, [result, textColor]);

  const spot = result?.spot;
  const atmNear = nearExp ? atmIV(nearExp.strikes, spot) : null;
  const skew25  = nearExp
    ? (skewIV(nearExp.strikes, spot, 0.95) ?? 0) - (skewIV(nearExp.strikes, spot, 1.05) ?? 0)
    : null;

  const plotLayout = {
    paper_bgcolor: paperBg,
    plot_bgcolor:  paperBg,
    font: { family: 'IBM Plex Mono', size: 9, color: textColor },
    margin: { t: 30, b: 10, l: 10, r: 10 },
    scene: {
      bgcolor: paperBg,
      xaxis: {
        title: { text: 'MONEYNESS (%)', font: { size: 9, color: textColor } },
        tickfont: { size: 8, color: textColor },
        gridcolor: gridColor, zeroline: false,
      },
      yaxis: {
        title: { text: 'DTE', font: { size: 9, color: textColor } },
        tickfont: { size: 8, color: textColor },
        gridcolor: gridColor, zeroline: false,
      },
      zaxis: {
        title: { text: 'IV (%)', font: { size: 9, color: textColor } },
        tickfont: { size: 8, color: textColor },
        gridcolor: gridColor, zeroline: false,
      },
      camera: { eye: { x: 1.6, y: -1.6, z: 0.8 } },
    },
  };

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
              Interactive 3D vol surface · ATM term structure · 25Δ skew · Drag to rotate
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
              · Up to 8 expirations · OTM convention (puts for K &lt; spot, calls for K ≥ spot) · Drag to rotate · Scroll to zoom
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

          {status === 'done' && result && surfaceTrace && (
            <div className="space-y-6">

              {/* Market closed warning */}
              {result.marketState !== 'REGULAR' && (
                <div className="border border-yellow-600/50 bg-yellow-500/5 px-4 py-3">
                  <p className="font-mono text-[10px] text-yellow-600 tracking-wide">
                    ⚠ MARKET {result.marketState} — IV values are computed from stale closing prices.
                    Absolute levels are unreliable. The <strong>shape</strong> of the surface (vol skew, smile) is still informative.
                    Live IV data is available during US market hours (9:30–16:00 ET Mon–Fri).
                  </p>
                </div>
              )}

              {/* Key metrics */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {[
                  ['TICKER',        result.ticker],
                  ['SPOT',          `$${result.spot?.toFixed(2) ?? '—'}`],
                  ['EXPIRATIONS',   result.surface.length],
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
                    <p className="font-mono text-[8px] text-muted-foreground tracking-widest">25Δ SKEW (95%−105%)</p>
                    <p className={`font-mono text-xs font-bold mt-0.5 ${skew25 > 0 ? 'text-primary' : 'text-foreground'}`}>
                      {skew25 != null ? (skew25 > 0 ? '+' : '') + (skew25 * 100).toFixed(2) + ' vols' : '—'}
                    </p>
                  </div>
                  <div>
                    <p className="font-mono text-[8px] text-muted-foreground tracking-widest">95% PUT IV</p>
                    <p className="font-mono text-xs font-bold text-foreground mt-0.5">
                      {skewIV(nearExp.strikes, spot, 0.95) != null
                        ? (skewIV(nearExp.strikes, spot, 0.95) * 100).toFixed(2) + '%' : '—'}
                    </p>
                  </div>
                  <div>
                    <p className="font-mono text-[8px] text-muted-foreground tracking-widest">105% CALL IV</p>
                    <p className="font-mono text-xs font-bold text-foreground mt-0.5">
                      {skewIV(nearExp.strikes, spot, 1.05) != null
                        ? (skewIV(nearExp.strikes, spot, 1.05) * 100).toFixed(2) + '%' : '—'}
                    </p>
                  </div>
                </div>
              )}

              {/* 3D Surface */}
              <div className="border border-border p-4">
                <p className="font-mono text-[9px] text-muted-foreground tracking-widest mb-1">
                  3D IMPLIED VOLATILITY SURFACE
                </p>
                <p className="font-mono text-[8px] text-muted-foreground/60 mb-2">
                  {result.ticker} · X = moneyness (%) · Y = DTE · Z = IV (%) · Drag to rotate · Green = low IV · Red = high IV
                </p>
                <Plot
                  data={[surfaceTrace]}
                  layout={plotLayout}
                  config={{ responsive: true, displayModeBar: true, displaylogo: false, modeBarButtonsToRemove: ['sendDataToCloud'] }}
                  style={{ width: '100%', height: '520px' }}
                  useResizeHandler
                />
              </div>

              {/* ATM term structure — only meaningful when market is live */}
              {termData.length > 1 && result.marketState === 'REGULAR' && (
                <div className="border border-border p-4">
                  <p className="font-mono text-[9px] text-muted-foreground tracking-widest mb-1">ATM IV TERM STRUCTURE</p>
                  <p className="font-mono text-[8px] text-muted-foreground/60 mb-3">
                    At-the-money implied vol vs. days to expiry — upward slope = normal contango
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

              {/* Heatmap matrix */}
              <div className="border border-border p-4">
                <p className="font-mono text-[9px] text-muted-foreground tracking-widest mb-3">IV SURFACE HEATMAP</p>
                <div className="overflow-x-auto">
                  <table className="w-full font-mono text-[9px] border-collapse">
                    <thead>
                      <tr>
                        <th className="text-left text-muted-foreground px-2 py-1 border border-border">EXPIRY / DTE</th>
                        {MONEYNESS_STEPS.map(m => (
                          <th key={m} className={`text-center px-1.5 py-1 border border-border ${m === 100 ? 'text-primary' : 'text-muted-foreground'}`}>
                            {m === 100 ? 'ATM' : `${m}%`}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {result.surface.slice().sort((a, b) => a.dte - b.dte).map(exp => {
                        const ivRow = interpolateIV(exp.strikes, spot, MONEYNESS_STEPS);
                        return (
                          <tr key={exp.expiry}>
                            <td className="text-muted-foreground px-2 py-1 border border-border whitespace-nowrap">
                              {exp.expiry} <span className="opacity-50">({exp.dte}d)</span>
                            </td>
                            {ivRow.map((iv, i) => (
                              <td
                                key={i}
                                className="text-center px-1.5 py-1 border border-border"
                                style={iv != null ? { backgroundColor: ivBg(iv / 100), color: '#fff' } : {}}
                              >
                                {iv != null ? iv.toFixed(1) + '%' : '—'}
                              </td>
                            ))}
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
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
