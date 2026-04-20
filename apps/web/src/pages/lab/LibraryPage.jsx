import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Helmet } from 'react-helmet';
import { motion, AnimatePresence } from 'framer-motion';

/* ─── Original Research Notes (10) ─────────────────────────────── */
const BOOKS = [
  {
    id: 'gbm-tails', spine: 'GBM & TAIL RISK', date: '2025-03', tags: ['STOCHASTIC', 'RISK', 'OPTIONS'],
    color: '#8B2500', accent: '#ff6b35', label: 'GBM', lean: 0,
    exec: `GBM assumes log-returns are normally distributed — but markets exhibit fat tails and negative skewness. Black-Scholes consistently misprices OTM options as a result. Jump-diffusion (Merton) and stochastic-vol (Heston) models partially fix this, but no single model fully explains observed prices.`,
    quant: `d(ln S) = (μ−σ²/2)dt + σ dW\n\nEmpirical S&P 500 kurtosis ≈ 6–20 vs GBM kurtosis = 0.\nImplied vol skew: ∂σ_impl/∂K < 0 for equities.\nHeston ρ = −0.7 reproduces the left skew.\nBasel III ES at 97.5% adopted specifically because VaR underweights tails.`
  },

  {
    id: 'nelson-siegel', spine: 'NELSON-SIEGEL', date: '2025-02', tags: ['FIXED INCOME', 'RATES', 'FITTING'],
    color: '#0a3d62', accent: '#4fc3f7', label: 'NS', lean: 0,
    exec: `The yield curve is the number one macro signal — every US recession since 1955 was preceded by an inversion with a 12–18 month lag. Nelson-Siegel parameterises the whole curve with three numbers: level β₀, slope β₁, curvature β₂, making cross-era comparisons and interpolation tractable.`,
    quant: `y(m) = β₀ + β₁·[(1−e^(−m/λ))/(m/λ)] + β₂·[(1−e^(−m/λ))/(m/λ) − e^(−m/λ)]\n\nDiebold-Li (2006): fix λ = 0.0609, treat β as AR(1) factors.\nFitting: OLS for fixed λ; grid-search λ to minimise SSE.\nSvensson (1994) adds β₃ for double-humped curves.`
  },

  {
    id: 'var-illusion', spine: 'THE VAR ILLUSION', date: '2025-01', tags: ['RISK', 'REGULATION', 'STATISTICS'],
    color: '#2d0050', accent: '#ce93d8', label: 'VaR', lean: 0,
    exec: `VaR shows the worst loss on a normal day — but says nothing about what happens beyond that threshold. In 2008, VaR models were flashing green until the collapse because they assumed normal distributions. The tails, where real losses lived, were treated as negligible.`,
    quant: `VaR_α = F_L^{−1}(α)\nES_α = E[L | L > VaR_α] = (1/(1−α))·∫ l·f_L dl\n\nVaR is non-subadditive under non-elliptical distributions.\nBasel III/IV: ES at 97.5% for internal models.\nKupiec LR test ~ χ²(1) checks realized coverage.`
  },

  {
    id: 'heston', spine: 'HESTON SV MODEL', date: '2024-12', tags: ['OPTIONS', 'VOL', 'DERIVATIVES'],
    color: '#003d00', accent: '#66bb6a', label: 'HES', lean: -9,
    exec: `Heston makes volatility itself stochastic — it mean-reverts (CIR process) and correlates negatively with price, reproducing the volatility smile. Semi-closed-form solution via characteristic functions makes calibration fast. It's the baseline stochastic vol model at most derivatives desks.`,
    quant: `dS = rS dt + √v·S dW₁\ndv = κ(θ−v)dt + ξ√v dW₂,  dW₁·dW₂ = ρ dt\n\nFeller condition: 2κθ > ξ² → v(t) ≥ 0 a.s.\nCall: C = S·P₁ − Ke^{−rT}·P₂ (Fourier inversion)\nSimulation: Andersen QE scheme handles zero boundary.`
  },

  {
    id: 'black-scholes', spine: 'BLACK-SCHOLES', date: '2024-11', tags: ['OPTIONS', 'PRICING', 'HEDGING'],
    color: '#4a2800', accent: '#ffb74d', label: 'B-S', lean: 0,
    exec: `Black-Scholes prices a European option by constructing a delta-hedged replicating portfolio. Only volatility is unobservable — so "implied volatility" became the universal language of options markets. Every deviation from the model tells you something the market thinks the model misses.`,
    quant: `∂V/∂t + rS·∂V/∂S + σ²S²/2·∂²V/∂S² − rV = 0\n\nC = S·N(d₁) − Ke^{−rT}·N(d₂)\nd₁ = [ln(S/K) + (r + σ²/2)T] / (σ√T)\nd₂ = d₁ − σ√T`
  },

  {
    id: 'kelly', spine: 'KELLY CRITERION', date: '2024-10', tags: ['PORTFOLIO', 'RISK', 'BETTING'],
    color: '#5c3000', accent: '#ffa726', label: 'KEL', lean: 0,
    exec: `Kelly answers: how much of your bankroll to wager given a known edge? Over-betting wrecks you even with positive EV — this is the key insight that separates EV maximisation from long-run wealth maximisation. Fractional Kelly (½ or ¼) is the practitioner standard.`,
    quant: `f* = (bp − q)/b  (binary bet)\nf* = μ/σ²  (continuous returns, single asset)\nMulti-asset: f* = Σ⁻¹·μ\n\nHalf-Kelly: −75% variance, only −25% geometric growth.\nf > 2f* → negative expected log-return (ruin territory).`
  },

  {
    id: 'duration-convexity', spine: 'DURATION & CONVEXITY', date: '2024-09', tags: ['FIXED INCOME', 'RATES', 'RISK'],
    color: '#1a3a4a', accent: '#4dd0e1', label: 'DUR', lean: 0,
    exec: `Duration = % price change per 1% yield move. Convexity corrects for the curvature duration misses — for large moves, duration alone overestimates losses and underestimates gains. DV01 (dollar value of a basis point) is the trader's daily risk tool.`,
    quant: `D_mod = D/(1+y)  →  ΔP/P ≈ −D_mod·Δy + (1/2)·C·(Δy)²\nDV01 = D_mod · P / 10000\nZero-coupon: D = T,  C = T(T+1)/(1+y)²\nPerpetuity: D = (1+y)/y`
  },

  {
    id: 'fama-french', spine: 'FAMA-FRENCH FACTORS', date: '2024-08', tags: ['EQUITIES', 'PORTFOLIO', 'FACTOR'],
    color: '#2e0033', accent: '#ba68c8', label: 'FF3', lean: 0,
    exec: `CAPM explains returns with market beta alone — but small-caps and value stocks persistently beat predictions. Fama-French added SMB (size) and HML (value). Carhart added WML (momentum). Today quant funds run hundreds of factors, but each new one raises the overfitting risk.`,
    quant: `FF3: E[Rᵢ] − Rf = βᵢ·MKT + sᵢ·SMB + hᵢ·HML\nFF5 adds: RMW (profitability), CMA (investment)\nCarhart adds: WML = Winners Minus Losers\n\nAlpha α = abnormal return (null: α = 0)\nSMB ≈ 2% ann, HML ≈ 4% ann historically.`
  },

  {
    id: 'binomial-tree', spine: 'BINOMIAL TREES', date: '2024-07', tags: ['OPTIONS', 'PRICING', 'TREES'],
    color: '#1a2600', accent: '#aed581', label: 'BIN', lean: 0,
    exec: `The binomial model prices options by backward induction through a tree of up/down price moves. Its killer feature: handles American early exercise naturally. As steps → ∞ the binomial price converges to Black-Scholes, making it both a practical tool and a pedagogical bridge.`,
    quant: `CRR: u = exp(σ√dt),  d = 1/u\nRisk-neutral p = (exp(r·dt) − d) / (u − d)\nV = exp(−r·dt)·[p·V_u + (1−p)·V_d]\nAmerican: V = max(hold value, intrinsic) at each node.`
  },

  {
    id: 'ml-finance', spine: 'ML IN FINANCE', date: '2024-06', tags: ['ML', 'ALPHA', 'SIGNALS'],
    color: '#001a33', accent: '#42a5f5', label: 'ML', lean: 8,
    exec: `ML in finance faces noisy, non-stationary data with low signal-to-noise. Best use-cases: execution optimisation, vol surface interpolation, credit scoring, NLP sentiment. Pure alpha generation from price data remains hard and demands rigorous out-of-sample validation.`,
    quant: `LASSO: β* = argmin ||y−Xβ||² + λ||β||₁\nRandom Forest: ensemble of decorrelated trees.\nLSTM/Transformer: sequence modelling for regime/vol.\nRL: Almgren-Chriss optimal execution framework.\nPitfalls: look-ahead, survivorship, multiple testing.`
  },
];

