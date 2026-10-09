import {isSidePose,requiredLandmarks} from './tracking-view.mjs';
import {matchQuality} from './match-quality.mjs';
import {getReference,landmarkIds} from './reference.mjs';
import {angle} from './pose-rules.mjs';
export function projectReference(id,p,width,height,flipped=false){
 const ref=getReference(id,flipped),hx=(p[23].x+p[24].x)*width/2,hy=(p[23].y+p[24].y)*height/2;
 const torso=Math.hypot((p[11].x+p[12].x)*width/2-hx,(p[11].y+p[12].y)*height/2-hy);
 const ry=(ref[6][1]+ref[7][1])/2,sy=(ref[0][1]+ref[1][1])/2,scale=torso/Math.hypot((ref[0][0]+ref[1][0]-ref[6][0]-ref[7][0])/2,sy-ry);
 return Object.fromEntries(landmarkIds.map((key,i)=>[key,{x:hx-(ref[i][0]-(ref[6][0]+ref[7][0])/2)*scale,y:hy-(ref[i][1]-ry)*scale}]));
}
export function normalizedLive(id,p,width,height,flipped=false){
 const ref=getReference(id,flipped),hx=(p[23].x+p[24].x)*width/2,hy=(p[23].y+p[24].y)*height/2;
 const length=Math.hypot((p[11].x+p[12].x)*width/2-hx,(p[11].y+p[12].y)*height/2-hy);
 if(length<1)return null;const ry=(ref[6][1]+ref[7][1])/2,scale=Math.hypot((ref[0][0]+ref[1][0]-ref[6][0]-ref[7][0])/2,(ref[0][1]+ref[1][1])/2-ry)/length;
 return landmarkIds.map(i=>(p[i].visibility??0)<.65?null:[(ref[6][0]+ref[7][0])/2-(p[i].x*width-hx)*scale,ry-(p[i].y*height-hy)*scale,.19]);
}
export function comparePose(id,p,width,height,flipped=false){
 const ref=projectReference(id,p,width,height,flipped),actual=p.map(v=>({x:v.x*width,y:v.y*height}));
 const defs=[['Left elbow',[11,13,15],'Gently lengthen your left arm','Soften your left elbow'],['Right elbow',[12,14,16],'Gently lengthen your right arm','Soften your right elbow']];
 defs.push(['Left arm lift',[23,11,13],'Raise your left arm a little','Lower your left arm a little'],['Right arm lift',[24,12,14],'Raise your right arm a little','Lower your right arm a little']);
 defs.push(['Left knee',[23,25,27],'Ease your left leg toward a longer position','Gently soften your left knee'],['Right knee',[24,26,28],'Ease your right leg toward a longer position','Gently soften your right knee']);
 defs.push(['Left hip opening',[11,23,25],'Move your left leg gently toward the reference','Move your left leg gently toward the reference'],['Right hip opening',[12,24,26],'Move your right leg gently toward the reference','Move your right leg gently toward the reference']);
 const allowed=requiredLandmarks(id,p);
 const metrics=defs.filter(([,joints])=>joints.every(i=>allowed.includes(i))).map(([label,joints,up,down])=>{const a=angle(...joints.map(i=>actual[i])),t=angle(...joints.map(i=>ref[i]));return {label,joints,actual:a,target:t,delta:Math.abs(a-t),close:Math.abs(a-t)<=18,cue:isSidePose(id)?'Adjust gently toward the reference silhouette. '+(posesCue(id)):(a<t?up:down)+', only within a comfortable range.'}});
 const hip={x:(actual[23].x+actual[24].x)/2,y:(actual[23].y+actual[24].y)/2},shoulder={x:(actual[11].x+actual[12].x)/2,y:(actual[11].y+actual[12].y)/2};
 const rh={x:(ref[23].x+ref[24].x)/2,y:(ref[23].y+ref[24].y)/2},rs={x:(ref[11].x+ref[12].x)/2,y:(ref[11].y+ref[12].y)/2};
 const lean=(h,s)=>Math.atan2(s.x-h.x,h.y-s.y)*180/Math.PI;const a=lean(hip,shoulder),t=lean(rh,rs);const torsoDelta=Math.abs(((a-t+540)%360)-180);
 metrics.unshift({label:'Torso lean',joints:[11,12,23,24],actual:a,target:t,delta:torsoDelta,close:torsoDelta<=12,cue:isSidePose(id)?posesCue(id):Math.abs(t)>10?'Lean gently toward the reference, or switch its side. Stay within your comfortable range.':'Bring your shoulders gently back over your hips.'});
 const failed=metrics.filter(m=>!m.close).sort((a,b)=>b.delta-a.delta);const worst=failed[0];
 const quality=matchQuality(metrics);
 if(!quality)return null;
 return {quality,metrics,adjustJoints:[...new Set(failed.flatMap(m=>m.joints))],feedback:worst?{state:'warning',title:worst.label+' · try a small adjustment',text:worst.cue}:{state:'good',title:'Your lines are close to the reference',text:'The visible angles are similar. Keep breathing; stop or ease out if anything hurts.'}};
}

function posesCue(id){return {'down-dog':'Keep your knees soft and lift your hips back, without forcing your heels down.',plank:'Keep your torso long; lower your knees if needed.','forearm-plank':'Keep your torso long and use your knees for support if needed.',cobra:'Use a small chest lift; keep your pelvis on the mat.',sphinx:'Keep your pelvis supported and your chest lift comfortable.',child:'Ease your hips toward your heels only as far as comfortable.',tabletop:'Keep hands under shoulders and knees under hips.',chair:'Keep the knee bend shallow enough to stay comfortable.'}[id]||'Stay in a comfortable range.';}
