# fitAI movement practice prototype

Archived runnable versions: [current full version and Stretch + Yoga basic version](versions/README.md).

A browser-only prototype using Three.js 0.180.0 and MediaPipe Tasks Vision 0.10.21.

Edit the application in `src/`. Run `npm run dev` to serve it at `http://127.0.0.1:5187/`, or serve `src/` using any static HTTP server. Keep that terminal open while using the preview. Run `npm test` for the pose checks. `npm run build` copies public application files into the ignored `build/` folder used for hosting; no dependencies need to be installed. Camera access is opt-in; frames are processed locally and never uploaded. Libraries, fonts and the pose model load from third-party CDNs, so the first visit requires network access.

## Athlete recording studies — 2026-10-21

The library now has 51 movements. Tennis provides forehand and two-handed backhand, each with backswing, racket drop, swing/follow-through, and a complete stroke. Each set of three slices is contiguous and comes from one complete recording (`wangqiu_04_016` for forehand, `wangqiu_06_020` for backhand). The user excluded both `02_013` files and `08_024`; they are not used. The user-confirmed rowing studies are 出手划, 1/2 划 and 全桨划. The clay recordings are catalogued as 连续完整动作, 持枪准备, 举枪贴腮 and 下枪; the last clip isolates the lowering portion of `sheji_04_010`.

`src/motion-catalog.mjs` records the reference filename and reviewed source interval for each independent 3D movement. Recordings are development references only: the website does not include, load, display or offer downloads of mocap videos. Local extracted clips and posters are preserved outside the public website in the ignored `artifacts/motion-reference/` folder.

`src/motion-rig.mjs` contains manually video-fitted keyframes with fixed segment lengths, two-bone IK, a shared backhand grip and a separate racket direction. It does **not** recover the original skeletal motion capture from MP4s. Full strokes and phases sample the same source-time track. Exact joint rotations and timing still require original FBX/BVH/C3D data and review; these demonstrations do not produce technique scores. Observations and user corrections are retained separately in `analysis/motion-video-review-2026-10-20.json`.

All 15 movements have independent 3D playback, driven by `src/motion-clock.mjs` without a media element. Selecting a movement starts its demonstration (except with reduced-motion preferences); controls support pause, restart, scrubbing and 0.25×/0.5×/1× speed. Each demonstration holds its final pose on completion. Hiding the page pauses playback. The original model-focused layout and viewing angles are retained.

Tennis uses its own curled-finger hand mesh and shared handle/wrist attachment dimensions (`tennis-hand.mjs`, `tennis-grip.mjs`). The dominant hand holds near the butt and the second backhand hand holds above it. Wrist IK uses radial palm offsets; mirror mode reflects both geometry and attachments. The “Grip detail” control zooms the existing 3D view for inspection. This corrects attachment geometry, not a measured bevel-specific grip classification.

Rowing and clay use explicit equipment contact frames (`equipment-grip.mjs`) and appropriately sized wrapped hands. Rowing handles pass through both the grasp center and fixed oarlock, maintaining fixed oar length and palms above the handles. Clay hand targets share fixed exterior model attachment points; arm IK moves the rigid prop as a unit. These are visual attachment corrections, with no functional firing or aiming model. Both modes provide “Hand detail” views. Tests check wrist attachment, handle/pivot alignment, fixed contact spacing and continuous hand orientation throughout all seven recordings.

`npm test` covers reference poses, source exclusions, full/phase consistency, mirroring, constant bone lengths, seated knee direction, fixed rowing feet, backhand grip spacing, animation continuity, independent playback timing and exclusion of recorded media from the public website. No media has been uploaded or deployed.

Includes overhead reach, standing side bend, Mountain pose and Warrior II, a rotatable 3D reference, mirrored camera landmarks, visibility-gated alignment feedback, and an independent manual hold timer. The movement definitions and pure pose checks are separated to support future exercises.

## Limitations

This is not clinically validated. Rules check a few 2D landmark relationships, not pain, joint loading, balance, depth, or injury risk. Thresholds are illustrative product heuristics and must be reviewed by qualified movement professionals before safety-related use. Poor framing, camera angle, occlusion and clothing can produce inaccurate feedback. Never interpret a matching reference as a guarantee of safe form. Lifting and additional exercises are not yet included.

## Verification

JavaScript syntax and pure-rule checks passed for joint angles, reference alignment, misalignment, missing landmarks, and low-confidence landmarks. Local HTTP preview responds successfully. Native browser automation was unavailable in the execution environment, so live webcam/model inference, visual rendering and experimental WebMCP integration require an in-browser acceptance check.

## Live reference comparison

The 3D guide stays visible during tracking. Live pose lines are normalized to the reference hip origin and torso length, with differing joints highlighted and approximate joint-angle comparisons below. The same reference geometry drives the 3D model, camera ghost, and comparison calculations. Side bend and Warrior II support reversing the reference side. Camera imagery is hidden by default and only appears in the Show camera dialog; closing the dialog keeps tracking active.

Comparison checks cover all four references in both directions, normalization, and a displaced wrist producing correction feedback. Camera and browser visual acceptance checks remain unavailable in this environment. The line overlay represents a front-view 2D estimate; rotating the guide does not recover the user's actual depth.

## Expanded practice library and matching colors

The library now contains 24 movements (20 added) with pose-specific geometry and setup cues. Live backgrounds transition red/orange/green using mean and worst joint-angle differences; green requires every measured angle to fall within its heuristic tolerance. Missing or invalid tracking resets to a neutral background. These colors measure reference similarity, not injury risk or clinical correctness. Seated and overlapping-limb positions are particularly limited by a single front-view camera.

Automatic browser-filling animation enters after 600 ms of stable tracking and returns after 1500 ms of tracking loss. Escape dismisses it until a new loss/reacquisition cycle. Reduced-motion preferences disable the animation. Camera imagery remains opt-in.

Run `node tests/pose-comparison.mjs` for all 24 references in both directions, altered-limb corrections, visibility checks, color boundaries, and focus-view timing. Live webcam and visual animation testing still require browser acceptance testing.

## Side-view yoga and model visibility

The library contains 32 movements, adding Downward-facing Dog, High Plank, Forearm Plank, Low Cobra, Sphinx, Extended Child's Pose, Tabletop, and Chair. These default to side-view references and use the clearly visible body side for comparison. Hidden-side joints are not displayed as tracked points. Front/Side buttons rotate each model for inspection and remember that pose's chosen view during the session; they do not change the camera setup required for tracking.

The camera framing fits each pose's height and width and expands its screen coverage in browser-filling mode. Head and torso orientation now follow the body axis for floor poses. A detected comparable pose lightens the reference material, darkens the tracking overlay, and uses subtle red/orange/green similarity backgrounds. This remains a 2D angle prototype, not a load, spine-curve, pain or safety assessment. Live camera/browser visual acceptance testing remains unverified.
