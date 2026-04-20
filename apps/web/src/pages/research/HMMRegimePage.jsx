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

const HMM_CODE = `import numpy as np
import pandas as pd
from hmmlearn.hmm import GaussianHMM

def fit_regime_hmm(returns, n_states=2, seed=42):
    """Fit a Gaussian HMM to a returns series and decode the Viterbi path."""
    X = np.asarray(returns).reshape(-1, 1)

    model = GaussianHMM(
        n_components=n_states,
        covariance_type='full',
        n_iter=500,
        random_state=seed,
        tol=1e-4,
    )
    model.fit(X)

    hidden_states = model.predict(X)        # Viterbi
    posteriors    = model.predict_proba(X)  # forward-backward

    # Order states by mean return so state 0 = bear, state N-1 = bull
    order = np.argsort(model.means_.flatten())
    relabel = {old: new for new, old in enumerate(order)}
    hidden  = np.array([relabel[s] for s in hidden_states])

    return {
        'states'     : hidden,
        'posteriors' : posteriors[:, order],
        'means'      : model.means_.flatten()[order],
        'covars'     : np.sqrt(model.covars_.flatten()[order]),
        'trans_mat'  : model.transmat_[np.ix_(order, order)],
    }`;

export default function HMMRegimePage() {
  return (
    <>
      <Helmet>
        <title>Hidden Markov Model Regime Detection for Equity Markets — Dmitri De Freitas</title>
        <meta name="description" content="HMM regime detection for equity returns — Baum-Welch EM training, Viterbi decoding, and hmmlearn Python implementation. Bull and bear state inference with transition matrix interpretation." />
        <meta name="keywords" content="HMM regime detection python, hidden markov model equity, baum-welch, viterbi, hmmlearn, regime switching" />
        <link rel="canonical"    href="https://findmitridefreitas.com/research/hmm-regime-detection" />
        <meta property="og:url"         content="https://findmitridefreitas.com/research/hmm-regime-detection" />
        <meta property="og:title"       content="Hidden Markov Model Regime Detection for Equity Markets" />
        <meta property="og:description" content="Bull/bear regime inference for equity markets via Gaussian HMM — Baum-Welch EM and Viterbi decoding in Python." />
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
              {['REGIMES', 'ML', 'PYTHON'].map((t) => (
                <span key={t} className="font-mono text-[8px] tracking-widest text-primary/70 border border-primary/30 px-1.5 py-0.5">{t}</span>
              ))}
            </div>
            <h1 className="font-mono text-2xl md:text-4xl font-bold tracking-tight text-foreground leading-tight mb-3">
              Hidden Markov Model Regime Detection for Equity Markets
            </h1>
            <div className="flex items-center gap-3 font-mono text-[10px] text-muted-foreground">
              <span>DMITRI DE FREITAS</span>
              <span className="text-muted-foreground/40">·</span>
              <span>APRIL 2026</span>
              <span className="text-muted-foreground/40">·</span>
              <span>11 MIN READ</span>
            </div>
          </div>
        </section>

        <article className="py-10">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-3xl space-y-10">

            <section>
              <p className="font-mono text-[9px] text-muted-foreground/60 tracking-widest mb-2">ABSTRACT</p>
              <p className="text-sm text-muted-foreground leading-[1.75] border-l-2 border-primary/50 pl-4">
                Financial returns are heteroskedastic and regime-dependent: a five-year bull regime with 12%
                vol is structurally different from a six-month crisis with 45% vol. Hidden Markov Models
                formalise this intuition, inferring a latent discrete state from observed returns. This note
                covers the model, the Baum-Welch EM fit, and Viterbi decoding. The live implementation is at{' '}
                <Link to="/lab/regimes" className="text-primary hover:underline">/lab/regimes</Link>.
              </p>
            </section>

            <section>
              <SectionHeader number="01" title="WHY REGIME DETECTION" />
              <div className="space-y-4 text-sm text-muted-foreground leading-[1.75]">
                <p>
                  Two arguments justify the extra machinery. First, <strong className="text-foreground">risk
                  management</strong>: volatility clusters. Correctly identifying the current regime lets you
                  scale positions down ahead of realised drawdowns rather than after. Second, <strong className="text-foreground">
                  crisis alpha</strong>: some strategies (trend following, long vol) earn their keep specifically
                  in bear regimes. Knowing when you are in one is the entire game.
                </p>
                <p>
                  HMM is the simplest model that captures regime persistence without requiring continuous latent
                  dynamics. It&apos;s also robust — few parameters, EM converges reliably, and the posterior
                  gives you a probability distribution over states rather than a binary label.
                </p>
              </div>
            </section>

            <section>
              <SectionHeader number="02" title="HMM SETUP" />
              <div className="space-y-4 text-sm text-muted-foreground leading-[1.75]">
                <p>
                  A Hidden Markov Model has three components:
                </p>
                <ul className="list-none space-y-1.5 pl-4 border-l border-border">
                  <li><IC>S = &#123;s_1, ..., s_N&#125;</IC> — discrete latent states (e.g. bull, bear)</li>
                  <li><IC>A = [a_ij]</IC> — <IC>N x N</IC> transition matrix; <IC>a_ij = P(s_t = j | s_&#123;t-1&#125; = i)</IC></li>
                  <li><IC>pi</IC> — initial state distribution</li>
                  <li><IC>p(x_t | s_t)</IC> — emission distribution (Gaussian with state-specific mean and variance)</li>
                </ul>
                <p>
                  For equity returns the emission <IC>p(r_t | s_t = j)</IC> is typically Gaussian with parameters
                  <IC> (mu_j, sigma_j)</IC>. A two-state model is sufficient for most applications: a bull state
                  with positive drift and low vol, and a bear state with near-zero drift and elevated vol. More
                  states introduce overfitting without clear interpretive gain.
                </p>
              </div>
            </section>

            <section>
              <SectionHeader number="03" title="BAUM-WELCH EM" />
              <div className="space-y-4 text-sm text-muted-foreground leading-[1.75]">
                <p>
                  Baum-Welch is the Expectation-Maximisation algorithm specialised to HMMs. It alternates between
                  computing the forward-backward posteriors and updating the parameters:
                </p>
                <ol className="list-decimal list-inside space-y-2 pl-2">
                  <li>
                    <strong className="text-foreground">E-step</strong> — compute{' '}
                    <IC>gamma_t(i) = P(s_t = i | x_&#123;1:T&#125;)</IC> via forward-backward recursion, and
                    <IC> xi_t(i, j) = P(s_t = i, s_&#123;t+1&#125; = j | x_&#123;1:T&#125;)</IC>.
                  </li>
                  <li>
                    <strong className="text-foreground">M-step</strong> — update <IC>pi</IC>, <IC>A</IC>, and the
                    emission parameters by maximum likelihood given the posteriors from the E-step.
                  </li>
                </ol>
                <p>
                  Iterate to convergence (log-likelihood stops improving). The algorithm is guaranteed to
                  monotonically increase the incomplete-data likelihood but may land in a local optimum — run
                  multiple random restarts and keep the best.
                </p>
              </div>
            </section>

            <section>
              <SectionHeader number="04" title="PYTHON IMPLEMENTATION" />
              <p className="text-sm text-muted-foreground leading-[1.75] mb-2">
                <IC>hmmlearn</IC> wraps the Baum-Welch and Viterbi algorithms with a clean sklearn-style API.
                Post-fit, relabel the states so state 0 is always the lowest-mean (bear) — EM randomises them.
              </p>
              <CodeBlock lang="python">{HMM_CODE}</CodeBlock>
            </section>

            <section>
              <SectionHeader number="05" title="VITERBI DECODING" />
              <div className="space-y-4 text-sm text-muted-foreground leading-[1.75]">
                <p>
                  Viterbi returns the single most-likely state sequence given the observed data — the path that
                  maximises <IC>P(s_&#123;1:T&#125; | x_&#123;1:T&#125;)</IC>. It is <em>different</em> from the
                  pointwise posterior (which gives the most-likely state at each individual time). For an equity
                  regime signal you usually want the posterior probability{' '}
                  <IC>P(s_t = bear | x_&#123;1:t&#125;)</IC>, computed via the forward filter — this uses only
                  past data and is causal.
                </p>
                <p>
                  Interpretation is straightforward: if the filtered probability of the bear regime exceeds some
                  threshold (say 0.7), reduce exposure; if it drops below 0.3, add back. The hysteresis prevents
                  whipsaw around the 0.5 boundary.
                </p>
                <p>
                  The transition matrix itself carries information. If the bear-state self-transition probability
                  is 0.97, the expected regime duration is <IC>1 / (1 - 0.97) ≈ 33</IC> periods. This grounds
                  position-sizing in a realistic timescale rather than a weekly recalibration.
                </p>
              </div>
            </section>

            <section>
              <SectionHeader number="06" title="INTERACTIVE TOOL" />
              <p className="text-sm text-muted-foreground leading-[1.75] mb-3">
                The live HMM tool at <Link to="/lab/regimes" className="text-primary hover:underline">/lab/regimes</Link>{' '}
                fits a two-state Gaussian HMM on SPY daily returns and overlays the inferred regime on the price
                series. The transition matrix, state means, and stationary distribution are reported alongside.
                A CUSUM structural-break detector is included as a non-parametric alternative.
              </p>
              <Link to="/lab/regimes" className="border border-primary bg-primary text-primary-foreground px-4 py-3 font-mono text-[11px] tracking-widest hover:bg-primary/90 transition-colors inline-flex items-center gap-2">
                OPEN REGIME DETECTION <span>→</span>
              </Link>
            </section>

            <section>
              <p className="font-mono text-[9px] text-muted-foreground/60 tracking-widest mb-2">REFERENCES</p>
              <ul className="font-mono text-[11px] text-muted-foreground/80 space-y-1.5 leading-relaxed">
                <li>Rabiner, L. R. (1989). A tutorial on hidden Markov models and selected applications in speech recognition. <em>Proceedings of the IEEE</em>, 77(2).</li>
                <li>Hamilton, J. D. (1989). A new approach to the economic analysis of nonstationary time series and the business cycle. <em>Econometrica</em>, 57(2).</li>
                <li>Ang, A. &amp; Bekaert, G. (2002). International asset allocation with regime shifts. <em>Review of Financial Studies</em>, 15(4).</li>
              </ul>
            </section>
          </div>
        </article>
      </div>
    </>
  );
}
