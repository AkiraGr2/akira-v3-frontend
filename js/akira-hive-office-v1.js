/* AKIRA OFFICE — F15 Hive owner-scoped panel.
 * This module is intentionally separate from the 2.5D scene/runtime.
 * Share authorization changes knowledge privacy only; it never propagates data.
 */
(function () {
  "use strict";

  const BACKEND_FALLBACK = "https://akira-empresa.onrender.com";
  const CAPABILITY_NAME = "hive_knowledge_sharing_v1";
  let initialized = false;
  let loading = false;
  let capabilityAvailable = false;
  let knowledgeRows = [];
  let exportRows = [];
  let noticeText = "Marcar SHAREABLE solo autoriza una futura exportación. Esta versión no propaga contenido a otros propietarios.";
  let mutationInProgress = false;

  const el = id => document.getElementById(id);

  function backendUrl() {
    try {
      return localStorage.getItem("akira_backend_url") || BACKEND_FALLBACK;
    } catch (_) {
      return BACKEND_FALLBACK;
    }
  }

  function authHeaders() {
    try {
      if (typeof window.akiraAuthHeaders === "function") {
        const value = window.akiraAuthHeaders();
        return value && typeof value === "object" ? value : {};
      }
    } catch (_) {}
    return {};
  }

  async function request(path, options = {}) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15000);
    const headers = Object.assign({}, authHeaders(), options.headers || {});
    try {
      const response = await fetch(backendUrl() + path, Object.assign({
        cache: "no-store",
        signal: controller.signal,
        headers
      }, options));
      let data = null;
      try { data = await response.json(); } catch (_) {}
      return { ok: response.ok, status: response.status, data };
    } catch (error) {
      return { ok: false, status: 0, error: String((error && error.message) || error) };
    } finally {
      clearTimeout(timeout);
    }
  }

  function setText(id, value) {
    const node = el(id);
    if (node) node.textContent = String(value == null ? "" : value);
  }

  function setNotice(value, isError = false) {
    noticeText = String(value || "");
    const node = el("officeHiveNotice");
    if (node) {
      node.textContent = noticeText;
      node.dataset.state = isError ? "error" : "info";
    }
  }

  function responseProblem(result) {
    if (!result) return "Respuesta no disponible.";
    if (result.status === 401) return "Sesión no autenticada. Inicia sesión con la cuenta propietaria.";
    if (result.status === 403) return "El backend no autorizó esta operación para la sesión actual.";
    if (result.status === 404) return "La API F15 Hive todavía no está disponible en el backend desplegado.";
    if (result.status === 409) return "Conflicto de versión o transición; vuelve a leer el registro antes de intentar de nuevo.";
    if (result.status === 0) return "No se pudo conectar con el backend.";
    return result.data && result.data.reason
      ? "Backend: " + String(result.data.reason)
      : "El backend no confirmó la operación (HTTP " + result.status + ").";
  }

  function renderCapability(statusResult) {
    const data = statusResult && statusResult.data;
    const capability = data && data.capability;
    capabilityAvailable = Boolean(
      statusResult && statusResult.ok && data && data.ok === true &&
      capability && capability.name === CAPABILITY_NAME &&
      capability.implementation_state === "partial" &&
      capability.availability_state !== "unavailable"
    );

    if (!statusResult || !statusResult.ok || !data || data.ok !== true) {
      setText("officeHiveStatus", "Estado de Hive sin confirmar. " + responseProblem(statusResult));
      setText("officeHiveCapability", "Sin confirmar");
      setText("officeHivePropagation", "Sin confirmar");
      setText("officeHiveCollective", "Sin confirmar");
      setText("officeHiveConflicts", "Sin confirmar");
      setText("officeHiveLocalAgent", "No disponible / no verificado");
      return;
    }

    setText(
      "officeHiveStatus",
      capabilityAvailable
        ? "Contrato de Hive disponible en modo parcial; aún no equivale a Hive colectiva."
        : "La capacidad Hive no está registrada como parcial y disponible en este backend."
    );
    setText(
      "officeHiveCapability",
      capability
        ? [capability.implementation_state, capability.verification_state, capability.availability_state].join(" / ")
        : "No registrada"
    );
    setText("officeHivePropagation", data.cross_owner_propagation === false ? "No disponible" : "No confirmado");
    setText("officeHiveCollective", data.collective_sync_available === false ? "No disponible" : "No confirmado");
    setText("officeHiveConflicts", data.conflict_resolution_available === false ? "No disponible" : "No confirmado");
    setText("officeHiveLocalAgent", data.local_agent_available === false ? "No disponible" : "No confirmado");
  }

  function makeText(tag, className, value) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    node.textContent = String(value == null ? "" : value);
    return node;
  }

  function renderKnowledge(listResult, exportResult) {
    const list = el("officeHiveKnowledgeList");
    if (!list) return;
    list.replaceChildren();

    if (!listResult || !listResult.ok || !listResult.data || listResult.data.ok !== true) {
      list.appendChild(makeText("p", "office-empty", responseProblem(listResult)));
      setText("officeHiveExportCount", "No confirmado");
      return;
    }

    knowledgeRows = Array.isArray(listResult.data.knowledge) ? listResult.data.knowledge : [];
    const exportOk = Boolean(exportResult && exportResult.ok && exportResult.data && exportResult.data.ok === true);
    exportRows = exportOk && Array.isArray(exportResult.data.knowledge) ? exportResult.data.knowledge : [];
    const exportIds = new Set(exportRows.map(row => String(row && row.id || "")));
    setText("officeHiveExportCount", exportOk ? String(exportRows.length) : "No confirmado");

    if (!knowledgeRows.length) {
      list.appendChild(makeText("p", "office-empty", "No hay registros activos de Knowledge para esta sesión propietaria."));
      return;
    }

    for (const record of knowledgeRows) {
      if (!record || !record.id) continue;
      const item = document.createElement("article");
      item.className = "office-hive-item";

      const heading = makeText("strong", "office-hive-item-title", record.concept || "Knowledge sin título");
      const meta = makeText(
        "p",
        "office-hive-item-meta",
        "Privacidad: " + String(record.privacy_level || "desconocida") +
        " · Verificación: " + String(record.verification_status || "desconocida") +
        " · v" + String(record.version == null ? "?" : record.version)
      );
      item.append(heading, meta);

      const inExport = exportIds.has(String(record.id));
      if (record.privacy_level === "SHAREABLE") {
        item.appendChild(makeText(
          "p",
          "office-hive-item-meta",
          inExport
            ? "Incluido en la vista exportable del mismo owner_scope; no se ha transmitido."
            : "Marcado SHAREABLE, pero la vista exportable no ha confirmado su inclusión."
        ));
      }

      const eligible = record.status === "active" &&
        record.verification_status === "verified" &&
        Array.isArray(record.evidence) && record.evidence.length > 0 &&
        Boolean(String(record.source_reference || "").trim() || String(record.source_id || "").trim());

      const actionRow = document.createElement("div");
      actionRow.className = "office-hive-actions";
      if (record.privacy_level === "SHAREABLE") {
        const revoke = makeText("button", "office-v2-btn office-hive-action", "Revocar a PRIVADO");
        revoke.type = "button";
        revoke.dataset.hiveAction = "revoke";
        revoke.dataset.hiveId = String(record.id);
        revoke.disabled = !capabilityAvailable || mutationInProgress;
        revoke.addEventListener("click", () => transitionPrivacy(record, "PRIVATE"));
        actionRow.appendChild(revoke);
      } else if (["PRIVATE", "SENSITIVE"].includes(record.privacy_level)) {
        const share = makeText("button", "office-v2-btn office-hive-action", "Autorizar SHAREABLE");
        share.type = "button";
        share.dataset.hiveAction = "share";
        share.dataset.hiveId = String(record.id);
        share.disabled = !capabilityAvailable || !eligible || mutationInProgress;
        share.title = eligible
          ? "Solo cambia el nivel de privacidad; no envía el contenido."
          : "Requiere estado activo, verificación, evidencia y referencia de procedencia.";
        share.addEventListener("click", () => transitionPrivacy(record, "SHAREABLE"));
        actionRow.appendChild(share);
        if (!eligible) {
          actionRow.appendChild(makeText(
            "span",
            "office-hive-item-meta",
            "Requiere verificación, evidencia y referencia de procedencia."
          ));
        }
      } else {
        actionRow.appendChild(makeText(
          "span",
          "office-hive-item-meta",
          "No hay transición automática disponible para este nivel de privacidad."
        ));
      }

      item.appendChild(actionRow);
      list.appendChild(item);
    }

    if (!capabilityAvailable) {
      setNotice("Solo lectura: el backend desplegado no ha confirmado el contrato de compartir F15. No se habilitan cambios.", true);
    }
  }

  async function refresh() {
    if (loading) return;
    loading = true;
    setText("officeHiveRefresh", "Consultando…");
    const [statusResult, knowledgeResult, exportResult] = await Promise.all([
      request("/api/v8/hive/status"),
      request("/api/v8/knowledge?limit=200"),
      request("/api/v8/hive/knowledge?limit=50")
    ]);
    renderCapability(statusResult);
    renderKnowledge(knowledgeResult, exportResult);
    const refreshButton = el("officeHiveRefresh");
    if (refreshButton) refreshButton.textContent = "Actualizar";
    loading = false;
  }

  async function transitionPrivacy(record, targetPrivacy) {
    if (mutationInProgress || !record || !capabilityAvailable) return;
    const sharing = targetPrivacy === "SHAREABLE";
    const prompt = sharing
      ? "Esto solo marcará el Knowledge como SHAREABLE para una futura exportación autorizada. NO se enviará a otros propietarios ni se propagará ahora. ¿Continuar?"
      : "Esto devolverá el Knowledge a PRIVADO y lo quitará de la vista exportable. No se ejecutará propagación externa. ¿Continuar?";
    if (typeof window.confirm !== "function" || !window.confirm(prompt)) return;

    mutationInProgress = true;
    renderKnowledge({ ok: true, data: { ok: true, knowledge: knowledgeRows } }, {
      ok: true, data: { ok: true, knowledge: exportRows }
    });
    setNotice("Guardando transición de privacidad; se comprobará la persistencia al terminar.");
    const result = await request(
      "/api/v8/hive/knowledge/" + encodeURIComponent(record.id) + "/privacy",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          privacy_level: targetPrivacy,
          expected_version: record.version,
          confirmed: true
        })
      }
    );
    mutationInProgress = false;

    if (!result.ok || !result.data || result.data.ok !== true) {
      await refresh();
      if (result.status === 409) {
        setNotice("Conflicto de versión/transición. Se releyó el estado; revisa el registro antes de repetir la acción.", true);
      } else {
        setNotice(responseProblem(result), true);
      }
      return;
    }

    await refresh();
    setNotice(
      "Transición persistida y auditada. No se realizó propagación externa.",
      false
    );
  }

  function init() {
    if (initialized || !el("officeHiveCard")) return;
    initialized = true;
    const refreshButton = el("officeHiveRefresh");
    if (refreshButton) refreshButton.addEventListener("click", () => refresh());
    refresh();
    setInterval(() => {
      if (document.visibilityState === "visible") refresh();
    }, 45000);
  }

  window.refreshAkiraHiveOffice = refresh;
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init, { once: true });
  } else {
    init();
  }
})();
