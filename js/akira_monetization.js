/**
 * AKIRA MONETIZATION ENGINE (Upwork & Freelance Autopilot)
 * Turns client requirements into immediate money:
 *  1. Viability Scanner (Automation Score %, Bidding Strategy, Suggested Price)
 *  2. High-Conversion Proposal Generator (Custom Hook, Proof-of-Work, 1-Click Copy)
 *  3. Final Deliverable Builder (Generates the code, cleaned data, SOP, or document to collect payment)
 */
(function() {
  "use strict";

  const NICHES = [
    {
      id: "scraping",
      title: "🕷️ Web Scraping & Data Extraction",
      priceRange: "$50 - $180 USD",
      sampleJob: "Need a Python script to scrape 500 product names, prices, and image URLs from an e-commerce website and export to a clean Excel file."
    },
    {
      id: "excel",
      title: "📊 Excel & Spreadsheet Automation",
      priceRange: "$40 - $120 USD",
      sampleJob: "I have 3 CSV files with 10,000 customer rows with duplicate entries and messy phone numbers. Need a Python script or Excel formula to clean and merge them."
    },
    {
      id: "tech_doc",
      title: "📝 Technical Writing & SOP Manuals",
      priceRange: "$80 - $250 USD",
      sampleJob: "Write a comprehensive Standard Operating Procedure (SOP) manual for onboarding new remote customer support agents with step-by-step instructions."
    },
    {
      id: "prompts",
      title: "🤖 AI Prompts & Workflow Automation",
      priceRange: "$100 - $300 USD",
      sampleJob: "Design a system prompt and Zapier/Make automation flow that reads inbound support tickets, categorizes urgency, and drafts automated customer replies."
    },
    {
      id: "translation",
      title: "🌐 Technical Translation & Localization",
      priceRange: "$40 - $150 USD",
      sampleJob: "Translate a 1,500-word software setup guide from English to Spanish with natural native technical terminology."
    }
  ];

  class AkiraMonetizationEngine {
    constructor() {
      this.currentJobText = "";
      this.currentProposal = "";
      this.currentDeliverable = "";
    }

    init() {
      const container = document.getElementById("upworkSection");
      if (!container) return;

      container.innerHTML = `
        <div class="ak-monetize-wrap">
          <!-- Header Hero -->
          <div class="ak-monetize-hero">
            <div class="ak-monetize-badge">MOTOR DE MONETIZACIÓN AUTÓNOMO</div>
            <h2>Gana Dinero en Upwork con Akira</h2>
            <p>Pega cualquier oferta de trabajo. Akira evalúa la viabilidad, redacta la propuesta ganadora de alto cierre y construye el entregable final para que tú cobres.</p>
          </div>

          <!-- Niche Pills -->
          <div class="ak-niche-row">
            <span class="ak-niche-label">Nichos 100% Automatizables:</span>
            ${NICHES.map(n => `
              <button class="ak-niche-chip" data-niche="${n.id}">
                ${n.title}
              </button>
            `).join("")}
          </div>

          <!-- Tab Navigation -->
          <div class="ak-monetize-tabs">
            <button class="ak-tab-btn active" data-tab="tabAnalyze">1. Analizar Oferta & Viabilidad</button>
            <button class="ak-tab-btn" data-tab="tabProposal">2. Propuesta Ganadora</button>
            <button class="ak-tab-btn" data-tab="tabDeliver">3. Generar Entregable Final</button>
          </div>

          <!-- Tab 1: Analysis -->
          <div class="ak-tab-pane active" id="tabAnalyze">
            <div class="ak-card">
              <label class="ak-label">Pega la descripción completa del trabajo en Upwork:</label>
              <textarea id="akJobDesc" class="ak-textarea" placeholder="Pega aquí el texto completo del trabajo de Upwork... (requisitos, presupuesto del cliente, etc.)"></textarea>
              <div class="ak-card-actions">
                <button class="ak-btn primary" id="akBtnAnalyze">🔍 Evaluar Viabilidad y Estrategia</button>
                <button class="ak-btn secondary" id="akBtnClear">Limpiar</button>
              </div>
              <div id="akAnalysisResult" class="ak-result-box" style="display:none;"></div>
            </div>
          </div>

          <!-- Tab 2: Proposal Generator -->
          <div class="ak-tab-pane" id="tabProposal">
            <div class="ak-card">
              <div class="ak-tone-selector">
                <label class="ak-label">Tono de la propuesta:</label>
                <div class="ak-tone-chips">
                  <button class="ak-tone-chip active" data-tone="persuasive">Persuasivo de Alto Cierre (Recomendado)</button>
                  <button class="ak-tone-chip" data-tone="expert">Técnico & Directo al Grano</button>
                  <button class="ak-tone-chip" data-tone="english">English (US/UK High-Rate)</button>
                  <button class="ak-tone-chip" data-tone="short">Ultra Corto & Directo</button>
                </div>
              </div>
              <div class="ak-card-actions" style="margin-top:14px;">
                <button class="ak-btn primary" id="akBtnGenerateProposal">⚡ Redactar Propuesta Ganadora</button>
                <button class="ak-btn success" id="akBtnCopyProposal" style="display:none;">📋 Copiar al Portapapeles</button>
              </div>
              <div id="akProposalOutput" class="ak-result-box ak-output-card" style="display:none;"></div>
            </div>
          </div>

          <!-- Tab 3: Deliverable Generator -->
          <div class="ak-tab-pane" id="tabDeliver">
            <div class="ak-card">
              <label class="ak-label">¿El cliente ya te contrató? Pega las instrucciones o datos exactos para construir el entregable:</label>
              <textarea id="akDeliverSpec" class="ak-textarea" placeholder="Pega aquí el enlace de la web a scrapear, las instrucciones específicas, o el texto/archivo que el cliente te envió para que Akira construya el trabajo listo para entregar..."></textarea>
              <div class="ak-card-actions">
                <button class="ak-btn primary" id="akBtnBuildDeliverable">🚀 Construir Entregable Listo para Cobrar</button>
                <button class="ak-btn success" id="akBtnCopyDeliverable" style="display:none;">📋 Copiar Trabajo Completo</button>
                <button class="ak-btn secondary" id="akBtnZipDeliverable" style="display:none;">📦 Descargar Entregable (.ZIP)</button>
              </div>
              <div id="akDeliverableOutput" class="ak-result-box ak-output-card" style="display:none;"></div>
            </div>
          </div>
        </div>
      `;

      this.bindEvents(container);
    }

    bindEvents(container) {
      // Tab switching
      container.querySelectorAll(".ak-tab-btn").forEach(btn => {
        btn.addEventListener("click", () => {
          container.querySelectorAll(".ak-tab-btn").forEach(b => b.classList.remove("active"));
          container.querySelectorAll(".ak-tab-pane").forEach(p => p.classList.remove("active"));
          btn.classList.add("active");
          const target = document.getElementById(btn.dataset.tab);
          if (target) target.classList.add("active");
        });
      });

      // Niche pre-fill
      container.querySelectorAll(".ak-niche-chip").forEach(chip => {
        chip.addEventListener("click", () => {
          const niche = NICHES.find(n => n.id === chip.dataset.niche);
          if (niche) {
            const txt = document.getElementById("akJobDesc");
            txt.value = niche.sampleJob;
            this.switchTab("tabAnalyze");
            this.analyzeJob(niche.sampleJob);
          }
        });
      });

      // Actions
      container.querySelector("#akBtnAnalyze").addEventListener("click", () => {
        const val = document.getElementById("akJobDesc").value.trim();
        if (!val) { alert("Por favor pega la descripción del trabajo."); return; }
        this.analyzeJob(val);
      });

      container.querySelector("#akBtnClear").addEventListener("click", () => {
        document.getElementById("akJobDesc").value = "";
        document.getElementById("akAnalysisResult").style.display = "none";
      });

      // Tone selection
      container.querySelectorAll(".ak-tone-chip").forEach(chip => {
        chip.addEventListener("click", () => {
          container.querySelectorAll(".ak-tone-chip").forEach(c => c.classList.remove("active"));
          chip.classList.add("active");
        });
      });

      container.querySelector("#akBtnGenerateProposal").addEventListener("click", () => {
        const desc = document.getElementById("akJobDesc").value.trim();
        if (!desc) {
          alert("Primero pega la descripción del trabajo en el Paso 1.");
          this.switchTab("tabAnalyze");
          return;
        }
        const activeTone = container.querySelector(".ak-tone-chip.active").dataset.tone;
        this.generateProposal(desc, activeTone);
      });

      container.querySelector("#akBtnCopyProposal").addEventListener("click", () => {
        if (!this.currentProposal) return;
        navigator.clipboard.writeText(this.currentProposal).then(() => {
          alert("¡Propuesta copiada al portapapeles! Lista para pegar en Upwork.");
        });
      });

      container.querySelector("#akBtnBuildDeliverable").addEventListener("click", () => {
        const spec = document.getElementById("akDeliverSpec").value.trim();
        if (!spec) {
          alert("Pega los datos o instrucciones del cliente para construir el trabajo.");
          return;
        }
        this.buildDeliverable(spec);
      });

      container.querySelector("#akBtnCopyDeliverable").addEventListener("click", () => {
        if (!this.currentDeliverable) return;
        navigator.clipboard.writeText(this.currentDeliverable).then(() => {
          alert("¡Entregable copiado con éxito!");
        });
      });

      const zipDeliverable = container.querySelector("#akBtnZipDeliverable");
      if (zipDeliverable) {
        zipDeliverable.addEventListener("click", () => {
          if (!this.currentDeliverable) return;
          if (typeof window.akiraCreateZipBlob !== "function") return;
          const readme = `# Entregable de Proyecto Upwork\n\nGenerado de acuerdo a los requerimientos especificados.\n\n---\nDesarrollado con Akira Enterprise Collective.`;
          const isWeb = this.currentDeliverable.includes("<html") || this.currentDeliverable.includes("<!DOCTYPE") || this.currentDeliverable.includes("<div");
          const filename = isWeb ? "index.html" : "entregable.txt";
          const zipBlob = window.akiraCreateZipBlob({
            [filename]: this.currentDeliverable,
            "README.md": readme
          });
          const url = URL.createObjectURL(zipBlob);
          const a = document.createElement("a");
          a.href = url;
          a.download = `entregable-upwork-${Date.now()}.zip`;
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          setTimeout(() => URL.revokeObjectURL(url), 30000);
        });
      }
    }

    switchTab(tabId) {
      const container = document.getElementById("upworkSection");
      if (!container) return;
      container.querySelectorAll(".ak-tab-btn").forEach(b => {
        b.classList.toggle("active", b.dataset.tab === tabId);
      });
      container.querySelectorAll(".ak-tab-pane").forEach(p => {
        p.classList.toggle("active", p.id === tabId);
      });
    }

    async callAkiraChat(prompt, mode, tone) {
      const backend = localStorage.getItem("akira_backend_url") || "https://akira-empresa.onrender.com";
      const headers = typeof window.akiraAuthHeaders === "function" ? window.akiraAuthHeaders() : { "Content-Type": "application/json" };
      
      try {
        const upRes = await fetch(backend + "/api/upwork/generate", {
          method: "POST",
          headers: headers,
          body: JSON.stringify({
            job_description: prompt,
            mode: mode || "proposal",
            tone: tone || "persuasive"
          })
        });
        if (upRes.ok) {
          const upData = await upRes.json();
          if (upData && upData.ok) {
            this.lastCommander = upData.commander;
            this.lastSpecialists = upData.specialists;
            return upData.result || upData.proposal || "Propuesta generada con la Colmena.";
          }
        }
      } catch (_) {}

      // Fallback a /api/chat
      const res = await fetch(backend + "/api/chat", {
        method: "POST",
        headers: headers,
        body: JSON.stringify({ message: prompt.slice(0, 1500) })
      });
      const data = await res.json();
      return data.response || data.reply || "Sin respuesta del motor.";
    }

    async analyzeJob(jobDesc) {
      const out = document.getElementById("akAnalysisResult");
      out.style.display = "block";
      out.innerHTML = `<div class="ak-loading-pulse">⚡ Analizando viabilidad técnica con Akira...</div>`;

      const prompt = `Actúa como Consultor Experto en Upwork y Monetización con Inteligencia Artificial.
Analiza la siguiente oferta de trabajo para un freelancer que usa IA avanzada:
"""
${jobDesc.slice(0, 2500)}
"""

Devuelve un análisis estructurado con:
1. **Puntaje de Automatización**: (0% a 100% de qué tan automatizable es con Akira).
2. **Tiempo Estimado de Entrega**: (ej. 10 minutos con Akira).
3. **Precio Sugerido para Ofertar**: (ej. $65 USD).
4. **Veredicto de Viabilidad**: (¿Vale la pena aplicar? Sí / No y por qué).
5. **Estrategia Clave para Ganar**: (Qué ofrecer o qué muestra gratuita darle al cliente para que te contrate de inmediato).`;

      try {
        const reply = await this.callAkiraChat(prompt, 'analysis');
        out.innerHTML = `
          <div class="ak-analysis-grid">
            <div class="ak-analysis-text">${this.formatMarkdown(reply)}</div>
            <div class="ak-next-step-box">
              <h4>¿Listo para ganar este trabajo?</h4>
              <p>Pasa al siguiente paso y deja que Akira redacte la propuesta ganadora con la muestra lista.</p>
              <button class="ak-btn primary small" id="akGoToProposal">Ir a Redactar Propuesta ➔</button>
            </div>
          </div>
        `;
        document.getElementById("akGoToProposal").addEventListener("click", () => {
          this.switchTab("tabProposal");
        });
      } catch (err) {
        out.innerHTML = `<div class="ak-error">Error al conectar con Akira: ${err.message}</div>`;
      }
    }

    async generateProposal(jobDesc, tone) {
      const out = document.getElementById("akProposalOutput");
      const copyBtn = document.getElementById("akBtnCopyProposal");
      out.style.display = "block";
      copyBtn.style.display = "none";
      out.innerHTML = `<div class="ak-loading-pulse">✍️ Redactando propuesta de alto cierre...</div>`;

      const toneInstructions = {
        persuasive: "Tono altamente persuasivo, enfocado en resultados directos, con un gancho que ataque el dolor del cliente en las primeras dos líneas sin introducciones aburridas.",
        expert: "Tono de consultor senior y técnico, explicando exactamente la arquitectura de solución limpia y rápida.",
        english: "Write in flawless professional American English, engaging, direct, and tailored to get an immediate interview on Upwork.",
        short: "Menos de 120 palabras, ultra conciso, directo a la solución inmediata."
      }[tone || "persuasive"];

      const prompt = `Actúa como el mejor redactor de propuestas ganadoras de Upwork del mundo (Top Rated Plus).
Escribe la propuesta (Cover Letter) para este trabajo:
"""
${jobDesc.slice(0, 2500)}
"""

Reglas estrictas:
- ${toneInstructions}
- NO empieces con frases genéricas como "Estimado cliente" ni "He leído tu oferta con gran interés". Ve directo a la solución: "Veo que necesitas [solución concreta], y lo tengo listo".
- Incluye un gancho de valor o muestra técnica inmediata.
- Termina con una pregunta que invite a responder hoy mismo.`;

      try {
        const reply = await this.callAkiraChat(prompt, 'proposal', tone);
        this.currentProposal = reply;
        out.innerHTML = `<div class="ak-formatted-output">${this.formatMarkdown(reply)}</div>`;
        copyBtn.style.display = "inline-flex";
      } catch (err) {
        out.innerHTML = `<div class="ak-error">Error al generar la propuesta: ${err.message}</div>`;
      }
    }

    async buildDeliverable(spec) {
      const out = document.getElementById("akDeliverableOutput");
      const copyBtn = document.getElementById("akBtnCopyDeliverable");
      out.style.display = "block";
      copyBtn.style.display = "none";
      out.innerHTML = `<div class="ak-loading-pulse">⚙️ Construyendo entregable final listo para cobrar...</div>`;

      const prompt = `Actúa como el Desarrollador y Consultor de Entrega Final de Akira.
El cliente de Upwork ha contratado el trabajo y ha enviado estas instrucciones/datos:
"""
${spec.slice(0, 3000)}
"""

Construye el ENTREGABLE FINAL COMPLETO:
- Si es código o script (Python, scraping, macro Excel, SQL): escribe el script completo, probado, documentado y listo para ejecutar, con instrucciones de uso.
- Si es un documento, SOP o manual: redacta el contenido completo con todas las secciones profesionales requeridas.
- Si es limpieza de datos: provee la estructura final o la lógica exacta de transformación.
Entrega un resultado 100% profesional que el cliente pueda calificar con 5 estrellas en Upwork.`;

      try {
        const reply = await this.callAkiraChat(prompt, 'deliverable');
        this.currentDeliverable = reply;
        out.innerHTML = `<div class="ak-formatted-output">${this.formatMarkdown(reply)}</div>`;
        copyBtn.style.display = "inline-flex";
        const zipBtn = document.getElementById("akBtnZipDeliverable");
        if (zipBtn) zipBtn.style.display = "inline-flex";
      } catch (err) {
        out.innerHTML = `<div class="ak-error">Error al construir el entregable: ${err.message}</div>`;
      }
    }

    formatMarkdown(text) {
      if (typeof window.akiraFormatMarkdown === "function") {
        return window.akiraFormatMarkdown(text);
      }
      return text
        .replace(/\n\n/g, "<br><br>")
        .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")
        .replace(/\*(.*?)\*/g, "<em>$1</em>")
        .replace(/`([^`]+)`/g, "<code>$1</code>");
    }
  }

  window.AkiraMonetization = new AkiraMonetizationEngine();

  document.addEventListener("DOMContentLoaded", () => {
    // Mount when upwork section exists
    setTimeout(() => {
      if (window.AkiraMonetization) window.AkiraMonetization.init();
    }, 400);
  });
})();
