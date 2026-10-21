// Animation time is independent of media loading and render frequency.
export function createMotionClock(now=()=>performance.now()) {
 let duration=0,elapsed=0,speed=.5,playing=false,anchor=now();
 function read() {
  const time=now();
  if(playing)elapsed=Math.min(duration,elapsed+Math.max(0,time-anchor)*speed/1000);
  anchor=time;
  if(elapsed>=duration)playing=false;
  return {elapsed,duration,speed,playing};
 }
 return {
  read,
  select(seconds,autoplay=true){duration=Math.max(0,seconds);elapsed=0;anchor=now();playing=autoplay&&duration>0;},
  play(){read();if(elapsed>=duration)elapsed=0;playing=duration>0;},
  pause(){read();playing=false;},
  seek(seconds){read();elapsed=Math.max(0,Math.min(duration,Number(seconds)||0));playing=false;},
  restart(){elapsed=0;anchor=now();playing=duration>0;},
  setSpeed(value){read();if(Number.isFinite(value)&&value>0)speed=value;},
 };
}
