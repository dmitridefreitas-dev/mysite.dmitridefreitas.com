import React from 'react';
import { Helmet } from 'react-helmet';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Cpu, Activity, LineChart, Layers, ArrowRight } from 'lucide-react';
import SectionHeader from '@/components/SectionHeader.jsx';

// ── The lab, pruned ──────────────────────────────────────────────────────────
// Four flagship instruments carry the depth — correctness proofs, latency
// distributions, published companion papers. Everything else lives in a
// compact index. Restraint is the point: what gets promoted is what can be
// defended line by line.

const flagships = [
  {
    path: '/lab/iv-surface', icon: LineChart,
    kicker: 'CORRECTNESS PROOF · DERIVATIVES',
    label: 'IV SURFACE — WITH A PUBLISHED-RESULT PROOF',
    desc: 'Live 3D implied-volatility surface for any optionable ticker — plus a correctness proof that reproduces Gatheral–Jacquier (2014) in your browser: all five printed jump-wings values to seven significant figures, the Vogt butterfly arbitrage detected by g(k), and the paper\'s repaired smile re-derived live with Nelder-Mead.',
    receipts: 'RECEIPTS: computed-vs-printed tables (|Δ| ≈ 1e-8) · live Example 5.1 re-run · same checks in CI as a Python library',
    tags: ['SVI', 'NO-ARBITRAGE', 'GATHERAL–JACQUIER'],
  },
  {
    path: '/lab/wasm-engine', icon: Cpu,
    kicker: 'TAIL LATENCY · SYSTEMS',
    label: 'C++ MATCHING ENGINE — IN YOUR BROWSER',
    desc: 'The C++20 FastBook engine compiled to WebAssembly: submit orders against it, race it against a JavaScript baseline. Native receipts on-page: p50 30ns / p99 330ns / p99.9 510ns per op on a replayed AMZN market-data day, 2.1× the std::map oracle it is differentially fuzzed against — with the v1→v2 bottleneck history, not just the final number.',
    receipts: 'RECEIPTS: full percentile ladders · occupancy-bitmap + IdMap fix documented · fuzzed 25 seeds × 20k ops under ASan/UBSan',
    tags: ['C++20', 'WASM', 'P99.9'],
  },
  {
    path: '/lab/order-flow', icon: Activity,
    kicker: 'LIVE EXCHANGE DATA · MICROSTRUCTURE',
    label: 'LIVE ORDER FLOW — SYNCHRONIZED L2 DEPTH',
    desc: 'Real Binance L2 depth in the browser, synchronized with the exchange\'s documented snapshot+diff algorithm — buffer during snapshot flight, stale-diff drop, first-event straddle rule, sequence-gap teardown and resync — rendered with Cont–Kukanov–Stoikov order-flow imbalance at animation-frame rate.',
    receipts: 'RECEIPTS: sync state machine unit-tested without a network · 20,000-op differential book test · automatic geo-block failover',
    tags: ['WEBSOCKETS', 'L2 SYNC', 'OFI'],
  },
  {
    path: '/lab/backtest-stats', icon: Layers,
    kicker: 'WORKING PAPER COMPANION · INFERENCE',
    label: 'BACKTEST STATISTICS — DEFLATED SHARPE',
    desc: 'The multiple-testing problem in strategy selection, interactive: Probabilistic and Deflated Sharpe Ratio calculators, a p-hacking Monte Carlo you can run yourself, and a cointegration lab. Companion tool to the typeset DSR working paper — the argument in prose, the same math live here.',
    receipts: 'RECEIPTS: typeset working paper (PDF) · same statistics published as a CI-tested Python library (backtest-statistics)',
    tags: ['DSR / PSR', 'MULTIPLE TESTING', 'PAPER + TOOL'],
  },
];

// ── Everything else: one line each, grouped ──────────────────────────────────