/* ─── Original Data Sources & Papers (5) ───────────────────────── */
const REFS = [
  {
    id: 'momentum-1993', spine: 'JEGADEESH 1993', date: '1993', tags: ['MOMENTUM', 'EQUITIES'],
    color: '#3d2b1f', accent: '#d4a017', label: 'MOM', lean: 0,
    exec: `Foundational paper: stocks with strong 3–12 month returns continue to outperform for the next 3–12 months. Annualised alpha ≈ 12%, not explained by CAPM beta. Informed the WML/UMD momentum factor used in Carhart's 4-factor model.`,
    quant: `Strategy: sort on 6M prior return, skip last month.\nLong winners (top decile), short losers (bottom decile).\nAnnualised alpha ~12%, not explained by CAPM beta.\nInforms WML/UMD in Carhart 4-factor model.`,
    links: [{ label: 'JSTOR [PAPER]', href: 'http://www.jstor.org/stable/2328882' }]
  },

  {
    id: 'french-data-library', spine: 'FRENCH DATA LIB', date: 'Ongoing', tags: ['FACTORS', 'DATA'],
    color: '#1a2b1a', accent: '#81c784', label: 'FF', lean: 0,
    exec: `Canonical source for FF3/FF5, Momentum, and reversal factors. Updated monthly. Jan 2025 switched to CIZ flat file format — dividends now reinvested on ex-dates (previously month-end reinvestment).`,
    quant: `Factors: Rm-Rf, SMB, HML, RMW, CMA, Mom\nUpdated monthly. International and DM variants included.\nJan 2025: switched to CIZ flat file format.`,
    links: [{ label: 'DATA LIBRARY [SITE]', href: 'https://mba.tuck.dartmouth.edu/pages/faculty/ken.french/data_library.html' }]
  },

  {
    id: 'damodaran-archive', spine: 'DAMODARAN DATA', date: 'Ongoing', tags: ['VALUATION', 'DCF'],
    color: '#2b1a0d', accent: '#ffb74d', label: 'DAM', lean: 0,
    exec: `NYU Stern archive: industry betas, WACC, EV multiples, equity risk premiums, country risk premiums. Updated annually in January. Essential for DCF and comparables analysis.`,
    quant: `Includes: industry betas (levered/unlevered), WACC,\nEV multiples, ERP, country risk premiums.\nUpdated annually (January).`,
    links: [{ label: 'DATA ARCHIVE [SITE]', href: 'https://pages.stern.nyu.edu/~adamodar/New_Home_Page/data.html' }]
  },

  {
    id: 'shiller-online-data', spine: 'SHILLER CAPE', date: 'Ongoing', tags: ['MACRO', 'CAPE'],
    color: '#2b0d0d', accent: '#ef9a9a', label: 'CAPE', lean: -7,
    exec: `CAPE = Price / (10yr avg real earnings). Dataset back to 1871. Long-run average ≈ 17. Shiller won the 2013 Nobel alongside Fama and Hansen for empirical analysis of asset prices.`,
    quant: `Includes: S&P 500 prices, earnings, dividends,\nCPI, 10Y yields, CAPE ratio. Back to 1871.\nAlso: Case-Shiller Home Price Index.`,
    links: [{ label: 'ONLINE DATA [SITE]', href: 'http://www.econ.yale.edu/~shiller/data.htm' }]
  },

  {
    id: 'fred-stlouisfed', spine: 'FRED ECON DATA', date: 'Ongoing', tags: ['MACRO', 'RATES'],
    color: '#0d1a2b', accent: '#4fc3f7', label: 'FRED', lean: 0,
    exec: `Over 800,000 macro series: rates, inflation, employment, GDP, credit spreads, FX. Free API. Indispensable for yield curve analysis and risk-free rate construction in factor models.`,
    quant: `800k+ series: rates, inflation, employment,\nGDP, credit spreads, FX. Free API.\nT-bill series = standard Rf for Fama-French.`,
    links: [{ label: 'FRED [SITE]', href: 'https://fred.stlouisfed.org/' }]
  },
];

