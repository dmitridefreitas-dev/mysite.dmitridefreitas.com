import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { Helmet } from 'react-helmet';
import { motion, AnimatePresence } from 'framer-motion';
import { ExternalLink, ChevronDown, ChevronUp, RefreshCw, Search, X } from 'lucide-react';
import { Link } from 'react-router-dom';
import apiServerClient from '@/lib/apiServerClient.js';
import WavePageTransition from '@/components/WavePageTransition.jsx';

// ─── Shared helpers ────────────────────────────────────────────────────────────

const REFRESH_INTERVAL = 60 * 1000;

const timeAgo = (iso) => {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return 'just now';
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
};

const importanceMeta = {
  HIGH: { label: 'HIGH', className: 'border-destructive/70 text-destructive' },
  MED:  { label: 'MED',  className: 'border-terminal-amber/70 text-terminal-amber' },
  LOW:  { label: 'LOW',  className: 'border-border text-muted-foreground' },
};

const NEWS_FILTERS = ['ALL', 'LAST 30 MIN', 'HIGH', 'MED', 'LOW'];
const isRecent   = (iso) => Date.now() - new Date(iso).getTime() < 30 * 60 * 1000;
const isBreaking = (iso) => Date.now() - new Date(iso).getTime() < 10 * 60 * 1000;

// ─── NewsItem ──────────────────────────────────────────────────────────────────

