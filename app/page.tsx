'use client';

import { motion } from 'motion/react';
import { useRouter } from 'next/navigation';
import { CrowIcon } from '@/components/ui/crow-icon';
import { ThemeToggle } from '@/components/ui/theme-toggle';
import { useAuth } from '@/lib/auth-context';

const pills = [
  { icon: '🧠', label: 'Razonamiento estructural' },
  { icon: '📋', label: 'Documentación clínica' },
  { icon: '💾', label: 'Memoria contextual' },
  { icon: '🔗', label: 'Integración de datos' },
  { icon: '🔍', label: 'Análisis crítico' },
];

const containerVariants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.08 },
  },
};

const pillVariants = {
  hidden: { opacity: 0, y: 6, scale: 0.95 },
  show: { opacity: 1, y: 0, scale: 1 },
};

export default function LandingPage() {
  const router = useRouter();
  const { user, isAuthenticated, isLoading, logout } = useAuth();

  return (
    <div className="h-dvh flex flex-col overflow-hidden">
      {/* Theme Toggle */}
      <div className="fixed top-4 right-4 z-50">
        <ThemeToggle />
      </div>

      {/* Ambient particles — only visible on desktop */}
      <div className="hidden lg:block absolute inset-0 pointer-events-none z-0 overflow-hidden">
        {[...Array(8)].map((_, i) => (
          <motion.div
            key={i}
            className="absolute rounded-full bg-[var(--accent-color)]"
            style={{
              width: Math.random() * 2 + 1,
              height: Math.random() * 2 + 1,
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
              opacity: 0.15,
            }}
            animate={{
              y: [0, -Math.random() * 30 - 10, 0],
              opacity: [0.08, 0.25, 0.08],
            }}
            transition={{
              duration: Math.random() * 6 + 4,
              repeat: Infinity,
              ease: 'easeInOut',
              delay: Math.random() * 3,
            }}
          />
        ))}
      </div>

      <main className="flex-1 flex items-center justify-center px-6 relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="text-center max-w-[460px] w-full"
        >
          {/* Cuervo con aura glow */}
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="flex justify-center mb-5 relative"
          >
            {/* Aura grande externa — más difusa, solo escritorio */}
            <motion.div
              className="absolute inset-0 rounded-full hidden lg:block"
              style={{
                background:
                  'radial-gradient(circle, rgba(99,102,241,0.12) 0%, transparent 65%)',
                filter: 'blur(48px)',
                transform: 'scale(1.8)',
              }}
              animate={{ scale: [1.7, 2.1, 1.7], opacity: [0.4, 0.7, 0.4] }}
              transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut' }}
            />
            {/* Aura que respira con el cuervo */}
            <motion.div
              className="absolute inset-0 rounded-full"
              style={{
                background:
                  'radial-gradient(circle, rgba(99,102,241,0.25) 0%, transparent 70%)',
                filter: 'blur(24px)',
              }}
              animate={{ scale: [1, 1.2, 1], opacity: [0.5, 0.85, 0.5] }}
              transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
            />
            <CrowIcon size="2xl" animate />
          </motion.div>

          {/* Título */}
          <motion.h1
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="text-[clamp(48px,14vw,80px)] font-bold leading-none tracking-[-3px] mb-1 ren-gradient-text"
          >
            REN
          </motion.h1>

          {/* Subtítulo */}
          <motion.p
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.25 }}
            className="text-base italic ren-text-secondary/70 mb-3"
          >
            Brillo en el caos.
          </motion.p>

          {/* Línea divisoria */}
          <motion.div
            initial={{ scaleX: 0, opacity: 0 }}
            animate={{ scaleX: 1, opacity: 1 }}
            transition={{ duration: 0.5, delay: 0.28 }}
            className="w-14 h-px bg-gradient-to-r from-transparent via-[var(--accent-color)]/25 to-transparent mx-auto mb-[14px]"
          />

          {/* Texto */}
          <motion.p
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.3 }}
            className="text-sm ren-text-secondary mb-[14px] max-w-[320px] mx-auto"
          >
            Le doy estructura a la información que nadie más ordena.
          </motion.p>

          {/* Línea divisoria */}
          <motion.div
            initial={{ scaleX: 0, opacity: 0 }}
            animate={{ scaleX: 1, opacity: 1 }}
            transition={{ duration: 0.4, delay: 0.35 }}
            className="w-14 h-px bg-gradient-to-r from-transparent via-[var(--accent-color)]/15 to-transparent mx-auto mb-6"
          />

          {/* Botones — cambian según sesión */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.5 }}
            className="flex gap-2.5 justify-center flex-wrap mb-7"
          >
            {isAuthenticated ? (
              <>
                <button
                  onClick={() => router.push('/chat')}
                  className="ren-btn-glow px-[22px] py-[10px] rounded-xl bg-[#2563eb] hover:bg-[#1d4ed8] text-white text-[13px] font-semibold transition-all"
                >
                  Ir al chat →
                </button>
                <button
                  onClick={async () => { await logout(); router.push('/'); }}
                  className="px-[22px] py-[10px] rounded-xl bg-transparent ren-text-primary text-[13px] font-semibold border border-[var(--ren-border)] hover:bg-[var(--ren-bg-tertiary)] hover:text-red-400 hover:border-red-400/50 transition-all"
                >
                  Cerrar sesión
                </button>
                <span
                  className="px-[22px] py-[10px] rounded-xl bg-transparent ren-text-primary/60 text-[13px] font-mono border border-[var(--ren-border)] flex items-center gap-1.5"
                >
                  🜁 {user?.name || user?.username}
                </span>
              </>
            ) : (
              <>
                <button
                  onClick={() => router.push('/register')}
                  className="ren-btn-glow px-[22px] py-[10px] rounded-xl bg-[#2563eb] hover:bg-[#1d4ed8] text-white text-[13px] font-semibold transition-all"
                >
                  Crear cuenta →
                </button>
                <button
                  onClick={() => router.push('/login')}
                  className="px-[22px] py-[10px] rounded-xl bg-transparent ren-text-primary text-[13px] font-semibold border border-[var(--ren-border)] hover:bg-[var(--ren-bg-tertiary)] hover:border-[var(--accent-color)]/50 transition-all"
                >
                  Iniciar sesión
                </button>
              </>
            )}
          </motion.div>

          {/* Invitado — debajo de los botones */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.3, delay: 0.55 }}
            className="-mt-4 mb-5"
          >
            <span
              onClick={() => {
                const guestId = 'guest_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
                sessionStorage.setItem('ren_guest', JSON.stringify({ name: 'Invitado', user_id: guestId }));
                window.dispatchEvent(new CustomEvent('ren:guest-created'));
                router.push('/chat');
              }}
              className="cursor-pointer text-[13px] ren-text-tertiary hover:ren-text-primary transition-colors underline underline-offset-4 decoration-dotted decoration-1 hover:decoration-solid"
            >
              Continuar como invitado
            </span>
          </motion.div>

          {/* Calculadoras CTA */}
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.6 }}
            className="mb-5"
          >
            <button
              onClick={() => router.push('/calculators')}
              className="group inline-flex items-center gap-2 px-4 py-2 rounded-full text-xs font-mono"
              style={{
                background: 'rgba(99,102,241,0.06)',
                border: '1px solid rgba(99,102,241,0.2)',
                color: 'var(--ren-text-secondary)',
              }}
            >
              <span className="w-5 h-5 rounded-md bg-[var(--accent-color)]/10 flex items-center justify-center text-[11px] group-hover:bg-[var(--accent-color)]/20 transition-all">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M22 12h-4l-3 9L9 3l-3 9H2"/>
                </svg>
              </span>
              <span className="group-hover:text-[var(--accent-hover)] transition-colors">
                Calculadoras clínicas
              </span>
              <span className="text-[10px] opacity-40 group-hover:opacity-80 transition-opacity">
                nuevo
              </span>
            </button>
          </motion.div>



          {/* Pills — entrada escalonada */}
          <motion.div
            variants={containerVariants}
            initial="hidden"
            animate="show"
            className="flex flex-wrap gap-2 justify-center mb-7"
          >
            {pills.map((pill) => (
              <motion.span
                key={pill.label}
                variants={pillVariants}
                className="ren-pill"
              >
                <span className="text-[13px]">{pill.icon}</span>
                {pill.label}
              </motion.span>
            ))}
          </motion.div>

          {/* Footer — sin link a chat */}
          <motion.footer
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.4, delay: 0.7 }}
            className="text-[11px] ren-text-tertiary space-x-3"
          >
            <span className="opacity-50">🜁</span>
            <span>REN · alpha</span>
          </motion.footer>
        </motion.div>
      </main>
    </div>
  );
}