/* ─── New: Quant Data Vault (7) ────────────────────────────────── */
const DATA_VAULT = [
  {
    id: 'aqr-data', spine: 'AQR DATA LIBRARY', date: 'Ongoing', tags: ['FACTORS', 'MOMENTUM', 'GLOBAL'],
    color: '#003344', accent: '#29b6f6', label: 'AQR', lean: 0,
    exec: `AQR Capital Management's free public data library — factor datasets covering momentum, value, quality, and low-risk premia across global equities, bonds, and commodities. Direct CSV download, no gatekeeping. The same factor construction AQR uses in their published academic research.`,
    quant: `Free datasets: Momentum (TS & XS), Value,\nQuality Minus Junk (QMJ), Betting Against Beta (BAB),\nTime-Series Momentum (TSMOM), Carry.\nAll in CSV · updated monthly · global coverage.`,
    links: [{ label: 'AQR DATA LIBRARY [FREE]', href: 'https://www.aqr.com/Insights/Datasets' }]
  },

  {
    id: 'osap', spine: 'OPEN ASSET PRICING', date: 'Ongoing', tags: ['FACTORS', 'CROSS-SECTION', 'REPLICATION'],
    color: '#1a2200', accent: '#c5e1a5', label: 'OSAP', lean: 0,
    exec: `Open Source Asset Pricing (Chen & Zimmermann 2022) — a massive replication of 200+ cross-sectional return predictors from the literature. Every signal is constructed from CRSP/Compustat and released freely. The definitive resource for checking whether a factor survives out-of-sample.`,
    quant: `200+ firm characteristics: value, momentum,\nprofitability, investment, accrual anomalies.\nData: CRSP + Compustat · monthly · 1963-present.\nAll code open-source on GitHub (R/Python).`,
    links: [{ label: 'OPEN ASSET PRICING [SITE]', href: 'https://www.openassetpricing.com/' }]
  },

  {
    id: 'nber-data', spine: 'NBER WORKING PAPERS', date: 'Ongoing', tags: ['RESEARCH', 'MACRO', 'FINANCE'],
    color: '#220000', accent: '#ffcdd2', label: 'NBER', lean: 0,
    exec: `The National Bureau of Economic Research is where the most influential US economic papers land first — before journal publication. Working paper versions are free. If a paper is paywalled at a journal, the NBER version is almost always the same pre-publication draft.`,
    quant: `Free working papers: macro, finance, labor.\nSearch by author, JEL code, or keyword.\nTop series: w10792 (Diebold-Li), w4345 (FF).\nNew papers released every Monday at 8am ET.`,
    links: [{ label: 'NBER PAPERS [FREE]', href: 'https://www.nber.org/papers' }]
  },

  {
    id: 'bis-statistics', spine: 'BIS STATISTICS', date: 'Ongoing', tags: ['MACRO', 'CREDIT', 'GLOBAL'],
    color: '#001a33', accent: '#80cbc4', label: 'BIS', lean: 0,
    exec: `The Bank for International Settlements publishes the definitive global banking, credit, and derivatives statistics. Includes total credit to non-financial sectors, cross-border lending, OTC derivatives outstanding, and central bank policy rates. All free, downloadable as CSV.`,
    quant: `Key series: Global credit-to-GDP gaps,\nOTC derivatives (notional + gross market value),\nCross-border banking flows, CBR interest rates.\nUpdated quarterly. Back to 1980s for most series.`,
    links: [{ label: 'BIS STATISTICS [FREE]', href: 'https://www.bis.org/statistics/' }]
  },

  {
    id: 'nasdaq-data-link', spine: 'NASDAQ DATA LINK', date: 'Ongoing', tags: ['DATA', 'PRICES', 'API'],
    color: '#001122', accent: '#4fc3f7', label: 'NDL', lean: 0,
    exec: `Formerly Quandl — now Nasdaq Data Link. Free tier gives access to major financial and economic datasets including FRED, World Bank, and SEC data via a clean unified API. Essential for pulling historical prices, fundamentals, and macro data into Python or R without scraping.`,
    quant: `Free tier: FRED, World Bank, ODA, UN Data.\nAPI: Python (quandl / nasdaq-data-link library)\nimport nasdaqdatalink\ndf = nasdaqdatalink.get("FRED/DGS10")`,
    links: [{ label: 'NASDAQ DATA LINK [FREE TIER]', href: 'https://data.nasdaq.com/' }]
  },

  {
    id: 'atlanta-fed', spine: 'ATLANTA FED TOOLS', date: 'Ongoing', tags: ['MACRO', 'INFLATION', 'SHADOW RATE'],
    color: '#1a0a00', accent: '#ffab91', label: 'ATL', lean: 0,
    exec: `Atlanta Federal Reserve's research tools: the Wu-Xia Shadow Fed Funds Rate (effective rate when ZLB is binding), GDPNow real-time GDP tracker, and Underlying Inflation Dashboard (market-implied vs survey inflation expectations). The "smart money" read on monetary conditions.`,
    quant: `Shadow FFR: extends policy rate below ZLB.\nWu-Xia (2016): affine term structure model\nGDPNow: updated every data release, t-1 vintage.\nAll tools: free, updated in real time.`,
    links: [
      { label: 'WU-XIA SHADOW RATE [FREE]', href: 'https://www.atlantafed.org/cqer/research/wu-xia-shadow-federal-funds-rate' },
      { label: 'GDPNOW [FREE]', href: 'https://www.atlantafed.org/research/gdpnow' },
    ]
  },

  {
    id: 'world-bank-data', spine: 'WORLD BANK OPEN DATA', date: 'Ongoing', tags: ['MACRO', 'DEVELOPMENT', 'GLOBAL'],
    color: '#001a0d', accent: '#a5d6a7', label: 'WBK', lean: 9,
    exec: `World Bank Open Data: 17,000+ indicators for 200+ countries — GDP, poverty, health, education, financial development indices. Completely free API. Essential for cross-country factor studies and emerging market analysis where FRED has no coverage.`,
    quant: `API: https://api.worldbank.org/v2/\nimport wbgapi as wb\nwb.data.DataFrame("NY.GDP.MKTP.CD")\n\nKey indicators: GDP, FDI, financial depth,\ngini, school enrollment, life expectancy.`,
    links: [{ label: 'WORLD BANK DATA [FREE]', href: 'https://data.worldbank.org/' }]
  },
];

