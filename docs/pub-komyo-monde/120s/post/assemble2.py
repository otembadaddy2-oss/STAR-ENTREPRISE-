import numpy as np, subprocess, re, wave, sys, json, os
from numpy.fft import rfft, irfft
sys.path.insert(0,'.')
from music120 import build
SR=44100; FF=open('../ffpath').read().strip()
SEG=[('s123','scenes_1_3_v4e.mp4',0,None),('insA','phone_insert.mp4',0,1.6),('s4','lip2_s4.mp4',0,None),('insB','phone_insert.mp4',1.6,None),
     ('s5','lip2_s5.mp4',0,None),('s6a','lip2_s6a.mp4',0,None),('s6b','s6b_complet.mp4',0,None),('s7','lip2_s7.mp4',0,None),
     ('s8','lip_s8.mp4',0,None),('s9','s9_complet.mp4',0,None),('fin','film_fin_v3.mp4',0,None)]
def dur(p):
    o=subprocess.run([FF,'-i',p],capture_output=True,text=True).stderr
    h,m,s=re.search(r'Duration: (\d+):(\d+):([\d.]+)',o).groups(); return int(h)*3600+int(m)*60+float(s)
def vdur(p,ss=0,to=None):
    c=[FF,'-hide_banner','-nostats']+(['-ss',str(ss)] if ss else [])+(['-t',str(to-ss)] if to else [])+['-i',p,'-an','-vf','fps=24','-f','null','-']
    o=subprocess.run(c,capture_output=True,text=True).stderr
    fr=int(re.findall(r'frame=\s*(\d+)',o)[-1]); return fr/24.0
D={}
for k,p,ss,to in SEG: D[k]=vdur(p,ss,to)
XF=0.8          # fondu s9 -> fin
start={}; t=0.0
for k,p,ss,to in SEG:
    start[k]=t; t+=D[k]-(XF if k=='s9' else 0)
TOTAL=t; print('offsets',{k:round(v,2) for k,v in start.items()},'total',round(TOTAL,2))
json.dump({'start':start,'dur':D,'total':TOTAL},open('timeline2.json','w'))
# ---------- vidéo
if not os.path.exists('master2_video.mp4'):
    inp=[]; fc=[]
    for i,(k,p,ss,to) in enumerate(SEG):
        inp+=(['-ss',str(ss)] if ss else [])+(['-t',str(to-ss)] if to else [])+['-i',p]
        fc.append(f'[{i}:v]scale=1280:720:force_original_aspect_ratio=increase,crop=1280:720,setsar=1,fps=24,format=yuv420p,setpts=PTS-STARTPTS,settb=1/24,fps=24[v{i}]')
    n=len(SEG); names=[f'v{i}' for i in range(n)]
    fc.append(f'[v9][v10]xfade=transition=fade:duration={XF}:offset={D["s9"]-XF:.3f}[X]')
    seq=names[:9]+['X']
    fc.append(''.join(f'[{s}]' for s in seq)+f'concat=n={len(seq)}:v=1:a=0[vout]')
    subprocess.run([FF,'-y','-loglevel','error']+inp+['-filter_complex',';'.join(fc),'-map','[vout]','-c:v','libx264','-crf','16','-preset','medium','-pix_fmt','yuv420p','master2_video.mp4'],check=True)
print('vidéo ok',dur('master2_video.mp4'))
# ---------- audio
n=int(TOTAL*SR)+SR*2
def load(path,ss=0,t=None):
    c=[FF,'-loglevel','error']+(['-ss',str(ss)] if ss else [])+(['-t',str(t)] if t else [])+['-i',path,'-vn','-f','f32le','-ac','2','-ar',str(SR),'-']
    raw=subprocess.run(c,capture_output=True).stdout; return np.frombuffer(raw,dtype=np.float32).reshape(-1,2).astype(np.float64)
def put(buf,sig,st,g=1.0,fin=0.02,fout=0.02):
    s=sig.copy(); a=int(fin*SR); b=int(fout*SR)
    if a>0 and len(s)>a: s[:a]*=np.linspace(0,1,a)[:,None]
    if b>0 and len(s)>b: s[-b:]*=np.linspace(1,0,b)[:,None]
    i=int(st*SR); j=min(len(buf),i+len(s)); buf[i:j]+=s[:j-i]*g
def speech_rms(a):
    m=a.mean(1); w=int(0.05*SR); k=len(m)//w
    r=np.sqrt((m[:k*w].reshape(k,w)**2).mean(1)); act=r[r>0.01]; return act.mean() if len(act) else 0.1
ref=0.07; r123=speech_rms(load('scenes_1_3_v4e.mp4')); print('voix S1-3',round(r123,3))
dial=np.zeros((n,2))
for k,p,ss,to in SEG:
    if k in ('insA','insB','fin'): continue
    a=load(p)
    if a.size==0: continue
    a=a[:int(D[k]*SR)]
    r=speech_rms(a); g=float(np.clip(ref/r,0.3,4.0)) if r>0 else 1.0; print(k,'voix',round(r,3),'gain',round(g,2))
    put(dial,a,start[k],g,0.02,0.03 if k!='s9' else XF)
