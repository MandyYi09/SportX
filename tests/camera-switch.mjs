import fs from 'node:fs/promises';
import vm from 'node:vm';
import assert from 'node:assert/strict';
import {cameraDirection,sameDirectionDevices,preferredRearLens} from '../src/camera-controls.mjs';

// Exercise the actual lifecycle handlers with DOM spies. Record intermediate
// changes too: checking only the final open/visible state misses a flashing panel.
const source=await fs.readFile(new URL('../src/app.js',import.meta.url),'utf8');
const lifecycle=source.slice(source.indexOf('function releaseCameraStream('),source.indexOf("$('camera').onclick = async"));
const change=source.slice(source.indexOf('async function switchCamera('),source.indexOf('for(const button of cameraSwitchButtons())button.onclick'));
const changes=[],nodes=new Map();
const $=id=>{
    if(!nodes.has(id)){
        let hidden=false;
        nodes.set(id,{
            open:id==='camera-dialog',
            get hidden(){return hidden;},
            set hidden(value){hidden=value;changes.push(`${id}:hidden:${value}`);},
            classList:{remove(name){changes.push(`${id}:remove:${name}`);}},
            pause(){},async play(){},
            close(){this.open=false;changes.push(`${id}:close`);},
            showModal(){this.open=true;changes.push(`${id}:showModal`);}
        });
    }
    return nodes.get(id);
};
const devices=['front','rear0','rear2'].map(deviceId=>({deviceId,kind:'videoinput',label:deviceId==='front'?'camera 1 facing front':`${deviceId} facing back`}));
let stopped=0,failNext=false;
const makeStream=deviceId=>({getTracks:()=>[{onended:null,stop(){stopped++;}}],getVideoTracks:()=>[{getSettings:()=>({deviceId,facingMode:deviceId==='front'?'user':'environment'})}]});
const context=vm.createContext({
    $,stream:makeStream('rear0'),starting:false,switchingCamera:false,cameraDeviceId:'rear0',cameraFacing:'environment',runId:0,guideUnavailable:false,
    cameraSwitchButtons:()=>[],cameraFlipButtons:[],dialogStop:{},
    cameraControls:{reset(){changes.push('controls:reset');}},presence:{reset(){changes.push('presence:reset');}},focusView:{setExpanded(){changes.push('focus:reset');}},
    clearComparison(){},setCameraButton(){},selectedPose:()=>({demoOnly:true}),stopTimer(){},setFeedback(){},async updateCameraDevices(){},
    navigator:{mediaDevices:{async enumerateDevices(){return devices;}}},cameraDirection,sameDirectionDevices,preferredRearLens
});
vm.runInContext(lifecycle+change,context);
$('camera').onclick=async()=>{if(failNext){failNext=false;context.stream=null;return;}context.stream=makeStream(context.cameraDeviceId);};
for(const operation of ['switchCamera()','switchCamera()','switchCamera(null,true)']){
    await vm.runInContext(operation,context);
    assert.deepEqual(changes,[],'Switching must never hide/reset the panel, controls or layout');
    assert.equal($('camera-dialog').open,true);
}
assert.equal(context.cameraDeviceId,'front');
failNext=true;
await vm.runInContext('switchCamera(null,true)',context);
assert.equal(context.cameraDeviceId,'front','A failed switch must restore the original physical camera');
assert.ok(context.stream);
assert.deepEqual(changes,[],'Restoring a failed switch must also preserve the preview');
assert.equal(stopped,4,'Each switch releases its original hardware track');
vm.runInContext('stopCamera()',context);
assert.equal($('demo-camera').hidden,true);
assert.equal($('camera-dialog').open,false);
assert.ok(changes.includes('stage-layout:remove:with-preview'));
console.log('PASS: preview stays visible throughout lens cycling, front/back flips and failure recovery; explicit stop still hides it.');
