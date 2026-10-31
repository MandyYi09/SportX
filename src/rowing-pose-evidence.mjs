// These are conservative evidence weights, not calibrated probabilities.
export function jointEvidenceWeight(point){
 if(!point||!Number.isFinite(point.x)||!Number.isFinite(point.y)||!Number.isFinite(point.visibility)||point.visibility<.55||point.x<.015||point.x>.985||point.y<.015||point.y>.985)return 0;
 if(!point.inferred)return 1;
 if(!Number.isFinite(point.inferenceAge)||point.inferenceAge<0||point.inferenceAge>450||!Number.isFinite(point.inferenceConfidence)||point.inferenceConfidence<.25)return 0;
 return Math.min(.75,point.inferenceConfidence);
}
export function metricEvidenceWeight(metric){
 if(metric.guidanceOnly)return 0;
 if(!metric.estimated)return 1;
 return Number.isFinite(metric.inferenceWeight)&&metric.inferenceWeight>=.25?Math.min(.75,metric.inferenceWeight):0;
}
