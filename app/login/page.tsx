'use client';

import { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { useRouter } from 'next/navigation';
import { User, Lock, ArrowLeft, Eye, EyeOff } from 'lucide-react';
import { login } from '@/lib/api';
import { CrowIcon } from '@/components/ui/crow-icon';
import { ThemeToggle } from '@/components/ui/theme-toggle';

export default function LoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const data = await login(username.toLowerCase().trim(), password);
      sessionStorage.setItem('ren_user', JSON.stringify({
        user_id: data.user_id || data.token,
        name: data.username || username,
        role: data.role || 'user',
        jwt: data.token,
      }));
      router.push('/chat');
    } catch (err: any) {
      alert(err.message || 'Error al iniciar sesión');
    } finally {
      setIsLoading(false);
    }
  };

  const goGuest = () => {
    const guestId = 'guest_' + Math.random().toString(36).slice(2, 10);
    sessionStorage.setItem('ren_user', JSON.stringify({ user_id: guestId, isGuest: true, name: 'Invitado' }));
    router.push('/chat');
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
          onClick={() => router.push('/')}
          className="flex items-center gap-2 text-sm ren-text-secondary hover:ren-text-primary transition-colors mb-8 font-mono group"
        >
          <ArrowLeft size={16} className="group-hover:-translate-x-1 transition-transform" />
          Volver al inicio
        </button>

        <div className="ren-bg-secondary border border-[var(--ren-border)] rounded-2xl p-8 shadow-[0_0_50px_var(--ren-shadow)]">
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
            <h1 className="text-2xl font-bold mb-1 ren-gradient-text">Iniciar sesión</h1>
            <p className="text-sm ren-text-secondary">Bienvenido de vuelta a REN</p>
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
                Contraseña
              </label>
              <div className="relative">
                <Lock size={18} className="absolute left-4 top-1/2 -translate-y-1/2 ren-text-tertiary" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
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

            <div className="flex justify-end">
              <button
                type="button"
                onClick={() => router.push('/forgot-password')}
                className="text-xs ren-text-tertiary hover:text-[var(--accent-color)] transition-colors"
              >
                ¿Olvidaste tu contraseña?
              </button>
            </div>

            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              type="submit"
              disabled={isLoading}
              className="w-full py-3 bg-[var(--accent-color)] hover:bg-[var(--accent-hover)] text-white rounded-lg transition-all shadow-[0_0_20px_var(--ren-shadow-accent)] hover:shadow-[0_0_30px_var(--ren-shadow-accent)] disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? 'Iniciando sesión...' : 'Iniciar sesión'}
            </motion.button>
          </form>

          <div className="mt-6 text-center">
            <p className="text-sm ren-text-secondary">
              No tienes cuenta?{' '}
              <button
                onClick={() => router.push('/register')}
                className="text-[var(--accent-color)] hover:text-[var(--accent-hover)] transition-colors"
              >
                Crear cuenta
              </button>
            </p>
          </div>

          <div className="mt-4 text-center">
            <button
              onClick={goGuest}
              className="text-xs ren-text-tertiary hover:text-[var(--accent-color)] transition-colors underline underline-offset-4"
            >
              Continuar como invitado
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
