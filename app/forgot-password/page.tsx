'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { User, Key, Lock, ArrowLeft, Eye, EyeOff, CheckCircle } from 'lucide-react';
import { CrowIcon } from '@/components/ui/crow-icon';
import { ThemeToggle } from '@/components/ui/theme-toggle';

export default function ForgotPasswordPage() {
  const router = useRouter();
  const [username, setUsername] = useState('');
  const [recoveryCode, setRecoveryCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [step, setStep] = useState<'form' | 'success'>('form');
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    if (newPassword.length < 8) {
      setError('La contraseña debe tener al menos 8 caracteres');
      setIsLoading(false);
      return;
    }
    if (newPassword.length > 64) {
      setError('La contraseña no puede tener más de 64 caracteres');
      setIsLoading(false);
      return;
    }

    try {
      const res = await fetch('/api/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: username.trim(),
          recoveryCode: recoveryCode.trim(),
          newPassword,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Error al recuperar contraseña');
      setStep('success');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="relative min-h-dvh lg:h-dvh flex flex-col bg-[var(--ren-bg-primary)] overflow-x-hidden lg:overflow-hidden">
      <header className="relative z-20 flex items-center justify-between px-5 sm:px-8 h-14 border-b border-[var(--ren-border)] shrink-0">
        <button
          onClick={() => router.push('/login')}
          className="flex items-center gap-2 ren-spec-label hover:text-[var(--ren-text-primary)] transition-colors group"
        >
          <ArrowLeft size={14} className="group-hover:-translate-x-0.5 transition-transform" />
          REN / ACCESO
        </button>
        <div className="flex items-center gap-4">
          <span className="hidden sm:block ren-spec-label">RECUPERACIÓN</span>
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
            <p className="ren-spec-label mb-4">[ RESTABLECER ACCESO ]</p>
            <h2 className="ren-display text-[clamp(40px,4.5vw,68px)] text-[var(--ren-text-primary)]">
              Recupera<br />
              <span className="thin">el control.</span>
            </h2>
            <p className="mt-6 max-w-sm text-sm leading-relaxed text-[var(--ren-text-secondary)]">
              Usa el código de recuperación que generaste al registrarte para fijar una nueva contraseña.
            </p>
          </div>
          <div className="relative z-10 ren-spec-label">PROTOCOLO · IRRECUPERABLE SIN CÓDIGO</div>
        </section>

        {/* Form panel */}
        <section className="relative flex items-center justify-center px-5 sm:px-8 py-10">
          <div className="w-full max-w-md">
            <div className="lg:hidden flex items-center gap-3 mb-8">
              <CrowIcon size="sm" animate />
              <span className="font-mono text-sm tracking-[0.2em] text-[var(--ren-text-primary)]">REN</span>
            </div>

            {step === 'success' ? (
              <div className="text-center">
                <div className="flex justify-center mb-6">
                  <CheckCircle size={48} className="text-[var(--accent-secondary)]" />
                </div>
                <p className="ren-spec-label mb-3">03 · COMPLETADO</p>
                <h1 className="ren-display text-[clamp(34px,6vw,52px)] text-[var(--ren-text-primary)] mb-4">
                  Contraseña<br /><span className="thin">actualizada.</span>
                </h1>
                <p className="text-sm text-[var(--ren-text-secondary)] mb-8">
                  Ya puedes iniciar sesión con tu nueva contraseña.
                </p>
                <button
                  onClick={() => router.push('/login')}
                  className="ren-btn-sharp w-full py-3 text-sm"
                >
                  Iniciar sesión →
                </button>
              </div>
            ) : (
              <>
                <p className="ren-spec-label mb-3">02 · RESTABLECER</p>
                <h1 className="ren-display text-[clamp(34px,6vw,52px)] text-[var(--ren-text-primary)] mb-3">
                  Recuperar<br /><span className="thin">contraseña.</span>
                </h1>
                <p className="text-sm text-[var(--ren-text-secondary)] mb-8">
                  Ingresa tu usuario y el código de recuperación que recibiste al registrarte.
                </p>

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
                    <label className="ren-spec-label">Código de recuperación</label>
                    <div className="relative">
                      <Key size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--ren-text-tertiary)]" />
                      <input
                        type="text"
                        value={recoveryCode}
                        onChange={(e) => setRecoveryCode(e.target.value)}
                        placeholder="0000-0000"
                        required
                        maxLength={9}
                        className="w-full bg-[var(--ren-bg-secondary)] border border-[var(--ren-border)] rounded-[2px] pl-10 pr-4 py-3 text-[var(--ren-text-primary)] text-sm focus:outline-none focus:border-[var(--accent-color)] focus:ring-1 focus:ring-[var(--accent-color)]/30 transition-all placeholder:text-[var(--ren-text-tertiary)] font-mono tracking-[0.3em] text-center"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="ren-spec-label">Nueva contraseña</label>
                    <div className="relative">
                      <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--ren-text-tertiary)]" />
                      <input
                        type={showPassword ? 'text' : 'password'}
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
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

                  {error && (
                    <p className="text-sm font-mono text-[var(--accent-warning)]">⚠ {error}</p>
                  )}

                  <button
                    type="submit"
                    disabled={isLoading}
                    className="ren-btn-sharp w-full py-3 text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isLoading ? 'Actualizando…' : 'Actualizar contraseña →'}
                  </button>
                </form>

                <div className="ren-rule my-7" />

                <button
                  onClick={() => router.push('/login')}
                  className="text-xs font-mono text-[var(--ren-text-tertiary)] hover:text-[var(--accent-color)] transition-colors"
                >
                  ← VOLVER A INICIO DE SESIÓN
                </button>
              </>
            )}
          </div>
        </section>
      </main>
    </div>
  );
}
