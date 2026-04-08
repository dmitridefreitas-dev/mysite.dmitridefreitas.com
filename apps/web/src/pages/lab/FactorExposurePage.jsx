import React, { useState, useCallback } from 'react';
import { Helmet } from 'react-helmet';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ReferenceLine,
  ResponsiveContainer, Cell, LineChart, Line, CartesianGrid, Legend,
} from 'recharts';

// ── Math helpers ─────────────────────────────────────────────────────────────────

function mean(arr) { return arr.reduce((a, b) => a + b, 0) / arr.length; }

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
  // β = (X'X)⁻¹ X'y
  const Xt  = X[0].map((_, j) => X.map(row => row[j]));
  const XtX = matMul(Xt, X);
  const XtXi = matInverse(XtX);
  const Xty  = matMul(Xt, y.map(v => [v]));
  const beta  = matMul(XtXi, Xty).map(r => r[0]);

  const n = y.length, k = beta.length;
  const yHat = X.map(row => row.reduce((s, x, j) => s + x * beta[j], 0));
  const resid = y.map((v, i) => v - yHat[i]);
  const rss   = resid.reduce((s, r) => s + r * r, 0);
  const ybar  = mean(y);
  const tss   = y.reduce((s, v) => s + (v - ybar) ** 2, 0);
  const r2    = 1 - rss / tss;
  const adjR2 = 1 - (1 - r2) * (n - 1) / (n - k);
  const s2    = rss / (n - k);
  const se    = XtXi.map((row, i) => Math.sqrt(Math.abs(row[i] * s2)));
  const tStat = beta.map((b, i) => b / (se[i] || 1e-10));

  return { beta, se, tStat, r2, adjR2, n };
}

function stars(t) {
  const a = Math.abs(t);
  if (a > 3.0) return '***';
  if (a > 2.0) return '**';
  if (a > 1.65) return '*';
  return '';
}

function pct(v, d = 2) { return (v * 100).toFixed(d) + '%'; }

// ── Holdings parser ───────────────────────────────────────────────────────────────
// Accepts: "AAPL 40, MSFT 30, GOOGL 30" or "AAPL" (100% single ticker)

function parseHoldings(input) {
  const parts = input.split(',').map(p => p.trim()).filter(Boolean);
  let holdings = [];
  for (const part of parts) {
    const tokens = part.trim().split(/\s+/);
    const ticker = tokens[0].toUpperCase();
    const weight = tokens[1] ? parseFloat(tokens[1]) : null;
    if (!ticker) continue;
    holdings.push({ ticker, weight });
  }
  if (!holdings.length) throw new Error('No valid holdings entered.');
  // If any weights are missing, assign equal weight
  if (holdings.some(h => h.weight === null)) {
    const w = 100 / holdings.length;
    holdings = holdings.map(h => ({ ...h, weight: w }));
  }
  const total = holdings.reduce((s, h) => s + h.weight, 0);
  holdings = holdings.map(h => ({ ...h, weight: h.weight / total }));
  return holdings;
}

// ── Page ─────────────────────────────────────────────────────────────────────────

const API_BASE = window.location.hostname === 'localhost'
  ? '/hcgi/api'
  : 'https://newsapi-xspv.onrender.com';

const DEFAULT_HOLDINGS = 'AAPL 30, MSFT 25, AMZN 20, GOOGL 15, NVDA 10';
const PERIOD_OPTIONS = [
  { label: '3Y', months: 36 },
  { label: '5Y', months: 60 },
];
const FACTOR_LABELS = { alpha: 'α (ALPHA)', mkt: 'β MKT', smb: 'β SMB', hml: 'β HML' };
const FACTOR_COLORS = { alpha: '#f97316', mkt: '#6366f1', smb: '#22c55e', hml: '#eab308' };

