import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useTheme } from '@/contexts/ThemeContext.jsx';
import { useReadingMode } from '@/contexts/ReadingModeContext.jsx';
import { Menu, X, Download, Linkedin, Github } from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';
import { useToast } from '@/hooks/use-toast';

const navLinks = [
  { num: '1', label: 'OVERVIEW',  path: '/'         },
  { num: '2', label: 'PROFILE',   path: '/about'    },
  { num: '3', label: 'PROJECTS',  path: '/projects' },
  { num: '4', label: 'RESEARCH',  path: '/research' },
  { num: '5', label: 'CONTACT',   path: '/contact'  },
  { num: '6', label: 'NEWS',      path: '/news'     },
  { num: '7', label: 'LAB',       path: '/lab'      },
  { num: '8', label: 'AI',        path: '/ai'       },
];

const Header = () => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const { theme, toggleTheme, toggleBrownMode, cycleTheme } = useTheme();
  const themeLabel = theme === 'brown' ? 'BROWN' : 'DARK';
  const { isTechnicalMode, toggleReadingMode } = useReadingMode();
  const location = useLocation();
  const { toast } = useToast();

  const isActive = (path) => location.pathname === path;

  const handleLinkedIn = () =>
    window.open('https://www.linkedin.com/in/dmitri-de-freitas-16a540347/', '_blank');

  const handleGitHub = () =>
    window.open('https://github.com/dmitridefreitas-dev', '_blank');

  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-background/95 backdrop-blur-sm border-b border-border">
      {/* Main bar */}
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center h-10 md:h-11 gap-4">

          {/* Left: function-key nav (desktop) */}
          <nav className="hidden lg:flex items-center gap-0 border border-border divide-x divide-border shrink-0">
            {navLinks.map((link) => (
              <Link
                key={link.path}
                to={link.path}
                className={`flex items-center gap-1 px-2.5 h-7 font-mono text-[11px] tracking-widest transition-colors ${
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

          {/* Center: identifier (desktop only — mobile has its own centered title) */}
          <div className="flex-1 hidden lg:flex justify-center">
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
          <div className="hidden lg:flex items-center gap-2">
            {/* Reading mode */}
            <button
              onClick={toggleReadingMode}
              className="font-mono text-[10px] text-muted-foreground hover:text-foreground border border-border px-2 h-7 transition-colors tracking-wider"
              title="Toggle reading mode (V)"
            >
              VIEW:{isTechnicalMode ? 'QUANT' : 'SIMPLE'}
            </button>

            {/* Theme */}
            <button
              onClick={cycleTheme}
              className="font-mono text-[10px] text-muted-foreground hover:text-foreground border border-border px-2 h-7 transition-colors tracking-wider"
              title="Cycle theme: Dark → Brown"
            >
              {themeLabel}
            </button>

            <div className="w-px h-4 bg-border" />

            {/* Social */}
            <button
              onClick={handleLinkedIn}
              className="h-7 w-7 flex items-center justify-center border border-border text-muted-foreground hover:text-primary hover:border-primary/60 transition-colors"
              title="LinkedIn"
              aria-label="LinkedIn profile"
            >
              <Linkedin className="h-3.5 w-3.5" />
            </button>
            <button
              onClick={handleGitHub}
              className="h-7 w-7 flex items-center justify-center border border-border text-muted-foreground hover:text-primary hover:border-primary/60 transition-colors"
              title="GitHub"
              aria-label="GitHub profile"
            >
              <Github className="h-3.5 w-3.5" />
            </button>

            <div className="w-px h-4 bg-border" />

            {/* Recruiter — highlighted entry for the target audience */}
            <Link
              to="/recruiter"
              className={`font-mono text-[11px] font-semibold px-3 h-7 flex items-center transition-colors tracking-wider border ${
                isActive('/recruiter')
                  ? 'bg-primary text-primary-foreground border-primary'
                  : 'text-primary border-primary/60 bg-primary/10 hover:bg-primary/20'
              }`}
            >
              RECRUITER
            </Link>

            {/* Resume — primary CTA, always visible */}
            <a
              href="https://drive.google.com/file/d/1Ff9CtgP3OndC67ARXolrRjH6Y2seE1Sl/view?usp=drive_link"
              target="_blank"
              rel="noopener noreferrer"
              className="font-mono text-[11px] font-bold bg-primary text-primary-foreground hover:bg-primary/90 px-3.5 h-7 flex items-center gap-1.5 transition-colors tracking-wider"
            >
              <Download className="h-3.5 w-3.5" />
              RESUME
            </a>
          </div>

          {/* Mobile: title center (shown only on mobile, nav items are in hamburger) */}
          <div className="flex-1 flex lg:hidden justify-center">
            <Link to="/">
              <span className="font-mono text-xs font-bold tracking-widest text-foreground">
                DDF<span className="text-primary">·</span>TERMINAL
              </span>
            </Link>
          </div>

          {/* Mobile: theme + hamburger */}
          <div className="flex lg:hidden items-center gap-2 shrink-0">
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
            className="lg:hidden bg-background border-t border-border"
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
                  <span className="opacity-40 text-[10px] w-6">[W]</span>
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
                {/* Recruiter — prominent entry for the target audience */}
                <Link
                  to="/recruiter"
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="flex items-center justify-center gap-2 font-mono text-[11px] tracking-widest border border-primary bg-primary text-primary-foreground py-2.5 hover:bg-primary/90 transition-colors"
                >
                  FOR RECRUITERS →
                </Link>

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
                    className="font-mono text-[11px] text-muted-foreground border border-border px-3 h-8 tracking-wider"
                  >
                    VIEW: {isTechnicalMode ? 'QUANT' : 'SIMPLE'}
                  </button>
                  <div className="flex items-center gap-2">
                    <button onClick={handleLinkedIn} aria-label="LinkedIn profile" className="h-8 w-8 flex items-center justify-center border border-border text-muted-foreground hover:text-primary transition-colors">
                      <Linkedin className="h-4 w-4" />
                    </button>
                    <button onClick={handleGitHub} aria-label="GitHub profile" className="h-8 w-8 flex items-center justify-center border border-border text-muted-foreground hover:text-primary transition-colors">
                      <Github className="h-4 w-4" />
                    </button>
                  </div>
                </div>

                {/* ⌘K hint */}
                <p className="font-mono text-[9px] text-muted-foreground/60 text-center tracking-widest pb-1">
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
