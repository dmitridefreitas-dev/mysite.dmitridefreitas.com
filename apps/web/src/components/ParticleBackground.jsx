import React, { useEffect, useState } from 'react';
import { motion, useScroll, useTransform } from 'framer-motion';

const ParticleBackground = () => {
  const [particles, setParticles] = useState([]);
  const { scrollY } = useScroll();
  const yOffset = useTransform(scrollY, [0, 1000], [0, -50]);

  useEffect(() => {
    // Only render on desktop to save performance
    if (window.innerWidth < 768) return;

    const newParticles = Array.from({ length: 15 }).map((_, i) => ({
      id: i,
      x: Math.random() * 100,
      y: Math.random() * 100,
      size: Math.random() * 2 + 1,
      duration: Math.random() * 20 + 20,
      delay: Math.random() * 5,
    }));
    setParticles(newParticles);
  }, []);

  if (particles.length === 0) return null;

  return (
    <motion.div 
      className="fixed inset-0 pointer-events-none z-[-1] overflow-hidden opacity-[0.06]"
      style={{ y: yOffset }}
    >
      {particles.map((p) => (
        <motion.div
          key={p.id}
          className="absolute bg-primary rounded-full"
          style={{
            left: `${p.x}%`,
            top: `${p.y}%`,
            width: p.size,
            height: p.size,
          }}
          animate={{
            x: [0, Math.random() * 100 - 50, 0],
            y: [0, Math.random() * 100 - 50, 0],
            opacity: [0.2, 0.8, 0.2],
          }}
          transition={{
            duration: p.duration,
            repeat: Infinity,
            ease: "linear",
            delay: p.delay,
          }}
        />
      ))}
    </motion.div>
  );
};

export default ParticleBackground;