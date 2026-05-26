'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { motion } from 'motion/react';
import { useRouter } from 'next/navigation';
import { Settings, Star, History, Plus, User, Download, ArrowLeft, Brain, StickyNote, Zap, MoreHorizontal } from 'lucide-react';
import { CrowIcon } from '@/components/ui/crow-icon';
import { ChatMessage } from '@/components/chat/chat-message';
import { TypingIndicator } from '@/components/chat/typing-indicator';
import { ChatInput } from '@/components/chat/chat-input';
import { WelcomeLanding } from '@/components/chat/welcome-landing';

import { HistorySidebar } from '@/components/chat/history-sidebar';
import { SettingsPanel } from '@/components/chat/settings-panel';
import { TricksPanel, type TrickPrompt } from '@/components/chat/tricks-panel';
import { ProfilePanel } from '@/components/chat/profile-panel';
import { KeyboardShortcutsHelp } from '@/components/chat/keyboard-shortcuts-help';
import { useAuth } from '@/lib/auth-context';
import { EmptyState } from '@/components/chat/empty-state';
import { SessionManager, type Message, type ChatSession, type TrickInfo } from '@/lib/session-manager';
import { PreferencesManager, fontSizes } from '@/lib/preferences-manager';
import type { ModelType } from '@/lib/model-config';
import * as api from '@/lib/api';

