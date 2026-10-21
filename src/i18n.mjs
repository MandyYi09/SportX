let language = 'en';

export const getLanguage = () => language;
export function setLanguage(value) {
  language = value === 'zh' ? 'zh' : 'en';
  document.documentElement.lang = language === 'zh' ? 'zh-CN' : 'en';
}

// English remains the source copy. These strings are only used when Chinese is selected.
const zh = {
  'Voice · On':'语音 · 开','Voice · Off':'语音 · 关','Tap for voice':'点此启用语音','Prerecorded synthetic voice · follows selected language':'预制合成语音 · 跟随所选语言',
  'Mirror · On':'镜像 · 开','Mirror · Off':'镜像 · 关','Mirror camera, expert and joints together':'同步镜像相机、专家模型与关节点',
  'Static pose correction':'静态姿态纠错','Start correction':'开始纠错','The expert follows your horizontal direction.':'专家模型正在跟随你的水平朝向。',
  'Expert demonstration':'专家示范', 'Expert demonstration · Backswing':'专家示范 · 引拍',
  'Expert demonstration · Racket drop':'专家示范 · 降拍', 'Expert demonstration · Swing & follow-through':'专家示范 · 挥拍与随挥',
  'Model gender':'模型性别','Model':'模型','Male':'男版','Female':'女版',
  'Drag to rotate':'拖拽旋转','scroll to zoom':'滚轮缩放',
  'Movement demonstration could not load. Please reload.':'动作示范加载失败，请刷新页面。',
  '↔ Side-on camera · full body':'↔ 侧面相机 · 全身入镜',
  '↔ Front camera · upper body':'↔ 正面相机 · 上半身入镜',
  'Drag to rotate, drag vertically to tilt, scroll to zoom, double-click to reset the view':'拖拽旋转，上下拖拽调整俯仰，滚轮缩放，双击恢复默认视角',
  'Camera lens': '摄像头镜头', 'Camera zoom': '摄像头变焦',
  'Flip front / back camera': '翻转相机：切换前后置',
  'Next lens on this side': '切换当前方向的镜头',
  'Zoom could not be confirmed. Try each rear lens to find the widest view.': '无法确认变焦是否生效。请逐个尝试后置镜头，选择取景最广的一个。',
  'Starts at the widest supported zoom. Choose another lens for a wider view.': '默认使用支持的最广取景。可选择其他镜头，尝试更广的范围。',
  'Zoom is unavailable for this camera. Try another lens for a wider view.': '此摄像头不支持变焦调节，可尝试其他镜头扩大取景范围。',
  'Rotate': '旋转', 'Reset view': '恢复默认视角',
  'Static camera · Off': '摄像头静止 · 关', 'Static camera · On': '摄像头静止 · 开',
  'Switch camera': '切换摄像头',
  'Drag to rotate · scroll to zoom': '拖拽旋转 · 滚轮缩放',
  'Movement library': '动作库', 'Camera preview': '相机预览', 'Camera on': '相机已开启', 'Camera off': '相机未开启',
  'Level': '难度', 'Practice time': '练习时间', 'Movement cues': '动作要点', 'Playback controls': '播放操作',
  'Practice notes': '练习说明', 'HOLD TIMER': '保持计时', 'PRACTICE TIMER': '练习计时',
  'How to use fitAI': '使用说明', 'Start practice': '开始练习',
  'Mobility': '拉伸与舒缓', 'Choose your mode': '选择练习模式', 'Mobility mode': '拉伸与舒缓模式', 'Gentle mode': '舒缓模式',
  'Standing and seated stretches for your shoulders, torso and legs.': '通过站姿和坐姿拉伸，伸展肩部、躯干和腿部。',
  'Small seated movements for your arms and shoulders, with chair support.': '借助椅子支撑，以小幅坐姿动作活动手臂和肩膀。',
  "Clay Shooting": "飞碟射击", "CLAY SHOOTING": "飞碟射击", 'EMPTY-HAND MOBILITY': '空手活动', 'No equipment': '无需器械',
  'Clay Shooting · empty-hand movement': '飞碟射击 · 空手动作观察',
  'fitAI — Movement practice prototype': 'fitAI — 动作练习原型',
  'Language': '语言',
  'An interactive movement practice prototype with 3D demonstrations and optional on-device pose feedback.': '互动动作练习原型，提供 3D 示范和可选的设备端姿态反馈。',
  'Your practice': '你的练习', 'How it works ↗': '使用说明 ↗',
  'Movement category': '动作类别', 'All': '全部', 'Stretches': '拉伸', 'Yoga': '瑜伽', 'Rowing': '双桨赛艇', 'Tennis': '网球', 'Gentle': '舒缓活动',
  'Ease into it.': '慢慢开始。',
  'Movement steps': '动作步骤', 'REFERENCE PREVIEW': '参考示范', '3D MOVEMENT GUIDE': '3D 动作示范',
  'Show camera': '查看相机', 'Stop camera': '关闭相机', 'Back to studio · Esc': '返回练习页 · Esc',
  "3D pose reference": "3D 姿态参考", 'Waiting for a clear pose': '等待清晰姿态',
  'Face your camera': '面向相机', 'Switch side': '切换方向', '3D model viewing angle': '3D 模型视角',
  'Front': '正面', 'Side': '侧面', 'Rotate guide': '旋转示范',
  'Wrist & forearm': '手腕与小臂', 'ENLARGED SIDE VIEW': '放大侧视图', 'Wrist demonstration': '手腕动作示范',
  'Aligned': '保持平直', 'Wrist arched': '手腕拱起', 'Forearm raised': '小臂抬高',
  'Enlarged wrist demonstration': '手腕动作放大示范', 'Forearm': '小臂', 'Wrist': '手腕', 'Hand & grip': '手与握柄',
  "Draw-phase comparison · changes the hands on the figure above.": "拉桨阶段对比 · 切换上方模型的手部动作。",
  "Your camera": "你的相机", 'Close ×': '关闭 ×', 'Close': '关闭',
  'Live camera preview': '实时相机预览', 'LIVE PREVIEW': '实时预览',
  "Watch your movement beside the 3D demonstration.": "在 3D 示范旁查看自己的动作。",
  'Solid lines: you. Dashed blue lines: reference.': '实线是你的动作；蓝色虚线是参考动作。',
  'Camera setup: face the camera with your whole body visible.': '相机摆放：面向相机，让全身进入画面。',
  'Your pose': '你的姿态', 'Reference': '参考', 'Try adjusting': '试着调整',
  'Full-body tracking needed to compare': '需要识别全身才能比较',
  "Dashed lines are scaled to your torso.": "虚线按你的躯干比例缩放。",
  'Your space. Your pace.': '按自己的空间与节奏来。', 'Enable your camera to get live alignment cues.': '开启相机，查看实时动作提示。',
  'Enable camera': '开启相机', 'Processed on your device. No video is recorded or uploaded.': '画面在你的设备上处理，不会录制或上传视频。',
  'Suggested hold': '建议保持时间', "Difficulty": "难度", 'Find your alignment': '找到合适的姿态',
  'Ready when you are': '准备好就开始', 'Turn on your camera to see your alignment feedback here.': '开启相机后，这里会显示动作反馈。',
  "HOLD TIMER": "保持计时", 'Start hold timer': '开始计时', 'Pause hold timer': '暂停计时',
  "Start or pause the timer.": "点击开始或暂停计时。",
  'Enable the camera. Landmarks and alignment cues appear when tracking is clear.': '开启相机。识别清晰时会出现关键点和动作提示。',
  'More guidance:': '更多参考：', 'Downward Dog setup': '下犬式准备', 'NHS seated exercises': 'NHS 坐姿活动', 'and': '以及', 'stretching after exercise': '运动后拉伸',
  'Find my space': '开始练习',
  'Stretch': '拉伸', 'Gentle movement': '舒缓活动',
  'STRETCH': '拉伸', 'YOGA': '瑜伽', 'ROWING': '双桨赛艇', 'TENNIS': '网球', 'GENTLE MOVEMENT': '舒缓活动',
  'Demo': '示范', 'try a small adjustment': '可以稍作调整',
  'UPPER BODY': '上半身', 'SIDE BODY': '身体侧面', 'TADASANA': '山式', 'VIRABHADRASANA II': '战士二式',
  'WHOLE BODY': '全身', 'WIDE STANCE': '宽站姿', 'BALANCE': '平衡', 'STANDING REACH': '站姿伸展',
  'GROUNDING': '稳定站姿', 'CHAIR YOGA': '椅上瑜伽', 'SUKHASANA': '简易坐', 'BOUND ANGLE': '束角式',
  'DANDASANA': '手杖式', 'KNEELING': '跪姿', 'CHEST': '胸部', 'CHEST & SHOULDERS': '胸部与肩部',
  'SHOULDERS': '肩部', 'UPPER ARMS': '上臂', 'SEATED UPPER BODY': '坐姿上半身', 'SEATED SIDE BODY': '坐姿身体侧面',
  'SEATED CHEST': '坐姿胸部', 'BACK OF THIGH': '大腿后侧', 'SIDE-VIEW YOGA': '侧视瑜伽',
  'TWO-OAR SCULLING': '双桨赛艇', 'SHADOW FOREHAND': '空挥正手',
  'Easy': '简单', 'Explore gently': '慢慢尝试', 'Gentle': '基础', 'Intermediate': '中等', 'Moderate': '中等', 'Challenging': '较有挑战',
  'Slow study': '慢速观察', 'No ball needed': '无需球', 'Seated': '坐姿',
  'Sculling · on-water stroke': '双桨赛艇 · 水上划桨',
  'On-water technique · British Rowing': '水上技术参考 · 英国赛艇协会',
  'Tennis · forehand walkthrough': '网球 · 正手分步示范',
  'Forehand background · USTA': '正手动作参考 · 美国网球协会',
  'Gentle movement · seated upper body': '舒缓活动 · 坐姿上半身',
  "Seated arm and shoulder exercises. Sit on a chair with both feet supported.": "坐姿手臂与肩部练习。坐在椅子上，双脚有支撑。",
  'Seated exercise guidance · NHS': '坐姿活动参考 · NHS',
  'The back of the hand continues the forearm line. Follow that line as the hands draw in.': '手背与小臂保持一条线。双手回拉时，留意这条线是否平直。',
  'The wrist rises above the hand. Notice the bend between the forearm and the back of the hand.': '手腕向上拱起。观察小臂与手背之间的弯折。',
  'The hand stays in line with the forearm, but the whole forearm rises. This is a different change from bending the wrist.': '手与小臂仍然平直，但整段小臂抬高了；这与手腕弯折不同。',
  'Enlarged side view of forearm, wrist, hand and oar grip': '小臂、手腕、手与桨柄的放大侧视图',
  'Step by step': '分步骤', 'At your own pace': '按自己的节奏', 'Optional practice time': '可选练习时间',
  'Rotate to explore this step': '旋转模型，观察这一步', 'Front camera · upper body': '正面相机 · 上半身',
  'Side-on camera · full body': '侧面相机 · 全身', 'Face the camera with shoulders, elbows, wrists and hips visible. Feet can stay out of frame.': '面向相机，让肩、肘、手腕和髋部进入画面；双脚可以不入镜。',
  'Turn side-on with your whole body visible.': '侧身面对相机，让全身进入画面。',
  'Face the camera with your whole body visible.': '面向相机，让全身进入画面。',
  "Place your camera where your body and hands are visible.": "将相机放在能看清身体和双手的位置。",
  'Illustrative 3D movement study': '示意性 3D 动作观察', "3D reference · upper body": "3D 参考 · 上半身",
  'Explore this step': '观察这一步', "Movement cues": "动作要点",
  "MOVEMENT TIMER": "动作计时", "Start or pause the timer.": "点击开始或暂停计时。",
  'Demo only': '仅示范', 'Stop camera': '关闭相机', 'Learn the sequence.': '了解动作顺序。',
  'Practice with a live preview.': '配合实时画面练习。',
  "Enable camera to see yourself beside the 3D guide.": "开启相机，在 3D 示范旁查看自己的动作。",
  "Your camera is beside the 3D guide.": "你的相机画面显示在 3D 示范旁。",
  "Live preview": "实时预览",
  "Enable your camera to compare your pose.": "开启相机，对照你的姿态。",
  'Movement study': '动作观察', 'Find your starting position': '找到起始姿势',
  "Select a numbered step, then enable the camera to compare your movement.": "选择动作步骤，开启相机对照练习。",
  "Compare your movement with the 3D demonstration.": "对照 3D 示范查看自己的动作。",
  'You can follow the guide without a camera, or enable it for body-shape feedback.': '不打开相机也可以跟着示范练习；开启相机可查看姿态反馈。',
  "Timer complete": "计时完成", "Repeat the movement or switch sides.": "重复动作，或切换另一侧。",
  'Camera is off': '相机已关闭', 'Your reference guide is ready. You can restart whenever you like.': '示范仍可查看，随时可以重新开启相机。',
  'Connecting…': '连接中…', 'Preparing on-device pose tracking…': '正在准备设备端姿态识别…',
  'Camera access requires HTTPS or localhost in a supported browser.': '需要在支持的浏览器中通过 HTTPS 或 localhost 使用相机。',
  'Camera permission was declined. Allow access in your browser and try again.': '相机权限被拒绝。请在浏览器中允许访问后重试。',
  'No camera was found. Connect a camera and try again.': '未找到相机。请连接相机后重试。',
  'Could not start tracking. Check your connection and try again.': '无法开始识别。请检查连接后重试。',
  'Camera could not start': '相机无法启动', 'LIVE · ON DEVICE': '实时 · 设备端',
  "Camera ready.": "相机已就绪。",
  'Adjust your camera view': '调整相机角度', 'Some joints overlap. Move the camera slightly so each limb is visible.': '部分关节被遮挡。请稍微移动相机，让四肢清晰可见。',
  'Tracking paused': '识别已暂停', 'Pose tracking encountered a problem. Restart the camera to try again.': '姿态识别遇到问题。请重新开启相机。',
  'Comparison example · not a target': '对比示例 · 并非标准目标', "Demonstration": "动作示范",
  'Your angles / reference angles': '你的角度 / 参考角度', 'Upper-body tracking needed to compare': '需要识别上半身才能比较',
  '3D guide could not load.': '3D 示范加载失败。', 'You can still follow the written cues or enable your camera.': '仍可参考文字提示，或开启相机。',
  'Let’s get a clearer view': '请调整画面以便识别', 'Keep shoulders, elbows, wrists and hips visible. Feet do not need to be in frame.': '让肩、肘、手腕和髋部清晰可见；双脚不必入镜。',
  'Keep your whole body in frame, with good lighting and no joints hidden.': '让全身进入画面，保持光线充足，避免关节被遮挡。',
  'Move a little closer': '请靠近一点', 'Your body is too small in the frame for useful alignment cues.': '你在画面中太小，难以提供有用的姿态提示。',
  'Upper body visible': '上半身已识别', 'Comparing upper-body shape only.': '仅比较上半身姿态。',
  'Pose visible': '姿态已识别', 'Comparing visible joint angles.': '正在比较可见关节角度。',
  'A small adjustment': '可以稍作调整', 'Visible alignment looks steady': '可见姿态较稳定',
  "Your pose matches the reference.": "当前姿态与参考动作一致。",
  'Bring your torso back over your hips.': '让躯干回到髋部上方。', "Raise both arms overhead.": "双臂向上举起。",
  "Extend both arms.": "伸展双臂。",
  "Bend your torso to the side.": "躯干向侧面弯曲。",
  "Reach one arm overhead.": "一只手臂向上伸展。", 'Keep your legs long, with knees soft.': '双腿自然伸展，膝盖保持微屈。',
  "Stack your shoulders over your hips.": "肩膀位于髋部上方。", 'Relax your shoulders toward a level position.': '放松肩膀，尽量保持两侧平齐。',
  'Let both arms rest by your sides.': '让双臂自然垂在身体两侧。', 'Bring your torso upright over your hips.': '让躯干在髋部上方立起。',
  "Extend your arms to the sides at shoulder height.": "双臂向两侧展开，与肩同高。",
  "Bend your front knee and extend your back leg.": "前腿屈膝，后腿伸展。",
  'Left elbow': '左肘', 'Right elbow': '右肘', 'Left arm lift': '左臂抬起', 'Right arm lift': '右臂抬起',
  'Left knee': '左膝', 'Right knee': '右膝', 'Left hip opening': '左髋打开', 'Right hip opening': '右髋打开', 'Torso lean': '躯干倾斜',
  "Extend your left arm": "伸展左臂", "Extend your right arm": "伸展右臂",
  'Soften your left elbow': '左肘稍微放松', 'Soften your right elbow': '右肘稍微放松',
  'Raise your left arm a little': '左臂稍微抬高', 'Raise your right arm a little': '右臂稍微抬高',
  'Lower your left arm a little': '左臂稍微放低', 'Lower your right arm a little': '右臂稍微放低',
  "Extend your left leg": "伸展左腿", "Extend your right leg": "伸展右腿",
  "Bend your left knee slightly": "左膝微屈", "Bend your right knee slightly": "右膝微屈",
  "Move your left leg toward the reference": "左腿向参考姿态调整", "Move your right leg toward the reference": "右腿向参考姿态调整",
  "Adjust toward the reference.": "向参考姿态调整。",
  "Match the reference torso lean, or switch sides.": "调整躯干倾斜角度，或切换方向。",
  "Bring your shoulders back over your hips.": "肩膀回到髋部上方。",
  'Your lines are close to the reference': '姿态接近参考动作',
  "Your joint angles match the reference.": "当前关节角度与参考动作一致。",
  'Keep your knees soft and lift your hips back, without forcing your heels down.': '保持膝盖微屈，髋部向后抬起，不必强压脚跟。',
  'Keep your torso long; lower your knees if needed.': '让躯干自然伸展，需要时可放下膝盖。',
  'Keep your torso long and use your knees for support if needed.': '让躯干自然伸展，需要时用膝盖支撑。',
  'Use a small chest lift; keep your pelvis on the mat.': '小幅抬胸，骨盆保持贴垫。',
  "Keep your pelvis on the mat and lift your chest.": "骨盆贴垫，胸部抬起。",
  "Move your hips toward your heels.": "髋部向脚跟方向移动。",
  'Keep hands under shoulders and knees under hips.': '双手置于肩下，膝盖置于髋下。',
  "Bend your knees to match the reference.": "参照模型调整屈膝角度。",
  "Match the reference pose.": "对照参考姿态调整。",
  'Close to reference': '接近参考动作', 'Some adjustments': '可以稍作调整', 'Different from reference': '与参考动作差异较大',
};

