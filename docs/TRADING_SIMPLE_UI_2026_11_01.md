# Trading Lab: vista sencilla y recuperación de datos

Cambio solicitado: priorizar gráfico y una única tarjeta de entrada, con lenguaje cotidiano. Resultados técnicos, registro exportable y precios anteriores quedan en secciones cerradas. Se retiran de la navegación principal paneles de interés compuesto, integración externa y controles de Telegram que no envían señales en el modo experimental. Los controles conservados siguen usando los handlers existentes. No se altera ninguna regla de entrada ni se esconden pérdidas: la advertencia de resultados adversos permanece visible junto al gráfico.

La vista M1 reutiliza su historial para analizar; no solicita de nuevo las mismas velas. Para otras vistas, un error del historial de análisis pausa los avisos y reintenta hasta tres veces (2/4/8 segundos), con cancelación al cambiar de mercado o cerrar el socket. Otros errores de datos invalidan el feed y pasan a la reconexión existente. La causa del error interno del servidor no está acreditada; esta corrección trata la duplicación y la recuperación del cliente.

Pruebas: sintaxis del código, tests de conexión con error simulado y recuperación, historial M1 único, cancelación del reintento; navegador móvil con gráfico antes de los detalles, secciones cerradas, aviso de riesgo visible y controles principales disponibles. La funcionalidad no acredita rentabilidad ni órdenes MT5.

Continuidad: la interfaz previa del PR #99 continúa siendo el antecedente; este cambio no modifica backend, Render, Supabase ni el historial de investigación. El acceso local al computador estuvo intermitente; la edición se preparó mediante el conector GitHub y debe sincronizarse a la bóveda si no se logra hacerlo localmente en esta sesión.
