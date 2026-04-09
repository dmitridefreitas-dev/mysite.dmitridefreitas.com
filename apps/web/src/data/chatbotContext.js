export const quickActions = [
  { id: 'projects',   label: 'All projects',         prompt: 'Tell me about all of your projects.' },
  { id: 'skills',     label: 'Technical stack',      prompt: 'What is your full technical skill set?' },
  { id: 'coursework', label: 'Coursework',           prompt: 'What courses have you taken?' },
  { id: 'experience', label: 'Work experience',      prompt: 'Walk me through your work experience.' },
  { id: 'available',  label: 'Availability & roles', prompt: 'When are you available and what roles are you targeting?' },
  { id: 'contact',    label: 'Get in touch',         prompt: 'How can I contact you?' },
]

// ── Knowledge base ────────────────────────────────────────────────────────────

const kb = {

  identity: `Dmitri De Freitas is a quantitative finance practitioner and data scientist. He is completing a BS in Data Science & Financial Engineering at Washington University in St. Louis (WashU), graduating May 2026, with a GPA of 3.7. He is actively seeking full-time roles as a Quantitative Research Analyst, Financial Engineer, Data Scientist, or Algorithmic Trading Developer, available from May 1, 2026. He is currently based in St. Louis, MO, and is open to relocation. Work authorization: US F-1 OPT eligible.`,

  summary: `He has built production-grade ETL pipelines (80% reduction in manual processing at Amphora Investment Management), developed real-time algorithmic trading systems with sub-second execution latency, and conducted statistical research — 10.9% significant alpha in PEAD analysis, R² 0.816 in predictive housing modeling. Core competencies span quantitative modeling, algorithmic trading, and data engineering.`,

  contact: `Email: d.defreitas@wustl.edu | Phone: +1-314-646-9845 | LinkedIn: linkedin.com/in/dmitri-de-freitas-16a540347/ | CV PDF: available on the About page. Contact form at /contact on this site. Response time: 24-48 hours.`,

  availability: `Available full-time from May 1, 2026. Currently in St. Louis, MO. Open to relocation. Work authorization: US F-1 OPT eligible. Target roles: Quantitative Research Analyst, Financial Engineer, Data Scientist, Algorithmic Trading Developer.`,

  education: {
    washu: `Washington University in St. Louis (WashU) — BS Data Science & Financial Engineering, 2024–2026, GPA 3.7. Courses: ACCT 2610 Principles of Financial Accounting; CSE 217A Introduction to Data Science; CSE 247 Data Structures and Algorithms; CSE 3104 Data Manipulation and Management; CSE 4102 Introduction to Artificial Intelligence (IN PROGRESS); CSE 4107 Introduction to Machine Learning; ECON 4011 Intermediate Microeconomic Theory; ENGR 310 Technical Writing; ENGR 4503 Conflict Management and Negotiation; ESE 4150 Optimization (IN PROGRESS); ESE 4261 Statistical Methods for Data Analysis with Applications to Financial Engineering (IN PROGRESS); ESE 4270 Financial Mathematics; FIN 340 Capital Markets & Financial Management; FIN 4410 Investments; FIN 4506 Financial Technology: Methods and Practice (IN PROGRESS); FIN 4510 Options, Futures and Derivative Securities (IN PROGRESS); MSB 5560 Ethics in Biostatistics and Data Science (IN PROGRESS); SDS 3211 Statistics for Data Science I; SDS 439 Linear Statistical Models; SDS 4030 Statistics for Data Science II; SDS 4135 Applied Statistics Practicum; SDS 4140 Advanced Linear Statistical Models (IN PROGRESS). Total: 22 courses.`,
    drew: `Drew University — BA Mathematics, 2021–2023, GPA 3.7. Courses: ART 150 Digital Imaging; CSCI 150 Introduction to Computer Science in Python; CSCI 151 Object-Oriented Programming in Java; CSCI 235 Quantum Computing; CSCI 270 Cybersecurity: Philosophy & Ethics; ECON 101 Principles of Microeconomics; ECON 102 Principles of Macroeconomics; FIN 683 Special Topics in Finance; MATH 250 Calculus & Analytical Geometry III; MATH 303 Linear Algebra; MATH 310 Foundations of Higher Mathematics; MATH 315 Differential Equations; MATH 320 Probability; MATH 330 Real and Complex Analysis I; PHIL 214 Business Ethics; STAT 207 Introduction to Statistics; WRTG 120 Academic Writing. Total: 17 courses.`,
    cape: `Caribbean Examinations Council (CAPE) — Transfer Credits used at Drew University: CHEM 150 Principles of Chemistry I; CHEM 160 Principles of Chemistry II; LAST 101 Societies of Latin America; MATH 150 Calculus & Analytical Geometry I; MATH 151 Calculus & Analytical Geometry II; PHYS 150 University Physics I; PHYS 160 University Physics II. Also: CAPE Unit II Physics — Top 8 with Honors (2021).`,
    harrison: `Harrison College — A-level Examinations Unit I & II, 2015–2021, GRADE I AAA.`,
  },

  experience: {
    amphora: `Amphora Investment Management (2025) — Data Scientist Intern. Built automated Python ETL pipelines integrating Interactive Brokers (IBKR) and Harmony APIs, achieving an 80% reduction in manual data reconciliation. Developed quantitative portfolio construction models using Pandas and NumPy for optimized asset allocation. Architected dynamic VBA/Excel tools to streamline deal-sourcing workflows and enhance data visibility. Implemented automated performance attribution reporting systems for institutional investors. Data sources: IBKR API, Harmony (internal portfolio management system), Bloomberg Data License.`,
    mobilehub: `MobileHub Barbados (2022–2024) — Founder & Manager. Founded and scaled a mobile technology startup, managing all business operations and strategy. Managed international vendor relations and supply chain logistics in partnership with Shenzhen Rongyi Technology Co., Ltd. Implemented inventory tracking systems and financial modeling to optimize cash flow. Achieved consistent month-over-month revenue growth.`,
    recCenter: `Gary M. Sumers Recreation Center, Washington University in St. Louis (2025) — Front Desk / Reception. Operated facility access control systems and managed high-volume point-of-sale transaction processing. Maintained membership databases and resolved access discrepancies in real-time.`,
    caregiving: `Personal Care Assistant — Private In-Home Care, SMA Patient (2025–2026). Delivered dedicated in-home care for a patient with Spinal Muscular Atrophy (SMA). Administered specialized medical equipment and monitored critical health metrics.`,
    doeOfEdinburgh: `Duke of Edinburgh's International Award (2021) — Bronze Award. Completed the expedition component, demonstrating physical endurance and outdoor survival. Executed topographical route planning, resource management, and team leadership under demanding conditions.`,
    scienceClub: `Science Club President, Harrison College (2020–2021). Led the school's Science Club, organizing STEM events, experiments, and competitions. Managed budget, resources, and logistical planning for inter-school competitions. Mentored junior members in scientific concepts.`,
  },

  projects: {
    pead: `PEAD-001 — "Statistical Analysis of Short-Term Market Efficiency Following Positive Earnings Surprises". Tests the Post-Earnings Announcement Drift (PEAD) hypothesis. Only 10.9% of stocks showed statistically significant alpha, suggesting markets are highly efficient and price in new information quickly. Tech: Python, Quantitative Models. Data: Compustat (historical earnings), CRSP (daily stock returns and market cap), I/B/E/S (analyst earnings estimates). Report available.`,
    etl: `ETL-002 — "Institutional Data Integration Engine". Built at Amphora Investment Management. Automated Python/Pandas ETL pipelines integrating IBKR, Harmony, and Bloomberg Data License. 80% reduction in manual processing time. Real-time data validation and error handling. Scalable pipeline architecture. Tech: Python, Pandas, REST API, Excel/VBA, Power BI.`,
    trading: `TRAD-003 — "Quantitative Trading Deck". Real-time cryptocurrency trading system using asyncio WebSocket client with automated execution logic. Sub-second trade execution latency. Multi-exchange connectivity. Asynchronous order management system. Tech: Python, WebSockets, Asyncio. Data: Binance WebSocket API, Coinbase Pro API, Kraken REST API. Both report and code available.`,
    terminal: `TERM-004 — "Institutional Trading Terminal". Full-stack institutional-grade trading platform with JWT authentication, real-time WebSocket data feeds, RESTful API backend, and HTML/CSS/JS frontend. Enterprise-grade security with JWT auth. Real-time order book updates. Multi-user session management. Comprehensive trade history and analytics. Tech: Python, WebSockets, Asyncio, JWT Auth, REST API, HTML/CSS/JS. Data: Alpaca Markets API, Polygon.io, internal simulated matching engine.`,
    housing: `ML-005 — "Predictive Modeling & Housing Price Intelligence". Random Forest regressor for Australian housing prices. R² score: 0.816. RMSE: $270,534 AUD. Analyzed 10,000+ Melbourne property records. Feature importance analysis for interpretability. Tech: Python, Scikit-learn, Pandas, Seaborn, Random Forest. Data: Kaggle Melbourne Housing Market Dataset, Australian Bureau of Statistics (ABS), Domain Group Property Data.`,
    climate: `CLM-006 — "Climate Science & Statistical Modeling". Statistical analysis of global temperature trends. Identified 0.13°C/year warming trend. 71% variation explained (R²). Spatial analysis across global regions. Seasonal decomposition and trend analysis. Tech: R, Linear Models, Lubridate, Maps, Fields, Fourier Analysis. Data: NOAA, NASA GISS, Hadley Centre (HadCRUT).`,
    nfl: `NFL-007 — "NFL Win Probability Forecasting". GLM and Beta-Binomial models to forecast NFL team win probabilities. AIC: 944.3. Projected Ravens/49ers/Chiefs as top performers. Mixed effects for team-specific adjustments. Tech: R, GLM, Beta-Binomial Models, Mixed Effects. Data: ESPN API, NFL.com, Pro Football Reference.`,
    bio: `BIO-008 — "Running Surface Biomechanics Analysis". Linear mixed-effects modeling of biomechanical performance on different running surfaces (track, grass, concrete). Repeated measures design. Statistical significance testing with ANOVA. Tech: R, Linear Mixed Models, Repeated Measures, ANOVA. Data: University Biomechanics Lab, wearable sensors, force plates.`,
    cyclone: `TCY-009 — "Tropical Cyclone Cold Wake Analysis". Statistical analysis of hurricane-induced ocean cooling patterns. Analyzed 100+ cyclone events. Spatial mapping of cold wake patterns. Exponential decay modeling. Tech: R, Statistical Testing, Exponential Distributions, Spatial Analysis. Data: NOAA Hurricane Research Division, Satellite SST data, NHC Best Track Data.`,
    tornado: `TRN-010 — "US Tornado Pattern Analysis". Spatial statistics and Generalized Additive Models (GAM) on 70,000+ tornado events (1950–2023). Geographic hotspot identification. Temporal trend analysis. Intensity distribution modeling. Tech: R, Spatial Statistics, GAM Models, Kernel Density Estimation. Data: NOAA Storm Prediction Center, National Weather Service, Tornado History Project.`,
  },

  skills: {
    languages: `Python (3.5 years, production use — Pandas, NumPy, Scikit-learn, asyncio, multiprocessing), SQL (3 years — PostgreSQL, MySQL, complex joins, window functions, query optimization), R/RStudio (2.5 years — ggplot2, dplyr, lme4, linear mixed-effects modeling, spatial statistics), MATLAB (2 years — signal processing, financial toolbox, econometrics), VBA (Excel automation, financial modeling), Bash.`,
    dataScience: `Pandas, NumPy, Scikit-learn, PyTorch, TensorFlow, Statsmodels, SciPy. Machine learning: regression, classification, random forests, gradient boosting, neural networks.`,
    viz: `Matplotlib, Seaborn, Plotly, Power BI (DAX, Power Query), Tableau.`,
    databases: `PostgreSQL, MySQL, MongoDB, AWS S3/EC2/Lambda, Apache Spark.`,
    quant: `Bloomberg Terminal (BQL queries, B-PIPE API, Launchpad), FRED API (macroeconomic data, vintage data via ALFRED), QuantLib (yield curve bootstrapping, Monte Carlo, option pricing, C++ core, Python SWIG wrappers), Backtrader, Interactive Brokers API (IBKR), Excel/VBA (financial modeling, PivotTables, Power Query, COM add-ins).`,
    devOps: `Git, GitHub, VS Code (Jupyter integration, GitLens, Copilot), Docker, Jupyter, Linux/Unix.`,
    cloud: `AWS, Google Cloud, Azure, REST APIs, WebSockets.`,
  },

  lab: {
    overview: `The portfolio includes an interactive Research Lab at /lab — 14 quantitative finance tools built from scratch with all computation client-side. Navigate by pressing [1]–[9] or [O] [F] [P] [V] [M], or [ESC] to return to the main site.`,
    tools: [
      `[1] YIELD CURVE (/lab/yield-curve): Fit Nelson-Siegel, cubic spline, and linear interpolation to US Treasury yields. Explore term structure dynamics. Tags: Fixed Income, Rates.`,
      `[2] VAR CALCULATOR (/lab/var): Compute Value-at-Risk via historical simulation, parametric (variance-covariance), and Monte Carlo side by side. Tags: Risk, Portfolio.`,
      `[3] DISTRIBUTIONS (/lab/distributions): Interactive PDF/CDF explorer for 8 probability distributions. Drag parameters, compare, view moments. Tags: Probability, Statistics.`,
      `[4] STOCHASTIC LAB (/lab/stochastic): Simulate GBM, Ornstein-Uhlenbeck, CIR, and Heston processes. Compare SDEs side by side. Tags: Stochastic Calculus, Simulation.`,
      `[5] ORDER BOOK (/lab/order-book): Live simulated limit order book. Submit market orders, observe price impact and depth dynamics. Tags: Microstructure, Trading.`,
      `[6] REGIME DETECTION (/lab/regimes): Fit a 2-state Hidden Markov Model using Baum-Welch EM. Identify bull/bear regimes. Tags: ML, Time Series.`,
      `[7] NOTES (/lab/notes): 10 technical write-ups — GBM & Tail Risk, Nelson-Siegel, VaR Illusion, Heston Stochastic Vol, Black-Scholes Derivation, Kelly Criterion, Duration & Convexity, Fama-French Factor Models, Binomial Option Pricing, ML in Finance. Plus research references. Toggle executive vs quant detail view. Tags: Research, Theory.`,
      `[8] QUIZ (/lab/quiz): 150 questions across Probability, Options, Statistics, Fixed Income, and IB/Accounting. Three difficulty levels. Tags: Interview Prep.`,
      `[9] MONTE CARLO SIM (/lab/sim → /lab/stochastic): GBM + Merton Jump-Diffusion simulator with option pricing vs closed-form Black-Scholes. Tags: Options, Simulation.`,
      `[O] PORTFOLIO OPTIMIZER (/lab/optimizer): Mean-variance optimization via Monte Carlo. Input any tickers — plots efficient frontier, tangency portfolio weights and Sharpe ratio. Tags: Portfolio, Optimization.`,
      `[F] FACTOR EXPOSURE (/lab/factors): Fama-French 3-factor OLS regression on any portfolio. Shows alpha, beta loadings, t-stats, R², and cumulative return vs FF3-fitted. Tags: Factor Model, Regression.`,
      `[P] PEAD EVENT STUDY (/lab/pead): Post-Earnings Announcement Drift. Market-model adjusted cumulative abnormal returns from −20 to +60 days around any earnings date. Tags: Event Study, Alpha.`,
      `[V] IV SURFACE (/lab/iv-surface): Implied Volatility Surface for any optionable ticker. Vol smile per expiry, ATM term structure, and skew metrics across the entire options chain. Tags: Options, Volatility, Derivatives.`,
      `[M] DCF MODELER (/lab/dcf): Automated 3-statement model + 5-year DCF for any ticker. Pulls live fundamentals, lets you tweak WACC, growth, and margins to see implied price in real time. Tags: Valuation, IB, DCF.`,
    ],
  },

  news: `The News page (/news) is a live financial news feed aggregated from Bloomberg, Reuters, CNBC, MarketWatch, FT, Yahoo Finance, Investing.com, and The Guardian. Polls every 60 seconds. Filter by importance (HIGH/MED/LOW) or last 30 minutes. Also supports ticker search — enter any stock symbol (e.g. AAPL, TSLA) to see ticker-specific news and SEC EDGAR filings (10-K, 10-Q, 8-K, proxy statements, S-1, etc.) with year and form-type filters.`,

  researchNotes: `The Lab Notes page contains 10 technical write-ups: (1) Why GBM Underestimates Tail Risk — fat tails, excess kurtosis, Heston ρ, VaR breaches, ES adoption. (2) Nelson-Siegel: Parsing the Yield Curve — level/slope/curvature factors, β₀/β₁/β₂, Diebold-Li, Svensson extension. (3) The VaR Illusion — VaR vs ES (CVaR), subadditivity failure, Basel III/IV ES at 97.5%, Kupiec LR test. (4) Heston Stochastic Volatility — CIR variance process, Feller condition, characteristic function pricing, Andersen QE scheme. (5) Black-Scholes: Derivation and Assumptions — delta-hedging, Ito's lemma derivation of the PDE, closed-form solution. (6) Kelly Criterion: Optimal Bet Sizing — f* = edge/odds, multi-asset Σ⁻¹μ, half-Kelly. (7) Duration, Convexity, and Bond Math — Macaulay/Modified duration, DV01, second-order price approximation. (8) Factor Models: CAPM to Fama-French — FF3, Carhart 4-factor (WML), FF5 (RMW, CMA), APT foundation. (9) Binomial Option Pricing — CRR parametrization, backward induction, American early exercise, Greeks from the tree. (10) Machine Learning in Quantitative Finance — LASSO/Ridge, Random Forests, LSTM, RL for execution, NLP (FinBERT), pitfalls (look-ahead bias, survivorship bias, multiple testing).`,

  references: `Research references in the Notes page: (1) Jegadeesh & Titman (1993) "Returns to Buying Winners and Selling Losers" — foundational momentum paper, Journal of Finance. (2) Kenneth R. French Data Library — FF3/FF5 factors, momentum factor, portfolio sorts, updated monthly. (3) Aswath Damodaran Data Archive (NYU Stern) — industry betas, WACC, EV multiples, ERP, updated annually. (4) Robert Shiller Online Data (Yale) — CAPE ratio back to 1871, S&P 500 history, Case-Shiller housing. (5) FRED (Federal Reserve Bank of St. Louis) — 800,000+ macro/financial series, rates, CPI, PCE, GDP, employment.`,

  kpis: `Portfolio stats: 8+ research approaches, 70,000+ data points analyzed, peak model R² 0.816, work spans 4 domains (quantitative finance, data engineering, machine learning, trading systems).`,
}

