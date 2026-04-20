import React, { useEffect, useMemo, useState } from 'react';
import { Helmet } from 'react-helmet';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts';
import { ArrowLeft, Activity, TrendingUp, TrendingDown } from 'lucide-react';
import apiServerClient from '@/lib/apiServerClient.js';

// ── Yield curve snapshots (US Treasury par yields, %) ─────────────────────────
const TENORS = ['3M', '6M', '1Y', '2Y', '3Y', '5Y', '7Y', '10Y', '30Y'];
const TENOR_X = { '3M': 0.25, '6M': 0.5, '1Y': 1, '2Y': 2, '3Y': 3, '5Y': 5, '7Y': 7, '10Y': 10, '30Y': 30 };

const SNAPSHOTS = [
  { label: 'Jun 2007 (Pre-GFC)',    era: 'gfc',     values: { '3M':5.0, '6M':5.0, '1Y':4.9, '2Y':4.8, '3Y':4.8, '5Y':4.7, '7Y':4.8, '10Y':4.8, '30Y':4.9 } },
  { label: 'Mar 2008 (GFC Peak)',   era: 'gfc',     values: { '3M':0.6, '6M':1.0, '1Y':1.4, '2Y':1.6, '3Y':1.9, '5Y':2.5, '7Y':2.9, '10Y':3.4, '30Y':4.3 } },
  { label: 'Dec 2008 (GFC Trough)', era: 'gfc',     values: { '3M':0.02,'6M':0.3, '1Y':0.4, '2Y':0.8, '3Y':1.1, '5Y':1.5, '7Y':2.1, '10Y':2.2,'30Y':2.5 } },
  { label: 'Jan 2020 (Pre-COVID)',  era: 'covid',   values: { '3M':1.5, '6M':1.6, '1Y':1.6, '2Y':1.5, '3Y':1.5, '5Y':1.6, '7Y':1.7, '10Y':1.8, '30Y':2.3 } },
  { label: 'Apr 2020 (COVID)',      era: 'covid',   values: { '3M':0.05,'6M':0.1, '1Y':0.1, '2Y':0.2, '3Y':0.2, '5Y':0.4, '7Y':0.6, '10Y':0.7, '30Y':1.3 } },
  { label: 'Jan 2022 (Pre-hike)',   era: 'hike',    values: { '3M':0.05,'6M':0.1, '1Y':0.3, '2Y':0.8, '3Y':1.1, '5Y':1.4, '7Y':1.6, '10Y':1.8, '30Y':2.1 } },
  { label: 'Oct 2022 (Inversion)',  era: 'hike',    values: { '3M':3.6, '6M':4.1, '1Y':4.4, '2Y':4.4, '3Y':4.3, '5Y':4.0, '7Y':3.9, '10Y':3.9, '30Y':3.9 } },
  { label: 'Jan 2023 (Max Inv.)',   era: 'hike',    values: { '3M':4.5, '6M':4.7, '1Y':4.7, '2Y':4.4, '3Y':4.1, '5Y':3.8, '7Y':3.7, '10Y':3.6, '30Y':3.7 } },
  { label: 'Apr 2025 (Current)',    era: 'current', values: { '3M':4.3, '6M':4.3, '1Y':4.0, '2Y':3.8, '3Y':3.8, '5Y':3.9, '7Y':4.0, '10Y':4.4, '30Y':4.8 } },
];

const ERA_COLOR = {
  gfc:     '#ef4444',  // red
  covid:   '#f97316',  // orange
  hike:    '#eab308',  // yellow
  current: 'hsl(var(--primary))',
};

// ── Cross-asset correlations ──────────────────────────────────────────────────
const CORR_ASSETS = ['SPY', 'TLT', 'GLD', 'USO', 'VIX', 'HYG'];
const CORR_PAIRS = {
  'SPY-TLT': -0.25, 'SPY-GLD': 0.05, 'SPY-USO': 0.35, 'SPY-VIX': -0.75, 'SPY-HYG': 0.70,
  'TLT-GLD': 0.30, 'TLT-USO': -0.10, 'TLT-VIX': 0.20, 'TLT-HYG': 0.10,
  'GLD-USO': 0.25, 'GLD-VIX': 0.05, 'GLD-HYG': -0.05,
  'USO-VIX': -0.20, 'USO-HYG': 0.30,
  'VIX-HYG': -0.60,
};

