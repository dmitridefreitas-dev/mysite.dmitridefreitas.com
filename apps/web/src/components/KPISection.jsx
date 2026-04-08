import React from 'react';
import { Card } from '@/components/ui/card';
import { motion } from 'framer-motion';
import { useCountUp } from '@/hooks/useCountUp.js';

const AnimatedMetric = ({ value, className }) => {
  const { ref, display } = useCountUp(value, 1.5);
  return (
    <span ref={ref} className={className}>
      {display}
    </span>
  );
};

const KPISection = () => {
  const metrics = [
    { label: 'Statistical/ML Approaches', value: '8+' },
    { label: 'Data Points Processed', value: '70,000+' },
    { label: 'Average Explanatory Power', value: '95%' },
    { label: 'Financial Domains', value: '4' },
  ];

  return (
    <section className="py-16 bg-muted/30">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
        >
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 max-w-5xl mx-auto">
            {metrics.map((metric, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, scale: 0.9 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1, duration: 0.4 }}
              >
                <Card className="text-center p-6 hover:shadow-lg transition-shadow h-full flex flex-col justify-center">
                  <AnimatedMetric 
                    value={metric.value} 
                    className="text-3xl md:text-4xl font-bold text-primary mb-2 block"
                  />
                  <p className="text-sm text-muted-foreground">{metric.label}</p>
                </Card>
              </motion.div>
            ))}
          </div>
        </motion.div>
      </div>
    </section>
  );
};

export default KPISection;