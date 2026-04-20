import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { Helmet } from 'react-helmet';
import { ScatterChart, Scatter, LineChart, Line, BarChart, Bar,
         XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
         ReferenceLine, Cell } from 'recharts';

// ── Math helpers ──────────────────────────────────────────────────────────────

function randn() {
  let u = 0, v = 0;
  while (!u) u = Math.random();
  while (!v) v = Math.random();
  return Math.sqrt(-2*Math.log(u)) * Math.cos(2*Math.PI*v);
}

function ols(x, y) {
  const n  = x.length;
  const mx = x.reduce((s,v)=>s+v,0)/n;
  const my = y.reduce((s,v)=>s+v,0)/n;
  let ssxy = 0, ssxx = 0;
  for (let i = 0; i < n; i++) { ssxy += (x[i]-mx)*(y[i]-my); ssxx += (x[i]-mx)**2; }
  const beta  = ssxy / ssxx;
  const alpha = my - beta*mx;
  const resid = y.map((yi,i) => yi - (alpha + beta*x[i]));
  const sse   = resid.reduce((s,r)=>s+r**2,0);
  const se_beta = ssxx > 0 ? Math.sqrt(sse/(n-2)/ssxx) : 0;
  const t_stat  = se_beta > 0 ? beta/se_beta : 0;
  const r2 = 1 - sse / y.reduce((s,v)=>s+(v-my)**2,0);
  return { alpha, beta, se_beta, t_stat: +t_stat.toFixed(2), r2: +Math.max(0,r2).toFixed(3) };
}

// ── Queue position simulator ───────────────────────────────────────────────────

function simulateQueue({ queuePos, orderSize, arrivalRate, simDays }) {
  // Discrete-time LOB: each tick a random order arrives at the front or not
  // Fill probability approximated by geometric distribution
  const fillProbPerTick = arrivalRate / 100;   // fraction of queue cleared per minute
  const totalAhead      = queuePos * 100;       // assume each queue slot = 100 shares
  const expectedFillMin = totalAhead / (arrivalRate || 1);

  // Markout simulation: price path after fill
  const sigma    = 0.01;  // 1% daily vol → per-minute vol
  const sigmaMin = sigma / Math.sqrt(390);
  const markout  = [];

  for (let sim = 0; sim < 1000; sim++) {
    let price = 0;
    let acc = 0;
    for (let t = 1; t <= 30; t++) {
      acc += sigmaMin * randn();
      if (t === 1 || t === 5 || t === 10 || t === 30) {
        markout.push({ t, dp: acc * 10000 }); // bps
      }
    }
  }

  // Average markout at each horizon
  const horizons = [1, 5, 10, 30];
  const avgMarkout = horizons.map(h => {
    const pts = markout.filter(m => m.t === h);
    const mean = pts.reduce((s,p)=>s+p.dp,0) / pts.length;
    return { horizon: `${h}min`, markout_bps: +mean.toFixed(1) };
  });

  // Fill probability as function of queue depth
  const fillCurve = Array.from({ length: 10 }, (_, i) => {
    const depth = (i + 1) * 100;
    const fillP = Math.exp(-depth / (arrivalRate * 10 || 100));
    return { depth_shares: depth, fill_prob: +(fillP * 100).toFixed(1) };
  });

  return { expectedFillMin: +expectedFillMin.toFixed(1), avgMarkout, fillCurve };
}

// ── TCA simulator ─────────────────────────────────────────────────────────────

