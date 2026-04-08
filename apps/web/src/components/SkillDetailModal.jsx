import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { useReadingMode } from '@/contexts/ReadingModeContext.jsx';

const SkillDetailModal = ({ isOpen, onClose, skill }) => {
  const { isTechnicalMode } = useReadingMode();

  if (!skill) return null;

  const description = isTechnicalMode && skill.technicalDescription ? skill.technicalDescription : skill.description;
  const usedFor = isTechnicalMode && skill.technicalUsedFor ? skill.technicalUsedFor : skill.usedFor;
  const keyFeatures = isTechnicalMode && skill.technicalKeyFeatures ? skill.technicalKeyFeatures : skill.keyFeatures;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold text-primary">{skill.name}</DialogTitle>
          <DialogDescription className="text-base mt-2">
            {description}
          </DialogDescription>
        </DialogHeader>
        
        <div className="mt-4 space-y-4">
          {usedFor && usedFor.length > 0 && (
            <div>
              <h4 className="font-semibold text-foreground mb-2">
                {isTechnicalMode ? 'Technical Applications:' : 'Used for:'}
              </h4>
              <ul className="list-disc pl-5 space-y-1 text-muted-foreground">
                {usedFor.map((item, index) => (
                  <li key={index}>{item}</li>
                ))}
              </ul>
            </div>
          )}
          
          {keyFeatures && keyFeatures.length > 0 && (
            <div>
              <h4 className="font-semibold text-foreground mb-2">
                {isTechnicalMode ? 'Core Libraries & Frameworks:' : 'Key features/libraries:'}
              </h4>
              <ul className="list-disc pl-5 space-y-1 text-muted-foreground">
                {keyFeatures.map((item, index) => (
                  <li key={index}>{item}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default SkillDetailModal;