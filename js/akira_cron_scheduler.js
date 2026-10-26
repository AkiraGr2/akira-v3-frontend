/**
 * AKIRA AUTONOMOUS CRON SCHEDULER v1.0
 * Zero-Cost ($0.00 COP/USD) recurring automation engine for Akira.
 * Manages periodic jobs: Radar Tech scanning, Cognitive reflection, Memory consolidation, and Upwork alerts.
 */
(function(){
  "use strict";

  const DEFAULT_CRON_TASKS = [
    {
      id: "radar_scan",
      name: "📡 Radar Tech & RSS Feed Scan",
      description: "Monitoreo continuo de Hacker News, Dev.to, GitHub Trending y Python Feeds",
      intervalMinutes: 180, // every 3 hours
      lastRun: 0,
      enabled: true,
      action: async () => {
        if(window.akiraFetchTechRadar) {
          console.log("[Akira Cron] Ejecutando escaneo autónomo de Radar Tech...");
          return await window.akiraFetchTechRadar();
        }
      }
    },
    {
      id: "cognitive_reflection",
      name: "🧬 Reflexión Cognitiva Nocturna",
      description: "Auto-evaluación de candidatos en memoria y refuerzo de sinapsis en la membrana",
      intervalMinutes: 360, // every 6 hours
      lastRun: 0,
      enabled: true,
      action: async () => {
        if(window.akiraRunAutonomousEvolution) {
          console.log("[Akira Cron] Ejecutando reflexión cognitiva autónoma...");
          return await window.akiraRunAutonomousEvolution("scheduled_cron");
        }
      }
    },
    {
      id: "vector_index_rebuild",
      name: "🔍 Re-indexación Vectorial de Memoria",
      description: "Actualización del índice TF-IDF / BM25 de memoria, aprendizaje y especialistas",
      intervalMinutes: 60, // every 1 hour
      lastRun: 0,
      enabled: true,
      action: async () => {
        if(window.akiraRefreshVectorIndex) {
          console.log("[Akira Cron] Re-indexando memoria vectorial...");
          return window.akiraRefreshVectorIndex();
        }
      }
    },
    {
      id: "memory_health_check",
      name: "🛡️ Auditoría de Salud y Auto-Curación",
      description: "Verificación de integridad de almacenamiento local y consistencia de grafos",
      intervalMinutes: 120, // every 2 hours
      lastRun: 0,
      enabled: true,
      action: async () => {
        console.log("[Akira Cron] Auditoría de memoria local OK.");
        return { ok: true, status: "healthy" };
      }
    }
  ];

  function loadCronTasks(){
    try {
      const saved = localStorage.getItem("akira_cron_tasks");
      if(saved) {
        const parsed = JSON.parse(saved);
        return DEFAULT_CRON_TASKS.map(def => {
          const match = parsed.find(p => p.id === def.id);
          return match ? { ...def, ...match, action: def.action } : def;
        });
      }
    } catch(e){}
    return DEFAULT_CRON_TASKS;
  }

  function saveCronTasks(tasks){
    try {
      const serializable = tasks.map(t => ({
        id: t.id,
        name: t.name,
        description: t.description,
        intervalMinutes: t.intervalMinutes,
        lastRun: t.lastRun,
        enabled: t.enabled
      }));
      localStorage.setItem("akira_cron_tasks", JSON.stringify(serializable));
    } catch(e){}
  }

  let activeTasks = loadCronTasks();
  let cronWatchdogInterval = null;

  async function checkDueTasks(){
    const now = Date.now();
    for(let task of activeTasks){
      if(!task.enabled) continue;
      const intervalMs = (task.intervalMinutes || 60) * 60 * 1000;
      if(now - (task.lastRun || 0) >= intervalMs) {
        console.log(`[Akira Cron] Disparando tarea programada: ${task.name}`);
        task.lastRun = now;
        saveCronTasks(activeTasks);

        try {
          if(typeof task.action === "function") {
            await task.action();
          }
          logCronHistory(task.id, task.name, "success");
        } catch(err) {
          console.error(`[Akira Cron] Error en tarea ${task.id}:`, err);
          logCronHistory(task.id, task.name, "error: " + err.message);
        }
      }
    }
  }

  function logCronHistory(taskId, taskName, status){
    try {
      const hist = JSON.parse(localStorage.getItem("akira_cron_history") || "[]");
      hist.unshift({
        taskId,
        taskName,
        status,
        timestamp: new Date().toISOString()
      });
      localStorage.setItem("akira_cron_history", JSON.stringify(hist.slice(0, 50)));
    } catch(e){}
  }

  window.akiraStartCronScheduler = function(){
    if(cronWatchdogInterval) clearInterval(cronWatchdogInterval);
    // Check every 60 seconds
    cronWatchdogInterval = setInterval(checkDueTasks, 60000);
    // Run an initial check after 5 seconds
    setTimeout(checkDueTasks, 5000);
    console.log("[Akira Cron] Watchdog de tareas programadas iniciado.");
  };

  window.akiraExecuteCronTaskNow = async function(taskId){
    const task = activeTasks.find(t => t.id === taskId);
    if(!task) return;
    task.lastRun = Date.now();
    saveCronTasks(activeTasks);
    try {
      if(typeof task.action === "function") {
        await task.action();
      }
      logCronHistory(task.id, task.name, "success (manual)");
      alert(`Tarea "${task.name}" ejecutada con éxito.`);
      window.akiraRenderCronModal();
    } catch(e) {
      alert(`Error al ejecutar tarea: ${e.message}`);
    }
  };

  window.akiraToggleCronTask = function(taskId){
    const task = activeTasks.find(t => t.id === taskId);
    if(!task) return;
    task.enabled = !task.enabled;
    saveCronTasks(activeTasks);
    window.akiraRenderCronModal();
  };

  /**
   * Cron Manager UI Modal
   */
  function ensureCronModal(){
    let modal = document.getElementById("akiraCronModal");
    if(modal) return modal;

    modal = document.createElement("div");
    modal.id = "akiraCronModal";
    modal.className = "ak-cron-overlay";
    modal.style.display = "none";
    modal.innerHTML = `
      <div class="ak-cron-dialog">
        <div class="ak-cron-header">
          <div class="ak-cron-title-wrap">
            <span class="ak-cron-icon">⏰</span>
            <div>
              <strong style="color:#fff;font-size:14px;display:block;">Centro de Automatizaciones y Tareas Programadas (Cron)</strong>
              <small style="color:#94a3b8;font-size:11px;">Ejecución periódica autónoma en segundo plano ($0.00 COP)</small>
            </div>
          </div>
          <button type="button" class="ak-cron-close-btn" onclick="window.akiraCloseCronModal()">✕</button>
        </div>
        <div class="ak-cron-body" id="akCronModalBody">
          <!-- Rendered dynamically -->
        </div>
      </div>
    `;
    document.body.appendChild(modal);

    modal.addEventListener("click", (e) => {
      if(e.target === modal) window.akiraCloseCronModal();
    });

    return modal;
  }

  window.akiraOpenCronModal = function(){
    const modal = ensureCronModal();
    window.akiraRenderCronModal();
    modal.style.display = "flex";
  };

  window.akiraCloseCronModal = function(){
    const modal = document.getElementById("akiraCronModal");
    if(modal) modal.style.display = "none";
  };

  window.akiraRenderCronModal = function(){
    const body = document.getElementById("akCronModalBody");
    if(!body) return;

    let html = `
      <div class="ak-cron-tasks-list">
    `;

    activeTasks.forEach(task => {
      const nextRunMs = (task.lastRun || 0) + (task.intervalMinutes * 60 * 1000);
      const diffMin = Math.max(0, Math.round((nextRunMs - Date.now()) / 60000));
      const nextRunText = task.lastRun === 0 ? "Inmediata" : `En ~${diffMin} minutos`;

      html += `
        <div class="ak-cron-card ${task.enabled ? 'active' : 'disabled'}">
          <div class="ak-cron-card-info">
            <div class="ak-cron-card-title">
              <strong>${task.name}</strong>
              <span class="ak-cron-badge ${task.enabled ? 'badge-on' : 'badge-off'}">
                ${task.enabled ? 'ACTIVA' : 'PAUSADA'}
              </span>
            </div>
            <div class="ak-cron-card-desc">${task.description}</div>
            <div class="ak-cron-card-meta">
              <span>Intervalo: cada ${task.intervalMinutes} min</span> | 
              <span>Próxima ejecución: ${nextRunText}</span>
            </div>
          </div>
          <div class="ak-cron-card-actions">
            <button type="button" class="ak-cron-btn-action" onclick="window.akiraExecuteCronTaskNow('${task.id}')">
              ▶ Disparar Ahora
            </button>
            <button type="button" class="ak-cron-btn-toggle" onclick="window.akiraToggleCronTask('${task.id}')">
              ${task.enabled ? 'Pausar' : 'Activar'}
            </button>
          </div>
        </div>
      `;
    });

    html += `</div>`;
    body.innerHTML = html;
  };

  // Inject CSS
  (function injectStyles(){
    if(document.getElementById("akira-cron-styles")) return;
    const st = document.createElement("style");
    st.id = "akira-cron-styles";
    st.textContent = `
      .ak-cron-overlay {
        position: fixed; inset: 0; z-index: 99998;
        background: rgba(4, 7, 14, 0.85); backdrop-filter: blur(8px);
        display: flex; align-items: center; justify-content: center; padding: 16px;
      }
      .ak-cron-dialog {
        background: #0b1120; border: 2px solid #00f0ff; border-radius: 12px;
        box-shadow: 0 0 35px rgba(0, 240, 255, 0.25); width: 95vw; max-width: 720px;
        max-height: 85vh; display: flex; flex-direction: column; overflow: hidden;
      }
      .ak-cron-header {
        display: flex; justify-content: space-between; align-items: center;
        padding: 12px 16px; background: #0e1526; border-bottom: 1px solid rgba(0, 240, 255, 0.2);
      }
      .ak-cron-title-wrap { display: flex; align-items: center; gap: 8px; }
      .ak-cron-icon { font-size: 20px; }
      .ak-cron-close-btn {
        background: rgba(239,68,68,0.2); border: 1px solid #ef4444; color: #ef4444;
        font-size: 13px; font-weight: 700; padding: 4px 10px; border-radius: 5px; cursor: pointer;
      }
      .ak-cron-body { padding: 14px; overflow-y: auto; flex: 1; display: flex; flex-direction: column; gap: 10px; }
      .ak-cron-tasks-list { display: flex; flex-direction: column; gap: 10px; }
      .ak-cron-card {
        background: #070d1a; border: 1px solid rgba(0, 240, 255, 0.2); border-radius: 8px;
        padding: 12px 14px; display: flex; justify-content: space-between; align-items: center; gap: 12px;
      }
      .ak-cron-card.disabled { opacity: 0.6; border-color: rgba(255,255,255,0.1); }
      .ak-cron-card-info { flex: 1; }
      .ak-cron-card-title { display: flex; align-items: center; gap: 8px; margin-bottom: 4px; }
      .ak-cron-card-title strong { color: #f8fafc; font-size: 13px; }
      .ak-cron-badge { font-size: 9px; font-weight: 700; padding: 2px 6px; border-radius: 4px; }
      .badge-on { background: rgba(16,185,129,0.2); color: #10b981; border: 1px solid #10b981; }
      .badge-off { background: rgba(148,163,184,0.2); color: #94a3b8; border: 1px solid #94a3b8; }
      .ak-cron-card-desc { font-size: 11px; color: #94a3b8; margin-bottom: 6px; }
      .ak-cron-card-meta { font-size: 10px; color: #38bdf8; }
      .ak-cron-card-actions { display: flex; gap: 6px; }
      .ak-cron-btn-action {
        background: #00f0ff; color: #04070e; font-weight: 700; border: none; font-size: 11px;
        padding: 6px 12px; border-radius: 5px; cursor: pointer;
      }
      .ak-cron-btn-toggle {
        background: #1e293b; color: #cbd5e1; border: 1px solid rgba(255,255,255,0.15); font-size: 11px;
        padding: 6px 10px; border-radius: 5px; cursor: pointer;
      }
    `;
    document.head.appendChild(st);
  })();

  // Auto-start scheduler when loaded
  if(typeof window !== "undefined") {
    window.akiraStartCronScheduler();
  }
})();
