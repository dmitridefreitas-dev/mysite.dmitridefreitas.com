import React from 'react';
import { motion } from 'framer-motion';

const lines = [
  '> PROCESSING REQUEST...',
  '> ESTABLISHING CONNECTION...',
  '> TRANSMITTING DATA...',
];

const TerminalLoader = ({ success = false, successMessage = 'MESSAGE SENT' }) => (
  <div className="font-mono text-xs space-y-1 text-muted-foreground">
    {lines.map((line, i) => (
      <motion.p
        key={i}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: i * 0.2, duration: 0.1 }}
      >
        {line}
      </motion.p>
    ))}
    {success && (
      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: lines.length * 0.2, duration: 0.1 }}
        className="text-terminal-green"
      >
        [OK] {successMessage}
      </motion.p>
    )}
  </div>
);

export default TerminalLoader;
