import React, { useState, useCallback } from 'react';
import { Helmet } from 'react-helmet';
import {
  LineChart, Line, XAxis, YAxis, Tooltip, ReferenceLine,
  ResponsiveContainer, CartesianGrid, Legend,
} from 'recharts';

// ── Math helpers ─────────────────────────────────────────────────────────────────

function mean(arr) { return arr.reduce((a, b) => a + b, 0) / arr.length; }

function ols2(y, x) {
  // Simple bivariate OLS: y = a + b*x
  const n  = y.length;
  const mx = mean(x), my = mean(y);
  const b  = x.reduce((s, xi, i) => s + (xi - mx) * (y[i] - my), 0) /
             x.reduce((s, xi)    => s + (xi - mx) ** 2, 0);
  const a  = my - b * mx;
  return { alpha: a, beta: b };
}

function pct(v, d = 2) { return (v >= 0 ? '+' : '') + (v * 100).toFixed(d) + '%'; }

// ── Computation ───────────────────────────────────────────────────────────────────

function computePEAD(stockPrices, mktPrices, earningsDate) {
  // Build daily return maps
  const toMap = (arr) => {
    const m = {};
    for (let i = 1; i < arr.length; i++) {
      m[arr[i].date] = arr[i].adjClose / arr[i - 1].adjClose - 1;
    }
    return m;
  };

  const stockRet = toMap(stockPrices);
  const mktRet   = toMap(mktPrices);

  // Get common dates sorted
  const commonDates = Object.keys(stockRet)
    .filter(d => mktRet[d] !== undefined)
    .sort();

  if (commonDates.length < 30) throw new Error('Not enough overlapping trading days.');

  const eventIdx = commonDates.findLastIndex(d => d <= earningsDate);
  if (eventIdx < 20) throw new Error('Need more pre-event data. Try an earlier start date.');

  // Estimation window: up to 200 trading days before the event, stopping 5 days before
  const estEnd   = Math.max(0, eventIdx - 5);
  const estStart = Math.max(0, estEnd - 200);
  const estDates = commonDates.slice(estStart, estEnd);

  if (estDates.length < 20) throw new Error('Insufficient estimation window (need ≥ 20 days).');

  const estY = estDates.map(d => stockRet[d]);
  const estX = estDates.map(d => mktRet[d]);
  const model = ols2(estY, estX);

  // Event window: from -20 to +60 days relative to earnings
  const evtStart = Math.max(0, eventIdx - 20);
  const evtEnd   = Math.min(commonDates.length - 1, eventIdx + 60);
  const evtDates = commonDates.slice(evtStart, evtEnd + 1);

  let car = 0;
  const carData = evtDates.map((date, i) => {
    const relDay = i - (eventIdx - evtStart);
    const sr = stockRet[date];
    const mr = mktRet[date];
    const expected = model.alpha + model.beta * mr;
    const ar = sr - expected;
    car += ar;
    return {
      day: relDay,
      ar:  +(ar  * 100).toFixed(3),
      car: +(car * 100).toFixed(3),
    };
  });

  // Key window CAR statistics
  const atDay  = (d) => carData.find(p => p.day === d);
  const carAt  = (d) => atDay(d)?.car ?? null;

  return {
    carData, model,
    n: estDates.length,
    stats: {
      'CAR [-5, 0]':  carAt(0)  !== null ? pct((carAt(0)  - (carAt(-5) ?? 0)) / 100) : 'N/A',
      'CAR [0, +5]':  carAt(5)  !== null ? pct(carAt(5)  / 100) : 'N/A',
      'CAR [0, +20]': carAt(20) !== null ? pct(carAt(20) / 100) : 'N/A',
      'CAR [0, +40]': carAt(40) !== null ? pct(carAt(40) / 100) : 'N/A',
    },
  };
}

// ── Custom tooltip ────────────────────────────────────────────────────────────────

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-card border border-border p-2 font-mono text-[10px] space-y-0.5">
      <p className="text-muted-foreground">DAY {label > 0 ? '+' : ''}{label}</p>
      {payload.map(p => (
        <p key={p.name}>
          {p.name}: <span style={{ color: p.color }}>{p.value >= 0 ? '+' : ''}{p.value.toFixed(2)}%</span>
        </p>
      ))}
    </div>
  );
};

// ── Page ─────────────────────────────────────────────────────────────────────────

const API_BASE = window.location.hostname === 'localhost'
  ? '/hcgi/api'
  : 'https://newsapi-xspv.onrender.com';

