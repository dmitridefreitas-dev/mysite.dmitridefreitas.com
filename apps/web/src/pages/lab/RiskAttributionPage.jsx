import React, { useState, useCallback, useMemo } from 'react';
import { Helmet } from 'react-helmet';
import {
  AreaChart, Area, BarChart, Bar, LineChart, Line,
  XAxis, YAxis, Tooltip, CartesianGrid, ReferenceLine,
  ResponsiveContainer, Cell, Legend,
} from 'recharts';

const API_BASE = window.location.hostname === 'localhost'
  ? '/hcgi/api'
  : 'https://newsapi-xspv.onrender.com';

// ── Math helpers ──────────────────────────────────────────────────────────────
function mean(arr) { return arr.reduce((a, b) => a + b, 0) / arr.length; }
function std(arr) {
  const m = mean(arr);
  return Math.sqrt(arr.reduce((s, v) => s + (v - m) ** 2, 0) / arr.length);
}

function matMul(A, B) {
  const m = A.length, n = B[0].length, p = B.length;
  return Array.from({ length: m }, (_, i) =>
    Array.from({ length: n }, (_, j) =>
      Array.from({ length: p }, (_, k) => A[i][k] * B[k][j]).reduce((a, b) => a + b, 0)));
}
function matInverse(A) {
  const n = A.length;
  const M = A.map((row, i) => [...row, ...Array.from({ length: n }, (_, j) => i === j ? 1 : 0)]);
  for (let col = 0; col < n; col++) {
    let pivot = col;
    for (let row = col + 1; row < n; row++)
      if (Math.abs(M[row][col]) > Math.abs(M[pivot][col])) pivot = row;
    [M[col], M[pivot]] = [M[pivot], M[col]];
    const p = M[col][col];
    if (Math.abs(p) < 1e-14) throw new Error('Singular matrix');
    for (let j = 0; j < 2 * n; j++) M[col][j] /= p;
    for (let row = 0; row < n; row++) {
      if (row === col) continue;
      const f = M[row][col];
      for (let j = 0; j < 2 * n; j++) M[row][j] -= f * M[col][j];
    }
  }
  return M.map(row => row.slice(n));
}
function ols(y, X) {
  const Xt = X[0].map((_, j) => X.map(r => r[j]));
  const XtX = matMul(Xt, X);
  const XtXi = matInverse(XtX);
  const Xty = matMul(Xt, y.map(v => [v]));
  const beta = matMul(XtXi, Xty).map(r => r[0]);
  const n = y.length, k = beta.length;
  const yHat = X.map(row => row.reduce((s, x, j) => s + x * beta[j], 0));
  const resid = y.map((v, i) => v - yHat[i]);
  const rss = resid.reduce((s, r) => s + r * r, 0);
  const tss = y.reduce((s, v) => s + (v - mean(y)) ** 2, 0);
  const r2 = 1 - rss / tss;
  const adjR2 = 1 - (1 - r2) * (n - 1) / (n - k);
  const s2 = rss / (n - k);
  const se = XtXi.map((row, i) => Math.sqrt(Math.abs(row[i] * s2)));
  const tStat = beta.map((b, i) => b / (se[i] || 1e-10));
  return { beta, se, tStat, r2, adjR2 };
}

