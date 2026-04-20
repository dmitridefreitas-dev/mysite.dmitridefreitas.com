import React, { useState, useMemo, useCallback } from 'react';
import { Helmet } from 'react-helmet';
import {
  LineChart, Line, BarChart, Bar, ScatterChart, Scatter,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer, ReferenceLine, Cell,
} from 'recharts';
import { RefreshCw } from 'lucide-react';

const API_BASE = window.location.hostname === 'localhost'
  ? '/hcgi/api'
  : 'https://newsapi-xspv.onrender.com';

// ── Math helpers ──────────────────────────────────────────────────────────────

function normalCDF(x) {
  const a1=0.254829592,a2=-0.284496736,a3=1.421413741,a4=-1.453152027,a5=1.061405429,p=0.3275911;
  const sign = x < 0 ? -1 : 1;
  const t = 1 / (1 + p * Math.abs(x) / Math.SQRT2);
  const y = 1 - (((((a5*t+a4)*t)+a3)*t+a2)*t+a1)*t*Math.exp(-x*x/2);
  return 0.5*(1+sign*y);
}
function normalPDF(x) { return Math.exp(-0.5*x*x)/Math.sqrt(2*Math.PI); }

function bsPrice(S, K, T, r, sigma, isCall) {
  if (T <= 0 || sigma <= 0) {
    const intrinsic = isCall ? Math.max(S - K, 0) : Math.max(K - S, 0);
    return intrinsic;
  }
  const d1 = (Math.log(S/K) + (r + 0.5*sigma*sigma)*T) / (sigma*Math.sqrt(T));
  const d2 = d1 - sigma*Math.sqrt(T);
  if (isCall) return S*normalCDF(d1) - K*Math.exp(-r*T)*normalCDF(d2);
  return K*Math.exp(-r*T)*normalCDF(-d2) - S*normalCDF(-d1);
}

function bsGreeks(S, K, T, r, sigma, isCall) {
  if (T <= 0 || sigma <= 0) return { delta: isCall ? (S>K?1:0) : (S<K?-1:0), gamma:0, vega:0, theta:0, vanna:0, volga:0 };
  const sqrtT = Math.sqrt(T);
  const d1 = (Math.log(S/K) + (r + 0.5*sigma*sigma)*T) / (sigma*sqrtT);
  const d2 = d1 - sigma*sqrtT;
  const nd1 = normalPDF(d1);
  const delta = isCall ? normalCDF(d1) : normalCDF(d1)-1;
  const gamma = nd1 / (S*sigma*sqrtT);
  const vega  = S*nd1*sqrtT / 100; // per 1 vol point
  const theta = isCall
    ? (-S*nd1*sigma/(2*sqrtT) - r*K*Math.exp(-r*T)*normalCDF(d2)) / 365
    : (-S*nd1*sigma/(2*sqrtT) + r*K*Math.exp(-r*T)*normalCDF(-d2)) / 365;
  const vanna  = -nd1*d2/sigma;          // dDelta/dVol per unit (×qty later)
  const volga  = S*nd1*sqrtT*d1*d2/sigma; // dVega/dVol
  return { delta, gamma, vega, theta, vanna, volga, d1, d2 };
}

// ── SVI (Stochastic Volatility Inspired) model ────────────────────────────────
// w(k) = a + b*(rho*(k-m) + sqrt((k-m)^2 + sigma^2))
// where k = log(K/F), w = sigma_implied^2 * T
function sviVariance(k, a, b, rho, m, sigma_svi) {
  const diff = k - m;
  return a + b*(rho*diff + Math.sqrt(diff*diff + sigma_svi*sigma_svi));
}

function sviIV(k, T, a, b, rho, m, sigma_svi) {
  if (T <= 0) return 0;
  const w = sviVariance(k, a, b, rho, m, sigma_svi);
  return w > 0 ? Math.sqrt(w / T) : 0;
}

// Fit SVI to a set of {k, iv} points via Nelder-Mead (simplified grid search for robustness)
function fitSVI(points, T) {
  // Convert IV to total variance
  const data = points.map(p => ({ k: p.k, w: p.iv*p.iv*T }));
  let bestParams = { a:0.04, b:0.1, rho:-0.3, m:0, sigma_svi:0.1 };
  let bestErr = Infinity;

  // Grid search over rho and m, then refine
  for (let rho = -0.9; rho <= 0.9; rho += 0.3) {
    for (let m = -0.3; m <= 0.3; m += 0.1) {
      for (let bVal = 0.05; bVal <= 0.5; bVal += 0.1) {
        for (let sig = 0.05; sig <= 0.3; sig += 0.1) {
          // Given rho,m,b,sigma: fit a via OLS
          const n = data.length;
          let sumW = 0, sumFit = 0;
          const fits = data.map(d => {
            const diff = d.k - m;
            return bVal*(rho*diff + Math.sqrt(diff*diff + sig*sig));
          });
          const aVal = (data.reduce((s,d,i) => s + d.w - fits[i], 0)) / n;
          const err = data.reduce((s,d,i) => {
            const pred = aVal + fits[i];
            return s + (pred - d.w)**2;
          }, 0);
          if (err < bestErr && aVal > -0.01) {
            bestErr = err;
            bestParams = { a: aVal, b: bVal, rho, m, sigma_svi: sig };
          }
        }
      }
    }
  }
  return bestParams;
}

