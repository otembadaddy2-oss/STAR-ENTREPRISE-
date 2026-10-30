import numpy as np, subprocess, re, wave, sys, json
from numpy.fft import rfft, irfft
from music120 import build
SR=44100; FF=open('../ffpath').read().strip()
order=[('s1','clip_s1.mp4'),('s2','clip_s2e.mp4'),('s3','clip_s3c.mp4'),('s4','clip_s4.mp4'),('phone','phone_insert.mp4'),('s5','clip_s5.mp4'),
       ('s6a','clip_s6a.mp4'),('s6b','clip_s6b.mp4'),('s7','clip_s7.mp4'),('s8','clip_s8.mp4'),('s9','clip_s9.mp4'),('s10','clip_s10.mp4'),
       ('mosaic','mosaic.mp4'),('s12','clip_s12.mp4'),('end','endcard.mp4')]
def dur(p):
    o=subprocess.run([FF,'-i',p],capture_output=True,text=True).stderr
    h,m,s=re.search(r'Duration: (\d+):(\d+):([\d.]+)',o).groups(); return int(h)*3600+int(m)*60+float(s)
D={k:dur(p) for k,p in order}
OV={'phone':0.4,'s10':0.6,'s12':0.5}      # recouvrement avec le plan suivant
start={}; t=0.0
for k,p in order:
    start[k]=t; t+=D[k]-OV.get(k,0)
TOTAL=t+OV.get('s12',0)*0   # le dernier plan va jusqu'à la fin
TOTAL=start['end']+D['end']
print('offsets',{k:round(v,2) for k,v in start.items()},'total',round(TOTAL,2))
json.dump({'start':start,'dur':D,'total':TOTAL},open('timeline.json','w'))
# ---------- vidéo
inp=[]; fc=[]
for i,(k,p) in enumerate(order):
    inp+=['-i',p]; fc.append(f'[{i}:v]scale=1280:720:force_original_aspect_ratio=increase,crop=1280:720,setsar=1,fps=24,format=yuv420p,setpts=PTS-STARTPTS,settb=1/24,fps=24[v{i}]')
idx={k:i for i,(k,_) in enumerate(order)}
def xf(a,b,ov,name,tr='fade'): fc.append(f'[v{idx[a]}][v{idx[b]}]xfade=transition={tr}:duration={ov}:offset={D[a]-ov:.3f}[{name}]')
xf('phone','s5',0.4,'P1'); xf('s10','mosaic',0.6,'P2','fade'); xf('s12','end',0.5,'P3')
seq=['v0','v1','v2','v3','P1','v6','v7','v8','v9','v10','P2','P3']
fc.append(''.join(f'[{s}]' for s in seq)+f'concat=n={len(seq)}:v=1:a=0[vout]')
cmd=[FF,'-y','-loglevel','error']+inp+['-filter_complex',';'.join(fc),'-map','[vout]','-c:v','libx264','-crf','17','-preset','medium','-pix_fmt','yuv420p','master_video.mp4']
import os
if not os.path.exists("master_video.mp4"): subprocess.run(cmd,check=True)
print('vidéo ok',dur('master_video.mp4'))
# ---------- audio
n=int(TOTAL*SR)+SR
def load(path,ss=None,t=None):
    c=[FF,'-loglevel','error']+(['-ss',str(ss)] if ss else [])+(['-t',str(t)] if t else [])+['-i',path,'-vn','-f','f32le','-ac','2','-ar',str(SR),'-']
    raw=subprocess.run(c,capture_output=True).stdout; return np.frombuffer(raw,dtype=np.float32).reshape(-1,2).astype(np.float64)
dial=np.zeros((n,2))
def put(buf,sig,st,g=1.0,fin=0.03,fout=0.03):
    s=sig.copy(); a=int(fin*SR); b=int(fout*SR)
    if a>0 and len(s)>a: s[:a]*=np.linspace(0,1,a)[:,None]
    if b>0 and len(s)>b: s[-b:]*=np.linspace(1,0,b)[:,None]
    i=int(st*SR); j=min(len(buf),i+len(s)); buf[i:j]+=s[:j-i]*g