export default function ChatPage() {
  const router = useRouter();
  const [messages, setMessages] = useState<Message[]>([]);
  const [isTyping, setIsTyping] = useState(false);
  const [streamingMsg, setStreamingMsg] = useState<Message | null>(null);
  const [currentSessionId, setCurrentSessionId] = useState<string>('');
  const sessionMsgs = useRef<Record<string, Message[]>>(
    (() => {
      try {
        if (typeof window !== 'undefined') {
          const raw = sessionStorage.getItem('ren_trick_sessions');
          if (raw) return JSON.parse(raw);
        }
      } catch {}
      return {};
    })()
  ); // messages per active_trick (persisted to sessionStorage)
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const { user, isGuest, isLoading: authLoading, logout: authLogout } = useAuth();
  const userName = user?.name || user?.username || '';
  const userId = user?.user_id || '';
  const [showSessionWarning, setShowSessionWarning] = useState(false);
  const [historyRefreshTrigger, setHistoryRefreshTrigger] = useState(0);
  const [hasGeneratedWelcome, setHasGeneratedWelcome] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isTricksOpen, setIsTricksOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isFavorite, setIsFavorite] = useState(false);
  const [isConnected, setIsConnected] = useState(true);

  const [showOnboarding, setShowOnboarding] = useState(false);

  // Tab ID único por pestaña — previene mezcla de sesiones entre tabs
  const tabIdRef = useRef<string>(
    typeof window !== 'undefined'
      ? (sessionStorage.getItem('ren_tab_id') || (() => {
          const id = crypto.randomUUID?.()?.slice(0,8) || Math.random().toString(36).slice(2,10);
          sessionStorage.setItem('ren_tab_id', id);
          return id;
        })())
      : 'server'
  );

  // Mobile menu dropdown state
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const mobileMenuRef = useRef<HTMLDivElement>(null);

  const [tricks, setTricks] = useState<TrickPrompt[]>([]);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);
  const [isInitialLoadDone, setIsInitialLoadDone] = useState(false);
  const serverFirstLoadRef = useRef(false);

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

  // Load tricks + restore enabled states from server
  useEffect(() => {
    if (isGuest || !userId) return;
    Promise.all([
      import('@/lib/api').then(m => m.loadTricks(userId)),
      fetch(`/api/tricks/enabled?user_id=${userId}`, { credentials: 'include' }).then(r => r.json()).then(d => d.enabled || []).catch(() => []),
    ]).then(([loadedTricks, enabledIds]) => {
      if (loadedTricks.length) {
        // Restaurar estado enabled desde el servidor (persiste entre recargas)
        if (enabledIds.length > 0) {
          loadedTricks.forEach(trick => {
            trick.enabled = enabledIds.includes(trick.id);
          });
        } else {
          loadedTricks.forEach(trick => { trick.enabled = false; });
        }
        setTricks(loadedTricks);
      }
    }).catch(() => {});
  }, [isGuest, userId]);

  // Apply saved preferences on mount
  useEffect(() => {
    const prefs = PreferencesManager.getPreferences();
    document.documentElement.style.setProperty('--base-font-size', fontSizes[prefs.fontSize]);
    PreferencesManager.applyTheme(prefs.theme);
  }, []);

  // Redirigir si no hay sesión
  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      // Sin sesión y sin guest → login
      if (!sessionStorage.getItem('ren_guest')) {
        router.push('/login');
      }
    }
  }, [user, authLoading, router]);

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
        parentId: (s as any).parentId || undefined,
        messages: (s.messages || []).map((m: any) => {
          // 🐛 Fix: extraer trick metadata de respuesta del servidor
          let msgTrick = m.activeTrick;
          if (!msgTrick && m.metadata?.trick) {
            msgTrick = m.metadata.trick;
          }
          if (m.role && m.content) {
            const isErr1 = typeof m.content === 'string' && m.content.startsWith('⚠️');
            return {
              id: crypto.randomUUID?.() || `${Date.now()}_${Math.random().toString(36).slice(2, 10)}`,
              text: isErr1 ? '⚠️ Error de conexión.' : m.content,
              isUser: m.role === 'user',
              timestamp: m.timestamp || m.createdAt || new Date().toISOString(),
              model: 'flash',
              isError: isErr1,
              activeTrick: msgTrick,
            };
          }
          const isErr2 = m.isError || (typeof m.text === 'string' && m.text.startsWith('⚠️'));
          return {
            id: m.id || Date.now().toString(),
            text: isErr2 ? '⚠️ Error de conexión.' : (m.text || ''),
            isUser: m.isUser ?? false,
            timestamp: m.timestamp || m.createdAt || new Date().toISOString(),
            model: m.model || 'flash',
            isDeep: m.isDeep || false,
            isError: isErr2,
            activeTrick: msgTrick,
          };
        }),
        createdAt: s.createdAt || new Date().toISOString(),
        updatedAt: s.updatedAt || new Date().toISOString(),
        isFavorite: s.isFavorite || false,
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
      setMessages([]);
      setCurrentSessionId('');
      setHasGeneratedWelcome(false);
      setIsInitialLoadDone(true);
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
      // Restaurar sesión guardada (sessionStorage) o de la URL, NO cached[0]
      const savedSessionId = SessionManager.getCurrentSessionId();
      const urlSession = new URLSearchParams(window.location.search).get('session');
      const targetId = urlSession || savedSessionId || cached[0].id;
      const targetSession = cached.find(s => s.id === targetId) || cached[0];
      setMessages(targetSession.messages);
      setCurrentSessionId(targetSession.id);
      SessionManager.setCurrentSessionId(targetSession.id);
      setHasGeneratedWelcome(targetSession.messages.length > 0);
      setIsFavorite(targetSession?.isFavorite || false);
    }

    // Siempre refrescar desde servidor
    loadSessionsFromServer(uid).then(mapped => {
      serverFirstLoadRef.current = true;
      setIsInitialLoadDone(true);
      if (mapped && mapped.length > 0) {
        // Reemplazar con datos del servidor
        setServerSessions(mapped);
        // Si no teníamos cache → posiblemente es una pestaña nueva
        if (cached.length === 0) {
          const params = new URLSearchParams(window.location.search);
          const sessionParam = params.get('session');
          const savedSessionId = SessionManager.getCurrentSessionId();
          if (sessionParam || savedSessionId) {
            // URL param o sesión guardada (mismo tab recargado)
            const targetId = sessionParam || savedSessionId!;
            const targetSession = mapped.find(s => s.id === targetId) || mapped[0];
            setMessages(targetSession.messages);
            setCurrentSessionId(targetSession.id);
            SessionManager.setCurrentSessionId(targetSession.id);
            setHasGeneratedWelcome(targetSession.messages.length > 0);
            setIsFavorite(targetSession?.isFavorite || false);
          } else {
            // Pestaña nueva sin sesión guardada → mostrar área vacía
            setMessages([]);
            setCurrentSessionId('');
            SessionManager.setCurrentSessionId('');
            setHasGeneratedWelcome(false);
            setIsInitialLoadDone(true);
          }
        }
      } else {
        // Sin sesiones en el servidor — mostrar área vacía
        setIsInitialLoadDone(true);
        if (cached.length === 0) {
          setMessages([]);
          setCurrentSessionId('');
          setHasGeneratedWelcome(false);
        }
      }
    }).catch(() => {
      serverFirstLoadRef.current = true;
      setIsInitialLoadDone(true);
      if (cached.length === 0) {
        setMessages([]);
        setCurrentSessionId('');
        setHasGeneratedWelcome(false);
      }
    });
  }, [isGuest, userId]); // eslint-disable-line react-hooks/exhaustive-deps

  // WebSocket no se throttle al cambiar pestaña — no necesitamos visibilitychange handler

  // ────────────────────────────────────────────────────────────────────
  // Crear nueva sesión — siempre via API
  // ────────────────────────────────────────────────────────────────────
  const createNewSession = useCallback(async () => {
    const uid = userId;
    if (!uid) return;

    // Abortar stream activo
    if (streamAbortRef.current) {
      streamAbortRef.current.abort();
      streamAbortRef.current = null;
    }

    // Crear ID local SOLAMENTE (no se guarda en DB hasta el primer mensaje del usuario)
    const sessionId = crypto.randomUUID?.() || `${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;

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
    window.history.replaceState(null, '', `/chat?session=${sessionId}`);
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
    // Desactivar tricks al crear nueva sesión
    setTricks(prev => prev.map(s => ({ ...s, enabled: false })));
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

  // Limpiar stream al desmontar
  useEffect(() => {
    return () => {
      if (streamAbortRef.current) {
        streamAbortRef.current.abort();
        streamAbortRef.current = null;
      }
    };
  }, []);

  // Ref para abortar stream SSE actual
  const streamAbortRef = useRef<{ abort: () => void } | null>(null);

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
          ? { ...s, messages, updatedAt: new Date().toISOString(), title: (() => { try { const firstUserMsg = messages.find(m => m.isUser); return s.title === 'Nueva conversación' && firstUserMsg ? firstUserMsg.text.slice(0, 50) + (firstUserMsg.text.length > 50 ? '...' : '') : s.title; } catch { return s.title; } })() }
          : s
      ));

      // Filtrar mensajes de error antes de guardar
      const cleanMessages = messages.filter(m => !m.isError);
      if (cleanMessages.length === 0) return;

      // Debounce: guardar en servidor 1s después del último cambio
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
      saveTimerRef.current = setTimeout(() => {
        const title = cleanMessages.find(m => m.isUser)?.text?.slice(0, 50) || 'Chat';
        api.saveSession(userId, currentSessionId, title, cleanMessages).catch(() => {});
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

  // Track cuántos mensajes había para detectar nuevos envíos
  const prevMsgCountRef = useRef(0);

  useEffect(() => {
    const container = chatContainerRef.current;
    const currentCount = messages.length;

    // Si se ACABA de enviar un mensaje del usuario (new user msg added), forzar scroll
    if (currentCount > prevMsgCountRef.current && currentCount > 0) {
      const lastIdx = currentCount - 1;
      const lastMsg = messages[lastIdx];
      if (lastMsg.isUser) {
        scrollToBottom();
        prevMsgCountRef.current = currentCount;
        return;
      }
    }
    prevMsgCountRef.current = currentCount;

    // Para streaming del asistente: solo scrollear si el usuario está cerca del final
    if (container) {
      const isNearBottom = container.scrollHeight - container.scrollTop - container.clientHeight < 250;
      if (isNearBottom) {
        scrollToBottom();
      }
    } else {
      scrollToBottom();
    }
  }, [messages, streamingMsg?.text, isTyping]);

  // Generate welcome message (solo después de confirmar que el servidor no tiene sesiones)
  const initCalledRef = useRef(false);
  useEffect(() => {
    if (initCalledRef.current) return;
    if (!serverFirstLoadRef.current) return; // Esperar a que el servidor responda primero
    if (currentSessionId && messages.length === 0 && !hasGeneratedWelcome) {
      initCalledRef.current = true;
      setHasGeneratedWelcome(true);
      setIsTyping(true);

      const activeTrick = tricks.find(s => s.enabled)?.id || '__NONE__';
      const initTrickData = tricks.find(s => s.enabled);
      const initTrickInfo: TrickInfo | undefined = initTrickData
        ? { id: initTrickData.id, name: initTrickData.name, emoji: initTrickData.emoji || '⚡', color: initTrickData.color || '#8b5cf6' }
        : undefined;
      const msgId = crypto.randomUUID?.() || `${Date.now()}_init`;
      setStreamingMsg({
        id: `streaming_${msgId}`,
        text: '',
        isUser: false,
        timestamp: new Date().toISOString(),
        model: 'flash',
        activeTrick: initTrickInfo,
      });

      // Init ahora stremea como cualquier otro mensaje (via WS con fallback SSE)
      api.chatStream(
        { message: '__INIT__', user_id: userId, active_trick: activeTrick, tab_id: tabIdRef.current },
        {
          onMeta: (meta) => {
            if (meta.session_id && meta.session_id !== currentSessionId) {
              setCurrentSessionId(meta.session_id);
            }
          },
          onChunk: (text) => {
            setStreamingMsg(prev => prev ? { ...prev, text: prev.text + text } : null);
          },
          onDone: (fullText) => {
            if (fullText) {
              setMessages(prev => prev.some(m => m.id === msgId) ? prev : [...prev, {
                id: msgId,
                text: fullText,
                isUser: false,
                timestamp: new Date().toISOString(),
                model: 'flash',
                activeTrick: initTrickInfo,
              }]);
            }
            setStreamingMsg(null);
            setIsTyping(false);
          },
          onError: () => {
            setIsTyping(false);
            // Error temporal — no se persiste a messages ni al servidor
            setStreamingMsg({
              id: crypto.randomUUID?.() || `${Date.now()}_err`,
              text: '⚠️ No pude conectar con el servidor.',
              isUser: false,
              timestamp: new Date().toISOString(),
              model: 'flash',
              activeTrick: initTrickInfo,
              isError: true,
            });
            setTimeout(() => {
              setStreamingMsg(prev => prev?.isError ? null : prev);
            }, 5000);
          },
        }
      );
    }
  }, [currentSessionId, messages.length, hasGeneratedWelcome]); // eslint-disable-line react-hooks/exhaustive-deps

  // Guardar/cambiar sesión paralela por trick
  const getCurrentTrick = () => tricks.find(s => s.enabled)?.id || '__NONE__';

  const handleSendMessage = async (text: string, isDeep?: boolean, files?: File[]) => {
    // Si es primer mensaje y la sesión es local (no creada en servidor), crearla
    let effectiveSessionId = currentSessionId;
    if (!isGuest && userId && currentSessionId && !serverSessions.some(s => s.id === currentSessionId)) {
      try {
        const serverId = await api.newSession(userId, tabIdRef.current);
        effectiveSessionId = serverId;
        setCurrentSessionId(serverId);
        SessionManager.setCurrentSessionId(serverId);
        SessionManager.updateSessionInCache(serverId, messages);
        window.history.replaceState(null, '', `/chat?session=${serverId}`);
        // Actualizar serverSessions: reemplazar la sesión local por la del servidor
        setServerSessions(prev => {
          const filtered = prev.filter(s => s.id !== currentSessionId);
          return [{ ...prev.find(s => s.id === currentSessionId), id: serverId } as ChatSession, ...filtered].filter(Boolean);
        });
      } catch (e) {
        console.error('[handleSendMessage] newSession:', e);
      }
    }

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

    const activeTrick = getCurrentTrick();
    // Trick info para badge visual
    const activeTrickData = tricks.find(s => s.enabled);
    const trickInfo: TrickInfo | undefined = activeTrickData
      ? { id: activeTrickData.id, name: activeTrickData.name, emoji: activeTrickData.emoji || '⚡', color: activeTrickData.color || '#8b5cf6' }
      : undefined;

    // Guardar mensajes actuales en la sesión activa antes de enviar
    const currentKey = sessionMsgs.current[effectiveSessionId || currentSessionId] ? (effectiveSessionId || currentSessionId) : activeTrick;
    sessionMsgs.current[currentKey] = messages;
    try { sessionStorage.setItem('ren_trick_sessions', JSON.stringify(sessionMsgs.current)); } catch {}

    // Save user message to sessionStorage immediately (before streaming resolves)
    const userMsgSave = () => {
      const sid = effectiveSessionId || currentSessionId;
      if (!isGuest && userId && sid && !sid.startsWith('guest_')) {
        const updated = [...messages, userMessage];
        const cleaned = updated.filter(m => !m.isError);
        if (cleaned.length > 0) {
          const title = text.slice(0, 50) + (text.length > 50 ? '...' : '');
          api.saveSession(userId, sid, title, cleaned).catch(() => {});
        }
      }
      // Also save to local sessionStorage
      sessionMsgs.current[currentKey] = [...(sessionMsgs.current[currentKey] || []), userMessage];
      try { sessionStorage.setItem('ren_trick_sessions', JSON.stringify(sessionMsgs.current)); } catch {}
    };

    const userMessage: Message = {
      id: crypto.randomUUID?.() || `${Date.now()}_${Math.random().toString(36).slice(2, 10)}`,
      text,
      isUser: true,
      timestamp: new Date().toISOString(),
      files: filesBase64,
      activeTrick: trickInfo,
    };
    setMessages((prev) => [...prev, userMessage]);
    setIsTyping(true);

    // Save user message immediately to server (no esperar debounce)
    userMsgSave();

    const msgId = crypto.randomUUID?.() || `${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
    setStreamingMsg({
      id: `streaming_${msgId}`,
      text: '',
      isUser: false,
      timestamp: new Date().toISOString(),
      model: isDeep ? 'pro' : 'flash',
      isDeep: isDeep || false,
      activeTrick: trickInfo,
    });

    // Cancelar stream anterior si lo hay
    if (streamAbortRef.current) {
      streamAbortRef.current.abort();
      streamAbortRef.current = null;
    }

    // Solo enviar historial de ESTA sesión
    const history = messages.map(m => ({ role: m.isUser ? 'user' as const : 'assistant' as const, content: m.text }));

    let resolvedSessionId = effectiveSessionId || currentSessionId;

    const streamCtrl = api.chatStream(
      { message: text, deep: isDeep, files: filesBase64, user_id: userId, active_trick: activeTrick, tab_id: tabIdRef.current, history },
      {
        onMeta: (meta) => {
          if (meta.session_id && meta.session_id !== resolvedSessionId) {
            resolvedSessionId = meta.session_id;
            setCurrentSessionId(resolvedSessionId);
          }
        },
        onChunk: (text) => {
          setStreamingMsg(prev => prev ? { ...prev, text: prev.text + text } : null);
        },
        onDone: (fullText, sessionId) => {
          if (fullText) {
            const sid = sessionId || resolvedSessionId;
            // Merge messages bajo la key correcta
            if (sid !== currentKey && sessionMsgs.current[currentKey]) {
              sessionMsgs.current[sid] = [...(sessionMsgs.current[currentKey] || []), userMessage];
              delete sessionMsgs.current[currentKey];
            } else {
              sessionMsgs.current[sid] = [...(sessionMsgs.current[sid] || []), userMessage];
            }
            try { sessionStorage.setItem('ren_trick_sessions', JSON.stringify(sessionMsgs.current)); } catch {}
            PreferencesManager.playNotificationSound();
            setMessages(prev => prev.some(m => m.id === msgId) ? prev : [...prev, {
              id: msgId,
              text: fullText,
              isUser: false,
              timestamp: new Date().toISOString(),
              model: isDeep ? 'pro' : 'flash',
              isDeep: isDeep || false,
              activeTrick: trickInfo,
            }]);
            // Save assistant response immediately
            if (!isGuest && userId && sid) {
              const assistantMsg = { id: msgId, text: fullText, isUser: false, timestamp: new Date().toISOString(), model: isDeep ? 'pro' : 'flash', isDeep: isDeep || false, activeTrick: trickInfo };
              const finalMessages = [...(sessionMsgs.current[sid] || []), userMessage, assistantMsg];
              const cleanMsgs = finalMessages.filter(m => !m.isError);
              if (cleanMsgs.length > 0) {
                const serverTitle = text.slice(0, 50) + (text.length > 50 ? '...' : '');
                api.saveSession(userId, sid, serverTitle, cleanMsgs).catch(() => {});
              }
            }
          }
          setStreamingMsg(null);
          setIsTyping(false);
        },
        onError: () => {
          setIsTyping(false);
          // Error temporal — no se persiste a messages ni al servidor
          setStreamingMsg({
            id: crypto.randomUUID?.() || `${Date.now()}_err`,
            text: '⚠️ Error de conexión. Intenta de nuevo.',
            isUser: false,
            timestamp: new Date().toISOString(),
            model: 'flash',
            activeTrick: trickInfo,
            isError: true,
          });
          // Auto-limpiar después de 5s para permitir reintentar
          setTimeout(() => {
            setStreamingMsg(prev => prev?.isError ? null : prev);
          }, 5000);
        },
      }
    );
    streamAbortRef.current = streamCtrl;
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
  // Sincronizar URL con la sesión activa
  // ──────────────────────────────────────────────
  useEffect(() => {
    if (currentSessionId && window.location.search !== `?session=${currentSessionId}`) {
      window.history.replaceState(null, '', `/chat?session=${currentSessionId}`);
    }
  }, [currentSessionId]);

  // ──────────────────────────────────────────────
  // Cargar sesión desde URL al montar (soporte para nueva pestaña)
  // ──────────────────────────────────────────────
  useEffect(() => {
    if (!isInitialLoadDone || !userId || serverSessions.length === 0) return;
    if (currentSessionId) return; // ya hay sesión activa, no sobreescribir

    const params = new URLSearchParams(window.location.search);
    const sessionParam = params.get('session');
    if (sessionParam) {
      const session = serverSessions.find(s => s.id === sessionParam);
      if (session) {
        setMessages(session.messages);
        setCurrentSessionId(session.id);
        SessionManager.setCurrentSessionId(session.id);
        setHasGeneratedWelcome(session.messages.length > 0);
        setIsFavorite(session?.isFavorite || false);
      }
    }
  }, [isInitialLoadDone, userId, serverSessions]);

  // ──────────────────────────────────────────────
  // Seleccionar sesión — desde estado de React (API)
  // ──────────────────────────────────────────────
  const handleSelectSession = useCallback(async (sessionId: string) => {
    // Abortar stream activo
    if (streamAbortRef.current) {
      streamAbortRef.current.abort();
      streamAbortRef.current = null;
    }

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
      window.history.replaceState(null, '', `/chat?session=${session.id}`);
      setHasGeneratedWelcome(session.messages.length > 0);
      setIsFavorite(session?.isFavorite || false);
      // Desactivar tricks al cambiar de sesión
      setTricks(prev => prev.map(s => ({ ...s, enabled: false })));
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
    a.download = `ren-chat-${(session.title || 'chat').toLowerCase().replace(/\s+/g, '-')}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleLogout = async () => {
    await authLogout();
    SessionManager.logout();
    router.push('/');
  };

  return (
    <>
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: [0.25, 0.1, 0.25, 1] }}
        className="min-h-dvh flex flex-col overflow-hidden"
        style={{ overscrollBehaviorX: 'none' }}
      >
        <div className="w-full max-w-[860px] mx-auto flex flex-col h-dvh max-h-dvh">
          {/* Header */}
          <motion.header
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35, ease: [0.25, 0.1, 0.25, 1] }}
            className="px-2 sm:px-4 md:px-6 py-3 md:py-4 border-b border-[var(--ren-border)] flex items-center justify-between gap-2 sm:gap-4 ren-bg-header"
            style={{ position: 'relative', zIndex: 10 }}
          >
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

              {/* Calculadoras */}
              <button
                onClick={() => router.push('/calculators')}
                className="p-1.5 sm:p-2 hover:bg-[var(--ren-bg-tertiary)] border border-transparent hover:border-[var(--ren-border)] rounded-lg transition-colors"
                title="Calculadoras clínicas"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="sm:w-[18px] sm:h-[18px] text-[var(--ren-text-tertiary)] hover:text-[var(--ren-text-secondary)]">
                  <path d="M22 12h-4l-3 9L9 3l-3 9H2"/>
                </svg>
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

              {/* Desktop: botones visibles directamente */}
              <div className="hidden md:flex items-center gap-0.5">
                {!isGuest && (
                  <button onClick={() => setIsProfileOpen(true)}
                    className="p-1.5 sm:p-2 hover:bg-[var(--ren-bg-tertiary)] border border-transparent hover:border-[var(--ren-border)] rounded-lg transition-colors"
                    title={userId === 'nero' ? 'Pensamientos' : 'Perfil'}>
                    {userId === 'nero' ? <StickyNote size={16} className="sm:w-[18px] sm:h-[18px] text-[var(--ren-text-tertiary)]" /> : <User size={16} className="sm:w-[18px] sm:h-[18px] text-[var(--ren-text-tertiary)]" />}
                  </button>
                )}
                <button onClick={() => setIsTricksOpen(true)}
                  className="p-1.5 sm:p-2 hover:bg-[var(--ren-bg-tertiary)] border border-transparent hover:border-[var(--ren-border)] rounded-lg transition-colors"
                  title="Tricks">
                  <Brain size={16} className="sm:w-[18px] sm:h-[18px] text-[var(--ren-text-tertiary)]" />
                </button>
                <button onClick={() => setIsSettingsOpen(true)}
                  className="p-1.5 sm:p-2 hover:bg-[var(--ren-bg-tertiary)] border border-transparent hover:border-[var(--ren-border)] rounded-lg transition-colors"
                  title="Configuración">
                  <Settings size={16} className="sm:w-[18px] sm:h-[18px] text-[var(--ren-text-tertiary)]" />
                </button>
                <button onClick={() => { exportCurrentSession(); }}
                  disabled={messages.length === 0}
                  className="p-1.5 sm:p-2 hover:bg-[var(--ren-bg-tertiary)] border border-transparent hover:border-[var(--ren-border)] rounded-lg transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                  title="Exportar">
                  <Download size={16} className="sm:w-[18px] sm:h-[18px] text-[var(--ren-text-tertiary)]" />
                </button>
              </div>

              {/* Mobile: menú desplegable con los mismos botones */}
              <div className="relative md:hidden" ref={mobileMenuRef}>
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.9 }}
                  onClick={() => setIsMobileMenuOpen(prev => !prev)}
                  className="p-1.5 sm:p-2 hover:bg-[var(--ren-bg-tertiary)] border border-transparent hover:border-[var(--ren-border)] rounded-lg transition-colors"
                  title="Más opciones"
                >
                  <MoreHorizontal size={16} className="sm:w-[18px] sm:h-[18px] text-[var(--ren-text-tertiary)]" />
                </motion.button>

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
                      onClick={() => { setIsTricksOpen(true); setIsMobileMenuOpen(false); }}
                      className="w-full flex items-center gap-2.5 px-3.5 py-2 text-sm font-mono hover:bg-[var(--ren-bg-tertiary)] transition-colors"
                      style={{ color: 'var(--ren-text-secondary)' }}
                    >
                      <Brain size={15} />
                      Tricks
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
          </motion.header>

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
                  <span className="font-semibold">25 mensajes de cortesía</span>
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
            {!isInitialLoadDone ? (
              <div className="flex items-center justify-center min-h-[60vh]">
                <div className="w-6 h-6 border-2 border-[var(--accent-color)]/40 border-t-transparent rounded-full animate-spin" />
              </div>
            ) : messages.length === 0 && !hasGeneratedWelcome ? (
              isGuest ? (
                <EmptyState isGuest onSuggestionClick={(text) => handleSendMessage(text)} />
              ) : (
                <WelcomeLanding
                  onNewChat={createNewSession}
                  onOpenTricks={() => setIsTricksOpen(true)}
                  onOpenHistory={() => setIsHistoryOpen(true)}
                  onNavigate={(path) => router.push(path)}
                  sessionCount={serverSessions.length}
                  trickCount={tricks.length}
                  messageCount={serverSessions.reduce((sum, s) => sum + s.messages.length, 0)}
                  userName={userName}
                />
              )
            ) : (
              <>
                {[...messages, ...(streamingMsg ? [streamingMsg] : [])].map((message) => (
                  <div key={message.id}>
                    {message.isError ? (
                      <div className="flex justify-center my-3">
                        <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-red-500/8 border border-red-500/20 text-red-400/90 text-xs font-mono text-center">
                          <span>⚠️</span>
                          <span>{message.text.replace('⚠️ ','')}</span>
                        </div>
                      </div>
                    ) : (
                      <ChatMessage
                        message={message.text}
                        isUser={message.isUser}
                        timestamp={message.timestamp}
                        model={message.model}
                        isDeep={message.isDeep}
                        activeTrick={message.activeTrick}
                        files={message.files}
                        onEdit={message.isUser ? (newText) => handleEditMessage(message.id, newText) : undefined}
                        isStreaming={streamingMsg?.id === message.id}
                      />
                    )}
                  </div>
                ))}
                {isTyping && !streamingMsg && <TypingIndicator />}
              </>
            )}
            <div ref={chatEndRef} />
          </div>

          {/* Active tricks indicator */}
          {tricks.filter(s => s.enabled).length > 0 && (
            <div className="px-4 md:px-6 py-2 bg-[var(--accent-color)]/8 border-t border-[var(--accent-color)]/20">
              <div className="flex items-center gap-2 flex-wrap">
                <Zap size={14} className="text-[var(--accent-hover)] flex-shrink-0" />
                <span className="text-[11px] font-mono text-[var(--accent-hover)]">Tricks activos:</span>
                {tricks.filter(s => s.enabled).map(s => (
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
            quickTricks={tricks}
            onToggleTrick={(id) => {
              const updated = tricks.map(s =>
                s.id === id ? { ...s, enabled: !s.enabled } : { ...s, enabled: false }
              );
              setTricks(updated);
              // Persist to server
              const enabledIds = updated.filter(s => s.enabled).map(s => s.id);
              fetch('/api/tricks/enabled', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({ user_id: userId, enabled: enabledIds }),
              }).catch(() => {});
              import('@/lib/api').then(m => {
                const trick = updated.find(s => s.id === id);
                if (trick && !isGuest) m.saveTrickToServer(userId, trick);
              }).catch(() => {});
            }}
          />
        </div>
      </motion.div>

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
        messages={messages}
      />

      {/* Tricks Panel */}
      <TricksPanel
        isOpen={isTricksOpen}
        onClose={() => setIsTricksOpen(false)}
        isGuest={isGuest}
        userId={userId}
        onSave={(s) => setTricks(s)}
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