// ── Variance swap (log-contract replication) ─────────────────────────────────
// Fair variance = (2/T) * [ sum_puts(ΔK/K²*P) + sum_calls(ΔK/K²*C) ]
// Simplified: from SVI params, fair_var ≈ a + b*sigma_svi*sqrt(1-rho^2) + b*|m| (approximation)
function fairVarianceFromSVI({ a, b, rho, m, sigma_svi }) {
  // Carr-Madan approximate fair variance for SVI
  return a + b * Math.sqrt(sigma_svi*sigma_svi + m*m*(1-rho*rho));
}

// Compute strip of replication weights across strikes
function varSwapStrip(params, T, F, strikes) {
  // Weight for each strike: ΔK/K² scaled by 2/T
  const sorted = [...strikes].sort((a,b) => a-b);
  const result = [];
  for (let i = 0; i < sorted.length; i++) {
    const K = sorted[i];
    const dK = i === 0
      ? sorted[1] - sorted[0]
      : i === sorted.length-1
        ? sorted[sorted.length-1] - sorted[sorted.length-2]
        : (sorted[i+1] - sorted[i-1]) / 2;
    const k = Math.log(K/F);
    const iv = sviIV(k, T, params.a, params.b, params.rho, params.m, params.sigma_svi);
    const weight = (2/T) * dK / (K*K);
    result.push({ strike: K, moneyness: +(k*100).toFixed(2), iv: +(iv*100).toFixed(2), weight: +weight.toFixed(8) });
  }
  return result;
}

// ── Section components ────────────────────────────────────────────────────────

const SectionHeader = ({ num, title, subtitle }) => (
  <div className="border-b border-border pb-3 mb-5">
    <span className="font-mono text-[9px] text-primary tracking-widest">[{num}]</span>
    <h2 className="font-mono text-sm font-bold tracking-widest text-foreground mt-0.5">{title}</h2>
    {subtitle && <p className="font-mono text-[10px] text-muted-foreground mt-0.5">{subtitle}</p>}
  </div>
);

const StatBox = ({ label, value, sub }) => (
  <div className="border border-border p-3">
    <p className="font-mono text-[8px] text-muted-foreground tracking-widest mb-1">{label}</p>
    <p className="font-mono text-base font-bold text-primary tabular-nums">{value}</p>
    {sub && <p className="font-mono text-[8px] text-muted-foreground mt-0.5">{sub}</p>}
  </div>
);

const SliderRow = ({ label, min, max, step, value, onChange, fmt }) => (
  <div className="flex items-center gap-3 mb-2">
    <span className="font-mono text-[9px] text-muted-foreground w-28 shrink-0">{label}</span>
    <input type="range" min={min} max={max} step={step} value={value}
      onChange={e => onChange(parseFloat(e.target.value))}
      className="flex-1 accent-primary h-1" />
    <span className="font-mono text-[10px] text-primary w-14 text-right tabular-nums">
      {fmt ? fmt(value) : value}
    </span>
  </div>
);

const ChartTooltip = ({ active, payload, label, xLabel, yLabel }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="border border-border bg-background p-2 font-mono text-[9px]">
      {label != null && <p className="text-muted-foreground mb-0.5">{xLabel ?? ''}: {label}</p>}
      {payload.map(p => (
        <p key={p.name} style={{ color: p.color ?? 'var(--primary)' }}>
          {p.name}: {typeof p.value === 'number' ? p.value.toFixed(3) : p.value}
        </p>
      ))}
    </div>
  );
};

// ── Section 1: SVI Calibration ────────────────────────────────────────────────

