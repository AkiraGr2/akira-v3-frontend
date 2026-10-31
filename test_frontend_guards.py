"""
Automated CI guard verifier for akira-v3-frontend
Matches all 12 guards in .github/workflows/frontend-syntax.yml
"""
import json
import re
from pathlib import Path

ROOT = Path(__file__).parent

def run_guards():
    print("Running frontend CI guards locally with Python...")
    
    # 1. Canonical public identity contract
    index = (ROOT / "index.html").read_text(encoding="utf-8")
    manifest = json.loads((ROOT / "manifest.json").read_text(encoding="utf-8"))
    assert manifest["name"] == "Akira", "PWA public name must be exactly Akira"
    assert manifest["short_name"] == "Akira", "PWA short name must be exactly Akira"
    assert not re.search(r"V7\.3|Ultra|Consciente|Auto-reparable", str(manifest.get("description", "")), re.IGNORECASE), "PWA description must not expose versioned or unverified claims"
    assert str(manifest.get("start_url", "")).startswith("/akira-v3-frontend/"), "PWA start_url must remain inside GitHub Pages path"
    assert "akira_build=" in str(manifest.get("start_url", "")), "PWA start_url must carry canonical build marker"
    assert manifest.get("scope") == "/akira-v3-frontend/", "PWA scope must remain inside project path"
    assert "<title>Akira</title>" in index, "document title must remain Akira"
    assert "Akira V7.3" not in index and "V7.3 Consciente" not in index, "frontend public surface must not expose legacy versioned identity"
    print("  [OK] Canonical public identity contract OK")

    # 2. Brain 2D-only contract
    membrane = (ROOT / "js" / "obsidian_membrane.js").read_text(encoding="utf-8")
    assert 'id="brainMode2d"' in index, "2D Brain control missing"
    assert 'id="membraneCy"' in index, "2D Brain container missing"
    assert 'id="brainMode3d"' not in index, "3D Brain button must not return"
    assert 'id="membrane3d"' not in index, "3D Brain container must not return"
    assert "akira_brain_3d.js" not in index, "3D Brain runtime must not be loaded"
    assert "akiraBrainSetMode('3d')" not in index, "3D Brain mode action must not return"
    assert "window.cytoscape" in membrane, "Cytoscape 2D renderer missing"
    assert "refreshMembrane(true)" in membrane, "2D Brain refresh path missing"
    assert "membraneError" in membrane, "2D Brain error state missing"
    print("  [OK] Brain 2D-only contract OK")

    # 3. Verified learning evaluation action
    learning = (ROOT / "js" / "akira_learning.js").read_text(encoding="utf-8")
    start = learning.find('}else if(status === "verified"){')
    end = learning.find('}else if(status === "consolidated"){', start)
    assert start >= 0 and end >= 0, "verified/consolidated blocks not found"
    block = learning[start:end]
    assert 'data-learning-action="evaluate"' in block, "verified learning must expose EVALUAR"
    assert 'confidence < 0.70' in block, "verified learning evaluate gate threshold missing"
    print("  [OK] Verified learning evaluation action guard OK")

    # 4. Cognitive Workspace V2 visual contract
    css = (ROOT / "css" / "akira-cognitive-workspace-v2.css").read_text(encoding="utf-8")
    contract = (ROOT / "AKIRA_UI_CONTRACT_V2.md").read_text(encoding="utf-8")
    assert "css/akira-cognitive-workspace-v2.css" in index, "Cognitive Workspace V2 stylesheet must be loaded"
    assert "--bg:#080b12" in css, "V2 design token set missing"
    assert ".sidebar" in css, "V2 workspace shell rules missing"
    assert "@media(max-width:768px)" in css, "mobile-first rules missing"
    assert "Akira Cognitive Workspace" in contract, "UI contract missing"
    assert "Este rediseño es visual; no debe cambiar APIs, persistencia, permisos ni comportamiento de negocio." in contract, "UI contract must protect backend contracts"
    assert "js/akira-office-2p5d.js" in index, "Office 2.5D script must be loaded"
    assert "Oficina Cognitiva" in index, "cognitive office surface missing"
    assert not ("akira-office-floor-v3.js" in index or "office3dStage" in index or "office3dMode" in index), "Office 3D surface must not return"
    assert ".office-v2-shell" in css, "Office shell visual rules missing"
    print("  [OK] Cognitive Workspace V2 visual contract OK")

    # 5. Runtime capability truth surface
    assert "/api/v8/runtime/capabilities" in index, "runtime capability endpoint missing"
    assert "function fetchRuntimeCapabilities()" in index, "runtime capability fetch helper missing"
    assert "window.akiraRuntimeCapabilities" in index, "runtime capability state missing"
    assert "runtimeStatus(runtime && runtime.image && runtime.image.status)" in index, "image status must derive from runtime"
    assert "runtimeStatus(runtime && runtime.pdf && runtime.pdf.status)" in index, "pdf status must derive from runtime"
    assert "runtimeStatus(runtime && runtime.video && runtime.video.status)" in index, "video status must derive from runtime"
    print("  [OK] Runtime capability truth surface guard OK")

    # 6. PDF upload error truthfulness
    extras = (ROOT / "js" / "akira_extras.js").read_text(encoding="utf-8")
    up_start = extras.find("async function uploadFileToAkira")
    up_end = extras.find("\n// -------- 📝 Crear archivo --------", up_start)
    assert up_start >= 0 and up_end >= 0, "uploadFileToAkira block not found"
    up_block = extras[up_start:up_end]
    assert "if(!r.ok || !d || d.ok !== true)" in up_block, "PDF handler must reject non-2xx"
    assert 'typeof d.text !== "string"' in up_block, "PDF handler must validate returned text"
    assert "d.message || d.reason" in up_block, "PDF handler must surface backend reason"
    print("  [OK] PDF upload error truthfulness guard OK")

    # 7. Capability registry consumption contract
    r_start = index.find("async function renderLevels")
    r_end = index.find("\n</script>", r_start)
    assert r_start >= 0 and r_end >= 0, "renderLevels block not found"
    r_block = index[r_start:r_end]
    assert "d.capabilities_registry" in r_block, "renderLevels must read capabilities_registry"
    assert "effective_state" in r_block, "renderLevels must use effective capability state"
    assert "legacyCapabilities.find" in r_block, "per-capability legacy fallback missing"
    assert "if (c)" in r_block, "registry entry must take precedence"
    assert "const legacyStatus = legacy && legacy.status" in r_block, "legacy status fallback missing"
    print("  [OK] Capability registry consumption guard OK")

    # 8. Brain count authorization contract
    s_start = index.find("async function forceSyncR2")
    s_end = index.find("\nfunction exportBackup", s_start)
    assert s_start >= 0 and s_end >= 0, "forceSyncR2 block not found"
    s_block = index[s_start:s_end]
    assert "akiraAuthHeaders()" in s_block, "forceSyncR2 must use signed session headers"
    assert "akiraHandleAuthFailure(401)" in s_block, "forceSyncR2 must invalidate session on HTTP 401"
    counter = (ROOT / "js" / "hybrid_sync.js").read_text(encoding="utf-8")
    assert "window.akiraAuthHeaders()" in counter, "countNeuronas must use signed session headers"
    assert "window.akiraHandleAuthFailure(401)" in counter, "countNeuronas must invalidate session on HTTP 401"
    print("  [OK] Brain count authorization contract OK")

    # 9. Signed-session UX contract
    admin = (ROOT / "js" / "akira_admin.js").read_text(encoding="utf-8")
    missions = (ROOT / "js" / "akira_missions_panel.js").read_text(encoding="utf-8")
    brain = (ROOT / "js" / "akira_brain.js").read_text(encoding="utf-8")
    assert "function akiraVerifySession()" in index, "central session verifier missing"
    assert "function akiraClearSession(reason)" in index, "central session clear helper missing"
    assert "function akiraHandleAuthFailure(status)" in index, "central 401 handler missing"
    assert "/api/v8/me" in index, "session verifier must use /api/v8/me"
    assert '<body class="ak-reference-mode akira-auth-locked">' in index, "application must start behind the global login gate"
    assert 'id="akiraAuthGate" role="dialog" aria-modal="true"' in index, "global login gate must be accessible"
    assert "el.inert=!allowed" in index, "unauthenticated application content must be inert"
    assert "d.is_authorized===true || d.is_owner===true" in index, "only server-authorized sessions may unlock the app"
    assert "function akiraLogout()" in index, "account must provide a logout path"
    assert "Inicia sesión con una cuenta Google autorizada" in index, "unauthorized entry must stay blocked"
    assert 'localStorage.setItem("akira_is_owner"' not in index, "owner state must not be persisted locally"
    assert 'localStorage.getItem("akira_is_owner"' not in index, "owner state must not be read locally"
    assert not ("localStorage.getItem(\"akira_token\")" in missions or "localStorage.getItem(\"token\")" in missions or "localStorage.getItem(\"access_token\")" in missions), "mission panel token fallbacks forbidden"
    assert "window.akiraVerifySession" in admin, "restored session must be verified"
    assert "window.akiraHandleAuthFailure(401)" in admin, "admin must invalidate session on 401"
    for name, text in [["learning", learning], ["extras", extras], ["brain", brain]]:
        assert "akiraHandleAuthFailure(401)" in text, f"{name} must invalidate session on HTTP 401"
    assert '"akira_is_owner"' in index and "localStorage.removeItem(k)" in index, "legacy owner flag should be purged"
    adm_start = index.find('<div id="adminSection" class="section">')
    adm_end = index.find('\n<script>\nif(!localStorage.getItem("akira_backend_url"))', adm_start)
    assert adm_start >= 0 and adm_end >= 0, "admin section boundaries not found"
    adm_html = index[adm_start:adm_end]
    for forbidden in ["Panel Técnico Akira", "Tool Registry", "Self-Model", "Ciclo Cognitivo", "verificar sesión de propietario"]:
        assert forbidden not in adm_html, f"admin UI still exposes technical label: {forbidden}"
    for required in ["Control de Akira", "Actualizar estado de Akira", "Ver qué sabe Akira sobre sí misma", "Ver todos los agentes y su estado", "Abrir el centro de Misiones"]:
        assert required in adm_html, f"owner-friendly admin label missing: {required}"
    assert "adminAddSelfNote" in admin, "plain-language self-knowledge action missing"
    print("  [OK] Signed-session UX contract guard OK")

    # 10. Interactive UI integrity
    assert 'setMissionActionBusy(id, "execute")' in missions, "mission lock missing"
    assert 'actionBusyFor(id, "execute") ? "disabled" : ""' in missions, "mission disable missing"
    assert 'updated?.status !== "running"' in missions, "mission lock release missing"
    assert not re.search(r"^function\s+renderLevels\s*\(", brain, re.MULTILINE), "legacy brain.js renderLevels forbidden"
    assert len(re.findall(r"function\s+renderLevels\s*\(", index)) == 1, "exactly one renderLevels expected"
    assert 'user-scalable=no' not in index, "user zoom must be allowed"
    assert "async function countNeuronas()" in counter, "authoritative counter missing in hybrid_sync.js"
    assert len(re.findall(r"async function countNeuronas\s*\(", index)) == 0, "duplicate counter forbidden in index"
    assert "window.missionPanelRenderList" in missions, "mission search render handler missing"
    assert "getToken()" not in missions, "missions must not call getToken"
    assert "window.akiraBrainClearSelection" in membrane, "2D selection clear hook missing"
    assert 'id="brainMode2d" class="brain-mode active"' in index, "2D brain button must remain canonical"
    assert 'id="brainMode3d"' not in index, "3D brain button must not exist"
    assert 'id="membrane3d"' not in index, "3D brain container must not exist"
    print("  [OK] Interactive UI integrity guard OK")

    # 11. Guard F9 agent audit UI truth surface
    assert "window.f9AuditAllAgents = async function()" in index, "F9 agent audit handler missing"
    assert 'onclick="f9AuditAllAgents()"' in index, "F9 agent audit action missing"
    assert "/api/v8/agents/audit" in index, "F9 agent audit backend route missing"
    assert "Auditar todos los agentes registrados" in index, "F9 user-facing audit label missing"
    assert "agentes_auditados:rows" in index, "F9 UI must render agent evidence"
    assert "report.cleanup" in index, "F9 UI must expose cleanup evidence"
    print("  [OK] F9 agent audit UI truth surface guard OK")

    # 12. Guard image error truthfulness
    img_start = brain.find("async function generateImageAkira")
    img_end = brain.find("\ndocument.addEventListener", img_start)
    assert img_start >= 0 and img_end >= 0, "generateImageAkira block not found"
    img_block = brain[img_start:img_end]
    assert "if(!r.ok)" in img_block, "image handler must reject non-2xx"
    assert "d.message || d.reason" in img_block, "image error reason must surface to user"
    assert 'document.createElement("img")' in img_block, "image rendering should use DOM nodes"
    assert "✅ Imagen generada (revisa R2)" not in img_block, "stale false-success message remains"
    print("  [OK] Image error truthfulness guard OK")

    print("\nALL 12 CI GUARDS PASSED SUCCESSFULLY!")

if __name__ == "__main__":
    run_guards()
