import React, { useEffect, useState, Suspense } from 'react';
import { Route, Routes, BrowserRouter as Router, useLocation, Navigate } from 'react-router-dom';
import { ThemeProvider } from './contexts/ThemeContext.jsx';
import { ReadingModeProvider } from './contexts/ReadingModeContext.jsx';
import { Toaster } from './components/ui/toaster';
import { AnimatePresence } from 'framer-motion';
import ScrollToTop from './components/ScrollToTop';
import Header from './components/Header.jsx';
import Footer from './components/Footer.jsx';
import ErrorBoundary from './components/ErrorBoundary.jsx';
import HomePage from './pages/HomePage.jsx';
import WavePageTransition from './components/WavePageTransition.jsx';
import GridBackground from './components/GridBackground.jsx';
import ChatbotWidget from './components/ChatbotWidget.jsx';
import CommandPalette from './components/CommandPalette.jsx';
import ShortcutModal from './components/ShortcutModal.jsx';
import { useKeyboardNav } from './hooks/useKeyboardNav.js';
import { useTheme } from './contexts/ThemeContext.jsx';
import { useReadingMode } from './contexts/ReadingModeContext.jsx';

// ── Route-level code splitting ─────────────────────────────────────────────
// Every page except the landing page loads on demand. This keeps recharts,
// quiz/chatbot data, and 20+ lab tools out of the initial bundle.
const lazyPage = (loader) => React.lazy(loader);

const AboutPage       = lazyPage(() => import('./pages/AboutPage.jsx'));
const ProjectsPage    = lazyPage(() => import('./pages/ProjectsPage.jsx'));
const ContactPage     = lazyPage(() => import('./pages/ContactPage.jsx'));
const NewsPage        = lazyPage(() => import('./pages/NewsPage.jsx'));
const CourseworkPage  = lazyPage(() => import('./pages/CourseworkPage.jsx'));
const MacroRegimePage = lazyPage(() => import('./pages/MacroRegimePage.jsx'));
const RecruiterPage   = lazyPage(() => import('./pages/RecruiterPage.jsx'));
const AIPage          = lazyPage(() => import('./pages/AIPage.jsx'));
const MarketsPage     = lazyPage(() => import('./pages/MarketsPage.jsx'));
const GlossaryPage    = lazyPage(() => import('./pages/GlossaryPage.jsx'));
const DisclaimersPage = lazyPage(() => import('./pages/DisclaimersPage.jsx'));

// Research pages
const ResearchIndexPage  = lazyPage(() => import('./pages/research/ResearchIndexPage.jsx'));
const DeflatedSharpePage = lazyPage(() => import('./pages/research/DeflatedSharpePage.jsx'));
const SVICalibrationPage = lazyPage(() => import('./pages/research/SVICalibrationPage.jsx'));
const HMMRegimePage      = lazyPage(() => import('./pages/research/HMMRegimePage.jsx'));

