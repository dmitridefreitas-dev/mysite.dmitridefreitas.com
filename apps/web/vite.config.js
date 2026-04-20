import path from 'node:path';
import react from '@vitejs/plugin-react';
import { createLogger, defineConfig, loadEnv } from 'vite';
import inlineEditPlugin from './plugins/visual-editor/vite-plugin-react-inline-editor.js';
import editModeDevPlugin from './plugins/visual-editor/vite-plugin-edit-mode.js';
import selectionModePlugin from './plugins/selection-mode/vite-plugin-selection-mode.js';
import iframeRouteRestorationPlugin from './plugins/vite-plugin-iframe-route-restoration.js';
import pocketbaseAuthPlugin from './plugins/vite-plugin-pocketbase-auth.js';

import { readFileSync } from 'node:fs';

const pkg = JSON.parse(readFileSync('./package.json', 'utf-8'));
const allDeps = Object.keys(pkg.dependencies || {});

const isDev = process.env.NODE_ENV !== 'production';

const configHorizonsViteErrorHandler = `
const observer = new MutationObserver((mutations) => {
	for (const mutation of mutations) {
		for (const addedNode of mutation.addedNodes) {
			if (
				addedNode.nodeType === Node.ELEMENT_NODE &&
				(
					addedNode.tagName?.toLowerCase() === 'vite-error-overlay' ||
					addedNode.classList?.contains('backdrop')
				)
			) {
				handleViteOverlay(addedNode);
			}
		}
	}
});

observer.observe(document.documentElement, {
	childList: true,
	subtree: true
});

function handleViteOverlay(node) {
	if (!node.shadowRoot) {
		return;
	}

	const backdrop = node.shadowRoot.querySelector('.backdrop');

	if (backdrop) {
		const overlayHtml = backdrop.outerHTML;
		const parser = new DOMParser();
		const doc = parser.parseFromString(overlayHtml, 'text/html');
		const messageBodyElement = doc.querySelector('.message-body');
		const fileElement = doc.querySelector('.file');
		const messageText = messageBodyElement ? messageBodyElement.textContent.trim() : '';
		const fileText = fileElement ? fileElement.textContent.trim() : '';
		const error = messageText + (fileText ? ' File:' + fileText : '');

		window.parent.postMessage({
			type: 'horizons-vite-error',
			error,
		}, '*');
	}
}
`;

const configHorizonsRuntimeErrorHandler = `
window.onerror = (message, source, lineno, colno, errorObj) => {
	const errorDetails = errorObj ? JSON.stringify({
		name: errorObj.name,
		message: errorObj.message,
		stack: errorObj.stack,
		source,
		lineno,
		colno,
	}) : null;

	window.parent.postMessage({
		type: 'horizons-runtime-error',
		message,
		error: errorDetails
	}, '*');
};
`;

const configHorizonsConsoleErrorHandler = `
const originalConsoleError = console.error;
const MATCH_LINE_COL_REGEX = /:(\\d+):(\\d+)\\)?\\s*$/; // regex to match the :lineNum:colNum
const MATCH_AT_REGEX = /^\\s*at\\s+(?:async\\s+)?(?:.*?\\s+)?\\(?/; // regex to remove the 'at' keyword and any 'async' or function name
const MATCH_PATH_REGEX = /^\\//; // regex to remove the leading slash

function parseStackFrameLine(line) {
	const lineColMatch = line.match(MATCH_LINE_COL_REGEX);
	if (!lineColMatch) return null;
	const [, lineNum, colNum] = lineColMatch;
	const suffix = \`:\${lineNum}:\${colNum}\`;
	const idx = line.lastIndexOf(suffix);
	if (idx === -1) return null;
	const before = line.substring(0, idx);
	const path = before.replace(MATCH_AT_REGEX, '').trim();
	
	if (!path) return null;

	try {
		const pathname = new URL(path).pathname;
		const filePath = pathname.replace(MATCH_PATH_REGEX, '') || pathname;
		return \`\${filePath}:\${lineNum}:\${colNum}\`;
	} catch (e) {
		const filePath = path.replace(MATCH_PATH_REGEX, '') || path;
		return \`\${filePath}:\${lineNum}:\${colNum}\`;
	}
}

function getFilePathFromStack(stack, skipFrames = 0) {
	if (!stack || typeof stack !== 'string') return null;
	const lines = stack.split('\\n').slice(1);

	const frames = lines.map(line => parseStackFrameLine(line.replace(/\\r$/, ''))).filter(Boolean);

	return frames[skipFrames] ?? null;
}

console.error = function(...args) {
	originalConsoleError.apply(console, args);

	let errorString = '';
	let filePath = null;

	for (let i = 0; i < args.length; i++) {
		const arg = args[i];
		if (arg instanceof Error) {
			filePath = getFilePathFromStack(arg.stack, 0);
			errorString = \`\${arg.name}: \${arg.message}\`;
			if (filePath) {
				errorString = \`\${errorString} at \${filePath}\`;
			}
			break;
		}
	}

	if (!errorString) {
		errorString = args.map(arg => typeof arg === 'object' ? JSON.stringify(arg) : String(arg)).join(' ');
		const stack = new Error().stack;
		filePath = getFilePathFromStack(stack, 1);
		if (filePath) {
			errorString = \`\${errorString} at \${filePath}\`;
		}
	}

	window.parent.postMessage({
		type: 'horizons-console-error',
		error: errorString
	}, '*');
};
`;

