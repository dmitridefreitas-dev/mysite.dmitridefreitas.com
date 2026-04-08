import React from 'react';

const SectionHeader = ({ number, title, className = '' }) => (
  <div className={`mb-10 ${className}`}>
    <span className="font-mono text-xs text-muted-foreground tracking-widest uppercase block">
      {number}
    </span>
    <h2 className="font-mono text-2xl md:text-3xl font-bold tracking-tight mt-1 uppercase text-foreground">
      {title}
    </h2>
    <div className="h-px bg-border mt-3 w-full" />
  </div>
);

export default SectionHeader;
