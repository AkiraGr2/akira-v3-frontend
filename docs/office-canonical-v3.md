# AKIRA OFFICE — CANONICAL V3.2

## Runtime visual source

La Oficina utiliza como escena de producción únicamente:

- `assets/office/01_office_master_scene.png`

Las otras imágenes son referencias de producción:

- `assets/office/02_office_ui_reference.png`
- `assets/office/03_office_production_map.png`
- `assets/office/04_office_map_objects_and_zones.png`
- `assets/office/05_office_assets_and_spritesheets.png`

No se usan como sustitutos de la escena maestra.

## Mapa canónico

Sistema lógico de 32×24 tiles, origen arriba-izquierda.

### Agentes

| Agente | Rol | Estado de diseño | Coordenada |
|---|---|---|---|
| Akira | Supervisor | active | (13,7) |
| Luna | Investigación | active | (5,7) |
| Nexo | Desarrollo | active | (9,11) |
| Nova | Creatividad | active | (17,11) |
| Orion | Análisis | active | (18,13) |
| Kaori | Organización | active | (23,12) |
| Zeri | Soporte | active | (21,16) |
| Lyra | Estrategia | active | (25,9) |
| Dante | Desactivado | disabled | (6,17) |

### Puntos principales

| Punto | Coordenada |
|---|---|
| Entrada | (27,18) |
| Corredor sur | (22,17) |
| Lounge | (10,17) |
| Centro | (16,13) |
| Centro norte | (16,9) |
| Akira | (13,7) |
| Tablero | (21,7) |
| Café | (27,7) |
| Impresora | (15,11) |
| Reuniones | (21,12) |
| Luna | (5,7) |
| Nexo | (9,11) |
| Nova | (17,11) |
| Orion | (18,13) |
| Kaori | (23,12) |
| Zeri | (21,16) |
| Lyra | (25,9) |
| Dante espera | (6,17) |

## Identidad backend ↔ personaje visual

- Akira → internal
- Luna → researcher
- Nexo → developer
- Nova → graph_builder
- Orion → reviewer
- Kaori → memorizer
- Zeri → tester
- Lyra → learner
- Dante → selftest_agent

## Regla de fidelidad

La Oficina no vuelve a dibujar con rectángulos ni sustituye los elementos del diseño por muebles genéricos.

La escena visible debe partir del arte maestro. Cualquier capa interactiva posterior se superpone con discreción y nunca reemplaza el diseño.


## V3.2 runtime guarantees

- El atlas de agentes V3.2 usa 19 frames por personaje: idle(3), walk(3), work(3), talk(3), think(2), use(3), reaction(2).
- La navegación utiliza puntos de salida/stand separados de las huellas de escritorios, impresora, tablero, cocina y mesa de reuniones.
- Las aristas de movimiento se validan geométricamente contra `collision_blocks`; una arista que intersecta un obstáculo queda automáticamente excluida.
- Las rutinas ambientales usan destinos compatibles con el rol de cada agente en lugar de seleccionar rutas arbitrarias.
