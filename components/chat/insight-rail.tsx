'use client';

import { Brain, Zap, Calculator, Settings, Download, User, StickyNote, Star } from 'lucide-react';
import type { TrickPrompt } from '@/components/chat/tricks-panel';

interface InsightRailProps {
  messageCount: number;
  sessionCount: number;
  tricks: TrickPrompt[];
  isFavorite: boolean;
  isConnected: boolean;
  isGuest?: boolean;
  userId?: string;
  onOpenTricks: () => void;
  onOpenSettings: () => void;
  onOpenProfile: () => void;
  onExport: () => void;
  onNavigate: (path: string) => void;
  canExport: boolean;
}

export function InsightRail({
  messageCount,
  sessionCount,
  tricks,
  isFavorite,
  isConnected,
  isGuest,
  userId,
  onOpenTricks,
  onOpenSettings,
  onOpenProfile,
  onExport,
  onNavigate,
  canExport,
}: InsightRailProps) {
  const activeTricks = tricks.filter((t) => t.enabled);

  const stats = [
    { label: 'MENSAJES', value: messageCount },
    { label: 'SESIONES', value: sessionCount },
    { label: 'TRICKS', value: tricks.length },
  ];

  return (
    <aside className="hidden xl:flex flex-col w-[290px] shrink-0 border-l border-[var(--ren-border)] bg-[var(--ren-bg-secondary)]">
      {/* Header */}
      <div className="h-14 px-4 flex items-center justify-between border-b border-[var(--ren-border)] shrink-0">
        <span className="ren-spec-label">PANEL COGNITIVO</span>
        <span className="flex items-center gap-1.5 ren-spec-label">
          <span className={`inline-block w-1.5 h-1.5 rounded-full ${isConnected ? 'bg-[var(--accent-secondary)]' : 'bg-[var(--accent-warning)]'}`} />
          {isConnected ? 'EN LÍNEA' : 'OFFLINE'}
        </span>
      </div>

      <div className="flex-1 overflow-y-auto ren-scrollbar p-4 space-y-6">
        {/* Stats grid */}
        <div>
          <p className="ren-spec-label mb-3">[ MÉTRICAS · SESIÓN ]</p>
          <div className="grid grid-cols-3 gap-px bg-[var(--ren-border)] border border-[var(--ren-border)]">
            {stats.map((s) => (
              <div key={s.label} className="bg-[var(--ren-bg-primary)] p-3 text-center">
                <p className="font-mono text-2xl font-semibold text-[var(--ren-text-primary)] tabular-nums">{s.value}</p>
                <p className="ren-spec-label mt-1" style={{ fontSize: 9 }}>{s.label}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="ren-rule" />

        {/* Active tricks */}
        <div>
          <p className="ren-spec-label mb-3 flex items-center gap-1.5">
            <Zap size={11} className="text-[var(--accent-color)]" />
            TRICKS ACTIVOS
          </p>
          {activeTricks.length === 0 ? (
            <button
              onClick={onOpenTricks}
              className="ren-btn-outline w-full py-2.5 text-xs flex items-center justify-center gap-2"
            >
              <Brain size={13} />
              ACTIVAR UN TRICK
            </button>
          ) : (
            <ul className="space-y-1.5">
              {activeTricks.map((t) => (
                <li
                  key={t.id}
                  className="flex items-center gap-2 px-3 py-2 rounded-[2px] border border-[var(--accent-color)]/40 bg-[var(--accent-muted)]"
                >
                  <span className="text-sm leading-none">{t.emoji || '⚡'}</span>
                  <span className="text-xs font-mono text-[var(--accent-hover)] truncate">{t.name}</span>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="ren-rule" />

        {/* Quick actions */}
        <div>
          <p className="ren-spec-label mb-3">[ INSTRUMENTOS ]</p>
          <div className="space-y-px">
            <RailAction icon={<Calculator size={14} />} label="Scores clínicos" onClick={() => onNavigate('/calculators')} />
            <RailAction icon={<Brain size={14} />} label="Biblioteca de tricks" onClick={onOpenTricks} />
            {!isGuest && (
              <RailAction
                icon={userId === 'nero' ? <StickyNote size={14} /> : <User size={14} />}
                label={userId === 'nero' ? 'Pensamientos' : 'Perfil'}
                onClick={onOpenProfile}
              />
            )}
            <RailAction icon={<Settings size={14} />} label="Configuración" onClick={onOpenSettings} />
            <RailAction icon={<Download size={14} />} label="Exportar sesión" onClick={onExport} disabled={!canExport} />
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="p-3 border-t border-[var(--ren-border)] shrink-0 flex items-center justify-between">
        <span className="ren-spec-label">ESTADO</span>
        <span className="flex items-center gap-1.5 ren-spec-label">
          <Star size={11} className={isFavorite ? 'text-[var(--accent-color)] fill-[var(--accent-color)]' : 'text-[var(--ren-text-tertiary)]'} />
          {isFavorite ? 'DESTACADA' : 'ESTÁNDAR'}
        </span>
      </div>
    </aside>
  );
}

function RailAction({
  icon,
  label,
  onClick,
  disabled,
}: {
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className="group w-full flex items-center gap-3 px-3 py-2.5 rounded-[2px] border border-transparent hover:border-[var(--ren-border)] hover:bg-[var(--ren-bg-tertiary)] transition-all text-left disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-transparent disabled:hover:border-transparent"
    >
      <span className="text-[var(--ren-text-tertiary)] group-hover:text-[var(--accent-hover)] transition-colors shrink-0">{icon}</span>
      <span className="text-xs text-[var(--ren-text-secondary)] group-hover:text-[var(--ren-text-primary)] transition-colors">{label}</span>
    </button>
  );
}
