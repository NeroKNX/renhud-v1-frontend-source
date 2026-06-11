'use client';

import { motion } from 'motion/react';
import { useRouter } from 'next/navigation';
import { CrowIcon } from '@/components/ui/crow-icon';
import { ThemeToggle } from '@/components/ui/theme-toggle';
import { useAuth } from '@/lib/auth-context';

const capabilities = [
  { id: '01', label: 'Razonamiento estructural' },
  { id: '02', label: 'Documentación clínica' },
  { id: '03', label: 'Memoria contextual' },
  { id: '04', label: 'Integración de datos' },
  { id: '05', label: 'Análisis crítico' },
];

export default function LandingPage() {
  const router = useRouter();
  const { user, isAuthenticated, logout } = useAuth();

  const enterGuest = () => {
    const guestId = 'guest_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
    sessionStorage.setItem('ren_guest', JSON.stringify({ name: 'Invitado', user_id: guestId }));
    window.dispatchEvent(new CustomEvent('ren:guest-created'));
    router.push('/chat');
  };

  return (
    <div className="relative min-h-dvh flex flex-col bg-[var(--ren-bg-primary)] overflow-x-hidden">
      {/* Rejilla blueprint de fondo */}
      <div className="ren-blueprint-grid absolute inset-0 z-0" aria-hidden />

      {/* ───────── Header / barra técnica ───────── */}
      <header className="relative z-20 border-b border-[var(--ren-border)]">
        <div className="mx-auto max-w-[1240px] px-5 sm:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 flex items-center justify-center">
              <CrowIcon size="sm" />
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-[15px] font-semibold tracking-[0.18em] text-[var(--ren-text-primary)]">REN</span>
              <span className="ren-spec-label hidden sm:inline">/ asistente clínico</span>
            </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-3">
            <span className="ren-spec-label hidden md:inline">v2 · alpha</span>
            <ThemeToggle />
            {isAuthenticated ? (
              <button
                onClick={() => router.push('/chat')}
                className="ren-btn-sharp px-4 py-2 text-[13px]"
              >
                Ir al chat
              </button>
            ) : (
              <button
                onClick={() => router.push('/login')}
                className="ren-btn-outline px-4 py-2 text-[13px]"
              >
                Iniciar sesión
              </button>
            )}
          </div>
        </div>
      </header>

      {/* ───────── Hero ───────── */}
      <main className="relative z-10 flex-1">
        <div className="mx-auto max-w-[1240px] px-5 sm:px-8">
          <div className="grid lg:grid-cols-12 gap-10 lg:gap-8 pt-16 sm:pt-24 lg:pt-28 pb-20">
            {/* Columna izquierda: titular + acciones */}
            <div className="lg:col-span-7 xl:col-span-8">
              <motion.div
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
                className="flex items-center gap-3 mb-7"
              >
                <span className="ren-spec-label">Brillo en el caos</span>
                <span className="h-px w-12 bg-[var(--ren-border)]" />
                <span className="ren-spec-label text-[var(--accent-color)]">UCI · tiempo real</span>
              </motion.div>

              <motion.h1
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.05 }}
                className="ren-display text-[var(--ren-text-primary)] text-[clamp(52px,11vw,128px)]"
              >
                <span className="block">Estructura</span>
                <span className="block">
                  para el <span className="text-[var(--accent-color)]">caos</span>
                </span>
                <span className="block thin text-[clamp(34px,7vw,80px)]">clínico.</span>
              </motion.h1>

              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.5, delay: 0.2 }}
                className="mt-8 max-w-[480px] text-[15px] leading-[1.7] text-[var(--ren-text-secondary)]"
              >
                REN le da forma a la información que nadie más ordena: razona,
                documenta y sostiene el contexto de cada paciente crítico.
              </motion.p>

              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.3 }}
                className="mt-10 flex flex-wrap items-center gap-3"
              >
                {isAuthenticated ? (
                  <>
                    <button onClick={() => router.push('/chat')} className="ren-btn-sharp px-6 py-3 text-[14px]">
                      Ir al chat →
                    </button>
                    <button
                      onClick={async () => { await logout(); router.push('/'); }}
                      className="ren-btn-outline px-6 py-3 text-[14px]"
                    >
                      Cerrar sesión
                    </button>
                    <span className="ren-spec-label flex items-center gap-1.5 pl-1">
                      <span className="text-[var(--accent-color)]">●</span>
                      {user?.name || user?.username}
                    </span>
                  </>
                ) : (
                  <>
                    <button onClick={() => router.push('/register')} className="ren-btn-sharp px-6 py-3 text-[14px]">
                      Crear cuenta →
                    </button>
                    <button onClick={enterGuest} className="ren-btn-outline px-6 py-3 text-[14px]">
                      Continuar como invitado
                    </button>
                  </>
                )}
              </motion.div>

              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.5, delay: 0.45 }}
                className="mt-10"
              >
                <button
                  onClick={() => router.push('/calculators')}
                  className="group inline-flex items-center gap-3 ren-btn-outline px-4 py-2.5"
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--accent-color)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
                  </svg>
                  <span className="text-[13px] font-medium">Calculadoras clínicas</span>
                  <span className="ren-spec-label text-[var(--accent-color)]">nuevo</span>
                </button>
              </motion.div>
            </div>

            {/* Columna derecha: panel de especificaciones */}
            <div className="lg:col-span-5 xl:col-span-4">
              <motion.div
                initial={{ opacity: 0, x: 16 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.6, delay: 0.2 }}
                className="relative border border-[var(--ren-border)] bg-[var(--ren-bg-secondary)]/60 backdrop-blur-sm"
              >
                <span className="ren-corner-mark tl -top-px -left-px" />
                <span className="ren-corner-mark tr -top-px -right-px" />
                <span className="ren-corner-mark bl -bottom-px -left-px" />
                <span className="ren-corner-mark br -bottom-px -right-px" />

                <div className="flex items-center justify-between px-5 h-12 border-b border-[var(--ren-border)]">
                  <span className="ren-spec-label">Capacidades</span>
                  <span className="ren-spec-label">05 / 05</span>
                </div>

                <ul>
                  {capabilities.map((cap) => (
                    <li
                      key={cap.id}
                      className="group flex items-center gap-4 px-5 py-4 border-b border-[var(--ren-border)] last:border-b-0 transition-colors hover:bg-[var(--accent-muted)]"
                    >
                      <span className="font-mono text-[12px] text-[var(--accent-color)]/80 w-6">{cap.id}</span>
                      <span className="text-[14px] text-[var(--ren-text-primary)]">{cap.label}</span>
                      <span className="ml-auto text-[var(--ren-text-tertiary)] group-hover:text-[var(--accent-color)] transition-colors">→</span>
                    </li>
                  ))}
                </ul>

                <div className="px-5 py-4 border-t border-[var(--ren-border)] flex items-center gap-3">
                  <div className="relative flex h-2 w-2">
                    <span className="absolute inline-flex h-full w-full rounded-full bg-[var(--accent-secondary)] opacity-60 animate-ping" />
                    <span className="relative inline-flex h-2 w-2 rounded-full bg-[var(--accent-secondary)]" />
                  </div>
                  <span className="ren-spec-label">Sistema operativo</span>
                </div>
              </motion.div>
            </div>
          </div>
        </div>
      </main>

      {/* ───────── Footer técnico ───────── */}
      <footer className="relative z-10 border-t border-[var(--ren-border)]">
        <div className="mx-auto max-w-[1240px] px-5 sm:px-8 h-14 flex items-center justify-between">
          <span className="ren-spec-label">REN · alpha</span>
          <span className="ren-spec-label hidden sm:inline">Asistente de razonamiento clínico</span>
          <span className="ren-spec-label text-[var(--accent-color)]">◆</span>
        </div>
      </footer>
    </div>
  );
}
