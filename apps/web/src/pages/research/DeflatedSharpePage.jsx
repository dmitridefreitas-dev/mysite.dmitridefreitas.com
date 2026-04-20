import React from 'react';
import { Helmet } from 'react-helmet';
import { Link } from 'react-router-dom';
import { ArrowLeft, Download } from 'lucide-react';
import SectionHeader from '@/components/SectionHeader.jsx';

const OG_IMAGE = 'https://findmitridefreitas.com/IMG_1948.jpeg';

function MathBlock({ children, block }) {
  return (
    <div className={`font-mono ${block ? 'my-4 p-3 border border-border bg-muted/20 text-sm overflow-x-auto' : 'inline px-1 bg-muted/30 text-[11px]'}`}>
      {children}
    </div>
  );
}

function CodeBlock({ children, lang }) {
  return (
    <div className="my-4 border border-border/50 bg-[#0a0a0a]">
      {lang && (
        <div className="border-b border-border/30 px-3 py-1.5">
          <span className="font-mono text-[8px] text-muted-foreground/40 tracking-widest">{lang}</span>
        </div>
      )}
      <pre className="bg-[#0a0a0a] p-4 font-mono text-[11px] overflow-x-auto rounded-none leading-[1.7] text-muted-foreground">
        <code>{children}</code>
      </pre>
    </div>
  );
}

const IC = ({ children }) => (
  <code className="bg-muted/30 font-mono text-[11px] px-1">{children}</code>
);

const PSR_CODE = `import numpy as np
from scipy.stats import norm, skew, kurtosis

def probabilistic_sharpe_ratio(returns, sr_benchmark=0.0):
    """PSR = Prob(SR_hat > SR_benchmark), adjusted for skew & kurtosis."""
    r  = np.asarray(returns, dtype=float)
    T  = len(r)
    sr = r.mean() / r.std(ddof=1)
    g3 = skew(r, bias=False)
    g4 = kurtosis(r, fisher=True, bias=False)  # excess

    num   = (sr - sr_benchmark) * np.sqrt(T - 1)
    denom = np.sqrt(1 - g3 * sr + (g4 / 4.0) * sr**2)
    return norm.cdf(num / denom)

def deflated_sharpe_ratio(returns, sr_trials):
    """DSR = PSR with a multiple-testing-corrected threshold (Bailey/LdP)."""
    sr_std = np.std(sr_trials, ddof=1)
    N      = len(sr_trials)
    emc    = 0.5772156649  # Euler-Mascheroni
    sr_star = sr_std * (
        (1 - emc) * norm.ppf(1 - 1.0 / N) +
        emc       * norm.ppf(1 - 1.0 / (N * np.e))
    )
    return probabilistic_sharpe_ratio(returns, sr_star)`;

