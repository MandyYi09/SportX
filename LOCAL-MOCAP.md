# Local motion-capture preview

Run `npm run dev` on port 5187. Full source videos and BVH files remain unchanged in ignored `source/`. `python scripts/convert-mocap.py` generates complete float32 skeletal assets, not trimmed video files. Stored manifests record source SHA-256, hierarchy, units, frame counts and stage alignment. One initialization frame is removed; interpolation preserves measured joint transforms and bone lengths.

## Reviewed action windows — 2026-10-21

The user supplied approximate video ranges to help locate actions. Those ranges are retained as reference hints in `motion-catalog.mjs`; they are not copied into the player. `capture-catalog.mjs` defines the reviewed action intervals on the BVH timeline after its initialization frame. Playback, restart, seeking and sampling enforce those intervals. Public progress begins at zero and shows no source filenames, original timecodes or export diagnostics.

Review used contact sheets of all 14 source videos at 0.5-second intervals, then joint trajectories sampled at 0.1 seconds to distinguish onset, held positions, return and unrelated motion. Local evidence is in ignored `artifacts/boundary-review/`: per-recording video sheets, `kinematics.json` and `kinematics.txt`. These are visual editing boundaries with small settling margins, not measured impact/contact events or a claim of frame-accurate video synchronization.

| Source | Study | Video search hint | Reviewed BVH interval | Boundary criterion |
| --- | --- | --- | --- | --- |
| sheji_01_006 | 完整的射击 | 1–22 | 0.65–20.05 | Initial purposeful lift through final lowering, excluding initial wait and later readjustment |
| sheji_02_008 | 持枪准备 | 2–5 | 0.55–4.35 | Raise into ready hold; stop before lowering starts |
| sheji_03_009 | 举枪贴腮 | 1–6 | 1.20–4.80 | Lift from rest through ready and cheek mount; stop once mounted pose settles |
| sheji_04_010 | 第二次完整动作 | 1–13 | 2.05–13.65 | Retain preparation, ready, cheek mount, holding/turns and lowering; remove initial idle wait and trailing readjustment |
| huachuan_01_Mandy_043 | 出手划 | 2–6 | 1.60–5.65 | Hands move away, extend, then draw back to finish; exclude later lowering |
| huachuan_02_Mandy_045 | 1/2 划 | 0–9 | 0.65–7.25 | Begin stroke setup and complete draw; stop before unrelated reset |
| huachuan_03_Mandy_046 | 全桨划 | 0–8 | 0.50–8.05 | Hands away, catch, drive and recovery; exclude final drop/rest |
| wangqiu_01_012 | 完整正手和反手挥拍 | 0–8 | 0.25–7.10 | Both strokes and return to ready, excluding idle tail |
| wangqiu_03_015 | 正手引拍 | 0–4 | 0.45–2.85 | Turn and draw the racket back to set position; omit later release |
| wangqiu_04_016 | 完整正手挥拍 | 0–6 | 0.80–5.65 | Initiate turn through swing, follow-through and return; omit later extra gesture |
| wangqiu_06_020 | 完整反手挥拍 | 0–8 | 1.10–7.15 | Initiate backhand turn through follow-through and return |
| wangqiu_07_023 | 正手准备 | 0–5 | 0.55–4.65 | Set knees/hands into ready stance and preserve its settled hold |
| wangqiu_12_030 | 正手降拍 | 1–5 | 2.60–3.65 | Only racket/wrist descent after backswing; omit preceding turn and long terminal hold |
| wangqiu_09_026 | 完整反手挥拍 | 0–8 | 0.80–6.65 | Backhand preparation through return; omit idle tail |

The original forehand and backhand breakdowns remain available. They sample the same source as their complete stroke and are contiguous: forehand 0.80–3.10 / 3.10–3.60 / 3.60–5.65; backhand 1.10–3.90 / 3.90–4.40 / 4.40–7.15. The seven independent recordings supplement these six original phases; they do not replace them. `11_028`, `02_013` and `08_024` remain excluded. No original videos or BVH files are modified.

## Source skeletons and illustrative geometry

Rowing uses active skeleton 2. Tennis uses skeleton 1, including the equivalent `(2).bvh` export for take 03. Shooting uses `(1).bvh` for take 01 and skeleton 0 for takes 02/03/04. Static alternatives are excluded. All 14 independent studies use their own source capture. The six original breakdowns use their corresponding complete forehand/backhand capture.

Body transforms are measured. Source data has no finger joints or independent equipment tracks. Palm frames, racket/gun/oar geometry and grasp attachments are illustrative. Mirror mode reflects the captured geometry and attachments. `npm test` covers independent skeletal reconstruction, bone lengths, equipment, interval matching and real player controls including out-of-range seeking.

The shooting exterior model in `src/shooting-model.mjs` uses proportions estimated from the supplied photographs: a smaller, slender black prop with a shaped stock and fore-end. This is a visual estimate, not a recovered equipment measurement. The shooting figure uses fitted black long sleeves, a simple cap and black trainers with narrower thigh, calf and hip surfaces. Capture markers and tracking tape are omitted. These changes affect rendered surfaces only.

The shooting trousers are a single indexed surface with a welded crotch, rather than an independent pelvis shell intersecting thigh tubes. Source hip/knee/ankle data are preserved. For this display character only, lower-body retargeting splits each source leg length 52%/48% between thigh and shin, preserving the hip, planted ankle and original bend plane. This corrects the long-thigh appearance of the source skeleton (about 51.6 cm thigh versus 38.0 cm shin). The displayed knee therefore differs from the unmodified source joint.

The rowing figure uses the supplied reference photograph for a red sleeveless singlet, dark shorts with pale side panels, exposed lean limbs, warm skin and wraparound sports glasses. Its shorts have a continuous hip/crotch surface that deforms with the measured pelvis and thighs. Rowing does not use the shooting leg retarget: rendered shoulders, elbows, wrists, knees and ankles follow the original measured coordinates. The photo provides appearance cues only.

The tennis figure follows the supplied outfit reference: white forward-brim cap, navy polo with pale collar piping, continuous white shorts, a white wristband, crew socks and white shoes with dark soles and coral heel accents. Legs, wrists and head retain captured positions and rotations. `src/tennis-racket.mjs` supplies the black/white elliptical frame, open Y throat, individual clipped mains/crosses and white wrapped grip; its geometry shares the grip dimensions used by the hand meshes and captured attachment frames.
