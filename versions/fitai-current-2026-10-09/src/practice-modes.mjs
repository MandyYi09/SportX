export const categoryLabels = {
  stretch: 'Stretch', yoga: 'Yoga', rowing: 'Rowing', tennis: 'Tennis', gentle: 'Gentle movement', clay: 'Clay Shooting',
};

export const practiceModes = {
  clay: {
    title: 'Clay Shooting · empty-hand movement',
    note: 'The figure carries a simplified sporting shotgun prop with visible hands. Follow the mobility study empty-handed. The model is a visual illustration, not a validated holding position or instruction in aiming or firing.',
  },
  rowing: {
    title: 'Sculling · on-water stroke',
    note: 'An illustrative two-oar sculling sequence. The oars and blades show the two-sided movement, but their angle and water depth are not measured or validated. Ask your coach to check the hand path and blade work against your own footage.',
    source: 'https://www.britishrowing.org/knowledge/rower-development/british-rowing-technique/water-rowing-technique/',
    sourceLabel: 'On-water technique · British Rowing',
  },
  tennis: {
    title: 'Tennis · forehand walkthrough',
    note: 'An illustrative forehand sequence for shadow practice. Use Switch side for the opposite hand. This guide does not assess ball contact, racket face, speed or technique quality.',
    source: 'https://www.usta.com/en/home/improve/tips-and-instruction/national/improve-your-tennis-game--get-your-forehand-flowing.html',
    sourceLabel: 'Forehand background · USTA',
  },
  gentle: {
    title: 'Gentle movement · seated upper body',
    note: 'A seated starting point for older adults. Use a stable chair without wheels and keep your feet supported. Choose a comfortable range; the camera compares upper-body shape only.',
    source: 'https://www.nhs.uk/live-well/exercise/sitting-exercises/',
    sourceLabel: 'Seated exercise guidance · NHS',
  },
};

const rowing = { type: 'rowing', area: 'TWO-OAR SCULLING', icon: '↔', cameraView: 'side', demoOnly: true, sequence: 'rowing', level: 'Slow study' };
const tennis = { type: 'tennis', area: 'SHADOW FOREHAND', icon: '◉', demoOnly: true, sequence: 'tennis', asymmetric: true, level: 'No ball needed' };
const gentle = { type: 'gentle', area: 'SEATED UPPER BODY', icon: '⌑', tracking: 'upper', sequence: 'gentle', level: 'Seated', hold: 10 };
const clay = { type: 'clay', area: 'EMPTY-HAND MOBILITY', icon: '◌', demoOnly: true, sequence: 'clay', level: 'No equipment', asymmetric: true };

