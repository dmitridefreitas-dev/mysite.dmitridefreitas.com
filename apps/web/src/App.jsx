import React, { useEffect, useState } from 'react';
import { Route, Routes, BrowserRouter as Router, useLocation, Navigate } from 'react-router-dom';
import { ThemeProvider } from './contexts/ThemeContext.jsx';
import { ReadingModeProvider } from './contexts/ReadingModeContext.jsx';
import { Toaster } from './components/ui/toaster';
import { AnimatePresence } from 'framer-motion';
import ScrollToTop from './components/ScrollToTop';
import Header from './components/Header.jsx';
import Footer from './components/Footer.jsx';
import LabLayout from './components/LabLayout.jsx';
import HomePage from './pages/HomePage.jsx';
import AboutPage from './pages/AboutPage.jsx';
import ProjectsPage from './pages/ProjectsPage.jsx';
import ContactPage from './pages/ContactPage.jsx';
import NewsPage from './pages/NewsPage.jsx';
import WavePageTransition from './components/WavePageTransition.jsx';
import GridBackground from './components/GridBackground.jsx';
import { useKeyboardNav } from './hooks/useKeyboardNav.js';
import { useTheme } from './contexts/ThemeContext.jsx';
import { useReadingMode } from './contexts/ReadingModeContext.jsx';

import CourseworkPage from './pages/CourseworkPage.jsx';
import MacroRegimePage from './pages/MacroRegimePage.jsx';
import RecruiterPage from './pages/RecruiterPage.jsx';
import AIPage from './pages/AIPage.jsx';
import MarketsPage from './pages/MarketsPage.jsx';
import GlossaryPage from './pages/GlossaryPage.jsx';
import DisclaimersPage from './pages/DisclaimersPage.jsx';
import ChatbotWidget from './components/ChatbotWidget.jsx';
import CommandPalette from './components/CommandPalette.jsx';
import ShortcutModal from './components/ShortcutModal.jsx';

// Research pages
import ResearchIndexPage   from './pages/research/ResearchIndexPage.jsx';
import DeflatedSharpePage  from './pages/research/DeflatedSharpePage.jsx';
import SVICalibrationPage  from './pages/research/SVICalibrationPage.jsx';
import HMMRegimePage       from './pages/research/HMMRegimePage.jsx';

// Lab pages
import LabHomePage     from './pages/lab/LabHomePage.jsx';
import YieldCurvePage  from './pages/lab/YieldCurvePage.jsx';
import VaRPage         from './pages/lab/VaRPage.jsx';
import DistributionsPage from './pages/lab/DistributionsPage.jsx';
import StochasticPage  from './pages/lab/StochasticPage.jsx';
import OrderBookPage   from './pages/lab/OrderBookPage.jsx';
import RegimesPage     from './pages/lab/RegimesPage.jsx';
import NotesPage              from './pages/lab/NotesPage.jsx';
import LibraryPage            from './pages/lab/LibraryPage.jsx';
import QuizPage               from './pages/QuizPage.jsx';
import PortfolioOptimizerPage from './pages/lab/PortfolioOptimizerPage.jsx';
import FactorExposurePage     from './pages/lab/FactorExposurePage.jsx';
import PEADPage               from './pages/lab/PEADPage.jsx';
const IVSurfacePage = React.lazy(() => import('./pages/lab/IVSurfacePage.jsx'));
import DCFPage                from './pages/lab/DCFPage.jsx';
import ICVaultPage            from './pages/lab/ICVaultPage.jsx';
import RiskAttributionPage    from './pages/lab/RiskAttributionPage.jsx';
import LiveSignalPage         from './pages/lab/LiveSignalPage.jsx';
import StrategyPage           from './pages/lab/StrategyPage.jsx';
import BacktestStatsPage      from './pages/lab/BacktestStatsPage.jsx';
import MicrostructurePage     from './pages/lab/MicrostructurePage.jsx';
import OptionsAnalyticsPage   from './pages/lab/OptionsAnalyticsPage.jsx';
import FixedIncomeAdvPage     from './pages/lab/FixedIncomeAdvPage.jsx';
import MLFinancePage          from './pages/lab/MLFinancePage.jsx';
import LatencyPage            from './pages/lab/LatencyPage.jsx';

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
              <Route path="iv-surface"    element={<React.Suspense fallback={<div className="flex items-center justify-center min-h-screen font-mono text-xs text-muted-foreground">LOADING...</div>}><IVSurfacePage /></React.Suspense>} />
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
        </Router>
      </ReadingModeProvider>
    </ThemeProvider>
  );
}

export default App;
