import React, { useState, useMemo, useEffect } from 'react';
import { Helmet } from 'react-helmet';
import { motion, AnimatePresence } from 'framer-motion';

const API_BASE = window.location.hostname === 'localhost'
  ? '/hcgi/api'
  : 'https://newsapi-xspv.onrender.com';

// ── DCF core ──────────────────────────────────────────────────────────────────
function runDCF({ baseRevenue, wacc, tgr, revGrowth, ebitdaMargin, daPct, capexPct, nwcPct, taxRate }) {
  if (wacc <= tgr) return null;
  let prev = baseRevenue, prevNWC = baseRevenue * nwcPct;
  const fcffs = [];
  for (let yr = 1; yr <= 5; yr++) {
    const rev = prev * (1 + revGrowth);
    const nopat = (rev * ebitdaMargin - rev * daPct) * (1 - taxRate);
    const dNWC = rev * nwcPct - prevNWC;
    fcffs.push(nopat + rev * daPct - rev * capexPct - dNWC);
    prev = rev; prevNWC = rev * nwcPct;
  }
  const tv = (fcffs[4] * (1 + tgr)) / (wacc - tgr);
  let pv = 0;
  fcffs.forEach((f, i) => { pv += f / (1 + wacc) ** (i + 1); });
  const pvTV = tv / (1 + wacc) ** 5;
  return { ev: pv + pvTV, pv, pvTV };
}

// ── Sectors ───────────────────────────────────────────────────────────────────
const SECTORS = ['ALL', 'FINTECH', 'ENERGY', 'TECH', 'URANIUM', 'DEFENSE'];
const SECTOR_COLOR = {
  FINTECH:  '#6366f1',
  ENERGY:   '#f97316',
  TECH:     '#22c55e',
  URANIUM:  '#eab308',
  DEFENSE:  '#ef4444',
};

// ── Conviction ────────────────────────────────────────────────────────────────
const CONV_COLOR = { 'HIGH': '#22c55e', 'MEDIUM-HIGH': '#84cc16', 'MEDIUM': '#eab308' };

