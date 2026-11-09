(function(root){
  'use strict';
  const MEANS=Object.freeze({BOOM300N:300,CRASH300N:300,BOOM500:500,CRASH500:500,BOOM1000:1000,CRASH1000:1000});
  const median=a=>{const b=a.slice().sort((x,y)=>x-y);return (b[(b.length-1)>>1]+b[b.length>>1])/2;};
  // Reference geometric model, not a calibrated signal or probability of profit.
  const cumulative=(ticks,mean)=>100*-Math.expm1(ticks*Math.log1p(-1/mean));
  class Radar {
    constructor(){this.states=new Map();this.market=null;}
    select(market){if(this.market===market)return;this.pause();this.market=market;if(MEANS[market])this.reset(market);}
    reset(market){const prior=this.states.get(market);this.states.set(market,{previous:null,changes:[],since:null,events:prior?.events||[],intervals:prior?.intervals||[],live:false});}
    pause(){for(const s of this.states.values()){s.live=false;s.previous=null;s.changes=[];s.since=null;}}
    tick(market,price,epoch){
      if(market!==this.market||!MEANS[market]||!Number.isFinite(price)||price<=0||!Number.isFinite(epoch))return null;
      let s=this.states.get(market);if(!s){this.reset(market);s=this.states.get(market);}
      if(s.previous&&epoch<s.previous.epoch)return null;
      if(s.previous&&epoch===s.previous.epoch){if(price===s.previous.price)return null;this.reset(market);s=this.states.get(market);}
      if(s.previous&&epoch-s.previous.epoch>5){this.reset(market);s=this.states.get(market);}
      let event=null;
      if(s.previous){
        const delta=price-s.previous.price,scale=s.changes.length===300?median(s.changes):null;
        if(s.since!==null)s.since++;
        if(scale>0&&(market.startsWith('BOOM')?delta:-delta)>3*scale){
          event={market,epoch,price,interval:s.since,threshold:3*scale};
          if(s.since!==null){s.intervals.push(s.since);s.intervals=s.intervals.slice(-100);}
          s.events.push(event);s.events=s.events.slice(-100);s.since=0;
        }
        s.changes.push(Math.abs(delta));if(s.changes.length>300)s.changes.shift();
      }
      s.previous={price,epoch};s.live=true;return event;
    }
    snapshot(market,now){
      const s=this.states.get(market);if(!MEANS[market])return null;
      const live=Boolean(s?.live&&s.previous&&now>=s.previous.epoch&&now-s.previous.epoch<=5);
      const since=live?s.since:null;
      return {market,live,warmup:s?.changes.length||0,ticksSince:since,cumulativePercent:since===null?null:cumulative(since,MEANS[market]),
        referenceNextTickPercent:100/MEANS[market],referenceNext60TicksPercent:cumulative(60,MEANS[market]),
        observedIntervals:s?.intervals.length||0,meanObservedInterval:s?.intervals.length?s.intervals.reduce((a,b)=>a+b,0)/s.intervals.length:null,
        lastEvent:s?.events.at(-1)||null,eligibleForEntry:false};
    }
    export(){return {version:'tick-radar-v1',detector:'directional delta > 3 x median of previous 300 absolute tick changes',source:'observed selected-market public ticks; not MT5 executions',states:[...this.states].map(([market,s])=>({market,events:s.events,intervals:s.intervals})),eligibleForEntry:false};}
  }
  const api={Radar,MEANS,cumulative};if(typeof module!=='undefined')module.exports=api;root.AkiraTickRadar=api;
})(typeof window!=='undefined'?window:globalThis);
