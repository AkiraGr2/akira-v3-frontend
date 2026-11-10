const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const played=[];class Audio{play(){played.push(new URL(this.src).searchParams.get('text'));return Promise.resolve();}pause(){}removeAttribute(){}load(){}}
const context={window:{},document:{getElementById:()=>null},localStorage:{getItem:()=>null},Audio,console,setTimeout,clearTimeout,setInterval,clearInterval,URL};vm.createContext(context);vm.runInContext(fs.readFileSync('js/akira_voice_live.js','utf8'),context);
const live=context.window.AkiraVoiceLive;live.active=true;live.updateHUD=live.updateMasterButton=live.setSubtitles=()=>{};
const text=Array.from({length:500},(_,i)=>'palabra'+i).join(' ');live.speakReply(text);const audio=live.currentAudio;while(live.isSpeaking)audio.onended();assert.equal(played.join(' '),text);assert.ok(played.every(x=>x.length<=850));
played.length=0;live.speakReply(text);const old=live.currentAudio;const late=old.onended;live.stopSpeaking();late();assert.equal(played.length,1);
played.length=0;let fallback='';live.speakWithLocalSynthesis=t=>{fallback=t;};live.speakReply(text);const current=live.currentAudio;current.onended();current.onerror('test');assert.equal(played[0]+' '+fallback,text);assert.equal(current.onended,null);
console.log('PASS complete voice playback, 850-char chunks, stop, remaining-text fallback');
