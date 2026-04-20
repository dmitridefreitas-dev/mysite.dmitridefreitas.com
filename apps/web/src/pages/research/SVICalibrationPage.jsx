import React from 'react';
import { Helmet } from 'react-helmet';
import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
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

const SVI_CODE = `import numpy as np
from scipy.optimize import least_squares

def svi_raw(k, a, b, rho, m, sigma):
    """Gatheral's raw SVI total variance w(k) = sigma^2 * T."""
    return a + b * (rho * (k - m) + np.sqrt((k - m)**2 + sigma**2))

def fit_svi(log_moneyness, market_var, x0=None):
    """
    Calibrate 5-parameter SVI to observed total variance w = IV^2 * T.
    log_moneyness : array, k = log(K / F)
    market_var    : array, observed w (total variance)
    """
    k = np.asarray(log_moneyness)
    w = np.asarray(market_var)
    if x0 is None:
        x0 = [w.min(), 0.1, -0.3, 0.0, 0.1]

    def residuals(p):
        a, b, rho, m, sigma = p
        return svi_raw(k, a, b, rho, m, sigma) - w

    # Bounds enforce no-arbitrage: b >= 0, |rho| < 1, sigma > 0
    bounds = ([-np.inf, 1e-6, -0.999, -np.inf, 1e-6],
              [ np.inf, np.inf, 0.999,  np.inf, np.inf])

    res = least_squares(residuals, x0, bounds=bounds, method='trf')
    return dict(zip(['a', 'b', 'rho', 'm', 'sigma'], res.x))`;

