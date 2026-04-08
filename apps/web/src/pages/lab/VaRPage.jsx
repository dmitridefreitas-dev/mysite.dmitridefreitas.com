import React, { useState, useMemo, useCallback } from 'react';
import { Helmet } from 'react-helmet';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ReferenceLine, ResponsiveContainer, Cell } from 'recharts';

// ── Math ─────────────────────────────────────────────────────────────────────────

function randn() {
  let u = 0, v = 0;
  while (!u) u = Math.random();
  while (!v) v = Math.random();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}

function normalQuantile(p) {
  // Rational approximation (Beasley-Springer-Moro)
  const a = [2.50662823884, -18.61500062529, 41.39119773534, -25.44106049637];
  const b = [-8.47351093090, 23.08336743743, -21.06224101826, 3.13082909833];
  const c = [0.3374754822726147, 0.9761690190917186, 0.1607979714918209,
             0.0276438810333863, 0.0038405729373609, 0.0003951896511349,
             0.0000321767881768, 0.0000002888167364, 0.0000003960315187];
  const y = p - 0.5;
  if (Math.abs(y) < 0.42) {
    const r = y * y;
    return y * (((a[3]*r+a[2])*r+a[1])*r+a[0]) / ((((b[3]*r+b[2])*r+b[1])*r+b[0])*r+1);
  }
  const r = p < 0.5 ? Math.log(-Math.log(p)) : Math.log(-Math.log(1 - p));
  let x = c[0]+r*(c[1]+r*(c[2]+r*(c[3]+r*(c[4]+r*(c[5]+r*(c[6]+r*(c[7]+r*c[8])))))));
  return p < 0.5 ? -x : x;
}

function cholesky(A) {
  const n = A.length, L = Array.from({length: n}, () => new Array(n).fill(0));
  for (let i = 0; i < n; i++) {
    for (let j = 0; j <= i; j++) {
      let s = A[i][j];
      for (let k = 0; k < j; k++) s -= L[i][k] * L[j][k];
      L[i][j] = i === j ? Math.sqrt(Math.max(s, 0)) : s / (L[j][j] || 1e-10);
    }
  }
  return L;
}

function pctile(sorted, p) {
  const idx = (p / 100) * (sorted.length - 1);
  const lo = Math.floor(idx), hi = Math.ceil(idx);
  return sorted[lo] + (sorted[hi] - sorted[lo]) * (idx - lo);
}

// Asset definitions
const ASSETS = [
  { name: 'US EQUITY',   mu: 0.00040, sigma: 0.012, color: '#6366f1' },
  { name: 'US BONDS',    mu: 0.00010, sigma: 0.004, color: '#22c55e' },
  { name: 'GOLD',        mu: 0.00020, sigma: 0.008, color: '#eab308' },
  { name: 'INTL EQUITY', mu: 0.00035, sigma: 0.013, color: '#f97316' },
];
const CORR = [
  [1.00, -0.30,  0.05,  0.88],
  [-0.30, 1.00,  0.20, -0.25],
  [0.05,  0.20,  1.00,  0.05],
  [0.88, -0.25,  0.05,  1.00],
];

const N_DAYS = 504; // 2 years

function generateReturns(seed = 42) {
  // deterministic-ish via seeded Math.random override
  const cov = CORR.map((row, i) => row.map((r, j) => r * ASSETS[i].sigma * ASSETS[j].sigma));
  const L = cholesky(cov);
  const returns = Array.from({length: N_DAYS}, () => {
    const z = ASSETS.map(() => randn());
    return ASSETS.map((a, i) => {
      let r = a.mu;
      for (let k = 0; k <= i; k++) r += L[i][k] * z[k];
      return r;
    });
  });
  return returns;
}

