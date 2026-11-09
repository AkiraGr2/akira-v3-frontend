const {chromium}=require('playwright');
const fs=require('node:fs'),http=require('node:http'),path=require('node:path'),assert=require('node:assert/strict');
(async()=>{
  const root=path.resolve(__dirname,'..');
  const server=http.createServer((req,res)=>{
    const url=new URL(req.url,'http://localhost');
    const file=path.join(root,url.pathname==='/'?'index.html':decodeURIComponent(url.pathname));
    if(!file.startsWith(root)||!fs.existsSync(file)||!fs.statSync(file).isFile()){res.writeHead(404);return res.end();}
    const ext=path.extname(file);
    res.setHeader('Content-Type',({'.html':'text/html','.js':'application/javascript','.css':'text/css','.json':'application/json'})[ext]||'application/octet-stream');
    res.end(fs.readFileSync(file));
  });await new Promise(r=>server.listen(0,'127.0.0.1',r));
  const browser=await chromium.launch({headless:true,...(process.env.AKIRA_CHROME_PATH?{executablePath:process.env.AKIRA_CHROME_PATH}:{})});
  try{
    const page=await browser.newPage({viewport:{width:1280,height:900}});
    const errors=[];page.on('pageerror',e=>errors.push(e.message));
    await page.route('https://**',route=>{
      const url=route.request().url();
      const headers={'Access-Control-Allow-Origin':'*','Access-Control-Allow-Headers':'Authorization, Content-Type'};
      if(route.request().method()==='OPTIONS')return route.fulfill({status:204,headers});
      if(url.includes('onrender.com'))return route.fulfill({headers:{...headers,'Content-Type':'application/json'},body:JSON.stringify({ok:true,authenticated:true,is_authorized:true,is_owner:true,email:'fixture@example.test',expires_at:4102444800,capabilities:[],agents:[],nodes:[],edges:[],conversations:[],missions:[],tools:[],memories:[],tasks:[]})});
      // No third-party scripts execute in this deterministic startup test.
      return route.fulfill({headers:{...headers,'Content-Type':url.includes('.css')?'text/css':'application/javascript'},body:''});
    });
    await page.addInitScript(()=>{
      window.openedSockets=[];
      window.WebSocket=class{static OPEN=1;static CONNECTING=0;static CLOSED=3;constructor(url){openedSockets.push(String(url));this.readyState=0;}send(){}close(){this.readyState=3;}};
    });
    await page.goto('http://127.0.0.1:'+server.address().port,{waitUntil:'domcontentloaded'});
    await page.waitForTimeout(1800);
    assert.equal(await page.locator('#akiraMarketCanvas').count(),0,'no hidden Trading Lab chart at startup');
    assert.equal(await page.evaluate(()=>openedSockets.filter(x=>/deriv|binary/.test(x)).length),0,'no Deriv connection at startup');
    assert.equal(await page.evaluate(()=>document.querySelectorAll('head script[src*="cytoscape"]:not([defer]),head script[src*="d3-"]:not([defer])').length),0);
    await page.addStyleTag({content:'*,*::before,*::after{transition:none!important;animation:none!important}'});
    await page.evaluate(()=>{window.akiraSessionState={authenticated:true,is_owner:true,is_authorized:true};akiraSetEntryAccess(true);showSection('chat');});
    await page.locator('#chatSection').waitFor({state:'visible'});
    assert.equal(await page.locator('#chatSection').isVisible(),true);
    await page.locator('.btn-new').waitFor({state:'visible'});
    assert.equal(await page.locator('.btn-new').isVisible(),true);
    await page.evaluate(()=>showSection('trading'));
    assert.equal(await page.locator('#akiraMarketCanvas').count(),1);
    assert.ok(await page.evaluate(()=>openedSockets.some(x=>/deriv|binary/.test(x))));
    assert.deepEqual(errors,[]);
    console.log('PASS full page startup: no hidden trading chart/socket, deferred graph libraries, visible new-chat, Trading Lab initializes on navigation');
  }finally{await browser.close();await new Promise(r=>server.close(r));}
})().catch(e=>{console.error(e);process.exitCode=1;});
