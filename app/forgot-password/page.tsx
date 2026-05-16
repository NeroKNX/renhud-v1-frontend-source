'use client';

import { useState, useEffect } from 'react';
import { motion } from 'motion/react';
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
    <div className="min-h-dvh flex flex-col justify-center px-4 py-6 sm:py-12 overflow-y-auto ren-bg-primary">
      {/* Theme Toggle */}
      <div className="fixed top-4 right-4 z-50">
        <ThemeToggle />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-md mx-auto"
      >
        <button
          onClick={() => router.push('/login')}
          className="flex items-center gap-2 text-sm ren-text-secondary hover:ren-text-primary transition-colors mb-8 font-mono group"
        >
          <ArrowLeft size={16} className="group-hover:-translate-x-1 transition-transform" />
          Volver a inicio de sesión
        </button>

        <div className="ren-bg-secondary border border-[var(--ren-border)] rounded-2xl p-8 shadow-[0_0_50px_var(--ren-shadow)]">
          {step === 'success' ? (
            <>
              <motion.div
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ duration: 0.4 }}
                className="flex justify-center mb-4"
              >
                <div className="w-14 h-14 flex items-center justify-center">
                  <CheckCircle size={48} className="text-emerald-400" />
                </div>
              </motion.div>

              <div className="text-center mb-8">
                <h1 className="text-2xl font-bold mb-1 ren-gradient-text">Contraseña actualizada</h1>
                <p className="text-sm ren-text-secondary">Ya puedes iniciar sesión con tu nueva contraseña</p>
              </div>

              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => router.push('/login')}
                className="w-full py-3 bg-[var(--accent-color)] hover:bg-[var(--accent-hover)] text-white rounded-lg transition-all shadow-[0_0_20px_var(--ren-shadow-accent)]"
              >
                Iniciar sesión
              </motion.button>
            </>
          ) : (
            <>
              {/* Cuervo */}
              <motion.div
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ duration: 0.4 }}
                className="flex justify-center mb-5"
              >
                <CrowIcon size="xl" animate />
              </motion.div>

              <div className="text-center mb-8">
                <h1 className="text-2xl font-bold mb-1 ren-gradient-text">Recuperar contraseña</h1>
                <p className="text-sm ren-text-secondary">Ingresa tu usuario y el código de recuperación que recibiste al registrarte</p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-5">
                <div className="space-y-2">
                  <label className="text-xs ren-text-secondary uppercase tracking-wider">
                    Usuario
                  </label>
                  <div className="relative">
                    <User size={18} className="absolute left-4 top-1/2 -translate-y-1/2 ren-text-tertiary" />
                    <input
                      type="text"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      placeholder="Nombre de usuario"
                      required
                      className="w-full ren-bg-primary border border-[var(--ren-border)] rounded-lg px-12 py-3 ren-text-primary text-sm focus:outline-none focus:border-[var(--accent-color)] focus:ring-2 focus:ring-[var(--accent-color)]/20 transition-all placeholder:text-[var(--ren-text-tertiary)]"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-xs ren-text-secondary uppercase tracking-wider">
                    Código de recuperación
                  </label>
                  <div className="relative">
                    <Key size={18} className="absolute left-4 top-1/2 -translate-y-1/2 ren-text-tertiary" />
                    <input
                      type="text"
                      value={recoveryCode}
                      onChange={(e) => setRecoveryCode(e.target.value)}
                      placeholder="0000-0000"
                      required
                      maxLength={9}
                      className="w-full ren-bg-primary border border-[var(--ren-border)] rounded-lg px-12 py-3 ren-text-primary text-sm focus:outline-none focus:border-[var(--accent-color)] focus:ring-2 focus:ring-[var(--accent-color)]/20 transition-all placeholder:text-[var(--ren-text-tertiary)] font-mono tracking-widest text-center"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-xs ren-text-secondary uppercase tracking-wider">
                    Nueva contraseña
                  </label>
                  <div className="relative">
                    <Lock size={18} className="absolute left-4 top-1/2 -translate-y-1/2 ren-text-tertiary" />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="8-64 caracteres"
                      required
                      minLength={8}
                      maxLength={64}
                      className="w-full ren-bg-primary border border-[var(--ren-border)] rounded-lg px-12 py-3 ren-text-primary text-sm focus:outline-none focus:border-[var(--accent-color)] focus:ring-2 focus:ring-[var(--accent-color)]/20 transition-all placeholder:text-[var(--ren-text-tertiary)]"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-4 top-1/2 -translate-y-1/2 ren-text-tertiary hover:ren-text-secondary transition-colors"
                    >
                      {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                </div>

                {error && (
                  <p className="text-sm text-red-400 text-center">{error}</p>
                )}

                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  type="submit"
                  disabled={isLoading}
                  className="w-full py-3 bg-[var(--accent-color)] hover:bg-[var(--accent-hover)] text-white rounded-lg transition-all shadow-[0_0_20px_var(--ren-shadow-accent)] hover:shadow-[0_0_30px_var(--ren-shadow-accent)] disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isLoading ? 'Actualizando...' : 'Actualizar contraseña'}
                </motion.button>
              </form>
            </>
          )}
        </div>
      </motion.div>
    </div>
  );
}
