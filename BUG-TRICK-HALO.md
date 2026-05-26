# Bug: Tag y halo de mensajes con tricks desaparecen al recargar página

## Contexto
Los mensajes del chat que se enviaron con un trick activo (ej. Gases, Labs, Cronología HC) muestran un badge o tag con el emoji y nombre del trick + un halo de color alrededor del mensaje. Al recargar la página, estos badges y halos desaparecen aunque el trick metadata esté guardado en el servidor.

## Directorio del proyecto
/root/produccion/renhud-prod

## Archivos relevantes

### 1. app/chat/page.tsx - Frontend principal
- Línea 144-148: Extrae trick metadata de la respuesta del servidor:
```js
let msgTrick = m.activeTrick;
if (!msgTrick && m.metadata?.trick) {
    msgTrick = m.metadata.trick;
}
```
- Línea 560-567: Crea `trickInfo` del trick activo:
```js
const activeTrickData = tricks.find(s => s.enabled);
const trickInfo: TrickInfo | undefined = activeTrickData
  ? { id: activeTrickData.id, name: activeTrickData.name, emoji: activeTrickData.emoji || '⚡', color: activeTrickData.color || '#8b5cf6' }
  : undefined;
```
- Línea 596: Se asigna a userMessage: `activeTrick: trickInfo`
- Línea 614: Se asigna a streamingMsg: `activeTrick: trickInfo`
- Línea 656-661: Se asigna a assistantMsg: `activeTrick: trickInfo`
- Línea 410: saveSession al servidor con debounce
- Línea 582: saveSession temprano (userMsgSave)

### 2. lib/session-manager.ts - Definiciones y cache
- Línea 10: `Message` interface tiene `activeTrick?: TrickInfo`
- Línea 3-7: `TrickInfo` interface: `{ id, name, emoji, color }`
- Línea 18: `ChatSession` interface

### 3. components/chat/chat-message.tsx - Renderizado
- Línea 35: Prop `activeTrick?: TrickInfo`
- Línea 206-229: Renderiza badge y halo de color

### 4. lib/api.ts - API calls
- loadSessions: GET /api/sessions
- saveSession: POST /api/sessions/save
- saveSessions: POST /api/sessions/save (batch)

### 5. Backend: /root/ren-proxy/server.js
- Línea 147: GET /api/sessions → llama loadSessions() en db.js
- Línea 167: POST /api/sessions/save → guarda messages con metadata
- Línea 184-202: `m.activeTrick ? JSON.stringify({ trick: m.activeTrick }) : '{}'`

### 6. Backend: /root/ren-proxy/lib/db.js
- Línea 174: loadSessions() → SELECT de session_messages con metadata
- Línea 185: metadata: `JSON.parse(m.metadata)` si existe

## Flujo actual
1. Usuario activa trick → Frontend crea `trickInfo` del trick activo
2. User message se guarda con `activeTrick: trickInfo`
3. Assistant message se guarda con `activeTrick: trickInfo`
4. saveSession envía al servidor → server guarda como `metadata: { trick: trickInfoObject }`
5. Al recargar: loadSessionsFromServer obtiene del servidor
6. Frontend extrae `m.metadata?.trick` como msgTrick
7. Se asigna `activeTrick: msgTrick` al mensaje
8. Renderizado debería mostrar badge y halo

## Hipótesis de la causa raíz
El `sessionStorage` cache (SessionManager) puede estar contaminado con mensajes viejos sin TrickInfo. O el server no está devolviendo metadata.trick correctamente. O hay un bug en cómo se serializa/deserializa TrickInfo entre React state y el servidor.

## Lo que necesitamos
1. Diagnosticar si el problema está en:
   a) El servidor NO guarda metadata.trick (o se pierde al guardar)
   b) El servidor SÍ guarda pero NO devuelve metadata.trick
   c) El frontend NO parsea correctamente metadata.trick al cargar
   d) El sessionStorage cache (SessionManager) es el que se muestra primero y no tiene trick data
   e) Otro

2. Aplicar fix según causa raíz encontrada

## Comandos útiles
- Servidor: pm2 list, pm2 logs ren-proxy --lines 50
- Proxy restart: systemctl restart ren-proxy.service  O  pm2 restart ren-proxy
- Build: npm run build && cp -a out/* /var/www/renhud/
