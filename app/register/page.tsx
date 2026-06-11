'use client';

import { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { useRouter } from 'next/navigation';
import { Lock, User, ArrowLeft, Eye, EyeOff } from 'lucide-react';
import { CrowIcon } from '@/components/ui/crow-icon';
import { ThemeToggle } from '@/components/ui/theme-toggle';
import { useAuth } from '@/lib/auth-context';

const stagger = {
  visible: { transition: { staggerChildren: 0.1, delayChildren: 0.2 } },
  hidden: {},
};

const fadeSlide = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.4, ease: [0.25, 0.1, 0.25, 1] } },
};

export default function RegisterPage() {
  const router = useRouter();
  const { refreshAuth, isAuthenticated, isLoading: authLoading } = useAuth();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [recoveryCode, setRecoveryCode] = useState<string | null>(null);

  // Si ya está autenticado, redirigir directo
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
        // Cookie ya seteada por el servidor, refrescar estado global
        await refreshAuth();
      } else {
        // Refrescar estado global
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

  if (recoveryCode) {
    return (
      <div className="min-h-dvh flex flex-col justify-center px-4 py-6 sm:py-12 overflow-y-auto relative">
        {/* Ambient particles — desktop only */}
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
                opacity: 0.12,
              }}
              animate={{
                y: [0, -(Math.random() * 30 + 10), 0],
                opacity: [0.06, 0.2, 0.06],
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
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-md lg:max-w-lg mx-auto text-center relative z-10"
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.97 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5, ease: [0.25, 0.1, 0.25, 1] }}
            className="bg-[var(--ren-bg-secondary)]/30 border border-[var(--ren-border)] rounded-2xl p-8 shadow-[0_0_50px_var(--ren-shadow)]"
          >
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ duration: 0.4 }}
              className="flex justify-center mb-4"
            >
              <div className="relative flex justify-center">
              {/* Aura que respira */}
              <motion.div
                className="absolute inset-0 rounded-full"
                style={{
                  background: 'radial-gradient(circle, rgba(212,168,83,0.18) 0%, transparent 70%)',
                  filter: 'blur(20px)',
                  transform: 'scale(1.5)',
                }}
                animate={{ scale: [1.3, 1.7, 1.3], opacity: [0.35, 0.75, 0.35] }}
                transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
              />
              <div className="lg:scale-125 origin-center relative z-10">
                <CrowIcon size="lg" animate />
              </div>
            </div>
            </motion.div>
            <motion.h1
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.35, delay: 0.1 }}
              className="text-xl lg:text-2xl font-bold mb-2 ren-gradient-text"
            >
              Cuenta creada!
            </motion.h1>
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.35, delay: 0.2 }}
              className="text-sm ren-text-secondary mb-6"
            >
              Guarda este código. Lo necesitarás si olvidas tu contraseña.
            </motion.p>
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.4, delay: 0.3 }}
              className="ren-bg-primary border-2 border-[var(--accent-color)]/40 rounded-xl p-4 mb-4"
            >
              <span className="text-3xl font-bold tracking-[0.3em] text-[var(--accent-color)]">{recoveryCode}</span>
            </motion.div>
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.35, delay: 0.4 }}
              className="text-xs text-amber-400/80 mb-6 flex items-center justify-center gap-1"
            >
              No lo pierdas. No podremos recuperarlo.
            </motion.p>
            <motion.button
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.35, delay: 0.5 }}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => {
                // Cookie HttpOnly ya está seteada por el servidor
                router.push('/chat');
              }}
              className="w-full py-3 bg-[var(--accent-color)] hover:bg-[var(--accent-hover)] text-[var(--ren-bg-primary)] font-semibold rounded-lg transition-all shadow-[0_0_20px_var(--ren-shadow-accent)]"
            >
              Ya lo guardé, entrar al chat
            </motion.button>
          </motion.div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-dvh flex flex-col justify-center px-4 py-6 sm:py-12 overflow-y-auto relative">
      {/* Ambient particles — desktop only */}
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
              opacity: 0.12,
            }}
            animate={{
              y: [0, -(Math.random() * 30 + 10), 0],
              opacity: [0.06, 0.2, 0.06],
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

      {/* Theme Toggle */}
      <div className="fixed top-4 right-4 z-50">
        <ThemeToggle />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-md lg:max-w-lg mx-auto relative z-10"
      >
        <button
          onClick={() => router.push('/')}
          className="flex items-center gap-2 text-sm ren-text-secondary hover:ren-text-primary transition-colors mb-8 font-mono group"
        >
          <ArrowLeft size={16} className="group-hover:-translate-x-1 transition-transform" />
          Volver al inicio
        </button>

        <div className="relative">
          {/* Ambient glow behind card — more intense on desktop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.8, ease: 'easeOut' }}
            className="absolute -inset-20 lg:-inset-32 rounded-full pointer-events-none"
            style={{
              background: 'radial-gradient(circle, rgba(212,168,83,0.12) 0%, transparent 70%)',
              filter: 'blur(40px)',
            }}
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.92 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5, ease: [0.25, 0.1, 0.25, 1] }}
            className="bg-[var(--ren-bg-secondary)]/30 border border-[var(--ren-border)] rounded-2xl p-8 shadow-[0_0_50px(var(--ren-shadow)] hover:shadow-[0_0_60px(var(--ren-shadow-accent)] transition-shadow duration-700 relative"
          >
          {/* Cuervo con aura */}
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.4 }}
            className="flex justify-center mb-5 relative"
          >
            {/* Aura que respira */}
            <motion.div
              className="absolute inset-0 rounded-full"
              style={{
                background: 'radial-gradient(circle, rgba(212,168,83,0.18) 0%, transparent 70%)',
                filter: 'blur(20px)',
                transform: 'scale(1.5)',
              }}
              animate={{ scale: [1.3, 1.7, 1.3], opacity: [0.35, 0.75, 0.35] }}
              transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
            />
            <div className="lg:scale-125 origin-center relative z-10">
              <CrowIcon size="xl" animate />
            </div>
          </motion.div>

          <div className="text-center mb-8">
            <h1 className="text-2xl lg:text-3xl font-bold mb-1 ren-gradient-text">Crear cuenta</h1>
            <p className="text-sm ren-text-secondary">Comienza tu experiencia con REN</p>
          </div>

          <motion.form
            onSubmit={handleSubmit}
            className="space-y-5"
            variants={stagger}
            initial="hidden"
            animate="visible"
          >
            <motion.div variants={fadeSlide} className="space-y-2">
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
                  minLength={3}
                  maxLength={32}
                  className="w-full ren-bg-primary border border-[var(--ren-border)] rounded-lg px-12 py-3 ren-text-primary text-sm focus:outline-none focus:border-[var(--accent-color)] focus:ring-2 focus:ring-[var(--accent-color)]/20 transition-all placeholder:text-[var(--ren-text-tertiary)]"
                />
              </div>
            </motion.div>

            <motion.div variants={fadeSlide} className="space-y-2">
              <label className="text-xs ren-text-secondary uppercase tracking-wider">
                Contraseña
              </label>
              <div className="relative">
                <Lock size={18} className="absolute left-4 top-1/2 -translate-y-1/2 ren-text-tertiary" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
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
            </motion.div>

            <motion.div variants={fadeSlide} className="text-xs ren-text-tertiary leading-relaxed">
              Al crear una cuenta, aceptas nuestros{' '}
              <button type="button" className="text-[var(--accent-color)] hover:text-[var(--accent-hover)] transition-colors">
                Términos de Servicio
              </button>{' '}
              y{' '}
              <button type="button" className="text-[var(--accent-color)] hover:text-[var(--accent-hover)] transition-colors">
                Política de Privacidad
              </button>
            </motion.div>

            <motion.button
              variants={fadeSlide}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              type="submit"
              disabled={isLoading}
              className="w-full py-3 bg-[var(--accent-color)] hover:bg-[var(--accent-hover)] text-[var(--ren-bg-primary)] font-semibold rounded-lg transition-all shadow-[0_0_20px_var(--ren-shadow-accent)] hover:shadow-[0_0_30px_var(--ren-shadow-accent)] disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? 'Creando cuenta...' : 'Crear cuenta'}
            </motion.button>
          </motion.form>

          {/* Divider — matching landing's style */}
          <motion.div
            initial={{ opacity: 0, scaleX: 0 }}
            animate={{ opacity: 1, scaleX: 1 }}
            transition={{ duration: 0.5, delay: 0.55, ease: [0.25, 0.1, 0.25, 1] }}
            className="h-px my-6 bg-gradient-to-r from-transparent via-[var(--ren-border)] to-transparent origin-center"
          />

          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35, delay: 0.65 }}
            className="text-center"
          >
            <p className="text-sm ren-text-secondary">
              Ya tienes cuenta?{' '}
              <button
                onClick={() => router.push('/login')}
                className="text-[var(--accent-color)] hover:text-[var(--accent-hover)] transition-colors"
              >
                Iniciar sesión
              </button>
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35, delay: 0.75 }}
            className="mt-4 text-center"
          >
            <button
              onClick={goGuest}
              className="text-xs ren-text-tertiary hover:text-[var(--accent-color)] transition-colors underline underline-offset-4"
            >
              Continuar como invitado
            </button>
          </motion.div>
        </motion.div>
        </div>
      </motion.div>
    </div>
  );
}
