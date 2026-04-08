import React from 'react';
import { motion } from 'framer-motion';

const WavePageTransition = ({ children }) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      transition={{
        duration: 0.3,
        ease: [0.45, 0, 0.55, 1],
      }}
      className="w-full h-full"
    >
      {children}
    </motion.div>
  );
};

export default WavePageTransition;
