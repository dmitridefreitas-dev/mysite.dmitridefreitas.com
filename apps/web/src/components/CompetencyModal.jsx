import React from 'react';
import { motion } from 'framer-motion';
import { Dialog, DialogContent, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { VisuallyHidden } from '@radix-ui/react-visually-hidden';

const CompetencyModal = ({ isOpen, onClose, competency }) => {
  if (!competency) return null;

  const {
    icon: Icon,
    title,
    description,
    code,
    status = 'ACTIVE',
    tools = [],
    highlights = [],
    projects = [],
    proficiency = 0,
  } = competency;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px] p-0 border-border bg-background overflow-hidden gap-0">
        <VisuallyHidden>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </VisuallyHidden>
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.25, ease: 'easeOut' }}
        >
          {/* Hero header — icon + title centered on a tinted band */}
          <div className="relative px-8 pt-8 pb-6 bg-primary/5 border-b border-border flex flex-col items-center text-center gap-3">
            <div className="w-12 h-12 border border-primary/40 flex items-center justify-center bg-background">
              {Icon && <Icon className="w-6 h-6 text-primary" />}
            </div>
            <div>
              <h2 className="font-mono text-lg font-bold uppercase tracking-wider text-foreground leading-tight">
                {title}
              </h2>
              <p className="text-sm text-muted-foreground mt-2 leading-relaxed max-w-sm">
                {description}
              </p>
            </div>
            {/* Status pill — top right */}
            <div className="absolute top-4 right-4 flex items-center gap-1 text-[9px] font-mono px-2 py-1 border border-primary/40 text-primary bg-primary/10 tracking-widest">
              <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
              {status}
            </div>
          </div>

          {/* Highlights — numbered rows */}
          {highlights.length > 0 && (
            <div className="px-6 py-5 border-b border-border">
              <p className="font-mono text-[9px] uppercase tracking-widest text-muted-foreground mb-3">
                Capabilities
              </p>
              <ol className="space-y-2.5">
                {highlights.map((item, i) => (
                  <li key={i} className="flex items-start gap-3">
                    <span className="font-mono text-[10px] text-primary/60 tabular-nums w-4 shrink-0 pt-0.5">
                      {String(i + 1).padStart(2, '0')}
                    </span>
                    <span className="text-sm text-muted-foreground leading-snug">{item}</span>
                  </li>
                ))}
              </ol>
            </div>
          )}

          {/* Tools — 2-col grid */}
          {tools.length > 0 && (
            <div className="px-6 py-5 border-b border-border">
              <p className="font-mono text-[9px] uppercase tracking-widest text-muted-foreground mb-3">
                Stack
              </p>
              <div className="grid grid-cols-2 gap-1.5">
                {tools.map((t, i) => (
                  <div
                    key={i}
                    className="font-mono text-[11px] text-muted-foreground px-3 py-1.5 bg-muted/30 border border-border/60 hover:border-primary/40 hover:text-foreground transition-colors"
                  >
                    {t}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Projects */}
          {projects.length > 0 && (
            <div className="px-6 py-4 border-b border-border">
              <p className="font-mono text-[9px] uppercase tracking-widest text-muted-foreground mb-2.5">
                Related Projects
              </p>
              <div className="flex flex-wrap gap-2">
                {projects.map((p, i) => (
                  <span
                    key={i}
                    className="font-mono text-[10px] text-primary/80 px-2 py-1 border border-primary/30 bg-primary/5 tracking-wide"
                  >
                    {p}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Footer */}
          <div className="px-6 py-3 flex items-center justify-between bg-muted/20">
            <span className="font-mono text-[9px] text-muted-foreground/50 tracking-widest uppercase">
              {code} · {status}
            </span>
            <div className="flex items-center gap-2">
              <span className="font-mono text-[9px] text-muted-foreground/50 tracking-widest">
                PROFICIENCY
              </span>
              <div className="w-20 h-1 bg-muted/40 border border-border overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${proficiency}%` }}
                  transition={{ duration: 0.6, ease: 'easeOut', delay: 0.2 }}
                  className="h-full bg-primary"
                />
              </div>
              <span className="font-mono text-[9px] text-primary tabular-nums">{proficiency}%</span>
            </div>
          </div>
        </motion.div>
      </DialogContent>
    </Dialog>
  );
};

export default CompetencyModal;
