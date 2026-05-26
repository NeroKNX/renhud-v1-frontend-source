# BUG: Streaming response no aparece en frontend

## Síntoma
- Usuario envía mensaje → ve "..." (loading indicator)
- Loading termina pero **nunca aparece la respuesta**
- Al recargar la página, la respuesta SÍ aparece (se guardó correctamente en DB)

## Diagnóstico

### Lo que funciona ✅
- Backend SSE endpoint (`GET /api/chat/stream/:sessionId`) → probado via curl, entrega chunks + `[DONE]` correctamente
- Backend `runStreamingChat()` → guarda en DB correctamente
- Nginx proxy config → `/ws/` tiene `proxy_http_version 1.1` + `Upgrade`/`Connection` headers, timeout 86400s

### Flujo actual del frontend (`lib/api.ts`):
1. `chatStream()` intenta **WebSocket primero** (`/ws/chat`)
2. Si WS no conecta en 3 segundos → fallback a SSE (`startSSEStream`)
3. SSE: POST a `/api/chat` con `wantStream: true` → obtiene sessionId → GET `/api/chat/stream/:sessionId`

### Hipótesis principal
El WebSocket **SÍ conecta** (dentro de 3s), por lo que el fallback a SSE nunca se activa. Pero el WS handler en el backend (`lib/ws-handler.js`) o el Nginx proxy de WS podrían tener un problema que hace que:
- Los chunks se pierdan en el camino
- O el `onDone` nunca llegue al frontend
- Pero `runStreamingChat` igual guarda en DB (por eso aparece al recargar)

## Para depurar

### 1. Probar WS directo
```bash
# Usar wscat o websocat para conectar al WS
# (instalar websocat: npm install -g websocat)
# y enviar un mensaje manualmente
```

### 2. Forzar SSE bypass
En `lib/api.ts`, `chatStream()`: forzar que SIEMPRE use SSE (comentar el WS try/catch) para ver si el SSE funciona correctamente desde el frontend.

### 3. Ver logs del backend
```bash
journalctl -u ren-proxy.service --no-pager -n 50 | grep -i "ws\|stream\|error\|chunk\|done"
```

## Código relevante

- **Frontend:** `lib/api.ts` → `chatStream()`, `startSSEStream()`
- **Frontend page:** `app/chat/page.tsx` → callbacks `onChunk`, `onDone`, `onError`
- **Backend WS:** `lib/ws-handler.js`
- **Backend SSE:** `lib/chat-handler.js` → `handleGetStream`, `runStreamingChat`
- **Nginx:** `/etc/nginx/sites-enabled/renx.app` → location `/ws/`

## Posibles soluciones

### Opción A — Deshabilitar WS y usar solo SSE
Si el WS está causando problemas, hacer que `chatStream()` vaya directo a SSE.

### Opción B — Debuggear WS handler
Verificar que los callbacks WS (`onChunk`, `onDone`) se ejecuten correctamente y que el frontend los reciba.

### Opción C — Agregar timeout/rescue en frontend
Si después de N segundos sin `onDone`, hacer un fallback a `GET /api/chat/result/:sessionId` para obtener la respuesta guardada.