export default function FactorExposurePage() {
  const [holdingInput, setHoldingInput] = useState(DEFAULT_HOLDINGS);
  const [period, setPeriod]             = useState(60);
  const [status, setStatus]             = useState('idle');
  const [errorMsg, setErrorMsg]         = useState('');
  const [result, setResult]             = useState(null);

  const run = useCallback(async () => {
    let holdings;
    try { holdings = parseHoldings(holdingInput); }
    catch (err) { setErrorMsg(err.message); setStatus('error'); return; }

    const tickers = holdings.map(h => h.ticker);
    setStatus('loading'); setErrorMsg('');

    try {
      const [priceRes, ffRes] = await Promise.all([
        fetch(`${API_BASE}/market-data/monthly?tickers=${tickers.join(',')}&months=${period}`),
        fetch(`${API_BASE}/market-data/ff-proxy?months=${period}`),
      ]);
      const { data: priceData, errors: priceErrors } = await priceRes.json();
      const factors = await ffRes.json();

      const badTickers = tickers.filter(t => !priceData[t]);
      if (badTickers.length) throw new Error(`No data for: ${badTickers.join(', ')}`);

      // Align dates: intersect tickers + factors
      const factorDates = new Set(factors.map(f => f.date));
      const tickerDateSets = tickers.map(t => new Set(priceData[t].map(r => r.date)));
      const commonDates = [...factorDates].filter(d => tickerDateSets.every(s => s.has(d))).sort();
      if (commonDates.length < 12) throw new Error('Insufficient overlapping data (need ≥ 12 months).');

      // Portfolio return = weighted sum of ticker returns
      const portRet = commonDates.map(date => {
        return holdings.reduce((sum, h) => {
          const row = priceData[h.ticker].find(r => r.date === date);
          return sum + h.weight * (row?.ret ?? 0);
        }, 0);
      });

      // Build regression arrays: y = Rp - rf, X = [1, mkt, smb, hml]
      const ffMap = Object.fromEntries(factors.map(f => [f.date, f]));
      const y = commonDates.map((d, i) => portRet[i] - (ffMap[d]?.rf ?? 0));
      const X = commonDates.map(d => [
        1,
        ffMap[d]?.mkt ?? 0,
        ffMap[d]?.smb ?? 0,
        ffMap[d]?.hml ?? 0,
      ]);

      const reg = ols(y, X);
      const [alpha, betaMkt, betaSmb, betaHml] = reg.beta;
      const [tAlpha, tMkt, tSmb, tHml]         = reg.tStat;

      // Rolling fit for chart (actual vs fitted)
      const fitted = X.map(row => row.reduce((s, x, j) => s + x * reg.beta[j], 0));
      const chartData = commonDates.map((date, i) => ({
        date,
        actual:  +(portRet[i] * 100).toFixed(3),
        fitted:  +(fitted[i] * 100).toFixed(3),
        ff_rf:   +((ffMap[date]?.rf ?? 0) * 100).toFixed(3),
      }));

      // Cumulative return chart
      let cumActual = 1, cumFitted = 1;
      const cumData = commonDates.map((date, i) => {
        cumActual  *= (1 + portRet[i]);
        cumFitted  *= (1 + fitted[i]);
        return {
          date,
          portfolio: +((cumActual - 1) * 100).toFixed(2),
          fitted:    +((cumFitted - 1) * 100).toFixed(2),
        };
      });

      setResult({
        holdings, tickers,
        alpha, betaMkt, betaSmb, betaHml,
        tAlpha, tMkt, tSmb, tHml,
        r2: reg.r2, adjR2: reg.adjR2,
        n: reg.n,
        chartData, cumData,
        se: reg.se,
      });
      setStatus('done');
    } catch (err) {
      setErrorMsg(err.message);
      setStatus('error');
    }
  }, [holdingInput, period]);

  const loadingBar = [
    { name: 'α ALPHA', value: result?.alpha * 100 ?? 0 },
    { name: 'β MKT',   value: result?.betaMkt ?? 0 },
    { name: 'β SMB',   value: result?.betaSmb ?? 0 },
    { name: 'β HML',   value: result?.betaHml ?? 0 },
  ];

  return (
    <>
      <Helmet><title>DDF·LAB — Factor Exposure</title></Helmet>

      <div className="min-h-screen px-4 sm:px-6 lg:px-8 py-8">
        <div className="max-w-5xl mx-auto">

          {/* Header */}
          <div className="mb-6 border-b border-border pb-4">
            <p className="font-mono text-[9px] text-primary tracking-widest mb-1">[10] FACTOR EXPOSURE</p>
            <h1 className="font-mono text-xl font-bold tracking-tight text-foreground">Factor Exposure Analyzer</h1>
            <p className="font-mono text-[10px] text-muted-foreground mt-1">
              Fama-French 3-Factor regression · ETF proxies (MKT=SPY, SMB=IWM-SPY, HML=SPYV-SPYG)
            </p>
          </div>

          {/* Controls */}
          <div className="border border-border p-4 mb-6 space-y-4">
            <div>
              <label className="font-mono text-[9px] text-muted-foreground tracking-widest block mb-1">
                HOLDINGS — format: "AAPL 30, MSFT 25, GOOGL 20" (weights optional, default = equal)
              </label>
              <input
                value={holdingInput}
                onChange={e => setHoldingInput(e.target.value)}
                className="w-full bg-background border border-border font-mono text-xs px-3 py-2 text-foreground focus:outline-none focus:border-primary"
                placeholder="AAPL 30, MSFT 25, GOOGL 20, AMZN 15, NVDA 10"
              />
            </div>

            <div className="flex flex-wrap gap-4 items-end">
              <div>
                <label className="font-mono text-[9px] text-muted-foreground tracking-widest block mb-1">ESTIMATION PERIOD</label>
                <div className="flex border border-border overflow-hidden">
                  {PERIOD_OPTIONS.map(p => (
                    <button
                      key={p.months}
                      onClick={() => setPeriod(p.months)}
                      className={`px-4 py-1.5 font-mono text-[10px] tracking-widest transition-colors ${
                        period === p.months
                          ? 'bg-primary text-primary-foreground'
                          : 'text-muted-foreground hover:bg-muted'
                      }`}
                    >
                      {p.label}
                    </button>
                  ))}
                </div>
              </div>

              <button
                onClick={run}
                disabled={status === 'loading'}
                className="px-6 py-1.5 border border-primary font-mono text-[10px] tracking-widest text-primary hover:bg-primary hover:text-primary-foreground transition-colors disabled:opacity-50"
              >
                {status === 'loading' ? 'COMPUTING...' : '[ANALYZE →]'}
              </button>
            </div>

            {status === 'error' && (
              <p className="font-mono text-[10px] text-destructive">ERROR: {errorMsg}</p>
            )}
          </div>

          {/* Results */}
          {status === 'done' && result && (
            <div className="space-y-6">

              {/* Factor loadings */}
              <div className="grid md:grid-cols-2 gap-4">

                {/* Regression summary */}
                <div className="border border-border p-4">
                  <p className="font-mono text-[9px] text-muted-foreground tracking-widest mb-3">REGRESSION SUMMARY</p>
                  <table className="w-full font-mono text-[10px]">
                    <thead>
                      <tr className="border-b border-border">
                        <th className="text-left text-muted-foreground pb-1.5">FACTOR</th>
                        <th className="text-right text-muted-foreground pb-1.5">LOADING</th>
                        <th className="text-right text-muted-foreground pb-1.5">T-STAT</th>
                        <th className="text-right text-muted-foreground pb-1.5">SIG</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/50">
                      {[
                        ['α (alpha/mo)', result.alpha,   result.tAlpha],
                        ['β MKT',        result.betaMkt, result.tMkt],
                        ['β SMB',        result.betaSmb, result.tSmb],
                        ['β HML',        result.betaHml, result.tHml],
                      ].map(([label, coef, t]) => (
                        <tr key={label}>
                          <td className="py-1.5 text-foreground/80">{label}</td>
                          <td className={`py-1.5 text-right ${coef >= 0 ? 'text-terminal-green' : 'text-destructive'}`}>
                            {label.startsWith('α') ? pct(coef) : coef.toFixed(3)}
                          </td>
                          <td className="py-1.5 text-right text-muted-foreground">{t.toFixed(2)}</td>
                          <td className="py-1.5 text-right text-primary">{stars(t)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  <div className="mt-3 pt-3 border-t border-border space-y-1">
                    <div className="flex justify-between font-mono text-[10px]">
                      <span className="text-muted-foreground">R²</span>
                      <span className="text-primary">{(result.r2 * 100).toFixed(1)}%</span>
                    </div>
                    <div className="flex justify-between font-mono text-[10px]">
                      <span className="text-muted-foreground">ADJ. R²</span>
                      <span className="text-primary">{(result.adjR2 * 100).toFixed(1)}%</span>
                    </div>
                    <div className="flex justify-between font-mono text-[10px]">
                      <span className="text-muted-foreground">OBSERVATIONS</span>
                      <span className="text-muted-foreground">{result.n}</span>
                    </div>
                  </div>
                  <p className="font-mono text-[8px] text-muted-foreground/50 mt-2">
                    *** p&lt;0.01 · ** p&lt;0.05 · * p&lt;0.10
                  </p>
                </div>

                {/* Factor loadings bar chart */}
                <div className="border border-border p-4">
                  <p className="font-mono text-[9px] text-muted-foreground tracking-widest mb-3">FACTOR LOADINGS</p>
                  <ResponsiveContainer width="100%" height={200}>
                    <BarChart
                      data={[
                        { name: 'α×100', value: +(result.alpha * 100).toFixed(3), fill: result.alpha >= 0 ? '#22c55e' : '#ef4444' },
                        { name: 'β MKT', value: +result.betaMkt.toFixed(3),   fill: '#6366f1' },
                        { name: 'β SMB', value: +result.betaSmb.toFixed(3),   fill: '#22c55e' },
                        { name: 'β HML', value: +result.betaHml.toFixed(3),   fill: '#eab308' },
                      ]}
                      margin={{ top: 5, right: 10, bottom: 5, left: 10 }}
                    >
                      <XAxis dataKey="name" tick={{ fontFamily: 'IBM Plex Mono', fontSize: 9 }} />
                      <YAxis tick={{ fontFamily: 'IBM Plex Mono', fontSize: 9 }} />
                      <ReferenceLine y={0} stroke="hsl(var(--border))" />
                      <Tooltip
                        formatter={v => [v.toFixed(3), 'Loading']}
                        contentStyle={{ fontFamily: 'IBM Plex Mono', fontSize: 10 }}
                      />
                      <Bar dataKey="value" radius={[2, 2, 0, 0]}>
                        {[
                          { fill: result.alpha >= 0 ? '#22c55e' : '#ef4444' },
                          { fill: '#6366f1' },
                          { fill: '#22c55e' },
                          { fill: '#eab308' },
                        ].map((entry, i) => <Cell key={i} fill={entry.fill} />)}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>

                  {/* Holdings breakdown */}
                  <div className="mt-3 pt-3 border-t border-border">
                    <p className="font-mono text-[9px] text-muted-foreground tracking-widest mb-2">PORTFOLIO WEIGHTS</p>
                    {result.holdings.map(h => (
                      <div key={h.ticker} className="flex items-center gap-2 mb-1">
                        <span className="font-mono text-[10px] text-muted-foreground w-14 shrink-0">{h.ticker}</span>
                        <div className="flex-1 h-1.5 bg-muted/40 relative">
                          <div
                            className="absolute inset-y-0 left-0 bg-primary"
                            style={{ width: `${h.weight * 100}%` }}
                          />
                        </div>
                        <span className="font-mono text-[10px] text-primary w-12 text-right shrink-0">
                          {(h.weight * 100).toFixed(1)}%
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Cumulative return: actual vs FF-fitted */}
              <div className="border border-border p-4">
                <p className="font-mono text-[9px] text-muted-foreground tracking-widest mb-3">
                  CUMULATIVE RETURN — ACTUAL vs FF3 MODEL
                </p>
                <ResponsiveContainer width="100%" height={260}>
                  <LineChart data={result.cumData} margin={{ top: 5, right: 20, bottom: 5, left: 10 }}>
                    <CartesianGrid strokeDasharray="2 4" stroke="hsl(var(--border))" opacity={0.4} />
                    <XAxis
                      dataKey="date"
                      tick={{ fontFamily: 'IBM Plex Mono', fontSize: 8 }}
                      tickFormatter={d => d.slice(0, 7)}
                      interval="preserveStartEnd"
                    />
                    <YAxis
                      tick={{ fontFamily: 'IBM Plex Mono', fontSize: 8 }}
                      tickFormatter={v => v.toFixed(0) + '%'}
                    />
                    <Tooltip
                      formatter={v => [v.toFixed(2) + '%']}
                      contentStyle={{ fontFamily: 'IBM Plex Mono', fontSize: 10 }}
                    />
                    <ReferenceLine y={0} stroke="hsl(var(--border))" />
                    <Line type="monotone" dataKey="portfolio" stroke="#22c55e" dot={false} strokeWidth={1.5} name="Portfolio" />
                    <Line type="monotone" dataKey="fitted"    stroke="#6366f1" dot={false} strokeWidth={1.5} strokeDasharray="4 2" name="FF3 Fitted" />
                    <Legend wrapperStyle={{ fontFamily: 'IBM Plex Mono', fontSize: 9 }} />
                  </LineChart>
                </ResponsiveContainer>
                <p className="font-mono text-[8px] text-muted-foreground/50 mt-2">
                  · FITTED = α + β_mkt·MKT + β_smb·SMB + β_hml·HML (cumulated monthly) ·
                  GAP BETWEEN LINES = UNEXPLAINED IDIOSYNCRATIC RETURN
                </p>
              </div>

            </div>
          )}

          {status === 'idle' && (
            <div className="border border-border p-8 text-center">
              <p className="font-mono text-[10px] text-muted-foreground">
                Enter holdings above and press <span className="text-primary">[ANALYZE →]</span>
              </p>
            </div>
          )}

          {status === 'loading' && (
            <div className="border border-border p-8 text-center">
              <p className="font-mono text-[10px] text-muted-foreground animate-pulse">
                FETCHING PRICE DATA AND FACTOR RETURNS...
              </p>
            </div>
          )}

        </div>
      </div>
    </>
  );
}
