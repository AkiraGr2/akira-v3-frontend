"use strict";
const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");
const core = require("./js/akira_trading_scanner_core.js");

function fixture() {
  let clock = 1700000000000, serial = 0;
  const timers = new Map(), sockets = [], storage = new Map(), alerts = [];
  const events = {window: new Map(), document: new Map()};
  const add = (group, name, fn) => { const list = events[group].get(name) || []; list.push(fn); events[group].set(name, list); };
  class FakeDate extends Date { constructor(...args) { super(...(args.length ? args : [clock])); } static now() { return clock; } }
  const timer = (fn, ms, repeat) => { const id = ++serial; timers.set(id, {fn, due:clock + ms, ms, repeat}); return id; };
  class Socket {
    static CONNECTING=0; static OPEN=1; static CLOSING=2; static CLOSED=3;
    constructor(url) { this.url=url; this.readyState=0; this.sent=[]; sockets.push(this); }
    open() { this.readyState=1; this.onopen?.(); }
    send(raw) { assert.equal(this.readyState, 1); this.sent.push(JSON.parse(raw)); }
    message(data) { this.onmessage?.({data:JSON.stringify(data)}); }
    close() { if (this.readyState===3) return; this.readyState=3; this.onclose?.({code:1006}); }
  }
  const doc = {hidden:false, head:{appendChild(){}}, createElement:()=>({style:{}}),
    getElementById:id=>["tradingSection","akiraMarketCanvas"].includes(id) ? {} : null,
    addEventListener:(name,fn)=>add("document",name,fn)};
  const win = {AkiraTradingScannerCore:core, innerWidth:1440, addEventListener:(name,fn)=>add("window",name,fn)};
  const sandbox = {window:win, document:doc, navigator:{onLine:true}, WebSocket:Socket, Date:FakeDate, console,
    localStorage:{getItem:k=>storage.get(k)||null,setItem:(k,v)=>storage.set(k,String(v))},
    setTimeout:(fn,ms)=>timer(fn,ms,false),clearTimeout:id=>timers.delete(id),
    setInterval:(fn,ms)=>timer(fn,ms,true),clearInterval:id=>timers.delete(id),
    alert:msg=>alerts.push(msg), fetch:()=>{throw Error("Unexpected network request in isolated test");}};
  vm.createContext(sandbox);
  const source=fs.readFileSync("js/akira_trading_lab.js","utf8").replace(
    "window.AkiraTradingLab = new AkiraTradingLab();", "window.TradingLabClass = AkiraTradingLab;");
  vm.runInContext(source,sandbox);
  const app=new win.TradingLabClass();
  for(const method of ["render","bindEvents","renderScannerSignal","drawMarketCanvas","requestCanvasRedraw","updateWsConnectionBadge","updateRemainingCandleCountdown","renderCandleHistoryTable","updateLiveHeaderTelemetry"]) app[method]=()=>{};
  function advance(ms) {
    const end=clock+ms;
    for (;;) {
      const next=[...timers.entries()].filter(([,t])=>t.due<=end).sort((a,b)=>a[1].due-b[1].due)[0];
      if(!next) break;
      const [id,t]=next; clock=t.due;
      if(t.repeat) t.due+=t.ms; else timers.delete(id);
      t.fn();
    }
    clock=end;
  }
  function history(socket, extra={}) {
    const req=socket.sent.filter(r=>r.ticks_history).at(-1);
    const candles=Array.from({length:65},(_,i)=>({epoch:1699996080+i*60,open:100+i,high:102+i,low:99+i,close:101+i}));
    socket.message({msg_type:"candles",req_id:req.req_id,candles,...extra});
  }
  return {app,sandbox,sockets,timers,alerts,storage,advance,history,
    emit:(group,name)=>events[group].get(name)?.forEach(fn=>fn()), events};
}

