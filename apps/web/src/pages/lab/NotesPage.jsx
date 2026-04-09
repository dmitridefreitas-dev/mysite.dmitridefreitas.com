import React, { useState } from 'react';
import { Helmet } from 'react-helmet';
import { motion, AnimatePresence } from 'framer-motion';
import { ExternalLink } from 'lucide-react';
import { useReadingMode } from '@/contexts/ReadingModeContext.jsx';

const REFERENCES = [
  {
    id: 'momentum-1993',
    type: 'PAPER',
    authors: 'Jegadeesh, N. & Titman, S.',
    year: '1993',
    title: 'Returns to Buying Winners and Selling Losers: Implications for Stock Market Efficiency',
    venue: 'The Journal of Finance, Vol. 48, No. 1, pp. 65–91',
    tags: ['MOMENTUM', 'EQUITIES', 'MARKET EFFICIENCY'],
    summary: `Foundational paper establishing the momentum anomaly. Jegadeesh and Titman show that stocks with strong returns over the past 3–12 months continue to outperform over the next 3–12 months — contradicting the efficient market hypothesis.

The strategy: buy past winners, sell past losers (sorted on 6M or 12M prior return, skip most recent month). Annualized returns of ~12% above benchmark, not explained by CAPM beta.

Directly informs momentum factor (WML / UMD) in Carhart's 4-factor model and the Fama-French Data Library's Momentum Factor (Mom) construction.`,
    links: [
      { label: 'JSTOR [PAPER]', href: 'http://www.jstor.org/stable/2328882' },
      { label: 'PDF [LOCAL]', href: '/momentum.pdf' },
    ],
  },
  {
    id: 'french-data-library',
    type: 'DATA',
    authors: 'French, K.R.',
    year: 'Ongoing',
    title: 'Kenneth R. French — Data Library',
    venue: 'Tuck School of Business, Dartmouth College',
    tags: ['FAMA-FRENCH', 'FACTORS', 'DATA', 'PORTFOLIOS'],
    summary: `The canonical source for academic factor data. Provides downloadable returns for:

· Fama/French 3-Factor (Rm-Rf, SMB, HML) — monthly, weekly, daily
· Fama/French 5-Factor adds RMW (profitability) and CMA (investment)
· Momentum Factor (Mom) and reversal factors (ST Rev, LT Rev)
· Portfolio sorts: size × B/M, size × momentum, industry portfolios
· International and Developed Market equivalents

All data is updated monthly. Used as the benchmark factor source in virtually all empirical asset pricing research. Note: as of Jan 2025, data switched from CRSP Legacy (FIZ) to the new CIZ flat file format — monthly returns are now compounded daily returns with dividends reinvested on ex-dates (previously month-end reinvestment).`,
    links: [
      { label: 'DATA LIBRARY [SITE]', href: 'https://mba.tuck.dartmouth.edu/pages/faculty/ken.french/data_library.html' },
    ],
  },
  {
    id: 'damodaran-archive',
    type: 'DATA',
    authors: 'Damodaran, A.',
    year: 'Ongoing',
    title: 'Aswath Damodaran Data Archive',
    venue: 'Stern School of Business, New York University',
    tags: ['VALUATION', 'CORPORATE FINANCE', 'DATA'],
    summary: `Comprehensive data archive maintained by NYU Stern's Aswath Damodaran covering valuation inputs and corporate finance metrics across industries and geographies. Key datasets include:

· Industry-level betas (levered and unlevered), debt/equity ratios, tax rates
· Cost of capital by sector (WACC, cost of equity, cost of debt)
· EV multiples (EV/EBITDA, EV/Sales, P/E) by industry
· Historical equity risk premiums (ERP) and country risk premiums
· Dividend yields, payout ratios, and growth rates

Updated annually (January). Used heavily in DCF modeling, comparables analysis, and teaching corporate finance. Damodaran also publishes detailed model spreadsheets (DCF, DDM, FCFF) alongside the data.`,
    links: [
      { label: 'DATA ARCHIVE [SITE]', href: 'https://pages.stern.nyu.edu/~adamodar/New_Home_Page/data.html' },
    ],
  },
  {
    id: 'shiller-online-data',
    type: 'DATA',
    authors: 'Shiller, R.J.',
    year: 'Ongoing',
    title: 'Robert Shiller Online Data',
    venue: 'Yale University Department of Economics',
    tags: ['CAPE', 'MARKET HISTORY', 'MACRO', 'DATA'],
    summary: `Historical financial and macroeconomic dataset maintained by Nobel laureate Robert Shiller. Most widely cited for the CAPE ratio (Cyclically Adjusted Price-to-Earnings), also known as the Shiller P/E:

CAPE = Price / (10-year moving average of real earnings)

The dataset extends back to 1871 and includes monthly S&P 500 price, earnings, dividends, CPI, 10-year Treasury yields, and the CAPE ratio itself. Also contains housing price data (Case-Shiller Home Price Index) and the Irrational Exuberance dataset used in Shiller's book.

CAPE above long-run average (~17) is often cited as a signal of overvaluation; below as undervaluation — though the ratio can stay elevated for extended periods. Shiller's 2013 Nobel Prize was awarded alongside Fama and Hansen for empirical analysis of asset prices.`,
    links: [
      { label: 'ONLINE DATA [SITE]', href: 'http://www.econ.yale.edu/~shiller/data.htm' },
    ],
  },
  {
    id: 'fred-stlouisfed',
    type: 'DATA',
    authors: 'Federal Reserve Bank of St. Louis',
    year: 'Ongoing',
    title: 'FRED — Federal Reserve Economic Data',
    venue: 'Federal Reserve Bank of St. Louis',
    tags: ['MACRO', 'RATES', 'ECONOMIC DATA', 'FED'],
    summary: `The Federal Reserve's primary public database for macroeconomic and financial time series. Contains over 800,000 series from 100+ sources including:

· Interest rates: Fed Funds Rate, SOFR, Treasury yields (all maturities), TIPS
· Inflation: CPI, PCE, Core PCE, breakeven inflation rates
· Employment: unemployment rate, nonfarm payrolls, labor force participation
· GDP and output: real GDP, GDP deflator, industrial production
· Credit and financial conditions: credit spreads, bank lending, monetary aggregates (M2)
· Foreign exchange rates and international trade data

All data is freely accessible via web, API, or download. Indispensable for macro research, yield curve analysis, and factor construction requiring risk-free rates (e.g., T-bill series for Fama-French).`,
    links: [
      { label: 'FRED [SITE]', href: 'https://fred.stlouisfed.org/' },
    ],
  },
];

