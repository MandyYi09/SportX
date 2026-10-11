# fitAI movement practice prototype

A browser-only prototype using Three.js 0.180.0 and MediaPipe Tasks Vision 0.10.21.

Edit the application in `src/`. Run `npm run dev` to serve it at `http://127.0.0.1:5187/`, or serve `src/` using any static HTTP server. Keep that terminal open while using the preview. Run `npm test` for the pose checks. `npm run build` copies public application files into the ignored `build/` folder used for hosting; no dependencies need to be installed. Camera access is opt-in; frames are processed locally and never uploaded. Libraries, fonts and the pose model load from third-party CDNs, so the first visit requires network access.

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