async function main() {
  {
    const f=fixture(); f.app.init(); f.app.init();
    assert.equal(f.sockets.length,1,"repeated entry must reuse CONNECTING socket");
    const socket=f.sockets[0]; socket.open(); f.app.init();
    assert.equal(f.sockets.length,1,"repeated entry must reuse OPEN socket");
    assert.equal(socket.sent.filter(r=>r.ticks_history).length,1,"no duplicate history subscription on repeated entry");
    f.history(socket); assert.equal(f.app.hasLiveDerivFeed(),true);
    const oldClose=socket.onclose, oldError=socket.onerror, oldMessage=socket.onmessage;
    socket.close(); const timer=f.app.derivReconnectTimer;
    oldClose(); oldError(); assert.equal(f.app.derivReconnectTimer,timer,"old callbacks cannot schedule duplicate retries");
    f.advance(1000); const replacement=f.sockets[1]; replacement.open(); f.history(replacement);
    oldClose(); oldError(); oldMessage({data:JSON.stringify({msg_type:"candles",candles:[]})});
    assert.equal(f.app.derivWs,replacement); assert.equal(f.app.hasLiveDerivFeed(),true);
    assert.equal(f.app.derivReconnectTimer,null); assert.equal(f.app.derivReconnectAttempt,0);
    assert.equal(f.events.window.get("online").length,1,"recovery handlers bind once");
  }
  {
    const f=fixture(); f.app.initDerivWebSocket();
    const delays=[];
    for(let i=0;i<7;i++) {
      f.sockets.at(-1).close();
      const t=f.timers.get(f.app.derivReconnectTimer); delays.push(t.ms); f.advance(t.ms);
    }
    assert.deepEqual(delays,[1000,2000,4000,8000,16000,30000,30000]);
    const socket=f.sockets.at(-1); socket.open();
    assert.equal(f.app.derivReconnectAttempt,7,"socket open is insufficient to reset backoff");
    f.history(socket,{candles:[]}); assert.equal(f.app.derivReconnectAttempt,7);
    assert.equal(f.app.hasLiveDerivFeed(),false);
    f.history(socket,{candles:[{epoch:1,open:1,high:0,low:2,close:1}]});
    assert.equal(f.app.hasLiveDerivFeed(),false,"invalid OHLC cannot restore readiness");
    f.history(socket); assert.equal(f.app.derivReconnectAttempt,0);
  }
  {
    const f=fixture();f.app.initDerivWebSocket();const socket=f.sockets[0];socket.open();f.history(socket);
    const oldReq=socket.sent.find(r=>r.ticks_history).req_id;
    f.app.selectedMarket="CRASH1000";f.app.selectedTimeframe="M5";f.app.subscribeToCurrentMarketDeriv();
    assert.equal(f.app.hasLiveDerivFeed(),false);
    socket.message({msg_type:"candles",req_id:oldReq,candles:[{epoch:1,open:9,high:10,low:8,close:9}]});
    assert.equal(f.app.dataFeedKeys.CRASH1000,undefined,"old market/timeframe history must be ignored");
    f.history(socket);assert.equal(f.app.hasLiveDerivFeed(),true);
  }
  {
    const f=fixture();f.app.initDerivWebSocket();const socket=f.sockets[0];socket.open();f.history(socket);
    const price=f.app.marketPrices.BOOM1000, bars=JSON.stringify(f.app.candles.BOOM1000);
    f.app.currentSignal={id:"old"};f.app.startLocalFallbackTicker();
    f.sandbox.navigator.onLine=false;f.emit("window","offline");f.advance(120000);
    assert.equal(f.sockets.length,1);assert.equal(f.app.derivReconnectTimer,null);
    assert.equal(f.app.marketPrices.BOOM1000,price,"offline quote must be frozen");
    assert.equal(JSON.stringify(f.app.candles.BOOM1000),bars,"offline candles must be frozen");
    assert.equal(f.app.currentSignal,null);
    assert.equal(f.app.executeDemoOrder("BOOM1000","BUY",.01),false);
    assert.equal(await f.app.sendSignalToTelegram({marketId:"BOOM1000",timeframe:"M1"},true),false);
    f.sandbox.navigator.onLine=true;f.emit("window","online");f.emit("window","online");
    assert.equal(f.sockets.length,2);f.sockets[1].open();assert.equal(f.app.hasLiveDerivFeed(),false);
    f.history(f.sockets[1]);assert.equal(f.app.hasLiveDerivFeed(),true);
  }
  {
    const f=fixture();f.app.initDerivWebSocket();f.advance(15000);
    assert.equal(f.app.derivWs,null);assert.ok(f.app.derivReconnectTimer);
    f.advance(1000);assert.equal(f.sockets.length,2,"connecting timeout must retry once");
  }
  {
    const f=fixture();f.app.initDerivWebSocket();const socket=f.sockets[0];socket.open();f.history(socket);
    f.advance(25000);assert.equal(socket.sent.at(-1).ping,1);
    socket.message({msg_type:"ping",ping:"pong"});
    f.advance(25000);socket.message({msg_type:"ping",ping:"pong"});
    f.advance(25000);assert.equal(f.app.hasLiveDerivFeed(),false,"pong alone cannot keep a stale market ready");
    assert.ok(f.app.derivReconnectTimer);
  }
  {
    const f=fixture();f.app.initDerivWebSocket();const socket=f.sockets[0];socket.open();f.history(socket);
    f.sandbox.document.hidden=true;f.emit("document","visibilitychange");
    f.advance(61000);f.sandbox.document.hidden=false;f.emit("document","visibilitychange");
    f.emit("document","visibilitychange");assert.equal(f.sockets.length,2,"resume creates exactly one replacement");
    assert.equal(f.app.hasLiveDerivFeed(),false);
  }
  {
    const f=fixture();f.app.initDerivWebSocket();const socket=f.sockets[0];socket.open();f.history(socket);
    f.app.telegramChatId="test-chat";
    f.app.calculateSafeLot=()=>({slPips:1,actualRiskMoney:1,tp1Pips:1,tp1Profit:1,tp2Pips:2,tp2Profit:2,tp3Pips:3,tp3Profit:3,capital:50,lot:.01,actualRiskPercent:2});
    const signal={id:"signal",marketId:"BOOM1000",marketName:"Boom 1000",timeframe:"M1",type:"BUY",signalCandleEpoch:1699999920,entry:100,sl:99,tp1:101,tp2:102,tp3:103,riskPips:1,confluence:3,smc:"fixture",timestamp:"12:00"};
    let calls=0, resolve;
    f.app.deliverTelegramMessage=msg=>{calls++;for(const level of ["100","99","101","102","103"])assert.ok(msg.includes('`'+level+'`'));return new Promise(ok=>{resolve=ok;});};
    const first=f.app.sendSignalToTelegram(signal,true);
    assert.equal(await f.app.sendSignalToTelegram(signal,true),false,"concurrent duplicate suppressed");
    resolve(true);assert.equal(await first,true);assert.equal(calls,1);
    assert.equal(await f.app.sendSignalToTelegram(signal,true),false,"successful signal is not resent after reconnect");
    const restored=new f.sandbox.window.TradingLabClass();
    assert.equal(restored.sentTelegramSignalIds.size,1,"successful IDs survive page reload");
    let testMessage="";f.app.deliverTelegramMessage=async msg=>{testMessage=msg;return true;};
    await f.app.sendTelegramConnectionTest();
    assert.ok(testMessage.includes("no es una señal"));assert.ok(!/\bTP[123]\b|\bBUY\b|\bSELL\b|98/.test(testMessage));
  }
  {
    const f=fixture();f.app.initDerivWebSocket();const socket=f.sockets[0];socket.open();f.history(socket);
    const a=f.app;for(const method of ["savePaperAccount","renderOpenPositions","renderClosedTrades","updateSimulatorLiveUI","updateSentinelStats"])a[method]=()=>{};
    a.marketPrices.BOOM1000=100;a.paper.balance=50;a.paper.openPositions=[];a.paper.closedTrades=[];
    const now=f.sandbox.Date.now(),sig={strategy:"spike_scalp_v1",id:"SCALP-TEST",marketId:"BOOM1000",timeframe:"M1",type:"BUY",entry:100,sl:99,tp1:101,tp2:102,tp3:103,signalCandleEpoch:now/1000-60,entryValidUntil:now+20000,expiresAt:now+180000};
    a.currentSignal=sig;
    a.deliverTelegramMessage=()=>{throw Error("Unvalidated scalp must not send external recommendations");};
    assert.equal(await a.sendSignalToTelegram(sig,true),false,"research profile never sends Telegram recommendations");
    assert.equal(a.executeDemoOrder("BOOM1000","BUY",1,99,101,false,60,sig),false,"planned loss over 1% of local balance must be rejected");
    a.executeDemoOrder("BOOM1000","BUY",.2,99,101,false,60,sig);
    assert.equal(a.paper.openPositions.length,1);assert.equal(a.paper.openPositions[0].expiresAt,sig.expiresAt);
    assert.equal(a.executeDemoOrder("BOOM1000","BUY",.2,99,101,false,60,sig),false,"no stacking");
    a.paper.openPositions[0].expiresAt=now-1;a.updateOpenPositionsPnL();
    assert.equal(a.paper.openPositions.length,0);assert.equal(a.paper.closedTrades[0].signalId,sig.id);
    assert.equal(a.executeDemoOrder("BOOM1000","BUY",.2,99,101,false,60,sig),false,"closed signal cannot be reused");
    a.paper.closedTrades=[];sig.entryValidUntil=now-1;
    assert.equal(a.executeDemoOrder("BOOM1000","BUY",.2,99,101,false,60,sig),false,"late entries rejected");
    sig.entryValidUntil=now+20000;a.marketPrices.BOOM1000=100.3;
    assert.equal(a.executeDemoOrder("BOOM1000","BUY",.2,99,101,false,60,sig),false,"price chasing rejected");
    a.marketPrices.BOOM1000=100;a.paper.openPositions=[{id:"offline",marketId:"BOOM1000",timeframe:"M1",strategy:"spike_scalp_v1",type:"BUY",entryPrice:100,lot:.2,sl:99,tp:101,expiresAt:now-1}];
    f.sandbox.navigator.onLine=false;f.emit("window","offline");a.updateOpenPositionsPnL();
    assert.equal(a.paper.openPositions.length,1,"offline expiry must wait for a real quote, never fabricate a fill");
  }
  console.log("PASS: single connection, bounded reconnect, stale-socket isolation, market switch, offline freeze/gates, recovery, heartbeat, Telegram levels and dedup; no external messages sent.");
}
main().catch(err=>{console.error(err);process.exitCode=1;});
