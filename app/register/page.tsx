'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Lock, User, ArrowLeft, Eye, EyeOff } from 'lucide-react';
import { CrowIcon } from '@/components/ui/crow-icon';
import { ThemeToggle } from '@/components/ui/theme-toggle';
import { useAuth } from '@/lib/auth-context';
import { register } from '@/lib/api';

export default function RegisterPage() {
  const router = useRouter();
  const { refreshAuth, isAuthenticated, isLoading: authLoading } = useAuth();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [recoveryCode, setRecoveryCode] = useState<string | null>(null);

  useEffect(() => {
    if (!authLoading && isAuthenticated) router.push('/chat');
  }, [isAuthenticated, authLoading, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    if (password.length < 8) {
      alert('La contraseña debe tener al menos 8 caracteres');
      setIsLoading(false);
      return;
    }
    if (password.length > 64) {
      alert('La contraseña no puede tener más de 64 caracteres');
      setIsLoading(false);
      return;
    }
    try {
      const data = await register(username.trim(), password);
      if (data.recoveryCode) {
        setRecoveryCode(data.recoveryCode);
        await refreshAuth();
      } else {
        await refreshAuth();
        router.push('/chat');
      }
    } catch (err: any) {
      alert(err.message || 'Error al registrar');
    } finally {
      setIsLoading(false);
    }
  };

  const goGuest = () => {
    const guestId = 'guest_' + Math.random().toString(36).slice(2, 10);
    sessionStorage.setItem('ren_guest', JSON.stringify({ user_id: guestId, isGuest: true, name: 'Invitado' }));
    router.push('/chat');
  };

  // ── Pantalla de código de recuperación ──
  if (recoveryCode) {
    return (
      <div className="relative min-h-dvh flex flex-col bg-[var(--ren-bg-primary)] overflow-x-hidden">
        <header className="relative z-20 flex items-center justify-between px-5 sm:px-8 h-14 border-b border-[var(--ren-border)] shrink-0">
          <div className="flex items-center gap-2 ren-spec-label">
            <CrowIcon size="sm" />
            REN / REGISTRO
          </div>
          <span className="ren-spec-label">CÓDIGO DE RECUPERACIÓN</span>
        </header>

        <main className="flex-1 flex items-center justify-center px-5 py-10">
          <div className="w-full max-w-md text-center">
            <p className="ren-spec-label mb-3">02 · RESPALDO</p>
            <h1 className="ren-display text-[clamp(34px,6vw,52px)] text-[var(--ren-text-primary)] mb-4">
              Cuenta<br /><span className="thin">creada.</span>
            </h1>
            <p className="text-sm text-[var(--ren-text-secondary)] mb-8 max-w-sm mx-auto leading-relaxed">
              Guarda este código. Lo necesitarás si olvidas tu contraseña — no podremos recuperarlo por ti.
            </p>

            <div className="relative border border-[var(--accent-color)]/40 bg-[var(--ren-bg-secondary)] rounded-[2px] p-6 mb-4">
              <span className="ren-corner-mark tl" />
              <span className="ren-corner-mark tr" />
              <span className="ren-corner-mark bl" />
              <span className="ren-corner-mark br" />
              <span className="font-mono text-3xl font-semibold tracking-[0.3em] text-[var(--accent-color)]">{recoveryCode}</span>
            </div>

            <p className="text-xs font-mono text-[var(--accent-warning)] mb-8">
              ⚠ NO LO PIERDAS · ÚNICO E IRRECUPERABLE
            </p>

            <button
              onClick={() => router.push('/chat')}
              className="ren-btn-sharp w-full py-3 text-sm"
            >
              Ya lo guardé, entrar al chat →
            </button>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="relative min-h-dvh lg:h-dvh flex flex-col bg-[var(--ren-bg-primary)] overflow-x-hidden lg:overflow-hidden">
      <header className="relative z-20 flex items-center justify-between px-5 sm:px-8 h-14 border-b border-[var(--ren-border)] shrink-0">
        <button
          onClick={() => router.push('/')}
          className="flex items-center gap-2 ren-spec-label hover:text-[var(--ren-text-primary)] transition-colors group"
        >
          <ArrowLeft size={14} className="group-hover:-translate-x-0.5 transition-transform" />
          REN / INICIO
        </button>
        <div className="flex items-center gap-4">
          <span className="hidden sm:block ren-spec-label">NUEVA · CUENTA</span>
          <ThemeToggle />
        </div>
      </header>

      <main className="relative z-10 flex-1 min-h-0 grid grid-cols-1 lg:grid-cols-2">
        {/* Brand panel */}
        <section className="relative hidden lg:flex flex-col justify-between p-10 border-r border-[var(--ren-border)] ren-blueprint-grid overflow-hidden">
          <div className="relative z-10 flex items-center gap-3">
            <CrowIcon size="md" animate />
            <span className="font-mono text-sm tracking-[0.2em] text-[var(--ren-text-primary)]">REN</span>
          </div>
          <div className="relative z-10">
            <p className="ren-spec-label mb-4">[ MOTOR DE RAZONAMIENTO ]</p>
            <h2 className="ren-display text-[clamp(40px,4.5vw,68px)] text-[var(--ren-text-primary)]">
              Un instrumento<br />
              <span className="thin">de precisión.</span>
            </h2>
            <p className="mt-6 max-w-sm text-sm leading-relaxed text-[var(--ren-text-secondary)]">
              Estructura el caos en cualquier dominio: clínico, código, investigación o datos. Crea tu cuenta para empezar.
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

            <p className="ren-spec-label mb-3">01 · REGISTRO</p>
            <h1 className="ren-display text-[clamp(34px,6vw,52px)] text-[var(--ren-text-primary)] mb-8">
              Crear<br /><span className="thin">cuenta.</span>
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
                    minLength={3}
                    maxLength={32}
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
                    placeholder="8-64 caracteres"
                    required
                    minLength={8}
                    maxLength={64}
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

              <p className="text-xs text-[var(--ren-text-tertiary)] leading-relaxed">
                Al crear una cuenta aceptas los{' '}
                <button type="button" className="text-[var(--accent-color)] hover:text-[var(--accent-hover)] transition-colors">Términos</button>
                {' '}y la{' '}
                <button type="button" className="text-[var(--accent-color)] hover:text-[var(--accent-hover)] transition-colors">Política de Privacidad</button>.
              </p>

              <button
                type="submit"
                disabled={isLoading}
                className="ren-btn-sharp w-full py-3 text-sm disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoading ? 'Creando…' : 'Crear cuenta →'}
              </button>
            </form>

            <div className="ren-rule my-7" />

            <div className="flex items-center justify-between text-sm">
              <span className="text-[var(--ren-text-secondary)]">
                ¿Ya tienes cuenta?{' '}
                <button
                  onClick={() => router.push('/login')}
                  className="text-[var(--accent-color)] hover:text-[var(--accent-hover)] transition-colors font-medium"
                >
                  Iniciar sesión
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