export default function SVICalibrationPage() {
  return (
    <>
      <Helmet>
        <title>SVI Volatility Smile Calibration From Scratch — Dmitri De Freitas</title>
        <meta name="description" content="SVI volatility smile calibration Python tutorial — raw SVI parameterization, non-linear least-squares fit, butterfly and calendar arbitrage constraints, executable NumPy/SciPy code." />
        <meta name="keywords" content="SVI calibration python, Gatheral SVI, volatility smile, implied volatility surface, butterfly arbitrage, calendar arbitrage" />
        <link rel="canonical"    href="https://findmitridefreitas.com/research/svi-calibration" />
        <meta property="og:url"         content="https://findmitridefreitas.com/research/svi-calibration" />
        <meta property="og:title"       content="SVI Volatility Smile Calibration From Scratch" />
        <meta property="og:description" content="5-parameter Gatheral SVI fit with arbitrage constraints, implemented in pure NumPy/SciPy." />
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
              {['OPTIONS', 'VOLATILITY', 'PYTHON'].map((t) => (
                <span key={t} className="font-mono text-[8px] tracking-widest text-primary/70 border border-primary/30 px-1.5 py-0.5">{t}</span>
              ))}
            </div>
            <h1 className="font-mono text-2xl md:text-4xl font-bold tracking-tight text-foreground leading-tight mb-3">
              SVI Volatility Smile Calibration From Scratch
            </h1>
            <div className="flex items-center gap-3 font-mono text-[10px] text-muted-foreground">
              <span>DMITRI DE FREITAS</span>
              <span className="text-muted-foreground/40">·</span>
              <span>APRIL 2026</span>
              <span className="text-muted-foreground/40">·</span>
              <span>10 MIN READ</span>
            </div>
          </div>
        </section>

        <article className="py-10">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-3xl space-y-10">

            <section>
              <p className="font-mono text-[9px] text-muted-foreground/60 tracking-widest mb-2">ABSTRACT</p>
              <p className="text-sm text-muted-foreground leading-[1.75] border-l-2 border-primary/50 pl-4">
                Gatheral&apos;s Stochastic Volatility Inspired (SVI) parameterization is the standard five-parameter
                curve fit to implied-volatility smiles. It is arbitrage-aware, interpolates well across strikes,
                and extrapolates the wings in a controlled manner. This note derives the raw form, enforces the
                butterfly and calendar arbitrage constraints, and fits it via non-linear least-squares in pure
                NumPy and SciPy. The live implementation is at{' '}
                <Link to="/lab/options-analytics" className="text-primary hover:underline">/lab/options-analytics</Link>.
              </p>
            </section>

            <section>
              <SectionHeader number="01" title="WHAT IS SVI" />
              <div className="space-y-4 text-sm text-muted-foreground leading-[1.75]">
                <p>
                  SVI (Stochastic Volatility Inspired) is a parametric model for the implied-volatility smile on
                  a single expiry. It was introduced by Jim Gatheral in 2004 and has since become the market
                  standard for vanilla vol-surface interpolation. Unlike fully stochastic models (Heston, SABR),
                  SVI is a <em>static</em> parameterization: no dynamics, no calibration of transition densities
                  — just a curve.
                </p>
                <p>
                  The model&apos;s appeal lies in three properties. First, the functional form has a natural
                  economic interpretation: a linear asymmetric wing plus a hyperbolic core. Second, the
                  arbitrage constraints (no butterfly, no calendar spread arbitrage) reduce to closed-form
                  inequalities in the parameters. Third, the model is sparse enough (five parameters per expiry)
                  to avoid overfitting noise, yet flexible enough to capture the volatility smirk across a wide
                  range of underlyings.
                </p>
              </div>
            </section>

            <section>
              <SectionHeader number="02" title="THE RAW PARAMETERIZATION" />
              <div className="space-y-4 text-sm text-muted-foreground leading-[1.75]">
                <p>
                  The raw SVI model for total variance <IC>w(k) = sigma_implied^2 · T</IC> as a function of
                  log-moneyness <IC>k = log(K/F)</IC> is:
                </p>
                <MathBlock block>
                  w(k) = a + b [ rho (k - m) + sqrt((k - m)^2 + sigma^2) ]
                </MathBlock>
                <p>
                  The five parameters have direct geometric interpretations:
                </p>
                <ul className="list-none space-y-1.5 pl-4 border-l border-border">
                  <li><IC>a</IC> — vertical shift (overall variance level)</li>
                  <li><IC>b</IC> — slope amplitude; controls wing steepness (<IC>b &gt;= 0</IC>)</li>
                  <li><IC>rho</IC> — correlation-like skew parameter (<IC>|rho| &lt; 1</IC>)</li>
                  <li><IC>m</IC> — horizontal translation of the ATM point</li>
                  <li><IC>sigma</IC> — curvature at the ATM point (<IC>sigma &gt; 0</IC>)</li>
                </ul>
                <p>
                  In the large-<IC>|k|</IC> limit the slopes are <IC>b(1 - rho)</IC> (left wing) and{' '}
                  <IC>b(1 + rho)</IC> (right wing). Roger Lee&apos;s moment formula caps these at 2, which
                  constrains the parameters in the small-<IC>T</IC> limit.
                </p>
              </div>
            </section>

            <section>
              <SectionHeader number="03" title="CALIBRATION & NO-ARBITRAGE" />
              <div className="space-y-4 text-sm text-muted-foreground leading-[1.75]">
                <p>
                  Calibration is a non-linear least-squares fit to market-implied total variance. Given a set of
                  observed <IC>(k_i, w_i)</IC> pairs, minimise:
                </p>
                <MathBlock block>
                  min_&#123;a, b, rho, m, sigma&#125;  sum_i [ w(k_i; params) - w_i ]^2
                </MathBlock>
                <p>
                  Two arbitrage constraints must be enforced:
                </p>
                <ol className="list-decimal list-inside space-y-2 pl-2">
                  <li>
                    <strong className="text-foreground">Butterfly arbitrage</strong> — the implied density must
                    be non-negative. Practically this reduces to the Durrleman condition on the SVI
                    parameterization, usually checked post-fit by evaluating the density on a grid.
                  </li>
                  <li>
                    <strong className="text-foreground">Calendar spread arbitrage</strong> — total variance must
                    be monotonically non-decreasing in T at every fixed <IC>k</IC>. When fitting multiple
                    expiries jointly, enforce <IC>w(k, T_1) &lt;= w(k, T_2)</IC> for all <IC>T_1 &lt; T_2</IC>.
                  </li>
                </ol>
                <p>
                  For single-expiry fits, bounding <IC>b &gt;= 0</IC>, <IC>|rho| &lt; 1</IC>, and <IC>sigma &gt; 0</IC>{' '}
                  is usually sufficient. Post-fit, evaluate the density and flag violations.
                </p>
              </div>
            </section>

            <section>
              <SectionHeader number="04" title="PYTHON IMPLEMENTATION" />
              <p className="text-sm text-muted-foreground leading-[1.75] mb-2">
                A minimal implementation using <IC>scipy.optimize.least_squares</IC> with parameter bounds:
              </p>
              <CodeBlock lang="python">{SVI_CODE}</CodeBlock>
              <p className="text-sm text-muted-foreground leading-[1.75]">
                Pre-compute <IC>w = IV^2 · T</IC> from market implied vols and <IC>k = log(K / F)</IC> from
                strikes and forward. Call <IC>fit_svi(k, w)</IC> to get the five parameters. Always inspect
                residuals — fitting to stale or low-liquidity strikes poisons the curve.
              </p>
            </section>

            <section>
              <SectionHeader number="05" title="INTERACTIVE TOOL" />
              <p className="text-sm text-muted-foreground leading-[1.75] mb-3">
                The live SVI calibration is at <Link to="/lab/options-analytics" className="text-primary hover:underline">
                /lab/options-analytics</Link>. The tool pulls real options chains, fits the SVI curve per expiry,
                and renders a residual heatmap so you can see where the fit is breaking down (typically deep OTM
                wings with stale quotes).
              </p>
              <Link to="/lab/options-analytics" className="border border-primary bg-primary text-primary-foreground px-4 py-3 font-mono text-[11px] tracking-widest hover:bg-primary/90 transition-colors inline-flex items-center gap-2">
                OPEN OPTIONS ANALYTICS <span>→</span>
              </Link>
            </section>

            <section>
              <p className="font-mono text-[9px] text-muted-foreground/60 tracking-widest mb-2">REFERENCES</p>
              <ul className="font-mono text-[11px] text-muted-foreground/80 space-y-1.5 leading-relaxed">
                <li>Gatheral, J. (2004). A Parsimonious Arbitrage-Free Implied Volatility Parameterization. Global Derivatives.</li>
                <li>Gatheral, J. &amp; Jacquier, A. (2014). Arbitrage-free SVI volatility surfaces. <em>Quantitative Finance</em>, 14(1).</li>
                <li>Lee, R. (2004). The moment formula for implied volatility at extreme strikes. <em>Mathematical Finance</em>, 14(3).</li>
              </ul>
            </section>
          </div>
        </article>
      </div>
    </>
  );
}
