import assert from 'node:assert/strict';
import {preferredRearLens,useWidestZoom,setCameraZoom,cameraDirection,sameDirectionDevices} from '../src/camera-controls.mjs';

const devices=labels=>labels.map((label,i)=>({label,deviceId:String(i)}));
const generic=devices(['camera 1, facing front','camera 3, facing front','camera 0, facing back','camera 2, facing back','camera 4, facing back','camera 5, facing back']);
assert.equal(preferredRearLens(generic),null,'Opaque IDs must never imply a focal length');
assert.equal(cameraDirection(generic[0]),'user');
assert.equal(cameraDirection(generic[2]),'environment');
assert.deepEqual(sameDirectionDevices(generic,{deviceId:'2',facingMode:'environment'}),generic.slice(2));
assert.deepEqual(sameDirectionDevices(generic,{deviceId:'0'}),generic.slice(0,2));
const unnamed=devices(['USB Camera','USB Camera 2']);
assert.deepEqual(sameDirectionDevices(unnamed,{deviceId:'0'}),unnamed);
assert.equal(sameDirectionDevices(generic.slice(1),{deviceId:'1',facingMode:'user'}).length,1);
const labelled=devices(['Front wide','Back telephoto','Back main','Back ultra wide']);
assert.equal(preferredRearLens(labelled).label,'Back ultra wide');
assert.equal(preferredRearLens(labelled.slice(0,3)).label,'Back main');
assert.equal(preferredRearLens(devices(['前置广角','后置长焦','后置超广角'])).label,'后置超广角');

let actual=4,requested;
const range={min:0.5,max:5,step:0.1};
const track={getCapabilities:()=>({zoom:range}),getSettings:()=>({zoom:actual}),getConstraints:()=>({resizeMode:{ideal:'none'}}),applyConstraints:async constraints=>{requested=constraints;actual=constraints.zoom.exact;}};
assert.equal(await useWidestZoom(track),range);
assert.equal(actual,0.5);
assert.deepEqual(requested.resizeMode,{ideal:'none'});
assert.equal(await setCameraZoom(track,2),2);
assert.equal(await useWidestZoom({...track,applyConstraints:async()=>{}}),null,'Silently ignored zoom must not be reported as the widest view');
assert.equal(await useWidestZoom({}),null);
assert.equal(await useWidestZoom({...track,applyConstraints:async()=>{throw Error('Unsupported');}}),null);
console.log('PASS: camera lens hints, opaque Huawei IDs, verified zoom, ignored constraints and unsupported zoom.');
