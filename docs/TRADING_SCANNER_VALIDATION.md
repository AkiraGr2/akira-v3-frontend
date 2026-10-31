# AKIRA Trading Lab: criterio y validación del escáner

## Qué debe mostrar

El Sniper dibuja una marca solo después de que el feed real cierre una vela y se cumplan filtros de tendencia, rechazo direccional y zona estructural. La zona puede ser un bloque de órdenes o una PRZ armónica validada. La geometría XABCD usa pivotes confirmados y límites para AB/XA, BC/AB, CD/BC, AD/XA y CD/AB; las proyecciones de XA, BC y AB=CD también deben converger dentro de una tolerancia basada en ATR. La PRZ por sí sola no genera una entrada.

En Boom/Crash, el cálculo exige al menos cuatro spikes observados (tres intervalos completos), usa sus intervalos recientes para medir deriva y requiere rechazo en la dirección propia del índice dentro de una zona. Ese cálculo describe muestras pasadas; no predice el instante del siguiente spike.

La entrada es el cierre de la vela que confirma la condición. SL es estructural con margen ATR; TP1/TP2/TP3 son 1R/2R/3R. En el seguimiento OHLC, si stop y objetivo aparecen dentro de la misma vela y no hay orden intrabar disponible, se contabiliza conservadoramente como stop primero.

## Límites de evidencia

- El número de confluencias no es una probabilidad de ganar.
- La suite local comprueba reglas, ratios, velas confirmadas, ciclos históricos y casos límite. No mide rentabilidad.
- No se ha ejecutado un backtest fuera de muestra con spread, comisión, deslizamiento y reglas de ejecución del broker. Por tanto, no existe una tasa de acierto certificada.
- El Pine se genera desde `js/quantick_akira_tv_pine.js` y se sincroniza con `QuantickAkira_TradingView_Pro_v5.pine`; las pruebas locales comparan ambos archivos. El Pine aún requiere compilación y comprobación visual en TradingView.
- El gráfico TradingView no siempre tiene un símbolo equivalente para índices sintéticos Deriv; el gráfico/feed de Deriv es la referencia para esos instrumentos.
- Step Index 100 no muestra conversión a dinero o lote mientras no se configure el valor contractual del broker.

## Verificaciones locales

Ejecutar desde la raíz del frontend:

```powershell
node --check js/akira_trading_lab.js
node --check js/akira_trading_scanner_core.js
node --check js/quantick_akira_tv_pine.js
node test_trading_scanner_core.js
python test_frontend_guards.py
```

No habilitar auto-envío ni usar dinero real basándose solo en estas verificaciones de código. Primero compilar el indicador en TradingView, revisar señales en gráfico y hacer replay/backtest con costes reales del instrumento.
