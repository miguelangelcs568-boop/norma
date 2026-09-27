# ESTADO — NORMA

Snapshot vivo. Actualízalo en el mismo commit que cambia producto, arquitectura o el flujo local.

## Ahora (2026-09-27 noche)

- Repo: `miguelangelcs568-boop/norma`, rama `main`.
- Ensayo: `vivo.bat` → `http://localhost:8080`.
- Interfaz: papel cálido de Punta Palma (ya no chrome frío de teléfono).
- Intérprete de pedidos en `src/lib/desk/brief.ts`. Una frase vaga se vuelve ficha + brief de pintura antes de tocar el pincel.
- Ejemplo: «quiero un personaje alto con traje» crea personaje nuevo (no pisa a Lina), escribe medida/ropa/nunca, pide el frente como maestro.
- «perfil» con Lina abierta deriva o reusa. No inventa otra cara.
- Láminas: xAI si hay clave; si no, motor de prueba solo cuando el activo aún no tiene toma.

## Qué hay debajo

1. Miguel dice una frase.
2. NORMA la interpreta (Orden muestra cómo lo leí y la prensa: reusa / deriva / pinta).
3. DeepSeek, si hace falta, obedece ese brief. No lo vuelve genérico.
4. Pincel pinta solo maestros. Mesa recorta, mueve, exporta a coste 0.

## Cómo probar

1. `vivo.bat`.
2. En Orden: `quiero un personaje alto con traje`.
3. Con Lina abierta: `perfil` — no debe pintar otra persona.
4. `quiero un fondo del muelle de noche`.

## Qué no está

- Vistas extra de Lina ya pintadas a mano, línea de tiempo, voces, 3D, ComfyUI local.
