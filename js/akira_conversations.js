// AKIRA CONVERSATIONS V1.4 — Fase 10.7.2
// Persistencia de conversaciones: sidebar + cargar/guardar chats.
// V1.1: refrescar sidebar siempre que llega conversation_id.
// V1.2: actualizaciones optimistas (sin esperar al servidor) + indicador de carga.
// V1.3: menu contextual por chat (renombrar, eliminar) con boton ⋯ y long-press.
// V1.4: fix — el listener global ya no mata el menu antes del click del boton.
(function(){
  "use strict";

  const BACKEND = () => localStorage.getItem("akira_backend_url") || "https://akira-empresa.onrender.com";
  const LS_CURRENT = "akira_current_conversation_id";
  const LS_LOCAL_CONVS = "akira_local_conversations_v3";

  function _getLocalConvs(){
    try { return JSON.parse(localStorage.getItem(LS_LOCAL_CONVS) || '[]'); } catch(_){ return []; }
  }
  function _saveLocalConvs(list){
    try { localStorage.setItem(LS_LOCAL_CONVS, JSON.stringify((list || []).slice(0, 50))); } catch(_){}
  }

  const LONG_PRESS_MS = 600;

  function _akiraH(){
    if (typeof window.akiraAuthHeaders === 'function') {
      try { return window.akiraAuthHeaders(); } catch(_){}
    }
    return {'Content-Type':'application/json'};
  }

  function _getCurrentId(){
    try { return localStorage.getItem(LS_CURRENT) || null; } catch(_){ return null; }
  }
  function _setCurrentId(id){
    try {
      if (id) localStorage.setItem(LS_CURRENT, id);
      else localStorage.removeItem(LS_CURRENT);
    } catch(_){}
  }

  function _clearChatScreen(){
    const inner = document.getElementById('msgsInner');
    if (!inner) return;
    inner.innerHTML = '';
  }

  function _showEmptyChat(){
    const inner = document.getElementById('msgsInner');
    if (!inner) return;
    inner.innerHTML = `
      <div id="akiraChatWelcomeStage" class="ak-chat-welcome-stage">
        <div class="ak-welcome-orb-slot">
          <div class="akira-entity-slot" data-akira-entity data-state="idle" data-size="80" aria-label="Akira Core"></div>
        </div>
        <h2 class="ak-welcome-title">AKIRA // NEURAL NEXUS</h2>
        <p class="ak-welcome-sub">Colmena cognitiva personal con memoria persistente verificada. Selecciona una directiva para comenzar:</p>
        <div class="ak-directive-grid">
          <div class="ak-directive-card" onclick="window.sendSuggestedPrompt && window.sendSuggestedPrompt('🤖 Analiza las mejores oportunidades para automatizar y aplicar en Upwork hoy.')">
            <div class="ak-directive-icon">💼</div>
            <div class="ak-directive-content">
              <strong>Monetización Upwork</strong>
              <small>Buscar nichos rentables y redactar propuestas ganadoras.</small>
            </div>
          </div>
          <div class="ak-directive-card" onclick="window.sendSuggestedPrompt && window.sendSuggestedPrompt('🎯 Planifica una nueva misión táctica con tus agentes especialistas.')">
            <div class="ak-directive-icon">🎯</div>
            <div class="ak-directive-content">
              <strong>Misión Autónoma</strong>
              <small>Asignar objetivos tácticos a Luna, Nexo y especialistas.</small>
            </div>
          </div>
          <div class="ak-directive-card" onclick="window.sendSuggestedPrompt && window.sendSuggestedPrompt('🧠 Muestra un resumen de tu autoconocimiento y memoria verificada.')">
            <div class="ak-directive-icon">🧠</div>
            <div class="ak-directive-content">
              <strong>Auditoría de Memoria</strong>
              <small>Explorar el Cerebro cognitivo y conexiones persistentes en tiempo real.</small>
            </div>
          </div>
          <div class="ak-directive-card" onclick="window.AkiraHive && window.AkiraHive.openCatalogModal()" style="border-color:rgba(168,85,247,0.3);background:rgba(168,85,247,0.06);">
            <div class="ak-directive-icon">🌐</div>
            <div class="ak-directive-content">
              <strong style="color:#c084fc;">Colmena Táctica (267 Agentes)</strong>
              <small>Especialistas en 18 divisiones: Ciberseguridad, Código, Marketing, etc.</small>
            </div>
          </div>
          <div class="ak-directive-card" onclick="toggleAkiraLiveVoice()">
            <div class="ak-directive-icon">✨</div>
            <div class="ak-directive-content">
              <strong>Akira Live 3D (Voz)</strong>
              <small>Iniciar diálogo por voz bidireccional en tiempo real.</small>
            </div>
          </div>
        </div>
      </div>
    `;
    if (window.AkiraEntity && window.AkiraEntity.mountAll) {
      window.AkiraEntity.mountAll(inner);
    }
  }

  function _showLoading(msg){
    const inner = document.getElementById('msgsInner');
    if (!inner) return;
    inner.innerHTML = '<div class="msg-row akira"><div class="avatar"></div><div class="bubble">⏳ ' + _esc(msg || "Cargando…") + '</div></div>';
  }

  function _highlightCurrentInList(){
    const curId = _getCurrentId();
    document.querySelectorAll('#historyList .conv-item').forEach(function(el){
      if (el.dataset.convId === curId) el.classList.add('conv-active');
      else el.classList.remove('conv-active');
    });
  }

  async function _fetchJson(path, opts, timeoutMs){
    opts = opts || {};
    timeoutMs = timeoutMs || 20000;
    const url = BACKEND() + path;
    const ctrl = new AbortController();
    const to = setTimeout(() => ctrl.abort(), timeoutMs);
    try {
      const r = await fetch(url, {
        method: opts.method || "GET",
        body: opts.body,
        headers: Object.assign({}, _akiraH(), opts.headers || {}),
        signal: ctrl.signal,
        cache: "no-store",
      });
      clearTimeout(to);
      let data = null;
      try { data = await r.json(); } catch(_){}
      return { ok: r.ok, status: r.status, data: data };
    } catch(e){
      clearTimeout(to);
      return { ok: false, status: 0, error: String((e && e.message) || e) };
    }
  }

  function _esc(s){
    return String(s == null ? "" : s)
      .replace(/&/g,'&amp;')
      .replace(/</g,'&lt;')
      .replace(/>/g,'&gt;')
      .replace(/"/g,'&quot;')
      .replace(/'/g,'&#39;');
  }

  function _formatTitle(t){
    t = String(t || "").trim();
    if (!t) return "Chat sin título";
    if (t.length > 40) t = t.slice(0, 40) + "…";
    return t;
  }

  function _formatDate(iso){
    if (!iso) return "";
    try {
      const d = new Date(iso);
      const now = new Date();
      const diff = now - d;
      const mins = Math.floor(diff / 60000);
      if (mins < 1) return "ahora";
      if (mins < 60) return mins + "m";
      const hours = Math.floor(mins / 60);
      if (hours < 24) return hours + "h";
      const days = Math.floor(hours / 24);
      if (days < 7) return days + "d";
      return d.toLocaleDateString('es-CO', {day:'2-digit', month:'short'});
    } catch(_){ return ""; }
  }

  // ============================================================
  // Menu contextual por chat
  // ============================================================
  let _openMenuEl = null;
  let _openMenuCleanup = null;

  function _closeConvMenu(){
    if (_openMenuEl && _openMenuEl.parentNode) {
      try { _openMenuEl.parentNode.removeChild(_openMenuEl); } catch(_){}
    }
    _openMenuEl = null;
    if (typeof _openMenuCleanup === 'function') {
      try { _openMenuCleanup(); } catch(_){}
      _openMenuCleanup = null;
    }
  }

  function _showConvMenu(convId, anchorEl, title){
    _closeConvMenu();
    const menu = document.createElement('div');
    menu.className = 'conv-menu';
    menu.innerHTML = ''
      + '<button type="button" class="conv-menu-item" data-action="rename">✏️ Renombrar</button>'
      + '<button type="button" class="conv-menu-item conv-menu-danger" data-action="delete">🗑️ Eliminar</button>';
    document.body.appendChild(menu);

    try {
      const r = anchorEl.getBoundingClientRect();
      const menuRect = menu.getBoundingClientRect();
      let top = r.bottom + 4;
      let left = r.right - menuRect.width;
      if (top + menuRect.height > window.innerHeight - 8) {
        top = r.top - menuRect.height - 4;
      }
      if (left < 8) left = 8;
      if (left + menuRect.width > window.innerWidth - 8) {
        left = window.innerWidth - menuRect.width - 8;
      }
      menu.style.top = top + 'px';
      menu.style.left = left + 'px';
    } catch(_){}

    menu.querySelectorAll('.conv-menu-item').forEach(function(btn){
      btn.addEventListener('click', function(ev){
        ev.stopPropagation();
        ev.preventDefault();
        const action = btn.dataset.action;
        _closeConvMenu();
        if (action === 'rename') _renameConversation(convId, title);
        else if (action === 'delete') _deleteConversation(convId, title);
      });
    });

    _openMenuEl = menu;

    // Listener que cierra al tocar fuera — pero IGNORA clicks dentro del menu.
    // Se registra despues de un tick para no capturar el evento que abrio el menu.
    setTimeout(function(){
      if (!_openMenuEl) return;
      const closer = function(ev){
        const t = ev.target;
        if (t && t.closest && t.closest('.conv-menu')) {
          return;  // toque dentro del menu -> no cerrar
        }
        _closeConvMenu();
      };
      document.addEventListener('click', closer);
      document.addEventListener('touchstart', closer);
      _openMenuCleanup = function(){
        document.removeEventListener('click', closer);
        document.removeEventListener('touchstart', closer);
      };
    }, 120);
  }

  function _renameConversation(convId, currentTitle){
    const itemEl = document.querySelector('.conv-item[data-conv-id="' + convId + '"]');
    if(!itemEl) return;
    const mainBtn = itemEl.querySelector('.conv-main');
    const titleSpan = itemEl.querySelector('.conv-title');
    if(!titleSpan || !mainBtn) return;
    
    const input = document.createElement('input');
    input.type = 'text';
    input.className = 'conv-rename-input';
    input.value = currentTitle || '';
    input.style.cssText = 'background:#0f172a;border:1px solid #38bdf8;color:#fff;border-radius:4px;padding:3px 6px;font-size:12px;width:100%;outline:none;font-family:inherit;box-shadow:0 0 8px rgba(56,189,248,0.4);';
    
    titleSpan.style.display = 'none';
    mainBtn.insertBefore(input, titleSpan);
    input.focus();
    input.select();
    
    let finished = false;
    async function commitRename(){
      if(finished) return;
      finished = true;
      const newT = input.value.trim() || currentTitle || "Chat sin título";
      input.remove();
      titleSpan.style.display = '';
      titleSpan.textContent = _formatTitle(newT);
      
      // Update local storage
      const convs = _getLocalConvs();
      const cIdx = convs.findIndex(c => c.id === convId);
      if(cIdx >= 0){ convs[cIdx].title = newT; _saveLocalConvs(convs); }
      const cacheIdx = api.convsCache.findIndex(c => c.id === convId);
      if(cacheIdx >= 0){ api.convsCache[cacheIdx].title = newT; }
      
      // Try backend sync
      _fetchJson("/api/v8/conversations/" + encodeURIComponent(convId), {
        method: "PATCH",
        body: JSON.stringify({title: newT})
      }).catch(function(){});
      
      api.renderList(api.convsCache);
    }
    
    input.addEventListener('keydown', function(e){
      if(e.key === 'Enter') commitRename();
      else if(e.key === 'Escape'){ finished = true; input.remove(); titleSpan.style.display = ''; }
    });
    input.addEventListener('blur', commitRename);
  }

  function _deleteConversation(convId, title){
    const itemEl = document.querySelector('.conv-item[data-conv-id="' + convId + '"]');
    if(!itemEl) return;
    
    itemEl.innerHTML = ''
      + '<div style="display:flex;align-items:center;justify-content:space-between;width:100%;padding:5px 8px;background:rgba(239,68,68,0.18);border:1px solid rgba(239,68,68,0.4);border-radius:4px;font-size:11px;color:#fca5a5;">'
      +   '<span>¿Eliminar este chat?</span>'
      +   '<div style="display:flex;gap:4px;">'
      +     '<button type="button" class="btn-del-yes" style="background:#ef4444;color:#fff;border:none;padding:2px 8px;border-radius:4px;font-weight:700;font-size:10px;cursor:pointer;">Sí, borrar</button>'
      +     '<button type="button" class="btn-del-no" style="background:#334155;color:#fff;border:none;padding:2px 8px;border-radius:4px;font-size:10px;cursor:pointer;">No</button>'
      +   '</div>'
      + '</div>';
      
    itemEl.querySelector('.btn-del-yes').addEventListener('click', function(e){
      e.stopPropagation();
      let convs = _getLocalConvs().filter(function(c){ return c.id !== convId; });
      _saveLocalConvs(convs);
      api.convsCache = api.convsCache.filter(function(c){ return c.id !== convId; });
      api.renderList(api.convsCache);
      if (_getCurrentId() === convId) {
        api.currentId = null;
        _setCurrentId(null);
        _showEmptyChat();
      }
      _fetchJson("/api/v8/conversations/" + encodeURIComponent(convId), { method: "DELETE" }).catch(function(){});
    });
    
    itemEl.querySelector('.btn-del-no').addEventListener('click', function(e){
      e.stopPropagation();
      api.renderList(api.convsCache);
    });
  }

  // ============================================================
  // Long press
  // ============================================================
  function _attachLongPress(el, convId, title, anchor){
    let timer = null;
    let startX = 0, startY = 0;
    let moved = false;

    function _onStart(ev){
      const t = ev.touches ? ev.touches[0] : ev;
      startX = t.clientX;
      startY = t.clientY;
      moved = false;
      timer = setTimeout(function(){
        timer = null;
        if (!moved) {
          _showConvMenu(convId, anchor, title);
        }
      }, LONG_PRESS_MS);
    }
    function _onMove(ev){
      const t = ev.touches ? ev.touches[0] : ev;
      const dx = t.clientX - startX;
      const dy = t.clientY - startY;
      if (Math.abs(dx) > 10 || Math.abs(dy) > 10) {
        moved = true;
        if (timer) { clearTimeout(timer); timer = null; }
      }
    }
    function _onEnd(){
      if (timer) { clearTimeout(timer); timer = null; }
    }

    el.addEventListener('touchstart', _onStart, {passive: true});
    el.addEventListener('touchmove', _onMove, {passive: true});
    el.addEventListener('touchend', _onEnd);
    el.addEventListener('touchcancel', _onEnd);
  }

  // ============================================================
  // API publica
  // ============================================================
  const api = {
    currentId: null,
    convsCache: [],

    getConversationIdForRequest: function(){
      const id = api.currentId || _getCurrentId();
      if (!id || String(id).startsWith('local_')) return null;
      return id;
    },

    onConversationIdReceived: function(newId, messageCount){
      if (!newId) return;
      const oldId = api.currentId || _getCurrentId();
      const changed = (newId !== oldId);
      api.currentId = newId;
      _setCurrentId(newId);

      // Migrar conversacion local si comenzo con prefijo local_
      const convs = _getLocalConvs();
      if (oldId && String(oldId).startsWith('local_')) {
        const localIdx = convs.findIndex(function(c){ return c.id === oldId; });
        if (localIdx >= 0) {
          convs[localIdx].id = newId;
          if (messageCount) convs[localIdx].message_count = Number(messageCount);
          convs[localIdx].last_message_at = new Date().toISOString();
          _saveLocalConvs(convs);
          api.convsCache = convs;
          api.renderList(convs);
        }
      }

      const idx = api.convsCache.findIndex(function(c){ return c.id === newId; });
      if (idx >= 0) {
        const conv = api.convsCache[idx];
        const count = Number(messageCount);
        if (Number.isFinite(count) && count >= 0) {
          conv.message_count = count;
          conv.last_message_at = new Date().toISOString();
          api.convsCache.splice(idx, 1);
          api.convsCache.unshift(conv);
          api.renderList(api.convsCache);
        } else {
          api.loadList();
        }
      } else {
        api.loadList();
      }

      if (changed) _highlightCurrentInList();
    },

    async loadList(){
      const listEl = document.getElementById('historyList');
      if (!listEl) return;
      
      // 1. Carga inmediata desde almacenamiento local (0ms de latencia, nunca se pierden)
      const localConvs = _getLocalConvs();
      if(localConvs.length && (!api.convsCache || !api.convsCache.length)){
        api.convsCache = localConvs;
        api.renderList(localConvs);
      }
      
      // 2. Sincronización en segundo plano con el servidor
      const r = await _fetchJson("/api/v8/conversations?limit=30");
      if (r.ok && r.data && r.data.ok) {
        const remoteConvs = r.data.conversations || [];
        // Preservar messages de localConvs si ya existian para ese id
        const merged = remoteConvs.map(function(rc){
          const existingLocal = localConvs.find(function(lc){ return lc.id === rc.id; });
          if (existingLocal && existingLocal.messages && existingLocal.messages.length) {
            return Object.assign({}, rc, { messages: existingLocal.messages });
          }
          return rc;
        });
        localConvs.forEach(function(lc){
          if(!merged.some(function(mc){ return mc.id === lc.id; })){
            merged.push(lc);
          }
        });
        api.convsCache = merged;
        _saveLocalConvs(merged);
        api.renderList(merged);
      } else if(localConvs.length) {
        api.convsCache = localConvs;
        api.renderList(localConvs);
      }
    },

    recordMessage(role, content){
      const curId = api.currentId || _getCurrentId() || ('local_' + Date.now());
      if(!api.currentId) { api.currentId = curId; _setCurrentId(curId); }
      const convs = _getLocalConvs();
      let idx = convs.findIndex(function(c){ return c.id === curId; });
      const nowIso = new Date().toISOString();
      if(idx < 0){
        const cleanTitle = String(content || "Nuevo chat").trim().slice(0, 36);
        convs.unshift({
          id: curId,
          title: cleanTitle,
          created_at: nowIso,
          last_message_at: nowIso,
          message_count: 1,
          messages: [{role: role, content: content, timestamp: nowIso}]
        });
      } else {
        convs[idx].messages = convs[idx].messages || [];
        convs[idx].messages.push({role: role, content: content, timestamp: nowIso});
        convs[idx].message_count = convs[idx].messages.length;
        convs[idx].last_message_at = nowIso;
        const item = convs.splice(idx, 1)[0];
        convs.unshift(item);
      }
      _saveLocalConvs(convs);
      api.convsCache = convs;
      api.renderList(convs);
    },

    toggleChatSidebar(){
      const sidebar = document.getElementById('sidebar');
      if(sidebar){
        sidebar.classList.toggle('open');
        const overlay = document.getElementById('overlay');
        if(overlay) overlay.classList.toggle('active', sidebar.classList.contains('open'));
        // Focus en history list
        const hList = document.getElementById('historyList');
        if(hList) hList.scrollIntoView({behavior:'smooth'});
      }
    },

    renderList(convs){
      const listEl = document.getElementById('historyList');
      if (!listEl) return;
      if (!convs || !convs.length) {
        listEl.innerHTML = '<div class="conv-empty">Sin conversaciones todavía</div>';
        return;
      }
      listEl.innerHTML = convs.map(function(c){
        const id = c.id;
        const rawTitle = String(c.title || "");
        const title = _esc(_formatTitle(rawTitle));
        const date = _esc(_formatDate(c.last_message_at || c.created_at));
        const count = Number(c.message_count || 0);
        return ''
          + '<div class="conv-item" data-conv-id="' + _esc(id) + '">'
          +   '<button type="button" class="conv-main" data-conv-id="' + _esc(id) + '" title="' + title + '">'
          +     '<span class="conv-title">' + title + '</span>'
          +     '<span class="conv-meta">' + count + '·' + date + '</span>'
          +   '</button>'
          +   '<button type="button" class="conv-dots" data-conv-id="' + _esc(id) + '" title="Opciones" aria-label="Opciones">⋯</button>'
          + '</div>';
      }).join('');

      listEl.querySelectorAll('.conv-main').forEach(function(el){
        el.addEventListener('click', function(ev){
          ev.stopPropagation();
          api.openConversation(el.dataset.convId);
        });
      });
      listEl.querySelectorAll('.conv-dots').forEach(function(el){
        el.addEventListener('click', function(ev){
          ev.stopPropagation();
          ev.preventDefault();
          const convId = el.dataset.convId;
          const conv = api.convsCache.find(function(c){ return c.id === convId; });
          const title = conv ? conv.title : "";
          _showConvMenu(convId, el, title);
        });
      });
      listEl.querySelectorAll('.conv-item').forEach(function(el){
        const convId = el.dataset.convId;
        const conv = api.convsCache.find(function(c){ return c.id === convId; });
        const title = conv ? conv.title : "";
        _attachLongPress(el, convId, title, el.querySelector('.conv-dots') || el);
      });

      _highlightCurrentInList();
    },

    async openConversation(convId){
      if (!convId) return;
      _showLoading("Abriendo conversación…");
      api.currentId = convId;
      _setCurrentId(convId);
      _highlightCurrentInList();

      let conv = null;
      let msgs = [];

      // Buscar si existe copia local en caché
      const localConvs = _getLocalConvs();
      const localMatch = localConvs.find(function(c){ return c.id === convId; });

      // Si no es un id puramente local, consultar backend
      if (!String(convId).startsWith('local_')) {
        const r = await _fetchJson("/api/v8/conversations/" + encodeURIComponent(convId) + "?include_messages=true");
        if (r.ok && r.data && r.data.ok) {
          conv = r.data.conversation || {};
          msgs = r.data.messages || [];
        }
      }

      // Respaldo resiliente: si el backend falló (401, 404, offline) o no trajo mensajes, usar localMatch
      if (!msgs.length && localMatch && localMatch.messages && localMatch.messages.length) {
        conv = conv || localMatch;
        msgs = localMatch.messages;
      }

      // Si aun asi no hay nada y no existia localmente
      if (!conv && !msgs.length && !localMatch) {
        _showLoading("No se pudo cargar la conversación.");
        return;
      }

      _clearChatScreen();
      const inner = document.getElementById('msgsInner');
      if (!inner) return;
      if (!msgs.length) {
        _showEmptyChat();
      } else {
        for (let i = 0; i < msgs.length; i++) {
          const m = msgs[i];
          const who = m.role === 'user' ? 'user' : 'akira';
          const content = m.content || '';
          const row = document.createElement('div');
          row.className = 'msg-row ' + who;
          const html = (window.akiraFormatMarkdown ? window.akiraFormatMarkdown(content) : _esc(content).replace(/\n/g,'<br>').replace(/\*\*(.*?)\*\*/g,'<b>$1</b>'));
          row.innerHTML = who === 'akira'
            ? '<div class="avatar akira-entity-slot" data-akira-entity data-state="success" data-size="42" aria-label="Akira"></div><div class="bubble">' + html + '</div>'
            : '<div class="bubble">' + _esc(content) + '</div>';
          inner.appendChild(row);
        }
        if (window.AkiraEntity && window.AkiraEntity.mountAll) {
          window.AkiraEntity.mountAll(inner);
        }
        inner.scrollTop = inner.scrollHeight;
      }
      api.currentId = (conv && conv.id) || convId;
      _setCurrentId(api.currentId);
      _highlightCurrentInList();
    },

    newChat(){
      api.currentId = null;
      _setCurrentId(null);
      _showEmptyChat();
      _highlightCurrentInList();
      try { document.getElementById('msg').focus(); } catch(_){ }
    },

    async restoreLast(){
      const lastId = _getCurrentId();
      if (!lastId) return;

      let conv = null;
      let msgs = [];
      const localConvs = _getLocalConvs();
      const localMatch = localConvs.find(function(c){ return c.id === lastId; });

      if (!String(lastId).startsWith('local_')) {
        const r = await _fetchJson("/api/v8/conversations/" + encodeURIComponent(lastId) + "?include_messages=true");
        if (r.ok && r.data && r.data.ok) {
          conv = r.data.conversation || {};
          msgs = r.data.messages || [];
        }
      }

      if (!msgs.length && localMatch && localMatch.messages && localMatch.messages.length) {
        conv = conv || localMatch;
        msgs = localMatch.messages;
      }

      if (!msgs.length) {
        if (!localMatch) {
          _setCurrentId(null);
          api.currentId = null;
        }
        return;
      }

      _clearChatScreen();
      const inner = document.getElementById('msgsInner');
      if (msgs.length && inner) {
        for (let i = 0; i < msgs.length; i++) {
          const m = msgs[i];
          const who = m.role === 'user' ? 'user' : 'akira';
          const content = m.content || '';
          const row = document.createElement('div');
          row.className = 'msg-row ' + who;
          const html = (window.akiraFormatMarkdown ? window.akiraFormatMarkdown(content) : _esc(content).replace(/\n/g,'<br>').replace(/\*\*(.*?)\*\*/g,'<b>$1</b>'));
          row.innerHTML = who === 'akira'
            ? '<div class="avatar akira-entity-slot" data-akira-entity data-state="success" data-size="42" aria-label="Akira"></div><div class="bubble">' + html + '</div>'
            : '<div class="bubble">' + _esc(content) + '</div>';
          inner.appendChild(row);
        }
        if (window.AkiraEntity && window.AkiraEntity.mountAll) {
          window.AkiraEntity.mountAll(inner);
        }
        inner.scrollTop = inner.scrollHeight;
      } else {
        _showEmptyChat();
      }
      api.currentId = (conv && conv.id) || lastId;
      _highlightCurrentInList();
    }
  };

  window.akiraConversations = api;

  function _injectStyles(){
    if (document.getElementById('akira-conv-styles')) return;
    const style = document.createElement('style');
    style.id = 'akira-conv-styles';
    style.textContent = ''
      + '#historyList { display:flex; flex-direction:column; gap:3px; margin-top:4px; overflow-y:auto; }'
      + '.conv-item { display:flex; align-items:center; gap:2px; border-radius:4px; width:100%; }'
      + '.conv-item:hover { background:#1c1c22; }'
      + '.conv-item.conv-active { background:#1e1e26; box-shadow:inset 0 0 0 2px var(--border, #2a2a36); }'
      + '.conv-main { flex:1; display:flex; justify-content:space-between; align-items:center; gap:6px; background:transparent; border:none; color:#ececf1; font-family:"Pixelify Sans", sans-serif; font-size:12px; padding:8px 6px 8px 10px; cursor:pointer; text-align:left; min-width:0; }'
      + '.conv-title { flex:1; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; color:#ececf1; }'
      + '.conv-meta { font-size:10px; color:#8a8a93; flex-shrink:0; }'
      + '.conv-dots { background:transparent; border:none; color:#8a8a93; font-size:16px; padding:6px 8px; cursor:pointer; border-radius:4px; line-height:1; flex-shrink:0; }'
      + '.conv-dots:hover { background:#2a2a36; color:#fff; }'
      + '.conv-empty { font-size:11px; color:#8a8a93; padding:10px; text-align:center; font-family:"Pixelify Sans", sans-serif; }'
      + '.conv-menu { position:fixed; z-index:9999; background:#1a1a20; border:2px solid #2a2a36; border-radius:6px; box-shadow:0 6px 24px rgba(0,0,0,0.5); padding:4px; min-width:150px; font-family:"Pixelify Sans", sans-serif; }'
      + '.conv-menu-item { display:block; width:100%; background:transparent; border:none; color:#ececf1; font-family:inherit; font-size:13px; padding:10px 12px; text-align:left; cursor:pointer; border-radius:4px; }'
      + '.conv-menu-item:hover { background:#2a2a36; }'
      + '.conv-menu-danger { color:#ff7b72; }'
      + '.conv-menu-danger:hover { background:#3a1f1f; }';
    document.head.appendChild(style);
  }

  document.addEventListener("DOMContentLoaded", function(){
    _injectStyles();
    setTimeout(function(){
      api.restoreLast().then(function(){
        api.loadList();
      });
    }, 400);
    setInterval(function(){ api.loadList(); }, 60000);
    window.addEventListener('resize', _closeConvMenu);
    window.addEventListener('scroll', _closeConvMenu, true);
  });

})();