Object.assign(zh, {
  "WELCOME TO YOUR PRACTICE": "欢迎开始练习",
  "Start your practice": "开始练习",
  "Start practice": "开始练习",
  "Select a movement and view the 3D demonstration.": "选择动作，查看 3D 示范。",
  "Position the camera as shown and keep your limbs visible.": "按提示摆放相机，让四肢清晰入镜。",
  "For rowing, enable the camera to find your direction, then start correction.": "赛艇练习中，开启相机识别朝向，再点击开始纠错。",
  "Follow the adjustment arrows. A confirmation appears when your pose matches.": "跟随箭头调整，姿态正确后会显示确认提示。",
  "Drag to rotate or tilt the model, scroll to zoom, and use Reset view to restore the default framing.": "拖拽旋转或调整模型俯仰，滚轮缩放；点击“恢复默认视角”还原取景。",
  "Currently, only limbs can be tracked; equipment and extremities cannot be recognized.": "暂时只能识别四肢，无法识别器材和肢体末梢。",
  "Colors show pose similarity: red for larger differences, orange for adjustments, and green for a match.": "颜色表示姿态相似程度：红色表示差异较大，橙色表示需要调整，绿色表示匹配。"
});

Object.assign(zh, {
  "Clay shooting · movement demonstrations": "飞碟射击 · 动作演示",
  "Sculling · three stroke studies": "赛艇 · 三种划桨动作",
  "Tennis · forehand & backhand": "网球 · 正手与反手",
  "Explore the complete movement, ready hold, raise to cheek and lowering as separate 3D demonstrations.": "可分别查看连续完整动作、持枪准备、举枪贴腮和下枪的三维演示。",
  "Explore arms-only, half stroke and full stroke as separate 3D demonstrations.": "可分别查看出手划、1/2 划和全桨划的三维演示。",
  "Forehand and backhand each include backswing, racket drop, swing and a complete stroke. Select any movement to play its 3D demonstration.": "正手、反手各包含引拍、降拍、挥拍与完整挥拍。选择任一动作即可播放三维演示。",
  "Forehand · four views of one stroke": "正手 · 分解与完整挥拍",
  "Backhand · four views of one stroke": "反手 · 分解与完整挥拍",
  "FOREHAND": "正手", "TWO-HANDED BACKHAND": "双手反手",
  "MOVEMENT DEMONSTRATION": "动作演示", "3D demonstration": "三维演示",
  "3D movement demonstration": "3D 动作演示", "3D movement playback": "动作播放",
  "Grip detail": "握拍细节",
  "Hand detail": "手部细节",
  "Play": "播放", "Pause": "暂停", "Restart": "重新播放", "Speed": "速度",
  "Playback speed": "播放速度", "Movement timeline": "动作时间轴",
  "Play movement": "播放动作", "Pause movement": "暂停动作",
  "Backswing": "引拍", "Racket drop": "降拍", "Swing & follow-through": "挥拍与随挥"
});

