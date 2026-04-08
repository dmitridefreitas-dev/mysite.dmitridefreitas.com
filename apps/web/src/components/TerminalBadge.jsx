import React from 'react';

const variantClasses = {
  status:   'border-terminal-green/60 text-terminal-green',
  date:     'border-border text-muted-foreground',
  location: 'border-border text-muted-foreground',
  complete: 'border-terminal-green/60 text-terminal-green',
  active:   'border-terminal-amber/60 text-terminal-amber',
  pending:  'border-terminal-amber/60 text-terminal-amber',
  error:    'border-destructive/60 text-destructive',
};

const TerminalBadge = ({ variant = 'date', children, className = '' }) => (
  <span
    className={`inline-block font-mono text-[10px] uppercase tracking-widest border px-2 py-0.5 ${variantClasses[variant] ?? variantClasses.date} ${className}`}
  >
    [{children}]
  </span>
);

export default TerminalBadge;
