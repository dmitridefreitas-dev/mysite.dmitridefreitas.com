import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Helmet } from 'react-helmet';
import { motion, AnimatePresence } from 'framer-motion';
import { Play, RotateCcw } from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip,
  ReferenceLine, ResponsiveContainer, Cell,
} from 'recharts';
import SectionHeader from '@/components/SectionHeader.jsx';
import TerminalBadge from '@/components/TerminalBadge.jsx';
import { useTheme } from '@/contexts/ThemeContext.jsx';

// ─── Math helpers ──────────────────────────────────────────────────────────────

function randn() {
  let u = 0, v = 0;
  while (u === 0) u = Math.random();
  while (v === 0) v = Math.random();
  return Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);
}

function poissonSample(lam) {
  if (lam <= 0) return 0;
  const L = Math.exp(-Math.min(lam, 20));
  let k = 0, p = 1;
  do { k++; p *= Math.random(); } while (p > L);
  return k - 1;
}

function pctile(sorted, p) {
  const idx = (p / 100) * (sorted.length - 1);
  const lo = Math.floor(idx), hi = Math.ceil(idx);
  return sorted[lo] + (sorted[hi] - sorted[lo]) * (idx - lo);
}

function normalCDF(x) {
  const a1=0.254829592, a2=-0.284496736, a3=1.421413741,
        a4=-1.453152027, a5=1.061405429, p=0.3275911;
  const sign = x < 0 ? -1 : 1;
  const t = 1 / (1 + p * Math.abs(x) / Math.sqrt(2));
  const y = 1 - ((((a5*t+a4)*t+a3)*t+a2)*t+a1)*t*Math.exp(-(x*x)/2);
  return 0.5 * (1 + sign * y);
}

function blackScholes(S, K, r, sigma, T, type) {
  if (T <= 0 || sigma <= 0 || S <= 0 || K <= 0)
    return Math.max(type === 'CALL' ? S - K : K - S, 0);
  const d1 = (Math.log(S / K) + (r + sigma * sigma / 2) * T) / (sigma * Math.sqrt(T));
  const d2 = d1 - sigma * Math.sqrt(T);
  if (type === 'CALL') return S * normalCDF(d1) - K * Math.exp(-r * T) * normalCDF(d2);
  return K * Math.exp(-r * T) * normalCDF(-d2) - S * normalCDF(-d1);
}

// ─── Simulation engine ─────────────────────────────────────────────────────────

function runSimulation({ S0, mu, sigma, T, numPaths, model, lambda, muJ, sigmaJ }) {
  const numSteps = T <= 1
    ? Math.max(Math.round(252 * T), 5)
    : Math.round(52 * T);
  const dt = T / numSteps;

  // Build all paths
  const paths = [];
  for (let p = 0; p < numPaths; p++) {
    const path = new Float64Array(numSteps + 1);
    path[0] = S0;
    let S = S0;
    for (let t = 0; t < numSteps; t++) {
      let factor = Math.exp((mu - 0.5 * sigma * sigma) * dt + sigma * Math.sqrt(dt) * randn());
      if (model === 'JUMP') {
        const nJumps = poissonSample(lambda * dt);
        for (let j = 0; j < nJumps; j++) factor *= Math.exp(muJ + sigmaJ * randn());
      }
      S = S * factor;
      path[t + 1] = S;
    }
    paths.push(path);
  }

  // Final prices & sorted copy
  const finalPrices = paths.map(p => p[numSteps]);
  const sorted = [...finalPrices].sort((a, b) => a - b);

  // Statistics
  const mean   = finalPrices.reduce((a, b) => a + b, 0) / numPaths;
  const median = pctile(sorted, 50);
  const p5     = pctile(sorted, 5);
  const p95    = pctile(sorted, 95);
  const std    = Math.sqrt(finalPrices.reduce((a, b) => a + (b - mean) ** 2, 0) / numPaths);
  const pProfit = finalPrices.filter(v => v > S0).length / numPaths;

  // Mean path
  const meanPath = new Float64Array(numSteps + 1);
  for (let t = 0; t <= numSteps; t++)
    meanPath[t] = paths.reduce((a, p) => a + p[t], 0) / numPaths;

  // Percentile bands at 40 evenly-spaced steps (fast)
  const bandSamples = Math.min(numSteps + 1, 41);
  const bandIndices = Array.from({ length: bandSamples }, (_, i) =>
    Math.round(i * numSteps / (bandSamples - 1))
  );
  const p5Band  = new Float64Array(bandSamples);
  const p95Band = new Float64Array(bandSamples);
  bandIndices.forEach((tIdx, i) => {
    const vals = paths.map(p => p[tIdx]).sort((a, b) => a - b);
    p5Band[i]  = pctile(vals, 5);
    p95Band[i] = pctile(vals, 95);
  });

  // Histogram — 25 bins
  const hMin = sorted[0], hMax = sorted[sorted.length - 1];
  const binW = (hMax - hMin) / 25 || 1;
  const histBins = Array.from({ length: 25 }, (_, i) => ({
    price: hMin + (i + 0.5) * binW,
    label: `$${(hMin + i * binW).toFixed(0)}`,
    count: 0,
  }));
  finalPrices.forEach(v => {
    const idx = Math.min(Math.floor((v - hMin) / binW), 24);
    histBins[idx].count++;
  });

  return {
    paths, meanPath, p5Band, p95Band, bandIndices,
    finalPrices, sorted, histBins,
    numSteps, dt,
    stats: { mean, median, std, p5, p95, pProfit, S0, T },
  };
}