function computeVaR(weights, confidence) {
  const alpha = 1 - confidence / 100;
  const returns = generateReturns();
  const portReturns = returns.map(day =>
    weights.reduce((s, w, i) => s + w * day[i], 0)
  );

  // Historical
  const sortedHist = [...portReturns].sort((a, b) => a - b);
  const varHist = -pctile(sortedHist, alpha * 100);

  // Parametric
  const mu = portReturns.reduce((s, r) => s + r, 0) / portReturns.length;
  const sigma = Math.sqrt(portReturns.reduce((s, r) => s + (r - mu) ** 2, 0) / portReturns.length);
  const varParam = -(mu + normalQuantile(alpha) * sigma);

  // Monte Carlo (10k paths)
  const cov = CORR.map((row, i) => row.map((r, j) => r * ASSETS[i].sigma * ASSETS[j].sigma));
  const L = cholesky(cov);
  const mcReturns = [];
  for (let s = 0; s < 10000; s++) {
    const z = ASSETS.map(() => randn());
    let r = 0;
    for (let i = 0; i < ASSETS.length; i++) {
      let ri = ASSETS[i].mu;
      for (let k = 0; k <= i; k++) ri += L[i][k] * z[k];
      r += weights[i] * ri;
    }
    mcReturns.push(r);
  }
  const sortedMC = [...mcReturns].sort((a, b) => a - b);
  const varMC = -pctile(sortedMC, alpha * 100);

  // Histogram bins (from portReturns)
  const hMin = sortedHist[0], hMax = sortedHist[sortedHist.length - 1];
  const binW = (hMax - hMin) / 40;
  const bins = Array.from({length: 40}, (_, i) => ({
    r: +((hMin + (i + 0.5) * binW) * 100).toFixed(3),
    count: 0,
  }));
  portReturns.forEach(r => {
    const idx = Math.min(Math.floor((r - hMin) / binW), 39);
    bins[idx].count++;
  });

  return { varHist, varParam, varMC, portReturns: sortedHist, mu, sigma, bins,
           varHistPct: varHist * 100, varParamPct: varParam * 100, varMCPct: varMC * 100 };
}

// ── Tooltip ───────────────────────────────────────────────────────────────────────

const HistTooltip = ({ active, payload }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="border border-border bg-background p-2 font-mono text-[10px]">
      <p>return: {payload[0]?.payload?.r}%</p>
      <p>count: {payload[0]?.value}</p>
    </div>
  );
};

// ── Component ────────────────────────────────────────────────────────────────────

