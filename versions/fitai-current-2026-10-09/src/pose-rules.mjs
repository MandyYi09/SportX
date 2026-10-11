import {requiredLandmarks,isUpperPose} from './tracking-view.mjs';
export function angle(a,b,c){const u=[a.x-b.x,a.y-b.y],v=[c.x-b.x,c.y-b.y];const d=Math.hypot(...u)*Math.hypot(...v);return d?Math.acos(Math.max(-1,Math.min(1,(u[0]*v[0]+u[1]*v[1])/d)))*180/Math.PI:NaN}
export function evaluate(id,landmarks,width=1,height=1){
 const required=requiredLandmarks(id,landmarks);
 if(!landmarks||required.some(i=>!landmarks[i]||![landmarks[i].x,landmarks[i].y,landmarks[i].visibility].every(Number.isFinite)||(landmarks[i].visibility??0)<.65||landmarks[i].x<.02||landmarks[i].x>.98||landmarks[i].y<.02||landmarks[i].y>.98))return {state:'unknown',title:'Let’s get a clearer view',text:isUpperPose(id)?'Keep shoulders, elbows, wrists and hips visible. Feet do not need to be in frame.':'Keep your whole body in frame, with good lighting and no joints hidden.'};
 const p=landmarks.map(v=>({...v,x:v.x*width/height}));const sh=(p[11].y+p[12].y)/2,hip=(p[23].y+p[24].y)/2,torso=Math.hypot(hip-sh,(p[11].x+p[12].x-p[23].x-p[24].x)/2);if(torso<.08)return {state:'unknown',title:'Move a little closer',text:'Your body is too small in the frame for useful alignment cues.'};
 const upright=Math.abs((p[11].x+p[12].x-p[23].x-p[24].x)/2)<torso*.25;
 if(isUpperPose(id))return {state:'ready',title:'Upper body visible',text:'Comparing upper-body shape only.'};
 const arms=[angle(p[11],p[13],p[15]),angle(p[12],p[14],p[16])];const knees=[angle(p[23],p[25],p[27]),angle(p[24],p[26],p[28])];
 let checks;
 if(id==='reach')checks=[[upright,'Bring your torso back over your hips.'],[p[15].y<sh-torso*.35&&p[16].y<sh-torso*.35,'Raise both arms only as far as feels comfortable.'],[arms.every(x=>x>145),'Gently lengthen your arms without forcing your elbows.']];
 if(id==='side') {const lean=Math.abs((p[11].x+p[12].x-p[23].x-p[24].x)/2)/torso;checks=[[lean>.12&&lean<.6,'Try a small, comfortable side bend; avoid leaning deeply.'],[Math.min(p[15].y,p[16].y)<sh-torso*.25,'Let one arm reach overhead if comfortable.'],[knees.every(x=>x>150),'Keep your legs long, with knees soft.']];}
 if(id==='mountain')checks=[[upright,'Gently stack your shoulders over your hips.'],[Math.abs(p[11].y-p[12].y)<torso*.18,'Relax your shoulders toward a level position.'],[p[15].y>sh+torso*.5&&p[16].y>sh+torso*.5,'Let both arms rest by your sides.']];
 if(id==='warrior')checks=[[upright,'Bring your torso upright over your hips.'],[Math.abs(p[15].y-sh)<torso*.25&&Math.abs(p[16].y-sh)<torso*.25&&arms.every(x=>x>145),'Reach your arms apart near shoulder height, if comfortable.'],[knees.some(x=>x>85&&x<145)&&knees.some(x=>x>150),'Use a gentle front-knee bend with the other leg long. Don’t force depth.']];
 if(!checks)return {state:'ready',title:'Pose visible',text:'Comparing visible joint angles.'};
 const failed=checks.filter(x=>!x[0]);return failed.length?{state:'warning',title:'A small adjustment',text:failed[0][1]}:{state:'good',title:'Visible alignment looks steady',text:'These checks match the reference. Stay within a comfortable range and keep breathing.'};
}
