import {createTiedHair} from './tied-hair.mjs';
import {createWellnessPants} from './wellness-pants.mjs';
import {createYogaGarment} from './yoga-garment.mjs';
import {createMobilityGarment} from './mobility-garment.mjs';
// Contoured surfaces follow the existing measured joints; animation data stays untouched.
export function createAthleteModel(THREE, {body, skin, gender='male'}) {
 const female=gender==='female';
 const root=new THREE.Group();root.name='athlete';
 const fabric=new THREE.MeshStandardMaterial({color:0x56694e,roughness:.9});
 const trim=new THREE.MeshStandardMaterial({color:0xcbd2bf,roughness:.85});
 const shoe=new THREE.MeshStandardMaterial({color:0xe8e5d9,roughness:.85});
 const sole=new THREE.MeshStandardMaterial({color:0xa4ac9a,roughness:.95});
 const hair=new THREE.MeshStandardMaterial({color:0x354039,roughness:1});
 const face=new THREE.MeshStandardMaterial({color:0x4b5549,roughness:.8});
 const captureSuit=new THREE.MeshStandardMaterial({color:0x171c20,roughness:.94});
 const capturePanel=new THREE.MeshStandardMaterial({color:0x22292d,roughness:.95});
 const shootingBlue=new THREE.MeshStandardMaterial({color:0x38789b,roughness:.9});
 const shootingSkin=new THREE.MeshStandardMaterial({color:0xc39a7b,roughness:.86});
 const captureShoe=new THREE.MeshStandardMaterial({color:0x151a1e,roughness:.85});
 const reflector=new THREE.MeshStandardMaterial({color:0xa9b2b2,roughness:.65});
 const earInset=new THREE.MeshStandardMaterial({color:0xb49d87,roughness:.9});
 const rowingSkin=new THREE.MeshStandardMaterial({color:0xae805f,roughness:.83});
 const rowingRed=new THREE.MeshStandardMaterial({color:female?0x247c83:0xc72032,roughness:.86});
 const rowingShortMaterial=new THREE.MeshStandardMaterial({color:0xffffff,vertexColors:true,roughness:.92});
 const tennisNavy=new THREE.MeshStandardMaterial({color:0x121e32,roughness:.88});
 const tennisWhite=new THREE.MeshStandardMaterial({color:0xe9ecef,roughness:.88});
 const tennisSkin=new THREE.MeshStandardMaterial({color:0xcba68e,roughness:.86});
 const tennisDark=new THREE.MeshStandardMaterial({color:0x26303e,roughness:.86});
 const tennisCoral=new THREE.MeshStandardMaterial({color:0xdc5944,roughness:.75});
 const tennisHair=new THREE.MeshStandardMaterial({color:0x694533,roughness:1});
 const yogaSkin=new THREE.MeshStandardMaterial({color:0xc0987b,roughness:.88});
 const yogaFabric=new THREE.MeshStandardMaterial({color:female?0xe9ecef:0x202633,roughness:.96});
 const mobilityShirt=new THREE.MeshStandardMaterial({color:female?0x9fb6af:0xd7cbb7,roughness:.98});
 const mobilityPants=new THREE.MeshStandardMaterial({color:female?0x424b57:0x3c4b5a,roughness:.97});
 const mobilityOutfit=createMobilityGarment(THREE,mobilityShirt,mobilityPants,{female});
 const femaleTop=new THREE.MeshStandardMaterial({color:0xe9ecef,roughness:.9});
 const matrix=new THREE.Matrix4();
 const v=()=>new THREE.Vector3();

 // Cubic interpolation gives a sculpted silhouette instead of stacked cones.
 function profileValue(profile,t,axis){
  let k=0;while(k<profile.length-2&&t>profile[k+1][0])k++;
  const p=profile[k],q=profile[k+1],u=(t-p[0])/(q[0]-p[0]),prev=profile[Math.max(0,k-1)],next=profile[Math.min(profile.length-1,k+2)];
  const m0=(q[axis]-prev[axis])/(q[0]-prev[0])*(q[0]-p[0]),m1=(next[axis]-p[axis])/(next[0]-p[0])*(q[0]-p[0]);
  return Math.max(.0001,(2*u**3-3*u*u+1)*p[axis]+(u**3-2*u*u+u)*m0+(-2*u**3+3*u*u)*q[axis]+(u**3-u*u)*m1);
 }
 function profileGeometry(profile,rows=48,segments=40,upperEdge=null,lowerEdge=0) {
  const positions=[],indices=[];
  for(let row=0;row<=rows;row++){
   const t=row/rows,rx=profileValue(profile,t,1),rz=profileValue(profile,t,2);
   for(let j=0;j<=segments;j++){
    const a=j/segments*Math.PI*2,u=upperEdge?lowerEdge+t*(upperEdge(a)-lowerEdge):t;
    positions.push((upperEdge?profileValue(profile,u,1)+.003:rx)*Math.cos(a),u,(upperEdge?profileValue(profile,u,2)+.003:rz)*Math.sin(a));
    if(row<rows&&j<segments){const i=row*(segments+1)+j;indices.push(i,i+segments+1,i+1,i+1,i+segments+1,i+segments+2);}
   }
  }
  const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));geometry.setIndex(indices);geometry.computeVertexNormals();return geometry;
 }
 function mesh(geometry,material,parent=root){const m=new THREE.Mesh(geometry,material);m.castShadow=true;m.receiveShadow=true;parent.add(m);return m;}
 function volume(parent,material,position,scale){const m=mesh(new THREE.SphereGeometry(1,32,24),material,parent);m.position.set(...position);m.scale.set(...scale);return m;}
 function surface(profile,material,parent=root){return mesh(profileGeometry(profile),material,parent);}
 function segment(a,b,m,forward){
  const y=b.clone().sub(a),length=y.length();y.normalize();
  const z=forward.clone().addScaledVector(y,-forward.dot(y));
  if(z.lengthSq()<1e-8)z.set(0,0,1).addScaledVector(y,-y.z);
  if(z.lengthSq()<1e-8)z.set(1,0,0).addScaledVector(y,-y.x);
  z.normalize();const x=v().crossVectors(y,z).normalize();z.crossVectors(x,y).normalize();
  m.position.copy(a);m.quaternion.setFromRotationMatrix(matrix.makeBasis(x,y,z));m.scale.y=length;
 }
 const torso=surface([[0,.16,.105],[.12,.175,.115],[.30,.146,.098],[.50,.163,.112],[.73,.205,.127],[.88,.221,.115],[.96,.181,.094],[1,.064,.058]],body);
 root.add(mobilityOutfit.root);
 // A separate pelvis volume overlaps the waist and follows hip rotation.
 const pelvis=surface([[0,.002,.002],[.12,.119,.079],[.35,.174,.113],[.64,.181,.12],[.90,.162,.106],[1,.153,.10]],fabric);
 const neck=surface([[0,.065,.059],[.25,.059,.055],[.75,.048,.046],[1,.059,.052]],skin);
 const head=new THREE.Group();root.add(head);
 const skull=surface([[0,.025,.035],[.06,.052,.063],[.19,.078,.079],[.40,.092,.09],[.64,.096,.093],[.83,.085,.083],[.96,.049,.052],[1,.001,.001]],skin,head);
 skull.position.y=-.115;skull.scale.y=.27;
 const eyes=[],eyeWhite=new THREE.MeshStandardMaterial({color:0xd8d2c7,roughness:.9});
 for(const side of [-1,1]){
  volume(head,skin,[side*.094,.015,0],[.018,.029,.015]);
  volume(head,earInset,[side*.102,.015,.009],[.007,.017,.005]);
  const neutral=volume(head,face,[side*.037,.035,.085],[.013,.005,.004]);
  const white=volume(head,eyeWhite,[side*.037,.035,.086],[.011,.0045,.003]);white.visible=false;
  const pupil=volume(head,face,[side*.037,.035,.089],[.004,.0025,.0018]);pupil.visible=false;
  eyes.push({side,neutral,white,pupil});
  const brow=volume(head,hair,[side*.037,.054,.083],[.019,.003,.005]);brow.rotation.z=-side*.08;
 }
 // Keep the face smooth: separate cheek and nose spheres read as attached knobs.
 volume(head,face,[0,-.054,.079],[.023,.0025,.003]);
 const tiedHair=createTiedHair(THREE);head.add(tiedHair);
 const hairCap=surface([[0,.092,.087],[.23,.096,.093],[.54,.083,.084],[.83,.050,.055],[1,.001,.001]],hair,head);hairCap.position.y=.068;hairCap.scale.y=.094;
 const glasses=new THREE.Group();head.add(glasses);glasses.visible=false;glasses.name='rowing-sunglasses';
 const lensMaterial=new THREE.MeshStandardMaterial({color:0x123c52,metalness:.65,roughness:.2});
 const glassesFrame=new THREE.MeshStandardMaterial({color:0x151d23,roughness:.5});
 for(const side of [-1,1]){
  const lens=volume(glasses,lensMaterial,[side*.043,.035,.092],[.039,.016,.006]);lens.rotation.y=side*.22;
  const rim=mesh(new THREE.TorusGeometry(.029,.0025,8,32),glassesFrame,glasses);rim.scale.set(1.35,.56,1);rim.position.set(side*.043,.035,.092);rim.rotation.y=side*.22;
  const temple=mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3([new THREE.Vector3(side*.08,.039,.09),new THREE.Vector3(side*.103,.04,.045),new THREE.Vector3(side*.103,.027,-.008)]),12,.003,6,false),glassesFrame,glasses);
 }
 const bridge=volume(glasses,glassesFrame,[0,.039,.097],[.014,.003,.003]);
 const cap=new THREE.Group();head.add(cap);cap.visible=false;cap.name='capture-cap';
 const capSurface=surface([[0,.091,.088],[.18,.097,.095],[.48,.086,.088],[.78,.058,.061],[1,.001,.001]],captureSuit,cap);capSurface.position.y=.055;capSurface.scale.y=.112;
 const capBrim=volume(cap,captureSuit,[0,.055,.105],[.098,.005,.077]);capBrim.name='shooting-cap-brim';
 volume(cap,capturePanel,[0,.050,.105],[.096,.002,.075]);
 const tennisCap=new THREE.Group();head.add(tennisCap);tennisCap.visible=false;tennisCap.name='tennis-white-cap';
 const crown=surface([[0,.094,.091],[.20,.099,.098],[.50,.089,.089],[.80,.058,.062],[1,.001,.001]],tennisWhite,tennisCap);crown.position.y=.052;crown.scale.y=.119;
 volume(tennisCap,tennisNavy,[0,.049,.105],[.097,.002,.065]);
 volume(tennisCap,tennisWhite,[0,.053,.105],[.098,.004,.065]);
 for(const side of [-1,1])volume(tennisCap,tennisHair,[side*.087,.043,-.014],[.012,.023,.023]);
 const regularTorso=torso.geometry;
 if(female){
  capSurface.visible=crown.visible=false;
  for(const [parent,material] of [[cap,captureSuit],[tennisCap,tennisWhite]]){
   const band=surface([[0,.097,.094],[1,.097,.094]],material,parent);band.position.y=.045;band.scale.y=.024;
  }
 }
 const captureTorsoProfile=[[0,.163,.109],[.17,.174,.116],[.36,.172,.115],[.58,.185,.123],[.79,.206,.125],[.90,.209,.111],[.97,.170,.088],[1,.061,.055]];
 const captureTorso=profileGeometry(captureTorsoProfile);
 // An open, unbranded vest exposes the blue shirt at the chest and armholes.
 const vestGeometry=profileGeometry(captureTorsoProfile,48,64,a=>{
  const x=Math.abs(Math.cos(a));
  return Math.min(.985,.74+.12*(1-x)+.19*Math.exp(-(((x-.55)/.20)**2)));
 });
 const vestIndices=[],vestPosition=vestGeometry.attributes.position;
 for(let i=0;i<vestGeometry.index.count;i+=3){
  const tri=[0,1,2].map(j=>vestGeometry.index.getX(i+j));
  const openFront=tri.every(j=>vestPosition.getZ(j)>0&&Math.abs(vestPosition.getX(j))<.055);
  if(!openFront)vestIndices.push(...tri);
 }
 vestGeometry.setIndex(vestIndices);vestGeometry.computeVertexNormals();
 const shootingVest=mesh(vestGeometry,captureSuit);shootingVest.name='shooting-vest';shootingVest.visible=false;
 const regularSleeve=profileGeometry([[0,.050,.050],[.10,.077,.075],[.38,.079,.074],[.82,.071,.066],[1,.069,.064]]);
 const rowingTorsoProfile=[[0,.148,.101],[.17,.155,.106],[.38,.151,.101],[.60,.173,.115],[.80,.202,.124],[.91,.199,.103],[.97,.139,.073],[1,.061,.055]];
 const rowingTorso=profileGeometry(rowingTorsoProfile);
 const rowingTank=mesh(profileGeometry(rowingTorsoProfile,48,64,a=>{
  const x=Math.abs(Math.cos(a)),back=Math.sin(a)<0?.04*(1-x):0;
  return Math.min(.995,.74+.12*(1-x)+.19*Math.exp(-(((x-.55)/.20)**2))+back);
 }),rowingRed);rowingTank.visible=false;rowingTank.name='rowing-singlet';
 const femaleTank=mesh(rowingTank.geometry.clone(),femaleTop);femaleTank.visible=false;femaleTank.name='female-sport-top';
 const wellnessOutfit=createWellnessPants(THREE,[yogaFabric,yogaSkin,yogaFabric],{upperBody:'yoga',name:'female-wellness-outfit'});root.add(wellnessOutfit.root);
 const wellnessArm=profileGeometry([[0,.042,.043],[.20,.048,.047],[.45,.043,.042],[.80,.033,.033],[1,.028,.028]]);
 const wellnessForearm=profileGeometry([[0,.028,.028],[.25,.034,.032],[.55,.028,.026],[1,.021,.021]]);
 const wellnessSleeve=profileGeometry([[0,.046,.046],[.25,.052,.050],[.65,.049,.047],[1,.046,.044]]);
 const yogaGarment=createYogaGarment(THREE,yogaFabric);root.add(yogaGarment.root);
 const yogaTank=mesh(profileGeometry(rowingTorsoProfile,48,64,a=>{
  const x=Math.abs(Math.cos(a)),back=Math.sin(a)<0?.035:0;
  return Math.min(.985,.76+.10*(1-x)+.19*Math.exp(-(((x-.62)/.25)**2))+back);
 },female?.29:0),yogaFabric);yogaTank.visible=false;yogaTank.name='yoga-tank';
 const yogaSkinTorso=profileGeometry([[0,.001,.001],[.60,.001,.001],[.73,.18,.115],[.80,.202,.124],[.91,.199,.103],[.97,.139,.073],[1,.061,.055]]);
 const regularNeck=neck.geometry;
 const yogaNeck=profileGeometry([[0,.116,.072],[.18,.099,.065],[.48,.062,.054],[.78,.053,.050],[1,.059,.053]]);
 neck.name='athlete-neck';head.name='athlete-head';
 const rowingArm=profileGeometry([[0,.047,.048],[.12,.062,.061],[.30,.062,.056],[.57,.052,.051],[.82,.040,.040],[1,.033,.035]]);
 const rowingForearm=profileGeometry([[0,.033,.035],[.18,.044,.042],[.40,.042,.036],[.68,.032,.029],[1,.024,.023]]);
 const rowingThigh=profileGeometry([[0,.062,.066],[.18,.064,.068],[.40,.058,.061],[.76,.045,.046],[1,.039,.040]]);
 const rowingCalf=profileGeometry([[0,.039,.040],[.18,.045,.049],[.38,.050,.054],[.65,.039,.042],[1,.027,.029]]);
 const tennisTorso=profileGeometry([[0,.153,.105],[.20,.161,.111],[.43,.155,.106],[.67,.180,.119],[.86,.205,.116],[.94,.182,.091],[1,.061,.055]]);
 const tennisSleeve=profileGeometry([[0,.051,.052],[.12,.071,.070],[.40,.073,.067],[.80,.067,.062],[1,.064,.060]]);
 const mobilitySleeve=profileGeometry([[0,.064,.060],[.15,.066,.062],[.45,.065,.061],[.80,.059,.056],[1,.058,.055]]);
 const poloCollar=new THREE.Group();root.add(poloCollar);poloCollar.visible=false;poloCollar.name='tennis-polo-collar';
 function collarPatch(points,material){const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(points.flat(),3));g.setIndex([0,1,2,0,2,3]);g.computeVertexNormals();const m=mesh(g,material,poloCollar);m.material.side=THREE.DoubleSide;return m;}
 for(const side of [-1,1]){
  const p=[[.017,.975,.081],[.070,.987,.052],[.101,.887,.105],[.045,.84,.124]].map(([x,y,z])=>[x*side,y,z]);
  collarPatch(p,tennisWhite);
  const center=p.reduce((v,p)=>v.map((a,i)=>a+p[i]/4),[0,0,0]);
  collarPatch(p.map(v=>v.map((a,i)=>center[i]+(a-center[i])*.84+(i===2?.001:0))),tennisNavy);
 }
 const placket=mesh(new THREE.BoxGeometry(.014,.105,.003),tennisDark,poloCollar);placket.position.set(0,.815,.125);
 const regularPelvis=pelvis.geometry;
 // Raglan sleeves cover the deltoid; forearms narrow naturally into the wrists.
 const armProfile=[[0,.048,.048],[.06,.071,.069],[.22,.073,.067],[.48,.062,.061],[.76,.047,.046],[1,.038,.039]];
 const forearmProfile=[[0,.039,.040],[.16,.051,.047],[.38,.050,.042],[.66,.037,.033],[.88,.027,.025],[1,.025,.024]];
 const thighProfile=[[0,.083,.091],[.14,.097,.103],[.40,.092,.098],[.68,.075,.077],[.90,.057,.057],[1,.052,.052]];
 const calfProfile=[[0,.051,.052],[.15,.055,.059],[.36,.064,.070],[.56,.056,.057],[.81,.035,.036],[1,.029,.030]];
 const regularThigh=profileGeometry(thighProfile),regularCalf=profileGeometry(calfProfile);
 const yogaThigh=profileGeometry([[0,.077,.083],[.22,.074,.080],[.55,.065,.068],[.83,.055,.056],[1,.052,.052]]);
 const limbs=[0,1].map(()=>({
  upper:surface(armProfile,skin),sleeve:mesh(regularSleeve,body),
  lower:surface(forearmProfile,skin),thigh:mesh(regularThigh,fabric),calf:mesh(regularCalf,fabric),
  elbow:volume(root,skin,[0,0,0],[.040,.040,.040]),knee:volume(root,fabric,[0,0,0],[.053,.055,.053]),
  foot:new THREE.Group(),
  shoulder:volume(root,rowingSkin,[0,0,0],[.064,.056,.062]),
  wristband:surface([[0,.034,.032],[.08,.035,.033],[.92,.030,.029],[1,.029,.028]],tennisWhite),
  sock:surface([[0,.043,.045],[.14,.041,.044],[.66,.032,.034],[1,.029,.031]],tennisWhite),
 }));
 const regularArm=limbs[0].upper.geometry,regularForearm=limbs[0].lower.geometry;
 const yogaArm=profileGeometry([[0,.063,.060],[.18,.069,.064],[.40,.064,.059],[.68,.050,.046],[1,.035,.035]]);
 const yogaForearm=profileGeometry([[0,.035,.035],[.20,.044,.041],[.43,.041,.036],[.72,.030,.027],[1,.024,.023]]);
 limbs.forEach((part,i)=>{
  part.shoulder.visible=false;
  part.wristband.visible=part.sock.visible=false;
  for(const key of ['upper','lower','thigh','calf'])part[key].name=`athlete-${i}-${key}`;
 });
 for(const limb of limbs){
  root.add(limb.foot);
  volume(limb.foot,sole,[0,-.047,.053],[.058,.022,.134]);
  volume(limb.foot,shoe,[0,-.020,.048],[.056,.039,.127]);
  volume(limb.foot,fabric,[0,.006,-.018],[.038,.042,.054]);
  for(let i=0;i<4;i++){const lace=volume(limb.foot,trim,[0,.015-i*.004,.032+i*.017],[.030,.0035,.0035]);lace.rotation.y=i%2?.13:-.13;}
  limb.tennisDetails=new THREE.Group();limb.foot.add(limb.tennisDetails);limb.tennisDetails.visible=false;
  volume(limb.tennisDetails,tennisCoral,[0,-.019,-.037],[.052,.028,.028]);
  volume(limb.tennisDetails,tennisWhite,[0,.015,.024],[.028,.016,.050]);
  const bareFoot=new THREE.Group();limb.foot.add(bareFoot);bareFoot.visible=false;bareFoot.name='yoga-bare-foot';limb.bareFoot=bareFoot;
  volume(bareFoot,yogaSkin,[0,-.025,-.024],[.039,.038,.057]);
  volume(bareFoot,yogaSkin,[0,-.031,.043],[.045,.030,.092]);
  for(let toe=0;toe<5;toe++){
   const inner=limb===limbs[0]?1:-1;
   volume(bareFoot,yogaSkin,[inner*(.032-toe*.016),-.035,.120-toe*.007],[.012-toe*.0012,.017-toe*.001,.030-toe*.0025]);
  }
 }
 // One welded trouser surface: the two leg loops share a curved crotch seam.
 // A separate pelvis shell over two thigh tubes produces an artificial butt/thigh cut.
 const trouserGeometry=new THREE.BufferGeometry(),trouserIndices=[],trouserVertices=[],topSeam=new Map();
 const angles=40,stations=40,legIndices=[[],[]];
 for(let side=0;side<2;side++)for(let row=0;row<=stations;row++){
  legIndices[side][row]=[];
  for(let j=0;j<angles;j++){
   const a=j/angles*Math.PI*2,s=side===0?-1:1,inner=s*Math.cos(a)<-1e-8;
   const seamKey=row===0&&(inner||Math.abs(Math.cos(a))<1e-8)?(Math.abs(Math.sin(a))<1e-8?0:Math.sin(a)).toFixed(6):null;
   let index=seamKey!==null?topSeam.get(seamKey):undefined;
   if(index===undefined){index=trouserVertices.length;trouserVertices.push({side,row,a,inner});if(seamKey!==null)topSeam.set(seamKey,index);}
   legIndices[side][row][j]=index;
  }
 }
 for(let side=0;side<2;side++)for(let row=0;row<stations;row++)for(let j=0;j<angles;j++){
  const next=(j+1)%angles,a=legIndices[side][row][j],b=legIndices[side][row][next],c=legIndices[side][row+1][j],d=legIndices[side][row+1][next];
  trouserIndices.push(a,b,c,b,d,c);
 }
 trouserGeometry.setAttribute('position',new THREE.Float32BufferAttribute(new Float32Array(trouserVertices.length*3),3));
 trouserGeometry.setIndex(trouserIndices);trouserGeometry.computeVertexNormals();const trousers=mesh(trouserGeometry,captureSuit);trousers.name='continuous-shooting-trousers';trousers.visible=false;
 const shortsGeometry=trouserGeometry.clone(),shortColors=[];
 for(const {side,row,a}of trouserVertices){
  const outer=(side===0?-1:1)*Math.cos(a)>.90,panel=outer&&row/stations>.16;
  const color=new THREE.Color(panel?0xe7e5dc:0x172128);shortColors.push(color.r,color.g,color.b);
 }
 shortsGeometry.setAttribute('color',new THREE.Float32BufferAttribute(shortColors,3));
 const rowingShorts=mesh(shortsGeometry,rowingShortMaterial);rowingShorts.visible=false;rowingShorts.name='continuous-rowing-shorts';
 const tennisShortGeometry=trouserGeometry.clone(),tennisShorts=mesh(tennisShortGeometry,tennisWhite);tennisShorts.visible=false;tennisShorts.name='continuous-tennis-shorts';
 const yogaShortGeometry=trouserGeometry.clone(),yogaShorts=mesh(yogaShortGeometry,yogaFabric);yogaShorts.visible=false;yogaShorts.name='continuous-yoga-shorts';
 const leggingsGeometry=trouserGeometry.clone(),leggings=mesh(leggingsGeometry,yogaFabric);leggings.visible=false;leggings.name='female-leggings';
 const displayedKnees=[v(),v()];
 function displayKnee(hip,knee,ankle,out){
  const femur=hip.distanceTo(knee),shin=knee.distanceTo(ankle),total=femur+shin;
  // Retarget only the rendered character: source joints and the planted ankles remain intact.
  const a=total*.52,b=total*.48,axis=ankle.clone().sub(hip),d=Math.max(1e-6,Math.min(axis.length(),total-1e-6));axis.normalize();
  const bend=knee.clone().sub(hip).addScaledVector(axis,-knee.clone().sub(hip).dot(axis));
  if(bend.lengthSq()<1e-10)bend.set(0,0,1).addScaledVector(axis,-axis.z);
  if(bend.lengthSq()<1e-10)bend.set(1,0,0).addScaledVector(axis,-axis.x);
  const along=(a*a-b*b+d*d)/(2*d),height=Math.sqrt(Math.max(0,a*a-along*along));
  return out.copy(hip).addScaledVector(axis,along).addScaledVector(bend.normalize(),height);
 }
 function trouserRadius(t,shin=false){
  const keys=shin?[[0,.037,.039],[.18,.041,.044],[.40,.043,.046],[.68,.034,.037],[1,.025,.027]]:[[0,.067,.070],[.28,.067,.069],[.55,.057,.059],[.82,.044,.046],[1,.037,.039]];
  let i=0;while(i<keys.length-2&&t>keys[i+1][0])i++;const a=keys[i],b=keys[i+1],u=Math.max(0,Math.min(1,(t-a[0])/(b[0]-a[0]))),s=u*u*(3-2*u);
  return [a[1]+(b[1]-a[1])*s,a[2]+(b[2]-a[2])*s];
 }
 function updateTrousers(coords,hip,axis,lateral,forward,width){
  const fullLegs=female&&!shooting&&!rowing&&!tennis;
  const frames=[0,1].map(i=>{
   const knee=rowing||tennis||yoga||fullLegs?displayedKnees[i].copy(coords[8+i]):displayKnee(coords[6+i],coords[8+i],coords[10+i],displayedKnees[i]);
   const thighDown=knee.clone().sub(coords[6+i]).normalize(),shinDown=coords[10+i].clone().sub(knee).normalize();
   const frame=down=>{
    const x=lateral.clone().addScaledVector(down,-lateral.dot(down)).normalize(),z=new THREE.Vector3().crossVectors(x,down).negate().normalize();
    return {x,z};
   };
   return {knee,thigh:frame(thighDown),shin:frame(shinDown)};
  });
  const geometry=fullLegs?leggingsGeometry:yoga?yogaShortGeometry:tennis?tennisShortGeometry:rowing?shortsGeometry:trouserGeometry,position=geometry.attributes.position,point=v();
  trouserVertices.forEach(({side,row,a,inner},index)=>{
   const c=Math.cos(a),s=Math.sin(a),frame=frames[side];
   // The front fly stays outside the shirt hem; the seam dips only at the groin.
   const saddle=(tennis||yoga)&&!female?Math.abs(s)**12:Math.abs(s);
   const waistband=female?.025:.075;
   const waist=hip.clone().addScaledVector(axis,inner?-.105+(.105+waistband)*saddle:waistband).addScaledVector(lateral,inner?0:(female?.144:.166)*width*c).addScaledVector(forward,(female?.100:tennis?.115:.105)*s);
   if(yoga&&inner){
    // At a folded hip, the crotch follows the thighs rather than jutting behind the back.
    const thighUp=coords[6+side].clone().sub(frame.knee).normalize();
    waist.addScaledVector(axis,.105*(1-saddle)).addScaledVector(thighUp,-.105*(1-saddle));
   }
   const t=row/stations;
   if(t<=.16){
    const blend=t/.16,radius=fullLegs?trouserRadius(.27):yoga?[.090,.098]:rowing||tennis?[.077,.080]:trouserRadius(.27),ring=coords[6+side].clone().lerp(frame.knee,.27).addScaledVector(frame.thigh.x,c*radius[0]).addScaledVector(frame.thigh.z,s*radius[1]);
    point.copy(waist).lerp(ring,blend*blend*(3-2*blend));
   }else if((rowing||tennis||yoga)&&!fullLegs){
    const along=.27+(t-.16)/.84*(yoga?.28:tennis?.39:.30),rx=(yoga?.090:.077)-(t-.16)/.84*(yoga?.009:tennis?.004:.007),rz=rx+(yoga?.008:.003);
    point.copy(coords[6+side]).lerp(frame.knee,along).addScaledVector(frame.thigh.x,c*rx).addScaledVector(frame.thigh.z,s*rz);
   }else if(t<=.52){
    const along=.27+(t-.16)/.36*.73,radius=trouserRadius(along);
    point.copy(coords[6+side]).lerp(frame.knee,along).addScaledVector(frame.thigh.x,c*radius[0]).addScaledVector(frame.thigh.z,s*radius[1]);
   }else{
    const along=(t-.52)/.48,radius=trouserRadius(along,true);
    // Blend the local surface frame around the knee rather than exposing two cut ends.
    const blend=Math.min(1,along/.16),x=frame.thigh.x.clone().lerp(frame.shin.x,blend).normalize(),z=frame.thigh.z.clone().lerp(frame.shin.z,blend).normalize();
    point.copy(frame.knee).lerp(coords[10+side],along).addScaledVector(x,c*radius[0]).addScaledVector(z,s*radius[1]);
   }
   position.setXYZ(index,point.x,point.y,point.z);
  });
  position.needsUpdate=true;geometry.computeVertexNormals();geometry.computeBoundingSphere();
 }
 const skinSurfaces=[];root.traverse(m=>{if(m.isMesh&&m.material===skin)skinSurfaces.push(m);});
 if(female){
  // Change the surface silhouette only; both variants use identical joint anchors.
  for(const g of new Set([regularTorso,captureTorso,rowingTorso,tennisTorso,rowingTank.geometry,yogaTank.geometry,femaleTank.geometry])){
   const p=g.attributes.position;
   for(let i=0;i<p.count;i++){const y=p.getY(i),waist=Math.exp(-(((y-.35)/.22)**2));p.setX(i,p.getX(i)*(.94-.09*waist));p.setZ(i,p.getZ(i)*(.98+.04*Math.exp(-(((y-.72)/.15)**2))));}
   p.needsUpdate=true;g.computeVertexNormals();
  }
  for(const g of new Set([regularArm,regularForearm,yogaArm,yogaForearm,rowingArm,rowingForearm,regularThigh,regularCalf,rowingThigh,rowingCalf,yogaThigh,mobilitySleeve]))g.scale(.88,1,.88);
  rowingShortMaterial.vertexColors=false;rowingShortMaterial.color.set(0x173d45);
 }
 let shooting=false,rowing=false,tennis=false,yoga=false,mobility=false,bentYoga=false,currentSport=null,currentPose=null;
 function setSport(sport,pose=null){
  if(sport===currentSport&&pose===currentPose)return;currentSport=sport;currentPose=pose;shooting=sport==='clay';rowing=sport==='rowing';tennis=sport==='tennis';yoga=sport==='yoga';mobility=sport==='stretch'||sport==='gentle';root.userData.sport=sport;
  tiedHair.visible=female;mobilityOutfit.root.visible=mobility;torso.visible=!mobility;wellnessOutfit.root.visible=female&&yoga;
  bentYoga=yoga&&['down-dog','plank','forearm-plank','cobra','sphinx','child','tabletop','chair'].includes(pose);
  skinSurfaces.forEach(m=>{m.material=yoga?yogaSkin:tennis?tennisSkin:rowing?rowingSkin:shooting?shootingSkin:skin;});
  torso.material=yoga?yogaSkin:tennis?tennisNavy:rowing?rowingSkin:shooting?shootingBlue:body;torso.geometry=bentYoga?yogaSkinTorso:tennis?tennisTorso:rowing||yoga?rowingTorso:shooting?captureTorso:regularTorso;
  yogaGarment.root.visible=bentYoga;yogaTank.visible=yogaShorts.visible=yoga&&!bentYoga;
  head.scale.setScalar(yoga?1.08:1);neck.geometry=yoga?yogaNeck:regularNeck;
  shootingVest.visible=shooting;
  pelvis.material=shooting?captureSuit:fabric;pelvis.geometry=regularPelvis;
  pelvis.visible=!shooting&&!rowing&&!tennis&&!yoga;trousers.visible=shooting;rowingShorts.visible=rowingTank.visible=glasses.visible=rowing;
  tennisCap.visible=poloCollar.visible=tennisShorts.visible=tennis;
  hair.color.set(yoga?0x25221f:tennis?0x694533:rowing?0x252521:0x354039);
  cap.visible=shooting;hairCap.visible=!shooting&&!tennis;
  if(female){
   root.userData.gender='female';
   femaleTank.visible=!yoga&&!rowing;femaleTop.color.set(shooting?0xbfc5ca:0xe9ecef);
   torso.material=yoga?yogaSkin:tennis?tennisSkin:rowing?rowingSkin:shooting?shootingSkin:skin;
   torso.geometry=bentYoga?yogaSkinTorso:rowingTorso;
   shootingVest.visible=poloCollar.visible=pelvis.visible=false;
   tennisCap.visible=tennis||rowing;hairCap.visible=false;hair.color.set(0x694533);
   glasses.visible=rowing||shooting;
   head.scale.multiplyScalar(.96);
   leggings.visible=!shooting&&!rowing&&!tennis;yogaShorts.visible=false;
   yogaTank.visible=yoga&&!bentYoga;
  }
  eyes.forEach(eye=>{eye.neutral.visible=!shooting&&!rowing;eye.white.visible=eye.pupil.visible=shooting;});
  for(const part of limbs){
   part.upper.visible=true;part.upper.geometry=yoga?yogaArm:rowing||tennis?rowingArm:regularArm;
   part.sleeve.visible=!rowing&&!yoga;part.shoulder.visible=rowing||tennis||yoga;part.shoulder.material=yoga?yogaSkin:tennis?tennisNavy:rowingSkin;part.shoulder.scale.set(tennis?.067:.064,tennis?.052:.056,tennis?.064:.062);part.sleeve.geometry=tennis?tennisSleeve:regularSleeve;part.sleeve.material=tennis?tennisNavy:shooting?shootingBlue:body;
   part.lower.geometry=yoga?yogaForearm:rowing||tennis?rowingForearm:regularForearm;
   part.lower.material=part.elbow.material=yoga?yogaSkin:tennis?tennisSkin:shooting?shootingSkin:rowing?rowingSkin:skin;
   part.thigh.material=part.calf.material=part.knee.material=yoga?yogaSkin:tennis?tennisSkin:rowing?rowingSkin:shooting?captureSuit:fabric;
   part.thigh.geometry=yoga?yogaThigh:rowing||tennis?rowingThigh:regularThigh;part.calf.geometry=rowing||tennis?rowingCalf:regularCalf;
   part.thigh.visible=part.calf.visible=part.knee.visible=!shooting;
   part.elbow.scale.set(yoga?.035:rowing||tennis?.034:.040,yoga?.035:rowing||tennis?.036:.040,yoga?.035:rowing||tennis?.035:.040);
   part.knee.scale.set(rowing||tennis?.040:shooting?.038:.053,rowing||tennis?.042:shooting?.041:.055,rowing||tennis?.041:shooting?.040:.053);
   part.sock.visible=part.tennisDetails.visible=tennis;part.wristband.visible=tennis&&part===limbs[0];
   part.bareFoot.visible=yoga;
   part.foot.children.forEach((m,i)=>{if(m.isMesh){m.visible=!yoga;m.material=tennis?(i===0?tennisDark:i===1||i===2?tennisWhite:tennisDark):shooting?(i===0?capturePanel:i===1?captureShoe:i===2?captureSuit:reflector):(i===0?sole:i===1?shoe:i===2?fabric:trim);}});
   if(female){
    part.sleeve.visible=false;part.shoulder.visible=true;part.shoulder.material=torso.material;part.shoulder.scale.set(.055,.047,.052);
    if(leggings.visible)part.thigh.visible=part.calf.visible=part.knee.visible=false;
    part.elbow.scale.multiplyScalar(.88);
   }
  }
  if(mobility){
   pelvis.visible=leggings.visible=femaleTank.visible=false;
   head.scale.setScalar((female?.96:1)*1.08);neck.geometry=yogaNeck;
   skinSurfaces.forEach(m=>{m.material=yogaSkin;});hair.color.set(0x3b3029);
   for(const part of limbs){
    part.upper.geometry=yogaArm;part.lower.geometry=yogaForearm;
    part.upper.material=part.lower.material=part.elbow.material=yogaSkin;
    part.sleeve.visible=part.shoulder.visible=true;part.sleeve.geometry=mobilitySleeve;part.sleeve.material=mobilityShirt;
    part.shoulder.material=mobilityShirt;part.shoulder.scale.set(female?.055:.061,.05,.056);
    part.thigh.visible=part.calf.visible=part.knee.visible=false;part.elbow.scale.setScalar(female?.031:.035);
   }
  }
  if(female&&(yoga||mobility)){
   if(yoga){torso.visible=yogaTank.visible=yogaGarment.root.visible=leggings.visible=false;}
   for(const part of limbs){
    part.upper.geometry=wellnessArm;part.lower.geometry=wellnessForearm;
    part.shoulder.scale.set(.043,.040,.043);part.elbow.scale.setScalar(.028);
    if(mobility)part.sleeve.geometry=wellnessSleeve;
    part.thigh.visible=part.calf.visible=part.knee.visible=false;
   }
  }
  if(rowing)head.scale.y*=.89;
 }
 const shoulder=v(),hip=v(),axis=v(),lateral=v(),forward=v();
 return {root,setSport,update(coords,sample,anchors){
  if(female&&(yoga||mobility)){
   // Tailor the display shoulder girdle; support hands, feet and scoring data stay fixed.
   const mid=coords[0].clone().add(coords[1]).multiplyScalar(.5);coords=[...coords];
   coords[0]=mid.clone().lerp(coords[0],.84);coords[1]=mid.clone().lerp(coords[1],.84);
   const hipMid=coords[6].clone().add(coords[7]).multiplyScalar(.5);
   coords[6]=hipMid.clone().lerp(coords[6],.72);coords[7]=hipMid.clone().lerp(coords[7],.72);
  }
  shoulder.copy(coords[0]).add(coords[1]).multiplyScalar(.5);hip.copy(coords[6]).add(coords[7]).multiplyScalar(.5);
  axis.copy(shoulder).sub(hip).normalize();lateral.copy(coords[1]).sub(coords[0]).normalize();forward.crossVectors(lateral,axis).normalize();lateral.crossVectors(axis,forward).normalize();
  const width=coords[0].distanceTo(coords[1])/.42;
  const top=shoulder.clone().addScaledVector(axis,.065),bottom=hip.clone().addScaledVector(axis,-.01);
  const torsoForward=(rowing||tennis)&&sample?.torsoRotation?new THREE.Vector3(0,0,1).applyQuaternion(new THREE.Quaternion(...sample.torsoRotation)):forward;
  segment(bottom,top,torso,torsoForward);torso.scale.x=width;torso.scale.z=Math.min(1.15,Math.max(.8,width));
  rowingTank.position.copy(torso.position);rowingTank.quaternion.copy(torso.quaternion);rowingTank.scale.copy(torso.scale);
  yogaTank.position.copy(torso.position);yogaTank.quaternion.copy(torso.quaternion);yogaTank.scale.copy(torso.scale);
  femaleTank.position.copy(torso.position);femaleTank.quaternion.copy(torso.quaternion);femaleTank.scale.copy(torso.scale);
  shootingVest.position.copy(torso.position);shootingVest.quaternion.copy(torso.quaternion);shootingVest.scale.copy(torso.scale);
  poloCollar.position.copy(torso.position);poloCollar.quaternion.copy(torso.quaternion);poloCollar.scale.copy(torso.scale);
  pelvis.position.copy(hip).addScaledVector(axis,-.115);pelvis.quaternion.copy(anchors.pelvis.quaternion);pelvis.scale.set(coords[6].distanceTo(coords[7])/.28,.23,1);
  if(mobility)mobilityOutfit.update(coords);
  if(female&&yoga)wellnessOutfit.update(coords);
  if(shooting)updateTrousers(coords,hip,axis,lateral,forward,width);
  if(!female&&bentYoga)yogaGarment.update(coords);
  else if(!female&&yoga)updateTrousers(coords,hip,axis,lateral,forward,width);
  if(leggings.visible&&(bentYoga||!yoga))updateTrousers(coords,hip,axis,lateral,forward,width);
  if(rowing||tennis){
   const hipAxis=new THREE.Vector3(0,1,0).applyQuaternion(anchors.pelvis.quaternion),hipLateral=coords[7].clone().sub(coords[6]).normalize(),hipForward=new THREE.Vector3().crossVectors(hipLateral,hipAxis).normalize();
   updateTrousers(coords,hip,hipAxis,hipLateral,hipForward,width);
  }
  head.position.copy(anchors.head.position);head.quaternion.copy(anchors.head.quaternion);
  if(rowing){
   const gazeForward=new THREE.Vector3(0,0,1).applyQuaternion(anchors.head.quaternion).setY(0);
   if(gazeForward.lengthSq()<1e-6)gazeForward.copy(forward).setY(0);
   gazeForward.normalize();const gazeRight=new THREE.Vector3(0,1,0).cross(gazeForward).normalize();
   head.quaternion.setFromRotationMatrix(matrix.makeBasis(gazeRight,new THREE.Vector3(0,1,0),gazeForward));
  }
  const aiming=sample?.gazeReferenceActive||coords[5].y>shoulder.y;
  const gaze=shooting&&aiming&&sample?.clayProp?new THREE.Vector3(...sample.clayProp.x).applyQuaternion(head.quaternion.clone().invert()):new THREE.Vector3(0,0,1);
  eyes.forEach(({side,pupil})=>pupil.position.set(side*.037+THREE.MathUtils.clamp(gaze.x,-.7,.7)*.008,.035+THREE.MathUtils.clamp(gaze.y,-.7,.7)*.0022,.089));
  const neckTop=head.position.clone().add(new THREE.Vector3(0,-.09,0).applyQuaternion(head.quaternion));segment(shoulder,neckTop,neck,forward);
  limbs.forEach((part,i)=>{
   segment(coords[i],coords[i+2],part.upper,forward);
   const sleeveEnd=coords[i].clone().lerp(coords[i+2],tennis?.48:.44);segment(coords[i],sleeveEnd,part.sleeve,forward);
   segment(coords[i+2],coords[i+4],part.lower,forward);
   const thighStart=rowing||tennis||yoga?coords[i+6].clone().lerp(coords[i+8],yoga?.51:tennis?.58:.50):coords[i+6];
   segment(thighStart,coords[i+8],part.thigh,forward);segment(coords[i+8],coords[i+10],part.calf,forward);
   part.shoulder.position.copy(coords[i]);part.shoulder.quaternion.copy(part.upper.quaternion);
   part.elbow.position.copy(coords[i+2]);part.knee.position.copy(coords[i+8]);
   segment(coords[i+2].clone().lerp(coords[i+4],.77),coords[i+2].clone().lerp(coords[i+4],.98),part.wristband,forward);
   segment(coords[i+8].clone().lerp(coords[i+10],.68),coords[i+10],part.sock,forward);
   part.foot.position.copy(coords[i+10]);part.foot.quaternion.copy(anchors.feet[i].quaternion);
  });

 }};
}
