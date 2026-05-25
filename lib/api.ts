const API_BASE = '/api';

function fetchOpts(extra: RequestInit = {}): RequestInit {
  return {
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    ...extra,
  };
}

// --- Auth ---
export async function login(username: string, password: string): Promise<{ token: string; username: string; role: string; error?: string }> {
  const res = await fetch(`${API_BASE}/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Credenciales inválidas');
  return data;
}

export async function register(username: string, password: string, displayName?: string): Promise<{ token: string; username: string; role: string; recoveryCode?: string; error?: string }> {
  const res = await fetch(`${API_BASE}/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password, displayName: displayName || username }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Error al registrar');
  return data;
}

export async function forgotPassword(username: string, recoveryCode: string, newPassword: string): Promise<{ ok: boolean; message?: string; error?: string }> {
  const res = await fetch(`${API_BASE}/forgot-password`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, recoveryCode, newPassword }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Error al recuperar contraseña');
  return data;
}

/** Verificar sesión activa desde cookie HttpOnly */
export async function checkAuth(): Promise<{ user_id: string; username: string; role: string } | null> {
  try {
    const res = await fetch(`${API_BASE}/auth/me`, { credentials: 'include' });
    if (!res.ok) return null;
    return await res.json();
  } catch { return null; }
}

/** Cerrar sesión — limpia la cookie en el servidor */
export async function logout(): Promise<void> {
  await fetch(`${API_BASE}/auth/logout`, { method: 'POST', credentials: 'include' });
}

// --- Chat ---
export interface ChatPayload {
  message: string;
  user_id: string;
  deep?: boolean;
  history?: { role: string; content: string }[];
  files?: { name: string; type: string; data: string }[];
  active_trick?: string;
  tab_id?: string;
}

export interface ChatResponse {
  text: string;
  session_id?: string;
  is_child_session?: boolean;
}

// --- Streaming via GET stream endpoint (ReadableStream, no EventSource) ---
export interface StreamCallbacks {
  onMeta?: (meta: { session_id?: string; is_child_session?: boolean }) => void;
  onChunk?: (text: string) => void;
  onDone?: (fullText: string, sessionId?: string, isChild?: boolean) => void;
  onError?: (err: Error) => void;
}

/**
 * Envía mensaje via WebSocket (no se throttle al cambiar pestaña).
 * Fallback automático a SSE si WS no conecta en 3s.
 */
export function chatStreamWS(
  payload: ChatPayload,
  callbacks: StreamCallbacks
): { abort: () => void } {
  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  const wsUrl = `${protocol}//${window.location.host}/ws/chat`;
  const ws = new WebSocket(wsUrl);
  let aborted = false;

  ws.onopen = () => {
    if (!aborted) ws.send(JSON.stringify(payload));
  };

  ws.onmessage = (event) => {
    if (aborted) return;
    try {
      const data = JSON.parse(event.data);
      switch (data.type) {
        case 'meta':
          callbacks.onMeta?.({ session_id: data.session_id, is_child_session: data.is_child });
          break;
        case 'chunk':
          callbacks.onChunk?.(data.content);
          break;
        case 'done':
          callbacks.onDone?.(data.text, data.session_id, data.is_child);
          break;
        case 'error':
          callbacks.onError?.(new Error(data.message));
          break;
      }
    } catch (e) {
      callbacks.onError?.(new Error('Error al parsear mensaje WS'));
    }
  };

  ws.onerror = () => {
    if (!aborted) callbacks.onError?.(new Error('Error de conexión WebSocket'));
  };

  ws.onclose = () => {
    if (!aborted) callbacks.onError?.(new Error('Conexión WebSocket cerrada'));
  };

  return {
    abort: () => {
      aborted = true;
      ws.close();
    },
  };
}

/**
 * SSE fallback: envía mensaje vía POST (202 Accepted), luego streamea
 * via GET /api/chat/stream/:sessionId con ReadableStream.
 */
