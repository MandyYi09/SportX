// Seconds on the BVH timeline AFTER its initialization frame is removed.
// These are capture-specific observation windows, not MP4 timestamps or impact events.
export const captureTracks=['rowing-arms','rowing-half','rowing-full','tennis-forehand','tennis-backhand','clay-full','clay-ready','clay-mount','clay-lower'];
const window=(track,start=0,end=null)=>({track,start,end});
export const captureWindows={
 'rowing-arms':window('rowing-arms'),
 'rowing-half':window('rowing-half'),
 'rowing-full':window('rowing-full'),
 'tennis-forehand-full':window('tennis-forehand',1,6),
 'tennis-forehand-backswing':window('tennis-forehand',1,3.1),
 'tennis-forehand-drop':window('tennis-forehand',3.1,3.6),
 'tennis-forehand-swing':window('tennis-forehand',3.6,6),
 'tennis-backhand-full':window('tennis-backhand',.75,6.8),
 'tennis-backhand-backswing':window('tennis-backhand',.75,3.9),
 'tennis-backhand-drop':window('tennis-backhand',3.9,4.4),
 'tennis-backhand-swing':window('tennis-backhand',4.4,6.8),
 'clay-full':window('clay-full'),
 'clay-ready':window('clay-ready',.5,4.75),
 'clay-mount':window('clay-mount',2.4,7.4),
 // Legacy asset id retained; study 4 is the complete take, not a lowering drill.
 'clay-lower':window('clay-lower'),
};
// User-supplied reference: camera second 5 is already mounted.
// BVH ~4.5 is an estimated event correspondence, not shared video timecode.
export const captureReferences={
 'clay-lower':{cameraSource:'sheji_04_010（相机）.MP4',cameraMountedAt:5,captureMountedAt:4.5},
};
