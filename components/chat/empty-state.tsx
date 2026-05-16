'use client';

import { motion } from 'motion/react';
import { Sparkles, FileText, Brain, Microscope, FlaskConical } from 'lucide-react';
import { CrowIcon } from '@/components/ui/crow-icon';

const suggestions = [
  { icon: '📋', text: 'Transcribe estos laboratorios', action: 'Transcribe estos laboratorios' },
  { icon: '🩺', text: 'Analiza estos gases arteriales', action: 'Analiza estos gases arteriales' },
  { icon: '📄', text: 'Redacta una evolución UCI', action: 'Redacta una evolución UCI' },
  { icon: '🧠', text: '¿Qué sabes hacer?', action: '¿Qué sabes hacer?' },
];

interface EmptyStateProps {
  isGuest?: boolean;
  onSuggestionClick: (text: string) => void;
}

export function EmptyState({ isGuest, onSuggestionClick }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] px-4 text-center select-none">
      {/* Background glow */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full opacity-[0.03] dark:opacity-[0.04]"
          style={{
            background: 'radial-gradient(circle, var(--accent-color) 0%, transparent 70%)',
          }}
        />
      </div>

      {/* Crow with sparkles */}
      <motion.div
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
        className="relative mb-6"
      >
        <CrowIcon size="xl" animate />
        <motion.div
          className="absolute -top-1 -right-1"
          initial={{ opacity: 0, scale: 0 }}
          animate={{ opacity: [0, 1, 0.8], scale: [0, 1.2, 1] }}
          transition={{ duration: 0.8, delay: 0.5, repeat: Infinity, repeatDelay: 4 }}
        >
          <Sparkles size={16} className="text-[var(--accent-hover)]" />
        </motion.div>
      </motion.div>

      {/* Title */}
      <motion.h2
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.15 }}
        className="text-2xl sm:text-3xl font-bold mb-2 ren-gradient-text"
      >
        ¿En qué puedo ayudarte?
      </motion.h2>

      {/* Subtitle */}
      <motion.p
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.25 }}
        className="text-sm ren-text-tertiary max-w-sm mx-auto mb-8 leading-relaxed"
      >
        Laboratorios, gases, evoluciones clínicas, dudas médicas o simplemente conversar.
        Suelta el texto aquí o elige una sugerencia.
      </motion.p>

      {/* Suggestion pills */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.35 }}
        className="flex flex-wrap gap-2 justify-center max-w-sm"
      >
        {suggestions.map((s, i) => (
          <motion.button
            key={s.text}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.3, delay: 0.4 + i * 0.08 }}
            whileHover={{ scale: 1.05, y: -2 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => onSuggestionClick(s.action)}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-full text-sm font-mono
              bg-[var(--ren-bg-tertiary)] border border-[var(--ren-border)]
              text-[var(--ren-text-secondary)] hover:text-[var(--ren-text-primary)]
              hover:border-[var(--accent-color)]/40 hover:bg-[var(--accent-muted)]
              transition-all duration-200 shadow-sm"
          >
            <span>{s.icon}</span>
            {s.text}
          </motion.button>
        ))}
      </motion.div>

      {/* Feature pills */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.4, delay: 0.6 }}
        className="flex flex-wrap gap-2 justify-center mt-8"
      >
        {[
          { icon: <FileText size={12} />, label: 'Documentación UCI', color: 'var(--accent-hover)' },
          { icon: <Microscope size={12} />, label: 'Laboratorios', color: '#34d399' },
          { icon: <FlaskConical size={12} />, label: 'Gases arteriales', color: '#f472b6' },
          { icon: <Brain size={12} />, label: 'Cronología clínica', color: '#a78bfa' },
        ].map((feat, i) => (
          <motion.div
            key={feat.label}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.65 + i * 0.05 }}
            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-mono"
            style={{
              backgroundColor: `${feat.color}0d`,
              border: `1px solid ${feat.color}20`,
              color: feat.color,
            }}
          >
            {feat.icon}
            {feat.label}
          </motion.div>
        ))}
      </motion.div>

      {/* Guest hint */}
      {isGuest && (
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.4, delay: 0.8 }}
          className="text-[11px] ren-text-tertiary font-mono mt-10 px-4 py-2 rounded-lg border border-dashed border-[var(--ren-border)]"
        >
          💡 10 mensajes como invitado — crea una cuenta para guardar tu historial
        </motion.p>
      )}
    </div>
  );
}
