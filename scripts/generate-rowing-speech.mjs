import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {spawn} from 'node:child_process';
import {createHash} from 'node:crypto';
import {rowingSpeechCatalog} from '../src/rowing-speech-catalog.mjs';
const root=fileURLToPath(new URL('../',import.meta.url));
const onlyAt=process.argv.indexOf('--only'),only=onlyAt<0?null:new Set(process.argv[onlyAt+1].split(','));
const cues=only?rowingSpeechCatalog.filter(c=>only.has(c.id)):rowingSpeechCatalog;
if(only&&cues.length!==only.size)throw Error('Unknown speech cue');
const cache=path.join(root,'.local',only?'rowing-speech-selected':'rowing-speech'),wav=path.join(cache,'wav'),assets=path.join(root,'src','assets','audio','rowing');
const run=(command,args,{capture=false}={})=>new Promise((resolve,reject)=>{
 const child=spawn(command,args,{cwd:root,windowsHide:true,stdio:capture?['ignore','pipe','pipe']:'inherit'});let out='',err='';
 if(capture){child.stdout.on('data',b=>out+=b);child.stderr.on('data',b=>err+=b);}
 child.on('error',reject);child.on('exit',code=>code===0?resolve(out):reject(Error(`${command} exited ${code}: ${err}`)));
});
await fs.mkdir(cache,{recursive:true});await fs.mkdir(assets,{recursive:true});
const input=path.join(cache,'catalog.json');await fs.writeFile(input,JSON.stringify(cues,null,2));
if(!process.argv.includes('--reuse-wav')){
 if(process.platform!=='win32')throw Error('Offline synthesis requires Windows with the named en-US and zh-CN voices.');
 const powershell=path.join(process.env.WINDIR||'C:/Windows','System32','WindowsPowerShell','v1.0','powershell.exe');
 await run(powershell,['-NoProfile','-NonInteractive','-ExecutionPolicy','Bypass','-File',path.join(root,'scripts','synthesize-rowing-speech.ps1'),'-InputFile',input,'-OutputDirectory',wav]);
}
const voiceData=JSON.parse((await fs.readFile(path.join(wav,'voices.json'),'utf8')).replace(/^\uFEFF/,''));
const records=[];
for(const language of ['en','zh']){
 await fs.mkdir(path.join(assets,language),{recursive:true});
 for(const cue of cues){
  const output=path.join(assets,language,cue.id+'.mp3'),input=path.join(wav,language,cue.id+'.wav');
  await run('ffmpeg',['-hide_banner','-loglevel','error','-y','-i',input,'-vn','-af','loudnorm=I=-18:TP=-2:LRA=7','-ar','24000','-ac','1','-c:a','libmp3lame','-b:a','64k',output]);
  const probe=JSON.parse(await run('ffprobe',['-v','error','-show_entries','format=duration:stream=codec_name,sample_rate,channels','-of','json',output],{capture:true}));
  if(probe.streams.length!==1||probe.streams[0].codec_name!=='mp3'||Number(probe.streams[0].sample_rate)!==24000||probe.streams[0].channels!==1)throw Error(`Invalid encoded audio: ${output}`);
  const bytes=await fs.readFile(output),voice=voiceData.find(v=>v.id===cue.id&&v.language===language);
  records.push({id:cue.id,category:cue.category,language,locale:voice.locale,text:cue.text[language],src:`${language}/${cue.id}.mp3`,voice:voice.voice,durationSeconds:Number(probe.format.duration),bytes:bytes.length,sha256:createHash('sha256').update(bytes).digest('hex')});
 }
 console.log(`Encoded ${language}: ${cues.length} MP3 clips.`);
}
if(only){const previous=JSON.parse(await fs.readFile(path.join(assets,'manifest.json'),'utf8')),updates=new Map(records.map(c=>[`${c.language}:${c.id}`,c]));records.splice(0,records.length,...previous.clips.map(c=>updates.get(`${c.language}:${c.id}`)??c));}
const manifest={schemaVersion:1,engine:'Windows.Media.SpeechSynthesis',speakingRate:.95,audio:{codec:'mp3',sampleRate:24000,channels:1,bitrateKbps:64,loudnessTargetLufs:-18},semanticCueCount:rowingSpeechCatalog.length,clipCount:records.length,clips:records};
await fs.writeFile(path.join(assets,'manifest.json'),JSON.stringify(manifest,null,2)+'\n');
const docs=path.join(root,'docs');await fs.mkdir(docs,{recursive:true});
const rows=rowingSpeechCatalog.map((c,i)=>`| ${i+1} | ${c.id} | ${c.category} | ${c.text.zh} | ${c.text.en} |`).join('\n');
await fs.writeFile(path.join(docs,'ROWING-VOICE-LINES.md'),`# Rowing prerecorded speech\n\n${rowingSpeechCatalog.length} semantic cues, English and Mandarin, ${records.length} independent MP3 clips. Voice: Microsoft Zira (en-US) and Microsoft Huihui (zh-CN), Windows offline synthesis, speaking rate 0.95.\n\nFiles: src/assets/audio/rowing/{en,zh}/{id}.mp3. The manifest records exact text, voice, duration, size and SHA-256. Regenerate with node scripts/generate-rowing-speech.mjs; installed Windows voices and ffmpeg/ffprobe are required. --reuse-wav skips synthesis and re-encodes the local WAV cache.\n\nPlayback is integrated into rowing preparation and static correction. It follows the selected UI language, with a shared voice toggle outside and inside correction. Checkpoint demonstrations, persistent adjustments, tracking guidance and success confirmations use prerecorded clips. Only one cue plays at a time; stale instructions are cancelled, tracking guidance is debounced, and repetitions are rate-limited. Valid adjustments take priority over ordinary missing-joint notices. Closing correction, hiding the page or switching language cancels speech. Tap the voice button if browser autoplay blocks audio. These are synthetic voices.\n\n| # | ID | Category | 中文 | English |\n| --- | --- | --- | --- | --- |\n${rows}\n`);
// A brief sampler uses real generated clips with short pauses, for easy listening.
for(const language of ['en','zh']){
 const ids=['direction-locked','checkpoint-arms-extended','follow-overlay','adjust-right-elbow-lower','adjust-left-elbow-straighten','confirmed-right-arm','aligned-visible','direction-changed'];
 const sampleInputs=ids.flatMap(id=>['-i',path.join(assets,language,id+'.mp3')]);
 const filter=ids.map((_,i)=>`[${i}:a]apad=pad_dur=0.35[a${i}]`).join(';')+';'+ids.map((_,i)=>`[a${i}]`).join('')+`concat=n=${ids.length}:v=0:a=1[out]`;
 await run('ffmpeg',['-hide_banner','-loglevel','error','-y',...sampleInputs,'-filter_complex',filter,'-map','[out]','-c:a','libmp3lame','-b:a','64k',path.join(assets,`sample-${language}.mp3`)]);
}
console.log(`Generated ${records.length} clips and 2 samplers in ${assets}`);