function startSSEStream(
  payload: ChatPayload,
  callbacks: StreamCallbacks,
  signal?: AbortSignal
): { abort: () => void } {
  let abortController: AbortController | null = null;
  let aborted = false;
  let sessionId: string | undefined = undefined;
  let isChildSession = false;
  let fullText = '';
  let pendingText = '';
  let rafId: number | null = null;
  let retryCount = 0;
  let fbrRetryCount = 0;
  const MAX_RETRIES = 3;
  const MAX_FBRETRIES = 5;
  let firstChunkTimer: ReturnType<typeof setTimeout> | null = null;
  let gotFirstChunk = false;

  function flush() {
    if (pendingText) {
      callbacks.onChunk?.(pendingText);
      pendingText = '';
    }
    rafId = null;
  }

  function scheduleFlush() {
    if (!rafId) {
      rafId = requestAnimationFrame(flush);
    }
  }

  if (signal) {
    if (signal.aborted) { aborted = true; }
    else {
      signal.addEventListener('abort', () => { aborted = true; if (abortController) abortController.abort(); }, { once: true });
    }
  }

  async function streamFromGET() {
    if (!sessionId || aborted) return;

    try {
      abortController = new AbortController();

      const streamRes = await fetch(`${API_BASE}/chat/stream/${sessionId}`, {
        credentials: 'include',
        signal: abortController.signal,
      });

      if (!streamRes.ok) {
        if (streamRes.status === 404 || streamRes.status === 410) {
          await fetchResultFallback();
          return;
        }
        throw new Error(`Stream error: ${streamRes.status}`);
      }

      if (!streamRes.body) {
        throw new Error('No response body');
      }

      const reader = streamRes.body.getReader();
      const decoder = new TextDecoder();
      let buf = '';

      firstChunkTimer = setTimeout(() => {
        if (!gotFirstChunk && !aborted) {
          if (abortController) abortController.abort();
          fetchResultFallback();
        }
      }, 30000);

      while (true) {
        const { done, value } = await reader.read();
        if (done && !value) break;
        if (value) buf += decoder.decode(value, { stream: !done });

        const parts = buf.split('\n');
        buf = parts.pop() || '';

        for (const line of parts) {
          const trimmed = line.trim();
          if (!trimmed || !trimmed.startsWith('data: ')) continue;

          const data = trimmed.slice(6);
          if (aborted) return;

          if (data === '[DONE]') {
            if (firstChunkTimer) { clearTimeout(firstChunkTimer); firstChunkTimer = null; }
            if (rafId) cancelAnimationFrame(rafId);
            flush();
            if (!fullText) {
              if (!aborted) await fetchResultFallback();
            } else {
              callbacks.onDone?.(fullText, sessionId, isChildSession);
            }
            return;
          }

          try {
            const parsed = JSON.parse(data);

            if (parsed.session_id !== undefined) {
              continue;
            }

            if (parsed.error) {
              throw new Error(parsed.error);
            }

            const content: string = parsed.content || '';
            if (content) {
              if (!gotFirstChunk) {
                gotFirstChunk = true;
                if (firstChunkTimer) { clearTimeout(firstChunkTimer); firstChunkTimer = null; }
              }
              fullText += content;
              pendingText += content;
              scheduleFlush();
            }
          } catch {}
        }
      }

      if (firstChunkTimer) { clearTimeout(firstChunkTimer); firstChunkTimer = null; }
      if (!aborted) {
        await fetchResultFallback();
      }
    } catch (err: any) {
      if (err.name === 'AbortError' || aborted) return;

      retryCount++;
      if (retryCount <= MAX_RETRIES && sessionId) {
        await new Promise(r => setTimeout(r, 1000 * retryCount));
        if (!aborted) return streamFromGET();
      }

      await fetchResultFallback();
    }
  }

  async function fetchResultFallback() {
    if (!sessionId || aborted) return;

    try {
      const res = await fetch(`${API_BASE}/chat/result/${sessionId}`, { credentials: 'include' });
      if (!res.ok) {
        if (res.status === 202 && fbrRetryCount < MAX_FBRETRIES) {
          fbrRetryCount++;
          await new Promise(r => setTimeout(r, 2000 * fbrRetryCount));
          if (!aborted) return fetchResultFallback();
        }
        callbacks.onError?.(new Error('No se pudo recuperar la respuesta'));
        return;
      }

      const data = await res.json();
      const text = data.cleaned || data.text;
      if (text) {
        if (rafId) cancelAnimationFrame(rafId);
        if (firstChunkTimer) { clearTimeout(firstChunkTimer); firstChunkTimer = null; }
        fullText = text;
        flush();
        callbacks.onDone?.(text, sessionId, isChildSession);
      } else if (fbrRetryCount < MAX_FBRETRIES) {
        fbrRetryCount++;
        await new Promise(r => setTimeout(r, 2000 * fbrRetryCount));
        if (!aborted) return fetchResultFallback();
      } else {
        callbacks.onError?.(new Error('Respuesta vacía'));
      }
    } catch {
      callbacks.onError?.(new Error('Error al recuperar resultado'));
    }
  }

  async function init() {
    if (aborted) return;

    try {
      const res = await fetch(`${API_BASE}/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ ...payload, wantStream: true }),
        signal,
      });

      if (aborted) return;
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.text || `Error: ${res.status}`);
      }

      const data = await res.json();
      sessionId = data.session_id;
      isChildSession = data.is_child_session || false;
      callbacks.onMeta?.({ session_id: sessionId, is_child_session: isChildSession });

      if (aborted || !sessionId) return;

      await streamFromGET();

    } catch (err: any) {
      if (err.name === 'AbortError' || aborted) return;
      if (sessionId) await fetchResultFallback();
      else callbacks.onError?.(err);
    }
  }

  init();

  return {
    abort: () => {
      aborted = true;
      if (rafId) cancelAnimationFrame(rafId);
      if (firstChunkTimer) { clearTimeout(firstChunkTimer); firstChunkTimer = null; }
      if (abortController) abortController.abort();
    },
  };
}

/**
 * Envía mensaje al chat. Intenta WebSocket primero (no se throttle al cambiar pestaña).
 * Si WS no conecta en 3s, fallback automático a SSE POST+GET/stream.
 */
export function chatStream(
  payload: ChatPayload,
  callbacks: StreamCallbacks,
  signal?: AbortSignal
): { abort: () => void } {
  let fallbackTimer: ReturnType<typeof setTimeout> | null = null;
  let aborted = false;
  let wsAbort: (() => void) | null = null;
  let sseCtrl: { abort: () => void } | null = null;

  const abortFn = () => {
    aborted = true;
    if (fallbackTimer) clearTimeout(fallbackTimer);
    if (wsAbort) wsAbort();
    if (sseCtrl) sseCtrl.abort();
  };

  // Try WebSocket first
  try {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}/ws/chat`;
    const ws = new WebSocket(wsUrl);
    let wsConnected = false;
    let wsClosed = false;

    let streamCompleted = false;

    ws.onopen = () => {
      if (aborted) { ws.close(); return; }
      wsConnected = true;
      if (fallbackTimer) { clearTimeout(fallbackTimer); fallbackTimer = null; }
      ws.send(JSON.stringify(payload));
    };

    ws.onmessage = (event) => {
      if (aborted) return;
      try {
        const data = JSON.parse(event.data);
        switch (data.type) {
          case 'meta':
            callbacks.onMeta?.({ session_id: data.session_id, is_child_session: data.is_child });
            break;
          case 'chunk':
            callbacks.onChunk?.(data.content);
            break;
          case 'done':
            streamCompleted = true;
            callbacks.onDone?.(data.text, data.session_id, data.is_child);
            break;
          case 'error':
            callbacks.onError?.(new Error(data.message));
            break;
        }
      } catch {
        callbacks.onError?.(new Error('Error al parsear mensaje'));
      }
    };

    ws.onerror = () => {
      wsClosed = true;
      if (streamCompleted) return;
      if (!wsConnected && !aborted) {
        // Nunca conectó — fallback a SSE
        sseCtrl = startSSEStream(payload, callbacks, signal);
      } else if (!aborted) {
        callbacks.onError?.(new Error('Error de WebSocket'));
      }
    };

    ws.onclose = () => {
      if (!wsClosed) wsClosed = true;
      if (streamCompleted) return;
      if (!wsConnected && !aborted) {
        // Conexión nunca se estableció — fallback a SSE
        if (sseCtrl === null) sseCtrl = startSSEStream(payload, callbacks, signal);
      } else if (!aborted && wsConnected) {
        // Se conectó pero se cerró inesperadamente
        callbacks.onError?.(new Error('Conexión cerrada'));
      }
    };

    // Timeout: si WS no conecta en 3s, caer a SSE
    fallbackTimer = setTimeout(() => {
      if (!wsConnected && !aborted) {
        wsClosed = true;
        ws.close();
        sseCtrl = startSSEStream(payload, callbacks, signal);
      }
    }, 3000);

    wsAbort = () => {
      wsClosed = true;
      if (ws.readyState === WebSocket.OPEN || ws.readyState === WebSocket.CONNECTING) {
        ws.close();
      }
    };
  } catch {
    // WebSocket no disponible (entorno sin WS) — SSE directo
    if (!aborted) sseCtrl = startSSEStream(payload, callbacks, signal);
  }

  return {
    abort: abortFn,
  };
}

export async function sendMessage(payload: ChatPayload): Promise<ChatResponse> {
  const res = await fetch(`${API_BASE}/chat`, fetchOpts({
    method: 'POST',
    body: JSON.stringify(payload),
  }));

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.text || `Error: ${res.status}`);
  }

  return res.json();
}

