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
    inner.innerHTML = '<div class="msg-row akira"><div class="avatar"></div><div class="bubble">Nuevo chat. ¿En qué te ayudo?</div></div>';
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

  async function _renameConversation(convId, currentTitle){
    const newTitle = prompt("Nuevo nombre:", currentTitle || "");
    if (newTitle === null) return;
    const t = String(newTitle).trim();
    if (!t) return;
    if (t === currentTitle) return;
    const r = await _fetchJson("/api/v8/conversations/" + encodeURIComponent(convId), {
      method: "PATCH",
      body: JSON.stringify({title: t})
    });
    if (!r.ok || !r.data || !r.data.ok) {
      const reason = (r.data && r.data.reason) ? r.data.reason : ("HTTP " + r.status);
      alert("No se pudo renombrar: " + reason);
      return;
    }
    const idx = api.convsCache.findIndex(function(c){ return c.id === convId; });
    if (idx >= 0) {
      api.convsCache[idx].title = t;
      api.renderList(api.convsCache);
    }
  }

  async function _deleteConversation(convId, title){
    const ok = confirm("¿Eliminar el chat '" + (title || "") + "'?\n\nDesaparecerá de la lista. No se puede deshacer desde aquí.");
    if (!ok) return;
    const r = await _fetchJson("/api/v8/conversations/" + encodeURIComponent(convId), {
      method: "DELETE"
    });
    if (!r.ok || !r.data || !r.data.ok) {
      const reason = (r.data && r.data.reason) ? r.data.reason : ("HTTP " + r.status);
      alert("No se pudo eliminar: " + reason);
      return;
    }
    api.convsCache = api.convsCache.filter(function(c){ return c.id !== convId; });
    api.renderList(api.convsCache);
    if (_getCurrentId() === convId) {
      api.currentId = null;
      _setCurrentId(null);
      _showEmptyChat();
    }
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
      return api.currentId || _getCurrentId();
    },

    onConversationIdReceived: function(newId){
      if (!newId) return;
      const changed = (newId !== api.currentId);
      api.currentId = newId;
      _setCurrentId(newId);

      const idx = api.convsCache.findIndex(function(c){ return c.id === newId; });
      if (idx >= 0) {
        const conv = api.convsCache[idx];
        conv.message_count = (Number(conv.message_count) || 0) + 2;
        conv.last_message_at = new Date().toISOString();
        api.convsCache.splice(idx, 1);
        api.convsCache.unshift(conv);
        api.renderList(api.convsCache);
      } else {
        api.loadList();
      }

      if (changed) _highlightCurrentInList();
    },

    async loadList(){
      const listEl = document.getElementById('historyList');
      if (!listEl) return;
      const r = await _fetchJson("/api/v8/conversations?limit=30");
      if (!r.ok || !r.data || !r.data.ok) return;
      const convs = r.data.conversations || [];
      api.convsCache = convs;
      api.renderList(convs);
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

      const r = await _fetchJson("/api/v8/conversations/" + encodeURIComponent(convId) + "?include_messages=true");
      if (!r.ok || !r.data || !r.data.ok) {
        const reason = (r.data && r.data.reason) ? r.data.reason : ("HTTP " + r.status);
        _showLoading("No se pudo cargar: " + reason);
        return;
      }
      const conv = r.data.conversation || {};
      const msgs = r.data.messages || [];
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
          if (typeof window.addMsg === 'function') {
            try { window.addMsg(content, who); } catch(_){ }
          } else {
            const row = document.createElement('div');
            row.className = 'msg-row ' + who;
            const html = _esc(content).replace(/\n/g,'<br>').replace(/\*\*(.*?)\*\*/g,'<b>$1</b>');
            row.innerHTML = who === 'akira'
              ? '<div class="avatar"></div><div class="bubble">' + html + '</div>'
              : '<div class="bubble">' + html + '</div>';
            inner.appendChild(row);
          }
        }
        inner.scrollTop = inner.scrollHeight;
      }
      api.currentId = conv.id || convId;
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
      const r = await _fetchJson("/api/v8/conversations/" + encodeURIComponent(lastId) + "?include_messages=true");
      if (!r.ok || !r.data || !r.data.ok) {
        _setCurrentId(null);
        api.currentId = null;
        return;
      }
      const conv = r.data.conversation || {};
      const msgs = r.data.messages || [];
      _clearChatScreen();
      const inner = document.getElementById('msgsInner');
      if (msgs.length && inner) {
        for (let i = 0; i < msgs.length; i++) {
          const m = msgs[i];
          const who = m.role === 'user' ? 'user' : 'akira';
          const content = m.content || '';
          if (typeof window.addMsg === 'function') {
            try { window.addMsg(content, who); } catch(_){ }
          }
        }
        inner.scrollTop = inner.scrollHeight;
      } else {
        _showEmptyChat();
      }
      api.currentId = conv.id || lastId;
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
