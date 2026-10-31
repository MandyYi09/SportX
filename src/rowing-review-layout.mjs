export const reviewTitleHeight=40;
export function reviewDimensions(width,height){const scale=Math.min(1,960/width);return {width:Math.round(width*scale)*2,height:Math.round(height*scale)+reviewTitleHeight};}
export function paintReviewFrame(ctx,{video,overlay,expert,mirrored=false,language='en',paintPerformance=()=>{}}){
 const width=ctx.canvas.width/2,height=ctx.canvas.height-reviewTitleHeight;
 ctx.fillStyle='#101b28';ctx.fillRect(0,0,ctx.canvas.width,ctx.canvas.height);
 ctx.fillStyle='#edf5f8';ctx.font='600 20px sans-serif';ctx.textBaseline='middle';
 ctx.fillText(language==='zh'?'你的动作':'Your movement',14,20);ctx.fillText(language==='zh'?'专家动作':'Expert movement',width+14,20);
 for(const side of [0,1]){
  ctx.save();ctx.translate(side*width,reviewTitleHeight);
  if(mirrored){ctx.translate(width,0);ctx.scale(-1,1);}
  if(side===0){ctx.drawImage(video,0,0,width,height);ctx.drawImage(overlay,0,0,width,height);}else ctx.drawImage(expert,0,0,width,height);
  ctx.restore();
 }
 ctx.save();ctx.translate(0,reviewTitleHeight);paintPerformance(ctx,width);ctx.restore();
 ctx.fillStyle='#58646a';ctx.fillRect(width-1,reviewTitleHeight,2,height);
}
