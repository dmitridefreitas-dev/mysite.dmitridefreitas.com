import React from 'react';

// Catches render errors anywhere in the route tree so a single broken page
// (or a failed lazy-chunk load after a redeploy) never blanks the whole site.
class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, info) {
    console.error('[ErrorBoundary]', error, info?.componentStack);
  }

  handleReload = () => {
    // A stale lazy chunk after a redeploy is the most common cause — a hard
    // reload fetches the new index.html and chunk manifest.
    window.location.reload();
  };

  render() {
    if (!this.state.error) return this.props.children;

    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4 px-6 text-center">
        <p className="font-mono text-sm font-bold text-foreground tracking-widest">
          SOMETHING WENT WRONG
        </p>
        <p className="font-mono text-xs text-muted-foreground max-w-sm leading-relaxed">
          This page failed to load — possibly a connection hiccup or a new
          version of the site was just deployed.
        </p>
        <div className="flex gap-3">
          <button
            onClick={this.handleReload}
            className="font-mono text-xs font-bold tracking-widest bg-primary text-primary-foreground px-5 py-2.5 hover:bg-primary/90 transition-colors"
          >
            RELOAD
          </button>
          <a
            href="/"
            className="font-mono text-xs font-bold tracking-widest border border-border text-foreground px-5 py-2.5 hover:bg-muted transition-colors"
          >
            HOME
          </a>
        </div>
      </div>
    );
  }
}

export default ErrorBoundary;
