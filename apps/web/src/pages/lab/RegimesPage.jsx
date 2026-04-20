import React, { useState, useMemo, useCallback } from 'react';
import { Helmet } from 'react-helmet';
import { AreaChart, Area, LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, ReferenceLine, ReferenceArea } from 'recharts';

// ── Data generation ───────────────────────────────────────────────────────────────

function generateSeries(seed = 42) {
  // Seeded PRNG (simple LCG)
  let s = seed;
  const rng = () => { s = (s * 1664525 + 1013904223) & 0xffffffff; return (s >>> 0) / 0xffffffff; };
  const rndn = () => {
    let u = 0, v = 0;
    while (!u) u = rng(); while (!v) v = rng();
    return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
  };

  // True regimes: 0 = Bull, 1 = Bear
  const P_STAY_BULL = 0.97, P_STAY_BEAR = 0.93;
  const REGIME_PARAMS = [
    { mu: 0.0005, sigma: 0.009 },  // Bull
    { mu: -0.0015, sigma: 0.022 }, // Bear
  ];

  const T = 600;
  const trueRegimes = [rng() > 0.3 ? 0 : 1];
  for (let t = 1; t < T; t++) {
    const prev = trueRegimes[t - 1];
    trueRegimes.push(rng() > (prev === 0 ? 1 - P_STAY_BULL : 1 - P_STAY_BEAR) ? prev : 1 - prev);
  }

  const returns = trueRegimes.map(r => REGIME_PARAMS[r].mu + REGIME_PARAMS[r].sigma * rndn());
  const prices = [100];
  returns.forEach(r => prices.push(prices[prices.length - 1] * (1 + r)));

  return { returns, prices: prices.slice(0, T), trueRegimes, T };
}

// ── HMM Baum-Welch ────────────────────────────────────────────────────────────────

function gaussianPDF(x, mu, sigma) {
  const d = (x - mu) / sigma;
  return Math.exp(-0.5 * d * d) / (sigma * Math.sqrt(2 * Math.PI));
}