const configWindowFetchMonkeyPatch = `
const originalFetch = window.fetch;

window.fetch = function(...args) {
	const url = args[0] instanceof Request ? args[0].url : args[0];

	// Skip WebSocket URLs
	if (url.startsWith('ws:') || url.startsWith('wss:')) {
		return originalFetch.apply(this, args);
	}

	return originalFetch.apply(this, args)
		.then(async response => {
			const contentType = response.headers.get('Content-Type') || '';

			// Exclude HTML document responses
			const isDocumentResponse =
				contentType.includes('text/html') ||
				contentType.includes('application/xhtml+xml');

			if (!response.ok && !isDocumentResponse) {
					const requestUrl = response.url;
					// Skip opaque responses (no-cors / cross-origin with status 0) — not actionable
					if (!requestUrl) return response;
					const responseClone = response.clone();
					const errorFromRes = await responseClone.text();
					console.error(\`Fetch error from \${requestUrl}: \${errorFromRes}\`);
			}

			return response;
		})
		.catch(error => {
			if (!url.match(/\.html?$/i)) {
				console.error(error);
			}

			throw error;
		});
};
`;

const configNavigationHandler = `
if (window.navigation && window.self !== window.top) {
	window.navigation.addEventListener('navigate', (event) => {
		const url = event.destination.url;

		try {
			const destinationUrl = new URL(url);
			const destinationOrigin = destinationUrl.origin;
			const currentOrigin = window.location.origin;

			if (destinationOrigin === currentOrigin) {
				return;
			}
		} catch (error) {
			return;
		}

		window.parent.postMessage({
			type: 'horizons-navigation-error',
			url,
		}, '*');
	});
}
`;

const addTransformIndexHtml = {
	name: 'add-transform-index-html',
	transformIndexHtml(html) {
		const tags = [
			{
				tag: 'script',
				attrs: { type: 'module' },
				children: configHorizonsRuntimeErrorHandler,
				injectTo: 'head',
			},
			{
				tag: 'script',
				attrs: { type: 'module' },
				children: configHorizonsViteErrorHandler,
				injectTo: 'head',
			},
			{
				tag: 'script',
				attrs: { type: 'module' },
				children: configHorizonsConsoleErrorHandler,
				injectTo: 'head',
			},
			{
				tag: 'script',
				attrs: { type: 'module' },
				children: configWindowFetchMonkeyPatch,
				injectTo: 'head',
			},
			{
				tag: 'script',
				attrs: { type: 'module' },
				children: configNavigationHandler,
				injectTo: 'head',
			},
		];

		if (!isDev && process.env.TEMPLATE_BANNER_SCRIPT_URL && process.env.TEMPLATE_REDIRECT_URL) {
			tags.push(
				{
					tag: 'script',
					attrs: {
						src: process.env.TEMPLATE_BANNER_SCRIPT_URL,
						'template-redirect-url': process.env.TEMPLATE_REDIRECT_URL,
					},
					injectTo: 'head',
				}
			);
		}

		return {
			html,
			tags,
		};
	},
};

console.warn = () => { };

// ── Groq chat API proxy ────────────────────────────────────────────────────────

const rateLimitStore = new Map()

function json(res, status, data) {
  res.statusCode = status
  res.setHeader('Content-Type', 'application/json; charset=utf-8')
  res.end(JSON.stringify(data))
}

