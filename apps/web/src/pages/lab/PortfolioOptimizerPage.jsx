import React, { useState, useCallback } from 'react';
import { Helmet } from 'react-helmet';
import {
  ScatterChart, Scatter, XAxis, YAxis, Tooltip,
  ResponsiveContainer, CartesianGrid, Legend,
} from 'recharts';

// ── Matrix / stats helpers ────────────────────────────────────────────────────────

function mean(arr) { return arr.reduce((a, b) => a + b, 0) / arr.length; }

function sampleCov(x, y) {
  const mx = mean(x), my = mean(y), n = x.length;
  return x.reduce((s, v, i) => s + (v - mx) * (y[i] - my), 0) / (n - 1);
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
    if (Math.abs(p) < 1e-12) return null;
    for (let j = 0; j < 2 * n; j++) M[col][j] /= p;
    for (let row = 0; row < n; row++) {
      if (row === col) continue;
      const f = M[row][col];
      for (let j = 0; j < 2 * n; j++) M[row][j] -= f * M[col][j];
    }
  }
  return M.map(row => row.slice(n));
}

function portfolioStats(w, mu, Sigma) {
  const n = w.length;
  const ret = w.reduce((s, wi, i) => s + wi * mu[i], 0);
  let variance = 0;
  for (let i = 0; i < n; i++)
    for (let j = 0; j < n; j++) variance += w[i] * w[j] * Sigma[i][j];
  return { ret, vol: Math.sqrt(Math.max(variance, 0)) };
}

function dirichlet(n) {
  const raw = Array.from({ length: n }, () => -Math.log(Math.random() + 1e-10));
  const s = raw.reduce((a, b) => a + b, 0);
  return raw.map(x => x / s);
}

function pct(v, decimals = 1) { return (v * 100).toFixed(decimals) + '%'; }

// ── Optimization ─────────────────────────────────────────────────────────────────

function optimize(tickerReturns, tickers, rfAnnual) {
  // Align dates across tickers
  const dateSet = Object.keys(tickerReturns).reduce((s, t) => {
    const dates = new Set(tickerReturns[t].map(r => r.date));
    return s === null ? dates : new Set([...s].filter(d => dates.has(d)));
  }, null);
  if (!dateSet || dateSet.size < 12) throw new Error('Not enough overlapping months (need ≥ 12).');

  const sortedDates = [...dateSet].sort();
  const rets = tickers.map(t =>
    sortedDates.map(d => tickerReturns[t].find(r => r.date === d)?.ret ?? 0)
  );
  const n = tickers.length, T = sortedDates.length;

  // Annualized means and covariance
  const mu     = rets.map(r => mean(r) * 12);
  const Sigma  = Array.from({ length: n }, (_, i) =>
    Array.from({ length: n }, (_, j) => sampleCov(rets[i], rets[j]) * 12));

  const rf = rfAnnual;

  // ── Monte Carlo (long-only) ───────────────────────────────────────────────────
  const MC_N = 3000;
  const mcPts = [];
  let maxSharpe = -Infinity, minVol = Infinity;
  let wTan = null, wMin = null;

  for (let i = 0; i < MC_N; i++) {
    const w = dirichlet(n);
    const { ret, vol } = portfolioStats(w, mu, Sigma);
    const sharpe = (ret - rf) / vol;
    mcPts.push({ vol, ret, sharpe, w });
    if (sharpe > maxSharpe) { maxSharpe = sharpe; wTan = w; }
    if (vol < minVol)       { minVol = vol;       wMin = w; }
  }

  // ── Analytical min-variance (unconstrained) ───────────────────────────────────
  const SigmaInv = matInverse(Sigma);
  if (SigmaInv) {
    const ones = Array.from({ length: n }, () => [1]);
    const SigInvOnes = matMul(SigmaInv, ones).map(r => r[0]);
    const denom = SigInvOnes.reduce((s, v) => s + v, 0);
    const wMinA = SigInvOnes.map(v => v / denom);
    const { ret: retA, vol: volA } = portfolioStats(wMinA, mu, Sigma);
    if (volA < minVol) { minVol = volA; wMin = wMinA; }
  }

  const tanPt = portfolioStats(wTan, mu, Sigma);
  const minPt = portfolioStats(wMin, mu, Sigma);

  return {
    mcPts,
    tangency: { ...tanPt, sharpe: (tanPt.ret - rf) / tanPt.vol, weights: wTan },
    minVar:   { ...minPt, sharpe: (minPt.ret - rf) / minPt.vol, weights: wMin },
    tickers, rf, T,
  };
}

