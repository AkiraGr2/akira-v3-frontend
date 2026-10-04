# Akira Cognitive Workspace — UI Contract v2

## Decisión

El frontend deja de tratarse como un prototipo pixel-art. La dirección visual oficial desde este punto es **Akira Cognitive Workspace**.

## Principios

1. **Chat primero, pero no chat solamente.** El chat es la puerta de entrada; misiones, cerebro, evidencia y administración son superficies de trabajo.
2. **Control antes que decoración.** Estados de agente, pasos, aprobaciones, resultados y errores deben ser encontrables.
3. **Akira tiene identidad propia.** La interfaz representa a Akira como un sistema cognitivo con autoconocimiento, memoria, conocimiento, aprendizaje, capacidades, agentes y misiones. No se diseña como un chatbot genérico con una capa visual encima.
4. **Moderno y sobrio.** Fondo oscuro profundo, superficies translúcidas discretas, bordes suaves, jerarquía tipográfica clara y acento violeta/menta.
5. **Mobile first.** La interfaz debe funcionar correctamente desde Android; los controles deben ser táctiles y el Brain debe conservar un viewport usable.
6. **No esconder la realidad del sistema.** El UI no debe mostrar como verificada una capacidad que el backend no haya demostrado.
7. **No romper contratos.** Este rediseño es visual; no debe cambiar APIs, persistencia, permisos ni comportamiento de negocio.

## Arquitectura visual

- **Chat:** conversación limpia, composer amplio y acciones secundarias discretas.
- **Cerebro:** espacio inmersivo para 2D/3D, selección, relaciones y contexto.
- **Oficina Cognitiva:** representación viva del sistema multiagente. El núcleo central representa a Akira y las estaciones representan agentes persistentes. Las animaciones de actividad se basan en estados/tareas reales; el movimiento ambiental no debe presentarse como actividad factual.
- **Misiones:** lista + detalle + plan + progreso + aprobación, como centro de control.
- **Niveles/Capabilities:** estados derivados del Capability Engine, con evidencia visible cuando proceda.
- **Admin:** superficie operativa, no protagonista del producto.
- **Cuenta:** identidad/sesión separadas de estado cognitivo.

## Criterios de aceptación visual

- sin estética pixel-art en la interfaz principal;
- la Oficina debe soportar movimiento ambiental continuo y movimiento de trabajo condicionado al estado real del agente;
- el número de agentes mostrado debe derivarse del registro persistente, no de una lista fija de cinco;
- la Oficina debe degradar con honestidad cuando no exista sesión válida o el backend no responda.
- responsive en móvil y desktop;
- contraste y foco de teclado visibles;
- botones y campos con áreas táctiles suficientes;
- estados activos/inactivos claramente diferenciados;
- no introducir textos que atribuyan capacidades no demostradas;
- no modificar contratos de backend.

## Orden

Este contrato se congela antes de continuar con fases funcionales nuevas. Las siguientes iteraciones visuales deben ser ajustes dentro de esta dirección, no otro cambio completo de identidad visual.
