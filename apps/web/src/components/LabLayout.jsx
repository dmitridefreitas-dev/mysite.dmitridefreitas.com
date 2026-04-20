import React, { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate, Outlet } from 'react-router-dom';
import { ArrowLeft, Search } from 'lucide-react';
import { useTheme } from '@/contexts/ThemeContext.jsx';
import GridBackground from './GridBackground.jsx';
import { Toaster } from './ui/toaster';
import CommandPalette from './CommandPalette.jsx';

const isInputActive = () => {
  const tag = document.activeElement?.tagName?.toLowerCase();
  return tag === 'input' || tag === 'textarea' || tag === 'select';
};

export default function LabLayout() {
  const location  = useLocation();
  const navigate  = useNavigate();
  const { theme, cycleTheme } = useTheme();
  const themeLabel = theme === 'light' ? 'LIGHT' : theme === 'dark' ? 'DARK' : 'BROWN';
  const [paletteOpen, setPaletteOpen] = useState(false);

  useEffect(() => {
    const handler = (e) => {
      // ⌘K or Ctrl+K — open palette (works even inside inputs)
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setPaletteOpen(p => !p);
        return;
      }
      if (isInputActive()) return;
      if (e.metaKey || e.ctrlKey || e.altKey) return;

      // / — open palette
      if (e.key === '/' && !paletteOpen) {
        e.preventDefault();
        setPaletteOpen(true);
        return;
      }
      if (e.key === 'Escape') {
        if (paletteOpen) { setPaletteOpen(false); return; }
        navigate(location.pathname === '/lab' ? '/' : '/lab');
        return;
      }
      if (e.key === 'd') { cycleTheme(); return; }

      const routes = {
        '1': '/lab/yield-curve',
        '2': '/lab/var',
        '3': '/lab/distributions',
        '4': '/lab/stochastic',
        '5': '/lab/order-book',
        '6': '/lab/regimes',
        '7': '/lab/notes',
        '8': '/lab/quiz',
        '9': '/lab/sim',
        'a': '/lab/options-analytics',
        'b': '/lab/fixed-income-adv',
        'c': '/lab/latency',
        'f': '/lab/factors',
        'i': '/lab/ic-vault',
        'l': '/lab/live-signal',
        'm': '/lab/dcf',
        'o': '/lab/optimizer',
        'p': '/lab/pead',
        'r': '/lab/risk',
        's': '/lab/strategy',
        'v': '/lab/iv-surface',
        'x': '/lab/backtest-stats',
        'z': '/lab/microstructure',
        'n': '/lab/ml-finance',
      };
      if (routes[e.key]) navigate(routes[e.key]);
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [navigate, location.pathname, cycleTheme, paletteOpen]);

  return (
    <div className="flex flex-col min-h-screen bg-background text-foreground">
      <GridBackground />
      <CommandPalette open={paletteOpen} onClose={() => setPaletteOpen(false)} />

      {/* ── Lab Header ─────────────────────────────────────────── */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-background/95 backdrop-blur-sm border-b border-border">
        <div className="flex items-center h-12 px-3 gap-2">

          {/* ESC / EXIT */}
          <Link
            to={location.pathname === '/lab' ? '/' : '/lab'}
            className="flex items-center gap-1.5 px-3 h-8 font-mono text-[11px] tracking-widest border border-primary text-primary hover:bg-primary hover:text-primary-foreground transition-colors shrink-0"
            title="Exit lab (Escape)"
          >
            <ArrowLeft className="h-3 w-3" />
            ESC
          </Link>

          <span className="font-mono text-[10px] text-muted-foreground/20 mx-1">|</span>

          {/* Current page breadcrumb */}
          <span className="font-mono text-[10px] text-muted-foreground/50 tracking-widest hidden sm:inline truncate">
            DDF<span className="text-primary">·</span>LAB
          </span>

          {/* ⌘K Search button — center of bar */}
          <button
            onClick={() => setPaletteOpen(true)}
            className="mx-auto flex items-center gap-2 border border-border/60 hover:border-primary/60 px-3 h-8 font-mono text-[10px] text-muted-foreground/50 hover:text-foreground transition-colors group"
            title="Search pages (⌘K or /)"
          >
            <Search className="h-3 w-3 shrink-0" />
            <span className="hidden sm:inline tracking-widest">SEARCH PAGES</span>
            <span className="ml-2 hidden sm:flex items-center gap-1">
              <kbd className="font-mono text-[7px] border border-border/50 px-1 py-0.5 text-muted-foreground/30 group-hover:border-primary/30 group-hover:text-muted-foreground/50">⌘K</kbd>
            </span>
          </button>

          {/* Right controls */}
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={cycleTheme}
              className="font-mono text-[9px] text-muted-foreground/50 hover:text-foreground border border-border/50 px-2 h-7 transition-colors tracking-widest"
              title="Cycle theme (D)"
            >
              {themeLabel}
            </button>
          </div>

        </div>
      </header>

      <main className="flex-grow pt-12 relative z-10">
        <Outlet />
      </main>

      <Toaster />
    </div>
  );
}
