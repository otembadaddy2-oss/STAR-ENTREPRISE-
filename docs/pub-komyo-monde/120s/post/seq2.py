import numpy as np, wave, subprocess, re
from watersfx import water_sfx, SR
from music120 import build
FF=open('../ffpath').read().strip()
def dur(p):
    o=subprocess.run([FF,'-i',p],capture_output=True,text=True).stderr; h,m,s=re.search(r'Duration: (\d+):(\d+):([\d.]+)',o).groups(); return int(h)*3600+int(m)*60+float(s)
# plans : (fichier, durée utilisée, recouvrement avec le suivant)
seg=[('clip_fv.mp4',3.6,0.4),('clip_w3b.mp4',3.4,0.4),('clip_w3c_crop.mp4',4.0,0.6),('mosaic.mp4',8.0,0.8),('clip_cb.mp4',6.0,0.3),('clip_cp.mp4',5.0,0.4),('logo_anim.mp4',9.6,0.0)]
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
LS=starts[6]
rng=np.random.default_rng(3)
def tone(f,d,a=0.003,k=6): x=np.arange(int(d*SR))/SR; return np.sin(2*np.pi*f*x)*np.minimum(x/a,1)*np.exp(-x*k)
def sput(sig,st,g=1.0):
    i=int(st*SR); j=min(n,i+len(sig)); sfx[i:j,0]+=sig[:j-i]*g; sfx[i:j,1]+=sig[:j-i]*g
x=np.arange(int(0.9*SR))/SR; wsh=np.convolve(rng.standard_normal(len(x)),np.ones(30)/30,'same'); sput(wsh*np.sin(np.pi*x/0.9)**2*0.9,LS+0.15,0.30)        # comète
for k,dt in enumerate((0.95,1.15,1.35)): sput(tone(900+k*220,0.18,k=14),LS+dt,0.18)                                                             # points qui rebondissent
sput(tone(660,0.6,k=5)+0.5*tone(990,0.6,k=6),LS+1.3,0.22)                                                                                         # la boule s'installe
sput(tone(2093,1.2,k=3.5)+0.5*tone(3136,1.2,k=4)+0.3*tone(4186,1.2,k=5),LS+2.05,0.16)                                                           # étoile
for k in range(5): sput(tone(520+k*95,0.25,k=10),LS+2.45+k*0.13,0.16)                                                                             # lettres
x=np.arange(int(0.9*SR))/SR; sw=np.convolve(rng.standard_normal(len(x)),np.ones(8)/8,'same'); sput(sw*np.sin(np.pi*x/0.9)**2*0.35,LS+3.5,0.18)  # slogan
sput(tone(1568,1.5,k=2.5)+tone(2093,1.5,k=2.8)+0.6*tone(2637,1.5,k=3),LS+4.9,0.15)                                                              # reflet
vo=load('/home/user/STAR-ENTREPRISE-/starvibe/assets/audio/komyo-intro-voix-monde-v1.mp3')[int(7.62*SR):]
i1=int((LS+2.3)*SR); voice[i1:i1+len(vo)]+=vo[:max(0,n-i1)]*1.15
env=np.convolve(np.abs(voice).mean(1),np.ones(int(0.25*SR))/int(0.25*SR),'same'); duck=1-0.6*np.clip(env/0.03,0,1)
mix=sfx*0.9+mus*0.17*duck[:,None]+voice; mix*=0.92/np.max(np.abs(mix))
with wave.open('seq2_audio.wav','wb') as wv: wv.setnchannels(2); wv.setsampwidth(2); wv.setframerate(SR); wv.writeframes((mix*32767).astype('<i2').tobytes())
subprocess.run([FF,'-y','-loglevel','error','-i','seq2_video.mp4','-i','seq2_audio.wav','-map','0:v','-map','1:a','-c:v','copy','-c:a','aac','-b:a','160k','-shortest','film_fin_v1.mp4'],check=True)
print('ok')
