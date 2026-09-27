# CEREBRO — NORMA

Fuente de verdad para cualquier agente (Grok u otro) que abra este repo.
Antes de editar código: lee este archivo y `docs/ESTADO.md`. Si cambias arquitectura, el corto o el flujo de Windows, actualiza ambos en el mismo commit.

## Qué es

NORMA no es un chat que pinta el corto de nuevo. Es un escritorio de producción 2D:

1. **Archivo** — lista de activos.
2. **Mesa** — ficha, láminas, composición.
3. **Director** — DeepSeek obedece, mira lo abierto y llama herramientas.

Se guardan semilla, escala y decisiones. Los píxeles se derivan. Una lámina ya hecha se reutiliza; no se regenera la película.

El proceso se ajusta viendo. No hay que cerrar todo el plan antes de un cambio chico.

## Qué no es

- No es **cenit**. No mezclar.
- No es generador de clips ni de voces.
- No añadas auth ni base de datos salvo pedido. Estado: `localStorage` `norma-desk-v5`.

## Repo y gente

- GitHub: `miguelangelcs568-boop/norma` (público, `main`).
- Windows + `vivo.bat`. Grok no escribe en el PC. El espejo pisa código local cada 5 s.
- Dev: `http://localhost:8080`.

## Stack

TanStack Start + Router, React 19, Vite 8, Tailwind 4, Zustand. Puerto 8080.
No borrar `public/__grok/`, `server/`, `scripts/grok-pwa-*`, `startup.sh`.

## Mapa de código

| Qué | Dónde |
|---|---|
| UI del escritorio | `src/components/desk/Desk.tsx` |
| Director (panel) | `src/components/desk/director.tsx` |
| Mesa / escena / árbol | `stage.tsx`, `scene.tsx`, `tree.tsx`, `tools.tsx` |
| Estado y semilla | `src/lib/desk/store.ts` |
| Director DeepSeek + tools | `src/lib/desk/deepseek.functions.ts` |
| Motor de lámina xAI | `src/lib/desk/image.functions.ts` |
| Recorte / paleta / PNG | `src/lib/desk/images.ts` |
| Preferencias UI | `src/lib/desk/prefs.ts` |

## IAs del producto

1. **Director — DeepSeek `deepseek-flash`**. Obey. Tools: `ficha`, `generar_lamina`, `componer_escena`, `paleta`. Un escenario nuevo = ficha + `generar_lamina` view `fondo` sin personas.
2. **Pincel — xAI `grok-imagine-image`**. Generate o edit. Una lámina por pedido.
3. **Este archivo** — memoria del programador. No llama APIs.

Nunca subas `.env`. Nunca regeneres Lina o el estero «sólo para probar».

## Corto de muestra — La sal de Punta Palma

- Lina Vives: frente + perfil. Never: no cambiarle el pañuelo, no inventar joyas.
- Estero norte: tarde, sin personajes pintados.
- PL 010 Umbral: Lina recortada sobre el estero.

Faltan: tres cuartos, espalda, expresión, más planos, más fondos, línea de tiempo.

## Reglas al cambiar código

1. Un cambio = una superficie.
2. Recortar / mover / exportar cuestan 0.
3. Habla con Miguel en español, producto primero.
4. Al terminar, actualiza `docs/ESTADO.md`.
