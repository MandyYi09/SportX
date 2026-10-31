import assert from 'node:assert/strict';
import {exportFramePlan,muxAvcMp4} from '../src/rowing-frame-export.mjs';
const plan=exportFramePlan(5.3,7.3);
assert.equal(plan.length,113);assert.equal(plan[0].sourceTime,5.3);
assert.equal(plan[49].card,false);assert.equal(plan[50].card,true);
assert.ok(plan.every((f,i)=>f.timestamp===i*40000&&f.duration===40000));
assert.equal(plan.at(-1).timestamp+plan.at(-1).duration,4520000);
const sample={data:new Uint8Array([0,0,0,1,5]),duration:40000,key:true};
const mp4=muxAvcMp4([sample,sample],new Uint8Array([1,66,0,40,255,224,0]),320,240);
const data=new Uint8Array(await mp4.arrayBuffer()),view=new DataView(data.buffer),decoder=new TextDecoder();
const boxes=[];for(let offset=0;offset<data.length;){const size=view.getUint32(offset);assert.ok(size>=8&&offset+size<=data.length);boxes.push(decoder.decode(data.slice(offset+4,offset+8)));offset+=size;}
assert.deepEqual(boxes,['ftyp','mdat','moov']);assert.equal(mp4.type,'video/mp4');
assert.throws(()=>muxAvcMp4([],null,320,240));
console.log('PASS: source-time frame plan, fixed timestamps, scorecard boundary and MP4 box layout.');
