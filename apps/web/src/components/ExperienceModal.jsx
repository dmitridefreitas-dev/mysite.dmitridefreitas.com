import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useReadingMode } from '@/contexts/ReadingModeContext.jsx';

const ExperienceModal = ({ isOpen, onClose, experience }) => {
  const { isTechnicalMode } = useReadingMode();

  if (!experience) return null;

  const rawDetails = isTechnicalMode && experience.technicalDescription
    ? experience.technicalDescription
    : experience.description;

  const details = Array.isArray(rawDetails) ? rawDetails : [rawDetails];

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-xl max-h-[85vh] overflow-y-auto bg-card border-border">
        <DialogHeader className="pb-4 border-b border-border">
          <div className="flex items-start justify-between gap-4">
            <div>
              <span className="font-mono text-[10px] text-primary tracking-widest block mb-1">
                [{experience.type ?? 'EXP'}] · {experience.date}
              </span>
              <DialogTitle className="font-mono text-sm font-bold leading-tight text-foreground">
                {experience.title}
              </DialogTitle>
              <p className="font-mono text-[10px] text-muted-foreground mt-1">
                {experience.role} · {experience.organization}
              </p>
            </div>
          </div>
        </DialogHeader>

        <div className="py-3 space-y-4">
          <div>
            <p className="font-mono text-[10px] text-muted-foreground uppercase tracking-widest mb-2">
              {isTechnicalMode ? 'TECHNICAL IMPLEMENTATIONS' : 'KEY RESPONSIBILITIES'}
            </p>
            <div className="h-px bg-border mb-3" />
            <ul className="space-y-2 pl-1">
              {details.map((detail, index) => (
                <li key={index} className="font-mono text-[11px] text-muted-foreground flex gap-2">
                  <span className="text-primary shrink-0">·</span>
                  <span>{detail}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ExperienceModal;