export const practicePoses = [
  { ...clay, id: 'clay-stand', name: 'Settle · relaxed standing', description: 'Start an empty-hand movement study from a comfortable stance.', cues: ['Leave your hands empty and clear space around you.', 'Stand comfortably with soft knees and relaxed shoulders.', 'Breathe naturally before moving.'] },
  { ...clay, id: 'clay-arms', name: 'Lift · easy arm movement', description: 'Explore a gentle arm lift without equipment.', cues: ['Bend your elbows and lift your empty hands a little in front of you.', 'Keep your shoulders relaxed and use a comfortable height.', 'This is a mobility illustration, not a firearm-holding position.'] },
  { ...clay, id: 'clay-turn', name: 'Turn · small torso rotation', description: 'Observe a small, unforced torso turn.', cues: ['Keep your hands empty and turn only a little.', 'Move slowly within a comfortable range; do not force your back.', 'Use Switch side to view the other direction.'] },
  { ...clay, id: 'clay-reset', name: 'Reset · lower and relax', description: 'Return to a relaxed standing position.', cues: ['Return gently toward the center.', 'Lower your arms and let your shoulders relax.', 'Pause before repeating; stop if anything feels uncomfortable.'] },
  { ...rowing, id: 'rowing-catch', name: 'Catch · blade entry', description: 'See the two-oar starting shape as the blades enter the water.', cues: ['Explore the model from the ¾ view to see both oars.', 'Reach forward from the hips with long arms and relaxed shoulders.', 'Blade placement is illustrative; use your coach’s reference for the actual entry.'] },
  { ...rowing, id: 'rowing-drive', wristStudy: true, name: 'Drive · hands draw in', description: 'Inspect the hand and forearm line as both handles draw toward the body.', cues: ['On the water, connect with the legs before drawing the two handles toward you.', 'Notice whether your hands travel along the boat or rise as you pull.', 'A body camera cannot confirm blade depth or wrist angle; review both with your coach.'] },
  { ...rowing, id: 'rowing-finish', wristStudy: true, name: 'Finish · end of draw', description: 'Pause at the end of the pull, before releasing the blades. Inspect the line from forearm through wrist to hand.', cues: ['Keep a comfortable, small backward lean as the handles come toward the body.', 'Use the enlarged wrist view to compare an aligned hand, an arched wrist and a raised forearm.', 'Blade release and feathering are separate movements; this wrist study does not illustrate them.'] },
  { ...rowing, id: 'rowing-recovery', name: 'Recovery · hands away', description: 'Look at the hands-away phase after each stroke.', cues: ['Send both handles away before the knees rise into their path.', 'Let the body turn forward from the hips before sliding toward the next catch.', 'Check with your coach whether your forearms lift during this transition.'] },
  { ...tennis, id: 'tennis-ready', name: 'Ready position', description: 'Start a slow forehand walkthrough from a balanced stance.', cues: ['Clear enough space for your arms; a racket is optional.', 'Stand comfortably with soft knees and hands in front.', 'Begin with a small, unforced shadow movement.'] },
  { ...tennis, id: 'tennis-turn', name: 'Unit turn', description: 'Turn the torso and hips together to prepare the forehand.', cues: ['Turn toward your racket side as one unit.', 'Let your free hand help guide the preparation.', 'Rotate the model to inspect the turn; avoid forcing your back or shoulder.'] },
  { ...tennis, id: 'tennis-forward', name: 'Forward swing', description: 'Explore the forward part of a slow shadow swing.', cues: ['Allow the body to turn back toward the imagined ball.', 'Move the hitting arm forward in a comfortable arc.', 'Keep this slow: the reference does not show exact contact or racket-face control.'] },
  { ...tennis, id: 'tennis-follow', name: 'Follow-through', description: 'Let the arm continue across the body, then reset.', cues: ['Allow the hitting arm to continue across the torso.', 'Finish in balance without forcing the arm around your neck.', 'Return to Ready position before another relaxed repetition.'] },
  { ...gentle, id: 'gentle-reset', name: 'Seated reset', description: 'Settle into your chair before moving your arms.', cues: ['Sit securely on a stable chair, with feet supported.', 'Rest your arms beside you and relax your shoulders.', 'Breathe normally. Stay in a position that feels comfortable.'] },
  { ...gentle, id: 'gentle-open', name: 'Easy chest opening', description: 'Open your arms a little below shoulder level.', cues: ['Keep your feet supported and sit comfortably upright.', 'Open your arms gently to the sides without pulling them back.', 'Use a small range; return to rest when you want to.'] },
  { ...gentle, id: 'gentle-bend', name: 'Gentle elbow bend', description: 'Bend and lower your forearms without weights.', cues: ['Let your upper arms stay near your sides.', 'Slowly bend your elbows, then lower your hands again.', 'Relax your shoulders and use a comfortable range.'] },
  { ...gentle, id: 'gentle-lift', name: 'Easy arm lift', description: 'Lift your arms partway to the sides, then lower them.', cues: ['Start with your arms resting by your sides.', 'Lift only as far as comfortable, keeping elbows soft.', 'Lower slowly. You do not need to reach the model’s height.'] },
];

