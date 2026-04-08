import React from 'react';
import { Helmet } from 'react-helmet';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { TrendingUp, BarChart2, Activity, Waves, BookOpen, GitBranch, FileText, HelpCircle, Cpu, PieChart, FlaskConical, Zap } from 'lucide-react';

const tools = [
  {
    num: '1', path: '/lab/yield-curve', icon: TrendingUp,
    label: 'YIELD CURVE',
    desc: 'Fit Nelson-Siegel, cubic spline, and linear interpolation to US Treasury yields. Explore term structure dynamics.',
    tags: ['FIXED INCOME', 'RATES'],
  },
  {
    num: '2', path: '/lab/var', icon: BarChart2,
    label: 'VAR CALCULATOR',
    desc: 'Compute Value-at-Risk via historical simulation, parametric (variance-covariance), and Monte Carlo — side by side.',
    tags: ['RISK', 'PORTFOLIO'],
  },
  {
    num: '3', path: '/lab/distributions', icon: Activity,
    label: 'DISTRIBUTIONS',
    desc: 'Interactive PDF/CDF explorer for 8 probability distributions. Drag parameters, compare, view moments.',
    tags: ['PROBABILITY', 'STATISTICS'],
  },
  {
    num: '4', path: '/lab/stochastic', icon: Waves,
    label: 'STOCHASTIC LAB',
    desc: 'Simulate GBM, Ornstein-Uhlenbeck, CIR, and Heston processes. Compare SDEs side by side.',
    tags: ['STOCH CALC', 'SIMULATION'],
  },
  {
    num: '5', path: '/lab/order-book', icon: BookOpen,
    label: 'ORDER BOOK',
    desc: 'Live simulated limit order book. Submit market orders, observe price impact and depth dynamics.',
    tags: ['MICROSTRUCTURE', 'TRADING'],
  },
  {
    num: '6', path: '/lab/regimes', icon: GitBranch,
    label: 'REGIME DETECTION',
    desc: 'Fit a 2-state Hidden Markov Model to return series using Baum-Welch EM. Identify bull/bear regimes.',
    tags: ['ML', 'TIME SERIES'],
  },
  {
    num: '7', path: '/lab/notes', icon: FileText,
    label: 'NOTES',
    desc: 'Technical write-ups on quant topics. Toggle between executive summary and mathematical detail.',
    tags: ['RESEARCH', 'THEORY'],
  },
  {
    num: '8', path: '/lab/quiz', icon: HelpCircle,
    label: 'QUIZ',
    desc: '150 questions across Probability, Options, Statistics, Fixed Income, and IB/Accounting. Three difficulty levels.',
    tags: ['INTERVIEW PREP', '150 Q'],
  },
  {
    num: '9', path: '/lab/sim', icon: Cpu,
    label: 'MONTE CARLO SIM',
    desc: 'Full GBM + Merton Jump-Diffusion simulator with option pricing vs closed-form Black-Scholes.',
    tags: ['OPTIONS', 'SIMULATION'],
  },
  {
    num: 'O', path: '/lab/optimizer', icon: PieChart,
    label: 'PORTFOLIO OPTIMIZER',
    desc: 'Mean-variance optimization via Monte Carlo. Input any tickers — plots efficient frontier, tangency portfolio weights and Sharpe ratio.',
    tags: ['PORTFOLIO', 'OPTIMIZATION'],
  },
  {
    num: 'F', path: '/lab/factors', icon: FlaskConical,
    label: 'FACTOR EXPOSURE',
    desc: 'Fama-French 3-factor OLS regression on any portfolio. Shows α, β loadings, t-stats, R², and cumulative return vs FF3-fitted.',
    tags: ['FACTOR MODEL', 'REGRESSION'],
  },
  {
    num: 'P', path: '/lab/pead', icon: Zap,
    label: 'PEAD EVENT STUDY',
    desc: 'Post-Earnings Announcement Drift. Market-model adjusted cumulative abnormal returns from −20 to +60 days around any earnings date.',
    tags: ['EVENT STUDY', 'ALPHA'],
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

export default function LabHomePage() {
  return (
    <>
      <Helmet>
        <title>DDF · LAB — Quantitative Tools</title>
      </Helmet>

      <div className="min-h-screen px-4 sm:px-6 lg:px-8 py-10">
        <div className="max-w-6xl mx-auto">

          {/* Header */}
          <div className="mb-10 border-b border-border pb-6">
            <p className="font-mono text-[10px] text-primary tracking-widest mb-2">
              DDF·LAB / QUANTITATIVE TOOLS
            </p>
            <h1 className="font-mono text-2xl md:text-3xl font-bold tracking-tight text-foreground mb-3">
              Research Laboratory
            </h1>
            <p className="font-mono text-xs text-muted-foreground max-w-2xl leading-relaxed">
              Interactive financial mathematics tools built from scratch — no libraries, no shortcuts.
              Each instrument implements the underlying math directly in the browser.
              Press <span className="text-primary">[1]–[9]</span> or <span className="text-primary">[O] [F] [P]</span> to navigate.
              Press <span className="text-primary">[ESC]</span> to return to main site.
            </p>
          </div>

          {/* Tool grid */}
          <motion.div
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4"
            variants={containerVariants}
            initial="hidden"
            animate="visible"
          >
            {tools.map(tool => {
              const Icon = tool.icon;
              return (
                <motion.div key={tool.path} variants={itemVariants}>
                  <Link
                    to={tool.path}
                    className="block border border-border hover:border-primary bg-background hover:bg-muted/30 transition-all duration-200 p-5 group"
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-[9px] text-muted-foreground opacity-60">[{tool.num}]</span>
                        <Icon className="h-4 w-4 text-primary" />
                      </div>
                      <span className="font-mono text-[9px] text-muted-foreground border border-border px-1.5 py-0.5 group-hover:border-primary transition-colors">
                        ENTER →
                      </span>
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
            })}
          </motion.div>

          {/* Footer note */}
          <div className="mt-10 pt-6 border-t border-border">
            <p className="font-mono text-[9px] text-muted-foreground tracking-wider">
              ALL COMPUTATIONS CLIENT-SIDE · NO EXTERNAL MATH LIBRARIES · BUILT FOR DMITRI DE FREITAS PORTFOLIO
            </p>
          </div>
        </div>
      </div>
    </>
  );
}