rng=np.random.default_rng(11)
def band(x,lo,hi):
    S=rfft(x); f=np.fft.rfftfreq(len(x),1/SR); S[(f<lo)|(f>hi)]=0; return irfft(S,len(x))
def bed(k,lo,hi,g,mod=0.2):
    L=int(D[k]*SR); x=band(rng.standard_normal(L),lo,hi); tt=np.arange(L)/SR; x*=g*(0.7+0.3*np.sin(2*np.pi*mod*tt+rng.uniform(0,6)))
    s=np.stack([x,x],1); amb[:]=amb; put(amb,s,start[k],1.0,0.4,0.4)
amb=np.zeros((n,2))
for k in ('s4','s6a'): bed(k,200,1700,0.020)       # marché de Brazzaville
for k in ('s5','s6b'): bed(k,250,2000,0.016,0.13)  # café parisien
bed('s7',80,600,0.020); bed('s7',500,2400,0.008,0.31)   # salon, télé lointaine
bed('s8',200,2600,0.020,0.27)                      # rue de Tokyo la nuit
# musique
mm=build(start['fin']+XF+2.0); music=np.zeros((n,2)); music[:min(n,len(mm))]=mm[:n]
sfx=np.zeros((n,2))
def tone(f,d,a=0.003,k=6): x=np.arange(int(d*SR))/SR; return np.sin(2*np.pi*f*x)*np.minimum(x/a,1)*np.exp(-x*k)
def sput(sig,st,g=1.0): put(sfx,np.stack([sig,sig],1),st,g,0,0)
ring=np.concatenate([tone(880,0.14,k=12),np.zeros(int(0.04*SR)),tone(1175,0.14,k=12),np.zeros(int(0.04*SR)),tone(1319,0.2,k=10),np.zeros(int(0.35*SR))])
pa=start['insA']; sput(ring,pa+0.02,0.30); sput(tone(1800,0.05,k=40),pa+1.45,0.3)   # sonnerie + « répondre »
sput(tone(1800,0.05,k=40),start['s4']+5.0,0.28)                                      # Marie touche l'écran
pb=start['insB']
sput(tone(1400,0.12,k=18)+0.6*tone(2100,0.12,k=22),pb+0.25,0.25)        # données mobiles
sput(tone(1800,0.05,k=40),pb+0.85,0.3)                                    # tap KOMYO
sput(tone(1568,0.5,k=7)+0.5*tone(2093,0.5,k=9),pb+1.2,0.25)             # carillon d'ouverture
sput(tone(1800,0.05,k=40),pb+1.95,0.3)                                    # « passer en vidéo »
x=np.arange(int(0.7*SR))/SR; w=np.convolve(rng.standard_normal(len(x)),np.ones(40)/40,'same'); sput(w*np.sin(np.pi*x/0.7)**2*0.8,pb+2.0,0.35)
sput(tone(1760,0.35,k=7),start['s7']+1.9,0.16)                            # notification de Foel
sput(tone(1568,0.35,k=7)+0.5*tone(2349,0.35,k=8),start['s8']+0.2,0.14)    # notification de Messie
# plan final (eau → Clémence → logo) : son propre mixage
fin=load('film_fin_v3.mp4'); fine=np.zeros((n,2)); put(fine,fin,start['fin'],1.0,XF,0.02)
# ducking de la musique sous les voix
def bnd(x):
    m=x.mean(1); N=len(m); S=rfft(m); f=np.fft.rfftfreq(N,1/SR); S[(f<250)|(f>3500)]=0; return irfft(S,N)
sp=bnd(dial); w=int(0.05*SR); env=np.sqrt(np.convolve(sp**2,np.ones(w)/w,'same'))
db=20*np.log10(env+1e-9); act=np.clip((db+42)/10,0,1)
act=np.convolve(act,np.ones(int(0.35*SR))/int(0.35*SR),'same'); act=np.clip(act*1.4,0,1); duck=1-0.62*act
part1=dial+amb+music*0.17*duck[:,None]+sfx
fo=int(XF*SR); e=int((start['fin']+XF)*SR); part1[e-fo:e]*=np.linspace(1,0,fo)[:,None]; part1[e:]=0
mix=part1+fine
pk=np.max(np.abs(mix)); print('pic',round(pk,2))
pcm=(np.clip(mix/max(1.0,pk)*0.97,-1,1)*32767).astype('<i2')[:int(TOTAL*SR)]
with wave.open('master2_mix.wav','wb') as wv: wv.setnchannels(2); wv.setsampwidth(2); wv.setframerate(SR); wv.writeframes(pcm.tobytes())
print('mix ok')