export function t(value) {
  if (language !== 'zh' || typeof value !== 'string') return value;
  const exact = zh[value.replace(/\s+/g, ' ').trim()];
  if (exact) return exact;
  if (value.endsWith('.') && zh[value.slice(0, -1)]) return zh[value.slice(0, -1)] + '。';
  let match;
  if ((match = value.match(/^([\d.]+) \/ ([\d.]+) s$/))) return `${match[1]} / ${match[2]} 秒`;
  if ((match = value.match(/^(\d+) movements$/))) return `${match[1]} 个动作`;
  if ((match = value.match(/^(\d+) sec$/))) return `${match[1]} 秒`;
  if ((match = value.match(/^(\d+)\. (.+)$/))) return `${match[1]}. ${t(match[2])}`;
  if ((match = value.match(/^Camera setup: (.+)$/))) return `相机摆放：${t(match[1])}`;
  if ((match = value.match(/^(.+) · (.+)$/))) return `${t(match[1])} · ${t(match[2])}`;
  if ((match = value.match(/^(.+) — (.+)$/))) return `${t(match[1])} — ${t(match[2])}`;
  if ((match = value.match(/^(.+) · try a small adjustment$/))) return `${t(match[1])} · 可以稍作调整`;
  if ((match = value.match(/^Adjust toward the reference\. (.+)$/))) return `向参考姿态调整。${t(match[1])}`;
  if (/^[○●↔⇄▣↻◈]\s+/.test(value)) return value.replace(/^([○●↔⇄▣↻◈])\s+/, (_, icon) => `${icon} `).replace(/^([○●↔⇄▣↻◈]) (.+)$/, (_, icon, rest) => `${icon} ${t(rest)}`);
  return value;
}