// ── Risk metric computations ──────────────────────────────────────────────────
function computeRiskMetrics(monthlyRets, rfRets) {
  const n = monthlyRets.length;
  if (n < 6) return null;

  const excessRets = monthlyRets.map((r, i) => r - (rfRets[i] ?? 0));
  const annMean = mean(monthlyRets) * 12;
  const annVol  = std(monthlyRets) * Math.sqrt(12);
  const sharpe  = (mean(excessRets) * 12) / (std(excessRets) * Math.sqrt(12));

  // Sortino — downside deviation
  const negExcess = excessRets.filter(r => r < 0);
  const downDev = negExcess.length > 0
    ? Math.sqrt(negExcess.reduce((s, r) => s + r * r, 0) / excessRets.length) * Math.sqrt(12)
    : 0.0001;
  const sortino = (mean(excessRets) * 12) / downDev;

  // Max drawdown
  let peak = 1, maxDD = 0;
  let cumVal = 1;
  const drawdownSeries = [];
  const cumRetSeries = [];
  monthlyRets.forEach((r, i) => {
    cumVal *= (1 + r);
    cumRetSeries.push({ i, cumRet: (cumVal - 1) * 100 });
    if (cumVal > peak) peak = cumVal;
    const dd = (cumVal - peak) / peak;
    drawdownSeries.push({ i, dd: dd * 100 });
    if (dd < maxDD) maxDD = dd;
  });

  // Calmar ratio
  const annReturn = Math.pow(cumVal, 12 / n) - 1;
  const calmar = maxDD !== 0 ? annReturn / Math.abs(maxDD) : null;

  // Rolling 12M Sharpe
  const rollingSharpe = [];
  for (let i = 11; i < n; i++) {
    const window = excessRets.slice(i - 11, i + 1);
    const rs = (mean(window) * 12) / (std(window) * Math.sqrt(12));
    rollingSharpe.push({ i, sharpe: isFinite(rs) ? +rs.toFixed(3) : null });
  }

  return {
    annReturn, annVol, sharpe, sortino, maxDD,
    calmar, cumVal,
    drawdownSeries, cumRetSeries, rollingSharpe, n,
  };
}

// ── Formatting ────────────────────────────────────────────────────────────────
function pct(v, d = 2) {
  if (v == null || isNaN(v)) return '—';
  return (v * 100).toFixed(d) + '%';
}
function n2(v, d = 2) {
  if (v == null || isNaN(v)) return '—';
  return v.toFixed(d);
}
function stars(t) {
  const a = Math.abs(t);
  if (a > 3.0) return '***';
  if (a > 2.0) return '**';
  if (a > 1.65) return '*';
  return '';
}

// ── Custom tooltip ────────────────────────────────────────────────────────────
const ChartTooltip = ({ active, payload, label, fmt }) =>
  active && payload?.length ? (
    <div className="bg-background border border-border px-3 py-2">
      {payload.map((p, i) => (
        <p key={i} className="font-mono text-[9px]" style={{ color: p.color }}>
          {p.name}: {fmt ? fmt(p.value) : p.value?.toFixed(3)}
        </p>
      ))}
    </div>
  ) : null;

// ── Metric card ───────────────────────────────────────────────────────────────
function MetricCard({ label, value, sub, good }) {
  const color = good === true ? '#22c55e' : good === false ? '#ef4444' : undefined;
  return (
    <div className="border border-border p-4">
      <p className="font-mono text-[7px] text-muted-foreground/50 tracking-widest mb-1">{label}</p>
      <p className="font-mono text-xl font-bold" style={{ color: color ?? 'inherit' }}>{value}</p>
      {sub && <p className="font-mono text-[8px] text-muted-foreground/40 mt-0.5">{sub}</p>}
    </div>
  );
}

// ── Factor attribution bar chart labels ──────────────────────────────────────
const FACTOR_COLS = {
  alpha: '#f97316', mkt: '#6366f1', smb: '#22c55e', hml: '#eab308',
};
const FACTOR_LABELS = { alpha: 'α Alpha', mkt: 'β Market', smb: 'β Size (SMB)', hml: 'β Value (HML)' };

// ── Main page ─────────────────────────────────────────────────────────────────
const DEFAULT_INPUT = 'AAPL 40, MSFT 30, NVDA 30';
const PERIOD_OPTIONS = [{ label: '3Y', months: 36 }, { label: '5Y', months: 60 }];