const NOTES = [
  {
    id: 'gbm-tails',
    title: 'Why GBM Underestimates Tail Risk',
    date: '2025-03',
    tags: ['STOCHASTIC', 'RISK', 'OPTIONS'],
    exec: `Geometric Brownian Motion assumes log-returns are normally distributed — but market returns exhibit excess kurtosis (fat tails) and negative skewness. This means GBM assigns near-zero probability to events that happen far more often in practice.

The practical consequence: Black-Scholes consistently misprices deep out-of-the-money options. The model undervalues tail protection, which is why the implied volatility "smile" exists — the market charges more for strikes far from the money than GBM would suggest.

The fix isn't trivial. Jump-diffusion models (Merton, Kou) add Poisson-distributed shocks. Stochastic volatility models (Heston, SABR) let volatility vary randomly. Each captures part of the picture, but no single model fully explains observed prices.`,
    quant: `GBM models log-returns as:
  d(ln S) = (μ − σ²/2)dt + σ dW

This implies log-returns are i.i.d. N((μ−σ²/2)dt, σ²dt) with excess kurtosis = 0.

Empirically, daily S&P 500 log-returns have excess kurtosis ≈ 6–20. The variance-gamma and NIG distributions fit better.

The implied vol smile is quantified by the skew ∂σ_impl/∂K < 0 for equities. Heston's ρ parameter captures this: with ρ = −0.7 the model generates a realistic left skew.

For risk management, underestimating kurtosis causes VaR breaches at rates exceeding the nominal confidence level. Basel III's Expected Shortfall (ES) at 97.5% was partly adopted to address this — ES is more sensitive to tail thickness than VaR.`,
  },

  {
    id: 'nelson-siegel',
    title: 'Nelson-Siegel: Parsing the Yield Curve',
    date: '2025-02',
    tags: ['FIXED INCOME', 'RATES', 'FITTING'],
    exec: `The yield curve is the single most watched signal in macro finance. When short-term rates exceed long-term rates (inversion), it has preceded every US recession since 1955 with a ~12-18 month lag.

Nelson-Siegel gives us a way to summarize the entire curve with three numbers: the long-run level (β₀), the slope or "steepness" (β₁), and the curvature or "hump" (β₂). This makes it easy to compare curves across time or to interpolate yields at any maturity.

Central banks use it for policy analysis. Asset managers use it to identify relative value along the curve — finding maturities that are "rich" or "cheap" relative to the fitted model.`,
    quant: `The Nelson-Siegel (1987) parametrization:

  y(m) = β₀ + β₁·[(1−e^(−m/λ))/(m/λ)] + β₂·[(1−e^(−m/λ))/(m/λ) − e^(−m/λ)]

Factor interpretations:
  β₀: level — long-run rate (lim_{m→∞} y(m) = β₀)
  β₁: slope — (y(0)−y(∞)), negative = normal upward slope
  β₂: curvature — loading peaks at m* = λ·log((β₀+β₂)/β₀)

Diebold-Li (2006) fixes λ = 0.0609 and treats β₀,β₁,β₂ as AR(1) factors for forecasting.

Fitting: for fixed λ, the model is linear in β₀,β₁,β₂ — solve via OLS: β = (X'X)⁻¹X'y. Optimal λ is found by grid search minimizing SSE over λ ∈ (0.01, 50).

Svensson (1994) adds a fourth term (β₃, second λ₂) for humped curves with multiple inflection points.`,
  },

  {
    id: 'var-illusion',
    title: 'The VaR Illusion',
    date: '2025-01',
    tags: ['RISK', 'REGULATION', 'STATISTICS'],
    exec: `Value-at-Risk tells you the maximum loss you should expect at a given confidence level on a normal day. It says nothing about how bad things get when that threshold is breached.

This is not a minor limitation. In the 2008 financial crisis, VaR models at major banks were flashing green right up until the collapse — because models were calibrated on pre-crisis data and assumed normal distributions. The tails, where real losses lived, were treated as negligible.

After the crisis, regulators moved toward Expected Shortfall (ES), also called CVaR — the average loss conditional on exceeding VaR. ES is coherent (satisfies subadditivity), while VaR is not. Basel III/IV now mandates ES at 97.5% for internal models.`,
    quant: `VaR at confidence level α:
  VaR_α = −inf{l : P(L > l) ≤ 1−α} = F_L^{−1}(α)

Expected Shortfall:
  ES_α = E[L | L > VaR_α] = (1/(1−α)) · ∫_{VaR_α}^{∞} l·f_L(l) dl

Key failure modes:
1. Non-subadditivity: VaR(A+B) can exceed VaR(A)+VaR(B) for non-elliptical distributions.
2. Elliptical assumption: Parametric VaR = μ − z_α·σ only holds under elliptical distributions.
3. Volatility clustering: constant σ understates risk in stress periods. GARCH-VaR fixes this.

Kupiec LR test for coverage:
  LR = 2[n·log(n/T) + (T−n)·log(1−n/T) − n·log(α) − (T−n)·log(1−α)] ~ χ²(1)
where n = observed breaches, T = total days.`,
  },

  {
    id: 'heston',
    title: 'Heston Stochastic Volatility',
    date: '2024-12',
    tags: ['OPTIONS', 'VOL', 'DERIVATIVES'],
    exec: `Black-Scholes assumes volatility is constant. It isn't — volatility clusters, mean-reverts, and is negatively correlated with price. The "volatility smile" (implied vols rising for far OTM/ITM strikes) is Black-Scholes' visible failure.

Heston (1993) fixed this by making volatility itself a stochastic process. Two key innovations: volatility follows a mean-reverting CIR process (stays non-negative), and the correlation ρ between price and vol shocks captures the leverage effect.

Heston explains the volatility skew in equity options and has a semi-closed-form solution via characteristic functions — making it fast to calibrate. It's the baseline stochastic vol model at most derivatives desks.`,
    quant: `Heston dynamics under risk-neutral measure Q:

  dS = rS dt + √v·S dW₁^Q
  dv = κ(θ−v)dt + ξ√v dW₂^Q,  dW₁·dW₂ = ρ dt

Feller condition: 2κθ > ξ² guarantees v(t) > 0 a.s.

The Heston call price:  C = S·P₁ − Ke^{−rT}·P₂

where P₁, P₂ are computed via Fourier inversion of the characteristic function:
  φ(u) = exp(C(u,T)·θ + D(u,T)·v₀ + iux)

C, D satisfy Riccati ODEs. Gil-Pelaez inversion:
  Pⱼ = 1/2 + (1/π)·∫₀^∞ Re[e^{−iu·ln(K)}·φⱼ(u)/u] du

For simulation, use the Andersen (2008) QE scheme to handle the zero boundary of the variance process.`,
  },

  {
    id: 'black-scholes',
    title: 'Black-Scholes: Derivation and Assumptions',
    date: '2024-11',
    tags: ['OPTIONS', 'PRICING', 'HEDGING'],
    exec: `The Black-Scholes formula (1973) gives the fair price of a European option by constructing a portfolio of the stock and a risk-free bond that perfectly replicates the option payoff — a delta-hedged portfolio. The key insight: if you can hedge perfectly, the option's expected return doesn't matter.

The formula prices options based on five inputs: current stock price, strike, time to expiry, risk-free rate, and volatility. Of these, only volatility is unobservable — which is why "implied volatility" (backing out σ from market prices) became the central language of options markets.

Despite its assumptions (no dividends, constant vol, no jumps, continuous trading), Black-Scholes remains the benchmark. Every deviation from it tells you something about what the market thinks is missing from the model.`,
    quant: `Starting from GBM: dS = μS dt + σS dW

Construct portfolio: Π = V − ΔS where V = option value, Δ = ∂V/∂S.

By Ito's lemma: dV = (∂V/∂t + μS·∂V/∂S + σ²S²/2·∂²V/∂S²)dt + σS·∂V/∂S·dW

Set Δ = ∂V/∂S to eliminate dW. The resulting portfolio is riskless:
  dΠ = r·Π·dt  →  ∂V/∂t + rS·∂V/∂S + σ²S²/2·∂²V/∂S² − rV = 0

This PDE has the closed-form solution:
  C = S·N(d₁) − Ke^{−rT}·N(d₂)
  d₁ = [ln(S/K) + (r + σ²/2)T] / (σ√T)
  d₂ = d₁ − σ√T

Critical assumptions: log-normal prices, constant σ, continuous trading, no transaction costs, no dividends, European exercise only. Each assumption that's violated in practice creates a systematic mispricing.`,
  },

  {
    id: 'kelly',
    title: 'Kelly Criterion: Optimal Bet Sizing',
    date: '2024-10',
    tags: ['PORTFOLIO', 'RISK', 'BETTING'],
    exec: `The Kelly Criterion answers a fundamental question: given a bet with known edge, how much of your bankroll should you wager to maximize long-run wealth? The answer — bet the fraction equal to your edge divided by the odds — sounds simple but has profound implications for trading.

Betting more than Kelly is worse than betting less. Over-betting leads to ruin even if every individual bet has positive expected value. This is a key insight: expected value maximization and long-run wealth maximization are not the same objective.

In practice, traders use "fractional Kelly" (betting half or quarter Kelly) to reduce variance at the cost of slightly slower growth — a practical tradeoff that acknowledges that edge estimates are imprecise.`,
    quant: `For a binary bet: win probability p, lose probability q=1−p, odds b:1.

Kelly fraction: f* = (bp − q) / b = p − q/b = edge/odds

For continuous returns with mean μ and variance σ²:
  f* = μ / σ²  (single asset)

Multi-asset: f* = Σ⁻¹·μ (inverse covariance matrix times expected returns)

Key properties:
  • E[log(W_T)] is maximized at f = f*
  • Any f > 2f* has negative expected log return (ruin territory)
  • Half-Kelly: reduces variance by 75%, reduces geometric growth by only 25%

Connection to Sharpe Ratio: f* = SR / σ where SR = μ/σ.

In practice: estimate μ and σ from historical data, apply a conservatism discount (e.g., 0.25f* to 0.5f*) to account for estimation error and fat tails.`,
  },

  {
    id: 'duration-convexity',
    title: 'Duration, Convexity, and Bond Math',
    date: '2024-09',
    tags: ['FIXED INCOME', 'RATES', 'RISK'],
    exec: `Duration measures a bond's sensitivity to interest rate changes — roughly, the percentage change in price for a 1% change in yield. A bond with duration 7 loses about 7% of its value if yields rise by 1%.

But duration is a linear approximation. For large yield moves, the price-yield relationship is curved (convex), and duration alone underestimates the price increase from a yield drop and overestimates the price decline from a yield rise. Convexity corrects for this curvature.

For portfolio managers, duration is the primary tool for managing interest rate risk. A pension fund matching liabilities uses duration matching. A hedge fund with a rates view takes on duration exposure. Understanding convexity is critical for options on bonds and mortgage-backed securities.`,
    quant: `Bond price: P = Σ Cᵢ/(1+y)^tᵢ  (sum of discounted cash flows)

Macaulay Duration: D = Σ tᵢ · [Cᵢ/(1+y)^tᵢ] / P  (weighted average time)

Modified Duration: D_mod = D/(1+y)  →  ΔP/P ≈ −D_mod · Δy

Convexity: C = (1/P) · Σ tᵢ(tᵢ+1) · [Cᵢ/(1+y)^(tᵢ+2)]

Second-order price approximation:
  ΔP/P ≈ −D_mod·Δy + (1/2)·C·(Δy)²

Dollar Duration (DV01): DV01 = D_mod · P / 10000
  → P&L per 1bp move = DV01

For zero-coupon bonds: D = T, C = T(T+1)/(1+y)²
For perpetuities: D = (1+y)/y`,
  },

  {
    id: 'fama-french',
    title: 'Factor Models: From CAPM to Fama-French',
    date: '2024-08',
    tags: ['EQUITIES', 'PORTFOLIO', 'FACTOR'],
    exec: `CAPM says a stock's expected return is determined entirely by its sensitivity (beta) to the market portfolio. It's elegant but empirically wrong — for decades, small-cap stocks and value stocks have outperformed predictions.

Fama and French (1993) added two more factors: size (small-cap minus large-cap returns) and value (high book-to-market minus low). Their three-factor model explained most of the cross-sectional variation in returns that CAPM missed.

Since then, factor models have expanded significantly. Carhart (1997) added momentum. Fama-French (2015) added profitability and investment factors. Today, quant funds build on hundreds of factors, though with each added factor comes the risk of overfitting historical data.`,
    quant: `CAPM: E[Rᵢ] − Rf = βᵢ·(E[Rm] − Rf)

Fama-French 3-Factor:
  E[Rᵢ] − Rf = βᵢ·MKT + sᵢ·SMB + hᵢ·HML

where:
  MKT = market excess return
  SMB = Small Minus Big (size premium, ~2% ann. historically)
  HML = High Minus Low book-to-market (value premium, ~4% ann.)

Carhart 4-Factor adds:
  WML = Winners Minus Losers (momentum, 12M−1M return)

Fama-French 5-Factor adds:
  RMW = Robust Minus Weak (profitability)
  CMA = Conservative Minus Aggressive (investment)

Testing: run time-series regression Rᵢ−Rf = α + β₁·F₁ + ... + ε
  α (Jensen's alpha) = abnormal return unexplained by factors
  Null hypothesis: α = 0 (no skill / no mispricing)

Arbitrage Pricing Theory (APT) provides the theoretical foundation: any factor that carries a risk premium must be a systematic, undiversifiable source of risk.`,
  },

  {
    id: 'binomial-tree',
    title: 'Binomial Option Pricing',
    date: '2024-07',
    tags: ['OPTIONS', 'PRICING', 'TREES'],
    exec: `The binomial model builds a tree of possible stock price paths and works backwards from expiry to price an option today. At each node the stock either goes up by factor u or down by factor d. The option price at each node is the discounted expected value under the risk-neutral probability.

Its key advantage over Black-Scholes: it can handle American options (early exercise) simply by comparing the hold value to the exercise value at every node. Black-Scholes has no closed form for American options (except American calls on non-dividend-paying stocks).

As the number of steps increases, the binomial price converges to the Black-Scholes price. This makes it both a practical tool and a pedagogical bridge to continuous-time pricing.`,
    quant: `Cox-Ross-Rubinstein (CRR) parametrization:
  u = exp(σ√dt),  d = 1/u = exp(−σ√dt)
  Risk-neutral probability: p = (exp(r·dt) − d)/(u − d)

At expiry node (i up-moves, n−i down-moves):
  S = S₀·u^i·d^(n−i)
  C_node = max(S − K, 0)  [call],  P_node = max(K − S, 0)  [put]

Backward induction:
  V_node = exp(−r·dt)·[p·V_up + (1−p)·V_down]

For American options, compare to early exercise at each node:
  V_node = max(exp(−r·dt)·[p·V_up + (1−p)·V_down], intrinsic value)

Convergence: as n→∞, u→1, d→1, p→1/2, and the binomial tree converges to GBM. The CRR price converges to Black-Scholes with oscillations; smoother convergence via Leisen-Reimer or trinomial trees.

Greeks from the tree:
  Δ = (V_u − V_d)/(S₀u − S₀d)
  Γ = (Δ_u − Δ_d)/[0.5(S₀u² − S₀d²)]`,
  },

  {
    id: 'ml-finance',
    title: 'Machine Learning in Quantitative Finance',
    date: '2024-06',
    tags: ['ML', 'ALPHA', 'SIGNALS'],
    exec: `Machine learning has become central to quantitative finance, but the financial application comes with unique challenges. Financial data is noisy, non-stationary, and low signal-to-noise — a model that backtests brilliantly may be fitting noise rather than signal.

The most successful ML applications have been in areas where data is rich: execution optimization (minimizing market impact), options pricing (interpolating vol surfaces), credit scoring, and NLP for sentiment analysis. Alpha generation from price/fundamental data remains harder.

The key discipline: rigorous out-of-sample testing, walk-forward validation, and always asking "does this factor have an economic explanation?" A model that works for no good reason is probably overfitting.`,
    quant: `Core ML approaches in finance:

1. LASSO/Ridge Regression: factor selection and regularization for high-dimensional return prediction. LASSO performs feature selection (sparse β); Ridge shrinks all coefficients.
  β* = argmin ||y − Xβ||² + λ||β||₁  (LASSO)

2. Random Forests / Gradient Boosting (XGBoost): non-linear factor interactions for cross-sectional return prediction. Key: feature importance ≠ causation.

3. LSTM / Transformer models: sequence modeling for time series. Effective for regime detection and vol forecasting; data-hungry and prone to overfitting on short financial series.

4. Reinforcement Learning: optimal execution (Almgren-Chriss framework extended), market making, and portfolio rebalancing under transaction costs.

5. NLP (FinBERT, GPT): earnings call sentiment, 10-K/10-Q analysis, news impact on prices.

Critical pitfalls:
  • Look-ahead bias: using future data in feature construction
  • Survivorship bias: training only on currently-existing companies
  • Multiple testing: with enough features, some will spuriously predict returns
  • Turnover: ML signals often require high turnover → transaction costs matter`,
  },
];