/* ─── New: Open Research & Dev Tools (7) ───────────────────────── */
const TOOLS = [
  {
    id: 'ssrn', spine: 'SSRN FINANCE', date: 'Ongoing', tags: ['RESEARCH', 'PREPRINTS', 'FINANCE'],
    color: '#1a1000', accent: '#ffe082', label: 'SSRN', lean: 0,
    exec: `Social Science Research Network — where hedge fund analysts go to see what's coming before it hits journals. Finance, economics, and law preprints, most downloadable for free with a free account. Search "factor investing," "machine learning finance," or "yield curve forecasting" to find cutting-edge working papers.`,
    quant: `Free with account (email only).\nSearch tips: filter by Date Posted, eJournal.\nTop finance network: FEN (Financial Economics).\nMost-downloaded ever: Fama-French factor papers.\nConference papers (AFA, WFA) often posted first.`,
    links: [{ label: 'SSRN FINANCE [FREE ACCOUNT]', href: 'https://www.ssrn.com/index.cfm/en/finance/' }]
  },

  {
    id: 'arxiv-qfin', spine: 'arXiv QUANT FINANCE', date: 'Ongoing', tags: ['MATH', 'STOCHASTIC', 'ML'],
    color: '#0a0022', accent: '#b39ddb', label: 'arXiv', lean: 0,
    exec: `The home of hard math in quantitative finance. arXiv q-fin hosts preprints on stochastic calculus, portfolio optimisation, market microstructure, and ML applications in finance — completely free, no account needed. The latest work on rough volatility, neural SDEs, and deep hedging lands here first.`,
    quant: `Sections: q-fin.CP (computation), q-fin.MF (math),\nq-fin.PM (portfolio), q-fin.TR (trading),\nq-fin.RM (risk), q-fin.ST (statistical finance).\nFree: browse, search, download PDF instantly.`,
    links: [{ label: 'arXiv Q-FIN [FREE]', href: 'https://arxiv.org/list/q-fin/recent' }]
  },

  {
    id: 'sec-edgar', spine: 'SEC EDGAR', date: 'Ongoing', tags: ['13F', 'FILINGS', 'INSIDER'],
    color: '#221100', accent: '#ffcc80', label: 'SEC', lean: 0,
    exec: `The SEC's EDGAR database has every 13F filing (quarterly institutional holdings), 10-K/10-Q financials, 8-K material events, and insider Form 4 transactions. All free, full-text searchable. 13-F data reveals what hedge funds owned with a 45-day lag — the "Insider Whisper" dataset.`,
    quant: `13-F filings: institutions >$100M AUM.\nFiled 45 days after quarter end.\nForm 4: insider buys/sells within 2 business days.\nFull-text search API: EDGAR EFTS.\nBulk download: SEC Financial Statement Dataset.`,
    links: [
      { label: 'EDGAR FULL-TEXT SEARCH [FREE]', href: 'https://efts.sec.gov/LATEST/search-index?q=%2213F%22&dateRange=custom&startdt=2024-01-01' },
      { label: 'EDGAR FILINGS [FREE]', href: 'https://www.sec.gov/cgi-bin/browse-edgar?action=getcompany&type=13F&dateb=&owner=include&count=40' },
    ]
  },

  {
    id: 'openbb', spine: 'OpenBB TERMINAL', date: 'Ongoing', tags: ['OPEN SOURCE', 'BLOOMBERG', 'SDK'],
    color: '#001a2a', accent: '#4fc3f7', label: 'OBB', lean: 0,
    exec: `OpenBB is the open-source Bloomberg Terminal — a Python SDK and CLI that pulls from 70+ free data providers (Yahoo Finance, FRED, SEC, Polygon, Alpha Vantage) into one unified interface. React/Next.js widgets available. The closest thing to a free Bloomberg for building your own research terminal.`,
    quant: `pip install openbb\nfrom openbb import obb\nobb.equity.price.historical("AAPL")\nobb.economy.fred_series("DGS10")\n\nProviders: yfinance, FRED, SEC, Polygon, FMP.\nFully open-source (Apache 2.0 licence).`,
    links: [
      { label: 'OPENBB GITHUB [FREE]', href: 'https://github.com/OpenBB-finance/OpenBBTerminal' },
      { label: 'OPENBB DOCS [FREE]', href: 'https://docs.openbb.co/' },
    ]
  },

  {
    id: 'quantlib', spine: 'QUANTLIB', date: 'Ongoing', tags: ['DERIVATIVES', 'PRICING', 'C++'],
    color: '#0a1a00', accent: '#a5d6a7', label: 'QL', lean: 0,
    exec: `QuantLib is the industry-standard open-source library for derivatives pricing and risk management in C++ with Python wrappers. Used by bank quants for yield curve bootstrapping, option pricing (Black-Scholes, Heston, Hull-White), and Monte Carlo simulation. The open-source alternative to proprietary pricing libraries.`,
    quant: `pip install QuantLib-Python\nimport QuantLib as ql\n\nEngines: Black-Scholes, Heston, Hull-White,\nBinomial, Monte Carlo, Finite Difference.\nYield curve: bootstrapping from market quotes.\nBenchmark: QuantLib vs Bloomberg within 0.01%.`,
    links: [
      { label: 'QUANTLIB [FREE]', href: 'https://www.quantlib.org/' },
      { label: 'PYPI PACKAGE', href: 'https://pypi.org/project/QuantLib/' },
    ]
  },

  {
    id: 'yfinance', spine: 'yfinance + pandas-dr', date: 'Ongoing', tags: ['PYTHON', 'PRICES', 'FREE API'],
    color: '#001100', accent: '#69f0ae', label: 'YF', lean: 0,
    exec: `yfinance wraps Yahoo Finance's unofficial API to pull OHLCV prices, dividends, splits, financials, options chains, and institutional holders for thousands of tickers. pandas-datareader adds Fama-French factors, FRED, and World Bank directly into DataFrames. The bread-and-butter combo for any Python quant workflow.`,
    quant: `pip install yfinance pandas-datareader\nimport yfinance as yf\nspy = yf.download("SPY", start="2000-01-01")\n\nimport pandas_datareader.data as web\nff = web.DataReader("F-F_Research_Data_Factors","famafrench")`,
    links: [
      { label: 'YFINANCE GITHUB [FREE]', href: 'https://github.com/ranaroussi/yfinance' },
      { label: 'PANDAS-DATAREADER [FREE]', href: 'https://pandas-datareader.readthedocs.io/' },
    ]
  },

  {
    id: 'imf-data', spine: 'IMF DATA PORTAL', date: 'Ongoing', tags: ['MACRO', 'GLOBAL', 'FX'],
    color: '#001a33', accent: '#90caf9', label: 'IMF', lean: 8,
    exec: `IMF's free data portal covering 190 countries: balance of payments, current account, FX reserves, government debt, inflation, and financial soundness indicators. The IMF eLibrary makes World Economic Outlook datasets fully downloadable. Essential for sovereign risk and EM macro analysis.`,
    quant: `Key datasets: WEO (World Economic Outlook),\nIFS (International Financial Statistics),\nGFSR (Global Financial Stability Report data),\nDOTS (Direction of Trade Statistics).\nAll free via bulk download or API.`,
    links: [{ label: 'IMF DATA [FREE]', href: 'https://www.imf.org/en/Data' }]
  },
];

