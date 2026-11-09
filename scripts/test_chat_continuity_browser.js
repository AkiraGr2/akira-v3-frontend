// Real chat, voice and conversation modules; deterministic server and no provider calls.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const http = require('node:http');
const { chromium } = require('playwright');
const root = path.resolve(__dirname, '..');
const index = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const navigation = index.slice(index.indexOf('function showSection(name)'), index.indexOf('function setBrainMobileFullscreenGeometry()'));
const fixture = `<style>.section{display:none}.section.active{display:block}</style>
<div id="sidebar"><div id="historyList"></div></div><div id="overlay"></div>
<div id="homeSection" class="section active">Inicio</div>
<div id="chatSection" class="section"><div id="msgsInner"></div><textarea id="msg"></textarea><button id="sendBtn">Enviar</button></div>
<script>window.akiraSessionState={authenticated:true,is_authorized:true};window.countNeuronas=()=>Promise.resolve();window.akiraAuthHeaders=()=>({'Content-Type':'application/json'});${navigation}</script>
<script src="/js/akira_conversations.js"></script><script src="/js/akira_brain.js"></script><script src="/js/akira_voice_live.js"></script>`;

(async () => {
  const server = http.createServer((req, res) => {
    if (req.url === '/') {res.setHeader('Content-Type','text/html'); return res.end(fixture);}
    const file = path.join(root, new URL(req.url, 'http://local').pathname);
    if (!file.startsWith(root) || !fs.existsSync(file)) {res.writeHead(404); return res.end();}
    res.setHeader('Content-Type', 'application/javascript'); res.end(fs.readFileSync(file));
  });
  await new Promise(r => server.listen(0, '127.0.0.1', r));
  const browser = await chromium.launch({headless:true, ...(process.env.AKIRA_CHROME_PATH ? {executablePath:process.env.AKIRA_CHROME_PATH} : {})});
  try {
    const page = await browser.newPage();
    const errors = [], requests = [], conversations = new Map();
    let failStream = false, delayList = 0, delayChat = 0, delayRead = 0, offline = false;
    page.on('pageerror', e => errors.push(e.message));
    await page.route('https://akira-empresa.onrender.com/**', async route => {
      const url = new URL(route.request().url());
      const headers = {'Access-Control-Allow-Origin':'*','Access-Control-Allow-Headers':'Content-Type','Content-Type':'application/json'};
      if (route.request().method() === 'OPTIONS') return route.fulfill({status:204,headers});
      if (offline && url.pathname.includes('conversations')) return route.fulfill({status:503,headers,body:'{}'});
      let data = {ok:true};
      if (url.pathname.startsWith('/api/chat')) {
        const body = route.request().postDataJSON(); requests.push(body);
        if (delayChat) await new Promise(r => setTimeout(r, delayChat));
        if (failStream && url.pathname.endsWith('/stream')) return route.fulfill({status:200, headers:{...headers,'Content-Type':'text/event-stream'},body:'data: {"text":"partial"}\n\n'});
        const id = body.conversation_id || 'conv_' + (conversations.size + 1);
        const previous = conversations.get(id) || [];
        const response = previous.length ? 'Recuerdo: ' + previous[0].content : 'Anotado: ' + body.message;
        previous.push({role:'user',content:body.message},{role:'assistant',content:response});
        conversations.set(id, previous);
        data = {response,conversation_id:id,conversation_message_count:previous.length};
        if (url.pathname.endsWith('/stream')) return route.fulfill({headers:{...headers,'Content-Type':'text/event-stream'},body:`data: ${JSON.stringify({text:response})}\n\ndata: ${JSON.stringify({...data,done:true})}\n\n`});
      } else if (url.pathname === '/api/v8/conversations') {
        data = {ok:true,conversations:[...conversations].map(([id,m])=>({id,title:m[0].content,message_count:m.length}))};
        if (delayList) await new Promise(r=>setTimeout(r,delayList));
      } else if (url.pathname.startsWith('/api/v8/conversations/')) {
        const id = url.pathname.split('/').pop();
        data = {ok:true,conversation:{id},messages:conversations.get(id)||[]};
        if (delayRead) await new Promise(r=>setTimeout(r,delayRead));
      }
      await route.fulfill({headers,body:JSON.stringify(data)});
    });
    await page.goto('http://127.0.0.1:' + server.address().port);
    await page.waitForTimeout(500);
    const send = text => page.evaluate(async text => {document.getElementById('msg').value=text; await sendMsg();}, text);
    await page.evaluate(()=>akiraConversations.newChat());
    assert.equal(await page.locator('#chatSection').isVisible(), true);
    await send('Proyecto Faro, color turquesa');
    await send('¿Qué proyecto te dije?');
    assert.equal(requests[1].conversation_id, 'conv_1');
    assert.match(await page.locator('#msgsInner').innerText(), /Recuerdo: Proyecto Faro/);
    await page.evaluate(()=>{showSection('home');});
    await page.locator('.conv-main[data-conv-id="conv_1"]').click();
    assert.equal(await page.locator('#chatSection').isVisible(), true);
    await page.waitForFunction(()=>document.querySelectorAll('#msgsInner .msg-row').length===4);
    // Reload restores the ID/messages without sending the user to a new conversation.
    await page.reload(); await page.waitForTimeout(600);
    assert.equal(await page.evaluate(()=>akiraConversations.getConversationIdForRequest()), 'conv_1');
    await send('¿Y el color?');
    assert.equal(requests.at(-1).conversation_id, 'conv_1');
    // Voice uses the same chat and keeps transcripts even if the modal was closed.
    await page.evaluate(()=>AkiraVoiceLive.processUserVoiceInput('Recuerda el nombre por voz'));
    assert.equal(requests.at(-1).conversation_id, 'conv_1');
    assert.equal(requests.at(-1).fast_voice, true);
    assert.ok(requests.at(-1).chat_exchange_id);
    // Slow sidebar refresh cannot overwrite messages recorded after it started.
    delayList=300;
    await page.evaluate(()=>{window.pendingList=akiraConversations.loadList();});
    await page.waitForTimeout(60);
    await page.evaluate(()=>akiraConversations.recordMessage('user','Mensaje durante sincronización'));
    await page.evaluate(()=>pendingList);
    assert.match(await page.evaluate(()=>localStorage.getItem('akira_local_conversations_v3')), /Mensaje durante sincronización/);
    delayList=0;
    // Truncated SSE retries with the SAME exchange ID and saves the fallback answer.
    failStream=true;
    await page.evaluate(()=>{USE_STREAM=true;});
    const before=requests.length;
    await send('Fallback conservado');
    assert.equal(requests.length,before+2);
    assert.equal(requests.at(-1).chat_exchange_id,requests.at(-2).chat_exchange_id);
    assert.match(await page.evaluate(()=>localStorage.getItem('akira_local_conversations_v3')),/Recuerdo: Proyecto Faro/);
    failStream=false;
    // A late read cannot replace a newly created chat.
    delayRead=300;
    await page.evaluate(()=>{window.pendingOpen=akiraConversations.openConversation('conv_1');akiraConversations.newChat();});
    await page.evaluate(()=>pendingOpen);
    assert.equal(await page.evaluate(()=>akiraConversations.currentId),null);
    assert.equal(await page.locator('#msgsInner .msg-row').count(),0);
    delayRead=0;
    // A late response is stored under its originating chat, not the new one.
    delayChat=250;
    await page.evaluate(()=>{document.getElementById('msg').value='Otro proyecto';window.pendingSend=sendMsg();});
    await page.waitForTimeout(40);
    await page.evaluate(()=>akiraConversations.newChat());
    await page.evaluate(()=>pendingSend);
    assert.equal(await page.evaluate(()=>akiraConversations.currentId),null);
    assert.equal(await page.locator('#msgsInner .msg-row').count(),0);
    delayChat=0;
    await send('Chat independiente');
    assert.equal(requests.at(-1).conversation_id,undefined);
    assert.match(await page.locator('#msgsInner').innerText(),/Anotado: Chat independiente/);
    // Offline: cached conversation opens and does not lose its ID or messages.
    offline=true;
    await page.evaluate(()=>akiraConversations.openConversation('conv_1'));
    assert.match(await page.locator('#msgsInner').innerText(),/Proyecto Faro/);
    assert.equal(await page.evaluate(()=>akiraConversations.currentId),'conv_1');
    assert.deepEqual(errors,[]);
    console.log('PASS chat: follow-ups, archive navigation, reload, voice continuity, refresh race, SSE fallback, new-chat isolation and offline cache');
  } finally {await browser.close(); await new Promise(r=>server.close(r));}
})().catch(e=>{console.error(e);process.exitCode=1;});
