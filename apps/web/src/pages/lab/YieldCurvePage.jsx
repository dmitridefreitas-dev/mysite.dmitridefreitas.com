import React, { useState, useMemo, useCallback } from 'react';
import { Helmet } from 'react-helmet';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ReferenceDot } from 'recharts';
import { RefreshCw } from 'lucide-react';

// ── Math ────────────────────────────────────────────────────────────────────────

function solve3x3(A, b) {
  const M = A.map((row, i) => [...row, b[i]]);
  for (let col = 0; col < 3; col++) {
    let maxRow = col;
    for (let row = col + 1; row < 3; row++)
      if (Math.abs(M[row][col]) > Math.abs(M[maxRow][col])) maxRow = row;
    [M[col], M[maxRow]] = [M[maxRow], M[col]];
    for (let row = col + 1; row < 3; row++) {
      const f = M[row][col] / M[col][col];
      for (let k = col; k <= 3; k++) M[row][k] -= f * M[col][k];
    }
  }
  const x = [0, 0, 0];
  for (let i = 2; i >= 0; i--) {
    x[i] = M[i][3];
    for (let j = i + 1; j < 3; j++) x[i] -= M[i][j] * x[j];
    x[i] /= M[i][i];
  }
  return x;
}

function nsBasis(m, lam) {
  if (m <= 0) return [1, 0, 0];
  const x = m / lam, ex = Math.exp(-x);
  const f1 = (1 - ex) / x;
  return [1, f1, f1 - ex];
}

function fitNSforLambda(mats, ylds, lam) {
  const n = mats.length;
  const X = mats.map(m => nsBasis(m, lam));
  const XtX = [[0,0,0],[0,0,0],[0,0,0]], Xty = [0,0,0];
  for (let i = 0; i < n; i++) {
    for (let r = 0; r < 3; r++) {
      Xty[r] += X[i][r] * ylds[i];
      for (let c = 0; c < 3; c++) XtX[r][c] += X[i][r] * X[i][c];
    }
  }
  const beta = solve3x3(XtX, Xty);
  let sse = 0;
  for (let i = 0; i < n; i++) {
    const pred = beta.reduce((s, b, j) => s + b * X[i][j], 0);
    sse += (ylds[i] - pred) ** 2;
  }
  return { beta, sse };
}

function fitNelsonSiegel(mats, ylds) {
  let best = { sse: Infinity, lambda: 1, beta: [0,0,0] };
  for (let lam = 0.05; lam <= 40; lam += 0.05) {
    const { beta, sse } = fitNSforLambda(mats, ylds, lam);
    if (sse < best.sse) best = { sse, lambda: lam, beta };
  }
  return best;
}

function nsYield(m, beta, lam) {
  const [b0, b1, b2, f1, , f2] = [...beta, ...nsBasis(m, lam)];
  return beta[0] + beta[1] * nsBasis(m, lam)[1] + beta[2] * nsBasis(m, lam)[2];
}

// Natural cubic spline
function buildSpline(xs, ys) {
  const n = xs.length;
  const h = xs.map((x, i) => i < n - 1 ? xs[i + 1] - x : 0);
  const l = new Array(n).fill(1), mu = new Array(n).fill(0), z = new Array(n).fill(0);
  for (let i = 1; i < n - 1; i++) {
    l[i] = 2 * (xs[i + 1] - xs[i - 1]) - h[i - 1] * mu[i - 1];
    mu[i] = h[i] / l[i];
    z[i] = (3 * (ys[i + 1] - ys[i]) / h[i] - 3 * (ys[i] - ys[i - 1]) / h[i - 1] - h[i - 1] * z[i - 1]) / l[i];
  }
  const c = new Array(n).fill(0), b = new Array(n - 1).fill(0), d = new Array(n - 1).fill(0);
  for (let j = n - 2; j >= 0; j--) {
    c[j] = z[j] - mu[j] * c[j + 1];
    b[j] = (ys[j + 1] - ys[j]) / h[j] - h[j] * (c[j + 1] + 2 * c[j]) / 3;
    d[j] = (c[j + 1] - c[j]) / (3 * h[j]);
  }
  return (x) => {
    let i = Math.max(0, xs.findIndex((v, k) => k < n - 1 && x >= xs[k] && x <= xs[k + 1]));
    if (x > xs[n - 1]) i = n - 2;
    const dx = x - xs[i];
    return ys[i] + b[i] * dx + c[i] * dx * dx + d[i] * dx * dx * dx;
  };
}

function linearInterp(xs, ys) {
  return (x) => {
    if (x <= xs[0]) return ys[0];
    if (x >= xs[xs.length - 1]) return ys[ys.length - 1];
    const i = xs.findIndex((v, k) => k < xs.length - 1 && x >= xs[k] && x < xs[k + 1]);
    if (i < 0) return ys[ys.length - 1];
    const t = (x - xs[i]) / (xs[i + 1] - xs[i]);
    return ys[i] + t * (ys[i + 1] - ys[i]);
  };
}

// ── Default data ────────────────────────────────────────────────────────────────