function getCorr(a, b) {
  if (a === b) return 1;
  return CORR_PAIRS[`${a}-${b}`] ?? CORR_PAIRS[`${b}-${a}`] ?? 0;
}

function corrColor(v) {
  if (v === 1) return { bg: 'hsl(var(--primary) / 0.25)', fg: 'hsl(var(--primary))' };
  const alpha = Math.min(Math.abs(v), 1);
  if (v > 0) return { bg: `rgba(34, 197, 94, ${alpha * 0.35})`, fg: '#d1fae5' };
  return { bg: `rgba(239, 68, 68, ${alpha * 0.35})`, fg: '#fecaca' };
}

// ── FX fallback data ──────────────────────────────────────────────────────────
const FX_FALLBACK = [
  { label: 'EUR/USD', value: '1.0845', change: '-0.12%', positive: false },
  { label: 'GBP/USD', value: '1.2632', change: '+0.08%', positive: true },
  { label: 'USD/JPY', value: '149.72', change: '+0.21%', positive: true },
  { label: 'USD/CHF', value: '0.9054', change: '-0.05%', positive: false },
];

// ── Panel wrapper ─────────────────────────────────────────────────────────────
function Panel({ title, subtitle, children, className = '' }) {
  return (
    <div className={`border border-border bg-background ${className}`}>
      <div className="border-b border-border bg-muted/20 px-3 py-2 flex items-center justify-between">
        <span className="font-mono text-[10px] tracking-widest text-primary">{title}</span>
        {subtitle && (
          <span className="font-mono text-[9px] tracking-widest text-muted-foreground/60">{subtitle}</span>
        )}
      </div>
      <div className="p-3">{children}</div>
    </div>
  );
}

