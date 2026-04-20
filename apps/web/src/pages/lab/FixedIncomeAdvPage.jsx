import React, { useState, useMemo, useCallback } from 'react';
import { Helmet } from 'react-helmet';
import {
  LineChart, Line, BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer, ReferenceLine,
} from 'recharts';
import { RefreshCw, Plus, Trash2 } from 'lucide-react';

// ── Math helpers ──────────────────────────────────────────────────────────────

function discountFactor(r, t) { return Math.exp(-r * t); }
function forwardRate(z1, t1, z2, t2) { return (z2 * t2 - z1 * t1) / (t2 - t1); }

// Bootstrap zero curve from par swap rates
// Instruments: [{ type:'depo'|'swap', tenor:years, rate:% }]
function bootstrapZeroCurve(instruments) {
  const sorted = [...instruments].sort((a, b) => a.tenor - b.tenor);
  const zeros = []; // [{t, z}]

  for (const inst of sorted) {
    const r = inst.rate / 100;
    const T = inst.tenor;

    if (inst.type === 'depo') {
      // Simple: P = 1/(1 + r*T) for T ≤ 1y, or P = 1/(1+r)^T
      const z = T <= 1 ? Math.log(1 + r * T) / T : Math.log(1 + r);
      zeros.push({ t: T, z });
    } else {
      // Swap bootstrapping: sum of discount factors for all coupon dates
      // 1 = r*sum(P(ti)) + P(T)  →  P(T) = (1 - r*sum(P(ti))) / (1 + r)
      // For annual coupons (simplified)
      const freq = T <= 1 ? T : 1; // payment frequency in years
      const couponDates = [];
      for (let t = freq; t <= T + 1e-9; t += freq) couponDates.push(+t.toFixed(6));

      // Get interpolated discount factor for each coupon date
      function interpZ(t) {
        if (zeros.length === 0) return r; // fallback
        if (t <= zeros[0].t) return zeros[0].z;
        if (t >= zeros[zeros.length - 1].t) return zeros[zeros.length - 1].z;
        const i = zeros.findIndex(z => z.t >= t);
        if (i <= 0) return zeros[0].z;
        const z0 = zeros[i - 1], z1 = zeros[i];
        return z0.z + (z1.z - z0.z) * (t - z0.t) / (z1.t - z0.t);
      }

      // Sum of coupon DFs (all but the last)
      const couponSum = couponDates.slice(0, -1).reduce((s, t) => {
        return s + discountFactor(interpZ(t), t);
      }, 0);

      // Solve for P(T): P(T) = (1 - r * freq * (couponSum + 0)) / (1 + r * freq)
      const PT = (1 - r * freq * couponSum) / (1 + r * freq);
      if (PT > 0) {
        zeros.push({ t: T, z: -Math.log(PT) / T });
      }
    }
  }

  return zeros.sort((a, b) => a.t - b.t);
}

// Interpolate zero rate at time t
function interpZero(zeros, t) {
  if (!zeros.length) return 0;
  if (t <= zeros[0].t) return zeros[0].z;
  if (t >= zeros[zeros.length - 1].t) return zeros[zeros.length - 1].z;
  const i = zeros.findIndex(z => z.t >= t);
  if (i <= 0) return zeros[0].z;
  const z0 = zeros[i - 1], z1 = zeros[i];
  return z0.z + (z1.z - z0.z) * (t - z0.t) / (z1.t - z0.t);
}

// Build chart-ready zero/fwd curve
function buildCurveChart(zeros) {
  const pts = [];
  const maxT = zeros.length ? zeros[zeros.length - 1].t : 10;
  for (let t = 0.25; t <= maxT + 0.01; t += 0.25) {
    const z = interpZero(zeros, t);
    const fwd = t > 0.5 ? forwardRate(interpZero(zeros, t - 0.25), t - 0.25, z, t) : z;
    pts.push({ t: +t.toFixed(2), zero: +(z * 100).toFixed(4), fwd: +(fwd * 100).toFixed(4) });
  }
  return pts;
}