function simulateTCA({ parentSize, urgency }) {
  const n = 20; // 20 intervals in a trading day (half-hourly)
  // U-shaped intraday volume profile
  const volProfile = Array.from({ length: n }, (_, i) => {
    const t = i / (n - 1);
    return 0.5*(Math.exp(-6*t) + Math.exp(-6*(1-t))) + 0.08;
  });
  const totalVol = volProfile.reduce((s,v)=>s+v,0);
  const normVol  = volProfile.map(v => v/totalVol);

  // VWAP schedule: pro-rata to volume
  const vwapFrac  = normVol;
  const twapFrac  = Array(n).fill(1/n);
  const isPct     = urgency;  // 0=passive, 1=aggressive
  const isFrac    = Array.from({ length: n }, (_, i) => Math.exp(-isPct * 3 * i / n));
  const isTotal   = isFrac.reduce((s,v)=>s+v,0);
  const isFracNorm = isFrac.map(v => v/isTotal);

  // Random price path with drift and vol
  const sigma  = 0.001;
  const drift  = 0;
  let price = 100;
  const priceArr = [price];
  for (let i = 1; i < n; i++) {
    price += drift + sigma * randn();
    priceArr.push(+price.toFixed(4));
  }

  const arrival = priceArr[0];
  const vwap    = priceArr.reduce((s,p,i)=>s+p*normVol[i],0)/normVol.reduce((s,v)=>s+v,0);

  function execCost(fracs, label) {
    let execPrice = 0;
    let remaining = parentSize;
    for (let i = 0; i < n; i++) {
      const shares = parentSize * fracs[i];
      const impact = 0.002 * Math.sqrt(shares / 10000); // linear impact
      const p = priceArr[i] + impact;
      execPrice += p * fracs[i];
      remaining  -= shares;
    }
    const slipBps = ((execPrice - arrival) / arrival * 10000);
    const vsVWAP  = ((execPrice - vwap)    / vwap    * 10000);
    return { label, execPrice: +execPrice.toFixed(4), slipBps: +slipBps.toFixed(2), vsVWAP: +vsVWAP.toFixed(2) };
  }

  const vwapResult  = execCost(vwapFrac,   'VWAP');
  const twapResult  = execCost(twapFrac,   'TWAP');
  const isResult    = execCost(isFracNorm, 'IS');

  const chartData = Array.from({ length: n }, (_, i) => ({
    interval: i+1,
    price:  priceArr[i],
    vwapQ:  +(parentSize * vwapFrac[i]).toFixed(0),
    twapQ:  +(parentSize * twapFrac[i]).toFixed(0),
    isQ:    +(parentSize * isFracNorm[i]).toFixed(0),
  }));

  return { results: [vwapResult, twapResult, isResult], chartData, vwap: +vwap.toFixed(4) };
}

// ── Kyle's Lambda ─────────────────────────────────────────────────────────────

function simulateKyle(lambda, nTrades) {
  const trades = [];
  let price = 100;
  for (let i = 0; i < nTrades; i++) {
    const sign = Math.random() > 0.5 ? 1 : -1;
    const size = Math.abs(50 + 20*randn());
    const signedFlow = +(sign * size).toFixed(1);
    const noise = 0.08 * randn();
    const dp    = lambda * signedFlow / 1000 + noise;
    price += dp;
    trades.push({ i, signedFlow, dp: +dp.toFixed(4), price: +price.toFixed(3) });
  }
  const flows = trades.map(t => t.signedFlow);
  const dps   = trades.map(t => t.dp);
  const reg   = ols(flows, dps);
  const lambdaHat = +(reg.beta * 1000).toFixed(4);
  return { trades, reg, lambdaHat };
}

// ── Hawkes process ────────────────────────────────────────────────────────────

function simulateHawkes(mu, alpha, beta, T = 200) {
  const events = [];
  let t = 0;
  const maxIter = 50000;
  let iter = 0;
  while (t < T && iter++ < maxIter) {
    let lambdaBar = mu;
    for (const ti of events) lambdaBar += alpha * Math.exp(-beta * (t - ti));
    const dt = -Math.log(Math.random()) / (lambdaBar + 1e-10);
    t += dt;
    if (t > T) break;
    let lambdaT = mu;
    for (const ti of events) lambdaT += alpha * Math.exp(-beta * (t - ti));
    if (Math.random() < lambdaT / lambdaBar) events.push(t);
  }
  return events;
}

