import React from 'react';

const BlinkingCursor = ({ className = '' }) => (
  <span
    className={`font-mono text-primary animate-blink select-none ${className}`}
    aria-hidden="true"
  >
    _
  </span>
);

export default BlinkingCursor;