// DV01: sensitivity of each instrument's PV to 1bp parallel shift
function computeDV01(instruments, zeros) {
  const BUMP = 0.0001;
  const bumped = instruments.map(inst => ({ ...inst, rate: inst.rate + BUMP * 100 }));
  const bumpedZeros = bootstrapZeroCurve(bumped);
  return instruments.map((inst, i) => {
    const T = inst.tenor;
    const z0 = interpZero(zeros, T);
    const z1 = interpZero(bumpedZeros, T);
    const p0 = discountFactor(z0, T);
    const p1 = discountFactor(z1, T);
    const dv01 = (p0 - p1) * 10000; // per $10k notional, in $
    return { label: `${inst.tenor}Y ${inst.type.toUpperCase()}`, dv01: +dv01.toFixed(4) };
  });
}

// ── Bond pricing & KRD ────────────────────────────────────────────────────────

function priceBond(coupon, maturity, par, zeros) {
  // Annual coupon bond
  const c = coupon / 100 * par;
  let price = 0;
  const cashflows = [];
  for (let i = 1; i <= Math.round(maturity); i++) {
    const t = i;
    const z = interpZero(zeros, t);
    const cf = i === Math.round(maturity) ? c + par : c;
    const pv = cf * discountFactor(z, t);
    price += pv;
    cashflows.push({ t, cf, pv });
  }
  return { price, cashflows };
}

function yieldToMaturity(price, coupon, maturity, par) {
  // Newton-Raphson solve for YTM
  const c = coupon / 100 * par;
  let y = coupon / 100;
  for (let iter = 0; iter < 100; iter++) {
    let pv = 0, dpv = 0;
    for (let i = 1; i <= maturity; i++) {
      const cf = i === maturity ? c + par : c;
      const df = Math.pow(1 + y, -i);
      pv  += cf * df;
      dpv += -i * cf * df / (1 + y);
    }
    const err = pv - price;
    if (Math.abs(err) < 1e-8) break;
    y -= err / dpv;
  }
  return y;
}

const KEY_RATE_TENORS = [0.25, 0.5, 1, 2, 3, 5, 7, 10, 20, 30];

function computeKRD(bond, zeros) {
  const BUMP = 0.0001;
  const basePrice = priceBond(bond.coupon, bond.maturity, bond.par, zeros).price;
  const krds = [];

  for (const kr of KEY_RATE_TENORS) {
    if (kr > bond.maturity + 0.01) continue;
    // Bump only this key rate (linear tent function around the knot)
    const bumpedZeros = zeros.map(z => {
      const weight = Math.max(0, 1 - Math.abs(z.t - kr) / 1.0); // tent width = 1y
      return { ...z, z: z.z + BUMP * weight };
    });
    const bumpedPrice = priceBond(bond.coupon, bond.maturity, bond.par, bumpedZeros).price;
    const krd = (basePrice - bumpedPrice) / (basePrice * BUMP);
    krds.push({ tenor: kr, krd: +krd.toFixed(4) });
  }

  const modDur = krds.reduce((s, k) => s + k.krd, 0);
  return { krds, modDur: +modDur.toFixed(4), basePrice: +basePrice.toFixed(4) };
}

// ── Callable bond / OAS binomial tree ─────────────────────────────────────────
// Ho-Lee short rate tree: dr = theta(t)*dt + sigma*dW
// For simplicity: constant theta calibrated to flat zero curve level

function buildHoLeeTree(r0, sigma, dt, N) {
  // theta calibrated so E[r] stays near r0 (simplified: theta=0, flat mean)
  const tree = [];
  for (let i = 0; i <= N; i++) {
    const row = [];
    for (let j = 0; j <= i; j++) {
      row.push(r0 + sigma * Math.sqrt(dt) * (2*j - i));
    }
    tree.push(row);
  }
  return tree;
}

function priceCallableBond(coupon, maturity, par, callSchedule, r0, sigma, oas) {
  const dt   = 1; // annual steps
  const N    = Math.round(maturity);
  const c    = coupon / 100 * par;
  const rTree = buildHoLeeTree(r0 / 100, sigma / 100, dt, N);

  // Call price at each period (100 unless overridden)
  const callPrice = (t) => {
    const entry = callSchedule.find(s => s.year === t);
    return entry ? entry.price : null;
  };

  // Backward induction
  let values = rTree[N].map(() => par + c); // terminal: par + last coupon

  for (let i = N - 1; i >= 0; i--) {
    const newVals = [];
    for (let j = 0; j <= i; j++) {
      const r = rTree[i][j] + oas / 10000;
      const df = Math.exp(-Math.max(r, 0.001) * dt);
      const holdVal = df * (0.5 * values[j] + 0.5 * values[j + 1]) + c;
      const cp = callPrice(i + 1);
      newVals.push(cp !== null ? Math.min(holdVal, cp) : holdVal);
    }
    values = newVals;
  }
  return values[0];
}

