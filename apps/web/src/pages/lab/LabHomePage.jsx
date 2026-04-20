import React, { useState } from 'react';
import { Helmet } from 'react-helmet';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { TrendingUp, BarChart2, Activity, Waves, BookOpen, GitBranch, FileText, HelpCircle, Cpu, PieChart, FlaskConical, Zap, LineChart, Calculator, Briefcase, ShieldAlert, Radio, BookMarked, Layers, Network, CandlestickChart, Building2, BrainCircuit, Gauge, Bot, Globe2 } from 'lucide-react';
import SectionHeader from '@/components/SectionHeader.jsx';

const DEPTH_STYLES = {
  ADV: 'text-primary border-primary/60 bg-primary/5',
  INT: 'text-muted-foreground border-border',
  BAS: 'text-muted-foreground/50 border-border/50',
  REF: 'text-muted-foreground/50 border-border/50',
};

const FILTER_CATEGORIES = [
  'ALL',
  'DERIVATIVES & VOL',
  'RISK & PORTFOLIO',
  'ALPHA / RESEARCH',
  'STATISTICAL RIGOR',
  'FOUNDATIONS',
  'AI & SYSTEMS',
];

const allTools = [
  {
    num: 'V', path: '/lab/iv-surface', icon: LineChart, depth: 'ADV',
    label: 'IV SURFACE',
    desc: 'Implied Volatility Surface for any optionable ticker. Vol smile per expiry, ATM term structure, and skew metrics across the entire options chain.',
    tags: ['OPTIONS', 'VOLATILITY', 'DERIVATIVES'],
    category: 'DERIVATIVES & VOL',
  },
  {
    num: 'A', path: '/lab/options-analytics', icon: CandlestickChart, depth: 'ADV',
    label: 'OPTIONS ANALYTICS',
    desc: 'SVI smile calibration on live options chain with residual heatmap and variance swap replication. Full Greeks P&L attribution: delta, gamma, vega, theta, vanna, volga.',
    tags: ['SVI', 'GREEKS', 'VAR SWAP'],
    category: 'DERIVATIVES & VOL',
  },
  {
    num: '9', path: '/lab/sim', icon: Cpu, depth: 'INT',
    label: 'MONTE CARLO SIM',
    desc: 'Full GBM + Merton Jump-Diffusion simulator with option pricing vs closed-form Black-Scholes.',
    tags: ['OPTIONS', 'SIMULATION'],
    category: 'DERIVATIVES & VOL',
  },
  {
    num: '4', path: '/lab/stochastic', icon: Waves, depth: 'INT',
    label: 'STOCHASTIC LAB',
    desc: 'Simulate GBM, Ornstein-Uhlenbeck, CIR, and Heston processes. Compare SDEs side by side.',
    tags: ['STOCH CALC', 'SIMULATION'],
    category: 'DERIVATIVES & VOL',
  },
  {
    num: '3', path: '/lab/distributions', icon: Activity, depth: 'BAS',
    label: 'DISTRIBUTIONS',
    desc: 'Interactive PDF/CDF explorer for 8 probability distributions. Drag parameters, compare, view moments.',
    tags: ['PROBABILITY', 'STATISTICS'],
    category: 'DERIVATIVES & VOL',
  },
  {
    num: 'R', path: '/lab/risk', icon: ShieldAlert, depth: 'ADV',
    label: 'RISK & ATTRIBUTION',
    desc: 'Full risk decomposition: Sharpe, Sortino, max drawdown, Calmar. Fama-French 3-factor attribution separating alpha from market, size, and value exposure.',
    tags: ['RISK', 'FACTOR MODEL', 'ATTRIBUTION'],
    category: 'RISK & PORTFOLIO',
  },
  {
    num: 'F', path: '/lab/factors', icon: FlaskConical, depth: 'ADV',
    label: 'FACTOR EXPOSURE',
    desc: 'Fama-French 3-factor OLS regression on any portfolio. Shows α, β loadings, t-stats, R², and cumulative return vs FF3-fitted.',
    tags: ['FACTOR MODEL', 'REGRESSION'],
    category: 'RISK & PORTFOLIO',
  },
  {
    num: 'O', path: '/lab/optimizer', icon: PieChart, depth: 'INT',
    label: 'PORTFOLIO OPTIMIZER',
    desc: 'Mean-variance optimization via Monte Carlo. Input any tickers — plots efficient frontier, tangency portfolio weights and Sharpe ratio.',
    tags: ['PORTFOLIO', 'OPTIMIZATION'],
    category: 'RISK & PORTFOLIO',
  },
  {
    num: '2', path: '/lab/var', icon: BarChart2, depth: 'INT',
    label: 'VAR CALCULATOR',
    desc: 'Compute Value-at-Risk via historical simulation, parametric (variance-covariance), and Monte Carlo — side by side.',
    tags: ['RISK', 'PORTFOLIO'],
    category: 'RISK & PORTFOLIO',
  },
  {
    num: '★', path: '/lab/strategy', icon: BookMarked, depth: 'ADV',
    label: 'STRATEGY RESEARCH',
    desc: 'Cross-asset momentum memo: SPY / GLD / TLT. Adjustable lookback & skip. Shows the 12-1 vs 12-0 reversal effect with live data.',
    tags: ['MOMENTUM', 'RESEARCH MEMO', 'LIVE DATA'],
    category: 'ALPHA / RESEARCH',
  },
  {
    num: '◉', path: '/lab/live-signal', icon: Radio, depth: 'INT',
    label: 'LIVE SIGNAL',
    desc: 'SPY time-series momentum signal tracked in real time. Current state LONG / FLAT, equity curve vs buy-and-hold, Sharpe & drawdown.',
    tags: ['LIVE', 'MOMENTUM', 'TRACKING'],
    category: 'ALPHA / RESEARCH',
  },
  {
    num: 'I', path: '/lab/ic-vault', icon: Briefcase, depth: 'ADV',
    label: 'IC VAULT',
    desc: 'Investment Committee memos for 5 financial infrastructure stocks. Thesis, live DCF with adjustable assumptions, and bear case for each name.',
    tags: ['IC MEMO', 'EQUITY', 'DCF'],
    category: 'ALPHA / RESEARCH',
  },
  {
    num: 'P', path: '/lab/pead', icon: Zap, depth: 'ADV',
    label: 'PEAD EVENT STUDY',
    desc: 'Post-Earnings Announcement Drift. Market-model adjusted cumulative abnormal returns from −20 to +60 days around any earnings date.',
    tags: ['EVENT STUDY', 'ALPHA'],
    category: 'ALPHA / RESEARCH',
  },
  {
    num: 'M', path: '/lab/dcf', icon: Calculator, depth: 'INT',
    label: 'DCF MODELER',
    desc: 'Automated 3-statement model + 5-year DCF for any ticker. Pulls live fundamentals, lets you tweak WACC, growth, and margins to see implied price in real time.',
    tags: ['VALUATION', 'IB', 'DCF'],
    category: 'ALPHA / RESEARCH',
  },
  {
    num: '6', path: '/lab/regimes', icon: GitBranch, depth: 'INT',
    label: 'REGIME DETECTION',
    desc: 'Fit a 2-state Hidden Markov Model to return series using Baum-Welch EM. Identify bull/bear regimes.',
    tags: ['ML', 'TIME SERIES'],
    category: 'ALPHA / RESEARCH',
  },
  {
    num: '§', path: '/lab/backtest-stats', icon: Layers, depth: 'ADV',
    label: 'BACKTEST STATISTICS',
    desc: 'Deflated Sharpe Ratio + PSR calculator. P-hacking Monte Carlo demo. Cointegration lab with ADF test and half-life for pairs trading.',
    tags: ['DEFLATED SR', 'PBO', 'COINTEGRATION'],
    category: 'STATISTICAL RIGOR',
  },
  {
    num: 'M', path: '/lab/ml-finance', icon: BrainCircuit, depth: 'ADV',
    label: 'ML FOR FINANCE',
    desc: 'Purged K-fold CV to eliminate look-ahead leakage. Triple-barrier labeling with vol-scaled barriers. Meta-labeling: separate direction from bet-sizing.',
    tags: ['PURGED CV', 'TRIPLE BARRIER', 'META-LABEL'],
    category: 'STATISTICAL RIGOR',
  },
  {
    num: 'C', path: '/lab/latency', icon: Gauge, depth: 'ADV',
    label: 'LATENCY BENCHMARKS',
    desc: 'Black-Scholes pricing speed: Python → NumPy → Numba JIT → C++ scalar → AVX-512 SIMD. 5,000× range. Latency distributions, p99 analysis, annotated code.',
    tags: ['C++', 'AVX-512', 'NUMBA', 'HPC'],
    category: 'STATISTICAL RIGOR',
  },
  {
    num: '⌬', path: '/lab/microstructure', icon: Network, depth: 'ADV',
    label: 'MICROSTRUCTURE LAB',
    desc: 'Queue position & fill simulator. TCA: VWAP vs TWAP vs IS. Kyle\'s lambda estimation via OLS. Hawkes process order clustering.',
    tags: ['TCA', 'KYLE λ', 'HAWKES', 'LOB'],
    category: 'STATISTICAL RIGOR',
  },
  {
    num: 'B', path: '/lab/fixed-income-adv', icon: Building2, depth: 'ADV',
    label: 'FIXED INCOME ADV',
    desc: 'Swap curve bootstrapping (deposits + swaps → zero/fwd curve + DV01). Key rate duration attribution. Callable bond OAS via Ho-Lee binomial tree.',
    tags: ['SWAP CURVE', 'KRD', 'OAS'],
    category: 'FOUNDATIONS',
  },
  {
    num: '1', path: '/lab/yield-curve', icon: TrendingUp, depth: 'INT',
    label: 'YIELD CURVE',
    desc: 'Fit Nelson-Siegel, cubic spline, and linear interpolation to US Treasury yields. Explore term structure dynamics.',
    tags: ['FIXED INCOME', 'RATES'],
    category: 'FOUNDATIONS',
  },
  {
    num: '5', path: '/lab/order-book', icon: BookOpen, depth: 'INT',
    label: 'ORDER BOOK',
    desc: 'Live simulated limit order book. Submit market orders, observe price impact and depth dynamics.',
    tags: ['MICROSTRUCTURE', 'TRADING'],
    category: 'FOUNDATIONS',
  },
  {
    num: '7', path: '/lab/notes', icon: FileText, depth: 'REF',
    label: 'NOTES',
    desc: 'Technical write-ups on quant topics. Toggle between executive summary and mathematical detail.',
    tags: ['RESEARCH', 'THEORY'],
    category: 'FOUNDATIONS',
  },
  {
    num: '8', path: '/lab/quiz', icon: HelpCircle, depth: 'REF',
    label: 'QUIZ',
    desc: '150 questions across Probability, Options, Statistics, Fixed Income, and IB/Accounting. Three difficulty levels.',
    tags: ['INTERVIEW PREP', '150 Q'],
    category: 'FOUNDATIONS',
  },
  {
    num: 'MR', path: '/regime', icon: Globe2, depth: 'ADV',
    label: 'MACRO REGIME HUD',
    desc: 'Live macro dashboard — yield curve, futures, VIX regime, and pre-market movers. Full-screen Bloomberg-style layout with morning note generation.',
    tags: ['MACRO', 'LIVE DATA', 'REGIME'],
    category: 'AI & SYSTEMS',
  },
];

