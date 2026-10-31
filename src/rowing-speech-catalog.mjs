import {rowingAdjustmentCue} from './rowing-feedback.mjs';

// One semantic ID per cue; each has a separately recorded English and Mandarin file.
const line=(id,category,en,zh,priority=20)=>({id,category,priority,text:{en,zh}});
const flow=[
 line('setup-shoulders','flow','Keep both shoulders in view and hold still briefly.','请让双肩入镜，保持片刻。'),
 line('setup-ready','flow','Your direction is ready. Start correction when you are ready.','朝向已就绪。点击开始纠错。'),
 line('direction-locked','flow','Direction locked. Watch the expert first.','朝向已锁定，先看专家动作。'),
 line('follow-overlay','flow','Now match your position to the model.','现在跟随模型调整姿势。'),
 line('watch-again','flow','Watch the expert again, then try once more.','再看一次专家动作，然后重新尝试。'),
 line('direction-changed','flow','Your direction has changed. Please reposition.','朝向已变化，请重新定位。',60),
];
const checkpoints=[
 ['arms-extended','Arms extended. Reach your arms forward.','伸臂前送，手臂自然伸长。'],
 ['arms-drawn-in','Arms drawn in. Draw your hands toward your body.','屈肘收桨，将双手拉向身体。'],
 ['draw-finish','Finish position. Hold this position.','收桨结束，保持这个姿势。'],
 ['hands-away','Hands away. Send your hands forward.','双手前送，将双手向前送出。'],
 ['body-forward','Body forward. Hinge forward at the hips.','躯干前倾，从髋部向前转动。'],
 ['catch','Catch position. Match the model.','入水准备，对照模型摆好姿势。'],
 ['leg-drive','Leg drive. Extend your legs and keep your arms long.','蹬腿展开，手臂保持伸长。'],
 ['recovery','Recovery. Bring your body forward.','回桨前倾，将身体向前送。'],
].map(([id,en,zh])=>line(`checkpoint-${id}`,'checkpoint',en,zh));
const adjustments=[];
for(const [side,index]of [['left',0],['right',1]]){
 for(const [id,kind,open,direction]of [
  ['elbow-lower','height',true,'down'],['elbow-raise','height',true,'up'],
  ['elbow-straighten','elbow',true],['elbow-bend','elbow',false],
  ['knee-straighten','knee',true],['knee-bend','knee',false],
  ['arm-torso-open','trunk',true],['arm-torso-close','trunk',false],
  ['hip-open','hip',true],['hip-close','hip',false],
 ]){
  const cue=rowingAdjustmentCue({key:`${kind}-${index}`,actual:open?1:2,target:open?2:1,direction});
  adjustments.push(line(`adjust-${side}-${id}`,'adjustment',cue.en+'.',cue.zh+'。',40));
 }
}
const confirmations=[];
for(const [side,zh]of [['left','左'],['right','右']]){
 confirmations.push(line(`confirmed-${side}-arm`,'confirmation',`${side==='left'?'Left':'Right'} arm corrected.`,`${zh}臂已调整。`,50));
 confirmations.push(line(`confirmed-${side}-leg`,'confirmation',`${side==='left'?'Left':'Right'} leg corrected.`,`${zh}腿已调整。`,50));
 confirmations.push(line(`confirmed-${side}-arm-height`,'confirmation',`${side==='left'?'Left':'Right'} arm height corrected.`,`${zh}臂高度已调整。`,50));
}
confirmations.push(line('aligned','confirmation','All visible parts are well-aligned.','所有可见部位均已对齐。',50),line('aligned-visible','confirmation','All visible parts are well-aligned.','所有可见部位均已对齐。',50),line('hold','confirmation','Hold for a moment.','保持片刻。',25));
const tracking=[];
for(const [side,zh]of [['left','左'],['right','右']]){
 tracking.push(line(`framing-${side}-wrist`,'tracking',`Your ${side} wrist is out of frame. Bring it back into view.`,`${zh}腕超出画面，请让手腕回到画面内。`,15));
 for(const [joint,label]of [['shoulder','肩'],['elbow','肘'],['hip','髋'],['knee','膝'],['ankle','踝']])tracking.push(line(`tracking-${side}-${joint}`,'tracking',`Your ${side} ${joint} is not clearly visible.`,`暂时看不清${zh}${label}。`,15));
}
tracking.push(line('framing-wider','tracking','The view is too narrow. Try a wider lens or use your phone.','取景太窄，请尝试广角镜头或使用手机。',15),line('tracking-lost','tracking','Tracking is unavailable. Please move back into view.','暂时无法识别动作，请回到画面中。',15));
export const rowingSpeechCatalog=[...flow,...checkpoints,...adjustments,...confirmations,...tracking];
export const rowingSpeechById=Object.fromEntries(rowingSpeechCatalog.map(cue=>[cue.id,cue]));
