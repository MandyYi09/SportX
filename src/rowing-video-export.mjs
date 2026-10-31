export function preferredExportMime(supported){
 // Let the browser choose a suitable H.264 level for the actual canvas size.
 return ['video/mp4','video/mp4;codecs=avc1.42001f','video/mp4;codecs=avc1.420028','video/webm;codecs=vp8','video/webm'].find(supported)??null;
}
export function exportPercent(time,start,end){return Math.max(0,Math.min(99,Math.floor((time-start)/Math.max(.001,end-start)*99)));}
