# Local real motion-capture preview

Based on source snapshot 627f2b1. Animation changes add real laboratory motion playback and local preview controls.

- Old project remains at ../FitAI, port 5187.
- New project: npm run dev, port 5188.
- Raw archives, lab captures and videos were moved into source/ and are ignored.
- Three rowing clips use skeleton_2 at 120 Hz; skeleton_0/1 were static. The initialization frame was removed.
- Run python scripts/convert-mocap.py to regenerate assets. JSON manifests include original SHA-256, units, frame count and alignment.
- Rotation data uses float32 quaternions, shortest-path SLERP and hierarchical forward kinematics. Source limb lengths and root movement are preserved. No temporal smoothing or fitted poses replace the measurements.
- A uniform rotation and translation align the capture to the existing stage. It is not scaled to a generic person's proportions.
- Original UI, player, hand meshes and equipment constraints are reused. Finger grip, oarlocks and boat geometry are illustrative; they are not measured prop tracks.
- Camera analysis remains unchanged; rowing is still preview-only. Different body proportions and phase-aware coaching are separate work.
- npm test covers both inherited tests and real-capture interpolation, fixed bone lengths, fixed oarlocks, contact attachment and slow playback.
- Assets use the existing pinned Three.js version locally; no package installation is needed.