// ── VIX gauge ─────────────────────────────────────────────────────────────────
function VixGauge({ value }) {
  const v = typeof value === 'number' ? value : parseFloat(value);
  if (isNaN(v)) return null;
  const pct = Math.min(Math.max(v / 50, 0), 1);
  let tier = 'LOW VOL';
  let color = '#22c55e';
  if (v >= 35)      { tier = 'CRISIS';   color = '#ef4444'; }
  else if (v >= 25) { tier = 'ELEVATED'; color = '#f97316'; }
  else if (v >= 15) { tier = 'NORMAL';   color = '#eab308'; }

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <span className="font-mono text-[9px] tracking-widest text-muted-foreground/60">GAUGE</span>
        <span className="font-mono text-[9px] tracking-widest" style={{ color }}>{tier}</span>
      </div>
      <div className="h-2 border border-border bg-muted/20 relative overflow-hidden">
        <div
          className="h-full transition-all"
          style={{ width: `${pct * 100}%`, background: color }}
        />
      </div>
      <div className="flex justify-between font-mono text-[8px] text-muted-foreground/40 tracking-widest">
        <span>0</span><span>15</span><span>25</span><span>35</span><span>50+</span>
      </div>
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────
export default function MarketsPage() {
  const [snapIdx, setSnapIdx] = useState(SNAPSHOTS.length - 1);
  const [marketData, setMarketData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await apiServerClient.fetch('/market-data');
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        if (!cancelled) {
          setMarketData(Array.isArray(data) ? data : (data?.items || []));
        }
      } catch (e) {
        if (!cancelled) setError(e?.message || 'feed unavailable');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const snap = SNAPSHOTS[snapIdx];
  const curveData = useMemo(
    () => TENORS.map(t => ({ tenor: t, x: TENOR_X[t], yield: snap.values[t] })),
    [snapIdx] // eslint-disable-line react-hooks/exhaustive-deps
  );

  const spread_10_2 = (snap.values['10Y'] - snap.values['2Y']).toFixed(2);
  const spread_10_3m = (snap.values['10Y'] - snap.values['3M']).toFixed(2);
  const curveColor = ERA_COLOR[snap.era] || 'hsl(var(--primary))';

  const findItem = (needle) =>
    marketData.find(d => (d.label || '').toUpperCase().includes(needle.toUpperCase()));

  const vix = findItem('VIX');
  const spx = findItem('SPX') || findItem('S&P');

  const fxItems = marketData.filter(d => /USD|EUR|GBP|JPY|CHF/i.test(d.label || ''));
  const fxData = fxItems.length >= 2 ? fxItems : FX_FALLBACK;

  return (
    <>
      <Helmet>
        <title>DDF·TERMINAL — Markets</title>
        <meta name="description" content="Cross-asset markets dashboard — yield curve animator, vol complex, FX majors, correlation matrix." />
        <link rel="canonical" href="https://findmitridefreitas.com/markets" />
      </Helmet>

      <div className="min-h-screen pt-12 md:pt-14 pb-20">
        {/* Header strip */}
        <section className="py-6 border-b border-border">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8">
            <Link to="/" className="font-mono text-[10px] tracking-widest text-muted-foreground hover:text-primary transition-colors inline-flex items-center gap-1 mb-4">
              <ArrowLeft className="h-3 w-3" /> BACK
            </Link>
            <div className="flex items-end justify-between flex-wrap gap-3">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <Activity className="h-4 w-4 text-primary" />
                  <span className="font-mono text-[10px] tracking-widest text-primary">MARKETS / M</span>
                </div>
                <h1 className="font-mono text-2xl md:text-3xl font-bold tracking-tight text-foreground">
                  Cross-Asset Dashboard
                </h1>
              </div>
              <div className="font-mono text-[10px] text-muted-foreground tracking-widest">
                {loading ? 'LOADING FEED...' : error ? `FEED: ${error.toUpperCase()}` : 'FEED: LIVE'}
              </div>
            </div>
          </div>
        </section>

        <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-4">

          {/* Live ticker strip */}
          {marketData.length > 0 && (
            <div className="border border-border bg-muted/10 px-3 py-2 flex flex-wrap gap-x-6 gap-y-1 items-center">
              <span className="font-mono text-[9px] tracking-widest text-muted-foreground/50">LIVE</span>
              {marketData.slice(0, 8).map((it, i) => (
                <div key={i} className="flex items-center gap-2 font-mono text-[10px]">
                  <span className="text-muted-foreground/70">{it.label}</span>
                  <span className="text-foreground">{it.value}</span>
                  <span className={it.positive ? 'text-primary' : 'text-destructive'}>
                    {it.change}
                  </span>
                </div>
              ))}
            </div>
          )}

          {/* Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

            {/* Panel A: Yield Curve Animator */}
            <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }} className="lg:col-span-2">
              <Panel title="A · YIELD CURVE ANIMATOR" subtitle="US TREASURY PAR YIELDS">
                <div className="space-y-3">
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <div>
                      <span className="font-mono text-[11px] text-foreground">{snap.label}</span>
                      <span className="font-mono text-[9px] tracking-widest ml-2" style={{ color: curveColor }}>
                        ■ {snap.era.toUpperCase()}
                      </span>
                    </div>
                    <div className="flex items-center gap-4 font-mono text-[10px]">
                      <span className="text-muted-foreground">
                        10Y-2Y: <span className={spread_10_2 >= 0 ? 'text-primary' : 'text-destructive'}>{spread_10_2}%</span>
                      </span>
                      <span className="text-muted-foreground">
                        10Y-3M: <span className={spread_10_3m >= 0 ? 'text-primary' : 'text-destructive'}>{spread_10_3m}%</span>
                      </span>
                    </div>
                  </div>

                  <div className="h-[260px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={curveData} margin={{ top: 10, right: 20, bottom: 20, left: 0 }}>
                        <CartesianGrid stroke="hsl(var(--border))" strokeDasharray="2 4" opacity={0.4} />
                        <XAxis
                          dataKey="tenor"
                          tick={{ fontFamily: 'monospace', fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
                          stroke="hsl(var(--border))"
                        />
                        <YAxis
                          tick={{ fontFamily: 'monospace', fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
                          stroke="hsl(var(--border))"
                          domain={[0, 'dataMax + 0.5']}
                          tickFormatter={(v) => `${v}%`}
                        />
                        <Tooltip
                          contentStyle={{ background: 'hsl(var(--background))', border: '1px solid hsl(var(--border))', fontFamily: 'monospace', fontSize: 11 }}
                          formatter={(v) => [`${v}%`, 'Yield']}
                        />
                        <Line
                          type="monotone"
                          dataKey="yield"
                          stroke={curveColor}
                          strokeWidth={2}
                          dot={{ r: 3, fill: curveColor }}
                          activeDot={{ r: 5 }}
                          isAnimationActive
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>

                  <div className="space-y-1">
                    <div className="flex items-center justify-between font-mono text-[9px] text-muted-foreground/60 tracking-widest">
                      <span>SNAPSHOT {snapIdx + 1} / {SNAPSHOTS.length}</span>
                      <span>SCRUB →</span>
                    </div>
                    <input
                      type="range"
                      min={0}
                      max={SNAPSHOTS.length - 1}
                      value={snapIdx}
                      onChange={(e) => setSnapIdx(parseInt(e.target.value))}
                      className="w-full accent-primary"
                    />
                    <div className="flex justify-between font-mono text-[8px] text-muted-foreground/40 tracking-widest">
                      {SNAPSHOTS.map((s, i) => (
                        <button
                          key={i}
                          onClick={() => setSnapIdx(i)}
                          className={`hover:text-primary transition-colors ${i === snapIdx ? 'text-primary' : ''}`}
                          style={{ color: i === snapIdx ? ERA_COLOR[s.era] : undefined }}
                          title={s.label}
                        >
                          |
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </Panel>
            </motion.div>

            {/* Panel B: Vol Complex */}
            <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3, delay: 0.05 }}>
              <Panel title="B · VOL COMPLEX" subtitle="IMPLIED VOLATILITY">
                <div className="space-y-4">
                  {/* VIX */}
                  <div className="border border-border/50 p-3 bg-muted/10">
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-mono text-[11px] text-foreground">VIX</span>
                      {vix ? (
                        <div className="flex items-center gap-2 font-mono text-[11px]">
                          <span className="text-foreground">{vix.value}</span>
                          <span className={vix.positive ? 'text-primary' : 'text-destructive'}>
                            {vix.positive ? <TrendingUp className="h-3 w-3 inline" /> : <TrendingDown className="h-3 w-3 inline" />} {vix.change}
                          </span>
                        </div>
                      ) : (
                        <span className="font-mono text-[10px] text-muted-foreground/60">—</span>
                      )}
                    </div>
                    <VixGauge value={vix?.value ?? 18} />
                    <div className="mt-3 grid grid-cols-4 gap-1 font-mono text-[8px] tracking-widest">
                      <div className="border border-border/40 p-1 text-center"><span className="text-green-500">&lt;15</span><br/>LOW</div>
                      <div className="border border-border/40 p-1 text-center"><span className="text-yellow-500">15-25</span><br/>NORMAL</div>
                      <div className="border border-border/40 p-1 text-center"><span className="text-orange-500">25-35</span><br/>ELEV</div>
                      <div className="border border-border/40 p-1 text-center"><span className="text-red-500">&gt;35</span><br/>CRISIS</div>
                    </div>
                  </div>

                  {/* OVX */}
                  <div className="border border-border/50 p-3 bg-muted/10">
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-[11px] text-foreground">OVX</span>
                      <span className="font-mono text-[9px] tracking-widest text-muted-foreground/50">OIL VOL</span>
                    </div>
                    <p className="font-mono text-[10px] text-muted-foreground/60 mt-1">
                      N/A — live feed coming
                    </p>
                  </div>

                  {/* MOVE */}
                  <div className="border border-border/50 p-3 bg-muted/10">
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-[11px] text-foreground">MOVE</span>
                      <span className="font-mono text-[11px] text-muted-foreground">~100 (est.)</span>
                    </div>
                    <p className="font-mono text-[9px] text-muted-foreground/50 mt-1">
                      No free MOVE feed; index published by ICE.
                    </p>
                  </div>
                </div>
              </Panel>
            </motion.div>

            {/* Panel C: FX Majors */}
            <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3, delay: 0.1 }}>
              <Panel title="C · FX MAJORS" subtitle={fxItems.length >= 2 ? 'LIVE' : 'LAST KNOWN'}>
                <table className="w-full font-mono text-[11px]">
                  <thead>
                    <tr className="text-muted-foreground/50 text-[9px] tracking-widest border-b border-border/40">
                      <th className="text-left pb-1.5 font-normal">PAIR</th>
                      <th className="text-right pb-1.5 font-normal">LAST</th>
                      <th className="text-right pb-1.5 font-normal">CHG</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/20">
                    {fxData.map((row, i) => (
                      <tr key={i}>
                        <td className="py-2 text-foreground">{row.label}</td>
                        <td className="py-2 text-right text-muted-foreground">{row.value}</td>
                        <td className={`py-2 text-right ${row.positive ? 'text-primary' : 'text-destructive'}`}>
                          {row.change}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {fxItems.length < 2 && (
                  <p className="font-mono text-[9px] tracking-widest text-muted-foreground/40 mt-3 border-t border-border/30 pt-2">
                    LIVE FX FEED COMING — FIGURES ARE LAST-KNOWN STATIC VALUES.
                  </p>
                )}
              </Panel>
            </motion.div>

            {/* Panel D: Correlation Matrix */}
            <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3, delay: 0.15 }} className="lg:col-span-2">
              <Panel title="D · CROSS-ASSET CORRELATION MATRIX" subtitle="ILLUSTRATIVE · TRAILING 1Y APPROXIMATE">
                <div className="overflow-x-auto">
                  <table className="font-mono text-[10px] border-collapse mx-auto">
                    <thead>
                      <tr>
                        <th className="w-10 h-10"></th>
                        {CORR_ASSETS.map(a => (
                          <th key={a} className="w-14 h-10 text-center text-primary tracking-widest">{a}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {CORR_ASSETS.map(row => (
                        <tr key={row}>
                          <th className="w-10 h-10 text-primary tracking-widest text-center">{row}</th>
                          {CORR_ASSETS.map(col => {
                            const v = getCorr(row, col);
                            const { bg, fg } = corrColor(v);
                            return (
                              <td
                                key={col}
                                className="w-14 h-10 text-center border border-border/30"
                                style={{ background: bg, color: fg }}
                              >
                                {v === 1 ? '1.00' : v.toFixed(2)}
                              </td>
                            );
                          })}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div className="flex items-center justify-center gap-4 mt-3 font-mono text-[8px] tracking-widest text-muted-foreground/60">
                  <span className="flex items-center gap-1">
                    <span className="inline-block w-3 h-3" style={{ background: 'rgba(239,68,68,0.35)' }}></span> NEGATIVE
                  </span>
                  <span className="flex items-center gap-1">
                    <span className="inline-block w-3 h-3" style={{ background: 'rgba(34,197,94,0.35)' }}></span> POSITIVE
                  </span>
                  <span className="flex items-center gap-1">
                    <span className="inline-block w-3 h-3" style={{ background: 'hsl(var(--primary) / 0.25)' }}></span> DIAGONAL
                  </span>
                </div>
              </Panel>
            </motion.div>
          </div>

          {/* Footer disclaimer */}
          <p className="font-mono text-[9px] text-muted-foreground/40 tracking-widest text-center pt-4">
            DATA DELAYED · NOT FINANCIAL ADVICE · <Link to="/disclaimers" className="hover:text-primary">DISCLAIMERS</Link>
          </p>
        </div>
      </div>
    </>
  );
}
