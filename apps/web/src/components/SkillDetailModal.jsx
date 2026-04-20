import React from 'react';
import { motion } from 'framer-motion';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { useReadingMode } from '@/contexts/ReadingModeContext.jsx';
import { Activity, TrendingUp, Zap, Target } from 'lucide-react';

// Category accent map — subtle tint per category, all in terminal-green family
const CATEGORY_STYLES = {
  LANGUAGES: { label: 'LANG', tint: 'text-primary' },
  QUANT: { label: 'QUANT', tint: 'text-primary' },
  VIZ: { label: 'VIZ', tint: 'text-primary' },
};

const CONTEXT_STYLES = {
  'PROD USE': 'text-primary border-primary/40',
  RESEARCH: 'text-foreground border-border',
  ACADEMIC: 'text-muted-foreground border-border',
  REPORTING: 'text-foreground border-border',
};

// A single labeled metric cell — terminal style, label on top, value below
const StatCell = ({ label, value, suffix = '', icon: Icon, align = 'left' }) => (
  <div className={`flex flex-col ${align === 'right' ? 'items-end' : 'items-start'} gap-0.5`}>
    <div className="flex items-center gap-1 text-[10px] uppercase tracking-widest text-muted-foreground font-mono">
      {Icon && <Icon className="w-2.5 h-2.5" />}
      <span>{label}</span>
    </div>
    <div className="font-mono text-base text-foreground tabular-nums">
      {value}
      {suffix && <span className="text-muted-foreground text-xs ml-0.5">{suffix}</span>}
    </div>
  </div>
);

// Horizontal progress bar — terminal fill style
const ProgressBar = ({ value, max = 100 }) => {
  const pct = Math.min(100, Math.max(0, (value / max) * 100));
  return (
    <div className="relative w-full h-1.5 bg-muted/40 border border-border overflow-hidden">
      <motion.div
        initial={{ width: 0 }}
        animate={{ width: `${pct}%` }}
        transition={{ duration: 0.6, ease: 'easeOut', delay: 0.15 }}
        className="h-full bg-primary"
      />
    </div>
  );
};

// A tagged chip — monospace, bordered
const Chip = ({ children }) => (
  <span className="inline-flex items-center px-2 py-0.5 text-[11px] font-mono border border-border text-muted-foreground hover:text-foreground hover:border-primary/60 transition-colors">
    {children}
  </span>
);

