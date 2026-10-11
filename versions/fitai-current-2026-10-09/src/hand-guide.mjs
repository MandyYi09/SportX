// One hand model is shared by the full figure and the enlarged wrist study.
export function createHand(THREE, material, side = 1) {
  const root = new THREE.Group();
  const palm = new THREE.Mesh(new THREE.SphereGeometry(1, 24, 16), material);
  palm.scale.set(.085, .033, .059);
  palm.position.set(.071, 0, 0);
  root.add(palm);
  for (const z of [-.043, -.015, .014, .042]) {
    const finger = new THREE.Mesh(new THREE.TorusGeometry(.034, .011, 8, 16, Math.PI * 1.45), material);
    finger.position.set(.133, -.032, z);
    finger.rotation.z = -.25;
    root.add(finger);
  }
  const thumb = new THREE.Mesh(new THREE.CapsuleGeometry(.016, .055, 4, 12), material);
  thumb.position.set(.071, -.033, side * .061);
  thumb.rotation.z = -.7;
  root.add(thumb);
  return { root, grip: new THREE.Vector3(.133, -.031, 0) };
}

export function orientHand(THREE, hand, wrist, direction) {
  const x = direction.clone().normalize();
  // Project world-up to keep the back of the hand visible, even on sloping arms.
  const up = Math.abs(x.y) > .95 ? new THREE.Vector3(0, 0, 1) : new THREE.Vector3(0, 1, 0);
  const z = new THREE.Vector3().crossVectors(x, up).normalize();
  const y = new THREE.Vector3().crossVectors(z, x).normalize();
  hand.root.position.copy(wrist);
  hand.root.quaternion.setFromRotationMatrix(new THREE.Matrix4().makeBasis(x, y, z));
  return hand.grip.clone().applyQuaternion(hand.root.quaternion).add(wrist);
}

// Deliberately visible teaching offsets; these are not measured or pass/fail angles.
export const wristExamples = {
  aligned: { wristLift: 0, elbowLift: 0, keepGrip: false, text: 'The back of the hand continues the forearm line. Follow that line as the hands draw in.' },
  arched: { wristLift: .095, elbowLift: 0, keepGrip: true, text: 'The wrist rises above the hand. Notice the bend between the forearm and the back of the hand.' },
  raised: { wristLift: .12, elbowLift: .12, keepGrip: false, text: 'The hand stays in line with the forearm, but the whole forearm rises. This is a different change from bending the wrist.' },
};

export function createWristDetail(THREE, host) {
  const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  renderer.domElement.setAttribute('aria-label', 'Enlarged side view of forearm, wrist, hand and oar grip');
  host.append(renderer.domElement);
  const scene = new THREE.Scene();
  scene.add(new THREE.HemisphereLight(0xffffff, 0x798570, 2.7));
  const light = new THREE.DirectionalLight(0xffffff, 3); light.position.set(-1, 3, 4); scene.add(light);
  const camera = new THREE.OrthographicCamera(-.65, .55, .32, -.26, .01, 10);
  camera.position.set(-.13, .04, 2);
  camera.lookAt(-.13, .04, 0);
  const material = new THREE.MeshStandardMaterial({ color: 0x72875f, roughness: .7 });
  const wristMaterial = new THREE.MeshStandardMaterial({ color: 0xd8ecad });
  const arm = new THREE.Mesh(new THREE.CylinderGeometry(.046, .06, 1, 20), material); scene.add(arm);
  const wrist = new THREE.Mesh(new THREE.SphereGeometry(.043, 24, 16), wristMaterial); scene.add(wrist);
  const hand = createHand(THREE, material); scene.add(hand.root);
  const handle = new THREE.Mesh(new THREE.CylinderGeometry(.023, .023, .24, 16), new THREE.MeshStandardMaterial({ color: 0x9c8060 }));
  handle.rotation.x = Math.PI / 2; scene.add(handle);
  const line = new THREE.Line(new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(-.48, 0, .08), new THREE.Vector3(.27, 0, .08)]), new THREE.LineDashedMaterial({ color: 0x879880, dashSize: .016, gapSize: .014, transparent: true, opacity: .7 }));
  line.computeLineDistances(); scene.add(line);
  let mode = 'aligned';
  function render() {
    const example = wristExamples[mode];
    const e = new THREE.Vector3(-.43, example.elbowLift, 0), w = new THREE.Vector3(0, example.wristLift, 0);
    const direction = example.keepGrip ? new THREE.Vector3(.16, 0, 0).sub(w) : w.clone().sub(e);
    const d = w.clone().sub(e); arm.position.copy(w).add(e).multiplyScalar(.5); arm.scale.y = d.length();
    arm.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), d.normalize());
    wrist.position.copy(w); wristMaterial.color.set(mode === 'aligned' ? 0xd8ecad : 0xe6b878);
    handle.position.copy(orientHand(THREE, hand, w, direction));
    const {width, height} = host.getBoundingClientRect();
    if (!width || !height) return;
    renderer.setSize(width, height, false);
    const halfWidth = Math.max(.52, .26 * width / height);
    camera.left = -halfWidth; camera.right = halfWidth; camera.top = .26; camera.bottom = -.26; camera.updateProjectionMatrix();
    renderer.render(scene, camera);
  }
  new ResizeObserver(render).observe(host);
  return { setMode(value) { mode = value; render(); } };
}
