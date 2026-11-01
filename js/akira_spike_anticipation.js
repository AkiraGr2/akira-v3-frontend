(function(root){
  'use strict';
  const VERSION='spike-anticipation-v1';
  const SYNTHETICS=['BOOM300N','CRASH300N','BOOM300','CRASH300','BOOM500','CRASH500','BOOM1000','CRASH1000'];
  function profile(id){
    if(SYNTHETICS.includes(id))return {id:'spike',label:'Spikes anticipados · M1 + contexto M5',direction:id.startsWith('BOOM')?'BUY':'SELL'};
    if(id==='STEP100')return {id:'reference',label:'Step · rechazo y confirmación'};
    const family=({XAUUSD:'gold',EURUSD:'forex',GBPUSD:'forex',USDJPY:'forex',BTCUSDT:'crypto',ETHUSDT:'crypto'})[id];
    return {id:family||'unsupported',label:({gold:'Oro · ruptura',forex:'Forex · retroceso o rango',crypto:'Cripto · continuación'})[family]||'Sin estrategia compatible'};
  }
  function pivots(bars,buy){
    const key=buy?'low':'high',out=[];
    for(let i=2;i<bars.length-2;i++)if([-2,-1,1,2].every(d=>buy?bars[i][key]<bars[i+d][key]:bars[i][key]>bars[i+d][key]))out.push(i);
    return out;
  }
  function setup(bars,marketId,core){
    if(profile(marketId).id!=='spike'||bars.length<75)return null;
    const tail=bars.slice(-180);
    if(tail.some((b,i)=>i&&b.epoch!==tail[i-1].epoch+60))return null;
    let ctx;try{ctx=core.buildContext(tail);}catch(_){return null;}
    const i=tail.length-1,b=tail[i],h=ctx.hMap[i];
    if(h<11||!(ctx.atr[i]>0)||!Number.isFinite(ctx.rsi[i]))return null;
    const zone=ctx.higher.slice(h-11,h+1),low=Math.min(...zone.map(x=>x.low)),high=Math.max(...zone.map(x=>x.high));
    if(!(high>low))return null;
    const buy=marketId.startsWith('BOOM'),position=(b.close-low)/(high-low),rsi=ctx.rsi[i];
    if(buy?position>.2:position<.8)return null;
    const causes=[];
    if(buy?rsi<=15:rsi>=85)causes.push('zone_rsi');
    const p=pivots(tail,buy),second=p.at(-1),first=p.at(-2);
    if(second===i-2&&first!==undefined&&second-first>=5&&second-first<=60){
      const divergence=buy?tail[second].low<tail[first].low&&ctx.rsi[second]>ctx.rsi[first]:tail[second].high>tail[first].high&&ctx.rsi[second]<ctx.rsi[first];
      if(divergence)causes.push('zone_divergence');
    }
    if(!causes.length)return null;
    const risk=2*ctx.atr[i],sign=buy?1:-1,epoch=b.epoch+60;
    return {id:`${VERSION}:${marketId}:${epoch}`,strategy:VERSION,version:VERSION,marketId,type:buy?'BUY':'SELL',causes,
      entry:b.close,risk,sl:b.close-sign*risk,tp1:b.close+sign*1.5*risk,tp2:b.close+sign*2*risk,tp3:b.close+sign*3*risk,
      signalCandleEpoch:b.epoch,signalEpoch:epoch,entryEpoch:epoch,entryValidUntil:(epoch+20)*1000,maxHoldSeconds:300,
      atr:ctx.atr[i],indicators:{rsi14:rsi,atr14:ctx.atr[i],zoneLow:low,zoneHigh:high,zonePosition:position},status:'available',eligibleForAlerts:false};
  }
  // All outcomes use observed ticks after the signal, never the OHLC containing the alert.
  function advance(s,price,epoch){
    if(!s||!Number.isFinite(price)||!Number.isFinite(epoch)||epoch<s.signalEpoch||s.completedAt)return false;
    if(s.lastObservedEpoch&&epoch-s.lastObservedEpoch>5)s.hadDataGap=true;
    s.lastObservedEpoch=epoch;
    const finish=(status,fillPrice=price)=>{s.status=status;s.completedAt=epoch*1000;s.exitPrice=fillPrice;s.resultR=s.fillEpoch?(fillPrice-s.entry)*(s.type==='BUY'?1:-1)/s.risk:null;return true;};
    if(s.status==='available'){
      if(epoch>s.signalEpoch+20)return finish('expired');
      if(Math.abs(price-s.entry)>.2*s.risk)return finish('cancelled_price');
      if(epoch<(s.observedAt||s.signalEpoch)+(s.latencySeconds||5))return false;
      s.entry=price;s.fillEpoch=epoch;s.status='tracking';const sign=s.type==='BUY'?1:-1;
      s.sl=price-sign*s.risk;s.tp1=price+sign*1.5*s.risk;s.tp2=price+sign*2*s.risk;s.tp3=price+sign*3*s.risk;
    }
    if(s.status!=='tracking')return false;
    const buy=s.type==='BUY';
    if(buy?price<=s.sl:price>=s.sl)return finish('stop');
    if(buy?price>=s.tp1:price<=s.tp1)return finish('target',s.tp1);
    if(epoch>=s.fillEpoch+300)return finish('time_exit');
    return false;
  }
  class Monitor{
    constructor(core,storage){this.core=core;this.storage=storage;this.bars=[];this.marketId=null;this.journal=[];this.ready=false;
      try{const j=JSON.parse(storage?.getItem('akira_anticipation_journal_v1')||'[]');if(Array.isArray(j))this.journal=j.filter(s=>s.version===VERSION&&typeof s.id==='string'&&Number.isFinite(s.signalEpoch)&&s.risk>0);}catch(_){}
    }
    save(){try{this.storage?.setItem('akira_anticipation_journal_v1',JSON.stringify(this.journal));}catch(_){this.storageError=true;}}
    select(id){
      for(const s of this.journal.filter(s=>!s.completedAt&&s.marketId!==id)){
        s.status=s.fillEpoch?'interrupted_market_change':'cancelled_market_change';s.completedAt=Date.now();s.resultR=null;
      }
      this.marketId=id;this.bars=[];this.ready=false;this.save();
    }
    history(raw){
      this.ready=false;
      try{const bars=raw.map(b=>({epoch:Number(b.epoch),open:Number(b.open),high:Number(b.high),low:Number(b.low),close:Number(b.close)}));
        this.core.validateBars(bars);this.bars=bars.slice(-1000);this.ready=true;
      }catch(_){this.bars=[];}
    }
    tick(price,epoch){
      if(!this.ready||!Number.isFinite(price)||!Number.isFinite(epoch))return null;
      const bucket=Math.floor(epoch/60)*60,last=this.bars.at(-1);if(!last||bucket<last.epoch)return null;
      let active=this.journal.findLast(s=>s.marketId===this.marketId&&!s.completedAt);
      if(active){advance(active,price,epoch);this.save();}
      if(bucket===last.epoch){last.close=price;last.high=Math.max(last.high,price);last.low=Math.min(last.low,price);return active||null;}
      const closed=this.bars.slice();this.bars.push({epoch:bucket,open:price,high:price,low:price,close:price});this.bars=this.bars.slice(-1000);
      if(bucket-last.epoch!==60||epoch-bucket>20||active&&!active.completedAt)return active||null;
      const recent=this.journal.findLast(s=>s.marketId===this.marketId);
      if(recent&&epoch<(recent.completedAt||recent.signalEpoch*1000)/1000+120)return active||null;
      // Signals on a reload are deduplicated using the persisted identifier.
      const signal=setup(closed,this.marketId,this.core);
      if(!signal||this.journal.some(s=>s.id===signal.id))return active||null;
      signal.observedAt=epoch;signal.lastObservedEpoch=epoch;
      this.journal.push(signal);advance(signal,price,epoch);this.save();return signal;
    }
  }
  const api={VERSION,profile,pivots,setup,advance,Monitor};root.AkiraSpikeAnticipation=api;if(typeof module!=='undefined'&&module.exports)module.exports=api;
})(typeof globalThis!=='undefined'?globalThis:this);
