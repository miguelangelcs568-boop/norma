# NORMA

Compilador de producción para animación. No guarda dibujos. Guarda la semilla, los metros y las firmas. El plano se calcula.

La idea viene del mismo truco que hacía livianos a los simuladores de exploración espacial: el mundo no es un archivo de escenarios, es una función. Acercar el zoom no estira un bitmap. Vuelve a evaluar el ruido, con más octavas, y el archivo pesa lo mismo.

## Qué problema cierra

Pedirle a un modelo “haz el corto” se nota de lejos porque cada toma reinventa la cara, la luz y la escala. NORMA parte el trabajo en pasos que se firman:

1. Biblia. Puerta en centímetros, lente, sensor, pigmentos, lista de nunca.
2. Personaje. Estatura, cabezas, hombros. Frente y perfil salen de los mismos números.
3. Locación. Una semilla. El mapa o la planta se derivan. Si una sala no admite la puerta de la biblia, no se firma.
4. Plano. `h' = f · H / d`. Si el cuerpo no cabe, o se pierde, el corte falla.
5. Memoria. Aceptar o rechazar un número queda guardado. La siguiente propuesta se aleja de lo rechazado.

El modelo, si se consulta, solo puede devolver números dentro de un rango. No puede cambiar la estatura ni la semilla. Si se sale, la respuesta se rechaza y entra en la memoria. La propuesta matemática no gasta nada.

## La cuenta

```
peso     = bytes(semilla + proporciones + firmas + rechazos)
no peso  = planos × 24 fps × 4 s × 1920 × 1080 × 4
ahorro   = 1 − peso / no peso
crédito  = 0 mientras no se imprima una lámina ni se consulte el modelo
```

Un crédito de verdad aparece solo en dos sitios: imprimir la lámina (ahí nacen píxeles, una vez) y pedirle números al modelo (tope de 8 consultas por archivo).

## Carpetas

El archivo es un árbol de verdad: carpetas, subcarpetas, personajes, locaciones, secuencias, planos. Un plano suelto no existe sin saber de quién es y dónde está. Borrar un nodo no borra la biblia.

## Qué se reutiliza

- Ruido de valor y fBm, el mismo family de funciones de un mundo semilla.
- Proporción clásica de animación, pero como números editables, no como un prompt.
- Óptica de una cámara real: distancia focal, alto del sensor, fracción del cuadro.
- Invalidación por huella, como un compilador: si cambias la estatura, el plano que la usaba queda sucio. Lo demás no se toca.

## Qué no es

No es un generador de video de punta a punta. Eso es lo caro y lo que se ve falso. El video, si algún día entra, entra solo en un plano ya firmado.