const ALL_SHELVES = [
  { books: [...REFS, ...BOOKS.slice(0, 5)], label: 'DATA SOURCES · PAPERS · RESEARCH NOTES I' },
  { books: [...BOOKS.slice(5, 10), ...DATA_VAULT], label: 'RESEARCH NOTES II · QUANT DATA VAULT' },
  { books: TOOLS, label: 'OPEN RESEARCH · DEVELOPER TOOLS' },
];

const TOTAL = REFS.length + BOOKS.length + DATA_VAULT.length + TOOLS.length;

/* ─── Open Book Reader ──────────────────────────────────────────── */
function OpenBook({ book, onClose }) {
  const [quant, setQuant] = useState(false);
  useEffect(() => {
    const h = e => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'v' || e.key === 'V') setQuant(q => !q);
    };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [onClose]);

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      style={{
        position: 'fixed', inset: 0, zIndex: 200, display: 'flex', alignItems: 'center',
        justifyContent: 'center', background: 'rgba(4,2,0,0.93)', cursor: 'default'
      }}
      onClick={onClose}>
      <motion.div initial={{ scale: 0.87, rotateX: 14 }} animate={{ scale: 1, rotateX: 0 }}
        exit={{ scale: 0.87, opacity: 0 }}
        transition={{ type: 'spring', stiffness: 280, damping: 28 }}
        onClick={e => e.stopPropagation()}
        style={{
          display: 'flex', width: '88%', maxWidth: '900px', maxHeight: '83vh',
          background: '#150a03', border: `1px solid ${book.accent}44`,
          boxShadow: `0 0 80px ${book.accent}22, 0 40px 100px rgba(0,0,0,0.85)`,
          overflow: 'hidden'
        }}>
        <div style={{ width: 8, background: book.color, flexShrink: 0 }} />
        <div style={{
          flex: 1, padding: '36px 32px', overflowY: 'auto',
          background: 'linear-gradient(160deg,#1c0d04,#120703)'
        }}>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 12 }}>
            {book.tags.map(t => (
              <span key={t} style={{
                fontFamily: 'monospace', fontSize: 8, padding: '2px 6px',
                border: `1px solid ${book.accent}55`, color: book.accent, letterSpacing: '0.2em'
              }}>{t}</span>
            ))}
          </div>
          <h2 style={{
            fontFamily: 'monospace', fontSize: 20, color: '#f5e6c0', fontWeight: 'bold',
            marginBottom: 4, letterSpacing: '0.05em'
          }}>{book.spine}</h2>
          <p style={{
            fontFamily: 'monospace', fontSize: 9, color: 'rgba(245,230,192,0.4)',
            marginBottom: 28, letterSpacing: '0.2em'
          }}>{book.date}</p>
          <pre style={{
            fontFamily: 'monospace', fontSize: 12, color: 'rgba(245,230,192,0.82)',
            lineHeight: 1.85, whiteSpace: 'pre-wrap', margin: 0
          }}>
            {quant ? book.quant : book.exec}
          </pre>
          {book.links?.length > 0 && (
            <div style={{ marginTop: 28, paddingTop: 20, borderTop: `1px solid ${book.accent}33` }}>
              <p style={{
                fontFamily: 'monospace', fontSize: 9, color: 'rgba(200,160,80,0.5)',
                letterSpacing: '0.3em', marginBottom: 12
              }}>RESOURCES</p>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
                {book.links.map(link => (
                  <a key={link.href} href={link.href} target="_blank" rel="noopener noreferrer"
                    style={{
                      fontFamily: 'monospace', fontSize: 10, padding: '6px 14px',
                      border: `1px solid ${book.accent}66`, color: book.accent,
                      background: `${book.accent}10`, textDecoration: 'none',
                      letterSpacing: '0.14em', display: 'inline-flex', alignItems: 'center',
                      gap: 6, transition: 'all 0.15s'
                    }}
                    onMouseOver={e => { e.currentTarget.style.background = `${book.accent}28`; e.currentTarget.style.borderColor = book.accent; }}
                    onMouseOut={e => { e.currentTarget.style.background = `${book.accent}10`; e.currentTarget.style.borderColor = `${book.accent}66`; }}>
                    ↗ {link.label}
                  </a>
                ))}
              </div>
            </div>
          )}
        </div>
        <div style={{ width: 1, background: `linear-gradient(to bottom,transparent,${book.accent}44,transparent)`, flexShrink: 0 }} />
        <div style={{
          width: 230, padding: '36px 24px', display: 'flex', flexDirection: 'column',
          justifyContent: 'space-between', background: '#0e0602', flexShrink: 0
        }}>
          <div>
            <p style={{
              fontFamily: 'monospace', fontSize: 9, color: 'rgba(200,160,80,0.4)',
              letterSpacing: '0.3em', marginBottom: 20
            }}>CONTROLS</p>
            {[['V', 'Toggle SIMPLE ↔ QUANT'], ['ESC', 'Close book'], ['SCROLL', 'Browse shelves']].map(([k, v]) => (
              <div key={k} style={{ display: 'flex', gap: 10, marginBottom: 12, alignItems: 'center' }}>
                <span style={{
                  fontFamily: 'monospace', fontSize: 10, padding: '2px 8px',
                  border: '1px solid rgba(200,160,80,0.35)', color: '#c8a050',
                  minWidth: 38, textAlign: 'center', flexShrink: 0
                }}>{k}</span>
                <span style={{ fontFamily: 'monospace', fontSize: 10, color: 'rgba(245,230,192,0.4)' }}>{v}</span>
              </div>
            ))}
          </div>
          <div>
            <p style={{
              fontFamily: 'monospace', fontSize: 9, color: 'rgba(200,160,80,0.3)',
              letterSpacing: '0.2em', marginBottom: 10
            }}>MODE</p>
            <div style={{ display: 'flex', gap: 8 }}>
              {['SIMPLE', 'QUANT'].map(m => (
                <button key={m} onClick={() => setQuant(m === 'QUANT')}
                  style={{
                    fontFamily: 'monospace', fontSize: 9, padding: '5px 12px',
                    border: `1px solid ${(quant === (m === 'QUANT')) ? book.accent : 'rgba(200,160,80,0.2)'}`,
                    color: (quant === (m === 'QUANT')) ? book.accent : 'rgba(245,230,192,0.3)',
                    background: 'transparent', cursor: 'pointer', letterSpacing: '0.15em'
                  }}>
                  {m}
                </button>
              ))}
            </div>
            <button onClick={onClose}
              style={{
                marginTop: 20, fontFamily: 'monospace', fontSize: 10, padding: '8px 18px',
                border: '1px solid rgba(200,160,80,0.3)', color: '#c8a050',
                background: 'transparent', cursor: 'pointer', letterSpacing: '0.2em', display: 'block'
              }}>
              [CLOSE]
            </button>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}

