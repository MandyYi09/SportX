// Offline video encoding: source time and output timestamps never use wall-clock time.
const bytes=(...items)=>{const arrays=items.map(x=>typeof x==='string'?new TextEncoder().encode(x):x);const out=new Uint8Array(arrays.reduce((n,a)=>n+a.length,0));let offset=0;for(const a of arrays){out.set(a,offset);offset+=a.length;}return out;};
const u32=n=>new Uint8Array([(n>>>24)&255,(n>>>16)&255,(n>>>8)&255,n&255]);
const u16=n=>new Uint8Array([(n>>>8)&255,n&255]);
const zero=n=>new Uint8Array(n);
const box=(type,...data)=>{const body=bytes(...data);return bytes(u32(body.length+8),type,body);};
const full=(type,flags,...data)=>box(type,u32(flags),...data);
const matrix=bytes(u32(0x10000),u32(0),u32(0),u32(0),u32(0x10000),u32(0),u32(0),u32(0),u32(0x40000000));
export function muxAvcMp4(samples,description,width,height){
 if(!samples.length||!description?.byteLength)throw Error('No encoded AVC frames');
 const timescale=1000000,duration=samples.reduce((n,s)=>n+s.duration,0);
 const ftyp=box('ftyp','isom',u32(512),'isomiso2avc1mp41');
 const mdat=box('mdat',...samples.map(s=>s.data));
 const avc1=box('avc1',zero(6),u16(1),zero(16),u16(width),u16(height),u32(0x480000),u32(0x480000),u32(0),u16(1),zero(32),u16(24),u16(65535),box('avcC',new Uint8Array(description)));
 const runs=[];for(const s of samples){const last=runs.at(-1);if(last?.duration===s.duration)last.count++;else runs.push({count:1,duration:s.duration});}
 const stbl=box('stbl',full('stsd',0,u32(1),avc1),full('stts',0,u32(runs.length),...runs.map(r=>bytes(u32(r.count),u32(r.duration)))),full('stsc',0,u32(1),u32(1),u32(samples.length),u32(1)),full('stsz',0,u32(0),u32(samples.length),...samples.map(s=>u32(s.data.length))),full('stco',0,u32(1),u32(ftyp.length+8)),full('stss',0,u32(samples.filter(s=>s.key).length),...samples.flatMap((s,i)=>s.key?[u32(i+1)]:[])));
 const mdia=box('mdia',full('mdhd',0,u32(0),u32(0),u32(timescale),u32(duration),u16(0x55c4),u16(0)),full('hdlr',0,u32(0),'vide',zero(12),'Video\0'),box('minf',full('vmhd',1,zero(8)),box('dinf',full('dref',0,u32(1),full('url ',1))),stbl));
 const trak=box('trak',full('tkhd',7,u32(0),u32(0),u32(1),u32(0),u32(Math.round(duration/1000)),zero(8),zero(8),matrix,u32(width*65536),u32(height*65536)),mdia);
 const moov=box('moov',full('mvhd',0,u32(0),u32(0),u32(1000),u32(Math.round(duration/1000)),u32(65536),u16(256),zero(10),matrix,zero(24),u32(2)),trak);
 return new Blob([ftyp,mdat,moov],{type:'video/mp4'});
}
export function exportFramePlan(start,end,{fps=25,cardSeconds=2.5}={}){
 const clip=Math.max(0,end-start),count=Math.ceil((clip+cardSeconds)*fps);
 return Array.from({length:count},(_,i)=>({timestamp:Math.round(i*1000000/fps),duration:Math.round((i+1)*1000000/fps)-Math.round(i*1000000/fps),sourceTime:start+Math.min(clip,i/fps),card:i/fps>=clip}));
}
function ebmlSize(n){for(let length=1;length<=7;length++)if(n<2**(7*length)-1){const out=new Uint8Array(length);let value=n;for(let i=length-1;i>=0;i--){out[i]=value%256;value=Math.floor(value/256);}out[0]|=1<<(8-length);return out;}throw Error('Video too large');}
function ebml(id,...data){const body=bytes(...data),hex=id.toString(16).padStart(id>255?Math.ceil(id.toString(16).length/2)*2:2,'0');return bytes(new Uint8Array(hex.match(/../g).map(x=>parseInt(x,16))),ebmlSize(body.length),body);}
const unsigned=n=>{const a=[];do{a.unshift(n%256);n=Math.floor(n/256);}while(n);return new Uint8Array(a);};
export function muxVp8Webm(samples,width,height){
 const number=(id,n)=>ebml(id,unsigned(n)),text=(id,s)=>ebml(id,new TextEncoder().encode(s));
 const duration=new Uint8Array(8);new DataView(duration.buffer).setFloat64(0,samples.reduce((n,s)=>n+s.duration,0)/1000);
 const header=ebml(0x1a45dfa3,number(0x4286,1),number(0x42f7,1),number(0x42f2,4),number(0x42f3,8),text(0x4282,'webm'),number(0x4287,4),number(0x4285,2));
 const info=ebml(0x1549a966,number(0x2ad7b1,1000000),ebml(0x4489,duration),text(0x4d80,'SportX'),text(0x5741,'SportX'));
 const tracks=ebml(0x1654ae6b,ebml(0xae,number(0xd7,1),number(0x73c5,1),number(0x83,1),text(0x86,'V_VP8'),number(0x23e383,40000000),ebml(0xe0,number(0xb0,width),number(0xba,height))));
 const clusters=[];let base=-Infinity,blocks=[];
 for(const s of samples){const ms=Math.round(s.timestamp/1000);if(ms-base>=1000){if(blocks.length)clusters.push(ebml(0x1f43b675,number(0xe7,base),...blocks));base=ms;blocks=[];}blocks.push(ebml(0xa3,new Uint8Array([0x81,((ms-base)>>8)&255,(ms-base)&255,s.key?0x80:0]),s.data));}
 if(blocks.length)clusters.push(ebml(0x1f43b675,number(0xe7,base),...blocks));
 return new Blob([header,ebml(0x18538067,info,tracks,...clusters)],{type:'video/webm'});
}
export async function seekDecodedFrame(video,time){
 video.pause();
 if(Math.abs(video.currentTime-time)<.00001&&!video.seeking&&video.readyState>=2)return;
 await new Promise((resolve,reject)=>{
  const timer=setTimeout(()=>finish(Error('Video frame seek timeout')),10000);
  function finish(error){clearTimeout(timer);video.removeEventListener('seeked',done);video.removeEventListener('error',failed);error?reject(error):resolve();}
  const done=()=>finish(),failed=()=>finish(Error('Video decoding failed'));
  video.addEventListener('seeked',done);video.addEventListener('error',failed);video.currentTime=time;
 });
}
export async function encodeFrameVideo({canvas,plan,render,progress,active,mime}){
 let config;
 if(globalThis.VideoEncoder)try{
  const base={width:canvas.width,height:canvas.height,bitrate:4000000,framerate:25,latencyMode:'realtime'};
  const candidates=mime?.includes('webm')?[{...base,codec:'vp8'}]:[{...base,codec:'avc1.420028',avc:{format:'avc'}},{...base,codec:'vp8'}];
  for(const candidate of candidates)if((await VideoEncoder.isConfigSupported(candidate)).supported){config=candidate;break;}
 }catch{}
 if(config){
  const samples=[];let description,error;
  const encoder=new VideoEncoder({output(chunk,meta){const data=new Uint8Array(chunk.byteLength);chunk.copyTo(data);samples.push({data,duration:chunk.duration??40000,key:chunk.type==='key',timestamp:chunk.timestamp});if(meta.decoderConfig?.description)description=meta.decoderConfig.description.slice(0);},error:e=>{error=e;}});
  try{
   encoder.configure(config);
   for(let i=0;i<plan.length;i++){
    if(!active())throw Error('Export cancelled');if(error)throw error;
    const frame=plan[i];await render(frame);
    const image=new VideoFrame(canvas,{timestamp:frame.timestamp,duration:frame.duration});
    try{encoder.encode(image,{keyFrame:i%50===0});}finally{image.close();}
    // Bound GPU/encoder work and surface asynchronous errors before rendering more.
    if(encoder.encodeQueueSize>=4)await encoder.flush();
    progress((i+1)/plan.length*99);
   }
   await encoder.flush();if(error)throw error;
   if(samples.length!==plan.length)throw Error('Encoder dropped video frames');
   if(samples.some((s,i)=>s.timestamp!==plan[i].timestamp))throw Error('Encoder reordered video frames');
   // Some encoders omit chunk.duration; the frame plan is authoritative.
   samples.forEach((s,i)=>{s.duration=plan[i].duration;});
   return config.codec==='vp8'?muxVp8Webm(samples,canvas.width,canvas.height):muxAvcMp4(samples,description,canvas.width,canvas.height);
  }finally{if(encoder.state!=='closed')encoder.close();}
 }
 throw Error('This browser does not support frame-controlled video encoding');
}