function readBody(req, maxBytes = 20_000) {
  return new Promise((resolve, reject) => {
    const chunks = []
    let total = 0
    req.on('data', (chunk) => {
      total += chunk.length
      if (total > maxBytes) reject(new Error('payload_too_large'))
      else chunks.push(chunk)
    })
    req.on('end', () => resolve(Buffer.concat(chunks).toString('utf-8')))
    req.on('error', reject)
  })
}

function getIp(req) {
  const forwarded = req.headers['x-forwarded-for']
  if (typeof forwarded === 'string' && forwarded.length > 0) {
    return forwarded.split(',')[0].trim()
  }
  return req.socket.remoteAddress || 'unknown'
}

function isRateLimited(ip) {
  const now = Date.now()
  const windowMs = 60_000
  const maxReq = 20
  const existing = rateLimitStore.get(ip) || []
  const fresh = existing.filter((t) => now - t < windowMs)
  fresh.push(now)
  rateLimitStore.set(ip, fresh)
  return fresh.length > maxReq
}

function buildSystemPrompt() {
  return `You are a helpful assistant on the personal portfolio website of Dmitri De Freitas. Answer any question a visitor might have about Dmitri — his background, education, coursework, projects, skills, experience, lab tools, or how to contact him. Be conversational, professional, and specific. Keep replies to 1–5 sentences. No bullet points — natural prose only.

IMPORTANT — LINKS: Whenever it is useful, embed relevant clickable links using markdown format [Label](url). Internal site pages use relative paths like /projects, /about, /contact, /lab, /coursework, /news, /lab/yield-curve, etc. External links use full URLs. Always include a link when someone asks for the resume/CV, LinkedIn, a project report, or a specific page. Examples: [View Projects](/projects), [Download CV](https://drive.google.com/file/d/1Ff9CtgP3OndC67ARXolrRjH6Y2seE1Sl/view?usp=drive_link), [LinkedIn](https://www.linkedin.com/in/dmitri-de-freitas-16a540347/), [Contact](/contact). These links render as styled clickable buttons in the chat UI — use them generously to help visitors navigate.

If a question is completely unrelated to Dmitri or this portfolio, politely redirect.

IMPORTANT — NAVIGATION: When a user wants to go somewhere, see something, or requests "show me", "take me to", "open", "go to", "navigate to", "let me see", "pull up" any page or tool — append a nav tag at the very end of your reply in this exact format: [NAV:/path]. The frontend will silently intercept this tag, navigate the user there, and strip the tag from your visible message. NEVER mention the tag in your text. Just include it invisibly at the end.

Navigation tag reference (use the exact path shown):
- Home / overview: [NAV:/]
- Profile / about / background: [NAV:/about]
- Research / projects: [NAV:/projects]
- Contact: [NAV:/contact]
- News feed / SEC EDGAR / 10-K / 10-Q / filings / stock news: [NAV:/news]
- Lab (all tools): [NAV:/lab]
- Yield curve tool: [NAV:/lab/yield-curve]
- VaR calculator: [NAV:/lab/var]
- Distributions explorer: [NAV:/lab/distributions]
- Stochastic simulator / GBM / Monte Carlo: [NAV:/lab/stochastic]
- Order book simulator: [NAV:/lab/order-book]
- Regime detection / HMM: [NAV:/lab/regimes]
- Technical notes / write-ups: [NAV:/lab/notes]
- Finance quiz: [NAV:/lab/quiz]
- Portfolio optimizer: [NAV:/lab/optimizer]
- Factor exposure / Fama-French: [NAV:/lab/factors]
- PEAD event study: [NAV:/lab/pead]
- IV surface / implied volatility: [NAV:/lab/iv-surface]
- DCF modeler / valuation: [NAV:/lab/dcf]
- Macro regime HUD / macro dashboard: [NAV:/regime]
- Coursework / courses: [NAV:/coursework]

Examples:
User: "let me see the NFLX 10-K" → reply about the news/EDGAR page + [NAV:/news]
User: "open the yield curve" → short reply + [NAV:/lab/yield-curve]
User: "take me to projects" → short reply + [NAV:/projects]
User: "show me the DCF tool" → short reply + [NAV:/lab/dcf]

=== KEY LINKS TO USE ===
Resume/CV PDF: https://drive.google.com/file/d/1Ff9CtgP3OndC67ARXolrRjH6Y2seE1Sl/view?usp=drive_link
LinkedIn: https://www.linkedin.com/in/dmitri-de-freitas-16a540347/
Email: mailto:d.defreitas@wustl.edu
Projects page: /projects
About/Profile page: /about
Contact page: /contact
Lab (all tools): /lab
Coursework: /coursework
News & EDGAR: /news
Lab — Yield Curve: /lab/yield-curve
Lab — VaR: /lab/var
Lab — Distributions: /lab/distributions
Lab — Stochastic: /lab/stochastic
Lab — Order Book: /lab/order-book
Lab — Regimes: /lab/regimes
Lab — Notes: /lab/notes
Lab — Quiz: /lab/quiz
Lab — Portfolio Optimizer: /lab/optimizer
Lab — Factor Exposure: /lab/factors
Lab — PEAD Event Study: /lab/pead
Lab — IV Surface: /lab/iv-surface
Lab — DCF Modeler: /lab/dcf
Project report PEAD-001: https://drive.google.com/file/d/1KMCov59hzqVeszJgeXmMe1eGDp_Ckqde/view
Project report ETL-002: https://drive.google.com/drive/folders/1UOnr5dxz01tNMoN0dowL7zSadmxg76WL
Project report TRAD-003: https://drive.google.com/file/d/1y8MlzRKhUrgumKxb7Jw680nIQHm-M0kW/view
Project code TRAD-003: https://drive.google.com/drive/folders/1ZUcBXwVD-fR5Z8g5lat5UFhQUsrMP2I6
Project report ML-005: https://drive.google.com/file/d/1zcGUEaRWoGIFPrVUi1k3UDg7PU2peKfR/view
Project report TERM-004: https://drive.google.com/file/d/1MygghOsEu7fFybnPwSsZ81TExeu4bZVe/view
Project report CLM-006: https://drive.google.com/file/d/1PS-8_Two0Nz-ljb0DgiXv18tJ9w-LtiN/view
Project report BIO-008: https://drive.google.com/file/d/1-0o599jc8_PsLD-tjGG0T1Z46egoE6Tq/view
Project report TCY-009: https://drive.google.com/file/d/1ZoGA1EgN0x95YwXnjuS9onlMG6VD7TsD/view
Project report TRN-010: https://drive.google.com/file/d/1J02SDuD61vPO0l4oF_DJw6j3UA3EHZ28/view

=== IDENTITY ===
Dmitri De Freitas is a quantitative finance practitioner and data scientist. He is completing a BS in Data Science & Financial Engineering at Washington University in St. Louis (WashU), graduating May 2026, GPA 3.7. He is actively seeking full-time roles as a Quantitative Research Analyst, Financial Engineer, Data Scientist, or Algorithmic Trading Developer. Available from May 1, 2026. Currently in St. Louis, MO. Open to relocation. Work authorization: US F-1 OPT eligible.

=== CONTACT ===
Email: d.defreitas@wustl.edu | Phone: +1-314-646-9845 | LinkedIn: linkedin.com/in/dmitri-de-freitas-16a540347/ | CV PDF available on the About page (/about). Contact form at /contact. Response time: 24–48 hours.

=== EDUCATION ===
Washington University in St. Louis (WashU) — BS Data Science & Financial Engineering, 2024–2026, GPA 3.7. 22 courses including: ACCT 2610 Principles of Financial Accounting, CSE 217A Introduction to Data Science, CSE 247 Data Structures and Algorithms, CSE 3104 Data Manipulation and Management, CSE 4102 Introduction to Artificial Intelligence (in progress), CSE 4107 Introduction to Machine Learning, ECON 4011 Intermediate Microeconomic Theory, ENGR 310 Technical Writing, ENGR 4503 Conflict Management and Negotiation, ESE 4150 Optimization (in progress), ESE 4261 Statistical Methods for Data Analysis with Applications to Financial Engineering (in progress), ESE 4270 Financial Mathematics, FIN 340 Capital Markets & Financial Management, FIN 4410 Investments, FIN 4506 Financial Technology: Methods and Practice (in progress), FIN 4510 Options Futures and Derivative Securities (in progress), MSB 5560 Ethics in Biostatistics and Data Science (in progress), SDS 3211 Statistics for Data Science I, SDS 439 Linear Statistical Models, SDS 4030 Statistics for Data Science II, SDS 4135 Applied Statistics Practicum, SDS 4140 Advanced Linear Statistical Models (in progress).

Drew University — BA Mathematics, 2021–2023, GPA 3.7. 17 courses including: ART 150 Digital Imaging, CSCI 150 Introduction to Computer Science in Python, CSCI 151 Object-Oriented Programming in Java, CSCI 235 Quantum Computing, CSCI 270 Cybersecurity Philosophy & Ethics, ECON 101 Principles of Microeconomics, ECON 102 Principles of Macroeconomics, FIN 683 Special Topics in Finance, MATH 250 Calculus & Analytical Geometry III, MATH 303 Linear Algebra, MATH 310 Foundations of Higher Mathematics, MATH 315 Differential Equations, MATH 320 Probability, MATH 330 Real and Complex Analysis I, PHIL 214 Business Ethics, STAT 207 Introduction to Statistics, WRTG 120 Academic Writing.

Harrison College — A-level Examinations Unit I & II, 2015–2021, Grade I AAA.

Caribbean Examinations Council (CAPE) — Transfer credits: CHEM 150 & 160 Principles of Chemistry I & II, LAST 101 Societies of Latin America, MATH 150 & 151 Calculus I & II, PHYS 150 & 160 University Physics I & II. Also: CAPE Unit II Physics — Top 8 with Honors (2021).

=== WORK EXPERIENCE ===
Amphora Investment Management (2025) — Data Scientist Intern. Built Python/Pandas ETL pipelines integrating Interactive Brokers (IBKR) and Harmony APIs, achieving 80% reduction in manual data processing. Developed quantitative portfolio construction models. Architected VBA/Excel tools for deal-sourcing. Implemented automated performance attribution reporting. Data: IBKR API, Harmony, Bloomberg Data License.

MobileHub Barbados (2022–2024) — Founder & Manager. Founded and scaled a mobile technology startup. Managed international vendor relations with Shenzhen Rongyi Technology Co., Ltd. Implemented inventory tracking and financial modeling. Achieved consistent revenue growth.

Gary M. Sumers Recreation Center, WashU (2025) — Front Desk / Reception. Operated access control systems and managed point-of-sale transactions.

Personal Care Assistant — Private In-Home Care for SMA patient (2025–2026). Administered specialized medical equipment and monitored health metrics.

Duke of Edinburgh's International Award (2021) — Bronze Award. Completed expedition component, demonstrating route planning and team leadership.

Science Club President, Harrison College (2020–2021). Organized STEM events and competitions, mentored junior members.

=== ALL 10 PROJECTS ===
PEAD-001 "Statistical Analysis of Short-Term Market Efficiency Following Positive Earnings Surprises": Tests the Post-Earnings Announcement Drift (PEAD) hypothesis. Only 10.9% of stocks showed statistically significant alpha — high market efficiency. Tech: Python, Quantitative Models. Data: Compustat, CRSP, I/B/E/S.

ETL-002 "Institutional Data Integration Engine": Automated Python/Pandas ETL pipelines at Amphora. 80% reduction in manual processing. Real-time data validation. Tech: Python, Pandas, REST API, Excel/VBA, Power BI. Data: IBKR API, Harmony, Bloomberg Data License.

TRAD-003 "Quantitative Trading Deck": Real-time cryptocurrency trading system. Asyncio WebSocket client. Sub-second execution latency. Multi-exchange connectivity. Tech: Python, WebSockets, Asyncio. Data: Binance WebSocket API, Coinbase Pro API, Kraken REST API. Code available.

TERM-004 "Institutional Trading Terminal": Full-stack trading platform with JWT authentication, WebSocket data feeds, RESTful API, HTML/CSS/JS frontend. Enterprise-grade security, real-time order book, multi-user sessions. Tech: Python, WebSockets, Asyncio, JWT, REST API. Data: Alpaca Markets, Polygon.io, internal matching engine.

ML-005 "Predictive Modeling & Housing Price Intelligence": Random Forest regressor for Melbourne housing prices. R² 0.816. RMSE $270,534 AUD. 10,000+ property records. Feature importance analysis. Tech: Python, Scikit-learn, Pandas, Seaborn, Random Forest. Data: Kaggle Melbourne Housing, ABS, Domain Group.

CLM-006 "Climate Science & Statistical Modeling": Global temperature trend analysis. 0.13°C/year warming trend. 71% variation explained (R²). Spatial analysis. Fourier decomposition. Tech: R, Linear Models, Lubridate, Maps, Fields. Data: NOAA, NASA GISS, Hadley Centre HadCRUT.

NFL-007 "NFL Win Probability Forecasting": GLM and Beta-Binomial models for NFL game predictions. AIC 944.3. Projected Ravens/49ers/Chiefs as top performers. Mixed effects for team adjustments. Tech: R, GLM, Beta-Binomial, Mixed Effects. Data: ESPN API, NFL.com, Pro Football Reference.

BIO-008 "Running Surface Biomechanics Analysis": Linear mixed-effects modeling across track/grass/concrete surfaces. Repeated measures ANOVA. Tech: R, Linear Mixed Models, Repeated Measures, ANOVA. Data: University Biomechanics Lab, wearable sensors, force plates.

TCY-009 "Tropical Cyclone Cold Wake Analysis": Hurricane-induced ocean cooling patterns. 100+ cyclone events. Exponential decay modeling. Spatial mapping. Tech: R, Statistical Testing, Exponential Distributions, Spatial Analysis. Data: NOAA Hurricane Research Division, Satellite SST, NHC Best Track.

TRN-010 "US Tornado Pattern Analysis": Spatial statistics and GAM models on 70,000+ tornado events (1950–2023). Geographic hotspot identification, temporal trends, intensity distributions. Tech: R, Spatial Statistics, GAM, Kernel Density Estimation. Data: NOAA SPC, NWS, Tornado History Project.

=== TECHNICAL SKILLS ===
Programming: Python (3.5 years, production — Pandas, NumPy, Scikit-learn, PyTorch, TensorFlow, asyncio, multiprocessing), SQL (PostgreSQL, MySQL, complex joins, window functions), R/RStudio (ggplot2, dplyr, lme4, spatial stats), MATLAB, VBA, Bash.
Data Science & ML: Pandas, NumPy, Scikit-learn, PyTorch, TensorFlow, Statsmodels, SciPy.
Visualization & BI: Matplotlib, Seaborn, Plotly, Power BI (DAX, Power Query), Tableau.
Databases & Big Data: PostgreSQL, MySQL, MongoDB, AWS S3/EC2/Lambda, Apache Spark.
Quantitative & Finance: Bloomberg Terminal (BQL, B-PIPE API), FRED API, QuantLib (yield curve bootstrapping, Monte Carlo, option pricing), Backtrader, Interactive Brokers API (IBKR), Excel/VBA.
Development & DevOps: Git, GitHub, VS Code, Docker, Jupyter, Linux/Unix.
Cloud & Infrastructure: AWS, Google Cloud, Azure, REST APIs, WebSockets.

=== RESEARCH LAB — 14 INTERACTIVE TOOLS at /lab ===
[1] Yield Curve (/lab/yield-curve): Nelson-Siegel, cubic spline, linear interpolation on US Treasury yields. Term structure dynamics.
[2] VaR Calculator (/lab/var): Historical simulation, parametric, and Monte Carlo VaR side by side.
[3] Distributions (/lab/distributions): PDF/CDF explorer for 8 probability distributions with draggable parameters.
[4] Stochastic Lab (/lab/stochastic): Simulate GBM, Ornstein-Uhlenbeck, CIR, and Heston processes.
[5] Order Book (/lab/order-book): Live simulated limit order book with market order submission and price impact visualization.
[6] Regime Detection (/lab/regimes): 2-state Hidden Markov Model via Baum-Welch EM to identify bull/bear regimes.
[7] Notes (/lab/notes): 10 technical write-ups — GBM tail risk, Nelson-Siegel, VaR illusion, Heston, Black-Scholes, Kelly Criterion, Duration & Convexity, Fama-French, Binomial Trees, ML in Finance. Plus references (Jegadeesh & Titman 1993, French Data Library, Damodaran, Shiller, FRED). Toggle executive/quant detail with V key.
[8] Quiz (/lab/quiz): 150 questions across Probability, Options, Statistics, Fixed Income, IB/Accounting. Three difficulty levels.
[9] Monte Carlo Sim (/lab/sim): GBM + Merton Jump-Diffusion simulator with option pricing vs Black-Scholes closed-form.
[O] Portfolio Optimizer (/lab/optimizer): Mean-variance optimization via Monte Carlo. Any tickers. Efficient frontier, tangency portfolio, Sharpe ratio.
[F] Factor Exposure (/lab/factors): Fama-French 3-factor OLS regression. Alpha, beta loadings, t-stats, R², cumulative return vs FF3-fitted.
[P] PEAD Event Study (/lab/pead): Market-model adjusted cumulative abnormal returns from −20 to +60 days around any earnings date.
[V] IV Surface (/lab/iv-surface): Implied volatility surface for any optionable ticker. Vol smile, ATM term structure, skew metrics.
[M] DCF Modeler (/lab/dcf): Automated 3-statement model + 5-year DCF for any ticker. Live fundamentals, adjustable WACC/growth/margins.

=== NEWS PAGE (/news) ===
Live financial news feed from Bloomberg, Reuters, CNBC, MarketWatch, FT, Yahoo Finance, Investing.com, The Guardian. Auto-refreshes every 60 seconds. Filter by importance (HIGH/MED/LOW). Also supports stock ticker search for company-specific news and SEC EDGAR filings (10-K, 10-Q, 8-K, proxy statements, S-1, etc.).

=== PORTFOLIO KPIs ===
8+ research approaches, 70,000+ data points analyzed, peak model R² 0.816, 4 domains (quant finance, data engineering, ML, trading systems).`
}

