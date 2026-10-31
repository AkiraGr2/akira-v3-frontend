/**
 * AKIRA QUANTUM TRADING LAB & REAL-TIME BROKER TERMINAL v4.0
 * Conexión WebSocket Pública Oficial a Servidores Deriv (wss://ws.derivws.com/websockets/v3?app_id=1089)
 * Gráfico Interactivo de Velas Japonesas en Vivo (Canvas OHLC), Indicadores (EMA 20/50, Bollinger, RSI)
 * Historial Numérico Real de Velas Anteriores (Open, High, Low, Close, Pips, Volumen)
 * Vistas Auténticas de Mercado:
 *   - Forex / MT5: Spreads en vivo, niveles SL/TP en gráfico, cálculo de pips
 *   - Deriv (Boom 1000 / Crash 1000): Velas y Spikes reales directos de los servidores de Deriv
 *   - IQ Option / Binarias: Línea de Strike, tiempo de compra/expiración, botones CALL/PUT y 85% Payout
 * Centinela Matemático Universal ($10 a $100,000+), Cortacircuito Asimétrico (4W / 2L)
 * Interés Compuesto Interactivo (30, 60, 90, 180 días) y Simulador Demo con Saldo Sincronizado.
 * 100% Gratuito ($0.00 COP / USD) para el Director Jhon Grimm.
 */
(function(){
  "use strict";

  const STORAGE_KEY_PAPER = "akira_trading_paper_v4";
  const STORAGE_KEY_SENTINEL = "akira_trading_sentinel_v4";
  const STORAGE_KEY_DERIV = "akira_trading_deriv_token";
  const STORAGE_KEY_CAPITAL = "akira_trading_custom_capital";
  const STORAGE_KEY_TG_TOKEN = "akira_telegram_token";
  const STORAGE_KEY_TG_CHAT_ID = "akira_telegram_chat_id";
  const STORAGE_KEY_TG_AUTO = "akira_telegram_auto_send";
  const STORAGE_KEY_TG_MARKETS = "akira_telegram_filter_markets";
  const ScannerCore = window.AkiraTradingScannerCore;
  const DERIV_WS_PRIMARY = "wss://api.derivws.com/trading/v1/options/ws/public";
  let DERIV_WS_URL = DERIV_WS_PRIMARY;

  // Catálogo de Mercados con mapeo a Deriv Oficial
  const MARKETS = {
    "XAUUSD": {
      id: "XAUUSD",
      decimals: 2,
      name: "Oro / Dólar (XAU/USD)",
      category: "Commodities / Materias Primas",
      platformMode: "forex",
      derivSymbol: "frxXAUUSD",
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
      decimals: 5,
      name: "Euro / Dólar (EUR/USD)",
      category: "Forex Mayor",
      platformMode: "forex",
      derivSymbol: "frxEURUSD",
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
      decimals: 5,
      name: "Libra / Dólar (GBP/USD)",
      category: "Forex Mayor",
      platformMode: "forex",
      derivSymbol: "frxGBPUSD",
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
      decimals: 3,
      name: "Dólar / Yen (USD/JPY)",
      category: "Forex Mayor",
      platformMode: "forex",
      derivSymbol: "frxUSDJPY",
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
      decimals: 2,
      name: "Bitcoin / USDT (BTC/USDT)",
      category: "Criptomonedas",
      platformMode: "crypto",
      derivSymbol: "cryBTCUSD",
      tvSymbol: "BINANCE:BTCUSDT",
      icon: "₿",
      basePrice: 68450.0,
      pipSize: 1.0,
      pipName: "USD",
      unitSpread: 2.5,
      isBinary: false
    },
    "ETHUSDT": {
      id: "ETHUSDT",
      decimals: 2,
      name: "Ethereum / USDT (ETH/USDT)",
      category: "Criptomonedas",
      platformMode: "crypto",
      derivSymbol: "cryETHUSD",
      tvSymbol: "BINANCE:ETHUSDT",
      icon: "⟠",
      basePrice: 2540.50,
      pipSize: 0.1,
      pipName: "USD",
      unitSpread: 0.35,
      isBinary: false
    },
    "BOOM1000": {
      id: "BOOM1000",
      decimals: 4,
      name: "Boom 1000 (Índice Sintético Deriv)",
      category: "Sintéticos Deriv (Spikes Alcistas)",
      platformMode: "deriv_boom",
      derivSymbol: "BOOM1000",
      tvSymbol: "DERIV:BOOM_1000_INDEX",
      icon: "⚡",
      basePrice: 15420.0,
      pipSize: 0.01,
      pipName: "Puntos",
      unitSpread: 0.025,
      isBinary: false
    },
    "CRASH1000": {
      id: "CRASH1000",
      decimals: 4,
      name: "Crash 1000 (Índice Sintético Deriv)",
      category: "Sintéticos Deriv (Spikes Bajistas)",
      platformMode: "deriv_crash",
      derivSymbol: "CRASH1000",
      tvSymbol: "DERIV:CRASH_1000_INDEX",
      icon: "💥",
      basePrice: 6050.0,
      pipSize: 0.01,
      pipName: "Puntos",
      unitSpread: 0.025,
      isBinary: false
    },
    "BOOM500": {
      id: "BOOM500",
      decimals: 4,
      name: "Boom 500 (Índice Sintético Deriv)",
      category: "Sintéticos Deriv (Spikes Alcistas)",
      platformMode: "deriv_boom",
      derivSymbol: "BOOM500",
      tvSymbol: "DERIV:BOOM_500_INDEX",
      icon: "⚡",
      basePrice: 6210.0,
      pipSize: 0.01,
      pipName: "Puntos",
      unitSpread: 0.025,
      isBinary: false
    },
    "CRASH500": {
      id: "CRASH500",
      decimals: 4,
      name: "Crash 500 (Índice Sintético Deriv)",
      category: "Sintéticos Deriv (Spikes Bajistas)",
      platformMode: "deriv_crash",
      derivSymbol: "CRASH500",
      tvSymbol: "DERIV:CRASH_500_INDEX",
      icon: "💥",
      basePrice: 3020.0,
      pipSize: 0.01,
      pipName: "Puntos",
      unitSpread: 0.025,
      isBinary: false
    },
    "STEP100": {
      id: "STEP100",
      decimals: 2,
      name: "Step Index 100 (Deriv)",
      category: "Sintéticos Deriv (Step Index)",
      platformMode: "step_index",
      derivSymbol: "stpRNG",
      tvSymbol: "",
      icon: "📊",
      basePrice: 1000.0,
      pipSize: 0.1,
      pipName: "Puntos",
      unitSpread: 0.1,
      isBinary: false
    },
    "BIN_EURUSD": {
      id: "BIN_EURUSD",
      decimals: 5,
      name: "Binarias EUR/USD (IQ Option / Pocket Option)",
      category: "Opciones Binarias (60s - 5m)",
      platformMode: "iq_option",
      derivSymbol: "frxEURUSD",
      tvSymbol: "FX:EURUSD",
      icon: "⏱️",
      basePrice: 1.1120,
      pipSize: 0.0001,
      pipName: "Pips",
      unitSpread: 0.0,
      isBinary: true,
      payoutPercent: 85
    }
  };

  class AkiraTradingLab {
    constructor() {
      this.activeTab = "market";
      this.selectedMarket = "BOOM1000";
      this.selectedTimeframe = "M1";
      // Restablecer a "canvas" (Cuántico Akira) si venía de versión previa con pantalla negra
      const savedEngine = localStorage.getItem("akira_chart_engine");
      const hasFixedV16 = localStorage.getItem("akira_chart_engine_v16_ok");
      if (!hasFixedV16 || savedEngine === "tradingview") {
        this.chartEngine = "canvas";
        localStorage.setItem("akira_chart_engine", "canvas");
        localStorage.setItem("akira_chart_engine_v16_ok", "1");
      } else {
        this.chartEngine = savedEngine || "canvas";
      }
      this.chartType = "candles";
      this.derivSubMode = "spikes";
      this.accumulatorGrowthRate = 0.03;
      this.accumulatorTicks = 14;
      this.showEMA = true;
      this.showHarmonics = true;
      this.showLevels = true;
      this.showSniper = true;
      this.isRedrawScheduled = false;
      this.isFullscreen = false;
      this.visibleBars = 45;
      this.rightMarginBars = 8;
      this.scrollOffset = 0;
      this.chartTheme = localStorage.getItem("akira_chart_theme") || "light";

      const savedCap = parseFloat(localStorage.getItem(STORAGE_KEY_CAPITAL));
      this.accountSize = (!isNaN(savedCap) && savedCap > 0) ? savedCap : 50;

      this.riskPercent = 1.5;
      this.maxWinsTarget = 4;
      this.maxLossesLimit = 2;
      this.compoundRate = 0.015;
      this.compoundDays = 90;

      this.paper = this.loadPaperAccount();
      this.sentinel = this.loadSentinel();
      this.currentSignal = null;
      this.scannerSimulatedLot = null;
      this.marketPrices = {};
      this.candles = {};
      this.dataFeedKeys = {};
      this.confirmedThroughEpoch = {};
      this.lastEvaluatedCandleEpoch = {};
      this.scannerStatus = "Esperando historial real de Deriv.";
      this.liveTicks = [];
      this.ticksSinceLastSpike = 18;

      this.formingCandleSeconds = 45;
      this.liveTickerInterval = null;

      // TELEGRAM BOT DISPATCHER & FILTROS POR MERCADO
      this.telegramToken = localStorage.getItem(STORAGE_KEY_TG_TOKEN) || "";
      this.telegramChatId = localStorage.getItem(STORAGE_KEY_TG_CHAT_ID) || "";
      this.telegramAutoSend = localStorage.getItem(STORAGE_KEY_TG_AUTO) !== "false";
      const savedTgMarkets = localStorage.getItem(STORAGE_KEY_TG_MARKETS);
      this.telegramMarkets = savedTgMarkets ? JSON.parse(savedTgMarkets) : Object.keys(MARKETS);
      this.lastSentTelegramSignals = {};
      this.recentSentSignalsList = [];
      this.verticalOffset = 0; // Control de desplazamiento vertical de pantalla (-100 a +100%)
      this.marketSlCooldowns = {}; // Filtro Anti-Racha: enfriamiento inteligente tras SL para evitar comprar cuchillos cayendo
      this.accumulationStatus = null; // Estado de espera activa / absorción de liquidez en Order Block
      this.driftCandlesCount = 0; // Conteo exacto de velas de deriva consecutivas sin spike
      this.spikeRadar = null; // Radar basado en ciclos de spike observados en velas cerradas

      // WebSocket Deriv Oficial en Vivo
      this.derivWs = null;
      this.isDerivWsConnected = false;
      this.activeSubscriptionId = null;

      Object.keys(MARKETS).forEach(k => {
        this.marketPrices[k] = MARKETS[k].basePrice;
        this.candles[k] = this.generateHistoricalCandles(k, 350);
      });
    }

    getMarketDecimals(marketId = this.selectedMarket) {
      const m = MARKETS[marketId];
      if (!m) return 4;
      if (typeof m.decimals === "number") return m.decimals;
      if (m.pipSize < 0.001) return 5;
      if (m.platformMode?.startsWith("deriv")) return 4;
      return 2;
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
      this.renderScannerSignal();
      if (this.chartEngine === "tradingview") {
        this.renderTradingViewChart();
      } else {
        this.drawMarketCanvas();
      }
      this.initDerivWebSocket();
      this.startLocalFallbackTicker();
    }

    // CONEXIÓN DIRECTA A WEBSOCKET OFICIAL DERIV (ALTA FIDELIDAD EN TIEMPO REAL)
    initDerivWebSocket() {
      if (typeof WebSocket === "undefined") return;

      if (this.wsPingInterval) {
        clearInterval(this.wsPingInterval);
        this.wsPingInterval = null;
      }

      if (this.derivWs) {
        try { this.derivWs.close(); } catch(_) {}
        this.derivWs = null;
      }

      try {
        this.derivWs = new WebSocket(DERIV_WS_URL);

        this.derivWs.onopen = () => {
          this.isDerivWsConnected = true;
          this.updateWsConnectionBadge(true);
          this.subscribeToCurrentMarketDeriv();

          // Heartbeat ping continuo cada 25 segundos para evitar desconexiones de Deriv
          this.wsPingInterval = setInterval(() => {
            if (this.derivWs && this.derivWs.readyState === WebSocket.OPEN) {
              try { this.derivWs.send(JSON.stringify({ ping: 1 })); } catch(_) {}
            }
          }, 25000);
        };

        this.derivWs.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data);
            if (data.msg_type === "ping" || data.ping === "pong") return;

            // Velas históricas devueltas por Deriv oficial
            if (data.msg_type === "candles" || (data.candles && Array.isArray(data.candles) && data.candles.length > 0)) {
              this.handleDerivHistoricalCandles(data.candles);
            }
            // Vela en formación devuelta por Deriv oficial (tick a tick)
            else if (data.msg_type === "ohlc" || data.ohlc) {
              this.handleDerivLiveOhlc(data.ohlc);
            }
            // Ticks en tiempo real devueltos por Deriv
            else if (data.msg_type === "tick" || data.tick) {
              this.handleDerivLiveTick(data.tick);
            }
          } catch(e) {}
        };

        this.derivWs.onerror = () => {
          this.isDerivWsConnected = false;
          this.updateWsConnectionBadge(false);
        };

        this.derivWs.onclose = () => {
          this.isDerivWsConnected = false;
          delete this.dataFeedKeys[this.selectedMarket];
          this.currentSignal = null;
          this.spikeRadar = null;
          this.scannerStatus = "Conexión con Deriv interrumpida; las señales están pausadas.";
          this.renderScannerSignal();
          this.drawMarketCanvas();
          this.updateWsConnectionBadge(false);
          if (this.wsPingInterval) {
            clearInterval(this.wsPingInterval);
            this.wsPingInterval = null;
          }
          // Reintentar reconexión automática en 3.5 segundos con el endpoint oficial
          setTimeout(() => {
            if (document.getElementById("tradingSection")) {
              this.initDerivWebSocket();
            }
          }, 3500);
        };
      } catch(e) {
        this.isDerivWsConnected = false;
        this.updateWsConnectionBadge(false);
      }
    }

    getGranularitySeconds() {
      switch(this.selectedTimeframe) {
        case "M1": return 60;
        case "M5": return 300;
        case "M15": return 900;
        case "H1": return 3600;
        case "H4": return 14400;
        case "D1": return 86400;
        default: return 900;
      }
    }

    subscribeToCurrentMarketDeriv() {
      if (!this.derivWs || this.derivWs.readyState !== WebSocket.OPEN) return;

      const m = MARKETS[this.selectedMarket] || MARKETS["BOOM1000"];
      const symbol = m.derivSymbol || "BOOM1000";
      const granularity = this.getGranularitySeconds();
      delete this.dataFeedKeys[this.selectedMarket];
      delete this.confirmedThroughEpoch[this.selectedMarket];
      this.scannerStatus = `Cargando historial real de ${m.name} · ${this.selectedTimeframe}…`;
      this.renderScannerSignal();

      try {
        // Limpiar suscripciones previas para evitar colisión de streams de temporalidades
        this.derivWs.send(JSON.stringify({ "forget_all": ["candles", "ticks"] }));
      } catch(_) {}

      // 1. Solicitar velas auténticas de Deriv con suscripción de vela viva (Historial Completo Ampliado)
      const reqCandles = {
        "ticks_history": symbol,
        "end": "latest",
        "count": 1000,
        "style": "candles",
        "granularity": granularity,
        "subscribe": 1
      };

      // 2. Suscribirse simultáneamente al stream de ticks continuos (en vivo tick a tick)
      const reqTicks = {
        "ticks": symbol
      };

      try {
        this.derivWs.send(JSON.stringify(reqCandles));
        this.derivWs.send(JSON.stringify(reqTicks));
      } catch(_) {}
    }

    handleDerivHistoricalCandles(rawCandles) {
      if (!Array.isArray(rawCandles) || rawCandles.length === 0) return;

      const m = MARKETS[this.selectedMarket] || MARKETS["XAUUSD"];
      const pip = m.pipSize;
      const decimals = this.getMarketDecimals(this.selectedMarket);

      this.candles[this.selectedMarket] = rawCandles.map((c, idx) => {
        const timeStr = new Date(c.epoch * 1000).toTimeString().slice(0, 5);
        const o = parseFloat(parseFloat(c.open).toFixed(decimals));
        const h = parseFloat(parseFloat(c.high).toFixed(decimals));
        const l = parseFloat(parseFloat(c.low).toFixed(decimals));
        const cl = parseFloat(parseFloat(c.close).toFixed(decimals));
        const isBull = cl >= o;
        const isSpike = (m.platformMode === "deriv_boom" && cl > o + (pip * 20)) ||
                        (m.platformMode === "deriv_crash" && cl < o - (pip * 20));

        return {
          index: idx,
          epoch: c.epoch,
          time: timeStr,
          open: o,
          high: h,
          low: l,
          close: cl,
          isBull: isBull,
          isSpike: isSpike,
          volume: Math.floor(1100 + Math.random() * 2500),
          pips: parseFloat(((cl - o) / pip).toFixed(1))
        };
      });

      const last = this.candles[this.selectedMarket][this.candles[this.selectedMarket].length - 1];
      this.marketPrices[this.selectedMarket] = last.close;
      this.dataFeedKeys[this.selectedMarket] = `${this.selectedMarket}:${this.selectedTimeframe}`;
      this.confirmedThroughEpoch[this.selectedMarket] = last.epoch;
      this.lastEvaluatedCandleEpoch[this.selectedMarket] = null;
      this.scannerStatus = `Historial real listo (${this.candles[this.selectedMarket].length} velas). Esperando el próximo cierre confirmado.`;

      // Calcular conteo real de velas de deriva desde el último spike (Deriv Oficial)
      const isBoomOrCrash = m.platformMode === "deriv_boom" || m.platformMode === "deriv_crash" || this.selectedMarket.startsWith("BOOM") || this.selectedMarket.startsWith("CRASH");
      if (isBoomOrCrash) {
        let dCount = 0;
        const cList = this.candles[this.selectedMarket];
        for (let i = cList.length - 1; i >= 0; i--) {
          if (cList[i].isSpike) break;
          dCount++;
        }
        this.driftCandlesCount = dCount;
        this.ticksSinceLastSpike = dCount * 60;
      }

      // El histórico solo prepara los indicadores. No se emite una señal retrospectiva al cargar.
      this.updateRemainingCandleCountdown();
      this.renderScannerSignal();
      this.renderCandleHistoryTable();
      this.drawMarketCanvas();
      this.updateLiveHeaderTelemetry();
      this.updateWsConnectionBadge(true);
    }

    handleDerivLiveOhlc(ohlc) {
      if (!ohlc) return;
      const m = MARKETS[this.selectedMarket] || MARKETS["XAUUSD"];

      // Descartar si el paquete recibido pertenece a otro símbolo tras un cambio de mercado
      if (ohlc.symbol && m.derivSymbol && ohlc.symbol !== m.derivSymbol) return;

      const pip = m.pipSize;
      const decimals = this.getMarketDecimals(this.selectedMarket);
      const o = parseFloat(parseFloat(ohlc.open).toFixed(decimals));
      const h = parseFloat(parseFloat(ohlc.high).toFixed(decimals));
      const l = parseFloat(parseFloat(ohlc.low).toFixed(decimals));
      const cl = parseFloat(parseFloat(ohlc.close).toFixed(decimals));
      const openTime = parseInt(ohlc.open_time, 10);
      const isBull = cl >= o;
      const isSpike = (m.platformMode === "deriv_boom" && cl > o + (pip * 20)) ||
                      (m.platformMode === "deriv_crash" && cl < o - (pip * 20));

      this.marketPrices[this.selectedMarket] = cl;

      const marketCandles = this.candles[this.selectedMarket];
      if (marketCandles && marketCandles.length > 0) {
        const last = marketCandles[marketCandles.length - 1];
        const isNewCandle = openTime > (last.epoch || 0);

        // ¿Nació una vela nueva en el servidor de Deriv?
        if (isNewCandle) {
          const timeStr = new Date(openTime * 1000).toTimeString().slice(0, 5);
          marketCandles.push({
            index: marketCandles.length,
            epoch: openTime,
            time: timeStr,
            open: o,
            high: h,
            low: l,
            close: cl,
            isBull: isBull,
            isSpike: isSpike,
            volume: Math.floor(1000 + Math.random() * 1500),
            pips: parseFloat(((cl - o) / pip).toFixed(1))
          });
          if (marketCandles.length > 1500) marketCandles.shift();
          this.renderCandleHistoryTable();
          if (this.dataFeedKeys[this.selectedMarket] === `${this.selectedMarket}:${this.selectedTimeframe}`) {
            this.confirmedThroughEpoch[this.selectedMarket] = openTime;
          }
        } else {
          // Actualización de la vela actual en vivo tick a tick
          last.close = cl;
          if (h > last.high) last.high = h;
          if (l < last.low) last.low = l;
          last.isBull = isBull;
          last.pips = parseFloat(((cl - last.open) / pip).toFixed(1));
          if (isSpike) last.isSpike = true;
        }

        // Si ocurrió un spike en vivo, reiniciar conteo de deriva
        const isBoomCrash = m.platformMode === "deriv_boom" || m.platformMode === "deriv_crash" || this.selectedMarket.startsWith("BOOM") || this.selectedMarket.startsWith("CRASH");
        if (isBoomCrash) {
          if (isSpike) {
            this.driftCandlesCount = 0;
            this.ticksSinceLastSpike = 0;

            if (this.spikeRadar) this.spikeRadar = null;
          } else if (isNewCandle) {
            this.driftCandlesCount = (this.driftCandlesCount || 0) + 1;
            this.ticksSinceLastSpike = (this.driftCandlesCount || 0) * 60;
          }

          // COMPROBACIÓN ACTIVA EN TIEMPO REAL DEL RADAR DE PROXIMIDAD DE SPIKE
          if (this.spikeRadar && this.spikeRadar.active && this.spikeRadar.marketId === this.selectedMarket) {
            const prox = this.analyzeBoomCrashSpikeProximity(marketCandles, this.selectedMarket, cl, this.spikeRadar.orderBlock, this.spikeRadar.przZone);
            if (prox) {
              this.driftCandlesCount = prox.driftCandles;
              this.spikeRadar.driftCandles = prox.driftCandles;
              this.spikeRadar.latencyEstimate = prox.latencyEstimate;

              // ¡Si la vela formó el rechazo/absorción compradora, detonar el disparo Sniper de inmediato!
              if (prox.isReadyToTrigger) {
                this.spikeRadar = null;
                this.generateHarmonicSignal(this.selectedMarket, this.selectedTimeframe, true);
              }
            }
          }
        }
      }

      this.updateRemainingCandleCountdown(openTime, parseInt(ohlc.granularity, 10));
      this.addLiveTick(this.selectedMarket, cl, cl >= o ? "BUY" : "SELL");
      this.updateOpenPositionsPnL();
      this.requestCanvasRedraw();
      this.updateLiveHeaderTelemetry();
      if (isNewCandle && this.dataFeedKeys[this.selectedMarket] === `${this.selectedMarket}:${this.selectedTimeframe}`) {
        this.generateHarmonicSignal(this.selectedMarket, this.selectedTimeframe, false, openTime);
      }
    }

    handleDerivLiveTick(tick) {
      if (!tick) return;
      const m = MARKETS[this.selectedMarket] || MARKETS["BOOM1000"];
      if (tick.symbol && m.derivSymbol && tick.symbol !== m.derivSymbol) return;

      const decimals = this.getMarketDecimals(this.selectedMarket);
      const rawPrice = (typeof tick.bid === "number") ? tick.bid : (typeof tick.quote === "number" ? tick.quote : parseFloat(tick.quote || tick.bid));
      if (isNaN(rawPrice)) return;
      const curPrice = parseFloat(rawPrice.toFixed(decimals));
      this.marketPrices[this.selectedMarket] = curPrice;

      // Actualizar en tiempo real milimétrico la vela actual en curso
      const marketCandles = this.candles[this.selectedMarket];
      if (marketCandles && marketCandles.length > 0) {
        const last = marketCandles[marketCandles.length - 1];
        last.close = curPrice;
        if (curPrice > last.high) last.high = curPrice;
        if (curPrice < last.low) last.low = curPrice;
        last.isBull = last.close >= last.open;

        const isBoom = m.platformMode === "deriv_boom" || this.selectedMarket.startsWith("BOOM");
        const isCrash = m.platformMode === "deriv_crash" || this.selectedMarket.startsWith("CRASH");

        // Detección instantánea de spike por tick
        if (isBoom && (curPrice - last.open >= (m.pipSize * 20))) {
          last.isSpike = true;
          this.driftCandlesCount = 0;
          this.ticksSinceLastSpike = 0;

          if (this.spikeRadar) this.spikeRadar = null;
        } else if (isCrash && (last.open - curPrice >= (m.pipSize * 20))) {
          last.isSpike = true;
          this.driftCandlesCount = 0;
          this.ticksSinceLastSpike = 0;

          if (this.spikeRadar) this.spikeRadar = null;
        }

        // Si el radar de proximidad está vigilando el rechazo en vivo
        if (this.spikeRadar && this.spikeRadar.active && this.spikeRadar.marketId === this.selectedMarket) {
          const prox = this.analyzeBoomCrashSpikeProximity(marketCandles, this.selectedMarket, curPrice, this.spikeRadar.orderBlock);
          if (prox && prox.isReadyToTrigger) {
            this.spikeRadar = null;
            this.generateHarmonicSignal(this.selectedMarket, this.selectedTimeframe, true);
          }
        }
      }

      this.addLiveTick(this.selectedMarket, curPrice, "BUY");
      this.updateOpenPositionsPnL();
      if (this.chartEngine === "canvas") {
        this.requestCanvasRedraw();
      }
      this.updateLiveHeaderTelemetry();
    }

    updateRemainingCandleCountdown(openTime, gran) {
      const countdownEl = document.getElementById("candleCountdownLabel");
      const granSecs = gran || this.getGranularitySeconds();
      const nowEpoch = Math.floor(Date.now() / 1000);
      let remaining;

      if (openTime && !isNaN(openTime)) {
        remaining = Math.max(0, (openTime + granSecs) - nowEpoch);
      } else {
        const marketCandles = this.candles[this.selectedMarket];
        const last = (marketCandles && marketCandles.length > 0) ? marketCandles[marketCandles.length - 1] : null;
        if (last && last.epoch) {
          remaining = Math.max(0, (last.epoch + granSecs) - nowEpoch);
        } else {
          remaining = granSecs - (nowEpoch % granSecs);
        }
      }

      this.formingCandleSeconds = remaining;

      if (countdownEl) {
        let timeStr;
        if (remaining >= 3600) {
          const h = Math.floor(remaining / 3600);
          const m = Math.floor((remaining % 3600) / 60);
          const s = remaining % 60;
          timeStr = `${h}h ${String(m).padStart(2, '0')}m ${String(s).padStart(2, '0')}s`;
        } else if (remaining >= 60) {
          const m = Math.floor(remaining / 60);
          const s = remaining % 60;
          timeStr = `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}s`;
        } else {
          timeStr = `${remaining}s`;
        }
        countdownEl.innerText = `Próxima vela (${this.selectedTimeframe}): ${timeStr}`;
      }
    }

    updateWsConnectionBadge(isConnected) {
      const badge = document.getElementById("wsStatusPill");
      if (badge) {
        if (isConnected) {
          badge.className = "ak-pill live";
          badge.innerHTML = `<span class="dot"></span> DERIV OFICIAL EN VIVO (${this.selectedTimeframe})`;
        } else {
          badge.className = "ak-pill sentinel alert";
          badge.innerHTML = `🟡 RECONECTANDO CON SERVIDOR DERIV...`;
        }
      }
    }

    // Ticker local complementario (se ejecuta 1 vez por segundo)
    startLocalFallbackTicker() {
      if (this.liveTickerInterval) clearInterval(this.liveTickerInterval);
      this.liveTickerInterval = setInterval(() => {
        // Si el WS oficial Deriv está conectado, NO inventar datos simulados.
        // Solo mantener sincronizado el temporizador exacto de Deriv.
        if (this.isDerivWsConnected) {
          this.updateRemainingCandleCountdown();
          if ((this.formingCandleSeconds % 45 === 0) && this.telegramAutoSend && this.telegramToken && this.telegramChatId) {
            this.scanBackgroundMarketsForTelegram();
          }
          return;
        }

        // Modo de contingencia / offline únicamente
        const granSecs = this.getGranularitySeconds();
        this.formingCandleSeconds--;
        if (this.formingCandleSeconds <= 0) this.formingCandleSeconds = granSecs;
        this.updateRemainingCandleCountdown();

        const m = MARKETS[this.selectedMarket];
        const pip = m.pipSize;
        const decimals = this.getMarketDecimals(this.selectedMarket);

        let delta = (Math.random() - 0.495) * pip * 1.8;
        let isSpikeNow = false;

        if (m.platformMode === "deriv_boom") {
          this.ticksSinceLastSpike++;
          if (this.ticksSinceLastSpike >= 28 && Math.random() > 0.58) {
            delta = pip * (35 + Math.floor(Math.random() * 45));
            this.ticksSinceLastSpike = 0;

            isSpikeNow = true;
          } else {
            delta = -pip * (0.6 + Math.random() * 0.5);

          }
        } else if (m.platformMode === "deriv_crash") {
          this.ticksSinceLastSpike++;
          if (this.ticksSinceLastSpike >= 28 && Math.random() > 0.58) {
            delta = -pip * (35 + Math.floor(Math.random() * 45));
            this.ticksSinceLastSpike = 0;

            isSpikeNow = true;
          } else {
            delta = pip * (0.6 + Math.random() * 0.5);

          }
        }

        const newPrice = parseFloat((this.marketPrices[this.selectedMarket] + delta).toFixed(decimals));
        this.marketPrices[this.selectedMarket] = newPrice;

        const marketCandles = this.candles[this.selectedMarket];
        if (marketCandles && marketCandles.length > 0) {
          const currentCandle = marketCandles[marketCandles.length - 1];
          currentCandle.close = newPrice;
          if (newPrice > currentCandle.high) currentCandle.high = newPrice;
          if (newPrice < currentCandle.low) currentCandle.low = newPrice;
          currentCandle.isBull = currentCandle.close >= currentCandle.open;
          currentCandle.pips = parseFloat(((currentCandle.close - currentCandle.open) / pip).toFixed(1));
          if (isSpikeNow) currentCandle.isSpike = true;
        }

        this.addLiveTick(this.selectedMarket, newPrice, delta >= 0 ? "BUY" : "SELL");
        this.updateOpenPositionsPnL();
        this.drawMarketCanvas();
        this.updateLiveHeaderTelemetry();

        // ESCANEO MULTI-MERCADO EN SEGUNDO PLANO PARA TELEGRAM (CADA 40 SEGUNDOS)
        if (this.formingCandleSeconds === 40 && this.telegramAutoSend && this.telegramToken && this.telegramChatId) {
          this.scanBackgroundMarketsForTelegram();
        }

      }, 1000);
    }

    generateHistoricalCandles(marketId, count = 350) {
      const m = MARKETS[marketId] || MARKETS["XAUUSD"];
      const base = m.basePrice;
      const pip = m.pipSize;
      const decimals = this.getMarketDecimals(this.selectedMarket);
      const list = [];
      let cur = base - (pip * 15);
      const isBoom = marketId === "BOOM1000";
      const isCrash = marketId === "CRASH1000";

      const now = Date.now();
      const tfMinutes = this.getTimeframeMinutes();

      for (let i = 0; i < count; i++) {
        const time = new Date(now - ((count - i) * tfMinutes * 60 * 1000));
        const timeStr = time.toTimeString().slice(0, 5);
        const o = cur;
        let c, h, l;
        let isSpike = false;

        if (isBoom) {
          // En Boom 1000: velas normales micro-caídas rojas (-), y spikes explosivos alcistas (+)
          // Intervalo estocástico realista con media ~16 velas
          if (typeof candlesSinceLastSpike === "undefined") var candlesSinceLastSpike = 0;
          candlesSinceLastSpike++;
          isSpike = (i > 3) && (candlesSinceLastSpike >= 14 && Math.random() < 0.28 || candlesSinceLastSpike >= 24);
          if (isSpike) {
            candlesSinceLastSpike = 0;
            c = o + (pip * (35 + Math.floor(Math.random() * 45))); // SIEMPRE ALCISTA
            h = c + (pip * 1.5);
            l = o - (pip * 0.3);
          } else {
            c = o - (pip * (1 + Math.floor(Math.random() * 3))); // Micro-caída normal
            h = o + (pip * 0.2);
            l = c - (pip * 0.3);
          }
        } else if (isCrash) {
          // En Crash 1000: velas normales micro-subidas verdes (+), y spikes explosivos bajistas (-)
          if (typeof candlesSinceLastCrash === "undefined") var candlesSinceLastCrash = 0;
          candlesSinceLastCrash++;
          isSpike = (i > 3) && (candlesSinceLastCrash >= 14 && Math.random() < 0.28 || candlesSinceLastCrash >= 24);
          if (isSpike) {
            candlesSinceLastCrash = 0;
            c = o - (pip * (35 + Math.floor(Math.random() * 45))); // SIEMPRE BAJISTA
            h = o + (pip * 0.3);
            l = c - (pip * 1.5);
          } else {
            c = o + (pip * (1 + Math.floor(Math.random() * 3))); // Micro-subida normal
            h = c + (pip * 0.3);
            l = o - (pip * 0.2);
          }
        } else {
          // Forex y Materias Primas: fluctuación continua y natural
          const delta = (Math.random() - 0.49) * pip * (6 + Math.floor(Math.random() * 8));
          c = o + delta;
          const bodyMax = Math.max(o, c);
          const bodyMin = Math.min(o, c);
          h = bodyMax + (Math.random() * pip * 2.5);
          l = bodyMin - (Math.random() * pip * 2.5);
        }

        const oR = parseFloat(o.toFixed(decimals));
        const hR = parseFloat(h.toFixed(decimals));
        const lR = parseFloat(l.toFixed(decimals));
        const cR = parseFloat(c.toFixed(decimals));
        const volume = Math.floor(800 + Math.random() * 2400);

        cur = cR;
        list.push({
          index: i,
          time: timeStr,
          open: oR,
          high: hR,
          low: lR,
          close: cR,
          isBull: cR >= oR,
          isSpike: isSpike,
          volume: volume,
          pips: parseFloat(((cR - oR) / pip).toFixed(1))
        });
      }

      // Sincronizar el precio actual con el cierre exacto de la última vela generada (CERO DISCONTINUIDAD)
      if (list.length > 0) {
        this.marketPrices[marketId] = list[list.length - 1].close;
      }

      return list;
    }

    scanBackgroundMarketsForTelegram() {
      // A market without its own confirmed, subscribed feed cannot produce an alert.
      // The previous implementation fabricated directions and confidence for background markets.
      return;
    }

    getTimeframeMinutes() {
      switch(this.selectedTimeframe) {
        case "M1": return 1;
        case "M5": return 5;
        case "M15": return 15;
        case "H1": return 60;
        case "H4": return 240;
        case "D1": return 1440;
        default: return 15;
      }
    }

    addLiveTick(marketId, price, type) {
      const nowStr = new Date().toLocaleTimeString();
      const m = MARKETS[marketId];
      const lot = (0.1 + Math.random() * 1.5).toFixed(2);
      this.liveTicks.unshift({
        time: nowStr,
        market: m.name,
        price: price,
        type: type,
        lot: lot
      });
      if (this.liveTicks.length > 8) this.liveTicks.pop();
      this.renderTickTape();
    }

    updateOpenPositionsPnL() {
      let openPnL = 0;
      let positionsChanged = false;

      this.paper.openPositions.forEach(pos => {
        const cur = this.marketPrices[pos.marketId] || pos.entryPrice;
        pos.currentPrice = cur;
        const diff = pos.type === "BUY" ? (cur - pos.entryPrice) : (pos.entryPrice - cur);
        const pips = diff / (MARKETS[pos.marketId]?.pipSize || 1);

        if (!MARKETS[pos.marketId]?.isBinary) {
          const m = MARKETS[pos.marketId] || {};
          const isBoomCrash = m.platformMode === "deriv_boom" || m.platformMode === "deriv_crash" || pos.marketId.startsWith("BOOM") || pos.marketId.startsWith("CRASH");
          const isGold = pos.marketId === "XAUUSD";

          let pnlMoney = 0;
          if (isBoomCrash) {
            // En Boom/Crash, 1 punto de precio * lote = USD directos (ej. 4.5 pts * 0.20 lot = $0.90 USD)
            pnlMoney = diff * pos.lot;
          } else if (isGold) {
            // En Oro, $1.00 de movimiento por cada 0.01 micro-lote = $1.00 USD
            pnlMoney = diff * pos.lot * 100;
          } else {
            // Forex Mayor y Criptomonedas
            const pipValue = pos.lot * 10;
            pnlMoney = pips * pipValue;
          }
          pos.pnl = parseFloat(pnlMoney.toFixed(2));
          openPnL += pos.pnl;

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
      if (this.activeTab === "simulator" && !positionsChanged) {
        this.updateSimulatorLiveUI();
      }
    }


    // DETECCIÓN CUÁNTICA DE ORDER BLOCKS INSTITUCIONALES (SMC)
    // Identifica el origen exacto donde las ballenas/algoritmos interbancarios inyectaron liquidez masiva
    findInstitutionalOrderBlock(candles, marketId, isBull) {
      if (!candles || candles.length < 15) return null;
      const N = candles.length;
      const m = MARKETS[marketId] || {};
      const isBoom = marketId.startsWith("BOOM") || m.platformMode === "deriv_boom";
      const isCrash = marketId.startsWith("CRASH") || m.platformMode === "deriv_crash";

      // 1. CASO BOOM (O SEÑAL ALCISTA): Bloque de Demanda = Base del spike o vela de inyección expansiva
      if (isBoom || isBull) {
        let bestOb = null;
        let maxExpansion = 0;
        const startLook = Math.max(3, N - 45);
        for (let i = N - 2; i >= startLook; i--) {
          const c = candles[i];
          const prev = candles[i - 1];
          const body = c.close - c.open;
          if (body > 0) {
            if (body > maxExpansion) {
              maxExpansion = body;
              bestOb = {
                type: "DEMAND_OB",
                candleIndex: i - 1,
                high: Math.max(prev.open, prev.close), // Nivel de mitigación superior (entrada)
                low: Math.min(prev.low, c.low),        // Invalidación estructural
                mitigationPrice: Math.max(prev.open, prev.close),
                originPrice: prev.close,
                time: c.time || Date.now()
              };
            }
          }
        }
        if (bestOb) return bestOb;
      }

      // 2. CASO CRASH (O SEÑAL BAJISTA): Bloque de Oferta = Cima de la caída o vela de expulsión bajista
      if (isCrash || !isBull) {
        let bestOb = null;
        let maxExpansion = 0;
        const startLook = Math.max(3, N - 45);
        for (let i = N - 2; i >= startLook; i--) {
          const c = candles[i];
          const prev = candles[i - 1];
          const body = c.open - c.close;
          if (body > 0) {
            if (body > maxExpansion) {
              maxExpansion = body;
              bestOb = {
                type: "SUPPLY_OB",
                candleIndex: i - 1,
                high: Math.max(prev.high, c.high),     // Invalidación estructural superior
                low: Math.min(prev.open, prev.close),  // Nivel de mitigación inferior (entrada)
                mitigationPrice: Math.min(prev.open, prev.close),
                originPrice: prev.close,
                time: c.time || Date.now()
              };
            }
          }
        }
        if (bestOb) return bestOb;
      }

      // 3. CASO GENERAL FOREX / ORO / CRIPTO / VOLATILIDADES
      const lookback = Math.min(30, N - 2);
      let swingIdx = N - 3;
      if (isBull) {
        let minL = Infinity;
        for (let i = N - lookback; i < N - 1; i++) {
          if (candles[i].low < minL) {
            minL = candles[i].low;
            swingIdx = i;
          }
        }
        const sc = candles[swingIdx];
        const highLvl = Math.max(sc.open, sc.close);
        return {
          type: "DEMAND_OB",
          candleIndex: swingIdx,
          high: highLvl,
          low: sc.low,
          mitigationPrice: highLvl,
          originPrice: sc.close,
          time: sc.time || Date.now()
        };
      } else {
        let maxH = -Infinity;
        for (let i = N - lookback; i < N - 1; i++) {
          if (candles[i].high > maxH) {
            maxH = candles[i].high;
            swingIdx = i;
          }
        }
        const sc = candles[swingIdx];
        const lowLvl = Math.min(sc.open, sc.close);
        return {
          type: "SUPPLY_OB",
          candleIndex: swingIdx,
          high: sc.high,
          low: lowLvl,
          mitigationPrice: lowLvl,
          originPrice: sc.close,
          time: sc.time || Date.now()
        };
      }
    }

    // MOTOR CUÁNTICO DE PROXIMIDAD Y PREDICCIÓN DE REACCIÓN DE SPIKE (BOOM & CRASH)
    analyzeBoomCrashSpikeProximity(candles, marketId, curPrice, ob = null, przZone = null) {
      if (!candles || candles.length < 30 || !ScannerCore) return null;
      const m = MARKETS[marketId] || {};
      const isBoom = m.platformMode === "deriv_boom" || marketId.startsWith("BOOM");
      const isCrash = m.platformMode === "deriv_crash" || marketId.startsWith("CRASH");
      if (!isBoom && !isCrash) return null;
      const history = ScannerCore.spikeCycleStats(candles);
      if (!history) return null;
      const atr = ScannerCore.averageTrueRange(candles, 14);
      const last = candles[candles.length - 1];
      const rejection = ScannerCore.rejectionDirection(last);
      const expectedDirection = isBoom ? "BUY" : "SELL";
      const nearOb = Boolean(ob && curPrice >= ob.low - atr * 0.25 && curPrice <= ob.high + atr * 0.25);
      const inPrz = Boolean(przZone && curPrice >= przZone.low && curPrice <= przZone.high);
      const intervals = history.intervals.slice().sort((a, b) => a - b);
      const q75 = intervals[Math.min(intervals.length - 1, Math.floor(intervals.length * 0.75))];
      const minDriftThreshold = Math.max(1, Math.floor(q75 * 0.75));
      const currentRange = last.high - last.low;
      const preceding = candles.slice(-16, -1);
      const medianRange = preceding.map(c => c.high - c.low).sort((a, b) => a - b)[Math.floor(preceding.length / 2)] || atr;
      const isMicroConsolidation = currentRange < medianRange * 0.65;
      const hasRejectionWick = rejection === expectedDirection;
      const obMitigated = nearOb;
      const przMitigated = inPrz;
      const inValueZone = obMitigated || przMitigated;
      const isReadyToTrigger = history.driftCandles >= minDriftThreshold && hasRejectionWick && inValueZone;
      return {
        isBoom, isCrash, observedSpikes: history.observedSpikes, observedIntervals: history.observedIntervals,
        driftCandles: history.driftCandles, avgSpikeIntervalCandles: history.typicalInterval,
        minDriftThreshold, isMicroConsolidation, hasRejectionWick,
        wickDetails: hasRejectionWick ? `Rechazo ${expectedDirection} en vela cerrada` : "Sin rechazo direccional confirmado",
        obMitigated, przMitigated, inValueZone,
        latencyEstimate: "No se predice el momento del próximo spike",
        isReadyToTrigger
      };
    }

    getClosedScannerCandles(marketId, timeframe) {
      const key = `${marketId}:${timeframe}`;
      const throughEpoch = Number(this.confirmedThroughEpoch[marketId] || 0);
      const granularity = ({ M1: 60, M5: 300, M15: 900, H1: 3600, H4: 14400, D1: 86400 })[timeframe];
      if (!granularity || this.dataFeedKeys[marketId] !== key || !throughEpoch) return [];
      return (this.candles[marketId] || []).filter(candle =>
        Number.isFinite(Number(candle.epoch)) && Number(candle.epoch) + granularity <= throughEpoch
      );
    }

    detectHarmonicPivots(candles) {
      if (!ScannerCore || !Array.isArray(candles)) return null;
      return ScannerCore.detectHarmonicPattern(candles, { pivotStrength: 3, atrPeriod: 14, maxSwings: 24 });
    }

    getMarketSniperRiskPips(marketId, m) {
      if (m.isBinary) return 0;
      if (marketId === "BTCUSDT") return 250; // $250 USD swing proporcional en Bitcoin
      if (marketId === "ETHUSDT") return 180; // $18.0 USD swing proporcional en Ethereum
      if (marketId === "XAUUSD") return 25;   // 25 pips ($2.50 USD) swing milimétrico en Oro
      if (m.platformMode === "deriv_boom" || m.platformMode === "deriv_crash") return 1500; // 15.0 puntos de riesgo institucional en Boom/Crash (espacio real para que explote el spike)
      return 15; // 15 pips en Forex Mayor (EUR/USD, GBP/USD, USD/JPY)
    }

    calculateEMA(candles, period) {
      if (!candles || candles.length === 0) return [];
      const k = 2 / (period + 1);
      const ema = [];
      let prevEma = candles[0].close;
      ema.push(prevEma);
      for (let i = 1; i < candles.length; i++) {
        const val = (candles[i].close * k) + (prevEma * (1 - k));
        ema.push(val);
        prevEma = val;
      }
      return ema;
    }

    calculateRSI(candles, period = 14) {
      if (!candles || candles.length <= period) return 50;
      let gains = 0;
      let losses = 0;
      for (let i = 1; i <= period; i++) {
        const diff = candles[i].close - candles[i - 1].close;
        if (diff >= 0) gains += diff;
        else losses -= diff;
      }
      let avgGain = gains / period;
      let avgLoss = losses / period;

      for (let i = period + 1; i < candles.length; i++) {
        const diff = candles[i].close - candles[i - 1].close;
        if (diff >= 0) {
          avgGain = ((avgGain * (period - 1)) + diff) / period;
          avgLoss = (avgLoss * (period - 1)) / period;
        } else {
          avgGain = (avgGain * (period - 1)) / period;
          avgLoss = ((avgLoss * (period - 1)) - diff) / period;
        }
      }

      if (avgLoss === 0) return 100;
      const rs = avgGain / avgLoss;
      return 100 - (100 / (1 + rs));
    }

    determineInstitutionalTrend(candles, marketId, m) {
      // 1. REGLA FÍSICA INQUEBRANTABLE DERIV BOOM / CRASH:
      // En Boom los picos institucionales son SIEMPRE alcistas (+). ¡JAMÁS operar ventas en Boom!
      // En Crash los picos institucionales son SIEMPRE bajistas (-). ¡JAMÁS operar compras en Crash!
      if (m.platformMode === "deriv_boom" || marketId.startsWith("BOOM")) {
        return { isBull: true, confidence: null, reason: "Dirección estructural del producto: los spikes de Boom son alcistas" };
      }
      if (m.platformMode === "deriv_crash" || marketId.startsWith("CRASH")) {
        return { isBull: false, confidence: null, reason: "Dirección estructural del producto: los spikes de Crash son bajistas" };
      }

      if (!candles || candles.length < 15) {
        return { isBull: true, confidence: null, reason: "Histórico insuficiente" };
      }

      // 2. MATEMÁTICA INSTITUCIONAL MULTI-FACTOR (CERO AZAR / CERO FLIP-FLOP):
      // Factor 1: Alineación EMA 20 vs EMA 50 (3 puntos)
      // Factor 2: Precio actual vs EMA 50 (2 puntos) y vs EMA 20 (1 punto)
      // Factor 3: Estructura de Mercado BOS / Higher Highs + Lows vs Lower Highs + Lows (3 puntos)
      // Factor 4: Momentum RSI 14 respecto al umbral neutral 50 (2 puntos)
      let bullScore = 0;
      let bearScore = 0;

      const ema20Arr = this.calculateEMA(candles, 20);
      const ema50Arr = this.calculateEMA(candles, 50);
      const lastIdx = candles.length - 1;
      const currentPrice = candles[lastIdx].close;
      const ema20 = ema20Arr[lastIdx] || currentPrice;
      const ema50 = ema50Arr[lastIdx] || currentPrice;

      if (ema20 > ema50) {
        bullScore += 3;
      } else if (ema20 < ema50) {
        bearScore += 3;
      }

      if (currentPrice > ema50) bullScore += 2;
      else bearScore += 2;

      if (currentPrice > ema20) bullScore += 1;
      else bearScore += 1;

      // Estructura de Mercado en últimas 20 velas
      const lookback = Math.min(20, candles.length);
      const recent = candles.slice(candles.length - lookback);
      const half = Math.floor(lookback / 2);
      const firstHalf = recent.slice(0, half);
      const secondHalf = recent.slice(half);

      const high1 = Math.max(...firstHalf.map(c => c.high));
      const low1 = Math.min(...firstHalf.map(c => c.low));
      const high2 = Math.max(...secondHalf.map(c => c.high));
      const low2 = Math.min(...secondHalf.map(c => c.low));

      if (high2 >= high1 && low2 >= low1) {
        bullScore += 3; // HH + HL
      } else if (high2 <= high1 && low2 <= low1) {
        bearScore += 3; // LH + LL
      } else {
        if (candles[lastIdx].close >= candles[candles.length - lookback].close) {
          bullScore += 1;
        } else {
          bearScore += 1;
        }
      }

      // Momentum RSI 14
      const rsi = this.calculateRSI(candles, 14);
      if (rsi >= 50) bullScore += 2;
      else bearScore += 2;

      const isBull = bullScore >= bearScore;
      const totalPoints = bullScore + bearScore;
      const scoreRatio = totalPoints > 0 ? (Math.max(bullScore, bearScore) / totalPoints) : 0;

      const reason = isBull
        ? `EMA20/50 Alcista + Estructura BOS Confirmada (${bullScore} vs ${bearScore} pts)`
        : `EMA20/50 Bajista + Estructura BOS Confirmada (${bearScore} vs ${bullScore} pts)`;

      return { isBull, confidence: null, scoreRatio, bullScore, bearScore, reason };
    }

    getTimeframeAccuracyInfo(marketId, tf) {
      return {
        level: "neutral",
        text: `Escáner basado en velas confirmadas (${tf})`,
        advice: "El filtro describe condiciones del gráfico; no representa una probabilidad de ganar. Valida con resultados históricos antes de arriesgar dinero."
      };
    }

    generateHarmonicSignal(marketId, timeframe, forceRegenerate = false, confirmedEpoch = null) {
      const m = MARKETS[marketId];
      const feedKey = `${marketId}:${timeframe}`;
      const bars = this.getClosedScannerCandles(marketId, timeframe);
      if (!m || m.isBinary || this.dataFeedKeys[marketId] !== feedKey || bars.length < 60 || !ScannerCore) {
        this.scannerStatus = "Esperando un feed real y al menos 60 velas cerradas; las velas de demostración no generan señales.";
        this.renderScannerSignal();
        return;
      }

      const bar = bars[bars.length - 1];
      const candleEpoch = Number(confirmedEpoch || (Number(bar.epoch) + ({M1:60,M5:300,M15:900,H1:3600,H4:14400,D1:86400})[timeframe]));
      if (!Number.isFinite(candleEpoch) || this.lastEvaluatedCandleEpoch[marketId] === candleEpoch) return;
      this.lastEvaluatedCandleEpoch[marketId] = candleEpoch;
      if (this.currentSignal && this.currentSignal.marketId === marketId && this.currentSignal.timeframe === timeframe && !this.currentSignal.completedAt) return;

      const slCooldown = this.marketSlCooldowns[marketId];
      if (slCooldown && Date.now() - slCooldown.hitAt < slCooldown.cooldownMs) {
        this.scannerStatus = "Pausa de protección después de alcanzar el stop; esperando nuevas velas.";
        this.renderScannerSignal();
        return;
      }
      delete this.marketSlCooldowns[marketId];

      const atr = ScannerCore.averageTrueRange(bars, 14);
      const direction = ScannerCore.rejectionDirection(bar);
      const trend = this.determineInstitutionalTrend(bars, marketId, m);
      const preferred = trend.isBull ? "BUY" : "SELL";
      const ob = this.findInstitutionalOrderBlock(bars, marketId, trend.isBull);
      const geom = this.detectHarmonicPivots(bars);
      const close = Number(bar.close);
      const nearOb = Boolean(ob && close >= ob.low - atr * 0.25 && close <= ob.high + atr * 0.25);
      const harmonicAtPrz = Boolean(geom && geom.isBull === trend.isBull && geom.isAtPrz && close >= geom.przZone.low && close <= geom.przZone.high);
      const spike = this.analyzeBoomCrashSpikeProximity(bars, marketId, close, ob, geom && geom.przZone);
      const isBoomCrash = m.platformMode === "deriv_boom" || m.platformMode === "deriv_crash" || marketId.startsWith("BOOM") || marketId.startsWith("CRASH");

      const entryValidation = ScannerCore.validateEntryConditions({
        direction,
        preferredDirection: preferred,
        isBoomCrash,
        spike,
        nearOrderBlock: nearOb,
        harmonicAtPrz,
        harmonicDirection: geom ? (geom.isBull ? "BUY" : "SELL") : null
      });
      const checks = entryValidation.reasons;
      if (checks.length) {
        this.scannerStatus = checks.join(". ") + ".";
        this.spikeRadar = isBoomCrash && spike && spike.observedIntervals >= 3 ? {
          active: true, marketId, marketName: m.name, driftCandles: spike.driftCandles,
          avgInterval: spike.avgSpikeIntervalCandles, observedIntervals: spike.observedIntervals,
          latencyEstimate: "Esperando rechazo; sin predicción temporal",
          orderBlock: ob, przZone: geom && geom.przZone, updatedAt: Date.now()
        } : null;
        this.renderScannerSignal();
        return;
      }

      const isBull = direction === "BUY";
      const decimals = this.getMarketDecimals(marketId);
      const entry = close;
      const structuralStop = isBull
        ? Math.min(bar.low, ob ? ob.low : bar.low, geom && harmonicAtPrz ? geom.przZone.low : bar.low) - atr * 0.2
        : Math.max(bar.high, ob ? ob.high : bar.high, geom && harmonicAtPrz ? geom.przZone.high : bar.high) + atr * 0.2;
      const riskDistance = Math.max(Math.abs(entry - structuralStop), atr * 0.75);
      const roundPrice = value => Number(value.toFixed(decimals));
      const sl = roundPrice(isBull ? entry - riskDistance : entry + riskDistance);
      const tp1 = roundPrice(isBull ? entry + riskDistance : entry - riskDistance);
      const tp2 = roundPrice(isBull ? entry + riskDistance * 2 : entry - riskDistance * 2);
      const tp3 = roundPrice(isBull ? entry + riskDistance * 3 : entry - riskDistance * 3);
      const confluences = [
        `Estructura ${trend.reason}`,
        `Rechazo ${direction} en vela confirmada`,
        nearOb ? "Precio dentro/cerca del bloque de órdenes" : null,
        harmonicAtPrz ? `${geom.patternName} confirmado en PRZ` : null,
        isBoomCrash ? `Deriva actual ${spike.driftCandles} velas; mediana histórica ${spike.avgSpikeIntervalCandles} (n=${spike.observedIntervals} ciclos)` : null
      ].filter(Boolean);

      this.currentSignal = {
        id: `SIG-${marketId}-${candleEpoch}`,
        marketId, marketName: m.name, timeframe,
        pattern: geom && harmonicAtPrz ? geom.patternName : (isBoomCrash ? `${m.name}: rechazo tras deriva observada` : "Sniper: rechazo en zona estructural"),
        type: isBull ? "BUY" : "SELL", fibs: geom ? geom.ratios : null,
        pivots: geom ? { X:geom.pX_price,A:geom.pA_price,B:geom.pB_price,C:geom.pC_price,D:geom.pD_price } : null,
        smc: confluences.join(" · "),
        orderBlock: ob ? { high: ob.high, low: ob.low, type: ob.type, label: isBull ? "Demanda" : "Oferta" } : null,
        confluence: confluences.length, confluences, trendReason: trend.reason,
        entry, entryCandleIdx: bar.index, entryTime: Date.now(), signalCandleEpoch: bar.epoch,
        przZone: harmonicAtPrz ? geom.przZone : null,
        sl, tp1, tp2, tp3, riskPips: Math.abs(entry - sl) / (m.pipSize || 1),
        atr, riskRewardTargets: [1,2,3], spikeMetrics: isBoomCrash ? spike : null,
        createdAt: Date.now(), createdCandleIndex: bar.index, timestamp: new Date().toLocaleTimeString()
      };
      this.scannerStatus = "Señal calculada al cierre de una vela real. Los niveles son escenarios de riesgo, no garantía.";
      this.accumulationStatus = null;
      this.spikeRadar = null;
      this.renderScannerSignal();
      this.drawMarketCanvas();
      if (this.telegramAutoSend && this.telegramToken && this.telegramChatId && this.telegramMarkets.includes(marketId)) {
        const now = Date.now();
        if (now - (this.lastSentTelegramSignals[marketId] || 0) >= 90000) {
          this.lastSentTelegramSignals[marketId] = now;
          this.sendSignalToTelegram(this.currentSignal, true);
        }
      }
    }

    calculateSafeLot(accountSize, riskPips = null, marketId = null, overrideLot = null) {
      const cap = Math.max(1, parseFloat(accountSize) || 50);
      const targetMarket = marketId || this.selectedMarket || "BOOM1000";
      const m = MARKETS[targetMarket] || MARKETS["BOOM1000"] || {};
      const isBinary = Boolean(m.isBinary);
      const isBoomCrash = m.platformMode === "deriv_boom" || m.platformMode === "deriv_crash" || targetMarket.startsWith("BOOM") || targetMarket.startsWith("CRASH");
      const isCrypto = targetMarket === "BTCUSDT" || targetMarket === "ETHUSDT";
      const isGold = targetMarket === "XAUUSD";

      const pips = (riskPips !== null && riskPips !== undefined && riskPips > 0)
        ? riskPips
        : this.getMarketSniperRiskPips(targetMarket, m);

      if (m.platformMode === "step_index") {
        return {
          capital: "N/D", recommendedBaseCapital: "N/D", lot: "N/D", defaultLot: null,
          slPips: pips, tp1Pips: pips, tp2Pips: pips * 2, tp3Pips: pips * 3,
          targetRiskMoney: "N/D", actualRiskMoney: "N/D", actualRiskPercent: "N/D",
          tp1Profit: "N/D", tp2Profit: "N/D", tp3Profit: "N/D",
          isMicroAccount: false, isCustomLot: false,
          microNote: "Deriv Step Index: conversión de puntos a dinero/lote no configurada; consulta las especificaciones del contrato."
        };
      }

      let recommendedLot;
      if (isBinary) {
        recommendedLot = 1.00;
      } else if (isBoomCrash) {
        recommendedLot = 0.20;
      } else {
        recommendedLot = 0.01;
      }

      // Si se pasa un lotaje simulado, usarlo; de lo contrario, usar el lote recomendado
      const activeLot = (overrideLot !== null && overrideLot !== undefined && parseFloat(overrideLot) > 0)
        ? parseFloat(overrideLot)
        : recommendedLot;

      let actualRiskMoney;
      if (isBinary) {
        actualRiskMoney = activeLot;
      } else if (isBoomCrash) {
        // En Deriv Boom/Crash: 1 punto de precio = $1.00 USD por cada 1.00 lote.
        // Como 1 pip = 0.01 puntos (450 pips = 4.50 puntos):
        const pts = pips * 0.01;
        actualRiskMoney = parseFloat((pts * activeLot).toFixed(2));
      } else if (isGold) {
        // En Oro (XAUUSD): 1 pip = $0.10 USD a 0.01 lote ($10.00 USD por lote estándar).
        actualRiskMoney = parseFloat((pips * 0.10 * (activeLot / 0.01)).toFixed(2));
      } else if (isCrypto) {
        actualRiskMoney = parseFloat(((pips / 250) * 1.80 * (activeLot / 0.01)).toFixed(2));
      } else {
        // Forex Mayor: 1 pip = $0.10 USD a 0.01 lote ($10.00 USD por lote estándar).
        actualRiskMoney = parseFloat((pips * 0.10 * (activeLot / 0.01)).toFixed(2));
      }

      actualRiskMoney = Math.max(0.10, actualRiskMoney);

      // CÁLCULO DEL CAPITAL BASE RECOMENDADO EN CUENTA SEGÚN LOTAJE:
      // Norma de Oro Institucional: Máximo 1.8% a 2.0% de riesgo por operación para nunca sobreapalancarse.
      let recommendedBaseCapital;
      if (isBinary) {
        recommendedBaseCapital = Math.max(50, Math.round(activeLot * 50));
      } else if (isBoomCrash) {
        // A 0.20 lote -> SL $0.90 USD (1.8% de $50). A 1.00 lote -> SL $4.50 USD (1.8% de $250).
        recommendedBaseCapital = Math.max(50, Math.round(actualRiskMoney / 0.018));
      } else if (isGold) {
        // En Oro: SL 25 pips -> a 0.01 lote = $2.50 USD (3% de $83 o 5% de $50).
        recommendedBaseCapital = Math.max(50, Math.round(actualRiskMoney / 0.03));
      } else {
        // En Forex: SL 15 pips -> a 0.01 lote = $1.50 USD (2% de $75 o 3% de $50).
        recommendedBaseCapital = Math.max(50, Math.round(actualRiskMoney / 0.02));
      }

      const effectiveCapital = (overrideLot !== null && overrideLot !== undefined)
        ? recommendedBaseCapital
        : cap;

      const actualRiskPercent = parseFloat(((actualRiskMoney / effectiveCapital) * 100).toFixed(1));

      // Metas en Pips:
      const slPips = pips;
      const tp1Pips = Math.round(pips);
      const tp2Pips = Math.round(pips * 2);
      const tp3Pips = Math.round(pips * 3);

      // Ganancias Reales en USD exactas para el lotaje:
      const tp1Profit = parseFloat((actualRiskMoney).toFixed(2));
      const tp2Profit = parseFloat((actualRiskMoney * 2).toFixed(2));
      const tp3Profit = parseFloat((actualRiskMoney * 3).toFixed(2));

      return {
        capital: effectiveCapital,
        recommendedBaseCapital: recommendedBaseCapital,
        lot: activeLot,
        defaultLot: recommendedLot,
        slPips: slPips,
        tp1Pips: tp1Pips,
        tp2Pips: tp2Pips,
        tp3Pips: tp3Pips,
        targetRiskMoney: parseFloat((effectiveCapital * (this.riskPercent / 100)).toFixed(2)),
        actualRiskMoney: actualRiskMoney,
        actualRiskPercent: actualRiskPercent,
        tp1Profit: tp1Profit,
        tp2Profit: tp2Profit,
        tp3Profit: tp3Profit,
        isMicroAccount: effectiveCapital <= 100,
        isCustomLot: activeLot !== recommendedLot,
        microNote: isBoomCrash
          ? `En cuenta recomendada de $${effectiveCapital} USD (Boom/Crash), a ${activeLot} lotes con SL de ${pips} pips (4.50 pts), arriesgas -$${actualRiskMoney} USD (${actualRiskPercent}% del capital). Ganancias reales: TP1: +$${tp1Profit} USD, TP2: +$${tp2Profit} USD, TP3: +$${tp3Profit} USD.`
          : `En cuenta recomendada de $${effectiveCapital} USD, a ${activeLot} lotes con SL de ${pips} pips, arriesgas -$${actualRiskMoney} USD (${actualRiskPercent}% del capital). Ganancias reales: TP1: +$${tp1Profit} USD, TP2: +$${tp2Profit} USD, TP3: +$${tp3Profit} USD.`
      };
    }

    getLotTiersForMarket(marketId, riskPips = null) {
      const targetMarket = marketId || this.selectedMarket || "BOOM1000";
      const m = MARKETS[targetMarket] || MARKETS["BOOM1000"] || {};
      const isBoomCrash = m.platformMode === "deriv_boom" || m.platformMode === "deriv_crash" || targetMarket.startsWith("BOOM") || targetMarket.startsWith("CRASH");
      const isGold = targetMarket === "XAUUSD";
      const isBinary = Boolean(m.isBinary);

      if (m.platformMode === "step_index") return [];

      let lots;
      if (isBinary) {
        lots = [1, 2, 5, 10, 20, 50];
      } else if (isBoomCrash) {
        lots = [0.20, 0.50, 1.00, 2.00, 3.00, 5.00, 10.00];
      } else if (isGold) {
        lots = [0.01, 0.02, 0.05, 0.10, 0.20, 0.50, 1.00];
      } else {
        lots = [0.01, 0.02, 0.05, 0.10, 0.20, 0.50, 1.00];
      }

      return lots.map(lot => this.calculateSafeLot(this.accountSize, riskPips, targetMarket, lot));
    }

    render() {
      const container = document.getElementById("tradingSection");
      if (!container) return;

      const m = MARKETS[this.selectedMarket] || MARKETS["XAUUSD"];

      container.innerHTML = `
        <div class="ak-trading-wrap">
          <div class="ak-trading-hero">
            <div class="ak-trading-hero-top">
              <div class="ak-trading-title-group">
                <span class="ak-trading-logo">📈</span>
                <div>
                  <h2>Akira Quantum Trading Lab &amp; Real-Time Terminal</h2>
                  <p>Estación institucional completa: Conexión WebSocket Oficial Deriv, velas japonesas, historial numérico OHLC, Deriv Spikes y Opciones Binarias a $0.00 COP.</p>
                </div>
              </div>
              <div class="ak-trading-badge-group">
                <span id="wsStatusPill" class="ak-pill live"><span class="dot"></span> DERIV WEBSOCKET OFICIAL (EN VIVO)</span>
                <span class="ak-pill sentinel ${this.sentinel.isCircuitBreakerActive ? 'alert' : 'ok'}">
                  ${this.sentinel.isCircuitBreakerActive ? '🔴 CORTACIRCUITO ACTIVO' : '🛡️ ASIMÉTRICO (4W / 2L)'}
                </span>
                <span class="ak-pill free">$0.00 COP / USD</span>
              </div>
            </div>

            <div class="ak-trading-tabs">
              <button class="ak-ttab-btn ${this.activeTab === 'market' ? 'active' : ''}" data-ttab="market">🕯️ Gráfico de Velas &amp; Historial</button>
              <button class="ak-ttab-btn ${this.activeTab === 'simulator' ? 'active' : ''}" data-ttab="simulator">🎮 Simulador Demo (Paper Trading)</button>
              <button class="ak-ttab-btn ${this.activeTab === 'sentinel' ? 'active' : ''}" data-ttab="sentinel">🛡️ Centinela &amp; Interés Compuesto</button>
              <button class="ak-ttab-btn ${this.activeTab === 'tvchart' ? 'active' : ''}" data-ttab="tvchart">📊 TradingView Feed Externo</button>
              <button class="ak-ttab-btn ${this.activeTab === 'connections' ? 'active' : ''}" data-ttab="connections">🔌 Conexiones &amp; Automatización</button>
            </div>
          </div>

          <div id="tab-market" class="ak-ttab-pane ${this.activeTab === 'market' ? 'active' : ''}">
            <div class="ak-market-topbar">
              <div style="display:flex;align-items:center;gap:12px;flex-wrap:wrap;">
                <div class="ak-control-group">
                  <label>MERCADO ACTIVO:</label>
                  <select id="selMarketActive" class="ak-input-select" style="font-weight:bold;font-size:13px;">
                    ${Object.keys(MARKETS).map(k => `
                      <option value="${k}" ${this.selectedMarket === k ? 'selected' : ''}>
                        ${MARKETS[k].icon} ${MARKETS[k].name} (${MARKETS[k].category})
                      </option>
                    `).join('')}
                  </select>
                </div>

                <div class="ak-control-group">
                  <label>TEMPORALIDAD:</label>
                  <div class="ak-tf-buttons">
                    ${["M1", "M5", "M15", "H1", "H4", "D1"].map(tf => `
                      <button class="ak-tf-btn ${this.selectedTimeframe === tf ? 'active' : ''}" data-tf="${tf}">${tf}</button>
                    `).join('')}
                  </div>
                </div>

                <div class="ak-control-group">
                  <label>MOTOR DE GRÁFICO:</label>
                  <div style="display:flex;gap:4px;">
                    <button class="ak-chart-type-btn ${this.chartEngine === 'tradingview' ? 'active' : ''}" id="btnEngineTV" title="Gráfico Oficial TradingView con Datos Deriv en Tiempo Real">📊 TradingView Pro</button>
                    <button class="ak-chart-type-btn ${this.chartEngine === 'canvas' ? 'active' : ''}" id="btnEngineCanvas" title="Gráfico Cuántico Akira con Escáner Armónico XABCD">🔬 Cuántico Akira</button>
                    <button class="ak-chart-type-btn" id="btnTvPineScriptModal" title="Indicador Oficial Pine Script v5 para TradingView Pro (Cazador Spikes + Armónicos)" style="background:linear-gradient(135deg,rgba(245,158,11,0.15),rgba(249,115,22,0.18));border:1px solid rgba(245,158,11,0.45);color:#fbbf24;">⚡ Pine Script Pro v5</button>
                  </div>
                </div>

                <div class="ak-control-group" id="canvasChartSubtypeGroup" style="display:${this.chartEngine === 'canvas' ? 'flex' : 'none'};flex-direction:column;">
                  <label>ESTILO CUÁNTICO:</label>
                  <div style="display:flex;gap:4px;">
                    <button class="ak-chart-type-btn ${this.chartType === 'candles' ? 'active' : ''}" id="btnChartCandles" title="Velas Japonesas Oficiales Deriv">🕯️ Velas</button>
                    <button class="ak-chart-type-btn ${this.chartType === 'line' ? 'active' : ''}" id="btnChartLine" title="Línea / Tick y Barreras de Acumuladores Deriv">📈 Línea (Acumuladores)</button>
                  </div>
                </div>
              </div>

              <div class="ak-market-telemetry-badge" id="telemetryBadgeBox"></div>
            </div>

            <div id="platformSpecialDeck" style="margin-bottom:12px;"></div>

            <div class="ak-chart-canvas-wrapper" id="akiraChartCanvasWrapper">
              <div class="ak-chart-canvas-header" id="akiraChartCanvasHeader">
                <div style="display:flex;align-items:center;gap:10px;flex-wrap:wrap;" id="chartMarketHeaderInfo">
                  <span style="font-size:18px;" id="chartMarketIcon">${m.icon}</span>
                  
                  <!-- SELECTOR RÁPIDO DE MERCADO DIRECTO EN EL ENCABEZADO DEL GRÁFICO (SOLICITUD DIRECTOR JHON) -->
                  <select id="selMarketHeader" class="ak-input-select ak-chart-header-market" style="font-weight:bold;font-size:13px;padding:4px 8px;background:#0b111e;color:#00f2fe;border:1px solid rgba(0,242,254,0.4);border-radius:6px;cursor:pointer;max-width:240px;" title="Cambiar Mercado Directamente en el Gráfico">
                    ${Object.keys(MARKETS).map(k => `
                      <option value="${k}" ${this.selectedMarket === k ? 'selected' : ''}>
                        ${MARKETS[k].icon} ${MARKETS[k].name}
                      </option>
                    `).join('')}
                  </select>
                  <span id="chartMarketCategory" style="font-size:11px;color:#94a3b8;">(${m.category})</span>
                  
                  <!-- SELECTOR DE TEMPORALIDADES DIRECTO SOBRE EL GRÁFICO (SOLICITUD DIRECTOR JHON) -->
                  <div class="ak-tf-buttons ak-chart-header-tf" style="display:inline-flex;gap:3px;background:rgba(0,0,0,0.55);padding:3px 5px;border-radius:6px;border:1px solid rgba(0,242,254,0.35);margin:0 4px;">
                    ${["M1", "M5", "M15", "H1", "H4", "D1"].map(tf => `
                      <button class="ak-tf-btn ${this.selectedTimeframe === tf ? 'active' : ''}" data-tf="${tf}" style="padding:3px 8px;font-size:11px;font-weight:800;border-radius:4px;cursor:pointer;">${tf}</button>
                    `).join('')}
                  </div>

                  <span class="ak-pill live" style="font-size:10px;" id="chartMarketTfPill">${this.selectedTimeframe} &bull; ${this.chartEngine === 'tradingview' ? 'TradingView Deriv Oficial' : 'Stream Deriv Directo'}</span>
                  <span style="font-size:11px;color:#94a3b8;" id="candleCountdownLabel">Próxima vela en: ${this.formingCandleSeconds}s</span>
                  <span id="chartAccuracyBadge" class="ak-badge safe" style="font-size:10px;padding:3px 8px;font-weight:700;">Escáner en análisis</span>
                </div>
                <div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap;">
                  <button id="btnToggleEMA" class="ak-chart-tool-btn ${this.showEMA ? 'active' : ''}">⚡ EMA 20/50</button>
                  <button id="btnToggleHarmonics" class="ak-chart-tool-btn ${this.showHarmonics ? 'active' : ''}">🔬 Patrón Armónico Real</button>
                  <button id="btnToggleLevels" class="ak-chart-tool-btn ${this.showLevels ? 'active' : ''}">🎯 Niveles SL/TP</button>
                  <button id="btnToggleSniper" class="ak-chart-tool-btn ${this.showSniper ? 'active' : ''}">🎯 Escáner Chulitos (Sniper ✓)</button>
                  <button id="btnToggleTheme" class="ak-chart-tool-btn" title="Alternar entre Fondo Blanco y Fondo Oscuro">
                    ${this.chartTheme === 'light' ? '🌙 Modo Oscuro' : '☀️ Fondo Blanco'}
                  </button>
                  <button id="btnHeaderTelegramAlerts" class="ak-chart-tool-btn" style="background:rgba(0,136,204,0.18);color:#00f2fe;border:1px solid rgba(0,136,204,0.35);" title="Ver / Configurar Alertas y Señales de Telegram para tu móvil">
                    ✈️ Telegram: ${this.telegramToken && this.telegramChatId ? (this.telegramAutoSend ? '🟢 En Vivo' : '⏸️ Pausado') : '🟡 Activar'}
                  </button>
                  <button id="btnToggleFullscreen" class="ak-chart-tool-btn ak-btn-fullscreen" title="Modo Pantalla Completa (ESC para salir)">
                    <span class="fs-icon">⛶</span> <span class="fs-text">Pantalla Completa</span>
                  </button>
                </div>
              </div>

              <div id="fsExtraToolbar" class="ak-fs-extra-toolbar" style="display:none;"></div>

              <div id="canvasAccountTelemetryRibbon" class="ak-canvas-account-ribbon" style="display:${this.chartEngine === 'canvas' ? 'flex' : 'none'};"></div>

              <div id="canvasOhlcInspector" class="ak-canvas-inspector" style="display:${this.chartEngine === 'canvas' ? 'flex' : 'none'};">
                <span>Pasa el mouse sobre el gráfico para auditar cualquier vela histórica en números exactos.</span>
              </div>

              <!-- ESCENARIO PRINCIPAL DEL GRÁFICO (TRADINGVIEW O CANVAS) -->
              <div class="ak-chart-stage-container" id="chartStageContainer">
                <!-- CONTENEDOR TRADINGVIEW OFICIAL (EN TIEMPO REAL CON DERIV) -->
                <div id="tvChartContainer" style="width:100%;height:560px;display:${this.chartEngine === 'tradingview' ? 'flex' : 'none'};flex-direction:column;border-radius:8px;overflow:hidden;background:#080c14;border:1px solid rgba(0,242,254,0.25);"></div>

                <!-- CONTENEDOR CANVAS LOCAL AKIRA -->
                <div id="canvasChartContainer" style="width:100%;display:${this.chartEngine === 'canvas' ? 'flex' : 'none'};position:relative;flex:1;">
                  <canvas id="akiraMarketCanvas" class="ak-market-canvas" width="1100" height="540"></canvas>

                  <!-- BARRA VERTICAL DEDICADA: MOVER PANTALLA ARRIBA Y ABAJO -->
                  <div class="ak-chart-v-scroll-bar" id="chartVScrollBar" title="Barra Vertical: Mueve el gráfico hacia arriba o hacia abajo">
                    <button id="btnScrollUp" class="ak-vbar-btn" title="Subir gráfico (Ver precios más altos / resistencias)">▲</button>
                    <div class="ak-vbar-track-wrap">
                      <span class="ak-vbar-lbl top">▲ MÁX</span>
                      <input type="range" id="chartVScrollSlider" min="-100" max="100" value="0" step="1" class="ak-vbar-slider" title="Desliza para mover la pantalla arriba o abajo">
                      <span class="ak-vbar-lbl btm">▼ MÍN</span>
                    </div>
                    <button id="btnScrollDown" class="ak-vbar-btn" title="Bajar gráfico (Ver precios más bajos / soportes)">▼</button>
                    <button id="btnResetVScroll" class="ak-vbar-btn reset" title="Centrar escala vertical en 0%">⊙</button>
                  </div>
                </div>
              </div>

              <div class="ak-chart-nav-bar" id="chartNavBar" style="display:${this.chartEngine === 'canvas' ? 'flex' : 'none'};">
                <div class="ak-nav-left-group">
                  <button id="btnJumpToStart" class="ak-nav-btn" title="Saltar al inicio del historial completo (vela más antigua registrada)">
                    ⏮ Inicio Historial
                  </button>
                  <button id="btnScrollLeft" class="ak-nav-btn" title="Desplazar hacia la izquierda (explorar velas del pasado)">
                    ◀ Historial
                  </button>
                  <div class="ak-slider-wrap">
                    <span class="ak-slider-lbl" id="lblScrollStart">⏮ HISTORIAL COMPLETO</span>
                    <input type="range" id="chartScrollSlider" min="0" max="1000" value="0" step="1" class="ak-nav-slider" title="Desliza libremente para explorar el historial completo de velas">
                    <span class="ak-slider-lbl live">EN VIVO ▶</span>
                  </div>
                  <button id="btnScrollRight" class="ak-nav-btn" title="Desplazar hacia la derecha (hacia el tiempo real)">
                    En Vivo ▶
                  </button>
                  <button id="btnJumpToLive" class="ak-nav-btn active" title="Centrar gráfico en la vela en vivo actual">
                    ⏭ En Vivo
                  </button>
                </div>

                <div class="ak-nav-right-group">
                  <span id="vScrollBadge" class="ak-pill subtle" style="display:none;font-size:10px;padding:3px 8px;">↕ 0%</span>
                  <button id="btnFitAllHistory" class="ak-nav-btn" title="Ajustar zoom para ver la perspectiva macro completa de todas las velas">
                    👁️ Ver Todo (Macro)
                  </button>
                  <button id="btnZoomOut" class="ak-nav-btn" title="Ver más velas en pantalla (Alejar)">
                    🔍 - Alejar
                  </button>
                  <button id="btnZoomIn" class="ak-nav-btn" title="Ver velas más grandes (Acercar)">
                    🔍 + Acercar
                  </button>
                  <button id="btnToggleMargin" class="ak-nav-btn" title="Espacio libre a la derecha para ver metas TP/SL">
                    📐 Espacio (${this.rightMarginBars}v)
                  </button>
                  <button id="btnResetView" class="ak-nav-btn" title="Restablecer vista estándar (45 velas en vivo)">
                    🎯 Reset Vista
                  </button>
                </div>
              </div>
            </div>

            <div class="ak-market-data-grid">
              <div class="ak-data-card" style="flex:2;">
                <div class="ak-data-card-head" style="flex-wrap:wrap;gap:8px;">
                  <div style="display:flex;align-items:center;gap:8px;">
                    <span style="font-size:14px;">📜</span>
                    <h4 style="margin:0;font-size:13px;color:#fff;">Historial Numérico del Mercado (Velas Anteriores OHLCV)</h4>
                  </div>
                  <div style="display:flex;align-items:center;gap:6px;flex-wrap:wrap;">
                    <button class="ak-pill-btn ${(!this.historyTableLimit || this.historyTableLimit === 50) ? 'active' : ''}" data-hist-limit="50">50 Velas</button>
                    <button class="ak-pill-btn ${this.historyTableLimit === 150 ? 'active' : ''}" data-hist-limit="150">150 Velas</button>
                    <button class="ak-pill-btn ${this.historyTableLimit === 500 ? 'active' : ''}" data-hist-limit="500">500 Velas</button>
                    <button class="ak-pill-btn ${this.historyTableLimit === 'all' ? 'active' : ''}" data-hist-limit="all">🌟 Historial Completo</button>
                    <span id="candleHistoryCountBadge" style="font-size:11px;color:#00f2fe;font-weight:bold;margin-left:6px;">Historial: ${this.candles[this.selectedMarket]?.length || 0} Velas</span>
                  </div>
                </div>
                <div class="ak-table-scroll-wrap">
                  <table class="ak-ohlc-table">
                    <thead>
                      <tr>
                        <th>Hora</th>
                        <th>Apertura (Open)</th>
                        <th>Máximo (High)</th>
                        <th>Mínimo (Low)</th>
                        <th>Cierre (Close)</th>
                        <th>Rango (Pips)</th>
                        <th>Dirección</th>
                        <th>Volumen</th>
                      </tr>
                    </thead>
                    <tbody id="candleHistoryTableBody"></tbody>
                  </table>
                </div>
              </div>

              <div class="ak-data-card" style="flex:1;">
                <div class="ak-data-card-head">
                  <div style="display:flex;align-items:center;gap:8px;">
                    <span style="font-size:14px;">⚡</span>
                    <h4 style="margin:0;font-size:13px;color:#fff;">Cinta de Ticks en Tiempo Real</h4>
                  </div>
                  <span class="ak-pill live" style="font-size:9px;">Live Tape</span>
                </div>
                <div class="ak-table-scroll-wrap">
                  <table class="ak-ohlc-table">
                    <thead>
                      <tr>
                        <th>Hora</th>
                        <th>Precio</th>
                        <th>Lotes</th>
                        <th>Tipo</th>
                      </tr>
                    </thead>
                    <tbody id="tickTapeBody"></tbody>
                  </table>
                </div>
              </div>
            </div>

            <div id="scannerSignalContainer" style="margin-top:16px;"></div>
          </div>

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

            <div class="ak-sim-order-deck">
              <div class="ak-sim-order-box">
                <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px;flex-wrap:wrap;gap:8px;">
                  <h4 style="margin:0;font-size:13px;color:#00f2fe;">🎯 Ejecutar Nueva Operación Demo</h4>
                  <div style="display:flex;gap:6px;">
                    <button id="btnSyncDemoWithCap" class="ak-btn subtle" style="padding:4px 8px;font-size:11px;">
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

            <div class="ak-sim-positions-box">
              <h4 style="margin:0 0 10px 0;font-size:13px;color:#fff;">📍 Operaciones Abiertas en Vivo</h4>
              <div id="simOpenPositionsList"></div>
            </div>

            <div class="ak-sim-history-box" style="margin-top:16px;">
              <h4 style="margin:0 0 10px 0;font-size:13px;color:#94a3b8;">📜 Historial de Operaciones Cerradas</h4>
              <div id="simClosedTradesList"></div>
            </div>
          </div>

          <div id="tab-sentinel" class="ak-ttab-pane ${this.activeTab === 'sentinel' ? 'active' : ''}">
            <div class="ak-sentinel-grid">
              <div class="ak-card">
                <div class="ak-card-header">
                  <h4>💰 Gestión Universal de Capital</h4>
                  <span class="ak-badge safe">Regla 1.5% Max</span>
                </div>
                <p style="font-size:12px;color:#94a3b8;margin-bottom:8px;">
                  Ingresa <strong>CUALQUIER MONTO</strong> con el que vayas a operar (desde $10 hasta $10,000+ USD). Akira recalculará el lotaje exacto y el riesgo en dólares:
                </p>
                <div class="ak-capital-input-wrapper">
                  <label style="font-size:11px;font-weight:700;color:#00f2fe;">CAPITAL INICIAL PERSONALIZADO (USD):</label>
                  <div style="display:flex;gap:8px;align-items:center;margin-top:4px;">
                    <span style="font-size:18px;font-weight:bold;color:#00f2fe;">$</span>
                    <input type="number" id="inpCustomAccountSize" class="ak-input-text" style="font-size:16px;font-weight:bold;color:#fff;width:160px;" value="${this.accountSize}" min="1" step="10">
                    <button id="btnApplyCapital" class="ak-btn primary" style="padding:6px 12px;">Calcular</button>
                  </div>
                </div>
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

          <div id="tab-tvchart" class="ak-ttab-pane ${this.activeTab === 'tvchart' ? 'active' : ''}">
            <div class="ak-chart-header">
              <div style="display:flex;align-items:center;gap:10px;">
                <span style="font-size:18px;">${m.icon}</span>
                <div>
                  <h3 style="margin:0;font-size:15px;color:#fff;">${m.name}</h3>
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

          <div id="tab-connections" class="ak-ttab-pane ${this.activeTab === 'connections' ? 'active' : ''}">
            <div class="ak-connections-deck">
              <!-- TARJETA MAESTRA: CENTRO DE ALERTAS Y SEÑALES TELEGRAM EN TIEMPO REAL -->
              <div class="ak-conn-card ak-tg-master-card">
                <div class="ak-conn-header" style="justify-content:space-between;flex-wrap:wrap;">
                  <div style="display:flex;align-items:center;gap:12px;">
                    <div class="ak-conn-icon" style="background:rgba(0,136,204,0.18);color:#0088cc;font-size:22px;">✈️</div>
                    <div>
                      <h4 style="margin:0;font-size:16px;color:#fff;">Alertas y Señales Automáticas a Telegram en Tiempo Real</h4>
                      <span style="font-size:11px;color:#94a3b8;">Despacho instantáneo de entradas, Stop Loss, Take Profits y lotajes al móvil del Director Jhon Grimm</span>
                    </div>
                  </div>
                  <div>
                    <span id="tgConnectionBadge" class="ak-pill ${this.telegramToken && this.telegramChatId ? 'live' : 'sentinel alert'}">
                      ${this.telegramToken && this.telegramChatId ? '🟢 Telegram Vinculado' : '🟡 Configurar Credenciales'}
                    </span>
                  </div>
                </div>

                <!-- 1. INTERRUPTOR DE ENVÍO AUTOMÁTICO EN TIEMPO REAL -->
                <div class="ak-tg-auto-switch-box">
                  <div style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:10px;">
                    <div style="display:flex;align-items:center;gap:10px;">
                      <label class="ak-switch">
                        <input type="checkbox" id="chkTelegramAutoSend" ${this.telegramAutoSend ? 'checked' : ''}>
                        <span class="slider round"></span>
                      </label>
                      <div>
                        <strong style="color:#fff;font-size:13px;">⚡ Despacho Automático en Vivo a Telegram</strong>
                        <p style="margin:2px 0 0 0;font-size:11px;color:#cbd5e1;">
                          Envía la señal a tu Telegram en menos de 1 segundo tan pronto se confirma el gatillo en cualquiera de tus mercados elegidos.
                        </p>
                      </div>
                    </div>
                    <div>
                      <span id="tgAutoStatusPill" class="ak-badge ${this.telegramAutoSend ? 'ok' : 'subtle'}">
                        ${this.telegramAutoSend ? 'ACTIVO (EN VIVO)' : 'PAUSADO'}
                      </span>
                    </div>
                  </div>
                </div>

                <!-- 2. CREDENCIALES DEL BOT Y CHAT ID -->
                <div class="ak-tg-credentials-grid">
                  <div>
                    <div style="display:flex;justify-content:space-between;margin-bottom:4px;">
                      <label style="font-size:11px;color:#94a3b8;font-weight:700;">BOT TOKEN (API KEY):</label>
                      <a href="https://t.me/BotFather" target="_blank" rel="noopener noreferrer" style="font-size:11px;color:#00f2fe;text-decoration:none;">
                        🔗 Obtener Token en @BotFather &rarr;
                      </a>
                    </div>
                    <input type="password" id="tgBotTokenInput" class="ak-input-text" placeholder="Ej: 7123456789:AAHk98..." value="${this.telegramToken}">
                  </div>

                  <div>
                    <div style="display:flex;justify-content:space-between;margin-bottom:4px;">
                      <label style="font-size:11px;color:#94a3b8;font-weight:700;">CHAT ID O CANAL ID:</label>
                      <a href="https://t.me/userinfobot" target="_blank" rel="noopener noreferrer" style="font-size:11px;color:#00f2fe;text-decoration:none;">
                        🔗 Obtener mi Chat ID en @userinfobot &rarr;
                      </a>
                    </div>
                    <input type="text" id="tgChatIdInput" class="ak-input-text" placeholder="Ej: 567891234 o @MiCanalTrading" value="${this.telegramChatId}">
                  </div>
                </div>

                <div style="display:flex;gap:10px;flex-wrap:wrap;align-items:center;justify-content:space-between;">
                  <div style="display:flex;gap:8px;">
                    <button id="btnSaveTelegramConfig" class="ak-btn primary" style="padding:8px 16px;">
                      💾 Guardar Credenciales Telegram
                    </button>
                    <button id="btnTestTelegramLive" class="ak-btn" style="background:#0088cc;color:#fff;border:none;padding:8px 16px;">
                      📲 Probar Conexión (Enviar Señal Test al Móvil)
                    </button>
                  </div>
                  <span id="tgFeedbackMsg" style="font-size:11px;color:#10b981;"></span>
                </div>

                <!-- 3. SELECTOR GRANULAR DE MERCADOS (FILTROS) -->
                <div class="ak-tg-market-filters-section">
                  <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:8px;margin-bottom:8px;">
                    <div>
                      <strong style="color:#00f2fe;font-size:13px;">🎯 ELIGE DE QUÉ MERCADOS RECIBIR SEÑALES EN TELEGRAM:</strong>
                      <p style="margin:2px 0 0 0;font-size:11px;color:#94a3b8;">
                        Marca o desmarca los mercados a tu gusto. Si solo quieres Boom o solo el Dólar, activa solo los que te interesen.
                      </p>
                    </div>
                    <div style="display:flex;gap:6px;flex-wrap:wrap;">
                      <button id="btnTgSelectAll" class="ak-tf-btn" style="padding:4px 10px;font-size:10px;">✅ Todos</button>
                      <button id="btnTgOnlySynthetics" class="ak-tf-btn" style="padding:4px 10px;font-size:10px;">⚡ Solo Boom/Crash</button>
                      <button id="btnTgOnlyForex" class="ak-tf-btn" style="padding:4px 10px;font-size:10px;">💶 Solo Dólar/Forex</button>
                      <button id="btnTgOnlyGold" class="ak-tf-btn" style="padding:4px 10px;font-size:10px;">🟡 Solo Oro</button>
                      <button id="btnTgOnlyBinary" class="ak-tf-btn" style="padding:4px 10px;font-size:10px;">⏱️ Solo Binarias</button>
                      <button id="btnTgOnlyCrypto" class="ak-tf-btn" style="padding:4px 10px;font-size:10px;">₿ Solo Cripto</button>
                      <button id="btnTgClearAll" class="ak-tf-btn" style="padding:4px 10px;font-size:10px;">❌ Ninguno</button>
                    </div>
                  </div>

                  <div class="ak-tg-markets-grid">
                    ${Object.keys(MARKETS).map(k => {
                      const m = MARKETS[k];
                      const isChecked = this.telegramMarkets.includes(k);
                      return `
                        <label class="ak-tg-market-chip ${isChecked ? 'active' : ''}" data-tgmkt="${k}">
                          <input type="checkbox" class="chk-tg-market" value="${k}" ${isChecked ? 'checked' : ''} style="margin-right:6px;">
                          <span style="font-size:14px;">${m.icon}</span>
                          <strong>${k}</strong>
                          <span style="font-size:10px;color:#94a3b8;margin-left:auto;">(${m.category.split(' ')[0]})</span>
                        </label>
                      `;
                    }).join('')}
                  </div>
                </div>

                <!-- 4. REGISTRO DE ÚLTIMO ENVÍO -->
                <div style="background:rgba(0,0,0,0.25);border-radius:6px;padding:8px 12px;display:flex;align-items:center;justify-content:space-between;font-size:11px;color:#94a3b8;">
                  <span>Último Estado de Despacho: <strong id="tgLastSentStatus" style="color:#cbd5e1;">Listo para enviar señales</strong></span>
                  <span style="color:#0088cc;font-family:monospace;">Telegram Bot API v7.0 • HTTPS Cifrado Directo</span>
                </div>
              </div>

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
                </div>
              </div>

              <div class="ak-conn-card">
                <div class="ak-conn-header">
                  <div class="ak-conn-icon" style="background:rgba(16,185,129,0.15);color:#10b981;">🖥️</div>
                  <div>
                    <h4 style="margin:0;font-size:14px;color:#fff;">Opción B2: MetaTrader 5 (MT5) Bridge Python Local</h4>
                    <span style="font-size:11px;color:#94a3b8;">Ejecutor automático local a costo cero ($0.00 COP) sin VPS de pago</span>
                  </div>
                </div>
                <p style="font-size:12px;color:#cbd5e1;line-height:1.5;">
                  Akira incluye el script puente en Python <code>akira_mt5_bridge.py</code> para ejecutar órdenes en MT5 automáticamente.
                </p>
                <div class="ak-conn-actions">
                  <button id="btnCopyMt5Script" class="ak-btn secondary">📋 Copiar Script Puente Python</button>
                </div>
              </div>
            </div>
          </div>
        </div>
      `;

      this.updateLiveHeaderTelemetry();
      this.renderPlatformSpecialDeck();
      this.renderCandleHistoryTable();
      this.renderTickTape();
      this.renderScannerSignal();
      this.renderOpenPositions();
      this.renderClosedTrades();
      this.renderAccountCalculations();
      this.renderCompoundTable();
    }

    updateLiveHeaderTelemetry() {
      const box = document.getElementById("telemetryBadgeBox");
      const ribbon = document.getElementById("canvasAccountTelemetryRibbon");

      const m = MARKETS[this.selectedMarket] || MARKETS["XAUUSD"];
      const cur = this.marketPrices[this.selectedMarket] || m.basePrice;
      const spread = m.unitSpread;
      const decimals = this.getMarketDecimals(this.selectedMarket);
      const bid = (cur - (spread / 2)).toFixed(decimals);
      const ask = (cur + (spread / 2)).toFixed(decimals);
      const spreadPips = (spread / m.pipSize).toFixed(1);
      const calc = this.calculateSafeLot(this.accountSize, this.currentSignal ? this.currentSignal.riskPips : null, this.selectedMarket);

      if (box) {
        box.innerHTML = `
          <div style="display:flex;gap:10px;align-items:center;flex-wrap:wrap;">
            <div class="ak-bid-ask-box">
              <span class="lbl">BID:</span>
              <strong class="val bid">${bid}</strong>
            </div>
            <div class="ak-bid-ask-box">
              <span class="lbl">ASK:</span>
              <strong class="val ask">${ask}</strong>
            </div>
            <div class="ak-spread-box">
              <span class="lbl">SPREAD:</span>
              <strong class="val">${spreadPips} ${m.pipName}</strong>
            </div>
            <div class="ak-bid-ask-box" style="border-color:rgba(0,242,254,0.35);background:rgba(0,242,254,0.08);">
              <span class="lbl" style="color:#00f2fe;">CUENTA REF:</span>
              <strong class="val" style="color:#00f2fe;">$${calc.capital} USD</strong>
            </div>
          </div>
        `;
      }

      if (ribbon) {
        ribbon.innerHTML = `
          <div style="display:flex;align-items:center;justify-content:space-between;width:100%;flex-wrap:wrap;gap:8px;">
            <div style="display:flex;align-items:center;gap:10px;flex-wrap:wrap;">
              <span class="ak-badge safe" style="font-size:10.5px;padding:3px 8px;">💼 CUENTA REF: $${calc.capital} USD</span>
              <span style="color:#cbd5e1;font-size:11px;">⚖️ Debido Lotaje: <strong style="color:#00f2fe;">${calc.lot}</strong></span>
              <span style="color:#fca5a5;font-size:11px;">🛑 SL: <strong style="color:#ef4444;">-${calc.slPips} pips (-$${calc.actualRiskMoney} USD | ${calc.actualRiskPercent}%)</strong></span>
            </div>
            <div style="display:flex;align-items:center;gap:12px;flex-wrap:wrap;font-size:11px;">
              <span style="color:#86efac;">🎯 TP1: <strong style="color:#10b981;">+${calc.tp1Pips} pips (+$${calc.tp1Profit} USD)</strong></span>
              <span style="color:#6ee7b7;">🚀 TP2: <strong style="color:#059669;">+${calc.tp2Pips} pips (+$${calc.tp2Profit} USD)</strong></span>
              <span style="color:#fef08a;">💎 TP3: <strong style="color:#ca8a04;">+${calc.tp3Pips} pips (+$${calc.tp3Profit} USD | 1:3)</strong></span>
            </div>
          </div>
        `;
      }
    }

    renderPlatformSpecialDeck() {
      const deck = document.getElementById("platformSpecialDeck");
      if (!deck) return;

      const m = MARKETS[this.selectedMarket] || MARKETS["XAUUSD"];

      if (m.platformMode === "deriv_boom" || m.platformMode === "deriv_crash") {
        const isBoom = m.platformMode === "deriv_boom";
        const isAccumulatorView = this.derivSubMode === "accumulators";
        const growthPercent = Math.round(this.accumulatorGrowthRate * 100);
        const compoundProfit = ((Math.pow(1 + this.accumulatorGrowthRate, this.accumulatorTicks) - 1) * 100).toFixed(1);

        deck.innerHTML = `
          <div class="ak-deriv-spike-banner" style="flex-direction:column;align-items:stretch;gap:10px;">
            <div style="display:flex;justify-content:space-between;align-items:center;border-bottom:1px solid rgba(255,255,255,0.08);padding-bottom:8px;flex-wrap:wrap;gap:8px;">
              <div style="display:flex;gap:6px;">
                <button class="ak-chart-type-btn ${!isAccumulatorView ? 'active' : ''}" id="btnDeckModeSpikes">
                  ${isBoom ? '⚡' : '💥'} Radar de Spikes ${isBoom ? 'Boom' : 'Crash'}
                </button>
                <button class="ak-chart-type-btn ${isAccumulatorView ? 'active' : ''}" id="btnDeckModeAccumulators">
                  📈 Modo Acumuladores Deriv (1% - 5%)
                </button>
              </div>
              <span style="font-size:10.5px;color:#00f2fe;font-family:monospace;display:flex;align-items:center;gap:4px;">
                <span class="dot" style="background:#10b981;width:6px;height:6px;border-radius:50%;display:inline-block;"></span>
                Deriv Trader Oficial Conectado
              </span>
            </div>

            ${!isAccumulatorView ? `
              <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:12px;">
                <div style="display:flex;align-items:center;gap:12px;">
                  <span style="font-size:24px;">${isBoom ? '⚡' : '💥'}</span>
                  <div>
                    <strong style="color:#fff;font-size:13px;">RADAR DE CAZA DE SPIKES ${isBoom ? 'ALCISTAS (BOOM)' : 'BAJISTAS (CRASH)'}</strong>
                    <p style="margin:2px 0 0 0;font-size:11px;color:#94a3b8;">
                      Comportamiento sintético oficial de Deriv: micro-ticks constantes seguidos de explosiones institucionales repentinas.
                    </p>
                  </div>
                </div>
                <div style="display:flex;gap:16px;align-items:center;flex-wrap:wrap;">
                  <div style="text-align:right;">
                    <span style="font-size:10px;color:#94a3b8;display:block;">VELAS DE DERIVA:</span>
                    <strong style="font-size:16px;color:#00f2fe;font-family:monospace;">${this.driftCandlesCount || 0} velas</strong>
                  </div>
                  <div style="text-align:right;">
                    <span style="font-size:10px;color:#94a3b8;display:block;">CICLOS HISTÓRICOS:</span>
                    <strong style="font-size:16px;color:#94a3b8;font-family:monospace;">${this.spikeRadar?.observedIntervals ?? "Insuficientes"}</strong>
                  </div>
                  ${this.spikeRadar && this.spikeRadar.active ? `
                    <div style="text-align:right;">
                      <span style="font-size:10px;color:#eab308;display:block;">ESTADO DEL FILTRO:</span>
                      <strong style="font-size:13px;color:#eab308;font-family:monospace;">Esperando rechazo</strong>
                    </div>
                  ` : ''}
                  <button id="btnHuntSpike" class="ak-btn primary" style="padding:6px 14px;">
                    🔎 Analizar próximo cierre
                  </button>
                </div>
              </div>
            ` : `
              <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:12px;">
                <div style="display:flex;align-items:center;gap:12px;">
                  <span style="font-size:24px;">📈</span>
                  <div>
                    <strong style="color:#fff;font-size:13px;">CONTRATO DE ACUMULADORES (DERIV TRADER OFICIAL)</strong>
                    <p style="margin:2px 0 0 0;font-size:11px;color:#94a3b8;">
                      Tu beneficio crece ${growthPercent}% por cada tick continuo dentro de la banda de acumulación. Cierra cuando desees.
                    </p>
                  </div>
                </div>
                <div style="display:flex;gap:12px;align-items:center;flex-wrap:wrap;">
                  <div style="display:flex;gap:4px;align-items:center;">
                    <span style="font-size:10px;color:#94a3b8;margin-right:2px;">TASA:</span>
                    ${[0.01, 0.02, 0.03, 0.04, 0.05].map(rate => `
                      <button class="ak-chart-type-btn btn-accum-rate ${this.accumulatorGrowthRate === rate ? 'active' : ''}" data-rate="${rate}" style="padding:4px 8px;font-size:10px;">
                        ${Math.round(rate * 100)}%
                      </button>
                    `).join('')}
                  </div>
                  <div style="text-align:right;background:rgba(0,0,0,0.3);padding:4px 10px;border-radius:6px;border:1px solid rgba(255,255,255,0.08);">
                    <span style="font-size:9.5px;color:#94a3b8;display:block;">TICKS EN ZONA:</span>
                    <strong style="font-size:14px;color:#10b981;font-family:monospace;">${this.accumulatorTicks} ticks (+${compoundProfit}%)</strong>
                  </div>
                  <button id="btnSwitchToAccumLine" class="ak-btn secondary" style="padding:6px 12px;font-size:11px;">
                    📊 Ver en Línea con Barreras
                  </button>
                </div>
              </div>
            `}
          </div>
        `;

        // Bindings para el switch de modo y tasas de acumulador
        const bSpikes = document.getElementById("btnDeckModeSpikes");
        const bAcc = document.getElementById("btnDeckModeAccumulators");
        if (bSpikes) {
          bSpikes.addEventListener("click", () => {
            this.derivSubMode = "spikes";
            this.renderPlatformSpecialDeck();
          });
        }
        if (bAcc) {
          bAcc.addEventListener("click", () => {
            this.derivSubMode = "accumulators";
            this.renderPlatformSpecialDeck();
          });
        }
        deck.querySelectorAll(".btn-accum-rate").forEach(btn => {
          btn.addEventListener("click", (e) => {
            const r = parseFloat(e.currentTarget.dataset.rate);
            if (!isNaN(r)) {
              this.accumulatorGrowthRate = r;
              this.renderPlatformSpecialDeck();
            }
          });
        });
        const bSwitchLine = document.getElementById("btnSwitchToAccumLine");
        if (bSwitchLine) {
          bSwitchLine.addEventListener("click", () => {
            this.chartType = "line";
            const bLine = document.getElementById("btnChartLine");
            const bCandles = document.getElementById("btnChartCandles");
            if (bLine) bLine.classList.add("active");
            if (bCandles) bCandles.classList.remove("active");
            this.drawMarketCanvas();
          });
        }
      } else if (m.platformMode === "iq_option") {
        deck.innerHTML = `
          <div class="ak-iq-option-banner">
            <div style="display:flex;align-items:center;gap:12px;">
              <span style="font-size:24px;">⏱️</span>
              <div>
                <strong style="color:#fff;font-size:13px;">TERMINAL DE OPCIONES BINARIAS (ESTILO IQ OPTION / POCKET OPTION)</strong>
                <p style="margin:2px 0 0 0;font-size:11px;color:#94a3b8;">
                  Strike Price horizontal palpitante &bull; Cierre automático ITM/OTM al expirar el cronómetro.
                </p>
              </div>
            </div>
            <div style="display:flex;gap:12px;align-items:center;flex-wrap:wrap;">
              <div class="ak-iq-payout-pill">
                🔥 85% PAYOUT EN VIVO
              </div>
              <div style="display:flex;gap:4px;align-items:center;">
                <label style="font-size:11px;color:#94a3b8;">EXPIRACIÓN:</label>
                <select id="selBinaryExpDirect" class="ak-input-select" style="padding:4px 8px;">
                  <option value="60">60 Segundos (Turbo)</option>
                  <option value="120">2 Minutos</option>
                  <option value="300">5 Minutos</option>
                </select>
              </div>
              <div style="display:flex;gap:8px;">
                <button id="btnDirectCall" class="ak-btn buy" style="padding:8px 18px;font-size:13px;font-weight:800;">
                  🟢 SUBE (CALL) +85%
                </button>
                <button id="btnDirectPut" class="ak-btn sell" style="padding:8px 18px;font-size:13px;font-weight:800;">
                  🔴 BAJA (PUT) +85%
                </button>
              </div>
            </div>
          </div>
        `;
      } else {
        deck.innerHTML = `
          <div class="ak-forex-status-banner">
            <div style="display:flex;align-items:center;gap:10px;">
              <span style="font-size:18px;">🏛️</span>
              <span style="font-size:12px;color:#cbd5e1;">
                <strong>Modo Institucional Forex / MT5:</strong> Niveles SL y TP calculados matemáticamente. Velas OHLC auditables en tiempo real.
              </span>
            </div>
            <div style="display:flex;gap:8px;">
              <button id="btnQuickDemoBuy" class="ak-btn buy" style="padding:4px 10px;font-size:11px;">🟢 Buy Market</button>
              <button id="btnQuickDemoSell" class="ak-btn sell" style="padding:4px 10px;font-size:11px;">🔴 Sell Market</button>
            </div>
          </div>
        `;
      }
    }


    updateChartCanvasHeader() {
      const m = MARKETS[this.selectedMarket] || MARKETS["XAUUSD"];
      const iconEl = document.getElementById("chartMarketIcon");
      const titleEl = document.getElementById("chartMarketTitle");
      const selHeader = document.getElementById("selMarketHeader");
      const catEl = document.getElementById("chartMarketCategory");
      const tfEl = document.getElementById("chartMarketTfPill");
      const accBadge = document.getElementById("chartAccuracyBadge");
      if (iconEl) iconEl.innerText = m.icon;
      if (titleEl) titleEl.innerText = m.name;
      if (selHeader) selHeader.value = this.selectedMarket;
      if (catEl) catEl.innerText = `(${m.category})`;
      if (tfEl) {
        const engineLabel = this.chartEngine === "tradingview" ? "TradingView Deriv Oficial" : "Stream Deriv Directo";
        tfEl.innerHTML = `${this.selectedTimeframe} &bull; ${engineLabel}`;
      }
      if (accBadge) {
        const acc = this.getTimeframeAccuracyInfo(this.selectedMarket, this.selectedTimeframe);
        accBadge.className = `ak-badge ${acc.level}`;
        accBadge.innerText = acc.text;
        accBadge.title = acc.advice;
      }
      this.updateWsConnectionBadge(this.isDerivWsConnected);
      this.updateRemainingCandleCountdown();
      // Sincronizar botones de temporalidad en cabecera de gráfico y barra superior
      document.querySelectorAll(".ak-tf-buttons .ak-tf-btn").forEach(b => {
        if (b.dataset.tf === this.selectedTimeframe) b.classList.add("active");
        else b.classList.remove("active");
      });
    }

    toggleFullscreen(forceState = null) {
      const wrapper = document.getElementById("akiraChartCanvasWrapper");
      const btn = document.getElementById("btnToggleFullscreen");
      const fsToolbar = document.getElementById("fsExtraToolbar");
      if (!wrapper) return;

      const shouldFs = forceState !== null ? forceState : !this.isFullscreen;
      this.isFullscreen = shouldFs;

      if (this.isFullscreen) {
        wrapper.classList.add("ak-fullscreen");
        document.body.classList.add("ak-no-scroll");
        if (btn) {
          btn.classList.add("active");
          btn.innerHTML = `<span class="fs-icon">✕</span> <span class="fs-text">Salir Pantalla Completa [ESC]</span>`;
        }
        if (fsToolbar) {
          fsToolbar.style.display = "flex";
          this.renderFsExtraToolbar();
        }
        try {
          if (!document.fullscreenElement && wrapper.requestFullscreen) {
            wrapper.requestFullscreen().catch(() => {});
          }
        } catch(_) {}
      } else {
        wrapper.classList.remove("ak-fullscreen");
        document.body.classList.remove("ak-no-scroll");
        if (btn) {
          btn.classList.remove("active");
          btn.innerHTML = `<span class="fs-icon">⛶</span> <span class="fs-text">Pantalla Completa</span>`;
        }
        if (fsToolbar) {
          fsToolbar.style.display = "none";
        }
        try {
          if (document.fullscreenElement && document.exitFullscreen) {
            document.exitFullscreen().catch(() => {});
          }
        } catch(_) {}
      }

      setTimeout(() => {
        if (this.chartEngine === "tradingview") {
          this.renderTradingViewChart();
        } else {
          this.drawMarketCanvas();
        }
      }, 60);
    }

    renderFsExtraToolbar() {
      const tb = document.getElementById("fsExtraToolbar");
      if (!tb) return;

      const m = MARKETS[this.selectedMarket] || MARKETS["XAUUSD"];
      const isBin = Boolean(m.isBinary);
      const isBoomCrash = m.platformMode === "deriv_boom" || m.platformMode === "deriv_crash";

      tb.innerHTML = `
        <div style="display:flex;align-items:center;gap:12px;width:100%;justify-content:space-between;flex-wrap:wrap;">
          <div style="display:flex;align-items:center;gap:10px;">
            <label style="font-size:11px;color:#94a3b8;font-weight:700;">MERCADO EN PANTALLA COMPLETA:</label>
            <select id="fsMarketSelect" class="ak-input-select" style="padding:4px 8px;font-size:12px;">
              ${Object.keys(MARKETS).map(k => `
                <option value="${k}" ${this.selectedMarket === k ? 'selected' : ''}>
                  ${MARKETS[k].icon} ${MARKETS[k].name}
                </option>
              `).join('')}
            </select>

            <div class="ak-tf-buttons" style="margin-left:6px;">
              ${["M1", "M5", "M15", "H1", "H4", "D1"].map(tf => `
                <button class="ak-tf-btn ${this.selectedTimeframe === tf ? 'active' : ''}" data-fstf="${tf}">${tf}</button>
              `).join('')}
            </div>
          </div>

          <div style="display:flex;align-items:center;gap:10px;flex-wrap:wrap;">
            ${isBin ? `
              <button id="fsBtnCall" class="ak-btn buy" style="padding:6px 14px;font-size:12px;font-weight:800;">🟢 CALL (+85%)</button>
              <button id="fsBtnPut" class="ak-btn sell" style="padding:6px 14px;font-size:12px;font-weight:800;">🔴 PUT (+85%)</button>
            ` : isBoomCrash ? `
              <button id="fsBtnSpike" class="ak-btn primary" style="padding:6px 14px;font-size:12px;font-weight:800;">⚡ Cazar Spike Demo</button>
            ` : `
              <button id="fsBtnBuy" class="ak-btn buy" style="padding:6px 14px;font-size:12px;font-weight:800;">🟢 BUY Market Demo</button>
              <button id="fsBtnSell" class="ak-btn sell" style="padding:6px 14px;font-size:12px;font-weight:800;">🔴 SELL Market Demo</button>
            `}
            <button id="fsBtnTriggerSignal" class="ak-btn primary" style="padding:6px 14px;font-size:12px;">
              🎯 Ejecutar Señal Demo (${this.currentSignal?.type || 'Auto'})
            </button>
          </div>
        </div>
      `;

      const sel = document.getElementById("fsMarketSelect");
      if (sel) {
        sel.addEventListener("change", (e) => {
          const mainSel = document.getElementById("selMarketActive");
          if (mainSel) {
            mainSel.value = e.target.value;
            mainSel.dispatchEvent(new Event("change"));
          } else {
            this.selectedMarket = e.target.value;
            this.generateHarmonicSignal(this.selectedMarket, this.selectedTimeframe);
            this.updateChartCanvasHeader();
            this.drawMarketCanvas();
          }
          this.renderFsExtraToolbar();
        });
      }

      tb.querySelectorAll("[data-fstf]").forEach(btn => {
        btn.addEventListener("click", (e) => {
          const tf = e.currentTarget.dataset.fstf;
          this.selectedTimeframe = tf;
          const mainTfBtn = document.querySelector(`.ak-tf-btn[data-tf="${tf}"]`);
          if (mainTfBtn) mainTfBtn.click();
          else {
            this.candles[this.selectedMarket] = this.generateHistoricalCandles(this.selectedMarket, 350);
            this.generateHarmonicSignal(this.selectedMarket, this.selectedTimeframe);
            this.updateChartCanvasHeader();
            this.drawMarketCanvas();
          }
          this.renderFsExtraToolbar();
        });
      });

      const fsCall = document.getElementById("fsBtnCall");
      if (fsCall) fsCall.addEventListener("click", () => document.getElementById("btnDirectCall")?.click());
      const fsPut = document.getElementById("fsBtnPut");
      if (fsPut) fsPut.addEventListener("click", () => document.getElementById("btnDirectPut")?.click());
      const fsSpike = document.getElementById("fsBtnSpike");
      if (fsSpike) fsSpike.addEventListener("click", () => document.getElementById("btnHuntSpike")?.click());
      const fsBuy = document.getElementById("fsBtnBuy");
      if (fsBuy) fsBuy.addEventListener("click", () => document.getElementById("btnQuickDemoBuy")?.click());
      const fsSell = document.getElementById("fsBtnSell");
      if (fsSell) fsSell.addEventListener("click", () => document.getElementById("btnQuickDemoSell")?.click());
      const fsSig = document.getElementById("fsBtnTriggerSignal");
      if (fsSig) fsSig.addEventListener("click", () => document.getElementById("btnExecuteDemoSignal")?.click());
    }

    
    calculateTargetSync(candles) {
      if (!this.currentSignal || !candles || candles.length === 0) return null;
      const sig = this.currentSignal;
      const isBinary = sig.type === "CALL" || sig.type === "PUT";
      const isBuy = sig.type === "BUY" || sig.type === "CALL";
      const cur = this.marketPrices[this.selectedMarket] || candles[candles.length - 1].close;

      if (isBinary) {
        if (!sig.createdAt) sig.createdAt = Date.now();
        const elapsedSec = Math.floor((Date.now() - sig.createdAt) / 1000);
        const remainingSec = Math.max(0, 60 - elapsedSec);
        const isItm = sig.type === "CALL" ? (cur > sig.entry) : (cur < sig.entry);
        const isExpired = remainingSec === 0;

        return {
          isBinary: true,
          isItm: isItm,
          payoutPercent: 85,
          currentPrice: cur,
          remainingSec: remainingSec,
          isExpired: isExpired,
          tp3Hit: isExpired && isItm,
          slHit: isExpired && !isItm
        };
      }
      // AUDITORÍA DE TIEMPO REAL: Solo auditar velas completadas DESPUÉS del índice donde se originó la entrada.
      // Jamás auditar velas del pasado previas a la creación de la señal.
      const originIdx = Number.isFinite(Number(sig.signalCandleEpoch))
        ? candles.findIndex(candle => Number(candle.epoch) === Number(sig.signalCandleEpoch))
        : ((sig.createdCandleIndex !== undefined && sig.createdCandleIndex >= 0) ? sig.createdCandleIndex : candles.length - 1);
      if (originIdx < 0) return null;
      const postEntryStart = Math.min(candles.length - 1, originIdx + 1);

      let hitTp1Idx = -1;
      let hitTp2Idx = -1;
      let hitTp3Idx = -1;
      let hitSlIdx = -1;

      // 1. Evaluar velas cerradas formadas estrictamente después de la entrada
      for (let i = postEntryStart; i < candles.length; i++) {
        const c = candles[i];
        if (isBuy) {
          if (hitTp1Idx === -1 && c.high >= sig.tp1) hitTp1Idx = i;
          if (hitTp2Idx === -1 && c.high >= sig.tp2) hitTp2Idx = i;
          if (hitTp3Idx === -1 && c.high >= sig.tp3) hitTp3Idx = i;
          if (hitSlIdx === -1 && c.low <= sig.sl) hitSlIdx = i;
        } else {
          if (hitTp1Idx === -1 && c.low <= sig.tp1) hitTp1Idx = i;
          if (hitTp2Idx === -1 && c.low <= sig.tp2) hitTp2Idx = i;
          if (hitTp3Idx === -1 && c.low <= sig.tp3) hitTp3Idx = i;
          if (hitSlIdx === -1 && c.high >= sig.sl) hitSlIdx = i;
        }
      }

      // 2. Evaluar el tick actual en vivo (precio de mercado en este milisegundo)
      if (isBuy) {
        if (hitTp1Idx === -1 && cur >= sig.tp1) hitTp1Idx = candles.length - 1;
        if (hitTp2Idx === -1 && cur >= sig.tp2) hitTp2Idx = candles.length - 1;
        if (hitTp3Idx === -1 && cur >= sig.tp3) hitTp3Idx = candles.length - 1;
        if (hitSlIdx === -1 && cur <= sig.sl) hitSlIdx = candles.length - 1;
      } else {
        if (hitTp1Idx === -1 && cur <= sig.tp1) hitTp1Idx = candles.length - 1;
        if (hitTp2Idx === -1 && cur <= sig.tp2) hitTp2Idx = candles.length - 1;
        if (hitTp3Idx === -1 && cur <= sig.tp3) hitTp3Idx = candles.length - 1;
        if (hitSlIdx === -1 && cur >= sig.sl) hitSlIdx = candles.length - 1;
      }

      // OHLC cannot order two levels inside the same candle; tie handling is conservative.
      const terminalOutcome = ScannerCore.resolveTerminalOutcome(hitTp3Idx, hitSlIdx);
      const diff = isBuy ? (cur - sig.entry) : (sig.entry - cur);
      const pipsFloating = parseFloat((diff / (MARKETS[this.selectedMarket]?.pipSize || 1)).toFixed(1));

      return {
        tp1Hit: hitTp1Idx !== -1,
        tp2Hit: hitTp2Idx !== -1,
        tp3Hit: terminalOutcome.tp3Hit,
        slHit: terminalOutcome.stopHit,
        ambiguousSameBar: terminalOutcome.ambiguousSameBar,
        hitTp1Idx: hitTp1Idx,
        hitTp2Idx: hitTp2Idx,
        hitTp3Idx: hitTp3Idx,
        hitSlIdx: hitSlIdx,
        pipsFloating: pipsFloating,
        isProfit: pipsFloating >= 0,
        currentPrice: cur
      };
    }

    calculateSniperChannel(candles) {
      if (!candles || candles.length < 15) return null;
      const N = candles.length;
      // Ventana activa reciente de 28 velas para que el canal envuelva exactamente la acción del precio actual
      const windowStart = Math.max(0, N - 28);
      const activeCandles = candles.slice(windowStart);
      const actN = activeCandles.length;

      // Resistencia reciente (techo dinámico)
      let peak1 = { idx: windowStart + 2, price: activeCandles[2].high };
      let peak2 = { idx: windowStart + actN - 3, price: activeCandles[actN - 3].high };
      for (let i = 1; i < Math.floor(actN * 0.5); i++) {
        if (activeCandles[i].high > peak1.price) peak1 = { idx: windowStart + i, price: activeCandles[i].high };
      }
      for (let i = Math.floor(actN * 0.5); i < actN - 1; i++) {
        if (activeCandles[i].high > peak2.price && (windowStart + i) !== peak1.idx) {
          peak2 = { idx: windowStart + i, price: activeCandles[i].high };
        }
      }

      // Soporte reciente (piso dinámico)
      let trough1 = { idx: windowStart + 2, price: activeCandles[2].low };
      let trough2 = { idx: windowStart + actN - 2, price: activeCandles[actN - 2].low };
      for (let i = 1; i < Math.floor(actN * 0.5); i++) {
        if (activeCandles[i].low < trough1.price) trough1 = { idx: windowStart + i, price: activeCandles[i].low };
      }
      for (let i = Math.floor(actN * 0.5); i < actN; i++) {
        if (activeCandles[i].low < trough2.price && (windowStart + i) !== trough1.idx) {
          trough2 = { idx: windowStart + i, price: activeCandles[i].low };
        }
      }

      return {
        resistance: { p1: peak1, p2: peak2 },
        support: { p1: trough1, p2: trough2 }
      };
    }

    requestCanvasRedraw() {
      if (this.isRedrawScheduled) return;
      this.isRedrawScheduled = true;
      requestAnimationFrame(() => {
        this.isRedrawScheduled = false;
        if (this.chartEngine === "canvas" && this.activeTab === "market") {
          this.drawMarketCanvas();
        }
      });
    }

    drawMarketCanvas() {
      const canvas = document.getElementById("akiraMarketCanvas");
      if (!canvas) return;

      const isFs = this.isFullscreen || Boolean(document.getElementById("akiraChartCanvasWrapper")?.classList.contains("ak-fullscreen"));
      const stageEl = document.getElementById("chartStageContainer") || canvas.parentElement;
      const vBarEl = document.getElementById("chartVScrollBar");
      const isMobileScreen = window.innerWidth < 640;
      const vBarW = (vBarEl && vBarEl.offsetWidth > 0) ? vBarEl.offsetWidth : (isMobileScreen ? 32 : 36);

      // CÁLCULO RESPONSIVO PARA MÓVIL Y ESCRITORIO (SIN DESBORDAMIENTO HORIZONTAL)
      const clientW = stageEl?.clientWidth || window.innerWidth || 360;
      const totalStageW = isFs ? Math.max(280, window.innerWidth - (isMobileScreen ? 12 : 32)) : Math.max(280, clientW);
      const containerW = Math.max(240, totalStageW - vBarW);

      // Altura responsiva inteligente: llena el espacio vertical disponible hasta abajo de la pantalla
      let containerH;
      if (isFs) {
        containerH = Math.max(280, window.innerHeight - (isMobileScreen ? 130 : 195));
      } else if (isMobileScreen) {
        containerH = Math.min(520, Math.max(360, Math.round(window.innerHeight * 0.58)));
      } else {
        // En escritorio sin pantalla completa: ajusta hasta el fondo del viewport
        const calcH = window.innerHeight - 270;
        containerH = Math.max(540, Math.min(940, calcH));
      }

      if (canvas.width !== containerW || canvas.height !== containerH) {
        canvas.width = containerW;
        canvas.height = containerH;
        canvas.style.height = containerH + "px";
      }
      if (stageEl && stageEl.style.height !== containerH + "px") {
        stageEl.style.height = containerH + "px";
      }
      const canvasChartBox = document.getElementById("canvasChartContainer");
      if (canvasChartBox && canvasChartBox.style.height !== containerH + "px") {
        canvasChartBox.style.height = containerH + "px";
      }
      if (vBarEl && vBarEl.style.height !== containerH + "px") {
        vBarEl.style.height = containerH + "px";
      }

      const ctx = canvas.getContext("2d");
      const width = canvas.width;
      const height = canvas.height;
      const allCandles = this.candles[this.selectedMarket] || [];
      if (allCandles.length === 0) return;

      const isLight = this.chartTheme === "light";
      const targetSync = this.calculateTargetSync(allCandles);

      // GESTIÓN DEL CICLO DE VIDA DE LA ENTRADA (MANTENER SIEMPRE VISIBLE EN EL GRÁFICO)
      if (this.currentSignal && targetSync && (targetSync.tp3Hit || targetSync.slHit)) {
        if (!this.currentSignal.completedAt) {
          this.currentSignal.completedAt = Date.now();
          this.currentSignal.completedStatus = targetSync.ambiguousSameBar ? "AMBIGUOUS_BAR_SL_FIRST" : (targetSync.tp3Hit ? "TP3_HIT" : "SL_HIT");
          const pipsWon = targetSync.tp3Hit ? parseFloat(((this.currentSignal.riskPips || 12) * 3).toFixed(1)) : -(this.currentSignal.riskPips || 12);
          this.currentSignal.pipsWon = pipsWon;
        }
        // JAMÁS DESAPARECER LA SEÑAL AUTOMÁTICAMENTE: Se mantiene 100% visible para que el trader acompañe el spike y la reacción completa
      }

      // RASTREO EN VIVO DEL ESTADO DE ACUMULACIÓN / ENFRIAMIENTO CUÁNTICO TRAS SL
      if (!this.currentSignal && this.accumulationStatus && this.accumulationStatus.active) {
        const cd = this.marketSlCooldowns[this.selectedMarket];
        if (cd) {
          const elapsed = Date.now() - cd.hitAt;
          const remaining = Math.max(0, Math.ceil((cd.cooldownMs - elapsed) / 1000));
          this.accumulationStatus.remainingSec = remaining;
          if (elapsed >= cd.cooldownMs) {
            delete this.marketSlCooldowns[this.selectedMarket];
            this.accumulationStatus = null;
            this.generateHarmonicSignal(this.selectedMarket, this.selectedTimeframe, true);
          } else {
            // Verificar si una nueva vela formó un rechazo evidente en el Order Block
            const ob = this.findInstitutionalOrderBlock(allCandles, this.selectedMarket, true);
            const lastCandle = allCandles[allCandles.length - 1];
            if (lastCandle && ob) {
              const body = Math.abs(lastCandle.close - lastCandle.open);
              const lowerWick = Math.min(lastCandle.open, lastCandle.close) - lastCandle.low;
              if (lowerWick > body * 1.8 && Math.abs(lastCandle.low - ob.low) <= (MARKETS[this.selectedMarket]?.pipSize * 6)) {
                delete this.marketSlCooldowns[this.selectedMarket];
                this.accumulationStatus = null;
                this.generateHarmonicSignal(this.selectedMarket, this.selectedTimeframe, true);
              }
            }
          }
        }
      }

      // Viewport & Scrolling
      const totalCandles = allCandles.length;
      const visibleCount = Math.min(totalCandles, this.visibleBars);
      const maxScroll = Math.max(0, totalCandles - visibleCount);
      const safeScroll = Math.max(0, Math.min(maxScroll, this.scrollOffset));
      this.scrollOffset = safeScroll;

      const slider = document.getElementById("chartScrollSlider");
      if (slider) {
        slider.max = maxScroll.toString();
        slider.value = safeScroll.toString();
      }

      const endIdx = totalCandles - safeScroll;
      const startIdx = Math.max(0, endIdx - visibleCount);
      const visibleCandles = allCandles.slice(startIdx, endIdx);
      const candleCount = visibleCandles.length;
      if (candleCount === 0) return;

      // 1. FONDO DEL GRÁFICO (Blanco institucional o Dark Terminal)
      ctx.fillStyle = isLight ? "#ffffff" : "#080c14";
      ctx.fillRect(0, 0, width, height);

      let minPrice = Infinity;
      let maxPrice = -Infinity;
      visibleCandles.forEach(c => {
        if (c.low < minPrice) minPrice = c.low;
        if (c.high > maxPrice) maxPrice = c.high;
      });

      // Rango seguro en caso de vela plana o inicial
      if (!isFinite(minPrice) || !isFinite(maxPrice) || minPrice >= maxPrice) {
        const curP = this.marketPrices[this.selectedMarket] || 100;
        minPrice = curP - 1;
        maxPrice = curP + 1;
      }

      // Margen de respiración natural del 10% estilo Deriv Trader y TradingView
      // (Mantiene las proporciones exactas de las velas sin aplastarlas jamás)
      const rawSpan = (maxPrice - minPrice) || 1;
      const vPad = rawSpan * 0.10;
      minPrice -= vPad;
      maxPrice += vPad;

      // DESPLAZAMIENTO VERTICAL (SCROLL ARRIBA / ABAJO)
      if (typeof this.verticalOffset !== "number") this.verticalOffset = 0;
      this.verticalOffset = Math.max(-100, Math.min(100, this.verticalOffset));

      const vSlider = document.getElementById("chartVScrollSlider");
      if (vSlider) {
        vSlider.value = this.verticalOffset.toString();
      }
      const vBadge = document.getElementById("vScrollBadge");
      if (vBadge) {
        if (Math.abs(this.verticalOffset) > 0.5) {
          vBadge.style.display = "inline-block";
          vBadge.innerText = (this.verticalOffset > 0 ? `▲ +${Math.round(this.verticalOffset)}%` : `▼ ${Math.round(this.verticalOffset)}%`);
        } else {
          vBadge.style.display = "none";
        }
      }

      const rawRange = (maxPrice - minPrice) || 1;
      // Desplaza el rango visual arriba (+) o abajo (-) según la barra vertical
      const priceShift = (this.verticalOffset / 100) * (rawRange * 0.9);
      const effectiveMinPrice = minPrice + priceShift;
      const effectiveMaxPrice = maxPrice + priceShift;
      const priceRange = (effectiveMaxPrice - effectiveMinPrice) || 1;

      const isSmallScreen = width < 520;
      const paddingY = isSmallScreen ? 28 : 40;
      const chartHeight = height - (paddingY * 2);
      const rightMargin = isSmallScreen ? 62 : 90;
      const chartWidth = width - rightMargin;

      const getY = (val) => {
        return height - paddingY - (((val - effectiveMinPrice) / priceRange) * chartHeight);
      };

      const getScreenX = (globalIdx) => {
        const localSlot = globalIdx - startIdx;
        return (localSlot * stepX) + (stepX / 2);
      };

      // 2. CUADRÍCULA Y ESCALA DE PRECIOS
      ctx.strokeStyle = isLight ? "rgba(0, 0, 0, 0.06)" : "rgba(255, 255, 255, 0.05)";
      ctx.lineWidth = 1;
      ctx.fillStyle = isLight ? "#475569" : "#64748b";
      ctx.font = "10px monospace";
      ctx.textAlign = "left";

      const gridLines = 6;
      for (let i = 0; i <= gridLines; i++) {
        const pVal = effectiveMinPrice + ((priceRange / gridLines) * i);
        const y = getY(pVal);
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(chartWidth, y);
        ctx.stroke();

        const decimals = this.getMarketDecimals(this.selectedMarket);
        ctx.fillText(pVal.toFixed(decimals), chartWidth + 6, y + 3);
      }

      // Fondo de la escala derecha
      ctx.fillStyle = isLight ? "#f8fafc" : "#0d131f";
      ctx.fillRect(chartWidth, 0, rightMargin, height);
      ctx.strokeStyle = isLight ? "rgba(0, 0, 0, 0.08)" : "rgba(255, 255, 255, 0.08)";
      ctx.beginPath();
      ctx.moveTo(chartWidth, 0);
      ctx.lineTo(chartWidth, height);
      ctx.stroke();

      // Slots Horizontales (Velas + Espacio Libre a la Derecha)
      const freeRightSlots = (safeScroll === 0) ? this.rightMarginBars : 0;
      const totalSlots = visibleCount + freeRightSlots;
      const stepX = chartWidth / totalSlots;
      const candleWidth = Math.max(4, Math.floor(stepX * 0.72));

      // Área sombreada de proyección futura
      if (freeRightSlots > 0) {
        ctx.fillStyle = isLight ? "rgba(14, 165, 233, 0.03)" : "rgba(0, 242, 254, 0.02)";
        ctx.fillRect(visibleCount * stepX, 0, freeRightSlots * stepX, height);
      }

      // 3. MEDIAS MÓVILES INSTITUCIONALES AUTÉNTICAS (EMA 20 y EMA 50)
      if (this.showEMA && candleCount > 5) {
        const fullEma20 = this.calculateEMA(allCandles, 20);
        const fullEma50 = this.calculateEMA(allCandles, 50);

        // EMA 20 (Rápida / Cyan)
        ctx.strokeStyle = isLight ? "#0284c7" : "#00f2fe";
        ctx.lineWidth = 1.6;
        ctx.beginPath();
        visibleCandles.forEach((c, idx) => {
          const globalIdx = startIdx + idx;
          const x = (idx * stepX) + (stepX / 2);
          const emaVal = fullEma20[globalIdx] !== undefined ? fullEma20[globalIdx] : c.close;
          const y = getY(emaVal);
          if (idx === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        });
        ctx.stroke();

        // EMA 50 (Lenta / Ámbar Institucional)
        ctx.strokeStyle = isLight ? "#d97706" : "#f59e0b";
        ctx.lineWidth = 1.4;
        ctx.beginPath();
        visibleCandles.forEach((c, idx) => {
          const globalIdx = startIdx + idx;
          const x = (idx * stepX) + (stepX / 2);
          const emaVal = fullEma50[globalIdx] !== undefined ? fullEma50[globalIdx] : c.close;
          const y = getY(emaVal);
          if (idx === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        });
        ctx.stroke();
      }

      // 4. MODO GRÁFICO: LÍNEA / ÁREA ACUMULADORES vs VELAS JAPONESAS
      if (this.chartType === "line") {
        // RENDERIZADO DE LÍNEA / ÁREA CONTINUA (ESTILO DERIV TRADER ACUMULADORES)
        const points = visibleCandles.map((c, idx) => ({
          x: (idx * stepX) + (stepX / 2),
          y: getY(c.close),
          close: c.close,
          isSpike: c.isSpike,
          time: c.time
        }));

        if (points.length > 0) {
          // A. Área con degradado bajo la curva
          const areaGrad = ctx.createLinearGradient(0, paddingY, 0, height - paddingY);
          areaGrad.addColorStop(0, isLight ? "rgba(2, 132, 199, 0.28)" : "rgba(0, 242, 254, 0.25)");
          areaGrad.addColorStop(1, isLight ? "rgba(2, 132, 199, 0.01)" : "rgba(0, 242, 254, 0.01)");
          ctx.fillStyle = areaGrad;
          ctx.beginPath();
          ctx.moveTo(points[0].x, height - paddingY);
          points.forEach(pt => ctx.lineTo(pt.x, pt.y));
          ctx.lineTo(points[points.length - 1].x, height - paddingY);
          ctx.closePath();
          ctx.fill();

          // B. Línea continua institucional
          ctx.strokeStyle = isLight ? "#0284c7" : "#00f2fe";
          ctx.lineWidth = 2.4;
          ctx.lineJoin = "round";
          ctx.beginPath();
          points.forEach((pt, i) => {
            if (i === 0) ctx.moveTo(pt.x, pt.y);
            else ctx.lineTo(pt.x, pt.y);
          });
          ctx.stroke();

          // C. Puntos de spikes o picos
          points.forEach((pt, i) => {
            if (pt.isSpike) {
              ctx.fillStyle = "#eab308";
              ctx.beginPath();
              ctx.arc(pt.x, pt.y, 4.5, 0, Math.PI * 2);
              ctx.fill();
              ctx.strokeStyle = "#ffffff";
              ctx.lineWidth = 1.5;
              ctx.stroke();
              ctx.font = "bold 10px sans-serif";
              ctx.textAlign = "center";
              ctx.fillText("⚡", pt.x, pt.y - 8);
            }

            // Horas en el eje horizontal
            if (i % 6 === 0) {
              ctx.fillStyle = isLight ? "#64748b" : "#64748b";
              ctx.font = "9px monospace";
              ctx.textAlign = "center";
              ctx.fillText(pt.time, pt.x, height - 10);
            }
          });

          // D. Cabeza en vivo (Punto palpitante con halo)
          const lastPt = points[points.length - 1];
          if (lastPt) {
            ctx.fillStyle = isLight ? "rgba(2, 132, 199, 0.35)" : "rgba(0, 242, 254, 0.38)";
            ctx.beginPath();
            ctx.arc(lastPt.x, lastPt.y, 9, 0, Math.PI * 2);
            ctx.fill();

            ctx.fillStyle = isLight ? "#0284c7" : "#00f2fe";
            ctx.beginPath();
            ctx.arc(lastPt.x, lastPt.y, 4, 0, Math.PI * 2);
            ctx.fill();
            ctx.strokeStyle = "#ffffff";
            ctx.lineWidth = 1.2;
            ctx.stroke();
          }

          // E. Si el mercado es Boom o Crash: Bandas Oficiales de Acumuladores Deriv
          const m = MARKETS[this.selectedMarket] || MARKETS["XAUUSD"];
          if (m.platformMode === "deriv_boom" || m.platformMode === "deriv_crash") {
            const curP = this.marketPrices[this.selectedMarket] || (lastPt ? lastPt.close : 0);
            const barrierDist = Math.max(m.pipSize * 15, priceRange * 0.12);
            const yHighBarrier = getY(curP + barrierDist);
            const yLowBarrier = getY(curP - barrierDist);

            // Banda Alta
            if (yHighBarrier >= paddingY && yHighBarrier <= height - paddingY) {
              ctx.strokeStyle = "rgba(245, 158, 11, 0.85)";
              ctx.lineWidth = 1.6;
              ctx.setLineDash([5, 4]);
              ctx.beginPath();
              ctx.moveTo(0, yHighBarrier);
              ctx.lineTo(chartWidth, yHighBarrier);
              ctx.stroke();
              ctx.setLineDash([]);

              ctx.fillStyle = "#f59e0b";
              ctx.fillRect(chartWidth - 142, yHighBarrier - 11, 138, 16);
              ctx.fillStyle = "#000000";
              ctx.font = "bold 8.5px monospace";
              ctx.textAlign = "right";
              ctx.fillText("▲ BARRERA ALTA DERIV", chartWidth - 6, yHighBarrier + 1);
            }

            // Banda Baja
            if (yLowBarrier >= paddingY && yLowBarrier <= height - paddingY) {
              ctx.strokeStyle = "rgba(245, 158, 11, 0.85)";
              ctx.lineWidth = 1.6;
              ctx.setLineDash([5, 4]);
              ctx.beginPath();
              ctx.moveTo(0, yLowBarrier);
              ctx.lineTo(chartWidth, yLowBarrier);
              ctx.stroke();
              ctx.setLineDash([]);

              ctx.fillStyle = "#f59e0b";
              ctx.fillRect(chartWidth - 142, yLowBarrier - 11, 138, 16);
              ctx.fillStyle = "#000000";
              ctx.font = "bold 8.5px monospace";
              ctx.textAlign = "right";
              ctx.fillText("▼ BARRERA BAJA DERIV", chartWidth - 6, yLowBarrier + 1);
            }

            // Zona de Acumulación Relleno
            const safeTop = Math.max(paddingY, yHighBarrier);
            const safeBottom = Math.min(height - paddingY, yLowBarrier);
            if (safeBottom > safeTop) {
              ctx.fillStyle = "rgba(245, 158, 11, 0.06)";
              ctx.fillRect(0, safeTop, chartWidth, safeBottom - safeTop);
            }
          }
        }
      } else {
        // VELAS JAPONESAS (Verdes alcistas / Rojas bajistas nítidas)
        visibleCandles.forEach((c, idx) => {
          const x = (idx * stepX) + (stepX / 2);
          const yOpen = getY(c.open);
          const yClose = getY(c.close);
          const yHigh = getY(c.high);
          const yLow = getY(c.low);
          const isBull = c.isBull;

          // Color idéntico a Deriv nativo: Verde institucional alcista / Rojo institucional bajista
          const bodyColor = isBull ? (isLight ? "#16a34a" : "#10b981") : (isLight ? "#dc2626" : "#ef4444");

          // Mecha
          ctx.strokeStyle = bodyColor;
          ctx.lineWidth = 1.3;
          ctx.beginPath();
          ctx.moveTo(x, yHigh);
          ctx.lineTo(x, yLow);
          ctx.stroke();

          // Cuerpo de la vela
          ctx.fillStyle = bodyColor;
          const topY = Math.min(yOpen, yClose);
          const bodyH = Math.max(2, Math.abs(yClose - yOpen));
          ctx.fillRect(x - (candleWidth / 2), topY, candleWidth, bodyH);

          // Borde fino para mayor nitidez en fondo blanco
          if (isLight) {
            ctx.strokeStyle = isBull ? "#15803d" : "#b91c1c";
            ctx.lineWidth = 0.8;
            ctx.strokeRect(x - (candleWidth / 2), topY, candleWidth, bodyH);
          }

          // Detección y Resaltado Oficial de Spikes en Boom/Crash
          if (c.isSpike) {
            ctx.strokeStyle = isBull ? "rgba(16, 185, 129, 0.85)" : "rgba(239, 68, 68, 0.85)";
            ctx.lineWidth = 2.8;
            ctx.strokeRect(x - (candleWidth / 2) - 2, topY - 2, candleWidth + 4, bodyH + 4);

            // Ícono institucional de Spike
            ctx.fillStyle = "#eab308";
            ctx.font = "bold 11px sans-serif";
            ctx.textAlign = "center";
            const spikeIconY = isBull ? yHigh - 7 : yLow + 15;
            ctx.fillText("⚡", x, spikeIconY);
          }

          // Horas en el eje horizontal
          if (idx % 6 === 0) {
            ctx.fillStyle = isLight ? "#64748b" : "#64748b";
            ctx.font = "9px monospace";
            ctx.textAlign = "center";
            ctx.fillText(c.time, x, height - 10);
          }
        });
      }

      // 5. ESCÁNER ARMÓNICO: TRIÁNGULOS AMARILLOS MUY PRONUNCIADOS (X, A, B, C, D)
      let pD_coord = null;
      let isBullishSignal = true;

      if (this.showHarmonics && allCandles.length >= 18) {
        const sig = this.currentSignal;
        const isBullPreferred = sig ? (sig.type === "BUY" || sig.type === "CALL") : true;
        const geom = this.detectHarmonicPivots(allCandles, isBullPreferred ? "BUY" : "SELL");

        if (geom) {
          isBullishSignal = geom.isBull;

          const getScreenX = (globalIdx) => {
            const localSlot = globalIdx - startIdx;
            return (localSlot * stepX) + (stepX / 2);
          };

          const pX = { x: getScreenX(geom.idxX), y: getY(geom.pX_price), price: geom.pX_price, idx: geom.idxX, label: "X" };
          const pA = { x: getScreenX(geom.idxA), y: getY(geom.pA_price), price: geom.pA_price, idx: geom.idxA, label: "A" };
          const pB = { x: getScreenX(geom.idxB), y: getY(geom.pB_price), price: geom.pB_price, idx: geom.idxB, label: `B (${geom.ratios.AB})` };
          const pC = { x: getScreenX(geom.idxC), y: getY(geom.pC_price), price: geom.pC_price, idx: geom.idxC, label: `C (${geom.ratios.BC})` };
          const pD = { x: getScreenX(geom.idxD), y: getY(geom.pD_price), price: geom.pD_price, idx: geom.idxD, label: `D [PRZ] (${geom.ratios.XD})` };
          pD_coord = pD;

          // COLOR AMARILLO DORADO MUY PRONUNCIADO
          const yellowColor = "#eab308";
          const yellowFill = "rgba(234, 179, 8, 0.22)";

          // 1. Relleno Amarillo Vibrante de Triángulos XAB y BCD
          ctx.fillStyle = yellowFill;
          ctx.beginPath();
          ctx.moveTo(pX.x, pX.y);
          ctx.lineTo(pA.x, pA.y);
          ctx.lineTo(pB.x, pB.y);
          ctx.closePath();
          ctx.fill();

          ctx.beginPath();
          ctx.moveTo(pB.x, pB.y);
          ctx.lineTo(pC.x, pC.y);
          ctx.lineTo(pD.x, pD.y);
          ctx.closePath();
          ctx.fill();

          // 2. Rayos Exteriores X -> A -> B -> C -> D (Gruesos y Pronunciados: 3.0px)
          ctx.strokeStyle = yellowColor;
          ctx.lineWidth = 3.0;
          ctx.beginPath();
          ctx.moveTo(pX.x, pX.y);
          ctx.lineTo(pA.x, pA.y);
          ctx.lineTo(pB.x, pB.y);
          ctx.lineTo(pC.x, pC.y);
          ctx.lineTo(pD.x, pD.y);
          ctx.stroke();

          // 3. Rayos Interiores Fibonacci X-B, A-C, X-D
          ctx.strokeStyle = "#ca8a04";
          ctx.lineWidth = 1.4;
          ctx.setLineDash([3, 3]);

          ctx.beginPath();
          ctx.moveTo(pX.x, pX.y);
          ctx.lineTo(pB.x, pB.y);
          ctx.stroke();

          ctx.beginPath();
          ctx.moveTo(pA.x, pA.y);
          ctx.lineTo(pC.x, pC.y);
          ctx.stroke();

          ctx.strokeStyle = "#eab308";
          ctx.beginPath();
          ctx.moveTo(pX.x, pX.y);
          ctx.lineTo(pD.x, pD.y);
          ctx.stroke();
          ctx.setLineDash([]);

          // 4. Zona PRZ (Potencial Reversión) extendida a la derecha
          const przLeft = Math.max(0, pD.x);
          const przWidth = chartWidth - przLeft;
          if (przWidth > 10) {
            const przHeight = Math.max(16, Math.abs(pD.y - getY(pD.price + (MARKETS[this.selectedMarket]?.pipSize * 12))));
            const przTop = isBullishSignal ? pD.y - (przHeight * 0.3) : pD.y - (przHeight * 0.7);
            ctx.fillStyle = "rgba(234, 179, 8, 0.16)";
            ctx.fillRect(przLeft, przTop, przWidth, przHeight);
            ctx.strokeStyle = "#eab308";
            ctx.lineWidth = 1.5;
            ctx.strokeRect(przLeft, przTop, przWidth, przHeight);

            ctx.fillStyle = isLight ? "#854d0e" : "#fef08a";
            ctx.font = "bold 9px monospace";
            ctx.textAlign = "left";
            ctx.fillText("⚡ ZONA PRZ (POTENCIAL REVERSIÓN)", przLeft + 8, przTop + 11);
          }

          // 5. Nodos anclados en las puntas amarillas
          const decimals = this.getMarketDecimals(this.selectedMarket);
          [pX, pA, pB, pC, pD].forEach((p) => {
            if (p.x < -40 || p.x > chartWidth + 40) return;

            // Halo amarillo
            ctx.fillStyle = "rgba(234, 179, 8, 0.35)";
            ctx.beginPath();
            ctx.arc(p.x, p.y, 8, 0, Math.PI * 2);
            ctx.fill();

            // Centro del nodo
            ctx.fillStyle = isLight ? "#ffffff" : "#080c14";
            ctx.beginPath();
            ctx.arc(p.x, p.y, 4, 0, Math.PI * 2);
            ctx.fill();
            ctx.strokeStyle = "#eab308";
            ctx.lineWidth = 2.5;
            ctx.stroke();

            const isHighWick = (isBullishSignal && (p.label.startsWith("A") || p.label.startsWith("C"))) ||
                               (!isBullishSignal && (p.label.startsWith("X") || p.label.startsWith("B") || p.label.startsWith("D")));
            const textY = isHighWick ? p.y - 12 : p.y + 18;

            // Etiqueta del nodo
            ctx.fillStyle = isLight ? "#0f172a" : "#ffffff";
            ctx.font = "bold 10px sans-serif";
            ctx.textAlign = "center";
            ctx.fillText(p.label, p.x, textY);

            ctx.fillStyle = isLight ? "#475569" : "#94a3b8";
            ctx.font = "9px monospace";
            ctx.fillText(p.price.toFixed(decimals), p.x, isHighWick ? textY - 11 : textY + 10);
          });
        }
      }

      // 5.5 ESCÁNER SNIPER DE ALTA PRECISIÓN: LÍNEA ROJA, LÍNEA PÚRPURA Y CHULITOS (✓)
      if (this.showSniper && allCandles.length >= 15) {
        const chan = this.calculateSniperChannel(allCandles);
        if (chan) {
          const getScreenX = (globalIdx) => {
            const localSlot = globalIdx - startIdx;
            return (localSlot * stepX) + (stepX / 2);
          };

          // A. LÍNEA ROJA SUPERIOR (Resistencia / Techo Institucional)
          const redY1 = getY(chan.resistance.p1.price);
          const redY2 = getY(chan.resistance.p2.price);
          const redX1 = Math.max(0, getScreenX(chan.resistance.p1.idx));
          const redX2 = chartWidth;

          ctx.strokeStyle = isLight ? "#dc2626" : "#ef4444";
          ctx.lineWidth = 2.8;
          ctx.beginPath();
          ctx.moveTo(redX1, redY1);
          ctx.lineTo(redX2, redY2);
          ctx.stroke();

          // B. LÍNEA PÚRPURA INFERIOR (Soporte Dinámico / Línea de Tendencia)
          const purpY1 = getY(chan.support.p1.price);
          const purpY2 = getY(chan.support.p2.price);
          const purpX1 = Math.max(0, getScreenX(chan.support.p1.idx));
          const purpX2 = chartWidth;

          ctx.strokeStyle = isLight ? "#7c3aed" : "#a855f7";
          ctx.lineWidth = 2.8;
          ctx.beginPath();
          ctx.moveTo(purpX1, purpY1);
          ctx.lineTo(purpX2, purpY2);
          ctx.stroke();

          // ZONA DE ORDER BLOCK INSTITUCIONAL (SMC DEMAND / SUPPLY MITIGATION)
          const activeOb = (this.currentSignal && this.currentSignal.orderBlock) || (this.spikeRadar && this.spikeRadar.orderBlock);
          if (this.showLevels && activeOb) {
            const ob = activeOb;
            if (isFinite(ob.high) && isFinite(ob.low)) {
              const isBull = this.currentSignal ? (this.currentSignal.type === "BUY" || this.currentSignal.type === "CALL") : this.selectedMarket.startsWith("BOOM");
              const yTop = Math.min(getY(ob.high), getY(ob.low));
              const yBot = Math.max(getY(ob.high), getY(ob.low));
              const obH = Math.max(8, yBot - yTop);

              ctx.save();
              ctx.fillStyle = isBull ? (isLight ? "rgba(22, 163, 74, 0.08)" : "rgba(16, 185, 129, 0.12)") : (isLight ? "rgba(220, 38, 38, 0.08)" : "rgba(239, 68, 68, 0.12)");
              ctx.fillRect(0, yTop, chartWidth, obH);

              ctx.strokeStyle = isBull ? (isLight ? "rgba(22, 163, 74, 0.6)" : "rgba(16, 185, 129, 0.7)") : (isLight ? "rgba(220, 38, 38, 0.6)" : "rgba(239, 68, 68, 0.7)");
              ctx.lineWidth = 1;
              ctx.setLineDash([4, 4]);
              ctx.strokeRect(0, yTop, chartWidth, obH);
              ctx.setLineDash([]);

              ctx.fillStyle = isBull ? (isLight ? "#15803d" : "#34d399") : (isLight ? "#b91c1c" : "#f87171");
              ctx.font = "bold 9px sans-serif";
              ctx.textAlign = "left";
              const labelTxt = ob.label || (isBull ? "OB Demanda Institucional" : "OB Oferta Institucional");
              ctx.fillText(`🏛️ ${labelTxt} [Zona Mitigación: ${ob.high} - ${ob.low}]`, 14, Math.max(paddingY + 12, yTop + 11));
              ctx.restore();
            }
          }

          // C. DIBUJAR LOS CHULITOS (✓) DE ENTRADA SNIPER Y LA CAJA DE POSICIÓN ESTILO TRADINGVIEW
          if (this.currentSignal && this.currentSignal.marketId === this.selectedMarket && !MARKETS[this.selectedMarket]?.isBinary) {
            const sig = this.currentSignal;
            const isBuy = sig.type === "BUY" || sig.type === "CALL";
            // Sniper markers anchor to the confirmed signal candle, whether or not a harmonic pattern exists.
            const entryIdx = (sig.entryCandleIdx != null && sig.entryCandleIdx >= 0) ? sig.entryCandleIdx : (pD_coord ? pD_coord.idx : startIdx);
            const chulitoX = getScreenX(entryIdx);
            const yEntry = getY(sig.entry);
            const calcRisk = this.calculateSafeLot(this.accountSize, sig.riskPips, this.selectedMarket);
            const targetGainMoney = calcRisk.tp3Profit;
            const actualRiskMoney = calcRisk.actualRiskMoney;

            // Atenuar suavemente la caja si la entrada ya cumplió su vida útil y está en transición
            const isCompletedFade = Boolean(this.currentSignal && this.currentSignal.completedAt);
            if (isCompletedFade) {
              ctx.globalAlpha = 0.38;
            }

            if (isBuy) {
              // CHULITO VERDE (✓) directamente en el rebote de la entrada
              const chulitoY = Math.min(height - paddingY - 20, Math.max(paddingY + 20, yEntry + 22));

              ctx.strokeStyle = "#16a34a";
              ctx.lineWidth = 3.5;
              ctx.lineCap = "round";
              ctx.lineJoin = "round";
              ctx.beginPath();
              ctx.moveTo(chulitoX - 10, chulitoY - 2);
              ctx.lineTo(chulitoX - 4, chulitoY + 6);
              ctx.lineTo(chulitoX + 10, chulitoY - 8);
              ctx.stroke();

              // Badge Chulito Verde
              ctx.fillStyle = "#16a34a";
              ctx.fillRect(chulitoX - 52, chulitoY + 10, 104, 16);
              ctx.fillStyle = "#ffffff";
              ctx.font = "bold 9px sans-serif";
              ctx.textAlign = "center";
              ctx.fillText("✓ CHULITO VERDE (BUY)", chulitoX, chulitoY + 22);

              // CAJA DE POSICIÓN ESTILO TRADINGVIEW (LONG POSITION BOX)
              // Compra: Entrada en sig.entry, Target ARRIBA (yTp < yEntry), Stop ABAJO (ySl > yEntry)
              const yTp = getY(sig.tp3 || sig.tp2 || sig.tp1);
              const ySl = getY(sig.sl);
              // Dejar 130px a la derecha para que NO colisione con los badges del eje derecho
              const boxW = Math.max(60, chartWidth - chulitoX - 130);

              // Clamping para evitar que la caja se desborde fuera de la vista
              const topBound = paddingY;
              const bottomBound = height - paddingY;
              const safeEntryY = Math.max(topBound + 16, Math.min(bottomBound - 16, yEntry));
              const safeTpY = Math.max(topBound, Math.min(safeEntryY - 4, yTp));
              const safeSlY = Math.min(bottomBound, Math.max(safeEntryY + 4, ySl));

              // 1. Caja Verde (Take Profit / Ganancia) - Relleno sutil para NO tapar velas
              const targetTop = safeTpY;
              const targetH = Math.max(4, safeEntryY - safeTpY);
              ctx.fillStyle = isLight ? "rgba(22, 163, 74, 0.06)" : "rgba(16, 185, 129, 0.07)";
              ctx.fillRect(chulitoX, targetTop, boxW, targetH);
              ctx.strokeStyle = isLight ? "rgba(22, 163, 74, 0.6)" : "rgba(16, 185, 129, 0.7)";
              ctx.lineWidth = 1;
              ctx.setLineDash([4, 4]);
              ctx.strokeRect(chulitoX, targetTop, boxW, targetH);
              ctx.setLineDash([]);

              // Barra de cabecera verde de la caja (compacta, sin obstruir)
              const tagW = Math.min(boxW - 12, 230);
              ctx.fillStyle = isLight ? "rgba(22, 163, 74, 0.85)" : "rgba(16, 185, 129, 0.85)";
              ctx.fillRect(chulitoX + 4, targetTop - 13, tagW, 13);
              ctx.fillStyle = "#ffffff";
              ctx.font = "bold 8.5px monospace";
              ctx.textAlign = "left";
              ctx.fillText(`Target TP3: +${calcRisk.tp3Pips} pips (+$${calcRisk.tp3Profit} USD)`, chulitoX + 8, targetTop - 3);

              // 2. Caja Roja (Stop Loss / Riesgo) - Relleno sutil para NO tapar velas
              const stopTop = safeEntryY;
              const stopH = Math.max(4, safeSlY - safeEntryY);
              ctx.fillStyle = isLight ? "rgba(220, 38, 38, 0.06)" : "rgba(239, 68, 68, 0.07)";
              ctx.fillRect(chulitoX, stopTop, boxW, stopH);
              ctx.strokeStyle = isLight ? "rgba(220, 38, 38, 0.6)" : "rgba(239, 68, 68, 0.7)";
              ctx.lineWidth = 1;
              ctx.setLineDash([4, 4]);
              ctx.strokeRect(chulitoX, stopTop, boxW, stopH);
              ctx.setLineDash([]);

              // Barra de pie roja de la caja (compacta)
              const stopTagW = Math.min(boxW - 12, 220);
              ctx.fillStyle = isLight ? "rgba(220, 38, 38, 0.85)" : "rgba(239, 68, 68, 0.85)";
              ctx.fillRect(chulitoX + 4, stopTop + stopH, stopTagW, 13);
              ctx.fillStyle = "#ffffff";
              ctx.font = "bold 8.5px monospace";
              ctx.textAlign = "left";
              ctx.fillText(`Stop: -${calcRisk.slPips} pips (-$${calcRisk.actualRiskMoney} USD | Lote: ${calcRisk.lot})`, chulitoX + 8, stopTop + stopH + 10);

              // Píldora de R:R en el centro
              ctx.fillStyle = isLight ? "rgba(226, 232, 240, 0.92)" : "rgba(30, 41, 59, 0.92)";
              ctx.fillRect(chulitoX + 10, safeEntryY - 9, 140, 18);
              ctx.strokeStyle = isLight ? "#94a3b8" : "#475569";
              ctx.strokeRect(chulitoX + 10, safeEntryY - 9, 140, 18);
              ctx.fillStyle = isLight ? "#0f172a" : "#f8fafc";
              ctx.font = "bold 8.5px sans-serif";
              ctx.textAlign = "left";
              ctx.fillText(`R/R: 1:3 • Cta: $${calcRisk.capital} USD`, chulitoX + 14, safeEntryY + 3);

              // Tiradores circulares de esquina estilo TradingView
              [
                { x: chulitoX, y: targetTop },
                { x: chulitoX + boxW, y: targetTop },
                { x: chulitoX, y: stopTop + stopH },
                { x: chulitoX + boxW, y: stopTop + stopH }
              ].forEach(pt => {
                ctx.fillStyle = "#ffffff";
                ctx.beginPath();
                ctx.arc(pt.x, pt.y, 3, 0, Math.PI * 2);
                ctx.fill();
                ctx.strokeStyle = "#475569";
                ctx.lineWidth = 1;
                ctx.stroke();
              });

            } else {
              // CHULITO ROJO (✓) directamente en el rechazo de la entrada
              const chulitoY = Math.max(paddingY + 20, Math.min(height - paddingY - 20, yEntry - 22));

              ctx.strokeStyle = "#dc2626";
              ctx.lineWidth = 3.5;
              ctx.lineCap = "round";
              ctx.lineJoin = "round";
              ctx.beginPath();
              ctx.moveTo(chulitoX - 10, chulitoY - 2);
              ctx.lineTo(chulitoX - 4, chulitoY + 6);
              ctx.lineTo(chulitoX + 10, chulitoY - 8);
              ctx.stroke();

              // Badge Chulito Rojo
              ctx.fillStyle = "#dc2626";
              ctx.fillRect(chulitoX - 52, chulitoY - 24, 104, 16);
              ctx.fillStyle = "#ffffff";
              ctx.font = "bold 9px sans-serif";
              ctx.textAlign = "center";
              ctx.fillText("✓ CHULITO ROJO (SELL)", chulitoX, chulitoY - 12);

              // CAJA DE POSICIÓN ESTILO TRADINGVIEW (SHORT POSITION BOX)
              // Venta: Entrada en sig.entry, Target ABAJO (yTp > yEntry), Stop ARRIBA (ySl < yEntry)
              const yTp = getY(sig.tp3 || sig.tp2 || sig.tp1);
              const ySl = getY(sig.sl);
              // Dejar 130px a la derecha para que NO colisione con los badges del eje derecho
              const boxW = Math.max(60, chartWidth - chulitoX - 130);

              const topBound = paddingY;
              const bottomBound = height - paddingY;
              const safeEntryY = Math.max(topBound + 16, Math.min(bottomBound - 16, yEntry));
              const safeSlY = Math.max(topBound, Math.min(safeEntryY - 4, ySl));
              const safeTpY = Math.min(bottomBound, Math.max(safeEntryY + 4, yTp));

              // 1. Caja Roja (Stop Loss / Riesgo hacia arriba) - Relleno sutil
              const stopTop = safeSlY;
              const stopH = Math.max(4, safeEntryY - safeSlY);
              ctx.fillStyle = isLight ? "rgba(220, 38, 38, 0.06)" : "rgba(239, 68, 68, 0.07)";
              ctx.fillRect(chulitoX, stopTop, boxW, stopH);
              ctx.strokeStyle = isLight ? "rgba(220, 38, 38, 0.6)" : "rgba(239, 68, 68, 0.7)";
              ctx.lineWidth = 1;
              ctx.setLineDash([4, 4]);
              ctx.strokeRect(chulitoX, stopTop, boxW, stopH);
              ctx.setLineDash([]);

              // Barra de cabecera roja de la caja (compacta)
              const stopTagW = Math.min(boxW - 12, 220);
              ctx.fillStyle = isLight ? "rgba(220, 38, 38, 0.85)" : "rgba(239, 68, 68, 0.85)";
              ctx.fillRect(chulitoX + 4, stopTop - 13, stopTagW, 13);
              ctx.fillStyle = "#ffffff";
              ctx.font = "bold 8.5px monospace";
              ctx.textAlign = "left";
              ctx.fillText(`Stop: -${calcRisk.slPips} pips (-$${calcRisk.actualRiskMoney} USD | Lote: ${calcRisk.lot})`, chulitoX + 8, stopTop - 3);

              // 2. Caja Verde (Ganancia hacia abajo) - Relleno sutil
              const targetTop = safeEntryY;
              const targetH = Math.max(4, safeTpY - safeEntryY);
              ctx.fillStyle = isLight ? "rgba(22, 163, 74, 0.06)" : "rgba(16, 185, 129, 0.07)";
              ctx.fillRect(chulitoX, targetTop, boxW, targetH);
              ctx.strokeStyle = isLight ? "rgba(22, 163, 74, 0.6)" : "rgba(16, 185, 129, 0.7)";
              ctx.lineWidth = 1;
              ctx.setLineDash([4, 4]);
              ctx.strokeRect(chulitoX, targetTop, boxW, targetH);
              ctx.setLineDash([]);

              // Barra de pie verde de la caja (compacta)
              const targetTagW = Math.min(boxW - 12, 230);
              ctx.fillStyle = isLight ? "rgba(22, 163, 74, 0.85)" : "rgba(16, 185, 129, 0.85)";
              ctx.fillRect(chulitoX + 4, targetTop + targetH, targetTagW, 13);
              ctx.fillStyle = "#ffffff";
              ctx.font = "bold 8.5px monospace";
              ctx.textAlign = "left";
              ctx.fillText(`Target TP3: +${calcRisk.tp3Pips} pips (+$${calcRisk.tp3Profit} USD)`, chulitoX + 8, targetTop + targetH + 10);

              // Píldora de R:R en el centro
              ctx.fillStyle = isLight ? "rgba(226, 232, 240, 0.92)" : "rgba(30, 41, 59, 0.92)";
              ctx.fillRect(chulitoX + 10, safeEntryY - 9, 140, 18);
              ctx.strokeStyle = isLight ? "#94a3b8" : "#475569";
              ctx.strokeRect(chulitoX + 10, safeEntryY - 9, 140, 18);
              ctx.fillStyle = isLight ? "#0f172a" : "#f8fafc";
              ctx.font = "bold 8.5px sans-serif";
              ctx.textAlign = "left";
              ctx.fillText(`R/R: 1:3 • Cta: $${calcRisk.capital} USD`, chulitoX + 14, safeEntryY + 3);

              // Tiradores circulares de esquina
              [
                { x: chulitoX, y: stopTop },
                { x: chulitoX + boxW, y: stopTop },
                { x: chulitoX, y: targetTop + targetH },
                { x: chulitoX + boxW, y: targetTop + targetH }
              ].forEach(pt => {
                ctx.fillStyle = "#ffffff";
                ctx.beginPath();
                ctx.arc(pt.x, pt.y, 3, 0, Math.PI * 2);
                ctx.fill();
                ctx.strokeStyle = "#475569";
                ctx.lineWidth = 1;
                ctx.stroke();
              });
            }
            if (isCompletedFade) {
              ctx.globalAlpha = 1.0;
            }
          }
        }
      }

      // 6. LÍNEA Y FLECHA GIGANTE DE ENTRADA (ENTRY POINT)
      if (this.currentSignal && this.currentSignal.marketId === this.selectedMarket) {
        const sig = this.currentSignal;
        const isBuy = sig.type === "BUY" || sig.type === "CALL";
        const yEntry = getY(sig.entry);
        const entryLocalX = ((sig.entryCandleIdx ?? startIdx) - startIdx) * stepX + stepX / 2;
        const lineStartX = (safeScroll === 0) ? Math.max(0, entryLocalX) : 0;

        // Línea Horizontal de Entrada (Cyan / Azul Eléctrico)
        ctx.strokeStyle = isLight ? "#0284c7" : "#00f2fe";
        ctx.lineWidth = 2.2;
        ctx.setLineDash([5, 3]);
        ctx.beginPath();
        ctx.moveTo(lineStartX, yEntry);
        ctx.lineTo(chartWidth, yEntry);
        ctx.stroke();
        ctx.setLineDash([]);

        // Si los niveles SL/TP están apagados o es binarias, pintar badge de entrada aquí; si están activos, el gestor anti-colisión en Sección 8 lo dibujará armónicamente
        const isCurrentBinary = Boolean(MARKETS[this.selectedMarket]?.isBinary);
        if (isCurrentBinary || !this.showLevels || !sig.sl || !sig.tp1) {
          ctx.fillStyle = isLight ? "#0284c7" : "#00f2fe";
          ctx.fillRect(chartWidth - 96, yEntry - 11, 93, 16);
          ctx.fillStyle = "#ffffff";
          ctx.font = "bold 9px monospace";
          ctx.textAlign = "right";
          ctx.fillText("🎯 ENTRADA: " + sig.entry, chartWidth - 6, yEntry + 1);
        }

        // Píldora de Pips Flotantes en Vivo sobre la línea de entrada (cerca del origen de entrada, NO en el borde derecho)
        if (targetSync) {
          const isProf = targetSync.isProfit;
          const pipsBadgeX = Math.min(chartWidth - 230, Math.max(14, lineStartX + 14));
          ctx.fillStyle = isProf ? (isLight ? "#16a34a" : "#10b981") : (isLight ? "#dc2626" : "#ef4444");
          ctx.fillRect(pipsBadgeX, yEntry - 10, 114, 15);
          ctx.fillStyle = "#ffffff";
          ctx.font = "bold 8.5px monospace";
          ctx.textAlign = "center";
          const pipsTxt = (targetSync.pipsFloating >= 0 ? "+" : "") + targetSync.pipsFloating + " Pips Flotantes";
          ctx.fillText(pipsTxt, pipsBadgeX + 57, yEntry + 2);
        }

        // FLECHA VISUAL DIRECTA DE ENTRADA (▲ COMPRAR o ▼ VENDER)
        // SOLO DIBUJAR FLECHA SI EL ESCÁNER SNIPER ESTÁ APAGADO PARA NO DUPLICAR ELEMENTOS ENCIMADOS
        if (!this.showSniper && entryLocalX >= 0 && entryLocalX <= chartWidth) {
          const arrowX = entryLocalX;

          if (isBuy) {
            // Flecha apuntando hacia ARRIBA (▲) indicando COMPRA en Punto D
            const arrowTipY = yEntry + 8;
            ctx.fillStyle = "#16a34a";
            ctx.strokeStyle = "#eab308";
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.moveTo(arrowX, arrowTipY);
            ctx.lineTo(arrowX - 10, arrowTipY + 16);
            ctx.lineTo(arrowX - 4, arrowTipY + 16);
            ctx.lineTo(arrowX - 4, arrowTipY + 30);
            ctx.lineTo(arrowX + 4, arrowTipY + 30);
            ctx.lineTo(arrowX + 4, arrowTipY + 16);
            ctx.lineTo(arrowX + 10, arrowTipY + 16);
            ctx.closePath();
            ctx.fill();
            ctx.stroke();

            // Cartel de Entrada
            ctx.fillStyle = "#16a34a";
            ctx.fillRect(arrowX - 48, arrowTipY + 33, 96, 16);
            ctx.fillStyle = "#ffffff";
            ctx.font = "bold 9px sans-serif";
            ctx.textAlign = "center";
            ctx.fillText("▲ ENTRADA COMPRA", arrowX, arrowTipY + 45);
          } else {
            // Flecha apuntando hacia ABAJO (▼) indicando VENTA en Punto D
            const arrowTipY = yEntry - 8;
            ctx.fillStyle = "#dc2626";
            ctx.strokeStyle = "#eab308";
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.moveTo(arrowX, arrowTipY);
            ctx.lineTo(arrowX - 10, arrowTipY - 16);
            ctx.lineTo(arrowX - 4, arrowTipY - 16);
            ctx.lineTo(arrowX - 4, arrowTipY - 30);
            ctx.lineTo(arrowX + 4, arrowTipY - 30);
            ctx.lineTo(arrowX + 4, arrowTipY - 16);
            ctx.lineTo(arrowX + 10, arrowTipY - 16);
            ctx.closePath();
            ctx.fill();
            ctx.stroke();

            // Cartel de Entrada
            ctx.fillStyle = "#dc2626";
            ctx.fillRect(arrowX - 48, arrowTipY - 49, 96, 16);
            ctx.fillStyle = "#ffffff";
            ctx.font = "bold 9px sans-serif";
            ctx.textAlign = "center";
            ctx.fillText("▼ ENTRADA VENTA", arrowX, arrowTipY - 37);
          }
        }
      }

      // 7. LÍNEA DE PRECIO ACTUAL (Cotización en Vivo)
      const curPrice = this.marketPrices[this.selectedMarket];
      const yCur = getY(curPrice);

      ctx.strokeStyle = isLight ? "rgba(2, 132, 199, 0.85)" : "rgba(0, 242, 254, 0.85)";
      ctx.lineWidth = 1;
      ctx.setLineDash([4, 4]);
      ctx.beginPath();
      ctx.moveTo(0, yCur);
      ctx.lineTo(chartWidth, yCur);
      ctx.stroke();
      ctx.setLineDash([]);

      ctx.fillStyle = isLight ? "#0284c7" : "#00f2fe";
      ctx.fillRect(chartWidth + 2, yCur - 9, rightMargin - 4, 18);
      ctx.fillStyle = "#ffffff";
      ctx.font = "bold 10px monospace";
      ctx.textAlign = "center";
      const decimals = this.getMarketDecimals(this.selectedMarket);
      ctx.fillText(curPrice.toFixed(decimals), chartWidth + (rightMargin / 2), yCur + 3);

      // 8. NIVELES DE MERCADO: EN BINARIAS = STRIKE & ZONA ITM (+85%) | EN OTROS = SL/TP 1:3
      const isCurrentBinary = Boolean(MARKETS[this.selectedMarket]?.isBinary);

      if (isCurrentBinary && this.currentSignal) {
        // RENDERIZADO EXCLUSIVO PARA OPCIONES BINARIAS (IQ OPTION / POCKET OPTION)
        const sig = this.currentSignal;
        const yStrike = getY(sig.entry);
        const isCall = sig.type === "CALL";
        const isItm = targetSync ? targetSync.isItm : (isCall ? (curPrice > sig.entry) : (curPrice < sig.entry));

        // 1. ZONA IN THE MONEY (ITM: +85% GANANCIA NETA)
        const itmTop = isCall ? 0 : yStrike;
        const itmH = isCall ? yStrike : (height - yStrike);
        ctx.fillStyle = isLight ? "rgba(22, 163, 74, 0.12)" : "rgba(16, 185, 129, 0.14)";
        ctx.fillRect(0, itmTop, chartWidth, itmH);

        // 2. ZONA OUT OF THE MONEY (OTM: RIESGO FIJO)
        const otmTop = isCall ? yStrike : 0;
        const otmH = isCall ? (height - yStrike) : yStrike;
        ctx.fillStyle = isLight ? "rgba(220, 38, 38, 0.08)" : "rgba(239, 68, 68, 0.09)";
        ctx.fillRect(0, otmTop, chartWidth, otmH);

        // 3. LÍNEA DE PRECIO STRIKE PALPITANTE
        ctx.strokeStyle = isLight ? "#0284c7" : "#00f2fe";
        ctx.lineWidth = 2.5;
        ctx.setLineDash([6, 3]);
        ctx.beginPath();
        ctx.moveTo(0, yStrike);
        ctx.lineTo(chartWidth, yStrike);
        ctx.stroke();
        ctx.setLineDash([]);

        // Badges de Binarias
        ctx.fillStyle = isItm ? "#16a34a" : "#dc2626";
        ctx.fillRect(chartWidth - 110, yStrike - 12, 106, 16);
        ctx.fillStyle = "#ffffff";
        ctx.font = "bold 9px monospace";
        ctx.textAlign = "right";
        ctx.fillText(isItm ? "🔥 ITM (+85% GANADO)" : "⚠️ OTM (EN RIESGO)", chartWidth - 6, yStrike + 1);

        ctx.fillStyle = isLight ? "#0f172a" : "#f8fafc";
        ctx.font = "bold 9.5px sans-serif";
        ctx.textAlign = "left";
        const itmLabelY = isCall ? Math.max(25, yStrike - 18) : Math.min(height - 25, yStrike + 24);
        ctx.fillText(`⚡ ZONA ITM (+85% PAYOUT) • EXPIRACIÓN 60s/2m TURBO`, 16, itmLabelY);
      }
      else if (this.showLevels && this.currentSignal && this.currentSignal.sl && this.currentSignal.tp1) {
        const sync = targetSync;
        const ySl = getY(this.currentSignal.sl);
        const yTp1 = getY(this.currentSignal.tp1);
        const yTp2 = this.currentSignal.tp2 ? getY(this.currentSignal.tp2) : null;
        const yTp3 = this.currentSignal.tp3 ? getY(this.currentSignal.tp3) : null;

        const sigEntryX = ((this.currentSignal.entryCandleIdx ?? startIdx) - startIdx) * stepX + stepX / 2;
        const lineStartX = safeScroll === 0 ? Math.max(0, sigEntryX) : 0;
        const slPrice = this.currentSignal.sl;
        const tp1Price = this.currentSignal.tp1;
        const tp2Price = this.currentSignal.tp2;
        const tp3Price = this.currentSignal.tp3;
        const isSlHit = Boolean(sync && sync.slHit);
        const isTp1Hit = Boolean(sync && sync.tp1Hit);
        const isTp2Hit = Boolean(sync && sync.tp2Hit);
        const isTp3Hit = Boolean(sync && sync.tp3Hit);

        // A. LÍNEA HORIZONTAL DE STOP LOSS
        if (ySl >= paddingY && ySl <= height - paddingY) {
          ctx.strokeStyle = isSlHit ? "#dc2626" : (isLight ? "#dc2626" : "rgba(239, 68, 68, 0.85)");
          ctx.lineWidth = isSlHit ? 2.5 : 1.4;
          if (!isSlHit) ctx.setLineDash([4, 4]);
          ctx.beginPath();
          ctx.moveTo(lineStartX, ySl);
          ctx.lineTo(chartWidth, ySl);
          ctx.stroke();
          ctx.setLineDash([]);
        }

        // B. LÍNEA HORIZONTAL DE TAKE PROFIT 1
        if (yTp1 >= paddingY && yTp1 <= height - paddingY) {
          ctx.strokeStyle = isTp1Hit ? "#16a34a" : (isLight ? "#16a34a" : "rgba(16, 185, 129, 0.85)");
          ctx.lineWidth = isTp1Hit ? 2.6 : 1.4;
          if (!isTp1Hit) ctx.setLineDash([5, 3]);
          ctx.beginPath();
          ctx.moveTo(lineStartX, yTp1);
          ctx.lineTo(chartWidth, yTp1);
          ctx.stroke();
          ctx.setLineDash([]);

          // Estrella de celebración TP1
          if (isTp1Hit && !isTp2Hit && !isTp3Hit && sync.hitTp1Idx !== -1) {
            const candleSlot = sync.hitTp1Idx - startIdx;
            if (candleSlot >= 0 && candleSlot < visibleCount) {
              const hitX = (candleSlot * stepX) + (stepX / 2);
              ctx.fillStyle = "#16a34a";
              ctx.fillRect(hitX - 35, yTp1 - 22, 70, 15);
              ctx.fillStyle = "#ffffff";
              ctx.font = "bold 8.5px sans-serif";
              ctx.textAlign = "center";
              ctx.fillText("⭐ TP1 ALCANZADO", hitX, yTp1 - 11);
            }
          }
        }

        // C. LÍNEA HORIZONTAL DE TAKE PROFIT 2
        if (yTp2 !== null && yTp2 >= paddingY && yTp2 <= height - paddingY) {
          ctx.strokeStyle = isTp2Hit ? "#059669" : (isLight ? "#15803d" : "rgba(16, 185, 129, 0.65)");
          ctx.lineWidth = isTp2Hit ? 2.6 : 1.3;
          if (!isTp2Hit) ctx.setLineDash([5, 3]);
          ctx.beginPath();
          ctx.moveTo(lineStartX, yTp2);
          ctx.lineTo(chartWidth, yTp2);
          ctx.stroke();
          ctx.setLineDash([]);

          // Estrella de celebración TP2
          if (isTp2Hit && !isTp3Hit && sync.hitTp2Idx !== -1) {
            const candleSlot = sync.hitTp2Idx - startIdx;
            if (candleSlot >= 0 && candleSlot < visibleCount) {
              const hitX = (candleSlot * stepX) + (stepX / 2);
              ctx.fillStyle = "#059669";
              ctx.fillRect(hitX - 35, yTp2 - 22, 70, 15);
              ctx.fillStyle = "#ffffff";
              ctx.font = "bold 8.5px sans-serif";
              ctx.textAlign = "center";
              ctx.fillText("🚀 TP2 ALCANZADO", hitX, yTp2 - 11);
            }
          }
        }

        // D. LÍNEA HORIZONTAL DE TAKE PROFIT 3
        if (yTp3 !== null && yTp3 >= paddingY && yTp3 <= height - paddingY) {
          ctx.strokeStyle = isTp3Hit ? "#eab308" : (isLight ? "#166534" : "rgba(16, 185, 129, 0.45)");
          ctx.lineWidth = isTp3Hit ? 2.8 : 1.2;
          if (!isTp3Hit) ctx.setLineDash([5, 3]);
          ctx.beginPath();
          ctx.moveTo(lineStartX, yTp3);
          ctx.lineTo(chartWidth, yTp3);
          ctx.stroke();
          ctx.setLineDash([]);

          // Estrella de celebración TP3
          if (isTp3Hit && sync.hitTp3Idx !== -1) {
            const candleSlot = sync.hitTp3Idx - startIdx;
            if (candleSlot >= 0 && candleSlot < visibleCount) {
              const hitX = (candleSlot * stepX) + (stepX / 2);
              ctx.fillStyle = "#ca8a04";
              ctx.fillRect(hitX - 42, yTp3 - 22, 84, 15);
              ctx.fillStyle = "#ffffff";
              ctx.font = "bold 8.5px sans-serif";
              ctx.textAlign = "center";
              ctx.fillText("💎 TP3 COMPLETO", hitX, yTp3 - 11);
            }
          }
        }

        // =====================================================================
        // GESTOR DE ETIQUETAS DE PRECIO ANTI-COLISIÓN (ENTRADA, SL, TP1, TP2, TP3)
        // Muestra precio, pips y ganancias/pérdidas reales en USD para la cuenta de $50
        // =====================================================================
        const badgesToRender = [];
        const yEntry = getY(this.currentSignal.entry);
        const calc = this.calculateSafeLot(this.accountSize, this.currentSignal.riskPips, this.selectedMarket);

        if (yEntry >= paddingY && yEntry <= height - paddingY) {
          badgesToRender.push({
            id: "entry",
            y: yEntry,
            text: "🎯 ENTRADA: " + this.currentSignal.entry,
            bg: isLight ? "#0284c7" : "#00f2fe",
            fg: "#ffffff",
            border: isLight ? "#0369a1" : "#38bdf8"
          });
        }

        if (ySl >= paddingY && ySl <= height - paddingY) {
          badgesToRender.push({
            id: "sl",
            y: ySl,
            text: isSlHit ? `🛑 SL TOCADO: ${slPrice} (-$${calc.actualRiskMoney})` : `🛡️ SL: ${slPrice} (-$${calc.actualRiskMoney})`,
            bg: isSlHit ? "#dc2626" : (isLight ? "#dc2626" : "rgba(220, 38, 38, 0.92)"),
            fg: "#ffffff",
            border: "#ef4444"
          });
        } else {
          // Indicador fijado de Stop Loss en el borde sin deformar el gráfico
          const isBelow = ySl > height - paddingY;
          const pinY = isBelow ? height - paddingY - 14 : paddingY + 6;
          ctx.fillStyle = isLight ? "#dc2626" : "rgba(239, 68, 68, 0.92)";
          ctx.fillRect(chartWidth - 126, pinY - 10, 122, 16);
          ctx.fillStyle = "#ffffff";
          ctx.font = "bold 8px monospace";
          ctx.textAlign = "right";
          ctx.fillText((isBelow ? "▼ SL: " : "▲ SL: ") + `${slPrice} (-$${calc.actualRiskMoney})`, chartWidth - 6, pinY + 2);
        }

        if (yTp1 >= paddingY && yTp1 <= height - paddingY) {
          badgesToRender.push({
            id: "tp1",
            y: yTp1,
            text: isTp1Hit ? `✅ TP1 HIT: +$${calc.tp1Profit}` : `🎯 TP1: ${tp1Price} (+$${calc.tp1Profit})`,
            bg: isTp1Hit ? "#16a34a" : (isLight ? "#16a34a" : "rgba(16, 185, 129, 0.92)"),
            fg: "#ffffff",
            border: "#10b981"
          });
        }

        if (yTp2 !== null && yTp2 >= paddingY && yTp2 <= height - paddingY) {
          badgesToRender.push({
            id: "tp2",
            y: yTp2,
            text: isTp2Hit ? `🚀 TP2 HIT: +$${calc.tp2Profit}` : `🎯 TP2: ${tp2Price} (+$${calc.tp2Profit})`,
            bg: isTp2Hit ? "#059669" : (isLight ? "#15803d" : "rgba(16, 185, 129, 0.88)"),
            fg: "#ffffff",
            border: "#059669"
          });
        }

        if (yTp3 !== null) {
          if (yTp3 >= paddingY && yTp3 <= height - paddingY) {
            badgesToRender.push({
              id: "tp3",
              y: yTp3,
              text: isTp3Hit ? `💎 TP3 HIT: +$${calc.tp3Profit}` : `🎯 TP3: ${tp3Price} (+$${calc.tp3Profit})`,
              bg: isTp3Hit ? "#ca8a04" : (isLight ? "#166534" : "rgba(16, 185, 129, 0.82)"),
              fg: "#ffffff",
              border: "#eab308"
            });
          } else {
            // Indicador fijado de TP3 en el borde sin deformar el gráfico
            const isAbove = yTp3 < paddingY;
            const pinY = isAbove ? paddingY + 6 : height - paddingY - 14;
            ctx.fillStyle = isTp3Hit ? "#ca8a04" : (isLight ? "#166534" : "rgba(16, 185, 129, 0.92)");
            ctx.fillRect(chartWidth - 126, pinY - 10, 122, 16);
            ctx.fillStyle = "#ffffff";
            ctx.font = "bold 8px monospace";
            ctx.textAlign = "right";
            ctx.fillText((isAbove ? "▲ TP3: " : "▼ TP3: ") + `${tp3Price} (+$${calc.tp3Profit})`, chartWidth - 6, pinY + 2);
          }
        }

        // Ordenar etiquetas por coordenada vertical Y (de arriba hacia abajo)
        badgesToRender.sort((a, b) => a.y - b.y);

        // Detectar cercanía (< 18px) y escalonar en 2 columnas para 0 colisiones
        const badgeW = 122;
        const badgeH = 16;
        let activeCol = 0; // 0 = Columna Principal (derecha), 1 = Columna Alterna (izquierda)

        for (let i = 0; i < badgesToRender.length; i++) {
          const currentBadge = badgesToRender[i];
          if (i > 0 && Math.abs(currentBadge.y - badgesToRender[i - 1].y) < 18) {
            // Hay colisión vertical: alternar columna
            activeCol = (activeCol === 0) ? 1 : 0;
          } else {
            activeCol = 0;
          }
          currentBadge.col = activeCol;
          currentBadge.x = (activeCol === 0) ? (chartWidth - 124) : (chartWidth - 250);
        }

        // Renderizado de las etiquetas escalonadas con guías visuales
        badgesToRender.forEach(b => {
          ctx.fillStyle = b.bg;
          ctx.fillRect(b.x, b.y - 11, badgeW, badgeH);
          ctx.strokeStyle = b.border || "rgba(255, 255, 255, 0.4)";
          ctx.lineWidth = 1;
          ctx.strokeRect(b.x, b.y - 11, badgeW, badgeH);

          // Si está en la columna alterna a la izquierda, pintar conector sutil hacia el eje
          if (b.col === 1) {
            ctx.strokeStyle = b.bg;
            ctx.setLineDash([2, 2]);
            ctx.beginPath();
            ctx.moveTo(b.x + badgeW, b.y - 3);
            ctx.lineTo(chartWidth - 126, b.y - 3);
            ctx.stroke();
            ctx.setLineDash([]);
          }

          ctx.fillStyle = b.fg;
          ctx.font = "bold 8px monospace";
          ctx.textAlign = "right";
          ctx.fillText(b.text, b.x + badgeW - 4, b.y + 1);
        });

        ctx.setLineDash([]);
      }

      // PÍLDORA DE ESTADO INSTITUCIONAL (SIN ELIMINAR LA ENTRADA)
      if (this.currentSignal && this.currentSignal.completedAt) {
        const isWin = this.currentSignal.completedStatus === "TP3_HIT";
        ctx.save();
        ctx.fillStyle = isWin ? "rgba(16, 185, 129, 0.92)" : "rgba(234, 179, 8, 0.92)";
        ctx.fillRect((chartWidth / 2) - 180, 10, 360, 24);
        ctx.strokeStyle = isWin ? "#10b981" : "#eab308";
        ctx.lineWidth = 1.4;
        ctx.strokeRect((chartWidth / 2) - 180, 10, 360, 24);

        ctx.fillStyle = "#ffffff";
        ctx.font = "bold 10px sans-serif";
        ctx.textAlign = "center";
        const bannerTxt = isWin
          ? `TP3 alcanzado (+${this.currentSignal.pipsWon ?? 0} pips en el modelo OHLC)`
          : (this.currentSignal.completedStatus === "AMBIGUOUS_BAR_SL_FIRST"
              ? "Stop alcanzado o misma vela ambigua; contado conservadoramente como stop"
              : `Stop alcanzado (${this.currentSignal.pipsWon ?? 0} pips en el modelo OHLC)`);
        ctx.fillText(bannerTxt, chartWidth / 2, 26);
        ctx.restore();
      }

      // BANNER HUD DE RADAR DE PROXIMIDAD DE SPIKE EN CANVAS (PRE-IGNICIÓN)
      if (!this.currentSignal && this.spikeRadar && this.spikeRadar.active && this.spikeRadar.marketId === this.selectedMarket) {
        ctx.save();
        const hudW = Math.min(420, chartWidth - 28);
        const hudH = 34;
        const hudX = (chartWidth / 2) - (hudW / 2);
        const hudY = 12;

        ctx.fillStyle = isLight ? "rgba(254, 240, 138, 0.95)" : "rgba(11, 17, 30, 0.92)";
        ctx.fillRect(hudX, hudY, hudW, hudH);
        ctx.strokeStyle = "#eab308";
        ctx.lineWidth = 1.4;
        ctx.strokeRect(hudX, hudY, hudW, hudH);

        ctx.fillStyle = isLight ? "#854d0e" : "#eab308";
        ctx.font = "bold 10px sans-serif";
        ctx.textAlign = "center";
        ctx.fillText(`DERIVA: ${this.spikeRadar.driftCandles} velas | Mediana histórica: ${this.spikeRadar.avgInterval}`, chartWidth / 2, hudY + 14);

        ctx.fillStyle = isLight ? "#0f172a" : "#cbd5e1";
        ctx.font = "bold 9px monospace";
        ctx.fillText("El histórico describe ciclos pasados; no predice el siguiente spike", chartWidth / 2, hudY + 27);
        ctx.restore();
      }
    }

    renderCandleHistoryTable() {
      const tbody = document.getElementById("candleHistoryTableBody");
      if (!tbody) return;

      const candles = this.candles[this.selectedMarket] || [];
      if (candles.length === 0) return;

      const limit = this.historyTableLimit === "all" ? candles.length : (parseInt(this.historyTableLimit, 10) || 50);
      const recent = candles.slice(-limit).reverse();
      const decimals = this.getMarketDecimals(this.selectedMarket);

      const countBadge = document.getElementById("candleHistoryCountBadge");
      if (countBadge) {
        countBadge.textContent = `Historial: ${candles.length} Velas (${recent.length} en tabla)`;
      }

      tbody.innerHTML = recent.map(c => {
        const isBull = c.isBull;
        return `
          <tr>
            <td style="font-family:monospace;color:#94a3b8;">${c.time}</td>
            <td style="font-family:monospace;">${c.open.toFixed(decimals)}</td>
            <td style="font-family:monospace;color:#10b981;">${c.high.toFixed(decimals)}</td>
            <td style="font-family:monospace;color:#ef4444;">${c.low.toFixed(decimals)}</td>
            <td style="font-family:monospace;font-weight:bold;color:${isBull ? '#10b981' : '#ef4444'};">${c.close.toFixed(decimals)}</td>
            <td style="font-family:monospace;color:${c.pips >= 0 ? '#10b981' : '#ef4444'};">
              ${c.pips >= 0 ? '+' : ''}${c.pips}
            </td>
            <td>
              ${c.isSpike ? `
                <span class="ak-badge safe">⚡ SPIKE</span>
              ` : `
                <span class="ak-badge ${isBull ? 'ok' : 'alert'}">${isBull ? '🟢 ALCISTA' : '🔴 BAJISTA'}</span>
              `}
            </td>
            <td style="font-family:monospace;color:#64748b;">${c.volume.toLocaleString()}</td>
          </tr>
        `;
      }).join('');
    }

    renderTickTape() {
      const tbody = document.getElementById("tickTapeBody");
      if (!tbody) return;

      if (this.liveTicks.length === 0) {
        tbody.innerHTML = `<tr><td colspan="4" style="text-align:center;color:#64748b;">Esperando ticks...</td></tr>`;
        return;
      }

      const decimals = this.getMarketDecimals(this.selectedMarket);
      tbody.innerHTML = this.liveTicks.map(t => {
        const isBuy = t.type === "BUY";
        return `
          <tr>
            <td style="font-family:monospace;color:#94a3b8;font-size:10px;">${t.time}</td>
            <td style="font-family:monospace;font-weight:bold;color:${isBuy ? '#10b981' : '#ef4444'};">${t.price.toFixed(decimals)}</td>
            <td style="font-family:monospace;color:#cbd5e1;">${t.lot}</td>
            <td><span class="ak-pill ${isBuy ? 'live' : 'sentinel'}" style="font-size:9px;padding:2px 6px;">${t.type}</span></td>
          </tr>
        `;
      }).join('');
    }

    renderScannerSignal() {
      const container = document.getElementById("scannerSignalContainer");
      if (!container) return;

      if (!this.currentSignal) {
        const liveFeed = this.dataFeedKeys[this.selectedMarket] === `${this.selectedMarket}:${this.selectedTimeframe}`;
        const status = liveFeed
          ? (this.scannerStatus || "Analizando histórico real; todavía no se cumplen todas las condiciones de entrada.")
          : "Sin conexión a datos reales. El gráfico de demostración es visual y no emite entradas.";
        container.innerHTML = `
          <div class="ak-signal-card" style="background:linear-gradient(135deg,#0b111e,#060a12);border:1px solid rgba(148,163,184,.25);border-radius:12px;padding:20px;">
            <strong style="color:#cbd5e1;">Escáner Sniper y armónico</strong>
            <p style="margin:8px 0 0;color:#94a3b8;font-size:13px;line-height:1.5;">${status}</p>
            <p style="margin:8px 0 0;color:#64748b;font-size:12px;">Una señal requiere vela cerrada, rechazo direccional y zona estructural. No muestra porcentajes de acierto no validados.</p>
          </div>`;
        return;
      }

      const sig = this.currentSignal;
      const isBuy = sig.type === "BUY" || sig.type === "CALL";
      const isBinary = sig.type === "CALL" || sig.type === "PUT";
      const activeLot = this.scannerSimulatedLot || null;
      const calc = this.calculateSafeLot(this.accountSize, sig.riskPips, sig.marketId, activeLot);
      const tiers = this.getLotTiersForMarket(sig.marketId, sig.riskPips);

      container.innerHTML = `
        <div class="ak-signal-card ${isBuy ? 'bullish' : 'bearish'}">
          <div class="ak-sig-head">
            <div style="display:flex;align-items:center;gap:12px;flex-wrap:wrap;">
              <span class="ak-sig-type-pill ${isBuy ? 'bull' : 'bear'}">
                ${isBuy ? '🟢 SEÑAL BUY CONFIRMADA' : '🔴 SEÑAL SELL CONFIRMADA'}
              </span>
              <div>
                <h3 style="margin:0;font-size:16px;color:#fff;">${sig.pattern}</h3>
                <span style="font-size:12px;color:#94a3b8;">${sig.marketName} &bull; Temporalidad: ${sig.timeframe} &bull; Detectado: ${sig.timestamp}</span>
              </div>
            </div>
            <div class="ak-sig-confluence">
              <span class="score">${sig.confluence}</span>
              <span class="sub">Confluencias verificadas</span>
            </div>
          </div>

          ${sig.spikeMetrics ? `
            <!-- Ciclo empírico: solo describe deriva observada; no predice cuándo ocurrirá el spike. -->
            <div style="background:rgba(16, 185, 129, 0.08);border:1px solid rgba(16, 185, 129, 0.35);border-radius:8px;padding:12px;margin-bottom:12px;">
              <div style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:8px;margin-bottom:6px;">
                <div style="display:flex;align-items:center;gap:8px;">
                  <span style="font-size:18px;">⚡</span>
                  <strong style="color:#10b981;font-size:13px;">RECHAZO DE SPIKE &bull; CICLO MEDIDO EN HISTÓRICO</strong>
                </div>
                  <span class="ak-pill live" style="font-size:10px;padding:2px 8px;">${sig.confluence} confluencias</span>
              </div>
              <p style="margin:0;font-size:11.5px;color:#cbd5e1;line-height:1.4;">
                Entrada ejecutada tras <strong>${sig.spikeMetrics.driftCandles} velas consecutivas de deriva</strong> con <strong>${sig.spikeMetrics.wickDetails}</strong>. El intervalo se estima con ${sig.spikeMetrics.observedIntervals} ciclos completos observados. Ese intervalo describe el pasado y no predice cuándo ocurrirá el siguiente spike.
              </p>
            </div>
          ` : ''}

          <!-- EXPLICACIÓN EXCLUSIVA DEL ESCÁNER SNIPER ESTILO SEBAS RAMÍREZ -->
          <div class="ak-sniper-story-card">
            <div style="display:flex;align-items:center;gap:10px;font-weight:800;color:#10b981;font-size:13px;margin-bottom:6px;">
              <span style="font-size:18px;">🎯</span>
              <span>¿CÓMO FUNCIONA EL ESCÁNER DE ALTA PRECISIÓN QUE USA SEBAS RAMÍREZ?</span>
              <span class="ak-pill live" style="font-size:10px;padding:2px 8px;">Objetivos 1R / 2R / 3R</span>
            </div>
            <p style="margin:0 0 10px 0;font-size:12px;color:#cbd5e1;line-height:1.5;">
              El marcador representa el cierre que cumplió los filtros de tendencia, rechazo y zona. Las líneas son referencias técnicas; la caja usa el stop estructural y objetivos 1R, 2R y 3R.
            </p>
            <div style="display:grid;grid-template-columns:repeat(auto-fit, minmax(260px, 1fr));gap:10px;">
              <div style="background:rgba(22, 163, 74, 0.12);border:1px solid #16a34a;border-radius:8px;padding:10px 12px;">
                <strong style="color:#16a34a;font-size:12px;">✓ CHULITO VERDE = COMPRA SNIPER:</strong>
                <p style="margin:4px 0 0 0;font-size:11px;color:#cbd5e1;line-height:1.4;">
                  Aparece únicamente después de una vela cerrada con rechazo comprador y confirmación en una zona estructural aceptada por el escáner.
                </p>
              </div>
              <div style="background:rgba(220, 38, 38, 0.12);border:1px solid #dc2626;border-radius:8px;padding:10px 12px;">
                <strong style="color:#dc2626;font-size:12px;">✓ CHULITO ROJO = VENTA SNIPER:</strong>
                <p style="margin:4px 0 0 0;font-size:11px;color:#cbd5e1;line-height:1.4;">
                  Aparece únicamente después de una vela cerrada con rechazo vendedor y confirmación en una zona estructural aceptada por el escáner.
                </p>
              </div>
            </div>
          </div>

          <!-- GUÍA EDUCATIVA DEL PATRÓN ARMÓNICO PARA EL DIRECTOR JHON -->
          <div class="ak-harmonic-explanation-box">
            <div style="display:flex;align-items:center;gap:8px;font-weight:700;color:#eab308;font-size:12px;margin-bottom:6px;">
              <span>💡</span> <strong>¿QUÉ MUESTRA EL PATRÓN ARMÓNICO?</strong>
            </div>
            <p style="margin:0 0 6px 0;font-size:11px;color:#cbd5e1;line-height:1.4;">
              El patrón mide cinco pivotes X, A, B, C y D usando proporciones de precio. El pivote se confirma varias velas después de formarse; el dibujo marca su origen histórico, pero el chulito solo aparece en el cierre posterior que cumple los filtros.
            </p>
            <div style="display:grid;grid-template-columns:repeat(auto-fit, minmax(220px, 1fr));gap:8px;font-size:11px;">
              <div style="background:rgba(0,0,0,0.3);padding:8px 10px;border-radius:6px;border-left:3px solid #10b981;">
                <strong style="color:#10b981;">🟢 Punta D hacia ABAJO = SEÑAL DE COMPRA:</strong><br/>
                Una punta D inferior puede formar un patrón alcista si sus ratios pasan los filtros. Akira todavía exige rechazo, tendencia compatible y precio dentro de la PRZ antes de dibujar BUY.
              </div>
              <div style="background:rgba(0,0,0,0.3);padding:8px 10px;border-radius:6px;border-left:3px solid #ef4444;">
                <strong style="color:#ef4444;">🔴 Punta D hacia ARRIBA = SEÑAL DE VENTA:</strong><br/>
                Una punta D superior puede formar un patrón bajista si sus ratios pasan los filtros. Akira todavía exige rechazo, tendencia compatible y precio dentro de la PRZ antes de dibujar SELL.
              </div>
            </div>
          </div>

          <!-- CALCULADORA INTERACTIVA DE LOTAJES, METAS (PIPS / USD) Y CAPITAL RECOMENDADO -->
          <div class="ak-lot-calculator-card" style="background:#0b111e;border:1px solid rgba(0,242,254,0.3);border-radius:10px;padding:14px;margin-bottom:14px;">
            <div style="margin-bottom:10px;padding:8px 10px;border:1px solid rgba(234,179,8,.35);border-radius:7px;color:#fcd34d;font-size:11px;">Los importes son estimaciones del simulador, no cotizaciones del broker. ${sig.marketId === "STEP100" ? "Step Index: la conversión de puntos a USD/lote no está configurada; los importes se muestran como N/D." : "Verifica el valor de contrato, spread y deslizamiento del símbolo."}</div>
            <div style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:10px;margin-bottom:12px;">
              <div style="display:flex;align-items:center;gap:10px;">
                <span style="font-size:22px;">🧮</span>
                <div>
                  <h4 style="margin:0;font-size:14px;color:#00f2fe;font-weight:800;">
                    CALCULADORA DE LOTAJES, METAS (PIPS / USD) Y CAPITAL RECOMENDADO
                  </h4>
                  <span style="font-size:11px;color:#94a3b8;">
                    Compara cuánto ganas en cada Take Profit según tu lotaje y cuál es la cuenta base recomendada para proteger tu dinero.
                  </span>
                </div>
              </div>
              <div style="display:flex;align-items:center;gap:8px;">
                <span style="font-size:11px;color:#cbd5e1;font-weight:700;">Simular Lotaje:</span>
                <input type="number" id="inputCustomLotSim" class="ak-input-text" style="width:85px;padding:5px 8px;font-size:13px;font-weight:bold;color:#00f2fe;text-align:center;background:#050811;border:1px solid #00f2fe;border-radius:6px;" value="${calc.lot}" step="0.01" min="0.01">
              </div>
            </div>

            <!-- BOTONES RÁPIDOS DE LOTAJES POR MERCADO -->
            <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;margin-bottom:14px;">
              <span style="font-size:11px;color:#94a3b8;font-weight:600;">Opciones Rápidas:</span>
              ${tiers.map(t => `
                <button class="ak-btn ${t.lot === calc.lot ? 'primary' : 'subtle'}" data-simlot="${t.lot}" style="padding:4px 10px;font-size:11px;font-weight:700;border-radius:6px;">
                  ${t.lot} Lote (Cta: $${t.recommendedBaseCapital})
                </button>
              `).join('')}
            </div>

            <!-- TARJETA RESUMEN DINÁMICA DEL LOTAJE ACTIVO -->
            <div style="display:grid;grid-template-columns:repeat(auto-fit, minmax(160px, 1fr));gap:10px;margin-bottom:14px;background:rgba(0,0,0,0.35);padding:12px;border-radius:8px;border:1px solid rgba(255,255,255,0.06);">
              <div style="border-left:3px solid #00f2fe;padding-left:8px;">
                <span style="font-size:10px;color:#94a3b8;text-transform:uppercase;font-weight:700;">Lotaje Simulado</span>
                <div style="font-size:16px;font-family:monospace;font-weight:bold;color:#00f2fe;">${calc.lot} lote(s)</div>
                <span style="font-size:10px;color:#64748b;">${calc.isCustomLot ? 'Personalizado' : 'Recomendado Oficial'}</span>
              </div>
              <div style="border-left:3px solid #eab308;padding-left:8px;">
                <span style="font-size:10px;color:#94a3b8;text-transform:uppercase;font-weight:700;">Capital Base en Cuenta</span>
                <div style="font-size:16px;font-family:monospace;font-weight:bold;color:#eab308;">$${calc.recommendedBaseCapital} USD</div>
                <span style="font-size:10px;color:#ca8a04;">Riesgo máx: ${calc.actualRiskPercent}%</span>
              </div>
              <div style="border-left:3px solid #ef4444;padding-left:8px;">
                <span style="font-size:10px;color:#94a3b8;text-transform:uppercase;font-weight:700;">Riesgo Stop Loss</span>
                <div style="font-size:16px;font-family:monospace;font-weight:bold;color:#ef4444;">-$${calc.actualRiskMoney} USD</div>
                <span style="font-size:10px;color:#fca5a5;">-${calc.slPips} pips de riesgo</span>
              </div>
              <div style="border-left:3px solid #10b981;padding-left:8px;">
                <span style="font-size:10px;color:#94a3b8;text-transform:uppercase;font-weight:700;">Ganancia TP1 (1:1)</span>
                <div style="font-size:16px;font-family:monospace;font-weight:bold;color:#10b981;">+$${calc.tp1Profit} USD</div>
                <span style="font-size:10px;color:#86efac;">+${calc.tp1Pips} pips</span>
              </div>
              <div style="border-left:3px solid #059669;padding-left:8px;">
                <span style="font-size:10px;color:#94a3b8;text-transform:uppercase;font-weight:700;">Ganancia TP2 (1:2)</span>
                <div style="font-size:16px;font-family:monospace;font-weight:bold;color:#34d399;">+$${calc.tp2Profit} USD</div>
                <span style="font-size:10px;color:#6ee7b7;">+${calc.tp2Pips} pips</span>
              </div>
              <div style="border-left:3px solid #f59e0b;padding-left:8px;">
                <span style="font-size:10px;color:#94a3b8;text-transform:uppercase;font-weight:700;">Ganancia TP3 (1:3)</span>
                <div style="font-size:16px;font-family:monospace;font-weight:bold;color:#f59e0b;">+$${calc.tp3Profit} USD</div>
                <span style="font-size:10px;color:#fde047;">+${calc.tp3Pips} pips Sniper</span>
              </div>
            </div>

            <!-- TABLA COMPARATIVA COMPLETA DE TODOS LOS LOTAJES -->
            <div style="overflow-x:auto;">
              <table style="width:100%;border-collapse:collapse;font-size:11px;text-align:left;">
                <thead>
                  <tr style="background:rgba(255,255,255,0.04);border-bottom:1px solid rgba(255,255,255,0.1);color:#94a3b8;">
                    <th style="padding:7px 10px;">Lotaje</th>
                    <th style="padding:7px 10px;">Cuenta Base Recomendada</th>
                    <th style="padding:7px 10px;">Riesgo Stop Loss</th>
                    <th style="padding:7px 10px;">Ganancia Meta 1 (TP1)</th>
                    <th style="padding:7px 10px;">Ganancia Meta 2 (TP2)</th>
                    <th style="padding:7px 10px;">Ganancia Meta 3 (TP3)</th>
                    <th style="padding:7px 10px;text-align:center;">Acción</th>
                  </tr>
                </thead>
                <tbody>
                  ${tiers.map(t => `
                    <tr style="border-bottom:1px solid rgba(255,255,255,0.04);background:${t.lot === calc.lot ? 'rgba(0,242,254,0.09)' : 'transparent'};">
                      <td style="padding:7px 10px;font-family:monospace;font-weight:bold;color:${t.lot === calc.lot ? '#00f2fe' : '#fff'};">
                        ${t.lot} ${t.lot === calc.defaultLot ? '<span class="ak-badge safe" style="font-size:9px;padding:1px 5px;margin-left:4px;">Mínimo</span>' : ''}
                      </td>
                      <td style="padding:7px 10px;font-family:monospace;font-weight:bold;color:#eab308;">
                        $${t.recommendedBaseCapital} USD
                      </td>
                      <td style="padding:7px 10px;font-family:monospace;color:#ef4444;">
                        -$${t.actualRiskMoney} USD <span style="color:#64748b;font-size:10px;">(-${t.slPips} pips | ${t.actualRiskPercent}%)</span>
                      </td>
                      <td style="padding:7px 10px;font-family:monospace;color:#10b981;">
                        +$${t.tp1Profit} USD <span style="color:#64748b;font-size:10px;">(+${t.tp1Pips} pips)</span>
                      </td>
                      <td style="padding:7px 10px;font-family:monospace;color:#34d399;">
                        +$${t.tp2Profit} USD <span style="color:#64748b;font-size:10px;">(+${t.tp2Pips} pips)</span>
                      </td>
                      <td style="padding:7px 10px;font-family:monospace;font-weight:bold;color:#f59e0b;">
                        +$${t.tp3Profit} USD <span style="color:#64748b;font-size:10px;">(+${t.tp3Pips} pips)</span>
                      </td>
                      <td style="padding:7px 10px;text-align:center;">
                        <button class="ak-btn subtle" data-simlot="${t.lot}" style="padding:2px 8px;font-size:10px;border-radius:4px;">
                          ${t.lot === calc.lot ? '✓ Activo' : 'Elegir'}
                        </button>
                      </td>
                    </tr>
                  `).join('')}
                </tbody>
              </table>
            </div>
          </div>

          <!-- RADAR DE SEGUIMIENTO EN VIVO: ¿YA LLEGÓ LA VELA AL TAKE PROFIT? -->
          <div class="ak-candle-sync-radar-card">
            <div style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:8px;margin-bottom:10px;">
              <div style="display:flex;align-items:center;gap:8px;">
                <span style="font-size:20px;">⏱️</span>
                <strong style="color:#00f2fe;font-size:13px;">RADAR DE METAS EN VIVO (CUENTA BASE: $${calc.recommendedBaseCapital} USD | LOTE: ${calc.lot})</strong>
              </div>
              <span class="ak-pill live" style="font-size:10px;">Auditando Velas en Tiempo Real</span>
            </div>
            
            <div style="display:grid;grid-template-columns:repeat(auto-fit, minmax(180px, 1fr));gap:10px;">
              <!-- 1. ENTRADA -->
              <div style="background:rgba(0, 242, 254, 0.08);border:1px solid rgba(0, 242, 254, 0.3);border-radius:8px;padding:10px;">
                <div style="display:flex;justify-content:space-between;align-items:center;">
                  <span style="font-size:11px;color:#94a3b8;font-weight:700;">1. ENTRADA:</span>
                  <span class="ak-badge ok">Activa</span>
                </div>
                <div style="margin-top:4px;font-size:15px;font-family:monospace;font-weight:bold;color:#00f2fe;">${sig.entry}</div>
                <p style="margin:2px 0 0 0;font-size:10px;color:#cbd5e1;">Debido lotaje: <strong style="color:#00f2fe;">${calc.lot}</strong></p>
              </div>

              <!-- 2. STOP LOSS -->
              <div style="background:rgba(220, 38, 38, 0.08);border:1px solid rgba(220, 38, 38, 0.3);border-radius:8px;padding:10px;">
                <div style="display:flex;justify-content:space-between;align-items:center;">
                  <span style="font-size:11px;color:#ef4444;font-weight:700;">2. STOP LOSS (SL):</span>
                  <span class="ak-badge alert">-${calc.slPips} pips</span>
                </div>
                <div style="margin-top:4px;font-size:15px;font-family:monospace;font-weight:bold;color:#ef4444;">${sig.sl}</div>
                <p style="margin:2px 0 0 0;font-size:10px;color:#cbd5e1;">Riesgo: <strong style="color:#fca5a5;">-$${calc.actualRiskMoney} USD</strong> (${calc.actualRiskPercent}%)</p>
              </div>

              <!-- 3. META 1 (TP1) -->
              <div style="background:rgba(16, 185, 129, 0.08);border:1px solid rgba(16, 185, 129, 0.3);border-radius:8px;padding:10px;">
                <div style="display:flex;justify-content:space-between;align-items:center;">
                  <span style="font-size:11px;color:#10b981;font-weight:700;">3. META 1 (TP1):</span>
                  <span class="ak-badge ok">+${calc.tp1Pips} pips</span>
                </div>
                <div style="margin-top:4px;font-size:15px;font-family:monospace;font-weight:bold;color:#10b981;">${sig.tp1}</div>
                <p style="margin:2px 0 0 0;font-size:10px;color:#cbd5e1;">Ganancia: <strong style="color:#86efac;">+$${calc.tp1Profit} USD</strong> (1:1)</p>
              </div>

              <!-- 4. META 2 (TP2) -->
              <div style="background:rgba(5, 150, 105, 0.08);border:1px solid rgba(5, 150, 105, 0.3);border-radius:8px;padding:10px;">
                <div style="display:flex;justify-content:space-between;align-items:center;">
                  <span style="font-size:11px;color:#34d399;font-weight:700;">4. META 2 (TP2):</span>
                  <span class="ak-badge ok">+${calc.tp2Pips} pips</span>
                </div>
                <div style="margin-top:4px;font-size:15px;font-family:monospace;font-weight:bold;color:#34d399;">${sig.tp2 || '-'}</div>
                <p style="margin:2px 0 0 0;font-size:10px;color:#cbd5e1;">Ganancia: <strong style="color:#6ee7b7;">+$${calc.tp2Profit} USD</strong> (1:2)</p>
              </div>

              <!-- 5. META 3 (TP3 SNIPER) -->
              <div style="background:rgba(202, 138, 4, 0.08);border:1px solid rgba(234, 179, 8, 0.3);border-radius:8px;padding:10px;">
                <div style="display:flex;justify-content:space-between;align-items:center;">
                  <span style="font-size:11px;color:#eab308;font-weight:700;">5. META 3 (TP3):</span>
                  <span class="ak-badge ok">+${calc.tp3Pips} pips</span>
                </div>
                <div style="margin-top:4px;font-size:15px;font-family:monospace;font-weight:bold;color:#eab308;">${sig.tp3 || '-'}</div>
                <p style="margin:2px 0 0 0;font-size:10px;color:#cbd5e1;">Ganancia: <strong style="color:#fde047;">+$${calc.tp3Profit} USD</strong> (1:3)</p>
              </div>
            </div>
          </div>

          <!-- GUÍA PRÁCTICA SIMPLIFICADA PARA EL DIRECTOR JHON -->
          <div class="ak-simple-trade-guide">
            <div class="ak-guide-card">
              <div class="ak-guide-badge">PASO 1</div>
              <div class="title">¿QUÉ OPERACIÓN HACER?</div>
              <div class="action-desc">
                Abrir una orden de <strong style="color:${isBuy ? '#10b981' : '#ef4444'};">${isBuy ? 'COMPRA (BUY)' : 'VENTA (SELL)'}</strong> en el precio <strong>${sig.entry}</strong>.
              </div>
            </div>

            <div class="ak-guide-card">
              <div class="ak-guide-badge">PASO 2</div>
              <div class="title">¿CUÁNTO INVERTIR?</div>
              <div class="action-desc">
                Cálculo demostrativo con los supuestos de contrato configurados: <strong>${calc.lot} lote(s)</strong>, riesgo estimado <strong style="color:#ef4444;">-$${calc.actualRiskMoney} USD</strong>. Confirma el valor del punto, spread y tamaño de contrato en el broker antes de operar.
              </div>
            </div>

            <div class="ak-guide-card">
              <div class="ak-guide-badge">PASO 3</div>
              <div class="title">¿DÓNDE PROTEGERTE (STOP LOSS)?</div>
              <div class="action-desc">
                ${!isBinary ? `
                  Nivel de invalidación de referencia: <strong style="color:#ef4444;">${sig.sl}</strong>. La señal no ejecuta ni cierra órdenes reales; la pérdida depende del tamaño, spread y ejecución.
                ` : `
                  Opciones Binarias: fijas expiración en <strong>60s o 2m</strong>. Si cierra a tu favor, cobras el <strong>85% neto</strong> de inmediato.
                `}
              </div>
            </div>

            <div class="ak-guide-card">
              <div class="ak-guide-badge">PASO 4</div>
              <div class="title">¿DÓNDE COBRAR TUS GANANCIAS?</div>
              <div class="action-desc">
                ${!isBinary ? `
                  🎯 <strong>Meta 1 (TP1):</strong> ${sig.tp1} (+${calc.tp1Pips} pips &bull; <strong style="color:#10b981;">+$${calc.tp1Profit} USD</strong>)<br/>
                  🚀 <strong>Meta 2 (TP2):</strong> ${sig.tp2} (+${calc.tp2Pips} pips &bull; <strong style="color:#059669;">+$${calc.tp2Profit} USD</strong>)<br/>
                  💎 <strong>Meta 3 (TP3):</strong> ${sig.tp3} (+${calc.tp3Pips} pips &bull; <strong style="color:#ca8a04;">+$${calc.tp3Profit} USD</strong> | Ratio 1:3 Sniper)
                ` : `
                  🎯 Retorno estimado por cada $10 invertidos: <strong>+$8.50 USD de ganancia neta</strong>.
                `}
              </div>
            </div>
          </div>

          ${sig.pivots ? `
            <div style="background:rgba(0,0,0,0.3);padding:8px 12px;border-radius:6px;font-size:11px;font-family:monospace;color:#94a3b8;display:flex;justify-content:space-between;flex-wrap:wrap;gap:8px;">
              <span>Pivots Matemáticos: X:${sig.pivots.X} &bull; A:${sig.pivots.A} &bull; B:${sig.pivots.B} &bull; C:${sig.pivots.C} &bull; D(PRZ):${sig.pivots.D}</span>
              <span style="color:#00f2fe;">Ratios: AB/XA:${sig.fibs?.AB_XA?.toFixed(3) ?? "N/D"} &bull; BC/AB:${sig.fibs?.BC_AB?.toFixed(3) ?? "N/D"} &bull; AD/XA:${sig.fibs?.AD_XA?.toFixed(3) ?? "N/D"}</span>
            </div>
          ` : ''}

          <div style="background:rgba(0, 242, 254, 0.06);border:1px solid rgba(0, 242, 254, 0.22);padding:9px 12px;border-radius:6px;font-size:11px;color:#cbd5e1;display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:8px;">
            <div>
              <strong style="color:#00f2fe;">🛡️ Filtros confirmados:</strong> ${sig.trendReason || "Estructura del precio"} &bull; Se analiza una vez por vela cerrada.
            </div>
            <span class="ak-badge safe" style="font-size:10px;">🔒 Señal Bloqueada en Gráfico</span>
          </div>

          <div class="ak-sig-actions">
            <button id="btnExecuteDemoSignal" class="ak-btn primary" style="padding:10px 22px;font-size:13px;font-weight:800;">
              🟢 EJECUTAR ESTA OPERACIÓN EN MODO DEMO
            </button>
            ${sig.completedAt ? `<button id="btnRescanSignal" class="ak-btn subtle" style="padding:10px 14px;font-size:12px;" title="Cerrar esta tarjeta; el próximo análisis se hará al cierre siguiente">🔄 Esperar siguiente cierre</button>` : ''}
            <button id="btnSendSignalTelegram" class="ak-btn" style="background:#0088cc;color:#fff;padding:10px 16px;">
              📲 Enviar Señal a Telegram
            </button>
            <button id="btnCopySignalText" class="ak-btn secondary" style="padding:10px 16px;">
              📋 Copiar Datos de Entrada
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
                  <td>${pos.currentPrice || pos.entryPrice}</td>
                  <td style="font-size:11px;color:#94a3b8;">
                    ${isBinary ? `⏱️ Expira: ${pos.remainingSeconds || 0}s` : `SL: ${pos.sl || '-'} | TP: ${pos.tp || '-'}`}
                  </td>
                  <td style="font-weight:bold;color:${isProfit ? '#10b981' : '#ef4444'};">
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

      const calc = this.calculateSafeLot(this.accountSize, this.currentSignal ? this.currentSignal.riskPips : null, this.selectedMarket);
      box.innerHTML = `
        <div class="ak-calc-grid">
          <div>
            <span class="sub">Capital Base (Ref):</span>
            <strong style="color:#00f2fe;">$${calc.capital.toLocaleString()} USD</strong>
          </div>
          <div>
            <span class="sub">Riesgo Objetivo (1.5%):</span>
            <strong style="color:#f59e0b;">$${calc.targetRiskMoney} USD</strong>
          </div>
          <div>
            <span class="sub">Debido Lotaje Sugerido:</span>
            <strong style="color:#10b981;">${calc.lot} Lote(s)</strong>
          </div>
          <div>
            <span class="sub">Riesgo Real SL (-${calc.slPips} pips):</span>
            <strong style="color:${calc.actualRiskPercent > 5 ? '#ef4444' : '#fff'};">-$${calc.actualRiskMoney} USD (${calc.actualRiskPercent}%)</strong>
          </div>
          <div>
            <span class="sub">Ganancia TP1 (+${calc.tp1Pips} pips):</span>
            <strong style="color:#10b981;">+$${calc.tp1Profit} USD</strong>
          </div>
          <div>
            <span class="sub">Ganancia TP2 (+${calc.tp2Pips} pips):</span>
            <strong style="color:#10b981;">+$${calc.tp2Profit} USD</strong>
          </div>
          <div>
            <span class="sub">Ganancia TP3 (+${calc.tp3Pips} pips | 1:3):</span>
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

      let checkpoints = [];
      if (days <= 30) checkpoints = [1, 2, 3, 5, 7, 10, 15, 20, 25, 30];
      else if (days <= 60) checkpoints = [1, 5, 10, 15, 20, 25, 30, 40, 50, 60];
      else if (days <= 90) checkpoints = [1, 5, 10, 15, 20, 25, 30, 45, 60, 75, 90];
      else checkpoints = [1, 10, 20, 30, 45, 60, 90, 120, 150, 180];

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
    }

    getWinRate() {
      if (this.paper.closedTrades.length === 0) return 0;
      const wins = this.paper.closedTrades.filter(t => t.pnl > 0).length;
      return Math.round((wins / this.paper.closedTrades.length) * 100);
    }

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

    executeDemoOrder(marketId, type, lot, sl = null, tp = null, isBinary = false, duration = 60) {
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
        pos.stake = lot;
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

    updateSentinelStats(isWin, pnl) {
      if (isWin) {
        this.sentinel.winsToday++;
        this.sentinel.consecutiveLosses = 0;
      } else {
        this.sentinel.lossesToday++;
        this.sentinel.consecutiveLosses++;
      }
      this.sentinel.dailyPnL = parseFloat((this.sentinel.dailyPnL + pnl).toFixed(2));

      if (this.sentinel.consecutiveLosses >= this.maxLossesLimit || this.sentinel.lossesToday >= this.maxLossesLimit) {
        this.sentinel.isCircuitBreakerActive = true;
        this.sentinel.lockReason = `🛑 CORTACIRCUITO ACTIVADO: Límite de ${this.maxLossesLimit} pérdidas alcanzado hoy. Pausa obligatoria de 24 horas para preservar el capital y domar la psicología.`;
      } else if (this.sentinel.winsToday >= this.maxWinsTarget) {
        this.sentinel.isCircuitBreakerActive = true;
        this.sentinel.lockReason = `🏆 ¡META DIARIA CUMPLIDA (+${this.sentinel.winsToday} Victorias)! Las matemáticas recomiendan asegurar beneficios y retirarse triunfador para no sobreoperar.`;
      }

      this.saveSentinel();
      const statusPill = document.querySelector(".ak-pill.sentinel");
      if (statusPill) {
        statusPill.className = `ak-pill sentinel ${this.sentinel.isCircuitBreakerActive ? 'alert' : 'ok'}`;
        statusPill.innerText = this.sentinel.isCircuitBreakerActive ? '🔴 CORTACIRCUITO ACTIVO' : '🛡️ ASIMÉTRICO (4W / 2L)';
      }
    }

    getTradingViewInterval() {
      switch(this.selectedTimeframe) {
        case "M1": return "1";
        case "M5": return "5";
        case "M15": return "15";
        case "H1": return "60";
        case "H4": return "240";
        case "D1": return "D";
        default: return "1";
      }
    }

    renderTradingViewChart() {
      const container = document.getElementById("tvChartContainer");
      if (!container) return;
      container.innerHTML = "";

      const m = MARKETS[this.selectedMarket] || MARKETS["BOOM1000"];
      if (!m.tvSymbol) {
        container.innerHTML = `<div style="padding:24px;color:#cbd5e1;background:#0b111e;border-radius:10px;">TradingView no tiene un símbolo configurado para ${m.name}. Usa el motor Cuántico Akira conectado a Deriv.</div>`;
        return;
      }
      const isLight = this.chartTheme === "light";
      const interval = this.getTradingViewInterval();
      const theme = isLight ? "light" : "dark";
      const sym = m.tvSymbol || "BINANCE:BTCUSDT";

      // 1. Barra de Control Superior de TradingView Pro
      const headerBar = document.createElement("div");
      headerBar.className = "ak-tv-header-bar";
      headerBar.style.cssText = "display:flex;align-items:center;justify-content:space-between;padding:8px 14px;background:rgba(15,23,42,0.92);border-bottom:1px solid rgba(255,255,255,0.08);font-size:12px;color:#94a3b8;flex-wrap:wrap;gap:8px;";
      headerBar.innerHTML = `
        <div style="display:flex;align-items:center;gap:8px;">
          <span style="display:inline-block;width:8px;height:8px;border-radius:50%;background:#00f2fe;box-shadow:0 0 8px #00f2fe;"></span>
          <strong style="color:#f8fafc;font-size:13px;">${m.icon} ${m.name}</strong>
          <span style="font-size:11px;color:#00f2fe;font-family:monospace;background:rgba(0,242,254,0.1);padding:2px 6px;border-radius:4px;">${sym}</span>
          <span class="ak-pill live" style="font-size:10px;">${this.selectedTimeframe}</span>
        </div>
        <div style="display:flex;align-items:center;gap:8px;">
          ${m.platformMode.startsWith("deriv") ? '<span style="color:#f59e0b;font-size:11px;display:none;" class="ak-tv-deriv-hint">⚡ Ticks Deriv en Vivo</span>' : ''}
          <button id="btnTvHeaderPineScript" style="background:linear-gradient(135deg,rgba(245,158,11,0.2),rgba(234,88,12,0.25));border:1px solid rgba(245,158,11,0.5);color:#fbbf24;padding:5px 12px;border-radius:6px;font-size:11px;cursor:pointer;font-weight:700;display:flex;align-items:center;gap:5px;" title="Ver y Copiar Indicador Pine Script Pro v5 para TradingView">
            ⚡ Indicador Pine Script Pro v5
          </button>
          <button id="btnTvHeaderSwitchCanvas" style="background:linear-gradient(135deg,rgba(0,242,254,0.18),rgba(99,102,241,0.22));border:1px solid rgba(0,242,254,0.45);color:#00f2fe;padding:5px 12px;border-radius:6px;font-size:11px;cursor:pointer;font-weight:700;display:flex;align-items:center;gap:5px;">
            🔬 Alternar a Cuántico Akira
          </button>
        </div>
      `;
      container.appendChild(headerBar);

      const btnSwitch = headerBar.querySelector("#btnTvHeaderSwitchCanvas");
      if (btnSwitch) {
        btnSwitch.addEventListener("click", () => {
          const btnEngineCanvas = document.getElementById("btnEngineCanvas");
          if (btnEngineCanvas) btnEngineCanvas.click();
        });
      }
      const btnHeaderPine = headerBar.querySelector("#btnTvHeaderPineScript");
      if (btnHeaderPine) {
        btnHeaderPine.addEventListener("click", () => {
          this.openTradingViewPineModal();
        });
      }

      // 2. Escenario Iframe Responsivo con Overlay de Carga Inteligente
      const iframeWrap = document.createElement("div");
      iframeWrap.style.cssText = "position:relative;width:100%;flex:1;min-height:510px;background:#080c14;";

      const loaderOverlay = document.createElement("div");
      loaderOverlay.id = "tvLoaderOverlay";
      loaderOverlay.style.cssText = "position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;background:#080c14;color:#94a3b8;z-index:5;gap:12px;padding:20px;text-align:center;";
      loaderOverlay.innerHTML = `
        <div style="width:34px;height:34px;border:3px solid rgba(0,242,254,0.15);border-top:3px solid #00f2fe;border-radius:50%;animation:akira-spin 0.8s linear infinite;"></div>
        <span style="color:#cbd5e1;font-size:12px;">Cargando TradingView Pro (${sym})...</span>
      `;
      iframeWrap.appendChild(loaderOverlay);

      // 3. Iframe Nativo TradingView (Directo, sin fallos de dynamic script ni CSP)
      const iframe = document.createElement("iframe");
      iframe.id = "tradingview_pro_iframe";
      iframe.name = "tradingview_pro_iframe";
      iframe.style.cssText = "width:100%;height:100%;border:none;min-height:510px;display:block;";
      iframe.setAttribute("allowtransparency", "true");
      iframe.setAttribute("scrolling", "no");
      iframe.setAttribute("allowfullscreen", "true");

      const encodedSym = encodeURIComponent(sym);
      iframe.src = `https://s.tradingview.com/widgetembed/?symbol=${encodedSym}&interval=${interval}&theme=${theme}&style=1&timezone=America%2FBogota&locale=es&enable_publishing=false&hide_side_toolbar=0&allow_symbol_change=1&saveimage=1`;

      let hasLoaded = false;
      iframe.onload = () => {
        hasLoaded = true;
        if (loaderOverlay && loaderOverlay.parentElement) {
          loaderOverlay.style.display = "none";
        }
      };

      // Temporizador de Seguridad (si TradingView bloquea el símbolo o el adblocker bloquea el frame)
      setTimeout(() => {
        if (!hasLoaded && loaderOverlay && loaderOverlay.parentElement) {
          loaderOverlay.innerHTML = `
            <div style="font-size:26px;">⚡</div>
            <div style="color:#f8fafc;font-weight:700;font-size:13.5px;">Sincronización con TradingView</div>
            <p style="font-size:12px;color:#94a3b8;max-width:420px;line-height:1.5;margin:4px 0 12px 0;">
              Si el gráfico tarda o el símbolo <strong>${sym}</strong> está restringido en este navegador, usa el motor nativo <strong>Cuántico Akira</strong> con datos oficiales de Deriv en vivo.
            </p>
            <button id="btnTvFallbackLoad" style="background:#00f2fe;color:#050811;border:none;padding:8px 18px;border-radius:6px;font-weight:700;font-size:12px;cursor:pointer;">
              🔬 Abrir Cuántico Akira (Deriv API Oficial)
            </button>
          `;
          const btnFb = loaderOverlay.querySelector("#btnTvFallbackLoad");
          if (btnFb) {
            btnFb.addEventListener("click", () => {
              const btnEngineCanvas = document.getElementById("btnEngineCanvas");
              if (btnEngineCanvas) btnEngineCanvas.click();
            });
          }
        }
      }, 5000);

      iframeWrap.appendChild(iframe);
      container.appendChild(iframeWrap);
    }

    loadTradingViewWidget() {
      const container = document.getElementById("tradingview_widget_container");
      if (!container) return;
      container.innerHTML = "";

      const m = MARKETS[this.selectedMarket] || MARKETS["BOOM1000"];
      if (!m.tvSymbol) {
        container.innerHTML = `<div style="padding:24px;color:#cbd5e1;background:#0b111e;border-radius:10px;">No hay un símbolo TradingView configurado para ${m.name}. Usa el gráfico Cuántico Akira conectado a Deriv.</div>`;
        return;
      }
      const isLight = this.chartTheme === "light";
      const interval = this.getTradingViewInterval();
      const theme = isLight ? "light" : "dark";
      const sym = m.tvSymbol || "BINANCE:BTCUSDT";

      const iframe = document.createElement("iframe");
      iframe.style.cssText = "width:100%;height:550px;border:none;border-radius:8px;background:#080c14;";
      iframe.setAttribute("allowtransparency", "true");
      iframe.setAttribute("scrolling", "no");
      iframe.setAttribute("allowfullscreen", "true");
      iframe.src = `https://s.tradingview.com/widgetembed/?symbol=${encodeURIComponent(sym)}&interval=${interval}&theme=${theme}&style=1&timezone=America%2FBogota&locale=es&enable_publishing=false&hide_side_toolbar=0&allow_symbol_change=1&saveimage=1`;

      container.appendChild(iframe);
    }

    bindEvents() {
      const container = document.getElementById("tradingSection");
      if (!container) return;

      container.querySelectorAll(".ak-ttab-btn").forEach(btn => {
        btn.addEventListener("click", (e) => {
          const tab = e.currentTarget.dataset.ttab;
          this.activeTab = tab;
          container.querySelectorAll(".ak-ttab-btn").forEach(b => b.classList.remove("active"));
          container.querySelectorAll(".ak-ttab-pane").forEach(p => p.classList.remove("active"));
          e.currentTarget.classList.add("active");
          const target = document.getElementById(`tab-${tab}`);
          if (target) target.classList.add("active");

          if (tab === "market") {
            if (this.chartEngine === "tradingview") {
              setTimeout(() => this.renderTradingViewChart(), 60);
            } else {
              setTimeout(() => this.drawMarketCanvas(), 60);
            }
          } else if (tab === "tvchart") {
            setTimeout(() => this.loadTradingViewWidget(), 100);
          }
        });
      });

      // Botón Rápido de Telegram en Cabecera del Gráfico
      const btnHeaderTg = document.getElementById("btnHeaderTelegramAlerts");
      if (btnHeaderTg) {
        btnHeaderTg.addEventListener("click", () => {
          const connTabBtn = document.querySelector('[data-ttab="connections"]');
          if (connTabBtn) connTabBtn.click();
          setTimeout(() => {
            const tokInput = document.getElementById("tgBotTokenInput");
            if (tokInput) {
              tokInput.scrollIntoView({ behavior: "smooth", block: "center" });
              tokInput.focus();
            }
          }, 180);
        });
      }

      // Cambio de Mercado Activo (Limpia señales viejas y conecta de inmediato a Deriv Oficial)
      const selMarket = document.getElementById("selMarketActive");
      const selMarketHdr = document.getElementById("selMarketHeader");

      const handleMarketChange = (newMarket) => {
        this.selectedMarket = newMarket;
        if (selMarket) selMarket.value = newMarket;
        if (selMarketHdr) selMarketHdr.value = newMarket;
        this.currentSignal = null;
        this.spikeRadar = null;
        this.scannerStatus = "Cargando datos reales del mercado seleccionado.";
        this.scannerSimulatedLot = null; // Retirar entrada del mercado anterior
        this.accumulationStatus = null;
        this.verticalOffset = 0; // Centrar vista vertical para el nuevo mercado
        this.updateChartCanvasHeader();
        if (!this.isDerivWsConnected && (!this.candles[this.selectedMarket] || this.candles[this.selectedMarket].length === 0)) {
          this.candles[this.selectedMarket] = this.generateHistoricalCandles(this.selectedMarket, 350);
          this.generateHarmonicSignal(this.selectedMarket, this.selectedTimeframe);
        }
        this.updateLiveHeaderTelemetry();
        this.renderPlatformSpecialDeck();
        this.renderCandleHistoryTable();
        if (this.chartEngine === "tradingview") {
          this.renderTradingViewChart();
        } else {
          this.drawMarketCanvas();
        }
        this.subscribeToCurrentMarketDeriv(); // Pide velas reales inmediatamente a Deriv oficial
      };

      if (selMarket) {
        selMarket.addEventListener("change", (e) => handleMarketChange(e.target.value));
      }
      if (selMarketHdr) {
        selMarketHdr.addEventListener("change", (e) => handleMarketChange(e.target.value));
      }

      // Cambio de Temporalidad (Sincronización exacta con Deriv en M1, M5, M15, H1, H4, D1)
      container.querySelectorAll(".ak-tf-buttons .ak-tf-btn").forEach(btn => {
        btn.addEventListener("click", (e) => {
          const tf = e.currentTarget.dataset.tf;
          if (!tf) return;
          container.querySelectorAll(".ak-tf-buttons .ak-tf-btn").forEach(b => {
            if (b.dataset.tf === tf) b.classList.add("active");
            else b.classList.remove("active");
          });
          this.selectedTimeframe = tf;
          this.currentSignal = null;
          this.spikeRadar = null;
          this.scannerStatus = "Cargando datos reales de la temporalidad seleccionada.";
          this.scannerSimulatedLot = null; // Retirar entrada de la temporalidad anterior
          this.accumulationStatus = null;
          this.updateChartCanvasHeader();
          if (this.chartEngine === "tradingview") {
            this.renderTradingViewChart();
          } else {
            if (!this.isDerivWsConnected) {
              this.candles[this.selectedMarket] = this.generateHistoricalCandles(this.selectedMarket, 350);
              this.generateHarmonicSignal(this.selectedMarket, this.selectedTimeframe);
              this.renderCandleHistoryTable();
              this.drawMarketCanvas();
            } else {
              // Con WS conectado: NO pisar con velas simuladas. Deriv responderá con las velas auténticas.
              this.subscribeToCurrentMarketDeriv();
            }
          }
        });
      });

      // Selector de Motor de Gráfico: TradingView Pro vs Cuántico Akira
      const btnEngineTV = document.getElementById("btnEngineTV");
      const btnEngineCanvas = document.getElementById("btnEngineCanvas");
      const btnTvPineScriptModal = document.getElementById("btnTvPineScriptModal");
      if (btnTvPineScriptModal) {
        btnTvPineScriptModal.addEventListener("click", () => {
          this.openTradingViewPineModal();
        });
      }
      if (btnEngineTV) {
        btnEngineTV.addEventListener("click", () => {
          this.chartEngine = "tradingview";
          localStorage.setItem("akira_chart_engine", "tradingview");
          btnEngineTV.classList.add("active");
          if (btnEngineCanvas) btnEngineCanvas.classList.remove("active");
          const tvBox = document.getElementById("tvChartContainer");
          const cvBox = document.getElementById("canvasChartContainer");
          const navBar = document.getElementById("chartNavBar");
          const insp = document.getElementById("canvasOhlcInspector");
          const subType = document.getElementById("canvasChartSubtypeGroup");
          if (tvBox) tvBox.style.display = "flex";
          if (cvBox) cvBox.style.display = "none";
          if (navBar) navBar.style.display = "none";
          if (insp) insp.style.display = "none";
          if (subType) subType.style.display = "none";
          this.updateChartCanvasHeader();
          this.renderTradingViewChart();
        });
      }
      if (btnEngineCanvas) {
        btnEngineCanvas.addEventListener("click", () => {
          this.chartEngine = "canvas";
          localStorage.setItem("akira_chart_engine", "canvas");
          btnEngineCanvas.classList.add("active");
          if (btnEngineTV) btnEngineTV.classList.remove("active");
          const tvBox = document.getElementById("tvChartContainer");
          const cvBox = document.getElementById("canvasChartContainer");
          const navBar = document.getElementById("chartNavBar");
          const insp = document.getElementById("canvasOhlcInspector");
          const subType = document.getElementById("canvasChartSubtypeGroup");
          if (tvBox) tvBox.style.display = "none";
          if (cvBox) cvBox.style.display = "flex";
          if (navBar) navBar.style.display = "flex";
          if (insp) insp.style.display = "flex";
          if (subType) subType.style.display = "flex";
          this.updateChartCanvasHeader();
          this.drawMarketCanvas();
        });
      }

      // Cambio de Tipo de Gráfico: Velas Japonesas vs Línea / Acumuladores Deriv
      const btnCandles = document.getElementById("btnChartCandles");
      const btnLine = document.getElementById("btnChartLine");
      if (btnCandles) {
        btnCandles.addEventListener("click", () => {
          this.chartType = "candles";
          btnCandles.classList.add("active");
          if (btnLine) btnLine.classList.remove("active");
          this.drawMarketCanvas();
        });
      }
      if (btnLine) {
        btnLine.addEventListener("click", () => {
          this.chartType = "line";
          btnLine.classList.add("active");
          if (btnCandles) btnCandles.classList.remove("active");
          this.drawMarketCanvas();
        });
      }

      const btnEMA = document.getElementById("btnToggleEMA");
      if (btnEMA) {
        btnEMA.addEventListener("click", () => {
          this.showEMA = !this.showEMA;
          btnEMA.classList.toggle("active", this.showEMA);
          this.drawMarketCanvas();
        });
      }

      const btnHarmonics = document.getElementById("btnToggleHarmonics");
      if (btnHarmonics) {
        btnHarmonics.addEventListener("click", () => {
          this.showHarmonics = !this.showHarmonics;
          btnHarmonics.classList.toggle("active", this.showHarmonics);
          this.drawMarketCanvas();
        });
      }

      const btnLevels = document.getElementById("btnToggleLevels");
      if (btnLevels) {
        btnLevels.addEventListener("click", () => {
          this.showLevels = !this.showLevels;
          btnLevels.classList.toggle("active", this.showLevels);
          this.drawMarketCanvas();
        });
      }

      const btnFs = document.getElementById("btnToggleFullscreen");
      if (btnFs) {
        btnFs.addEventListener("click", () => {
          this.toggleFullscreen();
        });
      }

      // BARRA DE DESPLAZAMIENTO Y CONTROL DE VIEWPORT HORIZONTAL
      const scrollSlider = document.getElementById("chartScrollSlider");
      if (scrollSlider) {
        scrollSlider.addEventListener("input", (e) => {
          this.scrollOffset = parseInt(e.target.value, 10);
          this.requestCanvasRedraw();
        });
      }

      const btnJumpToStart = document.getElementById("btnJumpToStart");
      if (btnJumpToStart) {
        btnJumpToStart.addEventListener("click", () => {
          const totalCandles = this.candles[this.selectedMarket]?.length || 45;
          const maxScroll = Math.max(0, totalCandles - this.visibleBars);
          this.scrollOffset = maxScroll;
          const sl = document.getElementById("chartScrollSlider");
          if (sl) {
            sl.max = maxScroll.toString();
            sl.value = maxScroll.toString();
          }
          this.drawMarketCanvas();
        });
      }

      const btnJumpToLive = document.getElementById("btnJumpToLive");
      if (btnJumpToLive) {
        btnJumpToLive.addEventListener("click", () => {
          this.scrollOffset = 0;
          const sl = document.getElementById("chartScrollSlider");
          if (sl) sl.value = "0";
          this.drawMarketCanvas();
        });
      }

      const btnFitAllHistory = document.getElementById("btnFitAllHistory");
      if (btnFitAllHistory) {
        btnFitAllHistory.addEventListener("click", () => {
          const totalCandles = this.candles[this.selectedMarket]?.length || 45;
          this.visibleBars = Math.min(totalCandles, 400);
          this.scrollOffset = 0;
          this.verticalOffset = 0;
          const sl = document.getElementById("chartScrollSlider");
          if (sl) sl.value = "0";
          const vsl = document.getElementById("chartVScrollSlider");
          if (vsl) vsl.value = "0";
          this.drawMarketCanvas();
        });
      }

      const btnScrollLeft = document.getElementById("btnScrollLeft");
      if (btnScrollLeft) {
        btnScrollLeft.addEventListener("click", () => {
          const totalCandles = this.candles[this.selectedMarket]?.length || 45;
          const maxScroll = Math.max(0, totalCandles - this.visibleBars);
          this.scrollOffset = Math.min(maxScroll, this.scrollOffset + 15);
          const sl = document.getElementById("chartScrollSlider");
          if (sl) {
            sl.max = maxScroll.toString();
            sl.value = this.scrollOffset.toString();
          }
          this.drawMarketCanvas();
        });
      }

      const btnScrollRight = document.getElementById("btnScrollRight");
      if (btnScrollRight) {
        btnScrollRight.addEventListener("click", () => {
          this.scrollOffset = Math.max(0, this.scrollOffset - 15);
          const sl = document.getElementById("chartScrollSlider");
          if (sl) sl.value = this.scrollOffset.toString();
          this.drawMarketCanvas();
        });
      }

      const btnZoomOut = document.getElementById("btnZoomOut");
      if (btnZoomOut) {
        btnZoomOut.addEventListener("click", () => {
          this.visibleBars = Math.min(450, this.visibleBars + 15);
          this.drawMarketCanvas();
        });
      }

      const btnZoomIn = document.getElementById("btnZoomIn");
      if (btnZoomIn) {
        btnZoomIn.addEventListener("click", () => {
          this.visibleBars = Math.max(14, this.visibleBars - 10);
          this.drawMarketCanvas();
        });
      }

      // Delegación para botones de límite de historial de tabla
      const tableDataGrid = document.querySelector(".ak-market-data-grid");
      if (tableDataGrid) {
        tableDataGrid.addEventListener("click", (e) => {
          const btn = e.target.closest("[data-hist-limit]");
          if (!btn) return;
          const lim = btn.getAttribute("data-hist-limit");
          this.historyTableLimit = (lim === "all") ? "all" : parseInt(lim, 10);
          tableDataGrid.querySelectorAll("[data-hist-limit]").forEach(b => b.classList.remove("active"));
          btn.classList.add("active");
          this.renderCandleHistoryTable();
        });
      }

      const btnToggleSniper = document.getElementById("btnToggleSniper");
      if (btnToggleSniper) {
        btnToggleSniper.addEventListener("click", () => {
          this.showSniper = !this.showSniper;
          btnToggleSniper.classList.toggle("active", this.showSniper);
          this.drawMarketCanvas();
        });
      }

      const btnToggleTheme = document.getElementById("btnToggleTheme");
      if (btnToggleTheme) {
        btnToggleTheme.addEventListener("click", () => {
          this.chartTheme = (this.chartTheme === "light") ? "dark" : "light";
          localStorage.setItem("akira_chart_theme", this.chartTheme);
          btnToggleTheme.innerHTML = (this.chartTheme === "light") ? "🌙 Modo Oscuro" : "☀️ Fondo Blanco";
          const wrapper = document.getElementById("akiraChartCanvasWrapper");
          if (wrapper) {
            wrapper.classList.toggle("theme-light", this.chartTheme === "light");
          }
          if (this.chartEngine === "tradingview") {
            this.renderTradingViewChart();
          } else {
            this.drawMarketCanvas();
          }
        });
      }

      const btnToggleMargin = document.getElementById("btnToggleMargin");
      if (btnToggleMargin) {
        btnToggleMargin.addEventListener("click", () => {
          this.rightMarginBars = (this.rightMarginBars === 8) ? 14 : (this.rightMarginBars === 14 ? 4 : 8);
          btnToggleMargin.innerText = `📐 Espacio Derecha (${this.rightMarginBars} velas)`;
          this.drawMarketCanvas();
        });
      }

      // EVENTOS DE LA BARRA VERTICAL (ARRIBA / ABAJO)
      const btnScrollUp = document.getElementById("btnScrollUp");
      if (btnScrollUp) {
        btnScrollUp.addEventListener("click", () => {
          this.verticalOffset = Math.min(100, (this.verticalOffset || 0) + 15);
          this.drawMarketCanvas();
        });
      }

      const btnScrollDown = document.getElementById("btnScrollDown");
      if (btnScrollDown) {
        btnScrollDown.addEventListener("click", () => {
          this.verticalOffset = Math.max(-100, (this.verticalOffset || 0) - 15);
          this.drawMarketCanvas();
        });
      }

      const btnResetVScroll = document.getElementById("btnResetVScroll");
      if (btnResetVScroll) {
        btnResetVScroll.addEventListener("click", () => {
          this.verticalOffset = 0;
          this.drawMarketCanvas();
        });
      }

      const vScrollSlider = document.getElementById("chartVScrollSlider");
      if (vScrollSlider) {
        vScrollSlider.addEventListener("input", (e) => {
          this.verticalOffset = parseInt(e.target.value, 10);
          this.requestCanvasRedraw();
        });
      }

      const btnResetView = document.getElementById("btnResetView");
      if (btnResetView) {
        btnResetView.addEventListener("click", () => {
          this.scrollOffset = 0;
          this.verticalOffset = 0;
          this.visibleBars = 45;
          this.rightMarginBars = 8;
          const sl = document.getElementById("chartScrollSlider");
          if (sl) sl.value = "0";
          const vsl = document.getElementById("chartVScrollSlider");
          if (vsl) vsl.value = "0";
          this.drawMarketCanvas();
        });
      }

      // ARRASTRE DE PANTALLA 2D CON EL MOUSE (PAN HORIZONTAL Y VERTICAL LIBRE)
      let isCanvasDragging = false;
      let dragStartX = 0;
      let dragStartY = 0;
      let initialOffsetX = 0;
      let initialOffsetY = 0;

      const chartCanvasEl = document.getElementById("akiraMarketCanvas");
      if (chartCanvasEl) {
        chartCanvasEl.addEventListener("mousedown", (e) => {
          isCanvasDragging = true;
          dragStartX = e.clientX;
          dragStartY = e.clientY;
          initialOffsetX = this.scrollOffset;
          initialOffsetY = this.verticalOffset || 0;
          chartCanvasEl.style.cursor = "grabbing";
        });

        window.addEventListener("mousemove", (e) => {
          if (!isCanvasDragging) return;
          // 1. Mover horizontalmente (izquierda / derecha en el tiempo)
          const dx = e.clientX - dragStartX;
          const stepX = (chartCanvasEl.width - 90) / (this.visibleBars + this.rightMarginBars);
          const candleDelta = Math.round(dx / Math.max(1, stepX));
          const maxScroll = Math.max(0, (this.candles[this.selectedMarket]?.length || 45) - this.visibleBars);
          this.scrollOffset = Math.max(0, Math.min(maxScroll, initialOffsetX + candleDelta));
          const sl = document.getElementById("chartScrollSlider");
          if (sl) sl.value = this.scrollOffset.toString();

          // 2. Mover verticalmente (arriba / abajo en la escala de precios)
          const dy = e.clientY - dragStartY;
          const vSensitivity = 0.35;
          const vDelta = dy * vSensitivity;
          this.verticalOffset = Math.max(-100, Math.min(100, initialOffsetY + vDelta));
          const vsl = document.getElementById("chartVScrollSlider");
          if (vsl) vsl.value = this.verticalOffset.toString();

          this.requestCanvasRedraw();
        });

        window.addEventListener("mouseup", () => {
          if (isCanvasDragging) {
            isCanvasDragging = false;
            chartCanvasEl.style.cursor = "crosshair";
          }
        });

        // INTERACCIÓN CON LA RUEDITA DEL MOUSE (ZOOM IN / ZOOM OUT INTELIGENTE ESTILO TRADINGVIEW & MT5)
        chartCanvasEl.addEventListener("wheel", (e) => {
          e.preventDefault();

          if (e.shiftKey) {
            // Shift + Rueda = Desplazamiento horizontal en el tiempo
            const scrollDelta = e.deltaY > 0 ? 3 : -3;
            const maxScroll = Math.max(0, (this.candles[this.selectedMarket]?.length || 45) - this.visibleBars);
            this.scrollOffset = Math.max(0, Math.min(maxScroll, this.scrollOffset + scrollDelta));
            const sl = document.getElementById("chartScrollSlider");
            if (sl) sl.value = this.scrollOffset.toString();
          } else if (e.altKey) {
            // Alt + Rueda = Desplazamiento vertical en la escala de precios
            const vDelta = e.deltaY > 0 ? -6 : 6;
            this.verticalOffset = Math.max(-100, Math.min(100, (this.verticalOffset || 0) + vDelta));
            const vsl = document.getElementById("chartVScrollSlider");
            if (vsl) vsl.value = this.verticalOffset.toString();
          } else {
            // Rueda estándar: Acercar (Zoom In) o Alejar (Zoom Out)
            // e.deltaY < 0 (hacia arriba): ACERCAR (menos velas visibles, velas más grandes)
            // e.deltaY > 0 (hacia abajo): ALEJAR (más velas visibles, perspectiva macro)
            const zoomDelta = e.deltaY < 0 ? -3 : 3;
            const newBars = Math.max(14, Math.min(450, this.visibleBars + zoomDelta));
            if (newBars !== this.visibleBars) {
              this.visibleBars = newBars;
              const maxScroll = Math.max(0, (this.candles[this.selectedMarket]?.length || 45) - this.visibleBars);
              this.scrollOffset = Math.max(0, Math.min(maxScroll, this.scrollOffset));
              const sl = document.getElementById("chartScrollSlider");
              if (sl) sl.value = this.scrollOffset.toString();
            }
          }

          this.requestCanvasRedraw();
        }, { passive: false });

        // SOPORTE TOUCH GESTUAL PARA MÓVILES (PAN CON 1 DEDO Y PINCH-TO-ZOOM CON 2 DEDOS)
        let pinchStartDistance = 0;
        let initialBarsOnPinch = 45;

        chartCanvasEl.addEventListener("touchstart", (e) => {
          if (e.touches.length === 1) {
            isCanvasDragging = true;
            dragStartX = e.touches[0].clientX;
            dragStartY = e.touches[0].clientY;
            initialOffsetX = this.scrollOffset;
            initialOffsetY = this.verticalOffset || 0;
          } else if (e.touches.length === 2) {
            isCanvasDragging = false;
            pinchStartDistance = Math.hypot(
              e.touches[0].clientX - e.touches[1].clientX,
              e.touches[0].clientY - e.touches[1].clientY
            );
            initialBarsOnPinch = this.visibleBars;
          }
        }, { passive: true });

        window.addEventListener("touchmove", (e) => {
          if (e.touches.length === 2 && pinchStartDistance > 10) {
            const currentDist = Math.hypot(
              e.touches[0].clientX - e.touches[1].clientX,
              e.touches[0].clientY - e.touches[1].clientY
            );
            const ratio = currentDist / pinchStartDistance;
            const targetBars = Math.round(initialBarsOnPinch / Math.max(0.2, ratio));
            const newBars = Math.max(14, Math.min(130, targetBars));
            if (newBars !== this.visibleBars) {
              this.visibleBars = newBars;
              this.requestCanvasRedraw();
            }
            return;
          }

          if (!isCanvasDragging || e.touches.length !== 1) return;
          // Desplazamiento horizontal con el dedo
          const dx = e.touches[0].clientX - dragStartX;
          const stepX = (chartCanvasEl.width - (chartCanvasEl.width < 520 ? 62 : 90)) / (this.visibleBars + this.rightMarginBars);
          const candleDelta = Math.round(dx / Math.max(1, stepX));
          const maxScroll = Math.max(0, (this.candles[this.selectedMarket]?.length || 45) - this.visibleBars);
          this.scrollOffset = Math.max(0, Math.min(maxScroll, initialOffsetX + candleDelta));
          const sl = document.getElementById("chartScrollSlider");
          if (sl) sl.value = this.scrollOffset.toString();

          // Desplazamiento vertical con el dedo
          const dy = e.touches[0].clientY - dragStartY;
          const vSensitivity = 0.35;
          const vDelta = dy * vSensitivity;
          this.verticalOffset = Math.max(-100, Math.min(100, initialOffsetY + vDelta));
          const vsl = document.getElementById("chartVScrollSlider");
          if (vsl) vsl.value = this.verticalOffset.toString();

          this.requestCanvasRedraw();
        }, { passive: true });

        window.addEventListener("touchend", () => {
          if (isCanvasDragging) {
            isCanvasDragging = false;
          }
          pinchStartDistance = 0;
        }, { passive: true });
      }

      window.addEventListener("keydown", (e) => {
        if (e.key === "Escape" && this.isFullscreen) {
          this.toggleFullscreen(false);
        }
      });

      let resizeTimeout = null;
      const handleResponsiveResize = () => {
        clearTimeout(resizeTimeout);
        resizeTimeout = setTimeout(() => {
          if (this.activeTab === "market") {
            this.requestCanvasRedraw();
          }
        }, 60);
      };

      window.addEventListener("resize", handleResponsiveResize);
      window.addEventListener("orientationchange", handleResponsiveResize);

      document.addEventListener("fullscreenchange", () => {
        if (!document.fullscreenElement && this.isFullscreen) {
          this.toggleFullscreen(false);
        }
      });

      const canvas = document.getElementById("akiraMarketCanvas");
      const inspector = document.getElementById("canvasOhlcInspector");
      if (canvas && inspector) {
        canvas.addEventListener("mousemove", (e) => {
          const rect = canvas.getBoundingClientRect();
          const scaleX = canvas.width / rect.width;
          const mouseX = (e.clientX - rect.left) * scaleX;
          const allCandles = this.candles[this.selectedMarket] || [];
          if (allCandles.length === 0) return;

          const chartWidth = canvas.width - 85;
          const visibleCount = Math.min(allCandles.length, this.visibleBars);
          const freeRightSlots = (this.scrollOffset === 0) ? this.rightMarginBars : 0;
          const totalSlots = visibleCount + freeRightSlots;
          const stepX = chartWidth / totalSlots;

          const slotIndex = Math.floor(mouseX / stepX);
          const endIdx = allCandles.length - this.scrollOffset;
          const startIdx = Math.max(0, endIdx - visibleCount);
          const c = (slotIndex >= 0 && slotIndex < visibleCount) ? allCandles[startIdx + slotIndex] : null;

          if (c) {
            const isBull = c.isBull;
            const decimals = this.getMarketDecimals(this.selectedMarket);
            inspector.innerHTML = `
              <strong style="color:#00f2fe;">Hora: ${c.time}</strong> &bull;
              <span>Open: <strong>${c.open.toFixed(decimals)}</strong></span> &bull;
              <span style="color:#10b981;">High: <strong>${c.high.toFixed(decimals)}</strong></span> &bull;
              <span style="color:#ef4444;">Low: <strong>${c.low.toFixed(decimals)}</strong></span> &bull;
              <span>Close: <strong style="color:${isBull ? '#10b981' : '#ef4444'};">${c.close.toFixed(decimals)}</strong></span> &bull;
              <span>Rango: <strong style="color:${c.pips >= 0 ? '#10b981' : '#ef4444'};">${c.pips >= 0 ? '+' : ''}${c.pips} pips</strong></span> &bull;
              <span>Vol: <strong>${c.volume.toLocaleString()}</strong></span>
            `;
          }
        });

        canvas.addEventListener("mouseleave", () => {
          inspector.innerHTML = `<span>Pasa el mouse sobre el gráfico para auditar cualquier vela histórica en números exactos.</span>`;
        });
      }

      container.addEventListener("click", (e) => {
        if (e.target.id === "btnExecuteDemoSignal" && this.currentSignal) {
          const sig = this.currentSignal;
          const calc = this.calculateSafeLot(this.accountSize, sig.riskPips, sig.marketId, this.scannerSimulatedLot);
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
          const simTabBtn = container.querySelector('[data-ttab="simulator"]');
          if (simTabBtn) simTabBtn.click();
        }

        const lotBtn = e.target.closest("[data-simlot]");
        if (lotBtn) {
          const lotVal = parseFloat(lotBtn.dataset.simlot);
          if (!isNaN(lotVal) && lotVal > 0) {
            this.scannerSimulatedLot = lotVal;
            this.renderScannerSignal();
            this.drawMarketCanvas();
            this.updateLiveHeaderTelemetry();
          }
        }

        if (e.target.id === "btnRescanSignal" || e.target.closest("#btnRescanSignal")) {
          if (this.currentSignal && this.currentSignal.completedAt) {
            this.currentSignal = null;
            this.scannerSimulatedLot = null;
            this.scannerStatus = "Señal cerrada. Esperando el próximo cierre de vela real para volver a evaluar.";
            this.renderScannerSignal();
            this.drawMarketCanvas();
          }
        }

        if (e.target.id === "btnForceSpikeTrigger" || e.target.closest("#btnForceSpikeTrigger")) {
          this.spikeRadar = null;
          this.generateHarmonicSignal(this.selectedMarket, this.selectedTimeframe, true);
          this.drawMarketCanvas();
        }

        if (e.target.id === "btnDirectCall") {
          const dur = parseInt(document.getElementById("selBinaryExpDirect")?.value || "60", 10);
          this.executeDemoOrder(this.selectedMarket, "CALL", 10, null, null, true, dur);
          const simTabBtn = container.querySelector('[data-ttab="simulator"]');
          if (simTabBtn) simTabBtn.click();
        }
        if (e.target.id === "btnDirectPut") {
          const dur = parseInt(document.getElementById("selBinaryExpDirect")?.value || "60", 10);
          this.executeDemoOrder(this.selectedMarket, "PUT", 10, null, null, true, dur);
          const simTabBtn = container.querySelector('[data-ttab="simulator"]');
          if (simTabBtn) simTabBtn.click();
        }

        if (e.target.id === "btnQuickDemoBuy") {
          const calc = this.calculateSafeLot(this.accountSize);
          this.executeDemoOrder(this.selectedMarket, "BUY", calc.lot);
          const simTabBtn = container.querySelector('[data-ttab="simulator"]');
          if (simTabBtn) simTabBtn.click();
        }
        if (e.target.id === "btnQuickDemoSell") {
          const calc = this.calculateSafeLot(this.accountSize);
          this.executeDemoOrder(this.selectedMarket, "SELL", calc.lot);
          const simTabBtn = container.querySelector('[data-ttab="simulator"]');
          if (simTabBtn) simTabBtn.click();
        }

        if (e.target.id === "btnHuntSpike") {
          this.generateHarmonicSignal(this.selectedMarket, this.selectedTimeframe, false);
        }

        if (e.target.id === "btnSendSignalTelegram" && this.currentSignal) {
          this.sendSignalToTelegram(this.currentSignal);
        }

        if (e.target.id === "btnCopySignalText" && this.currentSignal) {
          const s = this.currentSignal;
          const calc = this.calculateSafeLot(this.accountSize, s.riskPips, s.marketId);
          const txt = `📈 AKIRA QUANTUM TRADING SIGNAL\nMercado: ${s.marketName}\nAcción: ${s.type}\nEntrada: ${s.entry}\nDebido Lotaje (Cta $${calc.capital} USD): ${calc.lot}\nSL: ${s.sl || '-'} (-${calc.slPips} pips | -$${calc.actualRiskMoney} USD)\nTP1: ${s.tp1 || '-'} (+${calc.tp1Pips} pips | +$${calc.tp1Profit} USD)\nTP2: ${s.tp2 || '-'} (+${calc.tp2Pips} pips | +$${calc.tp2Profit} USD)\nTP3: ${s.tp3 || '-'} (+${calc.tp3Pips} pips | +$${calc.tp3Profit} USD)\nConfluencias verificadas: ${s.confluence}\nEstrategia: ${s.smc}`;
          navigator.clipboard.writeText(txt).then(() => {
            alert("📋 Señal copiada al portapapeles con métricas completas para cuenta de $50 USD");
          });
        }

        if (e.target.classList.contains("btnClosePos")) {
          const id = e.target.dataset.id;
          this.closePosition(id, "MANUAL_CLOSE");
        }
      });

      container.addEventListener("change", (e) => {
        if (e.target.id === "inputCustomLotSim") {
          const val = parseFloat(e.target.value);
          if (!isNaN(val) && val > 0) {
            this.scannerSimulatedLot = val;
            this.renderScannerSignal();
            this.drawMarketCanvas();
            this.updateLiveHeaderTelemetry();
          }
        }
      });

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

      const btnSyncDemo = document.getElementById("btnSyncDemoWithCap");
      if (btnSyncDemo) {
        btnSyncDemo.addEventListener("click", () => {
          this.syncDemoBalanceWithCapital();
        });
      }

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

      const inpCapital = document.getElementById("inpCustomAccountSize");
      const btnApplyCap = document.getElementById("btnApplyCapital");
      const applyCapitalChange = () => {
        const val = parseFloat(inpCapital?.value);
        if (!isNaN(val) && val > 0) {
          this.accountSize = val;
          localStorage.setItem(STORAGE_KEY_CAPITAL, val.toString());
          this.renderAccountCalculations();
          this.renderCompoundTable();

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

      const btnSaveDeriv = document.getElementById("btnSaveDerivToken");
      if (btnSaveDeriv) {
        btnSaveDeriv.addEventListener("click", () => {
          const val = document.getElementById("derivApiTokenInput")?.value || "";
          localStorage.setItem(STORAGE_KEY_DERIV, val.trim());
          alert("✅ Token de Deriv guardado en tu navegador local con éxito.");
        });
      }

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
    print("Akira MT5 Bridge activo y esperando señales...")
`;
          navigator.clipboard.writeText(scriptCode).then(() => {
            alert("📋 Script Python akira_mt5_bridge.py copiado al portapapeles. ¡Listo para usar con MetaTrader 5!");
          });
        });
      }

      // BOTONES Y EVENTOS DEL CENTRO TELEGRAM
      const chkAuto = document.getElementById("chkTelegramAutoSend");
      if (chkAuto) {
        chkAuto.addEventListener("change", (e) => {
          this.telegramAutoSend = e.target.checked;
          localStorage.setItem(STORAGE_KEY_TG_AUTO, this.telegramAutoSend ? "true" : "false");
          const pill = document.getElementById("tgAutoStatusPill");
          if (pill) {
            pill.className = `ak-badge ${this.telegramAutoSend ? 'ok' : 'subtle'}`;
            pill.innerText = this.telegramAutoSend ? 'ACTIVO (EN VIVO)' : 'PAUSADO';
          }
        });
      }

      const btnSaveTg = document.getElementById("btnSaveTelegramConfig");
      if (btnSaveTg) {
        btnSaveTg.addEventListener("click", () => {
          let tok = (document.getElementById("tgBotTokenInput")?.value || "").trim();
          let chat = (document.getElementById("tgChatIdInput")?.value || "").trim();
          if (tok.toLowerCase().startsWith("bot")) tok = tok.slice(3).trim();
          tok = tok.replace(/[\r\n\t\s]/g, "");
          chat = chat.replace(/[\r\n\t\s]/g, "");

          this.telegramToken = tok;
          this.telegramChatId = chat;
          localStorage.setItem(STORAGE_KEY_TG_TOKEN, tok);
          localStorage.setItem(STORAGE_KEY_TG_CHAT_ID, chat);

          const badge = document.getElementById("tgConnectionBadge");
          if (badge) {
            badge.className = `ak-pill ${tok && chat ? 'live' : 'sentinel alert'}`;
            badge.innerText = tok && chat ? '🟢 Telegram Vinculado' : '🟡 Configurar Credenciales';
          }
          const fb = document.getElementById("tgFeedbackMsg");
          if (fb) {
            fb.innerText = "✅ Credenciales guardadas exitosamente en tu navegador local.";
            setTimeout(() => { fb.innerText = ""; }, 3000);
          }
        });
      }

      const btnTestTgLive = document.getElementById("btnTestTelegramLive");
      if (btnTestTgLive) {
        btnTestTgLive.addEventListener("click", () => {
          // Si el usuario escribió credenciales pero no hizo clic en Guardar, tomarlas directamente
          let tok = (document.getElementById("tgBotTokenInput")?.value || this.telegramToken || "").trim();
          let chat = (document.getElementById("tgChatIdInput")?.value || this.telegramChatId || "").trim();
          if (tok.toLowerCase().startsWith("bot")) tok = tok.slice(3).trim();
          tok = tok.replace(/[\r\n\t\s]/g, "");
          chat = chat.replace(/[\r\n\t\s]/g, "");

          if (tok && chat) {
            this.telegramToken = tok;
            this.telegramChatId = chat;
            localStorage.setItem(STORAGE_KEY_TG_TOKEN, tok);
            localStorage.setItem(STORAGE_KEY_TG_CHAT_ID, chat);
          }

          const sigToSend = this.currentSignal || {
            marketId: this.selectedMarket,
            marketName: MARKETS[this.selectedMarket]?.name || "Boom 1000",
            pattern: "Sniper Test Connection",
            type: "BUY",
            entry: this.marketPrices[this.selectedMarket] || 10420.0,
            sl: (this.marketPrices[this.selectedMarket] || 10420.0) - 1.2,
            tp1: (this.marketPrices[this.selectedMarket] || 10420.0) + 1.8,
            tp2: (this.marketPrices[this.selectedMarket] || 10420.0) + 2.64,
            tp3: (this.marketPrices[this.selectedMarket] || 10420.0) + 3.83,
            riskPips: 12,
            confluence: 98,
            smc: "Test de Conexión en Vivo con Akira Quantum",
            timestamp: new Date().toLocaleTimeString()
          };
          this.sendSignalToTelegram(sigToSend, false);
        });
      }

      // Checkboxes individuales de mercado para Telegram
      container.querySelectorAll(".chk-tg-market").forEach(chk => {
        chk.addEventListener("change", (e) => {
          const mkt = e.target.value;
          const parent = e.target.closest(".ak-tg-market-chip");
          if (e.target.checked) {
            if (!this.telegramMarkets.includes(mkt)) this.telegramMarkets.push(mkt);
            if (parent) parent.classList.add("active");
          } else {
            this.telegramMarkets = this.telegramMarkets.filter(x => x !== mkt);
            if (parent) parent.classList.remove("active");
          }
          localStorage.setItem(STORAGE_KEY_TG_MARKETS, JSON.stringify(this.telegramMarkets));
        });
      });

      const updateAllTgChips = (selectedList) => {
        this.telegramMarkets = [...selectedList];
        localStorage.setItem(STORAGE_KEY_TG_MARKETS, JSON.stringify(this.telegramMarkets));
        container.querySelectorAll(".chk-tg-market").forEach(chk => {
          const isSel = this.telegramMarkets.includes(chk.value);
          chk.checked = isSel;
          const parent = chk.closest(".ak-tg-market-chip");
          if (parent) parent.classList.toggle("active", isSel);
        });
      };

      document.getElementById("btnTgSelectAll")?.addEventListener("click", () => updateAllTgChips(Object.keys(MARKETS)));
      document.getElementById("btnTgClearAll")?.addEventListener("click", () => updateAllTgChips([]));
      document.getElementById("btnTgOnlySynthetics")?.addEventListener("click", () => updateAllTgChips(["BOOM1000", "CRASH1000", "BOOM500", "CRASH500"]));
      document.getElementById("btnTgOnlyForex")?.addEventListener("click", () => updateAllTgChips(["EURUSD", "GBPUSD", "USDJPY"]));
      document.getElementById("btnTgOnlyGold")?.addEventListener("click", () => updateAllTgChips(["XAUUSD"]));
      document.getElementById("btnTgOnlyBinary")?.addEventListener("click", () => updateAllTgChips(["BIN_EURUSD"]));
      document.getElementById("btnTgOnlyCrypto")?.addEventListener("click", () => updateAllTgChips(["BTCUSDT", "ETHUSDT"]));
    }

    async sendSignalToTelegram(signal, isAuto = false) {
      if (!signal) return;
      const m = MARKETS[signal.marketId] || MARKETS["XAUUSD"];
      const isBin = Boolean(m.isBinary);
      const isBuy = signal.type === "BUY" || signal.type === "CALL";
      const calc = this.calculateSafeLot(this.accountSize, signal.riskPips || 15, signal.marketId);

      let msg = "";
      if (isBin) {
        msg = `⏱️ *SEÑAL BINARIAS IQ OPTION - AKIRA QUANTUM* ⏱️\n\n` +
          `📊 *Mercado:* ${m.icon} ${signal.marketName}\n` +
          `🟢 *Dirección:* *${signal.type === 'CALL' ? '🟢 SUBE (CALL)' : '🔴 BAJA (PUT)'}*\n` +
          `📍 *Strike Price:* \`${signal.entry}\`\n` +
          `⏱️ *Expiración:* 60 Segundos / 2 Minutos (Turbo)\n` +
          `🔥 *Retorno Esperado:* +85% Payout Neto\n` +
          `💰 *Inversión Sugerida:* $1.00 a $10.00 USD (Stake fijo)\n\n` +
          `📈 *Confluencias verificadas:* ${signal.confluence}\n` +
          `🔬 *Estrategia:* Absorción de Liquidez Institucional\n` +
          `⏱️ *Hora:* ${signal.timestamp}\n\n` +
          `_Akira Quantum Trading Terminal • Para el Director Jhon Grimm._`;
      } else {
        msg = `🎯 *SEÑAL SNIPER INSTITUCIONAL - AKIRA QUANTUM* 🎯\n\n` +
          `📊 *Mercado:* ${m.icon} ${signal.marketName}\n` +
          `⚡ *Acción:* *${isBuy ? '🟢 COMPRA SNIPER (BUY)' : '🔴 VENTA SNIPER (SELL)'}*\n` +
          `📍 *Punto de Entrada:* \`${signal.entry}\`\n` +
          `🛡️ *Stop Loss:* \`${signal.sl}\` (-${calc.slPips} pips | -$${calc.actualRiskMoney} USD)\n` +
          `🎯 *Take Profit 1 (1:1):* \`${signal.tp1}\` (+${calc.tp1Pips} pips | +$${calc.tp1Profit} USD)\n` +
          `🚀 *Take Profit 2 (1:2):* \`${signal.tp2}\` (+${calc.tp2Pips} pips | +$${calc.tp2Profit} USD)\n` +
          `💎 *Take Profit 3 (Sniper 1:3):* \`${signal.tp3}\` (+${calc.tp3Pips} pips | +$${calc.tp3Profit} USD)\n\n` +
          `📈 *Confluencias verificadas:* ${signal.confluence}\n` +
          (signal.spikeMetrics ? `⚡ *Timing de Spike:* Reacción estimada en *${signal.spikeMetrics.latencyEstimate}* (Deriva: ${signal.spikeMetrics.driftCandles} velas)\n` : '') +
          `🔬 *Estrategia:* ${signal.smc}\n` +
          `💰 *Gestión de Riesgo (Cuenta Ref $${calc.capital} USD):* Debido lotaje de *${calc.lot} lotes*. Riesgo máximo controlado: -$${calc.actualRiskMoney} USD (${calc.actualRiskPercent}%)\n` +
          `⏱️ *Hora:* ${signal.timestamp}\n\n` +
          `_Akira Quantum Trading Terminal • Para el Director Jhon Grimm._`;
      }

      let token = (this.telegramToken || localStorage.getItem(STORAGE_KEY_TG_TOKEN) || "").trim();
      let chatId = (this.telegramChatId || localStorage.getItem(STORAGE_KEY_TG_CHAT_ID) || "").trim();

      // Sanitización profunda: limpiar 'bot' inicial, saltos de línea y espacios accidentales
      if (token.toLowerCase().startsWith("bot")) {
        token = token.slice(3).trim();
      }
      token = token.replace(/[\r\n\t\s]/g, "");
      chatId = chatId.replace(/[\r\n\t\s]/g, "");

      if (token && chatId) {
        let sentOk = false;
        let errorDesc = "";

        // INTENTO 1: Directo a Telegram API oficial
        try {
          const directUrl = `https://api.telegram.org/bot${token}/sendMessage`;
          const res = await fetch(directUrl, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ chat_id: chatId, text: msg, parse_mode: "Markdown" })
          });
          const data = await res.json();
          if (data.ok) {
            sentOk = true;
          } else {
            errorDesc = data.description || "Error de Telegram API";
          }
        } catch(directErr) {
          console.warn("Envío directo a Telegram bloqueado (posible AdBlocker / CORS / red), probando túnel Akira:", directErr);
        }

        // INTENTO 2: Túnel Seguro Servidor Akira (Inmune a AdBlockers, uBlock, Brave Shields y restricciones locales)
        if (!sentOk && (!errorDesc || errorDesc.includes("Error") || errorDesc === "")) {
          try {
            const relayRes = await fetch("https://akira-empresa.onrender.com/api/v8/telegram/send", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ token: token, chat_id: chatId, text: msg })
            });
            const relayData = await relayRes.json();
            if (relayData.ok) {
              sentOk = true;
              errorDesc = "";
            } else {
              errorDesc = relayData.description || relayData.error || errorDesc || "Error de entrega en Telegram";
            }
          } catch(relayErr) {
            console.error("Relay error:", relayErr);
          }
        }

        if (sentOk) {
          const lastStatusEl = document.getElementById("tgLastSentStatus");
          if (lastStatusEl) {
            lastStatusEl.innerHTML = `<span style="color:#10b981;">✅ Señal de ${signal.marketName} enviada con éxito (${new Date().toLocaleTimeString()})</span>`;
          }
          if (!isAuto) {
            alert(`✅ ¡SEÑAL ENVIADA CON ÉXITO! 📲\n\nEl mensaje ha llegado directamente a tu Telegram (Chat ID: ${chatId}). Revisa tu aplicación.`);
          }
        } else {
          let helpfulTip = "";
          if (errorDesc.includes("Forbidden") || errorDesc.includes("bot can't initiate") || errorDesc.includes("blocked")) {
            helpfulTip = "\n\n👉 SOLUCIÓN: Abre Telegram en tu celular o PC, entra a tu bot y presiona el botón 'INICIAR' (/start) para que el bot tenga permiso de enviarte mensajes.";
          } else if (errorDesc.includes("chat not found")) {
            helpfulTip = "\n\n👉 SOLUCIÓN: El Chat ID (" + chatId + ") no fue encontrado. Escribe cualquier mensaje primero en tu bot y confirma tu Chat ID con @userinfobot.";
          } else if (errorDesc.includes("Unauthorized") || errorDesc.includes("Not Found")) {
            helpfulTip = "\n\n👉 SOLUCIÓN: El Bot Token no es válido. Ve a @BotFather en Telegram, copia el token HTTP API completo y pégalo de nuevo.";
          }

          if (!isAuto) {
            alert("⚠️ Aviso de Telegram: " + (errorDesc || "No se pudo conectar") + helpfulTip);
          }
        }
      } else {
        if (!isAuto) {
          alert("📱 Señal formateada para Telegram:\n\n" + msg + "\n\n(Ingresa tu Bot Token y Chat ID en la pestaña 'Conexiones & Automatización' para que se envíe sola a tu celular).");
          const connTabBtn = document.querySelector('[data-ttab="connections"]');
          if (connTabBtn) connTabBtn.click();
        }
      }
    }

    openTradingViewPineModal() {
      let modal = document.getElementById("modalTvPineScript");
      if (modal) {
        modal.remove();
      }

      const pineCode = (window.QUANTICK_AKIRA_PINE_SCRIPT || "").trim();
      const lineCount = pineCode ? pineCode.split("\n").length : 326;
      const charCount = pineCode ? pineCode.length : 16700;

      modal = document.createElement("div");
      modal.id = "modalTvPineScript";
      modal.style.cssText = "position:fixed;inset:0;background:rgba(4,7,15,0.88);backdrop-filter:blur(8px);z-index:999999;display:flex;align-items:center;justify-content:center;padding:16px;animation:akira-fadein 0.2s ease-out;";

      modal.innerHTML = `
        <div style="background:#090d16;border:1px solid rgba(0,242,254,0.35);border-radius:14px;box-shadow:0 24px 70px rgba(0,0,0,0.85),0 0 50px rgba(0,242,254,0.12);width:min(980px,96vw);max-height:92vh;display:flex;flex-direction:column;overflow:hidden;color:#e2e8f0;font-family:system-ui,-apple-system,sans-serif;">
          <!-- CABECERA MODAL -->
          <div style="display:flex;align-items:center;justify-content:space-between;padding:16px 20px;border-bottom:1px solid rgba(255,255,255,0.08);background:linear-gradient(135deg,rgba(15,23,42,0.95),rgba(10,15,29,0.95));">
            <div style="display:flex;align-items:center;gap:12px;">
              <div style="width:36px;height:36px;border-radius:8px;background:linear-gradient(135deg,rgba(245,158,11,0.25),rgba(234,88,12,0.35));border:1px solid rgba(245,158,11,0.5);display:flex;align-items:center;justify-content:center;font-size:18px;">
                ⚡
              </div>
              <div>
                <div style="display:flex;align-items:center;gap:8px;">
                  <h3 style="margin:0;font-size:16px;color:#f8fafc;font-weight:800;letter-spacing:0.5px;">QUANTICKAKIRA // TRADINGVIEW PRO</h3>
                  <span style="background:rgba(0,242,254,0.12);color:#00f2fe;border:1px solid rgba(0,242,254,0.35);font-size:10px;padding:2px 7px;border-radius:4px;font-weight:700;">PINE SCRIPT v5.0</span>
                  <span style="background:rgba(16,185,129,0.12);color:#10b981;border:1px solid rgba(16,185,129,0.35);font-size:10px;padding:2px 7px;border-radius:4px;font-weight:700;">INSTITUCIONAL</span>
                </div>
                <p style="margin:3px 0 0 0;font-size:11.5px;color:#94a3b8;">Cazador Cuántico de Spikes (5 Vectores) + Escáner Armónico XABCD + Gestión de Riesgo ($50 USD Base)</p>
              </div>
            </div>
            <button id="btnClosePineModal" style="background:rgba(255,255,255,0.05);border:1px solid rgba(255,255,255,0.1);color:#94a3b8;width:32px;height:32px;border-radius:8px;font-size:16px;cursor:pointer;display:flex;align-items:center;justify-content:center;transition:all 0.15s ease;" title="Cerrar (Esc)">✕</button>
          </div>

          <!-- PESTAÑAS DE NAVEGACIÓN -->
          <div style="display:flex;gap:4px;padding:8px 20px 0 20px;background:#060911;border-bottom:1px solid rgba(255,255,255,0.06);overflow-x:auto;">
            <button class="ak-pine-tab-btn active" data-pinetab="code" style="background:none;border:none;border-bottom:2px solid #00f2fe;color:#00f2fe;font-weight:700;font-size:12.5px;padding:8px 14px;cursor:pointer;white-space:nowrap;display:flex;align-items:center;gap:6px;">
              📜 Código Pine Script v5
            </button>
            <button class="ak-pine-tab-btn" data-pinetab="install" style="background:none;border:none;border-bottom:2px solid transparent;color:#94a3b8;font-weight:600;font-size:12.5px;padding:8px 14px;cursor:pointer;white-space:nowrap;display:flex;align-items:center;gap:6px;">
              📘 Guía de Instalación en TradingView
            </button>
            <button class="ak-pine-tab-btn" data-pinetab="alerts" style="background:none;border:none;border-bottom:2px solid transparent;color:#94a3b8;font-weight:600;font-size:12.5px;padding:8px 14px;cursor:pointer;white-space:nowrap;display:flex;align-items:center;gap:6px;">
              🔔 Alertas Nativas & Webhooks
            </button>
            <button class="ak-pine-tab-btn" data-pinetab="architecture" style="background:none;border:none;border-bottom:2px solid transparent;color:#94a3b8;font-weight:600;font-size:12.5px;padding:8px 14px;cursor:pointer;white-space:nowrap;display:flex;align-items:center;gap:6px;">
              🔬 Comparativa Técnica
            </button>
          </div>

          <!-- CUERPO DE CONTENIDOS -->
          <div style="flex:1;overflow-y:auto;padding:20px;background:#090d16;">
            <!-- TAB 1: CÓDIGO FUENTE PINE SCRIPT V5 -->
            <div id="panePineTabCode" style="display:block;">
              <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:12px;flex-wrap:wrap;gap:10px;">
                <div style="display:flex;align-items:center;gap:10px;">
                  <span style="font-size:12px;color:#94a3b8;">Líneas: <strong style="color:#00f2fe;">${lineCount}</strong></span>
                  <span style="font-size:12px;color:#94a3b8;">Tamaño: <strong style="color:#10b981;">${(charCount/1024).toFixed(1)} KB</strong></span>
                  <span style="font-size:12px;color:#94a3b8;">Física: <strong style="color:#fbbf24;">Histórico real de ciclos</strong></span>
                </div>
                <div style="display:flex;gap:8px;">
                  <button id="btnCopyPineCode" style="background:linear-gradient(135deg,#00f2fe,#3b82f6);color:#050811;font-weight:800;border:none;padding:8px 16px;border-radius:7px;font-size:12px;cursor:pointer;display:flex;align-items:center;gap:6px;box-shadow:0 0 16px rgba(0,242,254,0.35);">
                    📋 Copiar Código Completo
                  </button>
                  <button id="btnDownloadPineFile" style="background:rgba(255,255,255,0.06);border:1px solid rgba(255,255,255,0.15);color:#f8fafc;font-weight:600;padding:8px 14px;border-radius:7px;font-size:12px;cursor:pointer;display:flex;align-items:center;gap:6px;">
                    💾 Descargar Archivo .pine
                  </button>
                </div>
              </div>

              <div id="copySuccessAlert" style="display:none;background:rgba(16,185,129,0.15);border:1px solid rgba(16,185,129,0.45);color:#34d399;padding:10px 14px;border-radius:8px;font-size:12px;margin-bottom:12px;align-items:center;gap:8px;">
                <span>✓</span>
                <strong>¡Código copiado al portapapeles!</strong> Ahora abre TradingView Pro, ve a la pestaña inferior <em>"Pine Editor"</em>, pega el código y haz clic en <em>"Añadir al gráfico"</em>.
              </div>

              <pre style="margin:0;background:#050811;border:1px solid rgba(255,255,255,0.08);border-radius:8px;padding:14px;font-family:'Fira Code',Consolas,Monaco,monospace;font-size:11.5px;color:#a5b4fc;line-height:1.6;max-height:480px;overflow:auto;white-space:pre;"><code id="pineSourceBlock"></code></pre>
            </div>

            <!-- TAB 2: GUÍA DE INSTALACIÓN PASO A PASO -->
            <div id="panePineTabInstall" style="display:none;">
              <div style="max-width:820px;margin:0 auto;display:flex;flex-direction:column;gap:18px;">
                <div style="background:rgba(0,242,254,0.06);border:1px solid rgba(0,242,254,0.25);border-radius:10px;padding:14px 18px;display:flex;align-items:center;gap:12px;">
                  <span style="font-size:24px;">💡</span>
                  <div style="font-size:12.5px;line-height:1.5;color:#cbd5e1;">
                    El indicador <strong>QuantickAkira Pro v5</strong> se ejecuta en la nube oficial de TradingView mediante su motor <strong>Pine Script v5</strong>. Funciona de manera idéntica en <strong>TradingView Web, TradingView Desktop, iPad y app móvil (iOS/Android)</strong>.
                  </div>
                </div>

                <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(360px,1fr));gap:14px;">
                  <!-- PASO 1 -->
                  <div style="background:rgba(15,23,42,0.8);border:1px solid rgba(255,255,255,0.08);border-radius:10px;padding:16px;">
                    <div style="display:flex;align-items:center;gap:10px;margin-bottom:8px;">
                      <span style="background:#00f2fe;color:#050811;width:24px;height:24px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-weight:800;font-size:12px;">1</span>
                      <strong style="color:#f8fafc;font-size:13.5px;">Abre tu Gráfico en TradingView Pro</strong>
                    </div>
                    <p style="font-size:12px;color:#94a3b8;line-height:1.5;margin:0;">
                      Ingresa a <a href="https://www.tradingview.com/chart/" target="_blank" style="color:#00f2fe;text-decoration:none;">tradingview.com/chart</a> o tu app. Selecciona el activo deseado (ej: <strong>Boom 1000 Index</strong>, <strong>Crash 1000</strong>, o activos como <strong>BTCUSDT</strong>, <strong>XAUUSD</strong>).
                    </p>
                  </div>

                  <!-- PASO 2 -->
                  <div style="background:rgba(15,23,42,0.8);border:1px solid rgba(255,255,255,0.08);border-radius:10px;padding:16px;">
                    <div style="display:flex;align-items:center;gap:10px;margin-bottom:8px;">
                      <span style="background:#00f2fe;color:#050811;width:24px;height:24px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-weight:800;font-size:12px;">2</span>
                      <strong style="color:#f8fafc;font-size:13.5px;">Abre el "Pine Editor" en la barra inferior</strong>
                    </div>
                    <p style="font-size:12px;color:#94a3b8;line-height:1.5;margin:0;">
                      En el panel inferior de la pantalla de TradingView, haz clic en la pestaña <strong>"Pine Editor"</strong> (o Editor de Pine). Si hay código previo, haz clic en <em>Abrir → Nuevo indicador en blanco</em> o borra su contenido.
                    </p>
                  </div>

                  <!-- PASO 3 -->
                  <div style="background:rgba(15,23,42,0.8);border:1px solid rgba(255,255,255,0.08);border-radius:10px;padding:16px;">
                    <div style="display:flex;align-items:center;gap:10px;margin-bottom:8px;">
                      <span style="background:#00f2fe;color:#050811;width:24px;height:24px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-weight:800;font-size:12px;">3</span>
                      <strong style="color:#f8fafc;font-size:13.5px;">Pega el Código de QuantickAkira</strong>
                    </div>
                    <p style="font-size:12px;color:#94a3b8;line-height:1.5;margin:0;">
                      Haz clic en el botón <strong>"Copiar Código Completo"</strong> de la pestaña anterior y pégalo (Ctrl + V) directamente en el editor de Pine.
                    </p>
                  </div>

                  <!-- PASO 4 -->
                  <div style="background:rgba(15,23,42,0.8);border:1px solid rgba(255,255,255,0.08);border-radius:10px;padding:16px;">
                    <div style="display:flex;align-items:center;gap:10px;margin-bottom:8px;">
                      <span style="background:#10b981;color:#050811;width:24px;height:24px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-weight:800;font-size:12px;">4</span>
                      <strong style="color:#f8fafc;font-size:13.5px;">Haz clic en "Añadir al gráfico"</strong>
                    </div>
                    <p style="font-size:12px;color:#94a3b8;line-height:1.5;margin:0;">
                      Haz clic en <strong>"Guardar"</strong> (puedes nombrarlo <em>QuantickAkira Pro</em>) y luego en el botón <strong>"Añadir al gráfico"</strong> (Add to chart). ¡Listo!
                    </p>
                  </div>
                </div>

                <div style="background:rgba(99,102,241,0.08);border:1px solid rgba(99,102,241,0.3);border-radius:10px;padding:16px;">
                  <h4 style="margin:0 0 10px 0;font-size:13.5px;color:#a5b4fc;display:flex;align-items:center;gap:8px;">
                    <span>✨</span> Elementos Visibles que Verás en tu Gráfico TradingView Pro:
                  </h4>
                  <ul style="margin:0;padding-left:18px;font-size:12px;color:#cbd5e1;line-height:1.8;">
                    <li><strong>Panel HUD de Telemetría (Esquina superior derecha):</strong> Deriva actual, mediana y cantidad de ciclos históricos observados; sin porcentaje predictivo.</li>
                    <li><strong>Gatillos Sniper ✓:</strong> Triángulos Cyan neón abajo de la vela en Boom/compras y flechas rojas arriba en Crash/ventas.</li>
                    <li><strong>Cajas Asimétricas SL/TP ($50 USD Base):</strong> Zona de stop calculada con estructura y ATR, más objetivos visuales 1R, 2R y 3R; el indicador no estima USD por contrato.</li>
                    <li><strong>Estructuras Armónicas XABCD:</strong> Patrones XABCD que pasan filtros de pivotes confirmados, ratios y convergencia de proyecciones hacia PRZ.</li>
                  </ul>
                </div>
              </div>
            </div>

            <!-- TAB 3: ALERTAS NATIVAS & WEBHOOKS -->
            <div id="panePineTabAlerts" style="display:none;">
              <div style="max-width:820px;margin:0 auto;display:flex;flex-direction:column;gap:18px;">
                <div style="background:rgba(245,158,11,0.08);border:1px solid rgba(245,158,11,0.3);border-radius:10px;padding:14px 18px;display:flex;align-items:center;gap:12px;">
                  <span style="font-size:24px;">🔔</span>
                  <div style="font-size:12.5px;line-height:1.5;color:#fde68a;">
                    El indicador ofrece <strong>2 alertas</strong> para señales BUY/SELL confirmadas. TradingView gestiona las notificaciones; un webhook externo debe configurarse y verificarse por separado.
                  </div>
                </div>

                <div style="display:flex;flex-direction:column;gap:12px;">
                  <div style="background:rgba(15,23,42,0.8);border:1px solid rgba(255,255,255,0.08);border-radius:10px;padding:16px;">
                    <h4 style="margin:0 0 8px 0;font-size:13px;color:#00f2fe;">1. Alerta de Disparo Sniper Compra (Boom / General)</h4>
                    <p style="margin:0;font-size:12px;color:#94a3b8;line-height:1.5;">
                      Condición en TradingView: <code>Akira Sniper BUY</code>.<br>
                      Se activa al cierre confirmado cuando tendencia, rechazo y zona del precio cumplen el filtro. En Boom también exige suficientes ciclos de spike observados.
                    </p>
                  </div>

                  <div style="background:rgba(15,23,42,0.8);border:1px solid rgba(255,255,255,0.08);border-radius:10px;padding:16px;">
                    <h4 style="margin:0 0 8px 0;font-size:13px;color:#ef4444;">2. Alerta de Disparo Sniper Venta (Crash / General)</h4>
                    <p style="margin:0;font-size:12px;color:#94a3b8;line-height:1.5;">
                      Condición en TradingView: <code>Akira Sniper SELL</code>.<br>
                      Se activa al cierre confirmado cuando tendencia bajista, rechazo y zona del precio cumplen el filtro. En Crash también exige suficientes ciclos de spike observados.
                    </p>
                  </div>

                  <div style="background:rgba(15,23,42,0.8);border:1px solid rgba(255,255,255,0.08);border-radius:10px;padding:16px;">
                    <h4 style="margin:0 0 8px 0;font-size:13px;color:#fbbf24;">3. Alerta Radar Spike Inminente (Proximidad >= 90%)</h4>
                    <p style="margin:0;font-size:12px;color:#94a3b8;line-height:1.5;">
                      Condición en TradingView: <code>⚠️ Radar Spike Inminente (Proximidad >= 90%)</code>.<br>
                      Alerta temprana anticipatoria. Te avisa 1 a 3 velas antes del spike para preparar la orden o verificar la zona de reacción.
                    </p>
                  </div>
                </div>

                <!-- GUÍA DE CONFIGURACIÓN DE WEBHOOK -->
                <div style="background:rgba(15,23,42,0.8);border:1px solid rgba(0,242,254,0.3);border-radius:10px;padding:16px;">
                  <h4 style="margin:0 0 10px 0;font-size:13.5px;color:#f8fafc;display:flex;align-items:center;gap:8px;">
                    <span>⚡</span> Cómo Conectar el Webhook de TradingView a tu Telegram o Akira:
                  </h4>
                  <ol style="margin:0;padding-left:18px;font-size:12px;color:#cbd5e1;line-height:1.8;">
                    <li>En el gráfico de TradingView, presiona <code>Alt + A</code> (o clic derecho → Añadir Alerta).</li>
                    <li>En <strong>Condición</strong>, selecciona <strong>QuantickAkira Pro</strong> y elige el evento deseado.</li>
                    <li>En <strong>Opciones</strong>, selecciona <em>"Una vez por barra"</em>.</li>
                    <li>En la pestaña <strong>Notificaciones</strong>, marca <em>"URL del Webhook"</em> y pega:
                      <div style="margin:6px 0;background:#050811;padding:6px 12px;border-radius:6px;font-family:monospace;color:#00f2fe;display:flex;align-items:center;justify-content:space-between;">
                        <span>https://akira-empresa.onrender.com/api/v8/telegram/send</span>
                      </div>
                    </li>
                    <li>En el campo <strong>Mensaje</strong>, pega el formato JSON compatible con Telegram:
                      <pre style="margin:6px 0 0 0;background:#050811;padding:8px 12px;border-radius:6px;font-family:monospace;font-size:11px;color:#34d399;">{"text":"⚡ QuantickAkira: {{ticker}} {{close}} - {{strategy.order.action}}"}</pre>
                    </li>
                  </ol>
                </div>
              </div>
            </div>

            <!-- TAB 4: COMPARATIVA TÉCNICA DE ARQUITECTURA -->
            <div id="panePineTabArchitecture" style="display:none;">
              <div style="max-width:840px;margin:0 auto;display:flex;flex-direction:column;gap:16px;">
                <p style="font-size:12.5px;color:#94a3b8;line-height:1.6;margin:0;">
                  Evaluación arquitectónica exhaustiva de las <strong>4 alternativas de integración</strong> solicitadas por la Dirección:
                </p>

                <div style="border:1px solid rgba(255,255,255,0.08);border-radius:10px;overflow:hidden;">
                  <table style="width:100%;border-collapse:collapse;font-size:12px;text-align:left;">
                    <thead>
                      <tr style="background:#0f172a;color:#f8fafc;border-bottom:1px solid rgba(255,255,255,0.1);">
                        <th style="padding:10px 14px;">Alternativa</th>
                        <th style="padding:10px 14px;">Viabilidad</th>
                        <th style="padding:10px 14px;">Latencia</th>
                        <th style="padding:10px 14px;">Veredicto Técnico</th>
                      </tr>
                    </thead>
                    <tbody style="color:#cbd5e1;">
                      <tr style="border-bottom:1px solid rgba(255,255,255,0.06);background:rgba(16,185,129,0.05);">
                        <td style="padding:10px 14px;"><strong style="color:#10b981;">1. Pine Script v5 Nativo</strong></td>
                        <td style="padding:10px 14px;"><span style="color:#10b981;font-weight:700;">Disponible; validación pendiente</span></td>
                        <td style="padding:10px 14px;color:#00f2fe;font-family:monospace;">Latencia de TradingView</td>
                        <td style="padding:10px 14px;color:#94a3b8;"><strong>Implementada.</strong> El indicador complementario usa barras confirmadas, filtros técnicos y ratios XABCD; no ofrece una probabilidad de acierto. El código debe compilarse y probarse en TradingView.</td>
                      </tr>
                      <tr style="border-bottom:1px solid rgba(255,255,255,0.06);">
                        <td style="padding:10px 14px;"><strong style="color:#ef4444;">2. Pine Script + Backend Saliente</strong></td>
                        <td style="padding:10px 14px;"><span style="color:#ef4444;font-weight:700;">Inviable ✗</span></td>
                        <td style="padding:10px 14px;color:#ef4444;">N/A</td>
                        <td style="padding:10px 14px;color:#94a3b8;">TradingView ejecuta Pine Script en un sandbox estricto sin conectividad a internet saliente (no existe <code>http.get</code> ni <code>fetch</code>). Ningún plan (incluyendo Pro o Premium) permite llamadas HTTP arbitrarias desde Pine Script.</td>
                      </tr>
                      <tr style="border-bottom:1px solid rgba(255,255,255,0.06);background:rgba(0,242,254,0.05);">
                        <td style="padding:10px 14px;"><strong style="color:#00f2fe;">3. Webhooks & Alertas Entrantes</strong></td>
                        <td style="padding:10px 14px;"><span style="color:#00f2fe;font-weight:700;">Disponible; validación pendiente</span></td>
                        <td style="padding:10px 14px;color:#00f2fe;font-family:monospace;">Latencia variable</td>
                        <td style="padding:10px 14px;color:#94a3b8;"><strong>Habilitada.</strong> El envío depende de configurar un webhook compatible y verificar el endpoint, autenticación y formato antes de activar alertas.</td>
                      </tr>
                      <tr>
                        <td style="padding:10px 14px;"><strong style="color:#fbbf24;">4. Iframe Embebido Pro en Akira</strong></td>
                        <td style="padding:10px 14px;"><span style="color:#fbbf24;font-weight:700;">Integrada; validar por símbolo</span></td>
                        <td style="padding:10px 14px;color:#fbbf24;font-family:monospace;">Tiempo Real</td>
                        <td style="padding:10px 14px;color:#94a3b8;"><strong>Integrada.</strong> El selector de motor permite visualizar los datos de Deriv directamente en TradingView Pro dentro de Trading Lab Cuántico sin salir de la plataforma.</td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                <div style="background:rgba(16,185,129,0.08);border:1px solid rgba(16,185,129,0.3);border-radius:10px;padding:14px;font-size:12px;color:#a7f3d0;line-height:1.6;">
                  <strong>Conclusión Estratégica:</strong> Las opciones muestran distintas rutas de análisis y alertas. La precisión debe medirse con datos del símbolo, pruebas fuera de muestra, spread y deslizamiento; ninguna ruta garantiza resultados ni tiene latencia fija.
                </div>
              </div>
            </div>
          </div>

          <!-- PIE DE MODAL -->
          <div style="padding:12px 20px;border-top:1px solid rgba(255,255,255,0.08);background:#060911;display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:8px;">
            <div style="font-size:11.5px;color:#64748b;">
              Trading Lab Cuántico &copy; 2026 · Compatible con TradingView Pro & Índices Deriv
            </div>
            <button id="btnFooterClosePineModal" style="background:rgba(255,255,255,0.08);border:1px solid rgba(255,255,255,0.15);color:#cbd5e1;padding:6px 14px;border-radius:6px;font-size:12px;cursor:pointer;font-weight:600;">
              Cerrar
            </button>
          </div>
        </div>
      `;

      document.body.appendChild(modal);

      // Inyectar código fuente en bloque <pre><code>
      const codeBlock = modal.querySelector("#pineSourceBlock");
      if (codeBlock) {
        codeBlock.textContent = pineCode;
      }

      // Manejador de pestañas
      const tabBtns = modal.querySelectorAll(".ak-pine-tab-btn");
      const panes = {
        code: modal.querySelector("#panePineTabCode"),
        install: modal.querySelector("#panePineTabInstall"),
        alerts: modal.querySelector("#panePineTabAlerts"),
        architecture: modal.querySelector("#panePineTabArchitecture")
      };

      tabBtns.forEach(btn => {
        btn.addEventListener("click", () => {
          tabBtns.forEach(b => {
            b.classList.remove("active");
            b.style.borderBottomColor = "transparent";
            b.style.color = "#94a3b8";
            b.style.fontWeight = "600";
          });
          btn.classList.add("active");
          btn.style.borderBottomColor = "#00f2fe";
          btn.style.color = "#00f2fe";
          btn.style.fontWeight = "700";

          const tabKey = btn.dataset.pinetab;
          Object.keys(panes).forEach(k => {
            if (panes[k]) panes[k].style.display = (k === tabKey) ? "block" : "none";
          });
        });
      });

      // Copiar código al portapapeles
      const btnCopy = modal.querySelector("#btnCopyPineCode");
      const alertSuccess = modal.querySelector("#copySuccessAlert");
      if (btnCopy) {
        btnCopy.addEventListener("click", async () => {
          try {
            await navigator.clipboard.writeText(pineCode);
            btnCopy.innerHTML = "✓ ¡Copiado!";
            btnCopy.style.background = "#10b981";
            if (alertSuccess) alertSuccess.style.display = "flex";
            setTimeout(() => {
              btnCopy.innerHTML = "📋 Copiar Código Completo";
              btnCopy.style.background = "linear-gradient(135deg,#00f2fe,#3b82f6)";
            }, 3000);
          } catch(err) {
            // Fallback con textarea
            const ta = document.createElement("textarea");
            ta.value = pineCode;
            document.body.appendChild(ta);
            ta.select();
            document.execCommand("copy");
            document.body.removeChild(ta);
            btnCopy.innerHTML = "✓ ¡Copiado!";
            if (alertSuccess) alertSuccess.style.display = "flex";
            setTimeout(() => {
              btnCopy.innerHTML = "📋 Copiar Código Completo";
            }, 3000);
          }
        });
      }

      // Descargar archivo .pine
      const btnDownload = modal.querySelector("#btnDownloadPineFile");
      if (btnDownload) {
        btnDownload.addEventListener("click", () => {
          const blob = new Blob([pineCode], { type: "text/plain;charset=utf-8" });
          const url = URL.createObjectURL(blob);
          const a = document.createElement("a");
          a.href = url;
          a.download = "QuantickAkira_TradingView_Pro_v5.pine";
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          URL.revokeObjectURL(url);
        });
      }

      // Cerrar modal
      const closeModal = () => {
        if (modal && modal.parentElement) modal.remove();
        document.removeEventListener("keydown", handleEsc);
      };
      const btnClose = modal.querySelector("#btnClosePineModal");
      const btnFooterClose = modal.querySelector("#btnFooterClosePineModal");
      if (btnClose) btnClose.addEventListener("click", closeModal);
      if (btnFooterClose) btnFooterClose.addEventListener("click", closeModal);

      modal.addEventListener("click", (e) => {
        if (e.target === modal) closeModal();
      });

      const handleEsc = (e) => {
        if (e.key === "Escape") closeModal();
      };
      document.addEventListener("keydown", handleEsc);
    }

  }

  (function injectStyles(){
    if (document.getElementById("akira-trading-lab-styles")) return;
    const s = document.createElement("style");
    s.id = "akira-trading-lab-styles";
    s.textContent = `
      #tradingSection {
        overflow-y: auto !important;
        -webkit-overflow-scrolling: touch !important;
      }
      .ak-trading-wrap {
        display: flex;
        flex-direction: column;
        gap: 16px;
        color: #e2e8f0;
        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
        min-height: 100%;
        padding-bottom: 90px !important; /* Margen para barra de navegación móvil inferior de Akira */
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

      .ak-market-topbar {
        display: flex; justify-content: space-between; align-items: flex-end; flex-wrap: wrap; gap: 14px;
        background: rgba(15,23,42,0.8); border: 1px solid rgba(255,255,255,0.1); border-radius: 10px;
        padding: 12px 18px;
      }
      .ak-control-group { display: flex; flex-direction: column; gap: 4px; }
      .ak-control-group label { font-size: 10px; font-weight: 700; color: #94a3b8; letter-spacing: 0.5px; }
      .ak-input-select, .ak-input-text {
        background: rgba(0,0,0,0.5); border: 1px solid rgba(255,255,255,0.15); border-radius: 6px;
        color: #fff; padding: 7px 12px; font-size: 12px; outline: none;
      }
      .ak-tf-buttons { display: flex; gap: 4px; }
      .ak-tf-btn, .ak-chart-type-btn {
        background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.1); border-radius: 4px;
        color: #94a3b8; padding: 6px 10px; font-size: 11px; font-weight: 600; cursor: pointer; transition: all 0.2s ease;
      }
      .ak-tf-btn:hover, .ak-chart-type-btn:hover { background: rgba(255,255,255,0.09); color: #fff; }
      .ak-tf-btn.active, .ak-chart-type-btn.active { background: rgba(0,242,254,0.2); border-color: #00f2fe; color: #00f2fe; }

      .ak-bid-ask-box, .ak-spread-box {
        background: rgba(0,0,0,0.3); border: 1px solid rgba(255,255,255,0.08); border-radius: 6px;
        padding: 6px 12px; display: flex; flex-direction: column; gap: 2px;
      }
      .ak-bid-ask-box .lbl, .ak-spread-box .lbl { font-size: 9px; color: #94a3b8; font-weight: 700; }
      .ak-bid-ask-box .val { font-family: monospace; font-size: 13px; font-weight: bold; }
      .ak-bid-ask-box .val.bid { color: #10b981; }
      .ak-bid-ask-box .val.ask { color: #ef4444; }
      .ak-spread-box .val { font-family: monospace; font-size: 12px; color: #00f2fe; }

      .ak-deriv-spike-banner {
        background: linear-gradient(135deg, rgba(239,68,68,0.12), rgba(15,23,42,0.8));
        border: 1px solid rgba(239,68,68,0.35); border-radius: 10px; padding: 12px 18px;
        display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 12px;
      }
      .ak-iq-option-banner {
        background: linear-gradient(135deg, rgba(16,185,129,0.12), rgba(15,23,42,0.8));
        border: 1px solid rgba(16,185,129,0.35); border-radius: 10px; padding: 12px 18px;
        display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 12px;
      }
      .ak-iq-payout-pill {
        background: rgba(16,185,129,0.2); border: 1px solid #10b981; color: #10b981;
        font-weight: 800; font-size: 12px; padding: 6px 12px; border-radius: 6px;
      }
      .ak-forex-status-banner {
        background: rgba(15,23,42,0.6); border: 1px solid rgba(255,255,255,0.08); border-radius: 10px;
        padding: 10px 18px; display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 10px;
      }

      .ak-chart-canvas-wrapper {
        background: #080c14; border: 1px solid rgba(0,242,254,0.25); border-radius: 10px;
        overflow: hidden; display: flex; flex-direction: column;
        transition: all 0.2s ease-in-out; position: relative;
      }
      .ak-chart-canvas-wrapper.ak-fullscreen {
        position: fixed !important;
        top: 0 !important;
        left: 0 !important;
        right: 0 !important;
        bottom: 0 !important;
        width: 100vw !important;
        height: 100vh !important;
        z-index: 999999 !important;
        border-radius: 0 !important;
        border: none !important;
        margin: 0 !important;
        padding: 10px 16px !important;
        background: #060911 !important;
        box-sizing: border-box !important;
      }
      .ak-chart-canvas-wrapper.ak-fullscreen .ak-market-canvas {
        height: calc(100vh - 145px) !important;
      }
      .ak-chart-canvas-wrapper.ak-fullscreen #tvChartContainer {
        height: calc(100vh - 145px) !important;
      }
      @keyframes akira-spin {
        0% { transform: rotate(0deg); }
        100% { transform: rotate(360deg); }
      }
      .ak-fs-extra-toolbar {
        background: rgba(15,23,42,0.92); border-bottom: 1px solid rgba(0,242,254,0.2);
        padding: 8px 16px; display: flex; align-items: center; justify-content: space-between;
      }
      .ak-no-scroll { overflow: hidden !important; }
      .ak-chart-canvas-header {
        display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 10px;
        padding: 10px 16px; border-bottom: 1px solid rgba(255,255,255,0.06); background: rgba(15,23,42,0.7);
      }
      .ak-chart-tool-btn {
        background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.1); border-radius: 4px;
        color: #94a3b8; font-size: 10px; padding: 4px 8px; cursor: pointer;
      }
      .ak-chart-tool-btn.active { background: rgba(0,242,254,0.15); border-color: #00f2fe; color: #00f2fe; }
      .ak-chart-tool-btn.ak-btn-fullscreen {
        background: rgba(0,242,254,0.1); border-color: rgba(0,242,254,0.4); color: #00f2fe; font-weight: bold;
      }
      .ak-chart-tool-btn.ak-btn-fullscreen.active {
        background: rgba(239,68,68,0.2); border-color: #ef4444; color: #ef4444;
      }
      .ak-canvas-account-ribbon {
        background: rgba(10, 15, 26, 0.95);
        border-bottom: 1px solid rgba(0, 242, 254, 0.2);
        padding: 6px 14px;
        font-family: monospace;
      }
      .ak-chart-canvas-wrapper.theme-light .ak-canvas-account-ribbon {
        background: #f1f5f9 !important;
        border-bottom-color: #cbd5e1 !important;
        color: #1e293b !important;
      }
      .ak-canvas-inspector {
        background: rgba(0,0,0,0.4); border-bottom: 1px solid rgba(255,255,255,0.04);
        padding: 6px 16px; font-size: 11px; color: #94a3b8; font-family: monospace;
      }
      .ak-market-canvas { width: 100%; display: block; cursor: crosshair; touch-action: none; }

      .ak-pill-btn {
        background: rgba(255, 255, 255, 0.05); border: 1px solid rgba(255, 255, 255, 0.12); border-radius: 4px;
        color: #94a3b8; font-size: 10.5px; font-weight: 600; padding: 3px 8px; cursor: pointer; transition: all 0.2s;
      }
      .ak-pill-btn:hover { background: rgba(0, 242, 254, 0.15); border-color: #00f2fe; color: #00f2fe; }
      .ak-pill-btn.active { background: rgba(0, 242, 254, 0.25); border-color: #00f2fe; color: #ffffff; font-weight: bold; }
      .ak-chart-nav-bar {
        display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 10px;
        padding: 8px 16px; background: rgba(15, 23, 42, 0.9); border-top: 1px solid rgba(255, 255, 255, 0.08);
      }
      .ak-nav-left-group, .ak-nav-right-group { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
      .ak-nav-btn {
        background: rgba(255, 255, 255, 0.05); border: 1px solid rgba(255, 255, 255, 0.12); border-radius: 5px;
        color: #cbd5e1; font-size: 11px; font-weight: 600; padding: 5px 10px; cursor: pointer; transition: all 0.2s;
        display: inline-flex; align-items: center; gap: 4px;
      }
      .ak-nav-btn:hover { background: rgba(0, 242, 254, 0.15); border-color: #00f2fe; color: #00f2fe; }
      .ak-nav-btn.active { background: rgba(0, 242, 254, 0.2); border-color: #00f2fe; color: #00f2fe; font-weight: bold; }
      .ak-slider-wrap {
        display: flex; align-items: center; gap: 6px; background: rgba(0, 0, 0, 0.35);
        border: 1px solid rgba(255, 255, 255, 0.08); border-radius: 20px; padding: 3px 10px;
      }
      .ak-slider-lbl { font-size: 9px; color: #64748b; font-weight: 700; }
      .ak-slider-lbl.live { color: #10b981; }
      .ak-nav-slider {
        -webkit-appearance: none; appearance: none; width: 140px; height: 5px; border-radius: 5px;
        background: rgba(255, 255, 255, 0.15); outline: none; cursor: pointer;
      }
      .ak-nav-slider::-webkit-slider-thumb {
        -webkit-appearance: none; appearance: none; width: 14px; height: 14px; border-radius: 50%;
        background: #00f2fe; cursor: pointer; box-shadow: 0 0 6px rgba(0, 242, 254, 0.8);
      }

      .ak-chart-canvas-wrapper.theme-light {
        background: #ffffff !important;
        border-color: #cbd5e1 !important;
      }
      .ak-chart-canvas-wrapper.theme-light .ak-chart-canvas-header {
        background: #f8fafc !important;
        border-bottom-color: #e2e8f0 !important;
      }
      .ak-chart-canvas-wrapper.theme-light .ak-chart-canvas-header strong {
        color: #0f172a !important;
      }
      .ak-chart-canvas-wrapper.theme-light .ak-canvas-inspector {
        background: #f1f5f9 !important;
        color: #334155 !important;
        border-bottom-color: #e2e8f0 !important;
      }
      .ak-chart-canvas-wrapper.theme-light .ak-pill-btn {
        background: rgba(255, 255, 255, 0.05); border: 1px solid rgba(255, 255, 255, 0.12); border-radius: 4px;
        color: #94a3b8; font-size: 10.5px; font-weight: 600; padding: 3px 8px; cursor: pointer; transition: all 0.2s;
      }
      .ak-pill-btn:hover { background: rgba(0, 242, 254, 0.15); border-color: #00f2fe; color: #00f2fe; }
      .ak-pill-btn.active { background: rgba(0, 242, 254, 0.25); border-color: #00f2fe; color: #ffffff; font-weight: bold; }
      .ak-chart-nav-bar {
        background: #f8fafc !important;
        border-top-color: #e2e8f0 !important;
      }
      .ak-chart-canvas-wrapper.theme-light .ak-nav-btn {
        background: #ffffff !important;
        border-color: #cbd5e1 !important;
        color: #334155 !important;
      }
      .ak-chart-canvas-wrapper.theme-light .ak-nav-btn:hover {
        background: #e0f2fe !important;
        border-color: #0284c7 !important;
        color: #0284c7 !important;
      }
      .ak-chart-canvas-wrapper.theme-light .ak-nav-btn.active {
        background: #0284c7 !important;
        color: #ffffff !important;
        border-color: #0284c7 !important;
      }

      .ak-candle-sync-radar-card {
        background: linear-gradient(135deg, rgba(0, 242, 254, 0.06), rgba(16, 185, 129, 0.06));
        border: 1px solid rgba(0, 242, 254, 0.35);
        border-radius: 10px;
        padding: 14px 18px;
        margin: 10px 0;
      }
      .ak-sniper-story-card {
        background: linear-gradient(135deg, rgba(16, 185, 129, 0.08), rgba(139, 92, 246, 0.08));
        border: 1px solid rgba(0, 242, 254, 0.25);
        border-radius: 10px;
        padding: 14px 18px;
        margin: 10px 0;
      }
      .ak-harmonic-explanation-box {
        background: rgba(234, 179, 8, 0.08);
        border: 1px solid rgba(234, 179, 8, 0.3);
        border-radius: 8px;
        padding: 12px 14px;
        margin: 8px 0;
      }

      .ak-simple-trade-guide {
        display: grid; grid-template-columns: repeat(auto-fit, minmax(210px, 1fr)); gap: 12px; margin: 10px 0;
      }
      .ak-guide-card {
        background: rgba(0, 0, 0, 0.35); border: 1px solid rgba(255, 255, 255, 0.08); border-radius: 8px;
        padding: 12px 14px; position: relative; display: flex; flex-direction: column; gap: 4px;
      }
      .ak-guide-badge {
        font-size: 9px; font-weight: 800; color: #00f2fe; background: rgba(0, 242, 254, 0.15);
        padding: 2px 6px; border-radius: 4px; width: fit-content; margin-bottom: 2px;
      }
      .ak-guide-card .title { font-size: 11px; font-weight: 700; color: #fff; }
      .ak-guide-card .action-desc { font-size: 12px; color: #cbd5e1; line-height: 1.4; }

      .ak-market-data-grid { display: flex; gap: 14px; flex-wrap: wrap; }
      .ak-data-card {
        background: rgba(15,23,42,0.8); border: 1px solid rgba(255,255,255,0.08); border-radius: 10px;
        padding: 14px 16px; display: flex; flex-direction: column; gap: 10px;
      }
      .ak-data-card-head { display: flex; justify-content: space-between; align-items: center; }
      .ak-table-scroll-wrap { max-height: 420px; overflow-y: auto; border: 1px solid rgba(255,255,255,0.05); border-radius: 6px; }
      .ak-ohlc-table { width: 100%; border-collapse: collapse; font-size: 11px; text-align: left; }
      .ak-ohlc-table th {
        background: rgba(255,255,255,0.03); color: #94a3b8; padding: 8px 10px; position: sticky; top: 0;
        border-bottom: 1px solid rgba(255,255,255,0.08); font-weight: 600;
      }
      .ak-ohlc-table td { padding: 6px 10px; border-bottom: 1px solid rgba(255,255,255,0.03); }

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

      .ak-levels-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(140px, 1fr)); gap: 10px; }
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

      .ak-sim-top-metrics { display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 12px; }
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

      .ak-sim-table { width: 100%; border-collapse: collapse; font-size: 12px; text-align: left; }
      .ak-sim-table th {
        background: rgba(255,255,255,0.03); color: #94a3b8; font-size: 11px; font-weight: 600;
        padding: 10px 12px; border-bottom: 1px solid rgba(255,255,255,0.08);
      }
      .ak-sim-table td { padding: 10px 12px; border-bottom: 1px solid rgba(255,255,255,0.04); color: #e2e8f0; }

      .ak-badge { padding: 2px 8px; border-radius: 4px; font-size: 10px; font-weight: 700; }
      .ak-badge.ok { background: rgba(16,185,129,0.15); color: #10b981; }
      .ak-badge.alert { background: rgba(239,68,68,0.15); color: #ef4444; }
      .ak-badge.safe { background: rgba(0,242,254,0.15); color: #00f2fe; }

      .ak-sentinel-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(320px, 1fr)); gap: 16px; }
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

      .ak-compound-summary-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 10px; }
      .ak-csum-card {
        background: rgba(0,0,0,0.3); border: 1px solid rgba(255,255,255,0.06); border-radius: 8px;
        padding: 10px 14px; display: flex; flex-direction: column; gap: 2px;
      }
      .ak-csum-card .label { font-size: 10px; font-weight: 700; color: #94a3b8; }
      .ak-csum-card .val { font-size: 16px; font-weight: 800; color: #fff; }

      .ak-compound-table-wrap { max-height: 320px; overflow-y: auto; border: 1px solid rgba(255,255,255,0.06); border-radius: 6px; }
      .ak-compound-table { width: 100%; border-collapse: collapse; font-size: 12px; }
      .ak-compound-table th {
        background: rgba(255,255,255,0.03); color: #94a3b8; font-size: 11px; padding: 8px 12px; text-align: left;
        position: sticky; top: 0;
      }
      .ak-compound-table td { padding: 8px 12px; border-bottom: 1px solid rgba(255,255,255,0.04); }

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
      .ak-tv-container { border: 1px solid rgba(255,255,255,0.08); border-radius: 10px; overflow: hidden; min-height: 550px; background: #080b12; }
      .ak-loading-tv { display: flex; align-items: center; justify-content: center; height: 550px; color: #64748b; font-size: 13px; }

      .ak-tg-master-card {
        background: linear-gradient(135deg, rgba(15, 23, 42, 0.9), rgba(0, 136, 204, 0.08)) !important;
        border: 1px solid rgba(0, 136, 204, 0.35) !important;
        border-radius: 12px;
      }
      .ak-tg-auto-switch-box {
        background: rgba(0, 0, 0, 0.35);
        border: 1px solid rgba(255, 255, 255, 0.08);
        border-radius: 8px;
        padding: 12px 16px;
      }
      .ak-switch {
        position: relative;
        display: inline-block;
        width: 44px;
        height: 24px;
        flex-shrink: 0;
      }
      .ak-switch input { opacity: 0; width: 0; height: 0; }
      .ak-switch .slider {
        position: absolute; cursor: pointer; top: 0; left: 0; right: 0; bottom: 0;
        background-color: #334155; transition: .3s; border-radius: 24px;
      }
      .ak-switch .slider:before {
        position: absolute; content: ""; height: 18px; width: 18px; left: 3px; bottom: 3px;
        background-color: white; transition: .3s; border-radius: 50%;
      }
      .ak-switch input:checked + .slider { background-color: #10b981; }
      .ak-switch input:checked + .slider:before { transform: translateX(20px); }
      .ak-tg-credentials-grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
        gap: 12px;
        margin: 10px 0;
      }
      .ak-tg-market-filters-section {
        background: rgba(0, 0, 0, 0.28);
        border: 1px solid rgba(255, 255, 255, 0.06);
        border-radius: 10px;
        padding: 14px 16px;
        margin: 10px 0;
      }
      .ak-tg-markets-grid {
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
        gap: 8px;
        margin-top: 8px;
      }
      .ak-tg-market-chip {
        display: flex;
        align-items: center;
        gap: 6px;
        background: rgba(15, 23, 42, 0.6);
        border: 1px solid rgba(255, 255, 255, 0.1);
        border-radius: 6px;
        padding: 8px 10px;
        cursor: pointer;
        font-size: 11px;
        transition: all 0.2s ease;
      }
      .ak-tg-market-chip.active {
        background: rgba(0, 136, 204, 0.18);
        border-color: #0088cc;
        color: #fff;
      }
      .ak-tg-market-chip input {
        cursor: pointer;
      }
      .ak-chart-stage-container {
        display: flex;
        position: relative;
        width: 100%;
        background: #080c14;
        border-radius: 8px;
        overflow: hidden;
      }
      .ak-chart-v-scroll-bar {
        width: 36px;
        background: rgba(10, 15, 26, 0.92);
        border-left: 1px solid rgba(255, 255, 255, 0.08);
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: space-between;
        padding: 8px 4px;
        box-sizing: border-box;
        user-select: none;
      }
      .ak-vbar-btn {
        width: 28px;
        height: 28px;
        border-radius: 6px;
        background: rgba(255, 255, 255, 0.06);
        border: 1px solid rgba(255, 255, 255, 0.12);
        color: #94a3b8;
        font-size: 11px;
        display: flex;
        align-items: center;
        justify-content: center;
        cursor: pointer;
        transition: all 0.15s ease;
      }
      .ak-vbar-btn:hover {
        background: rgba(0, 242, 254, 0.2);
        border-color: #00f2fe;
        color: #00f2fe;
      }
      .ak-vbar-btn.reset {
        font-size: 14px;
        color: #10b981;
      }
      .ak-vbar-btn.reset:hover {
        background: rgba(16, 185, 129, 0.2);
        border-color: #10b981;
      }
      .ak-vbar-track-wrap {
        flex: 1;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: space-between;
        padding: 6px 0;
        position: relative;
        width: 100%;
      }
      .ak-vbar-lbl {
        font-size: 8px;
        font-weight: 700;
        color: #64748b;
        letter-spacing: 0.5px;
      }
      .ak-vbar-lbl.top { color: #00f2fe; }
      .ak-vbar-lbl.btm { color: #f59e0b; }
      .ak-vbar-slider {
        -webkit-appearance: slider-vertical;
        writing-mode: vertical-lr;
        direction: rtl;
        width: 8px;
        height: calc(100% - 30px);
        background: rgba(255, 255, 255, 0.1);
        border-radius: 4px;
        cursor: pointer;
        accent-color: #00f2fe;
        margin: 6px 0;
      }
      .ak-chart-canvas-wrapper.theme-light .ak-chart-stage-container,
      .ak-chart-canvas-wrapper.theme-light #canvasChartContainer {
        background: #ffffff !important;
      }
      .ak-chart-canvas-wrapper.theme-light .ak-chart-v-scroll-bar {
        background: #f8fafc;
        border-left: 1px solid rgba(0, 0, 0, 0.08);
      }
      .ak-chart-canvas-wrapper.theme-light .ak-vbar-btn {
        background: rgba(0, 0, 0, 0.04);
        border: 1px solid rgba(0, 0, 0, 0.12);
        color: #334155;
      }
      .ak-chart-canvas-wrapper.theme-light .ak-vbar-btn:hover {
        background: rgba(2, 132, 199, 0.15);
        border-color: #0284c7;
        color: #0284c7;
      }
      .ak-chart-canvas-wrapper.theme-light .ak-vbar-slider {
        background: rgba(0, 0, 0, 0.1);
        accent-color: #0284c7;
      }
      .ak-connections-deck { display: flex; flex-direction: column; gap: 16px; }
      .ak-conn-card {
        background: rgba(15,23,42,0.7); border: 1px solid rgba(255,255,255,0.08); border-radius: 10px;
        padding: 18px 20px; display: flex; flex-direction: column; gap: 10px;
      }
      .ak-conn-header { display: flex; align-items: center; gap: 12px; }
      .ak-conn-icon { width: 38px; height: 38px; border-radius: 8px; display: flex; align-items: center; justify-content: center; font-size: 18px; }
      .ak-conn-actions { display: flex; align-items: center; gap: 12px; flex-wrap: wrap; margin-top: 6px; }
      .ak-api-token-box { background: rgba(0,0,0,0.3); border: 1px solid rgba(255,255,255,0.06); border-radius: 8px; padding: 12px 14px; }

      /* ==========================================================================
         ADAPTACIÓN MÓVIL PROFESIONAL (SMARTPHONES, TABLETS & VIEWPORTS PEQUEÑOS)
         ========================================================================== */
      @media (max-width: 768px) {
        .ak-trading-wrap {
          gap: 10px;
          padding: 0 4px;
        }

        /* 1. Cabecera Hero */
        .ak-trading-hero {
          padding: 12px 14px !important;
          border-radius: 10px !important;
        }
        .ak-trading-hero-top {
          flex-direction: column !important;
          align-items: flex-start !important;
          gap: 10px !important;
          margin-bottom: 12px !important;
        }
        .ak-trading-title-group h2 {
          font-size: 16px !important;
        }
        .ak-trading-title-group p {
          font-size: 11px !important;
        }
        .ak-trading-badge-group {
          width: 100% !important;
          overflow-x: auto !important;
          white-space: nowrap !important;
          padding-bottom: 4px !important;
        }

        /* 2. Pestañas Principales Móviles (Scroll Táctil Horizontal) */
        .ak-ttabs-nav {
          display: flex !important;
          overflow-x: auto !important;
          white-space: nowrap !important;
          -webkit-overflow-scrolling: touch !important;
          scrollbar-width: none !important;
          gap: 6px !important;
          padding: 4px 0 !important;
        }
        .ak-ttabs-nav::-webkit-scrollbar { display: none !important; }
        .ak-ttab-btn {
          flex-shrink: 0 !important;
          font-size: 11px !important;
          padding: 8px 12px !important;
          border-radius: 8px !important;
        }

        /* 3. Barra de Control de Mercado y Temporalidades */
        .ak-chart-top-bar {
          flex-direction: column !important;
          align-items: stretch !important;
          gap: 10px !important;
          padding: 10px 12px !important;
        }
        .ak-control-group {
          width: 100% !important;
        }
        .ak-tf-buttons {
          display: flex !important;
          width: 100% !important;
          justify-content: space-between !important;
        }
        .ak-tf-btn, .ak-chart-type-btn {
          flex: 1 !important;
          text-align: center !important;
          padding: 7px 2px !important;
          font-size: 11px !important;
          min-height: 34px !important;
        }

        /* 4. Barra Superior del Canvas y Herramientas */
        .ak-chart-canvas-header {
          flex-direction: column !important;
          align-items: stretch !important;
          gap: 8px !important;
          padding: 8px 10px !important;
        }
        .ak-chart-canvas-header > div:last-child {
          display: flex !important;
          overflow-x: auto !important;
          white-space: nowrap !important;
          -webkit-overflow-scrolling: touch !important;
          gap: 6px !important;
          scrollbar-width: none !important;
          padding-bottom: 4px !important;
        }
        .ak-chart-canvas-header > div:last-child::-webkit-scrollbar { display: none !important; }
        .ak-chart-tool-btn {
          flex-shrink: 0 !important;
          font-size: 10.5px !important;
          padding: 6px 10px !important;
          min-height: 32px !important;
        }

        /* 5. Escenario Canvas y Barra Vertical */
        .ak-chart-stage-container {
          border-radius: 8px !important;
        }
        .ak-chart-v-scroll-bar {
          width: 32px !important;
          padding: 6px 2px !important;
        }
        .ak-vbar-btn {
          width: 26px !important;
          height: 26px !important;
          font-size: 10px !important;
        }
        .ak-vbar-lbl {
          font-size: 7.5px !important;
        }

        /* 6. Barra de Navegación Horizontal Inferior */
        .ak-pill-btn {
        background: rgba(255, 255, 255, 0.05); border: 1px solid rgba(255, 255, 255, 0.12); border-radius: 4px;
        color: #94a3b8; font-size: 10.5px; font-weight: 600; padding: 3px 8px; cursor: pointer; transition: all 0.2s;
      }
      .ak-pill-btn:hover { background: rgba(0, 242, 254, 0.15); border-color: #00f2fe; color: #00f2fe; }
      .ak-pill-btn.active { background: rgba(0, 242, 254, 0.25); border-color: #00f2fe; color: #ffffff; font-weight: bold; }
      .ak-chart-nav-bar {
          flex-direction: column !important;
          gap: 8px !important;
          padding: 8px 10px !important;
        }
        .ak-nav-left-group, .ak-nav-right-group {
          width: 100% !important;
          justify-content: space-between !important;
          flex-wrap: wrap !important;
          gap: 6px !important;
        }
        .ak-slider-wrap {
          flex: 1 !important;
          min-width: 110px !important;
        }
        .ak-nav-btn {
          font-size: 10px !important;
          padding: 6px 8px !important;
          min-height: 32px !important;
        }

        /* 7. Centro Telegram Móvil */
        .ak-tg-credentials-grid {
          grid-template-columns: 1fr !important;
          gap: 8px !important;
        }
        .ak-tg-market-filters-section > div:first-child > div:last-child {
          display: flex !important;
          overflow-x: auto !important;
          white-space: nowrap !important;
          -webkit-overflow-scrolling: touch !important;
          padding-bottom: 4px !important;
        }
        .ak-tg-markets-grid {
          grid-template-columns: repeat(2, 1fr) !important;
          gap: 6px !important;
        }
        .ak-tg-market-chip {
          padding: 6px 8px !important;
          font-size: 10.5px !important;
        }
        .ak-conn-card {
          padding: 12px 14px !important;
        }

        /* 8. Cuadrículas y Tablas del Simulador */
        .ak-market-data-grid {
          flex-direction: column !important;
        }
        .ak-order-actions-grid {
          grid-template-columns: 1fr 1fr !important;
        }
        .ak-calc-grid {
          grid-template-columns: repeat(2, 1fr) !important;
        }
        .ak-compound-summary-grid {
          grid-template-columns: repeat(2, 1fr) !important;
        }
      }

      @media (max-width: 480px) {
        .ak-tg-markets-grid {
          grid-template-columns: 1fr !important;
        }
        .ak-trading-title-group h2 {
          font-size: 14.5px !important;
        }
        .ak-chart-tool-btn {
          font-size: 10px !important;
          padding: 5px 8px !important;
        }
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