export default function DeflatedSharpePage() {
  return (
    <>
      <Helmet>
        <title>Deflated Sharpe Ratio: A Practitioner&apos;s Guide — Dmitri De Freitas</title>
        <meta name="description" content="Deflated Sharpe Ratio Python implementation — full derivation of PSR, multiple-testing correction via Bailey and Lopez de Prado, executable NumPy/SciPy code." />
        <meta name="keywords" content="deflated sharpe ratio python implementation, probabilistic sharpe ratio, PSR formula, backtest overfitting, multiple testing correction" />
        <link rel="canonical"    href="https://findmitridefreitas.com/research/deflated-sharpe" />
        <meta property="og:url"         content="https://findmitridefreitas.com/research/deflated-sharpe" />
        <meta property="og:title"       content="Deflated Sharpe Ratio: A Practitioner's Guide" />
        <meta property="og:description" content="Python implementation of the Probabilistic and Deflated Sharpe Ratio — multiple-testing correction for backtest performance." />
        <meta property="og:type"   content="article" />
        <meta property="og:locale" content="en_US" />
        <meta property="og:image"  content={OG_IMAGE} />
        <meta property="og:image:width"  content="800" />
        <meta property="og:image:height" content="800" />
        <meta name="twitter:card"        content="summary" />
        <meta name="twitter:image"       content={OG_IMAGE} />
      </Helmet>

      <div className="min-h-screen pt-12 md:pt-14 pb-20">
        <section className="py-8 border-b border-border">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-3xl">
            <Link to="/research" className="font-mono text-[10px] tracking-widest text-muted-foreground hover:text-primary transition-colors inline-flex items-center gap-1 mb-5">
              <ArrowLeft className="h-3 w-3" /> BACK TO RESEARCH
            </Link>
            <div className="flex flex-wrap gap-1.5 mb-3">
              {['STATISTICS', 'BACKTESTING', 'PYTHON'].map((t) => (
                <span key={t} className="font-mono text-[8px] tracking-widest text-primary/70 border border-primary/30 px-1.5 py-0.5">{t}</span>
              ))}
            </div>
            <h1 className="font-mono text-2xl md:text-4xl font-bold tracking-tight text-foreground leading-tight mb-3">
              Deflated Sharpe Ratio: A Practitioner&apos;s Guide
            </h1>
            <div className="flex items-center gap-3 font-mono text-[10px] text-muted-foreground">
              <span>DMITRI DE FREITAS</span>
              <span className="text-muted-foreground/40">·</span>
              <span>APRIL 2026</span>
              <span className="text-muted-foreground/40">·</span>
              <span>12 MIN READ</span>
            </div>
          </div>
        </section>

        <article className="py-10">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-3xl space-y-10">

            <section>
              <p className="font-mono text-[9px] text-muted-foreground/60 tracking-widest mb-2">ABSTRACT</p>
              <p className="text-sm text-muted-foreground leading-[1.75] border-l-2 border-primary/50 pl-4">
                The Sharpe ratio is the industry-standard metric for risk-adjusted performance, but its sampling
                distribution is wider than most practitioners realize. When a backtest is selected from a large
                population of alternatives, the in-sample Sharpe overstates the true out-of-sample performance —
                often dramatically. This note derives the Probabilistic Sharpe Ratio (PSR) and its
                multiple-testing-corrected cousin, the Deflated Sharpe Ratio (DSR), and provides an executable
                Python implementation. The associated interactive tool is at{' '}
                <Link to="/lab/backtest-stats" className="text-primary hover:underline">/lab/backtest-stats</Link>.
              </p>
            </section>

            <section>
              <SectionHeader number="01" title="THE PROBLEM WITH SHARPE" />
              <div className="space-y-4 text-sm text-muted-foreground leading-[1.75]">
                <p>
                  The Sharpe ratio <IC>SR = mean(r) / std(r)</IC> is a sample statistic. Even when the true
                  Sharpe is zero, a finite sample will produce a non-zero <IC>SR_hat</IC>. The standard error
                  under normal returns is approximately <IC>1 / sqrt(T)</IC>, meaning a five-year daily backtest
                  (T ~ 1260) has a Sharpe standard error of roughly 0.028 — non-trivial.
                </p>
                <p>
                  The problem compounds with <strong className="text-foreground">selection bias</strong>. If a
                  researcher tests <IC>N</IC> independent strategies and reports the best, the expected maximum
                  Sharpe under the null (true SR = 0 for all) grows with <IC>sqrt(2 ln N)</IC>. A researcher who
                  tries 100 strategies and picks the best should expect an SR ~ 3x standard-error purely from
                  chance.
                </p>
                <p>
                  Non-normal returns make it worse. Financial returns exhibit negative skew and fat tails
                  (positive excess kurtosis). Both inflate the apparent Sharpe in finite samples. PSR corrects
                  all three simultaneously: sample size, skew, and kurtosis.
                </p>
              </div>
            </section>

            <section>
              <SectionHeader number="02" title="THE PSR FORMULA" />
              <div className="space-y-4 text-sm text-muted-foreground leading-[1.75]">
                <p>
                  Bailey &amp; López de Prado (2012) derived the Probabilistic Sharpe Ratio as the probability
                  that the observed Sharpe exceeds a chosen benchmark, given the higher moments:
                </p>
                <MathBlock block>
                  PSR(SR*) = Phi[ (SR_hat - SR*) · sqrt(T - 1) / sqrt(1 - g3 · SR_hat + ((g4 - 1) / 4) · SR_hat^2) ]
                </MathBlock>
                <p>
                  where <IC>Phi</IC> is the standard-normal CDF, <IC>T</IC> is sample size, <IC>g3</IC> is sample
                  skewness, <IC>g4</IC> is sample kurtosis (non-excess; subtract 3 for excess), and <IC>SR*</IC>
                  is the benchmark Sharpe (often 0).
                </p>
                <p>
                  The denominator is the variance-inflation correction: negative skew (<IC>g3 &lt; 0</IC>)
                  increases the denominator and thus decreases the PSR, penalising strategies that look good
                  mostly because they hide losses in tail events.
                </p>
                <p>
                  The Deflated Sharpe Ratio generalises this by substituting the benchmark <IC>SR*</IC> with the
                  expected maximum Sharpe under the null across the full trial population:
                </p>
                <MathBlock block>
                  SR*_DSR = sigma_SR · [ (1 - gamma) · Phi^-1(1 - 1/N) + gamma · Phi^-1(1 - 1/(N·e)) ]
                </MathBlock>
                <p>
                  where <IC>gamma ~ 0.5772</IC> is the Euler-Mascheroni constant, <IC>N</IC> is the number of
                  independent strategies tested, and <IC>sigma_SR</IC> is the standard deviation of the trial-SR
                  distribution. Effectively a Bonferroni-style correction adapted to the extreme-value distribution
                  of the max of many Sharpes.
                </p>
              </div>
            </section>

            <section>
              <SectionHeader number="03" title="PYTHON IMPLEMENTATION" />
              <p className="text-sm text-muted-foreground leading-[1.75] mb-2">
                The implementation below uses only <IC>numpy</IC> and <IC>scipy.stats</IC>. No helper packages.
              </p>
              <CodeBlock lang="python">{PSR_CODE}</CodeBlock>
              <p className="text-sm text-muted-foreground leading-[1.75]">
                Call <IC>probabilistic_sharpe_ratio(r)</IC> for the single-strategy probability that your true
                Sharpe is positive. Call <IC>deflated_sharpe_ratio(r, sr_trials)</IC> when you have the full
                Sharpe distribution from all trials attempted during backtesting.
              </p>
            </section>

            <section>
              <SectionHeader number="04" title="INTERPRETATION" />
              <div className="space-y-4 text-sm text-muted-foreground leading-[1.75]">
                <p>
                  PSR returns a probability in [0, 1]. The conventional significance threshold is{' '}
                  <IC>PSR &gt; 0.95</IC>: the true Sharpe exceeds the benchmark with 95% confidence. Values below
                  this do not reject the null, even if the point estimate looks impressive.
                </p>
                <div className="border border-border p-4 bg-muted/10 space-y-2">
                  <div className="flex items-center justify-between font-mono text-[10px]">
                    <span className="text-muted-foreground">PSR &gt; 0.95</span>
                    <span className="text-terminal-green">STATISTICALLY SIGNIFICANT</span>
                  </div>
                  <div className="flex items-center justify-between font-mono text-[10px]">
                    <span className="text-muted-foreground">0.50 &lt; PSR &lt; 0.95</span>
                    <span className="text-terminal-amber">AMBIGUOUS · EXTEND SAMPLE</span>
                  </div>
                  <div className="flex items-center justify-between font-mono text-[10px]">
                    <span className="text-muted-foreground">PSR &lt; 0.50</span>
                    <span className="text-destructive">DOES NOT BEAT BENCHMARK</span>
                  </div>
                </div>
                <p>
                  The DSR threshold is stricter. For <IC>N = 100</IC> trials, the deflated benchmark typically
                  sits between 1.5σ and 2σ of the trial-SR distribution — meaning the median reported Sharpe is
                  nowhere near significant once the search cost is paid. This is a Bonferroni-style correction in
                  spirit — you are paying for every trial you ran.
                </p>
                <p>
                  Practical rule of thumb: if DSR &lt; 0.95 with your realistic trial count, do not deploy. The
                  discipline this imposes on research is more valuable than any single marginal alpha.
                </p>
              </div>
            </section>

            <section>
              <SectionHeader number="05" title="INTERACTIVE TOOL" />
              <p className="text-sm text-muted-foreground leading-[1.75] mb-3">
                The lab tool <Link to="/lab/backtest-stats" className="text-primary hover:underline">/lab/backtest-stats</Link>{' '}
                implements PSR and DSR live. Paste a return series, choose a benchmark Sharpe and trial count,
                and the tool returns the probabilities alongside the Monte Carlo p-hacking simulation described
                in López de Prado (2018).
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-6">
                <Link to="/lab/backtest-stats" className="border border-primary bg-primary text-primary-foreground px-4 py-3 font-mono text-[11px] tracking-widest hover:bg-primary/90 transition-colors flex items-center justify-between">
                  <span>TRY THE INTERACTIVE TOOL</span>
                  <span>→</span>
                </Link>
                <a href="#" className="border border-border px-4 py-3 font-mono text-[11px] tracking-widest text-foreground hover:bg-muted transition-colors flex items-center justify-between">
                  <span className="flex items-center gap-2"><Download className="h-3 w-3" /> DOWNLOAD AS PDF</span>
                  <span>→</span>
                </a>
              </div>
            </section>

            <section>
              <p className="font-mono text-[9px] text-muted-foreground/60 tracking-widest mb-2">REFERENCES</p>
              <ul className="font-mono text-[11px] text-muted-foreground/80 space-y-1.5 leading-relaxed">
                <li>Bailey, D. H. &amp; López de Prado, M. (2012). The Sharpe Ratio Efficient Frontier. <em>Journal of Risk</em>, 15(2).</li>
                <li>Bailey, D. H. &amp; López de Prado, M. (2014). The Deflated Sharpe Ratio. <em>Journal of Portfolio Management</em>, 40(5).</li>
                <li>López de Prado, M. (2018). <em>Advances in Financial Machine Learning</em>. Wiley.</li>
              </ul>
            </section>
          </div>
        </article>
      </div>
    </>
  );
}