// ── Fallback reply logic (used when Groq API fails) ───────────────────────────

// Key links used throughout fallback replies
const LINKS = {
  cv:        '[Download CV PDF](https://drive.google.com/file/d/1Ff9CtgP3OndC67ARXolrRjH6Y2seE1Sl/view?usp=drive_link)',
  linkedin:  '[LinkedIn Profile](https://www.linkedin.com/in/dmitri-de-freitas-16a540347/)',
  contact:   '[Contact Page](/contact)',
  projects:  '[View All Projects](/projects)',
  about:     '[About / Profile](/about)',
  lab:       '[Research Lab](/lab)',
  coursework:'[Full Coursework](/coursework)',
  news:      '[News & EDGAR](/news)',
  // Project reports
  rPead:     '[PEAD-001 Report](https://drive.google.com/file/d/1KMCov59hzqVeszJgeXmMe1eGDp_Ckqde/view)',
  rEtl:      '[ETL-002 Report](https://drive.google.com/drive/folders/1UOnr5dxz01tNMoN0dowL7zSadmxg76WL)',
  rTrad:     '[TRAD-003 Report](https://drive.google.com/file/d/1y8MlzRKhUrgumKxb7Jw680nIQHm-M0kW/view)',
  cTrad:     '[TRAD-003 Code](https://drive.google.com/drive/folders/1ZUcBXwVD-fR5Z8g5lat5UFhQUsrMP2I6)',
  rTerm:     '[TERM-004 Report](https://drive.google.com/file/d/1MygghOsEu7fFybnPwSsZ81TExeu4bZVe/view)',
  rHousing:  '[ML-005 Report](https://drive.google.com/file/d/1zcGUEaRWoGIFPrVUi1k3UDg7PU2peKfR/view)',
  rClimate:  '[CLM-006 Report](https://drive.google.com/file/d/1PS-8_Two0Nz-ljb0DgiXv18tJ9w-LtiN/view)',
  rBio:      '[BIO-008 Report](https://drive.google.com/file/d/1-0o599jc8_PsLD-tjGG0T1Z46egoE6Tq/view)',
  rCyclone:  '[TCY-009 Report](https://drive.google.com/file/d/1ZoGA1EgN0x95YwXnjuS9onlMG6VD7TsD/view)',
  rTornado:  '[TRN-010 Report](https://drive.google.com/file/d/1J02SDuD61vPO0l4oF_DJw6j3UA3EHZ28/view)',
  // Lab tools
  lYield:    '[Yield Curve Tool](/lab/yield-curve)',
  lVar:      '[VaR Calculator](/lab/var)',
  lDist:     '[Distributions](/lab/distributions)',
  lStoch:    '[Stochastic Lab](/lab/stochastic)',
  lOb:       '[Order Book](/lab/order-book)',
  lReg:      '[Regime Detection](/lab/regimes)',
  lNotes:    '[Lab Notes](/lab/notes)',
  lQuiz:     '[Interview Quiz](/lab/quiz)',
  lOpt:      '[Portfolio Optimizer](/lab/optimizer)',
  lFactor:   '[Factor Exposure](/lab/factors)',
  lPead:     '[PEAD Event Study](/lab/pead)',
  lIv:       '[IV Surface](/lab/iv-surface)',
  lDcf:      '[DCF Modeler](/lab/dcf)',
}