// --- Sessions ---
export interface ServerSession {
  id: string;
  title: string;
  messages: { id: string; text: string; isUser: boolean; timestamp: string; model?: string; isDeep?: boolean; files?: any[] }[];
  createdAt: string;
  updatedAt: string;
}

export async function loadSessions(userId: string): Promise<ServerSession[]> {
  const res = await fetch(`${API_BASE}/sessions?user_id=${encodeURIComponent(userId)}`, fetchOpts());
  if (!res.ok) return [];
  const data = await res.json();
  return data.sessions || [];
}

export async function saveSessions(userId: string, sessions: { id: string; title: string; messages: any[]; updatedAt?: string }[]): Promise<void> {
  if (!userId || userId.startsWith('guest_')) return;
  await fetch(`${API_BASE}/sessions/save`, fetchOpts({
    method: 'POST',
    body: JSON.stringify({ user_id: userId, sessions }),
  }));
}

export async function saveSession(userId: string, id: string, title: string, messages: any[]): Promise<void> {
  if (!userId || userId.startsWith('guest_')) return;
  await fetch(`${API_BASE}/sessions/save`, fetchOpts({
    method: 'POST',
    body: JSON.stringify({ user_id: userId, id, title, messages }),
  }));
}

export async function deleteSession(userId: string, sessionId: string): Promise<void> {
  await fetch(`${API_BASE}/sessions/${sessionId}?user_id=${encodeURIComponent(userId)}`, { method: 'DELETE', ...fetchOpts() });
}

