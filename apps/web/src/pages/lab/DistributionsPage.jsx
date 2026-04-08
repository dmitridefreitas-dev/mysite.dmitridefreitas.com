import React, { useState, useMemo } from 'react';
import { Helmet } from 'react-helmet';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceLine, CartesianGrid } from 'recharts';

// ── Math ─────────────────────────────────────────────────────────────────────────

function logGamma(z) {
  if (z < 0.5) return Math.log(Math.PI / Math.sin(Math.PI * z)) - logGamma(1 - z);
  z -= 1;
  const c = [0.99999999999980993, 676.5203681218851, -1259.1392167224028,
             771.32342877765313, -176.61502916214059, 12.507343278686905,
             -0.13857109526572012, 9.9843695780195716e-6, 1.5056327351493116e-7];
  let x = c[0];
  for (let i = 1; i <= 8; i++) x += c[i] / (z + i);
  const t = z + 7.5;
  return 0.5 * Math.log(2 * Math.PI) + (z + 0.5) * Math.log(t) - t + Math.log(x);
}
const lgamma = logGamma;

function erf(x) {
  const t = 1 / (1 + 0.3275911 * Math.abs(x));
  const y = 1 - (((((1.061405429*t - 1.453152027)*t) + 1.421413741)*t - 0.284496736)*t + 0.254829592)*t*Math.exp(-x*x);
  return x < 0 ? -y : y;
}

// Numerical CDF via adaptive Simpson integration
function integrate(f, a, b, n = 200) {
  const h = (b - a) / n;
  let s = f(a) + f(b);
  for (let i = 1; i < n; i++) s += (i % 2 === 0 ? 2 : 4) * f(a + i * h);
  return s * h / 3;
}

// ── Distribution definitions ─────────────────────────────────────────────────────

