/* ============================================================
   AKIRA — MISSIONS PANEL
   FASE 10.8 — Panel Unificado de Misiones
   Version: V1.4
   ============================================================ */

(function () {
  "use strict";

  /* ============================================================
     CONFIG
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
    if (
      value === null ||
      value === undefined
    ) {
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

    if (
      typeof window.akiraAuthHeaders ===
      "function"
    ) {
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

  function notify(
    message,
    type = "info"
  ) {
    if (
      typeof window.showToast ===
      "function"
    ) {
      window.showToast(
        message,
        type
      );
      return;
    }

    if (
      typeof window.akToast ===
      "function"
    ) {
      window.akToast(
        message,
        type
      );
      return;
    }

    console.log(
      `[AKIRA ${type}] ${message}`
    );
  }

  function priorityToNumber(
    priority
  ) {
    if (
      priority === undefined ||
      priority === null ||
      priority === ""
    ) {
      return 5;
    }

    const value =
      String(priority)
        .toLowerCase();

    if (value === "low") {
      return 1;
    }

    if (value === "normal") {
      return 5;
    }

    if (value === "high") {
      return 9;
    }

    const numeric =
      Number(priority);

    return Number.isNaN(numeric)
      ? 5
      : numeric;
  }

  function priorityLabel(
    priority
  ) {
    const numeric =
      priorityToNumber(
        priority
      );

    if (numeric >= 8) {
      return "Alta";
    }

    if (numeric <= 3) {
      return "Baja";
    }

    return "Normal";
  }

  function statusLabel(
    status
  ) {
    const labels = {
      pending: "Pendiente",
      created: "Creada",
      planning: "Planificando",
      waiting_approval:
        "Esperando aprobación",
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

  function statusClass(
    status
  ) {
    const map = {
      pending: "pending",
      created: "pending",
      planning: "waiting",
      waiting_approval:
        "waiting",
      approved: "approved",
      running: "running",
      completed: "completed",
      failed: "failed",
      cancelled: "cancelled",
      canceled: "cancelled",
      rejected: "cancelled"
    };

    return (
      map[status] ||
      "pending"
    );
  }

  function missionId(
    mission
  ) {
    return (
      mission?.id ||
      mission?.mission_id ||
      mission?.uuid ||
      ""
    );
  }

  function missionObjective(
    mission
  ) {
    return (
      mission?.objective ||
      mission?.goal ||
      mission?.description ||
      mission?.title ||
      mission?.name ||
      "Misión"
    );
  }

  /* ============================================================
     DOM
     ============================================================ */

  function getPanelElements() {
    return {
      list:
        $("missionPanelList"),

      detail:
        $("missionPanelDetail"),

      search:
        $("missionPanelSearch"),

      status:
        $("missionPanelStatus"),

      goal:
        $("missionPanelGoal"),

      priority:
        $("missionPanelPriority")
    };
  }

  /* ============================================================
     LOAD LIST
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

      let url =
        `${API_BASE()}/missions?limit=50`;

      const status =
        elements.status?.value ||
        "";

      if (status) {
        url +=
          `&status=${encodeURIComponent(
            status
          )}`;
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

      /*
       * Si ya había una misión seleccionada,
       * intentamos mantenerla.
       */
      if (selectedMissionId) {
        const selected =
          missionsCache.find(
            (mission) =>
              String(
                missionId(mission)
              ) ===
              String(
                selectedMissionId
              )
          );

        if (selected) {
          renderMissionSummary(
            selected
          );

          /*
           * Carga completa sin bloquear
           * la lista.
           */
          loadMissionDetail(
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
          ${escapeHtml(
            error.message
          )}
        </div>
      `;
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
            missionObjective(
              mission
            ),
            mission.status,
            mission.priority
          ]
            .join(" ")
            .toLowerCase();

          return text.includes(
            search
          );
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
        .map(
          (mission) => {
            const id =
              missionId(
                mission
              );

            const objective =
              missionObjective(
                mission
              );

            const status =
              mission?.status ||
              "pending";

            const priority =
              priorityLabel(
                mission?.priority
              );

            const selected =
              String(id) ===
              String(
                selectedMissionId
              )
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
                      statusLabel(
                        status
                      )
                    )}
                  </span>

                </div>

                <div class="mission-objective">
                  ${escapeHtml(
                    objective
                  )}
                </div>

                <div class="mission-card-bottom">
                  <span>
                    Prioridad:
                    ${escapeHtml(
                      priority
                    )}
                  </span>
                </div>

              </button>
            `;
          }
        )
        .join("");
  }

  /* ============================================================
     IMMEDIATE SUMMARY
     ============================================================ */

  function renderMissionSummary(
    mission
  ) {
    const elements =
      getPanelElements();

    if (!elements.detail) {
      return;
    }

    const id =
      missionId(mission);

    const objective =
      missionObjective(
        mission
      );

    const status =
      mission?.status ||
      "pending";

    const priority =
      priorityLabel(
        mission?.priority
      );

    elements.detail.innerHTML = `
      <div class="mission-detail-header">

        <div>

          <div class="mission-detail-kicker">
            MISIÓN #${escapeHtml(
              id
            )}
          </div>

          <h3>
            ${escapeHtml(
              objective
            )}
          </h3>

        </div>

        <span class="mission-status mission-status-${statusClass(
          status
        )}">
          ${escapeHtml(
            statusLabel(
              status
            )
          )}
        </span>

      </div>

      <div class="mission-detail-meta">

        <div>
          <span>Prioridad</span>
          <strong>
            ${escapeHtml(
              priority
            )}
          </strong>
        </div>

        <div>
          <span>Estado</span>
          <strong>
            ${escapeHtml(
              statusLabel(
                status
              )
            )}
          </strong>
        </div>

        <div>
          <span>Progreso</span>
          <strong>
            Cargando...
          </strong>
        </div>

      </div>

      <div class="mission-progress-box">

        <div class="mission-progress-label">

          <span>
            Progreso de misión
          </span>

          <strong>
            Cargando...
          </strong>

        </div>

        <div class="mission-progress-track">

          <div
            class="mission-progress-fill"
            style="width:0%"
          ></div>

        </div>

      </div>

      <div class="mission-actions">

        ${renderMissionActions(
          mission
        )}

      </div>

      <div class="mission-tasks">

        <div class="mission-section-title">
          Tareas
        </div>

        <div class="mission-empty">
          Cargando información adicional...
        </div>

      </div>
    `;
  }

  /* ============================================================
     LOAD DETAIL
     ============================================================ */

  async function loadMissionDetail(
    id
  ) {
    const elements =
      getPanelElements();

    if (
      !elements.detail ||
      !id
    ) {
      return;
    }

    /*
     * Protección contra respuestas
     * antiguas pisando una selección nueva.
     */
    const requestId =
      String(id);

    selectedMissionId =
      id;

    const missionFromCache =
      missionsCache.find(
        (mission) =>
          String(
            missionId(mission)
          ) === requestId
      );

    if (missionFromCache) {
      renderMissionSummary(
        missionFromCache
      );
    }

    renderMissionList();

    /*
     * 1. Cargar misión primero.
     * No esperamos progreso ni tareas.
     */
    try {
      const missionResponse =
        await apiFetch(
          `${API_BASE()}/missions/${encodeURIComponent(
            id
          )}`
        );

      /*
       * Si el usuario cambió de misión
       * mientras esperábamos, no seguimos.
       */
      if (
        String(
          selectedMissionId
        ) !== requestId
      ) {
        return;
      }

      const mission =
        missionResponse?.mission ||
        missionResponse;

      /*
       * Actualizar caché.
       */
      const index =
        missionsCache.findIndex(
          (item) =>
            String(
              missionId(item)
            ) === requestId
        );

      if (index >= 0) {
        missionsCache[index] =
          mission;
      }

      /*
       * Mostrar inmediatamente
       * la misión real.
       */
      renderMissionSummary(
        mission
      );

      /*
       * 2. Ahora cargamos progreso
       *    y tareas de forma independiente.
       */
      loadProgress(
        id,
        mission
      );

      loadTasks(
        id,
        mission
      );

      startPollingIfNeeded(
        mission
      );
    } catch (error) {
      if (
        String(
          selectedMissionId
        ) !== requestId
      ) {
        return;
      }

      console.error(
        "Mission detail error:",
        error
      );

      /*
       * No destruimos toda la interfaz.
       */
      elements.detail.innerHTML = `
        <div class="mission-error">
          Error cargando misión:<br>
          ${escapeHtml(
            error.message
          )}
        </div>
      `;
    }
  }

  /* ============================================================
     LOAD PROGRESS
     ============================================================ */

  async function loadProgress(
    id,
    mission
  ) {
    try {
      const response =
        await apiFetch(
          `${API_BASE()}/missions/${encodeURIComponent(
            id
          )}/progress`
        );

      if (
        String(
          selectedMissionId
        ) !== String(id)
      ) {
        return;
      }

      const progress =
        response?.progress ||
        response;

      renderProgress(
        mission,
        progress
      );
    } catch (error) {
      console.warn(
        "Mission progress unavailable:",
        error
      );

      /*
       * El detalle sigue funcionando.
       */
    }
  }

  function renderProgress(
    mission,
    progress
  ) {
    const elements =
      getPanelElements();

    if (
      !elements.detail ||
      String(
        selectedMissionId
      ) !==
      String(
        missionId(mission)
      )
    ) {
      return;
    }

    const value =
      Number(
        progress?.percent ??
        progress?.progress ??
        progress?.percentage ??
        mission?.progress ??
        0
      );

    const safe =
      Math.max(
        0,
        Math.min(
          100,
          Number.isFinite(
            value
          )
            ? value
            : 0
        )
      );

    document
      .querySelectorAll(
        ".mission-progress-fill"
      )
      .forEach(
        (element) => {
          element.style.width =
            `${safe}%`;
        }
      );

    document
      .querySelectorAll(
        ".mission-progress-label strong"
      )
      .forEach(
        (element) => {
          element.textContent =
            `${safe}%`;
        }
      );

    const meta =
      document.querySelector(
        ".mission-detail-meta"
      );

    if (meta) {
      const values =
        meta.querySelectorAll(
          "div strong"
        );

      if (
        values.length >= 3
      ) {
        values[2]
          .textContent =
          `${safe}%`;
      }
    }
  }

  /* ============================================================
     LOAD TASKS
     ============================================================ */

  async function loadTasks(
    id,
    mission
  ) {
    try {
      const response =
        await apiFetch(
          `${API_BASE()}/tasks?mission_id=${encodeURIComponent(
            id
          )}`
        );

      if (
        String(
          selectedMissionId
        ) !== String(id)
      ) {
        return;
      }

      const tasks =
        normalizeTasks(
          response?.tasks ||
          response
        );

      renderTasks(
        mission,
        tasks
      );
    } catch (error) {
      console.warn(
        "Mission tasks unavailable:",
        error
      );

      renderTasks(
        mission,
        []
      );
    }
  }

  function normalizeTasks(
    tasks
  ) {
    if (
      Array.isArray(tasks)
    ) {
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

  function renderTasks(
    mission,
    tasks
  ) {
    const elements =
      getPanelElements();

    if (
      !elements.detail ||
      String(
        selectedMissionId
      ) !==
      String(
        missionId(mission)
      )
    ) {
      return;
    }

    const container =
      elements.detail.querySelector(
        ".mission-tasks"
      );

    if (!container) {
      return;
    }

    if (!tasks.length) {
      container.innerHTML = `
        <div class="mission-section-title">
          Tareas
        </div>

        <div class="mission-empty">
          No hay tareas registradas para esta misión.
        </div>
      `;

      return;
    }

    container.innerHTML = `
      <div class="mission-section-title">
        Tareas
      </div>

      ${tasks
        .map(
          (task) => {
            const status =
              task?.status ||
              task?.state ||
              "pending";

            const name =
              task?.name ||
              task?.title ||
              task?.description ||
              `Tarea ${
                task?.id || ""
              }`;

            return `
              <div class="mission-task-row">

                <div>

                  <strong>
                    ${escapeHtml(
                      name
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
                    task?.error
                      ? `
                        <small>
                          Error:
                          ${escapeHtml(
                            typeof task.error ===
                            "string"
                              ? task.error
                              : JSON.stringify(
                                  task.error
                                )
                          )}
                        </small>
                      `
                      : ""
                  }

                </div>

                <span class="mission-status mission-status-${statusClass(
                  status
                )}">
                  ${escapeHtml(
                    statusLabel(
                      status
                    )
                  )}
                </span>

              </div>
            `;
          }
        )
        .join("")}
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
      mission?.status ||
      "";

    let html = "";

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
          Sin acciones disponibles para este estado.
        </span>
      `
    );
  }

  /* ============================================================
     SELECT MISSION
     ============================================================ */

  async function selectMission(
    id
  ) {
    if (!id) {
      return;
    }

    /*
     * Cambio inmediato de selección.
     */
    selectedMissionId =
      String(id);

    const mission =
      missionsCache.find(
        (item) =>
          String(
            missionId(item)
          ) ===
          String(id)
      );

    if (mission) {
      renderMissionSummary(
        mission
      );
    }

    renderMissionList();

    /*
     * Carga de datos reales
     * sin bloquear el cambio visual.
     */
    await loadMissionDetail(
      id
    );
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
              objective:
                goal,
              priority
            })
          }
        );

      const mission =
        response?.mission ||
        response;

      const id =
        missionId(mission);

      elements.goal.value =
        "";

      notify(
        "Misión creada correctamente.",
        "success"
      );

      if (id) {
        const index =
          missionsCache.findIndex(
            (item) =>
              String(
                missionId(item)
              ) ===
              String(id)
          );

        if (index >= 0) {
          missionsCache[index] =
            mission;
        } else {
          missionsCache.unshift(
            mission
          );
        }

        selectedMissionId =
          String(id);

        renderMissionList();

        renderMissionSummary(
          mission
        );

        /*
         * Sincronización posterior.
         */
        setTimeout(
          () => {
            loadMissions();
          },
          700
        );
      } else {
        loadMissions();
      }
    } catch (error) {
      console.error(
        "Akira create mission error:",
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

  async function approveMission(
    id
  ) {
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

      const mission =
        response?.mission;

      if (mission) {
        const index =
          missionsCache.findIndex(
            (item) =>
              String(
                missionId(item)
              ) ===
              String(id)
          );

        if (index >= 0) {
          missionsCache[index] =
            mission;
        }

        renderMissionList();
        renderMissionSummary(
          mission
        );
      }

      notify(
        "Misión aprobada. Ahora está en ejecución.",
        "success"
      );

      /*
       * Sincronizar sin obligar
       * al usuario a pulsar Actualizar.
       */
      setTimeout(
        () => {
          loadMissions();
        },
        300
      );

      await loadMissionDetail(
        id
      );
    } catch (error) {
      console.error(
        "Akira approve error:",
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

  async function rejectMission(
    id
  ) {
    if (!id) {
      return;
    }

    if (
      !window.confirm(
        "¿Seguro que quieres rechazar esta misión?"
      )
    ) {
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

      const mission =
        response?.mission;

      if (mission) {
        const index =
          missionsCache.findIndex(
            (item) =>
              String(
                missionId(item)
              ) ===
              String(id)
          );

        if (index >= 0) {
          missionsCache[index] =
            mission;
        }

        renderMissionList();
        renderMissionSummary(
          mission
        );
      }

      notify(
        "Misión rechazada.",
        "success"
      );

      setTimeout(
        () => {
          loadMissions();
        },
        300
      );
    } catch (error) {
      console.error(
        "Akira reject error:",
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

  async function executeMission(
    id
  ) {
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

      const mission =
        response?.mission;

      if (mission) {
        const index =
          missionsCache.findIndex(
            (item) =>
              String(
                missionId(item)
              ) ===
              String(id)
          );

        if (index >= 0) {
          missionsCache[index] =
            mission;
        }

        renderMissionList();
        renderMissionSummary(
          mission
        );
      }

      notify(
        "Ejecución iniciada.",
        "success"
      );

      await loadMissionDetail(
        id
      );

      setTimeout(
        () => {
          loadMissions();
        },
        300
      );
    } catch (error) {
      console.error(
        "Akira execute error:",
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

  async function cancelMission(
    id
  ) {
    if (!id) {
      return;
    }

    if (
      !window.confirm(
        "¿Seguro que quieres cancelar esta misión?"
      )
    ) {
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

      stopPolling();

      const mission =
        response?.mission;

      if (mission) {
        const index =
          missionsCache.findIndex(
            (item) =>
              String(
                missionId(item)
              ) ===
              String(id)
          );

        if (index >= 0) {
          missionsCache[index] =
            mission;
        }

        renderMissionList();
        renderMissionSummary(
          mission
        );
      }

      notify(
        "Misión cancelada.",
        "success"
      );

      setTimeout(
        () => {
          loadMissions();
        },
        300
      );
    } catch (error) {
      console.error(
        "Akira cancel error:",
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

  async function diagnoseMission(
    id
  ) {
    const elements =
      getPanelElements();

    if (
      !elements.detail ||
      !id
    ) {
      return;
    }

    const previous =
      elements.detail.innerHTML;

    elements.detail.innerHTML = `
      <div class="mission-empty">
        Ejecutando diagnóstico...
      </div>
    `;

    try {
      const response =
        await apiFetch(
          `${API_BASE()}/missions/${encodeURIComponent(
            id
          )}/diagnose`
        );

      if (
        String(
          selectedMissionId
        ) !== String(id)
      ) {
        return;
      }

      elements.detail.innerHTML = `
        <div class="mission-diagnose">

          <div class="mission-section-title">
            Diagnóstico de misión
          </div>

          <pre>${escapeHtml(
            JSON.stringify(
              response,
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
        "Akira diagnose error:",
        error
      );

      /*
       * No dejamos la pantalla vacía.
       */
      elements.detail.innerHTML = `
        <div class="mission-error">

          Error en diagnóstico:<br>

          ${escapeHtml(
            error.message
          )}

          <br><br>

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

    elements.detail.innerHTML = `
      <div class="mission-empty">
        Ejecutando selftest...
      </div>
    `;

    try {
      const response =
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
              response,
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
      mission?.status ||
      "";

    if (
      status !== "running"
    ) {
      return;
    }

    pollTimer =
      window.setInterval(
        async () => {
          if (
            !selectedMissionId
          ) {
            return;
          }

          const id =
            selectedMissionId;

          try {
            await loadProgressOnly(
              id
            );

            /*
             * Refrescar estado de misión
             * sin destruir selección.
             */
            const response =
              await apiFetch(
                `${API_BASE()}/missions/${encodeURIComponent(
                  id
                )}`
              );

            if (
              String(
                selectedMissionId
              ) !== String(id)
            ) {
              return;
            }

            const updated =
              response?.mission ||
              response;

            const index =
              missionsCache.findIndex(
                (item) =>
                  String(
                    missionId(item)
                  ) ===
                  String(id)
              );

            if (index >= 0) {
              missionsCache[index] =
                updated;
            }

            renderMissionList();

            /*
             * Actualizar botones/estado
             * sin reconstruir toda la pantalla.
             */
            updateMissionHeader(
              updated
            );

            if (
              updated?.status !==
              "running"
            ) {
              stopPolling();

              loadTasks(
                id,
                updated
              );
            }
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

  async function loadProgressOnly(
    id
  ) {
    try {
      const response =
        await apiFetch(
          `${API_BASE()}/missions/${encodeURIComponent(
            id
          )}/progress`
        );

      if (
        String(
          selectedMissionId
        ) !== String(id)
      ) {
        return;
      }

      const progress =
        response?.progress ||
        response;

      renderProgressValue(
        progress
      );
    } catch (error) {
      console.warn(
        "Progress polling error:",
        error
      );
    }
  }

  function renderProgressValue(
    progress
  ) {
    const value =
      Number(
        progress?.percent ??
        progress?.progress ??
        progress?.percentage ??
        0
      );

    const safe =
      Math.max(
        0,
        Math.min(
          100,
          Number.isFinite(
            value
          )
            ? value
            : 0
        )
      );

    document
      .querySelectorAll(
        ".mission-progress-fill"
      )
      .forEach(
        (element) => {
          element.style.width =
            `${safe}%`;
        }
      );

    document
      .querySelectorAll(
        ".mission-progress-label strong"
      )
      .forEach(
        (element) => {
          element.textContent =
            `${safe}%`;
        }
      );

    const meta =
      document.querySelector(
        ".mission-detail-meta"
      );

    if (meta) {
      const values =
        meta.querySelectorAll(
          "div strong"
        );

      if (
        values.length >= 3
      ) {
        values[2]
          .textContent =
          `${safe}%`;
      }
    }
  }

  function updateMissionHeader(
    mission
  ) {
    const elements =
      getPanelElements();

    if (
      !elements.detail
    ) {
      return;
    }

    const status =
      mission?.status ||
      "pending";

    const badge =
      elements.detail.querySelector(
        ".mission-detail-header .mission-status"
      );

    if (badge) {
      badge.className =
        `mission-status mission-status-${statusClass(
          status
        )}`;

      badge.textContent =
        statusLabel(
          status
        );
    }

    const values =
      elements.detail.querySelectorAll(
        ".mission-detail-meta div strong"
      );

    if (
      values.length >= 2
    ) {
      values[1].textContent =
        statusLabel(
          status
        );
    }

    const actions =
      elements.detail.querySelector(
        ".mission-actions"
      );

    if (actions) {
      actions.innerHTML =
        renderMissionActions(
          mission
        );
    }
  }

  function stopPolling() {
    if (pollTimer) {
      window.clearInterval(
        pollTimer
      );

      pollTimer = null;
    }
  }

  /* ============================================================
     FILTERS
     ============================================================ */

  function bindFilters() {
    const elements =
      getPanelElements();

    if (elements.search) {
      elements.search.addEventListener(
        "input",
        renderMissionList
      );
    }

    if (elements.status) {
      elements.status.addEventListener(
        "change",
        loadMissions
      );
    }
  }

  /* ============================================================
     INIT
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
