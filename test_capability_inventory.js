const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const html=fs.readFileSync('index.html','utf8');
const start=html.indexOf('async function renderLevels()');
const code=html.slice(start,html.indexOf('</script>',start));
async function render(data){
  const list={innerHTML:'',textContent:''};let published;
  const context={document:{getElementById:()=>list},localStorage:{getItem:()=>null},
    akiraAuthHeaders:()=>({}),fetch:async()=>({json:async()=>data}),
    window:{akiraRuntimeCapabilities:{},akiraPublishCapabilityRegistry:(...args)=>{published=args;}},
    runtimeStatus:()=> 'unknown',fetchRuntimeCapabilities:async()=>({})};
  vm.createContext(context);vm.runInContext(code,context);await context.renderLevels();return {list,published};
}
(async()=>{
  const registry=[{name:'tool_registry',effective_state:'verified'}];
  const items=Array.from({length:66},(_,i)=>({id:'F'+i,name:i===0?'<img src=x onerror=alert(1)>':'Feature',description:'Source',limitations:[],implementation_evidence:i===1?'placeholder':'source_located'}));
  const a=await render({ok:true,capabilities_registry:registry,capability_inventory:{items,summary:{total:66}}});
  assert.equal((a.list.innerHTML.match(/ak-level-hud-card/g)||[]).length,66);
  assert.ok(a.list.innerHTML.includes('&lt;img'));assert.ok(!a.list.innerHTML.includes('<img'));
  assert.ok(a.list.innerHTML.includes('Implementación pendiente'));assert.ok(!a.list.innerHTML.includes('Contrato verificado'));
  assert.equal(a.published[1].items.length,66);
  const fallback=await render({ok:true,capabilities_registry:registry});
  assert.ok(fallback.list.innerHTML.includes('Contrato verificado'));
  const empty=await render({ok:true,capabilities_registry:[]});assert.ok(empty.list.textContent.includes('sin verificar'));
  console.log('PASS inventory UI: all items visible, no inherited verification, escaping and old-backend compatibility');
})().catch(e=>{console.error(e);process.exitCode=1;});
const listeners={};
const context={window:{addEventListener:(name,fn)=>{listeners[name]=fn;}},document:{querySelectorAll:()=>[],createTreeWalker:()=>({nextNode:()=>null}),addEventListener:()=>{},body:{}},NodeFilter:{SHOW_TEXT:4}};
vm.createContext(context);vm.runInContext(fs.readFileSync('js/akira_capability_truth.js','utf8'),context);
context.window.akiraPublishCapabilityRegistry([{effective_state:'unverified'},{effective_state:'verified'}]);
assert.equal(context.window.akiraCapabilitySummary(),'1 de 2 contratos verificados');
context.window.akiraPublishCapabilityRegistry([]);
assert.equal(context.window.akiraCapabilitySummary(),'0 de 0 contratos verificados');
listeners['akira:session-invalid']();
assert.equal(context.window.akiraCapabilitySummary(),'Capacidades: sin verificar');
const admin=fs.readFileSync('js/akira_admin.js','utf8');
assert.ok(!admin.includes('Math.max(reg.length, 15)'));
assert.ok(!admin.includes('verCount > 0 ? verCount : 15'));
assert.ok(!admin.includes('indexOf("verified") !== -1'));
console.log('PASS counters: exact verified state, no minimum 15, logout clears evidence');
