import React, { useState, useEffect } from 'react';
import apiServerClient from '@/lib/apiServerClient.js';

const STATIC_DATA = [
  { label: 'SPX',  value: '5,204',  unit: '',  positive: true  },
  { label: 'NDX',  value: '18,100', unit: '',  positive: true  },
  { label: 'VIX',  value: '16.42',  unit: '',  positive: null  },
  { label: '10Y',  value: '4.28',   unit: '%', positive: false },
];

const MarketDataPanel = () => {
  const [data, setData] = useState(STATIC_DATA);
  const [live, setLive] = useState(false);
  const [timestamp, setTimestamp] = useState(() => new Date().toISOString().slice(0, 10));

  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await apiServerClient.fetch('/market-data');
        if (!res.ok) return;
        const json = await res.json();
        setData(json);
        setLive(true);
        setTimestamp(new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false }));
      } catch {
        // keep static fallback
      }
    };

    fetchData();
    const interval = setInterval(fetchData, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="w-full bg-muted/40 border-y border-border overflow-hidden py-1.5 px-4 flex items-center gap-0 flex-wrap">
      <span className="font-mono text-[10px] text-muted-foreground uppercase tracking-widest mr-4 shrink-0">
        MARKET DATA
      </span>
      <div className="flex items-center gap-4 flex-wrap">
        {data.map((item) => (
          <span key={item.label} className="font-mono text-[11px] flex items-center gap-1">
            <span className="text-muted-foreground">{item.label}</span>
            <span
              className={
                item.positive === true
                  ? 'text-terminal-green'
                  : item.positive === false
                  ? 'text-destructive'
                  : 'text-foreground'
              }
            >
              {item.value}{item.unit}
            </span>
            {item.change && (
              <span className={`text-[9px] ${item.positive ? 'text-terminal-green' : 'text-destructive'}`}>
                {item.change}
              </span>
            )}
          </span>
        ))}
        <span className="font-mono text-[10px] text-muted-foreground/60">
          [{live ? `LIVE · ${timestamp}` : `STATIC · ${timestamp}`}]
        </span>
      </div>
    </div>
  );
};

export default MarketDataPanel;
