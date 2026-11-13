# Giros · demo v1

Hipótesis independiente de los videos del usuario, no réplica de un indicador desconocido. Seleccionable en Detalles y ajustes > Precios, historial y configuración > Modo de práctica. El modo regular sigue siendo el predeterminado; preferencias se guardan por navegador. Compras Boom/ventas Crash 300/500/1000; otros mercados no cambian. Sin órdenes, Telegram ni porcentajes de ganancia.

## Regla congelada

Velas M1 cerradas y 12 M5 completas de contexto, con al menos65M1 y comprobación de continuidad/OHLC. Rechazo del extremo de20M1 anteriores: perforar el extremo y cerrar nuevamente dentro. Mecha >= cuerpo y >=25% de la mediana de rango verdadero de14velas previas. Variante rechazo: señal al cerrar esa vela. Variante confirmación: siguiente vela cierra sobre su máximo para compra o bajo su mínimo para venta. Identidad incluye versión, símbolo, variante y cierre real; no se desplaza el aviso al extremo pasado. M1/M5 de visualización no cambia la estrategia.

Stop fuera del extremo de rechazo/confirmación más15% de esa mediana; objetivos1R/2R/3R. Precios positivos, caducidad20s, desvío máximo0,2R, reacción simulada5s, máximo5min, sin solapamiento y espera120s tras finalizar seguimiento. Contrato existente, edición y tamaño orientativo se conservan. Nunca se transforma un ajuste del usuario en un resultado de estrategia.

El detector de ticks común etiqueta eventos cuando el cambio direccional supera3veces la mediana absoluta previa300ticks. Si el evento ya ocurrió durante rechazo/confirmación, la señal queda `after_spike` y la interfaz lo dice. Con cobertura incompleta queda `unknown`. `no_prior_spike_observed` no significa que se prediga un salto futuro. Eventos capturados se registran solo después del llenado hipotético y durante seguimiento activo. Un objetivo original alcanzado se marca con ✓; precios personalizados conservan * sin heredar resultados.

## Evidencia previa a publicación

Replay sobre9fechas conocidas (3–8y10–12noviembre), seis mercados, dos variantes; cada sesión permite5h54min39s de decisiones tras4h de calentamiento. Costes supuestos0,10/0,25/0,50R, no spread MT5. Datos públicos, hashes/calidad verificados. TP1/TP2/TP3 son alternativas, no beneficios sumables.20controles aleatorios con semillas reproducibles por sesión igualan cantidad de candidatos y dirección, no operaciones ejecutadas; stops usan información disponible en el instante de control.

| Mercado | Rechazo: avisos / TP1 neto a0,25R | Confirmación: avisos / TP1 neto a0,25R |
|---|---:|---:|
| Boom300 | 8 / -7,46R | 0 / 0 |
| Crash300 | 7 / -5,04R | 2 / -1,85R |
| Boom500 | 0 / 0 | 0 / 0 |
| Crash500 | 2 / -2,32R | 0 / 0 |
| Boom1000 | 1 / -1,19R | 0 / 0 |
| Crash1000 | 0 / 0 | 0 / 0 |

20avisos total,19operaciones TP1; todos los avisos posteriores a un evento observado. Ninguna anticipación demostrada. Las combinaciones con operaciones también pierden aTP2/TP3 con0,25R. No supera los controles en TP1. No cumple frecuencia ni rentabilidad; se publica opcionalmente para demo por elección explícita del usuario. No es una estrategia aprobada para dinero real.

Investigación reproducible en la bóveda: `.akira-market-research/turn-demo-20261113/evaluate.js` y results.json. Pruebas frontend: test_turn_scanner.js, test_manual_spike_ui.js y scripts/test_manual_chart_browser.js.

## Video adicional del13noviembre

Archivo WA0254:28,53s. Objetivos visibles7309,6/7307,7/7301,8 coinciden con la referencia anterior; muestra descenso con retrocesos haciaTP3 y cantidades variables de una posición. No muestra con claridad el nacimiento del aviso, símbolo ni cierre definitivo. Se aprovechó la presentación de objetivos, no se dedujo una fórmula ni una tasa de éxito. No se transcribió el audio; observaciones limitadas a imágenes.

Fuentes de investigación: https://www.tradingview.com/pine-script-docs/concepts/repainting/ y https://experts.deriv.com/insights/boom-and-crash-the-drift-the-spike-and-what-a-spike-does-to-your-indicators .
