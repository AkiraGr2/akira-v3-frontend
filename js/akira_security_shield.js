/**
 * AKIRA CODE SECURITY SHIELD & AUDITOR v1.0
 * Zero-Cost ($0.00 COP/USD) client-side static security analysis engine.
 * Scans for OWASP vulnerabilities, leaked API keys, unsafe eval(), SQL injections, and XSS patterns.
 */
(function(){
  "use strict";

  const SECURITY_RULES = [
    {
      id: "hardcoded_api_key",
      name: "Clave de API / Secreto Expuesto",
      severity: "CRITICAL",
      regex: /(?:sk-[a-zA-Z0-9]{32,}|AKIA[0-9A-Z]{16}|ghp_[a-zA-Z0-9]{36}|AIza[0-9A-Za-z-_]{35}|(?:api[_-]?key|secret[_-]?key|token)\s*=\s*['"][a-zA-Z0-9_\-]{16,}['"])/i,
      message: "Se detectó una credencial o clave de API sensible directamente en el código fuente.",
      fix: "Utiliza variables de entorno (ej. os.getenv('API_KEY') o process.env.API_KEY) en lugar de hardcodear credenciales."
    },
    {
      id: "unsafe_eval",
      name: "Ejecución Insegura (eval / Function)",
      severity: "HIGH",
      regex: /\b(?:eval\s*\(|new\s+Function\s*\(|window\[['"]eval['"]\])/,
      message: "El uso de eval() o new Function() permite ejecución arbitraria de código no confiable.",
      fix: "Reemplaza eval() por JSON.parse() para datos o una arquitectura basada en funciones declarativas seguras."
    },
    {
      id: "raw_inner_html_xss",
      name: "Vector de XSS (innerHTML no sanitizado)",
      severity: "HIGH",
      regex: /\.innerHTML\s*=\s*(?:[a-zA-Z0-9_]+|\`[^\`]*\$\{[^\}]+\}[^\`]*\`)/,
      message: "Asignación directa a innerHTML con variables dinámicas puede permitir Cross-Site Scripting (XSS).",
      fix: "Utiliza textContent, createElement con atributos seguros o sanitiza con DOMPurify / escapeHtml."
    },
    {
      id: "document_write",
      name: "Inyección con document.write()",
      severity: "MEDIUM",
      regex: /document\.write\s*\(/,
      message: "document.write() es peligroso y está obsoleto en aplicaciones web modernas.",
      fix: "Manipula el DOM de forma declarativa con appendChild o insertAdjacentHTML seguro."
    },
    {
      id: "insecure_sql_concat",
      name: "Riesgo de Inyección SQL",
      severity: "CRITICAL",
      regex: /(?:SELECT|INSERT|UPDATE|DELETE)\s+.*(?:\+\s*[a-zA-Z0-9_]+|f['"][^'"]*\{[^\}]+\}[^'"]*['"]|\%s\s*\%|\.format\()/i,
      message: "Concatenación directa de cadenas en consultas SQL sin sentencias preparadas parametrizadas.",
      fix: "Utiliza consultas parametrizadas o un ORM seguro (ej. cursor.execute('SELECT * FROM t WHERE id = %s', (id,)))."
    },
    {
      id: "insecure_http_url",
      name: "Protocolo Inseguro HTTP",
      severity: "LOW",
      regex: /['"]http:\/\/(?!localhost|127\.0\.0\.1)[a-zA-Z0-9\-\.]+\.[a-zA-Z]{2,}/i,
      message: "Conexión mediante HTTP plano sin cifrado TLS/SSL.",
      fix: "Actualiza los endpoints externos a HTTPS para proteger la confidencialidad de los datos."
    },
    {
      id: "hardcoded_password",
      name: "Contraseña Hardcodeada",
      severity: "HIGH",
      regex: /(?:password|passwd|pwd)\s*=\s*['"][^'"]{4,}['"]/i,
      message: "Contraseña en texto plano dentro del código fuente.",
      fix: "Almacena las contraseñas en un almacén de secretos o variables de entorno protegidas."
    }
  ];

  /**
   * Run static security audit on any code snippet
   */
  window.akiraAuditCodeSecurity = function(code, lang = ""){
    if(!code || typeof code !== "string") {
      return { score: 100, grade: "A+", findings: [], clean: true };
    }

    const findings = [];
    let penalty = 0;

    for(let rule of SECURITY_RULES){
      const match = code.match(rule.regex);
      if(match){
        let pen = rule.severity === "CRITICAL" ? 35 : (rule.severity === "HIGH" ? 20 : (rule.severity === "MEDIUM" ? 10 : 5));
        penalty += pen;
        findings.push({
          ruleId: rule.id,
          name: rule.name,
          severity: rule.severity,
          matchedSnippet: match[0].slice(0, 50),
          message: rule.message,
          fix: rule.fix
        });
      }
    }

    const score = Math.max(0, 100 - penalty);
    let grade = "A+";
    if(score < 50) grade = "F";
    else if(score < 70) grade = "C";
    else if(score < 85) grade = "B";
    else if(score < 95) grade = "A";

    return {
      score,
      grade,
      findings,
      clean: findings.length === 0,
      totalFindings: findings.length
    };
  };

  /**
   * UI Security Audit Modal
   */
  function ensureSecurityModal(){
    let modal = document.getElementById("akiraSecurityModal");
    if(modal) return modal;

    modal = document.createElement("div");
    modal.id = "akiraSecurityModal";
    modal.className = "ak-sec-overlay";
    modal.style.display = "none";
    modal.innerHTML = `
      <div class="ak-sec-dialog">
        <div class="ak-sec-header">
          <div class="ak-sec-title-wrap">
            <span class="ak-sec-icon">🛡️</span>
            <div>
              <strong style="color:#fff;font-size:14px;display:block;">Escudo de Auditoría &amp; Seguridad de Código</strong>
              <small style="color:#94a3b8;font-size:11px;">Análisis estático de vulnerabilidades OWASP y fugas de credenciales ($0.00 COP)</small>
            </div>
          </div>
          <button type="button" class="ak-sec-close-btn" onclick="window.akiraCloseSecurityModal()">✕</button>
        </div>
        <div class="ak-sec-body" id="akSecModalBody">
          <!-- Rendered dynamically -->
        </div>
      </div>
    `;
    document.body.appendChild(modal);

    modal.addEventListener("click", (e) => {
      if(e.target === modal) window.akiraCloseSecurityModal();
    });

    return modal;
  }

  window.akiraOpenSecurityModal = function(codeOrBlockId){
    const modal = ensureSecurityModal();
    const code = (window.akiraCodeRegistry && window.akiraCodeRegistry[codeOrBlockId]) || codeOrBlockId || "";
    const report = window.akiraAuditCodeSecurity(code);

    const body = document.getElementById("akSecModalBody");
    if(body){
      const gradeColor = report.score >= 85 ? "#10b981" : (report.score >= 60 ? "#f59e0b" : "#ef4444");

      body.innerHTML = `
        <div class="ak-sec-score-card">
          <div class="ak-sec-score-circle" style="border-color:${gradeColor};color:${gradeColor}">
            <span>${report.grade}</span>
            <small>${report.score}/100</small>
          </div>
          <div class="ak-sec-score-text">
            <h4 style="margin:0 0 4px;color:#fff;">${report.clean ? '✅ Código Seguro y Limpio' : '⚠️ Se Detectaron Hallazgos de Seguridad'}</h4>
            <p style="margin:0;font-size:12px;color:#94a3b8;">
              ${report.clean 
                ? 'No se encontraron claves expuestas, inyecciones SQL ni vulnerabilidades conocidas en este bloque de código.' 
                : `Se identificaron ${report.totalFindings} riesgos potenciales que deben revisarse antes del despliegue en producción.`}
            </p>
          </div>
        </div>

        <div class="ak-sec-findings-list">
          ${report.findings.map(f => `
            <div class="ak-sec-finding-card sev-${f.severity.toLowerCase()}">
              <div class="finding-header">
                <strong>${f.name}</strong>
                <span class="finding-badge badge-${f.severity.toLowerCase()}">${f.severity}</span>
              </div>
              <div class="finding-msg">${f.message}</div>
              <div class="finding-code"><code>${escapeHtml(f.matchedSnippet)}</code></div>
              <div class="finding-fix">💡 <strong>Remediación:</strong> ${f.fix}</div>
            </div>
          `).join("")}
          ${report.clean ? '<div class="ak-sec-clean-state">🛡️ Auditoría superada con éxito. Este artefacto cumple los estándares de seguridad de Akira.</div>' : ''}
        </div>
      `;
    }

    modal.style.display = "flex";
  };

  window.akiraCloseSecurityModal = function(){
    const modal = document.getElementById("akiraSecurityModal");
    if(modal) modal.style.display = "none";
  };

  function escapeHtml(s){
    return String(s || "").replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;");
  }

  // Inject styles
  (function injectStyles(){
    if(document.getElementById("akira-sec-styles")) return;
    const st = document.createElement("style");
    st.id = "akira-sec-styles";
    st.textContent = `
      .ak-sec-overlay {
        position: fixed; inset: 0; z-index: 99998;
        background: rgba(4, 7, 14, 0.85); backdrop-filter: blur(8px);
        display: flex; align-items: center; justify-content: center; padding: 16px;
      }
      .ak-sec-dialog {
        background: #0b1120; border: 2px solid #00f0ff; border-radius: 12px;
        box-shadow: 0 0 35px rgba(0, 240, 255, 0.25); width: 95vw; max-width: 680px;
        max-height: 85vh; display: flex; flex-direction: column; overflow: hidden;
      }
      .ak-sec-header {
        display: flex; justify-content: space-between; align-items: center;
        padding: 12px 18px; background: #0e1526; border-bottom: 1px solid rgba(0, 240, 255, 0.2);
      }
      .ak-sec-title-wrap { display: flex; align-items: center; gap: 10px; }
      .ak-sec-icon { font-size: 22px; }
      .ak-sec-close-btn {
        background: rgba(239,68,68,0.2); border: 1px solid #ef4444; color: #ef4444;
        font-size: 13px; font-weight: 700; padding: 4px 10px; border-radius: 5px; cursor: pointer;
      }
      .ak-sec-body { padding: 16px; overflow-y: auto; flex: 1; display: flex; flex-direction: column; gap: 14px; }
      .ak-sec-score-card {
        background: #080d19; border: 1px solid rgba(255,255,255,0.08); border-radius: 8px;
        padding: 14px; display: flex; align-items: center; gap: 16px;
      }
      .ak-sec-score-circle {
        width: 64px; height: 64px; border-radius: 50%; border: 3px solid;
        display: flex; flex-direction: column; align-items: center; justify-content: center;
        font-weight: 800; font-size: 20px; line-height: 1;
      }
      .ak-sec-score-circle small { font-size: 10px; opacity: 0.8; margin-top: 2px; }
      .ak-sec-findings-list { display: flex; flex-direction: column; gap: 10px; }
      .ak-sec-finding-card {
        background: #0f172a; border-radius: 6px; padding: 12px; border-left: 4px solid;
      }
      .sev-critical { border-left-color: #ef4444; }
      .sev-high { border-left-color: #f97316; }
      .sev-medium { border-left-color: #eab308; }
      .sev-low { border-left-color: #3b82f6; }
      .finding-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 4px; }
      .finding-header strong { color: #f1f5f9; font-size: 12px; }
      .finding-badge { font-size: 9px; font-weight: 700; padding: 2px 6px; border-radius: 4px; }
      .badge-critical { background: rgba(239,68,68,0.2); color: #ef4444; }
      .badge-high { background: rgba(249,115,22,0.2); color: #f97316; }
      .badge-medium { background: rgba(234,179,8,0.2); color: #eab308; }
      .badge-low { background: rgba(59,130,246,0.2); color: #3b82f6; }
      .finding-msg { font-size: 11px; color: #cbd5e1; margin-bottom: 6px; }
      .finding-code {
        background: #020408; padding: 4px 8px; border-radius: 4px; font-size: 10px; color: #f87171;
        font-family: monospace; margin-bottom: 6px; overflow-x: auto;
      }
      .finding-fix { font-size: 11px; color: #38bdf8; }
      .ak-sec-clean-state {
        text-align: center; padding: 25px; color: #10b981; font-weight: 600; font-size: 13px;
        background: rgba(16,185,129,0.06); border: 1px dashed rgba(16,185,129,0.3); border-radius: 8px;
      }
    `;
    document.head.appendChild(st);
  })();

})();
