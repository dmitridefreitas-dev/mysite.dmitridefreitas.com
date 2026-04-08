import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { motion } from 'framer-motion';

const SkillCard = ({ skill, onClick }) => {
  return (
    <motion.div
      className="h-full cursor-pointer group"
      onClick={() => onClick(skill)}
    >
      <Card className="h-full flex flex-col items-center justify-center p-4 border-border/50 bg-card hover:border-primary/40 transition-colors duration-200 relative overflow-hidden min-h-[80px]">
        <CardContent className="p-0 flex flex-col items-center justify-center text-center w-full h-full">
          <p className="font-medium text-sm text-foreground group-hover:-translate-y-2 transition-transform duration-300">{skill.name}</p>
          <p className="text-[10px] text-muted-foreground/80 opacity-0 group-hover:opacity-100 transition-all duration-300 absolute bottom-2 translate-y-2 group-hover:translate-y-0">
            Click for details
          </p>
        </CardContent>
      </Card>
    </motion.div>
  );
};

export default SkillCard;