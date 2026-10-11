let language = 'en';

export const getLanguage = () => language;
export function setLanguage(value) {
  language = value === 'zh' ? 'zh' : 'en';
  document.documentElement.lang = language === 'zh' ? 'zh-CN' : 'en';
}

// English remains the source copy. These strings are only used when Chinese is selected.
const zh = {
  'Mobility': '拉伸与舒缓', 'Choose your mode': '选择练习模式', 'Mobility mode': '拉伸与舒缓模式', 'Gentle mode': '舒缓模式',
  'Standing and seated stretches for your shoulders, torso and legs.': '通过站姿和坐姿拉伸，伸展肩部、躯干和腿部。',
  'Small seated movements for your arms and shoulders, with chair support.': '借助椅子支撑，以小幅坐姿动作活动手臂和肩膀。',
  'The figure carries a simplified sporting shotgun prop with visible hands. Follow the mobility study empty-handed. The model is a visual illustration, not a validated holding position or instruction in aiming or firing.': '小人带有可见的双手和简化的运动霰弹枪道具。跟随活动示意时请保持空手。模型仅供外观观察，并非经过验证的持枪姿势，也不教授瞄准或击发。',
  'Clay Shooting': '打飞碟', 'CLAY SHOOTING': '打飞碟', 'EMPTY-HAND MOBILITY': '空手活动', 'No equipment': '无需器械',
  'Clay Shooting · empty-hand movement': '打飞碟 · 空手动作观察',
  'An empty-hand mobility study for this sport: relaxed standing, arm movement and a small torso turn. Use no firearm or equipment. These illustrative poses do not teach aiming or firing and are not validated technique targets.': '本模式提供与这项运动相关的空手活动观察：放松站立、手臂活动和小幅转体。请勿使用枪械或器械。这些示意姿势不教授瞄准或击发，也不是经过验证的技术标准。',
  'fitAI — Movement practice prototype': 'fitAI — 动作练习原型',
  'Language': '语言',
  'An interactive movement practice prototype with 3D demonstrations and optional on-device pose feedback.': '互动动作练习原型，提供 3D 示范和可选的设备端姿态反馈。',
  'Your practice': '你的练习', 'How it works ↗': '使用说明 ↗',
  'Movement category': '动作类别', 'All': '全部', 'Stretches': '拉伸', 'Yoga': '瑜伽', 'Rowing': '双桨赛艇', 'Tennis': '网球', 'Gentle': '舒缓活动',
  'Ease into it.': '慢慢开始。',
  'Warm up with 5–10 minutes of light movement. A gentle pull is enough. Stop if you feel pain.': '先用 5–10 分钟轻松活动热身。轻微牵拉就够了；感到疼痛请停止。',
  'A note on safe stretching ↗': '安全拉伸建议 ↗',
  'Movement steps': '动作步骤', 'REFERENCE PREVIEW': '参考示范', '3D MOVEMENT GUIDE': '3D 动作示范',
  'Show camera': '查看相机', 'Stop camera': '关闭相机', 'Back to studio · Esc': '返回练习页 · Esc',
  '3D reference · 2D pose estimate': '3D 参考 · 2D 姿态估计', 'Waiting for a clear pose': '等待清晰姿态',
  'Face your camera': '面向相机', 'Switch side': '切换方向', '3D model viewing angle': '3D 模型视角',
  'Front': '正面', 'Side': '侧面', 'Rotate guide': '旋转示范',
  'Wrist & forearm': '手腕与小臂', 'ENLARGED SIDE VIEW': '放大侧视图', 'Wrist demonstration': '手腕动作示范',
  'Aligned': '保持平直', 'Wrist arched': '手腕拱起', 'Forearm raised': '小臂抬高',
  'Enlarged wrist demonstration': '手腕动作放大示范', 'Forearm': '小臂', 'Wrist': '手腕', 'Hand & grip': '手与握柄',
  'Draw-phase comparison · changes the hands on the figure above. No camera measurement.': '拉桨阶段示意对比 · 会改变上方小人的手部动作；不进行相机测量。',
  'Your camera': '你的相机', 'Close ×': '关闭 ×', 'Close': '关闭',
  'Live camera preview': '实时相机预览', 'Your camera · no scoring': '你的相机 · 不评分', 'LIVE PREVIEW': '实时预览',
  'Watch your own movement beside the 3D illustration. The camera does not assess technique.': '在 3D 示范旁观察自己的动作。相机不会评估技术。',
  'Solid lines: you. Dashed blue lines: reference.': '实线是你的动作；蓝色虚线是参考动作。',
  'Camera setup: face the camera with your whole body visible.': '相机摆放：面向相机，让全身进入画面。',
  'Your pose': '你的姿态', 'Reference': '参考', 'Try adjusting': '试着调整',
  'Full-body tracking needed to compare': '需要识别全身才能比较',
  'Dashed lines are scaled to your torso. Angles are approximate; a closer match is not a safety score.': '虚线按你的躯干比例缩放。角度只是估计值；更接近参考动作不代表更安全。',
  'Your space. Your pace.': '按自己的空间与节奏来。', 'Enable your camera to get live alignment cues.': '开启相机，查看实时动作提示。',
  'Enable camera': '开启相机', 'Processed on your device. No video is recorded or uploaded.': '画面在你的设备上处理，不会录制或上传视频。',
  'Suggested hold': '建议保持时间', 'Take it gently': '量力而行', 'Find your alignment': '找到合适的姿态',
  'Ready when you are': '准备好就开始', 'Turn on your camera to see your alignment feedback here.': '开启相机后，这里会显示动作反馈。',
  'COMFORTABLE HOLD': '舒适地保持', 'Start hold timer': '开始计时', 'Pause hold timer': '暂停计时',
  'A manual timer. Release sooner if you need to.': '计时器可自行控制；需要时可提前放松。',
  'MOVE WITH AWARENESS, NOT PERFECTION.': '关注身体感受，不必追求完美。',
  'Alignment cues are estimates, not a safety assessment or medical advice. Never push through pain.': '动作提示只是估计值，不是安全评估或医疗建议。疼痛时不要勉强继续。',
  'Made for a gentler everyday.': '让日常活动更从容。',
  'WELCOME TO YOUR PRACTICE': '欢迎开始练习', 'A little guidance.': '一点引导。', 'A lot of listening to your body.': '更多地倾听身体。',
  'Choose a movement and follow its gentle setup cues.': '选择动作，按照温和的准备提示练习。',
  'Follow the selected movement’s camera setup with good lighting. Gentle movements only need your shoulders, arms and hips in frame. Rowing and Tennis are step-by-step demonstrations without camera scoring.': '根据所选动作调整相机并保持光线充足。舒缓活动只需让肩、手臂和髋部进入画面。双桨赛艇和网球是分步骤示范，不提供相机评分。',
  'Follow the selected movement’s camera setup with good lighting. Gentle movements only need your shoulders, arms and hips in frame. Rowing and Tennis offer a live camera preview beside the 3D guide without technique scoring.': '根据所选动作调整相机并保持光线充足。舒缓活动只需让肩、手臂和髋部进入画面。双桨赛艇和网球可以在 3D 示范旁显示实时相机画面，但不提供技术评分。',
  'Enable the camera. Landmarks and alignment cues appear when tracking is clear.': '开启相机。识别清晰时会出现关键点和动作提示。',
  'Use the optional timer while comfortable. Stop immediately if it hurts.': '可以按需使用计时器；如有疼痛，请立即停止。',
  'Front, ¾ and Side rotate the model for inspection. Follow the camera setup shown for the selected pose; changing the model view does not change the tracking angle. Side-view poses compare only the visible body side. The sculling model is an illustration of two-oar movement; it does not assess blades or wrists. Background colors show similarity: red means a different shape, orange means some adjustments, and green means the visible angles are close. They do not indicate safety. Seated poses and overlapping limbs may be harder to track. This experimental coach checks a few visible joint relationships. It cannot see pain, joint loading, balance, or every unsafe position. Camera angle, clothing, and occlusion can affect results. If you have an injury or health condition, ask a qualified professional which movements suit you.': '正面、¾ 和侧面按钮可旋转模型，方便观察。请按所选动作的提示摆放相机；切换模型视角不会改变识别角度。侧视动作只比较可见的一侧。双桨赛艇模型只是双桨动作示意，无法评估桨叶或手腕。背景颜色表示姿态相似程度：红色表示差异较大，橙色表示可作调整，绿色表示可见角度接近；它们不表示安全程度。坐姿和肢体遮挡可能影响识别。本实验性工具只检查少数可见关节关系，无法感知疼痛、关节受力、平衡或所有不安全姿势。相机角度、衣着和遮挡也会影响结果。如有伤病或健康问题，请咨询专业人士，了解适合自己的动作。',
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
  'Easy': '简单', 'Explore gently': '慢慢尝试', 'Gentle': '温和', 'Intermediate': '中等', 'Moderate': '中等', 'Challenging': '较有挑战',
  'Slow study': '慢速观察', 'No ball needed': '无需球', 'Seated': '坐姿',
  'Sculling · on-water stroke': '双桨赛艇 · 水上划桨',
  'An illustrative two-oar sculling sequence. The oars and blades show the two-sided movement, but their angle and water depth are not measured or validated. Ask your coach to check the hand path and blade work against your own footage.': '这是双桨赛艇动作示意。双侧桨和桨叶展示运动方向，但桨角和入水深度未经测量或验证。请教练结合你自己的视频检查手部路径和桨叶动作。',
  'On-water technique · British Rowing': '水上技术参考 · 英国赛艇协会',
  'Tennis · forehand walkthrough': '网球 · 正手分步示范',
  'An illustrative forehand sequence for shadow practice. Use Switch side for the opposite hand. This guide does not assess ball contact, racket face, speed or technique quality.': '用于空挥练习的正手示意动作。可用“切换方向”观察另一只手。本示范不评估击球点、拍面、速度或技术质量。',
  'Forehand background · USTA': '正手动作参考 · 美国网球协会',
  'Gentle movement · seated upper body': '舒缓活动 · 坐姿上半身',
  'A seated starting point for older adults. Use a stable chair without wheels and keep your feet supported. Choose a comfortable range; the camera compares upper-body shape only.': '适合老年人从坐姿开始尝试。使用稳固、无轮子的椅子，让双脚有支撑。只在舒适范围内活动；相机仅比较上半身姿态。',
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
  'Demonstration only · no camera or technique scoring.': '仅供动作示范 · 不使用相机或技术评分。',
  'Live camera preview is for self-observation only. No technique scoring.': '实时相机预览仅供自行观察，不提供技术评分。',
  'Place your camera where your body and hands are visible. Live preview only; no technique scoring.': '将相机放在能看清身体和双手的位置。仅供实时观察，不提供技术评分。',
  'Illustrative 3D movement study': '示意性 3D 动作观察', '3D reference · upper-body estimate': '3D 参考 · 上半身姿态估计',
  'Explore this step': '观察这一步', 'Move comfortably': '舒适地活动',
  'MOVE AT YOUR PACE': '按自己的节奏活动', 'An optional timer. Move slowly and rest whenever you need to.': '计时器可选。慢慢活动，需要时随时休息。',
  'Demo only': '仅示范', 'Stop camera': '关闭相机', 'Learn the sequence.': '了解动作顺序。',
  'Practice with a live preview.': '配合实时画面练习。',
  'Enable camera to see yourself beside the 3D guide. No technique scoring.': '开启相机，在 3D 示范旁观察自己；不提供技术评分。',
  'Your camera is beside the 3D guide. No technique scoring.': '你的相机画面显示在 3D 示范旁；不提供技术评分。',
  'Live preview · no score': '实时预览 · 不评分',
  'Observe your movement beside the illustration. Ask your coach to review technique.': '对照示意动作观察自己；技术细节请让教练复核。',
  'Step through the guide above. Camera scoring is not available for this sequence.': '依次查看上方步骤；这个动作序列不提供相机评分。',
  'Enable your camera for an approximate body-shape comparison.': '开启相机可查看大致的身体姿态对比。',
  'Movement study': '动作观察', 'Find your starting position': '找到起始姿势',
  'Use the numbered steps to inspect each position. These illustrative shapes have not been validated by a coach.': '按照编号观察每个姿势。这些示意动作尚未经教练验证。',
  'Use the numbered steps to inspect each position. You can enable camera for self-observation without scoring.': '按编号观察每个姿势。你可以开启相机自行观察，但不会获得评分。',
  'Use the live preview to observe yourself. The illustrated guide does not assess your technique.': '通过实时画面观察自己；示意动作不会评估你的技术。',
  'You can follow the guide without a camera, or enable it for body-shape feedback.': '不打开相机也可以跟着示范练习；开启相机可查看姿态反馈。',
  'Take a breath': '稍作休息', 'Release gently. Rest or switch sides when you’re ready.': '慢慢放松。休息一下，准备好后可换边。',
  'Camera is off': '相机已关闭', 'Your reference guide is ready. You can restart whenever you like.': '示范仍可查看，随时可以重新开启相机。',
  'Connecting…': '连接中…', 'Preparing on-device pose tracking…': '正在准备设备端姿态识别…',
  'Camera access requires HTTPS or localhost in a supported browser.': '需要在支持的浏览器中通过 HTTPS 或 localhost 使用相机。',
  'Camera permission was declined. Allow access in your browser and try again.': '相机权限被拒绝。请在浏览器中允许访问后重试。',
  'No camera was found. Connect a camera and try again.': '未找到相机。请连接相机后重试。',
  'Could not start tracking. Check your connection and try again.': '无法开始识别。请检查连接后重试。',
  'Camera could not start': '相机无法启动', 'LIVE · ON DEVICE': '实时 · 设备端',
  'Make yourself comfortable.': '调整到舒适姿势。',
  'Adjust your camera view': '调整相机角度', 'Some joints overlap. Move the camera slightly so each limb is visible.': '部分关节被遮挡。请稍微移动相机，让四肢清晰可见。',
  'Tracking paused': '识别已暂停', 'Pose tracking encountered a problem. Restart the camera to try again.': '姿态识别遇到问题。请重新开启相机。',
  'Comparison example · not a target': '对比示例 · 并非标准目标', 'Demonstration · no score': '动作示范 · 不评分',
  'Your angles / reference angles': '你的角度 / 参考角度', 'Upper-body tracking needed to compare': '需要识别上半身才能比较',
  '3D guide could not load.': '3D 示范加载失败。', 'You can still follow the written cues or enable your camera.': '仍可参考文字提示，或开启相机。',
  'Let’s get a clearer view': '请调整画面以便识别', 'Keep shoulders, elbows, wrists and hips visible. Feet do not need to be in frame.': '让肩、肘、手腕和髋部清晰可见；双脚不必入镜。',
  'Keep your whole body in frame, with good lighting and no joints hidden.': '让全身进入画面，保持光线充足，避免关节被遮挡。',
  'Move a little closer': '请靠近一点', 'Your body is too small in the frame for useful alignment cues.': '你在画面中太小，难以提供有用的姿态提示。',
  'Upper body visible': '上半身已识别', 'Comparing upper-body shape only.': '仅比较上半身姿态。',
  'Pose visible': '姿态已识别', 'Comparing visible joint angles.': '正在比较可见关节角度。',
  'A small adjustment': '可以稍作调整', 'Visible alignment looks steady': '可见姿态较稳定',
  'These checks match the reference. Stay within a comfortable range and keep breathing.': '当前检查项与参考动作接近。保持舒适范围，自然呼吸。',
  'Bring your torso back over your hips.': '让躯干回到髋部上方。', 'Raise both arms only as far as feels comfortable.': '双臂只需举到舒适的高度。',
  'Gently lengthen your arms without forcing your elbows.': '轻轻伸展双臂，不要勉强伸直手肘。',
  'Try a small, comfortable side bend; avoid leaning deeply.': '尝试小幅、舒适的侧弯，避免过度倾斜。',
  'Let one arm reach overhead if comfortable.': '如果舒服，可让一只手臂向上伸展。', 'Keep your legs long, with knees soft.': '双腿自然伸展，膝盖保持微屈。',
  'Gently stack your shoulders over your hips.': '轻轻让肩膀位于髋部上方。', 'Relax your shoulders toward a level position.': '放松肩膀，尽量保持两侧平齐。',
  'Let both arms rest by your sides.': '让双臂自然垂在身体两侧。', 'Bring your torso upright over your hips.': '让躯干在髋部上方立起。',
  'Reach your arms apart near shoulder height, if comfortable.': '如感觉舒适，让双臂在接近肩高处向两侧伸展。',
  'Use a gentle front-knee bend with the other leg long. Don’t force depth.': '前腿轻轻屈膝，后腿自然伸展，不要勉强下蹲。',
  'Left elbow': '左肘', 'Right elbow': '右肘', 'Left arm lift': '左臂抬起', 'Right arm lift': '右臂抬起',
  'Left knee': '左膝', 'Right knee': '右膝', 'Left hip opening': '左髋打开', 'Right hip opening': '右髋打开', 'Torso lean': '躯干倾斜',
  'Gently lengthen your left arm': '轻轻伸展左臂', 'Gently lengthen your right arm': '轻轻伸展右臂',
  'Soften your left elbow': '左肘稍微放松', 'Soften your right elbow': '右肘稍微放松',
  'Raise your left arm a little': '左臂稍微抬高', 'Raise your right arm a little': '右臂稍微抬高',
  'Lower your left arm a little': '左臂稍微放低', 'Lower your right arm a little': '右臂稍微放低',
  'Ease your left leg toward a longer position': '轻轻伸展左腿', 'Ease your right leg toward a longer position': '轻轻伸展右腿',
  'Gently soften your left knee': '左膝稍微放松', 'Gently soften your right knee': '右膝稍微放松',
  'Move your left leg gently toward the reference': '左腿轻轻向参考姿势调整', 'Move your right leg gently toward the reference': '右腿轻轻向参考姿势调整',
  'Adjust gently toward the reference silhouette.': '轻轻向参考轮廓调整。',
  'only within a comfortable range.': '只在舒适范围内调整。',
  'Lean gently toward the reference, or switch its side. Stay within your comfortable range.': '轻轻向参考姿势靠近，或切换参考方向；保持在舒适范围内。',
  'Bring your shoulders gently back over your hips.': '让肩膀轻轻回到髋部上方。',
  'Your lines are close to the reference': '姿态接近参考动作',
  'The visible angles are similar. Keep breathing; stop or ease out if anything hurts.': '可见角度相近。保持呼吸；如有疼痛请放松或停止。',
  'Keep your knees soft and lift your hips back, without forcing your heels down.': '保持膝盖微屈，髋部向后抬起，不必强压脚跟。',
  'Keep your torso long; lower your knees if needed.': '让躯干自然伸展，需要时可放下膝盖。',
  'Keep your torso long and use your knees for support if needed.': '让躯干自然伸展，需要时用膝盖支撑。',
  'Use a small chest lift; keep your pelvis on the mat.': '小幅抬胸，骨盆保持贴垫。',
  'Keep your pelvis supported and your chest lift comfortable.': '让骨盆有支撑，只抬胸到舒适高度。',
  'Ease your hips toward your heels only as far as comfortable.': '髋部只向脚跟方向移动到舒适的位置。',
  'Keep hands under shoulders and knees under hips.': '双手置于肩下，膝盖置于髋下。',
  'Keep the knee bend shallow enough to stay comfortable.': '屈膝幅度以舒适为准。',
  'Stay in a comfortable range.': '保持在舒适范围内。',
  'Close to reference': '接近参考动作', 'Some adjustments': '可以稍作调整', 'Different from reference': '与参考动作差异较大',
};