// ── Sub-section components ────────────────────────────────────────────────────

const SectionHeader = ({ num, title, subtitle }) => (
  <div className="border-b border-border pb-3 mb-5">
    <span className="font-mono text-[9px] text-primary tracking-widest">[{num}]</span>
    <h2 className="font-mono text-sm font-bold tracking-widest text-foreground mt-0.5">{title}</h2>
    {subtitle && <p className="font-mono text-[10px] text-muted-foreground mt-0.5">{subtitle}</p>}
  </div>
);

const SliderRow = ({ label, min, max, step, value, onChange, fmt }) => (
  <div className="flex items-center gap-3 mb-2">
    <span className="font-mono text-[9px] text-muted-foreground w-28 shrink-0">{label}</span>
    <input type="range" min={min} max={max} step={step} value={value}
      onChange={e => onChange(parseFloat(e.target.value))}
      className="flex-1 accent-primary h-1" />
    <span className="font-mono text-[10px] text-primary w-16 text-right tabular-nums">
      {fmt ? fmt(value) : value}
    </span>
  </div>
);

const StatBox = ({ label, value, sub }) => (
  <div className="border border-border p-3">
    <p className="font-mono text-[8px] text-muted-foreground tracking-widest mb-1">{label}</p>
    <p className="font-mono text-base font-bold text-primary tabular-nums">{value}</p>
    {sub && <p className="font-mono text-[8px] text-muted-foreground mt-0.5">{sub}</p>}
  </div>
);

// ── Section 1: Swap Curve Bootstrapping ───────────────────────────────────────

const DEFAULT_INSTRUMENTS = [
  { type: 'depo', tenor: 0.25, rate: 5.30 },
  { type: 'depo', tenor: 0.5,  rate: 5.20 },
  { type: 'depo', tenor: 1,    rate: 5.00 },
  { type: 'swap', tenor: 2,    rate: 4.75 },
  { type: 'swap', tenor: 3,    rate: 4.55 },
  { type: 'swap', tenor: 5,    rate: 4.40 },
  { type: 'swap', tenor: 7,    rate: 4.45 },
  { type: 'swap', tenor: 10,   rate: 4.55 },
];

