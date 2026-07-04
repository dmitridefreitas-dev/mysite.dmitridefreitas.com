import React from 'react';
import { motion } from 'framer-motion';

const terms = [
  'Algorithmic Trading & Market Microstructure',
  'Derivatives Pricing & Volatility Modeling',
  'Portfolio Optimization & Risk Management',
  'Stochastic Calculus & Interest Rate Modeling',
  'Low-Latency Trading Systems',
  'Backtesting & Execution Algorithms',
  'Data Science & Machine Learning',
  'Predictive Modeling & Statistical Inference',
  'Time Series Analysis & Forecasting',
  'Model Validation & Hypothesis Testing',
  'Feature Engineering & Ensemble Methods',
  'Data Pipeline Development & ETL Automation',
  'Real-Time Data Processing & Streaming',
  'Database Design & Big Data Solutions',
  'Cloud Infrastructure & Scalable Systems',
];

const tickerItems = [...terms, ...terms];

const FinanceTicker = () => (
  <div className="w-full bg-muted/40 border-y border-border overflow-hidden py-2 flex items-center">
    {/* Static label */}
    <div className="shrink-0 flex items-center gap-2 pl-4 pr-3 border-r border-border h-full relative z-20 bg-background">
      <span className="font-mono text-[11px] text-primary uppercase tracking-widest whitespace-nowrap">
        COMPETENCIES
      </span>
    </div>

    {/* Fade gradient */}
    <div className="flex-1 overflow-hidden relative">
      <div className="absolute left-0 top-0 bottom-0 w-12 bg-gradient-to-r from-background to-transparent z-10 pointer-events-none" />
      <div className="absolute right-0 top-0 bottom-0 w-12 bg-gradient-to-l from-background to-transparent z-10 pointer-events-none" />
      {/* w-max + -50% of own width with the list duplicated once = seamless loop */}
      <motion.div
        className="flex whitespace-nowrap w-max"
        animate={{ x: ['0%', '-50%'] }}
        transition={{ repeat: Infinity, ease: 'linear', duration: 90 }}
      >
        {tickerItems.map((term, index) => (
          <div key={index} className="flex items-center mx-6">
            <span className="text-[11px] font-mono text-muted-foreground uppercase tracking-wider">
              {term}
            </span>
            <span className="mx-6 text-primary/30 text-[11px]">·</span>
          </div>
        ))}
      </motion.div>
    </div>
  </div>
);

export default FinanceTicker;
