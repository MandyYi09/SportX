# Rowing prerecorded speech

57 semantic cues, English and Mandarin, 114 independent MP3 clips. Voice: Microsoft Zira (en-US) and Microsoft Huihui (zh-CN), Windows offline synthesis, speaking rate 0.95.

Files: src/assets/audio/rowing/{en,zh}/{id}.mp3. The manifest records exact text, voice, duration, size and SHA-256. Regenerate with node scripts/generate-rowing-speech.mjs; installed Windows voices and ffmpeg/ffprobe are required. --reuse-wav skips synthesis and re-encodes the local WAV cache.

Playback is integrated into rowing preparation and static correction. It follows the selected UI language, with a shared voice toggle outside and inside correction. Checkpoint demonstrations, persistent adjustments, tracking guidance and success confirmations use prerecorded clips. Only one cue plays at a time; stale instructions are cancelled, tracking guidance is debounced, and repetitions are rate-limited. Valid adjustments take priority over ordinary missing-joint notices. Closing correction, hiding the page or switching language cancels speech. Tap the voice button if browser autoplay blocks audio. These are synthetic voices.

| # | ID | Category | 中文 | English |
| --- | --- | --- | --- | --- |
| 1 | setup-shoulders | flow | 请让双肩入镜，保持片刻。 | Keep both shoulders in view and hold still briefly. |
| 2 | setup-ready | flow | 朝向已就绪。点击开始纠错。 | Your direction is ready. Start correction when you are ready. |
| 3 | direction-locked | flow | 朝向已锁定，先看专家动作。 | Direction locked. Watch the expert first. |
| 4 | follow-overlay | flow | 现在跟随模型调整姿势。 | Now match your position to the model. |
| 5 | watch-again | flow | 再看一次专家动作，然后重新尝试。 | Watch the expert again, then try once more. |
| 6 | direction-changed | flow | 朝向已变化，请重新定位。 | Your direction has changed. Please reposition. |
| 7 | checkpoint-arms-extended | checkpoint | 伸臂前送，手臂自然伸长。 | Arms extended. Reach your arms forward. |
| 8 | checkpoint-arms-drawn-in | checkpoint | 屈肘收桨，将双手拉向身体。 | Arms drawn in. Draw your hands toward your body. |
| 9 | checkpoint-draw-finish | checkpoint | 收桨结束，保持这个姿势。 | Finish position. Hold this position. |
| 10 | checkpoint-hands-away | checkpoint | 双手前送，将双手向前送出。 | Hands away. Send your hands forward. |
| 11 | checkpoint-body-forward | checkpoint | 躯干前倾，从髋部向前转动。 | Body forward. Hinge forward at the hips. |
| 12 | checkpoint-catch | checkpoint | 入水准备，对照模型摆好姿势。 | Catch position. Match the model. |
| 13 | checkpoint-leg-drive | checkpoint | 蹬腿展开，手臂保持伸长。 | Leg drive. Extend your legs and keep your arms long. |
| 14 | checkpoint-recovery | checkpoint | 回桨前倾，将身体向前送。 | Recovery. Bring your body forward. |
| 15 | adjust-left-elbow-lower | adjustment | 左肘放低一点。 | Lower your left elbow. |
| 16 | adjust-left-elbow-raise | adjustment | 左肘抬高一点。 | Raise your left elbow. |
| 17 | adjust-left-elbow-straighten | adjustment | 左肘再伸直一点。 | Straighten your left elbow a little. |
| 18 | adjust-left-elbow-bend | adjustment | 左肘再弯曲一点。 | Bend your left elbow a little. |
| 19 | adjust-left-knee-straighten | adjustment | 左膝再伸直一点。 | Straighten your left knee a little. |
| 20 | adjust-left-knee-bend | adjustment | 左膝再弯曲一点。 | Bend your left knee a little. |
| 21 | adjust-left-arm-torso-open | adjustment | 左上臂对照专家调整。 | Adjust your left upper arm to match the reference. |
| 22 | adjust-left-arm-torso-close | adjustment | 左上臂对照专家调整。 | Adjust your left upper arm to match the reference. |
| 23 | adjust-left-hip-open | adjustment | 上身与左大腿的夹角再打开一点。 | Open the angle between your torso and left thigh. |
| 24 | adjust-left-hip-close | adjustment | 上身与左大腿的夹角再收小一点。 | Narrow the angle between your torso and left thigh. |
| 25 | adjust-right-elbow-lower | adjustment | 右肘放低一点。 | Lower your right elbow. |
| 26 | adjust-right-elbow-raise | adjustment | 右肘抬高一点。 | Raise your right elbow. |
| 27 | adjust-right-elbow-straighten | adjustment | 右肘再伸直一点。 | Straighten your right elbow a little. |
| 28 | adjust-right-elbow-bend | adjustment | 右肘再弯曲一点。 | Bend your right elbow a little. |
| 29 | adjust-right-knee-straighten | adjustment | 右膝再伸直一点。 | Straighten your right knee a little. |
| 30 | adjust-right-knee-bend | adjustment | 右膝再弯曲一点。 | Bend your right knee a little. |
| 31 | adjust-right-arm-torso-open | adjustment | 右上臂对照专家调整。 | Adjust your right upper arm to match the reference. |
| 32 | adjust-right-arm-torso-close | adjustment | 右上臂对照专家调整。 | Adjust your right upper arm to match the reference. |
| 33 | adjust-right-hip-open | adjustment | 上身与右大腿的夹角再打开一点。 | Open the angle between your torso and right thigh. |
| 34 | adjust-right-hip-close | adjustment | 上身与右大腿的夹角再收小一点。 | Narrow the angle between your torso and right thigh. |
| 35 | confirmed-left-arm | confirmation | 左臂已调整。 | Left arm corrected. |
| 36 | confirmed-left-leg | confirmation | 左腿已调整。 | Left leg corrected. |
| 37 | confirmed-left-arm-height | confirmation | 左臂高度已调整。 | Left arm height corrected. |
| 38 | confirmed-right-arm | confirmation | 右臂已调整。 | Right arm corrected. |
| 39 | confirmed-right-leg | confirmation | 右腿已调整。 | Right leg corrected. |
| 40 | confirmed-right-arm-height | confirmation | 右臂高度已调整。 | Right arm height corrected. |
| 41 | aligned | confirmation | 所有可见部位均已对齐。 | All visible parts are well-aligned. |
| 42 | aligned-visible | confirmation | 所有可见部位均已对齐。 | All visible parts are well-aligned. |
| 43 | hold | confirmation | 保持片刻。 | Hold for a moment. |
| 44 | framing-left-wrist | tracking | 左腕超出画面，请让手腕回到画面内。 | Your left wrist is out of frame. Bring it back into view. |
| 45 | tracking-left-shoulder | tracking | 暂时看不清左肩。 | Your left shoulder is not clearly visible. |
| 46 | tracking-left-elbow | tracking | 暂时看不清左肘。 | Your left elbow is not clearly visible. |
| 47 | tracking-left-hip | tracking | 暂时看不清左髋。 | Your left hip is not clearly visible. |
| 48 | tracking-left-knee | tracking | 暂时看不清左膝。 | Your left knee is not clearly visible. |
| 49 | tracking-left-ankle | tracking | 暂时看不清左踝。 | Your left ankle is not clearly visible. |
| 50 | framing-right-wrist | tracking | 右腕超出画面，请让手腕回到画面内。 | Your right wrist is out of frame. Bring it back into view. |
| 51 | tracking-right-shoulder | tracking | 暂时看不清右肩。 | Your right shoulder is not clearly visible. |
| 52 | tracking-right-elbow | tracking | 暂时看不清右肘。 | Your right elbow is not clearly visible. |
| 53 | tracking-right-hip | tracking | 暂时看不清右髋。 | Your right hip is not clearly visible. |
| 54 | tracking-right-knee | tracking | 暂时看不清右膝。 | Your right knee is not clearly visible. |
| 55 | tracking-right-ankle | tracking | 暂时看不清右踝。 | Your right ankle is not clearly visible. |
| 56 | framing-wider | tracking | 取景太窄，请尝试广角镜头或使用手机。 | The view is too narrow. Try a wider lens or use your phone. |
| 57 | tracking-lost | tracking | 暂时无法识别动作，请回到画面中。 | Tracking is unavailable. Please move back into view. |
