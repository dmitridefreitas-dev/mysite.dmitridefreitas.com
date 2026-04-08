import React from 'react';
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

// Lab pages
import LabHomePage     from './pages/lab/LabHomePage.jsx';
import YieldCurvePage  from './pages/lab/YieldCurvePage.jsx';
import VaRPage         from './pages/lab/VaRPage.jsx';
import DistributionsPage from './pages/lab/DistributionsPage.jsx';
import StochasticPage  from './pages/lab/StochasticPage.jsx';
import OrderBookPage   from './pages/lab/OrderBookPage.jsx';
import RegimesPage     from './pages/lab/RegimesPage.jsx';
import NotesPage              from './pages/lab/NotesPage.jsx';
import QuizPage               from './pages/QuizPage.jsx';
import PortfolioOptimizerPage from './pages/lab/PortfolioOptimizerPage.jsx';
import FactorExposurePage     from './pages/lab/FactorExposurePage.jsx';
import PEADPage               from './pages/lab/PEADPage.jsx';

// ── Main site layout ──────────────────────────────────────────────────────────────

const MainSite = () => {
  const location = useLocation();
  const { toggleTheme } = useTheme();
  const { toggleReadingMode } = useReadingMode();
  useKeyboardNav({ toggleTheme, toggleReadingMode });

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
          <Routes>
            {/* Coursework — own layout, no main header/footer */}
            <Route path="/coursework" element={<CourseworkPage />} />

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
              <Route path="quiz"          element={<QuizPage />} />
              <Route path="optimizer"     element={<PortfolioOptimizerPage />} />
              <Route path="factors"       element={<FactorExposurePage />} />
              <Route path="pead"          element={<PEADPage />} />
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
