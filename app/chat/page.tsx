'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Settings, Star, History, Plus, User, Download, ArrowLeft, Brain, StickyNote, Zap } from 'lucide-react';
import { CrowIcon } from '@/components/ui/crow-icon';
import { ChatMessage } from '@/components/chat/chat-message';
import { TypingIndicator } from '@/components/chat/typing-indicator';
import { ChatInput } from '@/components/chat/chat-input';
import { EmptyState } from '@/components/chat/empty-state';
import { HistorySidebar } from '@/components/chat/history-sidebar';
import { SettingsPanel } from '@/components/chat/settings-panel';
import { SkillsPanel, type SkillPrompt } from '@/components/chat/skills-panel';
import { ProfilePanel } from '@/components/chat/profile-panel';
import { KeyboardShortcutsHelp } from '@/components/chat/keyboard-shortcuts-help';
import { SkeletonLoader } from '@/components/chat/skeleton-loader';
import { SessionManager, type Message, type ChatSession } from '@/lib/session-manager';
import { PreferencesManager, fontSizes } from '@/lib/preferences-manager';
import type { ModelType } from '@/lib/model-config';
import { sendMessage } from '@/lib/api';
import * as api from '@/lib/api';

export default function ChatPage() {
  const router = useRouter();
  const [messages, setMessages] = useState<Message[]>([]);
  const [isTyping, setIsTyping] = useState(false);
  const [streamingMsg, setStreamingMsg] = useState<Message | null>(null);
  const [currentSessionId, setCurrentSessionId] = useState<string>('');
  const sessionMsgs = useRef<Record<string, Message[]>>({}); // messages per active_skill
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [userName, setUserName] = useState('');
  const [isGuest, setIsGuest] = useState(false);
  const [userId, setUserId] = useState('');
  const [showSessionWarning, setShowSessionWarning] = useState(false);
  const [historyRefreshTrigger, setHistoryRefreshTrigger] = useState(0);
  const [hasGeneratedWelcome, setHasGeneratedWelcome] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isSkillsOpen, setIsSkillsOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isFavorite, setIsFavorite] = useState(false);
  const [isConnected, setIsConnected] = useState(true);

  const [showOnboarding, setShowOnboarding] = useState(false);

  // Mobile menu dropdown state
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const mobileMenuRef = useRef<HTMLDivElement>(null);

  const [skills, setSkills] = useState<SkillPrompt[]>([]);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);

  // ──────────────────────────────────────────────
  // Estado de sesiones: siempre se llena desde API
  // ──────────────────────────────────────────────
  const [serverSessions, setServerSessions] = useState<ChatSession[]>([]);

  // Verificar conexión real contra el servidor
  useEffect(() => {
    const check = () => fetch('/api/health')
      .then(r => r.ok).then(ok => setIsConnected(ok))
      .catch(() => setIsConnected(false));
    check();
    const interval = setInterval(check, 120000);
    return () => clearInterval(interval);
  }, []);

  // Load skills + restore enabled states from server
  useEffect(() => {
    if (isGuest || !userId) return;
    Promise.all([
      import('@/lib/api').then(m => m.loadSkills(userId)),
      (() => { const t = (() => { try { const u = JSON.parse(sessionStorage.getItem('ren_user') || '{}'); return u.jwt || ''; } catch { return ''; } })(); return fetch(`/api/skills/enabled?user_id=${userId}`, { headers: t ? { 'x-ren-token': t } : {} }).then(r => r.json()).then(d => d.enabled || []).catch(() => []); })(),
    ]).then(([loadedSkills, enabledIds]) => {
      if (loadedSkills.length) {
        loadedSkills.forEach(skill => {
          if (enabledIds.includes(skill.id)) skill.enabled = true;
        });
        setSkills(loadedSkills);
      }
    }).catch(() => {});
  }, [isGuest, userId]);

  // Apply saved preferences on mount
  useEffect(() => {
    const prefs = PreferencesManager.getPreferences();
    document.documentElement.style.setProperty('--base-font-size', fontSizes[prefs.fontSize]);
    PreferencesManager.applyTheme(prefs.theme);
  }, []);

  // Check authentication
  useEffect(() => {
    const userStr = sessionStorage.getItem('ren_user');
    if (!userStr) {
      router.push('/login');
      return;
    }
    const user = JSON.parse(userStr);
    setUserName(user.name || user.email?.split('@')[0] || 'Usuario');
    setIsGuest(user.isGuest || false);
    setUserId(user.user_id || '');
  }, [router]);

  // ────────────────────────────────────────────────────────────────────
  // Cargar sesiones — SIEMPRE del servidor, NUNCA de cache local
  // El cache solo se usa para mostrar la UI mientras fetch responde
  // ────────────────────────────────────────────────────────────────────
  const loadSessionsFromServer = useCallback(async (uid: string) => {
    try {
      const serverData = await api.loadSessions(uid);
      const mapped = serverData.map(s => ({
        id: s.id,
        title: s.title || 'Chat',
        messages: (s.messages || []).map((m: any) => {
          if (m.role && m.content) {
            return {
              id: crypto.randomUUID?.() || `${Date.now()}_${Math.random().toString(36).slice(2, 10)}`,
              text: m.content,
              isUser: m.role === 'user',
              timestamp: m.timestamp || new Date().toISOString(),
              model: 'flash',
            };
          }
          return {
            id: m.id || Date.now().toString(),
            text: m.text || '',
            isUser: m.isUser ?? false,
            timestamp: m.timestamp || new Date().toISOString(),
            model: m.model || 'flash',
            isDeep: m.isDeep || false,
          };
        }),
        createdAt: s.createdAt || new Date().toISOString(),
        updatedAt: s.updatedAt || new Date().toISOString(),
      }));
      mapped.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());

      // Actualizar cache local (solo para UI rápida en futuras recargas)
      SessionManager.setFromServer(mapped);
      // Actualizar estado de React
      setServerSessions(mapped);

      return mapped;
    } catch {
      return null;
    }
  }, []);

  const lastLoadedUserRef = useRef('');

  // Cargar sesiones al montar
  useEffect(() => {
    if (isGuest) {
      SessionManager.clearAllLocal();
      createNewSession();
      return;
    }
    if (!userId) return;

    const uid = userId;
    if (lastLoadedUserRef.current !== uid) {
      SessionManager.clearAllLocal();
      lastLoadedUserRef.current = uid;
    }

    // Mostrar cache instantáneo mientras llega el server
    const cached = SessionManager.getAllSessions();
    if (cached.length > 0) {
      setServerSessions(cached);
      const mostRecent = cached[0];
      setMessages(mostRecent.messages);
      setCurrentSessionId(mostRecent.id);
      SessionManager.setCurrentSessionId(mostRecent.id);
      setHasGeneratedWelcome(mostRecent.messages.length > 0);
      setIsFavorite(mostRecent?.isFavorite || false);
    }

    // Siempre refrescar desde servidor
    loadSessionsFromServer(uid).then(mapped => {
      if (mapped && mapped.length > 0) {
        // Reemplazar con datos del servidor
        setServerSessions(mapped);
        // Si no teníamos cache o el usuario sigue en sesión inicial, mostrar la más reciente
        if (cached.length === 0) {
          const mostRecent = mapped[0];
          setMessages(mostRecent.messages);
          setCurrentSessionId(mostRecent.id);
          SessionManager.setCurrentSessionId(mostRecent.id);
          setHasGeneratedWelcome(mostRecent.messages.length > 0);
          setIsFavorite(mostRecent?.isFavorite || false);
        }
      } else if (cached.length === 0) {
        // No hay sesiones en ninguna parte — crear
        createNewSession();
      }
    }).catch(() => {
      if (cached.length === 0) createNewSession();
    });
  }, [isGuest, userId]); // eslint-disable-line react-hooks/exhaustive-deps

  // ────────────────────────────────────────────────────────────────────
  // Crear nueva sesión — siempre via API
  // ────────────────────────────────────────────────────────────────────
  const createNewSession = useCallback(async () => {
    const uid = userId;
    if (!uid) return;

    // Pedir ID al servidor
    let sessionId: string;
    if (!isGuest) {
      sessionId = await api.newSession(uid);
    } else {
      sessionId = crypto.randomUUID?.() || `${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
    }

    const newSession: ChatSession = {
      id: sessionId,
      title: 'Nueva conversación',
      messages: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    setStreamingMsg(null);
    setIsTyping(false);
    setMessages([]);
    setCurrentSessionId(sessionId);
    SessionManager.setCurrentSessionId(sessionId);
    SessionManager.addSessionToCache(newSession);
    setServerSessions(prev => {
      const filtered = prev.filter(s => s.id !== sessionId);
      return [newSession, ...filtered];
    });
    setHasGeneratedWelcome(false);
    initCalledRef.current = false;
    setIsTyping(true);
    setIsFavorite(false);
    setHistoryRefreshTrigger(prev => prev + 1);
  }, [isGuest, userId]);

  // Cerrar menú móvil al hacer click fuera o presionar Escape
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (mobileMenuRef.current && !mobileMenuRef.current.contains(e.target as Node)) {
        setIsMobileMenuOpen(false);
      }
    };
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsMobileMenuOpen(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleEsc);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEsc);
    };
  }, []);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        createNewSession();
      }
      if ((e.ctrlKey || e.metaKey) && e.key === 'h') {
        e.preventDefault();
        setIsHistoryOpen(true);
      }
      if (e.key === 'Escape') {
        if (isHistoryOpen) setIsHistoryOpen(false);

      }
      if ((e.ctrlKey || e.metaKey) && e.key === 'e') {
        e.preventDefault();
        exportCurrentSession();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isHistoryOpen, currentSessionId, messages, createNewSession]); // eslint-disable-line react-hooks/exhaustive-deps

  // Streaming con requestAnimationFrame — suave, sin crasheos
  function streamTextIn(fullText: string, model?: string, isDeep?: boolean) {
    const total = fullText.length;
    if (total === 0) { setIsTyping(false); return; }

    const msgId = Date.now().toString();
    // Crear ChatMessage desde el inicio — se actualiza in-place
    setStreamingMsg({
      id: msgId,
      text: '',
      isUser: false,
      timestamp: new Date().toISOString(),
      model: model || 'flash',
      isDeep: isDeep || false,
    });

    let pos = 0;
    let frameCount = 0;
    const chunkSize = total > 500 ? 8 : total > 200 ? 5 : total > 80 ? 3 : 2;
    const UPDATE_EVERY = 1;

    function frame() {
      frameCount++;
      if (frameCount % UPDATE_EVERY !== 0) {
        requestAnimationFrame(frame);
        return;
      }
      pos += chunkSize;
      if (pos >= total) {
        const msg: Message = {
          id: msgId,
          text: fullText,
          isUser: false,
          timestamp: new Date().toISOString(),
          model: model || 'flash',
          isDeep: isDeep || false,
        };
        // setTimeout para que React 18 bachee los 3 state updates juntos
        // RAF no tiene automatic batching en React 18
        setTimeout(() => {
          setMessages(prev => prev.some(m => m.id === msgId) ? prev : [...prev, msg]);
          setStreamingMsg(null);
          setIsTyping(false);
        }, 0);
        return;
      }
      setStreamingMsg(prev => prev ? { ...prev, text: fullText.slice(0, pos) } : null);
      requestAnimationFrame(frame);
    }
    requestAnimationFrame(frame);
  }

  // Check session limit for guests
  useEffect(() => {
    if (isGuest) {
      const sessions = SessionManager.getAllSessions();
      if (sessions.length >= 8 && sessions.length < 10) {
        setShowSessionWarning(true);
      } else if (sessions.length >= 10) {
        setShowSessionWarning(false);
      }
    }
  }, [isGuest, currentSessionId]);

  // Save messages when they change + sync to server (solo para registrados)
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    if (currentSessionId && messages.length > 0 && !isGuest && userId) {
      // Actualizar cache local
      SessionManager.updateSessionInCache(currentSessionId, messages);
      // Actualizar serverSessions state (para el sidebar)
      setServerSessions(prev => prev.map(s =>
        s.id === currentSessionId
          ? { ...s, messages, updatedAt: new Date().toISOString(), title: s.title === 'Nueva conversación' && messages.find(m => m.isUser) ? messages.find(m => m.isUser)!.text.slice(0, 50) + (messages.find(m => m.isUser)!.text.length > 50 ? '...' : '') : s.title }
          : s
      ));

      // Debounce: guardar en servidor 1s después del último cambio
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
      saveTimerRef.current = setTimeout(() => {
        const title = messages.find(m => m.isUser)?.text?.slice(0, 50) || 'Chat';
        api.saveSession(userId, currentSessionId, title, messages).catch(() => {});
      }, 1000);
    }

    return () => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    };
  }, [messages, currentSessionId, isGuest, userId]);

  // Auto-scroll to bottom
  const scrollToBottom = () => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isTyping]);

  // Generate welcome message
  const initCalledRef = useRef(false);
  useEffect(() => {
    if (initCalledRef.current) return;
    if (currentSessionId && messages.length === 0 && !hasGeneratedWelcome) {
      initCalledRef.current = true;
      setHasGeneratedWelcome(true);
      setIsTyping(true);

      const fallback = '';

      const activeSkill = skills.find(s => s.enabled)?.id || '__NONE__';
      sendMessage({ message: '__INIT__', user_id: userId, active_skill: activeSkill })
        .then(res => {
          if (res.text) {
            streamTextIn(res.text, 'flash');
          } else {
            setIsTyping(false);
          }
        })
        .catch(() => {
          setIsTyping(false);
          setMessages(prev => [...prev, {
            id: crypto.randomUUID?.() || `${Date.now()}_err`,
            text: '⚠️ No pude conectar con el servidor. Verifica tu conexión e intenta de nuevo.',
            isUser: false,
            timestamp: new Date().toISOString(),
            model: 'flash',
          }]);
        });
    }
  }, [currentSessionId, messages.length, hasGeneratedWelcome]); // eslint-disable-line react-hooks/exhaustive-deps

  // Guardar/cambiar sesión paralela por skill
  const getCurrentSkill = () => skills.find(s => s.enabled)?.id || '__NONE__';

  const handleSendMessage = async (text: string, isDeep?: boolean, files?: File[]) => {
    const filesBase64 = files ? await Promise.all(
      files.map(file => new Promise<{name: string, type: string, data: string}>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
          const base64 = reader.result as string;
          resolve({ name: file.name, type: file.type, data: base64 });
        };
        reader.onerror = reject;
        reader.readAsDataURL(file);
      }))
    ) : undefined;

    const activeSkill = getCurrentSkill();
    // Guardar mensajes actuales en la sesión activa antes de enviar
    const currentKey = sessionMsgs.current[currentSessionId] ? currentSessionId : activeSkill;
    sessionMsgs.current[currentKey] = messages;

    const userMessage: Message = {
      id: crypto.randomUUID?.() || `${Date.now()}_${Math.random().toString(36).slice(2, 10)}`,
      text,
      isUser: true,
      timestamp: new Date().toISOString(),
      files: filesBase64,
    };
    setMessages((prev) => [...prev, userMessage]);
    setIsTyping(true);

    // Solo enviar historial de ESTA sesión
    const history = messages.map(m => ({ role: m.isUser ? 'user' as const : 'assistant' as const, content: m.text }));
    sendMessage({ message: text, deep: isDeep, files: filesBase64, user_id: userId, active_skill: activeSkill, history })
      .then(res => {
        const newSessionId = res.session_id || currentSessionId;
        if (newSessionId && newSessionId !== currentSessionId) {
          setCurrentSessionId(newSessionId);
        }
        const sid = newSessionId;
        // Merge messages bajo la key correcta
        if (sid !== currentKey && sessionMsgs.current[currentKey]) {
          sessionMsgs.current[sid] = [...(sessionMsgs.current[currentKey] || []), userMessage];
          delete sessionMsgs.current[currentKey];
        } else {
          sessionMsgs.current[sid] = [...(sessionMsgs.current[sid] || []), userMessage];
        }
        PreferencesManager.playNotificationSound();
        streamTextIn(res.text, res.model || 'flash', isDeep);
      })
      .catch(() => {
        streamTextIn('Lo siento, no pude conectar con el servidor. Intenta de nuevo.', 'flash');
      });
  };

  const handleEditMessage = (messageId: string, newText: string) => {
    setMessages((prev) => {
      const editIdx = prev.findIndex(m => m.id === messageId);
      const truncated = prev.slice(0, editIdx + 1);
      truncated[editIdx] = { ...truncated[editIdx], text: newText };
      return truncated;
    });
  };

  // ──────────────────────────────────────────────
  // Seleccionar sesión — desde estado de React (API)
  // ──────────────────────────────────────────────
  const handleSelectSession = useCallback(async (sessionId: string) => {
    // Buscar en serverSessions (que viene de API)
    let session = serverSessions.find(s => s.id === sessionId);
    
    // Si no tiene mensajes cargados, fetch individual desde API
    if (!session || session.messages.length === 0) {
      try {
        const res = await fetch(`/api/sessions/${sessionId}?user_id=${encodeURIComponent(userId)}`);
        if (res.ok) {
          const data = await res.json();
          if (data.session) {
            session = data.session;
            // Actualizar cache y estado
            SessionManager.setFromServer(
              serverSessions.map(s => s.id === sessionId ? { ...session!, messages: session!.messages, id: sessionId } : s)
            );
          }
        }
      } catch {}
    }

    if (session) {
      setStreamingMsg(null);
      setIsTyping(false);
      setMessages(session.messages);
      setCurrentSessionId(session.id);
      SessionManager.setCurrentSessionId(session.id);
      setHasGeneratedWelcome(session.messages.length > 0);
      setIsFavorite(session?.isFavorite || false);
    } else {
      console.warn(`[Ren] Sesión no encontrada: ${sessionId}`);
    }
  }, [serverSessions, userId]);

  // ──────────────────────────────────────────────
  // Eliminar sesión — via API
  // ──────────────────────────────────────────────
  const handleDeleteSession = useCallback(async (sessionId: string) => {
    try {
      await api.deleteSession(userId, sessionId);
    } catch {}
    // Actualizar estado local
    SessionManager.removeSessionFromCache(sessionId);
    setServerSessions(prev => prev.filter(s => s.id !== sessionId));
    setHistoryRefreshTrigger(prev => prev + 1);

    // Si la sesión eliminada era la activa, crear nueva
    if (currentSessionId === sessionId) {
      createNewSession();
    }
  }, [userId, currentSessionId, createNewSession]);

  // ──────────────────────────────────────────────
  // Renombrar sesión — via API
  // ──────────────────────────────────────────────
  const handleRenameSession = useCallback(async (sessionId: string, title: string) => {
    try {
      await fetch('/api/sessions/rename', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: userId, id: sessionId, title }),
      });
    } catch {}
    SessionManager.updateTitleInCache(sessionId, title);
    setServerSessions(prev => prev.map(s =>
      s.id === sessionId ? { ...s, title } : s
    ));
    setHistoryRefreshTrigger(prev => prev + 1);
  }, [userId]);

  // ──────────────────────────────────────────────
  // Favoritos — via API
  // ──────────────────────────────────────────────
  const handleToggleFavorite = useCallback(() => {
    if (!currentSessionId) return;
    const newVal = SessionManager.toggleFavoriteInCache(currentSessionId);
    setIsFavorite(newVal);
    setServerSessions(prev => prev.map(s =>
      s.id === currentSessionId ? { ...s, isFavorite: newVal } : s
    ));
    setHistoryRefreshTrigger(prev => prev + 1);

    // Persistir en servidor
    if (!isGuest && userId) {
      fetch('/api/sessions/favorite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: userId, id: currentSessionId, favorite: newVal }),
      }).catch(() => {});
    }
  }, [currentSessionId, isGuest, userId]);

  // Guest onboarding toast — mostrar una vez
  useEffect(() => {
    if (isGuest && !hasGeneratedWelcome && messages.length === 0) {
      const shown = sessionStorage.getItem('ren_onboarding_shown');
      if (!shown) {
        const timer = setTimeout(() => setShowOnboarding(true), 1500);
        sessionStorage.setItem('ren_onboarding_shown', 'true');
        const hideTimer = setTimeout(() => setShowOnboarding(false), 5000);
        return () => { clearTimeout(timer); clearTimeout(hideTimer); };
      }
    }
  }, [isGuest, hasGeneratedWelcome, messages.length]);

  const exportCurrentSession = () => {
    if (messages.length === 0) return;

    const session = SessionManager.getSession(currentSessionId);
    if (!session) return;

    const content = `Conversación con Ren - ${session.title}\nFecha: ${new Date(session.updatedAt).toLocaleString()}\n\n${'-'.repeat(60)}\n\n${messages.map(msg => {
      const role = msg.isUser ? 'Usuario' : `Ren${msg.model ? ` (${msg.model})` : ''}`;
      const time = new Date(msg.timestamp).toLocaleTimeString();
      return `[${time}] ${role}:\n${msg.text}\n`;
    }).join('\n' + '-'.repeat(60) + '\n\n')}`;

    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `ren-chat-${session.title.toLowerCase().replace(/\s+/g, '-')}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleLogout = () => {
    SessionManager.logout();
    router.push('/');
  };

  return (
    <>
      <div className="min-h-dvh flex flex-col ren-bg-primary overflow-hidden" style={{ overscrollBehaviorX: 'none' }}>
        <div className="w-full max-w-[860px] mx-auto flex flex-col h-dvh max-h-dvh">
          {/* Header */}
          <header className="px-2 sm:px-4 md:px-6 py-3 md:py-4 border-b border-[var(--ren-border)] flex items-center justify-between gap-2 sm:gap-4 ren-bg-header" style={{ position: 'relative', zIndex: 10 }}>
            <div className="flex items-center gap-2 sm:gap-3 min-w-0">
              <CrowIcon size="lg" animate />

              <div className="min-w-0">
                <h1 className="text-base sm:text-lg md:text-xl font-mono tracking-tight ren-text-primary flex items-center gap-2">
                  Ren
                  <span className={"inline-block w-1.5 h-1.5 rounded-full " + (isConnected ? "bg-green-500" : "bg-red-500")} title={isConnected ? 'Conectado' : 'Sin conexión'} />
                </h1>
                <div className="flex items-center gap-2">
                  {isGuest ? (
                    <span className="flex items-center gap-1 text-[9px] sm:text-[10px] px-1.5 sm:px-2 py-0.5 bg-amber-500/10 text-amber-400/90 border border-amber-500/30 rounded font-mono">
                      <User size={9} className="sm:w-[10px] sm:h-[10px]" />
                      <span className="hidden xs:inline">Invitado</span>
                    </span>
                  ) : (
                    <span className="flex items-center gap-1 text-[9px] sm:text-[10px] px-1.5 sm:px-2 py-0.5 bg-[var(--accent-color)]/10 text-[var(--accent-color)]/90 border border-[var(--accent-color)]/30 rounded font-mono truncate max-w-[100px] sm:max-w-none">
                      <User size={9} className="sm:w-[10px] sm:h-[10px] flex-shrink-0" />
                      {userName}
                    </span>
                  )}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-0.5 sm:gap-2">
              {/* Salir — siempre visible */}
              <button
                onClick={() => router.push('/')}
                className="p-1.5 sm:p-2 hover:bg-[var(--ren-bg-tertiary)] border border-transparent hover:border-[var(--ren-border)] rounded-lg transition-colors"
                title="Salir"
              >
                <ArrowLeft size={16} className="sm:w-[18px] sm:h-[18px] text-[var(--ren-text-tertiary)] hover:text-[var(--ren-text-secondary)]" />
              </button>

              {/* Siempre visibles: Historial, Nueva sesión, Favorito */}
              <button onClick={() => setIsHistoryOpen(true)}
                className="p-1.5 sm:p-2 hover:bg-[var(--ren-bg-tertiary)] border border-transparent hover:border-[var(--ren-border)] rounded-lg transition-colors" title="Historial (Ctrl+H)">
                <History size={16} className="sm:w-[18px] sm:h-[18px] text-[var(--ren-text-tertiary)] hover:text-[var(--ren-text-secondary)]" />
              </button>
              <button onClick={() => createNewSession()}
                className="p-1.5 sm:p-2 hover:bg-[var(--ren-bg-tertiary)] border border-transparent hover:border-[var(--ren-border)] rounded-lg transition-colors" title="Nueva sesión (Ctrl+K)">
                <Plus size={16} className="sm:w-[18px] sm:h-[18px] text-[var(--ren-text-tertiary)] hover:text-[var(--ren-text-secondary)]" />
              </button>
              <button onClick={handleToggleFavorite} disabled={messages.length === 0}
                className={`p-2 hover:bg-[var(--ren-bg-tertiary)] border border-transparent hover:border-[var(--ren-border)] rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed ${isFavorite ? 'text-yellow-400' : 'text-[var(--ren-text-tertiary)]'}`}
                title={isFavorite ? 'Quitar de favoritos' : 'Agregar a favoritos'}>
                <Star size={18} className={isFavorite ? 'fill-current' : ''} />
              </button>

              {/* Separador */}
              <div className="hidden sm:block w-px h-5 bg-[var(--ren-border)] mx-0.5" />

              {/* Menú desplegable: Perfil, Skills, Config, Exportar */}
              <div className="relative" ref={mobileMenuRef}>
                <button
                  onClick={() => setIsMobileMenuOpen(prev => !prev)}
                  className="p-1.5 sm:p-2 hover:bg-[var(--ren-bg-tertiary)] border border-transparent hover:border-[var(--ren-border)] rounded-lg transition-colors"
                  title="Más opciones"
                >
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className="sm:w-[18px] sm:h-[18px]"
                    style={{ color: 'var(--ren-text-tertiary)' }}>
                    <circle cx="8" cy="3.5" r="1.5" fill="currentColor"/>
                    <circle cx="8" cy="8" r="1.5" fill="currentColor"/>
                    <circle cx="8" cy="12.5" r="1.5" fill="currentColor"/>
                  </svg>
                </button>

                {isMobileMenuOpen && (
                  <div
                    className="absolute right-0 top-full mt-1.5 min-w-[160px] py-1.5 rounded-xl border shadow-xl"
                    style={{
                      background: 'var(--ren-bg-secondary)',
                      borderColor: 'var(--ren-border)',
                      boxShadow: '0 8px 32px var(--ren-shadow), 0 0 0 1px var(--ren-border)',
                      zIndex: 100,
                    }}
                  >
                    {isGuest ? null : (
                      <button
                        onClick={() => { setIsProfileOpen(true); setIsMobileMenuOpen(false); }}
                        className="w-full flex items-center gap-2.5 px-3.5 py-2 text-sm font-mono hover:bg-[var(--ren-bg-tertiary)] transition-colors"
                        style={{ color: 'var(--ren-text-secondary)' }}
                      >
                        {userId === 'nero' ? <StickyNote size={15} /> : <User size={15} />}
                        {userId === 'nero' ? 'Pensamientos' : 'Perfil'}
                      </button>
                    )}
                    <button
                      onClick={() => { setIsSkillsOpen(true); setIsMobileMenuOpen(false); }}
                      className="w-full flex items-center gap-2.5 px-3.5 py-2 text-sm font-mono hover:bg-[var(--ren-bg-tertiary)] transition-colors"
                      style={{ color: 'var(--ren-text-secondary)' }}
                    >
                      <Brain size={15} />
                      Skills
                    </button>
                    <button
                      onClick={() => { setIsSettingsOpen(true); setIsMobileMenuOpen(false); }}
                      className="w-full flex items-center gap-2.5 px-3.5 py-2 text-sm font-mono hover:bg-[var(--ren-bg-tertiary)] transition-colors"
                      style={{ color: 'var(--ren-text-secondary)' }}
                    >
                      <Settings size={15} />
                      Configuración
                    </button>
                    <div className="mx-3 my-1 h-px" style={{ background: 'var(--ren-border)' }} />
                    <button
                      onClick={() => { exportCurrentSession(); setIsMobileMenuOpen(false); }}
                      disabled={messages.length === 0}
                      className="w-full flex items-center gap-2.5 px-3.5 py-2 text-sm font-mono hover:bg-[var(--ren-bg-tertiary)] transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                      style={{ color: 'var(--ren-text-secondary)' }}
                    >
                      <Download size={15} />
                      Exportar
                    </button>
                  </div>
                )}
              </div>
            </div>
          </header>

          {isGuest && showSessionWarning && (
            <div className="px-4 md:px-6 py-3 bg-amber-500/5 border-b border-amber-500/20">
              <p className="text-xs font-mono text-amber-400/80 text-center">
                Tienes {SessionManager.getAllSessions().length}/10 sesiones guardadas. Al crear más, se eliminará la más antigua.
              </p>
            </div>
          )}

          {/* Onboarding toast */}
          {showOnboarding && (
            <div className="fixed top-16 left-1/2 -translate-x-1/2 z-50" style={{ animation: 'slideDown 0.3s ease' }}>
              <div className="px-5 py-3 rounded-xl shadow-2xl border backdrop-blur-sm"
                style={{
                  background: 'linear-gradient(135deg, rgba(99,102,241,0.12) 0%, rgba(139,92,246,0.08) 100%)',
                  borderColor: 'var(--accent-color)',
                }}
              >
                <p className="text-sm font-mono text-center" style={{ color: 'var(--accent-hover)' }}>
                  🜁{' '}
                  <span className="font-semibold">10 mensajes de cortesía</span>
                  {' '}—{' '}
                  <button
                    onClick={() => router.push('/register')}
                    className="underline underline-offset-2 hover:opacity-80 transition-opacity font-medium"
                  >
                    crea tu cuenta
                  </button>
                </p>
              </div>
            </div>
          )}

          {isGuest && (
            <div className="px-4 md:px-6 py-2.5 border-b border-[var(--accent-color)]/20" style={{ background: 'linear-gradient(135deg, rgba(99,102,241,0.08) 0%, rgba(99,102,241,0.04) 50%, rgba(99,102,241,0.08) 100%)' }}>
              <p className="text-xs font-mono text-center text-[var(--ren-text-secondary)]">
                💡{' '}
                <button
                  onClick={() => router.push('/register')}
                  className="text-[var(--accent-color)] hover:text-[var(--accent-hover)] underline underline-offset-2 transition-colors font-medium"
                >
                  Crea una cuenta
                </button>
                {' '}para guardar tus chats y personalizar tu experiencia.
              </p>
            </div>
          )}

          {/* Chat area */}
          <div
            ref={chatContainerRef}
            className="flex-1 overflow-y-auto px-2 sm:px-4 md:px-6 py-4 sm:py-6 md:py-8 scroll-smooth ren-scrollbar"
          >
            {messages.length === 0 && !isTyping ? (
              <EmptyState isGuest={isGuest} onSuggestionClick={handleSendMessage} />
            ) : messages.length === 0 && isTyping ? (
              <SkeletonLoader />
            ) : (
              <>
                {[...messages, ...(streamingMsg ? [streamingMsg] : [])].map((message) => (
                  <div key={message.id}>
                    <ChatMessage
                      message={message.text}
                      isUser={message.isUser}
                      timestamp={message.timestamp}
                      model={message.model}
                      isDeep={message.isDeep}
                      files={message.files}
                      onEdit={message.isUser ? (newText) => handleEditMessage(message.id, newText) : undefined}
                    />
                  </div>
                ))}
                {isTyping && !streamingMsg && <TypingIndicator />}
              </>
            )}
            <div ref={chatEndRef} />
          </div>

          {/* Active skills indicator */}
          {skills.filter(s => s.enabled).length > 0 && (
            <div className="px-4 md:px-6 py-2 bg-[var(--accent-color)]/8 border-t border-[var(--accent-color)]/20">
              <div className="flex items-center gap-2 flex-wrap">
                <Zap size={14} className="text-[var(--accent-hover)] flex-shrink-0" />
                <span className="text-[11px] font-mono text-[var(--accent-hover)]">Skills activas:</span>
                {skills.filter(s => s.enabled).map(s => (
                  <span key={s.id} className="inline-flex items-center gap-1 text-[11px] font-mono px-2 py-0.5 rounded-full bg-[var(--accent-color)]/15 border border-[var(--accent-color)]/30 text-[var(--accent-hover)]">
                    {s.emoji || '⚡'} {s.name}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Input area */}
          <ChatInput
            onSendMessage={handleSendMessage}
            disabled={isTyping}
            sessionId={currentSessionId}
            quickSkills={skills}
            onToggleSkill={(id) => {
              const updated = skills.map(s =>
                s.id === id ? { ...s, enabled: !s.enabled } : { ...s, enabled: false }
              );
              setSkills(updated);
              // Persist to server
              const enabledIds = updated.filter(s => s.enabled).map(s => s.id);
              const token = (() => { try { const u = JSON.parse(sessionStorage.getItem('ren_user') || '{}'); return u.jwt || ''; } catch { return ''; } })();
              fetch('/api/skills/enabled', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', ...(token ? { 'x-ren-token': token } : {}) },
                body: JSON.stringify({ user_id: userId, enabled: enabledIds }),
              }).catch(() => {});
              import('@/lib/api').then(m => {
                const skill = updated.find(s => s.id === id);
                if (skill && !isGuest) m.saveSkillToServer(userId, skill);
              }).catch(() => {});
            }}
          />
        </div>
      </div>

      {/* History Sidebar — recibe sesiones del estado de React (desde API) */}
      <HistorySidebar
        isOpen={isHistoryOpen}
        onClose={() => setIsHistoryOpen(false)}
        currentSessionId={currentSessionId}
        refreshTrigger={historyRefreshTrigger}
        onSelectSession={handleSelectSession}
        isGuest={isGuest}
        sessions={serverSessions}
        onDeleteSession={handleDeleteSession}
        onRenameSession={handleRenameSession}
      />

      {/* Settings Panel */}
      <SettingsPanel
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        currentSessionId={currentSessionId}
      />

      {/* Skills Panel */}
      <SkillsPanel
        isOpen={isSkillsOpen}
        onClose={() => setIsSkillsOpen(false)}
        isGuest={isGuest}
        userId={userId}
        onSave={(s) => setSkills(s)}
      />

      {/* Notes Panel */}
      <ProfilePanel
        isOpen={isProfileOpen}
        onClose={() => setIsProfileOpen(false)}
        isGuest={isGuest}
        userId={userId}
        userName={userName}
      />

      {/* Keyboard shortcuts help */}
      <KeyboardShortcutsHelp />
    </>
  );
}
