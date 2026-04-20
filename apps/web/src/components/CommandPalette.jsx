import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';

// ── Full page catalog ─────────────────────────────────────────────────────────
const PAGES = [
  // DERIVATIVES & VOL
  { key: 'v', num: 'V', path: '/lab/iv-surface',        label: 'IV SURFACE',           cat: 'DERIVATIVES',   depth: 'ADV', desc: 'Implied vol surface, smile per expiry, ATM term structure, skew metrics' },
  { key: 'a', num: 'A', path: '/lab/options-analytics', label: 'OPTIONS ANALYTICS',    cat: 'DERIVATIVES',   depth: 'ADV', desc: 'SVI calibration, variance swap, Greeks P&L attribution, parity scanner' },
  { key: '9', num: '9', path: '/lab/sim',               label: 'MONTE CARLO SIM',      cat: 'DERIVATIVES',   depth: 'INT', desc: 'GBM + Merton jump-diffusion, option pricing vs Black-Scholes' },
  { key: '4', num: '4', path: '/lab/stochastic',        label: 'STOCHASTIC LAB',       cat: 'DERIVATIVES',   depth: 'INT', desc: 'GBM, Ornstein-Uhlenbeck, CIR, Heston SDE simulator' },
  { key: '3', num: '3', path: '/lab/distributions',     label: 'DISTRIBUTIONS',        cat: 'DERIVATIVES',   depth: 'BAS', desc: 'Interactive PDF/CDF explorer for 8 probability distributions' },
  // RISK & PORTFOLIO
  { key: 'r', num: 'R', path: '/lab/risk',              label: 'RISK & ATTRIBUTION',   cat: 'RISK',          depth: 'ADV', desc: 'Sharpe, Sortino, drawdown, Fama-French 3-factor attribution' },
  { key: 'f', num: 'F', path: '/lab/factors',           label: 'FACTOR EXPOSURE',      cat: 'RISK',          depth: 'ADV', desc: 'FF3 OLS regression, α/β loadings, t-stats, R², cumulative returns' },
  { key: 'o', num: 'O', path: '/lab/optimizer',         label: 'PORTFOLIO OPTIMIZER',  cat: 'RISK',          depth: 'INT', desc: 'Mean-variance optimization, efficient frontier, tangency portfolio' },
  { key: '2', num: '2', path: '/lab/var',               label: 'VAR CALCULATOR',       cat: 'RISK',          depth: 'INT', desc: 'Historical, parametric, and Monte Carlo VaR side by side' },
  // ALPHA / RESEARCH
  { key: 's', num: '★', path: '/lab/strategy',          label: 'STRATEGY RESEARCH',    cat: 'RESEARCH',      depth: 'ADV', desc: 'Cross-asset momentum memo, 12-1 reversal effect, live SPY/GLD/TLT' },
  { key: 'l', num: '◉', path: '/lab/live-signal',       label: 'LIVE SIGNAL',          cat: 'RESEARCH',      depth: 'INT', desc: 'SPY momentum signal, LONG/FLAT state, equity curve vs buy-and-hold' },
  { key: 'i', num: 'I', path: '/lab/ic-vault',          label: 'IC VAULT',             cat: 'RESEARCH',      depth: 'ADV', desc: 'IC memos: thesis, live DCF, bear case for 5 fintech/infrastructure names' },
  { key: 'p', num: 'P', path: '/lab/pead',              label: 'PEAD EVENT STUDY',     cat: 'RESEARCH',      depth: 'ADV', desc: 'Post-earnings drift, market-adjusted CAR −20 to +60 days' },
  { key: 'm', num: 'D', path: '/lab/dcf',               label: 'DCF MODELER',          cat: 'RESEARCH',      depth: 'INT', desc: 'Live 3-statement DCF for any ticker, adjustable WACC/growth/margins' },
  { key: '6', num: '6', path: '/lab/regimes',           label: 'REGIME DETECTION',     cat: 'RESEARCH',      depth: 'INT', desc: 'HMM Baum-Welch EM bull/bear regimes + CUSUM structural breaks' },
  // STATISTICAL RIGOR
  { key: 'x', num: '§', path: '/lab/backtest-stats',    label: 'BACKTEST STATISTICS',  cat: 'ML & STATS',    depth: 'ADV', desc: 'Deflated Sharpe, PSR, p-hacking Monte Carlo, cointegration / ADF' },
  { key: 'n', num: 'M', path: '/lab/ml-finance',        label: 'ML FOR FINANCE',       cat: 'ML & STATS',    depth: 'ADV', desc: 'Purged K-fold CV, triple-barrier labeling, meta-labeling (López de Prado)' },
  { key: 'c', num: 'C', path: '/lab/latency',           label: 'LATENCY BENCHMARKS',   cat: 'ML & STATS',    depth: 'ADV', desc: 'Python → NumPy → Numba → C++ → AVX-512, 5000× range, p99 distributions' },
  { key: 'z', num: '⌬', path: '/lab/microstructure',    label: 'MICROSTRUCTURE LAB',   cat: 'ML & STATS',    depth: 'ADV', desc: 'TCA, VWAP/TWAP/IS, Kyle λ, Hawkes process order clustering' },
  // FIXED INCOME / FOUNDATIONS
  { key: 'b', num: 'B', path: '/lab/fixed-income-adv',  label: 'FIXED INCOME ADV',     cat: 'FIXED INCOME',  depth: 'ADV', desc: 'Swap curve bootstrap, key rate duration, callable bond OAS via Ho-Lee' },
  { key: '1', num: '1', path: '/lab/yield-curve',       label: 'YIELD CURVE',          cat: 'FIXED INCOME',  depth: 'INT', desc: 'Nelson-Siegel, cubic spline, linear interpolation on Treasury yields' },
  // TOOLS / REFERENCE
  { key: '5', num: '5', path: '/lab/order-book',        label: 'ORDER BOOK',           cat: 'TOOLS',         depth: 'INT', desc: 'Simulated limit order book, market orders, price impact, depth' },
  { key: '7', num: '7', path: '/lab/notes',             label: 'NOTES',                cat: 'TOOLS',         depth: 'REF', desc: 'Quant reference — formulas, derivations, interview flashcards' },
  { key: '8', num: '8', path: '/lab/quiz',              label: 'QUIZ',                 cat: 'TOOLS',         depth: 'BAS', desc: 'Finance & quant interview quiz — timed, scored' },
  // AI & SYSTEMS
  { key: '',  num: 'MR', path: '/regime',               label: 'MACRO REGIME HUD',     cat: 'AI',            depth: 'ADV', desc: 'Live macro dashboard — yield curve, futures, VIX, morning note' },
  // TOOLS / REFERENCE (site-level)
  { key: '', num: 'R',   path: '/research',             label: 'RESEARCH BLOG',        cat: 'TOOLS',         depth: 'REF', desc: 'SEO research writeups: Deflated Sharpe, SVI calibration, HMM regime detection' },
  { key: '', num: 'CW',  path: '/coursework',           label: 'COURSEWORK',           cat: 'TOOLS',         depth: 'REF', desc: '22 WashU + 17 Drew courses — full transcript' },
  { key: '', num: 'REC', path: '/recruiter',            label: 'RECRUITER VIEW',       cat: 'TOOLS',         depth: 'REF', desc: 'Curated one-page view for recruiters — top tools, resume, OPT status, contact' },
];