function SVISection() {
  const [ticker, setTicker] = useState('SPY');
  const [input, setInput]   = useState('SPY');
  const [loading, setLoading] = useState(false);
  const [error, setError]   = useState(null);
  const [surfaceData, setSurfaceData] = useState(null);
  const [selExpiry, setSelExpiry] = useState(0);

  const fetchChain = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const res  = await fetch(`${API_BASE}/market-data/options?ticker=${input.trim().toUpperCase()}`);
      const json = await res.json();
      if (json.error) throw new Error(json.error);
      setSurfaceData(json);
      setTicker(input.trim().toUpperCase());
      setSelExpiry(0);
    } catch (e) { setError(e.message); }
    finally { setLoading(false); }
  }, [input]);

  const { expiry, sviParams, chartData, residuals, fairVar, volSwapIV, rmse } = useMemo(() => {
    if (!surfaceData?.surface?.length) return {};
    const exp = surfaceData.surface[selExpiry];
    if (!exp) return {};
    const F = surfaceData.spot;
    const T = exp.dte / 365;
    const points = exp.strikes
      .filter(s => s.iv > 0.01 && s.iv < 2 && s.strike > 0)
      .map(s => ({ k: Math.log(s.strike / F), iv: s.iv, strike: s.strike }));
    if (points.length < 4) return { expiry: exp };

    const params = fitSVI(points, T);
    const kGrid = [];
    for (let k = -0.5; k <= 0.5; k += 0.01) kGrid.push(k);

    const chartData = kGrid.map(k => ({
      k: +(k * 100).toFixed(1),
      SVI: +(sviIV(k, T, params.a, params.b, params.rho, params.m, params.sigma_svi) * 100).toFixed(3),
    }));
    const marketPts = points.map(p => ({
      k: +(p.k * 100).toFixed(2),
      Market: +(p.iv * 100).toFixed(3),
    }));

    const residuals = points.map(p => {
      const fitted = sviIV(p.k, T, params.a, params.b, params.rho, params.m, params.sigma_svi);
      return { k: +(p.k*100).toFixed(2), residual: +((p.iv - fitted)*100).toFixed(3) };
    });
    const rmse = Math.sqrt(residuals.reduce((s,r) => s + r.residual**2, 0) / residuals.length);
    const fairVar = fairVarianceFromSVI(params);
    const volSwapIV = Math.sqrt(fairVar / T) * 100;

    return { expiry: exp, sviParams: params, chartData, marketPts, residuals, rmse: +rmse.toFixed(4), fairVar, volSwapIV: +volSwapIV.toFixed(2) };
  }, [surfaceData, selExpiry]);

  return (
    <div className="space-y-5">
      {/* Ticker input */}
      <div className="flex items-center gap-2">
        <input
          value={input} onChange={e => setInput(e.target.value.toUpperCase())}
          onKeyDown={e => e.key === 'Enter' && fetchChain()}
          className="font-mono text-xs bg-background border border-border px-3 py-1.5 text-foreground w-28 focus:outline-none focus:border-primary"
          placeholder="TICKER"
        />
        <button onClick={fetchChain} disabled={loading}
          className="font-mono text-[10px] tracking-widest border border-border px-3 py-1.5 hover:border-primary hover:text-primary transition-colors disabled:opacity-40">
          {loading ? 'LOADING...' : 'FETCH CHAIN'}
        </button>
        {error && <span className="font-mono text-[9px] text-destructive">{error}</span>}
      </div>

      {surfaceData && (
        <>
          {/* Expiry selector */}
          <div className="flex flex-wrap gap-1.5">
            {surfaceData.surface.map((e, i) => (
              <button key={i} onClick={() => setSelExpiry(i)}
                className={`font-mono text-[9px] tracking-widest border px-2 py-0.5 transition-colors ${selExpiry===i ? 'border-primary text-primary bg-primary/5' : 'border-border text-muted-foreground hover:border-primary'}`}>
                {e.expiry} ({e.dte}d)
              </button>
            ))}
          </div>

          {sviParams && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
              {/* Smile chart */}
              <div className="border border-border p-4">
                <p className="font-mono text-[9px] tracking-widest text-muted-foreground mb-3">
                  IV SMILE — {expiry?.expiry} · SVI FIT
                </p>
                <ResponsiveContainer width="100%" height={220}>
                  <LineChart margin={{ top: 4, right: 8, bottom: 4, left: 8 }}>
                    <CartesianGrid strokeDasharray="3 3" strokeOpacity={0.12} />
                    <XAxis dataKey="k" type="number" domain={[-50,50]}
                      tickFormatter={v => `${v}%`} tick={{ fontFamily:'monospace', fontSize:8 }} label={{ value:'log-moneyness (%)', style:{fontFamily:'monospace',fontSize:8}, position:'insideBottom', offset:-2 }} />
                    <YAxis tickFormatter={v => `${v}%`} tick={{ fontFamily:'monospace', fontSize:8 }} width={36} />
                    <Tooltip content={<ChartTooltip xLabel="k" />} />
                    <Legend wrapperStyle={{ fontFamily:'monospace', fontSize:8 }} />
                    <Line data={chartData} type="monotone" dataKey="SVI" stroke="hsl(var(--primary))" strokeWidth={2} dot={false} />
                    <Line data={surfaceData ? expiry?.strikes?.filter(s=>s.iv>0.01&&s.iv<2).map(s=>({ k:+(Math.log(s.strike/surfaceData.spot)*100).toFixed(2), Market:+(s.iv*100).toFixed(3) })) : []}
                      type="scatter" dataKey="Market" stroke="#f59e0b" dot={{ r:3, fill:'#f59e0b' }} strokeWidth={0} />
                  </LineChart>
                </ResponsiveContainer>
              </div>

              {/* Residual chart */}
              <div className="border border-border p-4">
                <p className="font-mono text-[9px] tracking-widest text-muted-foreground mb-3">
                  RESIDUALS (Market − SVI fitted) · RMSE {rmse?.toFixed(3)}%
                </p>
                <ResponsiveContainer width="100%" height={220}>
                  <ScatterChart margin={{ top: 4, right: 8, bottom: 4, left: 8 }}>
                    <CartesianGrid strokeDasharray="3 3" strokeOpacity={0.12} />
                    <XAxis dataKey="k" type="number" name="k" tickFormatter={v=>`${v}%`} tick={{ fontFamily:'monospace', fontSize:8 }} />
                    <YAxis dataKey="residual" type="number" name="residual" tickFormatter={v=>`${v.toFixed(1)}%`} tick={{ fontFamily:'monospace', fontSize:8 }} width={38} />
                    <ReferenceLine y={0} stroke="hsl(var(--muted-foreground))" strokeDasharray="3 3" strokeOpacity={0.4} />
                    <Tooltip content={({ active, payload }) => {
                      if (!active || !payload?.length) return null;
                      const d = payload[0]?.payload;
                      return <div className="border border-border bg-background p-1.5 font-mono text-[9px]"><p>k: {d?.k}%</p><p>residual: {d?.residual?.toFixed(3)}%</p></div>;
                    }} />
                    <Scatter data={residuals} fill="hsl(var(--primary))" opacity={0.8} />
                  </ScatterChart>
                </ResponsiveContainer>
              </div>

              {/* SVI params */}
              <div className="border border-border p-4">
                <p className="font-mono text-[9px] tracking-widest text-muted-foreground mb-3">SVI PARAMETERS</p>
                <div className="space-y-1.5">
                  {[
                    ['a (min variance)',     sviParams.a.toFixed(5), 'overall variance level'],
                    ['b (vol of vol)',       sviParams.b.toFixed(4), 'smile width'],
                    ['ρ (skew correlation)', sviParams.rho.toFixed(3), 'left/right skew tilt'],
                    ['m (ATM shift)',        sviParams.m.toFixed(4), 'smile center in log-moneyness'],
                    ['σ_svi (curvature)',    sviParams.sigma_svi.toFixed(4), 'smile curvature / wings'],
                  ].map(([k, v, note]) => (
                    <div key={k} className="flex justify-between items-baseline gap-2">
                      <span className="font-mono text-[9px] text-muted-foreground">{k}</span>
                      <span className="font-mono text-[9px] text-primary tabular-nums">{v}</span>
                    </div>
                  ))}
                </div>
                <p className="font-mono text-[8px] text-muted-foreground mt-3 leading-relaxed border-t border-border pt-2">
                  w(k) = a + b·(ρ·(k−m) + √((k−m)²+σ²)) · Gatheral (2004) raw SVI parameterization
                </p>
              </div>

              {/* Variance swap */}
              <div className="border border-border p-4">
                <p className="font-mono text-[9px] tracking-widest text-muted-foreground mb-3">VARIANCE SWAP REPLICATION</p>
                <div className="grid grid-cols-2 gap-3 mb-3">
                  <StatBox label="FAIR VARIANCE" value={(fairVar*100).toFixed(4)} sub="×100 annualized" />
                  <StatBox label="VOL-SWAP IV" value={`${volSwapIV}%`} sub="√(fair var / T)" />
                  <StatBox label="ATM IV" value={`${(expiry?.strikes ? (() => { const s = surfaceData.spot; const sorted=[...expiry.strikes].sort((a,b)=>Math.abs(a.strike-s)-Math.abs(b.strike-s)); return sorted[0]?.iv ? (sorted[0].iv*100).toFixed(2) : '—' })() : '—')}%`} sub="closest to spot" />
                  <StatBox label="VOL PREMIUM" value={`${volSwapIV && expiry?.strikes ? (() => { const s = surfaceData.spot; const sorted=[...expiry.strikes].sort((a,b)=>Math.abs(a.strike-s)-Math.abs(b.strike-s)); const atm=sorted[0]?.iv; return atm ? (atm*100 - volSwapIV).toFixed(2) : '—' })() : '—'}%`} sub="ATM − vol swap" />
                </div>
                <p className="font-mono text-[8px] text-muted-foreground leading-relaxed">
                  A variance swap pays realized var − fair var. The fair variance is replicated by a log-contract: a continuous strip of OTM options weighted 2/T·ΔK/K². Vol swap IV = √(fair var/T) is the break-even realized vol.
                </p>
              </div>
            </div>
          )}
          {!sviParams && <p className="font-mono text-[9px] text-muted-foreground">Insufficient strikes for this expiry.</p>}
        </>
      )}

      {!surfaceData && !loading && (
        <p className="font-mono text-[9px] text-muted-foreground">Enter a ticker and fetch the options chain to calibrate SVI.</p>
      )}
    </div>
  );
}