function SwapCurveSection() {
  const [instruments, setInstruments] = useState(DEFAULT_INSTRUMENTS);

  const updateRate = useCallback((i, val) => {
    setInstruments(prev => prev.map((inst, idx) => idx === i ? { ...inst, rate: val } : inst));
  }, []);

  const reset = useCallback(() => setInstruments(DEFAULT_INSTRUMENTS), []);

  const { zeros, curveChart, dv01s } = useMemo(() => {
    const zeros = bootstrapZeroCurve(instruments);
    const curveChart = buildCurveChart(zeros);
    const dv01s = computeDV01(instruments, zeros);
    return { zeros, curveChart, dv01s };
  }, [instruments]);

  const CurveTooltip = ({ active, payload, label }) => {
    if (!active || !payload?.length) return null;
    return (
      <div className="border border-border bg-background p-2 font-mono text-[9px]">
        <p className="text-muted-foreground mb-0.5">{label}Y</p>
        {payload.map(p => <p key={p.name} style={{ color: p.color }}>{p.name}: {Number(p.value).toFixed(3)}%</p>)}
      </div>
    );
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
      {/* Instrument inputs */}
      <div className="border border-border p-4">
        <div className="flex justify-between items-center mb-3">
          <p className="font-mono text-[9px] tracking-widest text-foreground">MARKET RATES (%)</p>
          <button onClick={reset} className="flex items-center gap-1 font-mono text-[9px] text-muted-foreground hover:text-primary border border-border px-2 py-0.5 transition-colors">
            <RefreshCw className="h-2.5 w-2.5" /> RESET
          </button>
        </div>
        <div className="space-y-2">
          {instruments.map((inst, i) => (
            <div key={i} className="flex items-center gap-2">
              <span className={`font-mono text-[8px] tracking-widest border px-1 py-0.5 w-10 text-center shrink-0 ${inst.type==='depo' ? 'text-primary border-primary/40' : 'text-yellow-500 border-yellow-500/40'}`}>
                {inst.type === 'depo' ? 'DEPO' : 'SWAP'}
              </span>
              <span className="font-mono text-[9px] text-muted-foreground w-8 shrink-0">
                {inst.tenor >= 1 ? `${inst.tenor}Y` : `${inst.tenor*12}M`}
              </span>
              <input
                type="range" min="0.5" max="8" step="0.05"
                value={inst.rate} onChange={e => updateRate(i, parseFloat(e.target.value))}
                className="flex-1 accent-primary h-1"
              />
              <span className="font-mono text-[9px] text-primary w-10 text-right tabular-nums">{inst.rate.toFixed(2)}%</span>
            </div>
          ))}
        </div>
      </div>

      {/* Chart */}
      <div className="lg:col-span-2 space-y-4">
        <div className="border border-border p-4">
          <p className="font-mono text-[9px] tracking-widest text-foreground mb-3">BOOTSTRAPPED ZERO & FORWARD CURVE</p>
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={curveChart} margin={{ top:4, right:8, bottom:4, left:8 }}>
              <CartesianGrid strokeDasharray="3 3" strokeOpacity={0.12} />
              <XAxis dataKey="t" tickFormatter={v => `${v}Y`} tick={{ fontFamily:'monospace', fontSize:8 }} />
              <YAxis tickFormatter={v => `${v.toFixed(1)}%`} tick={{ fontFamily:'monospace', fontSize:8 }} width={38} domain={['auto','auto']} />
              <Tooltip content={<CurveTooltip />} />
              <Legend wrapperStyle={{ fontFamily:'monospace', fontSize:8 }} />
              <Line type="monotone" dataKey="zero" name="Zero Rate" stroke="hsl(var(--primary))" strokeWidth={2} dot={false} />
              <Line type="monotone" dataKey="fwd"  name="Fwd Rate"  stroke="#f59e0b" strokeWidth={1.5} dot={false} strokeDasharray="4 3" />
              {instruments.map((inst, i) => {
                const z = zeros.find(z => Math.abs(z.t - inst.tenor) < 0.01);
                return z ? (
                  <ReferenceLine key={i} x={inst.tenor} stroke="hsl(var(--muted-foreground))" strokeOpacity={0.3} strokeDasharray="2 2" />
                ) : null;
              })}
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* DV01 bar chart */}
        <div className="border border-border p-4">
          <p className="font-mono text-[9px] tracking-widest text-foreground mb-3">DV01 PER INSTRUMENT ($ per $10k notional per 1bp)</p>
          <ResponsiveContainer width="100%" height={140}>
            <BarChart data={dv01s} margin={{ top:4, right:8, bottom:4, left:8 }}>
              <CartesianGrid strokeDasharray="3 3" strokeOpacity={0.12} />
              <XAxis dataKey="label" tick={{ fontFamily:'monospace', fontSize:7 }} />
              <YAxis tick={{ fontFamily:'monospace', fontSize:8 }} width={36} tickFormatter={v => `$${v.toFixed(2)}`} />
              <Tooltip
                content={({ active, payload }) => {
                  if (!active || !payload?.length) return null;
                  return <div className="border border-border bg-background p-1.5 font-mono text-[9px]"><p>{payload[0]?.payload?.label}</p><p>DV01: ${payload[0]?.value?.toFixed(4)}</p></div>;
                }}
              />
              <Bar dataKey="dv01" fill="hsl(var(--primary))" opacity={0.7} />
            </BarChart>
          </ResponsiveContainer>
          <p className="font-mono text-[8px] text-muted-foreground mt-2 leading-relaxed">
            DV01 = dollar value of a 1bp parallel shift to each instrument's zero rate. Longer tenor → higher DV01 (more duration).
          </p>
        </div>

        {/* Zero rate table */}
        <div className="border border-border p-4">
          <p className="font-mono text-[9px] tracking-widest text-foreground mb-2">BOOTSTRAPPED ZEROS</p>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border">
                  {['TENOR','PAR RATE','ZERO RATE','DISC FACTOR','FWD RATE (vs prev)'].map(h => (
                    <th key={h} className="font-mono text-[8px] text-muted-foreground tracking-widest text-right pb-1.5 pr-4">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {zeros.map((z, i) => {
                  const inst = instruments.find(inst => Math.abs(inst.tenor - z.t) < 0.01);
                  const fwd = i > 0 ? forwardRate(zeros[i-1].z, zeros[i-1].t, z.z, z.t) : z.z;
                  return (
                    <tr key={i} className="border-b border-border/40">
                      <td className="font-mono text-[9px] text-muted-foreground text-right py-1 pr-4">{z.t >= 1 ? `${z.t}Y` : `${z.t*12}M`}</td>
                      <td className="font-mono text-[9px] text-foreground text-right py-1 pr-4">{inst ? `${inst.rate.toFixed(2)}%` : '—'}</td>
                      <td className="font-mono text-[9px] text-primary text-right py-1 pr-4">{(z.z*100).toFixed(4)}%</td>
                      <td className="font-mono text-[9px] text-foreground text-right py-1 pr-4">{discountFactor(z.z, z.t).toFixed(6)}</td>
                      <td className="font-mono text-[9px] text-yellow-500 text-right py-1 pr-4">{(fwd*100).toFixed(4)}%</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Section 2: KRD Attribution ────────────────────────────────────────────────

const DEFAULT_BOND = { coupon: 4.5, maturity: 10, par: 100 };

function KRDSection() {
  const [bond, setBond] = useState(DEFAULT_BOND);
  const [parallelShift, setParallelShift] = useState(0);

  // Use a standard flat yield curve for KRD
  const baseZeros = useMemo(() => {
    const tors = [0.25, 0.5, 1, 2, 3, 5, 7, 10, 15, 20, 30];
    const base = 4.5 / 100;
    return tors.map(t => ({ t, z: base + parallelShift / 10000 }));
  }, [parallelShift]);

  const { krds, modDur, basePrice } = useMemo(() => {
    if (bond.maturity < 1) return { krds:[], modDur:0, basePrice:0 };
    return computeKRD(bond, baseZeros);
  }, [bond, baseZeros]);

  const ytm = useMemo(() => {
    if (!basePrice || bond.maturity < 1) return 0;
    return yieldToMaturity(basePrice, bond.coupon, Math.round(bond.maturity), bond.par);
  }, [basePrice, bond]);

  const { cashflows } = useMemo(() => priceBond(bond.coupon, bond.maturity, bond.par, baseZeros), [bond, baseZeros]);

  const krdData = krds.map(k => ({
    tenor: `${k.tenor}Y`,
    krd: k.krd,
    contribution: +(k.krd * (parallelShift) / 10000 * basePrice).toFixed(4),
  }));

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
      <div className="space-y-4">
        <div className="border border-border p-4">
          <p className="font-mono text-[9px] tracking-widest text-foreground mb-3">BOND PARAMETERS</p>
          <SliderRow label="COUPON" min={0} max={10} step={0.25} value={bond.coupon} onChange={v => setBond(b=>({...b,coupon:v}))} fmt={v=>`${v}%`} />
          <SliderRow label="MATURITY" min={1} max={30} step={1} value={bond.maturity} onChange={v => setBond(b=>({...b,maturity:v}))} fmt={v=>`${v}Y`} />
          <SliderRow label="PAR" min={100} max={100} step={0} value={100} onChange={()=>{}} fmt={()=>'$100'} />
          <SliderRow label="PARALLEL SHIFT" min={-200} max={200} step={5} value={parallelShift} onChange={setParallelShift} fmt={v=>`${v>=0?'+':''}${v}bp`} />
        </div>

        <div className="grid grid-cols-2 gap-2">
          <StatBox label="PRICE" value={`$${basePrice}`} sub="flat 4.5% zero curve" />
          <StatBox label="YTM" value={`${(ytm*100).toFixed(3)}%`} sub="yield to maturity" />
          <StatBox label="MOD DURATION" value={modDur.toFixed(3)} sub="sum of KRDs" />
          <StatBox label="DV01" value={`$${(modDur * basePrice * 0.0001).toFixed(4)}`} sub="per $100 face" />
        </div>

        {/* Cash flow table */}
        <div className="border border-border p-4">
          <p className="font-mono text-[9px] tracking-widest text-foreground mb-2">CASH FLOW PV</p>
          <div className="space-y-1 max-h-48 overflow-y-auto">
            {cashflows.map(cf => (
              <div key={cf.t} className="flex justify-between">
                <span className="font-mono text-[9px] text-muted-foreground">Year {cf.t}</span>
                <span className="font-mono text-[9px] text-foreground tabular-nums">${cf.cf.toFixed(2)}</span>
                <span className="font-mono text-[9px] text-primary tabular-nums">${cf.pv.toFixed(4)}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="lg:col-span-2 space-y-4">
        <div className="border border-border p-4">
          <p className="font-mono text-[9px] tracking-widest text-foreground mb-3">KEY RATE DURATION (KRD) PROFILE</p>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={krdData} margin={{ top:4, right:8, bottom:4, left:8 }}>
              <CartesianGrid strokeDasharray="3 3" strokeOpacity={0.12} />
              <XAxis dataKey="tenor" tick={{ fontFamily:'monospace', fontSize:9 }} />
              <YAxis tick={{ fontFamily:'monospace', fontSize:8 }} width={38} tickFormatter={v=>v.toFixed(2)} />
              <Tooltip content={({ active, payload }) => {
                if (!active || !payload?.length) return null;
                const d = payload[0]?.payload;
                return <div className="border border-border bg-background p-1.5 font-mono text-[9px]">
                  <p>Tenor: {d.tenor}</p>
                  <p>KRD: {d.krd?.toFixed(4)}</p>
                </div>;
              }} />
              <Bar dataKey="krd" name="KRD" fill="hsl(var(--primary))" opacity={0.75} />
            </BarChart>
          </ResponsiveContainer>
          <p className="font-mono text-[8px] text-muted-foreground mt-2 leading-relaxed">
            KRD measures price sensitivity to a 1bp move at each key rate maturity (tent function bump). The coupon maturity ({bond.maturity}Y) has the highest KRD — the largest proportion of cash flows discount there.
          </p>
        </div>

        <div className="border border-border p-4">
          <p className="font-mono text-[9px] tracking-widest text-foreground mb-2">WHAT IS KEY RATE DURATION?</p>
          <p className="font-mono text-[9px] text-muted-foreground leading-relaxed">
            Modified duration treats all yield curve shifts as parallel. KRD (Ho 1992) decomposes duration into bucket sensitivities — each KRD<sub>k</sub> measures the bond's price change for a 1bp shift at key rate tenor k, holding all others fixed (via tent function weighting).
          </p>
          <p className="font-mono text-[9px] text-muted-foreground mt-2 leading-relaxed">
            Portfolio KRD = Σ (weight × bond KRD). A barbell vs bullet comparison: bullets concentrate KRD near their maturity; barbells spread across short and long ends. A trader hedging with treasury futures matches the KRD profile, not just total duration.
          </p>
          <div className="mt-3 grid grid-cols-3 gap-2">
            {krds.slice(0,6).map(k => (
              <div key={k.tenor} className="border border-border p-2">
                <p className="font-mono text-[8px] text-muted-foreground">{k.tenor}Y KRD</p>
                <p className="font-mono text-xs font-bold text-primary tabular-nums">{k.krd.toFixed(4)}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Section 3: Callable Bond / OAS ────────────────────────────────────────────

function CallableBondSection() {
  const [coupon, setCoupon]     = useState(5.0);
  const [maturity, setMaturity] = useState(10);
  const [r0, setR0]             = useState(4.5);
  const [sigma, setSigma]       = useState(1.0);
  const [oas, setOas]           = useState(0);
  const [callYear, setCallYear] = useState(3);

  // Call schedule: callable at par from callYear onwards, annually
  const callSchedule = useMemo(() => {
    const sched = [];
    for (let y = callYear; y <= maturity; y++) sched.push({ year: y, price: 100 });
    return sched;
  }, [callYear, maturity]);

  // Straight bond price (no call)
  const straightPrice = useMemo(() => {
    const flat = Array.from({ length: 31 }, (_, i) => ({ t: i * 1, z: r0 / 100 })).slice(1);
    return priceBond(coupon, maturity, 100, flat).price;
  }, [coupon, maturity, r0]);

  // Callable bond price at different OAS values
  const oasChart = useMemo(() => {
    const pts = [];
    for (let o = -100; o <= 200; o += 10) {
      const p = priceCallableBond(coupon, maturity, 100, callSchedule, r0, sigma, o);
      pts.push({ oas: o, callable: +p.toFixed(4), straight: +straightPrice.toFixed(4) });
    }
    return pts;
  }, [coupon, maturity, r0, sigma, callSchedule, straightPrice]);

  const callablePrice = useMemo(() =>
    priceCallableBond(coupon, maturity, 100, callSchedule, r0, sigma, oas),
    [coupon, maturity, r0, sigma, callSchedule, oas]
  );
  const optionValue   = straightPrice - callablePrice;

  // Effective duration: price sensitivity to parallel rate shift
  const effDur = useMemo(() => {
    const BUMP = 0.0001;
    const pUp   = priceCallableBond(coupon, maturity, 100, callSchedule, r0 + BUMP*100, sigma, oas);
    const pDown = priceCallableBond(coupon, maturity, 100, callSchedule, r0 - BUMP*100, sigma, oas);
    return (pDown - pUp) / (2 * callablePrice * BUMP);
  }, [coupon, maturity, r0, sigma, callSchedule, oas, callablePrice]);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
      <div className="space-y-4">
        <div className="border border-border p-4">
          <p className="font-mono text-[9px] tracking-widest text-foreground mb-3">CALLABLE BOND PARAMETERS</p>
          <SliderRow label="COUPON" min={1} max={10} step={0.25} value={coupon} onChange={setCoupon} fmt={v=>`${v}%`} />
          <SliderRow label="MATURITY" min={3} max={30} step={1} value={maturity} onChange={setMaturity} fmt={v=>`${v}Y`} />
          <SliderRow label="FIRST CALL YEAR" min={1} max={maturity-1} step={1} value={Math.min(callYear, maturity-1)} onChange={setCallYear} fmt={v=>`Y${v}`} />
          <div className="border-t border-border pt-2 mt-2">
            <p className="font-mono text-[8px] text-muted-foreground tracking-widest mb-2">HO-LEE TREE PARAMETERS</p>
            <SliderRow label="SHORT RATE (r₀)" min={0.5} max={8} step={0.25} value={r0} onChange={setR0} fmt={v=>`${v}%`} />
            <SliderRow label="RATE VOL (σ)" min={0.1} max={5} step={0.1} value={sigma} onChange={setSigma} fmt={v=>`${v}%`} />
          </div>
          <div className="border-t border-border pt-2 mt-2">
            <SliderRow label="OAS (bp)" min={-100} max={300} step={5} value={oas} onChange={setOas} fmt={v=>`${v>=0?'+':''}${v}bp`} />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <StatBox label="STRAIGHT BOND" value={`$${straightPrice.toFixed(4)}`} sub="no call option" />
          <StatBox label="CALLABLE PRICE" value={`$${callablePrice.toFixed(4)}`} sub={`at OAS ${oas>=0?'+':''}${oas}bp`} />
          <StatBox label="OPTION VALUE" value={`$${optionValue.toFixed(4)}`} sub="straight − callable" />
          <StatBox label="EFF DURATION" value={effDur.toFixed(3)} sub="OAS-adjusted" />
        </div>

        <div className="border border-border p-4">
          <p className="font-mono text-[9px] tracking-widest text-foreground mb-2">CALL SCHEDULE</p>
          <div className="space-y-1 max-h-36 overflow-y-auto">
            {callSchedule.map(s => (
              <div key={s.year} className="flex justify-between">
                <span className="font-mono text-[9px] text-muted-foreground">Year {s.year}</span>
                <span className="font-mono text-[9px] text-primary">Callable @ ${s.price}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="lg:col-span-2 space-y-4">
        <div className="border border-border p-4">
          <p className="font-mono text-[9px] tracking-widest text-foreground mb-3">PRICE vs OAS — STRAIGHT vs CALLABLE</p>
          <ResponsiveContainer width="100%" height={240}>
            <LineChart data={oasChart} margin={{ top:4, right:8, bottom:4, left:8 }}>
              <CartesianGrid strokeDasharray="3 3" strokeOpacity={0.12} />
              <XAxis dataKey="oas" tickFormatter={v=>`${v}bp`} tick={{ fontFamily:'monospace', fontSize:8 }} />
              <YAxis domain={['auto','auto']} tickFormatter={v=>`$${v.toFixed(1)}`} tick={{ fontFamily:'monospace', fontSize:8 }} width={42} />
              <ReferenceLine x={oas} stroke="hsl(var(--primary))" strokeDasharray="3 3" strokeOpacity={0.5} />
              <Tooltip content={({ active, payload, label }) => {
                if (!active || !payload?.length) return null;
                return <div className="border border-border bg-background p-1.5 font-mono text-[9px]">
                  <p>OAS: {label}bp</p>
                  {payload.map(p => <p key={p.name} style={{color:p.color}}>{p.name}: ${Number(p.value).toFixed(4)}</p>)}
                </div>;
              }} />
              <Legend wrapperStyle={{ fontFamily:'monospace', fontSize:8 }} />
              <Line type="monotone" dataKey="straight" name="Straight" stroke="#6366f1" strokeWidth={2} dot={false} />
              <Line type="monotone" dataKey="callable" name="Callable" stroke="#f59e0b" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
          <p className="font-mono text-[8px] text-muted-foreground mt-2">
            Callable bond price is capped at the call price when rates fall (the issuer calls). Straight bond rises monotonically. The gap = embedded call option value.
          </p>
        </div>

        <div className="border border-border p-4">
          <p className="font-mono text-[9px] tracking-widest text-foreground mb-2">MODEL: HO-LEE BINOMIAL TREE + OAS</p>
          <p className="font-mono text-[9px] text-muted-foreground leading-relaxed">
            The Ho-Lee model drives short rates: r(i,j) = r₀ + σ√dt·(2j−i). At each node, the callable bond is priced as min(hold value, call price) — the issuer optimally calls when bond price exceeds the call price.
          </p>
          <p className="font-mono text-[9px] text-muted-foreground mt-2 leading-relaxed">
            The <span className="text-primary">OAS (Option-Adjusted Spread)</span> is the constant spread added to all discount rates such that the model price equals the market price. It strips out the option component: a positive OAS means the callable bond is cheap relative to the model. Effective duration is computed by bumping r₀ ±1bp and re-running the tree, capturing the negative convexity near the call boundary.
          </p>
        </div>
      </div>
    </div>
  );
}

// ── Main page ──────────────────────────────────────────────────────────────────

export default function FixedIncomeAdvPage() {
  const [activeSection, setActiveSection] = useState('swap');

  const sections = [
    { id: 'swap',     label: 'SWAP CURVE BOOTSTRAP',  sub: 'Deposits + swaps → zero/fwd curve + DV01' },
    { id: 'krd',      label: 'KEY RATE DURATION',      sub: 'KRD profile and cash flow attribution' },
    { id: 'callable', label: 'CALLABLE BOND / OAS',    sub: 'Ho-Lee tree · embedded option pricing' },
  ];

  return (
    <>
      <Helmet><title>DDF·LAB — Fixed Income Advanced</title></Helmet>

      <div className="min-h-screen px-4 sm:px-6 lg:px-8 py-8">
        <div className="max-w-7xl mx-auto">

          <div className="mb-6 border-b border-border pb-4">
            <p className="font-mono text-[9px] text-primary tracking-widest mb-1">[FI+] FIXED INCOME ADVANCED</p>
            <h1 className="font-mono text-xl font-bold tracking-tight text-foreground">Fixed Income Analytics</h1>
            <p className="font-mono text-[10px] text-muted-foreground mt-1 max-w-3xl">
              Swap curve bootstrapping with DV01 decomposition · Key rate duration attribution · Callable bond OAS via Ho-Lee binomial tree
            </p>
          </div>

          <div className="flex flex-wrap gap-2 mb-8 border-b border-border pb-4">
            {sections.map(s => (
              <button key={s.id} onClick={() => setActiveSection(s.id)}
                className={`font-mono text-[9px] tracking-widest border px-3 py-1.5 transition-colors text-left ${activeSection===s.id ? 'border-primary text-primary bg-primary/5' : 'border-border text-muted-foreground hover:border-primary'}`}>
                {s.label}
                <span className="block text-[8px] text-muted-foreground/60 font-normal tracking-normal mt-0.5">{s.sub}</span>
              </button>
            ))}
          </div>

          {activeSection === 'swap'     && <SwapCurveSection />}
          {activeSection === 'krd'      && <KRDSection />}
          {activeSection === 'callable' && <CallableBondSection />}

          <div className="mt-10 pt-4 border-t border-border">
            <p className="font-mono text-[8px] text-muted-foreground tracking-wider">
              ALL COMPUTATIONS CLIENT-SIDE · BOOTSTRAP: ANNUAL SWAP CONVENTION · KRD: HO (1992) TENT FUNCTION · OAS: HO-LEE BINOMIAL TREE
            </p>
          </div>
        </div>
      </div>
    </>
  );
}