const poseZh = {
  'clay-stand': ['准备 · 放松站立', '从舒适站姿开始空手动作观察。', ['保持双手空着，清理周围活动空间。', '舒适站立，膝盖微屈，肩膀放松。', '活动前先自然呼吸。']],
  'clay-arms': ['抬臂 · 轻柔活动', '不使用器械，尝试轻柔抬臂。', ['弯曲手肘，将空着的双手稍微抬到身前。', '肩膀保持放松，抬到舒适高度即可。', '这是活动示意，并非持枪姿势教学。']],
  'clay-turn': ['转体 · 小幅旋转', '观察小幅、放松的躯干转动。', ['保持双手空着，只做小幅转体。', '转动躯干，保持双脚稳定。', '点击“切换方向”观察另一侧。']],
  'clay-reset': ['复位 · 放下放松', '回到放松的站立姿势。', ['轻轻转回中间。', '放下双臂，让肩膀放松。', '回到站立姿势，再重复动作。']],
  reach: ['双臂上举', '轻轻伸展双臂和上半身。', ['舒适站立，双脚约与髋同宽。', '双臂向上伸展，不要抬起肋骨。', '放松肩膀，自然呼吸。']],
  side: ['站姿侧弯', '伸展手臂，躯干向侧面弯曲。', ['双脚踩稳，膝盖微屈。', '一只手臂上举，身体稍向侧面倾斜。', '保持面朝前方，再换另一侧。']],
  mountain: ['山式', '身体直立，重心均匀分布在双脚。', ['站稳，双脚保持舒适距离。', '双臂自然垂放，放松肩膀。', '让重量均匀落在双脚上。']],
  warrior: ['战士二式', '双腿分开站立，双臂向两侧展开。', ['双脚舒适地分开，前脚脚尖向外。', '前膝朝脚尖方向轻轻弯曲。', '展开双臂，再换另一侧。']],
  star: ['星星式', '双脚舒适地分开站立。', ['双脚舒适地分开站立。', '双臂抬至肩高，不要耸肩。', '膝盖微屈，重量均匀落在双脚上。']],
  goddess: ['女神式', '双脚分开，脚尖舒适地向外。', ['双脚分开，脚尖舒适地向外。', '膝盖朝脚尖方向稍微弯曲。', '保持躯干挺直，双臂抬成舒适的门框形。']],
  tree: ['树式 · 低位变化', '靠近墙壁或稳固支撑物。', ['靠近墙壁或稳固支撑物。', '一只脚轻放在另一侧脚踝或小腿，避开膝盖。', '如果平衡不稳，可让抬起的脚尖留在地面。']],
  salute: ['向上致敬式', '双脚舒适地分开站立。', ['双脚舒适地分开站立。', '双臂向上伸展，掌心相对。', '保持肋骨自然；如更舒适，双手可以分开。']],
  'wide-mountain': ['宽站山式', '站得比髋部稍宽。', ['站得比髋部稍宽。', '双臂放在身体两侧。', '感受双脚踩稳，不要锁死膝盖。']],
  'seated-mountain': ['坐姿山式', '坐在稳固的椅子上，双脚有支撑。', ['坐在稳固的椅子上，双脚有支撑。', '双臂放在身体两侧。', '让脊背舒适地向上延伸。']],
  'easy-seat': ['简易坐', '坐在垫子上，双腿轻松交叉。', ['坐在垫子上，双腿轻松交叉。', '如果膝盖无法舒适放下，可以垫高支撑。', '双手放在大腿上，舒适地坐直。']],
  butterfly: ['蝴蝶式', '坐直，让双脚脚掌相对。', ['坐直，让双脚脚掌相对。', '脚跟与身体保持舒适距离。', '按需支撑膝盖，不要将膝盖向下压。']],
  staff: ['手杖式', '如有帮助，可坐在折叠的毯子上。', ['如有帮助，可坐在折叠的毯子上。', '双腿伸展，必要时膝盖微屈。', '双手放在髋旁，避免弓背。']],
  gate: ['门闩式 · 直立变化', '在跪地的膝盖下加垫。', ['在跪地的膝盖下加垫。', '另一条腿向侧面伸出，脚保持支撑。', '对侧手臂向上伸展；先保持直立，不必强求侧弯。']],
  'chest-open': ['站姿扩胸', '膝盖微屈，舒适站立。', ['膝盖微屈，舒适站立。', '双臂在肩部以下轻轻向两侧打开。', '放松肋骨，稍有牵拉感即可。']],
  cactus: ['门框式扩胸', '双肘弯曲，形成舒适的门框形。', ['双肘弯曲，形成舒适的门框形。', '放松肩膀；如感觉舒适，让手腕位于肘部上方。', '不要为了贴近参考姿势而将手臂用力向后推。']],
  'cross-body': ['横抱肩部拉伸', '一只手臂轻轻横过胸前。', ['一只手臂轻轻横过胸前。', '用另一只手扶住上臂，避开肘关节。', '肩膀保持放松，再换另一侧。']],
  triceps: ['上臂后侧拉伸', '抬起一只手臂，舒适地弯曲肘部。', ['抬起一只手臂，舒适地弯曲肘部。', '另一只手轻放在抬起的肘部附近。', '不要用力拉扯或拱起下背。']],
  'side-slide': ['站姿侧滑', '双脚始终踩在地面。', ['双脚始终踩在地面。', '一只手沿大腿外侧稍向下滑。', '保持面朝前方，只做小幅舒适的侧弯。']],
  'seated-reach': ['坐姿双臂上举', '坐稳，双脚有支撑。', ['坐稳，双脚有支撑。', '双臂向上伸展到舒适高度。', '避免抬起肋骨或耸肩。']],
  'seated-side': ['坐姿侧弯', '坐稳，让两侧臀部都有支撑。', ['坐稳，让两侧臀部都有支撑。', '一只手臂上举，轻轻向侧面弯曲。', '另一只手靠近椅子以便支撑。']],
  'seated-chest': ['坐姿扩胸', '坐在稳固椅子的前部，双脚有支撑。', ['坐在稳固椅子的前部，双脚有支撑。', '双臂在肩部以下打开。', '胸部轻轻展开，不要拱背。']],
  'seated-hamstring': ['坐姿大腿后侧拉伸', '在稳固椅子的前部坐稳。', ['在稳固椅子的前部坐稳。', '一条腿伸出，脚跟有支撑，膝盖微屈。', '保持背部自然挺直，从髋部向前倾。']],
  'wide-seat-side': ['宽坐姿侧伸展', '坐在折叠毯子上，双腿舒适分开。', ['坐在折叠毯子上，双腿舒适分开。', '一只手臂上举，身体稍向另一条腿倾斜。', '两侧臀部保持着地，不必去碰脚尖。']],
  'down-dog': ['下犬式', '从四点跪姿开始，髋部向后上方抬起。', ['从四点跪姿开始，髋部向后上方抬起。', '膝盖可微屈，背部舒展；脚跟不必落地。', '双手压向垫面。']],
  plank: ['高平板支撑', '双手放在肩下，双腿向后伸展。', ['双手放在肩下，双腿向后伸展。', '身体自然拉长，不要塌髋。', '肩膀保持在双手上方。']],
  'forearm-plank': ['前臂平板支撑', '前臂撑地，肘部位于肩下。', ['前臂撑地，肘部位于肩下。', '双腿伸展，躯干保持自然拉长。', '需要支撑时放下膝盖，不要憋气。']],
  cobra: ['低位眼镜蛇式', '俯卧，双手放在肋骨旁。', ['俯卧，双手放在肋骨旁。', '胸部小幅抬起，肘部弯曲，骨盆保持支撑。', '颈部自然伸展。']],
  sphinx: ['人面狮身式', '俯卧，用前臂支撑身体。', ['俯卧，用前臂支撑身体。', '肘部放在肩膀下方附近。', '骨盆贴地，抬起胸部。']],
  child: ['延展婴儿式', '膝下加垫，让髋部朝脚跟方向移动。', ['膝下加垫，让髋部朝脚跟方向移动。', '双臂向前伸展，让额头舒适地得到支撑。', '双膝分开，为躯干留出空间。']],
  tabletop: ['四点跪姿', '从双手和双膝支撑开始。', ['从双手和双膝支撑开始。', '双手放在肩下，双膝放在髋下。', '背部保持舒适的自然曲线，颈部伸展。']],
  chair: ['椅子式', '双脚舒适分开，膝盖稍微弯曲。', ['双脚舒适分开，膝盖稍微弯曲。', '髋部像要坐下一样向后移动，保持重心平稳。', '双臂抬起，双膝弯曲。']],
  'rowing-catch': ['入水 · 桨叶入水', '观察双桨入水时的起始姿态。', ['从 ¾ 视角观察两侧船桨。', '从髋部向前伸展，手臂自然伸长，肩膀放松。', '观察桨叶入水时双臂与躯干的位置。']],
  'rowing-drive': ['拉桨 · 双手回拉', '观察双侧桨柄向身体回拉时，手和小臂的连线。', ['在水上，先由腿部发力，再将双侧桨柄拉向身体。', '留意双手是沿船身移动，还是在回拉时抬高。', '暂时只能识别四肢，无法识别器材和肢体末梢。']],
  'rowing-finish': ['结束 · 回拉末端', '在桨叶出水前稍作停顿，观察小臂、手腕到手背的连线。', ['桨柄靠近身体时，身体保持舒适的小幅后仰。', '用放大视图比较平直的手、拱起的手腕和抬高的小臂。', '桨叶出水与转桨是另外的动作；此手腕示意没有展示这些过程。']],
  'rowing-recovery': ['回桨 · 双手前送', '观察每次划桨后的双手前送阶段。', ['膝盖上升前，先将双侧桨柄向前送出。', '向下一次入水移动前，身体先从髋部向前转。', '观察转换阶段小臂的高度。']],
  'tennis-ready': ['准备姿势', '从平衡站姿开始，慢速观察正手动作。', ['为双臂留足活动空间；球拍可用可不用。', '膝盖微屈，双手放在身前，舒适站立。', '从小幅、放松的空挥开始。']],
  'tennis-turn': ['身体转向', '躯干和髋部一起转动，为正手击球做准备。', ['身体作为整体向持拍侧转动。', '另一只手可辅助引导准备动作。', '旋转模型，观察躯干与肩膀的转动。']],
  'tennis-forward': ['向前挥拍', '观察慢速空挥中向前挥拍的阶段。', ['身体向假想的来球方向转回。', '持拍手臂沿舒适弧线向前移动。', '保持慢速；示范没有展示准确击球点或拍面控制。']],
  'tennis-follow': ['随挥收拍', '手臂继续向身体另一侧移动，然后复位。', ['让持拍手臂自然越过躯干。', '保持平衡，不要强行将手臂绕到颈后。', '再次练习前，先回到准备姿势。']],
  'gentle-reset': ['坐姿准备', '活动双臂前，先在椅子上坐稳。', ['坐在稳固椅子上，双脚有支撑。', '双臂放在身侧，放松肩膀。', '坐直，双脚保持支撑。']],
  'gentle-open': ['轻柔扩胸', '双臂在肩部以下稍向两侧打开。', ['双脚有支撑，舒适地坐直。', '双臂轻轻向两侧打开，不要向后拉扯。', '双臂回到起始姿势。']],
  'gentle-bend': ['轻柔屈肘', '不使用负重，弯曲并放下小臂。', ['上臂尽量留在身体两侧。', '慢慢弯曲肘部，再放下双手。', '屈伸肘部时保持肩膀放松。']],
  'gentle-lift': ['轻柔侧抬臂', '双臂向两侧抬起一部分，再慢慢放下。', ['从双臂自然垂放开始。', '双臂向两侧抬起，肘部微屈。', '双臂缓慢放回身体两侧。']],
};

