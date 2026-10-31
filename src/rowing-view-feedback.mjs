// Advice comes from the user's observed geometry, not a preferred camera angle
// or the magnitude of the error against the expert.
export function rowingViewFeedback(rows){
 const counts=new Map();
 const add=(key,seconds)=>counts.set(key,(counts.get(key)??0)+seconds);
 for(let i=0;i<rows.length;i++){
  const r=rows[i];if(!r.valid||!r.assessment)continue;
  const dt=Math.min(.5,Math.max(0,(rows[i+1]?.t??r.t)-r.t));
  const a=r.assessment,limited=[...a.metrics.filter(m=>m.depthUncertain),...(a.occluded??[])];
  if(limited.some(m=>m.key.startsWith('elbow')))add('elbow-depth',dt);
  if(limited.some(m=>m.key.startsWith('trunk')))add('torso-depth',dt);
  const missing=new Set((a.missing??[]).map(p=>p.id));
  if([25,26,27,28].some(j=>missing.has(j)))add('legs-framing',dt);
  if([15,16].some(j=>missing.has(j)))add('hands-framing',dt);
 }
 return [...counts].filter(([key,seconds])=>seconds>=.5&&!(key==='torso-depth'&&(counts.get('elbow-depth')??0)>=.5)).map(([key,seconds])=>({key,seconds,...{
  'elbow-depth':{en:'Move the camera to your side. Keep the shoulder, elbow and wrist in frame.',zh:'相机移到侧面，拍到肩、肘和手腕。'},
  'torso-depth':{en:'Move the camera toward your side. Keep the shoulder and hip in frame.',zh:'相机往侧面移一点，拍到肩和髋。'},
  'legs-framing':{en:'To check leg movement, move the camera back or lower it to include the hips, knees and ankles.',zh:'想检查腿部动作：把镜头后移或略向下，拍到髋、膝和脚踝。'},
  'hands-framing':{en:'Keep the hands in frame throughout the stroke. Move the camera back if needed.',zh:'手腕有时看不清。把镜头后移，让双手全程入镜。'},
 }[key]}));
}
