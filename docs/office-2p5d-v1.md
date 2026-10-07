# AKIRA OFFICE — 2.5D V1

## Objetivo
Evolucionar la Oficina Pixel existente a una escena 2.5D viva sin reconstruir el backend ni descartar el arte maestro.

## Activos reutilizados
- Escena maestra: `assets/office/01_akira_office_floor_v5_doors.png`
- Hoja de objetos: `assets/office/02_akira_office_assets_v5.png`
- Atlas base de agentes: `assets/office/02_office_agents_atlas_v3_clean4.png`
- Atlas direccional: `assets/office/02_akira_agents_walk_directional_v8_transparent.png`

No se generó una imagen nueva en V1 porque los activos existentes cubren escena, personajes y objetos.

## Qué aporta 2.5D
1. Profundidad visual por posición Y: los agentes y objetos ganan escala de manera controlada.
2. Sombras de contacto: cada agente tiene una sombra elíptica ligada a su posición.
3. Cámara de foco: al seleccionar un agente, la cámara hace un zoom suave hacia él.
4. Vista general: devuelve la cámara al encuadre completo.
5. Actividad: partículas deterministas, halos y pantallas animadas hacen visibles las estaciones ocupadas.
6. Etiquetas contextuales: los agentes activos muestran nombre y estación sin depender del panel lateral.
7. La navegación, tareas, estaciones y backend siguen siendo la autoridad; la capa 2.5D no inventa actividad.

## Regla de no-regresión
- Agentes no se bloquean entre sí.
- Obstáculos estáticos siguen bloqueando movimiento.
- La estación visual debe resolverse desde tarea/ruta/rol.
- Los sprites proceden de los assets existentes.
- No se sustituyen objetos de la escena maestra por muebles genéricos.
- El canvas debe pintar y el atlas debe validar sus frames.
- El E2E debe verificar la presentación 2.5D, controles, movimiento, estaciones y colisiones.

## Protocolo de aceptación
1. Sintaxis verde.
2. Build/Pages verde.
3. Browser E2E verde.
4. Pixel Office E2E verde.
5. Verificación Live del despliegue verde.
6. Revisión visual manual en móvil tras publicar.