// ── Section 2: Greeks P&L Attribution ─────────────────────────────────────────

function GreeksPnLSection() {
  const [S, setS]       = useState(500);
  const [K, setK]       = useState(500);
  const [T, setT]       = useState(30);
  const [sigma, setSigma] = useState(20);
  const [r, setR]       = useState(5);
  const [isCall, setIsCall] = useState(true);
  const [qty, setQty]   = useState(1);
  const [dS, setDS]     = useState(0);
  const [dVol, setDVol] = useState(0);
  const [dt, setDt]     = useState(0);

  const Tyrs  = T / 365;
  const sig   = sigma / 100;
  const rRate = r / 100;

  const { price, greeks, pnlDecomp, profileData } = useMemo(() => {
    const g    = bsGreeks(S, K, Tyrs, rRate, sig, isCall);
    const price = bsPrice(S, K, Tyrs, rRate, sig, isCall);

    // P&L decomposition for given shocks
    const dSigma = dVol / 100;
    const dTyrs  = dt / 365;
    const S2     = S + dS;
    const sig2   = sig + dSigma;
    const T2     = Math.max(Tyrs - dTyrs, 0.001);
    const newPrice = bsPrice(S2, K, T2, rRate, sig2, isCall);
    const totalPnL = (newPrice - price) * qty * 100;

    // First-order approximations
    const deltaP = g.delta * dS * qty * 100;
    const gammaP = 0.5 * g.gamma * dS * dS * qty * 100;
    const vegaP  = g.vega * dVol * qty * 100;
    const thetaP = g.theta * dt * qty * 100;
    const vannaP = g.vanna * dS * dSigma * qty * 100;
    const volgaP = 0.5 * g.volga * dSigma * dSigma * qty * 100;
    const residual = totalPnL - (deltaP + gammaP + vegaP + thetaP + vannaP + volgaP);

    // Profile chart: P&L vs spot
    const profileData = [];
    for (let s = S * 0.8; s <= S * 1.2; s += S * 0.01) {
      const p0 = bsPrice(S, K, Tyrs, rRate, sig, isCall);
      const p1 = bsPrice(s, K, T2, rRate, sig2, isCall);
      profileData.push({ spot: +s.toFixed(1), pnl: +((p1-p0)*qty*100).toFixed(2) });
    }

    return {
      price: +price.toFixed(4),
      greeks: { delta: +g.delta.toFixed(4), gamma: +g.gamma.toFixed(6), vega: +g.vega.toFixed(4), theta: +g.theta.toFixed(4), vanna: +g.vanna.toFixed(4), volga: +g.volga.toFixed(4) },
      pnlDecomp: { totalPnL: +totalPnL.toFixed(2), deltaP: +deltaP.toFixed(2), gammaP: +gammaP.toFixed(2), vegaP: +vegaP.toFixed(2), thetaP: +thetaP.toFixed(2), vannaP: +vannaP.toFixed(2), volgaP: +volgaP.toFixed(2), residual: +residual.toFixed(2) },
      profileData,
    };
  }, [S, K, Tyrs, sig, rRate, isCall, qty, dS, dVol, dt]);

  const pnlColor = v => v >= 0 ? 'text-terminal-green' : 'text-destructive';

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
      {/* Inputs */}
      <div className="space-y-4">
        <div className="border border-border p-4">
          <p className="font-mono text-[9px] tracking-widest text-foreground mb-3">POSITION</p>
          <div className="flex gap-2 mb-3">
            {['CALL','PUT'].map(t => (
              <button key={t} onClick={() => setIsCall(t==='CALL')}
                className={`flex-1 font-mono text-[9px] tracking-widest border py-1 transition-colors ${(t==='CALL')===isCall ? 'border-primary text-primary bg-primary/5' : 'border-border text-muted-foreground hover:border-primary'}`}>
                {t}
              </button>
            ))}
          </div>
          <SliderRow label="SPOT (S)" min={100} max={1000} step={1} value={S} onChange={setS} fmt={v => `$${v}`} />
          <SliderRow label="STRIKE (K)" min={100} max={1000} step={1} value={K} onChange={setK} fmt={v => `$${v}`} />
          <SliderRow label="DTE" min={1} max={365} step={1} value={T} onChange={setT} fmt={v => `${v}d`} />
          <SliderRow label="IV (σ)" min={5} max={100} step={0.5} value={sigma} onChange={setSigma} fmt={v => `${v}%`} />
          <SliderRow label="RATE (r)" min={0} max={10} step={0.25} value={r} onChange={setR} fmt={v => `${v}%`} />
          <SliderRow label="CONTRACTS" min={-10} max={10} step={1} value={qty} onChange={setQty} fmt={v => v > 0 ? `+${v}` : `${v}`} />
        </div>

        <div className="border border-border p-4">
          <p className="font-mono text-[9px] tracking-widest text-foreground mb-3">SHOCKS</p>
          <SliderRow label="ΔS (spot move)" min={-100} max={100} step={1} value={dS} onChange={setDS} fmt={v => `${v>=0?'+':''}$${v}`} />
          <SliderRow label="Δvol" min={-15} max={15} step={0.5} value={dVol} onChange={setDVol} fmt={v => `${v>=0?'+':''}${v}%`} />
          <SliderRow label="Δt (days)" min={0} max={30} step={1} value={dt} onChange={setDt} fmt={v => `${v}d`} />
        </div>

        {/* Greeks */}
        <div className="border border-border p-4">
          <p className="font-mono text-[9px] tracking-widest text-foreground mb-2">OPTION PRICE & GREEKS</p>
          <div className="space-y-1">
            {[
              ['PRICE', `$${price}`],
              ['DELTA', greeks?.delta],
              ['GAMMA', greeks?.gamma],
              ['VEGA (per 1%)', greeks?.vega],
              ['THETA (per day)', greeks?.theta],
              ['VANNA', greeks?.vanna],
              ['VOLGA', greeks?.volga],
            ].map(([k, v]) => (
              <div key={k} className="flex justify-between">
                <span className="font-mono text-[9px] text-muted-foreground">{k}</span>
                <span className="font-mono text-[9px] text-primary tabular-nums">{v}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* P&L decomp */}
      <div className="space-y-4">
        <div className="border border-border p-4">
          <p className="font-mono text-[9px] tracking-widest text-foreground mb-3">P&L ATTRIBUTION (per {Math.abs(qty)} contract{Math.abs(qty)!==1?'s':''})</p>
          <div className="space-y-2">
            {pnlDecomp && [
              ['TOTAL P&L', pnlDecomp.totalPnL, 'full revalue'],
              ['DELTA', pnlDecomp.deltaP, 'Δ·ΔS'],
              ['GAMMA', pnlDecomp.gammaP, '½·Γ·ΔS²'],
              ['VEGA', pnlDecomp.vegaP, 'V·Δσ'],
              ['THETA', pnlDecomp.thetaP, 'θ·Δt'],
              ['VANNA', pnlDecomp.vannaP, 'vanna·ΔS·Δσ'],
              ['VOLGA', pnlDecomp.volgaP, '½·volga·Δσ²'],
              ['RESIDUAL', pnlDecomp.residual, 'higher order'],
            ].map(([label, val, note], i) => (
              <div key={label} className={`flex justify-between items-baseline ${i===0 ? 'border-b border-border pb-2 mb-1' : ''}`}>
                <div>
                  <span className={`font-mono text-[9px] ${i===0?'text-foreground font-bold':'text-muted-foreground'}`}>{label}</span>
                  <span className="font-mono text-[8px] text-muted-foreground/60 ml-2">{note}</span>
                </div>
                <span className={`font-mono text-[10px] tabular-nums font-bold ${pnlColor(val)}`}>
                  {val >= 0 ? '+' : ''}${val.toFixed(2)}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Bar chart of attribution */}
        {pnlDecomp && (
          <div className="border border-border p-4">
            <p className="font-mono text-[9px] tracking-widest text-muted-foreground mb-3">ATTRIBUTION BREAKDOWN</p>
            <div className="space-y-1.5">
              {[
                ['DELTA', pnlDecomp.deltaP],
                ['GAMMA', pnlDecomp.gammaP],
                ['VEGA', pnlDecomp.vegaP],
                ['THETA', pnlDecomp.thetaP],
                ['VANNA', pnlDecomp.vannaP],
                ['VOLGA', pnlDecomp.volgaP],
              ].map(([label, val]) => {
                const maxAbs = Math.max(1, ...['deltaP','gammaP','vegaP','thetaP','vannaP','volgaP'].map(k => Math.abs(pnlDecomp[k])));
                const pct = (Math.abs(val) / maxAbs) * 100;
                const pos = val >= 0;
                return (
                  <div key={label} className="flex items-center gap-2">
                    <span className="font-mono text-[8px] text-muted-foreground w-10 shrink-0">{label}</span>
                    <div className="flex-1 h-3 bg-muted/20 relative">
                      <div className={`absolute top-0 h-3 ${pos ? 'bg-terminal-green/60 left-1/2' : 'bg-destructive/60 right-1/2'}`}
                        style={{ width: `${pct/2}%` }} />
                    </div>
                    <span className={`font-mono text-[8px] tabular-nums w-14 text-right ${pnlColor(val)}`}>
                      {val>=0?'+':''}${val.toFixed(2)}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* P&L profile chart */}
      <div className="space-y-4">
        <div className="border border-border p-4">
          <p className="font-mono text-[9px] tracking-widest text-muted-foreground mb-3">
            P&L PROFILE vs SPOT (after shocks)
          </p>
          <ResponsiveContainer width="100%" height={280}>
            <LineChart data={profileData} margin={{ top:4, right:8, bottom:4, left:8 }}>
              <CartesianGrid strokeDasharray="3 3" strokeOpacity={0.12} />
              <XAxis dataKey="spot" tick={{ fontFamily:'monospace', fontSize:8 }} tickFormatter={v=>`$${v}`} />
              <YAxis tick={{ fontFamily:'monospace', fontSize:8 }} tickFormatter={v=>`$${v}`} width={42} />
              <ReferenceLine y={0} stroke="hsl(var(--muted-foreground))" strokeDasharray="3 3" strokeOpacity={0.5} />
              <ReferenceLine x={S} stroke="hsl(var(--primary))" strokeDasharray="3 3" strokeOpacity={0.5} />
              <Tooltip content={({ active, payload }) => {
                if (!active || !payload?.length) return null;
                const d = payload[0]?.payload;
                return <div className="border border-border bg-background p-1.5 font-mono text-[9px]"><p>Spot: ${d.spot}</p><p className={pnlColor(d.pnl)}>P&L: {d.pnl>=0?'+':''}${d.pnl}</p></div>;
              }} />
              <Line type="monotone" dataKey="pnl" stroke="hsl(var(--primary))" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
          <p className="font-mono text-[8px] text-muted-foreground mt-2">
            Current spot = ${S} (vertical dashed). P&L = (new price − old price) × qty × 100.
          </p>
        </div>

        <div className="border border-border p-3">
          <p className="font-mono text-[8px] text-muted-foreground leading-relaxed">
            <span className="text-foreground">Greeks P&L attribution</span> decomposes the total option P&L into contributions from each risk factor.
            Delta and gamma capture spot moves; vega captures vol changes; theta is time decay.
            Vanna (∂Δ/∂σ) and volga (∂vega/∂σ) are second-order cross-terms — material for large simultaneous spot and vol moves.
            The residual is the Taylor expansion error (higher-order terms).
          </p>
        </div>
      </div>
    </div>
  );
}

// ── Put-Call Parity Scanner ───────────────────────────────────────────────────
function ParitySection() {
  const [ticker, setTicker]  = useState('SPY');
  const [input, setInput]    = useState('SPY');
  const [loading, setLoading] = useState(false);
  const [error, setError]    = useState(null);
  const [data, setData]      = useState(null);
  const [expiryIdx, setExpiryIdx] = useState(0);

  const fetchParity = useCallback(async (idx = expiryIdx) => {
    setLoading(true); setError(null);
    try {
      const res  = await fetch(`${API_BASE}/market-data/options-parity?ticker=${input.trim().toUpperCase()}&expiry=${idx}`);
      const json = await res.json();
      if (json.error) throw new Error(json.error);
      setData(json);
      setTicker(input.trim().toUpperCase());
    } catch (e) { setError(e.message); }
    finally { setLoading(false); }
  }, [input, expiryIdx]);

  const { violatingPairs, barData, ivSpreadData } = useMemo(() => {
    if (!data?.pairs?.length) return {};
    const pairs = data.pairs;
    const violatingPairs = pairs.filter(p => p.sigViolation);
    const barData = pairs.map(p => ({
      strike: p.strike,
      violation: +p.violation.toFixed(4),
      spread: +p.spread.toFixed(4),
    }));
    const ivSpreadData = pairs.map(p => ({
      strike: p.strike,
      callIV: p.callIV,
      putIV:  p.putIV,
      ivSpread: p.ivSpread,
    }));
    return { violatingPairs, barData, ivSpreadData };
  }, [data]);

  return (
    <div className="space-y-5">
      {/* Ticker input */}
      <div className="flex items-center gap-2 flex-wrap">
        <input
          value={input} onChange={e => setInput(e.target.value.toUpperCase())}
          onKeyDown={e => e.key === 'Enter' && fetchParity()}
          className="font-mono text-xs bg-background border border-border px-3 py-1.5 text-foreground w-28 focus:outline-none focus:border-primary"
          placeholder="TICKER"
        />
        <button onClick={() => fetchParity()} disabled={loading}
          className="font-mono text-[10px] tracking-widest border border-border px-3 py-1.5 hover:border-primary hover:text-primary transition-colors disabled:opacity-40">
          {loading ? 'SCANNING...' : 'SCAN PARITY'}
        </button>
        {error && <span className="font-mono text-[9px] text-destructive">{error}</span>}
      </div>

      {data?.expiryDates && (
        <div className="flex flex-wrap gap-1.5">
          {data.expiryDates.map((d, i) => (
            <button key={i} onClick={() => { setExpiryIdx(i); fetchParity(i); }}
              className={`font-mono text-[9px] tracking-widest border px-2 py-0.5 transition-colors ${expiryIdx===i ? 'border-primary text-primary bg-primary/5' : 'border-border text-muted-foreground hover:border-primary'}`}>
              {d}
            </button>
          ))}
        </div>
      )}

      {data && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 border border-border/40 p-4">
          {[
            ['SPOT', `$${data.spot?.toFixed(2)}`],
            ['EXPIRY', data.expiry],
            ['DTE', `${data.dte}d`],
            ['VIOLATIONS', violatingPairs?.length ?? '—'],
          ].map(([l, v]) => (
            <div key={l}>
              <p className="font-mono text-[7px] text-muted-foreground/40 tracking-widest">{l}</p>
              <p className="font-mono text-sm font-bold">{v}</p>
            </div>
          ))}
        </div>
      )}

      {barData && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          {/* Violation chart */}
          <div className="border border-border p-4">
            <p className="font-mono text-[9px] tracking-widest text-muted-foreground mb-3">
              PARITY DEVIATION C − P − (S − Ke<sup>−rT</sup>) PER STRIKE
            </p>
            <p className="font-mono text-[8px] text-muted-foreground/50 mb-3">
              Orange band = avg bid-ask spread. Bars beyond band are significant violations.
            </p>
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={barData} margin={{ top: 4, right: 8, bottom: 20, left: 8 }}>
                <CartesianGrid strokeDasharray="3 3" strokeOpacity={0.1} />
                <XAxis dataKey="strike" tick={{ fontFamily: 'monospace', fontSize: 8 }}
                  angle={-45} textAnchor="end" interval="preserveStartEnd"
                  label={{ value: 'Strike', style: { fontFamily: 'monospace', fontSize: 8 }, position: 'insideBottom', offset: -10 }} />
                <YAxis tick={{ fontFamily: 'monospace', fontSize: 8 }} tickFormatter={v => `$${v}`} />
                <Tooltip contentStyle={{ background: '#0a0a0a', border: '1px solid #333', fontFamily: 'monospace', fontSize: 9 }}
                  formatter={(v, n) => [`$${v}`, n === 'violation' ? 'Deviation' : 'Avg Spread']}
                  labelFormatter={l => `Strike $${l}`}
                />
                <ReferenceLine y={0} stroke="#ffffff30" />
                <Bar dataKey="violation" name="violation">
                  {barData.map((d, i) => (
                    <Cell key={i}
                      fill={Math.abs(d.violation) > d.spread * 0.5
                        ? (d.violation > 0 ? '#ef444480' : '#3b82f680')
                        : '#ffffff15'}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Call IV vs Put IV skew */}
          <div className="border border-border p-4">
            <p className="font-mono text-[9px] tracking-widest text-muted-foreground mb-3">
              CALL IV vs PUT IV BY STRIKE
            </p>
            <p className="font-mono text-[8px] text-muted-foreground/50 mb-3">
              Non-zero spread across same strike indicates skew inconsistency or supply imbalance.
            </p>
            <ResponsiveContainer width="100%" height={240}>
              <LineChart data={ivSpreadData} margin={{ top: 4, right: 8, bottom: 20, left: 8 }}>
                <CartesianGrid strokeDasharray="3 3" strokeOpacity={0.1} />
                <XAxis dataKey="strike" tick={{ fontFamily: 'monospace', fontSize: 8 }}
                  angle={-45} textAnchor="end" interval="preserveStartEnd" />
                <YAxis tick={{ fontFamily: 'monospace', fontSize: 8 }} tickFormatter={v => `${v}%`} width={36} />
                <Tooltip contentStyle={{ background: '#0a0a0a', border: '1px solid #333', fontFamily: 'monospace', fontSize: 9 }}
                  formatter={(v, n) => [`${v}%`, n]}
                  labelFormatter={l => `Strike $${l}`}
                />
                <Legend wrapperStyle={{ fontFamily: 'monospace', fontSize: 8 }} />
                <Line type="monotone" dataKey="callIV" name="Call IV" stroke="#22c55e" strokeWidth={1.5} dot={false} />
                <Line type="monotone" dataKey="putIV"  name="Put IV"  stroke="#ef4444" strokeWidth={1.5} dot={false} />
                <ReferenceLine y={ivSpreadData?.[Math.floor(ivSpreadData.length/2)]?.callIV} stroke="#ffffff10" strokeDasharray="3 2" />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {violatingPairs?.length > 0 && (
        <div className="border border-border p-4">
          <p className="font-mono text-[9px] tracking-widest text-muted-foreground mb-3">
            SIGNIFICANT VIOLATIONS ({violatingPairs.length} STRIKES)
          </p>
          <div className="overflow-x-auto">
            <table className="w-full font-mono text-[9px]">
              <thead>
                <tr className="border-b border-border/40">
                  {['STRIKE','CALL MID','PUT MID','LHS (C−P)','RHS (S−PV(K))','DEVIATION','SPREAD','IV SPREAD'].map(h => (
                    <th key={h} className="text-left text-muted-foreground/40 tracking-widest pb-2 pr-4">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {violatingPairs.map(p => (
                  <tr key={p.strike} className="border-b border-border/20">
                    <td className="py-1 pr-4 font-bold">${p.strike}</td>
                    <td className="py-1 pr-4">${p.callMid.toFixed(3)}</td>
                    <td className="py-1 pr-4">${p.putMid.toFixed(3)}</td>
                    <td className="py-1 pr-4">${p.parityLHS.toFixed(3)}</td>
                    <td className="py-1 pr-4">${p.parityRHS.toFixed(3)}</td>
                    <td className={`py-1 pr-4 font-bold ${p.violation > 0 ? 'text-red-400' : 'text-blue-400'}`}>
                      {p.violation > 0 ? '+' : ''}${p.violation.toFixed(3)}
                    </td>
                    <td className="py-1 pr-4 text-muted-foreground">${p.spread.toFixed(3)}</td>
                    <td className={`py-1 pr-4 ${Math.abs(p.ivSpread) > 1 ? 'text-amber-400' : 'text-muted-foreground'}`}>
                      {p.ivSpread > 0 ? '+' : ''}{p.ivSpread.toFixed(2)}%
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="font-mono text-[8px] text-muted-foreground/30 mt-3">
            LHS = C−P · RHS = S−Ke<sup>−rT</sup> · r=4.5% · Violations significant relative to bid-ask spread
          </p>
        </div>
      )}

      {!data && !loading && (
        <div className="border border-dashed border-border p-8 text-center">
          <p className="font-mono text-[10px] text-muted-foreground">
            Enter a ticker and click <span className="text-primary">SCAN PARITY</span> to find put-call parity violations across the options chain.
          </p>
        </div>
      )}
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function OptionsAnalyticsPage() {
  const [activeSection, setActiveSection] = useState('svi');

  const sections = [
    { id: 'svi',    label: 'SVI CALIBRATION',       sub: 'Fit stochastic volatility inspired model to live chain' },
    { id: 'greeks', label: 'GREEKS P&L ATTRIBUTION', sub: 'Decompose option P&L into delta/gamma/vega/theta/vanna/volga' },
    { id: 'parity', label: 'PARITY SCANNER',          sub: 'Detect put-call parity violations across the options chain' },
  ];

  return (
    <>
      <Helmet><title>DDF·LAB — Options Analytics</title></Helmet>

      <div className="min-h-screen px-4 sm:px-6 lg:px-8 py-8">
        <div className="max-w-7xl mx-auto">

          {/* Header */}
          <div className="mb-6 border-b border-border pb-4">
            <p className="font-mono text-[9px] text-primary tracking-widest mb-1">[V+] OPTIONS ANALYTICS</p>
            <h1 className="font-mono text-xl font-bold tracking-tight text-foreground">Options Depth</h1>
            <p className="font-mono text-[10px] text-muted-foreground mt-1 max-w-3xl">
              SVI smile calibration with variance swap replication · Full Greeks P&L attribution · Put-call parity violation scanner
            </p>
          </div>

          {/* Section tabs */}
          <div className="flex gap-2 mb-8 border-b border-border pb-4">
            {sections.map(s => (
              <button key={s.id} onClick={() => setActiveSection(s.id)}
                className={`font-mono text-[9px] tracking-widest border px-3 py-1.5 transition-colors text-left ${activeSection===s.id ? 'border-primary text-primary bg-primary/5' : 'border-border text-muted-foreground hover:border-primary'}`}>
                {s.label}
                <span className="block text-[8px] text-muted-foreground/60 font-normal tracking-normal mt-0.5">{s.sub}</span>
              </button>
            ))}
          </div>

          {activeSection === 'svi'    && <SVISection />}
          {activeSection === 'greeks' && <GreeksPnLSection />}
          {activeSection === 'parity' && <ParitySection />}

          <div className="mt-10 pt-4 border-t border-border">
            <p className="font-mono text-[8px] text-muted-foreground tracking-wider">
              ALL COMPUTATIONS CLIENT-SIDE · SVI: GATHERAL 2004 · GREEKS: BLACK-SCHOLES · OPTIONS DATA: YAHOO FINANCE VIA API
            </p>
          </div>
        </div>
      </div>
    </>
  );
}
