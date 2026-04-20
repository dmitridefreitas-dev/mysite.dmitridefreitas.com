import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Helmet } from 'react-helmet';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, ReferenceLine, Cell,
         LineChart, Line } from 'recharts';
import apiServerClient from '@/lib/apiServerClient.js';

// ── Math helpers ──────────────────────────────────────────────────────────────

function randn() {
  let u = 0, v = 0;
  while (!u) u = Math.random();
  while (!v) v = Math.random();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}

function normalCDF(x) {
  const a1=0.254829592,a2=-0.284496736,a3=1.421413741,a4=-1.453152027,a5=1.061405429,p=0.3275911;
  const sign = x < 0 ? -1 : 1;
  const t = 1 / (1 + p * Math.abs(x) / Math.sqrt(2));
  const y = 1 - ((((a5*t+a4)*t+a3)*t+a2)*t+a1)*t * Math.exp(-(x*x)/2);
  return 0.5 * (1 + sign * y);
}

function normalQuantile(p) {
  if (p <= 0) return -Infinity;
  if (p >= 1) return Infinity;
  const a = [2.515517, 0.802853, 0.010328];
  const b = [1.432788, 0.189269, 0.001308];
  const t = p < 0.5 ? Math.sqrt(-2*Math.log(p)) : Math.sqrt(-2*Math.log(1-p));
  const num = a[0]+a[1]*t+a[2]*t*t;
  const den = 1+b[0]*t+b[1]*t*t+b[2]*t*t*t;
  return p < 0.5 ? -(t - num/den) : (t - num/den);
}

// Probabilistic Sharpe Ratio (normal returns assumption)
function psr(SR_hat, SR_star, T) {
  const se = Math.sqrt((1 + SR_hat*SR_hat/2) / (T - 1));
  return normalCDF((SR_hat - SR_star) / se);
}

// Expected max SR from N iid strategies — Bailey & López de Prado (2016)
// E[max SR] ≈ SE(SR) · [(1−γ)·Φ⁻¹(1−1/N) + γ·Φ⁻¹(1−1/(N·e))]
// where γ = Euler-Mascheroni constant, SE(SR) = sqrt((1+SR²/2)/(T−1))
const EULER_MASCHERONI = 0.5772156649015329;
function expectedMaxSR(N, T, SR_hat = 0) {
  const seSR = Math.sqrt((1 + SR_hat * SR_hat / 2) / (T - 1));
  const z1   = normalQuantile(1 - 1 / N);
  const z2   = normalQuantile(1 - 1 / (N * Math.E));
  return seSR * ((1 - EULER_MASCHERONI) * z1 + EULER_MASCHERONI * z2);
}

// Deflated Sharpe: PSR adjusted for multiple testing
function deflatedSR(SR_hat, N, T) {
  const SR_star = expectedMaxSR(N, T, SR_hat);
  const haircut = SR_hat - SR_star;
  const prob    = psr(SR_hat, SR_star, T);
  const minTRL  = Math.ceil(1 + (1 + SR_hat*SR_hat/2) * Math.pow(normalQuantile(1 - 1/(2*N)) / SR_hat, 2));
  return { SR_star: +SR_star.toFixed(3), haircut: +haircut.toFixed(3), prob: +(prob*100).toFixed(1), minTRL, passes: haircut > 0 };
}

// Multi-testing simulation: N random strategies over T months
function simulateMultiTesting(N, T) {
  const sharpes = [];
  for (let i = 0; i < N; i++) {
    const rets = Array.from({ length: T }, () => randn() * 0.05);
    const m = rets.reduce((s, r) => s + r, 0) / T;
    const s = Math.sqrt(rets.reduce((s, r) => s + (r-m)**2, 0) / (T-1));
    sharpes.push(s > 0 ? (m/s)*Math.sqrt(12) : 0);
  }
  sharpes.sort((a, b) => a - b);
  const maxSR = sharpes[sharpes.length - 1];

  // Build histogram
  const min = Math.min(...sharpes), max = Math.max(...sharpes);
  const bins = 20;
  const bw   = (max - min) / bins || 0.1;
  const hist = Array.from({ length: bins }, (_, i) => ({
    x: +(min + (i + 0.5) * bw).toFixed(2),
    count: 0,
  }));
  for (const sr of sharpes) {
    const idx = Math.min(Math.floor((sr - min) / bw), bins - 1);
    hist[idx].count++;
  }
  return { sharpes, maxSR: +maxSR.toFixed(3), hist, mean: +(sharpes.reduce((s,v)=>s+v,0)/N).toFixed(3) };
}

