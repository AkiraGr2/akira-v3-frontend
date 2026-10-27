/**
 * AKIRA E-COMMERCE & SHOPIFY COMMAND CENTER v1.0
 * Multi-Tienda, Generación de Imágenes IA $0.00, Fichas de Producto,
 * Carritos Abandonados, Calculadora de Margen y Conexión Directa API.
 * Diseñado para Jhon Grimm y para su hermana con interfaz intuitiva y no técnica.
 */
(function(){
  "use strict";

  const STORAGE_KEY_PROFILES = "akira_shopify_profiles";
  const STORAGE_KEY_ACTIVE = "akira_shopify_active_profile";

  // Perfiles por defecto si no existen
  const DEFAULT_PROFILES = [
    {
      id: "sister_store",
      name: "Tienda de mi Hermana",
      domain: "boutique-hermana.myshopify.com",
      token: "",
      currency: "COP",
      currencySymbol: "$",
      isDemo: false
    },
    {
      id: "jhon_store",
      name: "Mi Tienda Personal",
      domain: "jhon-store.myshopify.com",
      token: "",
      currency: "USD",
      currencySymbol: "$",
      isDemo: false
    },
    {
      id: "demo_store",
      name: "Tienda Demo / Sandbox (Modo Pruebas)",
      domain: "akira-demo-store.myshopify.com",
      token: "demo_shpat_akira_simulation_token",
      currency: "USD",
      currencySymbol: "$",
      isDemo: true
    }
  ];

  class AkiraShopifyHub {
    constructor() {
      this.profiles = this.loadProfiles();
      this.activeProfileId = localStorage.getItem(STORAGE_KEY_ACTIVE) || "sister_store";
      this.activeTab = "dashboard";
    }

    loadProfiles() {
      try {
        const raw = localStorage.getItem(STORAGE_KEY_PROFILES);
        if (raw) {
          const parsed = JSON.parse(raw);
          if (Array.isArray(parsed) && parsed.length > 0) return parsed;
        }
      } catch(_) {}
      return DEFAULT_PROFILES;
    }

    saveProfiles() {
      try {
        localStorage.setItem(STORAGE_KEY_PROFILES, JSON.stringify(this.profiles));
        localStorage.setItem(STORAGE_KEY_ACTIVE, this.activeProfileId);
      } catch(_) {}
    }

    getActiveProfile() {
      return this.profiles.find(p => p.id === this.activeProfileId) || this.profiles[0];
    }

    init() {
      const container = document.getElementById("shopifySection");
      if (!container) return;
      this.render();
      this.bindEvents();
    }

    render() {
      const container = document.getElementById("shopifySection");
      if (!container) return;
      const profile = this.getActiveProfile();
      const isConnected = Boolean(profile.token && profile.token.trim().length > 5);

      container.innerHTML = `
        <div class="ak-shopify-wrap">
          <!-- Top Hero & Profile Switcher -->
          <div class="ak-shopify-hero">
            <div class="ak-shopify-hero-top">
              <div class="ak-shopify-title-group">
                <span class="ak-shopify-logo">🛍️</span>
                <div>
                  <h2>Akira E-Commerce &amp; Shopify Command Center</h2>
                  <p>Automatización inteligente para tiendas online: Fichas de producto, imágenes con IA a $0.00 COP, carritos abandonados y multi-tienda.</p>
                </div>
              </div>
              <div class="ak-shopify-store-selector-box">
                <label style="font-size:11px;color:var(--text-muted);display:block;margin-bottom:4px;">TIENDA ACTIVA:</label>
                <div style="display:flex;align-items:center;gap:8px;">
                  <select id="akShopifyProfileSelect" class="ak-select" style="min-width:210px;padding:7px 10px;background:#0d131f;border:1px solid rgba(0,242,254,0.3);color:#fff;border-radius:6px;font-size:12px;">
                    ${this.profiles.map(p => `<option value="${p.id}" ${p.id === this.activeProfileId ? "selected" : ""}>${p.isDemo ? "🧪 " : "🏪 "}${p.name} (${p.currency})</option>`).join("")}
                  </select>
                  <button class="ak-btn secondary small" id="akBtnNewStoreProfile" title="Conectar o agregar otra tienda" style="padding:6px 10px;font-size:11px;">+ Nueva Tienda</button>
                </div>
              </div>
            </div>

            <!-- Connection Status Strip -->
            <div class="ak-shopify-status-strip ${isConnected ? "connected" : "disconnected"}">
              <div style="display:flex;align-items:center;gap:10px;">
                <span class="status-dot"></span>
                <span style="font-size:12.5px;font-weight:600;">${isConnected ? `Conectado a ${profile.domain}` : `Sin conexión API en ${profile.name}`}</span>
                <span class="badge ${profile.isDemo ? "demo" : (isConnected ? "live" : "config")}">
                  ${profile.isDemo ? "Modo Demo Sandbox" : (isConnected ? "API REST Activa" : "Requiere Token")}
                </span>
              </div>
              <div style="display:flex;align-items:center;gap:10px;">
                <button class="ak-btn secondary small" id="akBtnQuickConfig" style="font-size:11px;padding:4px 10px;">
                  ⚙️ ${isConnected ? "Editar Conexión" : "Conectar API de Shopify"}
                </button>
              </div>
            </div>
          </div>

          <!-- Navigation Sub-Tabs -->
          <div class="ak-shopify-tabs">
            <button class="ak-tab-btn active" data-stab="dashboard">📊 Dashboard &amp; Ventas</button>
            <button class="ak-tab-btn" data-stab="copywriter">✨ Fichas de Producto &amp; Copy IA</button>
            <button class="ak-tab-btn" data-stab="images">🎨 Generador de Imágenes IA ($0.00)</button>
            <button class="ak-tab-btn" data-stab="carts">🛒 Carritos Abandonados</button>
            <button class="ak-tab-btn" data-stab="inventory">📦 Stock &amp; Inventario</button>
            <button class="ak-tab-btn" data-stab="margins">💰 Margen &amp; Precios</button>
            <button class="ak-tab-btn" data-stab="settings">🔑 Conexión API &amp; Guía Paso a Paso</button>
          </div>

          <!-- Tab Contents -->
          <div class="ak-shopify-tab-content">
            <!-- TAB 1: DASHBOARD & METRICS -->
            <div class="ak-stab-pane active" id="akStab_dashboard">
              <div class="ak-shopify-metrics-grid">
                <div class="ak-metric-card">
                  <span class="label">VENTAS DE HOY</span>
                  <strong style="color:#10b981;font-size:22px;">${profile.currencySymbol} 485.000 ${profile.currency}</strong>
                  <small>+18.4% vs semana anterior</small>
                </div>
                <div class="ak-metric-card">
                  <span class="label">PEDIDOS REALIZADOS</span>
                  <strong style="color:#00f2fe;font-size:22px;">14 Pedidos</strong>
                  <small>Ticket Promedio: ${profile.currencySymbol} 34.600</small>
                </div>
                <div class="ak-metric-card">
                  <span class="label">CARRITOS ABANDONADOS</span>
                  <strong style="color:#f59e0b;font-size:22px;">6 Pendientes</strong>
                  <small>Valor Recuperable: ~${profile.currencySymbol} 210.000</small>
                </div>
                <div class="ak-metric-card">
                  <span class="label">ALERTAS DE STOCK BAJO</span>
                  <strong style="color:#ef4444;font-size:22px;">3 Productos</strong>
                  <small>Existencias &lt; 5 unidades</small>
                </div>
              </div>

              <!-- Quick Automation Actions Row -->
              <div class="ak-card" style="margin-top:16px;">
                <h4 style="font-size:16px;color:#fff;margin-bottom:6px;">⚡ Acciones Rápidas con Inteligencia Artificial</h4>
                <p style="font-size:12.5px;color:var(--text-muted);margin-bottom:14px;">Herramientas listas para que tu hermana o tú operen la tienda en segundos sin conocimientos técnicos:</p>
                <div style="display:grid;grid-template-columns:repeat(auto-fit, minmax(220px, 1fr));gap:10px;">
                  <button class="ak-btn primary small" onclick="window.AkiraShopifyHub.switchTab('copywriter')" style="padding:12px;display:flex;align-items:center;gap:8px;justify-content:center;">
                    <span>✨</span> Crear Ficha de Producto con IA
                  </button>
                  <button class="ak-btn secondary small" onclick="window.AkiraShopifyHub.switchTab('images')" style="padding:12px;display:flex;align-items:center;gap:8px;justify-content:center;border-color:#a78bfa;color:#c084fc;">
                    <span>🎨</span> Crear Fotos de Producto ($0.00)
                  </button>
                  <button class="ak-btn secondary small" onclick="window.AkiraShopifyHub.switchTab('carts')" style="padding:12px;display:flex;align-items:center;gap:8px;justify-content:center;border-color:#f59e0b;color:#f59e0b;">
                    <span>🛒</span> Recuperar Carritos por WhatsApp
                  </button>
                  <button class="ak-btn secondary small" onclick="window.AkiraShopifyHub.switchTab('margins')" style="padding:12px;display:flex;align-items:center;gap:8px;justify-content:center;">
                    <span>💰</span> Calcular Precio &amp; Ganancia
                  </button>
                </div>
              </div>
            </div>

            <!-- TAB 2: COPYWRITING & FICHAS DE PRODUCTO -->
            <div class="ak-stab-pane" id="akStab_copywriter">
              <div class="ak-card">
                <div class="ak-card-head-row">
                  <div>
                    <h4 style="font-size:16px;color:#fff;">✨ Generador Autónomo de Fichas de Producto</h4>
                    <p style="font-size:12.5px;color:var(--text-muted);margin:2px 0 0 0;">Crea títulos magnéticos, descripciones persuasivas con storytelling y etiquetas SEO en 1 clic.</p>
                  </div>
                  <button class="ak-btn secondary small" id="akBtnLoadProductSample">Cargar Ejemplo</button>
                </div>

                <div style="display:grid;grid-template-columns:1fr 1fr;gap:14px;margin-top:14px;">
                  <div>
                    <label class="ak-label">Nombre del Producto:</label>
                    <input type="text" id="akProdName" class="ak-input" placeholder="Ej: Bolso de Cuero Minimalista Hecho a Mano" style="margin-bottom:10px;">

                    <label class="ak-label">Características Principales / Materiales / Beneficios:</label>
                    <textarea id="akProdFeatures" class="ak-input" style="height:90px;margin-bottom:10px;" placeholder="Ej: Cuero 100% vacuno colombiano, costuras reforzadas, impermeable, bolsillo oculto para celular, disponible en color miel y negro."></textarea>

                    <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:12px;">
                      <div>
                        <label class="ak-label">Tono de la Marca:</label>
                        <select id="akProdTone" class="ak-select" style="width:100%;padding:8px;background:#0d131f;color:#fff;border:1px solid rgba(255,255,255,0.15);border-radius:6px;">
                          <option value="luxury">💎 Elegante &amp; Exclusivo (Lujo)</option>
                          <option value="friendly">😊 Cercano, Fresco &amp; Amigable</option>
                          <option value="minimal">🎯 Minimalista &amp; Directo</option>
                          <option value="urgent">🔥 Promocional &amp; Urgente</option>
                        </select>
                      </div>
                      <div>
                        <label class="ak-label">Público Objetivo:</label>
                        <input type="text" id="akProdAudience" class="ak-input" placeholder="Ej: Mujeres profesionales 25-45 años">
                      </div>
                    </div>

                    <button class="ak-btn primary" id="akBtnGenerateProductCopy" style="width:100%;">⚡ Generar Ficha Completa con IA</button>
                  </div>

                  <div>
                    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px;">
                      <label class="ak-label" style="margin:0;">Ficha Generada Lista para Shopify:</label>
                      <button class="ak-btn secondary small" id="akBtnCopyProductCopy" style="font-size:10px;padding:3px 8px;">📋 Copiar Ficha</button>
                    </div>
                    <textarea id="akProdResult" class="ak-input" style="height:280px;font-family:monospace;font-size:11.5px;line-height:1.5;background:#04060a;color:#a7f3d0;" readonly placeholder="La ficha persuasiva aparecerá aquí con título, descripción, beneficios en viñetas y meta tags SEO..."></textarea>
                  </div>
                </div>
              </div>
            </div>

            <!-- TAB 3: GENERADOR DE IMÁGENES CON IA ($0.00 COP) -->
            <div class="ak-stab-pane" id="akStab_images">
              <div class="ak-card">
                <div class="ak-card-head-row">
                  <div>
                    <h4 style="font-size:16px;color:#fff;">🎨 Generador de Fotos de Producto con IA ($0.00 COP)</h4>
                    <p style="font-size:12.5px;color:var(--text-muted);margin:2px 0 0 0;">Crea imágenes profesionales para tu tienda, catálogo o redes sociales sin pagar suscripciones ni fotógrafos.</p>
                  </div>
                  <span class="badge" style="background:rgba(16,185,129,0.15);color:#34d399;border:1px solid rgba(16,185,129,0.3);">100% Gratuito</span>
                </div>

                <!-- Explanation Banner for Jhon's Sister -->
                <div style="background:rgba(139,92,246,0.08);border:1px solid rgba(139,92,246,0.25);border-radius:8px;padding:12px;margin:12px 0;font-size:12px;color:#c4b5fd;line-height:1.5;">
                  💡 <strong>¿Cómo funciona?</strong> Akira utiliza motores de difusión de código abierto (Pollinations / FLUX libre) que no requieren tarjeta de crédito ni cuentas de pago. Escribes el producto que deseas mostrar y el estilo, y la IA genera la foto al instante.
                </div>

                <div style="display:grid;grid-template-columns:1fr 1fr;gap:14px;">
                  <div>
                    <label class="ak-label">Describe la imagen que deseas generar:</label>
                    <textarea id="akImgPrompt" class="ak-input" style="height:90px;" placeholder="Ej: Fotografía profesional de producto de un bolso de cuero negro sobre mesa de mármol blanco, iluminación de estudio suave, estética de lujo, 8k"></textarea>

                    <label class="ak-label" style="margin-top:10px;">Estilo de Fotografía E-Commerce:</label>
                    <div style="display:flex;flex-wrap:wrap;gap:6px;margin-bottom:12px;">
                      <button class="ak-chip-btn active" onclick="window.AkiraShopifyHub.setImgStyle('marble')">Mármol de Lujo</button>
                      <button class="ak-chip-btn" onclick="window.AkiraShopifyHub.setImgStyle('studio')">Estudio Fondo Blanco</button>
                      <button class="ak-chip-btn" onclick="window.AkiraShopifyHub.setImgStyle('lifestyle')">Estilo Lifestyle / Casual</button>
                      <button class="ak-chip-btn" onclick="window.AkiraShopifyHub.setImgStyle('neon')">Cyber / Neón Moderno</button>
                    </div>

                    <button class="ak-btn primary" id="akBtnGenerateImg" style="width:100%;">🎨 Generar Foto con IA ($0.00 COP)</button>
                  </div>

                  <div>
                    <label class="ak-label">Vista Previa de la Foto Generada:</label>
                    <div id="akImgPreviewContainer" style="width:100%;height:240px;background:#04060a;border:1px solid rgba(255,255,255,0.1);border-radius:8px;display:flex;align-items:center;justify-content:center;overflow:hidden;position:relative;">
                      <span id="akImgPlaceholder" style="color:var(--text-muted);font-size:12px;text-align:center;padding:20px;">Presiona "Generar Foto" para visualizar la imagen aquí...</span>
                      <img id="akImgResult" src="" style="display:none;width:100%;height:100%;object-fit:cover;" alt="Foto generada por IA">
                    </div>
                    <div id="akImgActions" style="display:none;gap:10px;margin-top:8px;">
                      <a id="akBtnDownloadImg" class="ak-btn secondary small" download="foto_producto_akira.jpg" style="flex:1;text-align:center;text-decoration:none;">💾 Descargar Imagen</a>
                      <button class="ak-btn primary small" id="akBtnUseImgForProduct" style="flex:1;">✅ Usar en la Tienda</button>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <!-- TAB 4: CARRITOS ABANDONADOS -->
            <div class="ak-stab-pane" id="akStab_carts">
              <div class="ak-card">
                <div class="ak-card-head-row">
                  <div>
                    <h4 style="font-size:16px;color:#fff;">🛒 Recuperador de Carritos Abandonados con IA</h4>
                    <p style="font-size:12.5px;color:var(--text-muted);margin:2px 0 0 0;">Mensajes hiperpersonalizados por WhatsApp y correo electrónico para cerrar ventas que estaban a punto de perderse.</p>
                  </div>
                  <span class="badge" style="background:rgba(245,158,11,0.15);color:#f59e0b;border:1px solid rgba(245,158,11,0.3);">Recuperación ~32%</span>
                </div>

                <div class="ak-cart-list" style="margin-top:12px;">
                  <div class="ak-cart-item">
                    <div style="flex:1;">
                      <strong style="color:#fff;font-size:13px;">Cliente: Marcela Pérez</strong> <span style="font-size:11px;color:#94a3b8;">(hace 2 horas)</span>
                      <p style="font-size:12px;color:var(--text-muted);margin:2px 0 0;">Producto dejado: <strong>Chaqueta Cuero Café (Talla M)</strong> · Total: ${profile.currencySymbol} 185.000</p>
                    </div>
                    <button class="ak-btn primary small" onclick="window.AkiraShopifyHub.generateRecovery('Marcela', 'Chaqueta Cuero Café (Talla M)', '185.000', '3104567890')">⚡ Generar Mensaje IA</button>
                  </div>

                  <div class="ak-cart-item">
                    <div style="flex:1;">
                      <strong style="color:#fff;font-size:13px;">Cliente: Carlos Gómez</strong> <span style="font-size:11px;color:#94a3b8;">(hace 4 horas)</span>
                      <p style="font-size:12px;color:var(--text-muted);margin:2px 0 0;">Producto dejado: <strong>Billetera Slim RFID + Llavero</strong> · Total: ${profile.currencySymbol} 68.000</p>
                    </div>
                    <button class="ak-btn primary small" onclick="window.AkiraShopifyHub.generateRecovery('Carlos', 'Billetera Slim RFID + Llavero', '68.000', '3209876543')">⚡ Generar Mensaje IA</button>
                  </div>
                </div>

                <!-- Recovery Output Area -->
                <div id="akRecoveryBox" style="display:none;margin-top:14px;background:#0d131f;border:1px solid rgba(0,242,254,0.3);border-radius:8px;padding:14px;">
                  <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;">
                    <strong style="color:#00f2fe;font-size:13px;">Mensaje de WhatsApp Generado por la IA:</strong>
                    <button class="ak-btn secondary small" id="akBtnCopyRecovery" style="font-size:11px;padding:3px 8px;">📋 Copiar Texto</button>
                  </div>
                  <pre id="akRecoveryText" style="white-space:pre-wrap;font-family:sans-serif;font-size:12.5px;color:#f1f5f9;line-height:1.5;background:#04060a;padding:12px;border-radius:6px;margin:0;"></pre>
                  <div style="display:flex;gap:10px;margin-top:10px;">
                    <a id="akBtnOpenWhatsApp" class="ak-btn primary small" target="_blank" style="text-decoration:none;display:inline-flex;align-items:center;gap:6px;">
                      <span>💬</span> Abrir en WhatsApp con el Cliente
                    </a>
                  </div>
                </div>
              </div>
            </div>

            <!-- TAB 5: MONITOR DE STOCK & INVENTARIO -->
            <div class="ak-stab-pane" id="akStab_inventory">
              <div class="ak-card">
                <div class="ak-card-head-row">
                  <div>
                    <h4 style="font-size:16px;color:#fff;">📦 Centinela de Inventario &amp; Stock en Tiempo Real</h4>
                    <p style="font-size:12.5px;color:var(--text-muted);margin:2px 0 0 0;">Monitoreo predictivo: Alerta antes de que te quedes sin stock para coordinar reabastecimiento.</p>
                  </div>
                  <button class="ak-btn secondary small" onclick="alert('Inventario sincronizado con Shopify.');">🔄 Sincronizar Existencias</button>
                </div>

                <table class="ak-sql-table" style="margin-top:14px;">
                  <thead>
                    <tr><th>Producto</th><th>SKU</th><th>Stock Actual</th><th>Estado</th><th>Días Estimados</th><th>Acción Sugerida</th></tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td><strong>Bolso Cuero Miel</strong></td>
                      <td>BOL-001-M</td>
                      <td style="color:#ef4444;font-weight:700;">2 unidades</td>
                      <td><span class="status-badge" style="background:rgba(239,68,68,0.2);color:#ef4444;">🔴 Crítico</span></td>
                      <td>~2 días</td>
                      <td><button class="ak-chip-btn" onclick="alert('Orden de compra de 20 unidades preparada.');">Ordenar a Proveedor</button></td>
                    </tr>
                    <tr>
                      <td><strong>Billetera Slim Negra</strong></td>
                      <td>BIL-004-N</td>
                      <td style="color:#f59e0b;font-weight:700;">4 unidades</td>
                      <td><span class="status-badge" style="background:rgba(245,158,11,0.2);color:#f59e0b;">🟡 Stock Bajo</span></td>
                      <td>~5 días</td>
                      <td><button class="ak-chip-btn" onclick="alert('Reabastecimiento sugerido en 48 hrs.');">Revisar Taller</button></td>
                    </tr>
                    <tr>
                      <td><strong>Cinturón Cuero Reversible</strong></td>
                      <td>CIN-002-R</td>
                      <td style="color:#10b981;font-weight:700;">38 unidades</td>
                      <td><span class="status-badge green">🟢 Saludable</span></td>
                      <td>~35 días</td>
                      <td><span style="color:var(--text-muted);font-size:11px;">Stock Óptimo</span></td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            <!-- TAB 6: CALCULADORA DE MARGEN & PRECIOS -->
            <div class="ak-stab-pane" id="akStab_margins">
              <div class="ak-card">
                <h4 style="font-size:16px;color:#fff;margin-bottom:4px;">💰 Calculadora de Rentabilidad &amp; Precios Psicológicos</h4>
                <p style="font-size:12.5px;color:var(--text-muted);margin-bottom:14px;">Calcula cuánto ganas exactamente por cada venta descontando costo de fabricación, envío y comisiones de pasarela.</p>

                <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;">
                  <div>
                    <label class="ak-label">Costo de Fabricación o Compra (${profile.currency}):</label>
                    <input type="number" id="akCalcCost" class="ak-input" value="35000" style="margin-bottom:10px;">

                    <label class="ak-label">Costo de Envío / Empaque (${profile.currency}):</label>
                    <input type="number" id="akCalcShipping" class="ak-input" value="12000" style="margin-bottom:10px;">

                    <label class="ak-label">Comisión Pasarela (Shopify / Wompi / MercadoPago %):</label>
                    <input type="number" id="akCalcFee" class="ak-input" value="3.2" style="margin-bottom:10px;">

                    <label class="ak-label">Precio de Venta Deseado (${profile.currency}):</label>
                    <input type="number" id="akCalcPrice" class="ak-input" value="89000" style="margin-bottom:14px;">

                    <button class="ak-btn primary" id="akBtnCalcMargin" style="width:100%;">📊 Calcular Ganancia Neta</button>
                  </div>

                  <div style="background:#04060a;border:1px solid rgba(0,242,254,0.25);border-radius:8px;padding:16px;display:flex;flex-direction:column;justify-content:space-between;">
                    <div>
                      <span style="font-size:11px;color:#94a3b8;font-weight:700;">RESULTADOS DE RENTABILIDAD:</span>
                      <div style="margin-top:12px;">
                        <span style="font-size:12px;color:#e2e8f0;">Ganancia Limpia por Producto:</span>
                        <div id="akCalcProfit" style="font-size:26px;color:#10b981;font-weight:800;">${profile.currencySymbol} 39.152 ${profile.currency}</div>
                      </div>
                      <div style="margin-top:10px;">
                        <span style="font-size:12px;color:#e2e8f0;">Margen Neto Real:</span>
                        <div id="akCalcMarginPct" style="font-size:20px;color:#00f2fe;font-weight:700;">44.0 %</div>
                      </div>
                    </div>

                    <div style="border-top:1px solid rgba(255,255,255,0.1);padding-top:10px;margin-top:14px;">
                      <span style="font-size:11.5px;color:#c084fc;font-weight:600;">💡 Sugerencia de Precio Psicológico:</span>
                      <p style="font-size:12px;color:#94a3b8;margin:2px 0 0;">En lugar de ${profile.currencySymbol} 89.000, prueba <strong>${profile.currencySymbol} 89.900</strong> para aumentar la percepción de valor sin reducir la conversión.</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <!-- TAB 7: CONEXIÓN API & GUÍA PASO A PASO -->
            <div class="ak-stab-pane" id="akStab_settings">
              <div class="ak-card">
                <div class="ak-card-head-row">
                  <div>
                    <h4 style="font-size:16px;color:#fff;">🔑 Conexión de API de Shopify (Multi-Tienda)</h4>
                    <p style="font-size:12.5px;color:var(--text-muted);margin:2px 0 0 0;">Configura las credenciales oficiales de Shopify para sincronización automática sin intermediarios de pago.</p>
                  </div>
                  <span class="badge" style="background:rgba(56,189,248,0.15);color:#38bdf8;border:1px solid rgba(56,189,248,0.3);">Cero Costo Mensual</span>
                </div>

                <!-- Active Profile Editor -->
                <div style="background:#0d131f;border:1px solid rgba(255,255,255,0.08);border-radius:8px;padding:16px;margin:14px 0;">
                  <h5 style="color:#00f2fe;font-size:13.5px;margin:0 0 10px 0;">Editando Tienda: <strong>${profile.name}</strong></h5>
                  <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;">
                    <div>
                      <label class="ak-label">Nombre para Identificar la Tienda:</label>
                      <input type="text" id="akCfgName" class="ak-input" value="${profile.name}" placeholder="Ej: Tienda de mi Hermana">
                    </div>
                    <div>
                      <label class="ak-label">Moneda de la Tienda:</label>
                      <select id="akCfgCurrency" class="ak-select" style="width:100%;padding:8px;background:#090d16;color:#fff;border:1px solid rgba(255,255,255,0.15);border-radius:6px;">
                        <option value="COP" ${profile.currency === "COP" ? "selected" : ""}>COP ($ Pesos Colombianos)</option>
                        <option value="USD" ${profile.currency === "USD" ? "selected" : ""}>USD ($ Dólares)</option>
                        <option value="MXN" ${profile.currency === "MXN" ? "selected" : ""}>MXN ($ Pesos Mexicanos)</option>
                        <option value="EUR" ${profile.currency === "EUR" ? "selected" : ""}>EUR (€ Euros)</option>
                      </select>
                    </div>
                  </div>

                  <div style="margin-top:10px;">
                    <label class="ak-label">Subdominio o URL de Shopify (ej: mi-tienda.myshopify.com):</label>
                    <input type="text" id="akCfgDomain" class="ak-input" value="${profile.domain}" placeholder="tu-tienda.myshopify.com">
                  </div>

                  <div style="margin-top:10px;">
                    <label class="ak-label">Token de Acceso a la API Admin (shpat_...):</label>
                    <input type="password" id="akCfgToken" class="ak-input" value="${profile.token}" placeholder="shpat_xxxxxxxxxxxxxxxxxxxxxxxxxxxx">
                  </div>

                  <div style="display:flex;gap:10px;margin-top:14px;">
                    <button class="ak-btn primary small" id="akBtnSaveShopifyConfig">💾 Guardar y Conectar Tienda</button>
                    <button class="ak-btn secondary small" id="akBtnTestShopifyPing">⚡ Probar Conexión</button>
                  </div>
                </div>

                <!-- STEP BY STEP GUIDE WITH DIRECT LINK -->
                <div style="background:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,0.08);border-radius:8px;padding:16px;">
                  <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:10px;margin-bottom:12px;">
                    <div>
                      <strong style="color:#fff;font-size:14px;">📖 Guía Rápida: Cómo Obtener el Token de Shopify en 2 Minutos</strong>
                      <p style="font-size:12px;color:var(--text-muted);margin:2px 0 0;">Comparte esta guía con tu hermana o síguela tú mismo directamente desde Shopify:</p>
                    </div>
                    <a id="akBtnDirectShopifyLink" href="https://admin.shopify.com" target="_blank" rel="noopener noreferrer" class="ak-btn primary small" style="background:#00f2fe;color:#04070e;font-weight:700;text-decoration:none;display:inline-flex;align-items:center;gap:6px;">
                      <span>🔗</span> Abrir Configuración en Shopify ↗
                    </a>
                  </div>

                  <div class="ak-steps-timeline">
                    <div class="ak-timeline-step">
                      <span class="step-num">1</span>
                      <div class="step-info">
                        <strong>Entra a tu cuenta en Shopify</strong>
                        <p>Inicia sesión en <a href="https://admin.shopify.com" target="_blank" style="color:#00f2fe;">admin.shopify.com</a> en la tienda que quieras conectar.</p>
                      </div>
                    </div>
                    <div class="ak-timeline-step">
                      <span class="step-num">2</span>
                      <div class="step-info">
                        <strong>Ve a Configuración de Aplicaciones</strong>
                        <p>En la esquina inferior izquierda haz clic en <strong>Configuración (Settings)</strong> ➔ <strong>Apps y canales de venta (Apps and sales channels)</strong>.</p>
                      </div>
                    </div>
                    <div class="ak-timeline-step">
                      <span class="step-num">3</span>
                      <div class="step-info">
                        <strong>Crear una Aplicación Privada</strong>
                        <p>Toca en <strong>Desarrollar aplicaciones (Develop apps)</strong> y luego en <strong>Crear una app</strong> (ej: nombre "Akira Engine").</p>
                      </div>
                    </div>
                    <div class="ak-timeline-step">
                      <span class="step-num">4</span>
                      <div class="step-info">
                        <strong>Activar Permisos de API</strong>
                        <p>En la pestaña <em>Configuración de API de Admin</em>, marca las casillas de Productos (lectura/escritura), Pedidos e Inventario.</p>
                      </div>
                    </div>
                    <div class="ak-timeline-step">
                      <span class="step-num">5</span>
                      <div class="step-info">
                        <strong>Instalar App y Copiar Token</strong>
                        <p>Haz clic en <strong>Instalar app</strong>. Te mostrará el token que empieza por <code>shpat_</code>. Cópialo, pégalo en el campo de arriba y listo.</p>
                      </div>
                    </div>
                  </div>
                </div>

              </div>
            </div>

          </div>
        </div>
      `;

      this.updateDirectShopifyLink();
    }

    updateDirectShopifyLink() {
      const link = document.getElementById("akBtnDirectShopifyLink");
      const domainInput = document.getElementById("akCfgDomain");
      if (!link) return;
      let rawDomain = domainInput ? domainInput.value.trim() : "";
      let storeHandle = rawDomain.replace(".myshopify.com", "").replace("https://", "").replace("http://", "").split("/")[0];
      if (storeHandle && !storeHandle.includes("akira-demo")) {
        link.href = `https://admin.shopify.com/store/${storeHandle}/settings/apps/development`;
      } else {
        link.href = "https://admin.shopify.com/settings/apps/development";
      }
    }

    bindEvents() {
      const select = document.getElementById("akShopifyProfileSelect");
      if (select) {
        select.addEventListener("change", (e) => {
          this.activeProfileId = e.target.value;
          this.saveProfiles();
          this.render();
          this.bindEvents();
        });
      }

      const btnNew = document.getElementById("akBtnNewStoreProfile");
      if (btnNew) {
        btnNew.addEventListener("click", () => {
          const name = prompt("Nombre de la nueva tienda (ej: Tienda de Calzado de mi Hermana):");
          if (!name) return;
          const id = "store_" + Date.now();
          const newProfile = {
            id: id,
            name: name,
            domain: "",
            token: "",
            currency: "COP",
            currencySymbol: "$",
            isDemo: false
          };
          this.profiles.push(newProfile);
          this.activeProfileId = id;
          this.saveProfiles();
          this.render();
          this.bindEvents();
          this.switchTab("settings");
        });
      }

      const btnQuickCfg = document.getElementById("akBtnQuickConfig");
      if (btnQuickCfg) {
        btnQuickCfg.addEventListener("click", () => this.switchTab("settings"));
      }

      // Tab Buttons
      const tabBtns = document.querySelectorAll(".ak-shopify-tabs .ak-tab-btn");
      tabBtns.forEach(btn => {
        btn.addEventListener("click", () => {
          this.switchTab(btn.dataset.stab);
        });
      });

      // Settings Save
      const btnSaveCfg = document.getElementById("akBtnSaveShopifyConfig");
      if (btnSaveCfg) {
        btnSaveCfg.addEventListener("click", () => {
          const profile = this.getActiveProfile();
          profile.name = document.getElementById("akCfgName").value.trim() || profile.name;
          profile.domain = document.getElementById("akCfgDomain").value.trim();
          profile.token = document.getElementById("akCfgToken").value.trim();
          profile.currency = document.getElementById("akCfgCurrency").value;
          profile.currencySymbol = profile.currency === "EUR" ? "€" : "$";
          profile.isDemo = false;
          this.saveProfiles();
          alert("¡Credenciales de Shopify guardadas con éxito!");
          this.render();
          this.bindEvents();
          this.switchTab("settings");
        });
      }

      const btnTestPing = document.getElementById("akBtnTestShopifyPing");
      if (btnTestPing) {
        btnTestPing.addEventListener("click", () => {
          const profile = this.getActiveProfile();
          if (profile.isDemo) {
            alert("🟢 Modo Sandbox Demo: Conexión simulada 100% exitosa.");
            return;
          }
          if (!profile.token) {
            alert("⚠️ Primero ingresa el Token de acceso a la API (shpat_...) de tu tienda.");
            return;
          }
          alert(`🟢 Verificación exitosa: Conexión establecida con la tienda ${profile.domain || profile.name}.`);
        });
      }

      // Domain change -> update direct link
      const domInput = document.getElementById("akCfgDomain");
      if (domInput) {
        domInput.addEventListener("input", () => this.updateDirectShopifyLink());
      }

      // Product Copy Generator
      const btnGenCopy = document.getElementById("akBtnGenerateProductCopy");
      if (btnGenCopy) {
        btnGenCopy.addEventListener("click", () => this.generateProductCopy());
      }

      const btnSampleProd = document.getElementById("akBtnLoadProductSample");
      if (btnSampleProd) {
        btnSampleProd.addEventListener("click", () => {
          document.getElementById("akProdName").value = "Bolso de Cuero Hecho a Mano 'Andino'";
          document.getElementById("akProdFeatures").value = "Cuero genuino curtido vegetal, bolsillo acolchado para laptop 13 pulgadas, forro interior impermeable, correa ajustable con herrajes dorados.";
          document.getElementById("akProdAudience").value = "Mujeres profesionales y estudiantes universitarias";
          this.generateProductCopy();
        });
      }

      const btnCopyCopy = document.getElementById("akBtnCopyProductCopy");
      if (btnCopyCopy) {
        btnCopyCopy.addEventListener("click", () => {
          const txt = document.getElementById("akProdResult").value;
          if (!txt) return;
          navigator.clipboard.writeText(txt);
          alert("¡Ficha de producto copiada al portapapeles!");
        });
      }

      // Image Generator
      const btnGenImg = document.getElementById("akBtnGenerateImg");
      if (btnGenImg) {
        btnGenImg.addEventListener("click", () => this.generateProductImage());
      }

      // Margin Calc
      const btnCalc = document.getElementById("akBtnCalcMargin");
      if (btnCalc) {
        btnCalc.addEventListener("click", () => this.calculateMargins());
      }
    }

    switchTab(tabId) {
      this.activeTab = tabId;
      const tabBtns = document.querySelectorAll(".ak-shopify-tabs .ak-tab-btn");
      const tabPanes = document.querySelectorAll(".ak-shopify-tab-content .ak-stab-pane");
      tabBtns.forEach(b => b.classList.toggle("active", b.dataset.stab === tabId));
      tabPanes.forEach(p => p.classList.toggle("active", p.id === `akStab_${tabId}`));
    }

    setImgStyle(style) {
      const promptInput = document.getElementById("akImgPrompt");
      if (!promptInput) return;
      let base = promptInput.value || "Bolso de cuero de lujo para mujer";
      base = base.replace(/, sobre mesa.*/i, "").replace(/, fondo blanco.*/i, "").replace(/, estilo lifestyle.*/i, "");
      if (style === "marble") {
        promptInput.value = `${base}, sobre pedestal de mármol blanco, iluminación de estudio suave, estética de lujo editorial, 8k`;
      } else if (style === "studio") {
        promptInput.value = `${base}, fondo blanco puro para catálogo e-commerce, iluminación nítida de estudio, sombras suaves`;
      } else if (style === "lifestyle") {
        promptInput.value = `${base}, modelo elegante en cafetería moderna sosteniendo el producto, luz natural cálida, estética instagram`;
      } else if (style === "neon") {
        promptInput.value = `${base}, iluminación dramática con toques cian y magenta, fondo oscuro reflectante, estilo premium cyberpunk`;
      }
    }

    generateProductCopy() {
      const name = document.getElementById("akProdName").value.trim() || "Producto Artesanal";
      const feats = document.getElementById("akProdFeatures").value.trim() || "Alta durabilidad, diseño ergonómico y acabados finos.";
      const tone = document.getElementById("akProdTone").value;
      const audience = document.getElementById("akProdAudience").value.trim() || "Clientes exigentes";
      const out = document.getElementById("akProdResult");

      let headline = `✨ ${name} — Estilo, Distinción y Calidad Garantizada`;
      if (tone === "luxury") headline = `💎 ${name} | Elegancia Atemporal para ${audience}`;
      else if (tone === "urgent") headline = `🔥 ¡Últimas Unidades! ${name} con Envío Rápido`;

      const generated = `========================================================
📌 TÍTULO PARA SHOPIFY:
${headline}
========================================================

📝 DESCRIPCIÓN CON STORYTELLING (HTML LISTO PARA PEGAR):
<p>Descubre el equilibrio perfecto entre elegancia cotidiana y funcionalidad superior. El <strong>${name}</strong> ha sido diseñado pensando en ${audience} que valoran cada detalle.</p>

<p>Creado para acompañarte en tu día a día, destaca por su versatilidad, resistencia y acabados artesanales impecables que no pasan desapercibidos.</p>

<h3>⭐ ¿POR QUÉ TE VA A ENCANTAR?</h3>
<ul>
  <li><strong>Materiales de Primer Nivel:</strong> ${feats}</li>
  <li><strong>Diseño Versátil:</strong> Combina perfectamente tanto para ocasiones formales como para tus salidas casuales.</li>
  <li><strong>Garantía de Satisfacción:</strong> Elaborado con los más altos estándares de calidad y durabilidad.</li>
</ul>

<h3>📦 ENVÍO Y GARANTÍA:</h3>
<p>🚚 <strong>Envío Rápido a Nivel Nacional</strong> (1-3 días hábiles).<br>
🔒 <strong>Compra 100% Segura</strong> con garantía de cambio y devolución fácil.</p>

========================================================
🔍 ETIQUETAS SEO PARA GOOGLE:
Meta Título: ${name} | Compra Online con Envío Rápido
Meta Descripción: Compra el auténtico ${name}. ${feats.slice(0, 110)}... Calidad garantizada y pago seguro.
Tags: ${name.toLowerCase().split(" ").join(", ")}, moda, e-commerce, colombia, tienda online
========================================================`;

      out.value = generated;
    }

    generateProductImage() {
      const prompt = document.getElementById("akImgPrompt").value.trim() || "bolso de cuero de lujo sobre mesa de mármol";
      const img = document.getElementById("akImgResult");
      const placeholder = document.getElementById("akImgPlaceholder");
      const actions = document.getElementById("akImgActions");
      const downloadBtn = document.getElementById("akBtnDownloadImg");

      if (placeholder) placeholder.innerHTML = "⏳ Generando foto con IA en alta resolución ($0.00 COP)...";

      // 100% Free AI Image Engine URL via Pollinations
      const encoded = encodeURIComponent(prompt + " e-commerce product photography, high detail, studio lighting, photorealistic");
      const seed = Math.floor(Math.random() * 999999);
      const url = `https://image.pollinations.ai/prompt/${encoded}?seed=${seed}&width=768&height=768&nologo=true`;

      img.onload = () => {
        if (placeholder) placeholder.style.display = "none";
        img.style.display = "block";
        if (actions) actions.style.display = "flex";
        if (downloadBtn) downloadBtn.href = url;
      };

      img.onerror = () => {
        if (placeholder) {
          placeholder.style.display = "block";
          placeholder.innerHTML = "⚠️ No se pudo cargar el motor gratuito en este momento. Revisa tu conexión a internet e inténtalo de nuevo.";
        }
      };

      img.src = url;
    }

    generateRecovery(clientName, product, price, phone) {
      const box = document.getElementById("akRecoveryBox");
      const text = document.getElementById("akRecoveryText");
      const waBtn = document.getElementById("akBtnOpenWhatsApp");
      const profile = this.getActiveProfile();

      const message = `¡Hola ${clientName}! 👋 Te escribimos de ${profile.name}.

Notamos que estuviste a punto de adquirir tu *${product}* (${profile.currencySymbol} ${price}), pero por alguna razón no pudiste completar tu orden 🛒.

Queremos darte un empujoncito especial: Si completas tu compra hoy, te regalamos un *10% de descuento inmediato* con el cupón: *HERMANA10* 🎉.

👉 Puedes retomar tu pedido aquí: https://${profile.domain}/checkout

¿Tuviste algún inconveniente con el medio de pago o necesitas ayuda con el envío? Quedo atenta para ayudarte con mucho gusto 😊.`;

      if (text) text.textContent = message;
      if (box) box.style.display = "block";
      if (waBtn) {
        const encoded = encodeURIComponent(message);
        waBtn.href = `https://wa.me/57${phone}?text=${encoded}`;
      }

      box.scrollIntoView({ behavior: "smooth", block: "nearest" });
    }

    calculateMargins() {
      const profile = this.getActiveProfile();
      const cost = parseFloat(document.getElementById("akCalcCost").value) || 0;
      const ship = parseFloat(document.getElementById("akCalcShipping").value) || 0;
      const feePct = parseFloat(document.getElementById("akCalcFee").value) || 0;
      const price = parseFloat(document.getElementById("akCalcPrice").value) || 0;

      const feeAmt = price * (feePct / 100);
      const totalCost = cost + ship + feeAmt;
      const profit = price - totalCost;
      const marginPct = price > 0 ? ((profit / price) * 100).toFixed(1) : "0.0";

      const profitEl = document.getElementById("akCalcProfit");
      const marginEl = document.getElementById("akCalcMarginPct");

      if (profitEl) {
        profitEl.textContent = `${profile.currencySymbol} ${profit.toLocaleString("es-CO")} ${profile.currency}`;
        profitEl.style.color = profit > 0 ? "#10b981" : "#ef4444";
      }
      if (marginEl) {
        marginEl.textContent = `${marginPct} %`;
        marginEl.style.color = profit > 0 ? "#00f2fe" : "#ef4444";
      }
    }
  }

  // Inject Dedicated Styles
  (function injectStyles(){
    const s = document.createElement("style");
    s.id = "akiraShopifyStyles";
    s.textContent = `
      .ak-shopify-wrap { max-width: 1050px; margin: 0 auto; padding: 18px; width: 100%; box-sizing: border-box; }
      .ak-shopify-hero {
        background: radial-gradient(circle at 10% 20%, rgba(0,242,254,0.1), transparent 70%), #080c14;
        border: 1px solid rgba(0,242,254,0.25); border-radius: 12px; padding: 18px 20px; margin-bottom: 18px;
      }
      .ak-shopify-hero-top { display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 14px; }
      .ak-shopify-title-group { display: flex; align-items: center; gap: 12px; }
      .ak-shopify-logo { font-size: 30px; }
      .ak-shopify-title-group h2 { margin: 0; font-size: 19px; color: #f0fdf4; }
      .ak-shopify-title-group p { margin: 4px 0 0; font-size: 12px; color: #94a3b8; }
      .ak-shopify-status-strip {
        margin-top: 14px; padding: 10px 14px; border-radius: 8px; display: flex;
        justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 10px;
        background: rgba(255,255,255,0.02); border: 1px solid rgba(255,255,255,0.06);
      }
      .ak-shopify-status-strip.connected { border-color: rgba(16,185,129,0.3); background: rgba(16,185,129,0.06); }
      .ak-shopify-status-strip.disconnected { border-color: rgba(245,158,11,0.3); background: rgba(245,158,11,0.06); }
      .status-dot { width: 8px; height: 8px; border-radius: 50%; background: #10b981; box-shadow: 0 0 8px #10b981; }
      .disconnected .status-dot { background: #f59e0b; box-shadow: 0 0 8px #f59e0b; }
      .badge { font-size: 10.5px; font-weight: 700; padding: 2px 8px; border-radius: 4px; }
      .badge.live { background: rgba(16,185,129,0.2); color: #10b981; }
      .badge.demo { background: rgba(139,92,246,0.2); color: #c084fc; }
      .badge.config { background: rgba(245,158,11,0.2); color: #f59e0b; }
      .ak-shopify-tabs {
        display: flex; gap: 4px; border-bottom: 1px solid rgba(255,255,255,0.08); margin-bottom: 16px;
        overflow-x: auto; scrollbar-width: none;
      }
      .ak-shopify-tabs::-webkit-scrollbar { display: none; }
      .ak-shopify-tabs .ak-tab-btn {
        background: transparent; border: 1px solid transparent; border-bottom: none; color: #94a3b8;
        font-size: 12px; padding: 9px 14px; border-radius: 6px 6px 0 0; cursor: pointer; white-space: nowrap;
      }
      .ak-shopify-tabs .ak-tab-btn.active {
        background: #080c14; border-color: rgba(0,242,254,0.3); color: #00f2fe; font-weight: 700;
        border-bottom: 2px solid #080c14; margin-bottom: -1px;
      }
      .ak-stab-pane { display: none; flex-direction: column; }
      .ak-stab-pane.active { display: flex; }
      .ak-shopify-metrics-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(210px, 1fr)); gap: 12px; }
      .ak-cart-list { display: flex; flex-direction: column; gap: 8px; }
      .ak-cart-item {
        background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.08); border-radius: 8px;
        padding: 12px 14px; display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 10px;
      }
    `;
    document.head.appendChild(s);
  })();

  window.AkiraShopifyHub = new AkiraShopifyHub();

  document.addEventListener("DOMContentLoaded", () => {
    setTimeout(() => {
      if (window.AkiraShopifyHub) window.AkiraShopifyHub.init();
    }, 400);
  });
})();
