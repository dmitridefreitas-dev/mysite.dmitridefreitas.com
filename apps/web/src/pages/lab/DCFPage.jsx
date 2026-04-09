import React, { useState, useCallback, useMemo } from 'react';
import { Helmet } from 'react-helmet';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid,
  ResponsiveContainer, ReferenceLine, Cell,
} from 'recharts';

const API_BASE = window.location.hostname === 'localhost'
  ? '/hcgi/api'
  : 'https://newsapi-xspv.onrender.com';

// ── Format helpers ────────────────────────────────────────────────────────────
function fmt(n, decimals = 1) {
  if (n == null || isNaN(n)) return '—';
  const abs = Math.abs(n);
  if (abs >= 1e12) return (n / 1e12).toFixed(decimals) + 'T';
  if (abs >= 1e9)  return (n / 1e9).toFixed(decimals) + 'B';
  if (abs >= 1e6)  return (n / 1e6).toFixed(decimals) + 'M';
  return n.toFixed(decimals);
}
function pct(n, d = 1) {
  if (n == null || isNaN(n)) return '—';
  return (n * 100).toFixed(d) + '%';
}
function usd(n) {
  if (n == null || isNaN(n)) return '—';
  return '$' + n.toFixed(2);
}
function margin(num, den) {
  if (!num || !den) return null;
  return num / den;
}

// ── DCF core ──────────────────────────────────────────────────────────────────
function runDCF({ baseRevenue, wacc, tgr, revGrowth, ebitdaMargin, daPct, capexPct, nwcPct, taxRate }) {
  if (wacc <= tgr) return null;
  const years = [1, 2, 3, 4, 5];
  let prevRevenue = baseRevenue;
  let prevNWC = baseRevenue * nwcPct;
  const fcffs = [];

  for (const yr of years) {
    const rev     = prevRevenue * (1 + revGrowth);
    const ebitda  = rev * ebitdaMargin;
    const da      = rev * daPct;
    const ebit    = ebitda - da;
    const nopat   = ebit * (1 - taxRate);
    const capex   = rev * capexPct;
    const nwc     = rev * nwcPct;
    const dNWC    = nwc - prevNWC;
    const fcff    = nopat + da - capex - dNWC;
    fcffs.push({ yr, rev, ebitda, ebit, nopat, capex, da, fcff });
    prevRevenue = rev;
    prevNWC = nwc;
  }

  const terminalFCFF = fcffs[4].fcff * (1 + tgr);
  const tv  = terminalFCFF / (wacc - tgr);

  let pv = 0;
  fcffs.forEach((f, i) => { pv += f.fcff / Math.pow(1 + wacc, i + 1); });
  const pvTV = tv / Math.pow(1 + wacc, 5);
  const ev   = pv + pvTV;

  return { fcffs, tv, pvTV, pv, ev };
}