// ── Memos ─────────────────────────────────────────────────────────────────────
const MEMOS = [
  /* ────────── FINTECH ──────────── */
  {
    id: 'msci', ticker: 'MSCI', company: 'MSCI Inc.', sector: 'FINTECH',
    date: 'Q1 2025', conviction: 'HIGH',
    thesis_short: 'MSCI is a toll booth on passive investing — index licensing compounds at ~15% with near-zero marginal cost.',
    thesis_long: `MSCI's index business earns fees as a percentage of AUM benchmarked to its indices, meaning revenue grows automatically as markets rise and passive flows accelerate. The top-5 ETF providers manage over $10T against MSCI indices, and every incremental dollar of inflows generates recurring revenue with no corresponding cost.\n\nThe analytics and ESG segments add diversification at high margins. Real estate (MSCI RCA) is underappreciated — the only institutional-grade CRE analytics platform globally, protected by proprietary transaction data no competitor can replicate.\n\nCapital allocation is exceptional: ~$4B returned via buybacks and dividends over three years, funded by 90%+ FCF conversion. The multiple reflects quality; the debate is whether 12–15% organic growth sustains it — the structural case says it does.`,
    dcf: { baseRevenue: 2.8e9, revGrowth: 0.13, wacc: 0.085, tgr: 0.04, ebitdaMargin: 0.56, daPct: 0.04, capexPct: 0.04, nwcPct: 0.02, taxRate: 0.22, netDebt: 3.4e9, shares: 78e6, currentPrice: 510 },
    sliders: { revGrowth: { min: 0.05, max: 0.22, step: 0.01, label: 'Revenue Growth' }, wacc: { min: 0.07, max: 0.12, step: 0.005, label: 'WACC' }, tgr: { min: 0.02, max: 0.05, step: 0.005, label: 'Terminal Growth' } },
    metrics: [{ label: 'EV/EBITDA', value: '33.2x' }, { label: 'FCF Yield', value: '2.8%' }, { label: 'Rev CAGR (3Y)', value: '14.1%' }, { label: 'EBITDA Margin', value: '56%' }],
    risks: [
      { title: 'Passive reversion', body: 'A structural shift back to active management compresses AUM-based licensing without any cost offset. Unlikely near-term but would be a permanent revenue impairment.' },
      { title: 'ESG regulatory headwinds', body: 'EU taxonomy divergence or US anti-ESG legislation could impair the ESG segment\'s ~20% revenue CAGR and force costly compliance restructuring.' },
      { title: 'Client fee compression', body: 'BlackRock and Vanguard have negotiated bespoke licensing agreements. At scale, the largest clients may push back harder than consensus models assume.' },
    ],
  },
  {
    id: 'ibkr', ticker: 'IBKR', company: 'Interactive Brokers Group', sector: 'FINTECH',
    date: 'Q1 2025', conviction: 'HIGH',
    thesis_short: 'IBKR is the only brokerage where the cost structure is a genuine moat — technology-first operations produce 60%+ pre-tax margins competitors cannot replicate.',
    thesis_long: `Interactive Brokers built its own exchange connectivity, clearing, and margin engine from scratch, running the most complex brokerage operation in the world at a fraction of peer costs. The 60–65% pre-tax margin is structural, not cyclical — it reflects a 30-year head start in automation that is irreproducible.\n\nNII on margin balances and customer cash nearly doubled from 2021 to 2024 as rates rose. Even in a cutting cycle, IBKR's FDIC sweep structure retains NII better than retail brokers. International expansion (IBKR Singapore, Europe) adds institutional clients at the margin.\n\nThe market prices this as a retail brokerage. It is a fintech infrastructure play. At ~18x forward earnings it trades at a discount to inferior franchises.`,
    dcf: { baseRevenue: 4.4e9, revGrowth: 0.12, wacc: 0.09, tgr: 0.035, ebitdaMargin: 0.62, daPct: 0.03, capexPct: 0.05, nwcPct: 0.01, taxRate: 0.17, netDebt: -4.2e9, shares: 420e6, currentPrice: 185 },
    sliders: { revGrowth: { min: 0.05, max: 0.20, step: 0.01, label: 'Revenue Growth' }, wacc: { min: 0.07, max: 0.13, step: 0.005, label: 'WACC' }, tgr: { min: 0.02, max: 0.05, step: 0.005, label: 'Terminal Growth' } },
    metrics: [{ label: 'P/E (Fwd)', value: '18.4x' }, { label: 'Pre-tax Margin', value: '63%' }, { label: 'Rev CAGR (3Y)', value: '26.4%' }, { label: 'NII / Rev', value: '58%' }],
    risks: [
      { title: 'Rate sensitivity', body: 'A 200bps rate cut cycle reduces estimated NII by $600–800M. The stock is structurally long rates and consensus may not fully model a prolonged easing cycle.' },
      { title: 'Founder governance concentration', body: 'Thomas Peterffy controls ~75% of voting power. Succession creates strategic uncertainty without clear mitigation.' },
      { title: 'Zero-commission competition', body: 'Robinhood and Tastytrade compete aggressively on retail flow. IBKR\'s institutional skew insulates it, but retail customer acquisition cost has risen.' },
    ],
  },
  {
    id: 'tw', ticker: 'TW', company: 'Tradeweb Markets', sector: 'FINTECH',
    date: 'Q4 2024', conviction: 'MEDIUM-HIGH',
    thesis_short: 'Tradeweb is the structural beneficiary of fixed-income electronification — a $27T addressable market still ~70% voice-traded.',
    thesis_long: `Fixed income electronification is the last major market structure shift in capital markets. Equities went electronic in the 1990s; bonds are doing it now, driven by Basel III dealer constraints, MiFID II transparency requirements, and buy-side best-execution mandates.\n\nTradeweb's moat is network density: 2,500+ institutional clients and 40+ liquidity providers on a single platform. RFQ protocol creates switching costs because alternatives require rebuilding dealer connectivity from scratch. Portfolio Trading grew 50%+ YoY and is structurally disintermediating voice desks.\n\nAt 40% EBITDA margins with ~15% organic revenue growth, the compounding case is straightforward. Nasdaq Fixed Income adds retail and wholesale treasury distribution as a second growth vector.`,
    dcf: { baseRevenue: 1.5e9, revGrowth: 0.14, wacc: 0.088, tgr: 0.038, ebitdaMargin: 0.42, daPct: 0.05, capexPct: 0.05, nwcPct: 0.02, taxRate: 0.24, netDebt: -0.8e9, shares: 475e6, currentPrice: 115 },
    sliders: { revGrowth: { min: 0.06, max: 0.22, step: 0.01, label: 'Revenue Growth' }, wacc: { min: 0.07, max: 0.12, step: 0.005, label: 'WACC' }, tgr: { min: 0.02, max: 0.05, step: 0.005, label: 'Terminal Growth' } },
    metrics: [{ label: 'EV/EBITDA', value: '38.5x' }, { label: 'EBITDA Margin', value: '42%' }, { label: 'Rev CAGR (3Y)', value: '16.2%' }, { label: 'Credit Mkt Share', value: '~23%' }],
    risks: [
      { title: 'MarketAxess dominance in IG credit', body: 'MKTX has deeper liquidity in investment-grade credit. Tradeweb\'s credit share gains have been slower than in rates — its core margin segment.' },
      { title: 'Rate volatility dependency', body: 'ADV is correlated with rate volatility. A prolonged low-vol environment compresses volumes while fixed costs remain sticky.' },
      { title: 'Exchange vertical integration', body: 'CME and ICE are building or acquiring treasury trading capabilities. Success would directly compete in Tradeweb\'s highest-margin segment.' },
    ],
  },
  {
    id: 'fds', ticker: 'FDS', company: 'FactSet Research Systems', sector: 'FINTECH',
    date: 'Q4 2024', conviction: 'MEDIUM',
    thesis_short: 'FactSet is a 95%+ retention subscription business entering an AI upgrade cycle that will monetize at higher ASPs than sell-side models currently assume.',
    thesis_long: `FactSet's 30-year relationship with buy-side analysts — the people who use the terminal, not IT departments — produces 95–96% annual subscription retention that is structurally stable through cycles.\n\nThe AI thesis is grounded: FactSet's RBICS industry taxonomy and entity-mapped data is precisely what LLM fine-tuning requires. The "Cogniti" AI assistant is the first layer to market with proprietary data differentiation. A 5–10% ASP lift from AI monetization carries 90%+ incremental margin.\n\nValuation at ~28x forward earnings prices in that optionality. I view it as fair, not expensive, because consensus underweights retention stability and ignores buy-side headcount recovery from the 2023 trough.`,
    dcf: { baseRevenue: 2.2e9, revGrowth: 0.09, wacc: 0.087, tgr: 0.035, ebitdaMargin: 0.37, daPct: 0.04, capexPct: 0.04, nwcPct: 0.02, taxRate: 0.18, netDebt: 0.8e9, shares: 38e6, currentPrice: 450 },
    sliders: { revGrowth: { min: 0.04, max: 0.16, step: 0.01, label: 'Revenue Growth' }, wacc: { min: 0.07, max: 0.12, step: 0.005, label: 'WACC' }, tgr: { min: 0.02, max: 0.05, step: 0.005, label: 'Terminal Growth' } },
    metrics: [{ label: 'P/E (Fwd)', value: '27.8x' }, { label: 'ASV Retention', value: '95.8%' }, { label: 'Rev CAGR (3Y)', value: '9.4%' }, { label: 'EBITDA Margin', value: '36.7%' }],
    risks: [
      { title: 'Bloomberg entrenchment', body: 'Bloomberg Terminal holds ~30% of the desktop analytics market under multi-year enterprise agreements. The replacement cycle requires 12–18 months of internal justification per account.' },
      { title: 'Buy-side headcount compression', body: 'AUM compression and hedge fund closures directly reduce seat count. A 2022-style drawdown in alternatives would push FDS revenue growth to low single digits.' },
      { title: 'AI commoditization risk', body: 'Generative AI could commoditize the research workflows FactSet charges for. Cogniti is the right strategic response, but execution risk is material.' },
    ],
  },
  {
    id: 'cboe', ticker: 'CBOE', company: 'Cboe Global Markets', sector: 'FINTECH',
    date: 'Q1 2025', conviction: 'MEDIUM-HIGH',
    thesis_short: 'Cboe\'s 0DTE options monopoly is a structural volume floor — retail has permanently discovered short-dated options and Cboe is the only venue.',
    thesis_long: `Zero-days-to-expiration SPX options went from 20% of SPX volume in 2020 to 50%+ in 2024. Cboe has 100% market share on this product by virtue of its exclusive SPX license and cash-settlement mechanics. This is a permanent behavioral shift, not a fad.\n\nCboe's per-contract fee on SPX options (~$0.60) is materially above equity options (~$0.05), so even flat contract counts drive revenue growth as mix shifts toward SPX/VIX. International expansion — Cboe Europe Derivatives, EDGA, Cboe Clear Europe — adds recurring fee revenue diversifying away from US equity vol.\n\nAt ~21x forward earnings with 60% EBITDA margins and a volume floor from 0DTE, this is a high-quality compounder at a reasonable entry.`,
    dcf: { baseRevenue: 2.1e9, revGrowth: 0.10, wacc: 0.085, tgr: 0.035, ebitdaMargin: 0.58, daPct: 0.04, capexPct: 0.04, nwcPct: 0.01, taxRate: 0.25, netDebt: 1.5e9, shares: 84e6, currentPrice: 205 },
    sliders: { revGrowth: { min: 0.04, max: 0.18, step: 0.01, label: 'Revenue Growth' }, wacc: { min: 0.07, max: 0.12, step: 0.005, label: 'WACC' }, tgr: { min: 0.02, max: 0.05, step: 0.005, label: 'Terminal Growth' } },
    metrics: [{ label: 'P/E (Fwd)', value: '21.3x' }, { label: 'EBITDA Margin', value: '58%' }, { label: '0DTE Vol Share', value: '100%' }, { label: 'Rev CAGR (3Y)', value: '10.8%' }],
    risks: [
      { title: '0DTE systemic concern', body: 'Concentrated 0DTE dealer hedging may amplify intraday vol events. A high-profile circuit-breaker episode could trigger SEC scrutiny of the product.' },
      { title: 'CME competitive response', body: 'CME\'s expansion into micro E-mini products and rate derivatives continues. Any incursion into equity derivatives would erode Cboe\'s pricing power.' },
      { title: 'Volatility cycle dependency', body: 'The VIX complex is pro-cyclical. Prolonged low-vol environments compress ADV — the business cannot fully decouple from the macro regime.' },
    ],
  },

  /* ────────── ENERGY ──────────── */
  {
    id: 'et', ticker: 'ET', company: 'Energy Transfer LP', sector: 'ENERGY',
    date: 'Q1 2025', conviction: 'HIGH',
    thesis_short: 'ET is the most undervalued midstream MLP — ~8% distribution yield, 2x coverage, $40B asset base trading at a 40% discount to large-cap pipeline peers on EV/EBITDA.',
    thesis_long: `Energy Transfer's fee-based midstream network spans over 125,000 miles of pipeline across natural gas, NGL, crude, and refined products — one of the most diversified asset bases in midstream. Approximately 90% of EBITDA is fee-based, providing cash flow visibility regardless of commodity prices.\n\nThe distribution yield of ~8% is covered 2x by distributable cash flow, a level of safety that large-cap peers like EPD trade at a premium. ET's discount is a governance hangover from the 2020 distribution cut and Kelcy Warren's historical decision-making. Neither concern is currently operative — the balance sheet is at target leverage, DCF coverage is rising, and capital allocation is disciplined.\n\nLNG export infrastructure investment (Lake Charles, Mariner East II expansions) positions ET for the next decade of US natural gas export growth. The market is not pricing this optionality.`,
    dcf: { baseRevenue: 14e9, revGrowth: 0.06, wacc: 0.085, tgr: 0.025, ebitdaMargin: 0.58, daPct: 0.06, capexPct: 0.08, nwcPct: 0.01, taxRate: 0.05, netDebt: 50e9, shares: 3400e6, currentPrice: 19 },
    sliders: { revGrowth: { min: 0.02, max: 0.12, step: 0.01, label: 'EBITDA Growth' }, wacc: { min: 0.07, max: 0.12, step: 0.005, label: 'WACC' }, tgr: { min: 0.01, max: 0.04, step: 0.005, label: 'Terminal Growth' } },
    metrics: [{ label: 'Dist. Yield', value: '~8%' }, { label: 'DCF Coverage', value: '2.0x' }, { label: 'EV/EBITDA', value: '7.2x' }, { label: 'Miles of Pipe', value: '125k+' }],
    risks: [
      { title: 'Governance and founder risk', body: 'Kelcy Warren\'s historical pattern of prioritizing strategic control over minority LP interests remains a structural overhang. The 2020 distribution cut demonstrated willingness to act against LP interests.' },
      { title: 'Commodity-linked volume risk', body: 'While fees are largely fixed, throughput volumes are sensitive to E&P activity. A sustained oil price decline below $55/bbl would pressure producer drilling activity and throughput.' },
      { title: 'Transition exposure', body: 'ET\'s NGL and natural gas focus is more defensible than crude, but a faster-than-expected US gas demand decline would impair terminal value assumptions.' },
    ],
  },
  {
    id: 'oxy', ticker: 'OXY', company: 'Occidental Petroleum', sector: 'ENERGY',
    date: 'Q1 2025', conviction: 'MEDIUM-HIGH',
    thesis_short: 'OXY\'s Permian Basin position + Berkshire\'s 28% stake creates a floor; CrownRock integration and the chemicals business provide upside the market undervalues.',
    thesis_long: `Occidental's Permian Basin acreage — now enhanced by the CrownRock acquisition — ranks among the highest-return drilling inventories in US E&P. Sub-$40/bbl breakeven on core Midland Basin positions means OXY generates meaningful FCF across a wide range of oil price scenarios.\n\nThe OxyChem segment (a chlor-alkali and VCM chemicals business) is a durable earnings contributor that diversifies the commodity cycle. At trough chemical margins, OxyChem still generates $1–1.5B in annual pre-tax income.\n\nBerkshire Hathaway's 28% equity stake plus $8.5B in preferred stock is the clearest expression of long-term conviction on the asset quality. The preferred provides a permanent floor on capital allocation optionality. CrownRock integration debt is the near-term headwind; it is also the reason the stock trades at a discount that creates the opportunity.`,
    dcf: { baseRevenue: 28e9, revGrowth: 0.04, wacc: 0.10, tgr: 0.02, ebitdaMargin: 0.34, daPct: 0.08, capexPct: 0.12, nwcPct: 0.02, taxRate: 0.22, netDebt: 18e9, shares: 920e6, currentPrice: 48 },
    sliders: { revGrowth: { min: -0.02, max: 0.12, step: 0.01, label: 'Revenue Growth' }, wacc: { min: 0.08, max: 0.14, step: 0.005, label: 'WACC' }, tgr: { min: 0.01, max: 0.03, step: 0.005, label: 'Terminal Growth' } },
    metrics: [{ label: 'P/E (Fwd)', value: '14.2x' }, { label: 'Breakeven', value: '~$40/bbl' }, { label: 'BRK Stake', value: '28%' }, { label: 'Net Debt', value: '$18B' }],
    risks: [
      { title: 'Oil price leverage', body: 'OXY is high-beta to crude. Every $10/bbl move in WTI changes estimated 2025 FCF by ~$1.5B. A sustained move below $55/bbl would pressure dividend sustainability.' },
      { title: 'CrownRock debt overhang', body: 'The $12B acquisition added significant leverage. Until debt is reduced to target levels (<$15B net debt), capital return flexibility is constrained.' },
      { title: 'Direct Air Capture capital allocation', body: 'OXY\'s Stratos DAC facility is capital-intensive and may dilute returns if DOE tax credit realization is slower than management projects.' },
    ],
  },
  {
    id: 'slb', ticker: 'SLB', company: 'SLB (Schlumberger)', sector: 'ENERGY',
    date: 'Q4 2024', conviction: 'MEDIUM',
    thesis_short: 'SLB\'s digital transformation (Delfi platform, AI-driven reservoir simulation) is repricing oilfield services as recurring software revenue, not a pure capex cycle play.',
    thesis_long: `SLB has executed a deliberate transition from a headcount-driven service business toward a software-and-data model. The Delfi digital platform — which integrates subsurface data, reservoir simulation, and production optimization — now generates $3B+ in annual digital revenue, growing 30%+ YoY. This is fundamentally different from the commodity nature of well services.\n\nInternational E&P spending is structurally above the 2015–2020 trough: NOCs in the Middle East, Latin America, and Africa are executing multi-year development programs with long lead times. SLB's international exposure (~80% of revenue) insulates it from US shale cyclicality.\n\nAt 13x forward P/E with 20%+ EBITDA margins and mid-teens digital revenue growth, the valuation does not fully reflect the business mix transformation underway.`,
    dcf: { baseRevenue: 36e9, revGrowth: 0.07, wacc: 0.095, tgr: 0.025, ebitdaMargin: 0.20, daPct: 0.04, capexPct: 0.06, nwcPct: 0.03, taxRate: 0.22, netDebt: 10e9, shares: 1400e6, currentPrice: 40 },
    sliders: { revGrowth: { min: 0.02, max: 0.14, step: 0.01, label: 'Revenue Growth' }, wacc: { min: 0.08, max: 0.13, step: 0.005, label: 'WACC' }, tgr: { min: 0.01, max: 0.04, step: 0.005, label: 'Terminal Growth' } },
    metrics: [{ label: 'P/E (Fwd)', value: '13.1x' }, { label: 'Digital Rev', value: '$3B+' }, { label: 'Int\'l Mix', value: '~80%' }, { label: 'EBITDA Margin', value: '20%' }],
    risks: [
      { title: 'E&P capex cycle risk', body: 'A sustained oil price decline would trigger E&P budget cuts, reducing well activity and SLB\'s services revenue. The digital backlog provides some insulation but not immunity.' },
      { title: 'Digital adoption pace', body: 'NOC adoption of AI-driven reservoir tools is slower than independent E&Ps. If the digital revenue growth rate decelerates, the valuation re-rating thesis stalls.' },
      { title: 'Geopolitical exposure', body: 'SLB\'s significant Russia revenue was impaired by sanctions. Similar exposure to Middle East conflict escalation or Venezuela policy reversals creates binary scenario risk.' },
    ],
  },
  {
    id: 'fang', ticker: 'FANG', company: 'Diamondback Energy', sector: 'ENERGY',
    date: 'Q1 2025', conviction: 'HIGH',
    thesis_short: 'Diamondback is the highest-return Permian pure play — sub-$30/bbl breakeven, best-in-class margins, and a disciplined return-of-capital framework that outperforms peers.',
    thesis_long: `Diamondback operates exclusively in the Midland and Delaware basins of the Permian — the lowest-cost, highest-productivity oil plays in the US. Its sub-$30/bbl cash breakeven (including base dividend) is 20–30% below peer average, creating significant FCF margin of safety across the commodity cycle.\n\nThe Endeavor Energy acquisition (completed 2024) added ~500,000 contiguous Midland Basin acres, extending the high-return drilling inventory by an estimated 10+ years while achieving immediate synergies on overhead and completion costs. The combined entity generates ~$5B in annual FCF at $70/bbl.\n\nManagement has an explicit commitment to returning 75%+ of FCF to shareholders via buybacks and dividends. At current valuations this implies ~10% annual per-share buyback, creating a compelling total return case independent of oil price direction.`,
    dcf: { baseRevenue: 9e9, revGrowth: 0.07, wacc: 0.10, tgr: 0.02, ebitdaMargin: 0.58, daPct: 0.10, capexPct: 0.14, nwcPct: 0.02, taxRate: 0.22, netDebt: 12e9, shares: 290e6, currentPrice: 165 },
    sliders: { revGrowth: { min: -0.02, max: 0.15, step: 0.01, label: 'Revenue Growth' }, wacc: { min: 0.08, max: 0.14, step: 0.005, label: 'WACC' }, tgr: { min: 0.01, max: 0.03, step: 0.005, label: 'Terminal Growth' } },
    metrics: [{ label: 'P/E (Fwd)', value: '10.8x' }, { label: 'Breakeven', value: '<$30/bbl' }, { label: 'FCF Yield', value: '~12%' }, { label: 'Return Target', value: '75% FCF' }],
    risks: [
      { title: 'Concentrated Permian exposure', body: 'FANG has no geographic diversification. Midland Basin pipeline takeaway constraints, water disposal tightness, or regulatory changes in Texas create idiosyncratic risk.' },
      { title: 'Endeavor integration complexity', body: 'Large-scale acreage integrations carry cultural, operational, and personnel retention risks. Synergy realization is typically back-loaded.' },
      { title: 'Oil price beta', body: 'Despite the low breakeven, FANG is high-beta to WTI. Every $10/bbl move shifts EV/FCF valuation materially, and the stock will trade the commodity before it trades the quality.' },
    ],
  },
  {
    id: 'mpc', ticker: 'MPC', company: 'Marathon Petroleum', sector: 'ENERGY',
    date: 'Q4 2024', conviction: 'MEDIUM',
    thesis_short: 'MPC is the most capital-efficient US refiner, with MPLX\'s MLP structure generating durable midstream cash flow that the market systematically undervalues in the consolidated entity.',
    thesis_long: `Marathon Petroleum operates 13 refineries with ~3M bbl/day capacity, making it the second-largest US refiner. Its $20B ownership stake in MPLX LP provides captive, fee-based midstream cash flows that significantly reduce the cyclicality of pure refining.\n\nUS refining capacity has been structurally reduced since 2020 — five major refineries closed without replacement. This permanently raised the domestic crack spread equilibrium, supporting MPC's margin baseline even as demand moderates. MPC's coastal refinery exposure (Los Angeles, Garyville) captures premium over inland crack spreads.\n\nManagement has demonstrated best-in-class capital discipline: $21B returned to shareholders over the past 5 years at ~10% of current market cap per year. The MPLX IDR elimination in 2022 streamlined capital allocation. At 7x forward EV/EBITDA vs 10x for diversified energy, the discount is unwarranted.`,
    dcf: { baseRevenue: 18e9, revGrowth: 0.03, wacc: 0.095, tgr: 0.02, ebitdaMargin: 0.12, daPct: 0.04, capexPct: 0.05, nwcPct: 0.02, taxRate: 0.23, netDebt: 8e9, shares: 390e6, currentPrice: 145 },
    sliders: { revGrowth: { min: -0.03, max: 0.10, step: 0.01, label: 'Revenue Growth' }, wacc: { min: 0.08, max: 0.13, step: 0.005, label: 'WACC' }, tgr: { min: 0.01, max: 0.03, step: 0.005, label: 'Terminal Growth' } },
    metrics: [{ label: 'EV/EBITDA', value: '7.1x' }, { label: 'Capacity', value: '3M bbl/d' }, { label: 'MPLX Stake', value: '~$20B' }, { label: 'Buybacks (5Y)', value: '$21B' }],
    risks: [
      { title: 'Crack spread compression', body: 'Refining margins are cyclical and can compress rapidly. A demand shock or new capacity addition (Dangote refinery in Nigeria) could compress US crack spreads faster than consensus expects.' },
      { title: 'Renewable fuel policy', body: 'RFS mandates and state-level low-carbon fuel standards impose compliance costs and could impair the long-run economics of conventional refinery assets.' },
      { title: 'Throughput vol risk', body: 'MPC\'s refinery utilization (~95%) provides limited buffer. Unplanned outages or catastrophic weather events can disproportionately impair quarterly results.' },
    ],
  },

  /* ────────── TECH ──────────── */
  {
    id: 'nbis', ticker: 'NBIS', company: 'Nebius Group', sector: 'TECH',
    date: 'Q1 2025', conviction: 'HIGH',
    thesis_short: 'Nebius is building European GPU cloud infrastructure at the moment of maximum AI demand — $2.5B of net cash, zero legacy liabilities, and a clean-sheet architecture purpose-built for LLM training.',
    thesis_long: `Nebius emerged from Yandex's 2024 restructuring as an independent AI infrastructure company, retaining the international data center assets, GPU cluster expertise, and engineering talent while jettisoning all Russia exposure. The result is a rare thing: a well-funded, technically sophisticated GPU cloud operator with $2.5B+ in net cash and no debt.\n\nThe European AI cloud market is structurally underserved by US hyperscalers facing data sovereignty constraints. Nebius's Tier-1 Helsinki data center (1,200+ H100 GPUs, scaling to 35,000+) serves exactly the enterprises that cannot use AWS or Azure for regulatory reasons.\n\nAt sub-2x revenue on projected 2026 numbers, this is priced as a speculative early-stage company, not the capital-light, contract-backed GPU cloud it is actually building. The cash position alone ($2.5B) represents a meaningful percentage of current market cap.`,
    dcf: { baseRevenue: 250e6, revGrowth: 0.80, wacc: 0.14, tgr: 0.04, ebitdaMargin: 0.22, daPct: 0.10, capexPct: 0.30, nwcPct: 0.02, taxRate: 0.15, netDebt: -2500e6, shares: 340e6, currentPrice: 22 },
    sliders: { revGrowth: { min: 0.30, max: 1.20, step: 0.05, label: 'Revenue Growth' }, wacc: { min: 0.10, max: 0.20, step: 0.01, label: 'WACC' }, tgr: { min: 0.03, max: 0.06, step: 0.005, label: 'Terminal Growth' } },
    metrics: [{ label: 'Net Cash', value: '$2.5B' }, { label: 'GPUs (Target)', value: '35,000+' }, { label: 'Rev Growth', value: '80%+ YoY' }, { label: 'Stage', value: 'Early scale' }],
    risks: [
      { title: 'Pre-profitability execution risk', body: 'NBIS is investing ahead of revenue. CapEx requirements for GPU cluster build-out are high and the path to sustained EBITDA profitability depends on customer contract ramp.' },
      { title: 'Hyperscaler competition', body: 'AWS, Azure, and Google Cloud are investing aggressively in European infrastructure. Their scale, existing customer relationships, and ecosystem lock-in are structural advantages.' },
      { title: 'Customer concentration', body: 'Early-stage GPU clouds often have 2–3 anchor customers representing the majority of utilization. Loss of a key anchor before the customer base diversifies would materially impair near-term economics.' },
    ],
  },
  {
    id: 'pltr', ticker: 'PLTR', company: 'Palantir Technologies', sector: 'TECH',
    date: 'Q1 2025', conviction: 'MEDIUM-HIGH',
    thesis_short: 'Palantir\'s AIP platform converts LLMs into enterprise operational decisions — 15 years of government-grade data infrastructure moat cannot be replicated from a SaaS starting point.',
    thesis_long: `Palantir's foundational insight was that AI/ML models are worthless without data ontology — the structured representation of how an organization's data assets relate to each other. Palantir spent 15 years building those ontologies for the US government and intelligence community. AIP (Artificial Intelligence Platform) now makes those same architectures available to commercial enterprises as a product.\n\nThe US government channel is a 15-year distribution moat. FedRAMP authorizations, classified cloud access, and DOD trust relationships cannot be recreated in a 12-month sales cycle. USAF, Army, and NHS deployments provide both revenue and case studies that commercial sales teams leverage.\n\nUS commercial is the growth driver: 55%+ YoY US commercial revenue growth for 4 consecutive quarters, driven by AIP boot camps converting prospects to customers in days rather than months.`,
    dcf: { baseRevenue: 2.8e9, revGrowth: 0.28, wacc: 0.11, tgr: 0.04, ebitdaMargin: 0.20, daPct: 0.03, capexPct: 0.03, nwcPct: 0.02, taxRate: 0.18, netDebt: -3.8e9, shares: 2100e6, currentPrice: 95 },
    sliders: { revGrowth: { min: 0.15, max: 0.45, step: 0.01, label: 'Revenue Growth' }, wacc: { min: 0.09, max: 0.16, step: 0.005, label: 'WACC' }, tgr: { min: 0.03, max: 0.06, step: 0.005, label: 'Terminal Growth' } },
    metrics: [{ label: 'P/S (Fwd)', value: '38x' }, { label: 'US Comm. Growth', value: '55%+ YoY' }, { label: 'Rule of 40', value: '68%' }, { label: 'Net Cash', value: '$3.8B' }],
    risks: [
      { title: 'Multiple compresses on deceleration', body: 'At 35–40x forward revenue, PLTR has essentially no margin of error. Any sign of growth deceleration in US commercial would compress the multiple materially and rapidly.' },
      { title: 'International commercial weakness', body: 'International commercial revenue growth has consistently lagged the US. If the AIP product-led growth model does not translate across geographies, the TAM narrative weakens.' },
      { title: 'Founder concentration', body: 'Karp and Thiel control the company through super-voting shares. Strategic decisions (e.g., defense partnerships, executive compensation) have historically not prioritized ordinary shareholder interests.' },
    ],
  },
  {
    id: 'crwd', ticker: 'CRWD', company: 'CrowdStrike Holdings', sector: 'TECH',
    date: 'Q1 2025', conviction: 'HIGH',
    thesis_short: 'CrowdStrike\'s Falcon platform is the consolidation winner in cybersecurity — the July 2024 outage paradoxically accelerated enterprise commitment to the platform through expanded remediation contracts.',
    thesis_long: `CrowdStrike's Falcon is the de-facto endpoint security standard for Fortune 500 enterprises. Its unified-agent, cloud-native architecture processes 1 trillion+ daily threat signals, creating a security AI flywheel where more data improves detection, which attracts more customers, which generates more data.\n\nThe July 2024 Falcon sensor update incident caused widespread outages but had a counterintuitive competitive outcome: enterprises that considered switching instead negotiated deeper, longer-term agreements with remediation credits — effectively raising switching costs and strengthening the installed base. Net retention rates recovered to 120%+ within two quarters.\n\nWith 28+ Falcon modules and a platform-sale motion, CRWD's average customer now uses 7+ modules vs 4 in 2021. Module expansion drives NRR above 120% without incremental sales cost — a powerful unit economics dynamic.`,
    dcf: { baseRevenue: 4.0e9, revGrowth: 0.25, wacc: 0.105, tgr: 0.04, ebitdaMargin: 0.22, daPct: 0.03, capexPct: 0.04, nwcPct: 0.02, taxRate: 0.20, netDebt: -3.5e9, shares: 250e6, currentPrice: 360 },
    sliders: { revGrowth: { min: 0.15, max: 0.38, step: 0.01, label: 'ARR Growth' }, wacc: { min: 0.09, max: 0.15, step: 0.005, label: 'WACC' }, tgr: { min: 0.03, max: 0.06, step: 0.005, label: 'Terminal Growth' } },
    metrics: [{ label: 'ARR', value: '$4.2B' }, { label: 'NRR', value: '120%+' }, { label: 'Avg Modules', value: '7+' }, { label: 'EBITDA Margin', value: '22%' }],
    risks: [
      { title: 'Litigation from July 2024 outage', body: 'Delta Air Lines and others have filed suits. While insurance coverage is substantial, prolonged litigation creates headline risk and potential liability that is not fully modeled.' },
      { title: 'Microsoft Security bundling', body: 'Microsoft Defender is increasingly competitive with enterprise endpoint security. Bundling with M365 lowers the friction of switching away from CRWD for cost-sensitive buyers.' },
      { title: 'Valuation leaves no room for error', body: 'At 12–15x forward revenue, CrowdStrike is priced for extended hypergrowth. Any sustained deceleration in ARR growth below 20% would compress multiples materially.' },
    ],
  },
  {
    id: 'net', ticker: 'NET', company: 'Cloudflare Inc.', sector: 'TECH',
    date: 'Q4 2024', conviction: 'MEDIUM-HIGH',
    thesis_short: 'Cloudflare is building the network layer that sits between every server and every user — its SASE platform is positioned to own enterprise network security by 2027.',
    thesis_long: `Cloudflare operates one of the most distributed global networks in existence — 310+ cities, within 50ms of 95% of the internet-connected population. That physical proximity is a moat: security and performance functions that compete with Cloudflare would require billions in data center capex to replicate.\n\nZero-Trust Network Access (ZTNA) and Secure Access Service Edge (SASE) are replacing VPNs and hardware firewalls. Cloudflare's One platform consolidates these functions into a single network-layer product, eliminating the need for Zscaler, Palo Alto hardware, and legacy VPN vendors simultaneously.\n\nAt $2B+ ARR and 27%+ growth, Cloudflare is still in the early innings of converting its massive developer and SMB free-tier user base (~35% of the Fortune 1000 already paying) into enterprise SASE contracts. The go-to-market motion from developer to IT buyer is a proven playbook.`,
    dcf: { baseRevenue: 2.0e9, revGrowth: 0.26, wacc: 0.11, tgr: 0.04, ebitdaMargin: 0.12, daPct: 0.04, capexPct: 0.12, nwcPct: 0.02, taxRate: 0.10, netDebt: -1.5e9, shares: 340e6, currentPrice: 105 },
    sliders: { revGrowth: { min: 0.15, max: 0.40, step: 0.01, label: 'Revenue Growth' }, wacc: { min: 0.09, max: 0.15, step: 0.005, label: 'WACC' }, tgr: { min: 0.03, max: 0.06, step: 0.005, label: 'Terminal Growth' } },
    metrics: [{ label: 'ARR', value: '$2.0B+' }, { label: 'Rev Growth', value: '27%' }, { label: 'Network PoPs', value: '310+' }, { label: 'F1000 Coverage', value: '~35%' }],
    risks: [
      { title: 'Path to GAAP profitability is long', body: 'NET has been investing heavily in network infrastructure and S&M. GAAP profitability is multiple years away; in a higher-for-longer rate environment, the long-duration nature of the thesis is a headwind.' },
      { title: 'SASE competition is intensifying', body: 'Palo Alto Networks, Zscaler, and Cisco all have credible SASE offerings. Cloudflare\'s differentiation on price and network-nativeness may not be sufficient for large enterprise security budgets.' },
      { title: 'Sales cycle elongation', body: 'Enterprise SASE deals are multi-stakeholder, long-cycle transactions. Any macro-driven IT spending freeze would slow pipeline conversion and compress near-term revenue growth.' },
    ],
  },
  {
    id: 'anet', ticker: 'ANET', company: 'Arista Networks', sector: 'TECH',
    date: 'Q1 2025', conviction: 'HIGH',
    thesis_short: 'Arista owns the AI data center switching layer — 400G/800G Ethernet for hyperscaler AI training clusters is the highest-growth segment in enterprise networking.',
    thesis_long: `Arista's EOS (Extensible Operating System) is the only cloud-native network OS deployed at hyperscale — AWS, Microsoft, Meta, and Google all run Arista in their AI training infrastructure. The software architecture allows Arista to deliver features Cisco cannot match without a full hardware redesign.\n\n400G and 800G AI back-end networking for GPU clusters is the fastest-growing segment in Arista's revenue mix. Microsoft's Azure AI and Meta's AI Research Supercluster deployments are multi-year contracts that provide visibility. Arista's Ultra Ethernet Consortium (with AMD, Broadcom, Meta) is standardizing the Ethernet-based AI networking stack against InfiniBand.\n\nAt 33x forward earnings, it is not cheap — but it is the clearest expression of AI infrastructure spend that is already deployed, contracted, and generating revenue, rather than speculative.`,
    dcf: { baseRevenue: 7.0e9, revGrowth: 0.20, wacc: 0.10, tgr: 0.035, ebitdaMargin: 0.38, daPct: 0.02, capexPct: 0.03, nwcPct: 0.02, taxRate: 0.20, netDebt: -4.5e9, shares: 310e6, currentPrice: 380 },
    sliders: { revGrowth: { min: 0.10, max: 0.30, step: 0.01, label: 'Revenue Growth' }, wacc: { min: 0.08, max: 0.14, step: 0.005, label: 'WACC' }, tgr: { min: 0.02, max: 0.05, step: 0.005, label: 'Terminal Growth' } },
    metrics: [{ label: 'P/E (Fwd)', value: '33x' }, { label: 'Rev Growth', value: '20%+' }, { label: 'Gross Margin', value: '64%' }, { label: 'Net Cash', value: '$4.5B' }],
    risks: [
      { title: 'Hyperscaler build-out timing risk', body: 'Arista\'s revenue is highly concentrated in Microsoft, Meta, and a handful of cloud providers. Any capex pause or shift in hyperscaler networking strategy creates lumpy revenue risk.' },
      { title: 'Cisco competitive response', body: 'Cisco is investing heavily in AI-native networking through Silicon One and its acquired startups. Arista\'s EOS software lead is real but must be continuously re-earned.' },
      { title: 'InfiniBand vs Ethernet outcome', body: 'NVIDIA\'s Quantum InfiniBand still dominates HPC AI training. If AI cluster architectures remain InfiniBand-dominant longer than expected, Arista\'s AI back-end addressable market is smaller than consensus assumes.' },
    ],
  },

  /* ────────── URANIUM ──────────── */
  {
    id: 'ccj', ticker: 'CCJ', company: 'Cameco Corporation', sector: 'URANIUM',
    date: 'Q1 2025', conviction: 'HIGH',
    thesis_short: 'Cameco is the tier-one uranium equity — McArthur River is the world\'s highest-grade mine, and Westinghouse ownership adds a nuclear fuel cycle services asset that re-rates the multiple.',
    thesis_long: `Cameco's McArthur River and Cigar Lake mines in the Athabasca Basin produce uranium at grades 10–100x the global average — a physical cost advantage that makes them the last assets to be shut in during a downcycle and the first to benefit from spot price appreciation.\n\nThe 49% ownership stake in Westinghouse Electric (alongside Brookfield) transforms Cameco from a commodity miner into an integrated nuclear fuel cycle company. Westinghouse services 50%+ of the world's operating reactors and recently won the AP1000 build contracts for Central and Eastern Europe — a 10-year revenue stream.\n\nUranium spot at $85–100/lb is still below the $120+/lb level required to incentivize new conventional mine supply. With 2.5B lbs of demand committed under long-term utility contracts through 2040, the structural case for sustained elevated pricing is strong.`,
    dcf: { baseRevenue: 2.8e9, revGrowth: 0.12, wacc: 0.09, tgr: 0.03, ebitdaMargin: 0.38, daPct: 0.06, capexPct: 0.08, nwcPct: 0.02, taxRate: 0.20, netDebt: 1.2e9, shares: 425e6, currentPrice: 48 },
    sliders: { revGrowth: { min: 0.04, max: 0.22, step: 0.01, label: 'Revenue Growth' }, wacc: { min: 0.07, max: 0.13, step: 0.005, label: 'WACC' }, tgr: { min: 0.02, max: 0.05, step: 0.005, label: 'Terminal Growth' } },
    metrics: [{ label: 'P/E (Fwd)', value: '28x' }, { label: 'Avg Grade', value: '14.5% U' }, { label: 'WH Stake', value: '49%' }, { label: 'LT Contract Mix', value: '~80%' }],
    risks: [
      { title: 'Uranium spot price volatility', body: 'While most of CCJ\'s production is contracted, mark-to-market spot moves drive equity sentiment. A return to sub-$60/lb would compress the narrative even if realized prices hold.' },
      { title: 'Kazatomprom production escalation', body: 'Kazakhstan\'s state uranium company controls ~45% of global supply and has periodically used production as a geopolitical lever. A volume surge would pressure spot prices.' },
      { title: 'Westinghouse integration risk', body: 'The Westinghouse acquisition added meaningful leverage. Integration complexity and the cyclicality of new nuclear builds create execution risk that the legacy mining model didn\'t carry.' },
    ],
  },
  {
    id: 'nxe', ticker: 'NXE', company: 'NexGen Energy', sector: 'URANIUM',
    date: 'Q1 2025', conviction: 'MEDIUM-HIGH',
    thesis_short: 'NexGen\'s Arrow deposit is the largest high-grade undeveloped uranium project in the Western world — a development-stage asset positioned to deliver 25M lbs/year into a structurally short market by 2028.',
    thesis_long: `Arrow (Rook I Project, Athabasca Basin) contains 257M lbs of indicated U₃O₈ at 3.06% average grade — numbers that place it in a category above any other undeveloped uranium asset globally. The project's $1.3B capital cost produces a sub-$8/lb AISC, generating extraordinary economics at any realistic future uranium price.\n\nProject permitting is advancing through the Canadian Impact Assessment Act process with the Environmental Assessment panel report expected in 2025. First production is targeted for 2028, which would add ~5% to global annual production from a single Tier-1, politically stable jurisdiction.\n\nNexGen's long-term uranium contracts with US and European utilities signal that the project has buyer demand secured well in advance of production. The equity is a call option on Arrow's NPV at future uranium prices — at $100/lb spot the project NPV exceeds $10B vs a current market cap of ~$3B.`,
    dcf: { baseRevenue: 100e6, revGrowth: 1.50, wacc: 0.12, tgr: 0.03, ebitdaMargin: 0.70, daPct: 0.12, capexPct: 0.40, nwcPct: 0.02, taxRate: 0.18, netDebt: -0.2e9, shares: 600e6, currentPrice: 7 },
    sliders: { revGrowth: { min: 0.50, max: 2.50, step: 0.10, label: 'Production Ramp' }, wacc: { min: 0.10, max: 0.18, step: 0.01, label: 'WACC' }, tgr: { min: 0.02, max: 0.05, step: 0.005, label: 'Terminal Growth' } },
    metrics: [{ label: 'Resource', value: '257M lbs' }, { label: 'Avg Grade', value: '3.06%' }, { label: 'Target AISC', value: '<$8/lb' }, { label: 'Prod. Target', value: '2028' }],
    risks: [
      { title: 'Permitting and regulatory delay', body: 'Canadian Impact Assessment permitting is subject to political and Indigenous consultation requirements. A 2–3 year delay to first production materially impairs the NPV, which is sensitive to time-to-cash-flow.' },
      { title: 'Pre-revenue capital requirement', body: 'Arrow requires ~$1.3B in construction capital. Equity raises at current prices would be dilutive. Debt financing depends on uranium price and contract coverage at close.' },
      { title: 'Execution risk at scale', body: 'No ISR technology is used at Arrow — it is a conventional underground mine in a challenging geological environment. Construction cost overruns are a real risk for a greenfield development.' },
    ],
  },
  {
    id: 'dnn', ticker: 'DNN', company: 'Denison Mines', sector: 'URANIUM',
    date: 'Q4 2024', conviction: 'MEDIUM',
    thesis_short: 'Denison\'s Wheeler River ISR project is the lowest-cost uranium development in Canada — in-situ recovery eliminates the need for conventional underground mining, targeting sub-$7/lb AISC.',
    thesis_long: `Denison's Phoenix deposit within the Wheeler River project is being developed using in-situ recovery (ISR) technology — a technique that dissolves uranium underground with a chemical solution, eliminating the capital and operating costs of traditional hard-rock mining. At Athabasca Basin grades, ISR has never been attempted before, making Wheeler River a technically pioneering project.\n\nIf successful, Wheeler River's AISC of $6.50–7.50/lb would be competitive with the lowest-cost conventional producers in Kazakhstan, at a fraction of their capital cost (~$330M vs $1B+ for comparable conventional mines). The project is funded through to the construction decision, with a $300M+ uranium purchase agreement with Korea Hydro & Nuclear Power providing partial financing clarity.\n\nDenison also holds a 22.5% interest in the McClean Lake mill — one of only two uranium mills in Canada — providing leverage on processing throughput as Athabasca Basin production increases.`,
    dcf: { baseRevenue: 30e6, revGrowth: 2.00, wacc: 0.13, tgr: 0.03, ebitdaMargin: 0.65, daPct: 0.15, capexPct: 0.50, nwcPct: 0.02, taxRate: 0.17, netDebt: -0.15e9, shares: 850e6, currentPrice: 2.10 },
    sliders: { revGrowth: { min: 0.50, max: 3.00, step: 0.10, label: 'Production Ramp' }, wacc: { min: 0.10, max: 0.18, step: 0.01, label: 'WACC' }, tgr: { min: 0.02, max: 0.05, step: 0.005, label: 'Terminal Growth' } },
    metrics: [{ label: 'Resource', value: '109M lbs' }, { label: 'Target AISC', value: '~$7/lb' }, { label: 'Method', value: 'ISR (novel)' }, { label: 'Mill Stake', value: '22.5% MCLM' }],
    risks: [
      { title: 'ISR technology risk in Athabasca', body: 'ISR uranium recovery has never been proven in Athabasca Basin sandstone. The geology may behave differently than Kazakhstan ISR operations, creating cost overrun and production rate uncertainty.' },
      { title: 'Funding and dilution risk', body: 'Development capital requirements could require equity issuance at current speculative-grade valuations. Dilution risk is material for a pre-revenue development company.' },
      { title: 'Regulatory and permitting timeline', body: 'Canadian Nuclear Safety Commission review processes are thorough and time-consuming. A novel extraction technology adds regulatory scrutiny that could delay construction approval by 12–24 months.' },
    ],
  },
  {
    id: 'uuuu', ticker: 'UUUU', company: 'Energy Fuels Inc.', sector: 'URANIUM',
    date: 'Q1 2025', conviction: 'MEDIUM',
    thesis_short: 'Energy Fuels is the only US company producing both uranium and heavy rare earth elements — domestic supply chain policy creates pricing premiums that the purely commodity-focused market fails to price.',
    thesis_long: `Energy Fuels operates the White Mesa Mill — the only conventional uranium processing facility in the US — and is in active production of uranium across Wyoming and Utah. The White Mesa Mill's unique configuration also allows it to process rare earth carbonate, making UUUU the only US company with dual-commodity production capability at a single facility.\n\nUS government policy under the Inflation Reduction Act and executive orders mandating domestic critical mineral supply chains creates a structural premium for US-sourced uranium and REEs. DOE contracts and utility procurement programs explicitly favor US-origin supply, providing above-spot pricing that global producers cannot capture.\n\nThe rare earth strategy (processing Brazilian xenotime to separate HREE — neodymium, praseodymium, dysprosium) is still early-stage but represents a material optionality. At $100/lb uranium and commercial-scale REE separation, EBITDA could double from current levels.`,
    dcf: { baseRevenue: 150e6, revGrowth: 0.35, wacc: 0.13, tgr: 0.03, ebitdaMargin: 0.28, daPct: 0.08, capexPct: 0.18, nwcPct: 0.03, taxRate: 0.18, netDebt: -0.10e9, shares: 175e6, currentPrice: 5.80 },
    sliders: { revGrowth: { min: 0.10, max: 0.60, step: 0.05, label: 'Revenue Growth' }, wacc: { min: 0.10, max: 0.18, step: 0.01, label: 'WACC' }, tgr: { min: 0.02, max: 0.05, step: 0.005, label: 'Terminal Growth' } },
    metrics: [{ label: 'Facility', value: 'White Mesa Mill' }, { label: 'U Production', value: '1M+ lbs/yr' }, { label: 'US Policy Moat', value: 'IRA + EOs' }, { label: 'HREE Stage', value: 'Early' }],
    risks: [
      { title: 'Policy reversal risk', body: 'Domestic supply chain preferences are executive-order-driven and subject to reversal. A policy shift that equalizes global uranium procurement would eliminate UUUU\'s pricing premium.' },
      { title: 'Rare earth processing scalability', body: 'HREE separation is technically complex and the market is still dominated by Chinese processors. UUUU\'s REE revenues are small and face execution risk at commercial scale.' },
      { title: 'Small scale and concentration', body: 'White Mesa Mill is a single facility. Any operational disruption, environmental incident, or NRC license issue creates binary near-term risk.' },
    ],
  },
  {
    id: 'uec', ticker: 'UEC', company: 'Uranium Energy Corp', sector: 'URANIUM',
    date: 'Q4 2024', conviction: 'MEDIUM',
    thesis_short: 'UEC\'s hub-and-spoke ISR model in Texas and Wyoming can restart production within 60–90 days of a price signal — the fastest optionality-to-production conversion in the US uranium space.',
    thesis_long: `Uranium Energy Corp operates ISR uranium recovery facilities in South Texas (Palangana, Burke Hollow) and Wyoming (Christensen Ranch, Reno Creek) under active NRC licenses with infrastructure in place. The "hub-and-spoke" model — centralized processing with multiple satellite wellfields — allows rapid production restart without the permitting lead time of greenfield development.\n\nUEC also holds the largest uranium resource inventory in the US (over 900M lbs combined measured, indicated, and inferred), providing production growth optionality beyond the ISR portfolio. The 2022 acquisition of Uranium One Americas added US conventional assets at cyclical trough pricing.\n\nAs a US-domiciled, US-operated uranium producer, UEC benefits from the same domestic supply chain premium as UUUU — utility procurement programs and DOE strategic reserve purchases create above-spot pricing access.`,
    dcf: { baseRevenue: 60e6, revGrowth: 0.55, wacc: 0.14, tgr: 0.03, ebitdaMargin: 0.25, daPct: 0.10, capexPct: 0.25, nwcPct: 0.03, taxRate: 0.18, netDebt: -0.10e9, shares: 340e6, currentPrice: 5.20 },
    sliders: { revGrowth: { min: 0.20, max: 0.90, step: 0.05, label: 'Production Ramp' }, wacc: { min: 0.11, max: 0.19, step: 0.01, label: 'WACC' }, tgr: { min: 0.02, max: 0.05, step: 0.005, label: 'Terminal Growth' } },
    metrics: [{ label: 'US Resource', value: '900M+ lbs' }, { label: 'Restart Lead Time', value: '60–90 days' }, { label: 'ISR Licenses', value: '4 active' }, { label: 'Jurisdiction', value: 'US only' }],
    risks: [
      { title: 'Equity dilution history', body: 'UEC has funded exploration and acquisition with equity raises at various prices. At current valuations, additional dilutive capital raises remain a risk for speculative-grade development companies.' },
      { title: 'ISR aquifer and environmental risk', body: 'ISR operations introduce lixiviant solution into groundwater aquifers. Restoration to baseline water quality is a regulatory requirement; failure creates long-tail liability.' },
      { title: 'Commodity price timing', body: 'UEC\'s economics are entirely contingent on uranium spot and contract prices. A return to 2016-era $18/lb pricing would make all ISR operations uneconomic regardless of restart speed.' },
    ],
  },

  /* ────────── DEFENSE ──────────── */
  {
    id: 'lmt', ticker: 'LMT', company: 'Lockheed Martin', sector: 'DEFENSE',
    date: 'Q1 2025', conviction: 'HIGH',
    thesis_short: 'Lockheed Martin is a 50-year annuity on US defense spending — F-35 production, HIMARS international demand, and hypersonics backlog provide revenue visibility through 2030+.',
    thesis_long: `Lockheed Martin's F-35 program alone represents the most complex and largest defense procurement in history — 3,000+ aircraft to be delivered to 17 nations over 20+ years, with each aircraft generating 40–50 years of sustainment revenue. The maintenance and upgrade tail is a recurring annuity that competitors cannot displace.\n\nThe geopolitical environment has created demand surges that exceed production capacity: HIMARS export orders following Ukraine conflict, Patriot system expansion by NATO allies, and F-35 commitments from Japan, South Korea, and Finland are all multi-year backlog items. The total backlog exceeded $165B as of Q4 2024.\n\nAt 18x forward earnings with a 3% dividend yield and $6B+ in annual FCF, Lockheed is an unusual combination of defensive income characteristics and secular defense spending growth. The multiple is not demanding for the certainty of cash flows.`,
    dcf: { baseRevenue: 68e9, revGrowth: 0.05, wacc: 0.08, tgr: 0.025, ebitdaMargin: 0.13, daPct: 0.02, capexPct: 0.03, nwcPct: 0.01, taxRate: 0.16, netDebt: 16e9, shares: 240e6, currentPrice: 460 },
    sliders: { revGrowth: { min: 0.02, max: 0.10, step: 0.01, label: 'Revenue Growth' }, wacc: { min: 0.07, max: 0.11, step: 0.005, label: 'WACC' }, tgr: { min: 0.01, max: 0.04, step: 0.005, label: 'Terminal Growth' } },
    metrics: [{ label: 'P/E (Fwd)', value: '18x' }, { label: 'Backlog', value: '$165B+' }, { label: 'Div Yield', value: '3.0%' }, { label: 'F-35 Nations', value: '17' }],
    risks: [
      { title: 'F-35 production cost overruns', body: 'Fixed-price F-35 LRIP contracts have periodically generated losses when production cost estimates proved optimistic. Any repeat creates material P&L headwinds on a program central to the investment thesis.' },
      { title: 'NGAD next-gen fighter competition', body: 'The Next Generation Air Dominance program could eventually displace F-35 for advanced USAF requirements. Boeing and Northrop are competing — loss of NGAD would affect long-run revenue replacement.' },
      { title: 'Defense budget sequestration risk', body: 'US defense spending is subject to congressional appropriations. A bipartisan debt ceiling agreement that includes defense cuts would impair the backlog conversion pace.' },
    ],
  },
  {
    id: 'rtx', ticker: 'RTX', company: 'RTX Corporation', sector: 'DEFENSE',
    date: 'Q1 2025', conviction: 'HIGH',
    thesis_short: 'RTX\'s Raytheon missiles division is the direct beneficiary of NATO re-armament — Patriot, AMRAAM, and Stinger demand has a multi-year backlog that exceeds current production capacity.',
    thesis_long: `RTX's Raytheon missiles segment is experiencing demand growth that is structurally unlike any post-Cold War period. Ukraine conflict consumption has demonstrated that modern warfare depletes precision munitions at rates that existing NATO stockpiles cannot sustain. The response — Allied Defense Ministers committed 2%+ of GDP to defense — creates a decade-long procurement cycle.\n\nPatriot intercept missiles (GEM-T, PAC-3 MSE) are in extreme shortage: Poland, Germany, Japan, South Korea, and Taiwan are all in the procurement queue behind Ukraine replenishment. AMRAAM (air-to-air) and StormBreaker (smart bomb) face similar backlogs. Factory expansion investments are in progress but capacity constraints will persist through at least 2026.\n\nPratt & Whitney's GTF engine issues (powder metal disk recall) are a near-term headwind but are being managed through an accelerated inspection and repair program. The commercial aerospace recovery remains intact, and GTF recall costs are bounded.`,
    dcf: { baseRevenue: 80e9, revGrowth: 0.07, wacc: 0.085, tgr: 0.025, ebitdaMargin: 0.13, daPct: 0.03, capexPct: 0.04, nwcPct: 0.02, taxRate: 0.18, netDebt: 25e9, shares: 1300e6, currentPrice: 115 },
    sliders: { revGrowth: { min: 0.03, max: 0.12, step: 0.01, label: 'Revenue Growth' }, wacc: { min: 0.07, max: 0.12, step: 0.005, label: 'WACC' }, tgr: { min: 0.01, max: 0.04, step: 0.005, label: 'Terminal Growth' } },
    metrics: [{ label: 'P/E (Fwd)', value: '19.5x' }, { label: 'Defense Backlog', value: '$60B+' }, { label: 'Div Yield', value: '2.2%' }, { label: 'GTF Recall Cost', value: '$6–7B' }],
    risks: [
      { title: 'GTF recall cost escalation', body: 'The powder metal disk recall program has a $6–7B total cost estimate that could prove conservative if inspection findings expand scope. This is the most significant near-term earnings headwind.' },
      { title: 'Commercial aerospace cyclicality', body: 'Pratt & Whitney\'s commercial engine business is leveraged to air travel demand. A renewed demand shock would impair the commercial aerospace recovery thesis.' },
      { title: 'Raytheon contract execution risk', body: 'Accelerated production ramp on fixed-price contracts (LTAMDS, SPY-6 radar) creates execution risk if labor and component costs exceed original program cost estimates.' },
    ],
  },
  {
    id: 'noc', ticker: 'NOC', company: 'Northrop Grumman', sector: 'DEFENSE',
    date: 'Q4 2024', conviction: 'MEDIUM-HIGH',
    thesis_short: 'Northrop\'s B-21 Raider and GBSD ICBM programs are the two most consequential DoD programs of record — both create 30-year sole-source revenue streams with no competitive threat.',
    thesis_long: `Northrop Grumman is the sole producer of the B-21 Raider stealth bomber, the first new US bomber in 35 years, with a program of record of 100+ aircraft at an estimated $700M+ per unit. Beyond the initial build, each B-21 generates 50 years of sustainment revenue — maintenance, upgrades, classified systems integration — that is contractually protected from competition.\n\nThe Ground Based Strategic Deterrent (GBSD / Sentinel ICBM) replacement program is the other pillar: a sole-source contract to replace 400 Minuteman III ICBMs at an estimated $95–100B total program cost. Recent restructuring to Cost-Plus following a Nunn-McCurdy breach has actually reduced financial risk while preserving the revenue stream.\n\nThe space and cyber segments (Defense Electronic Systems, Mission Systems) provide diversified exposure to satellite systems, intelligence, and electronic warfare — all areas of significant DoD investment priority.`,
    dcf: { baseRevenue: 40e9, revGrowth: 0.06, wacc: 0.085, tgr: 0.025, ebitdaMargin: 0.115, daPct: 0.025, capexPct: 0.035, nwcPct: 0.02, taxRate: 0.17, netDebt: 12e9, shares: 155e6, currentPrice: 470 },
    sliders: { revGrowth: { min: 0.02, max: 0.10, step: 0.01, label: 'Revenue Growth' }, wacc: { min: 0.07, max: 0.12, step: 0.005, label: 'WACC' }, tgr: { min: 0.01, max: 0.04, step: 0.005, label: 'Terminal Growth' } },
    metrics: [{ label: 'P/E (Fwd)', value: '20x' }, { label: 'B-21 Units', value: '100+' }, { label: 'GBSD Value', value: '~$95B' }, { label: 'Space/Cyber Mix', value: '~30%' }],
    risks: [
      { title: 'B-21 unit cost growth', body: 'The B-21 program was restructured from fixed-price to cost-plus, which reduces Northrop\'s financial risk but also caps upside. If unit costs continue rising, the DoD quantity may be reduced from the 100+ program of record.' },
      { title: 'GBSD schedule and cost risk', body: 'The Nunn-McCurdy breach and program restructuring suggest GBSD is more complex than originally scoped. A further program breach could trigger DoD re-competition, though this is considered low probability.' },
      { title: 'SpaceX competitive pressure in launch', body: 'Commercial launch capabilities are eroding the sole-source economics of government satellite and launch programs where Northrop historically held pricing power.' },
    ],
  },
  {
    id: 'ktos', ticker: 'KTOS', company: 'Kratos Defense & Security Solutions', sector: 'DEFENSE',
    date: 'Q1 2025', conviction: 'MEDIUM-HIGH',
    thesis_short: 'Kratos is the only publicly traded pure-play tactical drone manufacturer — its low-cost attritable aircraft model aligns precisely with the Pentagon\'s Replicator initiative and CCA program.',
    thesis_long: `Kratos builds the XQ-58 Valkyrie and UTAP-22 Mako — tactical drones designed to be affordable enough to risk in contested airspace, a strategic doctrine shift the DoD is calling "attritable" systems. The Replicator initiative (1,000+ attritable drones by 2025) and Collaborative Combat Aircraft (CCA) program are directly shaped around the cost economics Kratos pioneered.\n\nAt $2–4M per unit (vs $80M+ for crewed fighters), Kratos produces the only systems that can be deployed as credible fighter-equivalent adversaries in training or mass-attrition offensive operations. No legacy prime contractor (Boeing, Northrop, Lockheed) can build these at Kratos's cost structure — they lack the manufacturing model.\n\nKratos's Rocket Systems division (HCSM) adds hypersonic and ballistic target systems exposure. At sub-1x revenue it remains speculative but the DoD alignment is the clearest I have seen for a small-cap defense equity.`,
    dcf: { baseRevenue: 1.1e9, revGrowth: 0.18, wacc: 0.11, tgr: 0.03, ebitdaMargin: 0.09, daPct: 0.03, capexPct: 0.06, nwcPct: 0.03, taxRate: 0.20, netDebt: 0.5e9, shares: 175e6, currentPrice: 26 },
    sliders: { revGrowth: { min: 0.08, max: 0.30, step: 0.01, label: 'Revenue Growth' }, wacc: { min: 0.09, max: 0.15, step: 0.005, label: 'WACC' }, tgr: { min: 0.02, max: 0.05, step: 0.005, label: 'Terminal Growth' } },
    metrics: [{ label: 'P/S', value: '~3x' }, { label: 'Unit Cost', value: '$2–4M' }, { label: 'Program', value: 'Replicator/CCA' }, { label: 'Rev Growth', value: '18%' }],
    risks: [
      { title: 'Unprofitable at scale', body: 'KTOS generates thin EBITDA margins (~9%) and has not demonstrated consistent GAAP profitability. Margin expansion is contingent on production volume growth that may be slower than DoD program timelines suggest.' },
      { title: 'DoD budget timing risk', body: 'Kratos revenues are concentrated in a small number of USG contracts. Continuing resolutions, sequestration, or program restructuring can create lumpy quarterly results that compress the multiple.' },
      { title: 'Prime contractor competitive response', body: 'Boeing, General Atomics, and Northrop are all investing in attritable drone programs. If a prime contractor wins the CCA contract at lower cost than expected, KTOS loses its most visible growth catalyst.' },
    ],
  },
  {
    id: 'hii', ticker: 'HII', company: 'Huntington Ingalls Industries', sector: 'DEFENSE',
    date: 'Q4 2024', conviction: 'MEDIUM',
    thesis_short: 'HII is the only shipyard in the US capable of building nuclear-powered carriers and submarines — AUKUS, Columbia-class, and Ford-class create a 10-year backlog with literally zero competitive alternatives.',
    thesis_long: `Huntington Ingalls Newport News and Ingalls Shipbuilding are the exclusive builders of nuclear-powered aircraft carriers (Ford class) and one of two builders of Virginia-class attack submarines in the United States. There is no competitive alternative; these programs cannot be moved to another shipyard on any timeline that matters to national security.\n\nAUKUS — the US-UK-Australia submarine pact — commits to delivering SSN-AUKUS submarines and potentially Virginia-class boats to Australia from the mid-2030s. This requires Newport News to increase production rates, driving significant capital investment and multi-decade revenue commitment that extends well beyond the current 10-year backlog.\n\nHII's Mission Technologies segment (defense IT, cyber, unmanned systems) adds a recurring software and services revenue stream that reduces dependence on lumpier shipbuilding programs. At 14x forward earnings with a 2.2% dividend yield, HII is the most undervalued large-cap defense name in the coverage universe.`,
    dcf: { baseRevenue: 12e9, revGrowth: 0.05, wacc: 0.085, tgr: 0.025, ebitdaMargin: 0.08, daPct: 0.025, capexPct: 0.04, nwcPct: 0.02, taxRate: 0.18, netDebt: 3.0e9, shares: 38e6, currentPrice: 215 },
    sliders: { revGrowth: { min: 0.02, max: 0.09, step: 0.01, label: 'Revenue Growth' }, wacc: { min: 0.07, max: 0.12, step: 0.005, label: 'WACC' }, tgr: { min: 0.01, max: 0.04, step: 0.005, label: 'Terminal Growth' } },
    metrics: [{ label: 'P/E (Fwd)', value: '14x' }, { label: 'Backlog', value: '$48B+' }, { label: 'Div Yield', value: '2.2%' }, { label: 'AUKUS', value: 'Multi-decade' }],
    risks: [
      { title: 'Shipyard labor cost inflation', body: 'Newport News and Pascagoula face significant skilled labor shortages. Workforce expansion required for AUKUS and Columbia-class rate increases carries wage inflation risk that compresses already-thin shipbuilding margins.' },
      { title: 'Fixed-price contract losses', body: 'NSC and LPD programs have historically generated below-target margins or losses on fixed-price contracts. A repeat on Columbia-class would create material earnings impairment.' },
      { title: 'AUKUS schedule and political risk', body: 'The AUKUS submarine delivery schedule depends on Australian domestic politics, US Congressional appropriations, and UK shipbuilding capacity. A program restructuring could reduce HII\'s revenue from the program.' },
    ],
  },
];