const MATURITIES = [1/12, 3/12, 6/12, 1, 2, 3, 5, 7, 10, 20, 30];
const MAT_LABELS  = ['1M','3M','6M','1Y','2Y','3Y','5Y','7Y','10Y','20Y','30Y'];
const DEFAULT_YIELDS = [5.30, 5.25, 5.15, 4.90, 4.60, 4.40, 4.30, 4.35, 4.40, 4.70, 4.65];

// ── Tooltip ──────────────────────────────────────────────────────────────────────

const CurveTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="border border-border bg-background p-2 font-mono text-[10px]">
      <p className="text-muted-foreground mb-1">{label}Y maturity</p>
      {payload.map(p => (
        <p key={p.name} style={{ color: p.color }}>{p.name}: {Number(p.value).toFixed(3)}%</p>
      ))}
    </div>
  );
};

// ── Component ────────────────────────────────────────────────────────────────────

export default function YieldCurvePage() {
  const [yields, setYields] = useState([...DEFAULT_YIELDS]);
  const [showNS, setShowNS]       = useState(true);
  const [showSpline, setShowSpline] = useState(true);
  const [showLinear, setShowLinear] = useState(false);

  const updateYield = useCallback((i, val) => {
    setYields(prev => { const y = [...prev]; y[i] = val; return y; });
  }, []);

  const { nsParams, chartData, nsRMSE, splineRMSE } = useMemo(() => {
    const ns = fitNelsonSiegel(MATURITIES, yields);
    const spline = buildSpline(MATURITIES, yields.map(y => y));
    const linear = linearInterp(MATURITIES, yields);

    // Build chart data over fine grid
    const pts = [];
    for (let m = 0.05; m <= 30.05; m += 0.1) {
      const row = { m: +m.toFixed(2) };
      if (showNS) {
        const b = ns.beta, lam = ns.lambda;
        row.NS = +(b[0] + b[1] * nsBasis(m, lam)[1] + b[2] * nsBasis(m, lam)[2]).toFixed(4);
      }
      if (showSpline) row.Spline = +spline(m).toFixed(4);
      if (showLinear) row.Linear = +linear(m).toFixed(4);
      pts.push(row);
    }

    // RMSE for NS
    let nsSSE = 0, spSSE = 0;
    MATURITIES.forEach((m, i) => {
      const nsPred = ns.beta[0] + ns.beta[1] * nsBasis(m, ns.lambda)[1] + ns.beta[2] * nsBasis(m, ns.lambda)[2];
      nsSSE += (yields[i] - nsPred) ** 2;
      spSSE += (yields[i] - spline(m)) ** 2;
    });

    return {
      nsParams: ns,
      chartData: pts,
      nsRMSE: Math.sqrt(nsSSE / MATURITIES.length),
      splineRMSE: Math.sqrt(spSSE / MATURITIES.length),
    };
  }, [yields, showNS, showSpline, showLinear]);

  const rawDots = MATURITIES.map((m, i) => ({ m, yield: yields[i] }));

  return (
    <>
      <Helmet><title>DDF·LAB — Yield Curve</title></Helmet>

      <div className="min-h-screen px-4 sm:px-6 lg:px-8 py-8">
        <div className="max-w-6xl mx-auto">

          {/* Header */}
          <div className="mb-6 border-b border-border pb-4">
            <p className="font-mono text-[9px] text-primary tracking-widest mb-1">
              [1] YIELD CURVE BUILDER
            </p>
            <h1 className="font-mono text-xl font-bold tracking-tight text-foreground">
              Term Structure Fitting
            </h1>
            <p className="font-mono text-[10px] text-muted-foreground mt-1">
              Nelson-Siegel parametric fit · natural cubic spline · linear interpolation
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

            {/* Left panel: yield inputs */}
            <div className="lg:col-span-1 space-y-4">
              <div className="border border-border p-4">
                <div className="flex items-center justify-between mb-3">
                  <p className="font-mono text-[10px] tracking-widest text-foreground">US TREASURY YIELDS (%)</p>
                  <button
                    onClick={() => setYields([...DEFAULT_YIELDS])}
                    className="flex items-center gap-1 font-mono text-[9px] text-muted-foreground hover:text-primary border border-border px-2 py-0.5 transition-colors"
                  >
                    <RefreshCw className="h-2.5 w-2.5" /> RESET
                  </button>
                </div>
                <div className="space-y-2">
                  {MATURITIES.map((m, i) => (
                    <div key={m} className="flex items-center gap-2">
                      <span className="font-mono text-[9px] text-muted-foreground w-8 shrink-0">{MAT_LABELS[i]}</span>
                      <input
                        type="range"
                        min="0.5" max="8" step="0.05"
                        value={yields[i]}
                        onChange={e => updateYield(i, parseFloat(e.target.value))}
                        className="flex-1 accent-primary h-1"
                      />
                      <span className="font-mono text-[10px] text-primary w-10 text-right tabular-nums">
                        {yields[i].toFixed(2)}%
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Model toggles */}
              <div className="border border-border p-4">
                <p className="font-mono text-[10px] tracking-widest text-foreground mb-3">MODELS</p>
                {[
                  { label: 'NELSON-SIEGEL', val: showNS, set: setShowNS, color: 'text-primary' },
                  { label: 'CUBIC SPLINE',  val: showSpline, set: setShowSpline, color: 'text-green-500' },
                  { label: 'LINEAR INTERP', val: showLinear, set: setShowLinear, color: 'text-yellow-500' },
                ].map(({ label, val, set, color }) => (
                  <button
                    key={label}
                    onClick={() => set(v => !v)}
                    className={`flex items-center gap-2 w-full mb-2 font-mono text-[10px] tracking-widest transition-colors ${val ? color : 'text-muted-foreground'}`}
                  >
                    <span className={`w-3 h-3 border ${val ? 'bg-current border-current' : 'border-muted-foreground'}`} />
                    {label}
                  </button>
                ))}
              </div>

              {/* NS parameters */}
              {showNS && (
                <div className="border border-border p-4">
                  <p className="font-mono text-[10px] tracking-widest text-foreground mb-3">NELSON-SIEGEL PARAMS</p>
                  <div className="space-y-1.5">
                    {[
                      ['β₀  (long-run level)', nsParams.beta[0].toFixed(4) + '%'],
                      ['β₁  (slope / short)',  nsParams.beta[1].toFixed(4) + '%'],
                      ['β₂  (hump / curvature)', nsParams.beta[2].toFixed(4) + '%'],
                      ['λ   (decay factor)',   nsParams.lambda.toFixed(3)],
                      ['RMSE', nsRMSE.toFixed(5) + '%'],
                    ].map(([k, v]) => (
                      <div key={k} className="flex justify-between">
                        <span className="font-mono text-[9px] text-muted-foreground">{k}</span>
                        <span className="font-mono text-[9px] text-primary tabular-nums">{v}</span>
                      </div>
                    ))}
                  </div>
                  <p className="font-mono text-[8px] text-muted-foreground mt-3 leading-relaxed">
                    y(m) = β₀ + β₁·[(1−e^(−m/λ))/(m/λ)] + β₂·[(1−e^(−m/λ))/(m/λ) − e^(−m/λ)]
                  </p>
                </div>
              )}
            </div>

            {/* Right panel: chart */}
            <div className="lg:col-span-2 border border-border p-4">
              <p className="font-mono text-[10px] tracking-widest text-foreground mb-4">YIELD CURVE</p>
              <ResponsiveContainer width="100%" height={400}>
                <LineChart data={chartData} margin={{ top: 8, right: 16, bottom: 8, left: 16 }}>
                  <CartesianGrid strokeDasharray="3 3" strokeOpacity={0.15} />
                  <XAxis
                    dataKey="m"
                    type="number"
                    domain={[0, 30]}
                    ticks={[0.5, 1, 2, 3, 5, 7, 10, 20, 30]}
                    tickFormatter={v => v < 1 ? `${Math.round(v*12)}M` : `${v}Y`}
                    tick={{ fontFamily: 'monospace', fontSize: 9 }}
                  />
                  <YAxis
                    domain={['auto', 'auto']}
                    tickFormatter={v => `${v.toFixed(1)}%`}
                    tick={{ fontFamily: 'monospace', fontSize: 9 }}
                    width={45}
                  />
                  <Tooltip content={<CurveTooltip />} />
                  <Legend wrapperStyle={{ fontFamily: 'monospace', fontSize: 9 }} />
                  {showNS     && <Line type="monotone" dataKey="NS"     stroke="#6366f1" strokeWidth={2} dot={false} />}
                  {showSpline && <Line type="monotone" dataKey="Spline" stroke="#22c55e" strokeWidth={2} dot={false} />}
                  {showLinear && <Line type="monotone" dataKey="Linear" stroke="#eab308" strokeWidth={1.5} dot={false} strokeDasharray="4 4" />}
                  {rawDots.map(({ m, yield: y }) => (
                    <ReferenceDot key={m} x={m} y={y} r={4} fill="#ffffff" stroke="#6366f1" strokeWidth={2} />
                  ))}
                </LineChart>
              </ResponsiveContainer>

              {/* Interpretation */}
              <div className="mt-4 pt-4 border-t border-border grid grid-cols-3 gap-4">
                {[
                  ['LEVEL (β₀)', nsParams.beta[0].toFixed(2) + '%', 'Long-run rate the curve converges to'],
                  ['SLOPE (β₁)', nsParams.beta[1].toFixed(2) + '%', nsParams.beta[1] < 0 ? 'Inverted (negative slope)' : 'Normal (positive slope)'],
                  ['CURVATURE (β₂)', nsParams.beta[2].toFixed(2) + '%', nsParams.beta[2] > 0 ? 'Humped curve' : 'U-shaped curvature'],
                ].map(([label, val, note]) => (
                  <div key={label} className="border border-border p-2">
                    <p className="font-mono text-[8px] text-muted-foreground tracking-widest">{label}</p>
                    <p className="font-mono text-lg font-bold text-primary tabular-nums">{val}</p>
                    <p className="font-mono text-[8px] text-muted-foreground">{note}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
