import {motionClips} from './motion-catalog.mjs';
// Source intervals are shared by UI and sampling. These are approximate video/BVH
// correspondences; independent exports do not supply a shared timecode.
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
export const captureWindows=Object.fromEntries(motionClips.map(clip=>[clip.id,{
 track:tennisTracks[clip.id]??clip.id,start:clip.sourceStart,end:clip.sourceEnd,
}]));
export const captureTracks=[...new Set(Object.values(captureWindows).map(window=>window.track))];
export const captureReferences={
 'clay-lower':{cameraSource:'sheji_04_010（相机）.MP4',cameraMountedAt:5,captureMountedAt:4.5},
};