const containerVariants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.04 } },
};
const itemVariants = {
  hidden:  { opacity: 0, y: 12 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.3 } },
};

function ToolCard({ tool }) {
  const Icon = tool.icon;
  return (
    <motion.div variants={itemVariants} className="h-full">
      <Link
        to={tool.path}
        className="block border border-border hover:border-primary bg-background hover:bg-muted/30 transition-all duration-200 p-5 group h-full"
      >
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-2">
            <span className="font-mono text-[9px] text-muted-foreground opacity-60">[{tool.num}]</span>
            <Icon className="h-4 w-4 text-primary" />
          </div>
          <div className="flex items-center gap-1.5">
            <span className={`font-mono text-[8px] tracking-widest border px-1.5 py-0.5 ${DEPTH_STYLES[tool.depth]}`}>
              {tool.depth}
            </span>
            <span className="font-mono text-[9px] text-muted-foreground border border-border px-1.5 py-0.5 group-hover:border-primary transition-colors">
              ENTER →
            </span>
          </div>
        </div>
        <h2 className="font-mono text-sm font-bold tracking-widest text-foreground mb-2 group-hover:text-primary transition-colors">
          {tool.label}
        </h2>
        <p className="font-mono text-[10px] text-muted-foreground leading-relaxed mb-3">
          {tool.desc}
        </p>
        <div className="flex flex-wrap gap-1.5">
          {tool.tags.map(t => (
            <span key={t} className="font-mono text-[8px] tracking-widest text-primary/70 border border-primary/30 px-1.5 py-0.5">
              {t}
            </span>
          ))}
        </div>
      </Link>
    </motion.div>
  );
}

