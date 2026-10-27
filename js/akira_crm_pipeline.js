/**
 * AKIRA FREELANCE CRM PIPELINE & INVOICING ENGINE v1.0
 * Zero-Cost ($0.00 COP/USD) client & deal management with 1-click professional PDF invoice generation.
 * Integrates directly with Upwork Monetization and Colmena Specialists.
 */
(function(){
  "use strict";

  const DEMO_DEALS = [
    {
      id: "demo_deal_101",
      title: "[DEMO] Desarrollo SaaS FastAPI & Next.js",
      client: "Horizon Media LLC (Cliente Ejemplo)",
      stage: "development",
      amountUSD: 850,
      commander: "Nexo (Orquestador Central)",
      created: "2026-10-24",
      deadline: "2026-10-30",
      items: [
        { desc: "Arquitectura backend en FastAPI y schemas Pydantic", amount: 400 },
        { desc: "Integración frontend React/Next.js y autenticación JWT", amount: 350 },
        { desc: "Testing automatizado y despliegue CI/CD", amount: 100 }
      ]
    },
    {
      id: "demo_deal_102",
      title: "[DEMO] Automatización de Web Scraping & Extracción",
      client: "Apex Data Group (Cliente Ejemplo)",
      stage: "proposal",
      amountUSD: 450,
      commander: "Cipher (Cripto & Seguridad)",
      created: "2026-10-25",
      deadline: "2026-11-02",
      items: [
        { desc: "Pipeline Playwright headless con rotación de proxies", amount: 300 },
        { desc: "Normalización de datos en PostgreSQL/DuckDB", amount: 150 }
      ]
    },
    {
      id: "demo_deal_103",
      title: "[DEMO] Chatbot RAG Personalizado con Vector Search",
      client: "Vanguardia Legal (Cliente Ejemplo)",
      stage: "paid",
      amountUSD: 1200,
      commander: "Athena (Estrategia & Lógica)",
      created: "2026-10-20",
      deadline: "2026-10-23",
      items: [
        { desc: "Ingesta y chunking semántico de documentos legales", amount: 500 },
        { desc: "Indexación vectorial y prompt engineering anti-alucinación", amount: 500 },
        { desc: "Interfaz conversacional y entrega final", amount: 200 }
      ]
    }
  ];

  // REAL INITIAL STATE: $0.00 (Zero real contracts or rentals assumed)
  const DEFAULT_DEALS = [];

  const STAGES = [
    { id: "lead", name: "🎯 Prospectos" },
    { id: "proposal", name: "📨 Propuesta Enviada" },
    { id: "negotiation", name: "🤝 En Negociación" },
    { id: "development", name: "⚡ En Desarrollo" },
    { id: "delivered", name: "📦 Entregado" },
    { id: "paid", name: "💵 Facturado / Cobrado" }
  ];

  function loadDeals(){
    try {
      // Force clean initialization for transparency (no fake client money)
      const v2Clean = localStorage.getItem("akira_crm_v2_clean");
      if(!v2Clean){
        localStorage.setItem("akira_crm_v2_clean", "true");
        localStorage.setItem("akira_crm_deals", "[]");
        return [];
      }
      const saved = localStorage.getItem("akira_crm_deals");
      if(saved !== null) return JSON.parse(saved);
    } catch(e){}
    return DEFAULT_DEALS;
  }

  function saveDeals(deals){
    try {
      localStorage.setItem("akira_crm_deals", JSON.stringify(deals));
    } catch(e){}
  }

  let currentDeals = loadDeals();

  window.akiraClearCrmDeals = function(){
    if(!confirm("¿Vaciar el CRM a $0.00 USD (Estado inicial limpio de pruebas)?")) return;
    currentDeals = [];
    saveDeals(currentDeals);
    window.akiraRenderCrmModal();
  };

  window.akiraLoadDemoCrmDeals = function(){
    currentDeals = JSON.parse(JSON.stringify(DEMO_DEALS));
    saveDeals(currentDeals);
    window.akiraRenderCrmModal();
  };

  window.akiraAddCrmDeal = function(deal){
    const newDeal = {
      id: "deal_" + Date.now().toString(36),
      title: deal.title || "Nuevo Proyecto Freelance",
      client: deal.client || "Cliente Upwork",
      stage: deal.stage || "proposal",
      amountUSD: Number(deal.amountUSD) || 350,
      commander: deal.commander || "Nexo (Orquestador Central)",
      created: new Date().toISOString().split("T")[0],
      deadline: deal.deadline || "Por acordar",
      items: deal.items || [{ desc: deal.title || "Servicios de desarrollo de software", amount: Number(deal.amountUSD) || 350 }]
    };
    currentDeals.unshift(newDeal);
    saveDeals(currentDeals);
    alert(`Proyecto "${newDeal.title}" agregado al CRM con éxito.`);
    window.akiraRenderCrmModal();
  };

  window.akiraMoveCrmDealStage = function(dealId, newStage){
    const d = currentDeals.find(x => x.id === dealId);
    if(d) {
      d.stage = newStage;
      saveDeals(currentDeals);
      window.akiraRenderCrmModal();
    }
  };

  window.akiraDeleteCrmDeal = function(dealId){
    if(!confirm("¿Eliminar este proyecto del CRM?")) return;
    currentDeals = currentDeals.filter(x => x.id !== dealId);
    saveDeals(currentDeals);
    window.akiraRenderCrmModal();
  };

  /**
   * 1-Click Professional Invoice Generator
   */
  window.akiraGenerateInvoice = function(dealId){
    const deal = currentDeals.find(x => x.id === dealId) || currentDeals[0];
    if(!deal) return;

    const invoiceNo = "INV-" + (deal.id.replace("deal_", "").toUpperCase());
    const dateToday = new Date().toLocaleDateString("es-CO", { year: "numeric", month: "long", day: "numeric" });
    const totalUSD = deal.amountUSD || 0;
    const estCOP = totalUSD * 4100; // estimated COP rate

    const invoiceHtml = `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="utf-8">
  <title>Factura de Servicios - ${invoiceNo}</title>
  <style>
    @media print {
      body { background: #fff !important; color: #000 !important; }
      .no-print { display: none !important; }
      .invoice-box { border: none !important; box-shadow: none !important; margin: 0 !important; width: 100% !important; max-width: 100% !important; }
    }
    *, *::before, *::after { box-sizing: border-box; }
    body {
      background: #0f172a;
      color: #1e293b;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      margin: 0;
      padding: 24px;
      display: flex;
      flex-direction: column;
      align-items: center;
    }
    .no-print-bar {
      width: 100%;
      max-width: 800px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 16px;
      gap: 10px;
    }
    .no-print-btn {
      background: #00f0ff;
      color: #0b0f1a;
      border: none;
      font-weight: 700;
      padding: 8px 16px;
      border-radius: 6px;
      cursor: pointer;
      font-size: 13px;
    }
    .no-print-btn-secondary {
      background: #334155;
      color: #f8fafc;
      border: 1px solid rgba(255,255,255,0.15);
      padding: 8px 14px;
      border-radius: 6px;
      cursor: pointer;
      font-size: 13px;
    }
    .invoice-box {
      background: #ffffff;
      width: 100%;
      max-width: 800px;
      border-radius: 8px;
      box-shadow: 0 10px 30px rgba(0,0,0,0.4);
      padding: 36px 44px;
    }
    .inv-header {
      display: flex;
      justify-content: space-between;
      border-bottom: 2px solid #0284c7;
      padding-bottom: 20px;
      margin-bottom: 24px;
    }
    .inv-logo-title {
      font-size: 24px;
      font-weight: 800;
      color: #0f172a;
      display: flex;
      align-items: center;
      gap: 8px;
    }
    .inv-logo-title span { color: #0284c7; }
    .inv-sub { font-size: 12px; color: #64748b; margin-top: 4px; }
    .inv-meta-right { text-align: right; }
    .inv-number { font-size: 16px; font-weight: 700; color: #0f172a; }
    .inv-date { font-size: 12px; color: #64748b; margin-top: 4px; }
    .inv-parties {
      display: flex;
      justify-content: space-between;
      margin-bottom: 30px;
      gap: 20px;
    }
    .party-col { flex: 1; }
    .party-title { font-size: 11px; font-weight: 700; text-transform: uppercase; color: #64748b; margin-bottom: 6px; }
    .party-name { font-size: 14px; font-weight: 700; color: #0f172a; }
    .party-desc { font-size: 12px; color: #475569; line-height: 1.5; margin-top: 2px; }
    table.inv-table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 24px;
    }
    table.inv-table th {
      background: #f1f5f9;
      color: #334155;
      font-size: 11px;
      text-transform: uppercase;
      font-weight: 700;
      text-align: left;
      padding: 10px 12px;
      border-bottom: 1px solid #cbd5e1;
    }
    table.inv-table td {
      padding: 12px;
      font-size: 13px;
      color: #334155;
      border-bottom: 1px solid #e2e8f0;
    }
    .text-right { text-align: right; }
    .inv-totals {
      display: flex;
      justify-content: flex-end;
      margin-bottom: 30px;
    }
    .totals-box { width: 280px; }
    .totals-row {
      display: flex;
      justify-content: space-between;
      font-size: 13px;
      padding: 6px 0;
      color: #475569;
    }
    .totals-row.grand-total {
      border-top: 2px solid #0f172a;
      font-size: 17px;
      font-weight: 800;
      color: #0f172a;
      padding-top: 10px;
    }
    .totals-row.cop-total {
      font-size: 12px;
      color: #0284c7;
      font-weight: 600;
    }
    .inv-footer {
      border-top: 1px solid #e2e8f0;
      padding-top: 18px;
      font-size: 11px;
      color: #64748b;
      line-height: 1.6;
    }
  </style>
</head>
<body>
  <div class="no-print-bar no-print">
    <button class="no-print-btn" onclick="window.print()">🖨️ Imprimir / Guardar como PDF</button>
    <button class="no-print-btn-secondary" onclick="window.close()">✕ Cerrar Factura</button>
  </div>
  <div class="invoice-box">
    <div class="inv-header">
      <div>
        <div class="inv-logo-title">Jhon Grimm <span>&amp; Akira</span></div>
        <div class="inv-sub">Desarrollo de Software, Inteligencia Artificial &amp; Consultoría</div>
      </div>
      <div class="inv-meta-right">
        <div class="inv-number">${invoiceNo}</div>
        <div class="inv-date">Fecha: ${dateToday}</div>
        <div class="inv-date">Estado: ${deal.stage === 'paid' ? 'PAGADA' : 'PENDIENTE'}</div>
      </div>
    </div>

    <div class="inv-parties">
      <div class="party-col">
        <div class="party-title">Facturado por:</div>
        <div class="party-name">Jhon Grimm (Jhon Bernal)</div>
        <div class="party-desc">
          Arquitecto de Software &amp; Creador de Akira<br>
          Colombia<br>
          bjhon9161@gmail.com
        </div>
      </div>
      <div class="party-col">
        <div class="party-title">Facturado a:</div>
        <div class="party-name">${deal.client}</div>
        <div class="party-desc">
          Proyecto: ${deal.title}<br>
          Canal: Upwork / Contrato Directo<br>
          Comandante Asignado: ${deal.commander}
        </div>
      </div>
    </div>

    <table class="inv-table">
      <thead>
        <tr>
          <th>Descripción del Entregable</th>
          <th class="text-right" style="width:120px;">Importe (USD)</th>
        </tr>
      </thead>
      <tbody>
        ${(deal.items || []).map(it => `
          <tr>
            <td><strong>${it.desc}</strong></td>
            <td class="text-right">$${Number(it.amount).toFixed(2)} USD</td>
          </tr>
        `).join("")}
      </tbody>
    </table>

    <div class="inv-totals">
      <div class="totals-box">
        <div class="totals-row">
          <span>Subtotal:</span>
          <span>$${totalUSD.toFixed(2)} USD</span>
        </div>
        <div class="totals-row">
          <span>Impuestos / Retenciones (0% Exportación):</span>
          <span>$0.00 USD</span>
        </div>
        <div class="totals-row grand-total">
          <span>Total a Pagar:</span>
          <span>$${totalUSD.toFixed(2)} USD</span>
        </div>
        <div class="totals-row cop-total">
          <span>Equivalente Aprox. (COP):</span>
          <span>~$${estCOP.toLocaleString("es-CO")} COP</span>
        </div>
      </div>
    </div>

    <div class="inv-footer">
      <strong>Instrucciones y Términos de Pago:</strong><br>
      • Pago mediante depósito Upwork Escrow, Wise (TransferWise), Transferencia Bancaria o Cripto (USDT/USDC).<br>
      • Servicios prestados en modalidad de exportación de tecnología desde Colombia. Gracias por su confianza.
    </div>
  </div>
</body>
</html>`;

    const blob = new Blob([invoiceHtml], { type: "text/html" });
    const url = URL.createObjectURL(blob);
    window.open(url, "_blank");
  };

  /**
   * CRM Kanban Modal
   */
  function ensureCrmModal(){
    let modal = document.getElementById("akiraCrmModal");
    if(modal) return modal;

    modal = document.createElement("div");
    modal.id = "akiraCrmModal";
    modal.className = "ak-crm-overlay";
    modal.style.display = "none";
    modal.innerHTML = `
      <div class="ak-crm-dialog">
        <button type="button" class="ak-crm-floating-close-btn" onclick="window.akiraCloseCrmModal()" title="Cerrar (Esc)" aria-label="Cerrar modal de CRM">✕</button>
        <div class="ak-crm-header">
          <div class="ak-crm-title-wrap">
            <span class="ak-crm-icon">💼</span>
            <div>
              <strong style="color:#fff;font-size:14px;display:block;">Pipeline CRM Freelance &amp; Facturación Upwork</strong>
              <small style="color:#94a3b8;font-size:11px;">Gestión de prospectos, contratos activos y recibos de cobro ($0.00 COP)</small>
            </div>
          </div>
          <div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap;">
            <button type="button" class="ak-crm-add-btn" onclick="window.akiraLoadDemoCrmDeals()" style="background:#1e293b;border:1px solid #475569;color:#94a3b8;font-size:11px;padding:5px 10px;border-radius:4px;cursor:pointer;">🔄 Ejemplos Demo</button>
            <button type="button" class="ak-crm-add-btn" onclick="window.akiraClearCrmDeals()" style="background:#1e293b;border:1px solid #ef4444;color:#ef4444;font-size:11px;padding:5px 10px;border-radius:4px;cursor:pointer;">🧹 Vaciar a $0</button>
            <button type="button" class="ak-crm-add-btn" onclick="promptNewDeal()">+ Nuevo Trato</button>
            <button type="button" class="ak-crm-close-btn" onclick="window.akiraCloseCrmModal()">✕</button>
          </div>
        </div>
        <div style="background:rgba(56,189,248,0.06);border-bottom:1px solid rgba(56,189,248,0.2);padding:8px 16px;display:flex;align-items:center;gap:10px;font-size:11.5px;color:#94a3b8;">
          <span style="font-size:16px;">🧪</span>
          <span><strong>Modo Pruebas / Sandbox:</strong> Akira opera en fase de desarrollo y verificación técnica. No hay clientes reales ni alquileres en curso. Estado inicial: <strong>$0.00 USD / $0.00 COP</strong>.</span>
        </div>
        <div class="ak-crm-stats-bar" id="akCrmStatsBar"></div>
        <div class="ak-crm-kanban-board" id="akCrmBoard"></div>
      </div>
    `;
    document.body.appendChild(modal);

    modal.addEventListener("click", (e) => {
      if(e.target === modal) window.akiraCloseCrmModal();
    });
    modal.addEventListener("touchstart", (e) => {
      if(e.target === modal) window.akiraCloseCrmModal();
    }, {passive: true});

    document.addEventListener("keydown", (e) => {
      if(e.key === "Escape" || e.key === "Esc"){
        const m = document.getElementById("akiraCrmModal");
        if(m && m.style.display !== "none") window.akiraCloseCrmModal();
      }
    });

    return modal;
  }

  function promptNewDeal(){
    const title = prompt("Título del proyecto:");
    if(!title) return;
    const client = prompt("Nombre o empresa del cliente (ej. TechCo / Upwork):", "Cliente Upwork");
    const amount = prompt("Valor en USD:", "450");
    window.akiraAddCrmDeal({
      title,
      client,
      amountUSD: Number(amount) || 300,
      stage: "proposal"
    });
  }

  window.akiraOpenCrmModal = function(){
    const modal = ensureCrmModal();
    window.akiraRenderCrmModal();
    modal.style.display = "flex";
  };

  window.akiraCloseCrmModal = function(){
    const modal = document.getElementById("akiraCrmModal");
    if(modal) modal.style.display = "none";
  };

  window.akiraRenderCrmModal = function(){
    const statsBar = document.getElementById("akCrmStatsBar");
    const board = document.getElementById("akCrmBoard");
    if(!board) return;

    // Calculate totals
    const totalUSD = currentDeals.reduce((sum, d) => sum + (Number(d.amountUSD) || 0), 0);
    const activeDeals = currentDeals.filter(d => d.stage !== "paid").length;
    const paidUSD = currentDeals.filter(d => d.stage === "paid").reduce((sum, d) => sum + (Number(d.amountUSD) || 0), 0);

    if(statsBar) {
      statsBar.innerHTML = `
        <div class="ak-crm-stat-item">
          <small>Valor Total en Pipeline</small>
          <strong>$${totalUSD.toLocaleString()} USD</strong>
        </div>
        <div class="ak-crm-stat-item">
          <small>Contratos Cobrados</small>
          <strong style="color:#10b981;">$${paidUSD.toLocaleString()} USD</strong>
        </div>
        <div class="ak-crm-stat-item">
          <small>Proyectos Activos</small>
          <strong>${activeDeals} en curso</strong>
        </div>
        <div class="ak-crm-stat-item">
          <small>Moneda Local (COP)</small>
          <strong style="color:#38bdf8;">~$${(totalUSD * 4100).toLocaleString("es-CO")} COP</strong>
        </div>
      `;
    }

    let boardHtml = "";
    STAGES.forEach(st => {
      const stageDeals = currentDeals.filter(d => d.stage === st.id);
      const stageTotal = stageDeals.reduce((sum, d) => sum + (Number(d.amountUSD) || 0), 0);

      boardHtml += `
        <div class="ak-crm-col" data-stage="${st.id}">
          <div class="ak-crm-col-header">
            <div>
              <span class="col-name">${st.name}</span>
              <span class="col-count">${stageDeals.length}</span>
            </div>
            <span class="col-sum">$${stageTotal}</span>
          </div>
          <div class="ak-crm-col-cards">
            ${stageDeals.map(d => `
              <div class="ak-crm-card">
                <div class="deal-title"><strong>${d.title}</strong></div>
                <div class="deal-client">👤 ${d.client}</div>
                <div class="deal-amount">$${d.amountUSD} USD</div>
                <div class="deal-commander">🐝 ${d.commander}</div>
                <div class="deal-actions">
                  <button type="button" class="btn-inv" onclick="window.akiraGenerateInvoice('${d.id}')" title="Generar factura PDF">📄 Factura</button>
                  <select onchange="window.akiraMoveCrmDealStage('${d.id}', this.value)" class="stage-select">
                    ${STAGES.map(s => `<option value="${s.id}" ${s.id === d.stage ? 'selected' : ''}>${s.name}</option>`).join("")}
                  </select>
                  <button type="button" class="btn-del" onclick="window.akiraDeleteCrmDeal('${d.id}')" title="Eliminar">🗑️</button>
                </div>
              </div>
            `).join("")}
            ${stageDeals.length === 0 ? '<div class="empty-col">Sin proyectos</div>' : ''}
          </div>
        </div>
      `;
    });

    board.innerHTML = boardHtml;
  };

  // Inject styles
  (function injectStyles(){
    if(document.getElementById("akira-crm-styles")) return;
    const st = document.createElement("style");
    st.id = "akira-crm-styles";
    st.textContent = `
      .ak-crm-overlay {
        position: fixed; inset: 0; z-index: 99998;
        background: rgba(4, 7, 14, 0.85); backdrop-filter: blur(8px);
        display: flex; align-items: center; justify-content: center; padding: 16px;
      }
      .ak-crm-dialog {
        position: relative;
        background: #0b1120; border: 2px solid #00f0ff; border-radius: 12px;
        box-shadow: 0 0 35px rgba(0, 240, 255, 0.25); width: 95vw; max-width: 1200px;
        height: 90vh; display: flex; flex-direction: column; overflow: hidden;
      }
      .ak-crm-floating-close-btn {
        position: absolute; top: 10px; right: 12px; z-index: 100;
        width: 32px; height: 32px; border-radius: 50%;
        background: #ef4444; color: #ffffff; border: 2px solid #ffffff;
        font-size: 15px; font-weight: 800; cursor: pointer;
        display: flex; align-items: center; justify-content: center;
        box-shadow: 0 2px 10px rgba(0,0,0,0.6);
        transition: transform 0.15s ease, background 0.15s ease;
      }
      .ak-crm-floating-close-btn:hover {
        background: #dc2626; transform: scale(1.1);
      }
      .ak-crm-header {
        display: flex; justify-content: space-between; align-items: center;
        padding: 12px 18px; padding-right: 56px; background: #0e1526;
        border-bottom: 1px solid rgba(0, 240, 255, 0.2);
        flex-wrap: wrap; gap: 8px;
      }
      .ak-crm-title-wrap { display: flex; align-items: center; gap: 10px; }
      .ak-crm-icon { font-size: 22px; }
      .ak-crm-add-btn {
        background: #00f0ff; color: #04070e; font-weight: 700; border: none;
        padding: 6px 14px; border-radius: 6px; cursor: pointer; font-size: 12px;
      }
      .ak-crm-close-btn {
        background: rgba(239,68,68,0.2); border: 1px solid #ef4444; color: #ef4444;
        font-size: 13px; font-weight: 700; padding: 4px 10px; border-radius: 5px; cursor: pointer;
      }
      .ak-crm-stats-bar {
        display: flex; gap: 16px; padding: 10px 18px; background: #070a13;
        border-bottom: 1px solid rgba(255,255,255,0.06); overflow-x: auto;
      }
      .ak-crm-stat-item {
        background: #0e1629; border: 1px solid rgba(255,255,255,0.08); border-radius: 6px;
        padding: 6px 14px; min-width: 140px; display: flex; flex-direction: column;
      }
      .ak-crm-stat-item small { font-size: 10px; color: #94a3b8; }
      .ak-crm-stat-item strong { font-size: 15px; color: #f8fafc; }
      .ak-crm-kanban-board {
        flex: 1; display: flex; gap: 12px; padding: 14px; overflow-x: auto; background: #04070e;
      }
      .ak-crm-col {
        flex: 1; min-width: 210px; max-width: 250px; background: #0b1120;
        border: 1px solid rgba(255,255,255,0.08); border-radius: 8px; display: flex; flex-direction: column; overflow: hidden;
      }
      .ak-crm-col-header {
        padding: 10px 12px; background: #0f182d; border-bottom: 1px solid rgba(255,255,255,0.06);
        display: flex; justify-content: space-between; align-items: center; font-size: 11px; font-weight: 700; color: #e2e8f0;
      }
      .col-count {
        background: rgba(0,240,255,0.15); color: #00f0ff; padding: 1px 6px; border-radius: 10px; margin-left: 4px; font-size: 10px;
      }
      .col-sum { color: #10b981; }
      .ak-crm-col-cards {
        flex: 1; overflow-y: auto; padding: 8px; display: flex; flex-direction: column; gap: 8px;
      }
      .ak-crm-card {
        background: #111a30; border: 1px solid rgba(0,240,255,0.15); border-radius: 6px; padding: 10px;
        display: flex; flex-direction: column; gap: 4px; transition: all 0.15s;
      }
      .ak-crm-card:hover { border-color: #00f0ff; transform: translateY(-1px); }
      .deal-title { font-size: 12px; color: #f8fafc; }
      .deal-client { font-size: 11px; color: #94a3b8; }
      .deal-amount { font-size: 13px; font-weight: 700; color: #10b981; margin-top: 2px; }
      .deal-commander { font-size: 10px; color: #38bdf8; }
      .deal-actions {
        display: flex; gap: 4px; align-items: center; margin-top: 6px; border-top: 1px solid rgba(255,255,255,0.05); padding-top: 6px;
      }
      .btn-inv {
        background: #1e293b; color: #00f0ff; border: 1px solid rgba(0,240,255,0.3); font-size: 10px;
        padding: 2px 6px; border-radius: 4px; cursor: pointer;
      }
      .btn-inv:hover { background: #00f0ff; color: #04070e; font-weight: 700; }
      .stage-select {
        flex: 1; background: #070d1a; color: #94a3b8; border: 1px solid rgba(255,255,255,0.1); font-size: 9px;
        border-radius: 4px; padding: 2px;
      }
      .btn-del {
        background: transparent; border: none; color: #ef4444; font-size: 11px; cursor: pointer; padding: 2px 4px;
      }
      .empty-col {
        text-align: center; color: #475569; font-size: 11px; padding: 20px 0;
      }
    `;
    document.head.appendChild(st);
  })();

})();