// ─── Canvas path chart ─────────────────────────────────────────────────────────

function drawPaths(canvas, results, theme) {
  if (!canvas || !results) return;
  const { paths, meanPath, p5Band, p95Band, bandIndices, numSteps } = results;
  const { S0 } = results.stats;

  const dpr = window.devicePixelRatio || 1;
  const W   = canvas.offsetWidth;
  const H   = canvas.offsetHeight;
  canvas.width  = W * dpr;
  canvas.height = H * dpr;
  const ctx = canvas.getContext('2d');
  ctx.scale(dpr, dpr);

  // Theme-aware colours from CSS variables
  const style   = getComputedStyle(document.documentElement);
  const hsl     = (v) => `hsl(${style.getPropertyValue(v).trim()})`;
  const hslA    = (v, a) => `hsla(${style.getPropertyValue(v).trim()},${a})`;
  const bg      = hsl('--background');
  const border  = hslA('--border', 0.6);
  const fgColor = hsl('--foreground');
  const green   = hslA('--terminal-green', 0.9);
  const red     = hslA('--destructive', 0.9);
  const primary = hslA('--primary', theme === 'dark' ? 0.5 : 0.4);
  const bandFill= hslA('--primary', 0.08);
  const meanClr = fgColor;

  // Price range with padding
  let minP = Infinity, maxP = -Infinity;
  paths.forEach(p => { if (p[0] < minP) minP = p[0]; if (p[p.length-1] > maxP) maxP = p[p.length-1]; });
  p5Band.forEach(v  => { if (v < minP) minP = v; });
  p95Band.forEach(v => { if (v > maxP) maxP = v; });
  const pad = (maxP - minP) * 0.1 || S0 * 0.2;
  minP -= pad; maxP += pad;

  const PAD_L = 56, PAD_R = 16, PAD_T = 16, PAD_B = 32;
  const cW = W - PAD_L - PAD_R;
  const cH = H - PAD_T - PAD_B;

  const xPos = (t) => PAD_L + (t / numSteps) * cW;
  const yPos = (v) => PAD_T + (1 - (v - minP) / (maxP - minP)) * cH;

  // Background
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, W, H);

  // Grid
  ctx.strokeStyle = border;
  ctx.lineWidth   = 0.5;
  for (let i = 0; i <= 4; i++) {
    const y = PAD_T + (i / 4) * cH;
    ctx.beginPath(); ctx.moveTo(PAD_L, y); ctx.lineTo(W - PAD_R, y); ctx.stroke();
    const val = maxP - (i / 4) * (maxP - minP);
    ctx.fillStyle = hslA('--muted-foreground', 0.6);
    ctx.font = `${10 * dpr / dpr}px monospace`;
    ctx.textAlign = 'right';
    ctx.fillText(`$${val.toFixed(0)}`, PAD_L - 4, y + 3);
  }

  // S0 reference line
  ctx.strokeStyle = hslA('--muted-foreground', 0.4);
  ctx.setLineDash([4, 4]);
  ctx.lineWidth = 1;
  const y0 = yPos(S0);
  ctx.beginPath(); ctx.moveTo(PAD_L, y0); ctx.lineTo(W - PAD_R, y0); ctx.stroke();
  ctx.setLineDash([]);

  // Confidence band (fill between p5 and p95)
  ctx.fillStyle = bandFill;
  ctx.beginPath();
  bandIndices.forEach((tIdx, i) => {
    const x = xPos(tIdx);
    if (i === 0) ctx.moveTo(x, yPos(p95Band[i]));
    else ctx.lineTo(x, yPos(p95Band[i]));
  });
  for (let i = bandIndices.length - 1; i >= 0; i--) {
    ctx.lineTo(xPos(bandIndices[i]), yPos(p5Band[i]));
  }
  ctx.closePath();
  ctx.fill();

  // Individual paths (capped at 200 for performance)
  const displayPaths = paths.length > 200 ? paths.slice(0, 200) : paths;
  const alpha = paths.length > 500 ? 0.04 : paths.length > 100 ? 0.07 : 0.12;
  displayPaths.forEach(path => {
    const finalVal = path[numSteps];
    ctx.strokeStyle = finalVal >= S0
      ? `hsla(${style.getPropertyValue('--terminal-green').trim()},${alpha})`
      : `hsla(${style.getPropertyValue('--destructive').trim()},${alpha})`;
    ctx.lineWidth = 0.8;
    ctx.beginPath();
    for (let t = 0; t <= numSteps; t++) {
      const x = xPos(t), y = yPos(path[t]);
      t === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
    }
    ctx.stroke();
  });

  // Mean path
  ctx.strokeStyle = meanClr;
  ctx.lineWidth   = 2;
  ctx.beginPath();
  for (let t = 0; t <= numSteps; t++) {
    const x = xPos(t), y = yPos(meanPath[t]);
    t === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
  }
  ctx.stroke();

  // X-axis labels
  ctx.fillStyle = hslA('--muted-foreground', 0.6);
  ctx.font = `10px monospace`;
  ctx.textAlign = 'center';
  const { T } = results.stats;
  const tLabels = T <= 1
    ? ['0', '3M', '6M', '9M', '1Y'].slice(0, T <= 0.25 ? 3 : T <= 0.5 ? 4 : 5)
    : ['0', ...Array.from({ length: Math.ceil(T) }, (_, i) => `${i+1}Y`)];
  tLabels.forEach((lbl, i) => {
    const x = PAD_L + (i / (tLabels.length - 1)) * cW;
    ctx.fillText(lbl, x, H - 6);
  });

  // Legend
  ctx.textAlign = 'left';
  ctx.fillStyle = hslA('--muted-foreground', 0.5);
  ctx.fillText('— MEAN', PAD_L + 4, PAD_T + 12);
  ctx.fillStyle = hslA('--primary', 0.5);
  ctx.fillText('  90% CI', PAD_L + 55, PAD_T + 12);
}

