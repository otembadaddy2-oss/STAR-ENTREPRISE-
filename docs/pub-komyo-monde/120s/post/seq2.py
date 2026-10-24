import numpy as np, wave, subprocess, re
from watersfx import water_sfx, SR
from music120 import build
FF=open('../ffpath').read().strip()
def dur(p):
    o=subprocess.run([FF,'-i',p],capture_output=True,text=True).stderr; h,m,s=re.search(r'Duration: (\d+):(\d+):([\d.]+)',o).groups(); return int(h)*3600+int(m)*60+float(s)
# plans : (fichier, durée utilisée, recouvrement avec le suivant)
seg=[('clip_fv.mp4',3.6,0.4),('clip_w3b.mp4',3.4,0.4),('clip_w3c_crop.mp4',4.0,0.6),('mosaic.mp4',8.0,0.8),('clip_cb.mp4',6.0,0.3),('clip_cp.mp4',5.0,0.0)]
inp=[];fc=[]
for i,(f,d,o) in enumerate(seg):
    inp+=['-i',f]; fc.append(f'[{i}:v]trim=0:{d},scale=1280:720,setsar=1,format=yuv420p,setpts=PTS-STARTPTS,settb=1/24,fps=24[v{i}]')
cur='v0'; L=seg[0][1]; starts=[0.0]
for i in range(1,len(seg)):
    ov=seg[i-1][2]; off=L-ov; fc.append(f'[{cur}][v{i}]xfade=transition=fade:duration={ov}:offset={off:.3f}[x{i}]'); cur=f'x{i}'; starts.append(off); L=off+seg[i][1]
subprocess.run([FF,'-y','-loglevel','error']+inp+['-filter_complex',';'.join(fc),'-map',f'[{cur}]','-c:v','libx264','-crf','18','-pix_fmt','yuv420p','seq2_video.mp4'],check=True)
print('starts',[round(s,2) for s in starts],'total',round(L,2))
tot=L; n=int(tot*SR)
def load(p):
    return np.frombuffer(subprocess.run([FF,'-loglevel','error','-i',p,'-vn','-f','f32le','-ac','2','-ar',str(SR),'-'],capture_output=True).stdout,dtype=np.float32).reshape(-1,2).astype(np.float64)
t_in=starts[2]-0.3
sfx=np.zeros((n,2)); w=water_sfx(starts[3]+3,t_in=t_in,t_end=starts[3]+0.6,t_shim=starts[3]-0.2); sfx[:min(n,len(w))]=w[:n]
mus=build(tot)[:n]
voice=np.zeros((n,2)); v=load('voix/clemence_test1.mp3'); i0=int((starts[5]+0.3)*SR); voice[i0:i0+len(v)]=v[:n-i0]*1.1
t=np.arange(n)/SR; duck=1-0.55*np.clip((t-(starts[5]-0.2))/0.5,0,1)
mix=sfx*0.9+mus*0.17*duck[:,None]+voice; mix*=0.92/np.max(np.abs(mix))
with wave.open('seq2_audio.wav','wb') as wv: wv.setnchannels(2); wv.setsampwidth(2); wv.setframerate(SR); wv.writeframes((mix*32767).astype('<i2').tobytes())
subprocess.run([FF,'-y','-loglevel','error','-i','seq2_video.mp4','-i','seq2_audio.wav','-map','0:v','-map','1:a','-c:v','copy','-c:a','aac','-b:a','160k','-shortest','sequence_eau_clemence_v4.mp4'],check=True)
print('ok')
