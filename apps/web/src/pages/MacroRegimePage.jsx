import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, RefreshCw } from 'lucide-react';
import { motion } from 'framer-motion';
import apiServerClient from '@/lib/apiServerClient.js';
import GridBackground from '@/components/GridBackground.jsx';

// ── Signal classifiers ────────────────────────────────────────────────────────────

function yieldSignal(spread) {
  if (spread >= 1.5)  return { score: 2, label: 'NORMAL',    detail: 'Upward-sloping',  color: '#22c55e' };
  if (spread >= 0.25) return { score: 1, label: 'FLATTENING',detail: 'Curve flattening', color: '#86efac' };
  if (spread >= -0.25)return { score: 0, label: 'FLAT',      detail: 'Near flat',        color: '#9ca3af' };
  if (spread >= -1.0) return { score:-1, label: 'INVERTED',  detail: 'Mildly inverted',  color: '#fca5a5' };
  return               { score:-2, label: 'DEEP INV.',  detail: 'Deeply inverted',  color: '#ef4444' };
}

function momentumSignal(ret12m) {
  const pct = (ret12m * 100).toFixed(1);
  const sign = ret12m >= 0 ? '+' : '';
  if (ret12m >= 0.15) return { score: 2, label: 'STRONG',   detail: `SPY ${sign}${pct}%`, color: '#22c55e' };
  if (ret12m >= 0.05) return { score: 1, label: 'POSITIVE', detail: `SPY ${sign}${pct}%`, color: '#86efac' };
  if (ret12m >=-0.05) return { score: 0, label: 'NEUTRAL',  detail: `SPY ${sign}${pct}%`, color: '#9ca3af' };
  if (ret12m >=-0.15) return { score:-1, label: 'NEGATIVE', detail: `SPY ${sign}${pct}%`, color: '#fca5a5' };
  return               { score:-2, label: 'BEARISH',  detail: `SPY ${sign}${pct}%`, color: '#ef4444' };
}

function volatilitySignal(vix) {
  const v = vix.toFixed(1);
  if (vix < 16)  return { score: 2, label: 'CALM',     detail: `VIX ${v}`, color: '#22c55e' };
  if (vix < 20)  return { score: 1, label: 'LOW',      detail: `VIX ${v}`, color: '#86efac' };
  if (vix < 25)  return { score: 0, label: 'ELEVATED', detail: `VIX ${v}`, color: '#9ca3af' };
  if (vix < 30)  return { score:-1, label: 'HIGH',     detail: `VIX ${v}`, color: '#fca5a5' };
  return          { score:-2, label: 'FEAR',     detail: `VIX ${v}`, color: '#ef4444' };
}

function creditSignal(hyg6m, lqd6m) {
  const excess = hyg6m - lqd6m;
  const pct = (excess * 100).toFixed(1);
  const sign = excess >= 0 ? '+' : '';
  if (excess >= 0.04)  return { score: 2, label: 'TIGHT',  detail: `HYG−LQD ${sign}${pct}%`, color: '#22c55e' };
  if (excess >= 0.01)  return { score: 1, label: 'FIRM',   detail: `HYG−LQD ${sign}${pct}%`, color: '#86efac' };
  if (excess >=-0.01)  return { score: 0, label: 'MIXED',  detail: `HYG−LQD ${sign}${pct}%`, color: '#9ca3af' };
  if (excess >=-0.04)  return { score:-1, label: 'WIDE',   detail: `HYG−LQD ${sign}${pct}%`, color: '#fca5a5' };
  return                { score:-2, label: 'STRESS', detail: `HYG−LQD ${sign}${pct}%`, color: '#ef4444' };
}

// ── Regime definitions ────────────────────────────────────────────────────────────

