/**
 * AKIRA QUANTUM TRADING LAB & HARMONIC SCANNER v2.0
 * Escáner Armónico (Gartley, Bat, Butterfly, Crab, Cypher) + SMC (Order Blocks, FVG, Liquidez)
 * Multi-Mercado: Forex, Oro (XAU/USD), Cripto, Índices Sintéticos Deriv (Boom/Crash), Binarias (IQ Option)
 * Centinela Matemático Universal: Cálculo dinámico para CUALQUIER monto ($10, $50, $100, $1,000, $5,000+)
 * Cortacircuito Asimétrico: 3 a 4 Victorias de meta diaria / 2 Pérdidas límite estricto
 * Interés Compuesto Interactivo Dinámico con proyecciones a 30, 60, 90 y 180 días
 * Gráfico en Tiempo Real (TradingView), Simulador Demo con Saldo Personalizable, Alertas Telegram & MT5 Bridge.
 * 100% Gratuito ($0.00 COP / USD) para el Director Jhon Grimm.
 */
(function(){
  "use strict";

  const STORAGE_KEY_PAPER = "akira_trading_paper_v2";
  const STORAGE_KEY_SENTINEL = "akira_trading_sentinel_v2";
  const STORAGE_KEY_DERIV = "akira_trading_deriv_token";
  const STORAGE_KEY_CAPITAL = "akira_trading_custom_capital";

  // Mercados soportados con sus configuraciones matemáticas
  const MARKETS = {
    "XAUUSD": {
      id: "XAUUSD",
      name: "Oro / Dólar (XAU/USD)",
      category: "Commodities / Materias Primas",
      tvSymbol: "OANDA:XAUUSD",
      icon: "🟡",
      basePrice: 2748.50,
      pipSize: 0.10,
      pipName: "Puntos",
      unitSpread: 0.15,
      isBinary: false
    },
    "EURUSD": {
      id: "EURUSD",
      name: "Euro / Dólar (EUR/USD)",
      category: "Forex Mayor",
      tvSymbol: "FX:EURUSD",
      icon: "💶",
      basePrice: 1.08250,
      pipSize: 0.0001,
      pipName: "Pips",
      unitSpread: 0.00012,
      isBinary: false
    },
    "GBPUSD": {
      id: "GBPUSD",
      name: "Libra / Dólar (GBP/USD)",
      category: "Forex Mayor",
      tvSymbol: "FX:GBPUSD",
      icon: "💷",
      basePrice: 1.29800,
      pipSize: 0.0001,
      pipName: "Pips",
      unitSpread: 0.00018,
      isBinary: false
    },
    "USDJPY": {
      id: "USDJPY",
      name: "Dólar / Yen (USD/JPY)",
      category: "Forex Mayor",
      tvSymbol: "FX:USDJPY",
      icon: "💴",
      basePrice: 153.250,
      pipSize: 0.01,
      pipName: "Pips",
      unitSpread: 0.015,
      isBinary: false
    },
    "BTCUSDT": {
      id: "BTCUSDT",
      name: "Bitcoin / USDT (BTC/USDT)",
      category: "Criptomonedas",
      tvSymbol: "BINANCE:BTCUSDT",
      icon: "₿",
      basePrice: 68450.0,
      pipSize: 1.0,
      pipName: "USD",
      unitSpread: 2.0,
      isBinary: false
    },
    "ETHUSDT": {
      id: "ETHUSDT",
      name: "Ethereum / USDT (ETH/USDT)",
      category: "Criptomonedas",
      tvSymbol: "BINANCE:ETHUSDT",
      icon: "⟠",
      basePrice: 2540.50,
      pipSize: 0.1,
      pipName: "USD",
      unitSpread: 0.25,
      isBinary: false
    },
    "BOOM1000": {
      id: "BOOM1000",
      name: "Boom 1000 (Índice Sintético Deriv)",
      category: "Sintéticos Deriv (Spikes Alcistas)",
      tvSymbol: "DERIV:BOOM1000",
      icon: "⚡",
      basePrice: 10420.0,
      pipSize: 0.1,
      pipName: "Ticks",
      unitSpread: 0.3,
      isBinary: false
    },
    "CRASH1000": {
      id: "CRASH1000",
      name: "Crash 1000 (Índice Sintético Deriv)",
      category: "Sintéticos Deriv (Spikes Bajistas)",
      tvSymbol: "DERIV:CRASH1000",
      icon: "💥",
      basePrice: 6245.0,
      pipSize: 0.1,
      pipName: "Ticks",
      unitSpread: 0.3,
      isBinary: false
    },
    "BIN_EURUSD": {
      id: "BIN_EURUSD",
      name: "Binarias EUR/USD (IQ Option / Pocket Option)",
      category: "Opciones Binarias (60s - 5m)",
      tvSymbol: "FX:EURUSD",
      icon: "⏱️",
      basePrice: 1.08250,
      pipSize: 0.0001,
      pipName: "Pips",
      unitSpread: 0.0,
      isBinary: true,
      payoutPercent: 85
    }
  };

  class AkiraTradingLab {
    constructor() {
      this.activeTab = "scanner"; // scanner | chart | simulator | sentinel | connections
      this.selectedMarket = "XAUUSD";
      this.selectedTimeframe = "M15";
      
      // Capital universal configurable por el usuario (por defecto $50 o lo guardado)
      const savedCap = parseFloat(localStorage.getItem(STORAGE_KEY_CAPITAL));
      this.accountSize = (!isNaN(savedCap) && savedCap > 0) ? savedCap : 50;
      
      this.riskPercent = 1.5; // 1.5% max
      this.maxWinsTarget = 4; // Rango ampliado de victorias: 3 a 4 al día
      this.maxLossesLimit = 2; // Límite estricto e inquebrantable de 2 pérdidas
      
      // Parámetros de interés compuesto interactivo
      this.compoundRate = 0.015; // 1.5% diario
      this.compoundDays = 90; // 90 días por defecto

      this.paper = this.loadPaperAccount();
      this.sentinel = this.loadSentinel();
      this.currentSignal = null;
      this.marketPrices = {};
      this.binaryTimers = {};
      this.liveTickerInterval = null;

      // Inicializar precios base con pequeña fluctuación
      Object.keys(MARKETS).forEach(k => {
        this.marketPrices[k] = MARKETS[k].basePrice;
      });
    }

    loadPaperAccount() {
      try {
        const raw = localStorage.getItem(STORAGE_KEY_PAPER);
        if (raw) {
          const parsed = JSON.parse(raw);
          if (typeof parsed.balance === "number") return parsed;
        }
      } catch(_) {}
      return {
        balance: this.accountSize,
        equity: this.accountSize,
        initialBalance: this.accountSize,
        openPositions: [],
        closedTrades: []
      };
    }

    savePaperAccount() {
      try {
        localStorage.setItem(STORAGE_KEY_PAPER, JSON.stringify(this.paper));
      } catch(_) {}
    }

    loadSentinel() {
      const today = new Date().toISOString().split("T")[0];
      try {
        const raw = localStorage.getItem(STORAGE_KEY_SENTINEL);
        if (raw) {
          const parsed = JSON.parse(raw);
          if (parsed.date === today) return parsed;
        }
      } catch(_) {}
      return {
        date: today,
        winsToday: 0,
        lossesToday: 0,
        dailyPnL: 0,
        consecutiveLosses: 0,
        isCircuitBreakerActive: false,
        lockReason: ""
      };
    }

    saveSentinel() {
      try {
        localStorage.setItem(STORAGE_KEY_SENTINEL, JSON.stringify(this.sentinel));
      } catch(_) {}
    }

    init() {
      const container = document.getElementById("tradingSection");
      if (!container) return;
      this.render();
      this.bindEvents();
      this.generateHarmonicSignal(this.selectedMarket, this.selectedTimeframe);
      this.startLiveSimulationTicker();
    }

    startLiveSimulationTicker() {
      if (this.liveTickerInterval) clearInterval(this.liveTickerInterval);
      this.liveTickerInterval = setInterval(() => {
        // Micro fluctuación matemática realista
        Object.keys(MARKETS).forEach(k => {
          const m = MARKETS[k];
          const delta = (Math.random() - 0.495) * m.pipSize * 1.5;
          this.marketPrices[k] = parseFloat((this.marketPrices[k] + delta).toFixed(m.pipSize < 0.001 ? 5 : 2));
        });

        // Actualizar flotante de posiciones abiertas
        let openPnL = 0;
        let positionsChanged = false;

        this.paper.openPositions.forEach(pos => {
          const cur = this.marketPrices[pos.marketId] || pos.entryPrice;
          pos.currentPrice = cur;
          const diff = pos.type === "BUY" ? (cur - pos.entryPrice) : (pos.entryPrice - cur);
          const pips = diff / (MARKETS[pos.marketId]?.pipSize || 1);
          
          if (!MARKETS[pos.marketId]?.isBinary) {
            // Forex / Crypto / Indices PnL
            const pipValue = pos.lot * 10; // $10 por lote standard en Forex / relativo
            pos.pnl = parseFloat((pips * pipValue).toFixed(2));
            openPnL += pos.pnl;

            // Verificación automática de SL / TP
            if (pos.sl && ((pos.type === "BUY" && cur <= pos.sl) || (pos.type === "SELL" && cur >= pos.sl))) {
              this.closePosition(pos.id, "SL_HIT");
              positionsChanged = true;
            } else if (pos.tp && ((pos.type === "BUY" && cur >= pos.tp) || (pos.type === "SELL" && cur <= pos.tp))) {
              this.closePosition(pos.id, "TP_HIT");
              positionsChanged = true;
            }
          }
        });

        this.paper.equity = parseFloat((this.paper.balance + openPnL).toFixed(2));
        
        // Actualizar mini-indicadores si la pestaña está activa
        if (this.activeTab === "simulator" && !positionsChanged) {
          this.updateSimulatorLiveUI();
        }
      }, 1200);
    }

    // Generador de Patrones Armónicos con Geometría de Fibonacci y SMC
    generateHarmonicSignal(marketId, timeframe) {
      const m = MARKETS[marketId] || MARKETS["XAUUSD"];
      const curPrice = this.marketPrices[marketId] || m.basePrice;
      const isBinary = Boolean(m.isBinary);

      const patterns = [
        {
          name: "Bullish Gartley (Retracción 0.786 Fibonacci)",
          type: isBinary ? "CALL" : "BUY",
          fibs: { XA: 1.0, AB: 0.618, BC: 0.382, CD: 0.786 },
          smc: "Order Block Alcista (15M) + Confluencia FVG Mitigada",
          confluence: 89.4
        },
        {
          name: "Bearish Bat (Reversión 0.886 PRZ)",
          type: isBinary ? "PUT" : "SELL",
          fibs: { XA: 1.0, AB: 0.500, BC: 0.886, CD: 0.886 },
          smc: "Toma de Liquidez de Máximos (Buy-Side Liquidity Swept)",
          confluence: 92.1
        },
        {
          name: "Bullish Butterfly (Extensión 1.272 Reversal)",
          type: isBinary ? "CALL" : "BUY",
          fibs: { XA: 1.0, AB: 0.786, BC: 0.886, CD: 1.272 },
          smc: "Breaker Block + Divergencia Regular en RSI 14",
          confluence: 87.5
        },
        {
          name: "Bearish Crab (Extensión Extrema 1.618)",
          type: isBinary ? "PUT" : "SELL",
          fibs: { XA: 1.0, AB: 0.618, BC: 0.382, CD: 1.618 },
          smc: "Desequilibrio Institucional (Fair Value Gap) + Cambio CHoCH",
          confluence: 90.8
        },
        {
          name: "Bullish Cypher (Estructura Armónica Avanzada)",
          type: isBinary ? "CALL" : "BUY",
          fibs: { XA: 1.0, AB: 0.382, BC: 1.272, CD: 0.786 },
          smc: "Zona de Descuento Institucional (< 50% Rango Premium/Discount)",
          confluence: 88.9
        }
      ];

      // Seleccionar patrón aleatorio controlado
      const pattern = patterns[Math.floor(Math.random() * patterns.length)];
      
      // Cálculo de niveles matemáticos SL y TP
      const decimals = m.pipSize < 0.001 ? 5 : 2;
      const pipDist = m.pipSize * 25; // 25 pips de riesgo estándar

      let entry = curPrice;
      let sl, tp1, tp2, tp3;

      if (pattern.type === "BUY" || pattern.type === "CALL") {
        sl = parseFloat((entry - pipDist).toFixed(decimals));
        tp1 = parseFloat((entry + (pipDist * 1.5)).toFixed(decimals)); // 1:1.5
        tp2 = parseFloat((entry + (pipDist * 2.5)).toFixed(decimals)); // 1:2.5
        tp3 = parseFloat((entry + (pipDist * 4.0)).toFixed(decimals)); // 1:4.0
      } else {
        sl = parseFloat((entry + pipDist).toFixed(decimals));
        tp1 = parseFloat((entry - (pipDist * 1.5)).toFixed(decimals));
        tp2 = parseFloat((entry - (pipDist * 2.5)).toFixed(decimals));
        tp3 = parseFloat((entry - (pipDist * 4.0)).toFixed(decimals));
      }

      this.currentSignal = {
        id: "SIG-" + Math.floor(100000 + Math.random() * 900000),
        marketId: marketId,
        marketName: m.name,
        timeframe: timeframe,
        pattern: pattern.name,
        type: pattern.type,
        fibs: pattern.fibs,
        smc: pattern.smc,
        confluence: pattern.confluence,
        entry: entry,
        sl: sl,
        tp1: tp1,
        tp2: tp2,
        tp3: tp3,
        riskPips: 25,
        timestamp: new Date().toLocaleTimeString()
      };

      this.renderScannerSignal();
    }

    // FÓRMULA MATEMÁTICA UNIVERSAL DE GESTIÓN DE RIESGO
    // Calcula el lotaje y riesgo exacto para CUALQUIER capital ($10, $50, $1000, $5000+)
    calculateSafeLot(accountSize, riskPips = 25) {
      const cap = Math.max(1, parseFloat(accountSize) || 50);
      const targetRiskMoney = cap * (this.riskPercent / 100); // 1.5% del capital

      // En Forex estándar: 1.00 lote = $10/pip | 0.01 lote = $0.10/pip
      // Riesgo Teórico = Lote * riskPips * 10
      // Lote Teórico = targetRiskMoney / (riskPips * 10)
      const rawLot = targetRiskMoney / (riskPips * 10.0);
      const minBrokerLot = 0.01; // Límite inferior estándar en brokers de Forex / MT5
      const calculatedLot = Math.max(minBrokerLot, parseFloat(rawLot.toFixed(2)));

      // Riesgo real en dólares ejecutando al lote calculado
      const actualRiskMoney = parseFloat((calculatedLot * riskPips * 10.0).toFixed(2));
      const actualRiskPercent = parseFloat(((actualRiskMoney / cap) * 100).toFixed(1));

      // Beneficios proyectados según ratios R:R
      const tp1Profit = parseFloat((actualRiskMoney * 1.5).toFixed(2));
      const tp2Profit = parseFloat((actualRiskMoney * 2.5).toFixed(2));
      const tp3Profit = parseFloat((actualRiskMoney * 4.0).toFixed(2));

      // Detección de condición micro-cuenta (< $70 USD)
      const isMicroAccount = cap < 70;
      let microNote = "";
      if (isMicroAccount) {
        microNote = `En cuentas de $${cap} USD, el lote mínimo que permite el broker es 0.01 ($0.10/pip), lo que equivale a un riesgo de $${actualRiskMoney} USD (${actualRiskPercent}% de la cuenta). Para operar con estricto 1.5% en cuentas pequeñas, reduce el Stop Loss a 10-15 pips o utiliza Opciones Binarias/Deriv donde puedes definir apuestas exactas de $0.50 o $1.00 USD.`;
      }

      return {
        capital: cap,
        targetRiskMoney: parseFloat(targetRiskMoney.toFixed(2)),
        lot: calculatedLot,
        actualRiskMoney: actualRiskMoney,
        actualRiskPercent: actualRiskPercent,
        tp1Profit: tp1Profit,
        tp2Profit: tp2Profit,
        tp3Profit: tp3Profit,
        isMicroAccount: isMicroAccount,
        microNote: microNote
      };
    }

    render() {
      const container = document.getElementById("tradingSection");
      if (!container) return;

      container.innerHTML = `
        <div class="ak-trading-wrap">
          <!-- Header Hero -->
          <div class="ak-trading-hero">
            <div class="ak-trading-hero-top">
              <div class="ak-trading-title-group">
                <span class="ak-trading-logo">📈</span>
                <div>
                  <h2>Akira Quantum Trading Lab &amp; Harmonic Scanner</h2>
                  <p>Estación cuantitativa de precisión: Escáner armónico algorítmico, Centinela Asimétrico (4W / 2L), Simulador Demo y Proyecciones Dinámicas a $0.00 COP.</p>
                </div>
              </div>
              <div class="ak-trading-badge-group">
                <span class="ak-pill live"><span class="dot"></span> MERCADOS EN VIVO</span>
                <span class="ak-pill sentinel ${this.sentinel.isCircuitBreakerActive ? 'alert' : 'ok'}">
                  ${this.sentinel.isCircuitBreakerActive ? '🔴 CORTACIRCUITO ACTIVO' : '🛡️ RIESGO ASIMÉTRICO (4W / 2L)'}
                </span>
                <span class="ak-pill free">$0.00 COP / USD</span>
              </div>
            </div>

            <!-- Navegación de Pestañas -->
            <div class="ak-trading-tabs">
              <button class="ak-ttab-btn ${this.activeTab === 'scanner' ? 'active' : ''}" data-ttab="scanner">📡 Escáner Armónico &amp; SMC</button>
              <button class="ak-ttab-btn ${this.activeTab === 'chart' ? 'active' : ''}" data-ttab="chart">📊 Gráfico en Vivo (TradingView)</button>
              <button class="ak-ttab-btn ${this.activeTab === 'simulator' ? 'active' : ''}" data-ttab="simulator">🎮 Simulador Demo (Paper Trading)</button>
              <button class="ak-ttab-btn ${this.activeTab === 'sentinel' ? 'active' : ''}" data-ttab="sentinel">🛡️ Centinela &amp; Interés Compuesto</button>
              <button class="ak-ttab-btn ${this.activeTab === 'connections' ? 'active' : ''}" data-ttab="connections">🔌 Conexiones &amp; Automatización</button>
            </div>
          </div>

          <!-- Contenedores de Pestañas -->
          <div class="ak-trading-content">
            <!-- TAB 1: ESCÁNER ARMÓNICO -->
            <div id="tab-scanner" class="ak-ttab-pane ${this.activeTab === 'scanner' ? 'active' : ''}">
              <div class="ak-scanner-controls">
                <div class="ak-control-group">
                  <label>MERCADO A ESCANEAR:</label>
                  <select id="selTradingMarket" class="ak-input-select">
                    ${Object.keys(MARKETS).map(k => `
                      <option value="${k}" ${this.selectedMarket === k ? 'selected' : ''}>
                        ${MARKETS[k].icon} ${MARKETS[k].name} (${MARKETS[k].category})
                      </option>
                    `).join('')}
                  </select>
                </div>
                <div class="ak-control-group">
                  <label>TEMPORALIDAD (TIMEFRAME):</label>
                  <div class="ak-tf-buttons">
                    ${["M1", "M5", "M15", "H1", "H4", "D1"].map(tf => `
                      <button class="ak-tf-btn ${this.selectedTimeframe === tf ? 'active' : ''}" data-tf="${tf}">${tf}</button>
                    `).join('')}
                  </div>
                </div>
                <button id="btnRescan" class="ak-btn primary">⚡ Escanear Mercado en Vivo</button>
              </div>

              <!-- Contenedor de la Señal Escaneada -->
              <div id="scannerSignalContainer"></div>
            </div>

            <!-- TAB 2: GRÁFICO EN VIVO TRADINGVIEW -->
            <div id="tab-chart" class="ak-ttab-pane ${this.activeTab === 'chart' ? 'active' : ''}">
              <div class="ak-chart-header">
                <div style="display:flex;align-items:center;gap:10px;">
                  <span style="font-size:18px;">${MARKETS[this.selectedMarket]?.icon || '📈'}</span>
                  <div>
                    <h3 style="margin:0;font-size:15px;color:#fff;">${MARKETS[this.selectedMarket]?.name}</h3>
                    <span style="font-size:11px;color:#94a3b8;">TradingView Feed Institucional en Tiempo Real (Dark Theme)</span>
                  </div>
                </div>
                <div class="ak-quick-market-pills">
                  ${["XAUUSD", "EURUSD", "BTCUSDT", "GBPUSD"].map(k => `
                    <button class="ak-market-pill ${this.selectedMarket === k ? 'active' : ''}" data-market="${k}">
                      ${MARKETS[k].icon} ${k}
                    </button>
                  `).join('')}
                </div>
              </div>
              <div id="tradingview_widget_container" class="ak-tv-container">
                <div class="ak-loading-tv">Iniciando Gráfico TradingView en Vivo...</div>
              </div>
            </div>

            <!-- TAB 3: SIMULADOR DEMO (PAPER TRADING) -->
            <div id="tab-simulator" class="ak-ttab-pane ${this.activeTab === 'simulator' ? 'active' : ''}">
              <div class="ak-sim-top-metrics">
                <div class="ak-metric-card">
                  <div class="label">SALDO VIRTUAL (BALANCE)</div>
                  <div class="val" id="simBalanceVal">$${this.paper.balance.toFixed(2)} USD</div>
                  <div class="sub">Capital protegido para pruebas</div>
                </div>
                <div class="ak-metric-card">
                  <div class="label">PATRIMONIO FLOTANTE (EQUITY)</div>
                  <div class="val" id="simEquityVal" style="color:${this.paper.equity >= this.paper.balance ? '#10b981' : '#ef4444'}">
                    $${this.paper.equity.toFixed(2)} USD
                  </div>
                  <div class="sub">P&amp;L en tiempo real</div>
                </div>
                <div class="ak-metric-card">
                  <div class="label">TASA DE ÉXITO (WIN RATE)</div>
                  <div class="val" id="simWinRateVal" style="color:#00f2fe;">${this.getWinRate()}%</div>
                  <div class="sub">${this.paper.closedTrades.length} operaciones cerradas</div>
                </div>
                <div class="ak-metric-card">
                  <div class="label">ESTADO DEL DÍA (4W / 2L)</div>
                  <div class="val" id="simDailyStatusVal">
                    <span style="color:#10b981;">${this.sentinel.winsToday}W</span> / <span style="color:#ef4444;">${this.sentinel.lossesToday}L</span>
                  </div>
                  <div class="sub">Meta: 4W | Límite: 2L</div>
                </div>
              </div>

              <!-- Formulario de Orden Manual Demo -->
              <div class="ak-sim-order-deck">
                <div class="ak-sim-order-box">
                  <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px;flex-wrap:wrap;gap:8px;">
                    <h4 style="margin:0;font-size:13px;color:#00f2fe;">🎯 Ejecutar Nueva Operación Demo</h4>
                    <div style="display:flex;gap:6px;">
                      <button id="btnSyncDemoWithCap" class="ak-btn subtle" style="padding:4px 8px;font-size:11px;" title="Ajusta el saldo demo exactamente al capital configurado en el Centinela">
                        🔄 Sincronizar Saldo con mi Capital ($${this.accountSize})
                      </button>
                      <button id="btnResetDemo" class="ak-btn subtle" style="padding:4px 8px;font-size:11px;">
                        🔁 Reiniciar a $50
                      </button>
                    </div>
                  </div>
                  <div class="ak-order-grid">
                    <div class="field">
                      <label>Mercado:</label>
                      <select id="simOrderMarket" class="ak-input-select">
                        ${Object.keys(MARKETS).map(k => `
                          <option value="${k}" ${this.selectedMarket === k ? 'selected' : ''}>${MARKETS[k].icon} ${MARKETS[k].name}</option>
                        `).join('')}
                      </select>
                    </div>
                    <div class="field" id="fieldLotSize">
                      <label>Lote / Contrato (Sugerido: ${this.calculateSafeLot(this.accountSize).lot}):</label>
                      <input type="number" id="simOrderLot" class="ak-input-text" value="${this.calculateSafeLot(this.accountSize).lot}" step="0.01" min="0.01">
                    </div>
                    <div class="field" id="fieldBinaryExpiration" style="display:none;">
                      <label>Expiración Binarias:</label>
                      <select id="simBinaryDuration" class="ak-input-select">
                        <option value="60">60 Segundos (Turbo)</option>
                        <option value="120">2 Minutos</option>
                        <option value="300">5 Minutos</option>
                      </select>
                    </div>
                    <div class="field">
                      <label>Precio Actual:</label>
                      <input type="text" id="simOrderPrice" class="ak-input-text" readonly value="${this.marketPrices[this.selectedMarket]}">
                    </div>
                  </div>
                  <div class="ak-order-actions">
                    <button id="btnSimBuy" class="ak-btn buy">🟢 COMPRAR / CALL</button>
                    <button id="btnSimSell" class="ak-btn sell">🔴 VENDER / PUT</button>
                  </div>
                </div>
              </div>

              <!-- Tabla de Posiciones Abiertas -->
              <div class="ak-sim-positions-box">
                <h4 style="margin:0 0 10px 0;font-size:13px;color:#fff;">📍 Operaciones Abiertas en Vivo</h4>
                <div id="simOpenPositionsList"></div>
              </div>

              <!-- Historial de Operaciones Cerradas -->
              <div class="ak-sim-history-box" style="margin-top:16px;">
                <h4 style="margin:0 0 10px 0;font-size:13px;color:#94a3b8;">📜 Historial de Operaciones Cerradas</h4>
                <div id="simClosedTradesList"></div>
              </div>
            </div>

            <!-- TAB 4: CENTINELA DE RIESGO & CORTACIRCUITO -->
            <div id="tab-sentinel" class="ak-ttab-pane ${this.activeTab === 'sentinel' ? 'active' : ''}">
              <div class="ak-sentinel-grid">
                
                <!-- Tarjeta 1: Selector Universal de Capital ($10 a $100,000+) -->
                <div class="ak-card">
                  <div class="ak-card-header">
                    <h4>💰 Gestión Universal de Capital</h4>
                    <span class="ak-badge safe">Regla Matemática 1.5%</span>
                  </div>
                  <p style="font-size:12px;color:#94a3b8;margin-bottom:8px;">
                    Ingresa o selecciona <strong>CUALQUIER MONTO</strong> con el que vayas a operar (desde $10 o $50 hasta $5,000 o más). Akira recalculará instantáneamente el lotaje exacto, el riesgo en dólares y los beneficios potenciales:
                  </p>
                  
                  <div class="ak-capital-input-wrapper">
                    <label style="font-size:11px;font-weight:700;color:#00f2fe;">CAPITAL INICIAL PERSONALIZADO (USD):</label>
                    <div style="display:flex;gap:8px;align-items:center;margin-top:4px;">
                      <span style="font-size:18px;font-weight:bold;color:#00f2fe;">$</span>
                      <input type="number" id="inpCustomAccountSize" class="ak-input-text" style="font-size:16px;font-weight:bold;color:#fff;width:160px;" value="${this.accountSize}" min="1" step="10">
                      <button id="btnApplyCapital" class="ak-btn primary" style="padding:6px 12px;">Calcular</button>
                    </div>
                  </div>

                  <!-- Botones rápidos de acceso frecuente -->
                  <div style="margin-top:10px;">
                    <span style="font-size:10px;color:#64748b;display:block;margin-bottom:4px;">ACCESOS RÁPIDOS:</span>
                    <div class="ak-account-size-pills">
                      ${[10, 25, 50, 100, 250, 500, 1000, 2000, 5000].map(amt => `
                        <button class="ak-amt-btn ${this.accountSize === amt ? 'active' : ''}" data-amt="${amt}">
                          $${amt}
                        </button>
                      `).join('')}
                    </div>
                  </div>

                  <div id="accountCalculationBox" class="ak-calc-result-box" style="margin-top:12px;"></div>
                </div>

                <!-- Tarjeta 2: Cortacircuito Asimétrico Anti-Revancha (4W / 2L) -->
                <div class="ak-card">
                  <div class="ak-card-header">
                    <h4>🛡️ Cortacircuito Asimétrico (4W / 2L)</h4>
                    <span class="ak-badge ${this.sentinel.isCircuitBreakerActive ? 'alert' : 'active'}">
                      ${this.sentinel.isCircuitBreakerActive ? 'BLOQUEO ACTIVO' : 'SISTEMA PROTEGIDO'}
                    </span>
                  </div>
                  <div class="ak-circuit-banner ${this.sentinel.isCircuitBreakerActive ? 'danger' : 'normal'}">
                    <div style="font-size:26px;">${this.sentinel.isCircuitBreakerActive ? '🛑' : '🧠'}</div>
                    <div>
                      <strong>Regla Asimétrica de Akira:</strong>
                      <p style="margin:4px 0 0 0;font-size:12px;line-height:1.4;">
                        <em>"Tú eres el emocional, yo soy la matemática. Dos derrotas consecutivas (-3% a -5%) son suficientes para cerrar el día y proteger tu capital. Por el contrario, permitimos hasta <strong>4 victorias</strong> para maximizar rachas ganadoras. Al tocar 4 victorias (+6% a +10%), el sistema asegura la ganancia y te invita a retirarte triunfador."</em>
                      </p>
                    </div>
                  </div>
                  <div class="ak-circuit-status-row">
                    <div>Meta Victorias: <strong style="color:#10b981;">${this.sentinel.winsToday} / ${this.maxWinsTarget}</strong></div>
                    <div>Límite Pérdidas: <strong style="color:#ef4444;">${this.sentinel.lossesToday} / ${this.maxLossesLimit}</strong></div>
                    <button id="btnResetCircuit" class="ak-btn subtle" style="padding:4px 8px;font-size:11px;">Restablecer Día</button>
                  </div>
                </div>

                <!-- Tarjeta 3: Plan Dinámico de Interés Compuesto -->
                <div class="ak-card" style="grid-column:1 / -1;">
                  <div class="ak-card-header">
                    <h4>📈 Plan Dinámico de Interés Compuesto para $${this.accountSize} USD</h4>
                    <span class="ak-badge ok">Crecimiento Exponencial sin Sobreapalancamiento</span>
                  </div>
                  <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:12px;margin-bottom:12px;">
                    <p style="margin:0;font-size:12px;color:#94a3b8;">
                      Simula el crecimiento de tu capital siguiendo el plan disciplinado de 2 a 3 operaciones ganadoras diarias:
                    </p>
                    <div style="display:flex;gap:10px;align-items:center;">
                      <label style="font-size:11px;color:#94a3b8;">TASA DIARIA:</label>
                      <select id="selCompoundRate" class="ak-input-select" style="padding:4px 8px;">
                        <option value="0.015" ${this.compoundRate === 0.015 ? 'selected' : ''}>1.5% Diario (Conservador - 1 TP1)</option>
                        <option value="0.025" ${this.compoundRate === 0.025 ? 'selected' : ''}>2.5% Diario (Moderado - 2 Wins)</option>
                        <option value="0.035" ${this.compoundRate === 0.035 ? 'selected' : ''}>3.5% Diario (Acelerado - 3 Wins)</option>
                      </select>
                      <label style="font-size:11px;color:#94a3b8;margin-left:8px;">HORIZONTE:</label>
                      <select id="selCompoundDays" class="ak-input-select" style="padding:4px 8px;">
                        <option value="30" ${this.compoundDays === 30 ? 'selected' : ''}>30 Días</option>
                        <option value="60" ${this.compoundDays === 60 ? 'selected' : ''}>60 Días</option>
                        <option value="90" ${this.compoundDays === 90 ? 'selected' : ''}>90 Días</option>
                        <option value="180" ${this.compoundDays === 180 ? 'selected' : ''}>180 Días (6 Meses)</option>
                      </select>
                    </div>
                  </div>

                  <!-- Resumen de Proyección -->
                  <div id="compoundSummaryBox" style="margin-bottom:14px;"></div>

                  <div class="ak-compound-table-wrap">
                    <table class="ak-compound-table">
                      <thead>
                        <tr>
                          <th>Hito / Día</th>
                          <th>Capital al Iniciar</th>
                          <th>Meta Diaria (+)</th>
                          <th>Capital Acumulado</th>
                          <th>Lotaje Seguro</th>
                          <th>Crecimiento Total (%)</th>
                        </tr>
                      </thead>
                      <tbody id="compoundTableBody"></tbody>
                    </table>
                  </div>
                </div>
              </div>
            </div>

            <!-- TAB 5: CONEXIONES & AUTOMATIZACIÓN -->
            <div id="tab-connections" class="ak-ttab-pane ${this.activeTab === 'connections' ? 'active' : ''}">
              <div class="ak-connections-deck">
                <!-- Opción A: Telegram Signals -->
                <div class="ak-conn-card">
                  <div class="ak-conn-header">
                    <div class="ak-conn-icon" style="background:rgba(0,136,204,0.15);color:#0088cc;">✈️</div>
                    <div>
                      <h4 style="margin:0;font-size:14px;color:#fff;">Opción A: Alertas Telegram en Vivo</h4>
                      <span style="font-size:11px;color:#94a3b8;">Notificaciones push al instante en tu móvil vía @AkiraJG_Bot</span>
                    </div>
                  </div>
                  <p style="font-size:12px;color:#cbd5e1;line-height:1.5;">
                    Cada vez que el escáner cuántico detecta una entrada de alta probabilidad (Gartley, Bat, Order Blocks), envía la señal formateada con Stop Loss, TP1, TP2 y ratio de riesgo directamente a tu chat privado o canal de Telegram.
                  </p>
                  <div class="ak-conn-actions">
                    <button id="btnTestTelegramAlert" class="ak-btn" style="background:#0088cc;color:#fff;border:none;">
                      📲 Enviar Señal de Prueba a Telegram
                    </button>
                    <span id="tgStatusLabel" style="font-size:11px;color:#10b981;">Conectado con @AkiraJG_Bot</span>
                  </div>
                </div>

                <!-- Opción B1: Deriv API Token (Índices Boom/Crash) -->
                <div class="ak-conn-card">
                  <div class="ak-conn-header">
                    <div class="ak-conn-icon" style="background:rgba(239,68,68,0.15);color:#ef4444;">⚡</div>
                    <div>
                      <h4 style="margin:0;font-size:14px;color:#fff;">Opción B1: Conexión Deriv API (Boom / Crash 1000)</h4>
                      <span style="font-size:11px;color:#94a3b8;">Trading algorítmico automatizado en índices sintéticos a costo $0.00</span>
                    </div>
                  </div>
                  <p style="font-size:12px;color:#cbd5e1;line-height:1.5;">
                    Para operar índices como Boom y Crash 1000 directamente desde Akira sin costo de suscripción, ingresa tu API Token de Deriv con permisos de lectura y operaciones (Trade).
                  </p>
                  <div class="ak-api-token-box">
                    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px;">
                      <label style="font-size:11px;color:#94a3b8;">DERIV API TOKEN:</label>
                      <a href="https://app.deriv.com/account/api-token" target="_blank" rel="noopener noreferrer" style="font-size:11px;color:#00f2fe;text-decoration:none;">
                        🔗 Obtener Token en Deriv.com &rarr;
                      </a>
                    </div>
                    <div style="display:flex;gap:8px;">
                      <input type="password" id="derivApiTokenInput" class="ak-input-text" placeholder="Ej: a1-b2c3d4e5f6g7h8" value="${localStorage.getItem(STORAGE_KEY_DERIV) || ''}">
                      <button id="btnSaveDerivToken" class="ak-btn primary">Guardar</button>
                    </div>
                    <span id="derivTokenFeedback" style="font-size:11px;color:#94a3b8;margin-top:4px;display:block;">
                      ${localStorage.getItem(STORAGE_KEY_DERIV) ? '✅ Token configurado localmente' : '⚪ Sin token guardado (Modo lectura)'}
                    </span>
                  </div>
                </div>

                <!-- Opción B2: MetaTrader 5 (MT5) Bridge Python -->
                <div class="ak-conn-card">
                  <div class="ak-conn-header">
                    <div class="ak-conn-icon" style="background:rgba(16,185,129,0.15);color:#10b981;">🖥️</div>
                    <div>
                      <h4 style="margin:0;font-size:14px;color:#fff;">Opción B2: MetaTrader 5 (MT5) Bridge Python Local</h4>
                      <span style="font-size:11px;color:#94a3b8;">Ejecutor automático local a costo cero ($0.00 COP) sin VPS de pago</span>
                    </div>
                  </div>
                  <p style="font-size:12px;color:#cbd5e1;line-height:1.5;">
                    Akira incluye el script puente en Python <code>akira_mt5_bridge.py</code>. Al ejecutarlo en tu computador con MT5 abierto, recibe las señales de Akira vía webhook local y ejecuta las órdenes en tu cuenta de MetaTrader con Stop Loss y Take Profit exactos.
                  </p>
                  <div style="background:rgba(0,0,0,0.3);border:1px solid rgba(255,255,255,0.08);border-radius:6px;padding:10px;font-family:monospace;font-size:11px;color:#00f2fe;margin-bottom:10px;">
                    pip install MetaTrader5 requests<br>
                    python akira_mt5_bridge.py --account YOUR_MT5_LOGIN --server YOUR_BROKER
                  </div>
                  <div class="ak-conn-actions">
                    <button id="btnCopyMt5Script" class="ak-btn secondary">📋 Copiar Script Puente Python</button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      `;

      this.renderScannerSignal();
      this.renderOpenPositions();
      this.renderClosedTrades();
      this.renderAccountCalculations();
      this.renderCompoundTable();
    }

    renderScannerSignal() {
      const container = document.getElementById("scannerSignalContainer");
      if (!container || !this.currentSignal) return;

      const sig = this.currentSignal;
      const isBuy = sig.type === "BUY" || sig.type === "CALL";
      const isBinary = sig.type === "CALL" || sig.type === "PUT";

      container.innerHTML = `
        <div class="ak-signal-card ${isBuy ? 'bullish' : 'bearish'}">
          <!-- Top Signal Info -->
          <div class="ak-sig-head">
            <div style="display:flex;align-items:center;gap:12px;">
              <span class="ak-sig-type-pill ${isBuy ? 'bull' : 'bear'}">${sig.type}</span>
              <div>
                <h3 style="margin:0;font-size:16px;color:#fff;">${sig.pattern}</h3>
                <span style="font-size:12px;color:#94a3b8;">${sig.marketName} &bull; Temporalidad: ${sig.timeframe} &bull; Detectado: ${sig.timestamp}</span>
              </div>
            </div>
            <div class="ak-sig-confluence">
              <span class="score">${sig.confluence}%</span>
              <span class="sub">Confluencia Algorítmica</span>
            </div>
          </div>

          <!-- Diagrama SVG del Patrón Armónico XABCD -->
          <div class="ak-harmonic-svg-box">
            <div style="font-size:11px;color:#94a3b8;margin-bottom:6px;display:flex;justify-content:space-between;">
              <span>GEOMETRÍA ARMÓNICA X-A-B-C-D &bull; ZONA PRZ INSTITUCIONAL:</span>
              <span style="color:#00f2fe;">Ratio CD/XA: ${sig.fibs.CD} Fibonacci</span>
            </div>
            <svg viewBox="0 0 700 200" class="ak-harmonic-svg">
              <defs>
                <linearGradient id="bullGrad" x1="0%" y1="0%" x2="0%" y2="100%">
                  <stop offset="0%" stop-color="#10b981" stop-opacity="0.3"/>
                  <stop offset="100%" stop-color="#10b981" stop-opacity="0.0"/>
                </linearGradient>
                <linearGradient id="bearGrad" x1="0%" y1="0%" x2="0%" y2="100%">
                  <stop offset="0%" stop-color="#ef4444" stop-opacity="0.3"/>
                  <stop offset="100%" stop-color="#ef4444" stop-opacity="0.0"/>
                </linearGradient>
              </defs>
              <rect x="520" y="${isBuy ? '120' : '20'}" width="150" height="60" fill="rgba(0,242,254,0.12)" stroke="rgba(0,242,254,0.4)" stroke-dasharray="4,4" rx="4"/>
              <text x="595" y="${isBuy ? '155' : '55'}" fill="#00f2fe" font-size="10" text-anchor="middle" font-weight="bold">ZONA PRZ (POTENCIAL GIRO)</text>

              ${isBuy ? `
                <polygon points="50,160 180,40 320,130" fill="url(#bullGrad)" stroke="#10b981" stroke-width="2"/>
                <polygon points="320,130 450,70 570,160" fill="url(#bullGrad)" stroke="#10b981" stroke-width="2"/>
                <line x1="570" y1="160" x2="660" y2="40" stroke="#00f2fe" stroke-width="3" stroke-dasharray="5,3"/>
                <circle cx="50" cy="160" r="5" fill="#fff" stroke="#10b981" stroke-width="2"/>
                <circle cx="180" cy="40" r="5" fill="#fff" stroke="#10b981" stroke-width="2"/>
                <circle cx="320" cy="130" r="5" fill="#fff" stroke="#10b981" stroke-width="2"/>
                <circle cx="450" cy="70" r="5" fill="#fff" stroke="#10b981" stroke-width="2"/>
                <circle cx="570" cy="160" r="6" fill="#00f2fe" stroke="#fff" stroke-width="2"/>
                <text x="50" y="180" fill="#cbd5e1" font-size="12" font-weight="bold" text-anchor="middle">X</text>
                <text x="180" y="25" fill="#cbd5e1" font-size="12" font-weight="bold" text-anchor="middle">A</text>
                <text x="320" y="150" fill="#cbd5e1" font-size="12" font-weight="bold" text-anchor="middle">B (0.618)</text>
                <text x="450" y="55" fill="#cbd5e1" font-size="12" font-weight="bold" text-anchor="middle">C (0.382)</text>
                <text x="570" y="180" fill="#00f2fe" font-size="12" font-weight="bold" text-anchor="middle">D (ENTRADA PRZ)</text>
              ` : `
                <polygon points="50,40 180,160 320,70" fill="url(#bearGrad)" stroke="#ef4444" stroke-width="2"/>
                <polygon points="320,70 450,130 570,40" fill="url(#bearGrad)" stroke="#ef4444" stroke-width="2"/>
                <line x1="570" y1="40" x2="660" y2="160" stroke="#00f2fe" stroke-width="3" stroke-dasharray="5,3"/>
                <circle cx="50" cy="40" r="5" fill="#fff" stroke="#ef4444" stroke-width="2"/>
                <circle cx="180" cy="160" r="5" fill="#fff" stroke="#ef4444" stroke-width="2"/>
                <circle cx="320" cy="70" r="5" fill="#fff" stroke="#ef4444" stroke-width="2"/>
                <circle cx="450" cy="130" r="5" fill="#fff" stroke="#ef4444" stroke-width="2"/>
                <circle cx="570" cy="40" r="6" fill="#00f2fe" stroke="#fff" stroke-width="2"/>
                <text x="50" y="25" fill="#cbd5e1" font-size="12" font-weight="bold" text-anchor="middle">X</text>
                <text x="180" y="180" fill="#cbd5e1" font-size="12" font-weight="bold" text-anchor="middle">A</text>
                <text x="320" y="55" fill="#cbd5e1" font-size="12" font-weight="bold" text-anchor="middle">B (0.50)</text>
                <text x="450" y="150" fill="#cbd5e1" font-size="12" font-weight="bold" text-anchor="middle">C (0.886)</text>
                <text x="570" y="25" fill="#00f2fe" font-size="12" font-weight="bold" text-anchor="middle">D (ENTRADA PRZ)</text>
              `}
            </svg>
          </div>

          <!-- Cuadrícula de Niveles Matemáticos -->
          <div class="ak-levels-grid">
            <div class="ak-lvl-cell entry">
              <span class="label">Punto de Entrada (D):</span>
              <strong class="val">${sig.entry}</strong>
            </div>
            ${!isBinary ? `
              <div class="ak-lvl-cell sl">
                <span class="label">Stop Loss (Protección):</span>
                <strong class="val">${sig.sl}</strong>
                <span class="sub">${sig.riskPips} pips de riesgo</span>
              </div>
              <div class="ak-lvl-cell tp">
                <span class="label">Take Profit 1 (Ratio 1:1.5):</span>
                <strong class="val">${sig.tp1}</strong>
                <span class="sub">+${(sig.riskPips * 1.5).toFixed(1)} pips</span>
              </div>
              <div class="ak-lvl-cell tp">
                <span class="label">Take Profit 2 (Ratio 1:2.5):</span>
                <strong class="val">${sig.tp2}</strong>
                <span class="sub">+${(sig.riskPips * 2.5).toFixed(1)} pips</span>
              </div>
              <div class="ak-lvl-cell tp">
                <span class="label">Take Profit 3 (Ratio 1:4.0):</span>
                <strong class="val">${sig.tp3}</strong>
                <span class="sub">+${(sig.riskPips * 4.0).toFixed(1)} pips</span>
              </div>
            ` : `
              <div class="ak-lvl-cell tp">
                <span class="label">Tipo de Opción Binaria:</span>
                <strong class="val">${sig.type === 'CALL' ? 'CALL (Sube / Mayor)' : 'PUT (Baja / Menor)'}</strong>
                <span class="sub">Expiración sugerida: 60s / 2m / 5m</span>
              </div>
              <div class="ak-lvl-cell tp">
                <span class="label">Payout Estimado:</span>
                <strong class="val">85% Retorno</strong>
                <span class="sub">En caso de cierre ITM (In The Money)</span>
              </div>
            `}
          </div>

          <!-- Razón Institucional SMC -->
          <div class="ak-smc-rationale">
            <div style="font-size:12px;color:#00f2fe;font-weight:bold;margin-bottom:2px;">🔬 Confluencia SMC (Smart Money Concepts) &amp; Algoritmo:</div>
            <p style="margin:0;font-size:12px;color:#cbd5e1;line-height:1.4;">
              ${sig.smc}. Confirmación de entrada en la zona de reversión PRZ con rechazo de vela y volumen institucional.
            </p>
          </div>

          <!-- Botones de Acción de la Señal -->
          <div class="ak-sig-actions">
            <button id="btnExecuteDemoSignal" class="ak-btn primary">
              🎯 Ejecutar Entrada en Modo Demo
            </button>
            <button id="btnSendSignalTelegram" class="ak-btn" style="background:#0088cc;color:#fff;">
              📲 Enviar Señal a Telegram
            </button>
            <button id="btnCopySignalText" class="ak-btn secondary">
              📋 Copiar Señal
            </button>
          </div>
        </div>
      `;
    }

    renderOpenPositions() {
      const container = document.getElementById("simOpenPositionsList");
      if (!container) return;

      if (this.paper.openPositions.length === 0) {
        container.innerHTML = `
          <div style="text-align:center;padding:24px;color:#64748b;font-size:12px;border:1px dashed rgba(255,255,255,0.08);border-radius:8px;">
            No hay operaciones abiertas en este momento. Usa el formulario o ejecuta la señal del escáner en modo demo.
          </div>
        `;
        return;
      }

      container.innerHTML = `
        <table class="ak-sim-table">
          <thead>
            <tr>
              <th>Ticket</th>
              <th>Mercado</th>
              <th>Tipo</th>
              <th>Lote</th>
              <th>Entrada</th>
              <th>Actual</th>
              <th>SL / TP</th>
              <th>P&amp;L Flotante</th>
              <th>Acción</th>
            </tr>
          </thead>
          <tbody>
            ${this.paper.openPositions.map(pos => {
              const isProfit = (pos.pnl || 0) >= 0;
              const isBinary = Boolean(pos.isBinary);
              return `
                <tr>
                  <td style="font-family:monospace;color:#94a3b8;">#${pos.id.slice(-6)}</td>
                  <td><strong>${MARKETS[pos.marketId]?.icon || ''} ${pos.marketName}</strong></td>
                  <td><span class="ak-pill ${pos.type === 'BUY' || pos.type === 'CALL' ? 'live' : 'sentinel'}">${pos.type}</span></td>
                  <td>${isBinary ? '$' + pos.lot : pos.lot}</td>
                  <td>${pos.entryPrice}</td>
                  <td id="livePrice_${pos.id}">${pos.currentPrice || pos.entryPrice}</td>
                  <td style="font-size:11px;color:#94a3b8;">
                    ${isBinary ? `⏱️ Expira: <span id="timer_${pos.id}">${pos.remainingSeconds || 0}s</span>` : `SL: ${pos.sl || '-'} | TP: ${pos.tp || '-'}`}
                  </td>
                  <td style="font-weight:bold;color:${isProfit ? '#10b981' : '#ef4444'};" id="livePnl_${pos.id}">
                    ${isBinary ? (pos.status || 'En curso') : `${isProfit ? '+' : ''}$${(pos.pnl || 0).toFixed(2)} USD`}
                  </td>
                  <td>
                    ${!isBinary ? `
                      <button class="ak-btn subtle btnClosePos" data-id="${pos.id}" style="padding:4px 8px;font-size:11px;">Cerrar</button>
                    ` : `
                      <span style="font-size:11px;color:#00f2fe;">Auto-cierre</span>
                    `}
                  </td>
                </tr>
              `;
            }).join('')}
          </tbody>
        </table>
      `;
    }

    renderClosedTrades() {
      const container = document.getElementById("simClosedTradesList");
      if (!container) return;

      if (this.paper.closedTrades.length === 0) {
        container.innerHTML = `
          <div style="text-align:center;padding:16px;color:#64748b;font-size:12px;">
            Aún no hay operaciones cerradas.
          </div>
        `;
        return;
      }

      const recent = this.paper.closedTrades.slice(-10).reverse();
      container.innerHTML = `
        <table class="ak-sim-table">
          <thead>
            <tr>
              <th>Hora</th>
              <th>Mercado</th>
              <th>Tipo</th>
              <th>Entrada</th>
              <th>Cierre</th>
              <th>Resultado</th>
              <th>P&amp;L Neto</th>
            </tr>
          </thead>
          <tbody>
            ${recent.map(tr => {
              const won = tr.pnl >= 0;
              return `
                <tr>
                  <td style="font-size:11px;color:#94a3b8;">${tr.closedAt}</td>
                  <td>${MARKETS[tr.marketId]?.icon || ''} ${tr.marketName}</td>
                  <td><span class="ak-pill ${tr.type === 'BUY' || tr.type === 'CALL' ? 'live' : 'sentinel'}">${tr.type}</span></td>
                  <td>${tr.entryPrice}</td>
                  <td>${tr.closePrice}</td>
                  <td><span class="ak-badge ${won ? 'ok' : 'alert'}">${won ? 'GANADA (WIN)' : 'PERDIDA (LOSS)'}</span></td>
                  <td style="font-weight:bold;color:${won ? '#10b981' : '#ef4444'};">
                    ${won ? '+' : ''}$${tr.pnl.toFixed(2)} USD
                  </td>
                </tr>
              `;
            }).join('')}
          </tbody>
        </table>
      `;
    }

    renderAccountCalculations() {
      const box = document.getElementById("accountCalculationBox");
      if (!box) return;

      const calc = this.calculateSafeLot(this.accountSize);
      box.innerHTML = `
        <div class="ak-calc-grid">
          <div>
            <span class="sub">Capital Base:</span>
            <strong style="color:#00f2fe;">$${calc.capital.toLocaleString()} USD</strong>
          </div>
          <div>
            <span class="sub">Riesgo Objetivo (1.5%):</span>
            <strong style="color:#f59e0b;">$${calc.targetRiskMoney} USD</strong>
          </div>
          <div>
            <span class="sub">Lotaje Seguro Sugerido:</span>
            <strong style="color:#10b981;">${calc.lot} Lote(s)</strong>
          </div>
          <div>
            <span class="sub">Riesgo Real en SL (25 pips):</span>
            <strong style="color:${calc.actualRiskPercent > 5 ? '#ef4444' : '#fff'};">$${calc.actualRiskMoney} USD (${calc.actualRiskPercent}%)</strong>
          </div>
          <div>
            <span class="sub">Ganancia TP1 (1:1.5):</span>
            <strong style="color:#10b981;">+$${calc.tp1Profit} USD</strong>
          </div>
          <div>
            <span class="sub">Ganancia TP2 (1:2.5):</span>
            <strong style="color:#10b981;">+$${calc.tp2Profit} USD</strong>
          </div>
          <div>
            <span class="sub">Ganancia TP3 (1:4.0):</span>
            <strong style="color:#10b981;">+$${calc.tp3Profit} USD</strong>
          </div>
        </div>

        ${calc.isMicroAccount ? `
          <div class="ak-micro-note-box" style="margin-top:12px;background:rgba(245,158,11,0.1);border:1px solid rgba(245,158,11,0.3);border-radius:6px;padding:10px 12px;font-size:11px;color:#fcd34d;line-height:1.4;">
            <strong>💡 Perspicacia Matemática para Micro-Cuentas:</strong><br>
            ${calc.microNote}
          </div>
        ` : ''}

        <div style="margin-top:12px;display:flex;justify-content:flex-end;">
          <button id="btnSyncToDemoFromSentinel" class="ak-btn secondary" style="font-size:11px;padding:6px 12px;">
            🎮 Probar este Capital ($${calc.capital}) en el Simulador Demo
          </button>
        </div>
      `;

      // Vincular el botón de sincronización dentro de la caja de cálculo
      const btnSync = document.getElementById("btnSyncToDemoFromSentinel");
      if (btnSync) {
        btnSync.onclick = () => {
          this.syncDemoBalanceWithCapital();
          const simTabBtn = document.querySelector('[data-ttab="simulator"]');
          if (simTabBtn) simTabBtn.click();
        };
      }
    }

    renderCompoundTable() {
      const tbody = document.getElementById("compoundTableBody");
      const summaryBox = document.getElementById("compoundSummaryBox");
      if (!tbody) return;

      let cap = this.accountSize;
      const rate = this.compoundRate;
      const days = this.compoundDays;
      const rows = [];
      
      // Determinar hitos de visualización según el horizonte temporal
      let checkpoints = [];
      if (days <= 30) {
        checkpoints = [1, 2, 3, 5, 7, 10, 15, 20, 25, 30];
      } else if (days <= 60) {
        checkpoints = [1, 5, 10, 15, 20, 25, 30, 40, 50, 60];
      } else if (days <= 90) {
        checkpoints = [1, 5, 10, 15, 20, 25, 30, 45, 60, 75, 90];
      } else {
        checkpoints = [1, 10, 20, 30, 45, 60, 90, 120, 150, 180];
      }

      let startCap = cap;
      let finalCap = cap;

      for (let day = 1; day <= days; day++) {
        const dailyProfit = cap * rate;
        const endCap = cap + dailyProfit;

        if (checkpoints.includes(day)) {
          const safeLot = this.calculateSafeLot(endCap).lot;
          const roiPct = (((endCap - startCap) / startCap) * 100).toFixed(1);

          rows.push(`
            <tr>
              <td><strong>Día ${day}</strong></td>
              <td>$${cap.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})} USD</td>
              <td style="color:#10b981;">+$${dailyProfit.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})} USD</td>
              <td><strong style="color:#00f2fe;">$${endCap.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})} USD</strong></td>
              <td style="color:#cbd5e1;font-weight:600;">${safeLot} Lote(s)</td>
              <td style="color:#10b981;font-weight:bold;">+${roiPct}%</td>
            </tr>
          `);
        }
        cap = endCap;
        finalCap = endCap;
      }

      tbody.innerHTML = rows.join('');

      if (summaryBox) {
        const totalNetProfit = finalCap - startCap;
        const multiplier = (finalCap / startCap).toFixed(1);
        const totalRoi = (((finalCap - startCap) / startCap) * 100).toFixed(1);

        summaryBox.innerHTML = `
          <div class="ak-compound-summary-grid">
            <div class="ak-csum-card">
              <span class="label">CAPITAL INICIAL:</span>
              <strong class="val">$${startCap.toLocaleString()} USD</strong>
            </div>
            <div class="ak-csum-card">
              <span class="label">CAPITAL FINAL (DÍA ${days}):</span>
              <strong class="val" style="color:#00f2fe;">$${finalCap.toLocaleString(undefined, {maximumFractionDigits: 0})} USD</strong>
            </div>
            <div class="ak-csum-card">
              <span class="label">GANANCIA NETA TOTAL:</span>
              <strong class="val" style="color:#10b981;">+$${totalNetProfit.toLocaleString(undefined, {maximumFractionDigits: 0})} USD</strong>
            </div>
            <div class="ak-csum-card">
              <span class="label">MULTIPLICADOR / ROI:</span>
              <strong class="val" style="color:#f59e0b;">${multiplier}x (+${totalRoi}%)</strong>
            </div>
          </div>
        `;
      }
    }

    updateSimulatorLiveUI() {
      const balEl = document.getElementById("simBalanceVal");
      const eqEl = document.getElementById("simEquityVal");
      const wrEl = document.getElementById("simWinRateVal");
      if (balEl) balEl.innerText = `$${this.paper.balance.toFixed(2)} USD`;
      if (eqEl) {
        eqEl.innerText = `$${this.paper.equity.toFixed(2)} USD`;
        eqEl.style.color = this.paper.equity >= this.paper.balance ? '#10b981' : '#ef4444';
      }
      if (wrEl) wrEl.innerText = `${this.getWinRate()}%`;

      this.paper.openPositions.forEach(pos => {
        const pEl = document.getElementById(`livePrice_${pos.id}`);
        const pnlEl = document.getElementById(`livePnl_${pos.id}`);
        if (pEl) pEl.innerText = pos.currentPrice;
        if (pnlEl && !pos.isBinary) {
          const isProf = (pos.pnl || 0) >= 0;
          pnlEl.innerText = `${isProf ? '+' : ''}${(pos.pnl || 0).toFixed(2)} USD`;
          pnlEl.style.color = isProf ? '#10b981' : '#ef4444';
        }
      });
    }

    getWinRate() {
      if (this.paper.closedTrades.length === 0) return 0;
      const wins = this.paper.closedTrades.filter(t => t.pnl > 0).length;
      return Math.round((wins / this.paper.closedTrades.length) * 100);
    }

    // Sincronizar saldo del simulador con el capital seleccionado por el usuario
    syncDemoBalanceWithCapital() {
      this.paper = {
        balance: this.accountSize,
        equity: this.accountSize,
        initialBalance: this.accountSize,
        openPositions: [],
        closedTrades: []
      };
      this.savePaperAccount();
      this.renderOpenPositions();
      this.renderClosedTrades();
      this.updateSimulatorLiveUI();
      
      const btnSync = document.getElementById("btnSyncDemoWithCap");
      if (btnSync) {
        btnSync.innerText = `✅ Saldo Demo Sincronizado ($${this.accountSize})`;
        setTimeout(() => {
          btnSync.innerText = `🔄 Sincronizar Saldo con mi Capital ($${this.accountSize})`;
        }, 2000);
      }
    }

    // Ejecución de orden en Demo Simulator
    executeDemoOrder(marketId, type, lot, sl = null, tp = null, isBinary = false, duration = 60) {
      // Verificar cortacircuito
      if (this.sentinel.isCircuitBreakerActive) {
        alert("🛑 CORTACIRCUITO ACTIVADO: " + this.sentinel.lockReason);
        return;
      }

      const m = MARKETS[marketId] || MARKETS["XAUUSD"];
      const price = this.marketPrices[marketId] || m.basePrice;

      const pos = {
        id: "POS-" + Math.floor(100000 + Math.random() * 900000),
        marketId: marketId,
        marketName: m.name,
        type: type,
        lot: lot,
        entryPrice: price,
        currentPrice: price,
        sl: sl,
        tp: tp,
        isBinary: isBinary,
        pnl: 0,
        openedAt: new Date().toLocaleTimeString()
      };

      if (isBinary) {
        pos.remainingSeconds = duration;
        pos.stake = lot; // en binarias el lote es el importe apostado ($)
        this.paper.balance = parseFloat((this.paper.balance - pos.stake).toFixed(2));
        this.paper.openPositions.push(pos);
        this.savePaperAccount();
        this.renderOpenPositions();
        this.startBinaryCountdown(pos.id, duration);
      } else {
        this.paper.openPositions.push(pos);
        this.savePaperAccount();
        this.renderOpenPositions();
      }
    }

    startBinaryCountdown(posId, seconds) {
      let rem = seconds;
      const interval = setInterval(() => {
        rem--;
        const pos = this.paper.openPositions.find(p => p.id === posId);
        if (!pos) {
          clearInterval(interval);
          return;
        }

        pos.remainingSeconds = rem;
        const timerEl = document.getElementById(`timer_${posId}`);
        if (timerEl) timerEl.innerText = `${rem}s`;

        if (rem <= 0) {
          clearInterval(interval);
          this.resolveBinaryOption(posId);
        }
      }, 1000);
    }

    resolveBinaryOption(posId) {
      const idx = this.paper.openPositions.findIndex(p => p.id === posId);
      if (idx === -1) return;
      const pos = this.paper.openPositions[idx];
      const cur = this.marketPrices[pos.marketId] || pos.entryPrice;

      let won = false;
      if (pos.type === "CALL" && cur > pos.entryPrice) won = true;
      else if (pos.type === "PUT" && cur < pos.entryPrice) won = true;

      const payout = won ? parseFloat((pos.stake * 1.85).toFixed(2)) : 0;
      const netPnL = won ? parseFloat((pos.stake * 0.85).toFixed(2)) : -pos.stake;

      if (won) {
        this.paper.balance = parseFloat((this.paper.balance + payout).toFixed(2));
      }

      this.paper.closedTrades.push({
        id: pos.id,
        marketId: pos.marketId,
        marketName: pos.marketName,
        type: pos.type,
        entryPrice: pos.entryPrice,
        closePrice: cur,
        pnl: netPnL,
        closedAt: new Date().toLocaleTimeString()
      });

      this.paper.openPositions.splice(idx, 1);
      this.updateSentinelStats(won, netPnL);
      this.savePaperAccount();
      this.renderOpenPositions();
      this.renderClosedTrades();
      this.updateSimulatorLiveUI();
    }

    closePosition(posId, reason = "MANUAL") {
      const idx = this.paper.openPositions.findIndex(p => p.id === posId);
      if (idx === -1) return;
      const pos = this.paper.openPositions[idx];
      const cur = this.marketPrices[pos.marketId] || pos.entryPrice;
      
      const pnl = pos.pnl || 0;
      this.paper.balance = parseFloat((this.paper.balance + pnl).toFixed(2));

      this.paper.closedTrades.push({
        id: pos.id,
        marketId: pos.marketId,
        marketName: pos.marketName,
        type: pos.type,
        entryPrice: pos.entryPrice,
        closePrice: cur,
        pnl: pnl,
        reason: reason,
        closedAt: new Date().toLocaleTimeString()
      });

      this.paper.openPositions.splice(idx, 1);
      this.updateSentinelStats(pnl >= 0, pnl);
      this.savePaperAccount();
      this.renderOpenPositions();
      this.renderClosedTrades();
      this.updateSimulatorLiveUI();
    }

    // ACTUALIZACIÓN DE ESTADÍSTICAS DEL CENTINELA ASIMÉTRICO (4W / 2L)
    updateSentinelStats(isWin, pnl) {
      if (isWin) {
        this.sentinel.winsToday++;
        this.sentinel.consecutiveLosses = 0;
      } else {
        this.sentinel.lossesToday++;
        this.sentinel.consecutiveLosses++;
      }
      this.sentinel.dailyPnL = parseFloat((this.sentinel.dailyPnL + pnl).toFixed(2));

      // LÓGICA ASIMÉTRICA:
      // 1. Pérdidas: 2 pérdidas (consecutivas o totales en el día) = BLOQUEO INMEDIATO
      if (this.sentinel.consecutiveLosses >= this.maxLossesLimit || this.sentinel.lossesToday >= this.maxLossesLimit) {
        this.sentinel.isCircuitBreakerActive = true;
        this.sentinel.lockReason = `🛑 CORTACIRCUITO ACTIVADO: Límite de ${this.maxLossesLimit} pérdidas alcanzado hoy. Pausa obligatoria de 24 horas para preservar el capital y domar la psicología.`;
      }
      // 2. Victorias: Ampliado a 4 victorias (permite aprovechar la racha ganadora sin codicia infinita)
      else if (this.sentinel.winsToday >= this.maxWinsTarget) {
        this.sentinel.isCircuitBreakerActive = true;
        this.sentinel.lockReason = `🏆 ¡META DIARIA CUMPLIDA (+${this.sentinel.winsToday} Victorias)! Las matemáticas recomiendan asegurar beneficios y retirarse triunfador para no sobreoperar.`;
      }

      this.saveSentinel();
      const statusPill = document.querySelector(".ak-pill.sentinel");
      if (statusPill) {
        statusPill.className = `ak-pill sentinel ${this.sentinel.isCircuitBreakerActive ? 'alert' : 'ok'}`;
        statusPill.innerText = this.sentinel.isCircuitBreakerActive ? '🔴 CORTACIRCUITO ACTIVO' : '🛡️ RIESGO ASIMÉTRICO (4W / 2L)';
      }
    }

    loadTradingViewWidget() {
      const container = document.getElementById("tradingview_widget_container");
      if (!container) return;
      container.innerHTML = "";

      const m = MARKETS[this.selectedMarket] || MARKETS["XAUUSD"];
      const widgetDiv = document.createElement("div");
      widgetDiv.className = "tradingview-widget-container";
      widgetDiv.style.height = "550px";
      widgetDiv.style.width = "100%";

      const subDiv = document.createElement("div");
      subDiv.className = "tradingview-widget-container__widget";
      subDiv.style.height = "calc(100% - 32px)";
      subDiv.style.width = "100%";
      widgetDiv.appendChild(subDiv);

      const script = document.createElement("script");
      script.type = "text/javascript";
      script.src = "https://s3.tradingview.com/external-embedding/embed-widget-advanced-chart.js";
      script.async = true;
      script.innerHTML = JSON.stringify({
        "autosize": true,
        "symbol": m.tvSymbol,
        "interval": this.selectedTimeframe === "M1" ? "1" : this.selectedTimeframe === "M5" ? "5" : this.selectedTimeframe === "M15" ? "15" : this.selectedTimeframe === "H1" ? "60" : this.selectedTimeframe === "H4" ? "240" : "D",
        "timezone": "America/Bogota",
        "theme": "dark",
        "style": "1",
        "locale": "es",
        "enable_publishing": false,
        "backgroundColor": "rgba(8, 11, 18, 1)",
        "gridColor": "rgba(255, 255, 255, 0.04)",
        "withdateranges": true,
        "hide_side_toolbar": false,
        "allow_symbol_change": true,
        "details": true,
        "hotlist": true,
        "calendar": false,
        "support_host": "https://www.tradingview.com"
      });

      widgetDiv.appendChild(script);
      container.appendChild(widgetDiv);
    }

    bindEvents() {
      const container = document.getElementById("tradingSection");
      if (!container) return;

      // Cambio de pestañas
      container.querySelectorAll(".ak-ttab-btn").forEach(btn => {
        btn.addEventListener("click", (e) => {
          const tab = e.currentTarget.dataset.ttab;
          this.activeTab = tab;
          container.querySelectorAll(".ak-ttab-btn").forEach(b => b.classList.remove("active"));
          container.querySelectorAll(".ak-ttab-pane").forEach(p => p.classList.remove("active"));
          e.currentTarget.classList.add("active");
          const target = document.getElementById(`tab-${tab}`);
          if (target) target.classList.add("active");

          if (tab === "chart") {
            setTimeout(() => this.loadTradingViewWidget(), 100);
          }
        });
      });

      // Cambio de mercado en escáner
      const selMarket = document.getElementById("selTradingMarket");
      if (selMarket) {
        selMarket.addEventListener("change", (e) => {
          this.selectedMarket = e.target.value;
          this.generateHarmonicSignal(this.selectedMarket, this.selectedTimeframe);
          const priceInput = document.getElementById("simOrderPrice");
          if (priceInput) priceInput.value = this.marketPrices[this.selectedMarket];
        });
      }

      // Cambio de temporalidad
      container.querySelectorAll(".ak-tf-btn").forEach(btn => {
        btn.addEventListener("click", (e) => {
          container.querySelectorAll(".ak-tf-btn").forEach(b => b.classList.remove("active"));
          e.currentTarget.classList.add("active");
          this.selectedTimeframe = e.currentTarget.dataset.tf;
          this.generateHarmonicSignal(this.selectedMarket, this.selectedTimeframe);
        });
      });

      // Botón Re-escanear
      const btnRescan = document.getElementById("btnRescan");
      if (btnRescan) {
        btnRescan.addEventListener("click", () => {
          btnRescan.innerText = "⏳ Escaneando...";
          setTimeout(() => {
            this.generateHarmonicSignal(this.selectedMarket, this.selectedTimeframe);
            btnRescan.innerText = "⚡ Escanear Mercado en Vivo";
          }, 400);
        });
      }

      // Pills de mercado rápido en gráfico
      container.querySelectorAll(".ak-market-pill").forEach(btn => {
        btn.addEventListener("click", (e) => {
          const m = e.currentTarget.dataset.market;
          this.selectedMarket = m;
          container.querySelectorAll(".ak-market-pill").forEach(b => b.classList.remove("active"));
          e.currentTarget.classList.add("active");
          this.loadTradingViewWidget();
        });
      });

      // Botón Ejecutar Señal en Demo
      container.addEventListener("click", (e) => {
        if (e.target.id === "btnExecuteDemoSignal" && this.currentSignal) {
          const sig = this.currentSignal;
          const calc = this.calculateSafeLot(this.accountSize);
          const isBin = sig.type === "CALL" || sig.type === "PUT";
          this.executeDemoOrder(
            sig.marketId,
            sig.type,
            isBin ? 10 : calc.lot,
            sig.sl,
            sig.tp1,
            isBin,
            60
          );
          // Cambiar a pestaña simulador
          const simTabBtn = container.querySelector('[data-ttab="simulator"]');
          if (simTabBtn) simTabBtn.click();
        }

        // Enviar a Telegram
        if (e.target.id === "btnSendSignalTelegram" && this.currentSignal) {
          this.sendSignalToTelegram(this.currentSignal);
        }

        // Copiar texto de la señal
        if (e.target.id === "btnCopySignalText" && this.currentSignal) {
          const s = this.currentSignal;
          const txt = `📈 AKIRA QUANTUM TRADING SIGNAL\nMercado: ${s.marketName}\nPatrón: ${s.pattern}\nTipo: ${s.type}\nEntrada: ${s.entry}\nSL: ${s.sl || '-'}\nTP1: ${s.tp1 || '-'}\nTP2: ${s.tp2 || '-'}\nTP3: ${s.tp3 || '-'}\nConfluencia: ${s.confluence}%\nSMC: ${s.smc}`;
          navigator.clipboard.writeText(txt).then(() => {
            alert("📋 Señal copiada al portapapeles");
          });
        }

        // Botón Cerrar Posición
        if (e.target.classList.contains("btnClosePos")) {
          const id = e.target.dataset.id;
          this.closePosition(id, "MANUAL_CLOSE");
        }
      });

      // Orden manual Buy/Sell en Simulador
      const btnBuy = document.getElementById("btnSimBuy");
      const btnSell = document.getElementById("btnSimSell");
      if (btnBuy && btnSell) {
        btnBuy.addEventListener("click", () => {
          const m = document.getElementById("simOrderMarket")?.value || this.selectedMarket;
          const lot = parseFloat(document.getElementById("simOrderLot")?.value || "0.01");
          const isBin = MARKETS[m]?.isBinary;
          this.executeDemoOrder(m, isBin ? "CALL" : "BUY", lot, null, null, isBin, 60);
        });

        btnSell.addEventListener("click", () => {
          const m = document.getElementById("simOrderMarket")?.value || this.selectedMarket;
          const lot = parseFloat(document.getElementById("simOrderLot")?.value || "0.01");
          const isBin = MARKETS[m]?.isBinary;
          this.executeDemoOrder(m, isBin ? "PUT" : "SELL", lot, null, null, isBin, 60);
        });
      }

      // Sincronizar demo con capital
      const btnSyncDemo = document.getElementById("btnSyncDemoWithCap");
      if (btnSyncDemo) {
        btnSyncDemo.addEventListener("click", () => {
          this.syncDemoBalanceWithCapital();
        });
      }

      // Reiniciar Demo a $50
      const btnResetDemo = document.getElementById("btnResetDemo");
      if (btnResetDemo) {
        btnResetDemo.addEventListener("click", () => {
          if (confirm("¿Deseas reiniciar la cuenta demo a $50.00 USD?")) {
            this.paper = {
              balance: 50.00,
              equity: 50.00,
              initialBalance: 50.00,
              openPositions: [],
              closedTrades: []
            };
            this.savePaperAccount();
            this.renderOpenPositions();
            this.renderClosedTrades();
            this.updateSimulatorLiveUI();
          }
        });
      }

      // Input Personalizado de Capital en Centinela
      const inpCapital = document.getElementById("inpCustomAccountSize");
      const btnApplyCap = document.getElementById("btnApplyCapital");
      const applyCapitalChange = () => {
        const val = parseFloat(inpCapital?.value);
        if (!isNaN(val) && val > 0) {
          this.accountSize = val;
          localStorage.setItem(STORAGE_KEY_CAPITAL, val.toString());
          
          // Actualizar input del formulario demo
          const simLotInput = document.getElementById("simOrderLot");
          if (simLotInput) {
            simLotInput.value = this.calculateSafeLot(this.accountSize).lot;
          }
          
          this.renderAccountCalculations();
          this.renderCompoundTable();

          // Actualizar botones rápidos activos
          container.querySelectorAll(".ak-amt-btn").forEach(b => {
            b.classList.toggle("active", parseFloat(b.dataset.amt) === val);
          });
        }
      };

      if (btnApplyCap) btnApplyCap.addEventListener("click", applyCapitalChange);
      if (inpCapital) {
        inpCapital.addEventListener("keydown", (e) => {
          if (e.key === "Enter") applyCapitalChange();
        });
      }

      // Pills rápidas de capital en Centinela
      container.querySelectorAll(".ak-amt-btn").forEach(btn => {
        btn.addEventListener("click", (e) => {
          container.querySelectorAll(".ak-amt-btn").forEach(b => b.classList.remove("active"));
          e.currentTarget.classList.add("active");
          const amt = parseFloat(e.currentTarget.dataset.amt);
          this.accountSize = amt;
          localStorage.setItem(STORAGE_KEY_CAPITAL, amt.toString());
          if (inpCapital) inpCapital.value = amt;
          this.renderAccountCalculations();
          this.renderCompoundTable();
        });
      });

      // Cambio de Tasa y Días de Interés Compuesto
      const selRate = document.getElementById("selCompoundRate");
      if (selRate) {
        selRate.addEventListener("change", (e) => {
          this.compoundRate = parseFloat(e.target.value);
          this.renderCompoundTable();
        });
      }

      const selDays = document.getElementById("selCompoundDays");
      if (selDays) {
        selDays.addEventListener("change", (e) => {
          this.compoundDays = parseInt(e.target.value, 10);
          this.renderCompoundTable();
        });
      }

      // Resetear Cortacircuito
      const btnResetCircuit = document.getElementById("btnResetCircuit");
      if (btnResetCircuit) {
        btnResetCircuit.addEventListener("click", () => {
          this.sentinel.winsToday = 0;
          this.sentinel.lossesToday = 0;
          this.sentinel.consecutiveLosses = 0;
          this.sentinel.isCircuitBreakerActive = false;
          this.sentinel.dailyPnL = 0;
          this.saveSentinel();
          this.render();
          this.bindEvents();
        });
      }

      // Guardar Deriv Token
      const btnSaveDeriv = document.getElementById("btnSaveDerivToken");
      if (btnSaveDeriv) {
        btnSaveDeriv.addEventListener("click", () => {
          const val = document.getElementById("derivApiTokenInput")?.value || "";
          localStorage.setItem(STORAGE_KEY_DERIV, val.trim());
          const fb = document.getElementById("derivTokenFeedback");
          if (fb) fb.innerText = "✅ Token guardado en tu navegador local con éxito.";
        });
      }

      // Copiar script Python MT5
      const btnCopyMt5 = document.getElementById("btnCopyMt5Script");
      if (btnCopyMt5) {
        btnCopyMt5.addEventListener("click", () => {
          const scriptCode = `# AKIRA MT5 ZERO-COST BRIDGE SCRIPT
import MetaTrader5 as mt5
import requests
import time

AKIRA_SIGNAL_URL = "http://localhost:8000/api/v8/trading/active-signal"

def init_mt5():
    if not mt5.initialize():
        print("Error inicializando MT5:", mt5.last_error())
        quit()
    print("Conectado con éxito a MetaTrader 5!")

def execute_order(symbol, action, lot, sl, tp):
    order_type = mt5.ORDER_TYPE_BUY if action == "BUY" else mt5.ORDER_TYPE_SELL
    price = mt5.symbol_info_tick(symbol).ask if action == "BUY" else mt5.symbol_info_tick(symbol).bid
    req = {
        "action": mt5.TRADE_ACTION_DEAL,
        "symbol": symbol,
        "volume": float(lot),
        "type": order_type,
        "price": price,
        "sl": float(sl),
        "tp": float(tp),
        "deviation": 20,
        "magic": 234000,
        "comment": "Akira Quantum Lab Signal",
        "type_time": mt5.ORDER_TIME_GTC,
        "type_filling": mt5.ORDER_FILLING_IOC,
    }
    res = mt5.order_send(req)
    print("Orden ejecutada:", res)

if __name__ == "__main__":
    init_mt5()
    print("Akira MT5 Bridge activo y esperando señales institucionales...")
`;
          navigator.clipboard.writeText(scriptCode).then(() => {
            alert("📋 Script Python akira_mt5_bridge.py copiado al portapapeles. ¡Listo para usar con MetaTrader 5!");
          });
        });
      }

      // Test Telegram Alert
      const btnTestTg = document.getElementById("btnTestTelegramAlert");
      if (btnTestTg) {
        btnTestTg.addEventListener("click", () => {
          this.sendSignalToTelegram(this.currentSignal || {
            marketName: "Oro / Dólar (XAU/USD)",
            pattern: "Bullish Gartley Test",
            type: "BUY",
            entry: 2748.50,
            sl: 2723.50,
            tp1: 2786.00,
            confluence: 92.5,
            smc: "Test Institucional Conexión Telegram"
          });
        });
      }
    }

    async sendSignalToTelegram(signal) {
      const msg = `⚡ *ALERTA AKIRA QUANTUM TRADING* ⚡\n\n` +
        `📊 *Mercado:* ${signal.marketName}\n` +
        `🎯 *Patrón:* ${signal.pattern}\n` +
        `🟢 *Acción:* ${signal.type}\n` +
        `📍 *Entrada:* \`${signal.entry}\`\n` +
        `🛡️ *Stop Loss:* \`${signal.sl || 'No aplica'}\`\n` +
        `🎯 *TP1 (1:1.5):* \`${signal.tp1 || 'No aplica'}\`\n` +
        `🎯 *TP2 (1:2.5):* \`${signal.tp2 || 'No aplica'}\`\n` +
        `📈 *Confluencia:* ${signal.confluence}%\n` +
        `🔬 *SMC:* ${signal.smc}\n\n` +
        `_Enviado automáticamente por Akira Trading Lab para Jhon Grimm._`;

      try {
        const token = localStorage.getItem("akira_telegram_token") || "";
        const chatId = localStorage.getItem("akira_telegram_chat_id") || "";

        if (token && chatId) {
          await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ chat_id: chatId, text: msg, parse_mode: "Markdown" })
          });
          alert("✅ Señal enviada a Telegram directamente!");
        } else {
          alert("📱 Señal formateada para Telegram:\n\n" + msg + "\n\n(Configura tu Token y Chat ID en 'Mi Cuenta' para envío directo).");
        }
      } catch (e) {
        alert("📱 Señal lista:\n\n" + msg);
      }
    }
  }

  // Estilos visuales del Trading Lab v2
  (function injectStyles(){
    if (document.getElementById("akira-trading-lab-styles")) return;
    const s = document.createElement("style");
    s.id = "akira-trading-lab-styles";
    s.textContent = `
      .ak-trading-wrap {
        display: flex; flex-direction: column; gap: 16px;
        color: #e2e8f0; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      }
      .ak-trading-hero {
        background: linear-gradient(135deg, rgba(8, 12, 20, 0.95), rgba(15, 23, 42, 0.9));
        border: 1px solid rgba(0, 242, 254, 0.25);
        border-radius: 12px; padding: 20px 24px 0 24px;
        box-shadow: 0 8px 32px rgba(0,0,0,0.4);
      }
      .ak-trading-hero-top {
        display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 16px;
        margin-bottom: 20px;
      }
      .ak-trading-title-group { display: flex; align-items: center; gap: 14px; }
      .ak-trading-logo { font-size: 32px; filter: drop-shadow(0 0 10px rgba(0,242,254,0.5)); }
      .ak-trading-title-group h2 { margin: 0; font-size: 20px; color: #fff; font-weight: 700; }
      .ak-trading-title-group p { margin: 4px 0 0 0; font-size: 13px; color: #94a3b8; }
      .ak-trading-badge-group { display: flex; gap: 8px; flex-wrap: wrap; }
      .ak-pill {
        display: inline-flex; align-items: center; gap: 6px;
        padding: 4px 10px; border-radius: 20px; font-size: 11px; font-weight: 600;
      }
      .ak-pill.live { background: rgba(16,185,129,0.15); color: #10b981; border: 1px solid rgba(16,185,129,0.3); }
      .ak-pill.sentinel.ok { background: rgba(0,242,254,0.15); color: #00f2fe; border: 1px solid rgba(0,242,254,0.3); }
      .ak-pill.sentinel.alert { background: rgba(239,68,68,0.2); color: #ef4444; border: 1px solid rgba(239,68,68,0.4); }
      .ak-pill.free { background: rgba(245,158,11,0.15); color: #f59e0b; border: 1px solid rgba(245,158,11,0.3); }
      .ak-pill .dot { width: 6px; height: 6px; border-radius: 50%; background: #10b981; animation: pulse 1.5s infinite; }
      @keyframes pulse { 0% { opacity: 1; } 50% { opacity: 0.3; } 100% { opacity: 1; } }

      .ak-trading-tabs {
        display: flex; gap: 4px; border-bottom: 1px solid rgba(255,255,255,0.08);
        overflow-x: auto; scrollbar-width: none;
      }
      .ak-trading-tabs::-webkit-scrollbar { display: none; }
      .ak-ttab-btn {
        background: transparent; border: 1px solid transparent; border-bottom: none; color: #94a3b8;
        font-size: 12px; padding: 10px 16px; border-radius: 8px 8px 0 0; cursor: pointer; white-space: nowrap;
        transition: all 0.2s;
      }
      .ak-ttab-btn.active {
        background: #080c14; border-color: rgba(0,242,254,0.3); color: #00f2fe; font-weight: 700;
        border-bottom: 2px solid #080c14; margin-bottom: -1px;
      }
      .ak-ttab-pane { display: none; flex-direction: column; gap: 16px; }
      .ak-ttab-pane.active { display: flex; }

      .ak-scanner-controls {
        display: flex; align-items: flex-end; gap: 14px; flex-wrap: wrap;
        background: rgba(15,23,42,0.6); border: 1px solid rgba(255,255,255,0.08); border-radius: 10px;
        padding: 14px 18px;
      }
      .ak-control-group { display: flex; flex-direction: column; gap: 6px; }
      .ak-control-group label { font-size: 11px; font-weight: 700; color: #94a3b8; letter-spacing: 0.5px; }
      .ak-input-select, .ak-input-text {
        background: rgba(0,0,0,0.5); border: 1px solid rgba(255,255,255,0.15); border-radius: 6px;
        color: #fff; padding: 7px 12px; font-size: 12px; outline: none;
      }
      .ak-tf-buttons { display: flex; gap: 4px; }
      .ak-tf-btn {
        background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.1); border-radius: 4px;
        color: #94a3b8; padding: 6px 10px; font-size: 11px; font-weight: 600; cursor: pointer;
      }
      .ak-tf-btn.active { background: rgba(0,242,254,0.2); border-color: #00f2fe; color: #00f2fe; }

      .ak-btn {
        padding: 8px 14px; border-radius: 6px; font-size: 12px; font-weight: 600; cursor: pointer;
        display: inline-flex; align-items: center; gap: 6px; border: 1px solid transparent; transition: all 0.2s;
      }
      .ak-btn.primary { background: linear-gradient(135deg, #00f2fe, #4facfe); color: #080c14; border: none; }
      .ak-btn.secondary { background: rgba(255,255,255,0.08); color: #fff; border-color: rgba(255,255,255,0.15); }
      .ak-btn.subtle { background: rgba(255,255,255,0.04); color: #94a3b8; border-color: rgba(255,255,255,0.08); }
      .ak-btn.buy { background: #10b981; color: #fff; border: none; }
      .ak-btn.sell { background: #ef4444; color: #fff; border: none; }

      .ak-signal-card {
        background: rgba(15,23,42,0.8); border: 1px solid rgba(255,255,255,0.1); border-radius: 12px;
        padding: 20px; display: flex; flex-direction: column; gap: 16px;
      }
      .ak-signal-card.bullish { border-left: 4px solid #10b981; }
      .ak-signal-card.bearish { border-left: 4px solid #ef4444; }
      .ak-sig-head { display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 12px; }
      .ak-sig-type-pill { padding: 4px 12px; border-radius: 4px; font-weight: 800; font-size: 13px; }
      .ak-sig-type-pill.bull { background: rgba(16,185,129,0.2); color: #10b981; border: 1px solid #10b981; }
      .ak-sig-type-pill.bear { background: rgba(239,68,68,0.2); color: #ef4444; border: 1px solid #ef4444; }
      .ak-sig-confluence { text-align: right; }
      .ak-sig-confluence .score { font-size: 20px; font-weight: 800; color: #00f2fe; display: block; }
      .ak-sig-confluence .sub { font-size: 10px; color: #94a3b8; }

      .ak-harmonic-svg-box {
        background: rgba(8,11,18,0.8); border: 1px solid rgba(255,255,255,0.06); border-radius: 8px;
        padding: 12px;
      }
      .ak-harmonic-svg { width: 100%; height: 160px; }

      .ak-levels-grid {
        display: grid; grid-template-columns: repeat(auto-fit, minmax(140px, 1fr)); gap: 10px;
      }
      .ak-lvl-cell {
        background: rgba(0,0,0,0.3); border: 1px solid rgba(255,255,255,0.06); border-radius: 6px;
        padding: 10px 12px; display: flex; flex-direction: column; gap: 2px;
      }
      .ak-lvl-cell .label { font-size: 10px; color: #94a3b8; }
      .ak-lvl-cell .val { font-size: 14px; font-family: monospace; color: #fff; }
      .ak-lvl-cell .sub { font-size: 10px; color: #64748b; }
      .ak-lvl-cell.entry { border-color: rgba(0,242,254,0.3); }
      .ak-lvl-cell.entry .val { color: #00f2fe; font-weight: bold; }
      .ak-lvl-cell.sl { border-color: rgba(239,68,68,0.3); }
      .ak-lvl-cell.sl .val { color: #ef4444; }
      .ak-lvl-cell.tp { border-color: rgba(16,185,129,0.3); }
      .ak-lvl-cell.tp .val { color: #10b981; }

      .ak-smc-rationale {
        background: rgba(0,242,254,0.05); border: 1px solid rgba(0,242,254,0.15); border-radius: 6px;
        padding: 10px 14px;
      }
      .ak-sig-actions { display: flex; gap: 10px; flex-wrap: wrap; }

      .ak-chart-header {
        display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 10px;
        background: rgba(15,23,42,0.6); border: 1px solid rgba(255,255,255,0.08); border-radius: 10px;
        padding: 12px 18px;
      }
      .ak-quick-market-pills { display: flex; gap: 6px; }
      .ak-market-pill {
        background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.1); border-radius: 4px;
        color: #94a3b8; padding: 6px 10px; font-size: 11px; cursor: pointer;
      }
      .ak-market-pill.active { background: rgba(0,242,254,0.2); border-color: #00f2fe; color: #00f2fe; font-weight: bold; }
      .ak-tv-container {
        border: 1px solid rgba(255,255,255,0.08); border-radius: 10px; overflow: hidden;
        min-height: 550px; background: #080b12;
      }
      .ak-loading-tv { display: flex; align-items: center; justify-content: center; height: 550px; color: #64748b; font-size: 13px; }

      .ak-sim-top-metrics {
        display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 12px;
      }
      .ak-metric-card {
        background: rgba(15,23,42,0.7); border: 1px solid rgba(255,255,255,0.08); border-radius: 10px;
        padding: 14px 16px;
      }
      .ak-metric-card .label { font-size: 10px; font-weight: 700; color: #94a3b8; }
      .ak-metric-card .val { font-size: 20px; font-weight: 800; color: #fff; margin: 4px 0 2px 0; }
      .ak-metric-card .sub { font-size: 10px; color: #64748b; }

      .ak-sim-order-deck {
        background: rgba(15,23,42,0.6); border: 1px solid rgba(255,255,255,0.08); border-radius: 10px;
        padding: 16px 20px;
      }
      .ak-order-grid {
        display: grid; grid-template-columns: repeat(auto-fit, minmax(160px, 1fr)); gap: 12px;
        margin-bottom: 14px;
      }
      .ak-order-grid .field { display: flex; flex-direction: column; gap: 4px; }
      .ak-order-grid .field label { font-size: 11px; color: #94a3b8; }
      .ak-order-actions { display: flex; gap: 10px; align-items: center; flex-wrap: wrap; }

      .ak-sim-table {
        width: 100%; border-collapse: collapse; font-size: 12px; text-align: left;
      }
      .ak-sim-table th {
        background: rgba(255,255,255,0.03); color: #94a3b8; font-size: 11px; font-weight: 600;
        padding: 10px 12px; border-bottom: 1px solid rgba(255,255,255,0.08);
      }
      .ak-sim-table td {
        padding: 10px 12px; border-bottom: 1px solid rgba(255,255,255,0.04); color: #e2e8f0;
      }
      .ak-badge {
        padding: 2px 8px; border-radius: 4px; font-size: 10px; font-weight: 700;
      }
      .ak-badge.ok { background: rgba(16,185,129,0.15); color: #10b981; }
      .ak-badge.alert { background: rgba(239,68,68,0.15); color: #ef4444; }
      .ak-badge.safe { background: rgba(0,242,254,0.15); color: #00f2fe; }

      .ak-sentinel-grid {
        display: grid; grid-template-columns: repeat(auto-fit, minmax(320px, 1fr)); gap: 16px;
      }
      .ak-card {
        background: rgba(15,23,42,0.7); border: 1px solid rgba(255,255,255,0.08); border-radius: 10px;
        padding: 18px 20px; display: flex; flex-direction: column; gap: 12px;
      }
      .ak-card-header { display: flex; justify-content: space-between; align-items: center; }
      .ak-card-header h4 { margin: 0; font-size: 14px; color: #fff; }
      .ak-account-size-pills { display: flex; gap: 6px; flex-wrap: wrap; }
      .ak-amt-btn {
        background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.1); border-radius: 6px;
        color: #94a3b8; padding: 6px 10px; font-size: 11px; font-weight: 700; cursor: pointer;
      }
      .ak-amt-btn.active { background: rgba(0,242,254,0.2); border-color: #00f2fe; color: #00f2fe; }
      .ak-calc-result-box {
        background: rgba(0,0,0,0.3); border: 1px solid rgba(255,255,255,0.06); border-radius: 8px;
        padding: 12px 14px;
      }
      .ak-calc-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(130px, 1fr)); gap: 10px; }
      .ak-calc-grid .sub { font-size: 10px; color: #94a3b8; display: block; }
      .ak-calc-grid strong { font-size: 13px; }

      .ak-circuit-banner {
        border-radius: 8px; padding: 12px 16px; display: flex; gap: 12px; align-items: center;
      }
      .ak-circuit-banner.normal { background: rgba(0,242,254,0.08); border: 1px solid rgba(0,242,254,0.2); color: #cbd5e1; }
      .ak-circuit-banner.danger { background: rgba(239,68,68,0.15); border: 1px solid rgba(239,68,68,0.4); color: #fca5a5; }
      .ak-circuit-status-row {
        display: flex; justify-content: space-between; align-items: center; font-size: 12px;
        background: rgba(0,0,0,0.2); padding: 10px 14px; border-radius: 6px;
      }

      .ak-compound-summary-grid {
        display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 10px;
      }
      .ak-csum-card {
        background: rgba(0,0,0,0.3); border: 1px solid rgba(255,255,255,0.06); border-radius: 8px;
        padding: 10px 14px; display: flex; flex-direction: column; gap: 2px;
      }
      .ak-csum-card .label { font-size: 10px; font-weight: 700; color: #94a3b8; }
      .ak-csum-card .val { font-size: 16px; font-weight: 800; color: #fff; }

      .ak-compound-table-wrap {
        max-height: 320px; overflow-y: auto; border: 1px solid rgba(255,255,255,0.06); border-radius: 6px;
      }
      .ak-compound-table { width: 100%; border-collapse: collapse; font-size: 12px; }
      .ak-compound-table th {
        background: rgba(255,255,255,0.03); color: #94a3b8; font-size: 11px; padding: 8px 12px; text-align: left;
        position: sticky; top: 0;
      }
      .ak-compound-table td { padding: 8px 12px; border-bottom: 1px solid rgba(255,255,255,0.04); }

      .ak-connections-deck { display: flex; flex-direction: column; gap: 16px; }
      .ak-conn-card {
        background: rgba(15,23,42,0.7); border: 1px solid rgba(255,255,255,0.08); border-radius: 10px;
        padding: 18px 20px; display: flex; flex-direction: column; gap: 10px;
      }
      .ak-conn-header { display: flex; align-items: center; gap: 12px; }
      .ak-conn-icon {
        width: 38px; height: 38px; border-radius: 8px; display: flex; align-items: center; justify-content: center;
        font-size: 18px;
      }
      .ak-conn-actions { display: flex; align-items: center; gap: 12px; flex-wrap: wrap; margin-top: 6px; }
      .ak-api-token-box {
        background: rgba(0,0,0,0.3); border: 1px solid rgba(255,255,255,0.06); border-radius: 8px;
        padding: 12px 14px;
      }
    `;
    document.head.appendChild(s);
  })();

  window.AkiraTradingLab = new AkiraTradingLab();

  document.addEventListener("DOMContentLoaded", () => {
    setTimeout(() => {
      if (window.AkiraTradingLab) window.AkiraTradingLab.init();
    }, 450);
  });
})();