const DISTRIBUTIONS = {
  Normal: {
    params: [
      { key: 'mu',    label: 'μ (mean)',  min: -5,   max: 5,   step: 0.1,  def: 0   },
      { key: 'sigma', label: 'σ (std)',   min: 0.1,  max: 5,   step: 0.1,  def: 1   },
    ],
    domain: (p) => [p.mu - 4 * p.sigma, p.mu + 4 * p.sigma],
    pdf: (x, { mu, sigma }) => Math.exp(-0.5*((x-mu)/sigma)**2) / (sigma * Math.sqrt(2*Math.PI)),
    cdf: (x, { mu, sigma }) => 0.5 * (1 + erf((x - mu) / (sigma * Math.SQRT2))),
    moments: ({ mu, sigma }) => ({
      Mean: mu.toFixed(3), Variance: (sigma**2).toFixed(3),
      Skewness: '0', 'Ex. Kurtosis': '0',
    }),
    desc: 'The cornerstone of classical statistics. Symmetric, bell-shaped. Central Limit Theorem guarantees it as a limit of sums.',
    formula: 'f(x) = (1/σ√(2π)) · exp(−(x−μ)²/(2σ²))',
  },

  'Log-Normal': {
    params: [
      { key: 'mu',    label: 'μ (log mean)', min: -2,  max: 2,  step: 0.1, def: 0  },
      { key: 'sigma', label: 'σ (log std)',  min: 0.1, max: 2,  step: 0.1, def: 0.5 },
    ],
    domain: () => [0.01, 10],
    pdf: (x, { mu, sigma }) => x <= 0 ? 0 : Math.exp(-0.5*((Math.log(x)-mu)/sigma)**2) / (x * sigma * Math.sqrt(2*Math.PI)),
    cdf: (x, { mu, sigma }) => x <= 0 ? 0 : 0.5 * (1 + erf((Math.log(x) - mu) / (sigma * Math.SQRT2))),
    moments: ({ mu, sigma }) => {
      const m = Math.exp(mu + sigma**2/2);
      const v = (Math.exp(sigma**2)-1)*Math.exp(2*mu + sigma**2);
      const sk = (Math.exp(sigma**2)+2)*Math.sqrt(Math.exp(sigma**2)-1);
      return { Mean: m.toFixed(3), Variance: v.toFixed(3), Skewness: sk.toFixed(3), 'Ex. Kurtosis': (Math.exp(4*sigma**2)+2*Math.exp(3*sigma**2)+3*Math.exp(2*sigma**2)-6).toFixed(3) };
    },
    desc: 'Stock price returns are approximately log-normal: prices are positive and right-skewed. Used in Black-Scholes.',
    formula: 'f(x) = (1/xσ√(2π)) · exp(−(ln x−μ)²/(2σ²)), x>0',
  },

  'Student-t': {
    params: [
      { key: 'nu', label: 'ν (df)', min: 1, max: 30, step: 0.5, def: 5 },
    ],
    domain: () => [-6, 6],
    pdf: (x, { nu }) => {
      const logNum = lgamma((nu+1)/2);
      const logDen = 0.5*Math.log(nu*Math.PI) + lgamma(nu/2);
      return Math.exp(logNum - logDen - (nu+1)/2 * Math.log(1 + x*x/nu));
    },
    cdf: (x, p) => {
      // Numerical integration
      const lo = -30;
      const f = (t) => {
        const logNum = lgamma((p.nu+1)/2);
        const logDen = 0.5*Math.log(p.nu*Math.PI) + lgamma(p.nu/2);
        return Math.exp(logNum - logDen - (p.nu+1)/2 * Math.log(1 + t*t/p.nu));
      };
      return integrate(f, lo, x, 300);
    },
    moments: ({ nu }) => ({
      Mean: nu > 1 ? '0' : 'undefined',
      Variance: nu > 2 ? (nu/(nu-2)).toFixed(3) : nu > 1 ? '∞' : 'undefined',
      Skewness: nu > 3 ? '0' : 'undefined',
      'Ex. Kurtosis': nu > 4 ? (6/(nu-4)).toFixed(3) : nu > 2 ? '∞' : 'undefined',
    }),
    desc: 'Heavier tails than Normal. Used for small samples and financial returns — captures extreme events better than Gaussian.',
    formula: 'f(x) = Γ((ν+1)/2) / (√(νπ)·Γ(ν/2)) · (1+x²/ν)^(−(ν+1)/2)',
  },

  Exponential: {
    params: [
      { key: 'lambda', label: 'λ (rate)', min: 0.1, max: 5, step: 0.1, def: 1 },
    ],
    domain: (p) => [0, 6 / p.lambda],
    pdf: (x, { lambda }) => x < 0 ? 0 : lambda * Math.exp(-lambda * x),
    cdf: (x, { lambda }) => x < 0 ? 0 : 1 - Math.exp(-lambda * x),
    moments: ({ lambda }) => ({
      Mean: (1/lambda).toFixed(3), Variance: (1/lambda**2).toFixed(3),
      Skewness: '2', 'Ex. Kurtosis': '6',
    }),
    desc: 'Models time between events (waiting times, inter-arrival). Memoryless property: P(T>s+t|T>s) = P(T>t).',
    formula: 'f(x) = λe^(−λx), x≥0',
  },

  Beta: {
    params: [
      { key: 'alpha', label: 'α (shape 1)', min: 0.5, max: 10, step: 0.5, def: 2 },
      { key: 'beta',  label: 'β (shape 2)', min: 0.5, max: 10, step: 0.5, def: 5 },
    ],
    domain: () => [0.001, 0.999],
    pdf: (x, { alpha: a, beta: b }) => {
      if (x <= 0 || x >= 1) return 0;
      const logB = lgamma(a) + lgamma(b) - lgamma(a + b);
      return Math.exp((a-1)*Math.log(x) + (b-1)*Math.log(1-x) - logB);
    },
    cdf: (x, p) => x <= 0 ? 0 : x >= 1 ? 1 : integrate((t) => {
      if (t <= 0 || t >= 1) return 0;
      const logB = lgamma(p.alpha) + lgamma(p.beta) - lgamma(p.alpha + p.beta);
      return Math.exp((p.alpha-1)*Math.log(t) + (p.beta-1)*Math.log(1-t) - logB);
    }, 0.0001, x, 300),
    moments: ({ alpha: a, beta: b }) => ({
      Mean: (a/(a+b)).toFixed(3),
      Variance: (a*b/((a+b)**2*(a+b+1))).toFixed(4),
      Skewness: (2*(b-a)*Math.sqrt(a+b+1)/((a+b+2)*Math.sqrt(a*b))).toFixed(3),
      'Ex. Kurtosis': (6*((a-b)**2*(a+b+1)-a*b*(a+b+2))/(a*b*(a+b+2)*(a+b+3))).toFixed(3),
    }),
    desc: 'Defined on [0,1] — perfect for modelling probabilities and proportions. Bayesian conjugate prior for the Bernoulli/Binomial.',
    formula: 'f(x) = x^(α−1)(1−x)^(β−1) / B(α,β), x∈[0,1]',
  },

  Gamma: {
    params: [
      { key: 'k',     label: 'k (shape)',  min: 0.5, max: 10, step: 0.5, def: 2   },
      { key: 'theta', label: 'θ (scale)',  min: 0.1, max: 5,  step: 0.1, def: 1   },
    ],
    domain: (p) => [0, p.k * p.theta * 5],
    pdf: (x, { k, theta }) => {
      if (x <= 0) return 0;
      return Math.exp((k-1)*Math.log(x) - x/theta - k*Math.log(theta) - lgamma(k));
    },
    cdf: (x, p) => x <= 0 ? 0 : integrate((t) => {
      if (t <= 0) return 0;
      return Math.exp((p.k-1)*Math.log(t) - t/p.theta - p.k*Math.log(p.theta) - lgamma(p.k));
    }, 0.0001, x, 300),
    moments: ({ k, theta }) => ({
      Mean: (k*theta).toFixed(3), Variance: (k*theta**2).toFixed(3),
      Skewness: (2/Math.sqrt(k)).toFixed(3), 'Ex. Kurtosis': (6/k).toFixed(3),
    }),
    desc: 'Models waiting times for k events. Chi-squared is a special case. Used in Bayesian inference and option pricing models.',
    formula: 'f(x) = x^(k−1)e^(−x/θ) / (θ^k·Γ(k)), x>0',
  },

  'Chi-Squared': {
    params: [
      { key: 'nu', label: 'ν (df)', min: 1, max: 20, step: 1, def: 4 },
    ],
    domain: (p) => [0, p.nu * 4],
    pdf: (x, { nu }) => {
      if (x <= 0) return 0;
      return Math.exp((nu/2-1)*Math.log(x) - x/2 - (nu/2)*Math.log(2) - lgamma(nu/2));
    },
    cdf: (x, p) => x <= 0 ? 0 : integrate((t) => {
      if (t <= 0) return 0;
      return Math.exp((p.nu/2-1)*Math.log(t) - t/2 - (p.nu/2)*Math.log(2) - lgamma(p.nu/2));
    }, 0.0001, x, 300),
    moments: ({ nu }) => ({
      Mean: nu.toFixed(1), Variance: (2*nu).toFixed(1),
      Skewness: Math.sqrt(8/nu).toFixed(3), 'Ex. Kurtosis': (12/nu).toFixed(3),
    }),
    desc: 'Sum of squares of ν standard normal variables. Central to hypothesis testing: χ² tests, likelihood-ratio tests.',
    formula: 'f(x) = x^(ν/2−1)·e^(−x/2) / (2^(ν/2)·Γ(ν/2)), x>0',
  },

  Uniform: {
    params: [
      { key: 'a', label: 'a (lower)', min: -5, max: 4,  step: 0.5, def: 0 },
      { key: 'b', label: 'b (upper)', min: -4, max: 10, step: 0.5, def: 1 },
    ],
    domain: ({ a, b }) => [a - (b-a)*0.3, b + (b-a)*0.3],
    pdf: (x, { a, b }) => (x < a || x > b || a >= b) ? 0 : 1 / (b - a),
    cdf: (x, { a, b }) => x < a ? 0 : x > b ? 1 : (x - a) / (b - a),
    moments: ({ a, b }) => ({
      Mean: ((a+b)/2).toFixed(3), Variance: ((b-a)**2/12).toFixed(4),
      Skewness: '0', 'Ex. Kurtosis': '−1.2',
    }),
    desc: 'Maximum entropy distribution on a bounded interval — every outcome equally likely. Basis of random number generation.',
    formula: 'f(x) = 1/(b−a) for x∈[a,b], else 0',
  },
};

