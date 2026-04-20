import React, { useState, useMemo } from 'react';
import { Helmet } from 'react-helmet';
import {
  AreaChart, Area, BarChart, Bar, LineChart, Line,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine, Cell, ScatterChart, Scatter
} from 'recharts';

// ── helpers ───────────────────────────────────────────────────────────────────
function seededRand(seed) {
  let s = seed;
  return function () {
    s = (s * 1664525 + 1013904223) & 0xffffffff;
    return (s >>> 0) / 0xffffffff;
  };
}

function generatePricePath(n = 200, mu = 0.0002, sigma = 0.012, seed = 42) {
  const rng = seededRand(seed);
  const prices = [100];
  for (let i = 1; i < n; i++) {
    const u1 = rng(), u2 = rng();
    const z = Math.sqrt(-2 * Math.log(u1 + 1e-12)) * Math.cos(2 * Math.PI * u2);
    prices.push(prices[i - 1] * Math.exp(mu + sigma * z));
  }
  return prices;
}

function normalCDF(x) {
  const t = 1 / (1 + 0.2316419 * Math.abs(x));
  const d = 0.3989422820 * Math.exp(-x * x / 2);
  const p = d * t * (0.3193815 + t * (-0.3565638 + t * (1.7814779 + t * (-1.8212560 + t * 1.3302744))));
  return x > 0 ? 1 - p : p;
}

// ── Section 1: Purged Walk-Forward CV ─────────────────────────────────────────
function SplitBar({ train, test, purge, embargo, total, index }) {
  const colors = { train: '#3b82f6', test: '#22c55e', purge: '#f59e0b', embargo: '#ef4444', gap: 'transparent' };
  const toW = (v) => `${(v / total * 100).toFixed(1)}%`;
  return (
    <div className="flex items-center gap-2 mb-1.5">
      <span className="font-mono text-[7px] text-muted-foreground/40 w-8 shrink-0">FOLD {index + 1}</span>
      <div className="flex-1 h-4 flex rounded-sm overflow-hidden border border-border/30">
        {/* pre-train gap */}
        {train.start > 0 && <div style={{ width: toW(train.start), background: '#ffffff08' }} />}
        {/* train */}
        <div style={{ width: toW(train.end - train.start), background: colors.train + '60', borderRight: `1px solid ${colors.train}` }} />
        {/* purge */}
        {purge > 0 && <div style={{ width: toW(purge), background: colors.purge + '40', borderRight: `1px solid ${colors.purge}` }} />}
        {/* test */}
        <div style={{ width: toW(test.end - test.start - embargo), background: colors.test + '60' }} />
        {/* embargo */}
        {embargo > 0 && <div style={{ width: toW(embargo), background: colors.embargo + '40' }} />}
        {/* rest */}
        {test.end < total && <div style={{ width: toW(total - test.end), background: '#ffffff08' }} />}
      </div>
    </div>
  );
}