// ── Sensitivity table ─────────────────────────────────────────────────────────
function SensitivityTable({ assumptions, netDebt, sharesOutstanding, currentPrice }) {
  const waccRange = [-0.02, -0.01, 0, +0.01, +0.02];
  const tgrRange  = [-0.01, -0.005, 0, +0.005, +0.01];

  return (
    <div className="overflow-x-auto">
      <p className="font-mono text-[8px] text-muted-foreground/60 mb-2">
        ROWS = WACC ± 2% · COLS = Terminal Growth ± 1%
      </p>
      <table className="font-mono text-[9px] border-collapse w-full">
        <thead>
          <tr>
            <th className="text-left px-2 py-1 border border-border text-muted-foreground">WACC \ TGR</th>
            {tgrRange.map(d => (
              <th key={d} className={`text-center px-2 py-1 border border-border ${d === 0 ? 'text-primary' : 'text-muted-foreground'}`}>
                {((assumptions.tgr + d) * 100).toFixed(1)}%
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {waccRange.map(wd => {
            const w = assumptions.wacc + wd;
            return (
              <tr key={wd}>
                <td className={`px-2 py-1 border border-border whitespace-nowrap ${wd === 0 ? 'text-primary' : 'text-muted-foreground'}`}>
                  {(w * 100).toFixed(1)}%
                </td>
                {tgrRange.map(td => {
                  const g = assumptions.tgr + td;
                  if (w <= g) return (
                    <td key={td} className="text-center px-2 py-1 border border-border text-muted-foreground/30">N/A</td>
                  );
                  const res = runDCF({ ...assumptions, wacc: w, tgr: g });
                  if (!res) return <td key={td} className="text-center px-2 py-1 border border-border">—</td>;
                  const equityVal = res.ev - netDebt;
                  const price = sharesOutstanding > 0 ? equityVal / sharesOutstanding : null;
                  if (!price || price < 0) return <td key={td} className="text-center px-2 py-1 border border-border text-muted-foreground/30">—</td>;
                  const upside = (price / currentPrice - 1);
                  const intensity = Math.min(Math.abs(upside) / 0.5, 1);
                  const bg = upside >= 0
                    ? `rgba(34,197,94,${0.1 + intensity * 0.35})`
                    : `rgba(239,68,68,${0.1 + intensity * 0.35})`;
                  const isBase = wd === 0 && td === 0;
                  return (
                    <td key={td} className={`text-center px-2 py-1 border ${isBase ? 'border-primary' : 'border-border'}`}
                        style={{ backgroundColor: bg }}>
                      <span className={upside >= 0 ? 'text-terminal-green' : 'text-destructive'}>
                        ${price.toFixed(2)}
                      </span>
                    </td>
                  );
                })}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

// ── Slider row ────────────────────────────────────────────────────────────────
function SliderRow({ label, value, min, max, step, onChange, display }) {
  return (
    <div className="flex items-center gap-3">
      <span className="font-mono text-[9px] text-muted-foreground tracking-widest w-36 shrink-0">{label}</span>
      <input
        type="range" min={min} max={max} step={step} value={value}
        onChange={e => onChange(parseFloat(e.target.value))}
        className="flex-1 accent-primary h-1"
      />
      <span className="font-mono text-[10px] text-primary w-14 text-right shrink-0">{display(value)}</span>
    </div>
  );
}

// ── Custom bar tooltip ────────────────────────────────────────────────────────
const FCFFTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-card border border-border p-2 font-mono text-[10px] space-y-0.5">
      <p className="text-muted-foreground">Year {label}</p>
      {payload.map(p => (
        <p key={p.name}>{p.name}: <span style={{ color: p.fill }}>{fmt(p.value)}</span></p>
      ))}
    </div>
  );
};

// ── Page ──────────────────────────────────────────────────────────────────────
export default function DCFPage() {
  const [ticker,  setTicker]  = useState('AAPL');
  const [status,  setStatus]  = useState('idle');
  const [errorMsg,setErrorMsg]= useState('');
  const [data,    setData]    = useState(null);

  // Assumption state
  const [revGrowth,    setRevGrowth]    = useState(0.08);
  const [ebitdaMargin, setEbitdaMargin] = useState(0.30);
  const [daPct,        setDaPct]        = useState(0.04);
  const [capexPct,     setCapexPct]     = useState(0.05);
  const [nwcPct,       setNwcPct]       = useState(0.02);
  const [taxRate,      setTaxRate]      = useState(0.21);
  const [wacc,         setWacc]         = useState(0.10);
  const [tgr,          setTgr]          = useState(0.025);

  const load = useCallback(async () => {
    const t = ticker.trim().toUpperCase();
    if (!t) { setErrorMsg('Enter a ticker.'); setStatus('error'); return; }
    setStatus('loading'); setErrorMsg('');
    try {
      const res  = await fetch(`${API_BASE}/market-data/fundamentals?ticker=${t}`);
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Failed to fetch fundamentals.');
      if (!json.years?.length) throw new Error('No historical financial data returned.');
      setData(json);

      // Auto-populate defaults from historical data
      const yrs = json.years.filter(y => y.revenue);
      if (yrs.length >= 2) {
        const last = yrs[yrs.length - 1];
        const prev = yrs[yrs.length - 2];

        const hGrowth = prev.revenue > 0 ? last.revenue / prev.revenue - 1 : 0.08;
        setRevGrowth(+Math.min(Math.max(hGrowth, 0.02), 0.30).toFixed(3));

        if (last.revenue > 0) {
          const ebitdaEst = (last.ebit ?? 0) + (last.da ?? 0);
          if (ebitdaEst > 0) setEbitdaMargin(+Math.min(ebitdaEst / last.revenue, 0.60).toFixed(3));
          if (last.da  > 0) setDaPct(+(last.da  / last.revenue).toFixed(3));
          if (last.capex > 0) setCapexPct(+(last.capex / last.revenue).toFixed(3));
        }
        if (json.taxRate > 0) setTaxRate(+Math.min(json.taxRate, 0.40).toFixed(3));
      }

      setStatus('done');
    } catch (err) {
      setErrorMsg(err.message);
      setStatus('error');
    }
  }, [ticker]);

  // Derived values
  const baseRevenue = data?.years?.at(-1)?.revenue ?? 0;
  const netDebt = (data?.totalDebt ?? 0) - (data?.totalCash ?? 0);

  const assumptions = { baseRevenue, revGrowth, ebitdaMargin, daPct, capexPct, nwcPct, taxRate, wacc, tgr };
  const dcf = useMemo(() => runDCF(assumptions), [revGrowth, ebitdaMargin, daPct, capexPct, nwcPct, taxRate, wacc, tgr, baseRevenue]);

  const shares = data?.sharesOutstanding ?? 0;
  const equityValue = dcf ? dcf.ev - netDebt : null;
  const impliedPrice = equityValue != null && shares > 0 ? equityValue / shares : null;
  const currentPrice = data?.currentPrice ?? null;
  const upside = impliedPrice != null && currentPrice ? impliedPrice / currentPrice - 1 : null;

  const fcffChartData = dcf?.fcffs.map(f => ({
    yr: `Y${f.yr}`,
    Revenue: f.rev,
    EBITDA: f.ebitda,
    FCFF: f.fcff,
  })) ?? [];

  return (
    <>
      <Helmet><title>DDF·LAB — DCF Modeler</title></Helmet>

      <div className="min-h-screen px-4 sm:px-6 lg:px-8 py-8">
        <div className="max-w-6xl mx-auto">

          {/* Header */}
          <div className="mb-6 border-b border-border pb-4">
            <p className="font-mono text-[9px] text-primary tracking-widest mb-1">[M] DCF / 3-STATEMENT MODEL</p>
            <h1 className="font-mono text-xl font-bold tracking-tight text-foreground">DCF Modeler</h1>
            <p className="font-mono text-[10px] text-muted-foreground mt-1">
              Live 3-statement pull · 5-year FCFF projection · WACC sensitivity · Implied price vs. market
            </p>
          </div>

          {/* Controls */}
          <div className="border border-border p-4 mb-6">
            <div className="flex flex-wrap gap-4 items-end">
              <div>
                <label className="font-mono text-[9px] text-muted-foreground tracking-widest block mb-1">TICKER</label>
                <input
                  value={ticker}
                  onChange={e => setTicker(e.target.value.toUpperCase())}
                  onKeyDown={e => e.key === 'Enter' && load()}
                  className="w-28 bg-background border border-border font-mono text-xs px-3 py-2 text-foreground focus:outline-none focus:border-primary uppercase"
                  placeholder="AAPL"
                  maxLength={8}
                />
              </div>
              <button
                onClick={load}
                disabled={status === 'loading'}
                className="px-6 py-2 border border-primary font-mono text-[10px] tracking-widest text-primary hover:bg-primary hover:text-primary-foreground transition-colors disabled:opacity-50"
              >
                {status === 'loading' ? 'LOADING...' : '[LOAD →]'}
              </button>
            </div>
            <p className="font-mono text-[9px] text-muted-foreground/60 mt-3">
              · Fundamentals via Yahoo Finance · Assumptions auto-populated from historical data · Adjust sliders in real time
            </p>
            {status === 'error' && (
              <p className="font-mono text-[10px] text-destructive mt-2">ERROR: {errorMsg}</p>
            )}
          </div>

          {status === 'idle' && (
            <div className="border border-border p-8 text-center space-y-2">
              <p className="font-mono text-[10px] text-muted-foreground">Load any publicly traded company to build a 5-year DCF model.</p>
              <p className="font-mono text-[9px] text-muted-foreground/50">Try: AAPL · MSFT · GOOGL · JPM · AMZN</p>
            </div>
          )}

          {status === 'loading' && (
            <div className="border border-border p-8 text-center">
              <p className="font-mono text-[10px] text-muted-foreground animate-pulse">FETCHING FINANCIAL STATEMENTS...</p>
            </div>
          )}

          {status === 'done' && data && (
            <div className="space-y-6">

              {/* Company header */}
              <div className="flex flex-wrap items-center gap-4">
                <div>
                  <p className="font-mono text-[8px] text-muted-foreground tracking-widest">{data.ticker}</p>
                  <p className="font-mono text-lg font-bold text-foreground">{data.shortName}</p>
                </div>
                <div className="flex gap-4 flex-wrap">
                  {[
                    ['PRICE',   usd(data.currentPrice)],
                    ['MKT CAP', fmt(data.marketCap)],
                    ['BETA',    data.beta?.toFixed(2) ?? '—'],
                    ['NET DEBT', fmt(netDebt)],
                    ['SHARES',  fmt(shares)],
                  ].map(([k, v]) => (
                    <div key={k} className="border border-border px-3 py-1.5">
                      <p className="font-mono text-[8px] text-muted-foreground tracking-widest">{k}</p>
                      <p className="font-mono text-xs font-bold text-primary">{v}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Historical 3-statement */}
              <div className="border border-border p-4">
                <p className="font-mono text-[9px] text-muted-foreground tracking-widest mb-3">HISTORICAL FINANCIALS (ANNUAL)</p>
                <div className="overflow-x-auto">
                  <table className="w-full font-mono text-[9px] border-collapse">
                    <thead>
                      <tr>
                        <th className="text-left px-3 py-1.5 border border-border text-muted-foreground">METRIC</th>
                        {data.years.map(y => (
                          <th key={y.year} className="text-right px-3 py-1.5 border border-border text-muted-foreground">{y.year}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {[
                        { label: 'Revenue',           key: 'revenue',     bold: true },
                        { label: 'Gross Profit',       key: 'grossProfit', sub: true },
                        { label: 'EBIT',               key: 'ebit',        sub: true },
                        { label: 'Net Income',         key: 'netIncome',   sub: true },
                        { label: '──',                 divider: true },
                        { label: 'D&A',                key: 'da',          sub: true },
                        { label: 'CapEx',              key: 'capex',       sub: true },
                        { label: 'Operating CF',       key: 'operatingCF', sub: true },
                        { label: '──',                 divider: true },
                        { label: 'Cash & Equiv.',      key: 'cash',        sub: true },
                        { label: 'Total Debt',         key: 'totalDebt',   sub: true },
                      ].map((row, i) => {
                        if (row.divider) return (
                          <tr key={i}>
                            <td colSpan={data.years.length + 1} className="px-3 py-0.5 border-0 text-muted-foreground/20 text-center select-none">{'─'.repeat(50)}</td>
                          </tr>
                        );
                        return (
                          <tr key={row.label} className="hover:bg-muted/5">
                            <td className={`px-3 py-1.5 border border-border ${row.bold ? 'text-foreground font-bold' : 'text-muted-foreground'} ${row.sub ? 'pl-5' : ''}`}>
                              {row.label}
                            </td>
                            {data.years.map(y => {
                              const v = y[row.key];
                              return (
                                <td key={y.year} className={`text-right px-3 py-1.5 border border-border ${row.bold ? 'text-foreground font-bold' : 'text-muted-foreground'}`}>
                                  {v != null ? fmt(v) : '—'}
                                </td>
                              );
                            })}
                          </tr>
                        );
                      })}
                      {/* Margin rows */}
                      {[
                        { label: 'Gross Margin',   vals: data.years.map(y => margin(y.grossProfit, y.revenue)) },
                        { label: 'EBIT Margin',    vals: data.years.map(y => margin(y.ebit, y.revenue)) },
                        { label: 'Net Margin',     vals: data.years.map(y => margin(y.netIncome, y.revenue)) },
                      ].map(row => (
                        <tr key={row.label} className="hover:bg-muted/5">
                          <td className="px-3 py-1.5 border border-border text-muted-foreground pl-5">{row.label}</td>
                          {row.vals.map((v, i) => (
                            <td key={i} className="text-right px-3 py-1.5 border border-border text-muted-foreground">{pct(v)}</td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Assumptions panel + DCF output side by side */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

                {/* Assumptions */}
                <div className="border border-border p-4">
                  <p className="font-mono text-[9px] text-muted-foreground tracking-widest mb-4">ASSUMPTIONS</p>
                  <div className="space-y-4">
                    <div>
                      <p className="font-mono text-[8px] text-muted-foreground/60 tracking-widest mb-2">INCOME STATEMENT</p>
                      <div className="space-y-3">
                        <SliderRow label="Rev. Growth (YoY)" value={revGrowth} min={-0.10} max={0.40} step={0.005} onChange={setRevGrowth} display={v => pct(v)} />
                        <SliderRow label="EBITDA Margin" value={ebitdaMargin} min={0.05} max={0.70} step={0.005} onChange={setEbitdaMargin} display={v => pct(v)} />
                        <SliderRow label="D&A % Revenue" value={daPct} min={0.01} max={0.20} step={0.005} onChange={setDaPct} display={v => pct(v)} />
                        <SliderRow label="CapEx % Revenue" value={capexPct} min={0.01} max={0.30} step={0.005} onChange={setCapexPct} display={v => pct(v)} />
                        <SliderRow label="ΔNWC % Revenue" value={nwcPct} min={-0.05} max={0.10} step={0.005} onChange={setNwcPct} display={v => pct(v)} />
                        <SliderRow label="Tax Rate" value={taxRate} min={0.05} max={0.40} step={0.005} onChange={setTaxRate} display={v => pct(v)} />
                      </div>
                    </div>
                    <div className="border-t border-border pt-3">
                      <p className="font-mono text-[8px] text-muted-foreground/60 tracking-widest mb-2">DISCOUNT RATE</p>
                      <div className="space-y-3">
                        <SliderRow label="WACC" value={wacc} min={0.04} max={0.20} step={0.005} onChange={setWacc} display={v => pct(v)} />
                        <SliderRow label="Terminal Growth" value={tgr} min={0.00} max={0.05} step={0.005} onChange={setTgr} display={v => pct(v)} />
                      </div>
                    </div>
                  </div>
                </div>

                {/* DCF output */}
                <div className="space-y-4">
                  {/* Implied price */}
                  <div className="border border-border p-4">
                    <p className="font-mono text-[9px] text-muted-foreground tracking-widest mb-3">VALUATION OUTPUT</p>
                    {dcf ? (
                      <div className="space-y-3">
                        <div className="grid grid-cols-2 gap-3">
                          {[
                            ['PV (FCFFs)',   fmt(dcf.pv)],
                            ['PV (Term. Val.)', fmt(dcf.pvTV)],
                            ['Enterprise Value', fmt(dcf.ev)],
                            ['Net Debt',     fmt(netDebt)],
                            ['Equity Value', fmt(equityValue)],
                            ['Shares Out.',  fmt(shares)],
                          ].map(([k, v]) => (
                            <div key={k}>
                              <p className="font-mono text-[8px] text-muted-foreground tracking-widest">{k}</p>
                              <p className="font-mono text-xs font-bold text-foreground mt-0.5">{v}</p>
                            </div>
                          ))}
                        </div>

                        <div className="border-t border-border pt-3 flex items-end gap-6">
                          <div>
                            <p className="font-mono text-[8px] text-muted-foreground tracking-widest">IMPLIED PRICE</p>
                            <p className="font-mono text-3xl font-bold text-primary mt-0.5">
                              {impliedPrice != null ? usd(impliedPrice) : '—'}
                            </p>
                          </div>
                          {currentPrice && impliedPrice && (
                            <div>
                              <p className="font-mono text-[8px] text-muted-foreground tracking-widest">VS. MARKET ({usd(currentPrice)})</p>
                              <p className={`font-mono text-xl font-bold mt-0.5 ${upside >= 0 ? 'text-terminal-green' : 'text-destructive'}`}>
                                {upside >= 0 ? '+' : ''}{pct(upside)}
                              </p>
                            </div>
                          )}
                        </div>

                        <div className="text-right">
                          <p className="font-mono text-[8px] text-muted-foreground/50">
                            TV / EV: {pct(dcf.pvTV / dcf.ev)} · Base Rev: {fmt(baseRevenue)}
                          </p>
                        </div>
                      </div>
                    ) : (
                      <p className="font-mono text-[10px] text-destructive">WACC must exceed terminal growth rate.</p>
                    )}
                  </div>

                  {/* Projected model table */}
                  {dcf && (
                    <div className="border border-border p-4">
                      <p className="font-mono text-[9px] text-muted-foreground tracking-widest mb-3">5-YEAR PROJECTION</p>
                      <div className="overflow-x-auto">
                        <table className="w-full font-mono text-[9px] border-collapse">
                          <thead>
                            <tr>
                              <th className="text-left px-2 py-1 border border-border text-muted-foreground">METRIC</th>
                              {dcf.fcffs.map(f => (
                                <th key={f.yr} className="text-right px-2 py-1 border border-border text-muted-foreground">Y{f.yr}</th>
                              ))}
                            </tr>
                          </thead>
                          <tbody>
                            {[
                              { label: 'Revenue',   key: 'rev',    bold: true },
                              { label: 'EBITDA',    key: 'ebitda'  },
                              { label: 'EBIT',      key: 'ebit'    },
                              { label: 'NOPAT',     key: 'nopat'   },
                              { label: 'D&A',       key: 'da'      },
                              { label: 'CapEx',     key: 'capex'   },
                              { label: 'FCFF',      key: 'fcff',   bold: true },
                            ].map(row => (
                              <tr key={row.label} className="hover:bg-muted/5">
                                <td className={`px-2 py-1 border border-border ${row.bold ? 'text-foreground font-bold' : 'text-muted-foreground'}`}>{row.label}</td>
                                {dcf.fcffs.map(f => (
                                  <td key={f.yr} className={`text-right px-2 py-1 border border-border ${row.bold ? 'text-foreground font-bold' : 'text-muted-foreground'}`}>
                                    {fmt(f[row.key])}
                                  </td>
                                ))}
                              </tr>
                            ))}
                            <tr>
                              <td className="px-2 py-1 border border-border text-muted-foreground">Disc. Factor</td>
                              {dcf.fcffs.map(f => (
                                <td key={f.yr} className="text-right px-2 py-1 border border-border text-muted-foreground">
                                  {(1 / Math.pow(1 + wacc, f.yr)).toFixed(3)}
                                </td>
                              ))}
                            </tr>
                            <tr>
                              <td className="px-2 py-1 border border-border text-foreground font-bold">PV (FCFF)</td>
                              {dcf.fcffs.map(f => (
                                <td key={f.yr} className="text-right px-2 py-1 border border-border text-foreground font-bold">
                                  {fmt(f.fcff / Math.pow(1 + wacc, f.yr))}
                                </td>
                              ))}
                            </tr>
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* FCFF bar chart */}
              {dcf && fcffChartData.length > 0 && (
                <div className="border border-border p-4">
                  <p className="font-mono text-[9px] text-muted-foreground tracking-widest mb-3">PROJECTED FCFF vs. REVENUE</p>
                  <ResponsiveContainer width="100%" height={220}>
                    <BarChart data={fcffChartData} margin={{ top: 5, right: 20, bottom: 5, left: 20 }}>
                      <CartesianGrid strokeDasharray="2 4" stroke="hsl(var(--border))" opacity={0.4} />
                      <XAxis dataKey="yr" tick={{ fontFamily: 'IBM Plex Mono', fontSize: 9 }} />
                      <YAxis tick={{ fontFamily: 'IBM Plex Mono', fontSize: 9 }} tickFormatter={v => fmt(v, 0)} />
                      <Tooltip content={<FCFFTooltip />} />
                      <Bar dataKey="Revenue" fill="#6366f1" opacity={0.4} />
                      <Bar dataKey="EBITDA" fill="#06b6d4" opacity={0.5} />
                      <Bar dataKey="FCFF" fill="#22c55e" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}

              {/* Sensitivity table */}
              {dcf && data.currentPrice && data.sharesOutstanding && (
                <div className="border border-border p-4">
                  <p className="font-mono text-[9px] text-muted-foreground tracking-widest mb-3">SENSITIVITY: IMPLIED PRICE (WACC × TERMINAL GROWTH)</p>
                  <SensitivityTable
                    assumptions={assumptions}
                    netDebt={netDebt}
                    sharesOutstanding={shares}
                    currentPrice={data.currentPrice}
                  />
                </div>
              )}

              <p className="font-mono text-[8px] text-muted-foreground/40">
                · FCFF = NOPAT + D&A − CapEx − ΔNWC · TV = FCFF₅×(1+g)/(WACC−g) · EV = PV(FCFFs) + PV(TV) ·
                EQUITY VALUE = EV − NET DEBT · FOR RESEARCH/EDUCATIONAL USE ONLY
              </p>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
