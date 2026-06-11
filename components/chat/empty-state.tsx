'use client';

import { motion } from 'motion/react';

const suggestions = [
  { idx: '01', text: '¿Qué puedes hacer?', action: '¿Qué puedes hacer?' },
  { idx: '02', text: 'Enséñame un Trick nuevo', action: 'Enséñame un Trick nuevo' },
  { idx: '03', text: 'Estructura un problema', action: 'Ayúdame a estructurar un problema complejo' },
];

interface EmptyStateProps {
  isGuest?: boolean;
  onSuggestionClick: (text: string) => void;
}

export function EmptyState({ isGuest, onSuggestionClick }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[50vh] px-4 text-center select-none">
      {/* Kicker técnico */}
      <motion.p
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="ren-spec-label mb-5"
      >
        [ MOTOR DE RAZONAMIENTO ]
      </motion.p>

      {/* Titular dramático */}
      <motion.h2
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45, delay: 0.06 }}
        className="ren-display text-[clamp(30px,5vw,52px)] text-[var(--ren-text-primary)] mb-6"
      >
        Estructura para<br /><span className="thin">cualquier dominio.</span>
      </motion.h2>

      {/* Core pitch — multidominio */}
      <motion.p
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.16 }}
        className="text-sm sm:text-base ren-text-secondary leading-relaxed max-w-md mb-3"
      >
        No soy un asistente genérico. Razono sobre código, investigación, datos y decisiones clínicas — aprendo Tricks a tu medida y afino mi criterio con cada interacción.
      </motion.p>

      {/* Perfil line */}
      <motion.p
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.22 }}
        className="font-mono text-xs font-semibold mb-8 tracking-wide"
        style={{ color: 'var(--accent-hover)' }}
      >
        Cada mensaje construye tu perfil.
      </motion.p>

      {/* Divisor con marca */}
      <motion.div
        initial={{ opacity: 0, scaleX: 0 }}
        animate={{ opacity: 1, scaleX: 1 }}
        transition={{ duration: 0.4, delay: 0.28 }}
        className="ren-rule w-40 mb-8"
      />

      {/* Sugerencias afiladas */}
      <motion.div
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.35 }}
        className="flex flex-wrap gap-2 justify-center max-w-md"
      >
        {suggestions.map((s) => (
          <button
            key={s.text}
            onClick={() => onSuggestionClick(s.action)}
            className="ren-spec-chip"
          >
            <span className="idx">{s.idx}</span>
            {s.text}
          </button>
        ))}
      </motion.div>

      {/* Guest hint */}
      {isGuest && (
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.4, delay: 0.45 }}
          className="text-[11px] ren-text-tertiary font-mono mt-10 tracking-wide"
        >
          25 MENSAJES · SIN HUELLA
        </motion.p>
      )}
    </div>
  );
}
