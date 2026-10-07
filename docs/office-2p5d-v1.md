# AKIRA OFFICE — 2.5D V1 + Desk Life V2

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


## Desk Life V2
Cada agente tiene un puesto fijo y una posición de asiento. La orientación de trabajo es hacia arriba (espalda visible) y la parte inferior del sprite queda ocluida por el frente del escritorio mediante una segunda lectura recortada de la escena maestra.

### Rutina sin tareas
Cuando el backend reporta al agente como disponible:
- permanece unos segundos en su puesto;
- recorre una secuencia determinista de zonas relacionadas con su rol;
- permanece brevemente en cada zona usando el estado visual apropiado;
- regresa a su puesto y repite el ciclo.

No hay roaming aleatorio.

### Prioridad de tareas reales
Cuando aparece una tarea backend:
1. se cancela la actividad ambiental;
2. el agente regresa inmediatamente a su puesto;
3. se orienta de espaldas al usuario;
4. entra en animación de trabajo;
5. permanece en el escritorio mientras el backend lo reporte trabajando.

La acción manual "Interacción" no puede sacar de su puesto a un agente que esté ejecutando una tarea real.

### Sprites y pantallas
No se requiere una imagen nueva en V2. Se reutilizan el atlas direccional de 14 poses, la hoja de objetos y la escena maestra. Los monitores de los puestos siguen visibles incluso en espera, con una señal muy tenue; durante trabajo real reciben una animación pixel más intensa.

### Verificación
El E2E comprueba:
- 9 puestos definidos;
- orientación de espalda y 4 poses posteriores;
- oclusión de escritorio;
- 9 rutinas ambientales deterministas;
- movimiento visible de agentes libres;
- prioridad de tarea real sobre roaming;
- protección de trabajadores frente a Interacción;
- 12 grupos de sprites de objetos;
- backend, navegación y no-bloqueo entre agentes;
- build y despliegue de Pages.
