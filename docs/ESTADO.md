# ESTADO — NORMA

Snapshot vivo. Actualízalo en el mismo commit que cambia producto, arquitectura o el flujo local.

## Ahora (2026-09-27)

- Repo: `miguelangelcs568-boop/norma`, rama `main`.
- Ensayo en vivo: `vivo.bat` abre el escritorio y una segunda ventana que iguala la carpeta a `origin/main` cada 5 s (`git fetch` + `git reset --hard`). Vite mira el disco con polling.
- `.env` no se pisa (no está en git). Lo que se dibuja en el navegador vive en `localStorage` (`norma-desk-v5`) y tampoco se pisa.
- Preferencias de interfaz (tema claro/oscuro) viven aparte en `localStorage` `norma-desk-prefs`. No tocan el corto.
- Si editas un archivo del repo a mano en el PC, el espejo lo pisa. El código se cambia en GitHub, no en la carpeta local.
- Cerebro: `CEREBRO.md` + este archivo + `AGENTS.project.md`.

## Qué funciona

- Mesa con archivo / mesa / director.
- Semilla del corto **La sal de Punta Palma**: Lina (frente, perfil), Estero norte, PL 010.
- Recorte de papel en el navegador y export PNG (coste 0).
- Director DeepSeek con tools `ficha`, `generar_lamina`, `componer_escena`, `paleta`.
- Motor de lámina xAI `grok-imagine-image` (generate o edit).
- Persistencia local `norma-desk-v5`.
- Interfaz tipo Apple: tipografía de sistema, radios, panel de Ajustes, tema claro y oscuro.
- Puente GitHub → localhost para ensayar lo que Grok sube.

## Qué no está

- Vistas de Lina: tres cuartos, espalda, expresión.
- Más planos además de PL 010.
- Más fondos además del estero.
- Auth / multi-dispositivo (a propósito: off).
- Repo **cenit**: vacío, no es este proyecto.

## Cómo corre en la máquina de Miguel

Una vez:

```bat
cd %USERPROFILE%\norma
npm install
copy .env.example .env
```

Cada sesión, un doble clic o:

```bat
vivo.bat
```

Abre `http://localhost:8080` y ensaya. No cierres las dos ventanas negras.

Si la ventana del espejo dice que cambiaron librerías: Ctrl+C en el escritorio, `npm install`, otra vez `vivo.bat`.

Claves en `.env` o en Ajustes: `DEEPSEEK_API_KEY`, `XAI_API_KEY`. Tema claro u oscuro en Ajustes o en el botón de luna/sol.

## Próximo paso (si no hay pedido nuevo)

Seguir el escritorio: otra toma de Lina, otro plano, o pulir el director. No rehacer el scaffold.
