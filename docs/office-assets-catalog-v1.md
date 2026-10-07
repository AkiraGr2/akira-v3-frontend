# AKIRA OFFICE — INVENTARIO PIXEL ART V3

Fecha de auditoría: 2026-10-07

## Regla

La Oficina es 2D Pixel Art y conserva el arte autoral existente. El runtime debe usar fuentes activas reales para personajes, movimiento, estaciones y objetos; las referencias históricas no se deben confundir con sprites activos.

## Inventario en assets/office

| Archivo | Clasificación | Uso |
|---|---|---|
| 01_akira_office_floor_v5_doors.png | ACTIVO | Escenario canónico + puertas |
| 02_office_agents_atlas_v3_clean4.png | ACTIVO | 9 personajes × 19 frames de estado = 171 frames base |
| 02_akira_agents_walk_directional_v8_transparent.png | ACTIVO | 9 personajes × 14 poses direccionales únicas = 126 poses de movimiento |
| 02_akira_office_assets_v5.png | ACTIVO | Hoja de objetos/mobiliario e interacciones |
| 02_akira_agents_walk_directional_v8.png | REFERENCIA | Variante no transparente del atlas direccional |
| 02_office_agents_atlas_v3_clean3.png | REFERENCIA | Variante anterior del atlas de personajes |
| 01_office_master_scene.png | REFERENCIA | Escena maestra histórica |
| 01_office_scene_clean_v3.png | REFERENCIA | Variante histórica de escena |
| 02_office_ui_reference.png | REFERENCIA | Referencia visual de UI |
| 03_office_production_map.png | REFERENCIA | Mapa de producción |
| 04_office_map_objects_and_zones.png | REFERENCIA | Mapa de objetos y zonas |
| 05_office_assets_and_spritesheets.png | REFERENCIA | Referencia de sprites/hojas |

## Personajes

Los nueve nombres están presentes en el orden canónico:

Akira, Luna, Nexo, Nova, Orion, Kaori, Zeri, Lyra y Dante.

Cada personaje debe conservar:

- 19 frames base de estado: idle, walk, work, talk, think, use, reaction.
- 14 poses de movimiento únicas en el atlas direccional: 3 frente, 4 atrás, 3 izquierda y 4 derecha.
- Sus cuatro direcciones se seleccionan según la trayectoria.
- Dante no está bloqueado por configuración: su estado efectivo lo determina el backend.

## Objetos y mobiliario

El runtime valida y puede renderizar estos 12 grupos:

workstation_monitor, development, web, memory, printer, coffee, meeting, mission, mcp, chairs, lighting y props.

Los grupos de estación son capas visuales dinámicas. Las categorías de ambientación permanecen sutiles para no tapar la escena canónica.

## Interacciones visibles

Cuando un agente está trabajando o interactuando con una estación:

1. Se muestra el sprite autoral de la estación.
2. Se muestra una animación discreta de actividad.
3. Las pantallas reciben contenido dinámico pixelado para que el estado visual cambie.
4. Las tareas reales permanecen en su estación mientras el backend las reporte activas.
5. Una interacción manual sin tarea activa es temporal y luego devuelve al agente a su puesto.

## Auditoría automática

El E2E de Pixel Office comprueba:

- 9 personajes presentes.
- 171 frames base renderizables.
- 126 poses direccionales renderizables.
- Dante con sus 14 poses completas.
- 12 grupos de sprites de objetos válidos y con píxeles.
- Una sola acción visible de Interacción.
- Agentes no bloqueándose entre ellos.
- Estado de Dante controlado por backend.