function PurgedKFoldSection() {
  const [nSplits, setNSplits] = useState(5);
  const [purgeW, setPurgeW] = useState(5);
  const [embargoW, setEmbargoW] = useState(3);
  const total = 100;

  const splits = useMemo(() => {
    const foldSize = Math.floor(total / nSplits);
    return Array.from({ length: nSplits }, (_, i) => {
      const testStart = i * foldSize;
      const testEnd = i === nSplits - 1 ? total : testStart + foldSize;
      const trainEnd = Math.max(0, testStart - purgeW);
      return {
        train: { start: 0, end: trainEnd },
        purge: purgeW,
        test: { start: testStart, end: testEnd },
        embargo: embargoW,
      };
    });
  }, [nSplits, purgeW, embargoW]);

  // Simulate SR leakage comparison
  const standard = useMemo(() => {
    const rng = seededRand(7);
    return Array.from({ length: nSplits }, () => 0.8 + rng() * 1.2);
  }, [nSplits]);
  const purgedSR = useMemo(() => {
    const rng = seededRand(7);
    return Array.from({ length: nSplits }, () => 0.3 + rng() * 0.7);
  }, [nSplits]);
  const chartData = Array.from({ length: nSplits }, (_, i) => ({
    fold: `F${i + 1}`,
    standard: +standard[i].toFixed(2),
    purged: +purgedSR[i].toFixed(2),
  }));

  return (
    <div>
      <p className="font-mono text-[8px] text-muted-foreground/40 tracking-widest mb-4 pb-2 border-b border-border/40">
        01 — PURGED K-FOLD CROSS-VALIDATION
      </p>
      <p className="font-mono text-[10px] text-muted-foreground leading-[1.8] mb-6 max-w-2xl">
        Standard K-fold leaks future information in financial time series. Purging removes training samples whose labels
        overlap the test window; embargo blocks post-test contamination from market impact (López de Prado, <em>AFML</em> ch. 7).
      </p>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2">
          <div className="flex gap-6 mb-4 flex-wrap">
            {[
              { label: 'N SPLITS', val: nSplits, set: setNSplits, min: 3, max: 10, step: 1 },
              { label: 'PURGE (bars)', val: purgeW, set: setPurgeW, min: 0, max: 15, step: 1 },
              { label: 'EMBARGO (bars)', val: embargoW, set: setEmbargoW, min: 0, max: 10, step: 1 },
            ].map(({ label, val, set, min, max, step }) => (
              <div key={label} className="min-w-[140px]">
                <div className="flex justify-between mb-1">
                  <span className="font-mono text-[7px] text-muted-foreground/40 tracking-widest">{label}</span>
                  <span className="font-mono text-[9px] font-bold">{val}</span>
                </div>
                <input type="range" min={min} max={max} step={step} value={val}
                  onChange={e => set(+e.target.value)}
                  className="w-full accent-primary h-1" />
              </div>
            ))}
          </div>

          <div className="mb-3">
            {splits.map((s, i) => (
              <SplitBar key={i} {...s} total={total} index={i} />
            ))}
          </div>
          <div className="flex gap-4 mt-2">
            {[['TRAIN', '#3b82f6'], ['PURGE ZONE', '#f59e0b'], ['TEST', '#22c55e'], ['EMBARGO', '#ef4444']].map(([l, c]) => (
              <div key={l} className="flex items-center gap-1">
                <div className="w-3 h-2 rounded-sm" style={{ background: c + '80' }} />
                <span className="font-mono text-[7px] text-muted-foreground/40">{l}</span>
              </div>
            ))}
          </div>
        </div>

        <div>
          <p className="font-mono text-[8px] text-muted-foreground/40 tracking-widest mb-3">IN-SAMPLE SR vs PURGED SR</p>
          <ResponsiveContainer width="100%" height={160}>
            <BarChart data={chartData} barCategoryGap="30%">
              <CartesianGrid strokeDasharray="3 3" stroke="#ffffff08" />
              <XAxis dataKey="fold" tick={{ fontFamily: 'monospace', fontSize: 9, fill: '#64748b' }} />
              <YAxis tick={{ fontFamily: 'monospace', fontSize: 9, fill: '#64748b' }} />
              <Tooltip contentStyle={{ background: '#0a0a0a', border: '1px solid #333', fontFamily: 'monospace', fontSize: 10 }} />
              <Bar dataKey="standard" name="Standard" fill="#3b82f680" />
              <Bar dataKey="purged" name="Purged" fill="#22c55e80" />
            </BarChart>
          </ResponsiveContainer>
          <p className="font-mono text-[8px] text-muted-foreground/30 mt-2 leading-relaxed">
            Standard K-fold inflates Sharpe via look-ahead bias.
            Purged CV yields realistic out-of-sample estimates.
          </p>
        </div>
      </div>
    </div>
  );
}

