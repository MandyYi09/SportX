export function createTiedHair(THREE){
 const root=new THREE.Group();root.name='tied-back-hair';root.visible=false;
 const material=new THREE.MeshStandardMaterial({color:0x30251f,roughness:.94});
 const profile=[[0,.025,.035],[.06,.052,.063],[.19,.078,.079],[.40,.092,.090],[.64,.096,.093],[.83,.085,.083],[.96,.049,.052],[1,.001,.001]];
 const rows=36,segments=64,points=[],indices=[];
 function radii(y){
  // Match the skull's cubic profile, lifted slightly to cover its crown.
  const t=Math.max(0,Math.min(1,(y-.007+.115)/.27));let i=0;while(i<profile.length-2&&t>profile[i+1][0])i++;
  const a=profile[i],b=profile[i+1],prev=profile[Math.max(0,i-1)],next=profile[Math.min(profile.length-1,i+2)],u=(t-a[0])/(b[0]-a[0]);
  return [1,2].map(axis=>{
   const m0=(b[axis]-prev[axis])/(b[0]-prev[0])*(b[0]-a[0]),m1=(next[axis]-a[axis])/(next[0]-a[0])*(b[0]-a[0]);
   return (2*u**3-3*u*u+1)*a[axis]+(u**3-2*u*u+u)*m0+(-2*u**3+3*u*u)*b[axis]+(u**3-u*u)*m1;
  });
 }
 for(let row=0;row<=rows;row++)for(let j=0;j<=segments;j++){
  const a=j/segments*Math.PI*2,c=Math.cos(a),s=Math.sin(a),t=row/rows;
  const hairline=s>=0?.018+.058*s:.018+.075*s;
  const y=hairline+(.162-hairline)*t,r=radii(y),padding=.005;
  points.push((r[0]+padding)*c,y,(r[1]+padding)*s);
  if(row<rows&&j<segments){const i=row*(segments+1)+j;indices.push(i,i+segments+1,i+1,i+1,i+segments+1,i+segments+2);}
 }
 const crown=points.length/3;points.push(0,.163,0);
 for(let j=0;j<segments;j++)indices.push(rows*(segments+1)+j,crown,rows*(segments+1)+j+1);
 const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.Float32BufferAttribute(points,3));geometry.setIndex(indices);geometry.computeVertexNormals();
 const scalp=new THREE.Mesh(geometry,material);scalp.name='fitted-hair-scalp';scalp.castShadow=true;root.add(scalp);
 const tie=new THREE.Mesh(new THREE.SphereGeometry(1,24,16),material);tie.position.set(0,-.012,-.108);tie.scale.set(.022,.022,.023);root.add(tie);
 const tail=new THREE.Group();tail.name='single-ponytail';root.add(tail);
 const bundleProfile=[[0,.018,.016],[.12,.037,.025],[.32,.047,.029],[.55,.045,.027],[.76,.036,.023],[.90,.024,.016],[1,.009,.007]];
 function profileAt(t,profile){let i=0;while(i<profile.length-2&&t>profile[i+1][0])i++;const a=profile[i],b=profile[i+1],u=THREE.MathUtils.smoothstep(t,a[0],b[0]);return [1,2].map(k=>a[k]+(b[k]-a[k])*u);}
 function lock(path,profile,mat,name){
  const rows=48,sides=24,frames=path.computeFrenetFrames(rows,false),points=[],triangles=[];
  for(let row=0;row<=rows;row++){
   const t=row/rows,center=path.getPointAt(t),r=profileAt(t,profile);
   for(let j=0;j<=sides;j++){
    const a=j/sides*Math.PI*2,ridge=1+.035*Math.cos(a*7+t*3),p=center.clone().addScaledVector(frames.normals[row],Math.cos(a)*r[0]*ridge).addScaledVector(frames.binormals[row],Math.sin(a)*r[1]*ridge);
    points.push(...p.toArray());
    if(row<rows&&j<sides){const i=row*(sides+1)+j;triangles.push(i,i+1,i+sides+1,i+1,i+sides+2,i+sides+1);}
   }
  }
  // Rounded caps close each layered lock without a separate bulb at its end.
  for(const row of [0,rows]){const id=points.length/3;points.push(...path.getPointAt(row/rows).toArray());for(let j=0;j<sides;j++){const i=row*(sides+1)+j;triangles.push(...(row===0?[id,i+1,i]:[id,i,i+1]));}}
  const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(points,3));g.setIndex(triangles);g.computeVertexNormals();
  const m=new THREE.Mesh(g,mat);m.name=name;m.castShadow=true;tail.add(m);return m;
 }
 const curve=points=>new THREE.CatmullRomCurve3(points.map(p=>new THREE.Vector3(...p)));
 lock(curve([[0,-.012,-.116],[-.003,-.075,-.164],[-.010,-.16,-.181],[.006,-.245,-.177],[-.007,-.31,-.182]]),bundleProfile,material,'ponytail-volume');
 // Overlapping locks have different lengths and gentle waves, like gathered hair.
 for(let i=0;i<9;i++){
  const a=i/9*Math.PI*2,x=Math.cos(a),z=Math.sin(a),length=.315+.042*Math.sin(i*2.3),phase=i*.9;
  const points=[[x*.008,-.022,-.122+z*.008],[x*.029,-.10,-.166+z*.019],[x*.031+Math.sin(phase)*.009,-.205,-.181+z*.024],[x*.023+Math.sin(phase+1)*.012,-length+.035,-.178+z*.019],[x*.020+Math.sin(phase+1.8)*.012,-length,-.184+z*.014]];
  const lockMaterial=new THREE.MeshStandardMaterial({color:[0x30251f,0x392b23,0x34271f][i%3],roughness:.94});
  lock(curve(points),[[0,.009,.008],[.25,.014,.011],[.66,.013,.010],[.88,.010,.008],[1,.003,.0025]],lockMaterial,`ponytail-lock-${i}`);
 }
 return root;
}