export default function RiskAttributionPage() {
  const [input, setInput]     = useState(DEFAULT_INPUT);
  const [period, setPeriod]   = useState(60);
  const [status, setStatus]   = useState('idle');
  const [error, setError]     = useState('');
  const [result, setResult]   = useState(null);

  const run = useCallback(async () => {
    // Parse holdings
    let holdings;
    try {
      const parts = input.split(',').map(p => p.trim()).filter(Boolean);
      let h = parts.map(p => {
        const [ticker, w] = p.trim().split(/\s+/);
        return { ticker: ticker.toUpperCase(), weight: w ? parseFloat(w) : null };
      });
      if (!h.length) throw new Error('Enter at least one ticker.');
      if (h.some(x => x.weight === null)) {
        const w = 100 / h.length;
        h = h.map(x => ({ ...x, weight: w }));
      }
      const total = h.reduce((s, x) => s + x.weight, 0);
      holdings = h.map(x => ({ ...x, weight: x.weight / total }));
    } catch (err) {
      setError(err.message); setStatus('error'); return;
    }

    setStatus('loading'); setError('');
    try {
      const tickers = holdings.map(h => h.ticker);
      const [priceRes, ffRes] = await Promise.all([
        fetch(`${API_BASE}/market-data/monthly?tickers=${tickers.join(',')}&months=${period}`),
        fetch(`${API_BASE}/market-data/ff-proxy?months=${period}`),
      ]);
      const { data: priceData } = await priceRes.json();
      const factors = await ffRes.json();

      const missing = tickers.filter(t => !priceData[t]);
      if (missing.length) throw new Error(`No data for: ${missing.join(', ')}`);

      const factorDates = new Set(factors.map(f => f.date));
      const tickerDateSets = tickers.map(t => new Set(priceData[t].map(r => r.date)));
      const dates = [...factorDates]
        .filter(d => tickerDateSets.every(s => s.has(d))).sort();
      if (dates.length < 12) throw new Error('Need ≥12 months of overlapping data.');

      // Portfolio returns
      const portRet = dates.map(d =>
        holdings.reduce((sum, h) => {
          const row = priceData[h.ticker].find(r => r.date === d);
          return sum + h.weight * (row?.ret ?? 0);
        }, 0)
      );

      const ffMap = Object.fromEntries(factors.map(f => [f.date, f]));
      const rfRets = dates.map(d => ffMap[d]?.rf ?? 0);

      // FF3 regression
      const y = dates.map((d, i) => portRet[i] - rfRets[i]);
      const X = dates.map(d => [1, ffMap[d]?.mkt ?? 0, ffMap[d]?.smb ?? 0, ffMap[d]?.hml ?? 0]);
      const reg = ols(y, X);
      const [alpha, bMkt, bSmb, bHml] = reg.beta;

      // Risk metrics
      const metrics = computeRiskMetrics(portRet, rfRets);

      // SPY returns for benchmark comparison
      const spyRets = dates.map(d => (ffMap[d]?.mkt ?? 0) + rfRets[dates.indexOf(d)]);
      let spyCum = 1;
      const benchmarkSeries = spyRets.map((r, i) => {
        spyCum *= (1 + r);
        return { i, bench: (spyCum - 1) * 100 };
      });
      const cumRetWithBench = metrics.cumRetSeries.map((pt, i) => ({
        ...pt,
        bench: benchmarkSeries[i]?.bench ?? null,
        label: dates[i],
      }));

      // Factor contribution: factor_return * beta for each month
      const factorContrib = {
        alpha: alpha * 12,
        mkt:   bMkt * mean(dates.map(d => ffMap[d]?.mkt ?? 0)) * 12,
        smb:   bSmb * mean(dates.map(d => ffMap[d]?.smb ?? 0)) * 12,
        hml:   bHml * mean(dates.map(d => ffMap[d]?.hml ?? 0)) * 12,
      };

      const rollingSharpeWithLabel = metrics.rollingSharpe.map(pt => ({
        ...pt,
        label: dates[pt.i],
      }));
      const drawdownWithLabel = metrics.drawdownSeries.map((pt, i) => ({
        ...pt,
        label: dates[i],
      }));

      setResult({
        metrics, reg, alpha, bMkt, bSmb, bHml,
        factorContrib, dates, portRet,
        cumRetWithBench, drawdownWithLabel,
        rollingSharpeWithLabel,
        holdingStr: holdings.map(h => `${h.ticker} ${(h.weight * 100).toFixed(0)}%`).join(' · '),
        periodLabel: PERIOD_OPTIONS.find(p => p.months === period)?.label ?? `${period}M`,
      });
      setStatus('done');
    } catch (err) {
      setError(err.message); setStatus('error');
    }
  }, [input, period]);

  const fAttrib = useMemo(() => {
    if (!result) return [];
    return Object.entries(result.factorContrib).map(([key, val]) => ({
      factor: FACTOR_LABELS[key], key, val: +(val * 100).toFixed(3),
    }));
  }, [result]);

  return (
    <>
      <Helmet><title>DDF·LAB — Risk & Factor Attribution</title></Helmet>

      <div className="min-h-screen px-4 sm:px-6 lg:px-8 py-10">
        <div className="max-w-6xl mx-auto">

          {/* Header */}
          <div className="mb-8 border-b border-border pb-6">
            <p className="font-mono text-[10px] text-primary tracking-widest mb-2">
              DDF·LAB / FACTOR & RISK ATTRIBUTION
            </p>
            <h1 className="font-mono text-2xl md:text-3xl font-bold tracking-tight text-foreground mb-3">
              Risk & Attribution Dashboard
            </h1>
            <p className="font-mono text-xs text-muted-foreground max-w-2xl leading-relaxed">
              Full risk decomposition: Sharpe, Sortino, max drawdown, Calmar.
              Fama-French 3-factor attribution showing how much return came from market, size, value, and true alpha.
            </p>
          </div>

          {/* Input */}
          <div className="border border-border p-5 mb-8">
            <p className="font-mono text-[8px] text-muted-foreground/50 tracking-widest mb-3">
              PORTFOLIO HOLDINGS · ticker weight, ... (equal-weight if no weight given)
            </p>
            <div className="flex gap-3 items-end flex-wrap">
              <input
                value={input} onChange={e => setInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && run()}
                placeholder="AAPL 40, MSFT 30, NVDA 30"
                className="font-mono text-xs bg-background border border-border px-3 py-2 flex-1 min-w-[240px] focus:border-primary outline-none"
              />
              <div className="flex gap-1.5">
                {PERIOD_OPTIONS.map(p => (
                  <button key={p.months} onClick={() => setPeriod(p.months)}
                    className={`font-mono text-[9px] tracking-widest px-3 py-2 border transition-colors ${
                      period === p.months ? 'border-primary text-primary bg-primary/5' : 'border-border text-muted-foreground hover:border-primary/50'
                    }`}>
                    {p.label}
                  </button>
                ))}
              </div>
              <button onClick={run} disabled={status === 'loading'}
                className="font-mono text-[9px] tracking-widest px-5 py-2 border border-primary text-primary hover:bg-primary/5 transition-colors disabled:opacity-40">
                {status === 'loading' ? 'LOADING...' : 'RUN →'}
              </button>
            </div>
            {error && <p className="font-mono text-[9px] text-destructive mt-2">{error}</p>}
          </div>

          {status === 'loading' && (
            <div className="border border-border p-12 text-center">
              <p className="font-mono text-[10px] text-muted-foreground tracking-widest animate-pulse">
                FETCHING PRICE HISTORY + FF FACTORS...
              </p>
            </div>
          )}

          {result && status === 'done' && (() => {
            const m = result.metrics;
            return (
              <div>
                {/* Portfolio label */}
                <div className="flex items-center justify-between mb-6">
                  <p className="font-mono text-[9px] text-muted-foreground/60 tracking-widest">
                    {result.holdingStr} · {result.periodLabel} · {m.n} observations
                  </p>
                  <p className="font-mono text-[9px] text-muted-foreground/40">
                    FF3 R² = {(result.reg.r2 * 100).toFixed(1)}% · adj-R² = {(result.reg.adjR2 * 100).toFixed(1)}%
                  </p>
                </div>

                {/* ── Scorecard ── */}
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mb-8">
                  <MetricCard label="ANN. RETURN" value={pct(m.annReturn, 1)}
                    good={m.annReturn > 0} />
                  <MetricCard label="ANN. VOLATILITY" value={pct(m.annVol, 1)}
                    sub="1σ annualised" />
                  <MetricCard label="SHARPE RATIO" value={n2(m.sharpe)}
                    sub="excess / vol" good={m.sharpe > 1} />
                  <MetricCard label="SORTINO RATIO" value={n2(m.sortino)}
                    sub="excess / downside" good={m.sortino > 1} />
                  <MetricCard label="MAX DRAWDOWN" value={pct(m.maxDD, 1)}
                    good={m.maxDD > -0.20} />
                  <MetricCard label="CALMAR RATIO" value={n2(m.calmar)}
                    sub="return / |maxDD|" good={(m.calmar ?? 0) > 0.5} />
                </div>

                {/* ── FF3 Attribution ── */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
                  <div className="border border-border p-5">
                    <p className="font-mono text-[8px] text-muted-foreground/50 tracking-widest mb-1">
                      FAMA-FRENCH 3-FACTOR ATTRIBUTION
                    </p>
                    <p className="font-mono text-[7px] text-muted-foreground/30 mb-4">
                      Annualised return attributed to each factor (factor return × beta × 12)
                    </p>
                    <ResponsiveContainer width="100%" height={200}>
                      <BarChart data={fAttrib} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                        <XAxis dataKey="factor" tick={{ fontFamily: 'monospace', fontSize: 8, fill: 'var(--muted-foreground)' }} />
                        <YAxis tickFormatter={v => v.toFixed(1) + '%'} tick={{ fontFamily: 'monospace', fontSize: 8, fill: 'var(--muted-foreground)' }} />
                        <Tooltip content={<ChartTooltip fmt={v => v?.toFixed(2) + '%'} />} />
                        <ReferenceLine y={0} stroke="rgba(255,255,255,0.15)" />
                        <Bar dataKey="val" name="Contribution">
                          {fAttrib.map((d, i) => (
                            <Cell key={i} fill={FACTOR_COLS[d.key]} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>

                    {/* Regression table */}
                    <div className="mt-4 pt-4 border-t border-border/30">
                      <table className="font-mono text-[8px] w-full border-collapse">
                        <thead>
                          <tr>
                            {['FACTOR', 'COEFF', 'STD ERR', 't-STAT', 'SIG'].map(h => (
                              <th key={h} className="text-left text-muted-foreground/40 pb-1.5 font-normal tracking-widest">{h}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {[
                            ['α (Alpha)', result.alpha, result.reg.se[0], result.reg.tStat[0]],
                            ['β MKT',    result.bMkt,   result.reg.se[1], result.reg.tStat[1]],
                            ['β SMB',    result.bSmb,   result.reg.se[2], result.reg.tStat[2]],
                            ['β HML',    result.bHml,   result.reg.se[3], result.reg.tStat[3]],
                          ].map(([label, coeff, se, t]) => {
                            const sig = stars(t);
                            const isAlpha = label.startsWith('α');
                            return (
                              <tr key={label} className="border-t border-border/20">
                                <td className="py-1.5 text-muted-foreground">{label}</td>
                                <td className="py-1.5" style={{ color: isAlpha ? (coeff > 0 ? '#22c55e' : '#ef4444') : 'inherit' }}>
                                  {isAlpha ? pct(coeff / 12) + '/mo' : n2(coeff, 3)}
                                </td>
                                <td className="py-1.5 text-muted-foreground/40">{n2(se, 4)}</td>
                                <td className="py-1.5 text-muted-foreground">{n2(t, 2)}</td>
                                <td className="py-1.5 text-primary">{sig}</td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* Rolling Sharpe */}
                  <div className="border border-border p-5">
                    <p className="font-mono text-[8px] text-muted-foreground/50 tracking-widest mb-1">
                      ROLLING 12-MONTH SHARPE RATIO
                    </p>
                    <p className="font-mono text-[7px] text-muted-foreground/30 mb-4">
                      Sharpe calculated on trailing 12 monthly excess returns
                    </p>
                    <ResponsiveContainer width="100%" height={200}>
                      <LineChart data={result.rollingSharpeWithLabel} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                        <XAxis dataKey="label" tick={{ fontFamily: 'monospace', fontSize: 7, fill: 'var(--muted-foreground)' }}
                          tickFormatter={d => d?.slice(0, 7)} interval="preserveStartEnd" />
                        <YAxis tick={{ fontFamily: 'monospace', fontSize: 8, fill: 'var(--muted-foreground)' }} />
                        <Tooltip content={<ChartTooltip fmt={v => v?.toFixed(2)} />} />
                        <ReferenceLine y={1} stroke="#22c55e44" strokeDasharray="4 4" />
                        <ReferenceLine y={0} stroke="rgba(255,255,255,0.15)" />
                        <Line type="monotone" dataKey="sharpe" name="Sharpe"
                          stroke="#6366f1" strokeWidth={1.5} dot={false} />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                {/* ── Cumulative return + drawdown ── */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
                  {/* Cumulative returns */}
                  <div className="border border-border p-5">
                    <p className="font-mono text-[8px] text-muted-foreground/50 tracking-widest mb-1">
                      CUMULATIVE RETURN vs SPY PROXY
                    </p>
                    <p className="font-mono text-[7px] text-muted-foreground/30 mb-4">
                      Portfolio vs SPY benchmark (MKT + RF), buy-and-hold
                    </p>
                    <ResponsiveContainer width="100%" height={200}>
                      <LineChart data={result.cumRetWithBench} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                        <XAxis dataKey="label" tick={{ fontFamily: 'monospace', fontSize: 7, fill: 'var(--muted-foreground)' }}
                          tickFormatter={d => d?.slice(0, 7)} interval="preserveStartEnd" />
                        <YAxis tickFormatter={v => v.toFixed(0) + '%'} tick={{ fontFamily: 'monospace', fontSize: 8, fill: 'var(--muted-foreground)' }} />
                        <Tooltip content={<ChartTooltip fmt={v => v?.toFixed(1) + '%'} />} />
                        <ReferenceLine y={0} stroke="rgba(255,255,255,0.15)" />
                        <Line type="monotone" dataKey="cumRet" name="Portfolio"
                          stroke="#6366f1" strokeWidth={1.5} dot={false} />
                        <Line type="monotone" dataKey="bench" name="SPY proxy"
                          stroke="rgba(255,255,255,0.2)" strokeWidth={1} dot={false} strokeDasharray="4 4" />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>

                  {/* Drawdown */}
                  <div className="border border-border p-5">
                    <p className="font-mono text-[8px] text-muted-foreground/50 tracking-widest mb-1">
                      DRAWDOWN — UNDERWATER EQUITY CURVE
                    </p>
                    <p className="font-mono text-[7px] text-muted-foreground/30 mb-4">
                      % below prior peak at each point in time
                    </p>
                    <ResponsiveContainer width="100%" height={200}>
                      <AreaChart data={result.drawdownWithLabel} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
                        <defs>
                          <linearGradient id="ddGrad" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="#ef4444" stopOpacity={0.3} />
                            <stop offset="100%" stopColor="#ef4444" stopOpacity={0.02} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                        <XAxis dataKey="label" tick={{ fontFamily: 'monospace', fontSize: 7, fill: 'var(--muted-foreground)' }}
                          tickFormatter={d => d?.slice(0, 7)} interval="preserveStartEnd" />
                        <YAxis tickFormatter={v => v.toFixed(0) + '%'} tick={{ fontFamily: 'monospace', fontSize: 8, fill: 'var(--muted-foreground)' }} />
                        <Tooltip content={<ChartTooltip fmt={v => v?.toFixed(1) + '%'} />} />
                        <ReferenceLine y={0} stroke="rgba(255,255,255,0.15)" />
                        <Area type="monotone" dataKey="dd" name="Drawdown"
                          stroke="#ef4444" strokeWidth={1} fill="url(#ddGrad)" />
                      </AreaChart>
                    </ResponsiveContainer>
                    <p className="font-mono text-[8px] mt-3"
                      style={{ color: m.maxDD < -0.3 ? '#ef4444' : m.maxDD < -0.15 ? '#eab308' : '#22c55e' }}>
                      Max Drawdown: {pct(m.maxDD, 1)} · Calmar: {n2(m.calmar)}
                    </p>
                  </div>
                </div>

                {/* Footer note */}
                <div className="border-t border-border pt-4">
                  <p className="font-mono text-[8px] text-muted-foreground/30 tracking-wider leading-relaxed">
                    FF3 PROXIES: MKT = SPY−BIL · SMB = IWM−SPY · HML = SPYV−SPYG · RF = BIL.
                    MONTHLY DATA VIA YAHOO FINANCE. PAST PERFORMANCE IS NOT INDICATIVE OF FUTURE RESULTS.
                  </p>
                </div>
              </div>
            );
          })()}
        </div>
      </div>
    </>
  );
}
