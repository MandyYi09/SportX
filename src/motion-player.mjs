import {capturedDuration} from './captured-motion.mjs';
import {motionById} from './motion-catalog.mjs';
import {sampleMotion} from './motion-rig.mjs?v=22';
import {createMotionClock} from './motion-clock.mjs';

export function createMotionPlayer() {
 const $=id=>document.getElementById(id);
 const panel=$('motion-player'),seek=$('motion-seek'),play=$('motion-play');
 const clock=createMotionClock();
 let clip=null,flipped=false,lastDisplay='',lastPlaying=null;
 function updateDisplay(){
  if(!clip)return;
  const {elapsed,duration,playing}=clock.read();
  if(playing!==lastPlaying){
   play.textContent=playing?'Pause':'Play';
   play.setAttribute('aria-label',playing?'Pause movement':'Play movement');
   lastPlaying=playing;
  }
  const display=`${elapsed.toFixed(2)} / ${duration.toFixed(2)} s`;
  seek.value=String(elapsed);
  if(display!==lastDisplay){$('motion-time').textContent=display;lastDisplay=display;}
  const phaseText=clip.name;
  if($('motion-phase').dataset.phase!==phaseText){$('motion-phase').dataset.phase=phaseText;$('motion-phase').textContent=phaseText;}

 }
 play.onclick=()=>{if(clock.read().playing)clock.pause();else clock.play();updateDisplay();};
 $('motion-restart').onclick=()=>{clock.restart();updateDisplay();};
 seek.oninput=()=>{clock.seek(Number(seek.value));updateDisplay();};
 function updateSpeed(){
  const speed=Number($('motion-speed').value);
  clock.setSpeed(speed);$('motion-speed-value').textContent=`${Number(speed.toFixed(2))}×`;
  $('motion-speed').setAttribute('aria-valuetext',`${Number(speed.toFixed(2))}×`);updateDisplay();
 }
 $('motion-speed').oninput=updateSpeed;$('motion-speed').onchange=updateSpeed;
 updateSpeed();
 document.addEventListener('visibilitychange',()=>{if(document.hidden){clock.pause();updateDisplay();}});
 window.addEventListener('pagehide',()=>clock.pause());
 let lastUiUpdate=0;
 function tick(now){if(clip&&!document.hidden&&now-lastUiUpdate>80){updateDisplay();lastUiUpdate=now;}requestAnimationFrame(tick);}
 requestAnimationFrame(tick);
 return {
  select(id){
   clip=motionById[id]||null;flipped=false;lastDisplay='';lastPlaying=null;panel.hidden=!clip;
   clock.select(clip?(capturedDuration(clip.id)??clip.sourceEnd-clip.sourceStart):0,!document.hidden&&!matchMedia('(prefers-reduced-motion: reduce)').matches);
   if(!clip)return;
   clock.setSpeed(Number($('motion-speed').value));
   seek.min='0';seek.max=String(clock.read().duration);seek.value='0';
   updateDisplay();
  },
  mirror(value){flipped=value;},
  sample(){return clip?sampleMotion(clip.id,clock.read().elapsed,flipped):null;},
 };
}