const DIST_NAMES = Object.keys(DISTRIBUTIONS);

function buildChartData(distName, params, mode) {
  const def = DISTRIBUTIONS[distName];
  const [lo, hi] = def.domain(params);
  const fn = mode === 'PDF' ? def.pdf : def.cdf;
  const pts = [];
  const steps = 200;
  for (let i = 0; i <= steps; i++) {
    const x = lo + (hi - lo) * i / steps;
    const y = fn(x, params);
    if (isFinite(y) && y >= 0) pts.push({ x: +x.toFixed(4), y: +Math.min(y, 20).toFixed(5) });
  }
  return pts;
}

const ChartTooltip = ({ active, payload }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="border border-border bg-background p-2 font-mono text-[10px]">
      <p>x = {payload[0]?.payload?.x}</p>
      <p>y = {payload[0]?.value?.toFixed(5)}</p>
    </div>
  );
};

export default function DistributionsPage() {
  const [selected, setSelected] = useState('Normal');
  const [mode, setMode] = useState('PDF');
  const def = DISTRIBUTIONS[selected];

  const [params, setParams] = useState(() => {
    const p = {};
    def.params.forEach(({ key, def: d }) => { p[key] = d; });
    return p;
  });

  const handleDistChange = (name) => {
    setSelected(name);
    const p = {};
    DISTRIBUTIONS[name].params.forEach(({ key, def: d }) => { p[key] = d; });
    setParams(p);
  };

  const chartData = useMemo(() => buildChartData(selected, params, mode), [selected, params, mode]);
  const moments   = useMemo(() => def.moments(params), [selected, params]);

  return (
    <>
      <Helmet><title>DDF·LAB — Distributions</title></Helmet>

      <div className="min-h-screen px-4 sm:px-6 lg:px-8 py-8">
        <div className="max-w-6xl mx-auto">

          <div className="mb-6 border-b border-border pb-4">
            <p className="font-mono text-[9px] text-primary tracking-widest mb-1">[3] PROBABILITY DISTRIBUTIONS</p>
            <h1 className="font-mono text-xl font-bold tracking-tight text-foreground">Distribution Explorer</h1>
            <p className="font-mono text-[10px] text-muted-foreground mt-1">
              Interactive PDF/CDF for 8 distributions · drag parameters · view moments
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

            {/* Left controls */}
            <div className="space-y-4">
              {/* Distribution selector */}
              <div className="border border-border p-4">
                <p className="font-mono text-[10px] tracking-widest text-foreground mb-3">DISTRIBUTION</p>
                <div className="flex flex-col gap-1">
                  {DIST_NAMES.map(name => (
                    <button
                      key={name}
                      onClick={() => handleDistChange(name)}
                      className={`text-left font-mono text-[10px] tracking-widest px-2 py-1.5 border transition-colors ${
                        selected === name
                          ? 'border-primary bg-primary/10 text-primary'
                          : 'border-transparent text-muted-foreground hover:text-foreground'
                      }`}
                    >
                      {name}
                    </button>
                  ))}
                </div>
              </div>

              {/* PDF/CDF toggle */}
              <div className="border border-border p-4">
                <p className="font-mono text-[10px] tracking-widest text-foreground mb-3">VIEW</p>
                <div className="flex gap-2">
                  {['PDF', 'CDF'].map(m => (
                    <button
                      key={m}
                      onClick={() => setMode(m)}
                      className={`flex-1 font-mono text-[10px] tracking-widest py-1.5 border transition-colors ${
                        mode === m
                          ? 'border-primary bg-primary text-primary-foreground'
                          : 'border-border text-muted-foreground hover:border-primary'
                      }`}
                    >
                      {m}
                    </button>
                  ))}
                </div>
              </div>

              {/* Parameters */}
              <div className="border border-border p-4">
                <p className="font-mono text-[10px] tracking-widest text-foreground mb-3">PARAMETERS</p>
                {def.params.map(({ key, label, min, max, step }) => (
                  <div key={key} className="mb-3">
                    <div className="flex justify-between mb-1">
                      <span className="font-mono text-[9px] text-muted-foreground">{label}</span>
                      <span className="font-mono text-[9px] text-primary tabular-nums">{params[key]?.toFixed?.(2) ?? params[key]}</span>
                    </div>
                    <input
                      type="range" min={min} max={max} step={step}
                      value={params[key] ?? 1}
                      onChange={e => setParams(p => ({ ...p, [key]: parseFloat(e.target.value) }))}
                      className="w-full h-1 accent-primary"
                    />
                  </div>
                ))}
              </div>

              {/* Moments */}
              <div className="border border-border p-4">
                <p className="font-mono text-[10px] tracking-widest text-foreground mb-3">MOMENTS</p>
                {Object.entries(moments).map(([k, v]) => (
                  <div key={k} className="flex justify-between mb-1.5">
                    <span className="font-mono text-[9px] text-muted-foreground">{k}</span>
                    <span className="font-mono text-[9px] text-primary tabular-nums">{v}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Right: chart + info */}
            <div className="lg:col-span-2 space-y-4">
              <div className="border border-border p-4">
                <p className="font-mono text-[10px] tracking-widest text-foreground mb-4">
                  {selected} — {mode}
                </p>
                <ResponsiveContainer width="100%" height={320}>
                  <AreaChart data={chartData} margin={{ top: 8, right: 16, bottom: 8, left: 8 }}>
                    <defs>
                      <linearGradient id="distGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" strokeOpacity={0.15} />
                    <XAxis dataKey="x" tick={{ fontFamily: 'monospace', fontSize: 9 }} />
                    <YAxis tick={{ fontFamily: 'monospace', fontSize: 9 }} />
                    <Tooltip content={<ChartTooltip />} />
                    <Area type="monotone" dataKey="y" stroke="#6366f1" strokeWidth={2} fill="url(#distGrad)" dot={false} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>

              {/* Description + formula */}
              <div className="border border-border p-4">
                <p className="font-mono text-[10px] text-muted-foreground leading-relaxed mb-2">{def.desc}</p>
                <p className="font-mono text-[9px] text-primary/80 bg-muted/20 px-3 py-2 border border-border/50">
                  {def.formula}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

