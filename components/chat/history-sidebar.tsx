'use client';

import { motion, AnimatePresence } from 'motion/react';
import { X, MessageSquare, Trash2, Edit2, Search, Star, UserPlus, Undo2, CheckSquare, Square, Trash } from 'lucide-react';
import { useState, useRef, useCallback, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import type { ChatSession } from '@/lib/session-manager';
import { formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale/es';

interface HistorySidebarProps {
  isOpen: boolean;
  onClose: () => void;
  currentSessionId?: string;
  refreshTrigger?: number;
  onSelectSession: (sessionId: string) => void;
  isGuest?: boolean;
  sessions: ChatSession[];
  onDeleteSession: (sessionId: string) => void;
  onRenameSession: (sessionId: string, title: string) => void;
}

export function HistorySidebar({ isOpen, onClose, currentSessionId, refreshTrigger, onSelectSession, isGuest, sessions, onDeleteSession, onRenameSession }: HistorySidebarProps) {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState('');

  // ── Modo selección múltiple ──
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [rangeStart, setRangeStart] = useState<string | null>(null);

  // Undo delete state (single delete)
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);
  const [pendingDeleteSession, setPendingDeleteSession] = useState<ChatSession | null>(null);
  const pendingTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Touch swipe state (solo en modo normal)
  const [swipingId, setSwipingId] = useState<string | null>(null);
  const [swipeX, setSwipeX] = useState(0);

  // Cleanup timer on unmount
  useEffect(() => {
    return () => {
      if (pendingTimerRef.current) clearTimeout(pendingTimerRef.current);
    };
  }, []);

  // Salir de selección al cerrar
  useEffect(() => {
    if (!isOpen) {
      setSelectionMode(false);
      setSelectedIds(new Set());
      setRangeStart(null);
    }
  }, [isOpen]);

  const filteredSessions = sessions
    .filter(session => {
      const titleMatch = (session.title || '').toLowerCase().includes(searchQuery.toLowerCase());
      return titleMatch && session.id !== pendingDeleteId;
    })
    .sort((a, b) => {
      if (a.isFavorite && !b.isFavorite) return -1;
      if (!a.isFavorite && b.isFavorite) return 1;
      return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
    });

  const handleSelectSession = (sessionId: string) => {
    if (selectionMode) return; // en selección no se navega
    if (pendingDeleteId === sessionId) return;
    onSelectSession(sessionId);
    onClose();
  };

  // ── Selección de items ──
  const toggleSelection = (sessionId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const newSet = new Set(selectedIds);
    if (newSet.has(sessionId)) {
      newSet.delete(sessionId);
    } else {
      newSet.add(sessionId);
    }
    setSelectedIds(newSet);
    setRangeStart(sessionId);
  };

  const toggleSelectionShift = (sessionId: string, e: React.MouseEvent) => {
    if (!e.shiftKey || !rangeStart) {
      toggleSelection(sessionId, e);
      return;
    }
    e.stopPropagation();
    // Shift+click: seleccionar rango entre rangeStart y sessionId
    const startIdx = filteredSessions.findIndex(s => s.id === rangeStart);
    const endIdx = filteredSessions.findIndex(s => s.id === sessionId);
    if (startIdx === -1 || endIdx === -1) {
      toggleSelection(sessionId, e);
      return;
    }
    const [from, to] = startIdx < endIdx ? [startIdx, endIdx] : [endIdx, startIdx];
    const newSet = new Set(selectedIds);
    for (let i = from; i <= to; i++) {
      newSet.add(filteredSessions[i].id);
    }
    setSelectedIds(newSet);
  };

  const selectAll = () => {
    setSelectedIds(new Set(filteredSessions.map(s => s.id)));
  };

  const deselectAll = () => {
    setSelectedIds(new Set());
  };

  // ── Batch delete ──
  const handleBatchDelete = () => {
    if (selectedIds.size === 0) return;
    selectedIds.forEach(id => onDeleteSession(id));
    setSelectedIds(new Set());
    setSelectionMode(false);
  };

  // ── Delete individual con deshacer ──
  const handleDeleteClick = (sessionId: string, session: ChatSession, e: React.MouseEvent) => {
    e.stopPropagation();
    if (selectionMode) {
      toggleSelection(sessionId, e);
      return;
    }
    if (pendingDeleteId === sessionId) return;

    if (pendingTimerRef.current) clearTimeout(pendingTimerRef.current);

    setPendingDeleteId(sessionId);
    setPendingDeleteSession(session);

    pendingTimerRef.current = setTimeout(() => {
      onDeleteSession(sessionId);
      setPendingDeleteId(null);
      setPendingDeleteSession(null);
      pendingTimerRef.current = null;
    }, 4000);
  };

  const handleUndoDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (pendingTimerRef.current) {
      clearTimeout(pendingTimerRef.current);
      pendingTimerRef.current = null;
    }
    setPendingDeleteId(null);
    setPendingDeleteSession(null);
  };

  // ── Swipe-to-delete / swipe-to-select (modo normal + selección) ──
  const touchStartX = useRef(0);
  const touchStartY = useRef(0);

  const handleTouchStart = (sessionId: string, e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
    touchStartY.current = e.touches[0].clientY;
    setSwipeX(0);
    setSwipingId(sessionId);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!swipingId) return;
    const dx = e.touches[0].clientX - touchStartX.current;
    const dy = e.touches[0].clientY - touchStartY.current;
    if (Math.abs(dx) > Math.abs(dy) * 0.5) {
      const newX = Math.max(-80, Math.min(0, dx));
      setSwipeX(newX);
    }
  };

  const handleTouchEnd = (sessionId: string, session: ChatSession) => {
    if (swipeX < -50) {
      if (selectionMode) {
        // En selección: toggle checkbox en vez de eliminar
        const newSet = new Set(selectedIds);
        if (newSet.has(sessionId)) {
          newSet.delete(sessionId);
        } else {
          newSet.add(sessionId);
          setRangeStart(sessionId);
        }
        setSelectedIds(newSet);
      } else {
        const fakeEvent = { stopPropagation: () => {} } as React.MouseEvent;
        handleDeleteClick(sessionId, session, fakeEvent);
      }
    }
    setSwipingId(null);
    setSwipeX(0);
  };

  // ── Renombrar ──
  const handleStartEdit = (session: ChatSession, e: React.MouseEvent) => {
    if (selectionMode) return;
    e.stopPropagation();
    setEditingId(session.id);
    setEditTitle(session.title);
  };

  const handleSaveEdit = (sessionId: string) => {
    if (editTitle.trim()) {
      onRenameSession(sessionId, editTitle.trim());
    }
    setEditingId(null);
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setEditTitle('');
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
            initial={{ x: '-100%' }}
            animate={{ x: 0 }}
            exit={{ x: '-100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="fixed left-0 top-0 bottom-0 w-80 md:w-96 bg-[var(--ren-bg-secondary)] border-r border-[var(--ren-border)] z-50 flex flex-col" style={{ boxShadow: 'var(--ren-shadow-sidebar)' }}
          >
            {/* Header */}
            <div className="px-5 py-6 border-b border-[var(--ren-border)]">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-mono text-[var(--ren-text-primary)]">
                  {selectionMode ? (
                    <span className="flex items-center gap-2">
                      <CheckSquare size={18} className="text-[var(--accent-color)]" />
                      {selectedIds.size} seleccionad{selectedIds.size === 1 ? 'o' : 'os'}
                    </span>
                  ) : (
                    'Historial'
                  )}
                </h2>
                <div className="flex items-center gap-1">
                  {selectionMode ? (
                    <>
                      {selectedIds.size === filteredSessions.length ? (
                        <button onClick={deselectAll}
                          className="p-2 text-xs font-mono text-[var(--ren-text-secondary)] hover:text-[var(--ren-text-primary)] transition-colors">
                          Deseleccionar todo
                        </button>
                      ) : (
                        <button onClick={selectAll}
                          className="p-2 text-xs font-mono text-[var(--ren-text-secondary)] hover:text-[var(--ren-text-primary)] transition-colors">
                          Seleccionar todo
                        </button>
                      )}
                      <button onClick={() => { setSelectionMode(false); setSelectedIds(new Set()); }}
                        className="p-2 hover:bg-[var(--ren-bg-tertiary)] rounded-lg transition-colors">
                        <X size={18} className="text-[var(--ren-text-tertiary)]" />
                      </button>
                    </>
                  ) : (
                    <>
                      <button onClick={() => setSelectionMode(true)}
                        className="p-2 text-xs font-mono text-[var(--ren-text-secondary)] hover:text-[var(--ren-text-primary)] hover:bg-[var(--ren-bg-tertiary)] rounded-lg transition-colors">
                        Seleccionar
                      </button>
                      <button onClick={onClose}
                        className="p-2 hover:bg-[var(--ren-bg-tertiary)] rounded-lg transition-colors">
                        <X size={18} className="text-[var(--ren-text-tertiary)]" />
                      </button>
                    </>
                  )}
                </div>
              </div>

              <div className="relative">
                <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--ren-text-tertiary)]" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Buscar conversaciones..."
                  className="w-full ren-bg-primary border border-[var(--ren-border)] rounded-lg pl-10 pr-4 py-2 text-sm text-[var(--ren-text-primary)] font-mono focus:outline-none focus:border-[var(--accent-color)] focus:ring-2 focus:ring-[var(--accent-color)]/20 transition-all placeholder:text-[var(--ren-text-tertiary)]"
                />
              </div>
            </div>

            {/* Lista de sesiones */}
            <div className="flex-1 overflow-y-auto px-3 py-3 space-y-2">
              {filteredSessions.length === 0 && !pendingDeleteSession ? (
                <div className="text-center py-12 px-4">
                  <MessageSquare size={48} className="mx-auto text-[var(--ren-text-tertiary)] mb-3" />
                  <p className="text-sm text-[var(--ren-text-tertiary)] font-mono">
                    {searchQuery ? 'No se encontraron conversaciones' : 'No hay conversaciones aún'}
                  </p>
                </div>
              ) : (
                <>
                {/* Sesión pendiente de eliminar — mostrar con opción de deshacer */}
                {pendingDeleteSession && (
                  <motion.div
                    key={`pending-${pendingDeleteSession.id}`}
                    initial={{ opacity: 1 }}
                    animate={{ opacity: 0.5 }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: 0.3 }}
                    className="relative p-3 rounded-lg border border-red-500/40 bg-red-500/5 overflow-hidden"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <h3 className="text-sm font-mono text-[var(--ren-text-tertiary)] line-clamp-1">
                          {pendingDeleteSession.title}
                        </h3>
                        <p className="text-[11px] font-mono text-red-400/70 mt-1">
                          Se eliminará en 4s
                        </p>
                      </div>
                      <button
                        onClick={handleUndoDelete}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-mono
                          bg-red-500/20 border border-red-500/40 text-red-400
                          hover:bg-red-500/30 hover:text-red-300 transition-all"
                      >
                        <Undo2 size={14} />
                        Deshacer
                      </button>
                    </div>
                    <motion.div
                      initial={{ width: '100%' }}
                      animate={{ width: '0%' }}
                      transition={{ duration: 4, ease: 'linear' }}
                      className="absolute bottom-0 left-0 h-0.5 bg-red-500/50"
                    />
                  </motion.div>
                )}

                {filteredSessions.map((session, idx) => (
                  <motion.div
                    key={session.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    layout
                    className={`group relative p-3 rounded-lg border transition-all cursor-pointer overflow-hidden ${
                      selectedIds.has(session.id)
                        ? 'bg-[var(--accent-color)]/15 border-[var(--accent-color)]/60 shadow-[0_0_10px_rgba(99,102,241,0.2)]'
                        : session.isFavorite
                          ? currentSessionId === session.id
                            ? 'bg-gradient-to-br from-yellow-500/10 to-[var(--ren-bg-tertiary)] border-yellow-500/50 shadow-[0_0_15px_rgba(234,179,8,0.15)]'
                            : 'bg-gradient-to-br from-yellow-500/5 to-[var(--ren-bg-primary)] border-yellow-500/30 hover:border-yellow-500/50 hover:bg-yellow-500/10 shadow-[0_0_10px_rgba(234,179,8,0.1)]'
                          : currentSessionId === session.id
                            ? 'bg-[var(--ren-bg-tertiary)] border-[var(--accent-color)]/50'
                            : 'ren-bg-primary border-[var(--ren-border)] hover:border-[var(--accent-color)]/30 hover:bg-[var(--ren-bg-tertiary)]'
                    }`}
                    onTouchStart={(e) => handleTouchStart(session.id, e)}
                    onTouchMove={handleTouchMove}
                    onTouchEnd={() => handleTouchEnd(session.id, session)}
                    style={{
                      transform: swipingId === session.id ? `translateX(${swipeX}px)` : undefined,
                      transition: swipingId === session.id ? 'none' : undefined,
                    }}
                  >
                    <a
                      href={`/chat?session=${session.id}`}
                      onClick={(e) => {
                        if (selectionMode) {
                          e.preventDefault();
                          toggleSelection(session.id, e);
                          return;
                        }
                        // Ctrl+Click / Cmd+Click / middle-click → new tab
                        if (e.ctrlKey || e.metaKey || e.button === 1) return;
                        e.preventDefault();
                        handleSelectSession(session.id);
                      }}
                      className="block w-full"
                      style={{ textDecoration: 'none', color: 'inherit' }}
                    >
                    {editingId === session.id && !selectionMode ? (
                      <div onClick={(e) => { e.stopPropagation(); e.preventDefault(); }}>
                        <input
                          type="text"
                          value={editTitle}
                          onChange={(e) => setEditTitle(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') handleSaveEdit(session.id);
                            if (e.key === 'Escape') handleCancelEdit();
                          }}
                          onBlur={() => handleSaveEdit(session.id)}
                          autoFocus
                          className="w-full bg-[var(--ren-bg-secondary)] border border-[var(--accent-color)] rounded px-2 py-1 text-sm text-[var(--ren-text-primary)] font-mono focus:outline-none"
                        />
                      </div>
                    ) : (
                      <>
                        <div className="flex items-start justify-between gap-2 mb-2">
                          <div className="flex items-start gap-2 flex-1 min-w-0">
                            {/* Checkbox en modo selección */}
                            {selectionMode && (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  toggleSelectionShift(session.id, e);
                                }}
                                className="flex-shrink-0 mt-0.5 hover:opacity-80 transition-opacity"
                              >
                                {selectedIds.has(session.id) ? (
                                  <CheckSquare size={16} className="text-[var(--accent-color)]" />
                                ) : (
                                  <Square size={16} className="text-[var(--ren-text-tertiary)]" />
                                )}
                              </button>
                            )}
                            {session.isFavorite && (
                              <Star size={14} className="text-yellow-400 fill-yellow-400 flex-shrink-0 mt-0.5" />
                            )}
                            <h3 className="text-sm font-mono text-[var(--ren-text-primary)] line-clamp-2 flex-1">
                              {session.title}
                            </h3>
                          </div>
                          {/* Botones: en selección no se muestran */}
                          {!selectionMode && (
                            <div className="flex items-center gap-1 flex-shrink-0">
                              <button
                                onClick={(e) => { e.stopPropagation(); e.preventDefault(); handleStartEdit(session, e); }}
                                className="p-1.5 hover:bg-[var(--ren-bg-tertiary)] rounded-lg transition-colors opacity-60 hover:opacity-100"
                                title="Renombrar"
                              >
                                <Edit2 size={13} className="text-[var(--ren-text-tertiary)]" />
                              </button>
                              <button
                                onClick={(e) => { e.stopPropagation(); e.preventDefault(); handleDeleteClick(session.id, session, e); }}
                                className="p-1.5 hover:bg-red-500/15 rounded-lg transition-colors opacity-60 hover:opacity-100 hover:text-red-400"
                                title="Eliminar"
                              >
                                <Trash2 size={13} className="text-[var(--ren-text-tertiary)] group-hover:text-red-400 transition-colors" />
                              </button>
                            </div>
                          )}
                        </div>
                        
                        <div className="flex items-center justify-between">
                          <span className="text-xs text-[var(--ren-text-tertiary)] font-mono">
                            {session.messages.length} mensajes
                          </span>
                          <span className="text-xs text-[var(--ren-text-tertiary)] font-mono">
                            {formatDistanceToNow(new Date(session.updatedAt), { 
                              addSuffix: true,
                              locale: es 
                            })}
                          </span>
                        </div>

                        {swipingId === session.id && swipeX < -30 && (
                          <div className="absolute right-2 top-1/2 -translate-y-1/2">
                            {selectionMode ? (
                              selectedIds.has(session.id) ? (
                                <CheckSquare size={18} className="text-[var(--accent-color)]" />
                              ) : (
                                <CheckSquare size={18} className="text-green-400" />
                              )
                            ) : (
                              <Trash2 size={18} className="text-red-400" />
                            )}
                          </div>
                        )}
                      </>
                    )}
                    </a>
                  </motion.div>
                ))}
                </>
              )}
            </div>

            {/* ── Floating bar para batch delete ── */}
            <AnimatePresence>
              {selectionMode && selectedIds.size > 0 && (
                <motion.div
                  initial={{ y: 80, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  exit={{ y: 80, opacity: 0 }}
                  transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                  className="absolute bottom-0 left-0 right-0 p-4 z-20"
                  style={{
                    background: 'linear-gradient(to top, var(--ren-bg-secondary) 60%, transparent)',
                    pointerEvents: 'none',
                  }}
                >
                  <button
                    onClick={handleBatchDelete}
                    className="w-full flex items-center justify-center gap-2 py-3 rounded-xl font-mono text-sm font-semibold border transition-all"
                    style={{
                      background: 'linear-gradient(135deg, rgba(239,68,68,0.2), rgba(220,38,38,0.15))',
                      borderColor: 'rgba(239,68,68,0.5)',
                      color: '#fca5a5',
                      pointerEvents: 'auto',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = 'linear-gradient(135deg, rgba(239,68,68,0.3), rgba(220,38,38,0.25))';
                      e.currentTarget.style.borderColor = 'rgba(239,68,68,0.7)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = 'linear-gradient(135deg, rgba(239,68,68,0.2), rgba(220,38,38,0.15))';
                      e.currentTarget.style.borderColor = 'rgba(239,68,68,0.5)';
                    }}
                  >
                    <Trash size={16} />
                    Eliminar {selectedIds.size} conversacion{selectedIds.size !== 1 ? 'es' : ''}
                  </button>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Invitado: call to action */}
            {!selectionMode && isGuest && filteredSessions.length > 0 && (
              <div className="px-3 py-3 sticky bottom-0 bg-gradient-to-t from-[var(--ren-bg-secondary)] via-[var(--ren-bg-secondary)] to-transparent mt-2">
                <div className="p-3 bg-[var(--accent-color)]/8 border border-[var(--accent-color)]/20 rounded-lg text-center">
                  <p className="text-xs font-mono text-[var(--ren-text-tertiary)] mb-2 leading-relaxed">
                    Crea una cuenta para guardar tus chats y personalizar tu experiencia.
                  </p>
                  <button
                    onClick={() => { router.push('/register'); onClose(); }}
                    className="w-full py-2 bg-[var(--accent-color)] hover:bg-[var(--accent-hover)] text-white font-mono text-xs rounded-lg transition-all flex items-center justify-center gap-1.5"
                  >
                    <UserPlus size={14} />
                    Crear cuenta
                  </button>
                </div>
              </div>
            )}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