export async function newSession(userId: string, tabId?: string): Promise<string> {
  const res = await fetch(`${API_BASE}/nueva_sesion`, fetchOpts({
    method: 'POST',
    body: JSON.stringify({ user_id: userId, tab_id: tabId }),
  }));
  if (!res.ok) return Date.now().toString();
  const data = await res.json();
  return data.id;
}

// --- Tricks ---
export interface ServerTrick {
  id: string;
  user_id?: string;
  name: string;
  instructions: string;
  created_at?: string;
}

const SYSTEM_TRICKS: TrickData[] = [
  { id: '__sys_cronologia-hc', name: 'HC', emoji: '📋', color: '#6366f1', prompt: 'Cronología hospitalaria integrada: organizar texto crudo de HC en orden temporal. Pre-filtrar estabilidad del día y pronóstico. Conservar hitos que cambiaron conducta. Narrativa continua, sin viñetas, sin títulos.', enabled: false, quickAccess: true },
  { id: '__sys_gasometria', name: 'Gases', emoji: '🫁', color: '#22c55e', prompt: 'Análisis completo de gases arteriales/venosos: Henderson-Hasselbalch, Winter, PaFi/SaFi, perfusión (lactato, delta CO2, TEO2). Entregar: (1) trastorno AB, (2) oxigenación, (3) perfusión, (4) conclusión clínica copiable.', enabled: false, quickAccess: true },
  { id: '__sys_ulabs', name: 'Labs', emoji: '🧪', color: '#f59e0b', prompt: 'Transcripción estructurada de paraclínicos: solo texto original, sin interpretar. Estandarizar nomenclatura, orden cronológico inverso. ⚠️ Gases arteriales/venosos: solo transcribir, NO analizar (competencia del trick Gases).', enabled: false, quickAccess: true },
];

export async function loadTricks(userId: string): Promise<TrickData[]> {
  if (userId.startsWith('guest_')) return [];
  const res = await fetch(`${API_BASE}/tricks?user_id=${encodeURIComponent(userId)}`, fetchOpts());
  if (!res.ok) return [];
  const data = await res.json();
  const sys = userId === 'nero' ? SYSTEM_TRICKS.map(s => ({ ...s })) : [];
  const serverTricks = (data.tricks || []).filter((trick: ServerTrick) => !trick.id.startsWith('__sys_'));
  return [...sys, ...serverTricks.map((trick: ServerTrick) => ({
    id: trick.id,
    name: trick.name,
    prompt: trick.instructions,
    enabled: false,
    quickAccess: (trick as any).quickAccess !== undefined ? !!(trick as any).quickAccess : true,
    emoji: (trick as any).emoji || '⚡',
    color: (trick as any).color || '#8b5cf6',
  }))];
}

export interface TrickData {
  id: string;
  name: string;
  prompt: string;
  enabled: boolean;
  quickAccess?: boolean;
  emoji?: string;
  color?: string;
  newChatOnActivate?: boolean;
}

export async function saveTrickToServer(userId: string, trick: TrickData): Promise<void> {
  if (userId.startsWith('guest_')) return;
  await fetch(`${API_BASE}/tricks`, fetchOpts({
    method: 'POST',
    body: JSON.stringify({
      user_id: userId,
      name: trick.name,
      instructions: trick.prompt,
      trickId: trick.id,
      emoji: trick.emoji || '⚡',
      color: trick.color || '#8b5cf6',
      quickAccess: trick.quickAccess ?? true,
    }),
  }));
}

export async function deleteTrickFromServer(userId: string, trickId: string): Promise<void> {
  await fetch(`${API_BASE}/tricks/${trickId}?user_id=${encodeURIComponent(userId)}`, { method: 'DELETE', ...fetchOpts() });
}
