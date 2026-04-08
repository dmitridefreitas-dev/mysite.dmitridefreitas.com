import React from 'react';
import { motion } from 'framer-motion';
import { useReadingMode } from '@/contexts/ReadingModeContext.jsx';

const ProjectCard = ({ project, onViewProject }) => {
  const { isTechnicalMode } = useReadingMode();

  const abstract = isTechnicalMode && project.technicalShortDescription
    ? project.technicalShortDescription
    : project.shortDescription;

  // Take first 2 metrics for the preview
  const previewMetrics = project.metrics ? project.metrics.slice(0, 2) : [];

  return (
    <motion.div
      className="h-full cursor-pointer group"
      onClick={() => onViewProject(project)}
    >
      <div className="h-full flex flex-col border border-border hover:border-primary/50 hover:bg-muted/30 transition-colors duration-150 p-4">

        {/* Header row: ID + category */}
        <div className="flex items-center justify-between mb-3">
          <span className="font-mono text-[10px] text-primary tracking-widest">
            {project.reportId ?? `PRJ-${String(project.id).padStart(3, '0')}`}
          </span>
          <span className="font-mono text-[10px] text-muted-foreground uppercase tracking-widest border border-border px-1.5 py-0.5">
            {project.category}
          </span>
        </div>

        {/* Title */}
        <h3 className="font-mono text-sm font-bold leading-tight group-hover:text-primary transition-colors mb-3 line-clamp-3">
          {project.title}
        </h3>

        {/* Abstract label + text */}
        <div className="mb-3 flex-1">
          <span className="font-mono text-[9px] text-muted-foreground uppercase tracking-widest block mb-1">
            ABSTRACT
          </span>
          <p className="text-xs text-muted-foreground line-clamp-3 leading-relaxed">
            {abstract}
          </p>
        </div>

        {/* Stack */}
        <div className="mb-3">
          <span className="font-mono text-[9px] text-muted-foreground uppercase tracking-widest mr-2">
            STACK
          </span>
          <span className="font-mono text-[10px] text-foreground/70">
            {project.techStack.slice(0, 3).join(' / ')}
            {project.techStack.length > 3 && ` +${project.techStack.length - 3}`}
          </span>
        </div>

        {/* Key metrics */}
        {previewMetrics.length > 0 && (
          <div className="border-t border-border pt-2 mt-auto">
            <span className="font-mono text-[9px] text-muted-foreground uppercase tracking-widest block mb-1">
              KEY METRICS
            </span>
            {previewMetrics.map((m, i) => (
              <p key={i} className="font-mono text-[10px] text-muted-foreground line-clamp-1">· {m}</p>
            ))}
          </div>
        )}

        {/* Footer link */}
        <div className="mt-3 pt-2 border-t border-border">
          <span className="font-mono text-[10px] text-muted-foreground group-hover:text-primary transition-colors tracking-widest">
            [VIEW FULL REPORT →]
          </span>
        </div>
      </div>
    </motion.div>
  );
};

export default ProjectCard;
