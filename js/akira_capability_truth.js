(function () {
  "use strict";
  let summary = "Capacidades: sin verificar";
  window.akiraCapabilitySummary = () => summary;
  function paint() {
    document.querySelectorAll("[data-akira-capability-summary]").forEach(el => { if (el.textContent !== summary) el.textContent = summary; });
    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
    const pending = [];
    let node;
    while ((node = walker.nextNode())) {
      if (node.parentElement && !node.parentElement.closest("[data-akira-capability-summary]") && !/SCRIPT|STYLE/.test(node.parentElement.tagName) && node.textContent.includes("Capacidades: sin verificar")) pending.push(node);
    }
    pending.forEach(node => {
        const span = document.createElement("span");
        span.dataset.akiraCapabilitySummary = "";
        span.textContent = summary;
        const parts = node.textContent.split("Capacidades: sin verificar");
        node.replaceWith(document.createTextNode(parts[0]), span, document.createTextNode(parts.slice(1).join("")));
    });
  }
  window.akiraPublishCapabilityRegistry = function (registry) {
    if (!Array.isArray(registry)) return;
    summary = `${registry.filter(c => (c.effective_state || c.status) === "verified").length} de ${registry.length} capacidades verificadas`;
    paint();
  };
  async function refresh() {
    const session = window.akiraSessionState;
    if (!session || !session.authenticated) return;
    try {
      const base = localStorage.getItem("akira_backend_url") || "https://akira-empresa.onrender.com";
      const response = await fetch(base + "/api/v8/self", {headers: window.akiraAuthHeaders(), cache: "no-store"});
      if (!response.ok) return;
      const data = await response.json();
      if (data.ok && Array.isArray(data.capabilities_registry)) window.akiraPublishCapabilityRegistry(data.capabilities_registry);
    } catch (_) {}
  }
  window.addEventListener("akira:session-valid", refresh);
  window.addEventListener("akira:session-invalid", function () { summary = "Capacidades: sin verificar"; paint(); });
  window.addEventListener("akira:section-shown", paint);
  document.addEventListener("DOMContentLoaded", function () {
    paint(); refresh();
    let scheduled = false;
    new MutationObserver(function () {
      if (scheduled) return;
      scheduled = true;
      setTimeout(function () { scheduled = false; paint(); }, 50);
    }).observe(document.body, {childList:true,subtree:true});
  });
})();
