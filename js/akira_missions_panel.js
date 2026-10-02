/* ============================================================
   AKIRA — MISSIONS PANEL
   FASE 10.8 — Panel Unificado de Misiones
   Version: V1
   ============================================================ */

(function () {
  "use strict";

  const API_BASE = "/api/v8";
  const POLL_INTERVAL = 5000;

  let selectedMissionId = null;
  let pollTimer = null;
  let missionsCache = [];

  /* ============================================================
     HELPERS
     ============================================================ */

  function $(id) {
    return document.getElementById(id);
  }

  function escapeHtml(value) {
    if (value === null || value === undefined) return "";
    return String(value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  function getToken() {
    return (
      localStorage.getItem("akira_token") ||
      localStorage.getItem("token") ||
      localStorage.getItem("access_token") ||
      ""
    );
  }

  async function apiFetch(url, options = {}) {
    const headers = Object.assign(
      {
        "Content-Type": "application/json"
      },
      options.headers || {}
    );

    const token = getToken();

    if (token) {
      headers.Authorization = token.startsWith("Bearer ")
        ? token
        : `Bearer ${token}`;
    }

    const response = await fetch(url, Object.assign({}, options, { headers }));

    let data = null;

    try {
      data = await response.json();
    } catch (_) {
      data = null;
    }

    if (!response.ok) {
      const message =
        data?.detail ||
        data?.message ||
        data?.error ||
        `HTTP ${response.status}`;

      throw new Error(message);
    }

    return data;
  }

  function notify(message, type = "info") {
    if (typeof window.showToast === "function") {
      window.showToast(message, type);
      return;
    }

    if (typeof window.akToast === "function") {
      window.akToast(message, type);
      return;
    }

    console.log(`[AKIRA ${type}] ${message}`);
  }

  function priorityToNumber(priority) {
    if (priority === undefined || priority === null || priority === "") {
      return 5;
    }

    const value = String(priority).toLowerCase();

    if (value === "low") return 1;
    if (value === "normal") return 5;
    if (value === "high") return 9;

    const numeric = Number(priority);

    if (!Number.isNaN(numeric)) {
      return numeric;
    }

    return 5;
  }

  function priorityLabel(priority) {
    const numeric = priorityToNumber(priority);

    if (numeric >= 8) return "Alta";
    if (numeric <= 3) return "Baja";
    return "Normal";
  }

  function statusLabel(status) {
    const labels = {
      pending: "Pendiente",
      waiting_approval: "Esperando aprobación",
      approved: "Aprobada",
      running: "En ejecución",
      completed: "Completada",
      failed: "Fallida",
      cancelled: "Cancelada",
      canceled: "Cancelada",
      rejected: "Rechazada"
    };

    return labels[status] || status || "Desconocido";
  }

  function statusClass(status) {
    const map = {
      pending: "pending",
      waiting_approval: "waiting",
      approved: "approved",
      running: "running",
      completed: "completed",
      failed: "failed",
      cancelled: "cancelled",
      canceled: "cancelled",
      rejected: "cancelled"
    };

    return map[status] || "pending";
  }

  function missionObjective(mission) {
    return (
      mission?.objective ||
      mission?.goal ||
      mission?.description ||
      mission?.name ||
      `Misión ${mission?.id || ""}`
    );
  }

  function missionId(mission) {
    return mission?.id || mission?.mission_id || mission?.uuid || "";
  }

  /* ============================================================
     DOM
     ============================================================ */

  function getPanelElements() {
    return {
      list: $("missionPanelList"),
      detail: $("missionPanelDetail"),
      search: $("missionPanelSearch"),
      status: $("missionPanelStatus"),
      goal: $("missionPanelGoal"),
      priority: $("missionPanelPriority")
    };
  }

  /* ============================================================
     LOAD MISSIONS
     ============================================================ */

  async function loadMissions() {
    const elements = getPanelElements();

    if (!elements.list) return;

    try {
      elements.list.innerHTML =
        '<div class="mission-empty">Cargando misiones...</div>';

      const status = elements.status?.value || "";

      let url = `${API_BASE}/missions?limit=50`;

      if (status) {
        url += `&status=${encodeURIComponent(status)}`;
      }

      const data = await apiFetch(url);

      missionsCache = Array.isArray(data)
        ? data
        : data?.missions || data?.items || data?.results || [];

      renderMissionList();

      if (selectedMissionId) {
        const exists = missionsCache.some(
          (mission) => String(missionId(mission)) === String(selectedMissionId)
        );

        if (exists) {
          await loadMissionDetail(selectedMissionId);
        }
      }
    } catch (error) {
      console.error("Akira missions load error:", error);

      elements.list.innerHTML = `
        <div class="mission-error">
          Error cargando misiones:<br>
          ${escapeHtml(error.message)}
        </div>
      `;

      notify(`Error cargando misiones: ${error.message}`, "error");
    }
  }

  function renderMissionList() {
    const elements = getPanelElements();

    if (!elements.list) return;

    const search = (elements.search?.value || "").trim().toLowerCase();

    const filtered = missionsCache.filter((mission) => {
      if (!search) return true;

      const text = [
        missionId(mission),
        missionObjective(mission),
        mission.status,
        mission.priority
      ]
        .join(" ")
        .toLowerCase();

      return text.includes(search);
    });

    if (!filtered.length) {
      elements.list.innerHTML = `
        <div class="mission-empty">
          No hay misiones para mostrar.
        </div>
      `;
      return;
    }

    elements.list.innerHTML = filtered
      .map((mission) => {
        const id = missionId(mission);
        const objective = missionObjective(mission);
        const status = mission.status || "pending";
        const priority = priorityLabel(mission.priority);

        const selected =
          String(id) === String(selectedMissionId) ? " selected" : "";

        return `
          <button
            type="button"
            class="mission-card${selected}"
            onclick="window.missionPanelSelect('${escapeHtml(id)}')"
          >
            <div class="mission-card-top">
              <span class="mission-id">
                #${escapeHtml(id)}
              </span>

              <span class="mission-status mission-status-${statusClass(status)}">
                ${escapeHtml(statusLabel(status))}
              </span>
            </div>

            <div class="mission-objective">
              ${escapeHtml(objective)}
            </div>

            <div class="mission-card-bottom">
              <span>Prioridad: ${escapeHtml(priority)}</span>
            </div>
          </button>
        `;
      })
      .join("");
  }

  /* ============================================================
     DETAIL
     ============================================================ */

  async function loadMissionDetail(id) {
    const elements = getPanelElements();

    if (!elements.detail || !id) return;

    selectedMissionId = id;

    elements.detail.innerHTML =
      '<div class="mission-empty">Cargando detalle...</div>';

    renderMissionList();

    try {
      const [mission, progress, tasks] = await Promise.all([
        apiFetch(`${API_BASE}/missions/${encodeURIComponent(id)}`),
        apiFetch(`${API_BASE}/missions/${encodeURIComponent(id)}/progress`),
        apiFetch(
          `${API_BASE}/tasks?mission_id=${encodeURIComponent(id)}`
        )
      ]);

      renderMissionDetail(mission, progress, tasks);
      startPollingIfNeeded(mission);
    } catch (error) {
      console.error("Akira mission detail error:", error);

      elements.detail.innerHTML = `
        <div class="mission-error">
          Error cargando misión:<br>
          ${escapeHtml(error.message)}
        </div>
      `;

      notify(`Error cargando misión: ${error.message}`, "error");
    }
  }

  function normalizeTasks(tasks) {
    if (Array.isArray(tasks)) return tasks;

    if (Array.isArray(tasks?.tasks)) return tasks.tasks;
    if (Array.isArray(tasks?.items)) return tasks.items;
    if (Array.isArray(tasks?.results)) return tasks.results;

    return [];
  }

  function renderMissionDetail(mission, progress, tasks) {
    const elements = getPanelElements();

    if (!elements.detail) return;

    const id = missionId(mission);
    const objective = missionObjective(mission);
    const status = mission?.status || "pending";
    const priority = priorityLabel(mission?.priority);

    const progressValue = Number(
      progress?.progress ??
      progress?.percentage ??
      mission?.progress ??
      0
    );

    const safeProgress = Math.max(
      0,
      Math.min(100, Number.isFinite(progressValue) ? progressValue : 0)
    );

    const taskList = normalizeTasks(tasks);

    elements.detail.innerHTML = `
      <div class="mission-detail-header">
        <div>
          <div class="mission-detail-kicker">
            MISIÓN #${escapeHtml(id)}
          </div>

          <h3>
            ${escapeHtml(objective)}
          </h3>
        </div>

        <span class="mission-status mission-status-${statusClass(status)}">
          ${escapeHtml(statusLabel(status))}
        </span>
      </div>

      <div class="mission-detail-meta">
        <div>
          <span>Prioridad</span>
          <strong>${escapeHtml(priority)}</strong>
        </div>

        <div>
          <span>Estado</span>
          <strong>${escapeHtml(statusLabel(status))}</strong>
        </div>

        <div>
          <span>Progreso</span>
          <strong>${safeProgress}%</strong>
        </div>
      </div>

      <div class="mission-progress-box">
        <div class="mission-progress-label">
          <span>Progreso de misión</span>
          <strong>${safeProgress}%</strong>
        </div>

        <div class="mission-progress-track">
          <div
            class="mission-progress-fill"
            style="width:${safeProgress}%"
          ></div>
        </div>
      </div>

      <div class="mission-actions">
        ${renderMissionActions(mission)}
      </div>

      <div class="mission-tasks">
        <div class="mission-section-title">
          Tareas
        </div>

        ${
          taskList.length
            ? taskList
                .map((task) => {
                  const taskStatus =
                    task?.status ||
                    task?.state ||
                    "pending";

                  const taskName =
                    task?.name ||
                    task?.title ||
                    task?.description ||
                    `Tarea ${task?.id || ""}`;

                  return `
                    <div class="mission-task-row">
                      <div>
                        <strong>
                          ${escapeHtml(taskName)}
                        </strong>

                        ${
                          task?.id
                            ? `<small>ID: ${escapeHtml(task.id)}</small>`
                            : ""
                        }
                      </div>

                      <span class="mission-status mission-status-${statusClass(taskStatus)}">
                        ${escapeHtml(statusLabel(taskStatus))}
                      </span>
                    </div>
                  `;
                })
                .join("")
            : `
              <div class="mission-empty">
                No hay tareas registradas para esta misión.
              </div>
            `
        }
      </div>
    `;
  }

  /* ============================================================
     ACTIONS
     ============================================================ */

  function renderMissionActions(mission) {
    const id = missionId(mission);
    const status = mission?.status || "";

    let html = "";

    if (status === "waiting_approval") {
      html += `
        <button
          type="button"
          class="mission-action mission-action-primary"
          onclick="window.missionPanelApprove('${escapeHtml(id)}')"
        >
          ✓ Aprobar
        </button>

        <button
          type="button"
          class="mission-action"
          onclick="window.missionPanelReject('${escapeHtml(id)}')"
        >
          ✕ Rechazar
        </button>
      `;
    }

    /*
     * Execute is intentionally exposed only for statuses where
     * the backend has already moved the mission past approval.
     * The exact backend transition should remain the source of truth.
     */
    if (status === "approved") {
      html += `
        <button
          type="button"
          class="mission-action mission-action-primary"
          onclick="window.missionPanelExecute('${escapeHtml(id)}')"
        >
          ▶ Ejecutar
        </button>
      `;
    }

    if (status === "running") {
      html += `
        <button
          type="button"
          class="mission-action"
          onclick="window.missionPanelDiagnose('${escapeHtml(id)}')"
        >
          🔎 Diagnosticar
        </button>

        <button
          type="button"
          class="mission-action mission-action-danger"
          onclick="window.missionPanelCancel('${escapeHtml(id)}')"
        >
          ■ Cancelar
        </button>
      `;
    }

    if (
      status === "completed" ||
      status === "failed" ||
      status === "cancelled" ||
      status === "canceled" ||
      status === "rejected"
    ) {
      html += `
        <button
          type="button"
          class="mission-action"
          onclick="window.missionPanelDiagnose('${escapeHtml(id)}')"
        >
          🔎 Diagnosticar
        </button>
      `;
    }

    return html || `
      <span class="mission-no-actions">
        Sin acciones disponibles para este estado.
      </span>
    `;
  }

  /* ============================================================
     SELECT
     ============================================================ */

  async function selectMission(id) {
    if (!id) return;

    selectedMissionId = id;

    await loadMissionDetail(id);
  }

  /* ============================================================
     CREATE
     ============================================================ */

  async function createMission() {
    const elements = getPanelElements();

    if (!elements.goal) return;

    const goal = elements.goal.value.trim();

    if (!goal) {
      notify("Escribe el objetivo de la misión.", "warning");
      elements.goal.focus();
      return;
    }

    const priority = priorityToNumber(
      elements.priority?.value || "normal"
    );

    try {
      const mission = await apiFetch(`${API_BASE}/missions`, {
        method: "POST",
        body: JSON.stringify({
          objective: goal,
          priority
        })
      });

      elements.goal.value = "";

      notify("Misión creada correctamente.", "success");

      await loadMissions();

      const id = missionId(mission);

      if (id) {
        await selectMission(id);
      }
    } catch (error) {
      console.error("Akira mission create error:", error);

      notify(`No se pudo crear la misión: ${error.message}`, "error");
    }
  }

  /* ============================================================
     APPROVE
     ============================================================ */

  async function approveMission(id) {
    if (!id) return;

    try {
      await apiFetch(
        `${API_BASE}/missions/${encodeURIComponent(id)}/approve`,
        {
          method: "POST"
        }
      );

      notify("Misión aprobada.", "success");

      await loadMissions();
      await loadMissionDetail(id);
    } catch (error) {
      console.error("Akira mission approve error:", error);

      notify(`No se pudo aprobar: ${error.message}`, "error");
    }
  }

  /* ============================================================
     REJECT
     ============================================================ */

  async function rejectMission(id) {
    if (!id) return;

    const confirmed = window.confirm(
      "¿Seguro que quieres rechazar esta misión?"
    );

    if (!confirmed) return;

    try {
      await apiFetch(
        `${API_BASE}/missions/${encodeURIComponent(id)}/reject`,
        {
          method: "POST"
        }
      );

      notify("Misión rechazada.", "success");

      await loadMissions();
      await loadMissionDetail(id);
    } catch (error) {
      console.error("Akira mission reject error:", error);

      notify(`No se pudo rechazar: ${error.message}`, "error");
    }
  }

  /* ============================================================
     EXECUTE
     ============================================================ */

  async function executeMission(id) {
    if (!id) return;

    try {
      await apiFetch(
        `${API_BASE}/missions/${encodeURIComponent(id)}/execute`,
        {
          method: "POST"
        }
      );

      notify("Ejecución de misión iniciada.", "success");

      await loadMissions();
      await loadMissionDetail(id);
    } catch (error) {
      console.error("Akira mission execute error:", error);

      notify(`No se pudo ejecutar: ${error.message}`, "error");
    }
  }

  /* ============================================================
     CANCEL
     ============================================================ */

  async function cancelMission(id) {
    if (!id) return;

    const confirmed = window.confirm(
      "¿Seguro que quieres cancelar esta misión?"
    );

    if (!confirmed) return;

    try {
      await apiFetch(
        `${API_BASE}/missions/${encodeURIComponent(id)}/cancel`,
        {
          method: "POST"
        }
      );

      notify("Misión cancelada.", "success");

      stopPolling();

      await loadMissions();
      await loadMissionDetail(id);
    } catch (error) {
      console.error("Akira mission cancel error:", error);

      notify(`No se pudo cancelar: ${error.message}`, "error");
    }
  }

  /* ============================================================
     DIAGNOSE
     ============================================================ */

  async function diagnoseMission(id) {
    const elements = getPanelElements();

    if (!elements.detail || !id) return;

    try {
      elements.detail.innerHTML =
        '<div class="mission-empty">Ejecutando diagnóstico...</div>';

      const data = await apiFetch(
        `${API_BASE}/missions/${encodeURIComponent(id)}/diagnose`
      );

      elements.detail.innerHTML = `
        <div class="mission-diagnose">
          <div class="mission-section-title">
            Diagnóstico de misión #${escapeHtml(id)}
          </div>

          <pre>${escapeHtml(
            JSON.stringify(data, null, 2)
          )}</pre>

          <button
            type="button"
            class="mission-action"
            onclick="window.missionPanelSelect('${escapeHtml(id)}')"
          >
            ← Volver al detalle
          </button>
        </div>
      `;
    } catch (error) {
      console.error("Akira mission diagnose error:", error);

      elements.detail.innerHTML = `
        <div class="mission-error">
          Error en diagnóstico:<br>
          ${escapeHtml(error.message)}
        </div>
      `;
    }
  }

  /* ============================================================
     SELFTEST
     ============================================================ */

  async function runSelftest() {
    const elements = getPanelElements();

    if (!elements.detail) return;

    try {
      elements.detail.innerHTML =
        '<div class="mission-empty">Ejecutando selftest...</div>';

      const data = await apiFetch(
        `${API_BASE}/missions/selftest`
      );

      elements.detail.innerHTML = `
        <div class="mission-diagnose">
          <div class="mission-section-title">
            Selftest del motor de misiones
          </div>

          <pre>${escapeHtml(
            JSON.stringify(data, null, 2)
          )}</pre>

          <button
            type="button"
            class="mission-action"
            onclick="window.missionPanelLoad()"
          >
            ← Volver a misiones
          </button>
        </div>
      `;
    } catch (error) {
      console.error("Akira mission selftest error:", error);

      elements.detail.innerHTML = `
        <div class="mission-error">
          Error ejecutando selftest:<br>
          ${escapeHtml(error.message)}
        </div>
      `;
    }
  }

  /* ============================================================
     POLLING
     ============================================================ */

  function startPollingIfNeeded(mission) {
    stopPolling();

    const status = mission?.status || "";

    if (status !== "running") {
      return;
    }

    pollTimer = window.setInterval(async () => {
      if (!selectedMissionId) return;

      try {
        const progress = await apiFetch(
          `${API_BASE}/missions/${encodeURIComponent(
            selectedMissionId
          )}/progress`
        );

        updateProgressOnly(progress);

        await loadMissionDetail(selectedMissionId);
      } catch (error) {
        console.warn("Mission polling error:", error);
      }
    }, POLL_INTERVAL);
  }

  function stopPolling() {
    if (pollTimer) {
      window.clearInterval(pollTimer);
      pollTimer = null;
    }
  }

  function updateProgressOnly(progress) {
    const value = Number(
      progress?.progress ??
      progress?.percentage ??
      0
    );

    const safeValue = Math.max(
      0,
      Math.min(100, Number.isFinite(value) ? value : 0)
    );

    const fills = document.querySelectorAll(
      ".mission-progress-fill"
    );

    fills.forEach((fill) => {
      fill.style.width = `${safeValue}%`;
    });

    const labels = document.querySelectorAll(
      ".mission-progress-label strong"
    );

    labels.forEach((label) => {
      label.textContent = `${safeValue}%`;
    });
  }

  /* ============================================================
     SEARCH / FILTER
     ============================================================ */

  function bindFilters() {
    const elements = getPanelElements();

    if (elements.search) {
      elements.search.addEventListener("input", () => {
        renderMissionList();
      });
    }

    if (elements.status) {
      elements.status.addEventListener("change", () => {
        loadMissions();
      });
    }
  }

  /* ============================================================
     INITIALIZATION
     ============================================================ */

  function init() {
    bindFilters();

    if ($("missionPanelList")) {
      loadMissions();
    }
  }

  /* ============================================================
     GLOBAL API
     ============================================================ */

  window.missionPanelLoad = loadMissions;
  window.missionPanelSelect = selectMission;
  window.missionPanelCreate = createMission;
  window.missionPanelApprove = approveMission;
  window.missionPanelReject = rejectMission;
  window.missionPanelExecute = executeMission;
  window.missionPanelCancel = cancelMission;
  window.missionPanelDiagnose = diagnoseMission;
  window.missionPanelSelftest = runSelftest;

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
