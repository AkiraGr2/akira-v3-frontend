/* ============================================================
   AKIRA — MISSIONS PANEL
   FASE 10.8 — Panel Unificado de Misiones
   Version: V1.3
   ============================================================ */

(function () {
  "use strict";

  /* ============================================================
     BACKEND
     ============================================================ */

  const BACKEND = () =>
    localStorage.getItem("akira_backend_url") ||
    "https://akira-empresa.onrender.com";

  const API_BASE = () =>
    BACKEND() + "/api/v8";

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
    if (value === null || value === undefined) {
      return "";
    }

    return String(value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  function getToken() {
    return (
      localStorage.getItem("akira_session_token") ||
      localStorage.getItem("akira_token") ||
      localStorage.getItem("token") ||
      localStorage.getItem("access_token") ||
      ""
    );
  }

  async function apiFetch(url, options = {}) {
    let headers = {
      "Content-Type": "application/json"
    };

    if (typeof window.akiraAuthHeaders === "function") {
      try {
        headers = Object.assign(
          headers,
          window.akiraAuthHeaders() || {}
        );
      } catch (_) {}
    }

    const token = getToken();

    if (
      token &&
      !headers.Authorization &&
      !headers.authorization
    ) {
      headers.Authorization =
        token.startsWith("Bearer ")
          ? token
          : `Bearer ${token}`;
    }

    headers = Object.assign(
      headers,
      options.headers || {}
    );

    const response = await fetch(
      url,
      Object.assign(
        {},
        options,
        {
          headers,
          cache: "no-store"
        }
      )
    );

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
        data?.reason ||
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

    console.log(
      `[AKIRA ${type}] ${message}`
    );
  }

  function priorityToNumber(priority) {
    if (
      priority === undefined ||
      priority === null ||
      priority === ""
    ) {
      return 5;
    }

    const value =
      String(priority).toLowerCase();

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
    const numeric =
      priorityToNumber(priority);

    if (numeric >= 8) {
      return "Alta";
    }

    if (numeric <= 3) {
      return "Baja";
    }

    return "Normal";
  }

  function statusLabel(status) {
    const labels = {
      pending: "Pendiente",
      created: "Creada",
      planning: "Planificando",
      waiting_approval: "Esperando aprobación",
      approved: "Aprobada",
      running: "En ejecución",
      completed: "Completada",
      failed: "Fallida",
      cancelled: "Cancelada",
      canceled: "Cancelada",
      rejected: "Rechazada"
    };

    return (
      labels[status] ||
      status ||
      "Desconocido"
    );
  }

  function statusClass(status) {
    const map = {
      pending: "pending",
      created: "pending",
      planning: "waiting",
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
      mission?.title ||
      mission?.name ||
      `Misión ${mission?.id || ""}`
    );
  }

  function missionId(mission) {
    return (
      mission?.id ||
      mission?.mission_id ||
      mission?.uuid ||
      ""
    );
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
    const elements =
      getPanelElements();

    if (!elements.list) {
      return;
    }

    try {
      elements.list.innerHTML =
        '<div class="mission-empty">Cargando misiones...</div>';

      const status =
        elements.status?.value || "";

      let url =
        `${API_BASE()}/missions?limit=50`;

      if (status) {
        url +=
          `&status=${encodeURIComponent(status)}`;
      }

      const response =
        await apiFetch(url);

      missionsCache =
        Array.isArray(response)
          ? response
          : response?.missions ||
            response?.items ||
            response?.results ||
            [];

      renderMissionList();

      if (selectedMissionId) {
        const exists =
          missionsCache.some(
            (mission) =>
              String(
                missionId(mission)
              ) ===
              String(selectedMissionId)
          );

        if (exists) {
          await loadMissionDetail(
            selectedMissionId
          );
        }
      }
    } catch (error) {
      console.error(
        "Akira missions load error:",
        error
      );

      elements.list.innerHTML = `
        <div class="mission-error">
          Error cargando misiones:<br>
          ${escapeHtml(error.message)}
        </div>
      `;

      notify(
        `Error cargando misiones: ${error.message}`,
        "error"
      );
    }
  }

  /* ============================================================
     RENDER LIST
     ============================================================ */

  function renderMissionList() {
    const elements =
      getPanelElements();

    if (!elements.list) {
      return;
    }

    const search =
      (
        elements.search?.value ||
        ""
      )
        .trim()
        .toLowerCase();

    const filtered =
      missionsCache.filter(
        (mission) => {
          if (!search) {
            return true;
          }

          const text = [
            missionId(mission),
            missionObjective(mission),
            mission.status,
            mission.priority
          ]
            .join(" ")
            .toLowerCase();

          return text.includes(search);
        }
      );

    if (!filtered.length) {
      elements.list.innerHTML = `
        <div class="mission-empty">
          No hay misiones para mostrar.
        </div>
      `;

      return;
    }

    elements.list.innerHTML =
      filtered
        .map((mission) => {
          const id =
            missionId(mission);

          const objective =
            missionObjective(mission);

          const status =
            mission.status ||
            "pending";

          const priority =
            priorityLabel(
              mission.priority
            );

          const selected =
            String(id) ===
            String(selectedMissionId)
              ? " selected"
              : "";

          return `
            <button
              type="button"
              class="mission-card${selected}"
              onclick="window.missionPanelSelect('${escapeHtml(
                id
              )}')"
            >

              <div class="mission-card-top">

                <span class="mission-id">
                  #${escapeHtml(id)}
                </span>

                <span class="mission-status mission-status-${statusClass(
                  status
                )}">
                  ${escapeHtml(
                    statusLabel(status)
                  )}
                </span>

              </div>

              <div class="mission-objective">
                ${escapeHtml(objective)}
              </div>

              <div class="mission-card-bottom">
                <span>
                  Prioridad:
                  ${escapeHtml(priority)}
                </span>
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
    const elements =
      getPanelElements();

    if (
      !elements.detail ||
      !id
    ) {
      return;
    }

    selectedMissionId = id;

    elements.detail.innerHTML =
      '<div class="mission-empty">Cargando detalle...</div>';

    renderMissionList();

    try {
      const [
        missionResponse,
        progressResponse,
        tasksResponse
      ] = await Promise.all([
        apiFetch(
          `${API_BASE()}/missions/${encodeURIComponent(
            id
          )}`
        ),

        apiFetch(
          `${API_BASE()}/missions/${encodeURIComponent(
            id
          )}/progress`
        ),

        apiFetch(
          `${API_BASE()}/tasks?mission_id=${encodeURIComponent(
            id
          )}`
        )
      ]);

      /*
       * CORRECCIÓN IMPORTANTE:
       *
       * El backend devuelve:
       *
       * {
       *   ok: true,
       *   mission: {...}
       * }
       */

      const mission =
        missionResponse?.mission ||
        missionResponse;

      /*
       * El backend devuelve:
       *
       * {
       *   ok: true,
       *   mission: {...},
       *   progress: {...}
       * }
       */

      const progress =
        progressResponse?.progress ||
        progressResponse;

      /*
       * El endpoint de tareas puede devolver:
       *
       * {
       *   ok: true,
       *   tasks: [...]
       * }
       */

      const tasks =
        tasksResponse?.tasks ||
        tasksResponse;

      renderMissionDetail(
        mission,
        progress,
        tasks
      );

      startPollingIfNeeded(
        mission
      );
    } catch (error) {
      console.error(
        "Akira mission detail error:",
        error
      );

      elements.detail.innerHTML = `
        <div class="mission-error">
          Error cargando misión:<br>
          ${escapeHtml(error.message)}
        </div>
      `;

      notify(
        `Error cargando misión: ${error.message}`,
        "error"
      );
    }
  }

  function normalizeTasks(tasks) {
    if (Array.isArray(tasks)) {
      return tasks;
    }

    if (
      Array.isArray(
        tasks?.tasks
      )
    ) {
      return tasks.tasks;
    }

    if (
      Array.isArray(
        tasks?.items
      )
    ) {
      return tasks.items;
    }

    if (
      Array.isArray(
        tasks?.results
      )
    ) {
      return tasks.results;
    }

    return [];
  }

  function renderMissionDetail(
    mission,
    progress,
    tasks
  ) {
    const elements =
      getPanelElements();

    if (!elements.detail) {
      return;
    }

    const id =
      missionId(mission);

    const objective =
      missionObjective(mission);

    const status =
      mission?.status ||
      "pending";

    const priority =
      priorityLabel(
        mission?.priority
      );

    const progressValue =
      Number(
        progress?.percent ??
        progress?.progress ??
        progress?.percentage ??
        mission?.progress ??
        0
      );

    const safeProgress =
      Math.max(
        0,
        Math.min(
          100,
          Number.isFinite(
            progressValue
          )
            ? progressValue
            : 0
        )
      );

    const taskList =
      normalizeTasks(tasks);

    /*
     * Buscar información de error
     * disponible en la misión.
     */

    const result =
      mission?.result || {};

    const errorInfo =
      mission?.error ||
      result?.error ||
      result?.reason ||
      result?.detail ||
      mission?.failure_reason ||
      "";

    const errorText =
      typeof errorInfo === "string"
        ? errorInfo
        : JSON.stringify(
            errorInfo
          );

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

        <span class="mission-status mission-status-${statusClass(
          status
        )}">
          ${escapeHtml(
            statusLabel(status)
          )}
        </span>

      </div>

      <div class="mission-detail-meta">

        <div>
          <span>Prioridad</span>
          <strong>
            ${escapeHtml(priority)}
          </strong>
        </div>

        <div>
          <span>Estado</span>
          <strong>
            ${escapeHtml(
              statusLabel(status)
            )}
          </strong>
        </div>

        <div>
          <span>Progreso</span>
          <strong>
            ${safeProgress}%
          </strong>
        </div>

      </div>

      <div class="mission-progress-box">

        <div class="mission-progress-label">

          <span>
            Progreso de misión
          </span>

          <strong>
            ${safeProgress}%
          </strong>

        </div>

        <div class="mission-progress-track">

          <div
            class="mission-progress-fill"
            style="width:${safeProgress}%"
          ></div>

        </div>

      </div>

      ${
        status === "failed" &&
        errorText
          ? `
            <div class="mission-error">
              <strong>
                Motivo del fallo
              </strong>

              <div>
                ${escapeHtml(
                  errorText
                )}
              </div>
            </div>
          `
          : ""
      }

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

                  const taskError =
                    task?.error || "";

                  return `
                    <div class="mission-task-row">

                      <div>

                        <strong>
                          ${escapeHtml(
                            taskName
                          )}
                        </strong>

                        ${
                          task?.id
                            ? `
                              <small>
                                ID:
                                ${escapeHtml(
                                  task.id
                                )}
                              </small>
                            `
                            : ""
                        }

                        ${
                          taskError
                            ? `
                              <small>
                                Error:
                                ${escapeHtml(
                                  typeof taskError ===
                                  "string"
                                    ? taskError
                                    : JSON.stringify(
                                        taskError
                                      )
                                )}
                              </small>
                            `
                            : ""
                        }

                      </div>

                      <span class="mission-status mission-status-${statusClass(
                        taskStatus
                      )}">
                        ${escapeHtml(
                          statusLabel(
                            taskStatus
                          )
                        )}
                      </span>

                    </div>
                  `;
                })
                .join("")
            : `
              <div class="mission-empty">
                No hay tareas registradas
                para esta misión.
              </div>
            `
        }

      </div>
    `;
  }

  /* ============================================================
     ACTIONS
     ============================================================ */

  function renderMissionActions(
    mission
  ) {
    const id =
      missionId(mission);

    const status =
      mission?.status || "";

    let html = "";

    /*
     * waiting_approval
     * → Aprobar / Rechazar
     */

    if (
      status ===
      "waiting_approval"
    ) {
      html += `
        <button
          type="button"
          class="mission-action mission-action-primary"
          onclick="window.missionPanelApprove('${escapeHtml(
            id
          )}')"
        >
          ✓ Aprobar
        </button>

        <button
          type="button"
          class="mission-action"
          onclick="window.missionPanelReject('${escapeHtml(
            id
          )}')"
        >
          ✕ Rechazar
        </button>
      `;
    }

    /*
     * running
     * → Ejecutar / Diagnosticar / Cancelar
     *
     * Este es el flujo que utiliza
     * actualmente el backend de Akira.
     */

    if (
      status === "running"
    ) {
      html += `
        <button
          type="button"
          class="mission-action mission-action-primary"
          onclick="window.missionPanelExecute('${escapeHtml(
            id
          )}')"
        >
          ▶ Ejecutar
        </button>

        <button
          type="button"
          class="mission-action"
          onclick="window.missionPanelDiagnose('${escapeHtml(
            id
          )}')"
        >
          🔎 Diagnosticar
        </button>

        <button
          type="button"
          class="mission-action mission-action-danger"
          onclick="window.missionPanelCancel('${escapeHtml(
            id
          )}')"
        >
          ■ Cancelar
        </button>
      `;
    }

    /*
     * Compatibilidad por si el backend
     * devuelve approved.
     */

    if (
      status === "approved"
    ) {
      html += `
        <button
          type="button"
          class="mission-action mission-action-primary"
          onclick="window.missionPanelExecute('${escapeHtml(
            id
          )}')"
        >
          ▶ Ejecutar
        </button>
      `;
    }

    /*
     * Estados terminales
     */

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
          onclick="window.missionPanelDiagnose('${escapeHtml(
            id
          )}')"
        >
          🔎 Diagnosticar
        </button>
      `;
    }

    return (
      html ||
      `
        <span class="mission-no-actions">
          Sin acciones disponibles
          para este estado.
        </span>
      `
    );
  }

  /* ============================================================
     SELECT
     ============================================================ */

  async function selectMission(id) {
    if (!id) {
      return;
    }

    selectedMissionId = id;

    await loadMissionDetail(id);
  }

  /* ============================================================
     CREATE
     ============================================================ */

  async function createMission() {
    const elements =
      getPanelElements();

    if (!elements.goal) {
      return;
    }

    const goal =
      elements.goal.value.trim();

    if (!goal) {
      notify(
        "Escribe el objetivo de la misión.",
        "warning"
      );

      elements.goal.focus();

      return;
    }

    const priority =
      priorityToNumber(
        elements.priority?.value ||
        "normal"
      );

    try {
      const response =
        await apiFetch(
          `${API_BASE()}/missions`,
          {
            method: "POST",

            body: JSON.stringify({
              objective: goal,
              priority
            })
          }
        );

      /*
       * Backend:
       * {
       *   ok: true,
       *   mission: {...},
       *   plan: {...},
       *   model: ...
       * }
       */

      const createdMission =
        response?.mission ||
        response;

      const id =
        missionId(createdMission);

      elements.goal.value = "";

      notify(
        "Misión creada correctamente.",
        "success"
      );

      /*
       * Mostrar inmediatamente
       * la misión creada.
       */

      if (id) {
        const existingIndex =
          missionsCache.findIndex(
            (mission) =>
              String(
                missionId(mission)
              ) === String(id)
          );

        if (existingIndex >= 0) {
          missionsCache[
            existingIndex
          ] = createdMission;
        } else {
          missionsCache.unshift(
            createdMission
          );
        }

        selectedMissionId = id;

        renderMissionList();

        /*
         * Esperamos un momento para permitir
         * que el backend termine de persistir
         * la transición de planificación.
         */
        await new Promise(
          (resolve) =>
            setTimeout(
              resolve,
              500
            )
        );

        await loadMissions();

        await loadMissionDetail(
          id
        );
      } else {
        await loadMissions();
      }
    } catch (error) {
      console.error(
        "Akira mission create error:",
        error
      );

      notify(
        `No se pudo crear la misión: ${error.message}`,
        "error"
      );
    }
  }

  /* ============================================================
     APPROVE
     ============================================================ */

  async function approveMission(id) {
    if (!id) {
      return;
    }

    try {
      const response =
        await apiFetch(
          `${API_BASE()}/missions/${encodeURIComponent(
            id
          )}/approve`,
          {
            method: "POST"
          }
        );

      notify(
        "Misión aprobada. Pasó a ejecución.",
        "success"
      );

      const updatedMission =
        response?.mission;

      if (updatedMission) {
        const index =
          missionsCache.findIndex(
            (mission) =>
              String(
                missionId(mission)
              ) === String(id)
          );

        if (index >= 0) {
          missionsCache[index] =
            updatedMission;
        } else {
          missionsCache.unshift(
            updatedMission
          );
        }

        renderMissionList();
      }

      await loadMissions();
      await loadMissionDetail(id);
    } catch (error) {
      console.error(
        "Akira mission approve error:",
        error
      );

      notify(
        `No se pudo aprobar: ${error.message}`,
        "error"
      );
    }
  }

  /* ============================================================
     REJECT
     ============================================================ */

  async function rejectMission(id) {
    if (!id) {
      return;
    }

    const confirmed =
      window.confirm(
        "¿Seguro que quieres rechazar esta misión?"
      );

    if (!confirmed) {
      return;
    }

    try {
      const response =
        await apiFetch(
          `${API_BASE()}/missions/${encodeURIComponent(
            id
          )}/reject`,
          {
            method: "POST"
          }
        );

      notify(
        "Misión rechazada.",
        "success"
      );

      const updatedMission =
        response?.mission;

      if (updatedMission) {
        const index =
          missionsCache.findIndex(
            (mission) =>
              String(
                missionId(mission)
              ) === String(id)
          );

        if (index >= 0) {
          missionsCache[index] =
            updatedMission;
        }

        renderMissionList();
      }

      await loadMissions();
      await loadMissionDetail(id);
    } catch (error) {
      console.error(
        "Akira mission reject error:",
        error
      );

      notify(
        `No se pudo rechazar: ${error.message}`,
        "error"
      );
    }
  }

  /* ============================================================
     EXECUTE
     ============================================================ */

  async function executeMission(id) {
    if (!id) {
      return;
    }

    try {
      const response =
        await apiFetch(
          `${API_BASE()}/missions/${encodeURIComponent(
            id
          )}/execute`,
          {
            method: "POST"
          }
        );

      notify(
        "Ejecución de misión iniciada.",
        "success"
      );

      const updatedMission =
        response?.mission;

      if (updatedMission) {
        const index =
          missionsCache.findIndex(
            (mission) =>
              String(
                missionId(mission)
              ) === String(id)
          );

        if (index >= 0) {
          missionsCache[index] =
            updatedMission;
        }

        renderMissionList();
      }

      await loadMissions();
      await loadMissionDetail(id);
    } catch (error) {
      console.error(
        "Akira mission execute error:",
        error
      );

      notify(
        `No se pudo ejecutar: ${error.message}`,
        "error"
      );
    }
  }

  /* ============================================================
     CANCEL
     ============================================================ */

  async function cancelMission(id) {
    if (!id) {
      return;
    }

    const confirmed =
      window.confirm(
        "¿Seguro que quieres cancelar esta misión?"
      );

    if (!confirmed) {
      return;
    }

    try {
      const response =
        await apiFetch(
          `${API_BASE()}/missions/${encodeURIComponent(
            id
          )}/cancel`,
          {
            method: "POST"
          }
        );

      notify(
        "Misión cancelada.",
        "success"
      );

      stopPolling();

      const updatedMission =
        response?.mission;

      if (updatedMission) {
        const index =
          missionsCache.findIndex(
            (mission) =>
              String(
                missionId(mission)
              ) === String(id)
          );

        if (index >= 0) {
          missionsCache[index] =
            updatedMission;
        }

        renderMissionList();
      }

      await loadMissions();
      await loadMissionDetail(id);
    } catch (error) {
      console.error(
        "Akira mission cancel error:",
        error
      );

      notify(
        `No se pudo cancelar: ${error.message}`,
        "error"
      );
    }
  }

  /* ============================================================
     DIAGNOSE
     ============================================================ */

  async function diagnoseMission(id) {
    const elements =
      getPanelElements();

    if (
      !elements.detail ||
      !id
    ) {
      return;
    }

    try {
      elements.detail.innerHTML =
        '<div class="mission-empty">Ejecutando diagnóstico...</div>';

      const data =
        await apiFetch(
          `${API_BASE()}/missions/${encodeURIComponent(
            id
          )}/diagnose`
        );

      elements.detail.innerHTML = `
        <div class="mission-diagnose">

          <div class="mission-section-title">
            Diagnóstico de misión #${escapeHtml(
              id
            )}
          </div>

          <pre>${escapeHtml(
            JSON.stringify(
              data,
              null,
              2
            )
          )}</pre>

          <button
            type="button"
            class="mission-action"
            onclick="window.missionPanelSelect('${escapeHtml(
              id
            )}')"
          >
            ← Volver al detalle
          </button>

        </div>
      `;
    } catch (error) {
      console.error(
        "Akira mission diagnose error:",
        error
      );

      elements.detail.innerHTML = `
        <div class="mission-error">
          Error en diagnóstico:<br>
          ${escapeHtml(
            error.message
          )}
        </div>
      `;
    }
  }

  /* ============================================================
     SELFTEST
     ============================================================ */

  async function runSelftest() {
    const elements =
      getPanelElements();

    if (!elements.detail) {
      return;
    }

    try {
      elements.detail.innerHTML =
        '<div class="mission-empty">Ejecutando selftest...</div>';

      const data =
        await apiFetch(
          `${API_BASE()}/missions/selftest`
        );

      elements.detail.innerHTML = `
        <div class="mission-diagnose">

          <div class="mission-section-title">
            Selftest del motor de misiones
          </div>

          <pre>${escapeHtml(
            JSON.stringify(
              data,
              null,
              2
            )
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
      console.error(
        "Akira mission selftest error:",
        error
      );

      elements.detail.innerHTML = `
        <div class="mission-error">
          Error ejecutando selftest:<br>
          ${escapeHtml(
            error.message
          )}
        </div>
      `;
    }
  }

  /* ============================================================
     POLLING
     ============================================================ */

  function startPollingIfNeeded(
    mission
  ) {
    stopPolling();

    const status =
      mission?.status || "";

    if (
      status !== "running"
    ) {
      return;
    }

    pollTimer =
      window.setInterval(
        async () => {
          if (!selectedMissionId) {
            return;
          }

          try {
            const progressResponse =
              await apiFetch(
                `${API_BASE()}/missions/${encodeURIComponent(
                  selectedMissionId
                )}/progress`
              );

            const progress =
              progressResponse?.progress ||
              progressResponse;

            updateProgressOnly(
              progress
            );

            /*
             * Refresca también el estado
             * de la misión.
             */
            await loadMissionDetail(
              selectedMissionId
            );
          } catch (error) {
            console.warn(
              "Mission polling error:",
              error
            );
          }
        },
        POLL_INTERVAL
      );
  }

  function stopPolling() {
    if (pollTimer) {
      window.clearInterval(
        pollTimer
      );

      pollTimer = null;
    }
  }

  function updateProgressOnly(
    progress
  ) {
    const value =
      Number(
        progress?.percent ??
        progress?.progress ??
        progress?.percentage ??
        0
      );

    const safeValue =
      Math.max(
        0,
        Math.min(
          100,
          Number.isFinite(value)
            ? value
            : 0
        )
      );

    const fills =
      document.querySelectorAll(
        ".mission-progress-fill"
      );

    fills.forEach(
      (fill) => {
        fill.style.width =
          `${safeValue}%`;
      }
    );

    const labels =
      document.querySelectorAll(
        ".mission-progress-label strong"
      );

    labels.forEach(
      (label) => {
        label.textContent =
          `${safeValue}%`;
      }
    );
  }

  /* ============================================================
     SEARCH / FILTER
     ============================================================ */

  function bindFilters() {
    const elements =
      getPanelElements();

    if (elements.search) {
      elements.search.addEventListener(
        "input",
        () => {
          renderMissionList();
        }
      );
    }

    if (elements.status) {
      elements.status.addEventListener(
        "change",
        () => {
          loadMissions();
        }
      );
    }
  }

  /* ============================================================
     INITIALIZATION
     ============================================================ */

  function init() {
    bindFilters();

    if (
      $("missionPanelList")
    ) {
      loadMissions();
    }
  }

  /* ============================================================
     GLOBAL API
     ============================================================ */

  window.missionPanelLoad =
    loadMissions;

  window.missionPanelSelect =
    selectMission;

  window.missionPanelCreate =
    createMission;

  window.missionPanelApprove =
    approveMission;

  window.missionPanelReject =
    rejectMission;

  window.missionPanelExecute =
    executeMission;

  window.missionPanelCancel =
    cancelMission;

  window.missionPanelDiagnose =
    diagnoseMission;

  window.missionPanelSelftest =
    runSelftest;

  if (
    document.readyState ===
    "loading"
  ) {
    document.addEventListener(
      "DOMContentLoaded",
      init
    );
  } else {
    init();
  }

})();
