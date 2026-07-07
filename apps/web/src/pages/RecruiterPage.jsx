import React from 'react';
import { Helmet } from 'react-helmet';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Download, Mail, Phone, Linkedin, MapPin, ArrowRight, Github } from 'lucide-react';
import SectionHeader from '@/components/SectionHeader.jsx';
import TerminalBadge from '@/components/TerminalBadge.jsx';

const HEADSHOT    = '/IMG_1948.jpeg';
const HEADSHOT_OG = 'https://dmitridefreitas.com/IMG_1948.jpeg';
const CV_URL   = 'https://drive.google.com/file/d/1Ff9CtgP3OndC67ARXolrRjH6Y2seE1Sl/view?usp=drive_link';
const LINKEDIN = 'https://www.linkedin.com/in/dmitri-de-freitas-16a540347/';
const GITHUB   = 'https://github.com/dmitridefreitas-dev';

const experience = [
  {
    role: 'Data Scientist (Intern)',
    org: 'Amphora Investment Management',
    where: 'Bridgetown, Barbados',
    when: 'May – Sep 2025',
    bullets: [
      'Cut manual data processing 80% with an automated Python/Pandas ETL pipeline across the Interactive Brokers API, Bloomberg, and the firm’s Harmony system, with real-time validation.',
      'Eliminated hundreds of analyst-hours by automating performance-attribution reporting and portfolio-construction models across 3 institutional data sources.',
    ],
  },
  {
    role: 'Founder & Manager',
    org: 'Mobile Hub Barbados',
    where: 'Bridgetown, Barbados',
    when: '2022 – 2024',
    bullets: [
      'Drove 2+ years of month-over-month revenue growth running a cross-border (Barbados–China) electronics venture on self-built financial, inventory, and cash-flow models.',
    ],
  },
];

const headlineResults = [
  { value: '80%',     label: 'manual processing cut (Amphora ETL)' },
  { value: '>1.5',    label: 'est. Sharpe, live crypto engine (4–6 wk)' },
  { value: '5,000×', label: 'latency cut: Python → AVX-512 SIMD' },
  { value: '0.816',   label: 'R², housing model (13,580 records)' },
  { value: '10/110',  label: 'stocks w/ significant PEAD alpha (p<0.05)' },
  { value: '25',      label: 'quant tools built — no math libraries' },
];

const skillGroups = [
  {
    title: 'PROGRAMMING',
    items: ['Python · Pandas · NumPy · SciPy · scikit-learn', 'R', 'SQL', 'C++ (Numba / AVX-512)', 'MATLAB · VBA · Bash'],
  },
  {
    title: 'QUANT METHODS',
    items: ['Stochastic Calculus', 'Monte Carlo Simulation', 'Derivatives Pricing · Black-Scholes', 'Value-at-Risk', 'Volatility Modeling', 'Time Series Analysis', 'Optimization', 'Machine Learning'],
  },
  {
    title: 'PLATFORMS & TOOLS',
    items: ['Bloomberg Terminal', 'FRED · QuantLib · Backtrader', 'IBKR / Coinbase / Alpaca / Polygon APIs', 'Git · Docker · AWS', 'PostgreSQL', 'Power BI'],
  },
];

const coursework = [
  'Stochastic Calculus', 'Probability', 'Linear Algebra', 'Time Series Analysis',
  'Optimization', 'Derivatives Pricing', 'Econometrics', 'Machine Learning',
  'Statistical Learning', 'Data Structures & Algorithms',
];

const topTools = [
  {
    path: '/lab/iv-surface',
    title: 'IV SURFACE',
    desc: 'Real options-chain implied-vol surface with SVI calibration, ATM term structure, and skew metrics. Built in the browser with live data.',
    tag: 'DERIVATIVES',
  },
  {
    path: '/lab/backtest-stats',
    title: 'BACKTEST STATISTICS',
    desc: 'Deflated Sharpe Ratio and PSR with Monte Carlo p-hacking simulation. Enforces multiple-testing rigor on strategy selection.',
    tag: 'STATISTICAL RIGOR',
  },
  {
    path: '/lab/latency',
    title: 'LATENCY BENCHMARKS',
    desc: 'Black-Scholes pricing across Python → NumPy → Numba → C++ scalar → AVX-512. 5,250× range. Real code, real numbers.',
    tag: 'LOW-LATENCY HPC',
  },
  {
    path: '/lab/regimes',
    title: 'HMM REGIME DETECTION',
    desc: 'Bull/bear regime inference on SPY via Gaussian HMM with Baum-Welch and Viterbi. Overlaid on live price series.',
    tag: 'ML / REGIMES',
  },
  {
    path: '/lab/ic-vault',
    title: 'IC VAULT',
    desc: 'Five full investment-committee memos: thesis, live DCF, bear case, position sizing. For fintech and infrastructure names.',
    tag: 'RESEARCH',
  },
];

