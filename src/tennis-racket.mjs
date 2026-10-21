import {tennisGrip} from './tennis-grip.mjs';
// Appearance proportions from the supplied reference. Local +Y runs from butt to tip.
export const racketEnvelope={min:[-.135,0,-.023],max:[.135,.686,.023]};
export function createTennisRacket(THREE){
 const root=new THREE.Group();root.name='reference-tennis-racket';
 const graphite=new THREE.MeshStandardMaterial({color:0x161d26,roughness:.42,metalness:.25});
 const white=new THREE.MeshStandardMaterial({color:0xe8ebee,roughness:.58});
 const wrap=new THREE.MeshStandardMaterial({color:0xc3c9cc,roughness:.9});
 function add(geometry,material,x=0,y=0,z=0){const mesh=new THREE.Mesh(geometry,material);mesh.position.set(x,y,z);mesh.castShadow=true;root.add(mesh);return mesh;}
 function tube(points,radius,material,closed=false){return add(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points.map(p=>new THREE.Vector3(...p)),closed),Math.max(24,points.length*2),radius,8,closed),material);}
 add(new THREE.CylinderGeometry(tennisGrip.radius,tennisGrip.radius,.235,8),white,0,.1175);
 add(new THREE.CylinderGeometry(.022,.021,.014,8),graphite,0,.007);
 tube(Array.from({length:181},(_,i)=>{const a=i/180*Math.PI*14;return [(tennisGrip.radius+.0004)*Math.cos(a),.017+i/180*.203,(tennisGrip.radius+.0004)*Math.sin(a)];}),.00055,wrap);
 add(new THREE.CylinderGeometry(.0195,.0195,.013,8),graphite,0,.235);
 // Open Y throat, rather than a filled plate between handle and strings.
 for(const side of [-1,1])tube([[0,.242,0],[side*.017,.280,0],[side*.048,.328,0],[side*.082,.383,0]],.0065,white);
 const ellipse=(a,z=0)=>[.125*Math.cos(a),.51+.165*Math.sin(a),z];
 const rim=Array.from({length:97},(_,i)=>ellipse(i/96*Math.PI*2));rim.pop();
 tube(rim,.0072,graphite,true);
 for(const [start,end]of [[Math.PI*1.05,Math.PI*1.40],[Math.PI*1.60,Math.PI*1.95]]){
  tube(Array.from({length:22},(_,i)=>ellipse(start+(end-start)*i/21)),.0074,white);
 }
 const positions=[];
 // Individual mains and crosses, clipped to the inside of the elliptical frame.
 for(let i=0;i<16;i++){
  const x=-.105+i*.014,y=.154*Math.sqrt(1-(x/.116)**2);positions.push(x,.51-y,0,x,.51+y,0);
 }
 for(let i=0;i<19;i++){
  const y=-.144+i*.016,x=.116*Math.sqrt(1-(y/.154)**2);positions.push(-x,.51+y,0,x,.51+y,0);
 }
 const stringGeometry=new THREE.BufferGeometry();stringGeometry.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));
 const strings=new THREE.LineSegments(stringGeometry,new THREE.LineBasicMaterial({color:0xc7ced1,transparent:true,opacity:.85}));strings.name='racket-string-grid';root.add(strings);
 return {root};
}
