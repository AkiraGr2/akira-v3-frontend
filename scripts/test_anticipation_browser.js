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
    await page.goto(`http://127.0.0.1:${server.address().port}`);await page.waitForSelector('#automaticStrategyInfo');
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
    assert.equal(await page.locator('#simpleTradingWarning').isVisible(),true);
    assert.equal(await page.locator('#selMarketHeader').isVisible(),true);
    assert.ok((await page.locator('#chartStageContainer').boundingBox()).y<650,'chart must appear before technical details');
    await page.locator('#simpleTradingResults > summary').click();
    const box=await page.locator('#automaticStrategyInfo').boundingBox();assert.ok(box.width>0&&box.width<=390);
    await page.locator('#simpleTradingResults > summary').click();
    await page.evaluate(()=>window.scrollTo(0,0));
    if(process.env.AKIRA_SCREENSHOT)await page.screenshot({path:process.env.AKIRA_SCREENSHOT});
    assert.deepEqual(errors,[]);console.log('PASS mobile: automatic profiles, old preference ignored, demo visible, no strategy selector, panel fits 390px, no browser exceptions');
  }finally{if(browser)await browser.close();await new Promise(r=>server.close(r));}
})().catch(e=>{console.error(e);process.exitCode=1;});
