import React from 'react';
import { Dialog, DialogContent } from '@/components/ui/dialog';

const Kbd = ({ children }) => (
  <kbd className="font-mono text-[10px] tracking-widest border border-border bg-muted/30 text-foreground px-2 py-0.5 inline-block min-w-[1.75rem] text-center">
    {children}
  </kbd>
);

const Row = ({ keys, label }) => (
  <div className="grid grid-cols-[auto_1fr] gap-4 items-center py-1.5">
    <div className="flex items-center gap-1 flex-wrap justify-end">
      {keys.map((k, i) => (
        <React.Fragment key={i}>
          {i > 0 && <span className="font-mono text-[9px] text-muted-foreground/40">+</span>}
          <Kbd>{k}</Kbd>
        </React.Fragment>
      ))}
    </div>
    <span className="font-mono text-[11px] text-muted-foreground tracking-wide">
      {label}
    </span>
  </div>
);

const NAV_SHORTCUTS = [
  { keys: ['1'], label: 'OVERVIEW  (/)' },
  { keys: ['2'], label: 'PROFILE  (/about)' },
  { keys: ['3'], label: 'RESEARCH  (/projects)' },
  { keys: ['4'], label: 'CONTACT  (/contact)' },
  { keys: ['5'], label: 'NEWS  (/news)' },
  { keys: ['6'], label: 'LAB  (/lab)' },
];

const INTERFACE_SHORTCUTS = [
  { keys: ['D'], label: 'Toggle theme (Dark / Brown)' },
  { keys: ['V'], label: 'Toggle reading mode (QUANT / SIMPLE)' },
  { keys: ['Ctrl', 'K'], label: 'Open command palette' },
  { keys: ['Ctrl', 'B'], label: 'Toggle Brown / Library mode' },
  { keys: ['?'], label: 'Open this help modal' },
  { keys: ['Esc'], label: 'Close modal / palette' },
];

export default function ShortcutModal({ open, onOpenChange }) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl bg-background border border-border font-mono p-0 sm:rounded-none">
        {/* Header */}
        <div className="border-b border-border px-5 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="font-mono text-[10px] tracking-widest text-primary">?</span>
            <span className="font-mono text-[10px] tracking-widest text-foreground">
              KEYBOARD SHORTCUTS
            </span>
          </div>
          <span className="font-mono text-[9px] tracking-widest text-muted-foreground/40">
            DDF·TERMINAL
          </span>
        </div>

        {/* Body */}
        <div className="px-5 pb-5 pt-2 space-y-5">
          <div>
            <p className="font-mono text-[9px] tracking-widest text-muted-foreground/60 mb-2 border-b border-border/40 pb-1">
              NAVIGATION
            </p>
            <div className="divide-y divide-border/20">
              {NAV_SHORTCUTS.map((s, i) => (
                <Row key={i} keys={s.keys} label={s.label} />
              ))}
            </div>
          </div>

          <div>
            <p className="font-mono text-[9px] tracking-widest text-muted-foreground/60 mb-2 border-b border-border/40 pb-1">
              INTERFACE
            </p>
            <div className="divide-y divide-border/20">
              {INTERFACE_SHORTCUTS.map((s, i) => (
                <Row key={i} keys={s.keys} label={s.label} />
              ))}
            </div>
          </div>

          <p className="font-mono text-[8px] tracking-widest text-muted-foreground/30 text-center pt-2 border-t border-border/30">
            SHORTCUTS IGNORED WHILE TYPING IN AN INPUT FIELD
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
