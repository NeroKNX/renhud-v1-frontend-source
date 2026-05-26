import type { ModelType } from './model-config';

export interface TrickInfo {
  id: string;
  name: string;
  emoji: string;
  color: string;
}

export interface Message {
  id: string;
  text: string;
  isUser: boolean;
  timestamp: string;
  model?: ModelType;
  isDeep?: boolean;
  isError?: boolean;
  activeTrick?: TrickInfo;
  files?: { name: string; type: string; data: string }[];
}

export interface ChatSession {
  id: string;
  title: string;
  messages: Message[];
  createdAt: string;
  updatedAt: string;
  isFavorite?: boolean;
  parentId?: string;
}

const CACHE_KEY = 'ren_sessions_cache';
let localCache: ChatSession[] | null = null;

function readCache(): ChatSession[] {
  if (typeof window === 'undefined') return [];
  if (localCache) return localCache;
  try {
    const raw = sessionStorage.getItem(CACHE_KEY);
    localCache = raw ? JSON.parse(raw) : [];
  } catch { localCache = []; }
  return localCache;
}

function writeCache(sessions: ChatSession[]): void {
  if (typeof window === 'undefined') return;
  localCache = sessions;
  try {
    sessionStorage.setItem(CACHE_KEY, JSON.stringify(sessions));
  } catch {}
}

/**
 * SessionManager — ahora es SOLO cache de sessionStorage.
 * 
 * La fuente de verdad es el SERVIDOR. El cache existe para:
 * 1. Mostrar la UI instantáneamente al cargar (mientras se espera la API)
 * 2. Recordar la sesión activa entre recargas
 * 
 * NUNCA decidir qué mostrar basado en el cache.
 * NUNCA ignorar datos del servidor porque el cache existe.
 */
export class SessionManager {
  /** Leer todas las sesiones del cache local */
  static getAllSessions(): ChatSession[] {
    return readCache().filter(s => !s.id.includes('_'));
  }

  /** Leer una sesión específica del cache local */
  static getSession(sessionId: string): ChatSession | null {
    return readCache().find(s => s.id === sessionId) || null;
  }

  /** Obtener ID de sesión activa desde sessionStorage */
  static getCurrentSessionId(): string | null {
    if (typeof window === 'undefined') return null;
    return sessionStorage.getItem('ren_current_session');
  }

  /** Guardar ID de sesión activa */
  static setCurrentSessionId(id: string): void {
    if (typeof window === 'undefined') return;
    sessionStorage.setItem('ren_current_session', id);
  }

  /** Sobrescribir cache completo desde datos del servidor */
  static setFromServer(sessions: ChatSession[]): void {
    writeCache(sessions);
  }

  /** Actualizar una sesión en cache (después de recibir confirmación del servidor) */
  static updateSessionInCache(sessionId: string, messages: Message[]): void {
    const sessions = readCache();
    const idx = sessions.findIndex(s => s.id === sessionId);
    if (idx === -1) return;

    sessions[idx].messages = messages;
    sessions[idx].updatedAt = new Date().toISOString();
    const first = messages.find(m => m.isUser);
    if (first && sessions[idx].title === 'Nueva conversación') {
      sessions[idx].title = first.text.slice(0, 50) + (first.text.length > 50 ? '...' : '');
    }
    writeCache(sessions);
  }

  /** Remover una sesión del cache (después de confirmación del servidor) */
  static removeSessionFromCache(sessionId: string): void {
    const sessions = readCache().filter(s => s.id !== sessionId);
    writeCache(sessions);
    if (SessionManager.getCurrentSessionId() === sessionId) {
      if (typeof window !== 'undefined') {
        sessionStorage.removeItem('ren_current_session');
      }
    }
  }

  /** Actualizar título en cache */
  static updateTitleInCache(sessionId: string, title: string): void {
    const sessions = readCache();
    const idx = sessions.findIndex(s => s.id === sessionId);
    if (idx !== -1) {
      sessions[idx].title = title;
      writeCache(sessions);
    }
  }

  /** Toggle favorite en cache */
  static toggleFavoriteInCache(sessionId: string): boolean {
    const sessions = readCache();
    const idx = sessions.findIndex(s => s.id === sessionId);
    if (idx === -1) return false;
    sessions[idx].isFavorite = !sessions[idx].isFavorite;
    writeCache(sessions);
    return sessions[idx].isFavorite || false;
  }

  /** Añadir una sesión nueva al cache (después de crear en servidor) */
  static addSessionToCache(session: ChatSession): void {
    const sessions = readCache();
    sessions.unshift(session);
    writeCache(sessions);
    SessionManager.setCurrentSessionId(session.id);
  }

  /** Limpiar cache local */
  static clearAllLocal(): void {
    localCache = null;
    if (typeof window !== 'undefined') {
      sessionStorage.removeItem(CACHE_KEY);
    }
  }

  /** Logout — limpia TODO */
  static logout(): void {
    SessionManager.clearAllLocal();
    if (typeof window !== 'undefined') {
      sessionStorage.removeItem('ren_current_session');
      sessionStorage.removeItem('ren_guest');
    }
  }
}
