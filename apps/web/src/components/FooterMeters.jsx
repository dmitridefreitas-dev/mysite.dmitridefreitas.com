import React, { useState, useEffect } from 'react';

const FooterMeters = () => {
  const [alpha, setAlpha] = useState(100);
  const [signal, setSignal] = useState(90);

  useEffect(() => {
    const alphaInterval = setInterval(() => {
      setAlpha((prev) => {
        const next = prev - 0.01;
        return next < 95 ? 95 : next;
      });
    }, 600);

    const signalInterval = setInterval(() => {
      setSignal(85 + Math.random() * 10);
    }, 2500);

    return () => {
      clearInterval(alphaInterval);
      clearInterval(signalInterval);
    };
  }, []);

  return (
    <div className="flex items-center gap-3 font-mono text-[10px] text-muted-foreground tracking-wider">
      <span>
        ALPHA: <span className="text-terminal-green">{alpha.toFixed(2)}%</span>
      </span>
      <span>
        SIGNAL: <span className="text-terminal-green">{signal.toFixed(1)}%</span>
      </span>
      <span className="text-terminal-green">p&lt;0.05 [OK]</span>
    </div>
  );
};

export default FooterMeters;