const SkillDetailModal = ({ isOpen, onClose, skill }) => {
  const { isTechnicalMode } = useReadingMode();

  if (!skill) return null;

  const description =
    isTechnicalMode && skill.technicalDescription ? skill.technicalDescription : skill.description;
  const usedFor = isTechnicalMode && skill.technicalUsedFor ? skill.technicalUsedFor : skill.usedFor;
  const keyFeatures =
    isTechnicalMode && skill.technicalKeyFeatures ? skill.technicalKeyFeatures : skill.keyFeatures;

  const catStyle = CATEGORY_STYLES[skill.category] || CATEGORY_STYLES.LANGUAGES;
  const ctxStyle = CONTEXT_STYLES[skill.context] || CONTEXT_STYLES.RESEARCH;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[510px] p-0 border-border bg-background font-mono gap-0 overflow-hidden">
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.25, ease: 'easeOut' }}
        >
          {/* Top strip — ticker-style header bar */}
          <div className="flex items-center justify-between px-5 py-2 border-b border-border bg-muted/30">
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-mono text-muted-foreground tracking-widest">
                SKL / {skill.typeCode}
              </span>
              <span className={`text-[10px] font-mono px-1.5 py-0.5 border border-border ${catStyle.tint}`}>
                {catStyle.label}
              </span>
            </div>
            <div className="flex items-center gap-2">
              {skill.itm && (
                <span className="inline-flex items-center gap-1 text-[10px] font-mono px-1.5 py-0.5 border border-primary/60 text-primary bg-primary/10">
                  <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
                  ITM / LIVE
                </span>
              )}
              <span className={`text-[10px] font-mono px-1.5 py-0.5 border ${ctxStyle}`}>
                {skill.context}
              </span>
            </div>
          </div>

          {/* Name + type code */}
          <DialogHeader className="px-5 pt-5 pb-3 space-y-1">
            <div className="flex items-baseline justify-between gap-3">
              <DialogTitle className="text-2xl font-bold text-primary font-mono tracking-tight">
                {skill.name}
              </DialogTitle>
              <span className="text-sm font-mono text-muted-foreground tabular-nums">
                #{skill.typeCode}
              </span>
            </div>
            <DialogDescription className="text-sm text-muted-foreground leading-relaxed pt-1">
              {description}
            </DialogDescription>
          </DialogHeader>

          {/* Proficiency bar — flagship metric */}
          <div className="px-5 pb-4">
            <div className="flex items-end justify-between mb-1.5">
              <span className="text-[10px] uppercase tracking-widest text-muted-foreground">
                Proficiency
              </span>
              <span className="text-xs font-mono text-primary tabular-nums">
                {skill.proficiency}
                <span className="text-muted-foreground">/100</span>
              </span>
            </div>
            <ProgressBar value={skill.proficiency} />
          </div>

          {/* Stat grid — the greeks row */}
          <div className="grid grid-cols-4 border-y border-border bg-muted/20">
            <div className="px-4 py-3 border-r border-border">
              <StatCell
                label="YRS"
                value={skill.yearsExp.toFixed(1)}
                icon={TrendingUp}
              />
            </div>
            <div className="px-4 py-3 border-r border-border">
              <StatCell
                label="DELTA"
                value={skill.delta.toFixed(2)}
                icon={Activity}
              />
            </div>
            <div className="px-4 py-3 border-r border-border">
              <StatCell
                label="IV"
                value={(skill.iv * 100).toFixed(0)}
                suffix="%"
                icon={Zap}
              />
            </div>
            <div className="px-4 py-3">
              <StatCell
                label="PROF"
                value={skill.proficiency}
                icon={Target}
              />
            </div>
          </div>

          {/* Applications */}
          {usedFor && usedFor.length > 0 && (
            <div className="px-5 pt-4">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-[10px] uppercase tracking-widest text-primary">
                  {isTechnicalMode ? 'Technical Applications' : 'Applications'}
                </span>
                <div className="flex-1 h-px bg-border" />
                <span className="text-[10px] font-mono text-muted-foreground tabular-nums">
                  [{usedFor.length}]
                </span>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {usedFor.map((item, index) => (
                  <Chip key={index}>{item}</Chip>
                ))}
              </div>
            </div>
          )}

          {/* Key features / libraries */}
          {keyFeatures && keyFeatures.length > 0 && (
            <div className="px-5 pt-4 pb-5">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-[10px] uppercase tracking-widest text-primary">
                  {isTechnicalMode ? 'Core Libraries & Frameworks' : 'Key Features'}
                </span>
                <div className="flex-1 h-px bg-border" />
                <span className="text-[10px] font-mono text-muted-foreground tabular-nums">
                  [{keyFeatures.length}]
                </span>
              </div>
              <ul className="space-y-1">
                {keyFeatures.map((item, index) => (
                  <li
                    key={index}
                    className="flex items-start gap-2 text-xs text-muted-foreground hover:text-foreground transition-colors"
                  >
                    <span className="text-primary mt-0.5 select-none">›</span>
                    <span className="flex-1 leading-relaxed">{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Footer strip — timestamp / quote-line feel */}
          <div className="flex items-center justify-between px-5 py-2 border-t border-border bg-muted/30">
            <span className="text-[9px] font-mono text-muted-foreground tracking-widest">
              {skill.itm ? 'ACTIVE DEPLOYMENT' : 'MONITORED'}
            </span>
            <span className="text-[9px] font-mono text-muted-foreground tracking-widest tabular-nums">
              Δ {skill.delta.toFixed(2)} · σ {(skill.iv * 100).toFixed(0)}%
            </span>
          </div>
        </motion.div>
      </DialogContent>
    </Dialog>
  );
};

export default SkillDetailModal;
