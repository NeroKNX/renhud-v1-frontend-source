'use client';

import { X, Keyboard } from 'lucide-react';
import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';

export function KeyboardShortcutsHelp() {
  const [isOpen, setIsOpen] = useState(false);
  const [isTouchDevice, setIsTouchDevice] = useState(true);

  useEffect(() => {
    const hasHover = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
    const hasKeyboard = !('ontouchstart' in window) || navigator.maxTouchPoints === 0;
    setIsTouchDevice(!(hasHover || hasKeyboard));
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === '/') {
        e.preventDefault();
        setIsOpen(prev => !prev);
      }
      if (e.key === 'Escape' && isOpen) {
        setIsOpen(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen]);

  const shortcuts = [
    { keys: ['Ctrl', 'K'], mac: ['⌘', 'K'], description: 'Nueva sesión' },
    { keys: ['Ctrl', 'H'], mac: ['⌘', 'H'], description: 'Abrir historial' },
    { keys: ['Ctrl', 'E'], mac: ['⌘', 'E'], description: 'Exportar conversación' },
    { keys: ['Ctrl', '/'], mac: ['⌘', '/'], description: 'Mostrar atajos' },
    { keys: ['Esc'], mac: ['Esc'], description: 'Cerrar panel' },
  ];

  const isMac = typeof navigator !== 'undefined' && navigator.userAgent.includes('Mac');

  if (isTouchDevice) return null;

  return (
    <>
      <motion.button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-5 right-5 p-2.5 rounded-full z-40"
        style={{
          backgroundColor: 'var(--ren-bg-tertiary)',
          border: '1px solid var(--ren-border)',
          color: 'var(--ren-text-tertiary)',
        }}
        whileHover={{ scale: 1.08, borderColor: 'var(--accent-color)' }}
        whileTap={{ scale: 0.92 }}
        title="Atajos de teclado (Ctrl+/)"
      >
        <Keyboard size={16} />
      </motion.button>

      <AnimatePresence>
        {isOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsOpen(false)}
              className="fixed inset-0 z-50" style={{ background: 'var(--ren-overlay)', backdropFilter: 'blur(4px)' }}
            />

            <motion.div
              initial={{ opacity: 0, scale: 0.92, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.92, y: 10 }}
              transition={{ duration: 0.15 }}
              className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[90%] max-w-sm z-50 p-5 rounded-xl"
              style={{ backgroundColor: 'var(--ren-bg-secondary)', border: '1px solid var(--ren-border)' }}
            >
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <Keyboard size={16} style={{ color: 'var(--accent-color)' }} />
                  <h2 className="text-sm font-mono" style={{ color: 'var(--ren-text-primary)' }}>Atajos de teclado</h2>
                </div>
                <button onClick={() => setIsOpen(false)} className="p-1 rounded hover:bg-[var(--ren-bg-tertiary)] transition-colors">
                  <X size={14} style={{ color: 'var(--ren-text-tertiary)' }} />
                </button>
              </div>

              <div className="space-y-1.5">
                {shortcuts.map((shortcut, index) => (
                  <div key={index} className="flex items-center justify-between py-1.5 px-2.5 rounded-lg"
                    style={{ backgroundColor: 'var(--ren-bg-primary)' }}>
                    <span className="text-xs font-mono" style={{ color: 'var(--ren-text-primary)' }}>
                      {shortcut.description}
                    </span>
                    <div className="flex items-center gap-0.5">
                      {(isMac ? shortcut.mac : shortcut.keys).map((key, i) => (
                        <span key={i}>
                          <kbd className="px-1.5 py-0.5 text-[10px] font-mono rounded"
                            style={{
                              backgroundColor: 'var(--ren-bg-tertiary)',
                              color: 'var(--ren-text-primary)',
                              border: '1px solid var(--ren-border)',
                            }}
                          >{key}</kbd>
                          {i < (isMac ? shortcut.mac : shortcut.keys).length - 1 && (
                            <span className="mx-0.5" style={{ color: 'var(--ren-text-tertiary)' }}>+</span>
                          )}
                        </span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>

              <div className="mt-4 pt-3 border-t" style={{ borderColor: 'var(--ren-border)' }}>
                <p className="text-[10px] font-mono text-center" style={{ color: 'var(--ren-text-tertiary)' }}>
                  Presiona <kbd className="px-1 py-0.5 text-[10px] font-mono rounded"
                    style={{ backgroundColor: 'var(--ren-bg-tertiary)', border: '1px solid var(--ren-border)', color: 'var(--ren-text-tertiary)' }}
                  >Ctrl</kbd> + <kbd className="px-1 py-0.5 text-[10px] font-mono rounded"
                    style={{ backgroundColor: 'var(--ren-bg-tertiary)', border: '1px solid var(--ren-border)', color: 'var(--ren-text-tertiary)' }}
                  >/</kbd> para abrir
                </p>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
