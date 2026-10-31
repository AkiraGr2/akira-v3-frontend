# Scalping multipar: investigación y límites — 2026-10-31

## Implementación y destino

Destino declarado: Deriv MT5 demo, usado solo desde el celular. Akira no está conectado a esa cuenta ni envía órdenes. El OHLC público Deriv no equivale a bid/ask, spread ni ejecución de su cuenta MT5. No se recogieron credenciales.

Tres familias fijas: retroceso con EMA9/20 y RSI14; reversión de rango con Bollinger20/2 y RSI14; ruptura de 20 velas con EMA/ATR. El contexto M5 usa EMA20/50 y ADX14: tendencia >=20; rango <20. Las entradas se deciden en M1 cerrado, sin M5 parcial. Stop mínimo 1.2 ATR14, máximo 2.5 ATR14; objetivo 1.5R en tendencia/ruptura y 1R en rango; salida por tiempo 5 minutos (retroceso/rango) o 3 (ruptura). Estas reglas se fijaron antes de evaluar y no se ajustaron a los resultados.

El ensayo anterior de caza spikes (preparación por deriva/compresión/extremo) perdió: Boom1000 76 entradas, 76 cerradas, tramo posterior -0.87 R/op; Crash1000 96 entradas, 95 cerradas, tramo posterior -0.88 R/op, en muestras de 999 velas. Permanece como investigación explícita, sin Telegram. No se presenta como estrategia rentable.

## Evaluación reproducible

Ejecutar `node scripts/run_scalp_research.js --bars=20000`; datos crudos públicos en `../.akira-market-research/2026-10-31`, fuera del repositorio. El script pagina y deduplica M1, excluye la vela abierta y registra hash por mercado. El servidor devolvió un máximo observado de 1000 velas por página; se corrigió el paginador para conseguir 20000 por mercado. Un piloto de hasta 6000 velas precedió a la muestra completa; los parámetros no se reajustaron, pero no es una validación prospectiva independiente.

Separación cronológica 50% selección, 25% validación y 25% prueba final. La familia se elige solo por expectativa del primer tramo, con al menos 30 operaciones. No se cambia después al modelo que gane en el último tramo. Las posiciones que cruzan el corte no acreditan resultados entre tramos. Entrada en apertura siguiente; rechazo de saltos mayores al 25% del riesgo; stop primero si la misma vela toca stop y objetivo; coste de ida/vuelta = spread + dos deslizamientos + comisión. Costes duplicados mantienen las mismas reglas y entradas, sin eliminar perdedores a posteriori.

Criterios previos para candidata histórica: expectativa positiva en selección y ambos tramos posteriores, >=30 operaciones en cada tramo posterior, factor de beneficio >=1.20, caída <=10R, expectativa positiva con costes duplicados, >=10 días operados en prueba final y límite bootstrap diario inferior positivo (2000 remuestreos, alfa .05/8 por los ocho mercados). Faltan además costes reales confirmados y prueba demo prospectiva. No hay aprobación de rentabilidad futura.

## Resultados con escenarios de costes

| Mercado | Velas | Familia elegida | Operaciones validación / final | Expectativa validación / final (R) | Validada para MT5 |
|---|---:|---|---:|---:|---|
| EURUSD | 20000 | sin muestra de selección suficiente | 0 / 0 | — / — | No |
| GBPUSD | 20000 | sin muestra de selección suficiente | 0 / 0 | — / — | No |
| USDJPY | 20000 | sin muestra de selección suficiente | 0 / 0 | — / — | No |
| XAUUSD | 20000 | momentum_breakout | 39 / 35 | -0.085 / -0.234 | No |
| BTCUSDT | 20000 | trend_pullback | 36 / 93 | -0.272 / 0.082 | No |
| ETHUSDT | 20000 | sin muestra de selección suficiente | 0 / 0 | — / — | No |
| BOOM1000 | 20000 | range_reversion | 28 / 16 | 0.503 / 0.457 | No |
| CRASH1000 | 20000 | sin muestra de selección suficiente | 0 / 0 | — / — | No |

Los costes del JSON son escenarios, no cotizaciones del broker. Comisión cero es una hipótesis, no confirmación de ausencia de comisión. Bitcoin sale positivo solo en el último periodo, pero pierde en validación. Boom1000 reversión de rango sale positivo en ambos periodos, con solo 28 y 16 operaciones y cuatro días por tramo: no satisface la muestra mínima. Un alto acierto con ventas en Boom conserva exposición a saltos en contra y posibles fills peores; no se infiere seguridad de esa tasa.

