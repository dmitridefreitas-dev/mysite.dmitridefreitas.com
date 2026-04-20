import React from 'react';
import { Helmet } from 'react-helmet';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { BookOpen, ArrowRight } from 'lucide-react';
import SectionHeader from '@/components/SectionHeader.jsx';

const OG_IMAGE = 'https://findmitridefreitas.com/IMG_1948.jpeg';

const posts = [
  {
    slug: 'deflated-sharpe',
    title: "Deflated Sharpe Ratio: A Practitioner's Guide",
    excerpt: 'Traditional Sharpe ratio overstates performance under multiple-testing selection bias. The Probabilistic Sharpe Ratio (PSR) and Deflated Sharpe Ratio (DSR) apply a rigorous correction — here is how to implement them in Python.',
    tags: ['STATISTICS', 'BACKTESTING', 'PYTHON'],
    read: '12 min read',
    date: 'APR 2026',
  },
  {
    slug: 'svi-calibration',
    title: 'SVI Volatility Smile Calibration From Scratch',
    excerpt: 'Gatheral\'s Stochastic Volatility Inspired (SVI) parameterization fits a five-parameter curve to implied-volatility smiles. We derive the raw form, enforce butterfly/calendar arbitrage constraints, and fit it via non-linear least squares in pure NumPy.',
    tags: ['OPTIONS', 'VOLATILITY', 'PYTHON'],
    read: '10 min read',
    date: 'APR 2026',
  },
  {
    slug: 'hmm-regime-detection',
    title: 'Hidden Markov Model Regime Detection for Equity Markets',
    excerpt: 'Regime detection separates bull/bear states from noisy returns. We fit a Gaussian HMM via Baum-Welch EM, decode the most-likely path with Viterbi, and use the output for dynamic risk allocation.',
    tags: ['REGIMES', 'ML', 'PYTHON'],
    read: '11 min read',
    date: 'APR 2026',
  },
];

export default function ResearchIndexPage() {
  return (
    <>
      <Helmet>
        <title>Research — Dmitri De Freitas</title>
        <meta name="description" content="Research writeups by Dmitri De Freitas — deflated Sharpe ratio, SVI volatility smile calibration, HMM regime detection. Python implementations with formal derivations." />
        <link rel="canonical"    href="https://findmitridefreitas.com/research" />
        <meta property="og:url"         content="https://findmitridefreitas.com/research" />
        <meta property="og:title"       content="Research — Dmitri De Freitas" />
        <meta property="og:description" content="Formal research writeups on deflated Sharpe ratio, SVI calibration, and HMM regime detection." />
        <meta property="og:type"   content="website" />
        <meta property="og:locale" content="en_US" />
        <meta property="og:image"  content={OG_IMAGE} />
        <meta property="og:image:width"  content="800" />
        <meta property="og:image:height" content="800" />
        <meta name="twitter:card"        content="summary" />
        <meta name="twitter:image"       content={OG_IMAGE} />
      </Helmet>

      <div className="min-h-screen pt-12 md:pt-14 pb-16">
        <section className="py-10 border-b border-border">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8">
            <SectionHeader number="RESEARCH / 09" title="WRITEUPS & TECHNICAL NOTES" />
            <p className="text-sm text-muted-foreground max-w-2xl font-mono">
              Formal research notes — derivations, Python implementations, and practical commentary on topics
              that show up across the lab tools. Updated irregularly.
            </p>
          </div>
        </section>

        <section className="py-10">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8">
            <div className="grid grid-cols-1 gap-4 max-w-4xl">
              {posts.map((post, i) => (
                <motion.div
                  key={post.slug}
                  initial={{ opacity: 0, y: 12 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.07, duration: 0.4 }}
                >
                  <Link
                    to={`/research/${post.slug}`}
                    className="block border border-border hover:border-primary transition-colors group"
                  >
                    <div className="border-b border-border bg-muted/30 px-4 py-2 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <BookOpen className="h-3 w-3 text-primary" />
                        <span className="font-mono text-[9px] text-primary tracking-widest">{post.date}</span>
                        <span className="font-mono text-[9px] text-muted-foreground/40 tracking-widest">·</span>
                        <span className="font-mono text-[9px] text-muted-foreground tracking-widest">{post.read}</span>
                      </div>
                      <span className="font-mono text-[9px] text-muted-foreground group-hover:text-primary transition-colors">
                        READ →
                      </span>
                    </div>
                    <div className="p-5">
                      <h3 className="font-mono text-base md:text-lg font-bold text-foreground group-hover:text-primary transition-colors leading-snug mb-2">
                        {post.title}
                      </h3>
                      <p className="text-sm text-muted-foreground leading-relaxed mb-4">
                        {post.excerpt}
                      </p>
                      <div className="flex flex-wrap gap-1.5">
                        {post.tags.map((t) => (
                          <span
                            key={t}
                            className="font-mono text-[8px] tracking-widest text-primary/70 border border-primary/30 px-1.5 py-0.5"
                          >
                            {t}
                          </span>
                        ))}
                      </div>
                    </div>
                  </Link>
                </motion.div>
              ))}
            </div>

            <div className="max-w-4xl mt-10 border border-border bg-muted/20 p-5">
              <p className="font-mono text-[10px] text-muted-foreground/70 tracking-widest mb-2">
                RELATED
              </p>
              <p className="font-mono text-xs text-muted-foreground leading-relaxed">
                Each writeup pairs with an interactive lab tool at{' '}
                <Link to="/lab" className="text-primary hover:underline">/lab</Link>. For coursework context, see{' '}
                <Link to="/coursework" className="text-primary hover:underline">/coursework</Link>.
              </p>
            </div>
          </div>
        </section>
      </div>
    </>
  );
}
