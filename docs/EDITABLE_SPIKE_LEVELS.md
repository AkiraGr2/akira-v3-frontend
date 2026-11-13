# Niveles personales del escáner

El aviso dibuja entrada, SL y TP1–TP3. «Ajustar SL / TP» abre los cuatro precios dentro de los detalles; no añade paneles permanentes. «Aplicar al gráfico» modifica dibujo y copia. «Restaurar propuesta» recupera los niveles del escáner. Un asterisco identifica precios personales.

Solo precios positivos finitos. Compras: SL < entrada < TP1 < TP2 < TP3; ventas: orden inverso. Se respeta la distancia mínima de stop si existe una especificación declarada. El lote orientativo se recalcula a partir del stop personalizado y del presupuesto de riesgo existente; sin contrato verificable no se inventa un lote.

Los ajustes pertenecen al aviso, quedan guardados con él en este navegador y no se propagan al siguiente aviso. No cambian la entrada, el plazo de validez ni los resultados de la simulación original. Pueden editarse para revisión una vez vencido, pero copiar una entrada vencida sigue bloqueado. El historial no evalúa operaciones personalizadas ni afirma que se ejecutaron en MT5. Akira no envía órdenes.

Pruebas: test_manual_spike_ui.js (validación compra/venta, valores inválidos, original intacto, dibujo); scripts/test_manual_chart_browser.js (controles reales, aplicar, rechazar y restaurar, móvil/escritorio, desbordamiento). Pruebas del plan y demo regular conservadas.
