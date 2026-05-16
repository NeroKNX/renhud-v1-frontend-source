const API_BASE = '/api';

function getHeaders() {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  try {
    const raw = sessionStorage.getItem('ren_user');
    if (raw) {
      const user = JSON.parse(raw);
      if (user.jwt) headers['x-ren-token'] = user.jwt;
    }
  } catch {}
  return headers;
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

// --- Chat ---
export interface ChatPayload {
  message: string;
  user_id: string;
  deep?: boolean;
  history?: { role: string; content: string }[];
  files?: { name: string; type: string; data: string }[];
  active_skill?: string;
}

export interface ChatResponse {
  text: string;
  session_id?: string;
  is_child_session?: boolean;
}

export async function sendMessage(payload: ChatPayload): Promise<ChatResponse> {
  const res = await fetch(`${API_BASE}/chat`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify(payload),
  });

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
  const res = await fetch(`${API_BASE}/sessions?user_id=${encodeURIComponent(userId)}`, { headers: getHeaders() });
  if (!res.ok) return [];
  const data = await res.json();
  return data.sessions || [];
}

export async function saveSessions(userId: string, sessions: { id: string; title: string; messages: any[]; updatedAt?: string }[]): Promise<void> {
  if (!userId || userId.startsWith('guest_')) return;
  await fetch(`${API_BASE}/sessions/save`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify({ user_id: userId, sessions }),
  });
}

export async function saveSession(userId: string, id: string, title: string, messages: any[]): Promise<void> {
  if (!userId || userId.startsWith('guest_')) return;
  await fetch(`${API_BASE}/sessions/save`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify({ user_id: userId, id, title, messages }),
  });
}

export async function deleteSession(userId: string, sessionId: string): Promise<void> {
  await fetch(`${API_BASE}/sessions/${sessionId}?user_id=${encodeURIComponent(userId)}`, { method: 'DELETE', headers: getHeaders() });
}

export async function newSession(userId: string): Promise<string> {
  const res = await fetch(`${API_BASE}/nueva_sesion`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify({ user_id: userId }),
  });
  if (!res.ok) return Date.now().toString();
  const data = await res.json();
  return data.id;
}

// --- Skills ---
export interface ServerSkill {
  id: string;
  user_id?: string;
  name: string;
  instructions: string;
  created_at?: string;
}

const SYSTEM_SKILLS: SkillData[] = [
  { id: '__sys_cronologia-hc', name: 'HC', emoji: '📋', prompt: 'Estructurar historia clínica cronológicamente, organizando problemas activos, evolución por días y plan.', enabled: false, quickAccess: true },
  { id: '__sys_gasometria', name: 'Gases', emoji: '🫁', prompt: 'Analizar gases arteriales y venosos usando Henderson-Hasselbalch, Winter, PaFi/SaFi y perfusión (lactato, delta CO2, TEO2).', enabled: false, quickAccess: true },
  { id: '__sys_ulabs', name: 'Labs', emoji: '🧪', prompt: 'Estructurar resultados de laboratorio, identificar anomalías y dar interpretación clínica.', enabled: false, quickAccess: true },
];

export async function loadSkills(userId: string): Promise<SkillData[]> {
  if (userId.startsWith('guest_')) return [];
  const res = await fetch(`${API_BASE}/skills?user_id=${encodeURIComponent(userId)}`, { headers: getHeaders() });
  if (!res.ok) return [];
  const data = await res.json();
  const sys = userId === 'nero' ? SYSTEM_SKILLS.map(s => ({ ...s })) : [];
  // Filtrar skills del servidor que no sean duplicados del sistema
  const serverSkills = (data.skills || []).filter((s: ServerSkill) => !s.id.startsWith('__sys_'));
  return [...sys, ...serverSkills.map((s: ServerSkill) => ({
    id: s.id,
    name: s.name,
    prompt: s.instructions,
    enabled: false,
    quickAccess: true,
    emoji: '⚡',
  }))];
}

export interface SkillData {
  id: string;
  name: string;
  prompt: string;
  enabled: boolean;
  quickAccess?: boolean;
  emoji?: string;
  newChatOnActivate?: boolean;
}

export async function saveSkillToServer(userId: string, skill: SkillData): Promise<void> {
  if (userId.startsWith('guest_')) return;
  await fetch(`${API_BASE}/skills`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify({
      user_id: userId,
      name: skill.name,
      instructions: skill.prompt,
      skillId: skill.id,
    }),
  });
}

export async function deleteSkillFromServer(userId: string, skillId: string): Promise<void> {
  await fetch(`${API_BASE}/skills/${skillId}?user_id=${encodeURIComponent(userId)}`, { method: 'DELETE', headers: getHeaders() });
}
