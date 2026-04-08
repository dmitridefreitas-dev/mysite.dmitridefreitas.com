import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useReadingMode } from '@/contexts/ReadingModeContext.jsx';

const DotRow = ({ label, value }) => {
  const dots = Math.max(0, 42 - label.length - String(value).length);
  return (
    <div className="font-mono text-xs flex gap-1">
      <span className="text-muted-foreground">{label}</span>
      <span className="text-muted-foreground/30 flex-1 overflow-hidden">
        {'·'.repeat(Math.max(4, dots))}
      </span>
      <span className="text-foreground shrink-0">{value}</span>
    </div>
  );
};

const SectionLabel = ({ number, title }) => (
  <div className="mb-2">
    <span className="font-mono text-[10px] text-muted-foreground tracking-widest">
      {number}. {title}
    </span>
    <div className="h-px bg-border mt-1" />
  </div>
);

const ProjectDetailModal = ({ project, isOpen, onClose }) => {
  const { isTechnicalMode } = useReadingMode();

  if (!project) return null;

  const description = isTechnicalMode && project.technicalDescription
    ? project.technicalDescription
    : (project.simpleDescription || project.technicalDescription);

  const reportId = project.reportId ?? `PRJ-${String(project.id).padStart(3, '0')}`;
  const hasReport = project.reportLink && project.reportLink !== '#';
  const hasCode = project.codeLink && project.codeLink !== '#';

  return (
    <Dialog open={isOpen} onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto bg-card border-border">
        <DialogHeader className="pb-4 border-b border-border">
          <div className="flex items-start justify-between gap-4">
            <div>
              <span className="font-mono text-[10px] text-primary tracking-widest block mb-1">
                REPORT: {reportId}
              </span>
              <DialogTitle className="font-mono text-base font-bold leading-tight text-foreground">
                {project.title}
              </DialogTitle>
            </div>
            <span className="font-mono text-[10px] border border-border text-muted-foreground px-2 py-0.5 shrink-0">
              {project.category}
            </span>
          </div>
        </DialogHeader>

        <div className="space-y-5 py-2">

          {/* 01. ABSTRACT */}
          <div>
            <SectionLabel number="01" title="ABSTRACT" />
            <p className="text-sm text-muted-foreground leading-relaxed pl-3">
              {description}
            </p>
          </div>

          {/* 02. METHODOLOGY */}
          <div>
            <SectionLabel number="02" title="METHODOLOGY" />
            <div className="pl-3 space-y-1">
              <div className="font-mono text-[10px] text-muted-foreground uppercase tracking-widest mb-1">
                STACK
              </div>
              <div className="flex flex-wrap gap-1.5">
                {project.techStack.map((t, i) => (
                  <span key={i} className="font-mono text-[10px] border border-border px-2 py-0.5 text-foreground/80">
                    {t}
                  </span>
                ))}
              </div>
            </div>
          </div>

          {/* 03. DATA SOURCES */}
          {project.dataSources && project.dataSources.length > 0 && (
            <div>
              <SectionLabel number="03" title="DATA SOURCES" />
              <ul className="pl-3 space-y-1">
                {project.dataSources.map((src, i) => (
                  <li key={i} className="font-mono text-[11px] text-muted-foreground">
                    · {src}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* 04. KEY RESULTS */}
          {project.metrics && project.metrics.length > 0 && (
            <div>
              <SectionLabel number="04" title="KEY RESULTS" />
              <div className="pl-3 space-y-1">
                {project.metrics.map((m, i) => (
                  <p key={i} className="font-mono text-[11px] text-muted-foreground">· {m}</p>
                ))}
              </div>
            </div>
          )}

          {/* 05. ARTIFACTS */}
          {(hasReport || hasCode) && (
            <div>
              <SectionLabel number="05" title="ARTIFACTS" />
              <div className="pl-3 flex gap-4 flex-wrap">
                {hasReport && (
                  <a
                    href={project.reportLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-mono text-[11px] text-primary hover:text-primary/80 transition-colors tracking-widest"
                  >
                    [VIEW REPORT PDF →]
                  </a>
                )}
                {hasCode && (
                  <a
                    href={project.codeLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-mono text-[11px] text-primary hover:text-primary/80 transition-colors tracking-widest"
                  >
                    [VIEW SOURCE CODE →]
                  </a>
                )}
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ProjectDetailModal;
