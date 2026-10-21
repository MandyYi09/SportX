// Names confirmed by the user on 2026-10-21. Clip boundaries visually reviewed; not contact-event measurements.
export const motionClips = [
  {
    "id": "tennis-forehand-backswing",
    "type": "tennis",
    "sequence": "tennis-forehand",
    "name": "Forehand · backswing",
    "zhName": "正手 · 引拍",
    "sourceFile": "wangqiu_04_016.mp4",
    "sourceStart": 1.3,
    "sourceEnd": 3.0,
    "track": "forehand",
    "phase": "backswing"
  },
  {
    "id": "tennis-forehand-drop",
    "type": "tennis",
    "sequence": "tennis-forehand",
    "name": "Forehand · racket drop",
    "zhName": "正手 · 降拍",
    "sourceFile": "wangqiu_04_016.mp4",
    "sourceStart": 3.0,
    "sourceEnd": 4.0,
    "track": "forehand",
    "phase": "drop"
  },
  {
    "id": "tennis-forehand-swing",
    "type": "tennis",
    "sequence": "tennis-forehand",
    "name": "Forehand · swing",
    "zhName": "正手 · 挥拍",
    "sourceFile": "wangqiu_04_016.mp4",
    "sourceStart": 4.0,
    "sourceEnd": 5.5,
    "track": "forehand",
    "phase": "swing"
  },
  {
    "id": "tennis-forehand-full",
    "type": "tennis",
    "sequence": "tennis-forehand",
    "name": "Forehand · complete stroke",
    "zhName": "正手 · 完整挥拍",
    "sourceFile": "wangqiu_04_016.mp4",
    "sourceStart": 1.3,
    "sourceEnd": 5.5,
    "track": "forehand",
    "phase": "full"
  },
  {
    "id": "tennis-backhand-backswing",
    "type": "tennis",
    "sequence": "tennis-backhand",
    "name": "Backhand · backswing",
    "zhName": "反手 · 引拍",
    "sourceFile": "wangqiu_06_020.mp4",
    "sourceStart": 2.6,
    "sourceEnd": 4.9,
    "track": "backhand",
    "phase": "backswing"
  },
  {
    "id": "tennis-backhand-drop",
    "type": "tennis",
    "sequence": "tennis-backhand",
    "name": "Backhand · racket drop",
    "zhName": "反手 · 降拍",
    "sourceFile": "wangqiu_06_020.mp4",
    "sourceStart": 4.9,
    "sourceEnd": 5.6,
    "track": "backhand",
    "phase": "drop"
  },
  {
    "id": "tennis-backhand-swing",
    "type": "tennis",
    "sequence": "tennis-backhand",
    "name": "Backhand · swing",
    "zhName": "反手 · 挥拍",
    "sourceFile": "wangqiu_06_020.mp4",
    "sourceStart": 5.6,
    "sourceEnd": 7.7,
    "track": "backhand",
    "phase": "swing"
  },
  {
    "id": "tennis-backhand-full",
    "type": "tennis",
    "sequence": "tennis-backhand",
    "name": "Backhand · complete stroke",
    "zhName": "反手 · 完整挥拍",
    "sourceFile": "wangqiu_06_020.mp4",
    "sourceStart": 2.6,
    "sourceEnd": 7.7,
    "track": "backhand",
    "phase": "full"
  },
  {
    "id": "rowing-arms",
    "type": "rowing",
    "sequence": "rowing",
    "name": "Arms-only stroke",
    "zhName": "出手划",
    "sourceFile": "huachuan_01_Mandy_043.mp4",
    "sourceStart": 0.8,
    "sourceEnd": 9.8,
    "track": "rowing-arms",
    "phase": "full"
  },
  {
    "id": "rowing-half",
    "type": "rowing",
    "sequence": "rowing",
    "name": "Half stroke",
    "zhName": "1/2 划",
    "sourceFile": "huachuan_02_Mandy_045.mp4",
    "sourceStart": 0.3,
    "sourceEnd": 12.2,
    "track": "rowing-half",
    "phase": "full"
  },
  {
    "id": "rowing-full",
    "type": "rowing",
    "sequence": "rowing",
    "name": "Full stroke",
    "zhName": "全桨划",
    "sourceFile": "huachuan_03_Mandy_046.mp4",
    "sourceStart": 0.3,
    "sourceEnd": 10.6,
    "track": "rowing-full",
    "phase": "full"
  },
  {
    "id": "clay-full",
    "type": "clay",
    "sequence": "clay",
    "name": "Complete movement",
    "zhName": "连续完整动作",
    "sourceFile": "sheji_01_006 (1).mp4",
    "sourceStart": 0.5,
    "sourceEnd": 21.5,
    "track": "clay-full",
    "phase": "full"
  },
  {
    "id": "clay-ready",
    "type": "clay",
    "sequence": "clay",
    "name": "Ready hold",
    "zhName": "持枪准备",
    "sourceFile": "sheji_02_008.mp4",
    "sourceStart": 1.8,
    "sourceEnd": 6.3,
    "track": "clay-ready",
    "phase": "full"
  },
  {
    "id": "clay-mount",
    "type": "clay",
    "sequence": "clay",
    "name": "Raise to cheek",
    "zhName": "举枪贴腮",
    "sourceFile": "sheji_03_009.mp4",
    "sourceStart": 1.5,
    "sourceEnd": 7.8,
    "track": "clay-mount",
    "phase": "full"
  },
  {
    "id": "clay-lower",
    "type": "clay",
    "sequence": "clay",
    "name": "Lowering",
    "zhName": "下枪",
    "sourceFile": "sheji_04_010.mp4",
    "sourceStart": 10.5,
    "sourceEnd": 13.3,
    "track": "clay-lower",
    "phase": "full"
  }
];

export const motionById = Object.fromEntries(motionClips.map(clip => [clip.id, clip]));
export const excludedMotionSources = ["wangqiu_02_013.mp4", "wangqiu_02_013(1).mp4", "wangqiu_08_024.mp4"];
