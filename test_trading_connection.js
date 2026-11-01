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
  const win = {AkiraSpikeAnticipation:require("./js/akira_spike_anticipation.js"),AkiraScalpResearchCore:require("./js/akira_scalp_research_core.js"),AkiraTradingScannerCore:core, innerWidth:1440, addEventListener:(name,fn)=>add("window",name,fn)};
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
    const req=socket.sent.filter(r=>r.ticks_history&&r.subscribe).at(-1);
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
    assert.equal(socket.sent.filter(r=>r.ticks_history&&r.subscribe).length,1,"no duplicate history subscription on repeated entry");
    f.history(socket); assert.equal(f.app.hasLiveDerivFeed(),true);
    const oldClose=socket.onclose, oldError=socket.onerror, oldMessage=socket.onmessage;
    socket.close(); const timer=f.app.derivReconnectTimer;
    oldClose(); oldError(); assert.equal(f.app.derivReconnectTimer,timer,"old callbacks cannot schedule duplicate retries");
    f.advance(1000); const replacement=f.sockets[1]; replacement.open(); f.history(replacement);
    oldClose(); oldError(); oldMessage({data:JSON.stringify({msg_type:"candles",candles:[]})});
    assert.equal(f.app.derivWs,replacement); assert.equal(f.app.hasLiveDerivFeed(),true);
    assert.equal(f.app.derivReconnectTimer,null); assert.equal(f.app.derivReconnectAttempt,1,'history alone does not reset error backoff');
    f.app.handleDerivLiveTick({quote:100,symbol:'BOOM1000',epoch:1700000000});
    assert.equal(f.app.derivReconnectAttempt,0,'a valid live tick resets backoff');
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
    f.history(socket); assert.equal(f.app.derivReconnectAttempt,7,'history does not end the backoff until ticks resume');
    f.app.handleDerivLiveTick({quote:100,symbol:'BOOM1000',epoch:1700000000});
    assert.equal(f.app.derivReconnectAttempt,0);
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
  {
    const f=fixture();f.app.scannerStrategy='multi_scalp';f.app.scalpPracticeEnabled=false;
    f.app.generateMultiScalpSignal('BOOM1000','M1',[],1700000000);
    assert.equal(f.app.currentSignal,null,"no report means no invented strategy");
    f.app.scalpResearchReport={generatedAt:new f.sandbox.Date().toISOString(),markets:[{marketId:'BOOM1000',selected:'range_reversion',validation:{expectancyR:-1},holdout:{expectancyR:1}}]};
    f.app.generateMultiScalpSignal('BOOM1000','M1',[],1700000000);
    assert.equal(f.app.currentSignal,null,"favorable holdout cannot hide a losing validation period");
    f.app.scalpResearchReport.generatedAt='2020-01-01T00:00:00Z';
    f.app.generateMultiScalpSignal('BOOM1000','M1',[],1700000000);
    assert.equal(f.app.currentSignal,null,"stale report cannot create a recommendation");
    f.app.currentSignal={strategy:'multi_scalp_v1',marketId:'BOOM1000',riskRewardTargets:[1.5,2,3]};
    const size=f.app.calculateSafeLot(50,100,'BOOM1000');
    assert.equal(size.tp1Pips,150);assert.equal(size.tp1Profit,Number((size.actualRiskMoney*1.5).toFixed(2)),"target amount matches actual 1.5R strategy");
    assert.equal(f.app.localDemoUnitValue('UNKNOWN'),null);
    assert.equal(f.app.localDemoUnitValue('BOOM1000'),1);
  }
  {
    const f=fixture(),a=f.app;f.sandbox.window.AkiraReferenceScanner=require('./js/akira_reference_scanner');
    const now=f.sandbox.Date.now()/1000;
    const bars=Array.from({length:60},(_,i)=>({index:i,epoch:now-3600+i*60,open:100,high:101,low:99,close:100}));
    bars[58]={...bars[58],open:100.4,high:101.5,low:100,close:100.2};bars[59]={...bars[59],open:100.1,high:100.3,low:99.4,close:99.5};
    a.generateReferenceSignal('STEP100','M1',bars,now);
    assert.equal(a.currentSignal.strategy,'reference_sniper_v1');assert.equal(a.currentSignal.type,'SELL');
    assert.equal(a.currentSignal.entryTime,now*1000);assert.equal(a.currentSignal.entryValidUntil,(now+20)*1000);
    const original=JSON.stringify(a.currentSignal);a.generateReferenceSignal('STEP100','M1',bars,now);assert.equal(JSON.stringify(a.currentSignal),original);
    a.currentSignal=null;a.generateReferenceSignal('STEP100','M1',bars,now);assert.equal(a.currentSignal,null,'journal prevents repeat after switching');
    a.generateReferenceSignal('XAUUSD','M5',bars,now);assert.equal(a.currentSignal,null);
    a.generateReferenceSignal('XAUUSD','M1',bars.map(b=>({...b,epoch:b.epoch-60})),now-60);assert.equal(a.currentSignal,null,'old confirmations are not fresh entries');
    await a.sendSignalToTelegram({strategy:'reference_sniper_v1',marketId:'STEP100'},false);
  }
  {
    const f=fixture(),a=f.app,now=f.sandbox.Date.now()/1000,close=Math.floor(now/60)*60;
    a.selectedMarket='BOOM500';a.selectedTimeframe='M5';a.anticipationMonitor.select('BOOM500');
    const bars=Array.from({length:180},(_,i)=>({epoch:close-(180-i)*60,open:500-i,high:501-i,low:498-i,close:499-i}));
    a.anticipationMonitor.history(bars);a.candles.BOOM500=bars;a.marketPrices.BOOM500=320;
    a.observeAutomaticTick(320,now);assert.equal(a.currentSignal.strategy,'spike-anticipation-v1');
    assert.equal(a.currentSignal.analysisTimeframe,'M1');assert.equal(a.currentSignal.timeframe,'M5');
    assert.equal(a.anticipationMonitor.journal.length,1);
    a.observeAutomaticTick(320,now);assert.equal(a.anticipationMonitor.journal.length,1);
    await a.sendSignalToTelegram(a.currentSignal,false);
    a.selectedMarket='XAUUSD';a.assignAutomaticProfile();assert.equal(a.automaticProfile.id,'gold');
  }
  {
    const f=fixture();f.app.init();const socket=f.sockets[0];socket.open();
    assert.equal(socket.sent.filter(r=>r.ticks_history).length,1,'M1 reuses chart history for analysis');
    f.history(socket);assert.equal(f.app.anticipationMonitor.ready,true);
  }
  {
    const f=fixture();f.app.selectedTimeframe='M5';f.app.init();const socket=f.sockets[0];socket.open();f.history(socket);
    const first=f.app.scannerHistoryReqId;
    socket.message({req_id:first,error:{code:'InternalServerError',message:'internal server error'}});
    assert.equal(f.app.anticipationMonitor.ready,false);
    assert.ok(f.app.feedProblem.includes('avisos en pausa'));
    f.advance(2000);assert.notEqual(f.app.scannerHistoryReqId,first);
    const candles=Array.from({length:80},(_,i)=>({epoch:1699995000+i*60,open:100,high:101,low:99,close:100}));
    socket.message({req_id:f.app.scannerHistoryReqId,candles});
    assert.equal(f.app.anticipationMonitor.ready,true);assert.equal(f.app.feedProblem,null);
    socket.message({req_id:f.app.scannerHistoryReqId,error:{code:'InternalServerError'}});
    const before=socket.sent.length;f.app.retireDerivSocket();f.advance(16000);assert.equal(socket.sent.length,before,'retired socket cancels pending history retry');
  }
  console.log("PASS: single connection, bounded reconnect, stale-socket isolation, market switch, offline freeze/gates, recovery, heartbeat, Telegram levels and dedup; no external messages sent.");
}
main().catch(err=>{console.error(err);process.exitCode=1;});
