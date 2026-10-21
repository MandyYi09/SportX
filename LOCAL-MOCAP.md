# Local motion-capture preview

Run `npm run dev` on port 5187. Full source videos and BVH files remain unchanged in ignored `source/`. `python scripts/convert-mocap.py` generates complete float32 skeletal assets, not trimmed video files. Stored manifests record source SHA-256, hierarchy, units, frame counts and stage alignment. One initialization frame is removed; interpolation preserves measured joint transforms and bone lengths.

## User-selected playback windows — 2026-10-21

`motion-catalog.mjs` is the interval definition; `capture-catalog.mjs` maps each visible study to its corresponding capture. Playback and seeking are bounded, including restart, replay, speed changes and the underlying sampler. The public timeline displays elapsed time within the trimmed clip, starting at zero. Source filenames, review timecodes and data-length notices are not displayed to users.

| Source | Study | Requested seconds |
| --- | --- | --- |
| sheji_01_006 | 完整的射击 | 1–22 |
| sheji_02_008 | 持枪准备 | 2–5 |
| sheji_03_009 | 举枪贴腮 | 1–6 |
| sheji_04_010 | 下枪 | 1–13 |
| huachuan_01_Mandy_043 | 出手划 | 2–6 |
| huachuan_02_Mandy_045 | 1/2 划 | 0–9 |
| huachuan_03_Mandy_046 | 全桨划 | 0–8 |
| wangqiu_01_012 | 完整正手和反手挥拍 | 0–8 |
| wangqiu_03_015 | 正手引拍 | 0–4 |
| wangqiu_04_016 | 完整正手挥拍 | 0–6 |
| wangqiu_06_020 | 完整反手挥拍 | 0–8 |
| wangqiu_07_023 | 正手准备 | 0–5 |
| wangqiu_12_030 | 正手降拍 | 1–5 |
| wangqiu_09_026 | 完整反手挥拍 | 0–8 |

`wangqiu_11_028` is excluded. Previous exclusions `02_013` and `08_024` remain excluded. Independent tennis studies supplement the original breakdowns of takes 04/06. The original forehand and backhand groups each retain backswing, racket drop, swing and full stroke. Forehand breakdown windows are 1–3.1, 3.1–3.6 and 3.6–6 seconds; backhand windows are 0.75–3.9, 3.9–4.4 and 4.4–6.8 seconds, preserving their previous BVH intervals.

Video and BVH exports have different durations and no shared timecode. Equal-second matching is approximate, not a verified frame-accurate synchronization. The first shooting video's requested end (22 seconds) exceeds its 20.6917-second BVH; actual playback ends at the last measured frame without exposing the export mismatch in the user interface. Other requested ranges fit within the available data. No source media is rewritten, retimed or exported.

## Source skeletons and illustrative geometry

Rowing uses active skeleton 2. Tennis uses skeleton 1, including the equivalent `(2).bvh` export for take 03. Shooting uses `(1).bvh` for take 01 and skeleton 0 for takes 02/03/04. Static alternatives are excluded. All 14 independent studies use their own source capture. The six original breakdowns use their corresponding complete forehand/backhand capture.

Body transforms are measured. Source data has no finger joints or independent equipment tracks. Palm frames, racket/gun/oar geometry and grasp attachments are illustrative. Mirror mode reflects the captured geometry and attachments. `npm test` covers independent skeletal reconstruction, bone lengths, equipment, interval matching and real player controls including out-of-range seeking.

The shooting exterior model in `src/shooting-model.mjs` uses proportions estimated from the supplied photographs: a smaller, slender black prop with a shaped stock and fore-end. This is a visual estimate, not a recovered equipment measurement. The shooting figure uses fitted black long sleeves, a simple cap and black trainers with narrower thigh, calf and hip surfaces. Capture markers and tracking tape are omitted. These changes affect rendered surfaces only.

The shooting trousers are a single indexed surface with a welded crotch, rather than an independent pelvis shell intersecting thigh tubes. Source hip/knee/ankle data are preserved. For this display character only, lower-body retargeting splits each source leg length 52%/48% between thigh and shin, preserving the hip, planted ankle and original bend plane. This corrects the long-thigh appearance of the source skeleton (about 51.6 cm thigh versus 38.0 cm shin). The displayed knee therefore differs from the unmodified source joint.

The rowing figure uses the supplied reference photograph for a red sleeveless singlet, dark shorts with pale side panels, exposed lean limbs, warm skin and wraparound sports glasses. Its shorts have a continuous hip/crotch surface that deforms with the measured pelvis and thighs. Rowing does not use the shooting leg retarget: rendered shoulders, elbows, wrists, knees and ankles follow the original measured coordinates. The photo provides appearance cues only.

The tennis figure follows the supplied outfit reference: white forward-brim cap, navy polo with pale collar piping, continuous white shorts, a white wristband, crew socks and white shoes with dark soles and coral heel accents. Legs, wrists and head retain captured positions and rotations. `src/tennis-racket.mjs` supplies the black/white elliptical frame, open Y throat, individual clipped mains/crosses and white wrapped grip; its geometry shares the grip dimensions used by the hand meshes and captured attachment frames.