const indexGroups = [
  {
    title: 'DERIVATIVES & VOLATILITY',
    tools: [
      { num: 'A', path: '/lab/options-analytics', label: 'OPTIONS ANALYTICS', desc: 'SVI calibration on live chains · Greeks P&L attribution · variance swaps' },
      { num: '9', path: '/lab/sim', label: 'MONTE CARLO SIM', desc: 'GBM + Merton jump-diffusion vs closed-form Black-Scholes' },
      { num: '4', path: '/lab/stochastic', label: 'STOCHASTIC LAB', desc: 'GBM, Ornstein-Uhlenbeck, CIR, Heston side by side' },
      { num: '3', path: '/lab/distributions', label: 'DISTRIBUTIONS', desc: 'PDF/CDF explorer for 8 distributions with draggable parameters' },
    ],
  },
  {
    title: 'RISK & PORTFOLIO',
    tools: [
      { num: 'R', path: '/lab/risk', label: 'RISK & ATTRIBUTION', desc: 'Sharpe/Sortino/Calmar · Fama-French 3-factor alpha separation' },
      { num: 'F', path: '/lab/factors', label: 'FACTOR EXPOSURE', desc: 'FF3 OLS on any portfolio: α, β, t-stats, R²' },
      { num: 'O', path: '/lab/optimizer', label: 'PORTFOLIO OPTIMIZER', desc: 'Efficient frontier + tangency portfolio via Monte Carlo' },
      { num: '2', path: '/lab/var', label: 'VAR CALCULATOR', desc: 'Historical, parametric, and Monte Carlo VaR side by side' },
    ],
  },
  {
    title: 'ALPHA / RESEARCH',
    tools: [
      { num: '★', path: '/lab/strategy', label: 'STRATEGY RESEARCH', desc: 'Cross-asset momentum memo with the 12-1 vs 12-0 reversal, live data' },
      { num: '◉', path: '/lab/live-signal', label: 'LIVE SIGNAL', desc: 'SPY momentum signal tracked in real time vs buy-and-hold' },
      { num: 'I', path: '/lab/ic-vault', label: 'IC VAULT', desc: 'IC memos for 5 names: thesis, live DCF, bear case' },
      { num: 'P', path: '/lab/pead', label: 'PEAD EVENT STUDY', desc: 'Abnormal returns −20 to +60 days around any earnings date · paper companion' },
      { num: 'M', path: '/lab/dcf', label: 'DCF MODELER', desc: '3-statement model + 5-year DCF on live fundamentals' },
      { num: '6', path: '/lab/regimes', label: 'REGIME DETECTION', desc: '2-state HMM via Baum-Welch on return series' },
    ],
  },
  {
    title: 'STATISTICAL RIGOR',
    tools: [
      { num: 'M', path: '/lab/ml-finance', label: 'ML FOR FINANCE', desc: 'Purged K-fold CV · triple-barrier labeling · meta-labeling' },
      { num: 'C', path: '/lab/latency', label: 'LATENCY BENCHMARKS', desc: 'Black-Scholes pricing: Python → NumPy → Numba → C++ → AVX-512' },
      { num: '⌬', path: '/lab/microstructure', label: 'MICROSTRUCTURE LAB', desc: 'Queue position · TCA · Kyle\'s λ · Hawkes clustering' },
    ],
  },
  {
    title: 'FOUNDATIONS & REFERENCE',
    tools: [
      { num: 'B', path: '/lab/fixed-income-adv', label: 'FIXED INCOME ADV', desc: 'Swap curve bootstrap · key-rate duration · callable OAS' },
      { num: '1', path: '/lab/yield-curve', label: 'YIELD CURVE', desc: 'Nelson-Siegel and spline fits to US Treasuries' },
      { num: '5', path: '/lab/order-book', label: 'ORDER BOOK', desc: 'Simulated LOB: submit orders, watch price impact' },
      { num: '7', path: '/lab/notes', label: 'NOTES', desc: 'Technical write-ups with summary/detail toggle' },
      { num: '8', path: '/lab/quiz', label: 'QUIZ', desc: '150 interview questions across 5 topics' },
    ],
  },
  {
    title: 'LIVE DASHBOARDS',
    tools: [
      { num: 'MR', path: '/regime', label: 'MACRO REGIME HUD', desc: 'Full-screen macro dashboard: curve, futures, VIX regime, movers' },
    ],
  },
];

const containerVariants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.06 } },
};
const itemVariants = {
  hidden:  { opacity: 0, y: 12 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.3 } },
};

function FlagshipCard({ tool }) {
  const Icon = tool.icon;
  return (
    <motion.div variants={itemVariants} className="h-full">
      <Link
        to={tool.path}
        className="block border border-primary/40 hover:border-primary bg-background hover:bg-muted/20 transition-all duration-200 group h-full"
      >
        <div className="border-b border-primary/30 bg-primary/5 px-5 py-2 flex items-center justify-between">
          <span className="font-mono text-[9px] text-primary tracking-widest flex items-center gap-2">
            <Icon className="h-3.5 w-3.5" /> {tool.kicker}
          </span>
          <span className="font-mono text-[9px] text-muted-foreground border border-border px-1.5 py-0.5 group-hover:border-primary group-hover:text-primary transition-colors">
            ENTER →
          </span>
        </div>
        <div className="p-5">
          <h2 className="font-mono text-sm font-bold tracking-widest text-foreground mb-2 group-hover:text-primary transition-colors">
            {tool.label}
          </h2>
          <p className="font-mono text-[10px] text-muted-foreground leading-relaxed mb-3">
            {tool.desc}
          </p>
          <p className="font-mono text-[9px] text-primary/80 leading-relaxed mb-3">
            {tool.receipts}
          </p>
          <div className="flex flex-wrap gap-1.5">
            {tool.tags.map(t => (
              <span key={t} className="font-mono text-[8px] tracking-widest text-primary/70 border border-primary/30 px-1.5 py-0.5">
                {t}
              </span>
            ))}
          </div>
        </div>
      </Link>
    </motion.div>
  );
}

