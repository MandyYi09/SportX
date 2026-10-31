export async function createRowingPoseDetector({workerFactory=()=>new Worker(new URL('./rowing-pose-worker.js',import.meta.url)),moduleUrl,delegate='CPU',timeoutMs=20000}={}){
 if(!globalThis.createImageBitmap)throw Error('Worker frame capture unavailable');
 const worker=workerFactory();let seq=0,pending=null,closed=false,busy=false,idle=Promise.resolve(),releaseIdle;
 const rejectPending=error=>{if(pending){clearTimeout(pending.timer);pending.reject(error);pending=null;}};
 try{
  await new Promise((resolve,reject)=>{
   const timer=setTimeout(()=>reject(Error('Pose worker initialization timeout')),timeoutMs);
   worker.onerror=e=>{clearTimeout(timer);reject(Error(e.message||'Pose worker unavailable'));};
   worker.onmessage=e=>{if(e.data.type==='ready'){clearTimeout(timer);resolve();}else if(e.data.type==='error'){clearTimeout(timer);reject(Error(e.data.error));}};
   try{worker.postMessage({type:'init',moduleUrl,delegate});}catch(error){clearTimeout(timer);reject(error);}
  });
 }catch(error){worker.terminate();throw error;}
 worker.onerror=e=>rejectPending(Error(e.message||'Pose worker failed'));
 worker.onmessage=e=>{
  const message=e.data;if(!pending||message.id!==pending.id)return;
  const job=pending;pending=null;clearTimeout(job.timer);
  message.type==='error'?job.reject(Error(message.error)):job.resolve(message);
 };
 return {
  backend:'worker',
  async detectForVideo(video,timestamp){
   while(busy)await idle;
   if(closed)throw Error('Pose worker closed');busy=true;idle=new Promise(resolve=>{releaseIdle=resolve;});
   const startedAt=performance.now();let capturedAt;
   let bitmap;
   try{
    const width=video.videoWidth||video.width,height=video.videoHeight||video.height,scale=Math.min(1,640/width);
    bitmap=await createImageBitmap(video,{resizeWidth:Math.round(width*scale),resizeHeight:Math.round(height*scale)});
    capturedAt=performance.now();
    if(closed){bitmap.close();throw Error('Pose worker closed');}
    const result=await new Promise((resolve,reject)=>{
     const id=++seq,timer=setTimeout(()=>rejectPending(Error('Pose inference timeout')),10000);
     pending={id,resolve,reject,timer};
     try{worker.postMessage({type:'detect',id,bitmap,timestamp},[bitmap]);bitmap=null;}catch(error){rejectPending(error);}
    });
    return {...result,captureMs:capturedAt-startedAt,roundTripMs:performance.now()-startedAt};
   }finally{bitmap?.close();busy=false;releaseIdle?.();}
  },
  close(){closed=true;rejectPending(Error('Pose worker closed'));worker.terminate();},
 };
}
