# NORMA

Escritorio de diseño para animación. No es un chat que pinta el corto de nuevo cada vez. Es un panel: archivo, mesa y director.

Lo primero es el personaje. Subes un boceto o pides que se mejore una lámina ya puesta. Frente, perfil, tres cuartos, espalda y expresión viven como tomas de la misma ficha. La hoja de modelo y la gía de cabezas no generan nada.

El fondo se ve. Si quieres otro lugar, creas un fondo y subes esa escena. En el plano, el papel de la lámina se recorta en el navegador y el personaje se arrastra, escala y voltea encima. Eso cuesta 0. Exportar el PNG también.

El director es DeepSeek. Mira la lámina abierta y llama herramientas: ficha, paleta, componer la escena, o como máximo una lámina nueva. Sin clave, el panel obedece órdenes cortas.

## En tu máquina

Usa **Símbolo del sistema** (`cmd`), no PowerShell, si Windows te bloquea `npm`.

La primera vez:

```bat
cd %USERPROFILE%\norma
npm install
copy .env.example .env
```

Cada vez que ensayas, un solo arranque:

```bat
vivo.bat
```

Abre `http://localhost:8080`.

`vivo.bat` deja dos ventanas:

- el escritorio (`npm run dev`)
- el espejo de GitHub (cada 5 segundos iguala tu carpeta a `main`)

Cuando yo subo un cambio, esa carpeta se actualiza sola y Vite recarga la página. Si no recarga, F5. No edites los archivos del repo en el PC: el espejo los pisa. Lo que hagas en el navegador (Lina, el plano, las claves en Ajustes) se queda, vive en el navegador.

En `.env`:

- `DEEPSEEK_API_KEY` para el director.
- `XAI_API_KEY` solo si vas a pedir una lámina nueva. También puedes pegarla en Ajustes. No la subas al repositorio.

Si un día cambio librerías, la ventana del espejo lo dice. Entonces: Ctrl+C en el escritorio, `npm install`, otra vez `vivo.bat`.

## Qué hay abierto

El corto de muestra es **La sal de Punta Palma**.

- **Lina Vives**: frente y perfil. Hoja, gía, paleta, fijar, poner en la escena.
- **Estero norte**: el fondo, visible.
- **PL 010**: Lina recortada sobre el estero. Arrastra hasta la raya del suelo.
- **Director**: a la derecha. Pega la clave de DeepSeek en Ajustes.

## Cerebro del proyecto

Para no perder el hilo entre conversaciones o agentes:

- `CEREBRO.md` — mapa, reglas, dónde está cada cosa.
- `docs/ESTADO.md` — qué funciona hoy y qué falta.
- `AGENTS.project.md` — protocolo obligatorio antes de tocar código.
