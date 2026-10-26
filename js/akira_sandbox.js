/**
 * AKIRA SANDBOX & LIVE ARTIFACTS PREVIEW v1.0
 * Zero-cost interactive web sandbox and code preview engine for Akira.
 * Renders syntax-aware code blocks with 1-click clipboard copy and secure sandboxed live execution.
 */
(function(){
  "use strict";

  window.akiraCodeRegistry = window.akiraCodeRegistry || {};

  // Secure HTML escape helper
  function escapeHtml(str){
    if(!str) return "";
    return String(str)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  // Detect if code block contains previewable web markup
  function isPreviewableWebCode(lang, code){
    const l = (lang || "").toLowerCase().trim();
    if(l === "html" || l === "htm" || l === "svg" || l === "xhtml") return true;
    const trimmed = (code || "").trim();
    if(/^<!doctype\s+html/i.test(trimmed)) return true;
    if(/<html[\s>]/i.test(trimmed) && /<\/html>/i.test(trimmed)) return true;
    if(/<svg[\s>]/i.test(trimmed) && /<\/svg>/i.test(trimmed)) return true;
    if(/<head[\s>]/i.test(trimmed) || /<body[\s>]/i.test(trimmed)) return true;
    // Check if it looks like a component/markup snippet with html tags and styles/scripts
    if((trimmed.includes("<div") || trimmed.includes("<button") || trimmed.includes("<style") || trimmed.includes("<canvas")) &&
       (trimmed.includes("</div>") || trimmed.includes("</button>") || trimmed.includes("</style>") || trimmed.includes("</canvas>"))) {
      return true;
    }
    return false;
  }

  /**
   * Main Markdown & Code formatter for Akira Chat
   */
  window.akiraFormatMarkdown = function(text){
    if(!text) return "";
    let str = String(text);

    // 1. Extract and process fenced code blocks ```lang ... ```
    const codeBlockRegex = /```([a-zA-Z0-9_\-\+\.]*)\r?\n([\s\S]*?)```/g;
    const blocks = [];

    str = str.replace(codeBlockRegex, function(match, lang, codeContent){
      const blockId = "akcode_" + Date.now().toString(36) + "_" + Math.random().toString(36).substr(2, 5);
      const cleanLang = (lang || "code").toLowerCase().trim() || "code";
      const rawCode = codeContent.replace(/\r\n/g, "\n");
      window.akiraCodeRegistry[blockId] = rawCode;

      const canPreview = isPreviewableWebCode(cleanLang, rawCode);

      const previewBtnHtml = canPreview
        ? `<button type="button" class="ak-code-btn ak-code-preview-btn" onclick="window.akiraOpenSandbox && window.akiraOpenSandbox('${blockId}')" title="Ejecutar en Sandbox en vivo">
             <span>🚀 Vista Previa</span>
           </button>`
        : "";

      const copyBtnHtml = `
        <button type="button" class="ak-code-btn ak-code-copy-btn" onclick="window.akiraCopyCodeBlock && window.akiraCopyCodeBlock(this, '${blockId}')" title="Copiar código">
          <span>📋 Copiar</span>
        </button>
      `;

      const escapedContent = escapeHtml(rawCode);

      const blockHtml = `
        <div class="ak-code-card" data-lang="${escapeHtml(cleanLang)}" id="card_${blockId}">
          <div class="ak-code-header">
            <div class="ak-code-meta">
              <span class="ak-code-badge">${escapeHtml(cleanLang.toUpperCase())}</span>
              ${canPreview ? '<span class="ak-code-pill-runnable">INTERACTIVO</span>' : ''}
            </div>
            <div class="ak-code-actions">
              ${previewBtnHtml}
              ${copyBtnHtml}
            </div>
          </div>
          <pre class="ak-code-pre"><code class="language-${escapeHtml(cleanLang)}">${escapedContent}</code></pre>
        </div>
      `;

      blocks.push(blockHtml);
      return `__AKIRA_BLOCK_${blocks.length - 1}__`;
    });

    // 2. Inline code: `code`
    str = str.replace(/`([^`\n]+)`/g, function(match, inlineCode){
      return `<code class="ak-inline-code">${escapeHtml(inlineCode)}</code>`;
    });

    // 3. Bold: **text**
    str = str.replace(/\*\*([^*]+)\*\*/g, '<b>$1</b>');

    // 4. Italic: *text* (excluding bold leftovers)
    str = str.replace(/(^|[^*])\*([^*]+)\*([^*]|$)/g, '$1<i>$2</i>$3');

    // 5. Headings
    str = str.replace(/^### (.*$)/gim, '<h4 class="ak-chat-h4">$1</h4>');
    str = str.replace(/^## (.*$)/gim, '<h3 class="ak-chat-h3">$1</h3>');
    str = str.replace(/^# (.*$)/gim, '<h2 class="ak-chat-h2">$1</h2>');

    // 6. Bullet lists
    str = str.replace(/^\s*[\-\*]\s+(.*)$/gim, '<li class="ak-chat-li">$1</li>');

    // 7. Newlines to <br> (avoiding consecutive breaks inside paragraphs)
    str = str.replace(/\n/g, '<br>');

    // 8. Restore code blocks
    str = str.replace(/__AKIRA_BLOCK_(\d+)__/g, function(match, idx){
      return blocks[Number(idx)] || "";
    });

    return str;
  };

  /**
   * Copy code block helper with tactile visual feedback
   */
  window.akiraCopyCodeBlock = async function(btn, blockId){
    const code = window.akiraCodeRegistry[blockId];
    if(!code) return;
    try {
      await navigator.clipboard.writeText(code);
      const prevText = btn.innerHTML;
      btn.innerHTML = '<span>✅ Copiado</span>';
      btn.classList.add("ak-copied");
      setTimeout(() => {
        btn.innerHTML = prevText;
        btn.classList.remove("ak-copied");
      }, 2000);
    } catch(e) {
      // Fallback for older browsers
      const ta = document.createElement("textarea");
      ta.value = code;
      ta.style.position = "fixed";
      ta.style.opacity = "0";
      document.body.appendChild(ta);
      ta.select();
      try {
        document.execCommand("copy");
        btn.innerHTML = '<span>✅ Copiado</span>';
        setTimeout(() => { btn.innerHTML = '<span>📋 Copiar</span>'; }, 2000);
      } catch(_) {}
      document.body.removeChild(ta);
    }
  };

  /**
   * Sandbox modal manager
   */
  let currentSandboxCode = "";
  let currentSandboxMode = "desktop"; // "desktop" | "mobile"

  function ensureSandboxModal(){
    let modal = document.getElementById("akiraSandboxModal");
    if(modal) return modal;

    modal = document.createElement("div");
    modal.id = "akiraSandboxModal";
    modal.className = "ak-sandbox-overlay";
    modal.style.display = "none";
    modal.innerHTML = `
      <div class="ak-sandbox-dialog">
        <div class="ak-sandbox-topbar">
          <div class="ak-sandbox-title-wrap">
            <span class="ak-sandbox-icon">🚀</span>
            <div class="ak-sandbox-titles">
              <strong class="ak-sandbox-headline">Akira Live Artifact Sandbox</strong>
              <small class="ak-sandbox-subline">Ejecución aislada y segura en tiempo real</small>
            </div>
          </div>
          <div class="ak-sandbox-device-switch">
            <button type="button" class="ak-sandbox-mode-btn active" id="akSbBtnDesktop" onclick="window.akiraSetSandboxMode('desktop')">
              💻 Escritorio
            </button>
            <button type="button" class="ak-sandbox-mode-btn" id="akSbBtnMobile" onclick="window.akiraSetSandboxMode('mobile')">
              📱 Móvil (375px)
            </button>
          </div>
          <div class="ak-sandbox-actions">
            <button type="button" class="ak-sandbox-btn" onclick="window.akiraReloadSandbox()" title="Recargar vista previa">
              🔄 Recargar
            </button>
            <button type="button" class="ak-sandbox-btn" onclick="window.akiraOpenSandboxNewTab()" title="Abrir en pestaña nueva">
              ↗ Pestaña
            </button>
            <button type="button" class="ak-sandbox-btn" onclick="window.akiraCopySandboxCode()" title="Copiar código fuente">
              📋 Copiar
            </button>
            <button type="button" class="ak-sandbox-close-btn" onclick="window.akiraCloseSandbox()" aria-label="Cerrar sandbox">
              ✕
            </button>
          </div>
        </div>
        <div class="ak-sandbox-viewport-container" id="akSbViewportWrap">
          <div class="ak-sandbox-frame-box desktop-mode" id="akSbFrameBox">
            <iframe id="akiraSandboxIframe" sandbox="allow-scripts allow-modals allow-forms" title="Akira Live Sandbox"></iframe>
          </div>
        </div>
      </div>
    `;
    document.body.appendChild(modal);

    // Close on overlay backdrop click
    modal.addEventListener("click", function(e){
      if(e.target === modal) window.akiraCloseSandbox();
    });

    // Close on Escape
    document.addEventListener("keydown", function(e){
      if(e.key === "Escape" && modal.style.display === "flex") {
        window.akiraCloseSandbox();
      }
    });

    return modal;
  }

  function formatExecutableHtml(rawCode){
    const trimmed = (rawCode || "").trim();
    if(/^<!doctype\s+html/i.test(trimmed) || /<html[\s>]/i.test(trimmed)) {
      return trimmed;
    }
    if(/^<svg[\s>]/i.test(trimmed)) {
      return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    body { margin:0; min-height:100vh; display:flex; align-items:center; justify-content:center; background:#0c0f17; }
    svg { max-width:90vw; max-height:90vh; }
  </style>
</head>
<body>
  ${trimmed}
</body>
</html>`;
    }
    // Partial HTML / interactive component
    return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Akira Sandbox Component</title>
  <style>
    *, *::before, *::after { box-sizing: border-box; }
    body {
      margin: 0;
      padding: 16px;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", sans-serif;
      color: #1a202c;
      background: #f7fafc;
      line-height: 1.5;
    }
    @media (prefers-color-scheme: dark) {
      body {
        background: #0d1117;
        color: #c9d1d9;
      }
    }
  </style>
</head>
<body>
  ${trimmed}
</body>
</html>`;
  }

  window.akiraOpenSandbox = function(codeOrBlockId){
    const modal = ensureSandboxModal();
    let code = window.akiraCodeRegistry[codeOrBlockId] || codeOrBlockId;
    if(!code) return;

    currentSandboxCode = formatExecutableHtml(code);
    modal.style.display = "flex";

    const iframe = document.getElementById("akiraSandboxIframe");
    if(iframe) {
      iframe.srcdoc = currentSandboxCode;
    }
    window.akiraSetSandboxMode(currentSandboxMode || "desktop");
  };

  window.akiraCloseSandbox = function(){
    const modal = document.getElementById("akiraSandboxModal");
    if(modal) {
      modal.style.display = "none";
      const iframe = document.getElementById("akiraSandboxIframe");
      if(iframe) iframe.srcdoc = "about:blank"; // Stop any running scripts
    }
  };

  window.akiraReloadSandbox = function(){
    const iframe = document.getElementById("akiraSandboxIframe");
    if(iframe && currentSandboxCode) {
      iframe.srcdoc = currentSandboxCode;
    }
  };

  window.akiraSetSandboxMode = function(mode){
    currentSandboxMode = mode;
    const box = document.getElementById("akSbFrameBox");
    const btnD = document.getElementById("akSbBtnDesktop");
    const btnM = document.getElementById("akSbBtnMobile");
    if(!box) return;

    if(mode === "mobile") {
      box.classList.remove("desktop-mode");
      box.classList.add("mobile-mode");
      if(btnM) btnM.classList.add("active");
      if(btnD) btnD.classList.remove("active");
    } else {
      box.classList.remove("mobile-mode");
      box.classList.add("desktop-mode");
      if(btnD) btnD.classList.add("active");
      if(btnM) btnM.classList.remove("active");
    }
  };

  window.akiraOpenSandboxNewTab = function(){
    if(!currentSandboxCode) return;
    const blob = new Blob([currentSandboxCode], { type: "text/html;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    window.open(url, "_blank");
    setTimeout(() => URL.revokeObjectURL(url), 60000);
  };

  window.akiraCopySandboxCode = async function(){
    if(!currentSandboxCode) return;
    try {
      await navigator.clipboard.writeText(currentSandboxCode);
      alert("✅ Código fuente copiado al portapapeles.");
    } catch(e) {
      alert("No se pudo copiar automáticamente.");
    }
  };

  // Inject styles for code cards and modal
  (function injectSandboxStyles(){
    if(document.getElementById("akira-sandbox-styles")) return;
    const st = document.createElement("style");
    st.id = "akira-sandbox-styles";
    st.textContent = `
      /* AKIRA CODE CARD STYLING */
      .ak-code-card {
        margin: 10px 0;
        background: #0a0d14;
        border: 1px solid rgba(0, 240, 255, 0.25);
        border-radius: 8px;
        overflow: hidden;
        box-shadow: 0 4px 16px rgba(0,0,0,0.4);
      }
      .ak-code-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 6px 10px;
        background: rgba(14, 20, 32, 0.95);
        border-bottom: 1px solid rgba(0, 240, 255, 0.15);
        gap: 8px;
        flex-wrap: wrap;
      }
      .ak-code-meta {
        display: flex;
        align-items: center;
        gap: 6px;
      }
      .ak-code-badge {
        font-family: 'Press Start 2P', monospace;
        font-size: 8px;
        color: #00f0ff;
        background: rgba(0, 240, 255, 0.1);
        padding: 3px 6px;
        border-radius: 4px;
        letter-spacing: 0.5px;
      }
      .ak-code-pill-runnable {
        font-family: 'Press Start 2P', monospace;
        font-size: 7px;
        color: #39ff14;
        background: rgba(57, 255, 20, 0.12);
        border: 1px solid rgba(57, 255, 20, 0.3);
        padding: 2px 6px;
        border-radius: 4px;
      }
      .ak-code-actions {
        display: flex;
        align-items: center;
        gap: 6px;
      }
      .ak-code-btn {
        display: inline-flex;
        align-items: center;
        gap: 4px;
        background: #141b29;
        border: 1px solid rgba(255, 255, 255, 0.15);
        color: #e2e8f0;
        font-size: 11px;
        font-weight: 500;
        padding: 4px 8px;
        border-radius: 4px;
        cursor: pointer;
        transition: all 0.15s ease;
      }
      .ak-code-btn:hover {
        background: #1e293b;
        border-color: #00f0ff;
        color: #fff;
      }
      .ak-code-preview-btn {
        background: rgba(0, 240, 255, 0.15);
        border-color: rgba(0, 240, 255, 0.4);
        color: #00f0ff;
        font-weight: 600;
      }
      .ak-code-preview-btn:hover {
        background: rgba(0, 240, 255, 0.3);
        box-shadow: 0 0 10px rgba(0, 240, 255, 0.3);
      }
      .ak-code-pre {
        margin: 0;
        padding: 12px;
        background: #080b12;
        overflow-x: auto;
        font-family: 'Consolas', 'Monaco', 'Courier New', monospace;
        font-size: 12px;
        line-height: 1.5;
        color: #e0e6ed;
      }
      .ak-inline-code {
        font-family: 'Consolas', 'Monaco', monospace;
        font-size: 0.9em;
        background: rgba(0, 240, 255, 0.1);
        color: #00f0ff;
        padding: 1px 4px;
        border-radius: 3px;
        border: 1px solid rgba(0, 240, 255, 0.2);
      }
      .ak-chat-h2 { font-size: 1.25em; margin: 8px 0 4px; color: #fff; border-bottom: 1px solid rgba(255,255,255,0.1); padding-bottom: 4px; }
      .ak-chat-h3 { font-size: 1.1em; margin: 6px 0 3px; color: #00f0ff; }
      .ak-chat-h4 { font-size: 1.0em; margin: 4px 0 2px; color: #a5b4fc; }
      .ak-chat-li { margin-left: 18px; margin-bottom: 2px; }

      /* SANDBOX MODAL OVERLAY */
      .ak-sandbox-overlay {
        position: fixed;
        inset: 0;
        z-index: 99999;
        background: rgba(4, 7, 14, 0.85);
        backdrop-filter: blur(8px);
        display: flex;
        align-items: center;
        justify-content: center;
        padding: 16px;
      }
      .ak-sandbox-dialog {
        background: #0b0f1a;
        border: 2px solid #00f0ff;
        border-radius: 12px;
        box-shadow: 0 0 32px rgba(0, 240, 255, 0.25);
        display: flex;
        flex-direction: column;
        width: 95vw;
        max-width: 1200px;
        height: 90vh;
        overflow: hidden;
      }
      .ak-sandbox-topbar {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 10px 14px;
        background: #111827;
        border-bottom: 1px solid rgba(0, 240, 255, 0.3);
        gap: 12px;
        flex-wrap: wrap;
      }
      .ak-sandbox-title-wrap {
        display: flex;
        align-items: center;
        gap: 8px;
      }
      .ak-sandbox-icon { font-size: 18px; }
      .ak-sandbox-headline { color: #fff; font-size: 13px; font-weight: 700; display: block; }
      .ak-sandbox-subline { color: #94a3b8; font-size: 10px; display: block; }
      .ak-sandbox-device-switch {
        display: flex;
        background: #090d16;
        border: 1px solid rgba(255, 255, 255, 0.15);
        border-radius: 6px;
        padding: 2px;
        gap: 2px;
      }
      .ak-sandbox-mode-btn {
        background: transparent;
        border: none;
        color: #94a3b8;
        font-size: 11px;
        padding: 4px 10px;
        border-radius: 4px;
        cursor: pointer;
        transition: all 0.15s ease;
      }
      .ak-sandbox-mode-btn.active {
        background: #00f0ff;
        color: #0b0f1a;
        font-weight: 700;
      }
      .ak-sandbox-actions {
        display: flex;
        align-items: center;
        gap: 6px;
      }
      .ak-sandbox-btn {
        background: #1f2937;
        border: 1px solid rgba(255, 255, 255, 0.15);
        color: #e5e7eb;
        font-size: 11px;
        padding: 5px 9px;
        border-radius: 5px;
        cursor: pointer;
        transition: background 0.15s;
      }
      .ak-sandbox-btn:hover { background: #374151; color: #fff; }
      .ak-sandbox-close-btn {
        background: rgba(239, 68, 68, 0.2);
        border: 1px solid #ef4444;
        color: #ef4444;
        font-size: 13px;
        font-weight: 700;
        padding: 5px 10px;
        border-radius: 5px;
        cursor: pointer;
      }
      .ak-sandbox-close-btn:hover {
        background: #ef4444;
        color: #fff;
      }
      .ak-sandbox-viewport-container {
        flex: 1;
        display: flex;
        align-items: center;
        justify-content: center;
        background: #080b12;
        overflow: auto;
        padding: 12px;
      }
      .ak-sandbox-frame-box {
        background: #fff;
        border-radius: 8px;
        overflow: hidden;
        box-shadow: 0 8px 30px rgba(0,0,0,0.5);
        transition: width 0.25s ease, height 0.25s ease;
      }
      .ak-sandbox-frame-box.desktop-mode {
        width: 100%;
        height: 100%;
        border: 1px solid rgba(255, 255, 255, 0.1);
      }
      .ak-sandbox-frame-box.mobile-mode {
        width: 375px;
        height: 667px;
        max-height: 100%;
        border: 4px solid #1f2937;
        border-radius: 20px;
      }
      .ak-sandbox-frame-box iframe {
        width: 100%;
        height: 100%;
        border: none;
        display: block;
      }
      @media(max-width: 768px) {
        .ak-sandbox-dialog { width: 100vw; height: 100vh; border-radius: 0; border: none; }
        .ak-sandbox-topbar { padding: 6px 10px; }
        .ak-sandbox-headline { font-size: 11px; }
        .ak-sandbox-subline { display: none; }
        .ak-sandbox-device-switch { display: none; }
      }
    `;
    document.head.appendChild(st);
  })();

})();
