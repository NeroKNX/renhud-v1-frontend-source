'use client';

import { motion } from 'motion/react';
import { CrowIcon } from '@/components/ui/crow-icon';

interface WelcomeLandingProps {
  onNewChat: () => void;
  onOpenTricks: () => void;
  onOpenHistory: () => void;
  onNavigate: (path: string) => void;
  sessionCount?: number;
  trickCount?: number;
  messageCount?: number;
  userName?: string;
}

export function WelcomeLanding({
  onNewChat,
  onOpenTricks,
  onOpenHistory,
  onNavigate,
  sessionCount,
  trickCount,
  messageCount,
  userName,
}: WelcomeLandingProps) {
  const hasStats =
    (sessionCount ?? 0) > 0 ||
    (trickCount ?? 0) > 0 ||
    (messageCount ?? 0) > 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: [0.25, 0.1, 0.25, 1] }}
      className="flex flex-col items-center justify-center min-h-[60vh] px-4 py-12 text-center select-none"
      style={{
        background: 'radial-gradient(ellipse at 50% 28%, rgba(99,102,241,0.08) 0%, transparent 60%)',
      }}
    >
      {/* Sigil + animated glow */}
      <div className="relative mb-8">
        <motion.div
          animate={{ opacity: [0.25, 0.55, 0.25] }}
          transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
          className="absolute inset-0 rounded-full"
          style={{
            background: 'radial-gradient(circle, var(--accent-color) 0%, transparent 70%)',
            filter: 'blur(24px)',
            transform: 'scale(1.6)',
          }}
        />
        <CrowIcon size="xl" animate />
      </div>

      {/* Tagline */}
      <motion.p
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.1 }}
        className="text-sm font-mono tracking-wide mb-2"
        style={{ color: 'var(--ren-text-secondary)' }}
      >
        {userName
          ? `Bienvenido de vuelta, ${userName}`
          : 'Donde el código encuentra su sombra'}
      </motion.p>

      {/* Heading */}
      <motion.h2
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.16 }}
        className="text-xl font-mono font-semibold mb-8"
        style={{ color: 'var(--ren-text-primary)' }}
      >
        ¿Por dónde empezamos?
      </motion.h2>

      {/* Chips */}
      <motion.div
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.22 }}
        className="flex flex-wrap justify-center gap-3 max-w-md mb-10"
      >
        {/* Nueva conversación — primary destacado */}
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={onNewChat}
          className="px-5 py-2.5 rounded-full font-mono text-sm font-medium border transition-all cursor-pointer"
          style={{
            background: 'linear-gradient(135deg, var(--accent-color) 0%, var(--accent-hover) 100%)',
            borderColor: 'transparent',
            color: '#ffffff',
            boxShadow: '0 4px 20px rgba(99,102,241,0.3)',
          }}
        >
          ✦ Nueva conversación
        </motion.button>

        {/* Enséñame un Trick */}
        <motion.button
          whileHover={{ scale: 1.05, y: -1 }}
          whileTap={{ scale: 0.95 }}
          onClick={onOpenTricks}
          className="px-5 py-2.5 rounded-full font-mono text-sm border transition-all cursor-pointer"
          style={{
            background: 'var(--ren-bg-tertiary)',
            borderColor: 'var(--ren-border)',
            color: 'var(--ren-text-primary)',
          }}
        >
          ⚡ Enséñame un Trick
        </motion.button>

        {/* Calculadoras */}
        <motion.button
          whileHover={{ scale: 1.05, y: -1 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => onNavigate('/calculators')}
          className="px-5 py-2.5 rounded-full font-mono text-sm border transition-all cursor-pointer"
          style={{
            background: 'var(--ren-bg-tertiary)',
            borderColor: 'var(--ren-border)',
            color: 'var(--ren-text-primary)',
          }}
        >
          📊 Calculadoras
        </motion.button>

        {/* Historial */}
        <motion.button
          whileHover={{ scale: 1.05, y: -1 }}
          whileTap={{ scale: 0.95 }}
          onClick={onOpenHistory}
          className="px-5 py-2.5 rounded-full font-mono text-sm border transition-all cursor-pointer"
          style={{
            background: 'var(--ren-bg-tertiary)',
            borderColor: 'var(--ren-border)',
            color: 'var(--ren-text-primary)',
          }}
        >
          📜 Historial
        </motion.button>
      </motion.div>

      {/* Stats footer */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.4, delay: 0.3 }}
      >
        {hasStats && (
          <p
            className="text-xs font-mono mb-6"
            style={{ color: 'var(--ren-text-tertiary)' }}
          >
            {(sessionCount ?? 0) > 0 && `${sessionCount} sesiones`}
            {(sessionCount ?? 0) > 0 && ((trickCount ?? 0) > 0 || (messageCount ?? 0) > 0) && ' · '}
            {(trickCount ?? 0) > 0 && `${trickCount} tricks`}
            {(trickCount ?? 0) > 0 && (messageCount ?? 0) > 0 && ' · '}
            {(messageCount ?? 0) > 0 && `${messageCount} mensajes`}
          </p>
        )}

        {/* Tips */}
        <div
          className="flex flex-wrap justify-center gap-x-4 gap-y-1 text-[11px] font-mono"
          style={{ color: 'var(--ren-text-tertiary)' }}
        >
          <span>
            <kbd
              className="px-1.5 py-0.5 rounded border text-[11px]"
              style={{
                background: 'var(--ren-bg-tertiary)',
                borderColor: 'var(--ren-border)',
                color: 'var(--ren-text-secondary)',
              }}
            >
              Ctrl+K
            </kbd>{' '}
            nuevo chat
          </span>
          <span>
            <kbd
              className="px-1.5 py-0.5 rounded border text-[11px]"
              style={{
                background: 'var(--ren-bg-tertiary)',
                borderColor: 'var(--ren-border)',
                color: 'var(--ren-text-secondary)',
              }}
            >
              Ctrl+H
            </kbd>{' '}
            historial
          </span>
          <span>
            <kbd
              className="px-1.5 py-0.5 rounded border text-[11px]"
              style={{
                background: 'var(--ren-bg-tertiary)',
                borderColor: 'var(--ren-border)',
                color: 'var(--ren-text-secondary)',
              }}
            >
              Esc
            </kbd>{' '}
            cerrar
          </span>
        </div>
      </motion.div>
    </motion.div>
  );
}
