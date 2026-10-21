// User-selected recording intervals, in seconds. Original recordings remain unchanged.
export const motionClips = [
  {
    "id": "tennis-combined-full",
    "type": "tennis",
    "name": "Complete forehand & backhand",
    "zhName": "完整正手和反手挥拍",
    "sourceFile": "wangqiu_01_012.mp4",
    "sourceStart": 0,
    "sourceEnd": 8,
    "track": "forehand",
    "phase": "full",
    "sequence": "tennis"
  },
  {
    "id": "tennis-forehand-backswing",
    "type": "tennis",
    "name": "Forehand · backswing",
    "zhName": "正手引拍",
    "sourceFile": "wangqiu_03_015.mp4",
    "sourceStart": 0,
    "sourceEnd": 4,
    "track": "forehand",
    "phase": "backswing",
    "sequence": "tennis"
  },
  {
    "id": "tennis-forehand-full",
    "type": "tennis",
    "name": "Forehand · complete stroke",
    "zhName": "完整正手挥拍",
    "sourceFile": "wangqiu_04_016.mp4",
    "sourceStart": 0,
    "sourceEnd": 6,
    "track": "forehand",
    "phase": "full",
    "sequence": "tennis"
  },
  {
    "id": "tennis-backhand-full",
    "type": "tennis",
    "name": "Backhand · complete stroke",
    "zhName": "完整反手挥拍",
    "sourceFile": "wangqiu_06_020.mp4",
    "sourceStart": 0,
    "sourceEnd": 8,
    "track": "backhand",
    "phase": "full",
    "sequence": "tennis"
  },
  {
    "id": "tennis-forehand-ready",
    "type": "tennis",
    "name": "Forehand · ready",
    "zhName": "正手准备",
    "sourceFile": "wangqiu_07_023.mp4",
    "sourceStart": 0,
    "sourceEnd": 5,
    "track": "forehand",
    "phase": "full",
    "sequence": "tennis"
  },
  {
    "id": "tennis-forehand-drop",
    "type": "tennis",
    "name": "Forehand · racket drop",
    "zhName": "正手降拍",
    "sourceFile": "wangqiu_12_030.mp4",
    "sourceStart": 1,
    "sourceEnd": 5,
    "track": "forehand",
    "phase": "drop",
    "sequence": "tennis"
  },
  {
    "id": "tennis-backhand-alternate",
    "type": "tennis",
    "name": "Backhand · complete stroke · take 9",
    "zhName": "完整反手挥拍 · 第9组",
    "sourceFile": "wangqiu_09_026.mp4",
    "sourceStart": 0,
    "sourceEnd": 8,
    "track": "backhand",
    "phase": "full",
    "sequence": "tennis"
  },
  {
    "id": "rowing-arms",
    "type": "rowing",
    "name": "Arms-only stroke",
    "zhName": "出手划",
    "sourceFile": "huachuan_01_Mandy_043.mp4",
    "sourceStart": 2,
    "sourceEnd": 6,
    "track": "rowing-arms",
    "phase": "full",
    "sequence": "rowing"
  },
  {
    "id": "rowing-half",
    "type": "rowing",
    "name": "Half stroke",
    "zhName": "1/2 划",
    "sourceFile": "huachuan_02_Mandy_045.mp4",
    "sourceStart": 0,
    "sourceEnd": 9,
    "track": "rowing-half",
    "phase": "full",
    "sequence": "rowing"
  },
  {
    "id": "rowing-full",
    "type": "rowing",
    "name": "Full stroke",
    "zhName": "全桨划",
    "sourceFile": "huachuan_03_Mandy_046.mp4",
    "sourceStart": 0,
    "sourceEnd": 8,
    "track": "rowing-full",
    "phase": "full",
    "sequence": "rowing"
  },
  {
    "id": "clay-full",
    "type": "clay",
    "name": "Complete shooting movement",
    "zhName": "完整的射击",
    "sourceFile": "sheji_01_006 (1).mp4",
    "sourceStart": 1,
    "sourceEnd": 22,
    "track": "clay-full",
    "phase": "full",
    "sequence": "clay"
  },
  {
    "id": "clay-ready",
    "type": "clay",
    "name": "Ready hold",
    "zhName": "持枪准备",
    "sourceFile": "sheji_02_008.mp4",
    "sourceStart": 2,
    "sourceEnd": 5,
    "track": "clay-ready",
    "phase": "full",
    "sequence": "clay"
  },
  {
    "id": "clay-mount",
    "type": "clay",
    "name": "Raise to cheek",
    "zhName": "举枪贴腮",
    "sourceFile": "sheji_03_009.mp4",
    "sourceStart": 1,
    "sourceEnd": 6,
    "track": "clay-mount",
    "phase": "full",
    "sequence": "clay"
  },
  {
    "id": "clay-lower",
    "type": "clay",
    "name": "Lower gun",
    "zhName": "下枪",
    "sourceFile": "sheji_04_010.mp4",
    "sourceStart": 1,
    "sourceEnd": 13,
    "track": "clay-lower",
    "phase": "full",
    "sequence": "clay"
  }
];

export const motionById = Object.fromEntries(motionClips.map(clip => [clip.id, clip]));
export const excludedMotionSources = ["wangqiu_02_013.mp4", "wangqiu_02_013(1).mp4", "wangqiu_08_024.mp4", "wangqiu_11_028.mp4"];
