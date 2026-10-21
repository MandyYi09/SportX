// Exterior proportions estimated from the supplied athlete photographs.
// This is a rigid visual prop with no working mechanism or ballistic model.
export const shootingGrip={radius:.026,wrist:[-.090,-.010,0],rear:[-.04,-.035,0]};
export const shootingRearGrip={...shootingGrip,wrist:[-.130,-.010,0]};
export const shootingEnvelope={min:[-.375,-.108,-.046],max:[.91,.045,.046]};
export const shootingStockOutline=[[-.365,-.097],[-.365,.002],[-.29,.012],[-.17,.013],[-.055,.004],[-.015,-.043],[-.075,-.061],[-.30,-.099]];

export function createShootingProp(THREE){
 const root=new THREE.Group();root.name='photograph-shooting-prop';
 const wood=new THREE.MeshStandardMaterial({color:0x71452c,roughness:.62});
 const metal=new THREE.MeshStandardMaterial({color:0x242a2c,roughness:.46,metalness:.55});
 const receiver=new THREE.MeshStandardMaterial({color:0xb5b6b2,roughness:.36,metalness:.7});
 const rubber=new THREE.MeshStandardMaterial({color:0x0d1112,roughness:.95});
 function add(geometry,material,x,y=0,z=0){const m=new THREE.Mesh(geometry,material);m.position.set(x,y,z);m.castShadow=true;root.add(m);return m;}
 function outline(points,depth,material){
  const shape=new THREE.Shape();shape.moveTo(...points[0]);
  for(let i=1;i<points.length;i++)shape.lineTo(...points[i]);shape.closePath();
  const geometry=new THREE.ExtrudeGeometry(shape,{depth,bevelEnabled:true,bevelSegments:3,bevelThickness:.004,bevelSize:.005,steps:1});geometry.translate(0,0,-depth/2);
  return add(geometry,material,0);
 }
 function tube(x,length,radius,material,y=0,z=0,tipRadius=radius){const m=add(new THREE.CylinderGeometry(tipRadius,radius,length,32),material,x,y,z);m.rotation.z=-Math.PI/2;return m;}
 const stock=outline(shootingStockOutline,.074,wood);stock.name='shooting-stock';
 outline([[-.371,-.098],[-.371,.002],[-.355,.005],[-.349,-.101]],.082,rubber);
 const action=outline([[-.025,-.031],[-.025,.031],[.160,.031],[.202,.017],[.202,-.030],[.056,-.036]],.062,receiver);action.name='shooting-receiver';
 tube(shootingGrip.rear[0],.087,shootingGrip.radius,wood,shootingGrip.rear[1]);
 // Fore-end fits the measured support grip without stretching the prop.
 const foreEnd=tube(.328,.282,.034,wood,-.035,0,.028);foreEnd.name='shooting-fore-end';
 // The reference silhouette has two stacked barrel surfaces and a slim top rib.
 for(const [name,y]of [['upper',.014],['lower',-.012]]){
  const barrel=tube(.548,.674,.013,metal,y,0,.0115);barrel.name=`shooting-${name}-barrel`;
  tube(.891,.022,.013,rubber,y);
 }
 add(new THREE.BoxGeometry(.70,.004,.009),metal,.53,.030);
 // Small exterior guard silhouette and surface fittings only.
 const guard=add(new THREE.TorusGeometry(.026,.0035,8,32),rubber,.017,-.049);guard.scale.x=1.35;
 add(new THREE.BoxGeometry(.065,.008,.009),rubber,.082,.035);
 add(new THREE.SphereGeometry(.0055,12,8),metal,.861,.036);
 return {root};
}
