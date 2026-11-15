const {chromium}=require('playwright');
const fs=require('fs'),http=require('http'),path=require('path'),assert=require('assert/strict');
const root=path.resolve(__dirname,'..');
(async()=>{const scripts=['akira_reference_scanner','akira_scalp_research_core','akira_trading_scanner_core','akira_spike_anticipation','akira_tick_radar','akira_tick_probability','akira_manual_spike_plan','akira_turn_scanner','akira_manual_spike_ui','akira_trading_lab'];
const server=http.createServer((req,res)=>{const url=new URL(req.url,'http://localhost');if(url.pathname==='/'){res.setHeader('Content-Type','text/html; charset=utf-8');return res.end('<meta name="viewport" content="width=device-width, initial-scale=1"><body style="margin:0;background:#080c14;color:white"><div id="tradingSection" class="active"></div>'+scripts.map(s=>'<script src="/js/'+s+'.js"></script>').join(''));}const file=path.join(root,url.pathname);if(!file.startsWith(root)||!fs.existsSync(file)){res.writeHead(404);return res.end();}res.setHeader('Content-Type',file.endsWith('.js')?'application/javascript':'application/json');res.end(fs.readFileSync(file));});await new Promise(r=>server.listen(0,'127.0.0.1',r));
const browser=await chromium.launch({headless:true,...(process.env.AKIRA_CHROME_PATH?{executablePath:process.env.AKIRA_CHROME_PATH}:{})});try{for(const width of [390,1280]){const page=await browser.newPage({viewport:{width,height:900}}),errors=[];page.on('pageerror',e=>errors.push(e.message));await page.addInitScript(()=>{window.WebSocket=class{static OPEN=1;static CONNECTING=0;constructor(){this.readyState=0;}send(){}close(){this.readyState=3;}};});await page.goto('http://127.0.0.1:'+server.address().port);await page.waitForSelector('#manualSpikeCard',{state:'attached',timeout:10000}).catch(async e=>{console.log(errors,await page.locator('body').innerText());throw e;});
await page.evaluate(()=>{const a=window.AkiraTradingLab;const now=Math.floor(Date.now()/1000),t=Math.floor(now/60)*60;const bars=Array.from({length:45},(_,i)=>({epoch:t-(44-i)*60,time:new Date((t-(44-i)*60)*1000).toISOString().slice(11,16),open:100+Math.sin(i/3)*.3,high:100.6,low:99.4,close:100+Math.cos(i/3)*.3}));a.manualSpike.select(a.selectedMarket);a.candles[a.selectedMarket]=bars;a.marketPrices[a.selectedMarket]=100;a.dataFeedKeys[a.selectedMarket]=a.selectedMarket+':M1';a.feedProblem=null;a.anticipationMonitor.history(bars);const p=window.AkiraManualSpikePlan.makePlan({marketId:a.selectedMarket,price:100,epoch:now,bars,changes:Array(300).fill(-.01)});a.manualSpike.plan={...p};a.manualSpike.last={price:100,epoch:now};a.manualSpike.render();window.labels=[];const draw=CanvasRenderingContext2D.prototype.fillText;CanvasRenderingContext2D.prototype.fillText=function(t,...args){labels.push(String(t));return draw.call(this,t,...args);};a.drawMarketCanvas();});
assert.equal(await page.locator('#simpleTradingDetails').count(),0);assert.equal(await page.locator('#manualSpikeDetails').isVisible(),false);assert.equal(await page.locator('#manualCopyAll').isVisible(),true);
assert.ok(await page.evaluate(()=>labels.includes('✓')&&labels.some(x=>x.startsWith('TP3 '))));assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
// Compare the canvas paths themselves: both line endpoints must coincide with recorded wick tips.
const anchored = await page.evaluate(() => {
 const app=window.AkiraTradingLab,bars=app.candles[app.selectedMarket];
 const initial=bars.map(bar=>({...bar}));
 const proto=CanvasRenderingContext2D.prototype, names=['beginPath','moveTo','lineTo','stroke'];
 const original=Object.fromEntries(names.map(name=>[name,proto[name]]));
 let points=[];const wicks=[],lines=[];
 try {
   for (const [i,bar] of bars.entries()){bar.high=101+i/100;bar.low=99-i/100;}
   bars[18].high=104;bars[33].high=103;bars[22].low=96;bars[35].low=95;
   bars.at(-1).high=112;bars.at(-1).low=89;
   for(const name of names)proto[name]=function(...args){
     if(name==='beginPath')points=[];
     if(name==='moveTo'||name==='lineTo')points.push(args);
     if(name==='stroke' && points.length===2){
       if(Math.abs(this.lineWidth-1.3)<.001)wicks.push(points);
       if(Math.abs(this.lineWidth-2.8)<.001 && ['#ef4444','#a855f7'].includes(this.strokeStyle))lines.push({color:this.strokeStyle,points});
     }
     return original[name].apply(this,args);
   };
   app.drawMarketCanvas();
   return [['#ef4444',[18,33],0],['#a855f7',[22,35],1]].every(([color,indices,tip])=>{
     const line=lines.find(l=>l.color===color);
     return indices.every((idx,k)=>line&&wicks[idx]&&line.points[k].every((v,axis)=>Math.abs(v-wicks[idx][tip][axis])<0.001));
   });
 }finally{Object.assign(proto,original);bars.forEach((bar,i)=>Object.assign(bar,initial[i]));app.drawMarketCanvas();}
});
assert.ok(anchored,'support and resistance align with the correct wick and price at width '+width);
assert.ok(await page.evaluate(()=>{const a=AkiraTradingLab,p=a.manualSpike.viewPlan(),pip=a.getChartPipSize(p.marketId);
return ['sl','tp1','tp2','tp3'].every(k=>labels.includes((k==='sl'?'−':'+')+(Math.abs(p[k]-p.entry)/pip).toLocaleString('es-CO',{maximumFractionDigits:2})+' pips'));}), 'all four distances appear on the chart');
const box=await page.locator('#chartStageContainer').boundingBox();assert.ok(box.y<480,'chart is close to top: '+box.y);
if(process.env.AKIRA_SCREENSHOT_DIR)await page.screenshot({path:path.join(process.env.AKIRA_SCREENSHOT_DIR,'chart-first-'+width+'.png')});
await page.locator('#btnToggleLevels').click();await page.evaluate(()=>{labels=[];AkiraTradingLab.drawMarketCanvas();});assert.equal(await page.evaluate(()=>labels.some(x=>x.startsWith('TP3 '))),false);
await page.locator('#manualLevelEditor > summary').click();
await page.locator('#manualEdit_sl').fill('90');await page.locator('#manualEdit_tp1').fill('110');await page.locator('#manualEdit_tp2').fill('120');await page.locator('#manualEdit_tp3').fill('130');
await page.getByRole('button',{name:'Aplicar al gráfico',exact:true}).click();
assert.equal(await page.evaluate(()=>AkiraTradingLab.manualSpike.viewPlan().sl),90);
assert.notEqual(await page.evaluate(()=>AkiraTradingLab.manualSpike.plan.sl),90);
await page.locator('#manualEdit_sl').fill('101');await page.getByRole('button',{name:'Aplicar al gráfico',exact:true}).click();
assert.ok((await page.locator('#manualEditMessage').innerText()).includes('orden'));
assert.equal(await page.evaluate(()=>AkiraTradingLab.manualSpike.viewPlan().sl),90);
await page.getByRole('button',{name:'Restaurar propuesta',exact:true}).click();assert.equal(await page.evaluate(()=>Boolean(AkiraTradingLab.manualSpike.plan.customLevels)),false);
assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);await page.evaluate(()=>{const a=AkiraTradingLab,c=a.manualSpike,now=Math.floor(Date.now()/1000),t=Math.floor(now/60)*60;const bars=Array.from({length:65},(_,i)=>({epoch:t-(65-i)*60,open:100,high:101,low:99,close:100}));bars[64]={epoch:t-60,open:100,high:100.5,low:98,close:100};c.turnVariant='rejection';c.plan=AkiraTurnScanner.makePlan({marketId:c.market,bars,epoch:t,eventEpochs:[t-30],eventCoverageFrom:t-400},AkiraScalpResearchCore);c.last={price:100,epoch:now};c.render();});
assert.ok((await page.locator('#manualSpikeStatus').innerText()).includes('no fue anticipado'));
assert.deepEqual(errors,[]);await page.close();}
console.log('PASS chart-first mobile/desktop: actual lab renderer, candle checkmark, price targets, one collapsed details section, level toggle, no overflow/errors');}finally{await browser.close();await new Promise(r=>server.close(r));}})().catch(e=>{console.error(e);process.exitCode=1});
