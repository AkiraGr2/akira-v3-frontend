// AKIRA CONVERSATIONS V1.2 — Fase 10.7.2
// Persistencia de conversaciones: sidebar + cargar/guardar chats.
// V1.1: refrescar sidebar siempre que llega conversation_id.
// V1.2: actualizaciones optimistas (sin esperar al servidor) + indicador de carga.
(function(){
  "use strict";

  const BACKEND = () => localStorage.getItem("akira_backend_url") || "https://akira-empresa.onrender.com";
  const LS_CURRENT = "akira_current_conversation_id";

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
      .replace(/>/g,'&gt;');
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

  const api = {
    currentId: null,
    convsCache: [],   // Última lista recibida del servidor (para updates optimistas)

    // Llamado por akira_brain.js al enviar mensajes
    getConversationIdForRequest: function(){
      return api.currentId || _getCurrentId();
    },

    // Llamado por akira_brain.js cuando el backend responde con un conversation_id.
    // V1.2: update optimista — incrementa contador y refresca la lista SIN esperar al servidor.
    onConversationIdReceived: function(newId){
      if (!newId) return;
      const changed = (newId !== api.currentId);
      api.currentId = newId;
      _setCurrentId(newId);

      // Update optimista de la lista local (evita esperar al servidor)
      const idx = api.convsCache.findIndex(function(c){ return c.id === newId; });
      if (idx >= 0) {
        const conv = api.convsCache[idx];
        conv.message_count = (Number(conv.message_count) || 0) + 2;  // user + assistant
        conv.last_message_at = new Date().toISOString();
        // Mover al top
        api.convsCache.splice(idx, 1);
        api.convsCache.unshift(conv);
        api.renderList(api.convsCache);
      } else {
        // Conversación nueva: hay que pedir sus datos al servidor
        api.loadList();
      }

      if (changed) _highlightCurrentInList();
    },

    async loadList(){
      const listEl = document.getElementById('historyList');
      if (!listEl) return;
      const r = await _fetchJson("/api/v8/conversations?limit=30");
      if (!r.ok || !r.data || !r.data.ok) {
        return;
      }
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
        const title = _esc(_formatTitle(c.title));
        const date = _esc(_formatDate(c.last_message_at || c.created_at));
        const count = Number(c.message_count || 0);
        return '<button class="conv-item" data-conv-id="' + _esc(id) + '" title="' + title + '">'
          + '<span class="conv-title">' + title + '</span>'
          + '<span class="conv-meta">' + count + '·' + date + '</span>'
          + '</button>';
      }).join('');
      listEl.querySelectorAll('.conv-item').forEach(function(el){
        el.addEventListener('click', function(){
          api.openConversation(el.dataset.convId);
        });
      });
      _highlightCurrentInList();
    },

    async openConversation(convId){
      if (!convId) return;
      // Feedback visual inmediato
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

    async renameCurrent(newTitle){
      if (!api.currentId) { alert("No hay conversación activa"); return; }
      const t = (newTitle || "").trim();
      if (!t) return;
      const r = await _fetchJson("/api/v8/conversations/" + encodeURIComponent(api.currentId), {
        method: "PATCH",
        body: JSON.stringify({title: t})
      });
      if (!r.ok || !r.data || !r.data.ok) {
        const reason = (r.data && r.data.reason) ? r.data.reason : ("HTTP " + r.status);
        alert("No se pudo renombrar: " + reason);
        return;
      }
      // Update optimista del título en cache
      const idx = api.convsCache.findIndex(function(c){ return c.id === api.currentId; });
      if (idx >= 0) {
        api.convsCache[idx].title = t;
        api.renderList(api.convsCache);
      }
    },

    async archiveCurrent(){
      if (!api.currentId) { alert("No hay conversación activa"); return; }
      const r = await _fetchJson("/api/v8/conversations/" + encodeURIComponent(api.currentId), {
        method: "DELETE"
      });
      if (!r.ok || !r.data || !r.data.ok) {
        const reason = (r.data && r.data.reason) ? r.data.reason : ("HTTP " + r.status);
        alert("No se pudo archivar: " + reason);
        return;
      }
      // Update optimista: quitarla de la lista
      api.convsCache = api.convsCache.filter(function(c){ return c.id !== api.currentId; });
      api.newChat();
      api.renderList(api.convsCache);
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
      + '.conv-item { display:flex; justify-content:space-between; align-items:center; gap:6px; background:transparent; border:2px solid transparent; color:#ececf1; font-family:"Pixelify Sans", sans-serif; font-size:12px; padding:8px 10px; cursor:pointer; text-align:left; border-radius:4px; width:100%; }'
      + '.conv-item:hover { background:#1c1c22; }'
      + '.conv-item.conv-active { background:#1e1e26; border-color:var(--border, #2a2a36); }'
      + '.conv-title { flex:1; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; color:#ececf1; }'
      + '.conv-meta { font-size:10px; color:#8a8a93; flex-shrink:0; }'
      + '.conv-empty { font-size:11px; color:#8a8a93; padding:10px; text-align:center; font-family:"Pixelify Sans", sans-serif; }';
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
  });

})();