export function registerPoseTranslations(poses) {
  for (const pose of poses) {
    const localized = pose.zh || poseZh[pose.id];
    if (!localized) continue;
    zh[pose.name] = localized[0];
    zh[pose.description] = localized[1];
    pose.cues.forEach((cue, index) => { zh[cue] = localized[2][index]; });
  }
}

const textRecords = new WeakMap();
const attributeRecords = new WeakMap();
let observer;
export function refreshLocalization() {
  const walker = document.createTreeWalker(document.documentElement, NodeFilter.SHOW_TEXT);
  while (walker.nextNode()) {
    const node = walker.currentNode;
    if (node.parentElement?.closest('script,style')) continue;
    const current = node.textContent;
    const record = textRecords.get(node) || { original: current, rendered: current };
    if (current !== record.rendered) record.original = current;
    const match = record.original.match(/^(\s*)([\s\S]*?)(\s*)$/);
    const translated = node.parentElement?.matches('[data-filter="gentle"]') && language === 'zh' ? '舒缓活动' : t(match[2]);
    const next = match[1] + translated + match[3];
    record.rendered = next;
    textRecords.set(node, record);
    if (current !== next) node.textContent = next;
  }
  document.querySelectorAll('[aria-label],[title],[placeholder],meta[name="description"]').forEach(el => {
    const saved = attributeRecords.get(el) || {};
    for (const attr of ['aria-label', 'title', 'placeholder', 'content']) {
      if (!el.hasAttribute(attr)) continue;
      const current = el.getAttribute(attr);
      const record = saved[attr] || { original: current, rendered: current };
      if (current !== record.rendered) record.original = current;
      const next = t(record.original);
      record.rendered = next;
      saved[attr] = record;
      if (current !== next) el.setAttribute(attr, next);
    }
    attributeRecords.set(el, saved);
  });
}
export function startLocalization() {
  refreshLocalization();
  observer = new MutationObserver(refreshLocalization);
  observer.observe(document.documentElement, { subtree: true, childList: true, characterData: true,
    attributes: true, attributeFilter: ['aria-label', 'title', 'placeholder', 'content'] });
}
