import React, { useEffect } from 'react';
import { Link, useLocation, useNavigate, Outlet } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { useTheme } from '@/contexts/ThemeContext.jsx';
import GridBackground from './GridBackground.jsx';
import { Toaster } from './ui/toaster';

const labLinks = [
  { num: '1', label: 'YIELD CURVE', path: '/lab/yield-curve'   },
  { num: '2', label: 'VAR',         path: '/lab/var'            },
  { num: '3', label: 'DIST',        path: '/lab/distributions'  },
  { num: '4', label: 'STOCHASTIC',  path: '/lab/stochastic'     },
  { num: '5', label: 'ORDER BOOK',  path: '/lab/order-book'     },
  { num: '6', label: 'REGIMES',     path: '/lab/regimes'        },
  { num: '7', label: 'NOTES',       path: '/lab/notes'          },
  { num: '8', label: 'QUIZ',        path: '/lab/quiz'           },
  { num: '9', label: 'SIM',         path: '/lab/sim'            },
  { num: 'O', label: 'OPTIMIZER',   path: '/lab/optimizer'      },
  { num: 'F', label: 'FACTORS',     path: '/lab/factors'        },
  { num: 'P', label: 'PEAD',        path: '/lab/pead'           },
];

const isInputActive = () => {
  const tag = document.activeElement?.tagName?.toLowerCase();
  return tag === 'input' || tag === 'textarea' || tag === 'select';
};

export default function LabLayout() {
  const location = useLocation();
  const navigate  = useNavigate();
  const { theme, toggleTheme } = useTheme();

  const isActive = (p) =>
    location.pathname === p || location.pathname.startsWith(p + '/');

  useEffect(() => {
    const handler = (e) => {
      if (isInputActive()) return;
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      if (e.key === 'Escape') { navigate('/'); return; }
      if (e.key === 'd') { toggleTheme(); return; }
      const routes = {
        '1': '/lab/yield-curve', '2': '/lab/var',
        '3': '/lab/distributions', '4': '/lab/stochastic',
        '5': '/lab/order-book',   '6': '/lab/regimes',
        '7': '/lab/notes',        '8': '/lab/quiz',
        '9': '/lab/sim',
        'o': '/lab/optimizer',    'f': '/lab/factors',
        'p': '/lab/pead',
      };
      if (routes[e.key]) navigate(routes[e.key]);
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [navigate, toggleTheme]);

  return (
    <div className="flex flex-col min-h-screen bg-background text-foreground">
      <GridBackground />

      {/* ── Lab Header ─────────────────────────────────────────── */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-background/95 backdrop-blur-sm border-b border-border">
        {/* Main bar */}
        <div className="flex items-center h-12 px-3 gap-2">
          {/* ESC / EXIT */}
          <Link
            to="/"
            className="flex items-center gap-1.5 px-3 h-8 font-mono text-[11px] tracking-widest border border-primary text-primary hover:bg-primary hover:text-primary-foreground transition-colors shrink-0"
            title="Exit lab (Escape)"
          >
            <ArrowLeft className="h-3 w-3" />
            ESC
          </Link>

          <span className="text-border hidden 2xl:inline mx-1">|</span>

          {/* Desktop nav */}
          <nav className="hidden 2xl:flex items-center border border-border divide-x divide-border overflow-hidden">
            {labLinks.map(link => (
              <Link
                key={link.path}
                to={link.path}
                className={`flex items-center gap-1.5 px-3 h-8 font-mono text-[10px] tracking-widest transition-colors whitespace-nowrap ${
                  isActive(link.path)
                    ? 'bg-primary text-primary-foreground'
                    : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                }`}
              >
                <span className="opacity-40 text-[9px]">[{link.num}]</span>
                {link.label}
              </Link>
            ))}
          </nav>

          {/* Right */}
          <div className="ml-auto flex items-center gap-3 shrink-0">
            <button
              onClick={toggleTheme}
              className="font-mono text-[10px] text-muted-foreground hover:text-foreground border border-border px-2 h-6 transition-colors tracking-wider"
              title="Toggle theme (D)"
            >
              [{theme === 'light' ? 'D' : 'L'}]
            </button>
            <span className="font-mono text-[10px] text-muted-foreground tracking-widest hidden sm:inline">
              DDF<span className="text-primary">·</span>LAB v1.0
            </span>
          </div>
        </div>

        {/* Mobile / tablet scrollable nav row */}
        <div className="2xl:hidden border-t border-border overflow-x-auto">
          <div className="flex min-w-max divide-x divide-border">
            {labLinks.map(link => (
              <Link
                key={link.path}
                to={link.path}
                className={`px-3 py-1.5 font-mono text-[9px] tracking-wider whitespace-nowrap transition-colors ${
                  isActive(link.path)
                    ? 'text-primary bg-primary/10'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                [{link.num}] {link.label}
              </Link>
            ))}
          </div>
        </div>
      </header>

      {/* pt accounts for: 48px main bar + ~28px mobile nav row on small screens */}
      <main className="flex-grow pt-20 2xl:pt-12 relative z-10">
        <Outlet />
      </main>

      <Toaster />
    </div>
  );
}
