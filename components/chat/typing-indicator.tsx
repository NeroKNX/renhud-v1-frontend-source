'use client';

import { motion } from 'motion/react';
import { CrowIcon } from '@/components/ui/crow-icon';

export function TypingIndicator() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 4 }}
      transition={{ duration: 0.25 }}
      className="flex gap-2.5 items-start mb-2.5"
    >
      <CrowIcon size="md" animate />

      <div className="px-4 py-3 rounded-2xl rounded-bl-sm" style={{ backgroundColor: 'var(--ren-bg-secondary)', border: '1px solid var(--ren-border)' }}>
        <div className="flex items-center gap-2.5">
          {/* Dots with staggered bounce */}
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className="w-2 h-2 rounded-full"
              style={{
                backgroundColor: 'var(--accent-color)',
                animation: 'renTypingBounce 1.4s ease-in-out infinite',
                animationDelay: `${i * 0.2}s`,
                opacity: 0.6,
              }}
            />
          ))}
          <span className="text-[11px] font-mono" style={{ color: 'var(--ren-text-tertiary)', opacity: 0.7 }}>
            Pensando
          </span>
        </div>
      </div>

      <style>{`
        @keyframes renTypingBounce {
          0%, 60%, 100% {
            transform: translateY(0) scale(1);
            opacity: 0.4;
          }
          30% {
            transform: translateY(-6px) scale(1.15);
            opacity: 1;
          }
        }
      `}</style>
    </motion.div>
  );
}
