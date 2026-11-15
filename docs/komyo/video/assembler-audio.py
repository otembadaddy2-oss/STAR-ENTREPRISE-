# Assemble la bande son de la vidéo de démonstration (adelay + amix). Voix de Keydou = Chloé (I6eWD84OrEngt4S4Antm, eleven_v4) avec le réglage
# « [warm, friendly, smiling] » comme dans la v6 de Keydou du 11/11 ; narratrice = Clémence (LFo5X4P9PhYaOLBA9Hyh).
# Les fichiers kt1..kt4 (Keydou), n0..n6 (narratrice) sont à regénérer avec ElevenLabs si besoin (non conservés dans le dépôt).
import subprocess
A='/tmp/video/audio/'; R='/home/user/STAR-ENTREPRISE-/'
sched=[(A+'n0.mp3',0.5,1.0),(R+'starvibe/assets/audio/komyo-intro-voix-monde-v2.mp3',10.0,0.9),(A+'n1.mp3',21.9,1.0),(A+'n2.mp3',32.2,1.0),(A+'kt1.mp3',38.6,1.0),
 (A+'kt2.mp3',53.0,1.0),(A+'n3.mp3',63.6,1.0),(A+'kt3.mp3',68.5,1.0),(A+'n4.mp3',76.5,1.0),(A+'kt4.mp3',80.8,1.0),(A+'n5b.mp3',90.6,1.0),(A+'n6.mp3',121.4,1.0)]
cmd=['ffmpeg','-y','-v','error']
for f,_,_ in sched: cmd+=['-i',f]
fc=["[%d:a]adelay=%d|%d,volume=%.2f[a%d]"%(i,int(s*1000),int(s*1000),v,i) for i,(f,s,v) in enumerate(sched)]
fc.append("".join("[a%d]"%i for i in range(len(sched)))+"amix=inputs=%d:normalize=0:dropout_transition=0,apad=whole_dur=139,atrim=0:139[aout]"%len(sched))
cmd+=['-filter_complex',";".join(fc),'-map','[aout]','-c:a','aac','-b:a','192k','/tmp/video/out/audio2.m4a']
subprocess.run(cmd,check=True)