const REGIMES = {
  EXPANSION: {
    label: 'EXPANSION', sub: 'Early-to-Mid Cycle',
    color: '#22c55e', bg: 'rgba(34,197,94,0.06)',
    narrative: 'Yield curve is upward-sloping, equity momentum is positive, and volatility is suppressed. Credit spreads are tight. This is a risk-on environment that historically favors growth equities, cyclicals, and high-yield credit.',
    sectors: [
      { label: 'TECH / GROWTH',    signal: 'OVERWEIGHT',  color: '#22c55e' },
      { label: 'CONSUMER DISC.',   signal: 'OVERWEIGHT',  color: '#22c55e' },
      { label: 'INDUSTRIALS',      signal: 'OVERWEIGHT',  color: '#22c55e' },
      { label: 'FINANCIALS',       signal: 'NEUTRAL',     color: '#9ca3af' },
      { label: 'UTILITIES',        signal: 'UNDERWEIGHT', color: '#ef4444' },
      { label: 'GOLD / DEFENSIVE', signal: 'UNDERWEIGHT', color: '#ef4444' },
    ],
  },
  LATE_CYCLE: {
    label: 'LATE CYCLE', sub: 'Overheat / Peak',
    color: '#eab308', bg: 'rgba(234,179,8,0.06)',
    narrative: 'The cycle is maturing. The yield curve is flattening, equities remain positive but momentum is fading, and volatility is ticking up. Rotate toward quality and value; trim speculative growth; begin building defensive positions.',
    sectors: [
      { label: 'ENERGY / MATERIALS', signal: 'OVERWEIGHT',  color: '#22c55e' },
      { label: 'FINANCIALS',         signal: 'OVERWEIGHT',  color: '#22c55e' },
      { label: 'CONSUMER STAPLES',   signal: 'BUILD',       color: '#eab308' },
      { label: 'TECH / GROWTH',      signal: 'TRIM',        color: '#eab308' },
      { label: 'UTILITIES',          signal: 'NEUTRAL',     color: '#9ca3af' },
      { label: 'LONG DURATION',      signal: 'UNDERWEIGHT', color: '#ef4444' },
    ],
  },
  CONTRACTION: {
    label: 'CONTRACTION', sub: 'Slowdown / Cooling',
    color: '#f97316', bg: 'rgba(249,115,22,0.06)',
    narrative: 'Yield curve has inverted. Equity momentum is rolling over and credit spreads are widening. Defensive positioning is warranted — reduce beta, increase quality, build short-duration bond exposure, and raise cash.',
    sectors: [
      { label: 'CONSUMER STAPLES', signal: 'OVERWEIGHT',  color: '#22c55e' },
      { label: 'HEALTHCARE',       signal: 'OVERWEIGHT',  color: '#22c55e' },
      { label: 'CASH / T-BILLS',   signal: 'BUILD',       color: '#eab308' },
      { label: 'TECH / GROWTH',    signal: 'UNDERWEIGHT', color: '#ef4444' },
      { label: 'SMALL CAP',        signal: 'UNDERWEIGHT', color: '#ef4444' },
      { label: 'HIGH YIELD',       signal: 'REDUCE',      color: '#ef4444' },
    ],
  },
  RECESSION: {
    label: 'RECESSION', sub: 'Capital Preservation',
    color: '#ef4444', bg: 'rgba(239,68,68,0.06)',
    narrative: 'All major regime signals are flashing red. Equities are in drawdown, credit has blown out, and volatility is elevated. Preserve capital. Maximum cash, short-duration bonds, and gold historically outperform in this phase.',
    sectors: [
      { label: 'CASH / T-BILLS',   signal: 'MAX WEIGHT',  color: '#22c55e' },
      { label: 'GOLD',             signal: 'OVERWEIGHT',  color: '#22c55e' },
      { label: 'LONG DURATION',    signal: 'BUILD',       color: '#eab308' },
      { label: 'EQUITIES (BROAD)', signal: 'UNDERWEIGHT', color: '#ef4444' },
      { label: 'HIGH YIELD',       signal: 'AVOID',       color: '#ef4444' },
      { label: 'CYCLICALS',        signal: 'AVOID',       color: '#ef4444' },
    ],
  },
};