const CAT_COLOR = {
  'DERIVATIVES':  '#6366f1',
  'RISK':         '#ef4444',
  'RESEARCH':     '#f59e0b',
  'ML & STATS':   '#22c55e',
  'FIXED INCOME': '#3b82f6',
  'TOOLS':        '#94a3b8',
  'AI':           '#a855f7',
};

const DEPTH_COLOR = {
  ADV: 'text-primary',
  INT: 'text-muted-foreground',
  BAS: 'text-muted-foreground/50',
  REF: 'text-muted-foreground/50',
};

// ── Fuzzy match — returns highlighted spans ───────────────────────────────────
function fuzzyScore(query, text) {
  if (!query) return { match: true, score: 0, indices: [] };
  const q = query.toLowerCase();
  const t = text.toLowerCase();
  // exact substring → highest score
  const idx = t.indexOf(q);
  if (idx !== -1) {
    return { match: true, score: 100 - idx, indices: Array.from({ length: q.length }, (_, i) => idx + i) };
  }
  // fuzzy sequential
  let qi = 0, indices = [];
  for (let ti = 0; ti < t.length && qi < q.length; ti++) {
    if (t[ti] === q[qi]) { indices.push(ti); qi++; }
  }
  if (qi < q.length) return { match: false, score: -1, indices: [] };
  return { match: true, score: 50 - indices[indices.length - 1], indices };
}

