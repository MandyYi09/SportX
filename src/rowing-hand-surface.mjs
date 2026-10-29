// Fuse palm and phalanges into one skin surface. Separate tubes leave visible
// attachment seams even when their endpoints overlap the palm.
const cache=new Map();
export function rowingHandSurface(THREE,side,spec,digits){
 const key=`${side}:${spec.radius}:${spec.buttOffset}`;if(cache.has(key))return cache.get(key);
 const blend=(a,b,k)=>{const h=Math.max(k-Math.abs(a-b),0)/k;return Math.min(a,b)-h*h*k*.25;};
 // One continuous loft from wrist through palm to knuckles. Overlapping
 // ellipsoids produced a side lobe and a saddle-shaped dorsal seam.
 const sections=[
  [-.130,-.012,0,.015,.013],[-.105,-.012,0,.020,.016],
  [-.085,-.012,0,.022,.015],[-.065,-.009,.005,.026,.013],
  [-.045,-.004,.014,.031,.013],[-.025,0,.022,.034,.012],
  [-.006,0,.028,.032,.010]
 ];
 function section(x,column){
  let i=0;while(i<sections.length-2&&x>sections[i+1][0])i++;
  const a=sections[i],b=sections[i+1],prev=sections[Math.max(0,i-1)],next=sections[Math.min(sections.length-1,i+2)];
  const t=Math.max(0,Math.min(1,(x-a[0])/(b[0]-a[0]))),d=b[0]-a[0];
  const m0=(b[column]-prev[column])/(b[0]-prev[0])*d,m1=(next[column]-a[column])/(next[0]-a[0])*d;
  return (2*t**3-3*t*t+1)*a[column]+(t**3-2*t*t+t)*m0+(-2*t**3+3*t*t)*b[column]+(t**3-t*t)*m1;
 }
 function field(x,y,z){
  const cy=section(x,1),cz=side*section(x,2),width=section(x,3),depth=section(x,4);
  // A shallow dorsal crown (2.5 mm at the metacarpals) fades into the
  // wrist and knuckles. The palmar surface and finger spacing stay unchanged.
  const archT=Math.max(0,Math.min(1,(x+.080)/.065));
  const crown=.0025*Math.sin(Math.PI*archT)**2;
  const dorsalDepth=depth+(side*(z-cz)>0?crown:0);
  let skin=Math.max((Math.hypot((y-cy)/width,(z-cz)/dorsalDepth)-1)*depth,-.130-x,x+.006);
  for(const digit of digits){
   let value=1;
   for(const s of digit.segments){
    const dx=x-s.a[0],dy=y-s.a[1],dz=z-s.a[2];
    const t=Math.max(0,Math.min(1,(dx*s.d[0]+dy*s.d[1]+dz*s.d[2])/s.length2));
    const px=dx-t*s.d[0],py=dy-t*s.d[1],pz=dz-t*s.d[2];
    const r=s.r0+(s.r1-s.r0)*t;
    const distance=(Math.hypot(px/digit.depth,py/digit.width,pz/digit.depth)-r)*digit.depth;
    value=Math.min(value,distance);
   }
   skin=blend(skin,value,digit.finger?.0012:.004);
  }
  // Separate the four digits with rounded web spaces. Fusion is permitted
  // only proximal to the MCP line, never across the phalanges.
  for(const gapY of [-.019,.0015,.020]){
   const gap=.0017-Math.hypot(Math.min(0,x+.023),y-gapY);
   skin=-blend(-skin,-gap,.0012);
  }
  // Trim the ulnar palm edge to a continuous wrist-to-knuckle taper. This
  // removes the hanging lobe below the little-finger base.
  const u=Math.max(0,(x+.085)/.071);
  const edge=.010+.023*u;
  // Round the transition into the side contour instead of ending a trim
  // plane abruptly at the little-finger root.
  skin=-blend(-skin,-(y-edge)*.8,.004);
  // Cut a clean contact cavity for the shaft and its butt face.
  const handle=Math.min(spec.radius+.0009-Math.hypot(x,z),y+spec.buttOffset+.0006);
  return Math.max(skin,handle);
 }
 const step=.002,min=[-.138,-.086,-.052],size=[95,71,53];
 const [nx,ny,nz]=size,values=new Float32Array(nx*ny*nz),index=(x,y,z)=>(x*ny+y)*nz+z;
 for(let x=0;x<nx;x++)for(let y=0;y<ny;y++)for(let z=0;z<nz;z++)values[index(x,y,z)]=field(min[0]+x*step,min[1]+y*step,min[2]+z*step);
 const positions=[],indices=[],vertices=new Map();
 const vertex=p=>{const key=p.map(v=>Math.round(v*1e7)).join(',');if(vertices.has(key))return vertices.get(key);const id=positions.length/3;positions.push(...p);vertices.set(key,id);return id;};
 const corners=[[0,0,0],[1,0,0],[1,1,0],[0,1,0],[0,0,1],[1,0,1],[1,1,1],[0,1,1]];
 const tetra=[[0,5,1,6],[0,1,2,6],[0,2,3,6],[0,3,7,6],[0,7,4,6],[0,4,5,6]];
 function triangle(a,b,c,normal){
  const ab=b.map((v,i)=>v-a[i]),ac=c.map((v,i)=>v-a[i]);
  const n=[ab[1]*ac[2]-ab[2]*ac[1],ab[2]*ac[0]-ab[0]*ac[2],ab[0]*ac[1]-ab[1]*ac[0]];
  if(n.reduce((s,v,i)=>s+v*normal[i],0)<0)[b,c]=[c,b];
  const ids=[vertex(a),vertex(b),vertex(c)];if(new Set(ids).size===3)indices.push(...ids);
 }
 for(let x=0;x<nx-1;x++)for(let y=0;y<ny-1;y++)for(let z=0;z<nz-1;z++){
  const vs=corners.map(c=>values[index(x+c[0],y+c[1],z+c[2])]);
  if(vs.every(v=>v>=0)||vs.every(v=>v<0))continue;
  const ps=corners.map(c=>[min[0]+(x+c[0])*step,min[1]+(y+c[1])*step,min[2]+(z+c[2])*step]);
  for(const tet of tetra){
   const inside=tet.filter(i=>vs[i]<0),outside=tet.filter(i=>vs[i]>=0);if(!inside.length||!outside.length)continue;
   const cross=(a,b)=>ps[a].map((v,i)=>v+(ps[b][i]-v)*vs[a]/(vs[a]-vs[b]));
   const normal=[0,1,2].map(i=>outside.reduce((s,k)=>s+ps[k][i],0)/outside.length-inside.reduce((s,k)=>s+ps[k][i],0)/inside.length);
   if(inside.length===1){const a=inside[0];triangle(...outside.map(b=>cross(a,b)),normal);}
   else if(outside.length===1){const b=outside[0];triangle(...inside.map(a=>cross(a,b)),normal);}
   else{const[a,b]=inside,[c,d]=outside,p=cross(a,c),q=cross(a,d),r=cross(b,c),s=cross(b,d);triangle(p,q,r,normal);triangle(q,s,r,normal);}
  }
 }
 const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));geometry.setIndex(indices);
 const normals=[],e=.00025;
 for(let i=0;i<positions.length;i+=3){const [x,y,z]=positions.slice(i,i+3),n=new THREE.Vector3(field(x+e,y,z)-field(x-e,y,z),field(x,y+e,z)-field(x,y-e,z),field(x,y,z+e)-field(x,y,z-e)).normalize();normals.push(...n.toArray());}
 geometry.setAttribute('normal',new THREE.Float32BufferAttribute(normals,3));cache.set(key,geometry);return geometry;
}