function scoreToRegime(score) {
  if (score >= 4)  return REGIMES.EXPANSION;
  if (score >= 1)  return REGIMES.LATE_CYCLE;
  if (score >= -1) return REGIMES.CONTRACTION;
  return REGIMES.RECESSION;
}

function computeReturn(monthlyData, months) {
  if (!monthlyData || monthlyData.length < months) return null;
  return monthlyData.slice(-months).reduce((acc, d) => acc * (1 + d.ret), 1) - 1;
}

// ── Component ─────────────────────────────────────────────────────────────────────

export default function MacroRegimePage() {
  const navigate = useNavigate();
  const [status, setStatus] = useState('loading');
  const [data, setData] = useState(null);

  const load = useCallback(async () => {
    setStatus('loading');
    try {
      const [mnRes, mdRes, monthlyRes] = await Promise.all([
        apiServerClient.fetch('/market-data/morning-note'),
        apiServerClient.fetch('/market-data'),
        apiServerClient.fetch('/market-data/monthly?tickers=SPY,HYG,LQD&months=13'),
      ]);

      const mn      = await mnRes.json();
      const md      = await mdRes.json();
      const monthly = await monthlyRes.json();

      // Yield spread
      const yield10 = mn.yields?.find(y => y.label === '10Y')?.value ?? null;
      const yield3m = mn.yields?.find(y => y.label === '3M')?.value  ?? null;
      const spread  = yield10 != null && yield3m != null ? yield10 - yield3m : null;

      // VIX
      const vixRaw = md.find(d => d.label === 'VIX');
      const vix    = vixRaw ? parseFloat(vixRaw.value) : null;

      // Momentum + credit
      const spy12m = computeReturn(monthly.data?.SPY, 12);
      const hyg6m  = computeReturn(monthly.data?.HYG, 6);
      const lqd6m  = computeReturn(monthly.data?.LQD, 6);

      // Classify
      const ySig = spread != null ? yieldSignal(spread)        : null;
      const mSig = spy12m != null ? momentumSignal(spy12m)     : null;
      const vSig = vix    != null ? volatilitySignal(vix)      : null;
      const cSig = hyg6m  != null && lqd6m != null
        ? creditSignal(hyg6m, lqd6m) : null;

      const validSignals = [ySig, mSig, vSig, cSig].filter(Boolean);
      const totalScore   = validSignals.reduce((a, s) => a + s.score, 0);
      const regime       = scoreToRegime(totalScore);

      setData({
        regime, totalScore,
        signals: [
          {
            name: 'YIELD CURVE',
            value: spread != null ? `${spread >= 0 ? '+' : ''}${spread.toFixed(2)}%` : '—',
            sub: '10Y − 3M SPREAD',
            sig: ySig,
          },
          {
            name: 'EQUITY MOM.',
            value: spy12m != null ? `${spy12m >= 0 ? '+' : ''}${(spy12m * 100).toFixed(1)}%` : '—',
            sub: 'SPY 12M RETURN',
            sig: mSig,
          },
          {
            name: 'VOLATILITY',
            value: vix != null ? vix.toFixed(1) : '—',
            sub: 'VIX INDEX',
            sig: vSig,
          },
          {
            name: 'CREDIT',
            value: hyg6m != null && lqd6m != null
              ? `${(hyg6m - lqd6m) >= 0 ? '+' : ''}${((hyg6m - lqd6m) * 100).toFixed(1)}%`
              : '—',
            sub: 'HYG − LQD 6M',
            sig: cSig,
          },
        ],
        yields: mn.yields ?? [],
        headline: mn.headline ?? null,
        asOf: mn.asOf ?? null,
      });
      setStatus('ok');
    } catch {
      setStatus('error');
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    const handler = (e) => { if (e.key === 'Escape') navigate('/news'); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [navigate]);

  const regime = data?.regime;

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      <GridBackground />

      {/* ── Header ── */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-background/95 backdrop-blur-sm border-b border-border">
        <div className="flex items-center h-10 px-4 gap-3">
          <button
            onClick={() => navigate('/news')}
            className="flex items-center gap-1.5 px-3 h-7 font-mono text-[11px] tracking-widest border border-primary text-primary hover:bg-primary hover:text-primary-foreground transition-colors shrink-0"
            title="Back to News (Escape)"
          >
            <ArrowLeft className="h-3 w-3" />
            ESC
          </button>
          <span className="font-mono text-[10px] text-muted-foreground tracking-widest hidden sm:inline">
            MACRO REGIME HUD
          </span>
          <div className="ml-auto flex items-center gap-3">
            <button
              onClick={load}
              disabled={status === 'loading'}
              className="font-mono text-[10px] border border-border px-2 h-6 text-muted-foreground hover:text-foreground hover:bg-muted transition-colors flex items-center gap-1.5 tracking-widest disabled:opacity-50"
            >
              <RefreshCw className={`w-3 h-3 ${status === 'loading' ? 'animate-spin' : ''}`} />
              REFRESH
            </button>
            <span className="font-mono text-[10px] text-muted-foreground tracking-widest hidden sm:inline">
              DDF<span className="text-primary">·</span>TERMINAL
            </span>
          </div>
        </div>
      </header>

      <main className="flex-grow pt-10 pb-16 relative z-10">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-5xl py-10">

          {/* Loading */}
          {status === 'loading' && (
            <div className="flex items-center justify-center min-h-[60vh]">
              <div className="text-center">
                <div className="flex gap-1.5 justify-center mb-3">
                  {[0, 1, 2].map(i => (
                    <span
                      key={i}
                      className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse"
                      style={{ animationDelay: `${i * 0.15}s` }}
                    />
                  ))}
                </div>
                <p className="font-mono text-xs text-muted-foreground tracking-widest">
                  COMPUTING MACRO REGIME...
                </p>
              </div>
            </div>
          )}

          {/* Error */}
          {status === 'error' && (
            <div className="border border-border px-6 py-12 text-center max-w-md mx-auto mt-20">
              <p className="font-mono text-sm text-muted-foreground mb-2">REGIME DATA UNAVAILABLE</p>
              <p className="font-mono text-xs text-muted-foreground/60 mb-4">
                Could not connect to market data sources. API server may be offline.
              </p>
              <button
                onClick={load}
                className="font-mono text-[11px] tracking-widest border border-border px-4 py-2 text-muted-foreground hover:bg-muted transition-colors"
              >
                RETRY →
              </button>
            </div>
          )}

          {/* ── HUD ── */}
          {status === 'ok' && data && (
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
            >
              {/* Regime badge */}
              <div className="mb-10 text-center">
                <span className="font-mono text-[10px] text-muted-foreground tracking-[0.2em] block mb-4">
                  CURRENT MACRO REGIME
                </span>
                <div
                  className="inline-block border-2 px-10 py-5 mb-3"
                  style={{ borderColor: regime.color, background: regime.bg }}
                >
                  <span
                    className="font-mono text-3xl md:text-5xl font-bold tracking-widest"
                    style={{ color: regime.color }}
                  >
                    {regime.label}
                  </span>
                </div>
                <p className="font-mono text-xs text-muted-foreground tracking-widest">{regime.sub}</p>
                <p className="font-mono text-[9px] text-muted-foreground/40 mt-1 tracking-widest">
                  COMPOSITE SCORE {data.totalScore >= 0 ? '+' : ''}{data.totalScore}
                  {' · '}{data.signals.filter(s => s.sig).length} / 4 SIGNALS ACTIVE
                  {data.asOf ? ` · AS OF ${new Date(data.asOf).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false })}` : ''}
                </p>
              </div>

              {/* Signal cards */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-8">
                {data.signals.map((s, i) => (
                  <motion.div
                    key={s.name}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.07, duration: 0.25 }}
                    className="border p-4 flex flex-col gap-1.5"
                    style={
                      s.sig
                        ? { borderColor: s.sig.color + '50', background: s.sig.color + '09' }
                        : { borderColor: 'var(--border)' }
                    }
                  >
                    <span className="font-mono text-[9px] text-muted-foreground tracking-widest">{s.name}</span>
                    <span
                      className="font-mono text-2xl font-bold tracking-tight leading-none"
                      style={{ color: s.sig?.color ?? 'var(--muted-foreground)' }}
                    >
                      {s.value}
                    </span>
                    <span
                      className="font-mono text-[10px] font-semibold tracking-widest"
                      style={{ color: s.sig?.color ?? 'var(--muted-foreground)' }}
                    >
                      {s.sig?.label ?? '—'}
                    </span>
                    <span className="font-mono text-[9px] text-muted-foreground/40 tracking-widest">{s.sub}</span>
                    {s.sig && (
                      <span className="font-mono text-[9px] text-muted-foreground/50 mt-0.5">{s.sig.detail}</span>
                    )}
                  </motion.div>
                ))}
              </div>

              {/* Narrative + Sectors */}
              <div className="grid md:grid-cols-2 gap-5 mb-8">
                <div className="border border-border p-5">
                  <p className="font-mono text-[9px] text-muted-foreground tracking-[0.18em] mb-3 uppercase">
                    Regime Narrative
                  </p>
                  <p className="font-mono text-xs text-foreground leading-relaxed">{regime.narrative}</p>
                </div>

                <div className="border border-border p-5">
                  <p className="font-mono text-[9px] text-muted-foreground tracking-[0.18em] mb-3 uppercase">
                    Sector Positioning
                  </p>
                  <div className="space-y-2.5">
                    {regime.sectors.map((sec) => (
                      <div key={sec.label} className="flex items-center justify-between gap-2">
                        <span className="font-mono text-[10px] text-muted-foreground">{sec.label}</span>
                        <span
                          className="font-mono text-[10px] font-semibold tracking-widest shrink-0"
                          style={{ color: sec.color }}
                        >
                          {sec.signal}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Yield curve snapshot */}
              {data.yields.length > 0 && (
                <div className="border border-border p-5 mb-8">
                  <p className="font-mono text-[9px] text-muted-foreground tracking-[0.18em] mb-4 uppercase">
                    Yield Curve Snapshot
                  </p>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-5">
                    {data.yields.map((y) => (
                      <div key={y.label}>
                        <span className="font-mono text-[9px] text-muted-foreground/50 block tracking-widest">
                          {y.label} TREASURY
                        </span>
                        <span className="font-mono text-lg font-semibold text-foreground">
                          {y.value != null ? `${y.value.toFixed(2)}%` : '—'}
                        </span>
                        {y.change != null && (
                          <span
                            className={`font-mono text-[9px] block ${
                              y.change >= 0 ? 'text-terminal-red' : 'text-terminal-green'
                            }`}
                          >
                            {y.change >= 0 ? '+' : ''}{y.change.toFixed(3)}% today
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                  {data.headline && (
                    <p className="font-mono text-[10px] text-muted-foreground/50 mt-4 pt-3 border-t border-border">
                      {data.headline}
                    </p>
                  )}
                </div>
              )}

              {/* Methodology note */}
              <p className="font-mono text-[9px] text-muted-foreground/30 text-center tracking-widest leading-relaxed">
                SIGNALS: YIELD CURVE (^TNX − ^IRX) · EQUITY MOMENTUM (SPY 12M RETURN) · VOLATILITY (^VIX)
                {' · '}CREDIT (HYG − LQD 6M EXCESS RETURN) · REGIME SCORE = SUM OF FOUR SIGNALS (−8 TO +8)
                <br />
                NOT INVESTMENT ADVICE · FOR INFORMATIONAL PURPOSES ONLY
              </p>
            </motion.div>
          )}
        </div>
      </main>
    </div>
  );
}
