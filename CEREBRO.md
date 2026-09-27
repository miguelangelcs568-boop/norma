# CEREBRO — NORMA

Fuente de verdad para cualquier agente (Grok u otro) que abra este repo.
Antes de editar código: lee este archivo y `docs/ESTADO.md`. Si cambias arquitectura, el corto o el flujo de Windows, actualiza ambos en el mismo commit.

## Qué es

NORMA no es un chat que pinta el corto de nuevo. Es un escritorio de producción:

1. **Archivo** — lista de activos.
2. **Mesa** — ficha, láminas, composición.
3. **Director** — DeepSeek mira la lámina abierta y llama herramientas.

Se guardan semilla, escala y decisiones. Los píxeles se derivan. Una lámina ya hecha se reutiliza; no se regenera la película.

## Qué no es

- No es **cenit** (el otro repo, SaaS de agentes de atención). No mezclar código ni nombres.
- No es un playground de App Builder genérico. `AGENTS.md` es contrato de plataforma; las reglas de producto viven aquí.
- No añadas auth, base de datos ni cuentas salvo que Miguel lo pida. El escritorio vive en `localStorage` (`norma-desk-v5`).

## Repo y gente

- GitHub: `miguelangelcs568-boop/norma` (público, rama `main`).
- Cuenta: `miguelangelcs568-boop`. Correo: `miguelangelcs568@gmail.com`.
- El usuario trabaja en **Windows** con `cmd`, no PowerShell. Yo (Grok) no escribo en su PC. El puente es este repo + `scripts/seguir-github.bat`.
- Dev: `http://localhost:8080`. Script: `npm run dev` (Vite directo en Windows).

## Stack (no reinventar)

- TanStack Start + Router, React 19, Vite 8, Tailwind 4, Zustand.
- Puerto 8080. No borrar `public/__grok/`, `server/`, `scripts/grok-pwa-*`, `startup.sh`, ni el injector de marca.
- Rutas propias solo en `src/routes/`. La app es una sola ruta `/` que monta `Desk`.

## Mapa de código (toca aquí, no en otro sitio)

| Qué | Dónde |
|---|---|
| UI del escritorio | `src/components/desk/Desk.tsx` |
| Controles de mesa | `src/components/desk/controls.tsx` |
| Estado y semilla del corto | `src/lib/desk/store.ts` |
| Tipos | `src/lib/desk/types.ts` |
| Director DeepSeek + tools | `src/lib/desk/deepseek.functions.ts` |
| Motor de lámina (xAI / Grok Imagine) | `src/lib/desk/image.functions.ts` |
| Recorte de papel, paleta, export PNG | `src/lib/desk/images.ts` |
| Claves en el navegador | `src/lib/desk/keys.ts` |
| IndexedDB auxiliar | `src/lib/desk/idb.ts` |
| Láminas de muestra | `public/desk/` |
| Arranque local | `README.md`, `abrir.bat`, `scripts/seguir-github.bat` |

No copies el escritorio a otra carpeta. No crees un segundo store.

## Modelo de datos

- `AssetKind`: `personaje` \| `fondo` \| `escena` \| `prop`
- `ViewName`: `boceto`, `frente`, `perfil`, `tres_cuartos`, `espalda`, `expresion`, `fondo`, `prop`
- Un **personaje** tiene `spec` (role, costume, palette, never, notes) y `takes` (láminas).
- Una **escena** tiene `backgroundId` + `layers` (`x`, `y`, `scale`, `flip` en 0–1). Mover una capa cuesta **0**.
- `generar_lamina` cuesta **1** y como máximo una por respuesta del director.
- `ficha`, `paleta`, `componer_escena` cuestan **0**.

Persistencia:

- Proyecto: Zustand persist `localStorage` clave `norma-desk-v5`.
- Claves API del usuario: `localStorage` clave `norma-desk-keys`.
- Si cambias la forma del estado, sube la versión (`v5` → `v6`) o el navegador servirá basura vieja.

## IAs del producto (no confundir con este cerebro)

1. **Director** — DeepSeek (`deepseek-flash`) en `dirigir`. Tools: `ficha`, `generar_lamina`, `componer_escena`, `paleta`. Clave: `DEEPSEEK_API_KEY` o Ajustes.
2. **Motor de lámina** — xAI `grok-imagine-image` en `generarLamina`. Generate o edit si hay referencia. Clave: `XAI_API_KEY` o Ajustes.
3. **Este archivo** — memoria para el agente que programa. No llama APIs. No sustituye al director.

Nunca subas `.env` ni claves. Nunca regeneres Lina o el estero «sólo para probar».

## Corto de muestra — La sal de Punta Palma

Activos semilla en `seedProject()`:

- **Lina Vives** (`id: lina`): frente `/desk/lina-frente.jpg`, perfil `/desk/lina-perfil.jpg`. 161 cm. Camisa de lino manchada de sal, pantalón verde mangle, pañuelo óxido, zapatos bajos. Paleta `#e4d5bc #1e463c #a33b24 #1c1915`. Never: no cambiarle el pañuelo, no inventar joyas, no centrarla salvo plano de poder.
- **Estero norte** (`id: estero`): `/desk/estero.jpg`. Tarde. Sin personajes pintados.
- **PL 010 Umbral** (`id: pl-010`): Lina recortada sobre el estero. Capa `lay-lina` x=0.58 y=0.24 scale=0.68.

Faltan (no las inventes en silencio): tres cuartos, espalda, expresión, más planos, más fondos.

## Reglas al cambiar código

1. Lee `docs/ESTADO.md`. Si tu cambio lo deja mentiroso, corrígelo en el mismo commit.
2. Un cambio = una superficie. No reescribas Desk + DeepSeek + Vite «a la vez» salvo que el usuario lo pida.
3. El recorte de papel es local (canvas). Componer y exportar PNG cuestan 0. No pidas una imagen nueva para mover a Lina.
4. Habla con Miguel en español, producto primero. No le pidas que depure tu sandbox.
5. En Windows: `cmd`, `npm run dev`, segunda ventana `scripts\seguir-github.bat`. Si tocas `package.json`, avísa: hay que `npm install` otra vez.
6. No borres láminas de `public/desk/` sin reemplazo.
7. No conviertas NORMA en un chat genérico ni en un generador de clips de vídeo.

## Protocolo al abrir una conversación nueva

1. Confirmar repo: `miguelangelcs568-boop/norma` en `main`.
2. Leer `CEREBRO.md` y `docs/ESTADO.md` (y el último commit).
3. Si el usuario dice «continuamos», no re-scaffold. Editar en el sitio que marca la tabla.
4. Al terminar un cambio de producto, actualizar `docs/ESTADO.md` (fecha, qué quedó, qué sigue abierto).