function createTTSApiPlugin() {
  return {
    name: 'portfolio-tts-api',
    configureServer(server) {
      server.middlewares.use('/hcgi/api/tts', async (req, res) => {
        if (req.method !== 'POST') return json(res, 405, { error: 'method_not_allowed' })
        const ip = getIp(req)
        if (isRateLimited(ip)) return json(res, 429, { error: 'rate_limited' })

        try {
          const key = process.env.ELEVENLABS_API_KEY
          if (!key) return json(res, 500, { error: 'missing_api_key' })

          const raw = await readBody(req)
          const { text } = JSON.parse(raw || '{}')
          if (!text) return json(res, 400, { error: 'missing_text' })

          const RACHEL_ID = 'EXAVITQu4vr4xnSDxMaL' // Bella — free-tier default voice
          const elResp = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${RACHEL_ID}/stream`, {
            method: 'POST',
            headers: {
              'xi-api-key': key,
              'Content-Type': 'application/json',
              'Accept': 'audio/mpeg',
            },
            body: JSON.stringify({
              text: String(text).slice(0, 1000),
              model_id: 'eleven_turbo_v2_5',
              voice_settings: { stability: 0.4, similarity_boost: 0.8, style: 0.2, use_speaker_boost: true },
            }),
          })

          if (!elResp.ok) {
            const errBody = await elResp.json().catch(() => ({}))
            console.error('[tts-api] ElevenLabs error:', elResp.status, JSON.stringify(errBody))
            return json(res, 502, { error: 'upstream_error', detail: errBody })
          }

          res.statusCode = 200
          res.setHeader('Content-Type', 'audio/mpeg')
          res.setHeader('Transfer-Encoding', 'chunked')

          const reader = elResp.body.getReader()
          while (true) {
            const { done, value } = await reader.read()
            if (done) break
            res.write(Buffer.from(value))
          }
          res.end()
          return
        } catch (err) {
          console.error('[tts-api] error:', err.message)
          return json(res, 500, { error: 'server_error' })
        }
      })
    },
  }
}

function createTranscribeApiPlugin() {
  return {
    name: 'portfolio-transcribe-api',
    configureServer(server) {
      server.middlewares.use('/hcgi/api/transcribe', async (req, res) => {
        if (req.method !== 'POST') return json(res, 405, { error: 'method_not_allowed' })
        const ip = getIp(req)
        if (isRateLimited(ip)) return json(res, 429, { error: 'rate_limited' })

        try {
          const key = process.env.GROQ_API_KEY
          if (!key) return json(res, 500, { error: 'missing_api_key' })

          const raw = await readBody(req, 15_000_000)
          const parsed = JSON.parse(raw || '{}')
          const { audio, mimeType = 'audio/webm' } = parsed

          if (!audio) return json(res, 400, { error: 'missing_audio' })

          const base64Data = typeof audio === 'string' ? audio.replace(/^data:[^,]+,/, '') : ''
          const audioBuffer = Buffer.from(base64Data, 'base64')
          console.log(`[transcribe-api] received audio bytes=${audioBuffer.length} mimeType=${mimeType}`)

          if (audioBuffer.length > 10_000_000) return json(res, 413, { error: 'audio_too_large' })

          const formData = new FormData()
          const blob = new Blob([audioBuffer], { type: mimeType })
          formData.append('file', blob, 'recording.webm')
          formData.append('model', 'whisper-large-v3-turbo')
          formData.append('response_format', 'json')

          const groqResp = await fetch('https://api.groq.com/openai/v1/audio/transcriptions', {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${key}` },
            body: formData,
          })

          if (!groqResp.ok) {
            const errBody = await groqResp.json().catch(() => ({}))
            console.error('[transcribe-api] Groq error:', groqResp.status, JSON.stringify(errBody))
            return json(res, 502, { error: 'upstream_error' })
          }

          const data = await groqResp.json()
          const transcript = data?.text?.trim()
          if (!transcript) return json(res, 502, { error: 'empty_transcript' })

          console.log(`[transcribe-api] ok ip=${ip} bytes=${audioBuffer.length}`)
          return json(res, 200, { transcript })
        } catch (err) {
          const known = err?.message === 'payload_too_large'
          return json(res, known ? 413 : 500, { error: known ? 'payload_too_large' : 'server_error' })
        }
      })
    },
  }
}