## Interfaz y protección

Modo inicial: «Scalping multipar · M1/M5 · investigación MT5 demo». Comparador por mercado, motivos de rechazo y costes visibles; plegado en móvil. Solo puede dibujar una preparación experimental si el modelo elegido mantiene expectativa positiva en ambos periodos; esto no equivale a superar todos los criterios. Una preparación no ejecuta órdenes ni habilita Telegram. Modelos con validación negativa, informe ausente o antiguo (>24h), datos incompatibles o falta de confluencia no fuerzan señales.

La práctica local mantiene ventana de entrada de 20 s, rechazo de persecución de precio, una operación por mercado, pausa de dos velas y caducidad 3–5 min. Tamaño por modelo local hacia 0.5% del capital y tope previsto 1% del saldo; las conversiones locales no son especificaciones verificadas de MT5. Sin feed reciente no se inventa fill: el cierre espera una cotización real, por lo que no se garantiza ejecución exactamente al plazo si hay desconexión. La política de saldo/cortacircuito permanece; el replay mide señales sin aplicar su límite diario.

Mantiene perfiles estructural y caza spikes, claramente de investigación; no se añaden automatismos de broker, martingalas ni volumen ficticio. Las claves internas BTCUSDT/ETHUSDT se conservan por compatibilidad, pero los nombres especifican BTC/USD y ETH/USD del feed Deriv.

## Pruebas

Pruebas de prefijos sin futuro, M5 completo, costes explícitos, entrada siguiente, gaps, ambigüedad conservadora, plazos, cortes cronológicos, muestra/intervalo insuficiente, mayor acierto con expectativa negativa, no Telegram, riesgo, duplicados y desconexión. Las suites de scanner/conexión y los guards generales se ejecutan junto con el nuevo `test_scalp_research.js` en CI. Evidencia de publicación en el handoff operativo; no se modifica Supabase ni Render.

## Fuentes de referencia

- Deriv: https://deriv.com/markets/derived-indices/synthetic-indices?tab=cfds — limitaciones de patrones en sintéticos.
- Deriv market data: https://developers.deriv.com/docs/data/ticks-history/ — OHLC histórico público.
- MetaQuotes: https://www.mql5.com/en/docs/python_metatrader5/mt5copyticksfrom_py — bid/ask de un terminal MT5, no disponible desde la conexión pública usada aquí.


## Actualización posterior: perfiles por mercado (v2)

Se conserva arriba la evidencia v1 como histórica. V2 no reutiliza indiscriminadamente sus tres familias: Forex permite retroceso/rango de 07–17 UTC, oro solo ruptura de 12–17 UTC con ADX >=25, criptomonedas continuación con filtro de volatilidad, Boom compras y Crash ventas tras rechazo de rango (sin predecir el instante del spike). Horarios UTC fijos, no sesiones con DST; no hay calendario de noticias. Productos desconocidos y binarias quedan excluidos. La descripción completa se muestra debajo del informe del gráfico.

La casilla de práctica, desactivada inicialmente y sin persistencia entre recargas, permite ver configuraciones que cumplen estas reglas aunque no tengan rentabilidad demostrada. Mantiene datos vivos, contexto cerrado, costes explícitos, caducidad del informe, límites de entrada y riesgo. Solo simulador local; no habilita Telegram ni MT5. Desmarcada, conserva el filtro de evidencia positiva en ambos tramos. Los perfiles no se seleccionan a partir del resultado final.

Reevaluación exploratoria de datos ya vistos, NO nueva prueba independiente: 159986 velas válidas. Se excluyeron 12 registros no alineados al minuto de oro y 1 de cada cripto, sin redondear timestamps ni fabricar OHLC. Los archivos originales se preservan. BTC: 27 operaciones de validación, -0.2924R/op; 79 finales, +0.1033R/op. Los otros siete mercados no reúnen 30 operaciones iniciales. Ningún perfil demuestra rentabilidad; ningún informe habilita recomendaciones. Se documenta esto incluso cuando la casilla permite practicar.

Pruebas: perfiles incompatibles, horarios y fines de semana, dirección Boom/Crash, volatilidad cripto, exclusión binarias, causalidad sin datos futuros, integración del feed y controles del simulador. Esta actualización no añade ejecución MT5 ni cambia backend/autenticación.
