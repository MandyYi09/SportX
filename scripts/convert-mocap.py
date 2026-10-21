"""Convert supplied 120 Hz BVH into float32 local rotations. No fitting or smoothing."""
from pathlib import Path
import json,re,math,struct,hashlib
ROOT=Path(__file__).resolve().parents[1]
OUT=ROOT/'src/assets/mocap';OUT.mkdir(parents=True,exist_ok=True)
def multiply(a,b):
 x,y,z,w=a;X,Y,Z,W=b
 return [w*X+x*W+y*Z-z*Y,w*Y-x*Z+y*W+z*X,w*Z+x*Y-y*X+z*W,w*W-x*X-y*Y-z*Z]
def rotate(q,v):
 x,y,z,w=q;X,Y,Z=v;tx=2*(y*Z-z*Y);ty=2*(z*X-x*Z);tz=2*(x*Y-y*X)
 return [X+w*tx+y*tz-z*ty,Y+w*ty+z*tx-x*tz,Z+w*tz+x*ty-y*tx]
def forward(meta,row):
 ps=[];qs=[]
 for i,off in enumerate(meta['offsets']):
  p=meta['parents'][i];q=row[3+i*4:7+i*4]
  if p<0:ps.append(row[:3]);qs.append(q)
  else:ps.append([a+b for a,b in zip(ps[p],rotate(qs[p],off))]);qs.append(multiply(qs[p],q))
 return dict(zip(meta['names'],ps))
SOURCES=[
 ('rowing-arms','huachuan_01*skeleton_2.bvh','rowing'),
 ('rowing-half','huachuan_02*skeleton_2.bvh','rowing'),
 ('rowing-full','huachuan_03*skeleton_2.bvh','rowing'),
 ('tennis-combined','wangqiu_01*skeleton_1.bvh','tennis'),
 ('tennis-backswing','wangqiu_03* (2).bvh','tennis'),
 ('tennis-ready','wangqiu_07*skeleton_1.bvh','tennis'),
 ('tennis-drop','wangqiu_12*skeleton_1.bvh','tennis'),
 ('tennis-backhand-alternate','wangqiu_09*skeleton_1.bvh','tennis'),
 ('tennis-forehand','wangqiu_04*skeleton_1.bvh','tennis'),
 ('tennis-backhand','wangqiu_06*skeleton_1.bvh','tennis'),
 ('clay-full','sheji_01* (1).bvh','clay'),
 ('clay-ready','sheji_02*skeleton_0.bvh','clay'),
 ('clay-mount','sheji_03*skeleton_0.bvh','clay'),
 ('clay-lower','sheji_04*skeleton_0.bvh','clay'),
]
index={}
for key,pattern,sport in SOURCES:
 matches=list((ROOT/'source').rglob(pattern));assert len(matches)==1,(pattern,matches);path=matches[0];text=path.read_text();header,motion=text.split('MOTION');lines=motion.strip().splitlines();dt=float(lines[1].split(':')[1]);rows=[[float(v) for v in line.split()] for line in lines[2:]]
 names=[];parents=[];offsets=[];channels=[];stack=[];pending=None
 for line in header.splitlines():
  s=line.strip()
  if s.startswith(('ROOT ','JOINT ')):
   pending=len(names);names.append(s.split()[1]);parents.append(stack[-1] if stack else -1);offsets.append(None);channels.append(None)
  elif s.startswith('End Site'):pending=-1
  elif s=='{':stack.append(pending)
  elif s=='}':stack.pop()
  elif s.startswith('OFFSET ') and stack[-1]>=0:offsets[stack[-1]]=[float(v)*.01 for v in s.split()[1:]]
  elif s.startswith('CHANNELS '):channels[stack[-1]]=s.split()[2:]
 assert len(rows)==int(lines[0].split(':')[1]);assert all(len(r)==sum(map(len,channels)) for r in rows)
 packed=[]
 for row in rows[1:]:
  cursor=0;position=[0,0,0];rotations=[]
  for i,chans in enumerate(channels):
   q=[0,0,0,1]
   for channel,value in zip(chans,row[cursor:cursor+len(chans)]):
    axis='XYZ'.index(channel[0])
    if channel.endswith('position'):position[axis]=value*.01
    else:
     half=math.radians(value)/2;axisq=[0,0,0,math.cos(half)];axisq[axis]=math.sin(half);q=multiply(q,axisq)
   cursor+=len(chans);rotations.extend(q)
  packed.append(position+rotations)
 assert any(abs(a-b)>1e-5 for a,b in zip(packed[0],packed[-1])), 'Static skeleton: '+path.name
 meta={'id':key,'sport':sport,'source':path.name,'sourceSha256':hashlib.sha256(path.read_bytes()).hexdigest(),'sourceFrames':len(rows),'removedFrames':1,'frameTime':dt,'frames':len(packed),'duration':(len(packed)-1)*dt,'stride':len(packed[0]),'names':names,'parents':parents,'offsets':offsets,'binary':key+'.bin','units':'metres'}
 # One rigid global transform preserves source proportions, rotations and root motion.
 first=forward(meta,packed[0]);hip=first['Hips'];feet=[(a+b)/2 for a,b in zip(first['LeftFoot'],first['RightFoot'])];direction=[feet[0]-hip[0],0,feet[2]-hip[2]]
 if sport=='rowing':
  yaw=math.atan2(-direction[2],-direction[0])
 else:
  toe=[(first['LeftToeBase'][i]+first['RightToeBase'][i]-first['LeftFoot'][i]-first['RightFoot'][i])/2 for i in range(3)]
  yaw=math.atan2(-toe[0],toe[2])
 q=[0,math.sin(yaw/2),0,math.cos(yaw/2)];rotHip=rotate(q,hip)
 lowest=min(forward(meta,row)[name][1] for row in packed for name in ['LeftFoot','RightFoot','LeftToeBase','RightToeBase'])
 meta['alignment']={'yaw':yaw,'translation':[(.24 if sport=='rowing' else 0)-rotHip[0],(.17 if sport=='rowing' else .08)-lowest,-rotHip[2]]}
 (OUT/(key+'.bin')).write_bytes(struct.pack('<'+'f'*(len(packed)*meta['stride']),*(v for row in packed for v in row)))
 (OUT/(key+'.json')).write_text(json.dumps(meta,ensure_ascii=False),encoding='utf-8');index[key]=meta
 print(key,'frames',meta['frames'],'duration',round(meta['duration'],3),'first joints',first['LeftHand'],first['RightHand'],'feet',feet,'align',meta['alignment'])
(OUT/'index.json').write_text(json.dumps(index,ensure_ascii=False),encoding='utf-8')