// OLS helper
function ols(x, y) {
  const n  = x.length;
  const mx = x.reduce((s,v)=>s+v,0)/n;
  const my = y.reduce((s,v)=>s+v,0)/n;
  let ssxy = 0, ssxx = 0;
  for (let i = 0; i < n; i++) { ssxy += (x[i]-mx)*(y[i]-my); ssxx += (x[i]-mx)**2; }
  const beta  = ssxy / ssxx;
  const alpha = my - beta*mx;
  const resid = y.map((yi, i) => yi - (alpha + beta*x[i]));
  const sse   = resid.reduce((s,r)=>s+r**2,0);
  const se_beta = Math.sqrt(sse/(n-2)/ssxx);
  return { alpha, beta, se_beta, resid };
}

// ADF test on a spread series (simplified, no lags)
function adfTest(series) {
  const dy     = series.slice(1).map((v,i) => v - series[i]);
  const y_lag  = series.slice(0, -1);
  const { beta, se_beta } = ols(y_lag, dy);
  const t_stat = beta / se_beta;
  const rho    = 1 + beta;
  const halfLife = (rho > 0 && rho < 1) ? Math.log(2) / -Math.log(rho) : null;
  let pTag = '>0.10';
  if (t_stat < -3.41) pTag = '<0.01';
  else if (t_stat < -2.86) pTag = '<0.05';
  else if (t_stat < -2.57) pTag = '<0.10';
  return { t_stat: +t_stat.toFixed(3), pTag, halfLife: halfLife ? +halfLife.toFixed(1) : null, stationary: t_stat < -2.86 };
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function BacktestStatsPage() {

  // ── Section 1: Deflated Sharpe ───────────────────────────────────────────
  const [dsr_SR,  setDsrSR]  = useState('1.5');
  const [dsr_N,   setDsrN]   = useState('20');
  const [dsr_T,   setDsrT]   = useState('60');

  const dsrResult = useMemo(() => {
    const SR = parseFloat(dsr_SR);
    const N  = parseInt(dsr_N);
    const T  = parseInt(dsr_T);
    if (isNaN(SR) || isNaN(N) || isNaN(T) || N < 1 || T < 10) return null;
    return deflatedSR(SR, N, T);
  }, [dsr_SR, dsr_N, dsr_T]);

  // ── Section 2: Multiple Testing ───────────────────────────────────────────
  const [mt_N,      setMtN]      = useState(50);
  const [mt_T,      setMtT]      = useState(60);
  const [mtResult,  setMtResult] = useState(null);

  const runMT = useCallback(() => {
    setMtResult(simulateMultiTesting(mt_N, mt_T));
  }, [mt_N, mt_T]);

  useEffect(() => { runMT(); }, [runMT]);

  const bonferroniThreshold = useMemo(
    () => +(normalQuantile(1 - 0.05/mt_N) / Math.sqrt(mt_T/12)).toFixed(3),
    [mt_N, mt_T]
  );

  // ── Section 3: Cointegration lab ─────────────────────────────────────────
  const [coint_A,  setCointA]  = useState('SPY');
  const [coint_B,  setCointB]  = useState('QQQ');
  const [cointData,setCointData]= useState(null);
  const [cointLoad,setCointLoad]= useState(false);
  const [cointErr, setCointErr] = useState(null);
  const [cointResult, setCointResult] = useState(null);

  const runCointegration = useCallback(async () => {
    const tA = coint_A.trim().toUpperCase();
    const tB = coint_B.trim().toUpperCase();
    if (!tA || !tB) return;
    setCointLoad(true); setCointErr(null); setCointResult(null);
    try {
      const res  = await apiServerClient.fetch(`/market-data/yf-monthly?tickers=${tA},${tB}&months=60`);
      const json = await res.json();
      const serA = json.data?.[tA];
      const serB = json.data?.[tB];
      if (!serA || !serB) throw new Error('No data for one or both tickers');

      // Align by date
      const mapB = Object.fromEntries(serB.map(r => [r.date, r.adjClose]));
      const aligned = serA
        .filter(r => mapB[r.date] != null)
        .map(r => ({ date: r.date, A: r.adjClose, B: mapB[r.date] }));

      if (aligned.length < 20) throw new Error('Insufficient overlapping data (need ≥ 20 months)');

      // Regress A on B to get spread
      const xArr = aligned.map(r => r.B);
      const yArr = aligned.map(r => r.A);
      const { beta: hedge, alpha: intercept, resid } = ols(xArr, yArr);

      const spread     = resid;
      const spreadMean = spread.reduce((s,v)=>s+v,0)/spread.length;
      const spreadStd  = Math.sqrt(spread.reduce((s,v)=>s+(v-spreadMean)**2,0)/(spread.length-1));
      const zscore     = spread.map(v => (v-spreadMean)/spreadStd);

      const adf = adfTest(spread);

      const chartData = aligned.map((r, i) => ({
        date:   r.date,
        spread: +spread[i].toFixed(4),
        zscore: +zscore[i].toFixed(3),
      }));

      setCointData(chartData);
      setCointResult({ hedge: +hedge.toFixed(4), intercept: +intercept.toFixed(2), adf, tA, tB, n: aligned.length });
    } catch (e) { setCointErr(e.message); }
    finally { setCointLoad(false); }
  }, [coint_A, coint_B]);

  return (
    <>
      <Helmet><title>DDF · LAB — Backtest Statistics</title></Helmet>
      <div className="min-h-screen px-4 sm:px-6 lg:px-8 py-8">
        <div className="max-w-5xl mx-auto space-y-10">

          {/* Header */}
          <div className="border-b border-border pb-5">
            <p className="font-mono text-[9px] text-primary tracking-widest mb-1">DDF·LAB / BACKTEST STATISTICS</p>
            <h1 className="font-mono text-xl font-bold tracking-tight text-foreground">Statistical Rigor</h1>
            <p className="font-mono text-[10px] text-muted-foreground mt-1 max-w-2xl leading-relaxed">
              Three tools for evaluating backtests honestly: Deflated Sharpe for multiple-testing bias,
              a p-hacking simulation showing how random strategies produce high SR by chance, and a
              cointegration lab for pairs trading setup.
            </p>
          </div>

          {/* ── 1. Deflated Sharpe ──────────────────────────────────────────── */}
          <section className="space-y-4">
            <div className="flex items-baseline gap-3">
              <span className="font-mono text-[9px] text-muted-foreground/50">01</span>
              <h2 className="font-mono text-xs font-bold tracking-widest text-foreground">DEFLATED SHARPE RATIO</h2>
            </div>
            <p className="font-mono text-[9px] text-muted-foreground/80 max-w-2xl leading-relaxed">
              If you tested N strategies and picked the best one, how much of its Sharpe is luck?
              The Deflated SR applies the multiple-comparisons correction: SR* = E[max SR from N iid random strategies].
              A strategy passes only if its SR exceeds SR*. Formula from López de Prado (2018).
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 border border-border p-4 bg-muted/5">
              {[
                { label: 'OBSERVED SHARPE (annualized)', val: dsr_SR, set: setDsrSR, type: 'number', step: '0.1' },
                { label: 'STRATEGIES TESTED (N)',        val: dsr_N,  set: setDsrN,  type: 'number', step: '1'   },
                { label: 'MONTHS OF DATA (T)',           val: dsr_T,  set: setDsrT,  type: 'number', step: '6'   },
              ].map(({ label, val, set, type, step }) => (
                <div key={label}>
                  <label className="font-mono text-[9px] text-muted-foreground tracking-widest block mb-1">{label}</label>
                  <input value={val} onChange={e => set(e.target.value)} type={type} step={step}
                    className="w-full bg-background border border-border font-mono text-xs px-3 py-1.5 text-foreground focus:outline-none focus:border-primary" />
                </div>
              ))}
            </div>

            {dsrResult && (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="border border-border p-4 bg-muted/10">
                  <p className="font-mono text-[9px] text-muted-foreground tracking-widest mb-2">SELECTION THRESHOLD SR*</p>
                  <p className="font-mono text-xl font-bold text-foreground">{dsrResult.SR_star}</p>
                </div>
                <div className="border border-border p-4 bg-muted/10">
                  <p className="font-mono text-[9px] text-muted-foreground tracking-widest mb-2">HAIRCUT (SR - SR*)</p>
                  <p className={`font-mono text-xl font-bold ${dsrResult.haircut > 0 ? 'text-terminal-green' : 'text-destructive'}`}>
                    {dsrResult.haircut > 0 ? '+' : ''}{dsrResult.haircut}
                  </p>
                </div>
                <div className="border border-border p-4 bg-muted/10">
                  <p className="font-mono text-[9px] text-muted-foreground tracking-widest mb-2">P(SR &gt; 0 | adjusting)</p>
                  <p className={`font-mono text-xl font-bold ${dsrResult.prob >= 95 ? 'text-terminal-green' : dsrResult.prob >= 80 ? 'text-foreground' : 'text-destructive'}`}>
                    {dsrResult.prob}%
                  </p>
                </div>
                <div className={`border p-4 ${dsrResult.passes ? 'border-terminal-green bg-terminal-green/5' : 'border-destructive bg-destructive/5'}`}>
                  <p className="font-mono text-[9px] text-muted-foreground tracking-widest mb-2">VERDICT</p>
                  <p className={`font-mono text-xl font-bold ${dsrResult.passes ? 'text-terminal-green' : 'text-destructive'}`}>
                    {dsrResult.passes ? 'PASSES ✓' : 'FAILS ✗'}
                  </p>
                  <p className="font-mono text-[9px] text-muted-foreground mt-1">MinTRL: {dsrResult.minTRL}M</p>
                </div>
              </div>
            )}
          </section>

          <div className="border-t border-border/40" />

          {/* ── 2. Multiple Testing Demo ────────────────────────────────────── */}
          <section className="space-y-4">
            <div className="flex items-baseline gap-3">
              <span className="font-mono text-[9px] text-muted-foreground/50">02</span>
              <h2 className="font-mono text-xs font-bold tracking-widest text-foreground">MULTIPLE TESTING / P-HACKING DEMO</h2>
            </div>
            <p className="font-mono text-[9px] text-muted-foreground/80 max-w-2xl leading-relaxed">
              Simulate N completely random momentum strategies (zero true alpha, Gaussian returns).
              Observe how the best one's Sharpe ratio grows with N — pure luck disguised as skill.
              The red line is the Bonferroni-corrected threshold at α=5%.
            </p>

            <div className="border border-border p-4 bg-muted/5 flex flex-wrap gap-6 items-end">
              <div>
                <label className="font-mono text-[9px] text-muted-foreground tracking-widest block mb-2">
                  STRATEGIES TESTED (N) = {mt_N}
                </label>
                <input type="range" min={10} max={500} step={10} value={mt_N}
                  onChange={e => setMtN(+e.target.value)} className="w-48 h-1 accent-primary" />
              </div>
              <div>
                <label className="font-mono text-[9px] text-muted-foreground tracking-widest block mb-2">
                  MONTHS (T) = {mt_T}
                </label>
                <input type="range" min={12} max={120} step={12} value={mt_T}
                  onChange={e => setMtT(+e.target.value)} className="w-48 h-1 accent-primary" />
              </div>
              <button onClick={runMT}
                className="font-mono text-[10px] tracking-widest border border-primary text-primary hover:bg-primary hover:text-primary-foreground px-4 py-1.5 transition-colors">
                RE-SIMULATE
              </button>
            </div>

            {mtResult && (
              <div className="space-y-3">
                <div className="grid grid-cols-3 gap-3">
                  {[
                    { label: 'MAX SHARPE (LUCKY)',   value: mtResult.maxSR, color: 'text-destructive' },
                    { label: 'BONFERRONI THRESHOLD', value: bonferroniThreshold.toFixed(3), color: 'text-foreground' },
                    { label: 'MEAN SHARPE',          value: mtResult.mean, color: 'text-muted-foreground' },
                  ].map(({ label, value, color }) => (
                    <div key={label} className="border border-border p-3 bg-muted/10">
                      <p className="font-mono text-[9px] text-muted-foreground tracking-widest mb-1">{label}</p>
                      <p className={`font-mono text-lg font-bold ${color}`}>{value}</p>
                    </div>
                  ))}
                </div>
                <div className="border border-border p-4">
                  <p className="font-mono text-[9px] text-muted-foreground tracking-widest mb-3">
                    SHARPE DISTRIBUTION OF {mt_N} RANDOM STRATEGIES
                  </p>
                  <ResponsiveContainer width="100%" height={200}>
                    <BarChart data={mtResult.hist} margin={{ top: 5, right: 10, left: -10, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" strokeOpacity={0.4} />
                      <XAxis dataKey="x" tick={{ fontSize: 8, fontFamily: 'monospace', fill: 'hsl(var(--muted-foreground))' }} tickLine={false} />
                      <YAxis tick={{ fontSize: 8, fontFamily: 'monospace', fill: 'hsl(var(--muted-foreground))' }} tickLine={false} axisLine={false} />
                      <Tooltip contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', fontFamily: 'monospace', fontSize: 10 }} />
                      <ReferenceLine x={bonferroniThreshold.toFixed(2)} stroke="#ef4444" strokeWidth={2} strokeDasharray="4 4" label={{ value: 'THRESHOLD', position: 'top', fontSize: 8, fontFamily: 'monospace', fill: '#ef4444' }} />
                      <Bar dataKey="count" maxBarSize={24}>
                        {mtResult.hist.map((b, i) => (
                          <Cell key={i} fill={b.x >= bonferroniThreshold ? '#ef4444' : 'hsl(var(--primary))'} fillOpacity={0.7} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
                <p className="font-mono text-[9px] text-muted-foreground/60 leading-relaxed">
                  {mtResult.hist.filter(b => b.x >= bonferroniThreshold).reduce((s,b) => s+b.count, 0)} of {mt_N} strategies
                  exceed the Bonferroni threshold of {bonferroniThreshold} — all by luck. This is the SR your strategy must beat
                  to claim it actually has edge.
                </p>
              </div>
            )}
          </section>

          <div className="border-t border-border/40" />

          {/* ── 3. Cointegration Lab ────────────────────────────────────────── */}
          <section className="space-y-4">
            <div className="flex items-baseline gap-3">
              <span className="font-mono text-[9px] text-muted-foreground/50">03</span>
              <h2 className="font-mono text-xs font-bold tracking-widest text-foreground">COINTEGRATION LAB</h2>
            </div>
            <p className="font-mono text-[9px] text-muted-foreground/80 max-w-2xl leading-relaxed">
              Test whether two assets are cointegrated — a prerequisite for pairs trading. Regresses asset A on B,
              computes the spread (residual), and runs an ADF test for mean-reversion (stationarity).
              Tries SPY / QQQ by default — try GLD / SLV, or USO / XOM.
            </p>

            <div className="border border-border p-4 bg-muted/5 flex flex-wrap gap-4 items-end">
              {[
                { label: 'ASSET A (LONG)',  val: coint_A, set: setCointA },
                { label: 'ASSET B (HEDGE)', val: coint_B, set: setCointB },
              ].map(({ label, val, set }) => (
                <div key={label}>
                  <label className="font-mono text-[9px] text-muted-foreground tracking-widest block mb-1">{label}</label>
                  <input value={val} onChange={e => set(e.target.value.toUpperCase())}
                    className="w-28 bg-background border border-border font-mono text-xs px-3 py-1.5 text-foreground focus:outline-none focus:border-primary uppercase" />
                </div>
              ))}
              <button onClick={runCointegration} disabled={cointLoad}
                className="font-mono text-[10px] tracking-widest border border-primary text-primary hover:bg-primary hover:text-primary-foreground px-4 py-1.5 transition-colors disabled:opacity-50">
                {cointLoad ? 'TESTING...' : '[RUN TEST →]'}
              </button>
            </div>

            {cointErr  && <p className="font-mono text-xs text-destructive">ERROR: {cointErr}</p>}

            {cointResult && cointData && (
              <div className="space-y-3">
                {/* ADF result banner */}
                <div className={`border p-4 ${cointResult.adf.stationary ? 'border-terminal-green bg-terminal-green/5' : 'border-destructive bg-destructive/5'}`}>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                    {[
                      { label: 'ADF STATISTIC',  value: cointResult.adf.t_stat.toString() },
                      { label: 'P-VALUE',         value: cointResult.adf.pTag },
                      { label: 'HALF-LIFE',       value: cointResult.adf.halfLife ? `${cointResult.adf.halfLife} months` : 'Non-stationary' },
                      { label: 'VERDICT',         value: cointResult.adf.stationary ? 'COINTEGRATED ✓' : 'NOT COINTEGRATED ✗', bold: true },
                    ].map(({ label, value, bold }) => (
                      <div key={label}>
                        <p className="font-mono text-[9px] text-muted-foreground tracking-widest mb-1">{label}</p>
                        <p className={`font-mono text-sm ${bold ? (cointResult.adf.stationary ? 'text-terminal-green font-bold' : 'text-destructive font-bold') : 'text-foreground'}`}>
                          {value}
                        </p>
                      </div>
                    ))}
                  </div>
                  <p className="font-mono text-[9px] text-muted-foreground mt-2">
                    Hedge ratio: {cointResult.tA} = {cointResult.hedge} × {cointResult.tB} + {cointResult.intercept} · {cointResult.n} months
                  </p>
                </div>

                {/* Spread z-score chart */}
                <div className="border border-border p-4">
                  <p className="font-mono text-[9px] text-muted-foreground tracking-widest mb-3">
                    SPREAD Z-SCORE · {cointResult.tA} - {cointResult.hedge}×{cointResult.tB}
                  </p>
                  <ResponsiveContainer width="100%" height={200}>
                    <LineChart data={cointData} margin={{ top: 5, right: 10, left: -10, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" strokeOpacity={0.4} />
                      <XAxis dataKey="date" tick={{ fontSize: 8, fontFamily: 'monospace', fill: 'hsl(var(--muted-foreground))' }}
                        tickLine={false} interval={Math.floor(cointData.length / 7)} />
                      <YAxis tick={{ fontSize: 8, fontFamily: 'monospace', fill: 'hsl(var(--muted-foreground))' }}
                        tickLine={false} axisLine={false} tickFormatter={v => v.toFixed(1)} />
                      <Tooltip contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', fontFamily: 'monospace', fontSize: 10 }} />
                      <ReferenceLine y={2}  stroke="#ef4444" strokeDasharray="3 3" />
                      <ReferenceLine y={-2} stroke="#22c55e" strokeDasharray="3 3" />
                      <ReferenceLine y={0}  stroke="hsl(var(--border))" />
                      <Line type="monotone" dataKey="zscore" stroke="hsl(var(--primary))" strokeWidth={1.5} dot={false} />
                    </LineChart>
                  </ResponsiveContainer>
                  <p className="font-mono text-[9px] text-muted-foreground/50 mt-2">
                    Red +2σ = short spread · Green -2σ = long spread · Revert to 0 = exit
                  </p>
                </div>
              </div>
            )}
          </section>

          <p className="font-mono text-[9px] text-muted-foreground/40">
            DEFLATED SR: LÓPEZ DE PRADO (2018) · ADF CRITICAL VALUES: MACKINNON (1994) · DATA: ALPHA VANTAGE
          </p>

        </div>
      </div>
    </>
  );
}
