import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

const ExperienceFlipCard = ({ title, role, date, organization, description }) => {
  const [isFlipped, setIsFlipped] = useState(false);

  return (
    <motion.div 
      className="relative w-full h-72 cursor-pointer group"
      style={{ perspective: '1000px' }}
      onClick={() => setIsFlipped(!isFlipped)}
      whileHover={{ y: -5, boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)" }}
      transition={{ duration: 0.15, ease: "easeOut" }}
    >
      <motion.div
        className="w-full h-full relative duration-500"
        initial={false}
        animate={{ rotateY: isFlipped ? 180 : 0 }}
        transition={{ duration: 0.6, type: 'spring', stiffness: 260, damping: 20 }}
        style={{ transformStyle: 'preserve-3d' }}
      >
        {/* Front of card */}
        <Card 
          className="absolute w-full h-full border-border/50 hover:border-primary/50 transition-colors shadow-sm hover:shadow-md flex flex-col justify-center items-center text-center p-6 bg-card"
          style={{ backfaceVisibility: 'hidden', WebkitBackfaceVisibility: 'hidden' }}
        >
          <CardContent className="p-0 flex flex-col items-center justify-center h-full w-full">
            <div className="h-8 flex items-center mb-2">
              <Badge variant="outline">{date}</Badge>
            </div>
            <div className="h-16 flex items-center justify-center w-full px-2">
              <h3 className="text-xl font-bold text-foreground leading-tight line-clamp-2">{title}</h3>
            </div>
            <div className="h-8 flex items-center justify-center w-full">
              <p className="text-primary font-medium line-clamp-2">{role}</p>
            </div>
            <div className="h-8 flex items-center justify-center w-full">
              <p className="text-sm text-muted-foreground line-clamp-2">{organization}</p>
            </div>
            <div className="h-6 mt-4 flex items-center justify-center">
              <p className="text-xs text-muted-foreground/60 opacity-0 group-hover:opacity-100 transition-opacity">
                Click to flip
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Back of card */}
        <Card 
          className="absolute w-full h-full border-primary/20 shadow-md flex flex-col justify-center p-6 bg-primary/5 overflow-y-auto"
          style={{ 
            transform: 'rotateY(180deg)', 
            backfaceVisibility: 'hidden',
            WebkitBackfaceVisibility: 'hidden'
          }}
        >
          <CardContent className="p-0 h-full flex flex-col justify-center">
            <h4 className="font-semibold text-primary mb-2 text-sm uppercase tracking-wider">Details</h4>
            <p className="text-sm text-foreground/90 leading-relaxed">
              {description}
            </p>
          </CardContent>
        </Card>
      </motion.div>
    </motion.div>
  );
};

export default ExperienceFlipCard;