import React from 'react';
import { Helmet } from 'react-helmet';
import { Link, useLocation } from 'react-router-dom';

const NotFoundPage = () => {
  const { pathname } = useLocation();

  return (
    <>
      <Helmet>
        <title>404 — Dmitri De Freitas</title>
        <meta name="robots" content="noindex" />
      </Helmet>
      <div className="min-h-[70vh] flex flex-col items-center justify-center gap-5 px-6 text-center pt-14">
        <p className="font-mono text-6xl font-bold text-primary">404</p>
        <p className="font-mono text-sm font-bold text-foreground tracking-widest">
          ROUTE NOT FOUND
        </p>
        <p className="font-mono text-xs text-muted-foreground max-w-sm leading-relaxed break-all">
          {pathname} did not match any instrument in this terminal.
        </p>
        <div className="flex flex-wrap justify-center gap-3 pt-2">
          <Link
            to="/"
            className="font-mono text-xs font-bold tracking-widest bg-primary text-primary-foreground px-5 py-2.5 hover:bg-primary/90 transition-colors"
          >
            HOME
          </Link>
          <Link
            to="/projects"
            className="font-mono text-xs font-bold tracking-widest border border-border text-foreground px-5 py-2.5 hover:bg-muted transition-colors"
          >
            PROJECTS
          </Link>
          <Link
            to="/lab"
            className="font-mono text-xs font-bold tracking-widest border border-border text-foreground px-5 py-2.5 hover:bg-muted transition-colors"
          >
            RESEARCH LAB
          </Link>
        </div>
      </div>
    </>
  );
};

export default NotFoundPage;
