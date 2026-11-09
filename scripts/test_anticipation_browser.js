const {chromium}=require('playwright');
const fs=require('node:fs'),http=require('node:http'),path=require('node:path'),assert=require('node:assert/strict');
(async()=>{
  const root=path.resolve(__dirname,'..');
  const scripts=['akira_reference_scanner','akira_scalp_research_core','akira_trading_scanner_core','akira_spike_anticipation','akira_trading_lab'];
  const server=http.createServer((req,res)=>{const url=new URL(req.url,'http://localhost');
    if(url.pathname==='/'){res.setHeader('Content-Type','text/html; charset=utf-8');res.end('<meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><body style="background:#080c14;color:#e2e8f0;margin:0"><div id="tradingSection"></div>'+scripts.map(s=>`<script src="/js/${s}.js"></script>`).join(''));return;}
    const file=path.join(root,url.pathname);if(!file.startsWith(root)||!fs.existsSync(file)){res.writeHead(404);res.end();return;}
    res.setHeader('Content-Type',file.endsWith('.js')?'application/javascript':'application/json');res.end(fs.readFileSync(file));
  });await new Promise(r=>server.listen(0,'127.0.0.1',r));
  let browser;
  try{
    browser=await chromium.launch({headless:true,...(process.env.AKIRA_CHROME_PATH?{executablePath:process.env.AKIRA_CHROME_PATH}:{})});
    const page=await browser.newPage({viewport:{width:390,height:844}}),errors=[];page.on('pageerror',e=>errors.push(e.message));
    await page.addInitScript(()=>{window.WebSocket=class{static OPEN=1;static CONNECTING=0;static CLOSED=3;constructor(){this.readyState=0;}send(){}close(){this.readyState=3;}};localStorage.setItem('akira_scanner_strategy_v1','structural');});
    await page.goto(`http://127.0.0.1:${server.address().port}`);await page.waitForSelector('#simpleTradingWarning',{state:'attached'});
    assert.equal(await page.locator('#scannerStrategyMode').count(),0);
    assert.equal(await page.locator('#scalpPracticeToggle').isChecked(),true);
    for(const [id,expected] of [['BOOM500','spike'],['CRASH300N','spike'],['XAUUSD','gold'],['EURUSD','forex'],['BTCUSDT','crypto'],['STEP100','reference']]){
      const actual=await page.evaluate(id=>{const a=window.AkiraTradingLab;a.selectedMarket=id;a.assignAutomaticProfile();return a.automaticProfile.id;},id);assert.equal(actual,expected);
    }
    await page.evaluate(()=>{const a=window.AkiraTradingLab;a.selectedMarket='BOOM500';a.assignAutomaticProfile();});
    assert.equal(await page.locator('#simpleTradingResults').getAttribute('open'),null);
    assert.equal(await page.locator('#simpleTradingHistory').getAttribute('open'),null);
    assert.equal(await page.locator('#btnHeaderTelegramAlerts').isVisible(),false);
    assert.equal(await page.locator('#btnScannerBacktest').isVisible(),false);
    assert.equal(await page.locator('#simpleTradingWarning').isVisible(),false);
    assert.equal(await page.locator('#selMarketHeader').isVisible(),true);
    assert.ok((await page.locator('#chartStageContainer').boundingBox()).y<650,'chart must appear before technical details');
    await page.locator('#simpleTradingDetails > summary').click();
    await page.locator('#simpleTradingResults > summary').click();
    const box=await page.locator('#automaticStrategyInfo').boundingBox();assert.ok(box.width>0&&box.width<=390);
    await page.locator('#simpleTradingResults > summary').click();
    await page.evaluate(()=>window.scrollTo(0,0));

    // Exercise the real canvas renderer with a valid confirmed Gartley and no channel.
    const drawn=await page.evaluate(()=>{
      const a=window.AkiraTradingLab,labels=[];
      const original=CanvasRenderingContext2D.prototype.fillText;
      CanvasRenderingContext2D.prototype.fillText=function(text,...args){labels.push(String(text));return original.call(this,text,...args);};
      const bars=Array.from({length:42},(_,i)=>({epoch:i*60,open:149.4,high:150,low:149,close:149.6}));
      const pivots=[['low',5,100],['high',12,200],['low',19,138.2],['high',26,180],['low',33,121.4]];
      for(const [kind,i,price] of pivots){
        bars[i]={epoch:i*60,open:price,close:price,high:kind==='high'?price:price+1,low:kind==='low'?price:price-1};
        for(let d=-3;d<=3;d++){if(!d)continue;const b=bars[i+d];
          if(kind==='high'){b.high=Math.min(b.high,price-1);b.low=Math.min(b.low,b.high-1);}
          else{b.low=Math.max(b.low,price+1);b.high=Math.max(b.high,b.low+1);}
          b.open=b.low+(b.high-b.low)*.4;b.close=b.low+(b.high-b.low)*.6;
        }
      }
      a.candles[a.selectedMarket]=bars;a.showHarmonics=true;a.showSniper=true;
      a.calculateSniperChannel=()=>null;
      a.hasLiveDerivFeed=()=>true;a.anticipationMonitor.ready=true;
      a.currentSignal={marketId:a.selectedMarket,type:'BUY',strategy:'spike-anticipation-v1',entry:145,sl:140,tp1:152.5,tp2:155,tp3:160,riskPips:5,entryCandleIdx:35,signalEpoch:2100,entryValidUntil:Date.now()+20000,status:'available'};
      a.renderSimpleTradePlan();a.drawMarketCanvas();
      CanvasRenderingContext2D.prototype.fillText=original;
      return {labels,pattern:a.detectHarmonicPivots(bars)?.patternName};
    });
    assert.equal(drawn.pattern,'Gartley 0.786');
    assert.ok(drawn.labels.some(x=>x.includes('D [PRZ] (0.786)')),'actual harmonic D label must be drawn');
    assert.ok(drawn.labels.some(x=>x.includes('CHULITO VERDE')),'entry marker must render even without a channel');
    assert.equal(await page.locator('#btnToggleHarmonics').isVisible(),true);
    assert.match(await page.locator('#simpleHarmonicStatus').innerText(),/confirmado/);
    assert.match(await page.locator('#chartTradePlan').innerText(),/✓ Aviso de práctica: compra/);
    await page.evaluate(()=>{const a=window.AkiraTradingLab;a.currentSignal.status='tracking';a.currentSignal.entryValidUntil=0;a.renderSimpleTradePlan();});
    assert.match(await page.locator('#chartTradePlan').innerText(),/en seguimiento/);
    await page.evaluate(()=>{const a=window.AkiraTradingLab;a.currentSignal=null;a.scannerStatus='Esperando zona extrema';a.candles[a.selectedMarket]=Array.from({length:42},(_,i)=>({epoch:i*60,open:100,high:101,low:99,close:100}));a.drawMarketCanvas();a.renderSimpleTradePlan();});
    assert.match(await page.locator('#simpleHarmonicStatus').innerText(),/no hay un armónico confirmado/);
    assert.match(await page.locator('#chartTradePlan').innerText(),/0 avisos guardados/);

    if(process.env.AKIRA_SCREENSHOT)await page.screenshot({path:process.env.AKIRA_SCREENSHOT});
    assert.deepEqual(errors,[]);console.log('PASS mobile: automatic profiles, old preference ignored, demo visible, no strategy selector, panel fits 390px, no browser exceptions');
  }finally{if(browser)await browser.close();await new Promise(r=>server.close(r));}
})().catch(e=>{console.error(e);process.exitCode=1;});