export default function PEADPage() {
  const [ticker,       setTicker]       = useState('AAPL');
  const [earningsDate, setEarningsDate] = useState('');
  const [status,       setStatus]       = useState('idle');
  const [errorMsg,     setErrorMsg]     = useState('');
  const [result,       setResult]       = useState(null);

  const run = useCallback(async () => {
    const t = ticker.trim().toUpperCase();
    if (!t)           { setErrorMsg('Enter a ticker.'); setStatus('error'); return; }
    if (!earningsDate){ setErrorMsg('Enter an earnings date.'); setStatus('error'); return; }

    setStatus('loading'); setErrorMsg('');

    try {
      // Fetch ~300 days before earnings + 90 days after
      const event    = new Date(earningsDate);
      const startD   = new Date(event); startD.setDate(startD.getDate() - 320);
      const endD     = new Date(event); endD.setDate(endD.getDate() + 90);
      const start    = startD.toISOString().slice(0, 10);
      const end      = endD.toISOString().slice(0, 10) > new Date().toISOString().slice(0, 10)
                         ? new Date().toISOString().slice(0, 10)
                         : endD.toISOString().slice(0, 10);

      const res = await fetch(
        `${API_BASE}/market-data/daily?tickers=${t},SPY&start=${start}&end=${end}`
      );
      const { data, errors } = await res.json();

      if (!data[t])   throw new Error(`No price data for ${t}. ${errors?.[t] ?? ''}`);
      if (!data['SPY']) throw new Error('Could not fetch SPY benchmark data.');

      const pead = computePEAD(data[t], data['SPY'], earningsDate);
      setResult({ ...pead, ticker: t, earningsDate });
      setStatus('done');
    } catch (err) {
      setErrorMsg(err.message);
      setStatus('error');
    }
  }, [ticker, earningsDate]);

  return (
    <>
      <Helmet><title>DDF·LAB — PEAD Event Study</title></Helmet>

      <div className="min-h-screen px-4 sm:px-6 lg:px-8 py-8">
        <div className="max-w-5xl mx-auto">

          {/* Header */}
          <div className="mb-6 border-b border-border pb-4">
            <p className="font-mono text-[9px] text-primary tracking-widest mb-1">[11] PEAD / EVENT STUDY</p>
            <h1 className="font-mono text-xl font-bold tracking-tight text-foreground">Post-Earnings Announcement Drift</h1>
            <p className="font-mono text-[10px] text-muted-foreground mt-1">
              Market-model adjusted abnormal returns · Cumulative AR around earnings date
            </p>
          </div>

          {/* Controls */}
          <div className="border border-border p-4 mb-6 space-y-4">
            <div className="flex flex-wrap gap-4 items-end">
              <div>
                <label className="font-mono text-[9px] text-muted-foreground tracking-widest block mb-1">TICKER</label>
                <input
                  value={ticker}
                  onChange={e => setTicker(e.target.value.toUpperCase())}
                  className="w-28 bg-background border border-border font-mono text-xs px-3 py-2 text-foreground focus:outline-none focus:border-primary uppercase"
                  placeholder="AAPL"
                  maxLength={8}
                />
              </div>

              <div>
                <label className="font-mono text-[9px] text-muted-foreground tracking-widest block mb-1">
                  EARNINGS DATE
                </label>
                <input
                  type="date"
                  value={earningsDate}
                  onChange={e => setEarningsDate(e.target.value)}
                  className="bg-background border border-border font-mono text-xs px-3 py-2 text-foreground focus:outline-none focus:border-primary"
                  max={new Date().toISOString().slice(0, 10)}
                />
              </div>

              <button
                onClick={run}
                disabled={status === 'loading'}
                className="px-6 py-2 border border-primary font-mono text-[10px] tracking-widest text-primary hover:bg-primary hover:text-primary-foreground transition-colors disabled:opacity-50"
              >
                {status === 'loading' ? 'COMPUTING...' : '[ANALYZE →]'}
              </button>
            </div>

            <p className="font-mono text-[9px] text-muted-foreground/60">
              · Benchmark: SPY · Market model estimated on up to 200 pre-event trading days ·
              Event window: −20 to +60 days
            </p>

            {status === 'error' && (
              <p className="font-mono text-[10px] text-destructive">ERROR: {errorMsg}</p>
            )}
          </div>

          {/* Results */}
          {status === 'done' && result && (
            <div className="space-y-6">

              {/* Header stats */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {Object.entries(result.stats).map(([k, v]) => (
                  <div key={k} className="border border-border px-3 py-2">
                    <p className="font-mono text-[8px] text-muted-foreground tracking-widest">{k}</p>
                    <p className={`font-mono text-sm font-bold mt-0.5 ${
                      parseFloat(v) >= 0 ? 'text-terminal-green' : 'text-destructive'
                    }`}>
                      {v}
                    </p>
                  </div>
                ))}
              </div>

              {/* CAR chart */}
              <div className="border border-border p-4">
                <p className="font-mono text-[9px] text-muted-foreground tracking-widest mb-1">
                  CUMULATIVE ABNORMAL RETURN (CAR)
                </p>
                <p className="font-mono text-[8px] text-muted-foreground/60 mb-3">
                  {result.ticker} · Earnings: {result.earningsDate} · Day 0 = announcement
                </p>
                <ResponsiveContainer width="100%" height={320}>
                  <LineChart data={result.carData} margin={{ top: 10, right: 20, bottom: 10, left: 20 }}>
                    <CartesianGrid strokeDasharray="2 4" stroke="hsl(var(--border))" opacity={0.4} />
                    <XAxis
                      dataKey="day"
                      tick={{ fontFamily: 'IBM Plex Mono', fontSize: 9 }}
                      tickFormatter={d => d === 0 ? 'EVENT' : (d > 0 ? `+${d}` : d)}
                      interval={9}
                    />
                    <YAxis
                      tick={{ fontFamily: 'IBM Plex Mono', fontSize: 9 }}
                      tickFormatter={v => v.toFixed(1) + '%'}
                    />
                    <Tooltip content={<CustomTooltip />} />
                    <ReferenceLine x={0} stroke="#f97316" strokeDasharray="4 2" strokeWidth={1.5}
                      label={{ value: 'EARNINGS', position: 'top', fontFamily: 'IBM Plex Mono', fontSize: 8, fill: '#f97316' }}
                    />
                    <ReferenceLine y={0} stroke="hsl(var(--border))" />
                    <Line
                      type="monotone"
                      dataKey="car"
                      stroke="#22c55e"
                      dot={false}
                      strokeWidth={1.5}
                      name="CAR"
                    />
                    <Line
                      type="monotone"
                      dataKey="ar"
                      stroke="#6366f1"
                      dot={false}
                      strokeWidth={1}
                      strokeDasharray="2 3"
                      opacity={0.6}
                      name="Daily AR"
                    />
                    <Legend wrapperStyle={{ fontFamily: 'IBM Plex Mono', fontSize: 9 }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>

              {/* Market model */}
              <div className="border border-border p-4">
                <p className="font-mono text-[9px] text-muted-foreground tracking-widest mb-3">MARKET MODEL (ESTIMATION WINDOW)</p>
                <div className="grid grid-cols-3 gap-4">
                  {[
                    ['α (DAILY)',    pct(result.model.alpha, 4)],
                    ['β (MARKET)',   result.model.beta.toFixed(3)],
                    ['EST. DAYS',    result.n],
                  ].map(([k, v]) => (
                    <div key={k}>
                      <p className="font-mono text-[8px] text-muted-foreground tracking-widest">{k}</p>
                      <p className="font-mono text-sm font-bold text-primary mt-0.5">{v}</p>
                    </div>
                  ))}
                </div>
              </div>

              <p className="font-mono text-[8px] text-muted-foreground/50">
                · AR = ACTUAL RETURN − (α̂ + β̂ × SPY RETURN) · CAR = CUMULATIVE SUM OF AR ·
                BENCHMARK: SPY · FOR RESEARCH/EDUCATIONAL USE ONLY
              </p>
            </div>
          )}

          {status === 'idle' && (
            <div className="border border-border p-8 text-center space-y-2">
              <p className="font-mono text-[10px] text-muted-foreground">
                Enter a ticker and an earnings date to visualize post-earnings drift.
              </p>
              <p className="font-mono text-[9px] text-muted-foreground/50">
                Try: AAPL · any quarterly earnings date · e.g. 2024-08-01
              </p>
            </div>
          )}

          {status === 'loading' && (
            <div className="border border-border p-8 text-center">
              <p className="font-mono text-[10px] text-muted-foreground animate-pulse">
                FETCHING DAILY PRICE DATA...
              </p>
            </div>
          )}

        </div>
      </div>
    </>
  );
}
