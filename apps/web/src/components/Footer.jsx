import React from 'react';
import { Link } from 'react-router-dom';
import { useToast } from '@/hooks/use-toast';
import FooterMeters from './FooterMeters.jsx';

const navLinks = [
  { num: '1', label: 'OVERVIEW',  path: '/'        },
  { num: '2', label: 'PROFILE',   path: '/about'   },
  { num: '3', label: 'RESEARCH',  path: '/projects'},
  { num: '4', label: 'CONTACT',   path: '/contact' },
  { num: '5', label: 'NEWS',      path: '/news'    },
  { num: '6', label: 'LAB',       path: '/lab'     },
];

const Footer = () => {
  const { toast } = useToast();

  const handleGitHub = () =>
    toast({ title: 'GitHub', description: 'Profile link coming soon.' });

  return (
    <footer className="border-t border-border bg-background relative z-10 mt-auto">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-2.5">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-3 md:gap-0">

          {/* Left: identifier + nav */}
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
            <span className="font-mono text-[10px] text-muted-foreground tracking-widest">
              DDF<span className="text-primary">·</span>TERMINAL v2.0
            </span>
            <span className="text-border hidden md:inline">|</span>
            {navLinks.map((link) => (
              <Link
                key={link.path}
                to={link.path}
                className="font-mono text-[10px] text-muted-foreground hover:text-primary transition-colors tracking-widest"
              >
                [{link.num}] {link.label}
              </Link>
            ))}
          </div>

          {/* Right: meters + social + copyright */}
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
            <FooterMeters />
            <span className="text-border hidden md:inline">|</span>
            <button
              onClick={() => window.open('https://www.linkedin.com/in/dmitri-de-freitas-16a540347/', '_blank')}
              className="font-mono text-[10px] text-muted-foreground hover:text-primary transition-colors"
            >
              LN
            </button>
            <button
              onClick={handleGitHub}
              className="font-mono text-[10px] text-muted-foreground hover:text-primary transition-colors"
            >
              GH
            </button>
            <a
              href="https://drive.google.com/file/d/1Ff9CtgP3OndC67ARXolrRjH6Y2seE1Sl/view?usp=drive_link"
              target="_blank"
              rel="noopener noreferrer"
              className="font-mono text-[10px] text-muted-foreground hover:text-primary transition-colors"
            >
              CV.PDF
            </a>
            <span className="text-border hidden md:inline">|</span>
            <span className="font-mono text-[10px] text-muted-foreground">
              © {new Date().getFullYear()} DMITRI DE FREITAS
            </span>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