export default function LabHomePage() {
  return (
    <>
      <Helmet>
        <title>Quant Lab — Dmitri De Freitas</title>
        <meta name="description"        content="Quant lab by Dmitri De Freitas — four flagship instruments with correctness proofs and receipts (IV surface reproducing Gatheral–Jacquier, C++ matching engine with tail-latency distributions, live L2 order flow, deflated Sharpe statistics) plus a 23-tool index." />
        <link rel="canonical"           href="https://dmitridefreitas.com/lab" />
        <meta property="og:url"         content="https://dmitridefreitas.com/lab" />
        <meta property="og:title"       content="Quant Lab — Dmitri De Freitas" />
        <meta property="og:description" content="Four flagship quant instruments with correctness proofs and measured receipts, plus a 23-tool working index. Everything client-side, built from scratch." />
        <meta property="og:type"   content="website" />
        <meta property="og:locale" content="en_US" />
        <meta property="og:image"  content="https://dmitridefreitas.com/IMG_1948.jpeg" />
        <meta property="og:image:width"  content="800" />
        <meta property="og:image:height" content="800" />
        <meta name="twitter:card"        content="summary" />
        <meta name="twitter:image"       content="https://dmitridefreitas.com/IMG_1948.jpeg" />
        <script type="application/ld+json">{`{
  "@context": "https://schema.org",
  "@type": "WebApplication",
  "name": "Quant Lab — Dmitri De Freitas",
  "url": "https://dmitridefreitas.com/lab",
  "description": "27 interactive quantitative finance tools built from scratch in the browser — 4 flagships with correctness proofs and measured receipts",
  "applicationCategory": "FinanceApplication",
  "author": {"@type":"Person","name":"Dmitri De Freitas"},
  "offers": {"@type":"Offer","price":"0","priceCurrency":"USD"}
}`}</script>
      </Helmet>

      <div className="min-h-screen pt-12 md:pt-14 pb-16">
        {/* Hero */}
        <section className="py-10 border-b border-border">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8">
            <SectionHeader number="LAB" title="RESEARCH LABORATORY" />
            <p className="text-sm text-muted-foreground max-w-2xl font-mono">
              Four flagship instruments — each with a correctness proof against a published result,
              a measured latency distribution, or a typeset companion paper — plus a working index
              of 23 more. All math implemented from scratch, all of it running in your browser.
            </p>
          </div>
        </section>

        {/* Flagships */}
        <section className="py-12">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8">
            <p className="font-mono text-[10px] text-primary tracking-widest mb-5">FLAGSHIPS — DEPTH OVER BREADTH</p>
            <motion.div
              className="grid grid-cols-1 lg:grid-cols-2 gap-5 items-stretch"
              variants={containerVariants}
              initial="hidden"
              animate="visible"
            >
              {flagships.map(tool => (
                <FlagshipCard key={tool.path} tool={tool} />
              ))}
            </motion.div>
          </div>
        </section>

        {/* Index */}
        <section className="pb-14">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8">
            <p className="font-mono text-[10px] text-muted-foreground tracking-widest mb-4 pt-4 border-t border-border">
              THE INDEX — 23 MORE, ONE LINE EACH
            </p>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-x-10 gap-y-6">
              {indexGroups.map(group => (
                <div key={group.title}>
                  <p className="font-mono text-[9px] text-primary/70 tracking-widest mb-1.5">{group.title}</p>
                  <div className="divide-y divide-border/60 border-y border-border/60">
                    {group.tools.map(tool => (
                      <Link
                        key={tool.path}
                        to={tool.path}
                        className="flex items-baseline gap-2 py-1.5 group"
                      >
                        <span className="font-mono text-[9px] text-muted-foreground/50 w-5 shrink-0">[{tool.num}]</span>
                        <span className="font-mono text-[11px] text-foreground/90 group-hover:text-primary transition-colors tracking-wide shrink-0">
                          {tool.label}
                        </span>
                        <span className="font-mono text-[10px] text-muted-foreground/60 truncate hidden sm:inline">
                          — {tool.desc}
                        </span>
                        <ArrowRight className="h-3 w-3 text-muted-foreground/0 group-hover:text-primary transition-colors ml-auto shrink-0" />
                      </Link>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Footer note */}
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 border-t border-border pt-6">
          <p className="font-mono text-[9px] text-muted-foreground tracking-wider">
            ALL COMPUTATIONS CLIENT-SIDE · NO EXTERNAL MATH LIBRARIES · WHAT IS PROMOTED HERE CAN BE DEFENDED LINE BY LINE
          </p>
        </div>
      </div>
    </>
  );
}
