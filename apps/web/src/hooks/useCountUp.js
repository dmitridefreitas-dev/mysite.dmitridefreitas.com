import { useEffect, useState, useRef } from 'react';
import { useInView } from 'framer-motion';

export function useCountUp(endValue, duration = 1.5) {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-20px" });
  const [display, setDisplay] = useState("0");

  useEffect(() => {
    if (!isInView) return;

    const strVal = String(endValue);
    // Match prefix, number (with commas/decimals), and suffix
    const match = strVal.match(/^([^\d]*)([\d.,]+)([^\d]*)$/);

    if (!match) {
      setDisplay(endValue);
      return;
    }

    const prefix = match[1];
    const numStr = match[2];
    const suffix = match[3];
    const isFloat = numStr.includes('.');
    const targetNum = parseFloat(numStr.replace(/,/g, ''));

    if (isNaN(targetNum)) {
      setDisplay(endValue);
      return;
    }

    let startTime;
    const animate = (currentTime) => {
      if (!startTime) startTime = currentTime;
      const progress = Math.min((currentTime - startTime) / (duration * 1000), 1);
      
      // easeOutExpo for smooth deceleration
      const easeProgress = progress === 1 ? 1 : 1 - Math.pow(2, -10 * progress);
      const currentNum = targetNum * easeProgress;

      let formattedNum;
      if (isFloat) {
        const decimals = numStr.split('.')[1].length;
        formattedNum = currentNum.toFixed(decimals);
      } else {
        formattedNum = Math.floor(currentNum).toLocaleString('en-US');
      }

      setDisplay(`${prefix}${formattedNum}${suffix}`);

      if (progress < 1) {
        requestAnimationFrame(animate);
      } else {
        setDisplay(endValue); // Ensure exact final value including original formatting
      }
    };

    requestAnimationFrame(animate);
  }, [endValue, duration, isInView]);

  // Initialize with 0 and correct prefix/suffix if not in view yet
  useEffect(() => {
    if (isInView) return;
    const strVal = String(endValue);
    const match = strVal.match(/^([^\d]*)([\d.,]+)([^\d]*)$/);
    if (match) {
      setDisplay(`${match[1]}0${match[3]}`);
    } else {
      setDisplay(endValue);
    }
  }, [endValue, isInView]);

  return { ref, display };
}