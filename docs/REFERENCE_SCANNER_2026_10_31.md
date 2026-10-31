# Chulito de referencia — implementación inicial

Reconstrucción experimental de capturas Step Index/XAUUSD, no copia de reglas privadas. Producción ofrece modo separado `reference_sniper`, M1 exclusivamente; conserva perfiles previos. El módulo puro acepta M1/M5/M15 para futuros estudios pero la interfaz no los habilita sin evaluar.

Nivel extremo de 20 velas previas; vela cerrada rechaza el extremo y vuelve dentro; siguiente vela cierra rompiendo el extremo del rechazo. Mecha >= cuerpo y 0.25 ATR. Confirmación no mayor a 1.8 ATR (oro) o 2.5 ATR (Step); stop fuera del rechazo más 0.25/0.15 ATR. Riesgo admisible 0.5–3 ATR. Estos parámetros son decisiones de diseño, no extraídos del scanner original.

Solo publica confirmaciones dentro de 20 segundos del cierre. Marcador anclado a la vela que confirma, no al máximo previo. Journal local limitado a 200 registros guarda hora y niveles sin reescribirlos e impide repetir una señal al cambiar de modo/recargar. Borrar almacenamiento elimina esta deduplicación local. Entrada/SL/TP1/2/3 visibles; gestión de práctica usa TP1, stop o 5 minutos, no certifica TP2/TP3. Conserva límites de riesgo y precio y pausa tras cierre. Step muestra niveles pero carece de conversión monetaria validada y no permite ejecución del simulador con contrato desconocido. No habilita MT5 ni Telegram.

Pruebas: rechazo sin confirmación no dispara, espejo BUY/SELL, huecos rechazados, mercado y temporalidad explícitos, confirmación vieja no se publica, journal evita duplicados, controles del motor/simulador existentes. No se ha validado rentabilidad ni realizado backtest económico de esta hipótesis. Interfaz dice práctica experimental; botón de histórico no reutiliza incorrectamente resultados de otra estrategia.
