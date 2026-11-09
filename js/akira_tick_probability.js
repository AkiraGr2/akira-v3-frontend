(function(root){
  'use strict';
  const VERSION='tick-probability-v1';
  const MEANS=Object.freeze({BOOM300N:300,CRASH300N:300,BOOM500:500,CRASH500:500,BOOM1000:1000,CRASH1000:1000});
  const FEATURE_NAMES=Object.freeze(['elapsed_ticks_over_nominal','counter_spike_fraction_60','log_median20_over_previous60','log_median_abs_deviation60_over_median300']);
  const median=a=>{if(!a.length)return null;const b=a.slice().sort((x,y)=>x-y);return (b[(b.length-1)>>1]+b[b.length>>1])/2;};
  const lower=(a,v)=>{let l=0,r=a.length;while(l<r){const m=(l+r)>>1;if(a[m]<v)l=m+1;else r=m;}return l;};
  class Tracker {
    constructor(market){this.select(market);}
    select(market){if(this.market===market)return;this.market=market;this.reset();}
    reset(){this.previous=null;this.changes=[];this.sorted=[];this.elapsed=null;this.lastEvent=null;}
    tick(price,epoch){
      if(!MEANS[this.market]||!Number.isFinite(price)||price<=0||!Number.isFinite(epoch))return {accepted:false,event:false,reset:false};
      if(this.previous&&epoch<this.previous.epoch)return {accepted:false,event:false,reset:false};
      if(this.previous&&epoch===this.previous.epoch&&price===this.previous.price)return {accepted:false,event:false,reset:false};
      let didReset=false;
      if(this.previous&&(epoch===this.previous.epoch||epoch-this.previous.epoch>5)){this.reset();didReset=true;}
      let event=false;
      if(this.previous){
        const delta=price-this.previous.price,scale=this.sorted.length===300?(this.sorted[149]+this.sorted[150])/2:null;
        if(this.elapsed!==null)this.elapsed++;
        if(scale>0&&(this.market.startsWith('BOOM')?delta:-delta)>3*scale){event=true;this.elapsed=0;this.lastEvent=epoch;}
        this.changes.push(delta);this.sorted.splice(lower(this.sorted,Math.abs(delta)),0,Math.abs(delta));
        if(this.changes.length>300){const removed=Math.abs(this.changes.shift());this.sorted.splice(lower(this.sorted,removed),1);}
      }
      this.previous={price,epoch};return {accepted:true,event,reset:didReset};
    }
    features(now){
      if(!this.previous||!MEANS[this.market]||this.changes.length<300||this.elapsed===null||!Number.isFinite(now)||now<this.previous.epoch||now-this.previous.epoch>5)return null;
      const abs=this.changes.map(Math.abs),scale=median(abs),before=median(abs.slice(-80,-20));if(!(scale>0&&before>0))return null;
      const sign=this.market.startsWith('BOOM')?1:-1,last=this.changes.slice(-60),center=median(last),mad=median(last.map(v=>Math.abs(v-center)));
      const logRatio=(n,d)=>Math.max(-4,Math.min(4,Math.log(Math.max(n/d,Math.exp(-4)))));
      const values=[Math.min(20,this.elapsed/MEANS[this.market]),last.filter(d=>sign*d<0).length/60,logRatio(median(abs.slice(-20)),before),logRatio(mad,scale)];
      return {epoch:this.previous.epoch,values};
    }
  }
  function softmax(logits){const top=Math.max(...logits),e=logits.map(x=>Math.exp(x-top)),sum=e.reduce((a,b)=>a+b,0);return e.map(x=>x/sum);}
  function predict(artifact,market,feature){
    const m=artifact?.models?.[market];
    if(artifact?.version!==VERSION||m?.featureVersion!==VERSION||!MEANS[market]||!feature||!Number.isFinite(feature.epoch)||!Array.isArray(feature.values)||feature.values.length!==4||!feature.values.every(Number.isFinite))return null;
    if(!Array.isArray(m.means)||!Array.isArray(m.scales)||m.means.length!==4||m.scales.length!==4||!m.means.every(Number.isFinite)||!m.scales.every(x=>Number.isFinite(x)&&x>0))return null;
    if(!Array.isArray(m.weights)||m.weights.length!==3||!m.weights.every(w=>Array.isArray(w)&&w.length===5&&w.every(Number.isFinite))||!(m.temperature>0&&Number.isFinite(m.temperature)))return null;
    if(!Array.isArray(m.classPriors)||m.classPriors.length!==3||!m.classPriors.every(x=>Number.isFinite(x)&&x>=0&&x<=1)||Math.abs(m.classPriors.reduce((a,b)=>a+b,0)-1)>1e-6)return null;
    const x=[1,...feature.values.map((v,i)=>(v-m.means[i])/m.scales[i])];
    const p=softmax(m.weights.map(w=>w.reduce((s,v,i)=>s+v*x[i],0)/m.temperature));
    if(!p.every(Number.isFinite))return null;
    return {epoch:feature.epoch,within60:p[0],within300:p[0]+p[1],baseline60:m.classPriors[0],baseline300:m.classPriors[0]+m.classPriors[1],
      status:'experimental',eligibleForEntry:false,probabilityOfProfit:null,modelVersion:VERSION,checkBrierImprovement:m.checkBrierImprovement===true};
  }
  const api={VERSION,MEANS,FEATURE_NAMES,Tracker,predict,softmax,median};root.AkiraTickProbability=api;if(typeof module!=='undefined'&&module.exports)module.exports=api;
})(typeof window!=='undefined'?window:globalThis);
