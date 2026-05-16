'use client';

import { motion, AnimatePresence } from 'motion/react';
import { X, Plus, Zap, Check, Star, Pencil } from 'lucide-react';
import { useState, useEffect } from 'react';
import { loadSkills, saveSkillToServer, deleteSkillFromServer } from '@/lib/api';

const EMOJIS = ['🧪','🫁','📋','🩺','💊','🔬','🩸','🫀','🧠','⚕️','🔥','⚡','🎯','📝','💡','🔍','📊','🔄','🛡️','💉'];

export interface SkillPrompt {
  id: string;
  name: string;
  prompt: string;
  enabled: boolean;
  quickAccess?: boolean;
  emoji?: string;
}

interface SkillsPanelProps {
  isOpen: boolean;
  onClose: () => void;
  isGuest?: boolean;
  userId?: string;
  onSave?: (skills: SkillPrompt[]) => void;
}

export function SkillsPanel({ isOpen, onClose, isGuest, userId, onSave }: SkillsPanelProps) {
  const [skills, setSkills] = useState<SkillPrompt[]>([]);
  const [loading, setLoading] = useState(false);
  const [creating, setCreating] = useState(false);
  const [selectedSkillId, setSelectedSkillId] = useState<string | null>(null);
  const selectedSkill = selectedSkillId ? skills.find(s => s.id === selectedSkillId) ?? null : null;
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editPrompt, setEditPrompt] = useState('');
  const [editEmoji, setEditEmoji] = useState('⚡');
  const [newName, setNewName] = useState('');
  const [newPrompt, setNewPrompt] = useState('');
  const [newEmoji, setNewEmoji] = useState('⚡');

  // Load on open
  useEffect(() => {
    if (!isOpen || isGuest || !userId) return;
    loadSkills(userId).then(s => {
      if (s.length) setSkills(s);
    }).catch(() => {});
  }, [isOpen, isGuest, userId]);

  const persist = (updated: SkillPrompt[]) => {
    setSkills(updated);
    onSave?.(updated);
  };

  const handleCreate = async () => {
    if (!newName.trim() || !newPrompt.trim()) return;
    setLoading(true);
    const newSkill: SkillPrompt = {
      id: Date.now().toString(),
      name: newName.trim(),
      prompt: newPrompt.trim(),
      enabled: false,
      quickAccess: true,
      emoji: newEmoji,
    };
    await persist([...skills, newSkill]);
    if (!isGuest && userId) await saveSkillToServer(userId, newSkill);
    setLoading(false);
    setCreating(false);
    setNewName('');
    setNewPrompt('');
    setNewEmoji('⚡');
  };

  const handleView = (skill: SkillPrompt) => {
    if (selectedSkillId === skill.id) {
      setSelectedSkillId(null);
    } else {
      setSelectedSkillId(skill.id);
      setCreating(false);
    }
  };

  const handleEdit = (skill: SkillPrompt) => {
    setEditingId(skill.id);
    setEditName(skill.name);
    setEditPrompt(skill.prompt);
    setEditEmoji(skill.emoji || '⚡');
    setSelectedSkillId(null);
  };

  const handleSaveEdit = async () => {
    if (!editingId || !editName.trim() || !editPrompt.trim()) return;
    const updated = skills.map(s =>
      s.id === editingId ? { ...s, name: editName.trim(), prompt: editPrompt.trim(), emoji: editEmoji } : s
    );
    await persist(updated);
    const skill = updated.find(s => s.id === editingId);
    if (skill && !isGuest && userId) await saveSkillToServer(userId, skill);
    setEditingId(null);
    setEditName('');
    setEditPrompt('');
    setEditEmoji('⚡');
  };

  const handleDelete = async (id: string) => {
    const updated = skills.filter(s => s.id !== id);
    await persist(updated);
    if (!isGuest && userId) await deleteSkillFromServer(userId, id).catch(() => {});
    if (selectedSkillId === id) setSelectedSkillId(null);
  };

  const handleToggleQuick = (id: string) => {
    const updated = skills.map(s =>
      s.id === id ? { ...s, quickAccess: !s.quickAccess } : s
    );
    persist(updated);
    const skill = updated.find(s => s.id === id);
    if (skill && !isGuest && userId) saveSkillToServer(userId, skill).catch(() => {});
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
            initial={{ opacity: 0, scale: 0.95, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 10 }}
            className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[90%] max-w-md z-50 rounded-xl border border-[var(--ren-border)] ren-bg-primary shadow-2xl overflow-hidden"
          >
            <div className="flex items-center justify-between px-5 py-4 border-b border-[var(--ren-border)]">
              <div className="flex items-center gap-2">
                <Zap size={18} className="text-[var(--accent-color)]" />
                <h2 className="text-lg font-mono text-[var(--ren-text-primary)]">Mis Skills</h2>
              </div>
              <button onClick={onClose} className="p-1.5 hover:bg-[var(--ren-bg-tertiary)] rounded-lg transition-colors text-[var(--ren-text-tertiary)] hover:text-[var(--ren-text-primary)]">
                <X size={18} />
              </button>
            </div>

            <div className="px-5 pb-5 max-h-[65vh] overflow-y-auto">
              {isGuest ? (
                <p className="text-xs font-mono text-[var(--ren-text-tertiary)] mt-3 mb-4">
                  Inicia sesión para crear y guardar tus skills.
                </p>
              ) : (
                <>
                  {skills.length === 0 ? (
                    <p className="text-sm font-mono text-[var(--ren-text-tertiary)] mt-4 mb-4">No tienes skills creadas aún.</p>
                  ) : (
                    <div className="space-y-2 mt-4 mb-4">
                      {skills.map(skill => (
                        editingId === skill.id ? (
                          <div key={skill.id} className="p-3 bg-[var(--ren-bg-secondary)] border border-[var(--accent-color)] rounded-lg space-y-3">
                            <p className="text-sm font-mono text-[var(--ren-text-primary)]">Icono</p>
                            <div className="flex flex-wrap gap-1.5">
                              {EMOJIS.map(e => (
                                <button key={e} onClick={() => setEditEmoji(e)}
                                  className={`w-8 h-8 rounded-lg text-base flex items-center justify-center border transition-all ${
                                    editEmoji === e ? 'border-[var(--accent-color)] bg-[var(--accent-color)]/15' : 'border-[var(--ren-border)] ren-bg-primary hover:border-[var(--accent-color)]/50'
                                  }`}>{e}</button>
                              ))}
                            </div>
                            <p className="text-sm font-mono text-[var(--ren-text-primary)]">Nombre de la skill</p>
                            <input value={editName} onChange={e => setEditName(e.target.value)}
                              className="w-full ren-bg-primary border border-[var(--ren-border)] rounded-lg px-3 py-2 text-sm font-mono text-[var(--ren-text-primary)] outline-none focus:border-[var(--accent-color)] transition-colors" />
                            <p className="text-sm font-mono text-[var(--ren-text-primary)]">Describe lo que hará tu skill</p>
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
                          <div key={skill.id} className="flex items-center justify-between p-3 bg-[var(--ren-bg-secondary)] border border-[var(--ren-border)] rounded-lg group cursor-pointer" onClick={() => !isGuest && handleView(skill)}>
                            <div className="flex items-center gap-3 min-w-0">
                              <div className="w-8 h-8 rounded-lg ren-bg-primary border border-[var(--ren-border)] flex items-center justify-center flex-shrink-0 text-base hover:border-[var(--accent-color)]/50 transition-colors">
                                {skill.emoji || '⚡'}
                              </div>
                              <div className="min-w-0">
                                <p className="text-sm font-mono text-[var(--ren-text-primary)] truncate group-hover:text-[var(--ren-text-primary)] transition-colors">{skill.name}</p>
                                <p className="text-xs font-mono text-[var(--ren-text-tertiary)] truncate max-w-[200px]">{skill.prompt}</p>
                              </div>
                            </div>
                            <div className="flex items-center flex-shrink-0">
                              <button onClick={(e) => { e.stopPropagation(); handleToggleQuick(skill.id); }}
                                className={`p-1 rounded transition-colors ${skill.quickAccess ? 'text-amber-400 hover:text-amber-300' : 'text-[var(--ren-text-tertiary)] hover:text-[var(--ren-text-tertiary)]'}`}
                                title={skill.quickAccess ? 'En acceso rápido' : 'Ocultar de acceso rápido'}>
                                <Star size={14} className={skill.quickAccess ? 'fill-amber-400' : ''} />
                              </button>
                            </div>
                          </div>
                        )
                      ))}
                    </div>
                  )}

                  {selectedSkill && (
                    <div className="mb-4 p-4 bg-[var(--ren-bg-secondary)] border border-[var(--accent-color)]/30 rounded-lg space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="text-lg">{selectedSkill.emoji || '⚡'}</span>
                          <h3 className="text-sm font-mono text-[var(--ren-text-primary)]">{selectedSkill.name}</h3>
                        </div>

                      </div>
                      <p className="text-xs font-mono text-[var(--ren-text-tertiary)] leading-relaxed">{selectedSkill.prompt}</p>
                      <div className="flex items-center gap-2 pt-1 border-t border-[var(--ren-border)]">
                        <button onClick={() => handleEdit(selectedSkill)}
                          className="px-3 py-1.5 text-xs font-mono bg-[var(--accent-color)] hover:bg-[var(--accent-hover)] text-white rounded-lg transition-all flex items-center gap-1.5">
                          <Pencil size={12} /> Editar
                        </button>
                        <button onClick={() => handleDelete(selectedSkill.id)}
                          className="px-3 py-1.5 text-xs font-mono bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 text-red-400 rounded-lg transition-all flex items-center gap-1.5">
                          <X size={12} /> Borrar
                        </button>
                        <span className="text-[10px] font-mono text-[var(--ren-text-tertiary)] ml-auto">
                          {selectedSkill.quickAccess ? '⭐ Favorito' : ''}
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
                      Nueva skill
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
                      <p className="text-sm font-mono text-[var(--ren-text-primary)]">Nombre de la skill</p>
                      <input value={newName} onChange={e => setNewName(e.target.value)}
                        placeholder="Ej: Análisis de gases" autoFocus
                        className="w-full ren-bg-primary border border-[var(--ren-border)] rounded-lg px-3 py-2 text-sm font-mono text-[var(--ren-text-primary)] outline-none focus:border-[var(--accent-color)] transition-colors placeholder:text-[var(--ren-text-tertiary)]" />
                      <p className="text-sm font-mono text-[var(--ren-text-primary)]">Describe lo que hará tu skill</p>
                      <textarea value={newPrompt} onChange={e => setNewPrompt(e.target.value)}
                        placeholder="Ej: Analiza los siguientes gases arteriales y venosos..." rows={3}
                        className="w-full ren-bg-primary border border-[var(--ren-border)] rounded-lg px-3 py-2 text-sm font-mono text-[var(--ren-text-primary)] outline-none focus:border-[var(--accent-color)] transition-colors resize-none placeholder:text-[var(--ren-text-tertiary)]" />
                      <div className="flex gap-2 justify-end pt-1">
                        <button onClick={() => { setCreating(false); setNewName(''); setNewPrompt(''); setNewEmoji('⚡'); }}
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
