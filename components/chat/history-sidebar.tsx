'use client';

import { motion, AnimatePresence } from 'motion/react';
import { X, MessageSquare, Trash2, Edit2, Search, Star, UserPlus, CheckSquare, Square, Trash, ChevronDown, ChevronRight } from 'lucide-react';
import { useState, useCallback, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import type { ChatSession } from '@/lib/session-manager';
import { formatDistanceToNow, isToday, isYesterday, differenceInCalendarDays } from 'date-fns';
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

function getDateGroup(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();

  if (isToday(date)) return 'Hoy';
  if (isYesterday(date)) return 'Ayer';
  if (differenceInCalendarDays(now, date) <= 7) return 'Esta semana';
  if (differenceInCalendarDays(now, date) <= 30) return 'Este mes';
  return 'Más antiguo';
}

export function HistorySidebar({ isOpen, onClose, currentSessionId, refreshTrigger, onSelectSession, isGuest, sessions, onDeleteSession, onRenameSession }: HistorySidebarProps) {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState('');

  // ── Modo selección múltiple ──
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // ── Filter tabs ──
  const [filterTab, setFilterTab] = useState<'all' | 'favorites' | 'tricks'>('all');

  // ── Parent expand/collapse ──
  const [expandedParents, setExpandedParents] = useState<Set<string>>(new Set());

  const toggleExpand = (parentId: string) => {
    setExpandedParents(prev => {
      const next = new Set(prev);
      if (next.has(parentId)) next.delete(parentId);
      else next.add(parentId);
      return next;
    });
  };

  // Salir de selección al cerrar
  useEffect(() => {
    if (!isOpen) {
      setSelectionMode(false);
      setSelectedIds(new Set());
    }
  }, [isOpen]);

  // Separar padres e hijos
  const filteredSessions = sessions
    .filter(s => {
      // Filtro por pestaña
      if (filterTab === 'favorites' && !s.isFavorite) return false;
      if (filterTab === 'tricks') {
        const lastMsg = s.messages[s.messages.length - 1];
        if (!lastMsg?.activeTrick) return false;
      }

      // Búsqueda
      if (searchQuery && !s.title.toLowerCase().includes(searchQuery.toLowerCase())) return false;

      return true;
    })
    .sort((a, b) => {
      if (a.isFavorite && !b.isFavorite) return -1;
      if (!a.isFavorite && b.isFavorite) return 1;
      return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
    });

  // Separar parents (sin parentId) y children (con parentId)
  const parentSessions = filteredSessions.filter(s => !s.parentId);
  const childSessions = filteredSessions.filter(s => s.parentId);

  // Build children lookup: parentId → child sessions
  const childrenByParent: Record<string, ChatSession[]> = {};
  for (const child of childSessions) {
    const pid = child.parentId!;
    if (!childrenByParent[pid]) childrenByParent[pid] = [];
    childrenByParent[pid].push(child);
  }

  // Agrupar PADRES por fecha (los hijos se renderizan anidados debajo de su padre)
  const groupOrder = ['Hoy', 'Ayer', 'Esta semana', 'Este mes', 'Más antiguo'];
  const groupedSessions: Record<string, ChatSession[]> = {};
  for (const session of parentSessions) {
    const group = getDateGroup(session.updatedAt);
    if (!groupedSessions[group]) groupedSessions[group] = [];
    groupedSessions[group].push(session);
  }

  const handleSelectSession = (sessionId: string) => {
    if (selectionMode) return;
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
  };

  // ── Delete individual ──
  const handleDeleteClick = (sessionId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    if (selectionMode) {
      toggleSelection(sessionId, e);
      return;
    }
    onDeleteSession(sessionId);
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

  // ── Batch delete simplificado ──
  const handleBatchDelete = () => {
    if (selectedIds.size === 0) return;
    selectedIds.forEach(id => onDeleteSession(id));
    setSelectedIds(new Set());
    setSelectionMode(false);
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
                      {selectedIds.size > 0 && (
                        <button onClick={handleBatchDelete}
                          className="p-2 text-xs font-mono text-red-400 hover:bg-red-500/15 rounded-lg transition-colors flex items-center gap-1">
                          <Trash size={14} />
                          Eliminar
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

              {/* Filter tabs */}
              <div className="flex gap-1 mb-3">
                {(['all', 'favorites', 'tricks'] as const).map(tab => (
                  <button
                    key={tab}
                    onClick={() => setFilterTab(tab)}
                    className={`px-3 py-1.5 text-xs font-mono rounded-lg transition-all ${
                      filterTab === tab
                        ? 'bg-[var(--accent-color)]/15 text-[var(--accent-color)] border border-[var(--accent-color)]/30'
                        : 'text-[var(--ren-text-tertiary)] hover:text-[var(--ren-text-secondary)] hover:bg-[var(--ren-bg-tertiary)]'
                    }`}
                  >
                    {tab === 'all' ? 'Todos' : tab === 'favorites' ? 'Favoritos ★' : 'Con tricks ⚡'}
                  </button>
                ))}
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
              {filteredSessions.length === 0 ? (
                <div className="text-center py-12 px-4">
                  <MessageSquare size={48} className="mx-auto text-[var(--ren-text-tertiary)] mb-3" />
                  <p className="text-sm text-[var(--ren-text-tertiary)] font-mono">
                    {searchQuery ? 'No se encontraron conversaciones' : 'No hay conversaciones aún'}
                  </p>
                </div>
              ) : (
                groupOrder.map(group => {
                  const groupSessions = groupedSessions[group];
                  if (!groupSessions || groupSessions.length === 0) return null;
                  return (
                    <div key={group}>
                      <div className="text-[11px] font-mono text-[var(--ren-text-tertiary)] uppercase tracking-wider px-1 py-2">
                        {group}
                      </div>
                      {groupSessions.map(session => {
                        const isParent = childrenByParent[session.id] !== undefined;
                        const hasChildren = isParent && childrenByParent[session.id].length > 0;
                        const isExpanded = expandedParents.has(session.id);
                        const children = hasChildren ? childrenByParent[session.id] : [];
                        const lastMessage = session.messages[session.messages.length - 1];
                        const trickEmoji = lastMessage?.activeTrick?.emoji;

                        return (
                          <div key={session.id} className="space-y-1">
                            <motion.div
                              initial={{ opacity: 0, x: -20 }}
                              animate={{ opacity: 1, x: 0 }}
                              layout
                              className={`group relative p-3 rounded-lg border transition-all cursor-pointer ${
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
                                      {/* Expand/collapse toggle for parent sessions */}
                                      {hasChildren && !selectionMode && (
                                        <button
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            e.preventDefault();
                                            toggleExpand(session.id);
                                          }}
                                          className="flex-shrink-0 mt-0.5 p-0.5 hover:bg-[var(--ren-bg-tertiary)] rounded transition-colors"
                                        >
                                          {isExpanded ? (
                                            <ChevronDown size={14} className="text-[var(--ren-text-tertiary)]" />
                                          ) : (
                                            <ChevronRight size={14} className="text-[var(--ren-text-tertiary)]" />
                                          )}
                                        </button>
                                      )}
                                      {/* Checkbox en modo selección */}
                                      {selectionMode && (
                                        <button
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            toggleSelection(session.id, e);
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
                                      {hasChildren && !selectionMode && (
                                        <span className="flex-shrink-0 mt-0.5 text-xs text-[var(--ren-text-tertiary)] font-mono">
                                          {children.length}
                                        </span>
                                      )}
                                      {session.isFavorite && (
                                        <Star size={14} className="text-yellow-400 fill-yellow-400 flex-shrink-0 mt-0.5" />
                                      )}
                                      {trickEmoji && (
                                        <span className="flex-shrink-0 mt-0.5 text-sm leading-none">{trickEmoji}</span>
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
                                          onClick={(e) => { handleDeleteClick(session.id, e); }}
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
                                </>
                              )}
                              </a>
                            </motion.div>

                            {/* Nested child sessions */}
                            {hasChildren && isExpanded && (
                              <div className="ml-4 space-y-1 border-l-2 border-[var(--ren-border)] pl-3">
                                {children.map(child => {
                                  const childLastMsg = child.messages[child.messages.length - 1];
                                  const childTrickEmoji = childLastMsg?.activeTrick?.emoji;
                                  return (
                                    <motion.div
                                      key={child.id}
                                      initial={{ opacity: 0, y: -8 }}
                                      animate={{ opacity: 1, y: 0 }}
                                      layout
                                      className={`group relative p-2.5 rounded-lg border transition-all cursor-pointer text-sm ${
                                        selectedIds.has(child.id)
                                          ? 'bg-[var(--accent-color)]/15 border-[var(--accent-color)]/60'
                                          : currentSessionId === child.id
                                            ? 'bg-[var(--ren-bg-tertiary)] border-[var(--accent-color)]/50'
                                            : 'ren-bg-primary border-[var(--ren-border)] hover:border-[var(--accent-color)]/30 hover:bg-[var(--ren-bg-tertiary)]'
                                      }`}
                                    >
                                      <a
                                        href={`/chat?session=${child.id}`}
                                        onClick={(e) => {
                                          if (selectionMode) {
                                            e.preventDefault();
                                            toggleSelection(child.id, e);
                                            return;
                                          }
                                          if (e.ctrlKey || e.metaKey || e.button === 1) return;
                                          e.preventDefault();
                                          handleSelectSession(child.id);
                                        }}
                                        className="block w-full"
                                        style={{ textDecoration: 'none', color: 'inherit' }}
                                      >
                                        <div className="flex items-start justify-between gap-2">
                                          <div className="flex items-start gap-2 flex-1 min-w-0">
                                            {selectionMode && (
                                              <button
                                                onClick={(e) => { e.stopPropagation(); toggleSelection(child.id, e); }}
                                                className="flex-shrink-0 mt-0.5"
                                              >
                                                {selectedIds.has(child.id) ? (
                                                  <CheckSquare size={14} className="text-[var(--accent-color)]" />
                                                ) : (
                                                  <Square size={14} className="text-[var(--ren-text-tertiary)]" />
                                                )}
                                              </button>
                                            )}
                                            {childTrickEmoji && (
                                              <span className="flex-shrink-0 mt-0.5 text-xs leading-none">{childTrickEmoji}</span>
                                            )}
                                            <h4 className="text-xs font-mono text-[var(--ren-text-primary)] line-clamp-1 flex-1">
                                              {child.title}
                                            </h4>
                                          </div>
                                          {!selectionMode && (
                                            <button
                                              onClick={(e) => { handleDeleteClick(child.id, e); }}
                                              className="p-1 hover:bg-red-500/15 rounded transition-colors opacity-40 hover:opacity-100"
                                            >
                                              <Trash2 size={11} className="text-red-400" />
                                            </button>
                                          )}
                                        </div>
                                        <div className="flex items-center justify-between mt-1">
                                          <span className="text-[10px] text-[var(--ren-text-tertiary)] font-mono">
                                            {child.messages.length} msgs
                                          </span>
                                          <span className="text-[10px] text-[var(--ren-text-tertiary)] font-mono">
                                            {formatDistanceToNow(new Date(child.updatedAt), { addSuffix: true, locale: es })}
                                          </span>
                                        </div>
                                      </a>
                                    </motion.div>
                                  );
                                })}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  );
                })
              )}
            </div>

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