export default function NotesPage() {
  const { isTechnicalMode } = useReadingMode();
  const [selected, setSelected] = useState(null);
  const [selectedRef, setSelectedRef] = useState(null);

  return (
    <>
      <Helmet><title>DDF·LAB — Notes</title></Helmet>

      <div className="min-h-screen px-4 sm:px-6 lg:px-8 py-8">
        <div className="max-w-4xl mx-auto">

          <div className="mb-6 border-b border-border pb-4">
            <p className="font-mono text-[9px] text-primary tracking-widest mb-1">[7] TECHNICAL NOTES</p>
            <h1 className="font-mono text-xl font-bold tracking-tight text-foreground">Research Notes</h1>
            <p className="font-mono text-[10px] text-muted-foreground mt-1">
              10 notes · 2 references · press <span className="text-primary">V</span> to toggle EXEC ↔ QUANT ·
              current: <span className="text-primary">{isTechnicalMode ? 'QUANT' : 'EXEC'}</span>
            </p>
          </div>

          {/* References section */}
          <div id="references" className="mb-8">
            <p className="font-mono text-[9px] text-muted-foreground uppercase tracking-widest mb-3">
              RESEARCH REFERENCES
            </p>
            <div className="space-y-0 divide-y divide-border border border-border">
              {REFERENCES.map((ref) => {
                const refOpen = selectedRef === ref.id;
                return (
                  <div key={ref.id}>
                    <button
                      onClick={() => setSelectedRef(refOpen ? null : ref.id)}
                      className={`w-full text-left px-5 py-4 transition-colors ${refOpen ? 'bg-primary/5' : 'hover:bg-muted/30'}`}
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <div className="flex items-center flex-wrap gap-2 mb-1.5">
                            <span className="font-mono text-[8px] border border-border text-muted-foreground px-1 py-0.5">{ref.type}</span>
                            <span className="font-mono text-[8px] text-muted-foreground">{ref.year}</span>
                            {ref.tags.map(t => (
                              <span key={t} className="font-mono text-[7px] tracking-widest text-primary/60 border border-primary/30 px-1 py-0.5">
                                {t}
                              </span>
                            ))}
                          </div>
                          <h2 className={`font-mono text-sm font-bold tracking-wider transition-colors ${refOpen ? 'text-primary' : 'text-foreground'}`}>
                            {ref.title}
                          </h2>
                          <p className="font-mono text-[9px] text-muted-foreground mt-0.5">
                            {ref.authors} · {ref.venue}
                          </p>
                        </div>
                        <span className="font-mono text-[11px] text-muted-foreground shrink-0 mt-1 select-none">
                          {refOpen ? '▲' : '▼'}
                        </span>
                      </div>
                    </button>

                    <AnimatePresence initial={false}>
                      {refOpen && (
                        <motion.div
                          key="ref-content"
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.22, ease: 'easeInOut' }}
                          className="overflow-hidden"
                        >
                          <div className="px-5 py-5 border-t border-primary/20 bg-primary/3">
                            <pre className="font-mono text-[11px] text-foreground/90 leading-relaxed whitespace-pre-wrap mb-4">
                              {ref.summary}
                            </pre>
                            <div className="flex flex-wrap gap-3">
                              {ref.links.map((link) => (
                                <a
                                  key={link.href}
                                  href={link.href}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="font-mono text-[10px] text-primary hover:text-primary/80 tracking-widest flex items-center gap-1 transition-colors"
                                >
                                  {link.label}
                                  <ExternalLink className="w-2.5 h-2.5" />
                                </a>
                              ))}
                            </div>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="space-y-0 divide-y divide-border border border-border">
            {NOTES.map(note => {
              const isOpen = selected === note.id;
              const content = isTechnicalMode ? note.quant : note.exec;
              return (
                <div key={note.id}>
                  {/* Card header — always visible */}
                  <button
                    onClick={() => setSelected(isOpen ? null : note.id)}
                    className={`w-full text-left px-5 py-4 transition-colors ${
                      isOpen ? 'bg-primary/5' : 'hover:bg-muted/30'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <div className="flex items-center flex-wrap gap-2 mb-1.5">
                          <span className="font-mono text-[8px] text-muted-foreground">{note.date}</span>
                          {note.tags.map(t => (
                            <span key={t} className="font-mono text-[7px] tracking-widest text-primary/60 border border-primary/30 px-1 py-0.5">
                              {t}
                            </span>
                          ))}
                        </div>
                        <h2 className={`font-mono text-sm font-bold tracking-wider transition-colors ${
                          isOpen ? 'text-primary' : 'text-foreground'
                        }`}>
                          {note.title}
                        </h2>
                      </div>
                      <span className="font-mono text-[11px] text-muted-foreground shrink-0 mt-1 select-none">
                        {isOpen ? '▲' : '▼'}
                      </span>
                    </div>
                  </button>

                  {/* Inline expanded content */}
                  <AnimatePresence initial={false}>
                    {isOpen && (
                      <motion.div
                        key="content"
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.22, ease: 'easeInOut' }}
                        className="overflow-hidden"
                      >
                        <div className="px-5 py-5 border-t border-primary/20 bg-primary/3">
                          <div className="flex items-center justify-between mb-4">
                            <span className="font-mono text-[9px] border border-primary/50 text-primary px-2 py-0.5 tracking-widest">
                              {isTechnicalMode ? 'QUANT' : 'EXEC'}
                            </span>
                            <span className="font-mono text-[8px] text-muted-foreground">
                              toggle view with V
                            </span>
                          </div>
                          <pre className="font-mono text-[11px] text-foreground/90 leading-relaxed whitespace-pre-wrap">
                            {content}
                          </pre>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              );
            })}
          </div>

          <div className="mt-6 pt-4 border-t border-border">
            <p className="font-mono text-[8px] text-muted-foreground tracking-wider">
              10 NOTES · 2 REFERENCES · GBM · NELSON-SIEGEL · VAR · HESTON · BLACK-SCHOLES · KELLY · DURATION · FAMA-FRENCH · BINOMIAL TREES · ML IN FINANCE
            </p>
          </div>
        </div>
      </div>
    </>
  );
}
