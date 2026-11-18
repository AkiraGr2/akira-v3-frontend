const assert=require('node:assert/strict');
const vm=require('node:vm');
const fs=require('node:fs');
const html=fs.readFileSync('index.html','utf8');
const source=html.slice(html.indexOf('function akiraSetEntryAccess('),html.indexOf('\nfunction showSection(name)'));
function fixture(){
  const items=new Map(), elements=new Map();
  const classes=new Set();
  const element=()=>({querySelector(){return null},style:{},dataset:{},classList:{toggle(){}},setAttribute(){},removeAttribute(){}});
  const body={children:[],classList:{toggle(k,v){v?classes.add(k):classes.delete(k)},contains:k=>classes.has(k)}};
  let now=1800000000000, response=200, calls=0;
  const ctx={console,AbortController,CustomEvent:function(){},setTimeout,clearTimeout,setInterval(){},Date:{now:()=>now},
    localStorage:{getItem:k=>items.get(k)||null,setItem:(k,v)=>items.set(k,String(v)),removeItem:k=>items.delete(k)},
    document:{body,getElementById(k){if(!elements.has(k))elements.set(k,element());return elements.get(k)}},
    fetch:async()=>{calls++;if(response===0)throw Error('offline');return {ok:response===200,status:response,json:async()=>({authenticated:response===200,is_authorized:response===200,email:'test@example.com',expires_at:1800086400})}}};
  ctx.window=ctx;ctx.dispatchEvent=()=>{};vm.createContext(ctx);vm.runInContext(source,ctx);
  return {ctx,items,classes,setResponse:v=>response=v,advance:ms=>now+=ms,calls:()=>calls};
}
(async()=>{
  const f=fixture(), c=f.ctx;
  c.localStorage.setItem('akira_session_token','fixture-token');c.localStorage.setItem('akira_session_exp',1800086400);
  await c.akiraVerifySession();assert.equal(f.classes.has('akira-auth-locked'),false);
  f.advance(23*3600000);f.setResponse(503);await c.akiraVerifySession(true);
  assert.equal(f.classes.has('akira-auth-locked'),false);assert.equal(c.akiraSessionState.authenticated,true);
  f.setResponse(0);await c.akiraVerifySession(true);assert.equal(f.classes.has('akira-auth-locked'),false);
  f.setResponse(200);c.akiraHandleAuthFailure(401);await c.akiraVerifySession(true);
  assert.equal(c.localStorage.getItem('akira_session_token'),'fixture-token');
  f.advance(3600000);await c.akiraVerifySession(true);
  assert.equal(c.localStorage.getItem('akira_session_token'),null);assert.equal(f.classes.has('akira-auth-locked'),true);
  for(const status of [401,403]){
    const g=fixture();g.ctx.localStorage.setItem('akira_session_token','test');g.ctx.localStorage.setItem('akira_session_exp',1800086400);
    await g.ctx.akiraVerifySession();g.setResponse(status);await g.ctx.akiraVerifySession(true);
    assert.equal(g.ctx.localStorage.getItem('akira_session_token'),null);assert.equal(g.classes.has('akira-auth-locked'),true);
  }
  const fresh=fixture();fresh.ctx.localStorage.setItem('akira_session_token','test');fresh.ctx.localStorage.setItem('akira_session_exp',1800086400);
  fresh.setResponse(503);await fresh.ctx.akiraVerifySession();assert.equal(fresh.classes.has('akira-auth-locked'),true);
  console.log('PASS: 23h continuity, offline/503, unrelated 401 revalidation, 24h expiry, server 401/403 rejection, unverified gate');
})().catch(e=>{console.error(e);process.exitCode=1});