function Highlighted({ text, indices }) {
  if (!indices?.length) return <span>{text}</span>;
  const set = new Set(indices);
  return (
    <span>
      {text.split('').map((ch, i) =>
        set.has(i)
          ? <span key={i} className="text-primary font-bold">{ch}</span>
          : <span key={i}>{ch}</span>
      )}
    </span>
  );
}

// ── Component ─────────────────────────────────────────────────────────────────
export default function CommandPalette({ open, onClose }) {
  const [query, setQuery]   = useState('');
  const [cursor, setCursor] = useState(0);
  const navigate = useNavigate();
  const inputRef = useRef(null);
  const listRef  = useRef(null);

  // Filter + rank
  const results = useMemo(() => {
    if (!query.trim()) return PAGES.map(p => ({ ...p, indices: [], labelIndices: [] }));
    const q = query.trim();
    return PAGES
      .map(p => {
        const labelMatch = fuzzyScore(q, p.label);
        const catMatch   = fuzzyScore(q, p.cat);
        const descMatch  = fuzzyScore(q, p.desc);
        const score = Math.max(labelMatch.score * 3, catMatch.score * 2, descMatch.score);
        return { ...p, match: labelMatch.match || catMatch.match || descMatch.match, score, labelIndices: labelMatch.indices };
      })
      .filter(p => p.match)
      .sort((a, b) => b.score - a.score);
  }, [query]);

  // Reset cursor when results change
  useEffect(() => { setCursor(0); }, [results.length, query]);

  // Focus input when opened
  useEffect(() => {
    if (open) { setQuery(''); setCursor(0); setTimeout(() => inputRef.current?.focus(), 30); }
  }, [open]);

  // Scroll active item into view
  useEffect(() => {
    const el = listRef.current?.querySelector(`[data-idx="${cursor}"]`);
    el?.scrollIntoView({ block: 'nearest' });
  }, [cursor]);

  const go = useCallback((path) => {
    navigate(path);
    onClose();
  }, [navigate, onClose]);

  const handleKey = useCallback((e) => {
    if (e.key === 'ArrowDown') { e.preventDefault(); setCursor(c => Math.min(c + 1, results.length - 1)); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setCursor(c => Math.max(c - 1, 0)); }
    else if (e.key === 'Enter' && results[cursor]) { go(results[cursor].path); }
    else if (e.key === 'Escape') { onClose(); }
  }, [results, cursor, go, onClose]);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          transition={{ duration: 0.12 }}
          className="fixed inset-0 z-[200] flex items-start justify-center pt-[10vh] px-4"
          onClick={onClose}
        >
          {/* Backdrop */}
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />

          {/* Panel */}
          <motion.div
            initial={{ opacity: 0, y: -12, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.98 }}
            transition={{ duration: 0.15 }}
            onClick={e => e.stopPropagation()}
            className="relative w-full max-w-2xl bg-background border border-border shadow-2xl flex flex-col"
            style={{ maxHeight: '70vh' }}
          >
            {/* Search input */}
            <div className="flex items-center gap-3 border-b border-border px-4 py-3 shrink-0">
              <span className="font-mono text-[10px] text-muted-foreground/40 tracking-widest shrink-0">⌘K</span>
              <input
                ref={inputRef}
                value={query}
                onChange={e => setQuery(e.target.value)}
                onKeyDown={handleKey}
                placeholder="Search lab pages..."
                className="flex-1 bg-transparent font-mono text-sm text-foreground placeholder:text-muted-foreground/30 focus:outline-none"
              />
              {query && (
                <button onClick={() => setQuery('')}
                  className="font-mono text-[8px] text-muted-foreground/30 hover:text-muted-foreground tracking-widest shrink-0">
                  CLEAR
                </button>
              )}
              <span className="font-mono text-[8px] text-muted-foreground/20 tracking-widest shrink-0">
                {results.length} PAGE{results.length !== 1 ? 'S' : ''}
              </span>
            </div>

            {/* Results */}
            <div ref={listRef} className="overflow-y-auto flex-1">
              {results.length === 0 ? (
                <div className="px-4 py-8 text-center font-mono text-[10px] text-muted-foreground/30">
                  NO RESULTS FOR "{query}"
                </div>
              ) : (
                <div>
                  {results.map((page, i) => {
                    const catColor = CAT_COLOR[page.cat] || '#94a3b8';
                    const isActive = i === cursor;
                    return (
                      <div
                        key={page.path}
                        data-idx={i}
                        onClick={() => go(page.path)}
                        onMouseEnter={() => setCursor(i)}
                        className={`flex items-center gap-3 px-4 py-2.5 cursor-pointer border-b border-border/20 transition-colors ${
                          isActive ? 'bg-primary/8' : 'hover:bg-white/[0.02]'
                        }`}
                      >
                        {/* Num badge */}
                        <span className="font-mono text-[9px] text-muted-foreground/30 w-5 shrink-0 text-center">
                          {page.num}
                        </span>

                        {/* Label + desc */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className={`font-mono text-[11px] font-bold ${isActive ? 'text-primary' : 'text-foreground'}`}>
                              <Highlighted text={page.label} indices={page.labelIndices} />
                            </span>
                            <span className={`font-mono text-[7px] tracking-widest ${DEPTH_COLOR[page.depth]}`}>
                              {page.depth}
                            </span>
                          </div>
                          <p className="font-mono text-[9px] text-muted-foreground/40 truncate leading-relaxed">
                            {page.desc}
                          </p>
                        </div>

                        {/* Category */}
                        <span
                          className="font-mono text-[7px] tracking-widest px-1.5 py-0.5 border shrink-0"
                          style={{ color: catColor, borderColor: catColor + '50', background: catColor + '10' }}
                        >
                          {page.cat}
                        </span>

                        {/* Keyboard shortcut + arrow */}
                        <div className="flex items-center gap-1.5 shrink-0">
                          {page.key && (
                            <kbd className={`font-mono text-[7px] border px-1 py-0.5 tracking-widest transition-colors ${
                              isActive ? 'border-primary/50 text-primary/60' : 'border-border/40 text-muted-foreground/25'
                            }`}>
                              {page.key}
                            </kbd>
                          )}
                          {isActive && (
                            <span className="font-mono text-[9px] text-primary">→</span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="border-t border-border/40 px-4 py-2 flex items-center gap-4 shrink-0">
              {[['↑↓', 'navigate'], ['↵', 'open'], ['ESC', 'close']].map(([k, v]) => (
                <div key={k} className="flex items-center gap-1.5">
                  <kbd className="font-mono text-[7px] border border-border/50 px-1.5 py-0.5 text-muted-foreground/40">{k}</kbd>
                  <span className="font-mono text-[7px] text-muted-foreground/25">{v}</span>
                </div>
              ))}
              <span className="ml-auto font-mono text-[7px] text-muted-foreground/20 tracking-widest">DDF·LAB</span>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