export function t(value) {
  if (language !== 'zh' || typeof value !== 'string') return value;
  const exact = zh[value.replace(/\s+/g, ' ').trim()];
  if (exact) return exact;
  let match;
  if ((match = value.match(/^(\d+) movements$/))) return `${match[1]} 个动作`;
  if ((match = value.match(/^(\d+) sec$/))) return `${match[1]} 秒`;
  if ((match = value.match(/^(\d+)\. (.+)$/))) return `${match[1]}. ${t(match[2])}`;
  if ((match = value.match(/^Camera setup: (.+)$/))) return `相机摆放：${t(match[1])}`;
  if ((match = value.match(/^(.+) · (.+)$/))) return `${t(match[1])} · ${t(match[2])}`;
  if ((match = value.match(/^(.+) — (.+)$/))) return `${t(match[1])} — ${t(match[2])}`;
  if ((match = value.match(/^(.+) · try a small adjustment$/))) return `${t(match[1])} · 可以稍作调整`;
  if ((match = value.match(/^(.+), only within a comfortable range\.$/))) return `${t(match[1])}，只在舒适范围内调整。`;
  if ((match = value.match(/^Adjust gently toward the reference silhouette\. (.+)$/))) return `轻轻向参考轮廓调整。${t(match[1])}`;
  if (/^[○●↔⇄▣↻◈]\s+/.test(value)) return value.replace(/^([○●↔⇄▣↻◈])\s+/, (_, icon) => `${icon} `).replace(/^([○●↔⇄▣↻◈]) (.+)$/, (_, icon, rest) => `${icon} ${t(rest)}`);
  return value;
}

