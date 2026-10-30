import numpy as np, subprocess, wave
from numpy.fft import rfft, irfft
FF=open('../ffpath').read().strip(); SR=44100
def run(a): subprocess.run([FF,'-y','-loglevel','error']+a,check=True)
def ld(p):
    return np.frombuffer(subprocess.run([FF,'-loglevel','error','-i',p,'-vn','-f','f32le','-ac','2','-ar',str(SR),'-'],capture_output=True).stdout,dtype=np.float32).reshape(-1,2).astype(np.float64)
# ---- vidéo
V=lambda i,pre='' : f'[{i}:v]{pre}scale=1280:720,setsar=1,format=yuv420p,setpts=PTS-STARTPTS,settb=1/24,fps=24'
A_D,B_D,T0,T1=3.9,2.9,8.0,10.0
fc=[V(0,'')+'[s1]',V(1,f'trim=0:{A_D},')+'[a]',V(2,f'trim=0:{B_D},')+'[b]',V(3,f'trim={T0}:{T1},')+'[t]',V(4,'')+'[s3]']
# S1 -> A (xfade .3), puis coupes franches A|B|t, puis t -> S3 (xfade .3)
s1=7.04; XA=0.3; offA=s1-XA
fc.append(f'[a][b][t]concat=n=3:v=1:a=0,setpts=PTS-STARTPTS,settb=1/24,fps=24[mid]')
fc.append(f'[s1][mid]xfade=transition=fade:duration={XA}:offset={offA:.3f},setpts=PTS-STARTPTS,settb=1/24,fps=24[x1]')
mid_len=A_D+B_D+(T1-T0); XB=0.3; offB=offA+mid_len-XB+XA - XA  # offset relatif au flux x1 (dont la durée = offA+mid_len)
offB=offA+mid_len-XB
fc.append(f'[x1][s3]xfade=transition=fade:duration={XB}:offset={offB:.3f}[v]')
run(['-i','clip_s1.mp4','-i','lip3_s2A.mp4','-i','lip3_s2B.mp4','-i','clip_s2e.mp4','-i','lip3_s3.mp4','-filter_complex',';'.join(fc),'-map','[v]','-c:v','libx264','-crf','17','-pix_fmt','yuv420p','-profile:v','high','s123n_video.mp4'])
tA=offA; tB=tA+A_D; tT=tB+B_D; tS3=offB; total=tS3+6.04
print('A',tA,'B',tB,'tail',tT,'S3',tS3,'total',round(total,2))
# ---- audio
n=int(total*SR); mix=np.zeros((n,2))
def put(x,t0,g=1.0,fi=0.0,fo=0.0):
    x=x.copy()
    if fi: m=int(fi*SR); x[:m]*=np.linspace(0,1,m)[:,None]
    if fo: m=int(fo*SR); x[-m:]*=np.linspace(1,0,m)[:,None]
    i=int(t0*SR); j=min(n,i+len(x)); mix[i:j]+=x[:j-i]*g
s1a=ld('clip_s1.mp4')[:int(s1*SR)]; put(s1a,0,1.0,fo=XA)
put(ld('lip3_s2A.mp4')[:int(A_D*SR)],tA,1.0,fi=0.02,fo=0.05)
put(ld('lip3_s2B.mp4')[:int(B_D*SR)],tB,1.0,fi=0.02,fo=0.05)
put(ld('lip3_s3.mp4')[:int(6.04*SR)],tS3,1.0,fi=0.02)
rng=np.random.default_rng(11)
def band(x,lo,hi):
    S=rfft(x); f=np.fft.rfftfreq(len(x),1/SR); S[(f<lo)|(f>hi)]=0; return irfft(S,len(x))
t=np.arange(n)/SR
amb=band(rng.standard_normal(n),250,2200)*(0.55+0.25*np.sin(2*np.pi*0.11*t))*0.03
amb*=np.clip((t-(s1-0.6))/0.6,0,1)          # entre en douceur à la fin du plan 1
amb=np.stack([amb,amb],1); mix+=amb
def tone(f,d,k): x=np.arange(int(d*SR))/SR; return np.sin(2*np.pi*f*x)*np.exp(-x*k)
for dt,f in ((0.5,2600),(0.62,3100),(0.78,2800)): put(np.stack([tone(f,0.25,22)]*2,1),tT+dt,0.05)   # pièces
put(np.stack([band(rng.standard_normal(int(0.35*SR)),800,5000)*np.sin(np.pi*np.arange(int(0.35*SR))/int(0.35*SR))**2]*2,1),tT+1.25,0.05)  # paquet
mix*=1.0
pk=np.max(np.abs(mix)); print('pic',round(pk,3))
if pk>0.95: mix*=0.95/pk
w=wave.open('s123n_audio.wav','wb'); w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR); w.writeframes((mix*32767).astype('<i2').tobytes()); w.close()
run(['-i','s123n_video.mp4','-i','s123n_audio.wav','-map','0:v','-map','1:a','-c:v','copy','-c:a','aac','-b:a','160k','-t',str(total),'-movflags','+faststart','scenes_1_3_v5.mp4'])
