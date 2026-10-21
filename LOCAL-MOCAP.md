# Local real motion-capture preview

Development continues in FitAI: run `npm run dev`, port 5187. Raw captures and videos remain in ignored `source/`; only converted skeletal data and local libraries are public.

## Original data

All nine loaded tracks are 120 Hz. One initialization frame is removed. `python scripts/convert-mocap.py` regenerates float32 root translations and local quaternions, with source SHA-256, hierarchy, units, frame counts, duration and alignment recorded in each manifest.

- Rowing: `huachuan_01/02/03`, active `skeleton_2`; alternatives 0/1 are static.
- Tennis: `wangqiu_04_016` (forehand) and `wangqiu_06_020` (backhand), active `skeleton_1`; alternative 0 is static. The excluded 02/08 takes remain excluded.
- Shooting: `sheji_01_006 (1).bvh` and `sheji_02_008`, `03_009`, `04_010` active `skeleton_0`; alternatives are static.

Shortest-path SLERP and hierarchical forward kinematics preserve measured segment lengths, root travel and timing. No fitting, temporal smoothing or generic body scaling replaces the capture. A rigid rotation/translation aligns each take to the stage. Standing feet/toes have 8 cm minimum clearance for the shoe surface; rowing keeps its existing alignment.

## Playback windows

Times below refer to the BVH timeline after initialization removal, not the historical MP4 timestamps. Windows are observational action boundaries, not measured contact or impact events. Full and sliced tennis strokes use exactly the same underlying track.

| Action | Capture time (seconds) |
| --- | --- |
| Forehand full | 1.00–6.00 |
| Forehand backswing / drop / swing | 1.00–3.10 / 3.10–3.60 / 3.60–6.00 |
| Backhand full | 0.75–6.80 |
| Backhand backswing / drop / swing | 0.75–3.90 / 3.90–4.40 / 4.40–6.80 |
| Shooting complete | 0–20.6917 |
| Ready hold | 0.50–4.75 (02) |
| Raise to cheek | 2.40–7.40 (03) |
| Complete movement, take 4 | 0–14.3250 (04), full capture |

`src/capture-catalog.mjs` is the window definition. Tennis boundaries were reviewed against wrist trajectories; shooting studies 2/3 isolate rise/hold while study 4 preserves the full capture.

## Illustrative geometry

Body positions and rotations are measured. The source has no finger joints or independent racket/gun/oar tracks. `captured-props.mjs` builds palm frames around measured wrists, keeping body joints untouched. Forehand orientation follows the right-hand quaternion after an initial grasp calibration; backhand uses both wrist positions along one rigid handle. Shooting calibrates its palm offsets below the captured Hand joints (leaving all measured joints unchanged), and uses a common rigid prop, a sliding support grip and a release transition to the rear-hand rotation; its calibration is taken at capture second 3. Equipment surfaces and grasp geometry are illustrative, not recovered prop measurements. Rowing retains fixed oarlocks and its existing shaft constraints.

The same default camera, drag/zoom/reset controls, continuous 0.25×–1× slider (default 1×), model and playback clock serve all sports. Camera analysis is unchanged and sports stay preview-only.

`npm test` checks inherited poses, rowing interpolation, independently reconstructed BVH samples, source provenance, measured bone lengths, mirroring, equipment contacts, full/slice agreement, the full fourth take and model geometry. Browser checks render both tennis strokes and all four shooting studies. No videos are shipped with the public site.

The shooting exterior model in `src/shooting-model.mjs` uses proportions estimated from the supplied photographs: a smaller, slender black prop with a shaped stock and fore-end. This is a visual estimate, not a recovered equipment measurement. The shooting figure uses fitted black long sleeves, a simple cap and black trainers with narrower thigh, calf and hip surfaces. Capture markers and tracking tape are omitted. These changes affect rendered surfaces only.

The shooting trousers are a single indexed surface with a welded crotch, rather than an independent pelvis shell intersecting thigh tubes. Source hip/knee/ankle data are preserved. For this display character only, lower-body retargeting splits each source leg length 52%/48% between thigh and shin, preserving the hip, planted ankle and original bend plane. This corrects the long-thigh appearance of the source skeleton (about 51.6 cm thigh versus 38.0 cm shin). The displayed knee therefore differs from the unmodified source joint.

Study 4 is a complete action, as clarified by the user from `sheji_04_010（相机）.MP4`; the legacy asset/UI id `clay-lower` remains for compatibility only. The entire 14.325-second BVH is played, without trimming to lowering or freezing a held pose. The camera reference is already mounted at second 5 (estimated BVH correspondence ~4.5 s). This reference drives the display eye direction without changing measured head or body motion.

The rowing figure uses the supplied reference photograph for a red sleeveless singlet, dark shorts with pale side panels, exposed lean limbs, warm skin and wraparound sports glasses. Its shorts have a continuous hip/crotch surface that deforms with the measured pelvis and thighs. Rowing does not use the shooting leg retarget: rendered shoulders, elbows, wrists, knees and ankles follow the original measured coordinates. The photo provides appearance cues only.

The tennis figure follows the supplied outfit reference: white forward-brim cap, navy polo with pale collar piping, continuous white shorts, a white wristband, crew socks and white shoes with dark soles and coral heel accents. Legs, wrists and head retain captured positions and rotations. `src/tennis-racket.mjs` supplies the black/white elliptical frame, open Y throat, individual clipped mains/crosses and white wrapped grip; its geometry shares the grip dimensions used by the hand meshes and captured attachment frames.