// Authored illustrative keyframes, not motion-capture data or validated angle targets.
const sideFrame = points => points.flatMap(([x, y]) => [[x, y, -.16], [x, y, .16]]);
const seat = [[-.23,1.4,0],[.23,1.4,0],[-.31,1.01,0],[.31,1.01,0],[-.36,.64,0],[.36,.64,0],[-.16,.75,0],[.16,.75,0],[-.24,.68,.45],[.24,.68,.45],[-.24,.12,.45],[.24,.12,.45]];
const standing = [[-.23,1.63,0],[.23,1.63,0],[-.34,1.25,.12],[.34,1.25,.12],[-.12,1.37,.44],[.12,1.37,.44],[-.16,.98,0],[.16,.98,0],[-.3,.55,.09],[.3,.55,.09],[-.38,.12,0],[.38,.12,0]];
const frame = (base, changes) => base.map((p,i) => [...(changes[i] || p)]);
export const practiceReferences = {
  'clay-stand': frame(standing, {2:[-.31,1.25,0],3:[.31,1.25,0],4:[-.36,.88,0],5:[.36,.88,0]}),
  'clay-arms': frame(standing, {2:[-.34,1.29,.08],3:[.34,1.29,.08],4:[-.29,1.48,.39],5:[.29,1.48,.39]}),
  'clay-turn': frame(standing, {0:[-.21,1.63,.08],1:[.21,1.63,-.08],2:[-.28,1.29,.2],3:[.35,1.29,-.04],4:[-.11,1.48,.47],5:[.44,1.48,.25],6:[-.15,.98,.03],7:[.15,.98,-.03]}),
  'clay-reset': frame(standing, {2:[-.31,1.25,.04],3:[.31,1.25,.04],4:[-.37,.89,.1],5:[.37,.89,.1]}),
  'rowing-catch': sideFrame([[-.22,1.32],[-.6,1.22],[-.98,1.12],[0,.71],[-.62,.65],[-.68,.12]]),
  'rowing-drive': sideFrame([[.12,1.38],[-.23,1.18],[-.59,.99],[.19,.72],[-.28,.43],[-.68,.12]]),
  'rowing-finish': sideFrame([[.46,1.37],[.61,1.01],[.23,.99],[.25,.75],[-.22,.43],[-.68,.12]]),
  'rowing-recovery': sideFrame([[.03,1.37],[-.33,1.19],[-.7,1.02],[.25,.75],[-.22,.43],[-.68,.12]]),
  'tennis-ready': frame(standing, {}),
  'tennis-turn': frame(standing, {0:[-.13,1.63,.2],1:[.13,1.63,-.2],2:[.2,1.4,.35],3:[.42,1.32,-.28],4:[.48,1.38,.12],5:[.55,1.45,-.55],6:[-.1,.98,.12],7:[.1,.98,-.12]}),
  'tennis-forward': frame(standing, {2:[-.42,1.32,.02],3:[.49,1.31,.26],4:[-.61,1.48,.1],5:[.66,1.24,.63]}),
  'tennis-follow': frame(standing, {0:[-.19,1.63,-.12],1:[.19,1.63,.12],2:[-.45,1.3,.08],3:[.06,1.47,.47],4:[-.4,1.62,.27],5:[-.27,1.83,.3]}),
  'gentle-reset': frame(seat, {}),
  'gentle-open': frame(seat, {2:[-.58,1.22,0],3:[.58,1.22,0],4:[-.92,1.04,0],5:[.92,1.04,0]}),
  'gentle-bend': frame(seat, {4:[-.42,1.34,.12],5:[.42,1.34,.12]}),
  'gentle-lift': frame(seat, {2:[-.57,1.24,0],3:[.57,1.24,0],4:[-.88,1.47,0],5:[.88,1.47,0]}),
};

export const sequenceFor = id => {
  const pose = practicePoses.find(p => p.id === id);
  return pose ? practicePoses.filter(p => p.sequence === pose.sequence) : [];
};
