import numpy as np
from numpy.fft import rfft, irfft
SR=44100
def _band(x,lo,hi):
    S=rfft(x); f=np.fft.rfftfreq(len(x),1/SR); S[(f<lo)|(f>hi)]=0; return irfft(S,len(x))
def water_sfx(total=13.0,seed=9):
    rng=np.random.default_rng(seed); n=int(total*SR); t=np.arange(n)/SR; out=np.zeros(n)
    # 0–6.2 s : l'eau coule dans le verre (puis gros plan sur le filet)
    pour=_band(rng.standard_normal(n),700,5200)*(0.5+0.5*np.sin(2*np.pi*0.9*t))**0.3
    env=np.clip(np.minimum(t/0.4,1)*np.clip((6.4-t)/1.0,0,1),0,1); out+=pour*env*0.28
    for _ in range(26):    # petites gouttes
        st=rng.uniform(0.3,6.0); i=int(st*SR); L=int(0.07*SR); x=np.arange(L)/SR
        f0=rng.uniform(1800,3600); out[i:i+L]+=np.sin(2*np.pi*(f0+900*x/0.07)*x)*np.exp(-x*45)*0.10
    # 5.8–9.8 s : dans le verre, son feutré + bulles
    rum=_band(rng.standard_normal(n),40,520)*(np.clip((t-5.8)/0.8,0,1))*np.clip((10.2-t)/0.8,0,1); out+=rum*0.40
    for _ in range(20):
        st=rng.uniform(6.0,9.6); i=int(st*SR); L=int(0.11*SR); x=np.arange(L)/SR
        f0=rng.uniform(380,800); out[i:i+L]+=np.sin(2*np.pi*(f0+1500*x/0.11)*x)*np.exp(-x*22)*0.12
    # scintillement doré quand les cinq visages apparaissent
    for k,(dt,fq) in enumerate([(9.3,1568),(9.42,2093),(9.54,2637)]):
        L=int(1.4*SR); x=np.arange(L)/SR; i=int(dt*SR); out[i:i+L]+=(np.sin(2*np.pi*fq*x)+0.4*np.sin(2*np.pi*2*fq*x))*np.exp(-x*3.2)*0.10
    m=np.max(np.abs(out)); out=out/m*0.9
    return np.stack([out,out],1)
