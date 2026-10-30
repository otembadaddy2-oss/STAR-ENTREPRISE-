import numpy as np
from numpy.fft import rfft, irfft
SR=44100
def build(total):
    n=int(total*SR); rng=np.random.default_rng(7)
    L=np.zeros((n,2))
    def env(length,a,d): x=np.arange(length)/SR; return np.minimum(x/a,1)*np.exp(-x/d)
    def note(f,dur,kind):
        Ln=int(dur*SR); x=np.arange(Ln)/SR
        if kind=='ep':  s=np.sin(2*np.pi*f*x)+0.35*np.sin(2*np.pi*2*f*x)*np.exp(-x*4)+0.12*np.sin(2*np.pi*3*f*x)*np.exp(-x*7); return s*env(Ln,0.008,0.9)*0.5
        if kind=='bass':s=np.sin(2*np.pi*f*x)+0.25*np.sin(2*np.pi*2*f*x); return s*env(Ln,0.02,0.55)*0.9
        if kind=='vibe':s=(np.sin(2*np.pi*f*x)+0.25*np.sin(2*np.pi*4*f*x)*np.exp(-x*5))*(1+0.15*np.sin(2*np.pi*5*x)); return s*env(Ln,0.004,0.8)*0.35
        if kind=='gtr': s=np.sin(2*np.pi*f*x)+0.5*np.sin(2*np.pi*2*f*x)*np.exp(-x*3)+0.25*np.sin(2*np.pi*3*f*x)*np.exp(-x*5); return s*env(Ln,0.003,0.5)*0.35
    mid=lambda m:440*2**((m-69)/12)
    BPM=76; beat=60/BPM; bar=4*beat
    def add(sig,start,pan=0.0,gain=1.0):
        i=int(start*SR)
        if i>=n or i<0: return
        j=min(n,i+len(sig)); s=sig[:j-i]*gain
        L[i:j,0]+=s*(1-max(pan,0)); L[i:j,1]+=s*(1+min(pan,0))
    prog=[[48,55,59,64,67],[45,52,55,60,64],[50,57,60,65,69],[43,50,53,59,62],[48,55,59,64,67],[45,52,55,60,64],[41,48,52,57,64],[43,50,53,59,62]]
    # niveau par section (temps en secondes)
    def lvl(t):
        if t<27: return 0.75
        if t<60: return 0.9
        if t<102: return 1.0
        return 1.1
    nb=int(total/bar)+1
    pent=[72,74,76,79,81,84,79,76]
    for b in range(nb):
        t0=b*bar; ch=prog[b%8]; g=lvl(t0)
        for k,m in enumerate(ch[1:]):
            add(note(mid(m),bar*0.95,'ep'),t0+k*0.02,-0.2+0.1*k,0.55*g)
            add(note(mid(m),bar*0.45,'ep'),t0+2*beat+k*0.025,0.2-0.1*k,0.40*g)
        add(note(mid(ch[0]),beat*1.8,'bass'),t0,0,0.55*g); add(note(mid(ch[0]+7 if b%2 else ch[0]),beat*1.4,'bass'),t0+2*beat,0,0.40*g)
        add(note(mid(ch[0]+12),beat*0.9,'bass'),t0+3.5*beat,0,0.22*g)
        if t0>=14:   # guitare claire arpégée
            for k,m in enumerate([ch[1]+12,ch[2]+12,ch[3]+12,ch[2]+12,ch[1]+12,ch[3]+12,ch[2]+12,ch[4]]):
                add(note(mid(m),beat*0.9,'gtr'),t0+k*beat*0.5,0.3 if k%2 else -0.3,0.35*g)
        if t0>=27:   # mélodie vibraphone
            for q,(off,idx) in enumerate([(0,0),(1.5,2),(2.5,1),(3.0,3)]):
                if (b+q)%3!=2: add(note(mid(pent[(b*2+idx)%8]),beat*2.2,'vibe'),t0+off*beat,0.25 if q%2 else -0.25,0.8*g)
    # percussion douce
    def brush(dur=0.18):
        x=np.arange(int(dur*SR))/SR; s=rng.standard_normal(len(x)); s=np.convolve(s,[1,-0.9],'same'); return s*np.exp(-x*22)*0.05
    def conga(f=190,dur=0.25):
        x=np.arange(int(dur*SR))/SR; return np.sin(2*np.pi*(f+60*np.exp(-x*30))*x)*np.exp(-x*14)*0.22
    for b in range(nb):
        t0=b*bar
        if t0>=7:
            for k in (1,3): add(brush(),t0+k*beat,0.1,1.0)
            for k in (0.5,2.5): add(brush(0.1)*0.5,t0+k*beat,-0.1,1.0)
        if t0>=27:
            for k,fq in ((0,180),(1.5,230),(2.5,200)): add(conga(fq),t0+k*beat,0.3,0.9)
        if t0>=60:
            for k in range(8): add(brush(0.06)*0.7,t0+k*beat*0.5,-0.2,1.0)
    # fin : arpège montant doré + accord final
    T=total-11.5
    for k,m in enumerate([60,64,67,71,72,76,79,83,84]): add(note(mid(m),1.6,'vibe'),T+k*0.22,0.0,1.0)
    for m in (48,55,64,67,72,76): add(note(mid(m),6.0,'ep'),total-9.0,0.0,0.7)
    ir=rng.standard_normal(int(1.8*SR))*np.exp(-np.arange(int(1.8*SR))/SR*2.4); ir[:50]=0
    N=len(L)+len(ir); out=np.zeros_like(L)
    for c in range(2): out[:,c]=irfft(rfft(L[:,c],N)*rfft(ir,N),N)[:len(L)]*0.02
    music=L*0.78+out*0.22*4
    music*=0.9/np.max(np.abs(music))
    t=np.arange(n)/SR; fade=np.minimum(1,t/1.5)*np.minimum(1,(total-t)/2.5); return music*fade[:,None]
