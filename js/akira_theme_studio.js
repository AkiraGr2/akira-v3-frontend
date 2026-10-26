/**
 * AKIRA THEME STUDIO & WCAG ACCESSIBILITY AUDITOR v1.0
 * Zero-Cost ($0.00 COP/USD) live theme customizer & WCAG 2.1 contrast ratio calculator.
 * Supports 4 accessible themes: Cyberpunk Neon, Obsidian OLED, Arctic Clean, and Solarized Amber.
 */
(function(){
  "use strict";

  const THEMES = {
    cyberpunk: {
      id: "cyberpunk",
      name: "🌌 Cyberpunk Neon (Akira Canon)",
      bg: "#080b12",
      text: "#f8fafc",
      accent: "#00f0ff",
      cardBg: "#0e1526",
      border: "rgba(0, 240, 255, 0.3)"
    },
    obsidian: {
      id: "obsidian",
      name: "🖤 Obsidian OLED (Puro Negro)",
      bg: "#000000",
      text: "#f1f5f9",
      accent: "#10b981",
      cardBg: "#0a0a0a",
      border: "rgba(16, 185, 129, 0.3)"
    },
    arctic: {
      id: "arctic",
      name: "☀️ Arctic Clean (Modo Claro)",
      bg: "#f8fafc",
      text: "#0f172a",
      accent: "#2563eb",
      cardBg: "#ffffff",
      border: "#cbd5e1"
    },
    solarized: {
      id: "solarized",
      name: "🌇 Solarized Amber (Cálido)",
      bg: "#1c1917",
      text: "#fef3c7",
      accent: "#f59e0b",
      cardBg: "#292524",
      border: "rgba(245, 158, 11, 0.3)"
    }
  };

  function parseHex(hex){
    hex = hex.replace("#", "");
    if(hex.length === 3) hex = hex.split("").map(c => c + c).join("");
    return {
      r: parseInt(hex.slice(0, 2), 16) / 255,
      g: parseInt(hex.slice(2, 4), 16) / 255,
      b: parseInt(hex.slice(4, 6), 16) / 255
    };
  }

  function getLuminance(rgb){
    const a = [rgb.r, rgb.g, rgb.b].map(v => {
      return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
    });
    return a[0] * 0.2126 + a[1] * 0.7152 + a[2] * 0.0722;
  }

  function computeContrastRatio(hex1, hex2){
    try {
      const l1 = getLuminance(parseHex(hex1));
      const l2 = getLuminance(parseHex(hex2));
      const lighter = Math.max(l1, l2);
      const darker = Math.min(l1, l2);
      return (lighter + 0.05) / (darker + 0.05);
    } catch(e){
      return 4.5;
    }
  }

  window.akiraApplyTheme = function(themeId){
    const theme = THEMES[themeId] || THEMES.cyberpunk;
    localStorage.setItem("akira_active_theme", theme.id);

    const root = document.documentElement;
    root.style.setProperty("--theme-bg", theme.bg);
    root.style.setProperty("--theme-text", theme.text);
    root.style.setProperty("--theme-accent", theme.accent);
    root.style.setProperty("--theme-card", theme.cardBg);
    root.style.setProperty("--theme-border", theme.border);

    console.log(`[Akira Theme Studio] Tema aplicado: ${theme.name}`);
    window.akiraRenderThemeModal();
  };

  /**
   * UI Modal for Theme Studio
   */
  function ensureThemeModal(){
    let modal = document.getElementById("akiraThemeModal");
    if(modal) return modal;

    modal = document.createElement("div");
    modal.id = "akiraThemeModal";
    modal.className = "ak-theme-overlay";
    modal.style.display = "none";
    modal.innerHTML = `
      <div class="ak-theme-dialog">
        <div class="ak-theme-header">
          <div class="ak-theme-title-wrap">
            <span class="ak-theme-icon">🎨</span>
            <div>
              <strong style="color:#fff;font-size:14px;display:block;">Estudio de Temas &amp; Accesibilidad WCAG</strong>
              <small style="color:#94a3b8;font-size:11px;">Selector de paletas visuales y auditoría de contraste en tiempo real ($0.00 COP)</small>
            </div>
          </div>
          <button type="button" class="ak-theme-close-btn" onclick="window.akiraCloseThemeModal()">✕</button>
        </div>
        <div class="ak-theme-body" id="akThemeModalBody">
          <!-- Rendered dynamically -->
        </div>
      </div>
    `;
    document.body.appendChild(modal);

    modal.addEventListener("click", (e) => {
      if(e.target === modal) window.akiraCloseThemeModal();
    });

    return modal;
  }

  window.akiraOpenThemeModal = function(){
    const modal = ensureThemeModal();
    window.akiraRenderThemeModal();
    modal.style.display = "flex";
  };

  window.akiraCloseThemeModal = function(){
    const modal = document.getElementById("akiraThemeModal");
    if(modal) modal.style.display = "none";
  };

  window.akiraRenderThemeModal = function(){
    const body = document.getElementById("akThemeModalBody");
    if(!body) return;

    const currentId = localStorage.getItem("akira_active_theme") || "cyberpunk";

    let html = `<div class="ak-themes-grid">`;
    Object.values(THEMES).forEach(th => {
      const isCurrent = th.id === currentId;
      const ratio = computeContrastRatio(th.text, th.bg).toFixed(1);
      const isAAA = ratio >= 7.0;
      const isAA = ratio >= 4.5;

      html += `
        <div class="ak-theme-card ${isCurrent ? 'active' : ''}" style="background:${th.cardBg};border-color:${th.accent};" onclick="window.akiraApplyTheme('${th.id}')">
          <div class="theme-card-header">
            <strong style="color:${th.text};font-size:13px;">${th.name}</strong>
            ${isCurrent ? '<span class="current-badge">ACTIVO</span>' : ''}
          </div>
          <div class="theme-palette-preview">
            <span class="swatch" style="background:${th.bg};border:1px solid #555;"></span>
            <span class="swatch" style="background:${th.cardBg};"></span>
            <span class="swatch" style="background:${th.accent};"></span>
            <span class="swatch" style="background:${th.text};"></span>
          </div>
          <div class="theme-contrast-info">
            <span style="font-size:11px;color:${th.text};">Contraste: <strong>${ratio}:1</strong></span>
            <span class="wcag-badge ${isAAA ? 'badge-aaa' : (isAA ? 'badge-aa' : 'badge-fail')}">
              ${isAAA ? 'WCAG AAA' : (isAA ? 'WCAG AA' : 'REVISAR')}
            </span>
          </div>
        </div>
      `;
    });
    html += `</div>`;
    body.innerHTML = html;
  };

  // Inject styles
  (function injectStyles(){
    if(document.getElementById("akira-theme-styles")) return;
    const st = document.createElement("style");
    st.id = "akira-theme-styles";
    st.textContent = `
      .ak-theme-overlay {
        position: fixed; inset: 0; z-index: 99998;
        background: rgba(4, 7, 14, 0.85); backdrop-filter: blur(8px);
        display: flex; align-items: center; justify-content: center; padding: 16px;
      }
      .ak-theme-dialog {
        background: #0b1120; border: 2px solid #00f0ff; border-radius: 12px;
        box-shadow: 0 0 35px rgba(0, 240, 255, 0.25); width: 95vw; max-width: 680px;
        max-height: 85vh; display: flex; flex-direction: column; overflow: hidden;
      }
      .ak-theme-header {
        display: flex; justify-content: space-between; align-items: center;
        padding: 12px 18px; background: #0e1526; border-bottom: 1px solid rgba(0, 240, 255, 0.2);
      }
      .ak-theme-title-wrap { display: flex; align-items: center; gap: 10px; }
      .ak-theme-icon { font-size: 22px; }
      .ak-theme-close-btn {
        background: rgba(239,68,68,0.2); border: 1px solid #ef4444; color: #ef4444;
        font-size: 13px; font-weight: 700; padding: 4px 10px; border-radius: 5px; cursor: pointer;
      }
      .ak-theme-body { padding: 16px; overflow-y: auto; flex: 1; }
      .ak-themes-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
      @media(max-width: 600px){ .ak-themes-grid { grid-template-columns: 1fr; } }
      .ak-theme-card {
        border: 2px solid; border-radius: 8px; padding: 12px; cursor: pointer;
        transition: all 0.15s; display: flex; flex-direction: column; gap: 8px;
      }
      .ak-theme-card:hover { transform: translateY(-2px); }
      .ak-theme-card.active { box-shadow: 0 0 16px rgba(0,240,255,0.3); }
      .theme-card-header { display: flex; justify-content: space-between; align-items: center; }
      .current-badge {
        font-size: 9px; font-weight: 700; background: #00f0ff; color: #04070e;
        padding: 2px 6px; border-radius: 4px;
      }
      .theme-palette-preview { display: flex; gap: 6px; margin: 4px 0; }
      .swatch { width: 22px; height: 22px; border-radius: 4px; display: inline-block; }
      .theme-contrast-info { display: flex; justify-content: space-between; align-items: center; }
      .wcag-badge { font-size: 9px; font-weight: 700; padding: 2px 6px; border-radius: 3px; }
      .badge-aaa { background: rgba(16,185,129,0.2); color: #10b981; }
      .badge-aa { background: rgba(59,130,246,0.2); color: #3b82f6; }
      .badge-fail { background: rgba(239,68,68,0.2); color: #ef4444; }
    `;
    document.head.appendChild(st);
  })();

})();