// ── Section 2: Triple-Barrier Labeling ────────────────────────────────────────
function TripleBarrierSection() {
  const [ptMult, setPtMult] = useState(2.0);
  const [slMult, setSlMult] = useState(1.5);
  const [horizW, setHorizW] = useState(20);
  const [volW, setVolW] = useState(10);

  const prices = useMemo(() => generatePricePath(120, 0.0003, 0.014, 99), []);

  const events = useMemo(() => {
    const step = 15;
    const results = [];
    for (let i = volW + 5; i < prices.length - horizW - 1; i += step) {
      const slice = prices.slice(Math.max(0, i - volW), i);
      const rets = slice.slice(1).map((p, j) => Math.log(p / slice[j]));
      const vol = Math.sqrt(rets.reduce((a, r) => a + r * r, 0) / rets.length);
      const p0 = prices[i];
      const ptLevel = p0 * (1 + ptMult * vol);
      const slLevel = p0 * (1 - slMult * vol);

      let label = 0;
      let exitIdx = i + horizW;
      for (let j = i + 1; j <= i + horizW && j < prices.length; j++) {
        if (prices[j] >= ptLevel) { label = 1; exitIdx = j; break; }
        if (prices[j] <= slLevel) { label = -1; exitIdx = j; break; }
      }
      results.push({ entryIdx: i, exitIdx, p0, ptLevel, slLevel, label, vol });
    }
    return results;
  }, [prices, ptMult, slMult, horizW, volW]);

  const chartData = prices.map((p, i) => ({ i, price: +p.toFixed(3) }));
  const labelCounts = { long: events.filter(e => e.label === 1).length, short: events.filter(e => e.label === -1).length, zero: events.filter(e => e.label === 0).length };
  const labelColor = { 1: '#22c55e', '-1': '#ef4444', 0: '#94a3b8' };
  const labelText = { 1: 'LONG +1', '-1': 'SHORT −1', 0: 'NEUTRAL 0' };

  // Show one focused event on hover — just show all entry dots
  const dotData = events.map(e => ({ i: e.entryIdx, price: prices[e.entryIdx], label: e.label }));

  return (
    <div>
      <p className="font-mono text-[8px] text-muted-foreground/40 tracking-widest mb-4 pb-2 border-b border-border/40">
        02 — TRIPLE-BARRIER LABELING
      </p>
      <p className="font-mono text-[10px] text-muted-foreground leading-[1.8] mb-6 max-w-2xl">
        Labels each event with {'{'}+1, −1, 0{'}'} by placing a profit-take barrier (PT), stop-loss barrier (SL), and
        vertical (time) barrier. The first barrier touched determines the label. Barriers scale with local volatility
        so the signal is regime-adaptive (López de Prado, <em>AFML</em> ch. 3).
      </p>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        <div className="lg:col-span-3">
          <ResponsiveContainer width="100%" height={240}>
            <LineChart data={chartData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#ffffff06" />
              <XAxis dataKey="i" tick={{ fontFamily: 'monospace', fontSize: 8, fill: '#64748b' }} />
              <YAxis domain={['auto', 'auto']} tick={{ fontFamily: 'monospace', fontSize: 8, fill: '#64748b' }} width={45} />
              <Tooltip
                contentStyle={{ background: '#0a0a0a', border: '1px solid #333', fontFamily: 'monospace', fontSize: 9 }}
                formatter={(v) => [`$${v}`, 'Price']}
              />
              <Line type="monotone" dataKey="price" stroke="#3b82f6" strokeWidth={1.5} dot={false} />
            </LineChart>
          </ResponsiveContainer>

          {/* Entry dots overlay using scatter */}
          <div className="mt-1">
            <ResponsiveContainer width="100%" height={50}>
              <ScatterChart margin={{ top: 0, right: 8, left: 0, bottom: 0 }}>
                <XAxis dataKey="i" type="number" domain={[0, 119]} tick={{ fontFamily: 'monospace', fontSize: 7, fill: '#64748b' }} />
                <YAxis dataKey="price" type="number" domain={['auto', 'auto']} hide />
                <Tooltip
                  contentStyle={{ background: '#0a0a0a', border: '1px solid #333', fontFamily: 'monospace', fontSize: 9 }}
                  formatter={(v, n, props) => [labelText[props.payload.label], 'LABEL']}
                />
                <Scatter data={dotData} shape={(props) => {
                  const { cx, cy, payload } = props;
                  return <circle cx={cx} cy={20} r={5} fill={labelColor[payload.label]} opacity={0.8} />;
                }} />
              </ScatterChart>
            </ResponsiveContainer>
            <p className="font-mono text-[7px] text-muted-foreground/30 mt-1 text-center">EVENT LABELS (circles = entry points)</p>
          </div>
        </div>

        <div className="space-y-4">
          {[
            { label: 'PT MULTIPLIER', val: ptMult, set: setPtMult, min: 0.5, max: 4, step: 0.25, fmt: v => v.toFixed(2) + '×σ' },
            { label: 'SL MULTIPLIER', val: slMult, set: setSlMult, min: 0.5, max: 4, step: 0.25, fmt: v => v.toFixed(2) + '×σ' },
            { label: 'HORIZON (bars)', val: horizW, set: setHorizW, min: 5, max: 40, step: 5, fmt: v => v },
            { label: 'VOL WINDOW', val: volW, set: setVolW, min: 5, max: 20, step: 5, fmt: v => v },
          ].map(({ label, val, set, min, max, step, fmt }) => (
            <div key={label}>
              <div className="flex justify-between mb-1">
                <span className="font-mono text-[7px] text-muted-foreground/40 tracking-widest">{label}</span>
                <span className="font-mono text-[9px] font-bold">{fmt(val)}</span>
              </div>
              <input type="range" min={min} max={max} step={step} value={val}
                onChange={e => set(+e.target.value)}
                className="w-full accent-primary h-1" />
            </div>
          ))}

          <div className="border border-border/40 p-3 mt-2">
            <p className="font-mono text-[7px] text-muted-foreground/30 tracking-widest mb-3">LABEL DISTRIBUTION</p>
            {[['LONG +1', labelCounts.long, '#22c55e'], ['NEUTRAL 0', labelCounts.zero, '#94a3b8'], ['SHORT −1', labelCounts.short, '#ef4444']].map(([l, c, col]) => (
              <div key={l} className="mb-2">
                <div className="flex justify-between mb-0.5">
                  <span className="font-mono text-[8px]" style={{ color: col }}>{l}</span>
                  <span className="font-mono text-[8px]">{c}</span>
                </div>
                <div className="w-full h-1.5 bg-border/20 rounded-sm">
                  <div className="h-full rounded-sm" style={{ width: `${(c / events.length * 100).toFixed(0)}%`, background: col + '80' }} />
                </div>
              </div>
            ))}
            <p className="font-mono text-[7px] text-muted-foreground/20 mt-2">{events.length} total events</p>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Section 3: Meta-Labeling ───────────────────────────────────────────────────
function MetaLabelingSection() {
  const [threshold, setThreshold] = useState(0.55);

  const rng = useMemo(() => seededRand(17), []);

  const signals = useMemo(() => {
    const r = seededRand(17);
    return Array.from({ length: 60 }, (_, i) => {
      const trueDir = r() > 0.45 ? 1 : -1;           // true direction
      const modelDir = r() > 0.3 ? trueDir : -trueDir; // primary model has ~70% accuracy
      const metaConf = 0.4 + r() * 0.55;               // meta-model confidence
      const ret = trueDir * (0.005 + r() * 0.02);
      return { i, trueDir, modelDir, metaConf, ret, correct: modelDir === trueDir };
    });
  }, []);

  const filtered = useMemo(() => signals.filter(s => s.metaConf >= threshold), [signals, threshold]);

  const baseEquity = useMemo(() => {
    let eq = 1;
    return signals.map(s => { eq *= (1 + s.modelDir * s.ret); return { i: s.i, equity: +eq.toFixed(4) }; });
  }, [signals]);

  const metaEquity = useMemo(() => {
    let eq = 1;
    return signals.map(s => {
      if (s.metaConf >= threshold) eq *= (1 + s.modelDir * s.ret);
      return { i: s.i, equity: +eq.toFixed(4) };
    });
  }, [signals, threshold]);

  const basePrecision = (signals.filter(s => s.correct).length / signals.length * 100).toFixed(1);
  const metaPrecision = filtered.length > 0 ? (filtered.filter(s => s.correct).length / filtered.length * 100).toFixed(1) : '—';
  const baseRecall = '100.0';
  const metaRecall = (filtered.length / signals.length * 100).toFixed(1);

  const barData = signals.map(s => ({
    i: s.i,
    conf: +s.metaConf.toFixed(3),
    active: s.metaConf >= threshold,
    correct: s.correct,
  }));

  const eqData = signals.map((_, i) => ({
    i,
    base: baseEquity[i].equity,
    meta: metaEquity[i].equity,
  }));

  return (
    <div>
      <p className="font-mono text-[8px] text-muted-foreground/40 tracking-widest mb-4 pb-2 border-b border-border/40">
        03 — META-LABELING
      </p>
      <p className="font-mono text-[10px] text-muted-foreground leading-[1.8] mb-6 max-w-2xl">
        Meta-labeling separates the direction signal (primary model) from the bet-sizing signal (secondary model).
        A secondary classifier is trained only on positive primary predictions to learn <em>when</em> to act.
        Precision improves at the cost of recall; position sizing follows the secondary model's probability output
        (López de Prado, <em>AFML</em> ch. 4).
      </p>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-5">
          <div>
            <p className="font-mono text-[8px] text-muted-foreground/40 tracking-widest mb-2">META-MODEL CONFIDENCE SCORES (threshold = {threshold.toFixed(2)})</p>
            <ResponsiveContainer width="100%" height={100}>
              <BarChart data={barData} barCategoryGap="10%">
                <CartesianGrid strokeDasharray="3 3" stroke="#ffffff05" />
                <XAxis dataKey="i" tick={false} />
                <YAxis domain={[0, 1]} tick={{ fontFamily: 'monospace', fontSize: 8, fill: '#64748b' }} width={30} />
                <ReferenceLine y={threshold} stroke="#f59e0b" strokeDasharray="4 2" strokeWidth={1.5} />
                <Tooltip
                  contentStyle={{ background: '#0a0a0a', border: '1px solid #333', fontFamily: 'monospace', fontSize: 9 }}
                  formatter={(v, n, p) => [v.toFixed(3), `Conf | ${p.payload.correct ? 'CORRECT' : 'WRONG'} | ${p.payload.active ? 'ACTIVE' : 'FILTERED'}`]}
                />
                <Bar dataKey="conf">
                  {barData.map((d, i) => (
                    <Cell key={i}
                      fill={d.active ? (d.correct ? '#22c55e80' : '#ef444480') : '#ffffff15'}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div>
            <p className="font-mono text-[8px] text-muted-foreground/40 tracking-widest mb-2">CUMULATIVE EQUITY CURVE</p>
            <ResponsiveContainer width="100%" height={160}>
              <AreaChart data={eqData} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#ffffff06" />
                <XAxis dataKey="i" tick={{ fontFamily: 'monospace', fontSize: 8, fill: '#64748b' }} />
                <YAxis tick={{ fontFamily: 'monospace', fontSize: 8, fill: '#64748b' }} width={45} tickFormatter={v => v.toFixed(2)} />
                <Tooltip
                  contentStyle={{ background: '#0a0a0a', border: '1px solid #333', fontFamily: 'monospace', fontSize: 9 }}
                  formatter={(v, n) => [v.toFixed(4), n === 'base' ? 'Primary Only' : 'Meta-filtered']}
                />
                <Area type="monotone" dataKey="base" stroke="#3b82f6" fill="#3b82f610" strokeWidth={1.5} name="base" />
                <Area type="monotone" dataKey="meta" stroke="#22c55e" fill="#22c55e15" strokeWidth={1.5} name="meta" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="space-y-4">
          <div>
            <div className="flex justify-between mb-1">
              <span className="font-mono text-[7px] text-muted-foreground/40 tracking-widest">META THRESHOLD</span>
              <span className="font-mono text-[9px] font-bold">{threshold.toFixed(2)}</span>
            </div>
            <input type="range" min={0.4} max={0.9} step={0.01} value={threshold}
              onChange={e => setThreshold(+e.target.value)}
              className="w-full accent-primary h-1" />
          </div>

          <div className="border border-border/40 p-3">
            <p className="font-mono text-[7px] text-muted-foreground/30 tracking-widest mb-3">PERFORMANCE COMPARISON</p>
            <table className="w-full">
              <thead>
                <tr>
                  <th className="font-mono text-[7px] text-muted-foreground/30 text-left pb-1 tracking-widest"></th>
                  <th className="font-mono text-[7px] text-muted-foreground/30 text-right pb-1 tracking-widest">BASE</th>
                  <th className="font-mono text-[7px] text-muted-foreground/30 text-right pb-1 tracking-widest">META</th>
                </tr>
              </thead>
              <tbody>
                {[
                  ['TRADES', signals.length, filtered.length],
                  ['PRECISION', `${basePrecision}%`, `${metaPrecision}%`],
                  ['RECALL', `${baseRecall}%`, `${metaRecall}%`],
                  ['FINAL EQ', baseEquity[59]?.equity.toFixed(3), metaEquity[59]?.equity.toFixed(3)],
                ].map(([l, b, m]) => (
                  <tr key={l} className="border-t border-border/20">
                    <td className="font-mono text-[8px] text-muted-foreground/40 py-1">{l}</td>
                    <td className="font-mono text-[9px] text-right py-1 text-blue-400">{b}</td>
                    <td className="font-mono text-[9px] text-right py-1 text-green-400">{m}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="border border-border/40 p-3">
            <p className="font-mono text-[7px] text-muted-foreground/30 tracking-widest mb-2">LEGEND</p>
            {[['GREEN ACTIVE + CORRECT', '#22c55e'], ['RED ACTIVE + WRONG', '#ef4444'], ['DIM FILTERED OUT', '#ffffff30']].map(([l, c]) => (
              <div key={l} className="flex items-center gap-2 mb-1">
                <div className="w-3 h-2 rounded-sm" style={{ background: c }} />
                <span className="font-mono text-[7px] text-muted-foreground/40">{l}</span>
              </div>
            ))}
            <div className="flex items-center gap-2 mt-1">
              <div className="w-3 h-0.5 border-t border-dashed border-amber-400" />
              <span className="font-mono text-[7px] text-muted-foreground/40">THRESHOLD LINE</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────
export default function MLFinancePage() {
  return (
    <>
      <Helmet>
        <title>ML for Finance — Dmitri De Freitas</title>
        <meta name="description" content="Machine learning techniques for quantitative finance: purged K-fold cross-validation, triple-barrier labeling, and meta-labeling from Advances in Financial Machine Learning." />
      </Helmet>

      <div className="min-h-screen px-4 sm:px-6 lg:px-8 py-8">
      <div className="max-w-6xl mx-auto space-y-14">
        {/* Header */}
        <div className="border-b border-border pb-6">
          <div className="flex items-start justify-between mb-3">
            <div>
              <p className="font-mono text-[8px] text-muted-foreground/40 tracking-widest mb-2">
                MACHINE LEARNING · QUANTITATIVE FINANCE
              </p>
              <h1 className="font-mono text-2xl font-bold">ML FOR FINANCE</h1>
            </div>
            <span className="font-mono text-[8px] border border-primary/50 text-primary px-2 py-1 tracking-widest">ADV</span>
          </div>
          <p className="font-mono text-[11px] text-muted-foreground max-w-2xl leading-[1.8]">
            Three core methodologies from <em>Advances in Financial Machine Learning</em> (López de Prado, 2018)
            that address leakage, label quality, and bet-sizing — the primary failure modes of naive ML applied to markets.
          </p>
          <div className="flex gap-2 mt-4 flex-wrap">
            {['PURGED K-FOLD', 'TRIPLE BARRIER', 'META-LABELING', 'WALK-FORWARD CV', 'LÓPEZ DE PRADO'].map(t => (
              <span key={t} className="font-mono text-[7px] tracking-widest border border-border/50 px-2 py-0.5 text-muted-foreground/50">{t}</span>
            ))}
          </div>
        </div>

        <PurgedKFoldSection />
        <TripleBarrierSection />
        <MetaLabelingSection />

        {/* Reference footer */}
        <div className="border-t border-border/40 pt-6">
          <p className="font-mono text-[8px] text-muted-foreground/30 tracking-widest mb-3">REFERENCES</p>
          <div className="space-y-1">
            {[
              'López de Prado, M. (2018). Advances in Financial Machine Learning. Wiley.',
              'Bailey, D.H. & López de Prado, M. (2016). The Deflated Sharpe Ratio. J. Portfolio Management.',
              'López de Prado, M. (2020). Machine Learning for Asset Managers. Cambridge.',
            ].map((r, i) => (
              <p key={i} className="font-mono text-[9px] text-muted-foreground/40 leading-relaxed">[{i + 1}] {r}</p>
            ))}
          </div>
        </div>
      </div>
      </div>
    </>
  );
}