// Lab pages
const LabLayout               = lazyPage(() => import('./components/LabLayout.jsx'));
const LabHomePage             = lazyPage(() => import('./pages/lab/LabHomePage.jsx'));
const YieldCurvePage          = lazyPage(() => import('./pages/lab/YieldCurvePage.jsx'));
const VaRPage                 = lazyPage(() => import('./pages/lab/VaRPage.jsx'));
const DistributionsPage       = lazyPage(() => import('./pages/lab/DistributionsPage.jsx'));
const StochasticPage          = lazyPage(() => import('./pages/lab/StochasticPage.jsx'));
const OrderBookPage           = lazyPage(() => import('./pages/lab/OrderBookPage.jsx'));
const RegimesPage             = lazyPage(() => import('./pages/lab/RegimesPage.jsx'));
const NotesPage               = lazyPage(() => import('./pages/lab/NotesPage.jsx'));
const LibraryPage             = lazyPage(() => import('./pages/lab/LibraryPage.jsx'));
const QuizPage                = lazyPage(() => import('./pages/QuizPage.jsx'));
const PortfolioOptimizerPage  = lazyPage(() => import('./pages/lab/PortfolioOptimizerPage.jsx'));
const FactorExposurePage      = lazyPage(() => import('./pages/lab/FactorExposurePage.jsx'));
const PEADPage                = lazyPage(() => import('./pages/lab/PEADPage.jsx'));
const IVSurfacePage           = lazyPage(() => import('./pages/lab/IVSurfacePage.jsx'));
const DCFPage                 = lazyPage(() => import('./pages/lab/DCFPage.jsx'));
const ICVaultPage             = lazyPage(() => import('./pages/lab/ICVaultPage.jsx'));
const RiskAttributionPage     = lazyPage(() => import('./pages/lab/RiskAttributionPage.jsx'));
const LiveSignalPage          = lazyPage(() => import('./pages/lab/LiveSignalPage.jsx'));
const StrategyPage            = lazyPage(() => import('./pages/lab/StrategyPage.jsx'));
const BacktestStatsPage       = lazyPage(() => import('./pages/lab/BacktestStatsPage.jsx'));
const MicrostructurePage      = lazyPage(() => import('./pages/lab/MicrostructurePage.jsx'));
const OptionsAnalyticsPage    = lazyPage(() => import('./pages/lab/OptionsAnalyticsPage.jsx'));
const FixedIncomeAdvPage      = lazyPage(() => import('./pages/lab/FixedIncomeAdvPage.jsx'));
const MLFinancePage           = lazyPage(() => import('./pages/lab/MLFinancePage.jsx'));
const LatencyPage             = lazyPage(() => import('./pages/lab/LatencyPage.jsx'));

const RouteFallback = () => (
  <div className="flex items-center justify-center min-h-screen font-mono text-xs text-muted-foreground">
    LOADING...
  </div>
);

// ── Command Palette controller (lives inside Router for useNavigate) ─────────────

