'use client';

import { motion, AnimatePresence } from 'motion/react';
import { X, StickyNote, Clock, User, Save, Brain } from 'lucide-react';
import { useState, useEffect } from 'react';

interface Thought {
  text: string;
  createdAt: string;
}

interface ProfilePanelProps {
  isOpen: boolean;
  onClose: () => void;
  isGuest?: boolean;
  userId?: string;
  userName?: string;
}

export function ProfilePanel({ isOpen, onClose, isGuest, userId, userName }: ProfilePanelProps) {
  const [thoughts, setThoughts] = useState<Thought[]>([]);
  const [isNero, setIsNero] = useState(false);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  // Profile form
  const [nombre, setNombre] = useState('');
  const [area, setArea] = useState('');
  const [tono, setTono] = useState('');
  const [bio, setBio] = useState('');

  useEffect(() => {
    setIsNero(userId === 'nero');
  }, [userId]);

  // Load prefs for registered users
  useEffect(() => {
    if (!isOpen || isGuest || isNero || !userId) return;
    fetch(`/api/prefs?user_id=${userId}`)
      .then(r => r.json())
      .then(data => {
        if (data.prefs) {
          if (data.prefs.nombre) setNombre(data.prefs.nombre);
          if (data.prefs.area) setArea(data.prefs.area);
          if (data.prefs.tono) setTono(data.prefs.tono);
          if (data.prefs.bio) setBio(data.prefs.bio);
        }
      })
      .catch(() => {});
  }, [isOpen, isGuest, isNero, userId]);

  // Fetch thoughts for Nero
  useEffect(() => {
    if (!isOpen || !isNero) return;
    setLoading(true);
    fetch(`/api/notes?user_id=${userId}`)
      .then(r => r.json())
      .then(data => {
        if (data.notes) setThoughts(data.notes);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [isOpen, isNero, userId]);

  const handleDeleteThought = (index: number) => {
    if (!userId) return;
    fetch(`/api/notes/${index}?user_id=${userId}`, { method: 'DELETE' })
      .then(r => r.json())
      .then(data => {
        if (data.ok) {
          setThoughts(prev => prev.filter((_, i) => i !== index));
        }
      })
      .catch(() => {});
  };

  const handleSaveProfile = async () => {
    if (!userId) return;
    setSaving(true);
    try {
      await fetch('/api/prefs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: userId,
          prefs: { nombre, area, tono, bio },
        }),
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch {}
    setSaving(false);
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
            className="fixed inset-0 z-40" style={{ background: 'var(--ren-overlay)', backdropFilter: 'blur(4px)' }}
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 10 }}
            className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[90%] max-w-lg z-50 rounded-xl border border-[var(--ren-border)] ren-bg-primary shadow-2xl overflow-hidden"
          >
            <div className="flex items-center justify-between px-5 py-4 border-b border-[var(--ren-border)]">
              <div className="flex items-center gap-2">
                {isNero ? (
                  <StickyNote size={18} className="text-[var(--accent-hover)]" />
                ) : (
                  <User size={18} className="text-[var(--accent-color)]" />
                )}
                <h2 className="text-lg font-mono text-[var(--ren-text-primary)]">
                  {isNero ? 'Pensamientos de REN' : isGuest ? 'Acerca de ti' : 'Tu Perfil'}
                </h2>
              </div>
              <button onClick={onClose} className="p-1.5 hover:bg-[var(--ren-bg-tertiary)] rounded-lg transition-colors text-[var(--ren-text-tertiary)] hover:text-[var(--ren-text-primary)]">
                <X size={18} />
              </button>
            </div>

            <div className="p-4 max-h-[60vh] overflow-y-auto space-y-3">
              {isNero ? (
                /* --- MODO NERO: Pensamientos de REN --- */
                loading ? (
                  <div className="text-center py-12">
                    <div className="flex gap-1.5 justify-center">
                      <span className="w-2 h-2 rounded-full animate-pulse bg-[var(--accent-hover)]" />
                      <span className="w-2 h-2 rounded-full animate-pulse bg-[var(--accent-hover)]" style={{ animationDelay: '0.2s' }} />
                      <span className="w-2 h-2 rounded-full animate-pulse bg-[var(--accent-hover)]" style={{ animationDelay: '0.4s' }} />
                    </div>
                  </div>
                ) : thoughts.length === 0 ? (
                  <div className="text-center py-12">
                    <p className="text-sm font-mono text-[var(--ren-text-tertiary)]">REN aún no ha escrito nada.</p>
                    <p className="text-xs font-mono text-[var(--ren-text-tertiary)] mt-2">Cuando REN tenga un pensamiento, aparecerá aquí.</p>
                  </div>
                ) : (
                  thoughts.map((thought, index) => (
                    <div key={index} className="p-4 bg-[var(--ren-bg-secondary)] border border-[var(--ren-border)] rounded-lg group">
                      <div className="flex items-start justify-between gap-2">
                        <p className="text-sm font-mono text-[var(--ren-text-primary)] leading-relaxed flex-1">{thought.text}</p>
                        {isNero && (
                          <button onClick={() => handleDeleteThought(index)}
                            className="p-1 hover:bg-[var(--ren-bg-tertiary)] rounded transition-colors opacity-0 group-hover:opacity-100 flex-shrink-0">
                            <X size={12} className="text-[var(--ren-text-tertiary)] hover:text-red-400" />
                          </button>
                        )}
                      </div>
                      {thought.createdAt && (
                        <div className="flex items-center gap-1 mt-2">
                          <Clock size={10} className="text-[var(--ren-text-tertiary)]" />
                          <p className="text-[10px] font-mono text-[var(--ren-text-tertiary)]">
                            {new Date(thought.createdAt).toLocaleString('es-CO', {
                              day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit'
                            })}
                          </p>
                        </div>
                      )}
                    </div>
                  ))
                )
              ) : isGuest ? (
                /* --- MODO INVITADO: Prompt para registrar --- */
                <div className="text-center py-12 px-4">
                  <User size={40} className="mx-auto text-[var(--ren-text-tertiary)] mb-4" />
                  <p className="text-sm font-mono text-[var(--ren-text-tertiary)] mb-2">Cuéntanos de ti</p>
                  <p className="text-xs font-mono text-[var(--ren-text-tertiary)] leading-relaxed max-w-xs mx-auto">
                    Crea una cuenta para contarle a REN quién eres, a qué te dedicas y cómo quieres que te trate.
                  </p>
                </div>
              ) : (
                /* --- MODO USUARIO REGISTRADO: Formulario de perfil --- */
                <div className="space-y-4">
                  <div>
                    <label className="text-xs font-mono text-[var(--ren-text-tertiary)] uppercase tracking-wider block mb-1.5">Nombre</label>
                    <input type="text" value={nombre} onChange={e => setNombre(e.target.value)}
                      placeholder="Tu nombre"
                      className="w-full ren-bg-primary border border-[var(--ren-border)] rounded-lg px-3 py-2.5 text-sm font-mono text-[var(--ren-text-primary)] outline-none focus:border-[var(--accent-color)] transition-colors placeholder:text-[var(--ren-text-tertiary)]" />
                  </div>

                  <div>
                    <label className="text-xs font-mono text-[var(--ren-text-tertiary)] uppercase tracking-wider block mb-1.5">Área / Rol</label>
                    <input type="text" value={area} onChange={e => setArea(e.target.value)}
                      placeholder="Ej: Estudiante, desarrollador, docente, médico..."
                      className="w-full ren-bg-primary border border-[var(--ren-border)] rounded-lg px-3 py-2.5 text-sm font-mono text-[var(--ren-text-primary)] outline-none focus:border-[var(--accent-color)] transition-colors placeholder:text-[var(--ren-text-tertiary)]" />
                  </div>

                  <div>
                    <label className="text-xs font-mono text-[var(--ren-text-tertiary)] uppercase tracking-wider block mb-1.5">Tono preferido</label>
                    <input type="text" value={tono} onChange={e => setTono(e.target.value)}
                      placeholder="Ej: Formal, casual, técnico, directo..."
                      className="w-full ren-bg-primary border border-[var(--ren-border)] rounded-lg px-3 py-2.5 text-sm font-mono text-[var(--ren-text-primary)] outline-none focus:border-[var(--accent-color)] transition-colors placeholder:text-[var(--ren-text-tertiary)]" />
                  </div>

                  <div>
                    <label className="text-xs font-mono text-[var(--ren-text-tertiary)] uppercase tracking-wider block mb-1.5">Notas sobre ti</label>
                    <textarea value={bio} onChange={e => setBio(e.target.value)} rows={3}
                      placeholder="Cuéntale a REN sobre ti, tus intereses, lo que esperas de la conversación..."
                      className="w-full ren-bg-primary border border-[var(--ren-border)] rounded-lg px-3 py-2.5 text-sm font-mono text-[var(--ren-text-primary)] outline-none focus:border-[var(--accent-color)] transition-colors resize-none placeholder:text-[var(--ren-text-tertiary)]" />
                  </div>

                  <button onClick={handleSaveProfile} disabled={saving}
                    className="w-full py-2.5 bg-[var(--accent-color)] hover:bg-[var(--accent-hover)] text-white font-mono text-sm rounded-lg transition-all flex items-center justify-center gap-2 disabled:opacity-50">
                    {saving ? 'Guardando...' : saved ? '✅ Guardado' : <><Save size={14} /> Guardar perfil</>}
                  </button>
                </div>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
