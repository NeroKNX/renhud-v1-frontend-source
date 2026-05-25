'use client';

import { motion, AnimatePresence } from 'motion/react';
import { X, Plus, Zap, Check, Star, Pencil } from 'lucide-react';
import { useState, useEffect } from 'react';
import { loadTricks, saveTrickToServer, deleteTrickFromServer } from '@/lib/api';

const EMOJIS = ['🧪','🫁','📋','🩺','💊','🔬','🩸','🫀','🧠','⚕️','🔥','⚡','🎯','📝','💡','🔍','📊','🔄','🛡️','💉'];

const TRICK_COLORS = [
  { color: '#8b5cf6', label: 'Púrpura' },
  { color: '#6366f1', label: 'Índigo' },
  { color: '#3b82f6', label: 'Azul' },
  { color: '#06b6d4', label: 'Cian' },
  { color: '#22c55e', label: 'Verde' },
  { color: '#84cc16', label: 'Lima' },
  { color: '#f59e0b', label: 'Ámbar' },
  { color: '#f97316', label: 'Naranja' },
  { color: '#ef4444', label: 'Rojo' },
  { color: '#ec4899', label: 'Rosa' },
];

export interface TrickPrompt {
  id: string;
  name: string;
  prompt: string;
  enabled: boolean;
  quickAccess?: boolean;
  emoji?: string;
  color?: string;
}

interface TricksPanelProps {
  isOpen: boolean;
  onClose: () => void;
  isGuest?: boolean;
  userId?: string;
  onSave?: (tricks: TrickPrompt[]) => void;
}