function CommandPaletteController() {
  const [open, setOpen] = useState(false);
  const [shortcutsOpen, setShortcutsOpen] = useState(false);

  useEffect(() => {
    const handler = (e) => {
      const tag = document.activeElement?.tagName;
      const editable = tag === 'INPUT' || tag === 'TEXTAREA' || document.activeElement?.isContentEditable;
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        setOpen(prev => !prev);
      } else if (e.key === '?' && !editable) {
        e.preventDefault();
        setShortcutsOpen(prev => !prev);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  return (
    <>
      <CommandPalette open={open} onClose={() => setOpen(false)} />
      <ShortcutModal open={shortcutsOpen} onOpenChange={setShortcutsOpen} />
    </>
  );
}

// ── Main site layout ──────────────────────────────────────────────────────────────

const MainSite = () => {
  const location = useLocation();
  const { toggleTheme, toggleBrownMode } = useTheme();
  const { toggleReadingMode } = useReadingMode();
  useKeyboardNav({ toggleTheme, toggleReadingMode });

  // Ctrl+B → toggle Brown / Library mode
  useEffect(() => {
    const handler = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'b') {
        e.preventDefault();
        toggleBrownMode();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [toggleBrownMode]);

  return (
    <div className="flex flex-col min-h-screen relative z-10">
      <Header />
      <main className="flex-grow">
        <Suspense fallback={<RouteFallback />}>
          <AnimatePresence mode="wait">
            <Routes location={location} key={location.pathname}>
              <Route path="/"        element={<WavePageTransition><HomePage /></WavePageTransition>} />
              <Route path="/about"   element={<WavePageTransition><AboutPage /></WavePageTransition>} />
              <Route path="/projects" element={<ProjectsPage />} />
              <Route path="/contact" element={<WavePageTransition><ContactPage /></WavePageTransition>} />
              <Route path="/news"    element={<NewsPage />} />
              <Route path="/recruiter" element={<WavePageTransition><RecruiterPage /></WavePageTransition>} />
              <Route path="/research"                      element={<WavePageTransition><ResearchIndexPage /></WavePageTransition>} />
              <Route path="/research/deflated-sharpe"      element={<WavePageTransition><DeflatedSharpePage /></WavePageTransition>} />
              <Route path="/research/svi-calibration"      element={<WavePageTransition><SVICalibrationPage /></WavePageTransition>} />
              <Route path="/research/hmm-regime-detection" element={<WavePageTransition><HMMRegimePage /></WavePageTransition>} />
              <Route path="/markets"     element={<WavePageTransition><MarketsPage /></WavePageTransition>} />
              <Route path="/glossary"    element={<WavePageTransition><GlossaryPage /></WavePageTransition>} />
              <Route path="/disclaimers" element={<WavePageTransition><DisclaimersPage /></WavePageTransition>} />
              <Route path="/ai"          element={<WavePageTransition><AIPage /></WavePageTransition>} />
            </Routes>
          </AnimatePresence>
        </Suspense>
      </main>
      <Footer />
      <Toaster />
    </div>
  );
};

// ── App ───────────────────────────────────────────────────────────────────────────

function App() {
  return (
    <ThemeProvider>
      <ReadingModeProvider>
        <Router>
          <ScrollToTop />
          <GridBackground />
          <ChatbotWidget />
          <CommandPaletteController />
          <ErrorBoundary>
            <Suspense fallback={<RouteFallback />}>
              <Routes>
                {/* Coursework — own layout, no main header/footer */}
                <Route path="/coursework" element={<CourseworkPage />} />

                {/* Macro Regime HUD — own layout, accessible from News */}
                <Route path="/regime" element={<MacroRegimePage />} />

                {/* Library — full-screen 3D, no layout wrapper */}
                <Route path="/lab/library" element={<LibraryPage />} />

                {/* Lab sub-site — own layout, no main header/footer */}
                <Route path="/lab" element={<LabLayout />}>
                  <Route index element={<LabHomePage />} />
                  <Route path="yield-curve"   element={<YieldCurvePage />} />
                  <Route path="var"           element={<VaRPage />} />
                  <Route path="distributions" element={<DistributionsPage />} />
                  <Route path="stochastic"    element={<StochasticPage />} />
                  <Route path="order-book"    element={<OrderBookPage />} />
                  <Route path="regimes"       element={<RegimesPage />} />
                  <Route path="notes"         element={<NotesPage />} />
                  {/* library is top-level above */}
                  <Route path="quiz"          element={<QuizPage />} />
                  <Route path="optimizer"     element={<PortfolioOptimizerPage />} />
                  <Route path="factors"       element={<FactorExposurePage />} />
                  <Route path="pead"          element={<PEADPage />} />
                  <Route path="iv-surface"    element={<IVSurfacePage />} />
                  <Route path="dcf"           element={<DCFPage />} />
                  <Route path="ic-vault"      element={<ICVaultPage />} />
                  <Route path="risk"          element={<RiskAttributionPage />} />
                  <Route path="live-signal"  element={<LiveSignalPage />} />
                  <Route path="strategy"     element={<StrategyPage />} />
                  <Route path="backtest-stats" element={<BacktestStatsPage />} />
                  <Route path="microstructure" element={<MicrostructurePage />} />
                  <Route path="options-analytics" element={<OptionsAnalyticsPage />} />
                  <Route path="fixed-income-adv"  element={<FixedIncomeAdvPage />} />
                  <Route path="ml-finance"        element={<MLFinancePage />} />
                  <Route path="latency"           element={<LatencyPage />} />
                  <Route path="sim"           element={<Navigate to="/lab/stochastic" replace />} />
                </Route>

                {/* Main site */}
                <Route path="*" element={<MainSite />} />
              </Routes>
            </Suspense>
          </ErrorBoundary>
        </Router>
      </ReadingModeProvider>
    </ThemeProvider>
  );
}

export default App;
