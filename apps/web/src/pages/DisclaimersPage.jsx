import React from 'react';
import { Helmet } from 'react-helmet';
import { Link } from 'react-router-dom';
import { ArrowLeft, AlertTriangle } from 'lucide-react';
import SectionHeader from '@/components/SectionHeader.jsx';

const IC = ({ children }) => (
  <code className="bg-muted/30 font-mono text-[11px] px-1">{children}</code>
);

export default function DisclaimersPage() {
  return (
    <>
      <Helmet>
        <title>DDF·TERMINAL — Data Sources & Disclaimers</title>
        <meta name="description" content="Data sources, delays, and disclaimers for the DDF Terminal site. Nothing here is financial advice." />
        <link rel="canonical" href="https://findmitridefreitas.com/disclaimers" />
      </Helmet>

      <div className="min-h-screen pt-12 md:pt-14 pb-20">
        <section className="py-8 border-b border-border">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-3xl">
            <Link to="/" className="font-mono text-[10px] tracking-widest text-muted-foreground hover:text-primary transition-colors inline-flex items-center gap-1 mb-5">
              <ArrowLeft className="h-3 w-3" /> BACK
            </Link>
            <div className="flex items-center gap-2 mb-3">
              <AlertTriangle className="h-4 w-4 text-primary" />
              <span className="font-mono text-[10px] tracking-widest text-primary">NOTICE</span>
            </div>
            <h1 className="font-mono text-2xl md:text-4xl font-bold tracking-tight text-foreground leading-tight mb-3">
              Data Sources &amp; Disclaimers
            </h1>
            <div className="flex items-center gap-3 font-mono text-[10px] text-muted-foreground">
              <span>DDF·TERMINAL</span>
              <span className="text-muted-foreground/40">·</span>
              <span>LAST UPDATED APR 2026</span>
            </div>
          </div>
        </section>

        <article className="py-10">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-3xl space-y-10">

            <section>
              <p className="font-mono text-[9px] text-muted-foreground/60 tracking-widest mb-2">SUMMARY</p>
              <p className="text-sm text-muted-foreground leading-[1.75] border-l-2 border-primary/50 pl-4">
                This site is a portfolio of quantitative finance research, educational labs, and personal
                projects. It is <strong className="text-foreground">not</strong> investment advice, not an
                offer to buy or sell any security, and not a recommendation. Data displayed may be delayed,
                incomplete, or inaccurate. You are responsible for your own investment decisions.
              </p>
            </section>

            <section>
              <SectionHeader number="01" title="DATA SOURCES" />
              <div className="space-y-4 text-sm text-muted-foreground leading-[1.75]">
                <p>
                  The tools and dashboards on this site aggregate data from a small number of free, public
                  providers. The specific source is usually shown on the page where the data appears, but the
                  full list is documented here.
                </p>
                <div className="border border-border divide-y divide-border">
                  <div className="p-4">
                    <p className="font-mono text-[10px] tracking-widest text-primary mb-1">YAHOO FINANCE</p>
                    <p className="text-sm">
                      Equity quotes, historical OHLC, options chains, and fundamentals. Quotes are typically
                      <strong className="text-foreground"> delayed by 15 minutes</strong> for US exchanges and
                      up to 20 minutes for options. Overnight and pre-market prices may be stale. Yahoo Finance
                      is not a regulated market-data vendor — treat all figures as approximate.
                    </p>
                  </div>
                  <div className="p-4">
                    <p className="font-mono text-[10px] tracking-widest text-primary mb-1">FRED (ST. LOUIS FED)</p>
                    <p className="text-sm">
                      Macroeconomic and rates series — Treasury yields, CPI, unemployment, GDP, Fed Funds.
                      Updated on official release schedules (daily to monthly). Historical revisions are
                      common in government data and may cause values to change after first publication.
                    </p>
                  </div>
                  <div className="p-4">
                    <p className="font-mono text-[10px] tracking-widest text-primary mb-1">USER-INPUT PARAMETERS</p>
                    <p className="text-sm">
                      Most labs accept user-defined parameters (vol, rate, strike, horizon, etc.). Outputs are
                      only as meaningful as the inputs. Results are deterministic given the inputs — they are
                      not forecasts.
                    </p>
                  </div>
                  <div className="p-4">
                    <p className="font-mono text-[10px] tracking-widest text-primary mb-1">NEWS FEEDS</p>
                    <p className="text-sm">
                      Headlines on the <IC>/news</IC> page pull from public news APIs. Content belongs to the
                      respective publishers; this site does not endorse or verify any individual story.
                    </p>
                  </div>
                  <div className="p-4">
                    <p className="font-mono text-[10px] tracking-widest text-primary mb-1">STATIC / ILLUSTRATIVE DATA</p>
                    <p className="text-sm">
                      Some panels use hand-entered historical snapshots (e.g. archived yield curves, sample
                      correlation matrices) for illustration. These are labelled as such on the page.
                    </p>
                  </div>
                </div>
              </div>
            </section>

            <section>
              <SectionHeader number="02" title="NOT FINANCIAL ADVICE" />
              <div className="space-y-4 text-sm text-muted-foreground leading-[1.75]">
                <p>
                  Nothing on this site constitutes financial, investment, tax, legal, or accounting advice. No
                  content here should be construed as a solicitation, offer, recommendation, or endorsement to
                  buy or sell any security, derivative, cryptocurrency, or other instrument.
                </p>
                <p>
                  Tools like the DCF modeller, portfolio optimiser, options pricer, and backtest statistics
                  lab are <strong className="text-foreground">educational demonstrations</strong> of textbook
                  methods. They are not calibrated to production-grade data pipelines, do not incorporate
                  transaction costs, slippage, borrowing costs, or taxes unless explicitly stated, and should
                  never be used to size real positions.
                </p>
                <p>
                  Backtested or simulated performance is hypothetical. Past performance is not indicative of
                  future results. No simulation can fully replicate the frictions, liquidity constraints, and
                  behavioural biases of live trading.
                </p>
              </div>
            </section>

            <section>
              <SectionHeader number="03" title="ACCURACY & AVAILABILITY" />
              <div className="space-y-4 text-sm text-muted-foreground leading-[1.75]">
                <p>
                  Data may be <strong className="text-foreground">delayed, interrupted, or inaccurate</strong>.
                  Upstream providers change APIs, rate-limit requests, and occasionally serve malformed data.
                  When a feed fails, the site typically shows a placeholder or the last-known value rather
                  than crashing.
                </p>
                <p>
                  Figures are rounded for display. The underlying calculations use full floating-point
                  precision unless otherwise noted.
                </p>
              </div>
            </section>

            <section>
              <SectionHeader number="04" title="NO LIABILITY" />
              <div className="space-y-4 text-sm text-muted-foreground leading-[1.75]">
                <p>
                  The author accepts <strong className="text-foreground">no liability</strong> for any loss,
                  direct or indirect, arising from the use of this site or any information, tool, or signal
                  displayed on it. Use is at your own risk.
                </p>
                <p>
                  All content is provided &quot;as is&quot; without warranty of any kind, express or implied,
                  including but not limited to warranties of merchantability, fitness for a particular
                  purpose, or non-infringement.
                </p>
                <p>
                  Before making any investment decision, consult a licensed financial professional and conduct
                  your own independent due diligence.
                </p>
              </div>
            </section>

            <section>
              <SectionHeader number="05" title="INTELLECTUAL PROPERTY" />
              <div className="space-y-4 text-sm text-muted-foreground leading-[1.75]">
                <p>
                  Code and writing authored by Dmitri De Freitas may be reproduced for non-commercial,
                  educational purposes with attribution. Third-party trademarks (Yahoo, FRED, index names,
                  tickers) are property of their respective owners.
                </p>
              </div>
            </section>

            <section>
              <p className="font-mono text-[9px] text-muted-foreground/60 tracking-widest mb-2">CONTACT</p>
              <p className="text-sm text-muted-foreground leading-[1.75]">
                Questions, corrections, or data-source concerns — reach out via{' '}
                <Link to="/contact" className="text-primary hover:underline">/contact</Link>.
              </p>
            </section>

          </div>
        </article>
      </div>
    </>
  );
}