export default function LabHomePage() {
  const [selectedCategory, setSelectedCategory] = useState('ALL');

  const filtered = selectedCategory === 'ALL'
    ? allTools
    : allTools.filter(t => t.category === selectedCategory);

  return (
    <>
      <Helmet>
        <title>Quant Lab — Dmitri De Freitas</title>
        <meta name="description"        content="25 interactive tools by Dmitri De Freitas — IV surface, SVI calibration, PEAD event study, DCF modeler, risk attribution, Fama-French factors, Monte Carlo, microstructure lab, and more." />
        <link rel="canonical"           href="https://findmitridefreitas.com/lab" />
        <meta property="og:url"         content="https://findmitridefreitas.com/lab" />
        <meta property="og:title"       content="Quant Lab — Dmitri De Freitas" />
        <meta property="og:description" content="25 interactive tools built from scratch: derivatives pricing, volatility surfaces, factor models, microstructure simulation, backtest statistics, and more." />
        <meta property="og:type"   content="website" />
        <meta property="og:locale" content="en_US" />
        <meta property="og:image"  content="https://findmitridefreitas.com/IMG_1948.jpeg" />
        <meta property="og:image:width"  content="800" />
        <meta property="og:image:height" content="800" />
        <meta name="twitter:card"        content="summary" />
        <meta name="twitter:image"       content="https://findmitridefreitas.com/IMG_1948.jpeg" />
        <script type="application/ld+json">{`{
  "@context": "https://schema.org",
  "@type": "WebApplication",
  "name": "Quant Lab — Dmitri De Freitas",
  "url": "https://findmitridefreitas.com/lab",
  "description": "25 interactive quantitative finance tools built from scratch in the browser",
  "applicationCategory": "FinanceApplication",
  "author": {"@type":"Person","name":"Dmitri De Freitas"},
  "offers": {"@type":"Offer","price":"0","priceCurrency":"USD"}
}`}</script>
      </Helmet>

      <div className="min-h-screen pt-12 md:pt-14 pb-16">
        {/* Hero Section */}
        <section className="py-10 border-b border-border">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8">
            <SectionHeader number="LAB" title="RESEARCH LABORATORY" />
            <p className="text-sm text-muted-foreground max-w-2xl font-mono">
              {filtered.length} tools — interactive financial mathematics built from scratch.
              No libraries, no shortcuts. Each instrument implements the underlying math directly in the browser.
            </p>
          </div>
        </section>

        {/* Filter Tabs */}
        <section className="py-0 sticky top-12 md:top-14 bg-background/95 backdrop-blur-sm z-40 border-b border-border">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex flex-wrap divide-x divide-border border-x border-border w-fit">
              {FILTER_CATEGORIES.map((cat) => (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={`font-mono text-[11px] uppercase tracking-widest px-4 h-9 transition-colors ${
                    selectedCategory === cat
                      ? 'bg-primary text-primary-foreground'
                      : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>
        </section>

        {/* Tools Grid */}
        <section className="py-16">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8">
            <motion.div
              key={selectedCategory}
              className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 items-stretch"
              variants={containerVariants}
              initial="hidden"
              animate="visible"
            >
              {filtered.map(tool => (
                <ToolCard key={tool.path} tool={tool} />
              ))}
            </motion.div>
          </div>
        </section>

        {/* Footer note */}
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 border-t border-border pt-6">
          <p className="font-mono text-[9px] text-muted-foreground tracking-wider">
            ALL COMPUTATIONS CLIENT-SIDE · NO EXTERNAL MATH LIBRARIES · BUILT FOR DMITRI DE FREITAS PORTFOLIO
          </p>
        </div>
      </div>
    </>
  );
}
