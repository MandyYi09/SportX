import {motionClips} from './motion-catalog.mjs';
// Reviewed action boundaries on the BVH timeline after initialization removal.
// Video ranges in motion-catalog are search hints, not playback boundaries.
// Review evidence and onset/settling criteria are in LOCAL-MOCAP.md.
const tennisTracks={
 "tennis-forehand-backswing":"tennis-forehand",
 "tennis-forehand-drop":"tennis-forehand",
 "tennis-forehand-swing":"tennis-forehand",
 "tennis-backhand-backswing":"tennis-backhand",
 "tennis-backhand-drop":"tennis-backhand",
 "tennis-backhand-swing":"tennis-backhand",
 "tennis-combined-full": "tennis-combined",
 "tennis-forehand-backswing-study": "tennis-backswing",
 "tennis-forehand-full": "tennis-forehand",
 "tennis-backhand-full": "tennis-backhand",
 "tennis-forehand-ready": "tennis-ready",
 "tennis-forehand-drop-study": "tennis-drop",
 "tennis-backhand-alternate": "tennis-backhand-alternate"
};
const reviewedWindows={
 "clay-full": [
  0.65,
  20.05
 ],
 "clay-ready": [
  0.55,
  4.35
 ],
 "clay-mount": [
  1.2,
  4.8
 ],
 "clay-lower": [
  2.05,
  13.65
 ],
 "rowing-arms": [
  1.6,
  5.65
 ],
 "rowing-half": [
  0.65,
  7.25
 ],
 "rowing-full": [
  0.5,
  8.05
 ],
 "tennis-combined-full": [
  0.25,
  7.1
 ],
 "tennis-forehand-backswing-study": [
  0.45,
  2.85
 ],
 "tennis-forehand-full": [
  0.8,
  5.65
 ],
 "tennis-backhand-full": [
  1.1,
  7.15
 ],
 "tennis-forehand-ready": [
  0.55,
  4.65
 ],
 "tennis-forehand-drop-study": [
  2.6,
  3.65
 ],
 "tennis-backhand-alternate": [
  0.8,
  6.65
 ],
 "tennis-forehand-backswing": [
  0.8,
  3.1
 ],
 "tennis-forehand-drop": [
  3.1,
  3.6
 ],
 "tennis-forehand-swing": [
  3.6,
  5.65
 ],
 "tennis-backhand-backswing": [
  1.1,
  3.9
 ],
 "tennis-backhand-drop": [
  3.9,
  4.4
 ],
 "tennis-backhand-swing": [
  4.4,
  7.15
 ]
};
export const captureWindows=Object.fromEntries(motionClips.map(clip=>{
 const [start,end]=reviewedWindows[clip.id];
 return [clip.id,{track:tennisTracks[clip.id]??clip.id,start,end}];
}));
export const captureTracks=[...new Set(Object.values(captureWindows).map(window=>window.track))];
export const captureReferences={
 'clay-lower':{cameraSource:'sheji_04_010（相机）.MP4',cameraMountedAt:5,captureMountedAt:4.5},
};
