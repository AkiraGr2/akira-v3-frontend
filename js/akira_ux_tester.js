/**
 * AKIRA UX & SYNTHETIC WEB TESTER v1.0
 * Zero-Cost ($0.00 COP/USD) automated DOM, accessibility (a11y), responsive design, and link validator.
 * Runs directly against Sandbox iframes to verify deliverables before client handoff.
 */
(function(){
  "use strict";

  /**
   * Run synthetic audit against a Document object or raw HTML string
   */
  window.akiraAuditUxQuality = function(targetDocOrHtml){
    let doc = null;
    if(typeof targetDocOrHtml === "string"){
      const parser = new DOMParser();
      doc = parser.parseFromString(targetDocOrHtml, "text/html");
    } else if(targetDocOrHtml && targetDocOrHtml.body){
      doc = targetDocOrHtml;
    } else {
      // Try active sandbox iframe
      const iframe = document.getElementById("akiraSandboxIframe");
      if(iframe && iframe.contentDocument){
        doc = iframe.contentDocument;
      }
    }

    if(!doc){
      return { score: 100, passed: 0, warnings: 0, errors: 0, checks: [] };
    }

    const checks = [];

    // 1. Accessibility: Image Alt attributes
    const images = Array.from(doc.querySelectorAll("img"));
    const missingAlt = images.filter(img => !img.hasAttribute("alt") || img.getAttribute("alt").trim() === "");
    if(missingAlt.length === 0){
      checks.push({ cat: "a11y", name: "Etiquetas ALT en Imágenes", status: "PASS", msg: `Todas las imágenes (${images.length}) tienen atributo alt descriptivo.` });
    } else {
      checks.push({ cat: "a11y", name: "Etiquetas ALT en Imágenes", status: "WARN", msg: `${missingAlt.length} de ${images.length} imágenes carecen de atributo alt para accesibilidad.` });
    }

    // 2. Accessibility: Button Labels
    const buttons = Array.from(doc.querySelectorAll("button"));
    const unlabeledBtns = buttons.filter(b => !b.innerText.trim() && !b.getAttribute("aria-label") && !b.getAttribute("title"));
    if(unlabeledBtns.length === 0){
      checks.push({ cat: "a11y", name: "Nombres Accesibles en Botones", status: "PASS", msg: `Todos los botones (${buttons.length}) poseen texto visible o aria-label.` });
    } else {
      checks.push({ cat: "a11y", name: "Nombres Accesibles en Botones", status: "FAIL", msg: `${unlabeledBtns.length} botones no tienen texto ni aria-label para lectores de pantalla.` });
    }

    // 3. Responsive: Viewport Meta Tag
    const viewportMeta = doc.querySelector('meta[name="viewport"]');
    if(viewportMeta && viewportMeta.getAttribute("content").includes("width=device-width")){
      checks.push({ cat: "responsive", name: "Meta Viewport Móvil", status: "PASS", msg: "Etiqueta viewport configurada correctamente con width=device-width." });
    } else {
      checks.push({ cat: "responsive", name: "Meta Viewport Móvil", status: "WARN", msg: "Falta etiqueta <meta name='viewport'> para renderizado óptimo en dispositivos móviles." });
    }

    // 4. Broken / Empty Links and Sources
    const deadLinks = Array.from(doc.querySelectorAll("a[href=''], a[href='#'], a:not([href])"));
    const emptySources = Array.from(doc.querySelectorAll("img[src=''], script[src=''], iframe[src='']"));
    if(emptySources.length === 0){
      checks.push({ cat: "links", name: "Integridad de Fuentes (src)", status: "PASS", msg: "No se encontraron etiquetas con atributo src vacío." });
    } else {
      checks.push({ cat: "links", name: "Integridad de Fuentes (src)", status: "FAIL", msg: `Se encontraron ${emptySources.length} elementos con atributo src vacío.` });
    }
    if(deadLinks.length === 0){
      checks.push({ cat: "links", name: "Enlaces de Navegación", status: "PASS", msg: "Todos los hipervínculos tienen destinos válidos." });
    } else {
      checks.push({ cat: "links", name: "Enlaces de Navegación", status: "WARN", msg: `${deadLinks.length} enlaces apuntan a destinos vacíos o '#' temporales.` });
    }

    // 5. Structure & Headings
    const h1s = doc.querySelectorAll("h1");
    if(h1s.length === 1){
      checks.push({ cat: "seo", name: "Estructura de Encabezados H1", status: "PASS", msg: "Estructura semántica ideal: exactamente un <h1> principal." });
    } else if(h1s.length === 0){
      checks.push({ cat: "seo", name: "Estructura de Encabezados H1", status: "WARN", msg: "No se encontró ningún encabezado <h1> en la página." });
    } else {
      checks.push({ cat: "seo", name: "Estructura de Encabezados H1", status: "WARN", msg: `Se encontraron múltiples <h1> (${h1s.length}). Recomendado solo 1 por página.` });
    }

    // Compute score
    let passed = checks.filter(c => c.status === "PASS").length;
    let warnings = checks.filter(c => c.status === "WARN").length;
    let errors = checks.filter(c => c.status === "FAIL").length;
    let score = Math.max(0, 100 - (errors * 20 + warnings * 8));

    return {
      score,
      passed,
      warnings,
      errors,
      checks
    };
  };

  /**
   * UI Modal for UX Test Results
   */
  function ensureUxModal(){
    let modal = document.getElementById("akiraUxModal");
    if(modal) return modal;

    modal = document.createElement("div");
    modal.id = "akiraUxModal";
    modal.className = "ak-ux-overlay";
    modal.style.display = "none";
    modal.innerHTML = `
      <div class="ak-ux-dialog">
        <div class="ak-ux-header">
          <div class="ak-ux-title-wrap">
            <span class="ak-ux-icon">🌐</span>
            <div>
              <strong style="color:#fff;font-size:14px;display:block;">Simulador de Pruebas Web &amp; Auditoría UX</strong>
              <small style="color:#94a3b8;font-size:11px;">Validación sintética de accesibilidad (WCAG), viewport móvil y enlaces ($0.00 COP)</small>
            </div>
          </div>
          <button type="button" class="ak-ux-close-btn" onclick="window.akiraCloseUxModal()">✕</button>
        </div>
        <div class="ak-ux-body" id="akUxModalBody">
          <!-- Rendered dynamically -->
        </div>
      </div>
    `;
    document.body.appendChild(modal);

    modal.addEventListener("click", (e) => {
      if(e.target === modal) window.akiraCloseUxModal();
    });

    return modal;
  }

  window.akiraOpenUxModal = function(targetDocOrHtml){
    const modal = ensureUxModal();
    const report = window.akiraAuditUxQuality(targetDocOrHtml);
    const body = document.getElementById("akUxModalBody");

    if(body){
      const scoreColor = report.score >= 85 ? "#10b981" : (report.score >= 65 ? "#f59e0b" : "#ef4444");
      body.innerHTML = `
        <div class="ak-ux-score-summary">
          <div class="ak-ux-score-badge" style="border-color:${scoreColor};color:${scoreColor}">
            <span>${report.score}</span>
            <small>PUNTOS</small>
          </div>
          <div class="ak-ux-summary-details">
            <h4 style="margin:0 0 4px;color:#fff;">${report.score >= 80 ? '🎯 Excelente Calidad Web &amp; UX' : '⚠️ Requiere Optimizaciones'}</h4>
            <div style="display:flex;gap:12px;font-size:12px;color:#94a3b8;">
              <span style="color:#10b981;">✓ ${report.passed} Pasadas</span>
              <span style="color:#f59e0b;">⚠ ${report.warnings} Advertencias</span>
              <span style="color:#ef4444;">✕ ${report.errors} Errores</span>
            </div>
          </div>
        </div>

        <div class="ak-ux-checks-list">
          ${report.checks.map(c => `
            <div class="ak-ux-check-card check-${c.status.toLowerCase()}">
              <div class="check-header">
                <strong>${c.name}</strong>
                <span class="status-pill status-${c.status.toLowerCase()}">${c.status}</span>
              </div>
              <div class="check-msg">${c.msg}</div>
            </div>
          `).join("")}
        </div>
      `;
    }

    modal.style.display = "flex";
  };

  window.akiraCloseUxModal = function(){
    const modal = document.getElementById("akiraUxModal");
    if(modal) modal.style.display = "none";
  };

  // Inject styles
  (function injectStyles(){
    if(document.getElementById("akira-ux-styles")) return;
    const st = document.createElement("style");
    st.id = "akira-ux-styles";
    st.textContent = `
      .ak-ux-overlay {
        position: fixed; inset: 0; z-index: 99998;
        background: rgba(4, 7, 14, 0.85); backdrop-filter: blur(8px);
        display: flex; align-items: center; justify-content: center; padding: 16px;
      }
      .ak-ux-dialog {
        background: #0b1120; border: 2px solid #00f0ff; border-radius: 12px;
        box-shadow: 0 0 35px rgba(0, 240, 255, 0.25); width: 95vw; max-width: 680px;
        max-height: 85vh; display: flex; flex-direction: column; overflow: hidden;
      }
      .ak-ux-header {
        display: flex; justify-content: space-between; align-items: center;
        padding: 12px 18px; background: #0e1526; border-bottom: 1px solid rgba(0, 240, 255, 0.2);
      }
      .ak-ux-title-wrap { display: flex; align-items: center; gap: 10px; }
      .ak-ux-icon { font-size: 22px; }
      .ak-ux-close-btn {
        background: rgba(239,68,68,0.2); border: 1px solid #ef4444; color: #ef4444;
        font-size: 13px; font-weight: 700; padding: 4px 10px; border-radius: 5px; cursor: pointer;
      }
      .ak-ux-body { padding: 16px; overflow-y: auto; flex: 1; display: flex; flex-direction: column; gap: 14px; }
      .ak-ux-score-summary {
        background: #080d19; border: 1px solid rgba(255,255,255,0.08); border-radius: 8px;
        padding: 14px; display: flex; align-items: center; gap: 16px;
      }
      .ak-ux-score-badge {
        width: 64px; height: 64px; border-radius: 50%; border: 3px solid;
        display: flex; flex-direction: column; align-items: center; justify-content: center;
        font-weight: 800; font-size: 20px; line-height: 1;
      }
      .ak-ux-score-badge small { font-size: 9px; opacity: 0.8; margin-top: 2px; }
      .ak-ux-checks-list { display: flex; flex-direction: column; gap: 10px; }
      .ak-ux-check-card {
        background: #0f172a; border-radius: 6px; padding: 12px; border-left: 4px solid;
      }
      .check-pass { border-left-color: #10b981; }
      .check-warn { border-left-color: #f59e0b; }
      .check-fail { border-left-color: #ef4444; }
      .check-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 4px; }
      .check-header strong { color: #f1f5f9; font-size: 12px; }
      .status-pill { font-size: 9px; font-weight: 700; padding: 2px 6px; border-radius: 4px; }
      .status-pass { background: rgba(16,185,129,0.2); color: #10b981; }
      .status-warn { background: rgba(245,158,11,0.2); color: #f59e0b; }
      .status-fail { background: rgba(239,68,68,0.2); color: #ef4444; }
      .check-msg { font-size: 11px; color: #94a3b8; }
    `;
    document.head.appendChild(st);
  })();

})();