function hawkesToChart(events, poissonEvents, T = 200, bins = 50) {
  const bw = T / bins;
  const hBins = Array.from({ length: bins }, (_, i) => ({
    t:       +(i * bw).toFixed(1),
    hawkes:  0,
    poisson: 0,
  }));
  for (const e of events)  { const b = Math.min(Math.floor(e/bw), bins-1); hBins[b].hawkes++; }
  for (const e of poissonEvents) { const b = Math.min(Math.floor(e/bw), bins-1); hBins[b].poisson++; }
  return hBins;
}

// ── SliderRow ─────────────────────────────────────────────────────────────────

function SliderRow({ label, min, max, step, value, onChange }) {
  return (
    <div className="mb-2">
      <div className="flex justify-between mb-0.5">
        <span className="font-mono text-[9px] text-muted-foreground">{label}</span>
        <span className="font-mono text-[9px] text-primary tabular-nums">{value}</span>
      </div>
      <input type="range" min={min} max={max} step={step} value={value}
        onChange={e => onChange(parseFloat(e.target.value))} className="w-full h-1 accent-primary" />
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function MicrostructurePage() {

  // ── Queue simulator state ────────────────────────────────────────────────
  const [queuePos,    setQueuePos]    = useState(3);
  const [orderSize,   setOrderSize]   = useState(500);
  const [arrivalRate, setArrivalRate] = useState(200);

  const queueResult = useMemo(() =>
    simulateQueue({ queuePos, orderSize, arrivalRate, simDays: 100 }),
    [queuePos, orderSize, arrivalRate]
  );

  // ── TCA state ────────────────────────────────────────────────────────────
  const [parentSize, setParentSize] = useState(10000);
  const [urgency,    setUrgency]    = useState(0.5);
  const [tcaResult,  setTcaResult]  = useState(() => simulateTCA({ parentSize: 10000, urgency: 0.5 }));

  const rerunTCA = useCallback(() => {
    setTcaResult(simulateTCA({ parentSize, urgency }));
  }, [parentSize, urgency]);

  // ── Kyle's Lambda state ──────────────────────────────────────────────────
  const [kyleLambda, setKyleLambda] = useState(0.5);
  const [kylen,      setKyleN]      = useState(200);
  const kyleResult = useMemo(() => simulateKyle(kyleLambda, kylen), [kyleLambda, kylen]);

  // ── Hawkes state ─────────────────────────────────────────────────────────
  const [hMu,    setHMu]    = useState(0.5);
  const [hAlpha, setHAlpha] = useState(0.6);
  const [hBeta,  setHBeta]  = useState(1.0);
  const [hawkesChart, setHawkesChart] = useState(null);
  const [hawkesStats, setHawkesStats] = useState(null);

  const runHawkes = useCallback(() => {
    const T = 200;
    const events  = simulateHawkes(hMu, hAlpha, hBeta, T);
    // Poisson with same baseline rate
    const poissonEvents = [];
    let pt = 0;
    while (pt < T) { pt += -Math.log(Math.random()) / hMu; if (pt < T) poissonEvents.push(pt); }
    const chart = hawkesToChart(events, poissonEvents, T);
    setHawkesChart(chart);
    setHawkesStats({ n: events.length, nPoisson: poissonEvents.length, branchingRatio: +(hAlpha/hBeta).toFixed(3) });
  }, [hMu, hAlpha, hBeta]);

  useEffect(() => { runHawkes(); }, [runHawkes]);

  return (
    <>
      <Helmet><title>DDF · LAB — Microstructure</title></Helmet>
      <div className="min-h-screen px-4 sm:px-6 lg:px-8 py-8">
        <div className="max-w-6xl mx-auto space-y-10">

          {/* Header */}
          <div className="border-b border-border pb-5">
            <p className="font-mono text-[9px] text-primary tracking-widest mb-1">DDF·LAB / MICROSTRUCTURE</p>
            <h1 className="font-mono text-xl font-bold tracking-tight text-foreground">Execution & Market Microstructure</h1>
            <p className="font-mono text-[10px] text-muted-foreground mt-1 max-w-2xl leading-relaxed">
              Four tools covering the mechanics of order execution: queue position and fill probability,
              transaction cost analysis (TCA), Kyle's lambda price impact estimation, and Hawkes
              process order arrival clustering.
            </p>
          </div>

          {/* ── 1. Queue Position Simulator ────────────────────────────────── */}
          <section className="space-y-4">
            <div className="flex items-baseline gap-3">
              <span className="font-mono text-[9px] text-muted-foreground/50">01</span>
              <h2 className="font-mono text-xs font-bold tracking-widest text-foreground">QUEUE POSITION & FILL SIMULATOR</h2>
            </div>
            <p className="font-mono text-[9px] text-muted-foreground/80 max-w-2xl leading-relaxed">
              Model a limit order in a FIFO limit order book. Adjust queue position and order arrival rate
              to see expected fill time and post-fill markout — the price drift after execution that proxies
              for adverse selection.
            </p>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              <div className="border border-border p-4 space-y-3">
                <SliderRow label="Queue position (slots ahead)" min={1} max={20} step={1} value={queuePos} onChange={setQueuePos} />
                <SliderRow label="Order size (shares)" min={100} max={5000} step={100} value={orderSize} onChange={setOrderSize} />
                <SliderRow label="Avg arrival rate (shares/min)" min={50} max={1000} step={50} value={arrivalRate} onChange={setArrivalRate} />
              </div>
              <div className="border border-border p-4 col-span-2">
                <div className="grid grid-cols-2 gap-4 mb-4">
                  <div>
                    <p className="font-mono text-[9px] text-muted-foreground tracking-widest mb-1">EXP. FILL TIME</p>
                    <p className="font-mono text-2xl font-bold text-foreground">{queueResult.expectedFillMin} min</p>
                  </div>
                  <div>
                    <p className="font-mono text-[9px] text-muted-foreground tracking-widest mb-1">QUEUE DEPTH</p>
                    <p className="font-mono text-2xl font-bold text-foreground">{(queuePos * 100).toLocaleString()} shs</p>
                  </div>
                </div>
                <p className="font-mono text-[9px] text-muted-foreground tracking-widest mb-2">AVG MARKOUT (BPS) AFTER FILL</p>
                <div className="flex gap-4">
                  {queueResult.avgMarkout.map(m => (
                    <div key={m.horizon} className="border border-border px-3 py-2 text-center">
                      <p className="font-mono text-[9px] text-muted-foreground mb-1">{m.horizon}</p>
                      <p className="font-mono text-sm font-bold text-foreground">{m.markout_bps}</p>
                    </div>
                  ))}
                </div>
                <p className="font-mono text-[9px] text-muted-foreground/50 mt-3 leading-relaxed">
                  Markout ≈ 0 bps (symmetric noise) since this sim assumes no informed flow. In real
                  markets markout is negative for limit orders, reflecting adverse selection from toxic flow.
                </p>
              </div>
            </div>
          </section>

          <div className="border-t border-border/40" />

          {/* ── 2. TCA Dashboard ────────────────────────────────────────────── */}
          <section className="space-y-4">
            <div className="flex items-baseline gap-3">
              <span className="font-mono text-[9px] text-muted-foreground/50">02</span>
              <h2 className="font-mono text-xs font-bold tracking-widest text-foreground">TRANSACTION COST ANALYSIS (TCA)</h2>
            </div>
            <p className="font-mono text-[9px] text-muted-foreground/80 max-w-2xl leading-relaxed">
              Compare three execution algorithms for a parent order: VWAP (volume-weighted),
              TWAP (time-weighted), and IS (Implementation Shortfall — front-loaded by urgency).
              Slippage vs. arrival price and vs. day-VWAP are computed on a simulated intraday price path.
            </p>
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
              <div className="border border-border p-4 col-span-1 space-y-3">
                <SliderRow label="Parent order size (shares)" min={1000} max={100000} step={1000} value={parentSize} onChange={setParentSize} />
                <SliderRow label="Urgency (0=passive, 1=aggressive)" min={0} max={1} step={0.1} value={urgency} onChange={setUrgency} />
                <button onClick={rerunTCA}
                  className="w-full font-mono text-[10px] tracking-widest border border-primary text-primary hover:bg-primary hover:text-primary-foreground py-1.5 transition-colors">
                  RESIMULATE
                </button>
              </div>
              <div className="border border-border p-4 col-span-3 space-y-4">
                {/* Comparison table */}
                <div>
                  <p className="font-mono text-[9px] text-muted-foreground tracking-widest mb-2">EXECUTION COMPARISON</p>
                  <table className="w-full font-mono text-[10px]">
                    <thead>
                      <tr className="border-b border-border">
                        {['ALGORITHM', 'EXEC PRICE', 'SLIP VS ARRIVAL', 'SLIP VS VWAP'].map(h => (
                          <th key={h} className="text-left px-3 py-1.5 text-[9px] text-muted-foreground font-normal tracking-widest">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {tcaResult.results.map(r => (
                        <tr key={r.label} className="border-b border-border/40 last:border-0">
                          <td className="px-3 py-2 text-primary font-bold">{r.label}</td>
                          <td className="px-3 py-2 text-foreground">{r.execPrice}</td>
                          <td className={`px-3 py-2 ${r.slipBps > 0 ? 'text-destructive' : 'text-terminal-green'}`}>
                            {r.slipBps > 0 ? '+' : ''}{r.slipBps} bps
                          </td>
                          <td className={`px-3 py-2 ${r.vsVWAP > 0 ? 'text-destructive' : 'text-terminal-green'}`}>
                            {r.vsVWAP > 0 ? '+' : ''}{r.vsVWAP} bps
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {/* Execution schedule chart */}
                <div>
                  <p className="font-mono text-[9px] text-muted-foreground tracking-widest mb-2">EXECUTION SCHEDULE (SHARES PER INTERVAL)</p>
                  <ResponsiveContainer width="100%" height={160}>
                    <LineChart data={tcaResult.chartData} margin={{ top: 5, right: 10, left: -15, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" strokeOpacity={0.4} />
                      <XAxis dataKey="interval" tick={{ fontSize: 8, fontFamily: 'monospace', fill: 'hsl(var(--muted-foreground))' }} tickLine={false} />
                      <YAxis tick={{ fontSize: 8, fontFamily: 'monospace', fill: 'hsl(var(--muted-foreground))' }} tickLine={false} axisLine={false} />
                      <Tooltip contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', fontFamily: 'monospace', fontSize: 10 }} />
                      <Line type="monotone" dataKey="vwapQ" stroke="hsl(var(--primary))" strokeWidth={1.5} dot={false} name="VWAP" />
                      <Line type="monotone" dataKey="twapQ" stroke="#f97316" strokeWidth={1.5} dot={false} name="TWAP" />
                      <Line type="monotone" dataKey="isQ"   stroke="#22c55e" strokeWidth={1.5} dot={false} name="IS" />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>
          </section>

          <div className="border-t border-border/40" />

          {/* ── 3. Kyle's Lambda ────────────────────────────────────────────── */}
          <section className="space-y-4">
            <div className="flex items-baseline gap-3">
              <span className="font-mono text-[9px] text-muted-foreground/50">03</span>
              <h2 className="font-mono text-xs font-bold tracking-widest text-foreground">KYLE&apos;S LAMBDA — PRICE IMPACT ESTIMATION</h2>
            </div>
            <p className="font-mono text-[9px] text-muted-foreground/80 max-w-2xl leading-relaxed">
              Kyle's lambda (λ) is the price impact per unit of signed order flow: ΔP = λ × Q + ε.
              Simulates N trades, then recovers λ via OLS regression. Set a true λ and see how well
              it is recovered — more trades = tighter estimate.
            </p>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              <div className="border border-border p-4 space-y-3">
                <SliderRow label="True λ (price impact per 1000 shares)" min={0.1} max={3.0} step={0.1} value={kyleLambda} onChange={setKyleLambda} />
                <SliderRow label="Number of trades" min={50} max={500} step={50} value={kylen} onChange={setKyleN} />
                <div className="pt-2 space-y-2">
                  <div className="flex justify-between font-mono text-[10px]">
                    <span className="text-muted-foreground">TRUE λ</span>
                    <span className="text-foreground font-bold">{kyleLambda}</span>
                  </div>
                  <div className="flex justify-between font-mono text-[10px]">
                    <span className="text-muted-foreground">ESTIMATED λ̂</span>
                    <span className={`font-bold ${Math.abs(kyleResult.lambdaHat - kyleLambda) < 0.3 ? 'text-terminal-green' : 'text-destructive'}`}>
                      {kyleResult.lambdaHat}
                    </span>
                  </div>
                  <div className="flex justify-between font-mono text-[10px]">
                    <span className="text-muted-foreground">R²</span>
                    <span className="text-foreground">{kyleResult.reg.r2}</span>
                  </div>
                  <div className="flex justify-between font-mono text-[10px]">
                    <span className="text-muted-foreground">T-STAT</span>
                    <span className="text-foreground">{kyleResult.reg.t_stat}</span>
                  </div>
                </div>
              </div>
              <div className="border border-border p-4 col-span-2">
                <p className="font-mono text-[9px] text-muted-foreground tracking-widest mb-3">
                  ΔP vs SIGNED ORDER FLOW · OLS REGRESSION
                </p>
                <ResponsiveContainer width="100%" height={220}>
                  <ScatterChart margin={{ top: 5, right: 10, left: -10, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" strokeOpacity={0.4} />
                    <XAxis dataKey="signedFlow" name="Signed Flow" type="number"
                      tick={{ fontSize: 8, fontFamily: 'monospace', fill: 'hsl(var(--muted-foreground))' }} tickLine={false}
                      label={{ value: 'SIGNED FLOW (SHARES)', position: 'insideBottom', offset: -2, fontSize: 8, fontFamily: 'monospace', fill: 'hsl(var(--muted-foreground))' }} />
                    <YAxis dataKey="dp" name="ΔPrice" type="number"
                      tick={{ fontSize: 8, fontFamily: 'monospace', fill: 'hsl(var(--muted-foreground))' }} tickLine={false} axisLine={false}
                      tickFormatter={v => v.toFixed(3)} />
                    <Tooltip cursor={{ strokeDasharray: '3 3' }}
                      contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', fontFamily: 'monospace', fontSize: 10 }}
                      formatter={(v, name) => [typeof v === 'number' ? v.toFixed(4) : v, name]} />
                    <Scatter data={kyleResult.trades} fill="hsl(var(--primary))" fillOpacity={0.4} r={2} />
                  </ScatterChart>
                </ResponsiveContainer>
              </div>
            </div>
          </section>

          <div className="border-t border-border/40" />

          {/* ── 4. Hawkes Process ───────────────────────────────────────────── */}
          <section className="space-y-4">
            <div className="flex items-baseline gap-3">
              <span className="font-mono text-[9px] text-muted-foreground/50">04</span>
              <h2 className="font-mono text-xs font-bold tracking-widest text-foreground">HAWKES PROCESS — ORDER ARRIVAL CLUSTERING</h2>
            </div>
            <p className="font-mono text-[9px] text-muted-foreground/80 max-w-2xl leading-relaxed">
              The Hawkes process is a self-exciting point process: each order arrival increases the probability
              of further arrivals for a period (branching ratio α/β). This captures the clustering of trades
              observed in real markets — compare to a Poisson process with the same baseline rate.
            </p>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              <div className="border border-border p-4 space-y-3">
                <SliderRow label="Baseline intensity μ (arrivals/unit)" min={0.1} max={2.0} step={0.1} value={hMu} onChange={setHMu} />
                <SliderRow label="Excitation α (self-excitement)"        min={0.0} max={0.9} step={0.05} value={hAlpha} onChange={setHAlpha} />
                <SliderRow label="Decay β (excitation decay rate)"       min={0.2} max={3.0} step={0.1} value={hBeta} onChange={setHBeta} />
                <button onClick={runHawkes}
                  className="w-full font-mono text-[10px] tracking-widest border border-primary text-primary hover:bg-primary hover:text-primary-foreground py-1.5 transition-colors">
                  RESIMULATE
                </button>
                {hawkesStats && (
                  <div className="pt-2 space-y-1.5 border-t border-border">
                    {[
                      ['BRANCHING RATIO α/β', hawkesStats.branchingRatio.toString()],
                      ['HAWKES EVENTS',        hawkesStats.n.toString()],
                      ['POISSON EVENTS',       hawkesStats.nPoisson.toString()],
                      ['CLUSTERING FACTOR',    (hawkesStats.n / Math.max(hawkesStats.nPoisson, 1)).toFixed(2) + '×'],
                    ].map(([label, value]) => (
                      <div key={label} className="flex justify-between font-mono text-[10px]">
                        <span className="text-muted-foreground">{label}</span>
                        <span className="text-foreground font-bold">{value}</span>
                      </div>
                    ))}
                    {hawkesStats.branchingRatio >= 1 && (
                      <p className="font-mono text-[9px] text-destructive mt-1">⚠ α/β ≥ 1: process is non-stationary</p>
                    )}
                  </div>
                )}
              </div>
              <div className="border border-border p-4 col-span-2">
                <p className="font-mono text-[9px] text-muted-foreground tracking-widest mb-3">
                  EVENT COUNTS PER INTERVAL — HAWKES vs POISSON
                </p>
                {hawkesChart && (
                  <ResponsiveContainer width="100%" height={220}>
                    <BarChart data={hawkesChart} margin={{ top: 5, right: 10, left: -15, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" strokeOpacity={0.4} />
                      <XAxis dataKey="t" tick={{ fontSize: 8, fontFamily: 'monospace', fill: 'hsl(var(--muted-foreground))' }} tickLine={false}
                        interval={Math.floor(hawkesChart.length / 8)} />
                      <YAxis tick={{ fontSize: 8, fontFamily: 'monospace', fill: 'hsl(var(--muted-foreground))' }} tickLine={false} axisLine={false} />
                      <Tooltip contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', fontFamily: 'monospace', fontSize: 10 }} />
                      <Bar dataKey="hawkes"  fill="hsl(var(--primary))" fillOpacity={0.8} name="HAWKES"  maxBarSize={8} />
                      <Bar dataKey="poisson" fill="#6b7280"              fillOpacity={0.5} name="POISSON" maxBarSize={8} />
                    </BarChart>
                  </ResponsiveContainer>
                )}
                <p className="font-mono text-[9px] text-muted-foreground/50 mt-2">
                  Hawkes (purple) shows burst-and-quiet clustering. Poisson (gray) is memoryless — flat across time.
                  Real limit order book arrivals look like Hawkes: a large trade triggers more trades.
                </p>
              </div>
            </div>
          </section>

          <p className="font-mono text-[9px] text-muted-foreground/40">
            ALL SIMULATIONS CLIENT-SIDE · HAWKES: OGATA THINNING ALGORITHM · KYLE (1985) · NOT INVESTMENT ADVICE
          </p>

        </div>
      </div>
    </>
  );
}