const NewsItem = ({ item, index }) => {
  const [expanded, setExpanded] = useState(false);
  const meta     = importanceMeta[item.importance] || importanceMeta.LOW;
  const recent   = isRecent(item.publishedAt);
  const breaking = isBreaking(item.publishedAt);

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.03, duration: 0.25 }}
      className="border-b border-border last:border-b-0"
    >
      <button
        onClick={() => setExpanded((p) => !p)}
        className="w-full text-left px-4 py-3 hover:bg-muted/30 transition-colors group flex items-start gap-3"
      >
        <span className={`font-mono text-[9px] border px-1.5 py-0.5 shrink-0 mt-0.5 tracking-widest ${meta.className}`}>
          {meta.label}
        </span>

        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-3">
            <p className="font-mono text-xs text-foreground group-hover:text-primary transition-colors leading-snug">
              {item.title}
            </p>
            <div className="shrink-0 flex items-center gap-2 mt-0.5">
              {breaking && (
                <span className="flex items-center gap-1 font-mono text-[9px] text-terminal-green tracking-widest">
                  <span className="w-1.5 h-1.5 rounded-full bg-terminal-green animate-pulse inline-block" />
                  LIVE
                </span>
              )}
              {!breaking && recent && (
                <span className="font-mono text-[9px] text-terminal-amber tracking-widest">NEW</span>
              )}
              <span className="font-mono text-[9px] text-muted-foreground/60 whitespace-nowrap">
                {timeAgo(item.publishedAt)}
              </span>
              {expanded
                ? <ChevronUp className="w-3 h-3 text-muted-foreground/50" />
                : <ChevronDown className="w-3 h-3 text-muted-foreground/50" />
              }
            </div>
          </div>
          <span className="font-mono text-[9px] text-muted-foreground/50 tracking-widest mt-0.5 block">
            [{item.source}]
          </span>
        </div>
      </button>

      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="px-4 pb-4 pt-1 bg-muted/20 border-t border-border/40">
              {item.summary ? (
                <p className="text-xs text-muted-foreground leading-relaxed mb-3 pl-[52px]">
                  {item.summary}{item.summary.length === 300 ? '…' : ''}
                </p>
              ) : (
                <p className="text-xs text-muted-foreground/50 italic mb-3 pl-[52px]">
                  No preview available.
                </p>
              )}
              {item.link && (
                <div className="pl-[52px]">
                  <a
                    href={item.link}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={(e) => e.stopPropagation()}
                    className="font-mono text-[10px] text-primary hover:text-primary/80 transition-colors tracking-widest flex items-center gap-1.5 w-fit"
                  >
                    <ExternalLink className="w-3 h-3" />
                    READ FULL ARTICLE →
                  </a>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

// ─── Financials helpers ────────────────────────────────────────────────────────

const FORM_LABELS = {
  '10-K':    'Annual Report',
  '10-K/A':  'Annual Report (Amended)',
  '10-Q':    'Quarterly Report',
  '10-Q/A':  'Quarterly Report (Amended)',
  '8-K':     'Current Report',
  '8-K/A':   'Current Report (Amended)',
  'DEF 14A': 'Proxy Statement',
  'DEFA14A': 'Additional Proxy Materials',
  'DEFC14A': 'Contested Proxy Statement',
  'S-1':     'Registration Statement',
  'S-1/A':   'Registration Statement (Amended)',
  'S-3':     'Shelf Registration',
  'S-3/A':   'Shelf Registration (Amended)',
  'S-4':     'Business Combination Registration',
  '20-F':    'Annual Report (Foreign Private Issuer)',
  '20-F/A':  'Annual Report (Foreign, Amended)',
  '424B4':   'Prospectus',
  '424B3':   'Prospectus Supplement',
  'SC 13D':  'Beneficial Ownership Report (>5%)',
  'SC 13D/A':'Beneficial Ownership Report (Amended)',
  'SC 13G':  'Passive Ownership Report (>5%)',
  'SC 13G/A':'Passive Ownership Report (Amended)',
};

const FORM_BADGE_CLASS = {
  '10-K':    'border-terminal-green/70 text-terminal-green',
  '10-K/A':  'border-terminal-green/50 text-terminal-green/70',
  '10-Q':    'border-primary/70 text-primary',
  '10-Q/A':  'border-primary/50 text-primary/70',
  '8-K':     'border-terminal-amber/70 text-terminal-amber',
  '8-K/A':   'border-terminal-amber/50 text-terminal-amber/70',
  'DEF 14A': 'border-purple-400/70 text-purple-400',
  'DEFA14A': 'border-purple-400/50 text-purple-400/70',
  'DEFC14A': 'border-purple-400/50 text-purple-400/70',
  'S-1':     'border-destructive/70 text-destructive',
  'S-1/A':   'border-destructive/50 text-destructive/70',
  'S-3':     'border-destructive/40 text-destructive/80',
  'S-4':     'border-destructive/40 text-destructive/80',
  '20-F':    'border-cyan-400/70 text-cyan-400',
  '20-F/A':  'border-cyan-400/50 text-cyan-400/70',
  '424B4':   'border-orange-400/70 text-orange-400',
  '424B3':   'border-orange-400/50 text-orange-400/70',
};

const formBadgeClass = (form) =>
  FORM_BADGE_CLASS[form] || 'border-border text-muted-foreground';

const formatSize = (bytes) => {
  if (!bytes) return null;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)}KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)}MB`;
};

// EDGAR form type ordering for the filter bar
const FORM_ORDER = [
  '10-K', '10-K/A', '10-Q', '10-Q/A',
  '8-K', '8-K/A',
  'DEF 14A', 'DEFA14A', 'DEFC14A',
  'S-1', 'S-1/A', 'S-3', 'S-3/A', 'S-4',
  '20-F', '20-F/A',
  '424B4', '424B3',
  'SC 13D', 'SC 13D/A', 'SC 13G', 'SC 13G/A',
];

// ─── FilingItem ────────────────────────────────────────────────────────────────

const FilingItem = ({ filing, index }) => {
  const size = formatSize(filing.size);
  return (
    <motion.a
      href={filing.fileUrl}
      target="_blank"
      rel="noopener noreferrer"
      initial={{ opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.015, duration: 0.2 }}
      className="flex items-start gap-3 px-4 py-3 border-b border-border last:border-b-0 hover:bg-muted/30 transition-colors group"
    >
      {/* Form badge */}
      <span
        className={`font-mono text-[9px] border px-1.5 py-0.5 shrink-0 tracking-widest mt-0.5 ${formBadgeClass(filing.form)}`}
      >
        {filing.form}
      </span>

      {/* Description + dates */}
      <div className="flex-1 min-w-0">
        <p className="font-mono text-xs text-foreground group-hover:text-primary transition-colors">
          {FORM_LABELS[filing.form] || filing.description || filing.form}
        </p>
        <div className="flex flex-wrap items-center gap-x-2 mt-0.5">
          <span className="font-mono text-[9px] text-muted-foreground/50">
            Filed {filing.filingDate}
          </span>
          {filing.reportDate && filing.reportDate !== filing.filingDate && (
            <span className="font-mono text-[9px] text-muted-foreground/40">
              · Period {filing.reportDate}
            </span>
          )}
          {filing.items && (
            <span className="font-mono text-[9px] text-muted-foreground/40 truncate max-w-xs">
              · {filing.items}
            </span>
          )}
        </div>
      </div>

      {/* Size + link icon */}
      <div className="flex items-center gap-2 shrink-0 mt-0.5">
        {size && (
          <span className="font-mono text-[9px] text-muted-foreground/40">{size}</span>
        )}
        <ExternalLink className="w-3 h-3 text-muted-foreground/40 group-hover:text-primary transition-colors" />
      </div>
    </motion.a>
  );
};

// ─── Skeleton ──────────────────────────────────────────────────────────────────

const NewsSkeleton = () => (
  <div className="border border-border">
    {[...Array(8)].map((_, i) => (
      <div key={i} className="px-4 py-3 border-b border-border last:border-b-0 flex items-start gap-3">
        <div className="w-10 h-4 bg-muted/60 animate-pulse shrink-0 mt-0.5" />
        <div className="flex-1 space-y-1.5">
          <div className="h-3 bg-muted/60 animate-pulse w-3/4" />
          <div className="h-2.5 bg-muted/40 animate-pulse w-1/4" />
        </div>
      </div>
    ))}
  </div>
);

const FilingsSkeleton = () => (
  <div className="border border-border">
    {[...Array(10)].map((_, i) => (
      <div key={i} className="px-4 py-3 border-b border-border last:border-b-0 flex items-start gap-3">
        <div className="w-12 h-4 bg-muted/60 animate-pulse shrink-0 mt-0.5" />
        <div className="flex-1 space-y-1.5">
          <div className="h-3 bg-muted/60 animate-pulse w-1/2" />
          <div className="h-2.5 bg-muted/40 animate-pulse w-1/3" />
        </div>
      </div>
    ))}
  </div>
);

// ─── NewsPage ──────────────────────────────────────────────────────────────────

const NewsPage = () => {
  const inputRef = useRef(null);

  // ── Market news state ──
  const [items, setItems]             = useState([]);
  const [loading, setLoading]         = useState(true);
  const [error, setError]             = useState(false);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [refreshing, setRefreshing]   = useState(false);
  const [newsFilter, setNewsFilter]   = useState('ALL');

  // ── Ticker state ──
  const [tickerInput, setTickerInput]       = useState('');
  const [searchedTicker, setSearchedTicker] = useState('');
  const [activeTab, setActiveTab]           = useState('news'); // 'news' | 'financials'
  const [tickerMeta, setTickerMeta]         = useState(null);  // { name, cik, exchanges, sicDescription }

  // ── Ticker news state ──
  const [tickerNews, setTickerNews]               = useState([]);
  const [tickerNewsLoading, setTickerNewsLoading] = useState(false);
  const [tickerNewsError, setTickerNewsError]     = useState(false);

  // ── Filings state ──
  const [filings, setFilings]               = useState([]);
  const [filingsLoading, setFilingsLoading] = useState(false);
  const [filingsError, setFilingsError]     = useState('');
  const [yearFilter, setYearFilter]         = useState('ALL');
  const [formTypeFilter, setFormTypeFilter] = useState('ALL');

  // ── Market news fetch ──
  const fetchNews = useCallback(async (manual = false) => {
    if (manual) setRefreshing(true);
    try {
      const res = await apiServerClient.fetch('/news');
      if (!res.ok) throw new Error();
      const data = await res.json();
      setItems(data);
      setLastUpdated(new Date());
      setError(false);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchNews();
    const interval = setInterval(() => fetchNews(), REFRESH_INTERVAL);
    return () => clearInterval(interval);
  }, [fetchNews]);

  // ── Ticker news fetch ──
  const fetchTickerNews = useCallback(async (ticker) => {
    setTickerNewsLoading(true);
    setTickerNewsError(false);
    setTickerNews([]);
    try {
      const res = await apiServerClient.fetch(`/ticker/news?ticker=${encodeURIComponent(ticker)}`);
      if (!res.ok) throw new Error();
      const data = await res.json();
      setTickerNews(data);
    } catch {
      setTickerNewsError(true);
    } finally {
      setTickerNewsLoading(false);
    }
  }, []);

  // ── Filings fetch ──
  const fetchFilings = useCallback(async (ticker) => {
    setFilingsLoading(true);
    setFilingsError('');
    setFilings([]);
    setTickerMeta(null);
    try {
      const res = await apiServerClient.fetch(`/ticker/filings?ticker=${encodeURIComponent(ticker)}`);
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || 'Failed to fetch EDGAR data');
      }
      const data = await res.json();
      setTickerMeta({
        name: data.name,
        cik: data.cik,
        exchanges: data.exchanges || [],
        sicDescription: data.sicDescription || '',
      });
      setFilings(data.filings || []);
    } catch (e) {
      setFilingsError(e.message || 'Failed to fetch EDGAR data');
    } finally {
      setFilingsLoading(false);
    }
  }, []);

  // ── Ticker search handler ──
  const handleTickerSearch = useCallback(() => {
    const t = tickerInput.trim().toUpperCase();
    if (!t) return;
    setSearchedTicker(t);
    setActiveTab('news');
    setYearFilter('ALL');
    setFormTypeFilter('ALL');
    fetchTickerNews(t);
    fetchFilings(t);
  }, [tickerInput, fetchTickerNews, fetchFilings]);

  const clearTicker = useCallback(() => {
    setSearchedTicker('');
    setTickerInput('');
    setTickerNews([]);
    setFilings([]);
    setTickerMeta(null);
    setTickerNewsError(false);
    setFilingsError('');
    setActiveTab('news');
    setYearFilter('ALL');
    setFormTypeFilter('ALL');
  }, []);

  // ── Derived — news filters ──
  const activeNews = searchedTicker ? tickerNews : items;
  const filteredNews =
    newsFilter === 'ALL'         ? activeNews :
    newsFilter === 'LAST 30 MIN' ? activeNews.filter((i) => isRecent(i.publishedAt)) :
                                   activeNews.filter((i) => i.importance === newsFilter);

  const newsFilterCounts = {
    'ALL':         activeNews.length,
    'LAST 30 MIN': activeNews.filter((i) => isRecent(i.publishedAt)).length,
    'HIGH':        activeNews.filter((i) => i.importance === 'HIGH').length,
    'MED':         activeNews.filter((i) => i.importance === 'MED').length,
    'LOW':         activeNews.filter((i) => i.importance === 'LOW').length,
  };

  // ── Derived — financials filters ──
  const availableYears = useMemo(() => {
    if (filings.length === 0) return ['ALL'];
    const years = new Set(filings.map((f) => f.filingDate.slice(0, 4)).filter(Boolean));
    return ['ALL', ...Array.from(years).sort((a, b) => b - a)];
  }, [filings]);

  const availableFormTypes = useMemo(() => {
    if (filings.length === 0) return ['ALL'];
    const presentForms = new Set(filings.map((f) => f.form).filter(Boolean));
    return [
      'ALL',
      ...FORM_ORDER.filter((f) => presentForms.has(f)),
      ...Array.from(presentForms).filter((f) => !FORM_ORDER.includes(f)).sort(),
    ];
  }, [filings]);

  const filteredFilings = useMemo(() =>
    filings.filter((f) => {
      if (yearFilter !== 'ALL' && !f.filingDate.startsWith(yearFilter)) return false;
      if (formTypeFilter !== 'ALL' && f.form !== formTypeFilter) return false;
      return true;
    }),
    [filings, yearFilter, formTypeFilter]
  );

  const inFinancialsMode = searchedTicker && activeTab === 'financials';

  return (
    <WavePageTransition>
      <Helmet>
        <title>
          {searchedTicker
            ? `${searchedTicker} — ${activeTab === 'financials' ? 'Financials' : 'News'} — Dmitri De Freitas`
            : 'News — Dmitri De Freitas'}
        </title>
        <meta name="description" content="Live financial and market news feed with SEC EDGAR filing search." />
        <meta property="og:type"   content="website" />
        <meta property="og:locale" content="en_US" />
        <meta property="og:image"  content="https://findmitridefreitas.com/IMG_1948.jpeg" />
        <meta property="og:image:width"  content="800" />
        <meta property="og:image:height" content="800" />
        <meta name="twitter:card"        content="summary" />
        <meta name="twitter:image"       content="https://findmitridefreitas.com/IMG_1948.jpeg" />
      </Helmet>

      <div className="min-h-screen pt-12 md:pt-14 pb-16">

        {/* ── Hero ─────────────────────────────────────────────────────────── */}
        <section className="py-10 border-b border-border">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8">
            {/* Section header with REGIME button on same line */}
            <div className="mb-10">
              <div className="flex items-end justify-between gap-4">
                <div>
                  <span className="font-mono text-xs text-muted-foreground tracking-widest uppercase block">05</span>
                  <h2 className="font-mono text-2xl md:text-3xl font-bold tracking-tight mt-1 uppercase text-foreground">
                    LIVE NEWS FEED
                  </h2>
                </div>
                <Link
                  to="/regime"
                  className="font-mono text-[10px] tracking-widest border border-primary text-primary hover:bg-primary hover:text-primary-foreground transition-colors px-3 h-7 flex items-center gap-1.5 shrink-0 mb-1"
                >
                  REGIME →
                </Link>
              </div>
              <div className="h-px bg-border mt-3 w-full" />
            </div>

            {/* Ticker search bar */}
            <div className="flex gap-2 mb-5 max-w-sm">
              <div className="relative flex-1">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground/40 pointer-events-none" />
                <input
                  ref={inputRef}
                  type="text"
                  placeholder="TICKER  (e.g. AAPL, TSLA, SPY)"
                  value={tickerInput}
                  onChange={(e) => setTickerInput(e.target.value.toUpperCase())}
                  onKeyDown={(e) => e.key === 'Enter' && handleTickerSearch()}
                  className="w-full font-mono text-xs border border-border bg-background pl-8 pr-3 py-1.5 tracking-widest placeholder:text-muted-foreground/35 focus:outline-none focus:border-primary transition-colors"
                />
              </div>
              <button
                onClick={handleTickerSearch}
                disabled={!tickerInput.trim()}
                className="font-mono text-[10px] border border-border px-3 py-1.5 tracking-widest text-muted-foreground hover:bg-muted hover:text-foreground transition-colors disabled:opacity-40 shrink-0"
              >
                SEARCH →
              </button>
              {searchedTicker && (
                <button
                  onClick={clearTicker}
                  title="Clear ticker"
                  className="font-mono border border-border px-2 py-1.5 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors shrink-0"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {searchedTicker ? (
              /* ── Ticker header ── */
              <div className="flex items-start justify-between flex-wrap gap-4">
                <div>
                  {/* Company name */}
                  {filingsLoading && !tickerMeta ? (
                    <div className="h-4 w-56 bg-muted/60 animate-pulse mb-1" />
                  ) : (
                    <p className="font-mono text-sm text-foreground font-medium">
                      {tickerMeta?.name || searchedTicker}
                      <span className="text-muted-foreground ml-2 font-normal">({searchedTicker})</span>
                    </p>
                  )}
                  {/* Exchange + sector */}
                  {tickerMeta && (
                    <p className="font-mono text-[10px] text-muted-foreground/50 mt-0.5">
                      {[
                        tickerMeta.exchanges.join(' · '),
                        tickerMeta.sicDescription,
                      ].filter(Boolean).join(' · ')}
                    </p>
                  )}
                  <p className="font-mono text-[10px] text-muted-foreground/40 mt-1">
                    {activeTab === 'news'
                      ? 'Ticker-specific news via Yahoo Finance.'
                      : 'SEC EDGAR filing database. Click any row to open the document.'}
                  </p>
                </div>

                {/* Tabs */}
                <div className="flex border border-border">
                  <button
                    onClick={() => setActiveTab('news')}
                    className={`font-mono text-[10px] px-5 py-2 tracking-widest transition-colors ${
                      activeTab === 'news'
                        ? 'bg-primary text-primary-foreground'
                        : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                    }`}
                  >
                    NEWS
                  </button>
                  <button
                    onClick={() => setActiveTab('financials')}
                    className={`font-mono text-[10px] px-5 py-2 tracking-widest border-l border-border transition-colors ${
                      activeTab === 'financials'
                        ? 'bg-primary text-primary-foreground'
                        : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                    }`}
                  >
                    FINANCIALS
                  </button>
                </div>
              </div>
            ) : (
              /* ── Market news header ── */
              <div className="flex items-center justify-between flex-wrap gap-3">
                <p className="font-mono text-xs text-muted-foreground">
                  Aggregated from Bloomberg · Reuters · CNBC · MarketWatch · FT · Yahoo Finance · Investing.com · The Guardian.
                  Polls every 60 seconds.
                </p>
                <div className="flex items-center gap-3">
                  {lastUpdated && (
                    <span className="font-mono text-[10px] text-muted-foreground/50 tracking-widest">
                      UPDATED {lastUpdated.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false })}
                    </span>
                  )}
                  <button
                    onClick={() => fetchNews(true)}
                    disabled={refreshing}
                    className="font-mono text-[10px] border border-border px-2 py-1 text-muted-foreground hover:text-foreground hover:bg-muted transition-colors flex items-center gap-1.5 tracking-widest disabled:opacity-50"
                  >
                    <RefreshCw className={`w-3 h-3 ${refreshing ? 'animate-spin' : ''}`} />
                    REFRESH
                  </button>
                </div>
              </div>
            )}
          </div>
        </section>

        {/* ── Sticky filter bar ────────────────────────────────────────────── */}
        <section className="sticky top-12 md:top-14 bg-background/95 backdrop-blur-sm z-40 border-b border-border">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-0">

            {inFinancialsMode ? (
              /* Financials filters: year row + form-type row */
              <div className="flex flex-col divide-y divide-border">
                {/* Year row */}
                <div className="flex overflow-x-auto">
                  {(filingsLoading && availableYears.length <= 1
                    ? ['ALL']
                    : availableYears
                  ).map((y) => (
                    <button
                      key={y}
                      onClick={() => setYearFilter(y)}
                      className={`font-mono text-[11px] tracking-widest px-4 h-9 whitespace-nowrap transition-colors border-r border-border last:border-r-0 ${
                        yearFilter === y
                          ? 'bg-primary text-primary-foreground'
                          : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                      }`}
                    >
                      {y}
                    </button>
                  ))}
                </div>

                {/* Form-type row */}
                {availableFormTypes.length > 1 && (
                  <div className="flex overflow-x-auto">
                    {availableFormTypes.map((f) => (
                      <button
                        key={f}
                        onClick={() => setFormTypeFilter(f)}
                        className={`font-mono text-[10px] tracking-widest px-4 h-8 whitespace-nowrap transition-colors border-r border-border last:border-r-0 ${
                          formTypeFilter === f
                            ? 'bg-primary text-primary-foreground'
                            : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                        }`}
                      >
                        {f}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              /* News importance filters */
              <div className="flex divide-x divide-border border-x border-border w-fit">
                {NEWS_FILTERS.map((f) => (
                  <button
                    key={f}
                    onClick={() => setNewsFilter(f)}
                    className={`font-mono text-[11px] uppercase tracking-widest px-4 h-9 transition-colors ${
                      newsFilter === f
                        ? 'bg-primary text-primary-foreground'
                        : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                    }`}
                  >
                    {f}
                    <span className="ml-1.5 opacity-60">({newsFilterCounts[f]})</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </section>

        {/* ── Content ──────────────────────────────────────────────────────── */}
        <section className="py-8">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-4xl">

            {inFinancialsMode ? (
              /* ── FINANCIALS TAB ── */
              <>
                {filingsLoading && <FilingsSkeleton />}

                {filingsError && !filingsLoading && (
                  <div className="border border-border px-6 py-10 text-center">
                    <p className="font-mono text-sm text-muted-foreground mb-2">EDGAR LOOKUP FAILED</p>
                    <p className="font-mono text-xs text-muted-foreground/60 mb-4">{filingsError}</p>
                    <button
                      onClick={() => fetchFilings(searchedTicker)}
                      className="font-mono text-[11px] tracking-widest border border-border px-4 py-2 text-muted-foreground hover:bg-muted transition-colors"
                    >
                      RETRY →
                    </button>
                  </div>
                )}

                {!filingsLoading && !filingsError && filteredFilings.length === 0 && filings.length > 0 && (
                  <div className="border border-border px-6 py-10 text-center">
                    <p className="font-mono text-sm text-muted-foreground">
                      NO {formTypeFilter !== 'ALL' ? formTypeFilter : ''} FILINGS
                      {yearFilter !== 'ALL' ? ` IN ${yearFilter}` : ''}
                    </p>
                  </div>
                )}

                {!filingsLoading && !filingsError && filteredFilings.length > 0 && (
                  <>
                    <div className="border border-border">
                      {filteredFilings.map((filing, i) => (
                        <FilingItem key={filing.accessionNumber} filing={filing} index={i} />
                      ))}
                    </div>
                    <div className="mt-2 flex items-center justify-between">
                      <span className="font-mono text-[10px] text-muted-foreground/40 tracking-widest">
                        {filteredFilings.length} FILING{filteredFilings.length !== 1 ? 'S' : ''}
                        {yearFilter !== 'ALL' || formTypeFilter !== 'ALL'
                          ? ` · FILTERED FROM ${filings.length} TOTAL`
                          : ''}
                      </span>
                      <span className="font-mono text-[10px] text-muted-foreground/40 tracking-widest">
                        SOURCE: SEC EDGAR
                      </span>
                    </div>
                  </>
                )}
              </>
            ) : (
              /* ── NEWS TAB (market or ticker) ── */
              <>
                {(loading || tickerNewsLoading) && <NewsSkeleton />}

                {(error || tickerNewsError) && !(loading || tickerNewsLoading) && (
                  <div className="border border-border px-6 py-10 text-center">
                    <p className="font-mono text-sm text-muted-foreground mb-3">
                      {searchedTicker ? `NO NEWS FOUND FOR ${searchedTicker}` : 'FEED UNAVAILABLE'}
                    </p>
                    <p className="font-mono text-xs text-muted-foreground/60 mb-4">
                      {searchedTicker
                        ? 'Yahoo Finance returned no results for this ticker.'
                        : 'Could not connect to news sources. API server may be offline.'}
                    </p>
                    <button
                      onClick={() => searchedTicker ? fetchTickerNews(searchedTicker) : fetchNews(true)}
                      className="font-mono text-[11px] tracking-widest border border-border px-4 py-2 text-muted-foreground hover:bg-muted transition-colors"
                    >
                      RETRY →
                    </button>
                  </div>
                )}

                {!(loading || tickerNewsLoading) && !(error || tickerNewsError) && filteredNews.length === 0 && (
                  <div className="border border-border px-6 py-10 text-center">
                    <p className="font-mono text-sm text-muted-foreground">
                      NO {newsFilter !== 'ALL' ? newsFilter : ''} ITEMS
                    </p>
                  </div>
                )}

                {!(loading || tickerNewsLoading) && !(error || tickerNewsError) && filteredNews.length > 0 && (
                  <>
                    <div className="border border-border">
                      {filteredNews.map((item, i) => (
                        <NewsItem key={item.id} item={item} index={i} />
                      ))}
                    </div>
                    <div className="mt-2 flex items-center justify-between">
                      <span className="font-mono text-[10px] text-muted-foreground/40 tracking-widest">
                        {filteredNews.length} ITEMS
                        {searchedTicker ? '' : ' · AUTO-REFRESH EVERY 60 SEC'}
                      </span>
                      <span className="font-mono text-[10px] text-muted-foreground/40 tracking-widest">
                        {searchedTicker
                          ? 'YAHOO FINANCE'
                          : 'BLOOMBERG · REUTERS · CNBC · FT · MARKETWATCH · INVESTING · YAHOO · GUARDIAN'}
                      </span>
                    </div>
                  </>
                )}
              </>
            )}

          </div>
        </section>

      </div>
    </WavePageTransition>
  );
};

export default NewsPage;