function runHMM(obs, nStates = 2, maxIter = 30) {
  const T = obs.length;

  // Initialize parameters
  const pi  = Array(nStates).fill(1 / nStates);
  const A   = Array.from({length: nStates}, (_, i) =>
    Array.from({length: nStates}, (_, j) => i === j ? 0.92 : 0.08 / (nStates - 1))
  );

  // Sort obs to init means
  const sorted = [...obs].sort((a, b) => a - b);
  const mu    = Array.from({length: nStates}, (_, i) =>
    sorted[Math.round((i + 0.5) * T / nStates)]
  );
  const sigma = Array(nStates).fill(Math.abs(mu[1] - mu[0]) / 2 || 0.01);

  for (let iter = 0; iter < maxIter; iter++) {
    // Emission probabilities
    const B = obs.map(x => Array.from({length: nStates}, (_, s) =>
      Math.max(gaussianPDF(x, mu[s], sigma[s]), 1e-300)
    ));

    // Forward (scaled)
    const alpha = Array.from({length: T}, () => Array(nStates).fill(0));
    const c     = Array(T).fill(0);
    alpha[0] = pi.map((p, s) => p * B[0][s]);
    c[0] = alpha[0].reduce((s, v) => s + v, 0) || 1;
    alpha[0] = alpha[0].map(v => v / c[0]);

    for (let t = 1; t < T; t++) {
      for (let j = 0; j < nStates; j++) {
        alpha[t][j] = alpha[t-1].reduce((s, a, i) => s + a * A[i][j], 0) * B[t][j];
      }
      c[t] = alpha[t].reduce((s, v) => s + v, 0) || 1;
      alpha[t] = alpha[t].map(v => v / c[t]);
    }

    // Backward (scaled)
    const beta = Array.from({length: T}, () => Array(nStates).fill(0));
    beta[T-1] = Array(nStates).fill(1 / c[T-1]);
    for (let t = T - 2; t >= 0; t--) {
      for (let i = 0; i < nStates; i++) {
        beta[t][i] = A[i].reduce((s, a, j) => s + a * B[t+1][j] * beta[t+1][j], 0) / c[t];
      }
    }

    // Gamma and Xi
    const gamma = Array.from({length: T}, (_, t) => {
      const row = alpha[t].map((a, s) => a * beta[t][s]);
      const sum = row.reduce((s, v) => s + v, 0) || 1;
      return row.map(v => v / sum);
    });

    const xi = Array.from({length: T-1}, (_, t) => {
      const mat = Array.from({length: nStates}, (_, i) =>
        Array.from({length: nStates}, (_, j) =>
          alpha[t][i] * A[i][j] * B[t+1][j] * beta[t+1][j]
        )
      );
      const sum = mat.reduce((s, row) => s + row.reduce((ss, v) => ss + v, 0), 0) || 1;
      return mat.map(row => row.map(v => v / sum));
    });

    // Update parameters
    for (let i = 0; i < nStates; i++) {
      pi[i] = gamma[0][i];
      for (let j = 0; j < nStates; j++) {
        const num = xi.reduce((s, xt) => s + xt[i][j], 0);
        const den = gamma.slice(0, T-1).reduce((s, g) => s + g[i], 0) || 1;
        A[i][j] = num / den;
      }
      const gSum = gamma.reduce((s, g) => s + g[i], 0) || 1;
      mu[i]    = gamma.reduce((s, g, t) => s + g[i] * obs[t], 0) / gSum;
      sigma[i] = Math.sqrt(gamma.reduce((s, g, t) => s + g[i] * (obs[t] - mu[i]) ** 2, 0) / gSum) || 0.001;
    }

    // Ensure state 0 = low-mu (bull) state
    if (mu[0] > mu[1]) {
      [mu[0], mu[1]] = [mu[1], mu[0]];
      [sigma[0], sigma[1]] = [sigma[1], sigma[0]];
      [pi[0], pi[1]] = [pi[1], pi[0]];
      for (let i = 0; i < nStates; i++) {
        [A[i][0], A[i][1]] = [A[i][1], A[i][0]];
        gamma.forEach(g => [g[0], g[1]] = [g[1], g[0]]);
      }
    }

    // Recompute gamma for final output
    const gammaFinal = Array.from({length: T}, (_, t) => {
      const B_final = obs.map(x => Array.from({length: nStates}, (_, s) =>
        Math.max(gaussianPDF(x, mu[s], sigma[s]), 1e-300)
      ));
      const row = alpha[t].map((a, s) => a * beta[t][s]);
      const sum = row.reduce((s, v) => s + v, 0) || 1;
      return row.map(v => v / sum);
    });

    if (iter === maxIter - 1) {
      // Final gamma
      const gf = Array.from({length: T}, (_, t) => {
        const row = alpha[t].map((a, s) => a * beta[t][s]);
        const sum = row.reduce((s, v) => s + v, 0) || 1;
        return row.map(v => v / sum);
      });
      return { gamma: gf, mu, sigma, A, pi };
    }
  }
  return { gamma: Array(T).fill([0.5, 0.5]), mu, sigma, A, pi };
}

// ── Chart tooltip ─────────────────────────────────────────────────────────────────

const PriceTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="border border-border bg-background p-2 font-mono text-[10px]">
      <p className="text-muted-foreground">Day {label}</p>
      <p>Price: ${Number(payload[0]?.value ?? 0).toFixed(2)}</p>
    </div>
  );
};

const RegimeTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="border border-border bg-background p-2 font-mono text-[10px]">
      <p className="text-muted-foreground">Day {label}</p>
      <p className="text-green-500">Bull prob: {(payload[0]?.value * 100).toFixed(1)}%</p>
      <p className="text-red-400">Bear prob: {(payload[1]?.value * 100).toFixed(1)}%</p>
    </div>
  );
};

