'use client';

import { X, Volume2, VolumeX, Type, Copy, Check, Sun, Moon } from 'lucide-react';
import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { PreferencesManager, type FontSize, type ThemeMode, fontSizes } from '@/lib/preferences-manager';
import { SessionManager } from '@/lib/session-manager';
import { copyToClipboard } from '@/lib/model-config';

interface SettingsPanelProps {
  isOpen: boolean;
  onClose: () => void;
  currentSessionId: string;
}

export function SettingsPanel({ isOpen, onClose, currentSessionId }: SettingsPanelProps) {
  const [fontSize, setFontSize] = useState<FontSize>('medium');
  const [theme, setTheme] = useState<ThemeMode>('dark');
  const [soundEnabled, setSoundEnabled] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const prefs = PreferencesManager.getPreferences();
    setFontSize(prefs.fontSize);
    setTheme(prefs.theme);
    setSoundEnabled(prefs.soundEnabled);
  }, [isOpen]);

  const handleFontSizeChange = (size: FontSize) => {
    setFontSize(size);
    PreferencesManager.setFontSize(size);
    document.documentElement.style.setProperty('--base-font-size', fontSizes[size]);
  };

  const handleThemeToggle = () => {
    const newTheme: ThemeMode = theme === 'dark' ? 'light' : 'dark';
    setTheme(newTheme);
    PreferencesManager.setTheme(newTheme);
  };

  const handleSoundToggle = () => {
    const newValue = !soundEnabled;
    setSoundEnabled(newValue);
    PreferencesManager.setSoundEnabled(newValue);
    if (newValue) {
      PreferencesManager.playNotificationSound();
    }
  };

  const handleCopyConversation = async () => {
    const session = SessionManager.getSession(currentSessionId);
    if (!session) return;

    const content = `Conversación con Ren - ${session.title}\n${session.messages.map(msg => {
      const role = msg.isUser ? 'Usuario' : 'Ren';
      return `${role}: ${msg.text}`;
    }).join('\n\n')}`;

    const success = await copyToClipboard(content);
    if (success) {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40"
          />

          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ duration: 0.2 }}
            className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[90%] max-w-md bg-[var(--ren-bg-tertiary)] border border-[var(--ren-border)] rounded-2xl shadow-2xl z-50 overflow-hidden"
          >
            <div className="flex items-center justify-between px-6 py-4 border-b border-[var(--ren-border)]">
              <h2 className="text-lg font-mono text-[var(--ren-text-primary)]">Configuración</h2>
              <button
                onClick={onClose}
                className="p-1.5 hover:bg-[var(--ren-bg-tertiary)] rounded-lg transition-colors"
              >
                <X size={20} className="text-[var(--ren-text-tertiary)]" />
              </button>
            </div>

            <div className="px-6 py-4 max-h-[70vh] overflow-y-auto space-y-6">
              <div className="space-y-3">
                <label className="text-sm font-mono text-[var(--ren-text-primary)] flex items-center gap-2">
                  <Type size={16} />
                  Tamaño de fuente
                </label>
                <div className="flex gap-2">
                  {(['small', 'medium', 'large'] as FontSize[]).map((size) => (
                    <button
                      key={size}
                      onClick={() => handleFontSizeChange(size)}
                      className={`flex-1 px-4 py-2.5 rounded-lg border font-mono text-sm transition-all ${
                        fontSize === size
                          ? 'bg-[var(--accent-color)] border-[var(--accent-color)] text-white'
                          : 'ren-bg-primary border-[var(--ren-border)] text-[var(--ren-text-tertiary)] hover:border-[var(--accent-color)]/50'
                      }`}
                    >
                      {size === 'small' ? 'Pequeño' : size === 'medium' ? 'Medio' : 'Grande'}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex items-center justify-between py-2 px-3 ren-bg-primary rounded-lg border border-[var(--ren-border)]">
                <span className="text-sm font-mono text-[var(--ren-text-primary)]">Tema</span>
                <button
                  onClick={handleThemeToggle}
                  className="p-1.5 rounded-lg bg-[var(--ren-bg-tertiary)] border border-[var(--ren-border)] hover:border-[var(--accent-color)]/50 transition-all"
                  title={theme === 'dark' ? 'Cambiar a tema claro' : 'Cambiar a tema oscuro'}
                >
                  {theme === 'dark' ? (
                    <Sun size={14} className="text-yellow-400" />
                  ) : (
                    <Moon size={14} className="text-[var(--accent-hover)]" />
                  )}
                </button>
              </div>

              <div className="space-y-3">
                <label className="text-sm font-mono text-[var(--ren-text-primary)] flex items-center gap-2">
                  {soundEnabled ? <Volume2 size={16} /> : <VolumeX size={16} />}
                  Sonido de notificación
                </label>
                <button
                  onClick={handleSoundToggle}
                  className={`w-full px-4 py-2.5 rounded-lg border font-mono text-sm transition-all ${
                    soundEnabled
                      ? 'bg-[var(--accent-color)] border-[var(--accent-color)] text-white'
                      : 'ren-bg-primary border-[var(--ren-border)] text-[var(--ren-text-tertiary)] hover:border-[var(--accent-color)]/50'
                  }`}
                >
                  {soundEnabled ? 'Activado' : 'Desactivado'}
                </button>
              </div>

              <div className="border-t border-[var(--ren-border)] my-4" />

              <div className="space-y-2">
                <button
                  onClick={handleCopyConversation}
                  disabled={!currentSessionId}
                  className="w-full px-4 py-2.5 rounded-lg border border-[var(--ren-border)] ren-bg-primary text-[var(--ren-text-primary)] hover:bg-[var(--ren-bg-tertiary)] hover:border-[var(--accent-color)]/50 font-mono text-sm transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {copied ? (
                    <>
                      <Check size={16} className="text-emerald-400" />
                      <span className="text-emerald-400">Copiado!</span>
                    </>
                  ) : (
                    <>
                      <Copy size={16} />
                      Copiar conversación completa
                    </>
                  )}
                </button>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