export default function VaRPage() {
  const [weights, setWeights] = useState([0.40, 0.30, 0.15, 0.15]);
  const [confidence, setConfidence] = useState(95);

  const totalW = weights.reduce((s, w) => s + w, 0);

  const setWeight = useCallback((i, raw) => {
    setWeights(prev => {
      const next = [...prev];
      next[i] = parseFloat(raw);
      return next;
    });
  }, []);

  const normalized = weights.map(w => w / totalW);

  const result = useMemo(() => computeVaR(normalized, confidence), [normalized.join(','), confidence]);

  const varColor = (v) => v > 0.02 ? '#ef4444' : v > 0.01 ? '#f97316' : '#22c55e';

  return (
    <>
      <Helmet><title>DDF·LAB — VaR Calculator</title></Helmet>

      <div className="min-h-screen px-4 sm:px-6 lg:px-8 py-8">
        <div className="max-w-6xl mx-auto">

          <div className="mb-6 border-b border-border pb-4">
            <p className="font-mono text-[9px] text-primary tracking-widest mb-1">[2] VALUE AT RISK</p>
            <h1 className="font-mono text-xl font-bold tracking-tight text-foreground">VaR Calculator</h1>
            <p className="font-mono text-[10px] text-muted-foreground mt-1">
              Historical simulation · parametric (variance-covariance) · Monte Carlo — 504 daily returns, 4-asset portfolio
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

            {/* Controls */}
            <div className="space-y-4">
              {/* Weights */}
              <div className="border border-border p-4">
                <div className="flex items-center justify-between mb-3">
                  <p className="font-mono text-[10px] tracking-widest text-foreground">PORTFOLIO WEIGHTS</p>
                  <span className={`font-mono text-[9px] ${Math.abs(totalW - 1) < 0.001 ? 'text-green-500' : 'text-red-400'}`}>
                    Σ={totalW.toFixed(2)}
                  </span>
                </div>
                {ASSETS.map((a, i) => (
                  <div key={a.name} className="mb-3">
                    <div className="flex justify-between mb-1">
                      <span className="font-mono text-[9px] text-muted-foreground">{a.name}</span>
                      <span className="font-mono text-[9px] tabular-nums" style={{ color: a.color }}>
                        {(normalized[i] * 100).toFixed(1)}%
                      </span>
                    </div>
                    <input
                      type="range" min="0" max="1" step="0.01"
                      value={weights[i]}
                      onChange={e => setWeight(i, e.target.value)}
                      className="w-full h-1 accent-primary"
                    />
                  </div>
                ))}
              </div>

              {/* Confidence */}
              <div className="border border-border p-4">
                <p className="font-mono text-[10px] tracking-widest text-foreground mb-3">CONFIDENCE LEVEL</p>
                <div className="flex gap-2">
                  {[90, 95, 99].map(c => (
                    <button
                      key={c}
                      onClick={() => setConfidence(c)}
                      className={`flex-1 font-mono text-[10px] tracking-widest py-1.5 border transition-colors ${
                        confidence === c
                          ? 'border-primary bg-primary text-primary-foreground'
                          : 'border-border text-muted-foreground hover:border-primary'
                      }`}
                    >
                      {c}%
                    </button>
                  ))}
                </div>
              </div>

              {/* Asset stats */}
              <div className="border border-border p-4">
                <p className="font-mono text-[10px] tracking-widest text-foreground mb-3">PORTFOLIO STATS</p>
                {[
                  ['Ann. Return (est.)', `${(result.mu * 252 * 100).toFixed(2)}%`],
                  ['Daily Volatility', `${(result.sigma * 100).toFixed(3)}%`],
                  ['Ann. Volatility', `${(result.sigma * Math.sqrt(252) * 100).toFixed(2)}%`],
                  ['Sharpe (rf=0)', (result.mu / result.sigma).toFixed(2)],
                ].map(([k, v]) => (
                  <div key={k} className="flex justify-between mb-1.5">
                    <span className="font-mono text-[9px] text-muted-foreground">{k}</span>
                    <span className="font-mono text-[9px] text-primary tabular-nums">{v}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Results */}
            <div className="lg:col-span-2 space-y-4">
              {/* VaR results grid */}
              <div className="grid grid-cols-3 gap-3">
                {[
                  { label: 'HISTORICAL',  val: result.varHistPct,  sub: 'Non-parametric, empirical dist.' },
                  { label: 'PARAMETRIC',  val: result.varParamPct, sub: 'Assumes normal returns (VC)' },
                  { label: 'MONTE CARLO', val: result.varMCPct,    sub: '10,000 simulated paths' },
                ].map(({ label, val, sub }) => (
                  <div key={label} className="border border-border p-4">
                    <p className="font-mono text-[8px] tracking-widest text-muted-foreground mb-1">{label}</p>
                    <p className="font-mono text-2xl font-bold tabular-nums" style={{ color: varColor(val / 100) }}>
                      {val.toFixed(3)}%
                    </p>
                    <p className="font-mono text-[8px] text-muted-foreground mt-1">
                      {confidence}% {label === 'PARAMETRIC' ? '1-day' : '1-day'} VaR
                    </p>
                    <p className="font-mono text-[8px] text-muted-foreground mt-0.5">{sub}</p>
                  </div>
                ))}
              </div>

              {/* Histogram */}
              <div className="border border-border p-4">
                <p className="font-mono text-[10px] tracking-widest text-foreground mb-3">
                  P&L DISTRIBUTION — {N_DAYS} daily returns
                </p>
                <ResponsiveContainer width="100%" height={260}>
                  <BarChart data={result.bins} margin={{ top: 4, right: 8, bottom: 4, left: 16 }}>
                    <XAxis dataKey="r" tick={{ fontFamily: 'monospace', fontSize: 8 }} tickFormatter={v => `${v}%`} interval={7} />
                    <YAxis tick={{ fontFamily: 'monospace', fontSize: 8 }} />
                    <Tooltip content={<HistTooltip />} />
                    <ReferenceLine x={0} stroke="rgba(255,255,255,0.3)" strokeDasharray="3 3" />
                    <ReferenceLine
                      x={(-result.varHistPct).toFixed(3)}
                      stroke="#ef4444" strokeDasharray="4 4"
                      label={{ value: `VaR ${confidence}%`, position: 'top', fill: '#ef4444', fontFamily: 'monospace', fontSize: 8 }}
                    />
                    <Bar dataKey="count" maxBarSize={20}>
                      {result.bins.map((b, i) => (
                        <Cell key={i} fill={b.r >= 0 ? '#22c55e' : '#ef4444'} fillOpacity={0.7} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>

              {/* Note */}
              <div className="border border-border/50 p-3 bg-muted/20">
                <p className="font-mono text-[9px] text-muted-foreground leading-relaxed">
                  <span className="text-primary">NOTE:</span> VaR answers "what is the maximum loss at confidence level α?" but says nothing about the magnitude of losses beyond that threshold. Expected Shortfall (CVaR) = E[L | L &gt; VaR] addresses this. The parametric method understates tail risk for non-normal return distributions.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