export function TricksPanel({ isOpen, onClose, isGuest, userId, onSave }: TricksPanelProps) {
  const [tricks, setTricks] = useState<TrickPrompt[]>([]);
  const [loading, setLoading] = useState(false);
  const [creating, setCreating] = useState(false);
  const [selectedTrickId, setSelectedTrickId] = useState<string | null>(null);
  const selectedTrick = selectedTrickId ? tricks.find(trick => trick.id === selectedTrickId) ?? null : null;
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editPrompt, setEditPrompt] = useState('');
  const [editEmoji, setEditEmoji] = useState('⚡');
  const [editColor, setEditColor] = useState('#8b5cf6');
  const [newName, setNewName] = useState('');
  const [newPrompt, setNewPrompt] = useState('');
  const [newEmoji, setNewEmoji] = useState('⚡');
  const [newColor, setNewColor] = useState('#8b5cf6');

  // Load on open
  useEffect(() => {
    if (!isOpen || isGuest || !userId) return;
    loadTricks(userId).then(s => {
      if (s.length) setTricks(s);
    }).catch(() => {});
  }, [isOpen, isGuest, userId]);

  const persist = (updated: TrickPrompt[]) => {
    setTricks(updated);
    onSave?.(updated);
  };

  const handleCreate = async () => {
    if (!newName.trim() || !newPrompt.trim()) return;
    setLoading(true);
    const newTrick: TrickPrompt = {
      id: Date.now().toString(),
      name: newName.trim(),
      prompt: newPrompt.trim(),
      enabled: false,
      quickAccess: true,
      emoji: newEmoji,
      color: newColor,
    };
    await persist([...tricks, newTrick]);
    if (!isGuest && userId) await saveTrickToServer(userId, newTrick);
    setLoading(false);
    setCreating(false);
    setNewName('');
    setNewPrompt('');
    setNewEmoji('⚡');
  };

  const handleView = (trick: TrickPrompt) => {
    if (selectedTrickId === trick.id) {
      setSelectedTrickId(null);
    } else {
      setSelectedTrickId(trick.id);
      setCreating(false);
    }
  };

  const handleEdit = (trick: TrickPrompt) => {
    setEditingId(trick.id);
    setEditName(trick.name);
    setEditPrompt(trick.prompt);
    setEditEmoji(trick.emoji || '⚡');
    setEditColor(trick.color || '#8b5cf6');
    setSelectedTrickId(null);
  };

  const handleSaveEdit = async () => {
    if (!editingId || !editName.trim() || !editPrompt.trim()) return;
    const updated = tricks.map(trick =>
      trick.id === editingId ? { ...trick, name: editName.trim(), prompt: editPrompt.trim(), emoji: editEmoji, color: editColor } : trick
    );
    await persist(updated);
    const trick = updated.find(t => t.id === editingId);
    if (trick && !isGuest && userId) await saveTrickToServer(userId, trick);
    setEditingId(null);
    setEditName('');
    setEditPrompt('');
    setEditEmoji('⚡');
    setEditColor('#8b5cf6');
  };

  const handleDelete = async (id: string) => {
    const updated = tricks.filter(trick => trick.id !== id);
    await persist(updated);
    if (!isGuest && userId) await deleteTrickFromServer(userId, id).catch(() => {});
    if (selectedTrickId === id) setSelectedTrickId(null);
  };

  const handleToggleQuick = (id: string) => {
    const updated = tricks.map(trick =>
      trick.id === id ? { ...trick, quickAccess: !trick.quickAccess } : trick
    );
    persist(updated);
    const updatedTrick = updated.find(t => t.id === id);
    if (updatedTrick && !isGuest && userId) saveTrickToServer(userId, updatedTrick).catch(() => {});
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
            className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[90%] max-w-md z-50 rounded-xl border border-[var(--ren-border)] ren-bg-primary shadow-2xl overflow-hidden"
          >
            <div className="flex items-center justify-between px-5 py-4 border-b border-[var(--ren-border)]">
              <div className="flex items-center gap-2">
                <Zap size={18} className="text-[var(--accent-color)]" />
                <h2 className="text-lg font-mono text-[var(--ren-text-primary)]">Mis Tricks</h2>
              </div>
              <button onClick={onClose} className="p-1.5 hover:bg-[var(--ren-bg-tertiary)] rounded-lg transition-colors text-[var(--ren-text-tertiary)] hover:text-[var(--ren-text-primary)]">
                <X size={18} />
              </button>
            </div>

            <div className="px-5 pb-5 max-h-[65vh] overflow-y-auto">
              {isGuest ? (
                <p className="text-xs font-mono text-[var(--ren-text-tertiary)] mt-3 mb-4">
                  Inicia sesión para crear y guardar tus tricks.
                </p>
              ) : (
                <>
                  {tricks.length === 0 ? (
                    <p className="text-sm font-mono text-[var(--ren-text-tertiary)] mt-4 mb-4">No tienes tricks creados aún.</p>
                  ) : (
                    <div className="space-y-2 mt-4 mb-4">
                      {tricks.map(trick => (
                        editingId === trick.id ? (
                          <div key={trick.id} className="p-3 bg-[var(--ren-bg-secondary)] border border-[var(--accent-color)] rounded-lg space-y-3">
                            <p className="text-sm font-mono text-[var(--ren-text-primary)]">Icono</p>
                            <div className="flex flex-wrap gap-1.5">
                              {EMOJIS.map(e => (
                                <button key={e} onClick={() => setEditEmoji(e)}
                                  className={`w-8 h-8 rounded-lg text-base flex items-center justify-center border transition-all ${
                                    editEmoji === e ? 'border-[var(--accent-color)] bg-[var(--accent-color)]/15' : 'border-[var(--ren-border)] ren-bg-primary hover:border-[var(--accent-color)]/50'
                                  }`}>{e}</button>
                              ))}
                            </div>
                            <p className="text-sm font-mono text-[var(--ren-text-primary)]">Color</p>
                            <div className="flex flex-wrap gap-1.5">
                              {TRICK_COLORS.map(c => (
                                <button key={c.color} onClick={() => setEditColor(c.color)} title={c.label}
                                  className={`w-7 h-7 rounded-lg border-2 transition-all ${
                                    editColor === c.color ? 'border-white scale-110' : 'border-transparent hover:scale-110'
                                  }`} style={{ background: c.color }} />
                              ))}
                            </div>
                            <p className="text-sm font-mono text-[var(--ren-text-primary)]">Nombre del trick</p>
                            <input value={editName} onChange={e => setEditName(e.target.value)}
                              className="w-full ren-bg-primary border border-[var(--ren-border)] rounded-lg px-3 py-2 text-sm font-mono text-[var(--ren-text-primary)] outline-none focus:border-[var(--accent-color)] transition-colors" />
                            <p className="text-sm font-mono text-[var(--ren-text-primary)]">Describe lo que hará tu trick</p>
                            <textarea value={editPrompt} onChange={e => setEditPrompt(e.target.value)} rows={3}
                              className="w-full ren-bg-primary border border-[var(--ren-border)] rounded-lg px-3 py-2 text-sm font-mono text-[var(--ren-text-primary)] outline-none focus:border-[var(--accent-color)] transition-colors resize-none" />
                            <div className="flex gap-2 justify-end">
                              <button onClick={() => setEditingId(null)}
                                className="px-4 py-2 text-xs font-mono text-[var(--ren-text-tertiary)] hover:text-[var(--ren-text-secondary)] transition-colors">Cancelar</button>
                              <button onClick={handleSaveEdit}
                                className="px-4 py-2 text-xs font-mono bg-[var(--accent-color)] hover:bg-[var(--accent-hover)] text-white rounded-lg transition-all flex items-center gap-1.5">
                                <Check size={14} /> Guardar
                              </button>
                            </div>
                          </div>
                        ) : (
                          <div key={trick.id} className="flex items-center justify-between p-3 bg-[var(--ren-bg-secondary)] border border-[var(--ren-border)] rounded-lg group cursor-pointer" onClick={() => !isGuest && handleView(trick)}>
                            <div className="flex items-center gap-3 min-w-0">
                              <div className="w-8 h-8 rounded-lg ren-bg-primary border flex items-center justify-center flex-shrink-0 text-base transition-colors relative" style={{ borderColor: (trick.color || '#8b5cf6') + '66' }}>
                                <div className="absolute inset-0 rounded-lg opacity-15" style={{ background: trick.color || '#8b5cf6' }} />
                                {trick.emoji || '⚡'}
                              </div>
                              <div className="min-w-0">
                                <p className="text-sm font-mono text-[var(--ren-text-primary)] truncate group-hover:text-[var(--ren-text-primary)] transition-colors">{trick.name}</p>
                                <p className="text-xs font-mono text-[var(--ren-text-tertiary)] truncate max-w-[200px]">{trick.prompt}</p>
                              </div>
                            </div>
                            <div className="flex items-center flex-shrink-0">
                              <button onClick={(e) => { e.stopPropagation(); handleToggleQuick(trick.id); }}
                                className={`p-1 rounded transition-colors ${trick.quickAccess ? 'text-amber-400 hover:text-amber-300' : 'text-[var(--ren-text-tertiary)] hover:text-[var(--ren-text-tertiary)]'}`}
                                title={trick.quickAccess ? 'En acceso rápido' : 'Ocultar de acceso rápido'}>
                                <Star size={14} className={trick.quickAccess ? 'fill-amber-400' : ''} />
                              </button>
                            </div>
                          </div>
                        )
                      ))}
                    </div>
                  )}

                  {selectedTrick && (
                    <div className="mb-4 p-4 bg-[var(--ren-bg-secondary)] border border-[var(--accent-color)]/30 rounded-lg space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="text-lg">{selectedTrick.emoji || '⚡'}</span>
                          <h3 className="text-sm font-mono text-[var(--ren-text-primary)]">{selectedTrick.name}</h3>
                        </div>

                      </div>
                      <p className="text-xs font-mono text-[var(--ren-text-tertiary)] leading-relaxed">{selectedTrick.prompt}</p>
                      <div className="flex items-center gap-2 pt-1 border-t border-[var(--ren-border)]">
                        <button onClick={() => handleEdit(selectedTrick)}
                          className="px-3 py-1.5 text-xs font-mono bg-[var(--accent-color)] hover:bg-[var(--accent-hover)] text-white rounded-lg transition-all flex items-center gap-1.5">
                          <Pencil size={12} /> Editar
                        </button>
                        <button onClick={() => handleDelete(selectedTrick.id)}
                          className="px-3 py-1.5 text-xs font-mono bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 text-red-400 rounded-lg transition-all flex items-center gap-1.5">
                          <X size={12} /> Borrar
                        </button>
                        <span className="text-[10px] font-mono text-[var(--ren-text-tertiary)] ml-auto">
                          {selectedTrick.quickAccess ? '⭐ Favorito' : ''}
                        </span>
                      </div>
                    </div>
                  )}

                  {!creating ? (
                    <button
                      onClick={() => setCreating(true)}
                      className="w-full py-3 border-2 border-dashed border-[var(--ren-border)] hover:border-[var(--accent-color)]/50 rounded-lg text-sm font-mono text-[var(--ren-text-tertiary)] hover:text-[var(--ren-text-primary)] transition-all flex items-center justify-center gap-2 hover:bg-[var(--accent-color)]/5"
                    >
                      <Plus size={16} />
                      Nuevo trick
                    </button>
                  ) : (
                    <div className="mt-2 space-y-3 bg-[var(--ren-bg-secondary)] border border-[var(--ren-border)] rounded-lg p-4">
                      <p className="text-sm font-mono text-[var(--ren-text-primary)]">Icono</p>
                      <div className="flex flex-wrap gap-1.5">
                        {EMOJIS.map(e => (
                          <button key={e} onClick={() => setNewEmoji(e)}
                            className={`w-8 h-8 rounded-lg text-base flex items-center justify-center border transition-all ${
                              newEmoji === e ? 'border-[var(--accent-color)] bg-[var(--accent-color)]/15' : 'border-[var(--ren-border)] ren-bg-primary hover:border-[var(--accent-color)]/50'
                            }`}
                          >{e}</button>
                        ))}
                      </div>
                      <p className="text-sm font-mono text-[var(--ren-text-primary)]">Color</p>
                      <div className="flex flex-wrap gap-1.5">
                        {TRICK_COLORS.map(c => (
                          <button key={c.color} onClick={() => setNewColor(c.color)} title={c.label}
                            className={`w-7 h-7 rounded-lg border-2 transition-all ${
                              newColor === c.color ? 'border-white scale-110' : 'border-transparent hover:scale-110'
                            }`} style={{ background: c.color }} />
                        ))}
                      </div>
                      <p className="text-sm font-mono text-[var(--ren-text-primary)]">Nombre del trick</p>
                      <input value={newName} onChange={e => setNewName(e.target.value)}
                        placeholder="Ej: Análisis de gases" autoFocus
                        className="w-full ren-bg-primary border border-[var(--ren-border)] rounded-lg px-3 py-2 text-sm font-mono text-[var(--ren-text-primary)] outline-none focus:border-[var(--accent-color)] transition-colors placeholder:text-[var(--ren-text-tertiary)]" />
                      <p className="text-sm font-mono text-[var(--ren-text-primary)]">Describe lo que hará tu trick</p>
                      <textarea value={newPrompt} onChange={e => setNewPrompt(e.target.value)}
                        placeholder="Ej: Analiza los siguientes gases arteriales y venosos..." rows={3}
                        className="w-full ren-bg-primary border border-[var(--ren-border)] rounded-lg px-3 py-2 text-sm font-mono text-[var(--ren-text-primary)] outline-none focus:border-[var(--accent-color)] transition-colors resize-none placeholder:text-[var(--ren-text-tertiary)]" />
                      <div className="flex gap-2 justify-end pt-1">
                        <button onClick={() => { setCreating(false); setNewName(''); setNewPrompt(''); setNewEmoji('⚡'); setNewColor('#8b5cf6'); }}
                          className="px-4 py-2 text-xs font-mono text-[var(--ren-text-tertiary)] hover:text-[var(--ren-text-secondary)] transition-colors">Cancelar</button>
                        <button onClick={handleCreate} disabled={loading || !newName.trim() || !newPrompt.trim()}
                          className="px-4 py-2 text-xs font-mono bg-[var(--accent-color)] hover:bg-[var(--accent-hover)] text-white rounded-lg transition-all disabled:opacity-50 flex items-center gap-1.5">
                          <Check size={14} /> Guardar
                        </button>
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