export function getFallbackReply(userInput, history = []) {
  const q = (userInput || '').toLowerCase().trim()

  if (/^(hi|hey|hello|howdy|sup|yo)\b/.test(q)) {
    return `Hey! I'm Dmitri's portfolio assistant. Ask me about his projects, skills, coursework, or experience. You can also grab his ${LINKS.cv} or visit the ${LINKS.contact}.`
  }

  if (/thank|thanks|ty|appreciate/.test(q)) {
    return `Of course! Feel free to ask anything else — or ${LINKS.contact} to reach Dmitri directly.`
  }

  // Resume / CV
  if (/resume|cv|curriculum vitae/.test(q)) {
    return `Here's Dmitri's resume: ${LINKS.cv}. You can also find it on the ${LINKS.about} page.`
  }

  // Contact
  if (/contact|reach|email|phone|linkedin|get in touch|message/.test(q)) {
    return `Email: d.defreitas@wustl.edu | Phone: +1-314-646-9845 | ${LINKS.linkedin} | ${LINKS.contact} (form with 24–48h response time)`
  }

  // Availability / roles / hiring
  if (/available|availability|hire|hiring|open to|start|when|full.?time|roles|position|job|work auth|opt|visa/.test(q)) {
    return `Available full-time from May 1, 2026. Based in St. Louis, MO — open to relocation. Work authorization: US F-1 OPT eligible. Target roles: Quantitative Research Analyst, Financial Engineer, Data Scientist, Algorithmic Trading Developer. ${LINKS.contact}`
  }

  // Education — general
  if (/education|degree|school|university|college|gpa|graduate|graduation|academic/.test(q)) {
    return `WashU: BS Data Science & Financial Engineering (2024–2026, GPA 3.7). Drew University: BA Mathematics (2021–2023, GPA 3.7). Harrison College: A-level Grade I AAA. CAPE Unit II Physics: Top 8 with Honors. ${LINKS.coursework} for the full course list.`
  }

  // Coursework / courses
  if (/course|coursework|class|curriculum|subject|took|studied/.test(q)) {
    return `Dmitri has taken 22 courses at WashU (Financial Engineering, ML, Data Science, Optimization, Options & Derivatives, Investments, etc.) and 17 at Drew University (Mathematics, CS, Economics). ${LINKS.coursework} for the complete list with course codes.`
  }

  // Experience general
  if (/experience|internship|work|job|career|employ|startup|founder/.test(q)) {
    return `Key experience: Data Scientist Intern at Amphora Investment Management (2025) — built ETL pipelines reducing manual processing 80%. Also founded MobileHub Barbados (2022–2024), a mobile tech startup. ${LINKS.about} for the full breakdown.`
  }

  // Amphora
  if (/amphora|pipeline|data engineer|ibkr|interactive broker|harmony/.test(q)) {
    return `At Amphora Investment Management (2025), Dmitri built Python/Pandas ETL pipelines integrating IBKR, Harmony, and Bloomberg Data License — achieving 80% reduction in manual processing. Also built VBA/Excel deal-sourcing tools and automated performance attribution reporting. ${LINKS.rEtl}`
  }

  // MobileHub
  if (/mobile.*hub|mobilehub|startup|barbados|founder|shenzhen/.test(q)) {
    return `Dmitri founded MobileHub Barbados (2022–2024), a mobile technology startup with international vendor relations with Shenzhen Rongyi Technology Co., Ltd. He managed all operations, inventory tracking, and financial modeling.`
  }

  // All projects
  if (/all project|all research|list.*project|full.*catalog|every project/.test(q)) {
    return `10 projects: PEAD-001 (Market Efficiency), ETL-002 (Data Integration), TRAD-003 (Trading Deck), TERM-004 (Trading Terminal), ML-005 (Housing Model), CLM-006 (Climate), NFL-007 (NFL Predictions), BIO-008 (Biomechanics), TCY-009 (Hurricanes), TRN-010 (Tornadoes). ${LINKS.projects}`
  }

  // Specific projects
  if (/pead|post.?earnings|announcement drift|market efficiency|earnings surprise/.test(q)) {
    return `PEAD-001: Statistical Analysis of Short-Term Market Efficiency. Only 10.9% of stocks showed significant alpha — suggesting markets are highly efficient post-earnings. Data: Compustat, CRSP, I/B/E/S. ${LINKS.rPead} ${LINKS.projects}`
  }
  if (/etl.?002|institutional.*data|data integration|amphora.*project/.test(q)) {
    return `ETL-002: Institutional Data Integration Engine at Amphora. Python/Pandas pipelines with 80% reduction in manual processing. Tech: Python, Pandas, REST API, Excel/VBA, Power BI. ${LINKS.rEtl}`
  }
  if (/trad.?003|trading deck|crypto.*trading|binance|coinbase|kraken|websocket.*trade/.test(q)) {
    return `TRAD-003: Real-time crypto trading system. Asyncio WebSocket client with sub-second execution latency across Binance, Coinbase Pro, and Kraken. ${LINKS.rTrad} ${LINKS.cTrad}`
  }
  if (/term.?004|trading terminal|jwt|auth.*terminal/.test(q)) {
    return `TERM-004: Institutional Trading Terminal — full-stack platform with JWT auth, real-time WebSocket feeds, RESTful API. Tech: Python, WebSockets, Asyncio, JWT, HTML/CSS/JS. ${LINKS.rTerm}`
  }
  if (/ml.?005|housing|melbourne|random forest|r.?squared.*0\.816|predictive.*model/.test(q)) {
    return `ML-005: Predictive Housing Model. Random Forest regressor, R² 0.816, RMSE $270,534 AUD on 10,000+ Melbourne property records. Tech: Python, Scikit-learn, Pandas. ${LINKS.rHousing}`
  }
  if (/clm.?006|climate|global warming|temperature trend|0\.13|fourier/.test(q)) {
    return `CLM-006: Climate Science & Statistical Modeling. Identified 0.13°C/year warming trend, 71% variation explained (R²). Tech: R, Fourier Analysis. ${LINKS.rClimate}`
  }
  if (/nfl.?007|nfl|football|win probability|ravens|49ers|chiefs/.test(q)) {
    return `NFL-007: NFL Win Probability Forecasting using GLM and Beta-Binomial models. AIC: 944.3. Projected Ravens/49ers/Chiefs as top performers. ${LINKS.rClimate}`
  }
  if (/bio.?008|biomechanic|running surface/.test(q)) {
    return `BIO-008: Running Surface Biomechanics Analysis. Linear mixed-effects modeling across track/grass/concrete surfaces with repeated measures ANOVA. ${LINKS.rBio}`
  }
  if (/tcy.?009|cyclone|hurricane|cold wake/.test(q)) {
    return `TCY-009: Tropical Cyclone Cold Wake Analysis. Analyzed 100+ cyclone events, spatial mapping of ocean cooling patterns, exponential decay modeling. ${LINKS.rCyclone}`
  }
  if (/trn.?010|tornado|70.?000|spatial.*stats/.test(q)) {
    return `TRN-010: US Tornado Pattern Analysis. Spatial statistics and GAM models on 70,000+ tornado events (1950–2023). ${LINKS.rTornado}`
  }

  // General project question
  if (/project|research|built|portfolio/.test(q)) {
    return `Featured: ETL-002 (Amphora data pipelines ${LINKS.rEtl}), TRAD-003 (crypto trading ${LINKS.rTrad}), ML-005 (housing model ${LINKS.rHousing}), PEAD-001 (market efficiency ${LINKS.rPead}). ${LINKS.projects} for all 10.`
  }

  // Skills
  if (/skill|tech.*stack|tool|technology|stack|python|sql|matlab|bloomberg|quantlib/.test(q)) {
    return `Core languages: Python (3.5yr), SQL, R, MATLAB. Quant tools: Bloomberg Terminal, QuantLib, IBKR API, FRED. ML: Scikit-learn, PyTorch, TensorFlow. Cloud: AWS, GCP, Azure. ${LINKS.about}`
  }

  // Lab tools
  if (/lab|interactive|tool|yield curve|var|value at risk|stochastic|order book|regime|optimizer|factor|iv surface|dcf|modeler/.test(q)) {
    return `The Research Lab (/lab) has 14 tools: ${LINKS.lYield} ${LINKS.lVar} ${LINKS.lStoch} ${LINKS.lOpt} ${LINKS.lIv} ${LINKS.lDcf} ${LINKS.lPead} ${LINKS.lFactor} ${LINKS.lNotes} ${LINKS.lQuiz} and more. ${LINKS.lab}`
  }

  // Quiz
  if (/quiz|150 question|interview prep/.test(q)) {
    return `The Lab includes a 150-question quiz covering Probability, Options, Statistics, Fixed Income, and IB/Accounting across three difficulty levels. ${LINKS.lQuiz}`
  }

  // Notes / theory
  if (/notes|write.?up|theory|gbm|black.?scholes|kelly|duration|convexity|heston|nelson.?siegel|fama.?french|binomial/.test(q)) {
    return `The Lab Notes section has 10 technical write-ups covering GBM tail risk, Nelson-Siegel yield curves, VaR illusion, Heston stochastic vol, Black-Scholes derivation, Kelly Criterion, Duration & Convexity, Fama-French factors, Binomial trees, and ML in finance. ${LINKS.lNotes}`
  }

  // News page
  if (/news|feed|market news|edgar|filing|10.?k|10.?q|8.?k|sec/.test(q)) {
    return `The News page is a live financial news feed (Bloomberg, Reuters, CNBC, FT, etc.) that refreshes every 60 seconds. Also supports stock ticker search for company-specific news and SEC EDGAR filings. ${LINKS.news}`
  }

  // About / who / intro
  if (/who|about|introduce|tell me|summary|background|overview/.test(q)) {
    return `${kb.identity} ${LINKS.about} ${LINKS.cv} ${LINKS.linkedin}`
  }

  // Navigation
  if (/where|navigate|find|page|link|site|section/.test(q)) {
    return `Pages: ${LINKS.about} · ${LINKS.projects} · ${LINKS.lab} · ${LINKS.coursework} · ${LINKS.news} · ${LINKS.contact}`
  }

  // Generic fallback
  const fallbacks = [
    `Ask me about Dmitri's projects, coursework, skills, or experience. ${LINKS.cv} ${LINKS.projects}`,
    `I can answer questions about any of the 10 research projects, all coursework, technical skills, or availability. ${LINKS.contact}`,
    `Not sure I caught that — try asking about a specific project, skill, or lab tool. ${LINKS.projects} ${LINKS.lab}`,
    `Ask about the quant trading system, housing model, Lab tools, or target roles. ${LINKS.cv} ${LINKS.linkedin}`,
  ]
  return fallbacks[Math.floor(Date.now() / 1000) % fallbacks.length]
}
