import assert from 'node:assert/strict';
import {preferredExportMime,exportPercent} from '../src/rowing-video-export.mjs';
assert.equal(preferredExportMime(()=>true),'video/mp4');
assert.equal(preferredExportMime(t=>t==='video/mp4'||t.startsWith('video/webm')),'video/mp4');
assert.equal(preferredExportMime(t=>t.startsWith('video/webm')),'video/webm;codecs=vp8');
assert.equal(preferredExportMime(()=>false),null);
assert.equal(exportPercent(0,1,3),0);assert.equal(exportPercent(2,1,3),49);assert.equal(exportPercent(3,1,3),99);assert.equal(exportPercent(5,1,3),99);
console.log('PASS: MP4 preference, truthful WebM fallback and bounded export progress before finalization.');