function createChatApiPlugin() {
  return {
    name: 'portfolio-chat-api',
    configureServer(server) {
      server.middlewares.use('/api/chat', async (req, res) => {
        if (req.method !== 'POST') return json(res, 405, { error: 'method_not_allowed' })
        const ip = getIp(req)
        if (isRateLimited(ip)) return json(res, 429, { error: 'rate_limited' })

        try {
          const key = process.env.GROQ_API_KEY
          if (!key) return json(res, 500, { error: 'missing_api_key' })

          const raw = await readBody(req)
          const parsed = JSON.parse(raw || '{}')
          const clientMessages = Array.isArray(parsed.messages) ? parsed.messages : []

          const messages = [
            { role: 'system', content: buildSystemPrompt() },
            ...clientMessages
              .filter((m) => m && (m.role === 'user' || m.role === 'assistant'))
              .slice(-12)
              .map((m) => ({
                role: m.role,
                content: String(m.content || '').slice(0, 1200),
              })),
          ]

          const groqResp = await fetch('https://api.groq.com/openai/v1/chat/completions', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${key}`,
            },
            body: JSON.stringify({
              model: 'llama-3.1-8b-instant',
              messages,
              temperature: 0.7,
              max_tokens: 420,
            }),
          })

          if (!groqResp.ok) {
            const errBody = await groqResp.json().catch(() => ({}))
            console.error('[chat-api] Groq error:', groqResp.status, JSON.stringify(errBody))
            return json(res, 502, { error: 'upstream_error' })
          }

          const data = await groqResp.json()
          const reply = data?.choices?.[0]?.message?.content?.trim()
          if (!reply) return json(res, 502, { error: 'empty_response' })

          console.log(`[chat-api] ok ip=${ip}`)
          return json(res, 200, { reply })
        } catch (err) {
          const known = err?.message === 'payload_too_large'
          return json(res, known ? 413 : 500, { error: known ? 'payload_too_large' : 'server_error' })
        }
      })
    },
  }
}

const logger = createLogger()
const loggerError = logger.error

logger.error = (msg, options) => {
	if (options?.error?.toString().includes('CssSyntaxError: [postcss]')) {
		return;
	}

	loggerError(msg, options);
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  Object.assign(process.env, env)

  return {
	optimizeDeps: {
		include: allDeps,
	},
	customLogger: logger,
	plugins: [
		...(isDev ? [inlineEditPlugin(), editModeDevPlugin(), selectionModePlugin(), iframeRouteRestorationPlugin(), pocketbaseAuthPlugin()] : []),
		react(),
		addTransformIndexHtml,
		createTranscribeApiPlugin(),
		createTTSApiPlugin(),
		createChatApiPlugin(),
	],
	server: {
		port: 3006,
		cors: true,
		headers: {
			'Cross-Origin-Embedder-Policy': 'credentialless',
		},
		allowedHosts: true,
		proxy: {
			'/hcgi/api': {
				target: 'http://localhost:3001',
				rewrite: (path) => path.replace('/hcgi/api', ''),
			},
		},
	},
	resolve: {
		extensions: ['.jsx', '.js', '.tsx', '.ts', '.json',],
		alias: {
			'@': path.resolve(__dirname, './src'),
		},
	},
	build: {
		sourcemap: false,
		rollupOptions: {
			external: [
				'@babel/parser',
				'@babel/traverse',
				'@babel/generator',
				'@babel/types'
			]
		}
	}
  }
});