const poseZh = {
  'clay-stand': ['准备 · 放松站立', '从舒适站姿开始空手动作观察。', ['保持双手空着，清理周围活动空间。', '舒适站立，膝盖微屈，肩膀放松。', '活动前先自然呼吸。']],
  'clay-arms': ['抬臂 · 轻柔活动', '不使用器械，尝试轻柔抬臂。', ['弯曲手肘，将空着的双手稍微抬到身前。', '肩膀保持放松，抬到舒适高度即可。', '这是活动示意，并非持枪姿势教学。']],
  'clay-turn': ['转体 · 小幅旋转', '观察小幅、放松的躯干转动。', ['保持双手空着，只做小幅转体。', '在舒适范围内缓慢活动，不要勉强扭转背部。', '点击“切换方向”观察另一侧。']],
  'clay-reset': ['复位 · 放下放松', '回到放松的站立姿势。', ['轻轻转回中间。', '放下双臂，让肩膀放松。', '再次练习前稍作停顿；如有不适请停止。']],
  reach: ['双臂上举', '轻轻伸展双臂和上半身。', ['舒适站立，双脚约与髋同宽。', '双臂向上伸展，不要抬起肋骨。', '放松肩膀，自然呼吸。']],
  side: ['站姿侧弯', '轻轻伸展身体侧面。', ['双脚踩稳，膝盖微屈。', '一只手臂上举，身体稍向侧面倾斜。', '保持面朝前方，再换另一侧。']],
  mountain: ['山式', '找到稳定的站姿，感受片刻安静。', ['站稳，双脚保持舒适距离。', '双臂自然垂放，放松肩膀。', '让重量均匀落在双脚上。']],
  warrior: ['战士二式', '稳定站立，双臂轻轻向两侧展开。', ['双脚舒适地分开，前脚脚尖向外。', '前膝朝脚尖方向轻轻弯曲。', '展开双臂，再换另一侧。']],
  star: ['星星式', '双脚舒适地分开站立。', ['双脚舒适地分开站立。', '双臂抬至肩高，不要耸肩。', '膝盖微屈，重量均匀落在双脚上。']],
  goddess: ['女神式', '双脚分开，脚尖舒适地向外。', ['双脚分开，脚尖舒适地向外。', '膝盖朝脚尖方向稍微弯曲。', '保持躯干挺直，双臂抬成舒适的门框形。']],
  tree: ['树式 · 低位变化', '靠近墙壁或稳固支撑物。', ['靠近墙壁或稳固支撑物。', '一只脚轻放在另一侧脚踝或小腿，避开膝盖。', '如果平衡不稳，可让抬起的脚尖留在地面。']],
  salute: ['向上致敬式', '双脚舒适地分开站立。', ['双脚舒适地分开站立。', '双臂向上伸展，掌心相对。', '保持肋骨自然；如更舒适，双手可以分开。']],
  'wide-mountain': ['宽站山式', '站得比髋部稍宽。', ['站得比髋部稍宽。', '双臂放在身体两侧。', '感受双脚踩稳，不要锁死膝盖。']],
  'seated-mountain': ['坐姿山式', '坐在稳固的椅子上，双脚有支撑。', ['坐在稳固的椅子上，双脚有支撑。', '双臂放在身体两侧。', '让脊背舒适地向上延伸。']],
  'easy-seat': ['简易坐', '坐在垫子上，双腿轻松交叉。', ['坐在垫子上，双腿轻松交叉。', '如果膝盖无法舒适放下，可以垫高支撑。', '双手放在大腿上，舒适地坐直。']],
  butterfly: ['蝴蝶式', '坐直，让双脚脚掌相对。', ['坐直，让双脚脚掌相对。', '脚跟与身体保持舒适距离。', '按需支撑膝盖，不要将膝盖向下压。']],
  staff: ['手杖式', '如有帮助，可坐在折叠的毯子上。', ['如有帮助，可坐在折叠的毯子上。', '双腿伸展，必要时膝盖微屈。', '双手放在髋旁，避免弓背。']],
  gate: ['门闩式 · 直立变化', '在跪地的膝盖下加垫；如跪姿疼痛，请跳过。', ['在跪地的膝盖下加垫；如跪姿疼痛，请跳过。', '另一条腿向侧面伸出，脚保持支撑。', '对侧手臂向上伸展；先保持直立，不必强求侧弯。']],
  'chest-open': ['站姿扩胸', '膝盖微屈，舒适站立。', ['膝盖微屈，舒适站立。', '双臂在肩部以下轻轻向两侧打开。', '放松肋骨，稍有牵拉感即可。']],
  cactus: ['门框式扩胸', '双肘弯曲，形成舒适的门框形。', ['双肘弯曲，形成舒适的门框形。', '放松肩膀；如感觉舒适，让手腕位于肘部上方。', '不要为了贴近参考姿势而将手臂用力向后推。']],
  'cross-body': ['横抱肩部拉伸', '一只手臂轻轻横过胸前。', ['一只手臂轻轻横过胸前。', '用另一只手扶住上臂，避开肘关节。', '肩膀保持放松，再换另一侧。']],
  triceps: ['上臂后侧拉伸', '抬起一只手臂，舒适地弯曲肘部。', ['抬起一只手臂，舒适地弯曲肘部。', '另一只手轻放在抬起的肘部附近。', '不要用力拉扯或拱起下背。']],
  'side-slide': ['站姿侧滑', '双脚始终踩在地面。', ['双脚始终踩在地面。', '一只手沿大腿外侧稍向下滑。', '保持面朝前方，只做小幅舒适的侧弯。']],
  'seated-reach': ['坐姿双臂上举', '坐稳，双脚有支撑。', ['坐稳，双脚有支撑。', '双臂向上伸展到舒适高度。', '避免抬起肋骨或耸肩。']],
  'seated-side': ['坐姿侧弯', '坐稳，让两侧臀部都有支撑。', ['坐稳，让两侧臀部都有支撑。', '一只手臂上举，轻轻向侧面弯曲。', '另一只手靠近椅子以便支撑。']],
  'seated-chest': ['坐姿扩胸', '坐在稳固椅子的前部，双脚有支撑。', ['坐在稳固椅子的前部，双脚有支撑。', '双臂在肩部以下打开。', '胸部轻轻展开，不要拱背。']],
  'seated-hamstring': ['坐姿大腿后侧拉伸', '在稳固椅子的前部坐稳。', ['在稳固椅子的前部坐稳。', '一条腿伸出，脚跟有支撑，膝盖微屈。', '保持背部自然挺直；如舒适可稍微前倾。相机无法判断拉伸强度。']],
  'wide-seat-side': ['宽坐姿侧伸展', '坐在折叠毯子上，双腿舒适分开。', ['坐在折叠毯子上，双腿舒适分开。', '一只手臂上举，身体稍向另一条腿倾斜。', '两侧臀部保持着地，不必去碰脚尖。']],
  'down-dog': ['下犬式', '从四点跪姿开始，髋部向后上方抬起。', ['从四点跪姿开始，髋部向后上方抬起。', '膝盖可微屈，背部舒展；脚跟不必落地。', '双手舒适地支撑；如手腕或肩膀疼痛，请放松退出。']],
  plank: ['高平板支撑', '双手放在肩下，双腿向后伸展。', ['双手放在肩下，双腿向后伸展。', '身体自然拉长，不要塌髋。', '需要时放下膝盖；不舒服就停止。']],
  'forearm-plank': ['前臂平板支撑', '前臂撑地，肘部位于肩下。', ['前臂撑地，肘部位于肩下。', '双腿伸展，躯干保持自然拉长。', '需要支撑时放下膝盖，不要憋气。']],
  cobra: ['低位眼镜蛇式', '俯卧，双手放在肋骨旁。', ['俯卧，双手放在肋骨旁。', '胸部小幅抬起，肘部弯曲，骨盆保持支撑。', '颈部自然伸展；如背部不适，请放下身体。']],
  sphinx: ['人面狮身式', '俯卧，用前臂支撑身体。', ['俯卧，用前臂支撑身体。', '肘部放在肩膀下方附近。', '骨盆贴地，胸部只抬到舒适高度。']],
  child: ['延展婴儿式', '膝下加垫，让髋部朝脚跟方向移动。', ['膝下加垫，让髋部朝脚跟方向移动。', '双臂向前伸展，让额头舒适地得到支撑。', '给腹部留出空间；若膝盖疼痛，请调整支撑或跳过。']],
  tabletop: ['四点跪姿', '从双手和双膝支撑开始。', ['从双手和双膝支撑开始。', '双手放在肩下，双膝放在髋下。', '背部保持舒适的自然曲线，颈部伸展。']],
  chair: ['椅子式', '双脚舒适分开，膝盖稍微弯曲。', ['双脚舒适分开，膝盖稍微弯曲。', '髋部像要坐下一样向后移动，保持重心平稳。', '如果舒服再抬起双臂；需要时减少屈膝幅度。']],
  'rowing-catch': ['入水 · 桨叶入水', '观察双桨入水时的起始姿态。', ['从 ¾ 视角观察两侧船桨。', '从髋部向前伸展，手臂自然伸长，肩膀放松。', '桨叶位置仅作示意；实际入水请以教练指导为准。']],
  'rowing-drive': ['拉桨 · 双手回拉', '观察双侧桨柄向身体回拉时，手和小臂的连线。', ['在水上，先由腿部发力，再将双侧桨柄拉向身体。', '留意双手是沿船身移动，还是在回拉时抬高。', '身体相机无法确认桨叶入水深度或手腕角度；请与教练一起复核。']],
  'rowing-finish': ['结束 · 回拉末端', '在桨叶出水前稍作停顿，观察小臂、手腕到手背的连线。', ['桨柄靠近身体时，身体保持舒适的小幅后仰。', '用放大视图比较平直的手、拱起的手腕和抬高的小臂。', '桨叶出水与转桨是另外的动作；此手腕示意没有展示这些过程。']],
  'rowing-recovery': ['回桨 · 双手前送', '观察每次划桨后的双手前送阶段。', ['膝盖上升前，先将双侧桨柄向前送出。', '向下一次入水移动前，身体先从髋部向前转。', '请教练帮你观察这一转换阶段小臂是否抬起。']],
  'tennis-ready': ['准备姿势', '从平衡站姿开始，慢速观察正手动作。', ['为双臂留足活动空间；球拍可用可不用。', '膝盖微屈，双手放在身前，舒适站立。', '从小幅、放松的空挥开始。']],
  'tennis-turn': ['身体转向', '躯干和髋部一起转动，为正手击球做准备。', ['身体作为整体向持拍侧转动。', '另一只手可辅助引导准备动作。', '旋转模型观察转体；不要勉强扭转背部或肩膀。']],
  'tennis-forward': ['向前挥拍', '观察慢速空挥中向前挥拍的阶段。', ['身体向假想的来球方向转回。', '持拍手臂沿舒适弧线向前移动。', '保持慢速；示范没有展示准确击球点或拍面控制。']],
  'tennis-follow': ['随挥收拍', '手臂继续向身体另一侧移动，然后复位。', ['让持拍手臂自然越过躯干。', '保持平衡，不要强行将手臂绕到颈后。', '再次练习前，先回到准备姿势。']],
  'gentle-reset': ['坐姿准备', '活动双臂前，先在椅子上坐稳。', ['坐在稳固椅子上，双脚有支撑。', '双臂放在身侧，放松肩膀。', '自然呼吸，保持舒适的坐姿。']],
  'gentle-open': ['轻柔扩胸', '双臂在肩部以下稍向两侧打开。', ['双脚有支撑，舒适地坐直。', '双臂轻轻向两侧打开，不要向后拉扯。', '活动幅度保持小一些，想休息时就回到起始姿势。']],
  'gentle-bend': ['轻柔屈肘', '不使用负重，弯曲并放下小臂。', ['上臂尽量留在身体两侧。', '慢慢弯曲肘部，再放下双手。', '放松肩膀，只在舒适范围内活动。']],
  'gentle-lift': ['轻柔侧抬臂', '双臂向两侧抬起一部分，再慢慢放下。', ['从双臂自然垂放开始。', '肘部保持放松，只抬到舒适高度。', '缓慢放下；不必达到模型的高度。']],
};

export function registerPoseTranslations(poses) {
  for (const pose of poses) {
    const localized = poseZh[pose.id];
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
