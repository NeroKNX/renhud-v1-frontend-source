'use client';

import { motion } from 'motion/react';

const suggestions = [
  { icon: '🗣️', text: '¿Qué puedes hacer?', action: '¿Qué puedes hacer?' },
  { icon: '🛠️', text: 'Enséname un Trick nuevo', action: 'Enséname un Trick nuevo' },
];

interface EmptyStateProps {
  isGuest?: boolean;
  onSuggestionClick: (text: string) => void;
}

export function EmptyState({ isGuest, onSuggestionClick }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[50vh] px-4 text-center select-none">
      {/* Sigil */}
      <motion.div
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
      >
        <span className="text-5xl sm:text-6xl block mb-5" style={{ filter: 'drop-shadow(0 0 12px var(--accent-color))' }}>
          🜁
        </span>
      </motion.div>

      {/* Tagline */}
      <motion.p
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.1 }}
        className="text-xs sm:text-sm font-mono mb-5"
        style={{ color: 'var(--accent-color)', letterSpacing: '0.02em' }}
      >
        REN
      </motion.p>

      {/* Core pitch */}
      <motion.p
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.16 }}
        className="text-sm sm:text-base font-mono ren-text-secondary leading-relaxed max-w-md mb-6"
      >
        No soy un asistente genérico. Aprendo Tricks a tu medida, investigo en vivo y afino mi criterio con cada interacción.
      </motion.p>

      {/* Perfil line */}
      <motion.p
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.22 }}
        className="text-xs sm:text-sm font-mono font-semibold mb-8"
        style={{ color: 'var(--accent-hover)' }}
      >
        Cada mensaje construye tu perfil.
      </motion.p>

      {/* CTA */}
      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.4, delay: 0.28 }}
        className="text-sm font-mono ren-text-secondary mb-8"
      >
        💬 <em>Pregúntame lo que sea.</em>
      </motion.p>

      {/* 2 suggestion pills */}
      <motion.div
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.35 }}
        className="flex flex-wrap gap-2 justify-center max-w-xs"
      >
        {suggestions.map((s, i) => (
          <motion.button
            key={s.text}
            whileHover={{ scale: 1.05, y: -1 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => onSuggestionClick(s.action)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs sm:text-sm font-mono
              bg-[var(--ren-bg-tertiary)] border border-[var(--ren-border)]
              text-[var(--ren-text-secondary)] hover:text-[var(--ren-text-primary)]
              hover:border-[var(--accent-color)]/40
              transition-all duration-200"
          >
            <span>{s.icon}</span>
            {s.text}
          </motion.button>
        ))}
      </motion.div>

      {/* Guest hint */}
      {isGuest && (
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.4, delay: 0.45 }}
          className="text-[11px] ren-text-tertiary font-mono mt-10"
        >
          25 mensajes — sin huella
        </motion.p>
      )}
    </div>
  );
}
