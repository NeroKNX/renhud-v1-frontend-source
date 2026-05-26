# BUGS REPORT — May 25 2026

## Bug #1: Trick no responde desde su perspectiva al preguntar "qué has aprendido"

**Síntoma:** Al preguntar "qué has aprendido" con un trick clínico activo (Gases/🫁), REN responde como REN general, no desde el trick.

**Causa raíz (3 problemas concurrentes):**

1a) **Frontend envía `activeTrick: trickInfo` (camelCase + objeto) en vez de `active_trick` (snake_case + string ID)** en algunas rutas de código. El backend espera `active_trick` (snake_case, string) en req.body. Si no coincide → `active_trick` es `undefined` → `isTrickActive` false → REN responde normal.

1b) **El hardcoded response en learningQuery (línea 653-662) impide que el stripping de system prompt (línea 696) se ejecute.** Si no hay memorias, hace return antes de llegar al bloque que mutila el prompt.

1c) **El `filteredMemResults` filtra por `active_trick_id` contra metadata parseado.** Si `metadata` no es string JSON parseable o la comparación falla, el filtro retorna vacío aunque haya memorias relevantes.

**Archivos afectados:**
- `/root/produccion/renhud-prod/app/chat/page.tsx` — líneas 596, 612, 627: inconsistencia en el envío de active_trick
- `/root/ren-proxy/lib/chat-handler.js` — líneas 650-662: hardcoded response antes del stripping
- `/root/ren-proxy/lib/chat-handler.js` — línea 636: parse de metadata (string → objeto)

## Bug #2: Respuestas de REN desaparecen al recargar la página cuando hay un trick activo

**Síntoma:** Cuando hay un trick activo (Gases, Labs, etc.), los mensajes de REN se pierden al recargar la página. Los mensajes del usuario sí aparecen.

**Causa raíz:** `loadSessions()` en `db.js` (línea 176) filtra con `WHERE parent_id IS NULL`. Cuando un trick está activo, los mensajes se guardan en una **child session** (tiene `parent_id` no nulo, ej: `1779757714728___sys_ga`). Al recargar, el frontend llama a `loadSessions` que solo retorna las parent sessions → las child sessions con los mensajes del trick nunca se cargan → las respuestas de REN "desaparecen".

**Archivos afectados:**
- `/root/ren-proxy/lib/db.js` — línea 176: `WHERE parent_id IS NULL` filtra child sessions

**Solución propuesta:**
- `loadSessions()` también debe cargar las child sessions asociadas, o
- El frontend debe resolver las child sessions al cargar, o  
- Cambiar la lógica para que los mensajes con trick activo se guarden en la parent session (con metadata.trick) en vez de en child sessions
