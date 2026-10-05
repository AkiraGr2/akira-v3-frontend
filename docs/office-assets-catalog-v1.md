# AKIRA OFFICE — AUTHORED PIXEL ASSETS V2

Fecha: 2026-10-05

## Decisión

Los assets Pixel Art autorales existentes son la **fuente visual canónica de la Oficina**.

Archivos:

| Archivo | Uso |
|---|---|
| `LargePixelOffice.png` | Escena principal de Oficina |
| `PixelOffice.png` | Fallback de la escena |
| `PixelOfficeAssets.png` | Hoja de assets / referencia visual |

Estos archivos fueron incorporados al repositorio antes de la implementación actual de la Oficina y no deben quedar sin utilizar mientras sigan siendo el diseño aprobado.

## Eliminación de 3D

La Oficina ya no utiliza:

- Three.js/WebGL para el escenario.
- Modelos GLB de mobiliario.
- Modelos GLB de personajes.
- Registro de assets 3D específico de Oficina.
- Renderer `akira-office-floor-v3.js`.

La importación de Three.js que permanezca en el proyecto corresponde únicamente a otras funciones independientes, como el Cerebro 3D, y no forma parte de la Oficina.

## Principio de fidelidad

No se debe crear una representación procedural genérica cuando existe un asset autoral equivalente.

La Oficina debe verse primero como el diseño aprobado y solo después enriquecerse con interacción y estado real.
