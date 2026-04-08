import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { motion } from 'framer-motion';
import { useReadingMode } from '@/contexts/ReadingModeContext.jsx';

const ExperienceCard = ({ experience, onClick }) => {
  const { isTechnicalMode } = useReadingMode();
  
  const displayDescription = isTechnicalMode 
    ? experience.technicalShortDescription 
    : experience.shortDescription;

  return (
    <motion.div
      className="h-full cursor-pointer group"
      onClick={() => onClick(experience)}
    >
      <Card className="h-full border-border/50 hover:border-primary/40 transition-colors duration-200 flex flex-col relative overflow-hidden">
        <CardHeader className="p-5 pb-2 flex-grow">
          <div className="flex flex-col h-full">
            <div className="h-12 flex items-center mb-0.5">
              <CardTitle className="text-lg font-bold leading-tight group-hover:text-primary transition-colors text-foreground line-clamp-2">
                {experience.title}
              </CardTitle>
            </div>
            <div className="h-8 flex items-center mb-0.5">
              <p className="font-medium text-foreground line-clamp-2">{experience.role}</p>
            </div>
            <div className="h-8 flex items-center mb-2">
              <p className="text-sm text-muted-foreground line-clamp-2">
                {experience.organization}
              </p>
            </div>
            
            {displayDescription && (
              <div className="mt-2 mb-4 flex-grow">
                <p className="text-sm text-muted-foreground/90 line-clamp-3">
                  {displayDescription}
                </p>
              </div>
            )}

            <Badge variant="secondary" className="w-fit mt-auto text-muted-foreground bg-muted">
              {experience.date}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="p-5 pt-0">
          <p className="text-xs text-muted-foreground/60 group-hover:text-primary/80 transition-colors flex items-center gap-1">
            Click for details
            <motion.span
              initial={{ x: 0 }}
              whileHover={{ x: 4 }}
              className="inline-block"
            >→</motion.span>
          </p>
        </CardContent>
      </Card>
    </motion.div>
  );
};

export default ExperienceCard;