// ─── Sub-components ────────────────────────────────────────────────────────────

const StatRow = ({ label, value, highlight }) => (
  <div className="flex items-center justify-between py-1.5 border-b border-border/40 last:border-0">
    <span className="font-mono text-[10px] text-muted-foreground uppercase tracking-widest">{label}</span>
    <span className={`font-mono text-xs font-bold ${highlight || 'text-foreground'}`}>{value}</span>
  </div>
);

const SliderInput = ({ label, value, min, max, step, onChange, format }) => (
  <div>
    <div className="flex items-center justify-between mb-1">
      <label className="font-mono text-[10px] text-muted-foreground uppercase tracking-widest">{label}</label>
      <span className="font-mono text-xs text-primary font-bold">{format ? format(value) : value}</span>
    </div>
    <input
      type="range" min={min} max={max} step={step} value={value}
      onChange={e => onChange(parseFloat(e.target.value))}
      className="w-full h-1 appearance-none bg-border rounded-none cursor-pointer accent-primary"
    />
  </div>
);

const HistTooltip = ({ active, payload, totalPaths }) => {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload;
  return (
    <div className="border border-border bg-card px-3 py-2">
      <p className="font-mono text-[10px] text-muted-foreground">PRICE ≈ {d.label}</p>
      <p className="font-mono text-xs text-foreground font-bold">{d.count} paths</p>
      <p className="font-mono text-[10px] text-muted-foreground">{((d.count / totalPaths) * 100).toFixed(1)}%</p>
    </div>
  );
};