const quickFacts = [
  { label: 'DEGREE',        value: 'BS Data Science & Financial Engineering — conferred May 2026' },
  { label: 'GPA',           value: '3.7 (WashU) · 3.7 (Drew, BA Mathematics)' },
  { label: 'AVAILABLE',     value: 'August 1, 2026' },
  { label: 'AUTHORIZATION', value: 'F-1 / OPT eligible' },
  { label: 'LOCATION',      value: 'St. Louis, MO · Open to relocation' },
  { label: 'TARGET ROLES',  value: 'Quant Research · Financial Engineer · Data Scientist' },
];

export default function RecruiterPage() {
  return (
    <>
      <Helmet>
        <title>For Recruiters — Dmitri De Freitas</title>
        <meta name="description" content="Curated recruiter view — Dmitri De Freitas. Top 5 live quant tools, one-click resume download, OPT status, availability, and direct contact." />
        <link rel="canonical"    href="https://dmitridefreitas.com/recruiter" />
        <meta property="og:url"         content="https://dmitridefreitas.com/recruiter" />
        <meta property="og:title"       content="For Recruiters — Dmitri De Freitas" />
        <meta property="og:description" content="Curated one-page view for recruiters — top tools, resume, OPT status, availability, contact." />
        <meta property="og:type"   content="website" />
        <meta property="og:locale" content="en_US" />
        <meta property="og:image"  content={HEADSHOT_OG} />
        <meta property="og:image:width"  content="800" />
        <meta property="og:image:height" content="800" />
        <meta name="twitter:card"        content="summary" />
        <meta name="twitter:image"       content={HEADSHOT_OG} />
      </Helmet>

      <div className="min-h-screen pt-10 md:pt-11 pb-16">

        {/* HERO */}
        <section className="py-10 border-b border-border">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-start gap-5 max-w-4xl">
              <div className="w-20 h-20 md:w-24 md:h-24 rounded-full overflow-hidden border border-border shrink-0">
                <img src={HEADSHOT} alt="Dmitri De Freitas" className="w-full h-full object-cover object-top scale-[1.8] -translate-y-4 translate-x-[3px]" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-mono text-[9px] text-primary tracking-widest mb-1">RECRUITER VIEW · CURATED</p>
                <h1 className="font-mono text-2xl md:text-4xl font-bold tracking-tight text-foreground leading-none">
                  DMITRI DE FREITAS
                </h1>
                <p className="font-mono text-xs text-muted-foreground mt-2">
                  BS Data Science &amp; Financial Engineering (May 2026) · Washington University in St. Louis
                </p>
                <div className="flex flex-wrap gap-2 mt-3">
                  <TerminalBadge variant="status">STATUS: SEEKING_ALPHA</TerminalBadge>
                  <TerminalBadge variant="date">AVAILABLE: 2026-08-01</TerminalBadge>
                  <TerminalBadge variant="location">OPT ELIGIBLE</TerminalBadge>
                  <TerminalBadge variant="location">STL · RELO OK</TerminalBadge>
                </div>
                <div className="flex flex-wrap gap-3 mt-4 font-mono text-[11px]">
                  <a href={CV_URL} target="_blank" rel="noopener noreferrer"
                     className="border border-primary bg-primary text-primary-foreground px-4 py-2 tracking-widest hover:bg-primary/90 transition-colors inline-flex items-center gap-2">
                    <Download className="h-3 w-3" /> DOWNLOAD RESUME
                  </a>
                  <a href="mailto:d.defreitas@wustl.edu"
                     className="border border-border px-4 py-2 tracking-widest text-foreground hover:bg-muted transition-colors inline-flex items-center gap-2">
                    <Mail className="h-3 w-3" /> EMAIL
                  </a>
                  <a href="tel:+13146469845"
                     className="border border-border px-4 py-2 tracking-widest text-foreground hover:bg-muted transition-colors inline-flex items-center gap-2">
                    <Phone className="h-3 w-3" /> +1 314-646-9845
                  </a>
                  <a href={GITHUB} target="_blank" rel="noopener noreferrer"
                     className="border border-border px-4 py-2 tracking-widest text-foreground hover:bg-muted transition-colors inline-flex items-center gap-2">
                    <Github className="h-3 w-3" /> GITHUB
                  </a>
                </div>
              </div>
            </div>

            {/* Headline results strip */}
            <div className="max-w-4xl mt-8 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 border border-border divide-x divide-y sm:divide-y-0 divide-border">
              {headlineResults.map((r) => (
                <div key={r.label} className="px-3 py-3">
                  <p className="font-mono text-lg font-bold text-primary leading-none">{r.value}</p>
                  <p className="font-mono text-[10px] text-muted-foreground mt-1.5 leading-snug">{r.label}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* EXPERIENCE */}
        <section className="py-12">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8">
            <SectionHeader number="01" title="EXPERIENCE" />
            <div className="max-w-4xl space-y-4">
              {experience.map((job) => (
                <div key={job.org} className="border border-border p-5">
                  <div className="flex flex-wrap items-baseline justify-between gap-2 mb-1">
                    <h3 className="font-mono text-sm font-bold text-foreground">
                      {job.role} <span className="text-primary">· {job.org}</span>
                    </h3>
                    <span className="font-mono text-[11px] text-muted-foreground">{job.when} · {job.where}</span>
                  </div>
                  <ul className="mt-2 space-y-1.5">
                    {job.bullets.map((b, i) => (
                      <li key={i} className="font-mono text-xs text-muted-foreground leading-relaxed flex gap-2">
                        <span className="text-primary shrink-0">·</span> {b}
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* TOP 5 TOOLS */}
        <section className="py-12 bg-muted/10">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8">
            <SectionHeader number="02" title="TOP 5 TOOLS — CURATED" />
            <p className="text-sm text-muted-foreground mb-6 max-w-2xl font-mono">
              Five representative tools from the 27 in the Lab — led by four flagships with receipts:
              a correctness proof against a published result, measured tail-latency distributions, live
              exchange-synchronized data, and a working-paper companion. No third-party quant libraries.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {topTools.map((tool, i) => (
                <motion.div
                  key={tool.path}
                  initial={{ opacity: 0, y: 12 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.06, duration: 0.4 }}
                >
                  <Link to={tool.path} className="block border border-border p-4 hover:border-primary transition-colors group">
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-mono text-[8px] tracking-widest text-primary/70 border border-primary/30 px-1.5 py-0.5">
                        {tool.tag}
                      </span>
                      <span className="font-mono text-[9px] text-muted-foreground group-hover:text-primary transition-colors flex items-center gap-1">
                        LAUNCH <ArrowRight className="h-3 w-3" />
                      </span>
                    </div>
                    <h3 className="font-mono text-sm font-bold text-foreground group-hover:text-primary transition-colors mb-1.5">
                      {tool.title}
                    </h3>
                    <p className="font-mono text-[11px] text-muted-foreground leading-relaxed">
                      {tool.desc}
                    </p>
                  </Link>
                </motion.div>
              ))}
            </div>

            {/* Working papers — the writing behind the tools */}
            <div className="mt-6 border border-primary/40 bg-primary/5 p-4 max-w-4xl">
              <p className="font-mono text-[9px] text-primary tracking-widest mb-2">WORKING PAPERS · TYPESET PDF · 60-SECOND READS FOR SCREENERS</p>
              <div className="space-y-1.5">
                <a href="/papers/Deflated-Sharpe-Ratio-Working-Paper.pdf" target="_blank" rel="noopener noreferrer"
                  className="block font-mono text-[11px] text-foreground hover:text-primary transition-colors">
                  · The Deflated Sharpe Ratio in Practice — multiple-testing bias in strategy selection [PDF →]
                </a>
                <a href="/papers/PEAD-Event-Study-Working-Paper.pdf" target="_blank" rel="noopener noreferrer"
                  className="block font-mono text-[11px] text-foreground hover:text-primary transition-colors">
                  · Short-Horizon Market Efficiency After Earnings Surprises — a PEAD event study [PDF →]
                </a>
              </div>
            </div>
          </div>
        </section>

        {/* SKILLS */}
        <section className="py-12">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8">
            <SectionHeader number="03" title="SKILLS SNAPSHOT" />
            <div className="max-w-4xl grid grid-cols-1 md:grid-cols-3 gap-4">
              {skillGroups.map((g) => (
                <div key={g.title} className="border border-border p-4">
                  <p className="font-mono text-[10px] text-primary tracking-widest mb-3">{g.title}</p>
                  <ul className="space-y-1.5">
                    {g.items.map((item) => (
                      <li key={item} className="font-mono text-[11px] text-muted-foreground leading-snug">· {item}</li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* COURSEWORK */}
        <section className="py-12 bg-muted/10">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8">
            <SectionHeader number="04" title="RELEVANT COURSEWORK" />
            <div className="max-w-4xl">
              <div className="flex flex-wrap gap-2 mb-4">
                {coursework.map((c) => (
                  <span key={c} className="font-mono text-[11px] border border-border px-2.5 py-1 text-foreground/80">
                    {c}
                  </span>
                ))}
              </div>
              <Link
                to="/coursework"
                className="inline-flex items-center gap-2 font-mono text-[11px] text-primary hover:underline underline-offset-4 tracking-widest"
              >
                FULL COURSE LIST — 22 COURSES AT WASHU + 17 AT DREW <ArrowRight className="h-3 w-3" />
              </Link>
            </div>
          </div>
        </section>

        {/* RESUME */}
        <section className="py-12">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8">
            <SectionHeader number="05" title="RESUME" />
            <div className="max-w-2xl border border-border p-6">
              <p className="font-mono text-xs text-muted-foreground mb-4 leading-relaxed">
                Full resume (PDF) covers: WashU DSFE coursework, Drew BA Mathematics, Amphora Investment
                Management internship, 19 research projects, full technical stack, and target roles.
              </p>
              <a
                href={CV_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 border border-primary bg-primary text-primary-foreground px-6 py-3 font-mono text-xs tracking-widest hover:bg-primary/90 transition-colors"
              >
                <Download className="h-3.5 w-3.5" /> DOWNLOAD CV.PDF
              </a>
            </div>
          </div>
        </section>

        {/* QUICK FACTS */}
        <section className="py-12 bg-muted/10">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8">
            <SectionHeader number="06" title="QUICK FACTS" />
            <div className="max-w-2xl border border-border divide-y divide-border">
              {quickFacts.map((f) => (
                <div key={f.label} className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1 px-4 py-3">
                  <span className="font-mono text-[10px] text-muted-foreground/60 tracking-widest">{f.label}</span>
                  <span className="font-mono text-xs text-foreground">{f.value}</span>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* CONTACT */}
        <section className="py-12">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8">
            <SectionHeader number="07" title="CONTACT" />
            <div className="max-w-2xl border border-border divide-y divide-border">
              <a href="mailto:d.defreitas@wustl.edu"
                 className="flex items-center justify-between px-4 py-3 hover:bg-muted/30 transition-colors group">
                <span className="flex items-center gap-2 font-mono text-[10px] text-muted-foreground/60 tracking-widest">
                  <Mail className="h-3 w-3" /> EMAIL
                </span>
                <span className="font-mono text-xs text-foreground group-hover:text-primary transition-colors">
                  d.defreitas@wustl.edu
                </span>
              </a>
              <a href="tel:+13146469845"
                 className="flex items-center justify-between px-4 py-3 hover:bg-muted/30 transition-colors group">
                <span className="flex items-center gap-2 font-mono text-[10px] text-muted-foreground/60 tracking-widest">
                  <Phone className="h-3 w-3" /> PHONE
                </span>
                <span className="font-mono text-xs text-foreground group-hover:text-primary transition-colors">
                  +1 314-646-9845
                </span>
              </a>
              <a href={LINKEDIN} target="_blank" rel="noopener noreferrer"
                 className="flex items-center justify-between px-4 py-3 hover:bg-muted/30 transition-colors group">
                <span className="flex items-center gap-2 font-mono text-[10px] text-muted-foreground/60 tracking-widest">
                  <Linkedin className="h-3 w-3" /> LINKEDIN
                </span>
                <span className="font-mono text-xs text-foreground group-hover:text-primary transition-colors">
                  /in/dmitri-de-freitas
                </span>
              </a>
              <Link to="/contact"
                 className="flex items-center justify-between px-4 py-3 hover:bg-muted/30 transition-colors group">
                <span className="flex items-center gap-2 font-mono text-[10px] text-muted-foreground/60 tracking-widest">
                  <MapPin className="h-3 w-3" /> CONTACT FORM
                </span>
                <span className="font-mono text-xs text-foreground group-hover:text-primary transition-colors">
                  /contact →
                </span>
              </Link>
            </div>
          </div>
        </section>
      </div>
    </>
  );
}
