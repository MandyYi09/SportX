import {motionClips} from './motion-catalog.mjs';
import {sampleMotion} from './motion-rig.mjs';

export const categoryLabels = {
  stretch: 'Stretch', yoga: 'Yoga', rowing: 'Rowing', tennis: 'Tennis', gentle: 'Gentle movement', clay: 'Clay Shooting',
};
export const practiceModes = {
 clay: {title:'Clay shooting · movement demonstrations'},
 rowing: {title:'Sculling · three stroke studies'},
 tennis: {title:'Tennis · forehand & backhand'},
 gentle: {title:'Gentle movement · seated upper body', note:'A seated starting point for older adults. Use a stable chair without wheels and keep your feet supported. Choose a comfortable range; the camera compares upper-body shape only.',source:'https://www.nhs.uk/live-well/exercise/sitting-exercises/',sourceLabel:'Seated exercise guidance · NHS'},
};
const descriptions = {
 backswing:['Watch the preparation and turn during the backswing.','观察准备姿态与转体引拍动作。'],
 drop:['Inspect the transition from backswing to the lowered racket.','观察从引拍到降拍的连续过渡。'],
 swing:['Inspect the forward swing, follow-through and return.','观察向前挥拍、随挥收拍及复位。'],
 full:['Watch the complete movement as one continuous sequence.','连续播放这一次完整动作。'],
};
const cues=['Play slowly or drag the timeline to inspect a moment.','Drag to inspect the movement from different angles; scroll to zoom.','Select a step to watch its independent 3D demonstration.'];
const cuesZh=['可慢放或拖动时间轴，观察某个瞬间。','拖拽可从不同角度观察身体与器械，滚轮可缩放。','选择任一分解动作，观看独立的三维演示。'];
const gentle = {type:'gentle',area:'SEATED UPPER BODY',icon:'⌑',tracking:'upper',sequence:'gentle',level:'Seated',hold:10};
export const practicePoses = [
 ...motionClips.map(clip=>({
  ...clip, motion:clip.id, area:clip.type==='tennis'?(clip.track==='forehand'?'FOREHAND':'TWO-HANDED BACKHAND'):'MOVEMENT DEMONSTRATION',
  icon:clip.type==='tennis'?'◉':clip.type==='rowing'?'↔':'◌',
  cameraView:clip.type==='rowing'?'side':'front',demoOnly:true,asymmetric:clip.type==='tennis',level:'3D demonstration',
  groupTitle:practiceModes[clip.type].title,
  description:descriptions[clip.phase][0],cues:[...cues],
  zh:[clip.zhName,descriptions[clip.phase][1],[...cuesZh]],
 })),
  { ...gentle, id: 'gentle-reset', name: 'Seated reset', description: 'Settle into your chair before moving your arms.', cues: ['Sit securely on a stable chair, with feet supported.', 'Rest your arms beside you and relax your shoulders.', 'Breathe normally. Stay in a position that feels comfortable.'] },
  { ...gentle, id: 'gentle-open', name: 'Easy chest opening', description: 'Open your arms a little below shoulder level.', cues: ['Keep your feet supported and sit comfortably upright.', 'Open your arms gently to the sides without pulling them back.', 'Use a small range; return to rest when you want to.'] },
  { ...gentle, id: 'gentle-bend', name: 'Gentle elbow bend', description: 'Bend and lower your forearms without weights.', cues: ['Let your upper arms stay near your sides.', 'Slowly bend your elbows, then lower your hands again.', 'Relax your shoulders and use a comfortable range.'] },
  { ...gentle, id: 'gentle-lift', name: 'Easy arm lift', description: 'Lift your arms partway to the sides, then lower them.', cues: ['Start with your arms resting by your sides.', 'Lift only as far as comfortable, keeping elbows soft.', 'Lower slowly. You do not need to reach the model’s height.'] },
];
const seat = [[-.23,1.4,0],[.23,1.4,0],[-.31,1.01,0],[.31,1.01,0],[-.36,.64,0],[.36,.64,0],[-.16,.75,0],[.16,.75,0],[-.24,.68,.45],[.24,.68,.45],[-.24,.12,.45],[.24,.12,.45]];
const frame = (base, changes) => base.map((p,i) => [...(changes[i] || p)]);
export const practiceReferences = {
 ...Object.fromEntries(motionClips.map(clip=>[clip.id,sampleMotion(clip.id,0).coords])),
  'gentle-reset': frame(seat, {}),
  'gentle-open': frame(seat, {2:[-.58,1.22,0],3:[.58,1.22,0],4:[-.92,1.04,0],5:[.92,1.04,0]}),
  'gentle-bend': frame(seat, {4:[-.42,1.34,.12],5:[.42,1.34,.12]}),
  'gentle-lift': frame(seat, {2:[-.57,1.24,0],3:[.57,1.24,0],4:[-.88,1.47,0],5:[.88,1.47,0]}),
};
export const sequenceFor = id => {
 const pose = practicePoses.find(p => p.id === id);
 return pose ? practicePoses.filter(p => p.sequence === pose.sequence) : [];
};
