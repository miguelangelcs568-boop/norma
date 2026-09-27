# ESTADO — NORMA

Snapshot vivo. Actualízalo en el mismo commit que cambia producto, arquitectura o el flujo local.

## Ahora (2026-09-27)

- Repo: `miguelangelcs568-boop/norma`, rama `main`.
- Última línea de trabajo antes del cerebro: arranque de Vite en Windows sin depender del PATH (`package.json` → `node ./node_modules/vite/bin/vite.js dev --host 127.0.0.1 --port 8080`).
- Script de seguimiento: `scripts/seguir-github.bat` (pull cada 20 s).
- Cerebro instalado: `CEREBRO.md` + este archivo + `AGENTS.project.md`.

## Qué funciona

- Mesa con archivo / mesa / director.
- Semilla del corto **La sal de Punta Palma**: Lina (frente, perfil), Estero norte, PL 010.
- Recorte de papel en el navegador y export PNG (coste 0).
- Director DeepSeek con tools `ficha`, `generar_lamina`, `componer_escena`, `paleta`.
- Motor de lámina xAI `grok-imagine-image` (generate o edit).
- Persistencia local `norma-desk-v5`.

## Qué no está

- Vistas de Lina: tres cuartos, espalda, expresión.
- Más planos además de PL 010.
- Más fondos además del estero.
- Auth / multi-dispositivo (a propósito: off).
- Repo **cenit**: vacío, no es este proyecto.

## Cómo corre en la máquina de Miguel

```bat
cd %USERPROFILE%\norma
npm install
copy .env.example .env
npm run dev
```

Segunda ventana, no cerrar:

```bat
scripts\seguir-github.bat
```

Claves en `.env` o en Ajustes: `DEEPSEEK_API_KEY`, `XAI_API_KEY`.

## Próximo paso (si no hay pedido nuevo)

Seguir el escritorio: otra toma de Lina, otro plano, o pulir el director. No rehacer el scaffold.
