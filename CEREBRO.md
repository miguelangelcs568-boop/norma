# CEREBRO — NORMA

Fuente de verdad para cualquier agente (Grok u otro) que abra este repo.
Antes de editar código: lee este archivo y `docs/ESTADO.md`. Si cambias arquitectura, el corto o el flujo de Windows, actualiza ambos en el mismo commit.
Oficio del estudio y de cada motor: ver también el mapa en el proyecto Grok (`ESTUDIO-Y-MOTORES.md`).

## Qué es

NORMA no es un chat que pinta el corto de nuevo. Es un escritorio de producción 2D:

1. **Archivo** — lista de activos.
2. **Mesa** — ficha, láminas, composición.
3. **Orden** — interpreta la frase de Miguel a brief de estudio; DeepSeek obedece ese brief cuando hay clave y la frase no es una orden corta.

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
| Orden (panel) | `src/components/desk/director.tsx` |
| Mesa / escena / árbol | `stage.tsx`, `scene.tsx`, `tree.tsx`, `tools.tsx` |
| Intérprete de frases | `src/lib/desk/brief.ts` |
| Estado, semilla y vacío | `src/lib/desk/store.ts` (`seedProject`, `emptyProject`) |
| Director DeepSeek + tools | `src/lib/desk/deepseek.functions.ts` |
| Motor de lámina | `src/lib/desk/image.functions.ts` |
| Recorte / paleta / PNG | `src/lib/desk/images.ts` |
| Preferencias UI | `src/lib/desk/prefs.ts` |

## IAs del producto

Hay tres voces. No se confunden:

1. **Intérprete** — código local en `brief.ts`. Convierte «alto con traje» o «que camine» en ficha + brief. No llama APIs. Hoy responde la mayoría de frases con una línea hecha.
2. **Director — DeepSeek `deepseek-flash`**. Solo entra si hay `DEEPSEEK_API_KEY` y la frase no es orden corta. Tools: `ficha`, `crear_activo`, `fijar`, `generar_lamina`, `componer_escena`, `paleta`.
3. **Pincel — xAI `grok-imagine-image` o ensayo**. Una lámina por pedido, solo si falta maestro.
4. **Grok en este chat** — el que programa NORMA con Miguel. No es el globo de la derecha del escritorio.

Nunca subas `.env`. Nunca regeneres Lina o el estero «sólo para probar».

## Cortos

- Semilla: **La sal de Punta Palma** (Lina, Estero norte, PL 010).
- Vacío: título «Sin título», cero activos, cine negro. El mundo no hereda el estero.
- Guardar / Abrir `.norma.json` no se pisan al cambiar de corto.

## Reglas al cambiar código

1. Un cambio = una superficie, salvo que Miguel pida varias.
2. Recortar / mover / exportar cuestan 0.
3. Habla con Miguel en español, producto primero.
4. Al terminar, actualiza `docs/ESTADO.md`.