/* ─── Book Spine ───────────────────────────────────────────────── */
const HEIGHTS = [158, 178, 164, 184, 170, 160, 180, 170, 162, 182, 154, 148, 168, 172, 175, 155, 165, 170];
const WIDTHS = [34, 30, 38, 33, 40, 32, 36, 35, 33, 39, 29, 26, 31, 29, 32, 37, 33, 35];

function BookSpine({ book, index, onSelect }) {
  const [hov, setHov] = useState(false);
  const h = HEIGHTS[index % HEIGHTS.length];
  const w = WIDTHS[index % WIDTHS.length];
  const lean = book.lean || 0;

  return (
    <motion.div
      onHoverStart={() => setHov(true)} onHoverEnd={() => setHov(false)}
      onClick={() => onSelect(book)}
      style={{ transformOrigin: 'bottom center', position: 'relative', flexShrink: 0 }}
      animate={{
        y: hov ? -18 : 0,
        rotate: lean,
        boxShadow: hov
          ? `0 22px 42px rgba(0,0,0,0.8), 0 0 24px ${book.accent}55`
          : '0 4px 14px rgba(0,0,0,0.55)',
      }}
      transition={{ type: 'spring', stiffness: 400, damping: 28 }}>
      <div style={{
        cursor: 'pointer', width: w, height: h,
        background: `linear-gradient(to right,${book.color}cc,${book.color},${book.color}dd)`,
        borderTop: `3px solid ${book.accent}88`,
        borderLeft: '2px solid rgba(255,255,255,0.08)',
        borderRight: '1px solid rgba(0,0,0,0.4)',
        display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative',
      }}>
        <span style={{
          writingMode: 'vertical-rl', textOrientation: 'mixed', transform: 'rotate(180deg)',
          fontFamily: 'monospace', fontSize: 7, color: `${book.accent}cc`,
          letterSpacing: '0.1em', whiteSpace: 'nowrap', overflow: 'hidden',
          padding: '4px 0', maxHeight: h - 16,
        }}>{book.label}</span>
        <div style={{
          position: 'absolute', top: -1, left: 0, right: 0, height: 3,
          background: book.accent, opacity: 0.7
        }} />
        <AnimatePresence>
          {hov && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              style={{
                position: 'absolute', inset: 0, pointerEvents: 'none',
                background: `linear-gradient(to bottom,${book.accent}25,transparent)`
              }} />
          )}
        </AnimatePresence>
      </div>
      <AnimatePresence>
        {hov && (
          <motion.div initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
            style={{
              position: 'absolute', bottom: '105%', left: '50%', transform: 'translateX(-50%)',
              background: 'rgba(8,4,0,0.94)', border: `1px solid ${book.accent}55`,
              padding: '5px 12px', whiteSpace: 'nowrap', pointerEvents: 'none', zIndex: 10
            }}>
            <span style={{ fontFamily: 'monospace', fontSize: 9, color: '#f5e6c0', letterSpacing: '0.12em' }}>
              {book.spine}
            </span>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

/* ─── Shelf ─────────────────────────────────────────────────────── */
function Shelf({ books, label, onSelect }) {
  return (
    <div style={{
      position: 'relative', margin: '28px 24px 0',
      background: 'linear-gradient(to bottom,#1a0d04,#0e0803)',
      border: '1px solid rgba(200,160,80,0.09)',
      boxShadow: 'inset 0 0 50px rgba(0,0,0,0.55)', padding: '8px 6px 0'
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '0 12px 12px' }}>
        <div style={{ flex: 1, height: 1, background: 'linear-gradient(to right,transparent,rgba(200,160,80,0.22))' }} />
        <span style={{ fontSize: 8, color: 'rgba(200,160,80,0.45)', letterSpacing: '0.4em', whiteSpace: 'nowrap' }}>
          {label} · {books.length} VOLUMES
        </span>
        <div style={{ flex: 1, height: 1, background: 'linear-gradient(to left,transparent,rgba(200,160,80,0.22))' }} />
      </div>
      <div style={{
        display: 'flex', alignItems: 'flex-end', gap: 2,
        padding: '0 14px', minHeight: 210, boxSizing: 'border-box'
      }}>
        <div style={{
          width: 12, height: 88, background: 'linear-gradient(to right,#2a1a0a,#1a0e06)',
          alignSelf: 'flex-end', borderTop: '3px solid #c8a050', opacity: 0.55, flexShrink: 0
        }} />
        {books.map((b, i) => <BookSpine key={b.id} book={b} index={i} onSelect={onSelect} />)}
        <div style={{
          width: 12, height: 88, background: 'linear-gradient(to left,#2a1a0a,#1a0e06)',
          alignSelf: 'flex-end', borderTop: '3px solid #c8a050', opacity: 0.55, flexShrink: 0
        }} />
      </div>
      <div style={{
        height: 14, background: 'linear-gradient(to bottom,#4a2c0f,#2a1a09)',
        boxShadow: '0 6px 20px rgba(0,0,0,0.7)', borderTop: '2px solid rgba(200,160,80,0.14)'
      }} />
      <div style={{ height: 20, background: 'linear-gradient(to bottom,rgba(0,0,0,0.5),transparent)' }} />
    </div>
  );
}

/* ─── Ghost Shelf ───────────────────────────────────────────────── */
function GhostShelf() {
  const ws = [28, 22, 35, 26, 30, 20, 33, 25, 29, 24, 32, 27];
  const hs = [140, 118, 155, 130, 145, 112, 150, 125, 138, 120, 148, 133];
  return (
    <div style={{ position: 'relative', margin: '24px 24px 48px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '0 12px 12px' }}>
        <div style={{ flex: 1, height: 1, background: 'linear-gradient(to right,transparent,rgba(200,160,80,0.06))' }} />
        <span style={{ fontSize: 8, color: 'rgba(200,160,80,0.18)', letterSpacing: '0.4em' }}>ADDING TO COLLECTION</span>
        <div style={{ flex: 1, height: 1, background: 'linear-gradient(to left,transparent,rgba(200,160,80,0.06))' }} />
      </div>
      <div style={{
        display: 'flex', alignItems: 'flex-end', justifyContent: 'space-evenly',
        padding: '0 14px', minHeight: 170,
        background: 'linear-gradient(to bottom,#0e0803,#080502)',
        border: '1px solid rgba(200,160,80,0.04)',
        boxShadow: 'inset 0 0 40px rgba(0,0,0,0.6)'
      }}>
        <div style={{
          width: 12, height: 70, background: '#1a0e06', alignSelf: 'flex-end',
          borderTop: '2px solid rgba(200,160,80,0.12)', opacity: 0.35, flexShrink: 0
        }} />
        {ws.map((w, i) => (
          <motion.div key={i}
            animate={{ opacity: [0.05, 0.13, 0.05] }}
            transition={{ duration: 3.5 + i * 0.4, repeat: Infinity, ease: 'easeInOut', delay: i * 0.25 }}
            style={{
              width: w, height: hs[i], alignSelf: 'flex-end', flexShrink: 0,
              background: 'rgba(200,160,80,0.15)', border: '1px solid rgba(200,160,80,0.1)',
              borderTop: '2px solid rgba(200,160,80,0.18)'
            }} />
        ))}
        <div style={{
          width: 12, height: 70, background: '#1a0e06', alignSelf: 'flex-end',
          borderTop: '2px solid rgba(200,160,80,0.12)', opacity: 0.35, flexShrink: 0
        }} />
      </div>
      <div style={{ height: 10, background: 'linear-gradient(to bottom,#2a1a09,#1a0e04)', opacity: 0.5 }} />
      <motion.div animate={{ opacity: [0.3, 0.6, 0.3] }} transition={{ duration: 2.8, repeat: Infinity }}
        style={{ textAlign: 'center', padding: '14px 0 4px' }}>
        <span style={{ fontFamily: 'monospace', fontSize: 9, color: 'rgba(200,160,80,0.38)', letterSpacing: '0.35em' }}>
          ADDING TO COLLECTION...
        </span>
      </motion.div>
    </div>
  );
}

/* ─── Main Page ─────────────────────────────────────────────────── */
export default function LibraryPage() {
  const navigate = useNavigate();
  const [selected, setSelected] = useState(null);

  useEffect(() => {
    const h = e => { if (e.key === 'Escape' && !selected) navigate(-1); };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [selected, navigate]);

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 100, background: '#080401',
      overflow: 'hidden', fontFamily: 'monospace'
    }}>
      <Helmet><title>DDF·LAB — THE GREAT LIBRARY</title></Helmet>

      <div style={{
        position: 'absolute', inset: 0, pointerEvents: 'none',
        background: 'radial-gradient(ellipse 80% 60% at 30% 40%,rgba(80,30,5,0.35),transparent),radial-gradient(ellipse 60% 80% at 80% 60%,rgba(10,20,50,0.28),transparent)'
      }} />
      <div style={{
        position: 'absolute', top: 0, left: 0, right: 0, height: 6, pointerEvents: 'none',
        background: 'linear-gradient(to bottom,#2a1a08,#1a0e04)'
      }} />
      {[15, 38, 62, 85].map(pct => (
        <div key={pct} style={{
          position: 'absolute', top: 0, left: `${pct}%`, width: 18, height: 80,
          pointerEvents: 'none', background: 'linear-gradient(to bottom,#2a160a,#1a0e05)',
          opacity: 0.55
        }} />
      ))}

      {/* Header */}
      <div style={{
        position: 'relative', zIndex: 30, display: 'flex', alignItems: 'center',
        justifyContent: 'space-between', padding: '14px 28px',
        background: 'rgba(6,3,0,0.92)', borderBottom: '1px solid rgba(200,160,80,0.12)',
        backdropFilter: 'blur(8px)'
      }}>
        <button onClick={() => navigate(-1)}
          onMouseOver={e => e.currentTarget.style.borderColor = 'rgba(200,160,80,0.6)'}
          onMouseOut={e => e.currentTarget.style.borderColor = 'rgba(200,160,80,0.2)'}
          style={{
            fontFamily: 'monospace', fontSize: 10, color: 'rgba(200,160,80,0.7)',
            background: 'none', border: '1px solid rgba(200,160,80,0.2)',
            padding: '5px 14px', cursor: 'pointer', letterSpacing: '0.2em'
          }}>
          ← BACK
        </button>
        <div style={{ textAlign: 'center' }}>
          <p style={{ fontSize: 9, color: 'rgba(200,160,80,0.5)', letterSpacing: '0.4em', margin: 0 }}>RESEARCH ARCHIVE</p>
          <h1 style={{ fontSize: 16, color: '#f5e6c0', margin: 0, fontWeight: 'bold', letterSpacing: '0.15em' }}>
            THE GREAT LIBRARY
          </h1>
        </div>
        <div style={{ textAlign: 'right' }}>
          <p style={{ fontSize: 9, color: 'rgba(200,160,80,0.4)', margin: 0, letterSpacing: '0.2em' }}>{TOTAL} VOLUMES</p>
          <p style={{ fontSize: 9, color: 'rgba(200,160,80,0.25)', margin: 0 }}>ESC → EXIT</p>
        </div>
      </div>

      {/* Library interior */}
      <div style={{ position: 'relative', height: 'calc(100vh - 53px)', overflowY: 'auto', overflowX: 'hidden' }}>
        {ALL_SHELVES.map((shelf, i) => (
          <Shelf key={i} books={shelf.books} label={shelf.label} onSelect={setSelected} />
        ))}
        <GhostShelf />
        <div style={{ height: 60, background: 'linear-gradient(to bottom,rgba(0,0,0,0.3),#080401)' }} />
      </div>

      {!selected && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          style={{
            position: 'absolute', bottom: 24, left: '50%', transform: 'translateX(-50%)',
            background: 'rgba(4,2,0,0.82)', border: '1px solid rgba(200,160,80,0.15)',
            padding: '7px 20px', display: 'flex', gap: 16, zIndex: 15
          }}>
          {['HOVER to preview', 'CLICK to open', 'V toggle SIMPLE↔QUANT', 'ESC exit'].map(t => (
            <span key={t} style={{ fontSize: 9, color: 'rgba(200,160,80,0.5)', letterSpacing: '0.14em' }}>{t}</span>
          ))}
        </motion.div>
      )}

      <AnimatePresence>
        {selected && <OpenBook key={selected.id} book={selected} onClose={() => setSelected(null)} />}
      </AnimatePresence>
    </div>
  );
}