// ── CUSUM Structural Break Detection ─────────────────────────────────────────────
function runCUSUM(returns, k, h) {
  // Page-Hinkley CUSUM for mean shifts
  // g+ detects upward mean shift, g- detects downward mean shift
  const n = returns.length;
  const mu0 = returns.reduce((a, r) => a + r, 0) / n;
  const gPlus = [0], gMinus = [0];
  const breaks = [];

  for (let t = 1; t < n; t++) {
    const x = returns[t];
    const gpNew = Math.max(0, gPlus[t - 1] + (x - mu0 - k));
    const gmNew = Math.max(0, gMinus[t - 1] + (mu0 - k - x));
    gPlus.push(gpNew);
    gMinus.push(gmNew);
    if (gpNew >= h || gmNew >= h) {
      breaks.push({ t, dir: gpNew >= h ? 'up' : 'down' });
      // reset after detection (CUSUM restarts)
      gPlus[t] = 0;
      gMinus[t] = 0;
    }
  }
  return { gPlus, gMinus, breaks, mu0 };
}

function CUSUMSection({ returns, prices }) {
  const [kMult, setKMult]   = useState(0.5);
  const [hMult, setHMult]   = useState(5.0);

  const sigma = useMemo(() => {
    const n = returns.length;
    const mu = returns.reduce((a, r) => a + r, 0) / n;
    return Math.sqrt(returns.reduce((a, r) => a + (r - mu) ** 2, 0) / n);
  }, [returns]);

  const k = kMult * sigma;
  const h = hMult * sigma;

  const { gPlus, gMinus, breaks, mu0 } = useMemo(
    () => runCUSUM(returns, k, h),
    [returns, k, h]
  );

  const chartData = useMemo(() => prices.map((p, i) => ({
    t: i,
    price: +p.toFixed(3),
    gPlus:  +(gPlus[i] / sigma).toFixed(3),
    gMinus: +(gMinus[i] / sigma).toFixed(3),
    threshold: hMult,
  })), [prices, gPlus, gMinus, sigma, hMult]);

  const breakSet = new Set(breaks.map(b => b.t));

  return (
    <div className="mt-10 pt-8 border-t border-border">
      <p className="font-mono text-[9px] text-primary tracking-widest mb-1">[6b] CUSUM STRUCTURAL BREAKS</p>
      <h2 className="font-mono text-lg font-bold tracking-tight text-foreground mb-1">Page-Hinkley CUSUM</h2>
      <p className="font-mono text-[10px] text-muted-foreground mb-6">
        Sequential change-point detection. Accumulates deviations from the in-sample mean; signals a structural break when the statistic exceeds the decision threshold <em>h</em>.
        Complements HMM by detecting abrupt, one-time mean shifts rather than persistent latent state transitions.
      </p>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        <div className="space-y-4">
          <div className="border border-border p-4">
            <p className="font-mono text-[10px] tracking-widest text-foreground mb-3">PARAMETERS</p>
            {[
              { label: 'ALLOWANCE k', sub: `${kMult.toFixed(1)}σ = ${(k * 100).toFixed(4)}%`, val: kMult, set: setKMult, min: 0.1, max: 2.0, step: 0.1 },
              { label: 'THRESHOLD h', sub: `${hMult.toFixed(1)}σ`, val: hMult, set: setHMult, min: 1, max: 15, step: 0.5 },
            ].map(({ label, sub, val, set, min, max, step }) => (
              <div key={label} className="mb-4">
                <div className="flex justify-between mb-0.5">
                  <span className="font-mono text-[9px] text-foreground">{label}</span>
                  <span className="font-mono text-[9px] text-primary">{sub}</span>
                </div>
                <input type="range" min={min} max={max} step={step} value={val}
                  onChange={e => set(+e.target.value)}
                  className="w-full h-1 accent-primary" />
              </div>
            ))}
          </div>

          <div className="border border-border p-4">
            <p className="font-mono text-[10px] tracking-widest text-foreground mb-3">RESULTS</p>
            <div className="space-y-1 font-mono text-[9px]">
              <div className="flex justify-between"><span className="text-muted-foreground">Breaks detected</span><span className="text-primary font-bold">{breaks.length}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Upward shifts</span><span className="text-green-500">{breaks.filter(b => b.dir === 'up').length}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Downward shifts</span><span className="text-red-400">{breaks.filter(b => b.dir === 'down').length}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">μ₀ (daily)</span><span>{(mu0 * 100).toFixed(4)}%</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">σ (daily)</span><span>{(sigma * 100).toFixed(4)}%</span></div>
            </div>
          </div>

          <div className="border border-border/40 p-3">
            <p className="font-mono text-[8px] text-muted-foreground/40 tracking-widest mb-2">LEGEND</p>
            <div className="space-y-1.5">
              <div className="flex gap-2 items-center"><div className="w-3 h-0.5 bg-green-500" /><span className="font-mono text-[8px] text-muted-foreground/60">g⁺ (up-shift statistic)</span></div>
              <div className="flex gap-2 items-center"><div className="w-3 h-0.5 bg-red-400" /><span className="font-mono text-[8px] text-muted-foreground/60">g⁻ (down-shift statistic)</span></div>
              <div className="flex gap-2 items-center"><div className="w-3 h-0.5 border-t border-dashed border-amber-400" /><span className="font-mono text-[8px] text-muted-foreground/60">h threshold (±)</span></div>
              <div className="flex gap-2 items-center"><div className="w-2 h-2 bg-amber-400/50 rounded-sm" /><span className="font-mono text-[8px] text-muted-foreground/60">break event</span></div>
            </div>
          </div>
        </div>

        <div className="lg:col-span-3 space-y-4">
          {/* Price with break lines */}
          <div className="border border-border p-4">
            <p className="font-mono text-[10px] tracking-widest text-foreground mb-3">
              PRICE SERIES — DETECTED BREAK POINTS
            </p>
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={chartData} margin={{ top: 4, right: 8, bottom: 4, left: 24 }}>
                <CartesianGrid strokeDasharray="3 3" strokeOpacity={0.1} />
                <XAxis dataKey="t" tick={{ fontFamily: 'monospace', fontSize: 8 }} />
                <YAxis tick={{ fontFamily: 'monospace', fontSize: 8 }} tickFormatter={v => `$${v.toFixed(0)}`} />
                <Tooltip contentStyle={{ background: '#0a0a0a', border: '1px solid #333', fontFamily: 'monospace', fontSize: 9 }}
                  formatter={(v, n) => [`$${v}`, 'Price']} labelFormatter={l => `Day ${l}`} />
                <Line type="monotone" dataKey="price" stroke="#6366f1" strokeWidth={1.5} dot={false} />
                {breaks.map((b) => (
                  <ReferenceLine key={b.t} x={b.t} stroke={b.dir === 'up' ? '#22c55e' : '#ef4444'}
                    strokeWidth={1.5} strokeDasharray="4 2" opacity={0.7} />
                ))}
              </LineChart>
            </ResponsiveContainer>
          </div>

          {/* CUSUM statistic */}
          <div className="border border-border p-4">
            <p className="font-mono text-[10px] tracking-widest text-foreground mb-3">
              CUSUM STATISTICS (units of σ)
            </p>
            <ResponsiveContainer width="100%" height={180}>
              <LineChart data={chartData} margin={{ top: 4, right: 8, bottom: 4, left: 24 }}>
                <CartesianGrid strokeDasharray="3 3" strokeOpacity={0.1} />
                <XAxis dataKey="t" tick={{ fontFamily: 'monospace', fontSize: 8 }} />
                <YAxis tick={{ fontFamily: 'monospace', fontSize: 8 }} />
                <Tooltip contentStyle={{ background: '#0a0a0a', border: '1px solid #333', fontFamily: 'monospace', fontSize: 9 }}
                  formatter={(v, n) => [v.toFixed(3) + 'σ', n === 'gPlus' ? 'g⁺ (up)' : n === 'gMinus' ? 'g⁻ (down)' : 'threshold']}
                  labelFormatter={l => `Day ${l}`} />
                <ReferenceLine y={hMult} stroke="#f59e0b" strokeDasharray="4 2" strokeWidth={1.5} opacity={0.6} />
                {breaks.map((b) => (
                  <ReferenceLine key={b.t} x={b.t} stroke={b.dir === 'up' ? '#22c55e80' : '#ef444480'}
                    strokeWidth={1} strokeDasharray="3 2" />
                ))}
                <Line type="monotone" dataKey="gPlus" stroke="#22c55e" strokeWidth={1.5} dot={false} name="gPlus" />
                <Line type="monotone" dataKey="gMinus" stroke="#ef4444" strokeWidth={1.5} dot={false} name="gMinus" />
              </LineChart>
            </ResponsiveContainer>
            <p className="font-mono text-[8px] text-muted-foreground/40 mt-2">
              Statistic resets to 0 after each detected break. Low k → more sensitive; high h → fewer false positives.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Component ────────────────────────────────────────────────────────────────────

export default function RegimesPage() {
  const [seed, setSeed]     = useState(42);
  const [fitted, setFitted] = useState(false);
  const [hmm, setHmm]       = useState(null);

  const { returns, prices, trueRegimes, T } = useMemo(() => generateSeries(seed), [seed]);

  const fitHMM = useCallback(() => {
    const result = runHMM(returns, 2, 40);
    setHmm(result);
    setFitted(true);
  }, [returns]);

  const chartData = useMemo(() => {
    return prices.map((p, i) => ({
      t: i,
      price: +p.toFixed(3),
      bullProb: hmm ? +hmm.gamma[i][0].toFixed(4) : null,
      bearProb: hmm ? +hmm.gamma[i][1].toFixed(4) : null,
      trueRegime: trueRegimes[i],
    }));
  }, [prices, hmm, trueRegimes]);

  // Regime-colored price data
  const bullData  = chartData.map(d => ({ ...d, price: (d.bullProb ?? 0) > 0.5 ? d.price : null }));
  const bearData  = chartData.map(d => ({ ...d, price: (d.bullProb ?? 1) <= 0.5 ? d.price : null }));

  return (
    <>
      <Helmet><title>DDF·LAB — Regime Detection</title></Helmet>

      <div className="min-h-screen px-4 sm:px-6 lg:px-8 py-8">
        <div className="max-w-6xl mx-auto">

          <div className="mb-6 border-b border-border pb-4">
            <p className="font-mono text-[9px] text-primary tracking-widest mb-1">[6] REGIME DETECTION</p>
            <h1 className="font-mono text-xl font-bold tracking-tight text-foreground">Hidden Markov Model</h1>
            <p className="font-mono text-[10px] text-muted-foreground mt-1">
              2-state HMM via Baum-Welch EM · Gaussian emissions · identifies bull/bear regimes
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">

            {/* Controls */}
            <div className="space-y-4">
              <div className="border border-border p-4">
                <p className="font-mono text-[10px] tracking-widest text-foreground mb-3">DATASET</p>
                <div className="mb-3">
                  <p className="font-mono text-[9px] text-muted-foreground mb-1">Seed (new scenario)</p>
                  <input type="range" min={1} max={100} step={1} value={seed}
                    onChange={e => { setSeed(parseInt(e.target.value)); setFitted(false); setHmm(null); }}
                    className="w-full h-1 accent-primary" />
                  <p className="font-mono text-[9px] text-primary mt-1">{seed}</p>
                </div>
                <div className="space-y-1 text-[9px] font-mono">
                  <div className="flex justify-between"><span className="text-muted-foreground">Observations</span><span className="text-primary">600 days</span></div>
                  <div className="flex justify-between"><span className="text-muted-foreground">True bull days</span><span className="text-green-500">{trueRegimes.filter(r=>r===0).length}</span></div>
                  <div className="flex justify-between"><span className="text-muted-foreground">True bear days</span><span className="text-red-400">{trueRegimes.filter(r=>r===1).length}</span></div>
                </div>
                <button
                  onClick={fitHMM}
                  className="mt-4 w-full font-mono text-[10px] tracking-widest border border-primary text-primary hover:bg-primary hover:text-primary-foreground py-2 transition-colors"
                >
                  FIT HMM
                </button>
              </div>

              {/* Model params */}
              {hmm && (
                <>
                  <div className="border border-border p-4">
                    <p className="font-mono text-[10px] tracking-widest text-foreground mb-3">FITTED STATES</p>
                    {[0, 1].map(s => (
                      <div key={s} className={`mb-3 p-2 border ${s === 0 ? 'border-green-500/30' : 'border-red-400/30'}`}>
                        <p className={`font-mono text-[9px] font-bold mb-1 ${s === 0 ? 'text-green-500' : 'text-red-400'}`}>
                          {s === 0 ? '● BULL' : '● BEAR'}
                        </p>
                        <div className="space-y-0.5 font-mono text-[9px]">
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">μ (daily)</span>
                            <span className={s === 0 ? 'text-green-500' : 'text-red-400'} >{(hmm.mu[s]*100).toFixed(4)}%</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">σ (daily)</span>
                            <span className="text-primary">{(hmm.sigma[s]*100).toFixed(4)}%</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Ann. ret.</span>
                            <span>{(hmm.mu[s]*252*100).toFixed(1)}%</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Ann. vol.</span>
                            <span>{(hmm.sigma[s]*Math.sqrt(252)*100).toFixed(1)}%</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="border border-border p-4">
                    <p className="font-mono text-[10px] tracking-widest text-foreground mb-3">TRANSITION MATRIX</p>
                    <table className="w-full font-mono text-[9px]">
                      <thead>
                        <tr>
                          <th className="text-muted-foreground text-left pb-1"></th>
                          <th className="text-green-500 text-right pb-1">→BULL</th>
                          <th className="text-red-400 text-right pb-1">→BEAR</th>
                        </tr>
                      </thead>
                      <tbody>
                        {[0, 1].map(i => (
                          <tr key={i}>
                            <td className={i === 0 ? 'text-green-500' : 'text-red-400'}>{i === 0 ? 'BULL→' : 'BEAR→'}</td>
                            {[0, 1].map(j => (
                              <td key={j} className="text-right text-primary tabular-nums">
                                {(hmm.A[i][j] * 100).toFixed(1)}%
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    <p className="font-mono text-[8px] text-muted-foreground mt-3">
                      Expected duration: Bull {Math.round(1/(1-hmm.A[0][0]))}d · Bear {Math.round(1/(1-hmm.A[1][1]))}d
                    </p>
                  </div>
                </>
              )}
            </div>

            {/* Charts */}
            <div className="lg:col-span-3 space-y-4">
              {/* Price chart */}
              <div className="border border-border p-4">
                <p className="font-mono text-[10px] tracking-widest text-foreground mb-3">
                  SIMULATED PRICE SERIES
                  {fitted && <span className="text-muted-foreground ml-2 text-[9px]">(green = model assigned bull, red = bear)</span>}
                </p>
                <ResponsiveContainer width="100%" height={220}>
                  <AreaChart data={chartData} margin={{ top: 4, right: 8, bottom: 4, left: 24 }}>
                    <CartesianGrid strokeDasharray="3 3" strokeOpacity={0.1} />
                    <XAxis dataKey="t" tick={{ fontFamily: 'monospace', fontSize: 8 }} />
                    <YAxis tick={{ fontFamily: 'monospace', fontSize: 8 }} tickFormatter={v => `$${v.toFixed(0)}`} />
                    <Tooltip content={<PriceTooltip />} />
                    {!fitted ? (
                      <Area type="monotone" dataKey="price" stroke="#6366f1" strokeWidth={1.5}
                        fill="#6366f1" fillOpacity={0.05} dot={false} />
                    ) : (
                      <>
                        <Area type="monotone" dataKey="price" stroke="#6366f1" strokeWidth={1}
                          fill="none" dot={false} strokeOpacity={0.2} />
                        {chartData.map((d, i) => null)}
                      </>
                    )}
                  </AreaChart>
                </ResponsiveContainer>
                {fitted && (
                  <ResponsiveContainer width="100%" height={60}>
                    <AreaChart data={chartData} margin={{ top: 0, right: 8, bottom: 0, left: 24 }}>
                      <XAxis dataKey="t" hide />
                      <YAxis hide />
                      <Area type="monotone" dataKey="bullProb" stroke="#22c55e" strokeWidth={1}
                        fill="#22c55e" fillOpacity={0.3} dot={false} stackId="1" />
                      <Area type="monotone" dataKey="bearProb" stroke="#ef4444" strokeWidth={1}
                        fill="#ef4444" fillOpacity={0.3} dot={false} stackId="1" />
                    </AreaChart>
                  </ResponsiveContainer>
                )}
              </div>

              {/* Regime probability */}
              {fitted && (
                <div className="border border-border p-4">
                  <p className="font-mono text-[10px] tracking-widest text-foreground mb-3">
                    REGIME PROBABILITIES P(state | observations)
                  </p>
                  <ResponsiveContainer width="100%" height={180}>
                    <AreaChart data={chartData} margin={{ top: 4, right: 8, bottom: 4, left: 24 }}>
                      <CartesianGrid strokeDasharray="3 3" strokeOpacity={0.1} />
                      <XAxis dataKey="t" tick={{ fontFamily: 'monospace', fontSize: 8 }} />
                      <YAxis tick={{ fontFamily: 'monospace', fontSize: 8 }} domain={[0, 1]} tickFormatter={v => `${(v*100).toFixed(0)}%`} />
                      <Tooltip content={<RegimeTooltip />} />
                      <Area type="monotone" dataKey="bullProb" name="Bull" stroke="#22c55e" strokeWidth={1.5}
                        fill="#22c55e" fillOpacity={0.2} dot={false} />
                      <Area type="monotone" dataKey="bearProb" name="Bear" stroke="#ef4444" strokeWidth={1.5}
                        fill="#ef4444" fillOpacity={0.2} dot={false} />
                    </AreaChart>
                  </ResponsiveContainer>

                  {/* Accuracy */}
                  <div className="mt-3 pt-3 border-t border-border">
                    <p className="font-mono text-[9px] text-muted-foreground">
                      Detection accuracy (vs true labels):&nbsp;
                      <span className="text-primary font-bold">
                        {(chartData.filter(d =>
                          (d.bullProb > 0.5 && d.trueRegime === 0) ||
                          (d.bullProb <= 0.5 && d.trueRegime === 1)
                        ).length / T * 100).toFixed(1)}%
                      </span>
                    </p>
                  </div>
                </div>
              )}

              {!fitted && (
                <div className="border border-dashed border-border p-8 flex items-center justify-center">
                  <p className="font-mono text-[10px] text-muted-foreground text-center">
                    Click <span className="text-primary">FIT HMM</span> to run Baum-Welch EM and detect regimes
                  </p>
                </div>
              )}
            </div>
          </div>

          <CUSUMSection returns={returns} prices={prices} />
        </div>
      </div>
    </>
  );
}