nxt={'phone':'s5','s10':'mosaic','s12':'end'}
prev={v:k for k,v in nxt.items()}
for k,p in order:
    if k in ('mosaic','end','phone'): continue
    a=load(p)
    if a.size==0: continue
    fi=OV[prev[k]] if k in prev else 0.03; fo=OV[k] if k in OV else 0.03
    put(dial,a,start[k],1.0,fi,fo)
# musique + sfx
music=build(TOTAL+1.0)[:n]
sfx=np.zeros((n,2)); rng=np.random.default_rng(5)
def tone(f,d,a=0.003,k=6): x=np.arange(int(d*SR))/SR; return np.sin(2*np.pi*f*x)*np.minimum(x/a,1)*np.exp(-x*k)
def sput(sig,st,g=1.0): put(sfx,np.stack([sig,sig],1),st,g,0,0)
ring=np.concatenate([tone(880,0.14,k=12),np.zeros(int(0.04*SR)),tone(1175,0.14,k=12),np.zeros(int(0.04*SR)),tone(1319,0.2,k=10),np.zeros(int(0.35*SR))])
ps=start['phone']
sput(ring,ps+0.05,0.30); sput(ring,ps+0.80,0.30)
sput(tone(1800,0.05,k=40),ps+1.50,0.3)                 # tap « répondre »
sput(tone(1400,0.12,k=18)+0.6*tone(2100,0.12,k=22),ps+1.85,0.25)   # bascule données mobiles
sput(tone(1800,0.05,k=40),ps+2.45,0.3)                 # tap KOMYO
sput(tone(1568,0.5,k=7)+0.5*tone(2093,0.5,k=9),ps+2.80,0.25)       # carillon d'ouverture
sput(tone(1800,0.05,k=40),ps+3.55,0.3)                 # tap « passer en vidéo »
x=np.arange(int(0.7*SR))/SR; w=np.convolve(rng.standard_normal(len(x)),np.ones(40)/40,'same'); sput(w*np.sin(np.pi*x/0.7)**2*0.8,ps+3.6,0.35)  # traversée
ms=start['mosaic']
for q,(dt,fq) in enumerate([(5.9,1568),(6.0,1760),(6.12,2093),(6.2,1397),(6.3,1976)]): sput(tone(fq,1.2,k=4)+0.4*tone(fq*2,1.2,k=6),ms+dt,0.16)  # trinquer
es=start['end']
sput(tone(2093,1.5,k=3)+0.5*tone(3136,1.5,k=4)+0.3*tone(4186,1.5,k=5),es+1.3,0.14)   # scintillement du logo
# voix officielle : « KOMYO, le monde en mouvement. »
vo=load('/home/user/STAR-ENTREPRISE-/starvibe/assets/audio/komyo-intro-voix-monde-v1.mp3',ss=7.62)
voice=np.zeros((n,2)); put(voice,vo,es+1.7,1.15,0.02,0.05)
# ducking : énergie de la parole (bande 250–3500 Hz) des plans + voix
def band(x):
    m=x.mean(1); N=len(m); S=rfft(m); f=np.fft.rfftfreq(N,1/SR); S[(f<250)|(f>3500)]=0; return irfft(S,N)
sp=band(dial+voice); w=int(0.05*SR); env=np.sqrt(np.convolve(sp**2,np.ones(w)/w,'same'))
db=20*np.log10(env+1e-9); act=np.clip((db+42)/10,0,1)           # 0 sous −42 dB, 1 au-dessus de −32 dB
act=np.convolve(act,np.ones(int(0.35*SR))/int(0.35*SR),'same'); act=np.clip(act*1.4,0,1)
duck=1-0.62*act
mix=dial*1.0+voice*1.0+music*0.17*duck[:,None]+sfx
mix[int(TOTAL*SR):]=0
pk=np.max(np.abs(mix)); print('pic avant norm',round(pk,2))
pcm=(np.clip(mix/ max(1.0,pk)*0.97,-1,1)*32767).astype('<i2')
with wave.open('master_mix.wav','wb') as wv: wv.setnchannels(2); wv.setsampwidth(2); wv.setframerate(SR); wv.writeframes(pcm[:int(TOTAL*SR)].tobytes())
np.save('music_only.npy',music[:int(TOTAL*SR)].astype(np.float32))
print('mix ok')
