# fitAI movement practice prototype

Local network preview: run `npm run dev`, then open the printed LAN address on a phone connected to the same LAN. Use the computer's current IPv4 address, which can change with DHCP. The preview listens on all interfaces by default; use `npm run dev -- --host 127.0.0.1` for a loopback-only preview. Allow TCP port 5187 on private networks if Windows Firewall blocks other devices. HTTP LAN access supports the movement library and 3D playback; phone camera access requires a trusted HTTPS connection. Phone layouts support horizontal movement selection, touch-sized controls and portrait/landscape viewing.

Archived runnable versions: [current full version and Stretch + Yoga basic version](versions/README.md).

A browser-only prototype using Three.js 0.180.0 and MediaPipe Tasks Vision 0.10.21.

Edit the application in `src/`. Run `npm run dev` to serve it at `http://127.0.0.1:5187/`, or serve `src/` using any static HTTP server. Keep that terminal open while using the preview. Run `npm test` for the pose checks. `npm run build` copies public application files into the ignored `build/` folder used for hosting; no dependencies need to be installed. Camera access is opt-in; frames are processed locally and never uploaded. Libraries, fonts and the pose model load from third-party CDNs, so the first visit requires network access.

The training figure uses contoured surfaces in `src/athlete-model.mjs`: shaped torso and pelvis, tapered limbs and sleeves, facial features, and layered trainers. Surfaces follow the existing joint positions, with separate head and hip rotations and the existing equipment hand frames. Tennis uses a white cap, navy polo, white shorts, wristband and socks, with a black/white racket with an open throat and individual strings. Rowing has a red sleeveless singlet, dark shorts with pale side panels, bare limbs and sports glasses, following its measured skeleton. Shooting has its own fitted black long sleeves, slim trousers, cap and black trainers, with a smaller black exterior prop based on the supplied photographs; tracking markers are omitted. This is a stylized training figure; the added anatomy, clothing and prop proportions are illustrative. `tests/athlete-model.mjs` checks surface normals, mirrored animation transforms and geometry reuse.

## Athlete recording studies — 2026-10-21

The library has 56 movements, including 20 sports studies: seven independent tennis recordings, the six original forehand/backhand breakdowns, three rowing recordings and four shooting recordings. The original forehand and backhand groups each retain backswing, racket drop, swing and full stroke. Tennis studies correspond to `01_012`, `03_015`, `04_016`, `06_020`, `07_023`, `12_030` and `09_026`. The `11_028` study is excluded, along with the previously excluded `02_013` and `08_024`. Shooting study 4 is the second complete movement, retaining preparation, raising, holding and final lowering.

`src/motion-catalog.mjs` retains source filenames and the user's approximate video search ranges. `src/capture-catalog.mjs` separately defines reviewed action boundaries on each corresponding BVH. Video contact sheets and joint trajectories were checked to isolate the named action, removing leading/trailing waits and unrelated movement. In particular, the second complete shooting action preserves its full sequence while removing external waits, and the standalone 降拍 isolates the descent after the backswing. The six original forehand/backhand phases remain contiguous with their complete strokes.

The 14 independent recordings use original 120 Hz captures; the six breakdowns sample their matching full stroke. The converter preserves full derived skeletal assets and never modifies source videos or BVH files. Original media stays in ignored `source/`. Only player sampling is bounded. Restart returns to the action start; seeking cannot escape the clip; playback stops on its final frame. Public controls show elapsed clip progress without filenames, review timecodes or export diagnostics. See `LOCAL-MOCAP.md` for review criteria and intervals. These are visual editing decisions, not measured contact events or frame-accurate video synchronization.

Playback supports pause, restart, a bounded timeline and a continuous 0.25×–1× speed slider. Hiding the page pauses playback. These demonstrations do not produce technique scores. `npm test` includes source/window matching and actual player-control regression tests for every requested interval.

Tennis uses its own curled-finger hand mesh and shared handle/wrist attachment dimensions (`tennis-hand.mjs`, `tennis-grip.mjs`). The dominant hand holds near the butt and the second backhand hand holds above it. Measured wrists are preserved; illustrative palm offsets and racket orientation are computed from the captured hand rotation (forehand) or the two wrists (backhand). Mirror mode reflects geometry, head/hip rotations and attachments. Drag rotates or tilts the model, the wheel zooms, and Reset view restores the default camera. This corrects attachment geometry, not a measured bevel-specific grip classification.

Rowing uses explicit oar contact frames (`equipment-grip.mjs`); captured tennis and clay use `captured-props.mjs` and wrapped hands. Rowing handles pass through both the grasp center and fixed oarlock, maintaining fixed oar length and palms above the handles. The rigid clay prop follows measured wrists; the support hand slides along its fore-end and relaxes when released. After release, captured rear-hand rotation carries the prop. There are no captured finger or equipment tracks, so those surfaces and their calibration are illustrative. These are visual attachment corrections, with no functional firing or aiming model. All modes use one normal view with continuous drag and wheel controls. Tests check wrist attachment, handle/pivot alignment, measured proportions, mirrored transforms, continuous body playback and exact agreement between full tennis strokes and slices.

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

The library contains 32 movements, adding Downward-facing Dog, High Plank, Forearm Plank, Low Cobra, Sphinx, Extended Child's Pose, Tabletop, and Chair. These default to side-view references and use the clearly visible body side for comparison. Hidden-side joints are not displayed as tracked points. Drag and Rotate turn the model for inspection; they do not change the camera setup required for tracking. Reset view appears after a manual camera adjustment.

The camera framing fits each pose's height and width and expands its screen coverage in browser-filling mode. Head and torso orientation now follow the body axis for floor poses. A detected comparable pose lightens the reference material, darkens the tracking overlay, and uses subtle red/orange/green similarity backgrounds. This remains a 2D angle prototype, not a load, spine-curve, pain or safety assessment. Live camera/browser visual acceptance testing remains unverified.
