import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useTheme } from '@/contexts/ThemeContext.jsx';
import { useReadingMode } from '@/contexts/ReadingModeContext.jsx';
import { Menu, X, Download, Linkedin, Github } from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';
import { useToast } from '@/hooks/use-toast';

const navLinks = [
  { num: '1', label: 'OVERVIEW',  path: '/'        },
  { num: '2', label: 'PROFILE',   path: '/about'   },
  { num: '3', label: 'RESEARCH',  path: '/projects'},
  { num: '4', label: 'CONTACT',   path: '/contact' },
  { num: '5', label: 'NEWS',      path: '/news'    },
  { num: '6', label: 'LAB',       path: '/lab'     },
  { num: '7', label: 'AI',        path: '/ai'      },
];

const Header = () => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const { theme, toggleTheme, toggleBrownMode, cycleTheme } = useTheme();
  const themeLabel = theme === 'brown' ? 'Theme: Brown' : 'Theme: Dark';
  const { isTechnicalMode, toggleReadingMode } = useReadingMode();
  const location = useLocation();
  const { toast } = useToast();

  const isActive = (path) => location.pathname === path;

  const handleLinkedIn = () =>
    window.open('https://www.linkedin.com/in/dmitri-de-freitas-16a540347/', '_blank');

  const handleGitHub = () =>
    toast({ title: 'GitHub', description: 'Profile link coming soon.' });

  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-background/95 backdrop-blur-sm border-b border-border">
      {/* Main bar */}
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center h-10 md:h-11 gap-4">

          {/* Left: function-key nav (desktop) */}
          <nav className="hidden md:flex items-center gap-0 border border-border divide-x divide-border shrink-0">
            {navLinks.map((link) => (
              <Link
                key={link.path}
                to={link.path}
                className={`flex items-center gap-1 px-3 h-6 font-mono text-[10px] tracking-widest transition-colors ${
                  isActive(link.path)
                    ? 'bg-primary text-primary-foreground'
                    : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                }`}
              >
                <span className="opacity-50 text-[9px]">[{link.num}]</span>
                {link.label}
              </Link>
            ))}
          </nav>

          {/* Center: identifier */}
          <div className="flex-1 flex justify-center">
            <Link to="/" className="shrink-0">
              <span className="font-mono text-xs font-bold tracking-widest text-foreground">
                DDF<span className="text-primary">·</span>TERMINAL
              </span>
              <span className="font-mono text-[10px] text-muted-foreground ml-2 hidden sm:inline">
                v2.0
              </span>
            </Link>
          </div>

          {/* Right: controls */}
          <div className="hidden md:flex items-center gap-2">
            {/* Reading mode */}
            <button
              onClick={toggleReadingMode}
              className="font-mono text-[10px] text-muted-foreground hover:text-foreground border border-border px-2 h-6 transition-colors tracking-wider"
              title="Toggle reading mode (V)"
            >
              VIEW:{isTechnicalMode ? 'QUANT' : 'SIMPLE'}
            </button>

            {/* Theme */}
            <button
              onClick={cycleTheme}
              className="font-mono text-[10px] text-muted-foreground hover:text-foreground border border-border px-2 h-6 transition-colors tracking-wider"
              title="Cycle theme: Dark → Brown"
            >
              {themeLabel}
            </button>

            <div className="w-px h-4 bg-border" />

            {/* Social */}
            <button
              onClick={handleLinkedIn}
              className="font-mono text-[10px] text-muted-foreground hover:text-primary transition-colors"
              title="LinkedIn"
            >
              LN
            </button>
            <button
              onClick={handleGitHub}
              className="font-mono text-[10px] text-muted-foreground hover:text-primary transition-colors"
              title="GitHub"
            >
              GH
            </button>

            <div className="w-px h-4 bg-border" />

            {/* Resume */}
            <a
              href="https://drive.google.com/file/d/1Ff9CtgP3OndC67ARXolrRjH6Y2seE1Sl/view?usp=drive_link"
              target="_blank"
              rel="noopener noreferrer"
              className="font-mono text-[10px] text-muted-foreground hover:text-primary border border-border px-2 h-6 flex items-center gap-1 transition-colors tracking-wider"
            >
              <Download className="h-2.5 w-2.5" />
              CV.PDF
            </a>
          </div>

          {/* Mobile: title center (shown only on mobile, nav items are in hamburger) */}
          <div className="flex-1 flex md:hidden justify-center">
            <Link to="/">
              <span className="font-mono text-xs font-bold tracking-widest text-foreground">
                DDF<span className="text-primary">·</span>TERMINAL
              </span>
            </Link>
          </div>

          {/* Mobile: theme + hamburger */}
          <div className="flex md:hidden items-center gap-2 shrink-0">
            <button
              onClick={cycleTheme}
              className="font-mono text-[10px] text-muted-foreground border border-border px-2 h-6 tracking-wider"
              title="Cycle theme"
            >
              {themeLabel}
            </button>
            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="border border-border p-1.5"
            >
              {isMobileMenuOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile menu */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.15 }}
            className="md:hidden bg-background border-t border-border"
          >
            <div className="container mx-auto px-4 py-2">
              {/* Nav links */}
              <div className="divide-y divide-border">
                {navLinks.map((link) => (
                  <Link
                    key={link.path}
                    to={link.path}
                    onClick={() => setIsMobileMenuOpen(false)}
                    className={`flex items-center gap-3 py-3.5 font-mono text-xs tracking-widest ${
                      isActive(link.path) ? 'text-primary' : 'text-muted-foreground'
                    }`}
                  >
                    <span className="opacity-40 text-[10px] w-6">[{link.num}]</span>
                    {link.label}
                    {isActive(link.path) && <span className="ml-auto font-mono text-[9px] text-primary">●</span>}
                  </Link>
                ))}
                <Link to="/lab/notes" onClick={() => setIsMobileMenuOpen(false)}
                  className="flex items-center gap-3 py-3.5 font-mono text-xs tracking-widest text-muted-foreground">
                  <span className="opacity-40 text-[10px] w-6">[8]</span>
                  WRITEUPS
                </Link>
                <Link to="/coursework" onClick={() => setIsMobileMenuOpen(false)}
                  className="flex items-center gap-3 py-3.5 font-mono text-xs tracking-widest text-muted-foreground">
                  <span className="opacity-40 text-[10px] w-6">[C]</span>
                  COURSEWORK
                </Link>
              </div>

              {/* Controls row */}
              <div className="border-t border-border pt-3 pb-1 flex flex-col gap-3">
                {/* CV download — prominent */}
                <a
                  href="https://drive.google.com/file/d/1Ff9CtgP3OndC67ARXolrRjH6Y2seE1Sl/view?usp=drive_link"
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="flex items-center justify-center gap-2 font-mono text-[11px] tracking-widest border border-border py-2.5 text-foreground hover:bg-muted transition-colors"
                >
                  <Download className="h-3 w-3" />
                  DOWNLOAD CV
                </a>

                {/* Secondary controls */}
                <div className="flex items-center justify-between">
                  <button
                    onClick={toggleReadingMode}
                    className="font-mono text-[10px] text-muted-foreground border border-border px-3 h-7 tracking-wider"
                  >
                    VIEW: {isTechnicalMode ? 'QUANT' : 'EXEC'}
                  </button>
                  <div className="flex items-center gap-3">
                    <button onClick={handleLinkedIn} className="font-mono text-[10px] text-muted-foreground hover:text-primary transition-colors px-1 py-1">LN</button>
                    <button onClick={handleGitHub} className="font-mono text-[10px] text-muted-foreground hover:text-primary transition-colors px-1 py-1">GH</button>
                  </div>
                </div>

                {/* ⌘K hint */}
                <p className="font-mono text-[8px] text-muted-foreground/30 text-center tracking-widest pb-1">
                  CTRL+K · COMMAND PALETTE
                </p>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
};

export default Header;
