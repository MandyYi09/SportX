import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {rowingSpeechCatalog} from '../src/rowing-speech-catalog.mjs';
const base=new URL('../src/assets/audio/rowing/',import.meta.url);
const manifest=JSON.parse(await fs.readFile(new URL('manifest.json',base),'utf8'));
assert.equal(rowingSpeechCatalog.length,57);assert.equal(new Set(rowingSpeechCatalog.map(c=>c.id)).size,57);
assert.equal(manifest.clipCount,114);assert.equal(manifest.clips.length,114);
for(const cue of rowingSpeechCatalog)for(const language of ['en','zh']){
 const records=manifest.clips.filter(c=>c.id===cue.id&&c.language===language);assert.equal(records.length,1);
 const clip=records[0];assert.equal(clip.text,cue.text[language]);assert.ok(clip.durationSeconds>.2&&clip.durationSeconds<20,`${clip.src}: implausible duration`);
 assert.equal(clip.locale,language==='en'?'en-US':'zh-CN');assert.equal(clip.voice,language==='en'?'Microsoft Zira':'Microsoft Huihui');
 assert.ok(clip.src===`${language}/${cue.id}.mp3`,'Unexpected audio path');
 const bytes=await fs.readFile(new URL(clip.src,base));assert.ok(bytes.length>1000);
 let offset=bytes.subarray(0,3).toString()==='ID3'?10+((bytes[6]&127)<<21)+((bytes[7]&127)<<14)+((bytes[8]&127)<<7)+(bytes[9]&127):0;
 while(offset<bytes.length-4&&!(bytes[offset]===255&&(bytes[offset+1]&224)===224&&(bytes[offset+1]&6)===2))offset++;
 assert.ok(offset<bytes.length-4,'Missing MPEG Layer III frame');
 const version=(bytes[offset+1]>>3)&3,index=(bytes[offset+2]>>2)&3,rates=version===3?[44100,48000,32000]:version===2?[22050,24000,16000]:[11025,12000,8000];
 assert.equal(rates[index],24000,'Actual MP3 sample rate must match metadata');assert.equal((bytes[offset+3]>>6)&3,3,'Actual MP3 must be mono');assert.equal(bytes.length,clip.bytes);assert.equal(createHash('sha256').update(bytes).digest('hex'),clip.sha256);
}
for(const language of ['en','zh'])assert.ok((await fs.stat(new URL(`sample-${language}.mp3`,base))).size>1000);
assert.equal(manifest.audio.sampleRate,24000);assert.equal(manifest.audio.channels,1);
console.log('PASS: 57 bilingual TTS cues, 114 matching MP3 assets, exact text/voice mapping, plausible duration, byte sizes, SHA-256 and two samplers.');
