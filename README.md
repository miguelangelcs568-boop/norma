# NORMA

Escritorio de diseño para animación. No es un chat que pinta el corto de nuevo cada vez. Es un panel: archivo, mesa y director.

Lo primero es el personaje. Subes un boceto o pides que se mejore una lámina ya puesta. Frente, perfil, tres cuartos, espalda y expresión viven como tomas de la misma ficha. La hoja de modelo y la guía de cabezas no generan nada.

El fondo se ve. Si quieres otro lugar, creas un fondo y subes esa escena. En el plano, el papel de la lámina se recorta en el navegador y el personaje se arrastra, escala y voltea encima. Eso cuesta 0. Exportar el PNG también.

El director es DeepSeek. Mira la lámina abierta y llama herramientas: ficha, paleta, componer la escena, o como máximo una lámina nueva. Sin clave, el panel obedece órdenes cortas.

## En tu máquina

Usa **Símbolo del sistema** (`cmd`), no PowerShell, si Windows te bloquea `npm`.

```bat
cd %USERPROFILE%\norma
npm install
copy .env.example .env
npm run dev
```

Abre `http://localhost:8080`.

En `.env`:

- `DEEPSEEK_API_KEY` para el director.
- `XAI_API_KEY` solo si vas a pedir una lámina nueva. También puedes pegarla en Ajustes. No la subas al repositorio.

## Que los cambios del repo aparezcan solos

Yo no puedo escribir en tu PC. El puente es GitHub. Deja **dos** ventanas de `cmd` abiertas dentro de la carpeta `norma`:

Ventana 1 — el escritorio:

```bat
npm run dev
```

Ventana 2 — baja lo que yo suba, cada 20 segundos:

```bat
scripts\seguir-github.bat
```

No las cierres. Recarga el navegador si un cambio no se ve solo. Si un día cambio librerías (`package.json`), en la ventana 1 para con Ctrl+C, corre `npm install` y otra vez `npm run dev`.

## Qué hay abierto

El corto de muestra es **La sal de Punta Palma**.

- **Lina Vives**: frente y perfil. Hoja, guía, paleta, fijar, poner en la escena.
- **Estero norte**: el fondo, visible.
- **PL 010**: Lina recortada sobre el estero. Arrastra hasta la raya del suelo.
- **Director**: a la derecha. Pega la clave de DeepSeek en Ajustes.
