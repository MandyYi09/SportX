// Classic worker: MediaPipe's WASM loader can use importScripts here.
let detector=null;
self.onmessage=async event=>{
 const message=event.data;
 if(message.type==='init'){
  try{
   const {FilesetResolver,PoseLandmarker}=await import(message.moduleUrl||'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.21/vision_bundle.mjs');
   const files=await FilesetResolver.forVisionTasks('https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.21/wasm');
   const options={canvas:new OffscreenCanvas(256,256),baseOptions:{modelAssetPath:'https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/1/pose_landmarker_lite.task',delegate:message.delegate??'CPU'},runningMode:'VIDEO',numPoses:1,minPoseDetectionConfidence:.5,minPosePresenceConfidence:.5,minTrackingConfidence:.5,outputSegmentationMasks:false};
   detector=await PoseLandmarker.createFromOptions(files,options);
   self.postMessage({type:'ready',delegate:options.baseOptions.delegate});
  }catch(error){self.postMessage({type:'error',error:error.message});}
  return;
 }
 if(message.type==='detect'){
  const start=performance.now();
  try{
   const result=detector.detectForVideo(message.bitmap,message.timestamp);
   self.postMessage({type:'result',id:message.id,landmarks:result.landmarks,worldLandmarks:result.worldLandmarks,inferenceMs:performance.now()-start});
  }catch(error){self.postMessage({type:'error',id:message.id,error:error.message});}
  finally{message.bitmap?.close();}
 }
};