// ── Slider ────────────────────────────────────────────────────────────────────
function Slider({ label, value, min, max, step, onChange }) {
  const p = v => (v * 100).toFixed(v < 0.01 ? 2 : 1) + '%';
  return (
    <div className="mb-4">
      <div className="flex justify-between items-center mb-1">
        <span className="font-mono text-[9px] text-muted-foreground tracking-widest">{label}</span>
        <span className="font-mono text-[10px] text-primary font-bold">{p(value)}</span>
      </div>
      <input type="range" min={min} max={max} step={step} value={value}
        onChange={e => onChange(parseFloat(e.target.value))}
        className="w-full h-0.5 accent-primary cursor-pointer" />
      <div className="flex justify-between font-mono text-[7px] text-muted-foreground/30 mt-0.5">
        <span>{p(min)}</span><span>{p(max)}</span>
      </div>
    </div>
  );
}

// ── Memo Modal ────────────────────────────────────────────────────────────────
function MemoModal({ memo, onClose, livePrice }) {
  const [tab, setTab] = useState('thesis');
  const [dcfState, setDcfState] = useState({
    revGrowth: memo.dcf.revGrowth,
    wacc: memo.dcf.wacc,
    tgr: memo.dcf.tgr,
  });

  const currentPrice = livePrice ?? memo.dcf.currentPrice;

  const dcfResult = useMemo(() => {
    const r = runDCF({ ...memo.dcf, ...dcfState });
    if (!r) return null;
    const fairValue = (r.ev - memo.dcf.netDebt) / memo.dcf.shares;
    const upside = ((fairValue / currentPrice) - 1) * 100;
    return { fairValue, upside, pv: r.pv, pvTV: r.pvTV, ev: r.ev };
  }, [dcfState, memo, currentPrice]);

  const convColor = CONV_COLOR[memo.conviction] || '#94a3b8';
  const sectorColor = SECTOR_COLOR[memo.sector] || '#94a3b8';

  React.useEffect(() => {
    const h = e => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [onClose]);

  const fmt = n => {
    if (n == null || isNaN(n)) return '—';
    const a = Math.abs(n);
    if (a >= 1e9) return (n / 1e9).toFixed(1) + 'B';
    if (a >= 1e6) return (n / 1e6).toFixed(1) + 'M';
    return n.toFixed(1);
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-[200] flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.85)' }} onClick={onClose}>
      <motion.div
        initial={{ y: 28, opacity: 0 }} animate={{ y: 0, opacity: 1 }}
        exit={{ y: 20, opacity: 0 }}
        transition={{ type: 'spring', stiffness: 300, damping: 28 }}
        onClick={e => e.stopPropagation()}
        className="bg-background border border-border w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden"
        style={{ boxShadow: '0 40px 120px rgba(0,0,0,0.7)', borderTopColor: sectorColor }}>

        {/* Header */}
        <div className="border-b border-border px-6 py-4 flex items-start justify-between shrink-0">
          <div>
            <div className="flex items-center gap-2 mb-1.5 flex-wrap">
              <span className="font-mono text-[8px] text-muted-foreground/50 tracking-widest">Internal · IC Memo · {memo.date}</span>
              <span className="font-mono text-[8px] tracking-widest px-2 py-0.5 border"
                style={{ color: sectorColor, borderColor: sectorColor + '55', background: sectorColor + '10' }}>
                {memo.sector}
              </span>
              <span className="font-mono text-[8px] tracking-widest px-2 py-0.5 border"
                style={{ color: convColor, borderColor: convColor + '44', background: convColor + '08' }}>
                {memo.conviction} CONVICTION
              </span>
            </div>
            <div className="flex items-baseline gap-3">
              <span className="font-mono text-3xl font-bold text-primary">{memo.ticker}</span>
              <span className="font-mono text-sm text-foreground">{memo.company}</span>
            </div>
          </div>
          <div className="text-right shrink-0 ml-4">
            {dcfResult && (
              <div className="border border-border p-3 mb-2 min-w-[110px]">
                <p className="font-mono text-[7px] text-muted-foreground/40 tracking-widest mb-0.5">DCF FAIR VALUE</p>
                <p className="font-mono text-xl font-bold">${dcfResult.fairValue.toFixed(dcfResult.fairValue < 10 ? 2 : 0)}</p>
                <p className="font-mono text-[9px]" style={{ color: dcfResult.upside >= 0 ? '#22c55e' : '#ef4444' }}>
                  {dcfResult.upside >= 0 ? '▲' : '▼'} {Math.abs(dcfResult.upside).toFixed(1)}% vs ${currentPrice.toFixed(currentPrice < 10 ? 2 : 0)}{livePrice && <span className="text-[7px] ml-1 opacity-50">LIVE</span>}
                </p>
              </div>
            )}
            <button onClick={onClose}
              className="font-mono text-[8px] text-muted-foreground border border-border/50 px-3 py-1 hover:border-primary hover:text-primary transition-colors block ml-auto">
              [ESC] CLOSE
            </button>
          </div>
        </div>

        {/* Metrics strip */}
        <div className="border-b border-border px-6 py-2 flex gap-8 shrink-0 overflow-x-auto">
          {memo.metrics.map(m => (
            <div key={m.label} className="shrink-0">
              <p className="font-mono text-[7px] text-muted-foreground/40 tracking-widest">{m.label}</p>
              <p className="font-mono text-[11px] font-bold">{m.value}</p>
            </div>
          ))}
        </div>

        {/* Tabs */}
        <div className="border-b border-border flex shrink-0 px-6">
          {[['thesis', 'THESIS'], ['dcf', 'LIVE DCF'], ['risks', 'BEAR CASE']].map(([id, label]) => (
            <button key={id} onClick={() => setTab(id)}
              className={`font-mono text-[9px] tracking-widest px-4 py-2.5 border-b-2 transition-colors ${
                tab === id ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground'
              }`}>
              {label}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-6 py-6">
          {tab === 'thesis' && (
            <div className="max-w-2xl">
              <p className="font-mono text-[11px] font-bold text-primary leading-relaxed mb-7 border-l-2 border-primary pl-4 py-1">
                "{memo.thesis_short}"
              </p>
              {memo.thesis_long.split('\n\n').map((p, i) => (
                <p key={i} className="font-mono text-[11px] text-muted-foreground leading-[1.85] mb-4">{p}</p>
              ))}
            </div>
          )}

          {tab === 'dcf' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
              <div>
                <p className="font-mono text-[8px] text-muted-foreground/40 tracking-widest mb-5 pb-2 border-b border-border/40">ADJUST ASSUMPTIONS</p>
                {Object.entries(memo.sliders).map(([key, s]) => (
                  <Slider key={key} label={s.label} value={dcfState[key]}
                    min={s.min} max={s.max} step={s.step}
                    onChange={v => setDcfState(p => ({ ...p, [key]: v }))} />
                ))}
                <button onClick={() => setDcfState({ revGrowth: memo.dcf.revGrowth, wacc: memo.dcf.wacc, tgr: memo.dcf.tgr })}
                  className="font-mono text-[8px] text-muted-foreground/50 border border-border/40 px-3 py-1.5 hover:border-primary hover:text-primary transition-colors mt-1">
                  RESET TO BASE CASE
                </button>
                <div className="mt-5 pt-4 border-t border-border/30 grid grid-cols-2 gap-2">
                  <p className="font-mono text-[7px] text-muted-foreground/30 tracking-widest col-span-2 mb-1">FIXED ASSUMPTIONS</p>
                  {[
                    ['EBITDA Margin', (memo.dcf.ebitdaMargin * 100).toFixed(0) + '%'],
                    ['Tax Rate', (memo.dcf.taxRate * 100).toFixed(0) + '%'],
                    ['CapEx / Rev', (memo.dcf.capexPct * 100).toFixed(0) + '%'],
                    ['Net Debt', (memo.dcf.netDebt < 0 ? '(' : '') + '$' + fmt(Math.abs(memo.dcf.netDebt)) + (memo.dcf.netDebt < 0 ? ' cash)' : '')],
                  ].map(([k, v]) => (
                    <div key={k}>
                      <p className="font-mono text-[7px] text-muted-foreground/30">{k}</p>
                      <p className="font-mono text-[9px] text-muted-foreground/50">{v}</p>
                    </div>
                  ))}
                </div>
              </div>
              <div>
                <p className="font-mono text-[8px] text-muted-foreground/40 tracking-widest mb-5 pb-2 border-b border-border/40">VALUATION OUTPUT</p>
                {dcfResult ? (
                  <>
                    <div className="border border-border p-5 mb-5">
                      <p className="font-mono text-[8px] text-muted-foreground/40 tracking-widest mb-1">INTRINSIC VALUE / SHARE</p>
                      <p className="font-mono text-4xl font-bold">${dcfResult.fairValue.toFixed(dcfResult.fairValue < 10 ? 2 : 0)}</p>
                      <p className="font-mono text-[10px] mt-2" style={{ color: dcfResult.upside >= 0 ? '#22c55e' : '#ef4444' }}>
                        {dcfResult.upside >= 0 ? '▲' : '▼'} {Math.abs(dcfResult.upside).toFixed(1)}% implied {dcfResult.upside >= 0 ? 'upside' : 'downside'} vs ${currentPrice.toFixed(currentPrice < 10 ? 2 : 0)}{livePrice && <span className="text-[7px] ml-1 opacity-50">LIVE</span>}
                      </p>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      {[
                        ['PV of FCFs (5Y)', '$' + fmt(dcfResult.pv)],
                        ['PV of Terminal Value', '$' + fmt(dcfResult.pvTV)],
                        ['TV as % of EV', ((dcfResult.pvTV / dcfResult.ev) * 100).toFixed(0) + '%'],
                        ['Implied EV', '$' + fmt(dcfResult.ev)],
                      ].map(([k, v]) => (
                        <div key={k} className="border border-border/40 p-2.5">
                          <p className="font-mono text-[7px] text-muted-foreground/40 tracking-widest">{k}</p>
                          <p className="font-mono text-[11px] font-bold">{v}</p>
                        </div>
                      ))}
                    </div>
                    <p className="font-mono text-[8px] text-muted-foreground/25 mt-4 leading-relaxed">
                      5Y DCF, FCFF method. TV via Gordon Growth. Equity = EV − net debt ÷ shares.
                    </p>
                  </>
                ) : (
                  <div className="border border-destructive/30 p-4">
                    <p className="font-mono text-[10px] text-destructive">WACC must exceed terminal growth rate.</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {tab === 'risks' && (
            <div className="max-w-2xl">
              <p className="font-mono text-[8px] text-muted-foreground/40 tracking-widest mb-6 pb-3 border-b border-border/40">
                WHY I MIGHT BE WRONG — STRUCTURED BEAR CASE
              </p>
              {memo.risks.map((r, i) => (
                <div key={i} className="mb-6 pb-6 border-b border-border/30 last:border-0">
                  <div className="flex items-start gap-4">
                    <span className="font-mono text-[8px] text-destructive/40 mt-0.5 shrink-0 w-12">RISK {String(i + 1).padStart(2, '0')}</span>
                    <div>
                      <p className="font-mono text-[11px] font-bold mb-2">{r.title}</p>
                      <p className="font-mono text-[10px] text-muted-foreground leading-[1.8]">{r.body}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
}

// ── Memo Card ─────────────────────────────────────────────────────────────────
function MemoCard({ memo, index, onOpen, livePrice }) {
  const convColor = CONV_COLOR[memo.conviction] || '#94a3b8';
  const sectorColor = SECTOR_COLOR[memo.sector] || '#94a3b8';
  const displayPrice = livePrice ?? memo.dcf.currentPrice;

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.04 }}
      onClick={() => onOpen(memo)}
      className="border border-border hover:border-primary/40 cursor-pointer transition-all duration-200 p-5 relative group"
      tabIndex={0} onKeyDown={e => e.key === 'Enter' && onOpen(memo)}>

      <div className="absolute top-0 left-0 bottom-0 w-0.5" style={{ background: sectorColor + '70' }} />

      <div className="pl-3">
        <div className="flex items-start justify-between mb-3">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="font-mono text-[7px] tracking-widest px-1.5 py-0.5 border"
                style={{ color: sectorColor, borderColor: sectorColor + '40' }}>
                {memo.sector}
              </span>
              <span className="font-mono text-[7px] text-muted-foreground/30 tracking-widest">{memo.date}</span>
            </div>
            <div className="flex items-baseline gap-2">
              <span className="font-mono text-lg font-bold text-primary">{memo.ticker}</span>
              <span className="font-mono text-[10px] text-muted-foreground">{memo.company}</span>
            </div>
          </div>
          <div className="flex flex-col items-end gap-1 shrink-0 ml-2">
            <span className="font-mono text-[7px] tracking-widest px-1.5 py-0.5 border"
              style={{ color: convColor, borderColor: convColor + '44' }}>
              {memo.conviction}
            </span>
            <span className="font-mono text-[9px] font-bold text-foreground">
              ${displayPrice.toFixed(displayPrice < 10 ? 2 : 0)}
              {livePrice && <span className="text-[6px] text-muted-foreground/40 ml-1">●</span>}
            </span>
          </div>
        </div>

        <p className="font-mono text-[10px] text-muted-foreground/80 leading-relaxed mb-4 line-clamp-2">
          {memo.thesis_short}
        </p>

        <div className="flex gap-4 mb-4">
          {memo.metrics.slice(0, 2).map(m => (
            <div key={m.label}>
              <p className="font-mono text-[7px] text-muted-foreground/30 tracking-widest">{m.label}</p>
              <p className="font-mono text-[10px] font-bold">{m.value}</p>
            </div>
          ))}
        </div>

        <div className="flex items-center justify-between">
          <div className="flex gap-1">
            {['THESIS', 'DCF', 'RISKS'].map(t => (
              <span key={t} className="font-mono text-[7px] tracking-widest text-muted-foreground/25 border border-border/30 px-1.5 py-0.5">{t}</span>
            ))}
          </div>
          <span className="font-mono text-[8px] tracking-widest text-muted-foreground/30 group-hover:text-primary transition-colors">
            OPEN MEMO →
          </span>
        </div>
      </div>
    </motion.div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────
export default function ICVaultPage() {
  const [selected, setSelected]         = useState(null);
  const [activeSector, setActiveSector] = useState('ALL');
  const [livePrices, setLivePrices]     = useState({});

  useEffect(() => {
    const tickers = MEMOS.map(m => m.ticker).join(',');
    fetch(`${API_BASE}/market-data/yf-quotes?tickers=${tickers}`)
      .then(r => r.json())
      .then(json => {
        if (json.data) setLivePrices(json.data);
      })
      .catch(() => {});
  }, []);

  const filtered = useMemo(() =>
    activeSector === 'ALL' ? MEMOS : MEMOS.filter(m => m.sector === activeSector),
    [activeSector]
  );

  return (
    <>
      <Helmet><title>DDF·LAB — IC Vault</title></Helmet>

      <div className="min-h-screen px-4 sm:px-6 lg:px-8 py-10">
        <div className="max-w-6xl mx-auto">

          {/* Header */}
          <div className="mb-8 border-b border-border pb-6">
            <p className="font-mono text-[10px] text-primary tracking-widest mb-2">DDF·LAB / INVESTMENT COMMITTEE VAULT</p>
            <h1 className="font-mono text-2xl md:text-3xl font-bold tracking-tight mb-3">IC Vault</h1>
            <p className="font-mono text-xs text-muted-foreground max-w-2xl leading-relaxed">
              A curated set of investment committee memoranda across financial infrastructure, energy, technology, uranium, and defense.
              Each entry presents a structured investment thesis, a live 5-year DCF with fully adjustable assumptions, and a formal bear case.
            </p>
          </div>

          {/* Legend + Sector Filters */}
          <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
            {/* Left: conviction legend */}
            <div className="flex items-center gap-5">
              {Object.entries(CONV_COLOR).map(([label, color]) => (
                <div key={label} className="flex items-center gap-1.5">
                  <div className="w-1.5 h-1.5 rounded-full" style={{ background: color }} />
                  <span className="font-mono text-[8px] text-muted-foreground/50 tracking-widest">{label}</span>
                </div>
              ))}
            </div>

            {/* Right: sector filter buttons */}
            <div className="flex items-center gap-1.5 flex-wrap">
              {SECTORS.map(s => {
                const color = s === 'ALL' ? undefined : SECTOR_COLOR[s];
                const active = activeSector === s;
                return (
                  <button key={s} onClick={() => setActiveSector(s)}
                    className={`font-mono text-[8px] tracking-widest px-2.5 py-1 border transition-colors ${
                      active
                        ? 'border-current'
                        : 'border-border/40 text-muted-foreground/40 hover:border-border hover:text-muted-foreground'
                    }`}
                    style={active && color ? { color, borderColor: color + '80', background: color + '10' } : undefined}>
                    {s} {s !== 'ALL' && `(${MEMOS.filter(m => m.sector === s).length})`}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <AnimatePresence mode="popLayout">
              {filtered.map((memo, i) => (
                <MemoCard key={memo.id} memo={memo} index={i} onOpen={setSelected} livePrice={livePrices[memo.ticker]?.price} />
              ))}
            </AnimatePresence>
          </div>

          <div className="mt-10 pt-6 border-t border-border">
            <p className="font-mono text-[9px] text-muted-foreground/30 tracking-wider">
              {MEMOS.length} MEMOS · FOR ILLUSTRATIVE PURPOSES · NOT INVESTMENT ADVICE · DCF ASSUMPTIONS ARE INDICATIVE BASE CASES
            </p>
          </div>
        </div>
      </div>

      <AnimatePresence>
        {selected && <MemoModal key={selected.id} memo={selected} onClose={() => setSelected(null)} livePrice={livePrices[selected.ticker]?.price} />}
      </AnimatePresence>
    </>
  );
}
