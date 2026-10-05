# AKIRA OFFICE — PIXEL LIVING V2

## Decision gate

La Oficina de Akira es **exclusivamente 2D Pixel Art**. La vista 3D/WebGL queda eliminada del producto de Oficina.

## Visual ground truth

El escenario visible debe utilizar el arte autoral que ya existe en:

- `assets/office/LargePixelOffice.png` — escena principal.
- `assets/office/PixelOffice.png` — fallback de resolución menor.
- `assets/office/PixelOfficeAssets.png` — hoja de assets de referencia para futuras iteraciones de sprites.

La escena ya no debe sustituirse por muebles, paredes o habitaciones dibujados proceduralmente.

## Coordenadas

El mapa autoral está definido sobre una cuadrícula lógica de **32×24**. Las estaciones principales son:

- Akira: (12,4)
- Luna: (6,6)
- Nexo: (10,8)
- Nova: (16,6)
- Orion: (6,12)
- Kaori: (14,12)
- Zeri: (20,12)
- Lyra: (26,8)
- Dante: (4,16)
- Sala de Reuniones: (20,4)
- Cocina / Café: (26,2)
- Tablero de Misiones: (20,3)
- Entrada: (28,16)

## Runtime truth

- `/api/v8/agents` y `/api/v8/tasks` son las únicas fuentes de estado de agentes.
- La Oficina no escribe en el backend.
- El arte no debe inventar estados de trabajo.
- Cuando el backend no está confirmado, la interfaz debe decirlo.
- Dante permanece representado como desactivado y no cuenta como agente activo.

## Interacción

La Oficina puede:

- seleccionar agentes,
- destacar estados reales,
- mostrar rutas visuales,
- enviar agentes por el grafo visual a reuniones/café/tablero,
- pausar y reanudar la animación visual.

Estas acciones no modifican por sí mismas el backend.

## Regla visual

La fidelidad al arte creado tiene prioridad sobre añadir efectos nuevos. Primero se conserva la composición, mobiliario, iluminación, personajes y zonas del diseño autoral; después se añaden capas dinámicas con discreción.