// ── Custom tooltip ────────────────────────────────────────────────────────────────

const CustomTooltip = ({ active, payload }) => {
  if (!active || !payload?.length) return null;
  const d = payload[0]?.payload;
  if (!d) return null;
  return (
    <div className="bg-card border border-border p-2 font-mono text-[10px] space-y-0.5">
      <p>VOL: <span className="text-primary">{pct(d.vol)}</span></p>
      <p>RET: <span className="text-primary">{pct(d.ret)}</span></p>
      {d.sharpe != null && <p>SHARPE: <span className="text-primary">{d.sharpe.toFixed(2)}</span></p>}
    </div>
  );
};

// ── Page ─────────────────────────────────────────────────────────────────────────

const API_BASE = window.location.hostname === 'localhost'
  ? '/hcgi/api'
  : 'https://newsapi-xspv.onrender.com';

const DEFAULT_TICKERS = 'AAPL, MSFT, GOOGL, AMZN, SPY, BND';
const PERIOD_OPTIONS = [
  { label: '1Y', months: 12 },
  { label: '3Y', months: 36 },
  { label: '5Y', months: 60 },
];

export default function PortfolioOptimizerPage() {
  const [tickerInput, setTickerInput] = useState(DEFAULT_TICKERS);
  const [period, setPeriod]           = useState(36);
  const [rfRate, setRfRate]           = useState('4.5');
  const [status, setStatus]           = useState('idle'); // idle | loading | done | error
  const [errorMsg, setErrorMsg]       = useState('');
  const [result, setResult]           = useState(null);

  const run = useCallback(async () => {
    const tickers = tickerInput.split(',').map(t => t.trim().toUpperCase()).filter(Boolean);
    if (tickers.length < 2) { setErrorMsg('Enter at least 2 tickers.'); setStatus('error'); return; }
    if (tickers.length > 10) { setErrorMsg('Max 10 tickers.'); setStatus('error'); return; }

    setStatus('loading'); setErrorMsg('');
    try {
      const res = await fetch(
        `${API_BASE}/market-data/monthly?tickers=${tickers.join(',')}&months=${period}`
      );
      const json = await res.json();
      const { data, errors } = json;

      const failed = Object.keys(errors || {});
      if (failed.length) {
        const ok = tickers.filter(t => !failed.includes(t));
        if (ok.length < 2) throw new Error(`Could not fetch data for: ${failed.join(', ')}`);
      }

      const rf = parseFloat(rfRate) / 100 || 0.045;
      const optimized = optimize(data, tickers.filter(t => data[t]), rf);
      setResult(optimized);
      setStatus('done');
    } catch (err) {
      setErrorMsg(err.message);
      setStatus('error');
    }
  }, [tickerInput, period, rfRate]);

  const mcColor = getComputedStyle(document.documentElement).getPropertyValue('--muted-foreground').trim()
    ? `hsl(${getComputedStyle(document.documentElement).getPropertyValue('--muted-foreground').trim()})`
    : '#aaa';
  const cloudPts = result?.mcPts ?? [];

  return (
    <>
      <Helmet><title>DDF·LAB — Portfolio Optimizer</title></Helmet>

      <div className="min-h-screen px-4 sm:px-6 lg:px-8 py-8">
        <div className="max-w-5xl mx-auto">

          {/* Header */}
          <div className="mb-6 border-b border-border pb-4">
            <p className="font-mono text-[9px] text-primary tracking-widest mb-1">[9] PORTFOLIO OPTIMIZER</p>
            <h1 className="font-mono text-xl font-bold tracking-tight text-foreground">Efficient Frontier</h1>
            <p className="font-mono text-[10px] text-muted-foreground mt-1">
              Mean-variance optimization · Monte Carlo simulation · Tangency portfolio
            </p>
          </div>

          {/* Controls */}
          <div className="border border-border p-4 mb-6 space-y-4">
            <div>
              <label className="font-mono text-[9px] text-muted-foreground tracking-widest block mb-1">
                TICKERS (comma-separated, max 10)
              </label>
              <input
                value={tickerInput}
                onChange={e => setTickerInput(e.target.value)}
                className="w-full bg-background border border-border font-mono text-xs px-3 py-2 text-foreground focus:outline-none focus:border-primary"
                placeholder="AAPL, MSFT, GOOGL, SPY, BND"
              />
            </div>

            <div className="flex flex-wrap gap-4 items-end">
              {/* Period */}
              <div>
                <label className="font-mono text-[9px] text-muted-foreground tracking-widest block mb-1">PERIOD</label>
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

              {/* Risk-free rate */}
              <div>
                <label className="font-mono text-[9px] text-muted-foreground tracking-widest block mb-1">
                  RISK-FREE RATE (%)
                </label>
                <input
                  value={rfRate}
                  onChange={e => setRfRate(e.target.value)}
                  className="w-24 bg-background border border-border font-mono text-xs px-3 py-1.5 text-foreground focus:outline-none focus:border-primary"
                  type="number" step="0.1" min="0" max="20"
                />
              </div>

              {/* Run button */}
              <button
                onClick={run}
                disabled={status === 'loading'}
                className="px-6 py-1.5 border border-primary font-mono text-[10px] tracking-widest text-primary hover:bg-primary hover:text-primary-foreground transition-colors disabled:opacity-50"
              >
                {status === 'loading' ? 'COMPUTING...' : '[OPTIMIZE →]'}
              </button>
            </div>

            {status === 'error' && (
              <p className="font-mono text-[10px] text-destructive">ERROR: {errorMsg}</p>
            )}
          </div>

          {/* Results */}
          {status === 'done' && result && (
            <div className="space-y-6">

              {/* Efficient Frontier chart */}
              <div className="border border-border p-4">
                <p className="font-mono text-[9px] text-muted-foreground tracking-widest mb-3">EFFICIENT FRONTIER</p>
                <ResponsiveContainer width="100%" height={380}>
                  <ScatterChart margin={{ top: 10, right: 20, bottom: 20, left: 20 }}>
                    <CartesianGrid strokeDasharray="2 4" stroke="hsl(var(--border))" opacity={0.4} />
                    <XAxis
                      dataKey="vol" type="number" name="Volatility"
                      tickFormatter={v => pct(v)}
                      tick={{ fontFamily: 'IBM Plex Mono', fontSize: 9 }}
                      label={{ value: 'VOLATILITY (annualized)', position: 'insideBottom', offset: -10, fontFamily: 'IBM Plex Mono', fontSize: 9 }}
                    />
                    <YAxis
                      dataKey="ret" type="number" name="Return"
                      tickFormatter={v => pct(v)}
                      tick={{ fontFamily: 'IBM Plex Mono', fontSize: 9 }}
                      label={{ value: 'RETURN (annualized)', angle: -90, position: 'insideLeft', fontFamily: 'IBM Plex Mono', fontSize: 9 }}
                    />
                    <Tooltip content={<CustomTooltip />} />

                    {/* Cloud of random portfolios */}
                    <Scatter name="Random Portfolios" data={cloudPts} fill={mcColor} opacity={0.45} r={2} />

                    {/* Tangency portfolio */}
                    <Scatter
                      name={`Max Sharpe (${result.tangency.sharpe.toFixed(2)})`}
                      data={[result.tangency]}
                      fill="#22c55e" r={8}
                    />

                    {/* Minimum variance */}
                    <Scatter
                      name="Min Volatility"
                      data={[result.minVar]}
                      fill="#6366f1" r={8}
                    />

                    <Legend
                      wrapperStyle={{ fontFamily: 'IBM Plex Mono', fontSize: 9, paddingTop: 16 }}
                    />
                  </ScatterChart>
                </ResponsiveContainer>
              </div>

              {/* Portfolio stats side-by-side */}
              <div className="grid md:grid-cols-2 gap-4">

                {/* Tangency */}
                <div className="border border-border p-4">
                  <p className="font-mono text-[9px] text-terminal-green tracking-widest mb-3">
                    MAX SHARPE PORTFOLIO
                  </p>
                  <div className="space-y-1.5 mb-4">
                    {[
                      ['EXP. RETURN', pct(result.tangency.ret)],
                      ['VOLATILITY',  pct(result.tangency.vol)],
                      ['SHARPE RATIO', result.tangency.sharpe.toFixed(3)],
                    ].map(([k, v]) => (
                      <div key={k} className="flex justify-between font-mono text-[10px]">
                        <span className="text-muted-foreground">{k}</span>
                        <span className="text-terminal-green">{v}</span>
                      </div>
                    ))}
                  </div>
                  <p className="font-mono text-[9px] text-muted-foreground tracking-widest mb-2">WEIGHTS</p>
                  <div className="space-y-1">
                    {result.tickers.map((t, i) => (
                      <div key={t} className="flex items-center gap-2">
                        <span className="font-mono text-[10px] text-muted-foreground w-14 shrink-0">{t}</span>
                        <div className="flex-1 h-1.5 bg-muted/40 relative overflow-hidden">
                          <div
                            className="absolute inset-y-0 left-0 bg-terminal-green"
                            style={{ width: `${Math.max(0, result.tangency.weights[i]) * 100}%` }}
                          />
                        </div>
                        <span className="font-mono text-[10px] text-terminal-green w-12 text-right shrink-0">
                          {pct(result.tangency.weights[i])}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Min-var */}
                <div className="border border-border p-4">
                  <p className="font-mono text-[9px] text-primary tracking-widest mb-3">
                    MIN VOLATILITY PORTFOLIO
                  </p>
                  <div className="space-y-1.5 mb-4">
                    {[
                      ['EXP. RETURN', pct(result.minVar.ret)],
                      ['VOLATILITY',  pct(result.minVar.vol)],
                      ['SHARPE RATIO', result.minVar.sharpe.toFixed(3)],
                    ].map(([k, v]) => (
                      <div key={k} className="flex justify-between font-mono text-[10px]">
                        <span className="text-muted-foreground">{k}</span>
                        <span className="text-primary">{v}</span>
                      </div>
                    ))}
                  </div>
                  <p className="font-mono text-[9px] text-muted-foreground tracking-widest mb-2">WEIGHTS</p>
                  <div className="space-y-1">
                    {result.tickers.map((t, i) => (
                      <div key={t} className="flex items-center gap-2">
                        <span className="font-mono text-[10px] text-muted-foreground w-14 shrink-0">{t}</span>
                        <div className="flex-1 h-1.5 bg-muted/40 relative overflow-hidden">
                          <div
                            className="absolute inset-y-0 left-0 bg-primary"
                            style={{ width: `${Math.max(0, result.minVar.weights[i]) * 100}%` }}
                          />
                        </div>
                        <span className="font-mono text-[10px] text-primary w-12 text-right shrink-0">
                          {pct(result.minVar.weights[i])}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <p className="font-mono text-[8px] text-muted-foreground/50">
                · {result.T} monthly observations · {result.mcPts.length.toLocaleString()} simulated portfolios ·
                LONG-ONLY CONSTRAINT · ETF PROXIES FOR FACTOR DATA ·
                PAST PERFORMANCE DOES NOT PREDICT FUTURE RESULTS
              </p>
            </div>
          )}

          {status === 'idle' && (
            <div className="border border-border p-8 text-center">
              <p className="font-mono text-[10px] text-muted-foreground">
                Enter tickers above and press <span className="text-primary">[OPTIMIZE →]</span>
              </p>
            </div>
          )}

          {status === 'loading' && (
            <div className="border border-border p-8 text-center">
              <p className="font-mono text-[10px] text-muted-foreground animate-pulse">
                FETCHING PRICE DATA AND COMPUTING FRONTIER...
              </p>
            </div>
          )}

        </div>
      </div>
    </>
  );
}
