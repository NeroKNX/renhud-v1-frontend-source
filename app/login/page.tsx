'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { User, Lock, ArrowLeft, Eye, EyeOff } from 'lucide-react';
import { CrowIcon } from '@/components/ui/crow-icon';
import { ThemeToggle } from '@/components/ui/theme-toggle';
import { useAuth } from '@/lib/auth-context';

export default function LoginPage() {
  const router = useRouter();
  const { login, isAuthenticated, isLoading: authLoading } = useAuth();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (!authLoading && isAuthenticated) router.push('/chat');
  }, [isAuthenticated, authLoading, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      await login(username.toLowerCase().trim(), password);
      router.push('/chat');
    } catch (err: any) {
      alert(err.message || 'Error al iniciar sesión');
    } finally {
      setIsLoading(false);
    }
  };

  const goGuest = () => {
    const guestId = 'guest_' + Math.random().toString(36).slice(2, 10);
    sessionStorage.setItem('ren_guest', JSON.stringify({ user_id: guestId, isGuest: true, name: 'Invitado' }));
    window.dispatchEvent(new CustomEvent('ren:guest-created'));
    router.push('/chat');
  };

  return (
    <div className="relative min-h-dvh lg:h-dvh flex flex-col bg-[var(--ren-bg-primary)] overflow-x-hidden lg:overflow-hidden">
      {/* Top spec bar */}
      <header className="relative z-20 flex items-center justify-between px-5 sm:px-8 h-14 border-b border-[var(--ren-border)] shrink-0">
        <button
          onClick={() => router.push('/')}
          className="flex items-center gap-2 ren-spec-label hover:text-[var(--ren-text-primary)] transition-colors group"
        >
          <ArrowLeft size={14} className="group-hover:-translate-x-0.5 transition-transform" />
          REN / INICIO
        </button>
        <div className="flex items-center gap-4">
          <span className="hidden sm:block ren-spec-label">ACCESO · SESIÓN</span>
          <ThemeToggle />
        </div>
      </header>

      <main className="relative z-10 flex-1 min-h-0 grid grid-cols-1 lg:grid-cols-2">
        {/* Brand panel — blueprint grid */}
        <section className="relative hidden lg:flex flex-col justify-between p-10 border-r border-[var(--ren-border)] ren-blueprint-grid overflow-hidden">
          <div className="relative z-10 flex items-center gap-3">
            <CrowIcon size="md" animate />
            <span className="font-mono text-sm tracking-[0.2em] text-[var(--ren-text-primary)]">REN</span>
          </div>
          <div className="relative z-10">
            <p className="ren-spec-label mb-4">[ MOTOR DE RAZONAMIENTO ]</p>
            <h2 className="ren-display text-[clamp(40px,4.5vw,68px)] text-[var(--ren-text-primary)]">
              Bienvenido<br />
              <span className="thin">de vuelta.</span>
            </h2>
            <p className="mt-6 max-w-sm text-sm leading-relaxed text-[var(--ren-text-secondary)]">
              Retoma tus hilos de razonamiento. Tu contexto, tus dominios y tu historial te esperan.
            </p>
          </div>
          <div className="relative z-10 flex items-center gap-6 ren-spec-label">
            <span>CLÍNICO</span>
            <span>CÓDIGO</span>
            <span>INVESTIGACIÓN</span>
            <span>DATOS</span>
          </div>
        </section>

        {/* Form panel */}
        <section className="relative flex items-center justify-center px-5 sm:px-8 py-10">
          <div className="w-full max-w-md">
            <div className="lg:hidden flex items-center gap-3 mb-8">
              <CrowIcon size="sm" animate />
              <span className="font-mono text-sm tracking-[0.2em] text-[var(--ren-text-primary)]">REN</span>
            </div>

            <p className="ren-spec-label mb-3">01 · IDENTIFICACIÓN</p>
            <h1 className="ren-display text-[clamp(34px,6vw,52px)] text-[var(--ren-text-primary)] mb-8">
              Iniciar<br /><span className="thin">sesión.</span>
            </h1>

            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="space-y-2">
                <label className="ren-spec-label">Usuario</label>
                <div className="relative">
                  <User size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--ren-text-tertiary)]" />
                  <input
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="nombre de usuario"
                    required
                    className="w-full bg-[var(--ren-bg-secondary)] border border-[var(--ren-border)] rounded-[2px] pl-10 pr-4 py-3 text-[var(--ren-text-primary)] text-sm focus:outline-none focus:border-[var(--accent-color)] focus:ring-1 focus:ring-[var(--accent-color)]/30 transition-all placeholder:text-[var(--ren-text-tertiary)]"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="ren-spec-label">Contraseña</label>
                <div className="relative">
                  <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--ren-text-tertiary)]" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    required
                    className="w-full bg-[var(--ren-bg-secondary)] border border-[var(--ren-border)] rounded-[2px] pl-10 pr-10 py-3 text-[var(--ren-text-primary)] text-sm focus:outline-none focus:border-[var(--accent-color)] focus:ring-1 focus:ring-[var(--accent-color)]/30 transition-all placeholder:text-[var(--ren-text-tertiary)]"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--ren-text-tertiary)] hover:text-[var(--ren-text-secondary)] transition-colors"
                  >
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={() => router.push('/forgot-password')}
                  className="text-xs font-mono text-[var(--ren-text-tertiary)] hover:text-[var(--accent-color)] transition-colors"
                >
                  ¿Olvidaste tu contraseña?
                </button>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="ren-btn-sharp w-full py-3 text-sm disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoading ? 'Iniciando…' : 'Iniciar sesión →'}
              </button>
            </form>

            <div className="ren-rule my-7" />

            <div className="flex items-center justify-between text-sm">
              <span className="text-[var(--ren-text-secondary)]">
                ¿Sin cuenta?{' '}
                <button
                  onClick={() => router.push('/register')}
                  className="text-[var(--accent-color)] hover:text-[var(--accent-hover)] transition-colors font-medium"
                >
                  Crear cuenta
                </button>
              </span>
              <button
                onClick={goGuest}
                className="text-xs font-mono text-[var(--ren-text-tertiary)] hover:text-[var(--accent-color)] transition-colors"
              >
                INVITADO →
              </button>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
