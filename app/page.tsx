'use client';

import { motion } from 'motion/react';
import { useRouter } from 'next/navigation';
import { CrowIcon } from '@/components/ui/crow-icon';
import { ThemeToggle } from '@/components/ui/theme-toggle';

export default function LandingPage() {
  const router = useRouter();

  return (
    <div className="h-dvh flex flex-col overflow-hidden ren-bg-primary">
      {/* Theme Toggle */}
      <div className="fixed top-4 right-4 z-50">
        <ThemeToggle />
      </div>

      <main className="flex-1 flex items-center justify-center px-6 relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="text-center max-w-[460px] w-full"
        >
          {/* Cuervo */}
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="flex justify-center mb-5"
          >
            <CrowIcon size="lg" animate />
          </motion.div>

          {/* Título */}
          <motion.h1
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="text-[clamp(48px,14vw,80px)] font-bold leading-none tracking-[-3px] mb-2 ren-gradient-text"
          >
            REN
          </motion.h1>

          {/* Tagline */}
          <motion.p
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.3 }}
            className="text-sm ren-text-secondary mb-1"
          >
            Una inteligencia que piensa distinto.
          </motion.p>

          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.4, delay: 0.4 }}
            className="text-[13px] ren-text-tertiary max-w-[360px] mx-auto mb-6 leading-relaxed"
          >
            Una entidad en construcción — procesa documentos, analiza decisiones,
            estructura información compleja y devuelve criterio.
          </motion.p>

          {/* Botones */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.5 }}
            className="flex gap-2.5 justify-center flex-wrap mb-7"
          >
            <button
              onClick={() => router.push('/register')}
              className="px-[22px] py-[10px] rounded-xl bg-[#2563eb] hover:bg-[#1d4ed8] text-white text-[13px] font-semibold transition-all"
            >
              Crear cuenta →
            </button>
            <button
              onClick={() => router.push('/login')}
              className="px-[22px] py-[10px] rounded-xl bg-transparent ren-text-primary text-[13px] font-semibold border border-[var(--ren-border)] hover:bg-[var(--ren-bg-tertiary)] hover:border-[var(--accent-color)]/50 transition-all"
            >
              Iniciar sesión
            </button>
          </motion.div>

          {/* Pills — capacidades variadas */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.4, delay: 0.6 }}
            className="flex flex-wrap gap-2 justify-center mb-7"
          >
            {[
              { icon: '🧠', label: 'Razonamiento' },
              { icon: '📋', label: 'Documentación' },
              { icon: '🩺', label: 'Entorno clínico' },
              { icon: '💾', label: 'Memoria persistente' },
              { icon: '🔗', label: 'Integración' },
            ].map((pill) => (
              <span key={pill.label} className="ren-pill">
                <span className="text-[13px]">{pill.icon}</span>
                {pill.label}
              </span>
            ))}
          </motion.div>

          {/* Footer */}
          <motion.footer
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.4, delay: 0.7 }}
            className="text-[11px] ren-text-tertiary space-x-3"
          >
            <span className="opacity-50">🜁</span>
            <span>REN · alpha</span>
            <a href="/chat" className="hover:text-[var(--accent-hover)] transition-colors">chat</a>
          </motion.footer>
        </motion.div>
      </main>
    </div>
  );
}
