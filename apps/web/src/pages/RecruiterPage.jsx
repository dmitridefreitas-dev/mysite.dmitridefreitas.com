import React from 'react';
import { Helmet } from 'react-helmet';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Download, Mail, Phone, Linkedin, MapPin, ArrowRight } from 'lucide-react';
import SectionHeader from '@/components/SectionHeader.jsx';
import TerminalBadge from '@/components/TerminalBadge.jsx';

const HEADSHOT    = '/IMG_1948.jpeg';
const HEADSHOT_OG = 'https://findmitridefreitas.com/IMG_1948.jpeg';
const CV_URL   = 'https://drive.google.com/file/d/1Ff9CtgP3OndC67ARXolrRjH6Y2seE1Sl/view?usp=drive_link';
const LINKEDIN = 'https://www.linkedin.com/in/dmitri-de-freitas-16a540347/';

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
  { label: 'GPA',           value: '3.7 (WashU) · 3.7 (Drew)' },
  { label: 'GRADUATION',    value: 'May 2026' },
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
        <link rel="canonical"    href="https://findmitridefreitas.com/recruiter" />
        <meta property="og:url"         content="https://findmitridefreitas.com/recruiter" />
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
                  BS Data Science &amp; Financial Engineering · Washington University in St. Louis
                </p>
                <div className="flex flex-wrap gap-2 mt-3">
                  <TerminalBadge variant="status">STATUS: SEEKING_ALPHA</TerminalBadge>
                  <TerminalBadge variant="date">AVAILABLE: 2026-05-01</TerminalBadge>
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
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* TOP 5 TOOLS */}
        <section className="py-12 bg-muted/10">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8">
            <SectionHeader number="01" title="TOP 5 TOOLS — CURATED" />
            <p className="text-sm text-muted-foreground mb-6 max-w-2xl font-mono">
              Five representative tools from the 26 in the Lab. Each one ships as a self-contained interactive
              page with the underlying math implemented directly — no third-party quant libraries.
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
          </div>
        </section>

        {/* RESUME */}
        <section className="py-12">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8">
            <SectionHeader number="02" title="RESUME" />
            <div className="max-w-2xl border border-border p-6">
              <p className="font-mono text-xs text-muted-foreground mb-4 leading-relaxed">
                Full resume (PDF) covers: WashU DSFE coursework, Drew BA Mathematics, Amphora Investment
                Management internship, 10 research projects, full technical stack, and target roles.
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
            <SectionHeader number="03" title="QUICK FACTS" />
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
            <SectionHeader number="04" title="CONTACT" />
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
