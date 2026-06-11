'use client';

import { Plus, Search, Star, MessageSquare } from 'lucide-react';
import { useState, useEffect } from 'react';
import type { ChatSession } from '@/lib/session-manager';

interface SessionRailProps {
  sessions: ChatSession[];
  currentSessionId?: string;
  onSelectSession: (sessionId: string) => void;
  onNewSession: () => void;
  isGuest?: boolean;
  userName?: string;
}

export function SessionRail({
  sessions,
  currentSessionId,
  onSelectSession,
  onNewSession,
  isGuest,
  userName,
}: SessionRailProps) {
  const [query, setQuery] = useState('');
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const filtered = sessions
    .filter((s) => !s.parentId)
    .filter((s) => !query || s.title.toLowerCase().includes(query.toLowerCase()))
    .sort((a, b) => {
      if (a.isFavorite && !b.isFavorite) return -1;
      if (!a.isFavorite && b.isFavorite) return 1;
      return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
    });

  return (
    <aside className="hidden lg:flex flex-col w-[270px] shrink-0 border-r border-[var(--ren-border)] bg-[var(--ren-bg-secondary)]">
      {/* Brand */}
      <div className="h-14 px-4 flex items-center gap-2.5 border-b border-[var(--ren-border)] shrink-0">
        <span className="font-mono text-sm tracking-[0.2em] text-[var(--ren-text-primary)]">REN</span>
        <span className="text-[var(--ren-border)]">/</span>
        <span className="ren-spec-label">SESIONES</span>
      </div>

      {/* New + search */}
      <div className="p-3 border-b border-[var(--ren-border)] space-y-3 shrink-0">
        <button
          onClick={onNewSession}
          className="ren-btn-sharp w-full py-2.5 text-xs flex items-center justify-center gap-2"
        >
          <Plus size={14} />
          NUEVA CONVERSACIÓN
        </button>
        <div className="relative">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--ren-text-tertiary)]" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="buscar…"
            className="w-full bg-[var(--ren-bg-primary)] border border-[var(--ren-border)] rounded-[2px] pl-9 pr-3 py-2 text-xs text-[var(--ren-text-primary)] font-mono focus:outline-none focus:border-[var(--accent-color)] transition-colors placeholder:text-[var(--ren-text-tertiary)]"
          />
        </div>
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto ren-scrollbar p-2">
        {filtered.length === 0 ? (
          <div className="text-center py-12 px-4">
            <MessageSquare size={32} className="mx-auto text-[var(--ren-text-tertiary)] mb-3 opacity-50" />
            <p className="ren-spec-label">{query ? 'SIN RESULTADOS' : 'SIN CONVERSACIONES'}</p>
          </div>
        ) : (
          <ul className="space-y-px">
            {filtered.map((session, i) => {
              const active = currentSessionId === session.id;
              return (
                <li key={session.id}>
                  <button
                    onClick={() => onSelectSession(session.id)}
                    className={`group w-full text-left flex items-start gap-2.5 px-3 py-2.5 rounded-[2px] border transition-all ${
                      active
                        ? 'bg-[var(--accent-muted)] border-[var(--accent-color)]/40'
                        : 'bg-transparent border-transparent hover:bg-[var(--ren-bg-tertiary)] hover:border-[var(--ren-border)]'
                    }`}
                  >
                    <span className={`font-mono text-[10px] shrink-0 mt-0.5 ${active ? 'text-[var(--accent-color)]' : 'text-[var(--ren-text-tertiary)]'}`}>
                      {String(i + 1).padStart(2, '0')}
                    </span>
                    {session.isFavorite && (
                      <Star size={11} className="text-[var(--accent-color)] fill-[var(--accent-color)] shrink-0 mt-1" />
                    )}
                    <span className={`text-xs leading-relaxed line-clamp-2 flex-1 ${active ? 'text-[var(--ren-text-primary)] font-medium' : 'text-[var(--ren-text-secondary)]'}`}>
                      {session.title}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {/* Footer user */}
      <div className="p-3 border-t border-[var(--ren-border)] shrink-0">
        <div className="ren-spec-label truncate">
          {!mounted ? '\u00A0' : isGuest ? 'SESIÓN · INVITADO' : `USUARIO · ${(userName || '').toUpperCase()}`}
        </div>
      </div>
    </aside>
  );
}