// ─── SimulatorPage ─────────────────────────────────────────────────────────────

const TIME_OPTIONS = [
  { label: '1W', value: 7/365 },
  { label: '1M', value: 1/12  },
  { label: '3M', value: 0.25  },
  { label: '6M', value: 0.5   },
  { label: '1Y', value: 1     },
  { label: '2Y', value: 2     },
  { label: '5Y', value: 5     },
];

const PATH_OPTIONS = [100, 500, 1000, 5000];

const SimulatorPage = () => {
  const { theme } = useTheme();
  const canvasRef  = useRef(null);

  // Config
  const [S0,     setS0]     = useState(100);
  const [mu,     setMu]     = useState(0.08);
  const [sigma,  setSigma]  = useState(0.20);
  const [T,      setT]      = useState(1);
  const [numPaths, setNumPaths] = useState(500);
  const [model,  setModel]  = useState('GBM');
  const [lambda, setLambda] = useState(1.0);
  const [muJ,    setMuJ]    = useState(-0.05);
  const [sigmaJ, setSigmaJ] = useState(0.10);

  // Option pricer
  const [strikeK,    setStrikeK]    = useState(100);
  const [optionType, setOptionType] = useState('CALL');
  const [rfRate,     setRfRate]     = useState(0.05);

  // State
  const [running, setRunning] = useState(false);
  const [results, setResults] = useState(null);

  // Draw whenever results or theme changes
  useEffect(() => {
    if (results && canvasRef.current) {
      drawPaths(canvasRef.current, results, theme);
    }
  }, [results, theme]);

  // Redraw on resize
  useEffect(() => {
    if (!results) return;
    const observer = new ResizeObserver(() => {
      if (canvasRef.current) drawPaths(canvasRef.current, results, theme);
    });
    if (canvasRef.current) observer.observe(canvasRef.current.parentElement);
    return () => observer.disconnect();
  }, [results, theme]);

  const handleRun = useCallback(() => {
    setRunning(true);
    // Defer to next tick so UI shows loading state
    setTimeout(() => {
      try {
        const res = runSimulation({ S0, mu, sigma, T, numPaths, model, lambda, muJ, sigmaJ });
        setStrikeK(parseFloat(S0.toFixed(2)));
        setResults(res);
      } finally {
        setRunning(false);
      }
    }, 20);
  }, [S0, mu, sigma, T, numPaths, model, lambda, muJ, sigmaJ]);

  // Option prices
  const mcPrice = results
    ? results.finalPrices.reduce((acc, ST) => {
        const payoff = optionType === 'CALL' ? Math.max(ST - strikeK, 0) : Math.max(strikeK - ST, 0);
        return acc + payoff;
      }, 0) / results.finalPrices.length * Math.exp(-rfRate * T)
    : null;

  const bsPrice = results
    ? blackScholes(S0, strikeK, rfRate, sigma, T, optionType)
    : null;

  const { stats, histBins } = results || {};

  return (
    <>
      <Helmet>
        <title>Monte Carlo Simulator — Dmitri De Freitas</title>
        <meta name="description" content="Interactive Monte Carlo price path simulator with GBM and Jump-Diffusion models." />
      </Helmet>

      <div className="min-h-screen pt-12 md:pt-14 pb-16">

        {/* ── Hero ── */}
        <section className="py-10 border-b border-border">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8">
            <SectionHeader number="07" title="MONTE CARLO SIMULATOR" />
            <p className="font-mono text-xs text-muted-foreground max-w-2xl">
              Simulate asset price paths under Geometric Brownian Motion or Merton Jump-Diffusion.
              Computes statistics, confidence intervals, and option prices via simulation vs Black-Scholes.
            </p>
          </div>
        </section>

        {/* ── Config ── */}
        <section className="py-8 border-b border-border bg-muted/10">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8">
            <div className="max-w-4xl space-y-6">

              {/* Row 1: S0, mu, sigma sliders */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                <SliderInput
                  label="Initial Price S₀"
                  value={S0} min={1} max={1000} step={1}
                  onChange={setS0}
                  format={v => `$${v}`}
                />
                <SliderInput
                  label="Annual Drift μ"
                  value={mu} min={-0.5} max={0.5} step={0.01}
                  onChange={setMu}
                  format={v => `${(v * 100).toFixed(0)}%`}
                />
                <SliderInput
                  label="Annual Volatility σ"
                  value={sigma} min={0.01} max={1.0} step={0.01}
                  onChange={setSigma}
                  format={v => `${(v * 100).toFixed(0)}%`}
                />
              </div>

              {/* Row 2: T, paths, model */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                {/* Time horizon */}
                <div>
                  <p className="font-mono text-[10px] text-muted-foreground uppercase tracking-widest mb-2">TIME HORIZON</p>
                  <div className="flex flex-wrap gap-1">
                    {TIME_OPTIONS.map(opt => (
                      <button
                        key={opt.label}
                        onClick={() => setT(opt.value)}
                        className={`font-mono text-[10px] px-2.5 py-1 border tracking-widest transition-colors ${
                          T === opt.value
                            ? 'bg-primary text-primary-foreground border-primary'
                            : 'border-border text-muted-foreground hover:text-foreground hover:border-primary/50'
                        }`}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Num paths */}
                <div>
                  <p className="font-mono text-[10px] text-muted-foreground uppercase tracking-widest mb-2">PATHS</p>
                  <div className="flex flex-wrap gap-1">
                    {PATH_OPTIONS.map(n => (
                      <button
                        key={n}
                        onClick={() => setNumPaths(n)}
                        className={`font-mono text-[10px] px-2.5 py-1 border tracking-widest transition-colors ${
                          numPaths === n
                            ? 'bg-primary text-primary-foreground border-primary'
                            : 'border-border text-muted-foreground hover:text-foreground hover:border-primary/50'
                        }`}
                      >
                        {n.toLocaleString()}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Model */}
                <div>
                  <p className="font-mono text-[10px] text-muted-foreground uppercase tracking-widest mb-2">MODEL</p>
                  <div className="flex gap-1">
                    {['GBM', 'JUMP'].map(m => (
                      <button
                        key={m}
                        onClick={() => setModel(m)}
                        className={`font-mono text-[10px] px-3 py-1 border tracking-widest transition-colors ${
                          model === m
                            ? 'bg-primary text-primary-foreground border-primary'
                            : 'border-border text-muted-foreground hover:text-foreground hover:border-primary/50'
                        }`}
                      >
                        {m === 'GBM' ? 'GBM' : 'JUMP-DIFFUSION'}
                      </button>
                    ))}
                  </div>
                  <p className="font-mono text-[9px] text-muted-foreground/50 mt-1">
                    {model === 'GBM' ? 'Geometric Brownian Motion (Black-Scholes)' : 'Merton (1976) Jump-Diffusion'}
                  </p>
                </div>
              </div>

              {/* Jump-diffusion params */}
              <AnimatePresence>
                {model === 'JUMP' && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: 0.2 }}
                    className="overflow-hidden"
                  >
                    <div className="border border-border/50 p-4 bg-muted/20">
                      <p className="font-mono text-[10px] text-muted-foreground uppercase tracking-widest mb-4">JUMP PARAMETERS</p>
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                        <SliderInput
                          label="Jump Intensity λ (per yr)"
                          value={lambda} min={0.1} max={10} step={0.1}
                          onChange={setLambda}
                          format={v => v.toFixed(1)}
                        />
                        <SliderInput
                          label="Mean Jump Size μJ"
                          value={muJ} min={-0.5} max={0.5} step={0.01}
                          onChange={setMuJ}
                          format={v => `${(v * 100).toFixed(0)}%`}
                        />
                        <SliderInput
                          label="Jump Volatility σJ"
                          value={sigmaJ} min={0.01} max={0.5} step={0.01}
                          onChange={setSigmaJ}
                          format={v => `${(v * 100).toFixed(0)}%`}
                        />
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Run button */}
              <button
                onClick={handleRun}
                disabled={running}
                className="font-mono text-[11px] tracking-widest bg-primary text-primary-foreground px-8 py-3 hover:bg-primary/90 transition-colors disabled:opacity-50 flex items-center gap-2"
              >
                {running
                  ? <><span className="animate-pulse">SIMULATING...</span></>
                  : <><Play className="w-3.5 h-3.5" /> RUN SIMULATION ({numPaths.toLocaleString()} PATHS)</>
                }
              </button>
            </div>
          </div>
        </section>

        {/* ── Results ── */}
        <AnimatePresence>
          {results && (
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4 }}
            >
              {/* Path chart */}
              <section className="py-8 border-b border-border">
                <div className="container mx-auto px-4 sm:px-6 lg:px-8">
                  <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
                    <p className="font-mono text-[10px] text-muted-foreground uppercase tracking-widest">
                      PRICE PATH SIMULATION · {numPaths.toLocaleString()} PATHS · {model}
                    </p>
                    <div className="flex items-center gap-3">
                      <span className="font-mono text-[9px] text-terminal-green/70">— ABOVE S₀</span>
                      <span className="font-mono text-[9px] text-destructive/70">— BELOW S₀</span>
                      <span className="font-mono text-[9px] text-foreground">— MEAN</span>
                    </div>
                  </div>
                  <div className="border border-border w-full" style={{ height: 360 }}>
                    <canvas ref={canvasRef} className="w-full h-full" />
                  </div>
                </div>
              </section>

              {/* Stats + histogram */}
              <section className="py-8 border-b border-border bg-muted/10">
                <div className="container mx-auto px-4 sm:px-6 lg:px-8">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-5xl">

                    {/* Statistics panel */}
                    <div>
                      <p className="font-mono text-[10px] text-muted-foreground uppercase tracking-widest mb-4">SIMULATION STATISTICS</p>
                      <div className="border border-border px-4 py-2">
                        <StatRow label="MEAN FINAL PRICE"   value={`$${stats.mean.toFixed(2)}`}   highlight={stats.mean >= stats.S0 ? 'text-terminal-green' : 'text-destructive'} />
                        <StatRow label="MEDIAN FINAL PRICE" value={`$${stats.median.toFixed(2)}`} />
                        <StatRow label="STD DEV (FINAL)"    value={`$${stats.std.toFixed(2)}`}    />
                        <StatRow label="5TH PERCENTILE"     value={`$${stats.p5.toFixed(2)}`}     highlight="text-destructive" />
                        <StatRow label="95TH PERCENTILE"    value={`$${stats.p95.toFixed(2)}`}    highlight="text-terminal-green" />
                        <StatRow label="P(PROFIT)"          value={`${(stats.pProfit * 100).toFixed(1)}%`} highlight={stats.pProfit >= 0.5 ? 'text-terminal-green' : 'text-destructive'} />
                        <StatRow label="EXPECTED RETURN"    value={`${(((stats.mean - stats.S0) / stats.S0) * 100).toFixed(2)}%`} highlight={stats.mean >= stats.S0 ? 'text-terminal-green' : 'text-destructive'} />
                        <StatRow label="VaR (95%)"          value={`-$${(stats.S0 - stats.p5).toFixed(2)}`} highlight="text-destructive" />
                        <StatRow label="PATHS SIMULATED"    value={numPaths.toLocaleString()} />
                        <StatRow label="INPUT σ (ANNUAL)"   value={`${(sigma * 100).toFixed(0)}%`} />
                      </div>
                    </div>

                    {/* Histogram */}
                    <div>
                      <p className="font-mono text-[10px] text-muted-foreground uppercase tracking-widest mb-4">FINAL PRICE DISTRIBUTION</p>
                      <div style={{ height: 260 }}>
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart data={histBins} margin={{ top: 4, right: 8, left: -20, bottom: 4 }}>
                            <XAxis
                              dataKey="label"
                              tick={{ fontFamily: 'monospace', fontSize: 8, fill: 'hsl(var(--muted-foreground))' }}
                              interval={4}
                              axisLine={false}
                              tickLine={false}
                            />
                            <YAxis
                              tick={{ fontFamily: 'monospace', fontSize: 8, fill: 'hsl(var(--muted-foreground))' }}
                              axisLine={false}
                              tickLine={false}
                            />
                            <Tooltip content={<HistTooltip totalPaths={numPaths} />} />
                            <ReferenceLine
                              x={histBins.reduce((a, b) => Math.abs(b.price - stats.S0) < Math.abs(a.price - stats.S0) ? b : a).label}
                              stroke="hsl(var(--muted-foreground))"
                              strokeDasharray="3 3"
                              label={{ value: 'S₀', fill: 'hsl(var(--muted-foreground))', fontSize: 9, fontFamily: 'monospace' }}
                            />
                            <Bar dataKey="count" radius={0}>
                              {histBins.map((entry, i) => (
                                <Cell
                                  key={i}
                                  fill={entry.price >= stats.S0
                                    ? 'hsl(var(--terminal-green) / 0.7)'
                                    : 'hsl(var(--destructive) / 0.6)'}
                                />
                              ))}
                            </Bar>
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                      <p className="font-mono text-[9px] text-muted-foreground/50 mt-1 text-right">
                        GREEN = above S₀ · RED = below S₀
                      </p>
                    </div>
                  </div>
                </div>
              </section>

              {/* Option pricer */}
              <section className="py-8">
                <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-5xl">
                  <p className="font-mono text-[10px] text-muted-foreground uppercase tracking-widest mb-4">OPTION PRICER — MC vs BLACK-SCHOLES</p>
                  <p className="font-mono text-[10px] text-muted-foreground/60 mb-5">
                    Uses the same simulated paths to price the option. Compares Monte Carlo estimate to the closed-form Black-Scholes price.
                  </p>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mb-6">
                    {/* Strike */}
                    <SliderInput
                      label="Strike Price K"
                      value={strikeK}
                      min={Math.max(1, S0 * 0.5)}
                      max={S0 * 2}
                      step={0.5}
                      onChange={setStrikeK}
                      format={v => `$${v.toFixed(2)}`}
                    />
                    {/* Risk-free rate */}
                    <SliderInput
                      label="Risk-Free Rate r"
                      value={rfRate}
                      min={0}
                      max={0.15}
                      step={0.005}
                      onChange={setRfRate}
                      format={v => `${(v * 100).toFixed(1)}%`}
                    />
                    {/* Option type */}
                    <div>
                      <p className="font-mono text-[10px] text-muted-foreground uppercase tracking-widest mb-2">OPTION TYPE</p>
                      <div className="flex gap-1">
                        {['CALL', 'PUT'].map(t => (
                          <button
                            key={t}
                            onClick={() => setOptionType(t)}
                            className={`font-mono text-[10px] px-4 py-1 border tracking-widest transition-colors ${
                              optionType === t
                                ? 'bg-primary text-primary-foreground border-primary'
                                : 'border-border text-muted-foreground hover:text-foreground'
                            }`}
                          >
                            {t}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Prices */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {[
                      { label: 'MC PRICE',             value: `$${mcPrice.toFixed(4)}`,  note: `${numPaths.toLocaleString()} paths`, highlight: 'text-primary' },
                      { label: 'BLACK-SCHOLES PRICE',  value: `$${bsPrice.toFixed(4)}`,  note: 'Closed-form',                        highlight: 'text-terminal-green' },
                      { label: 'DIFFERENCE',           value: `$${Math.abs(mcPrice - bsPrice).toFixed(4)}`, note: `${(Math.abs(mcPrice - bsPrice) / (bsPrice || 1) * 100).toFixed(2)}% error`, highlight: 'text-muted-foreground' },
                      { label: 'MONEYNESS',            value: strikeK < S0 ? (optionType === 'CALL' ? 'ITM' : 'OTM') : strikeK > S0 ? (optionType === 'CALL' ? 'OTM' : 'ITM') : 'ATM', note: `K=${strikeK.toFixed(2)} S₀=${S0}`, highlight: strikeK <= S0 ? 'text-terminal-green' : 'text-destructive' },
                    ].map(card => (
                      <div key={card.label} className="border border-border p-3">
                        <p className="font-mono text-[9px] text-muted-foreground uppercase tracking-widest mb-1">{card.label}</p>
                        <p className={`font-mono text-base font-bold ${card.highlight}`}>{card.value}</p>
                        <p className="font-mono text-[9px] text-muted-foreground/50 mt-0.5">{card.note}</p>
                      </div>
                    ))}
                  </div>

                  <p className="font-mono text-[9px] text-muted-foreground/40 mt-4">
                    · MC price converges to BS price as paths → ∞ under GBM · Jump-Diffusion will deviate from standard BS
                  </p>
                </div>
              </section>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Empty state */}
        {!results && !running && (
          <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-20 text-center">
            <p className="font-mono text-xs text-muted-foreground/40 tracking-widest">
              CONFIGURE PARAMETERS ABOVE AND PRESS RUN SIMULATION
            </p>
          </div>
        )}

      </div>
    </>
  );
};

export default SimulatorPage;
