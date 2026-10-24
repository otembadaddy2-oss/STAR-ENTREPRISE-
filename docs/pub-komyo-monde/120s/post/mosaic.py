import numpy as np, subprocess, math
from PIL import Image, ImageDraw, ImageFont
W,H,FPS=1280,720,24; DUR=8.0; N=int(DUR*FPS)
FB='/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf'
f=lambda s,b=True: ImageFont.truetype(FB,s)
FF=open('../ffpath').read().strip()
TW,TH=248,560            # cases verticales, plus grandes
GAP=6; X0=(W-(5*TW+4*GAP))//2; Y0=48
SH=650                    # hauteur de travail (léger zoom sur les visages)
def frames(path,cx,oy,start=0,dur=3.0):
    sw=int(1280*SH/716)
    raw=subprocess.run([FF,'-loglevel','error','-ss',str(start),'-t',str(dur),'-i',path,'-vf',f'fps={FPS},scale={sw}:{SH}','-f','rawvideo','-pix_fmt','rgb24','-'],capture_output=True).stdout
    a=np.frombuffer(raw,dtype=np.uint8); n=len(a)//(sw*SH*3); a=a[:n*sw*SH*3].reshape(n,SH,sw,3)
    x0=int(max(0,min(sw-TW,cx*sw-TW/2))); y0=int(max(0,min(SH-TH,oy)))
    return a[:,y0:y0+TH,x0:x0+TW]
def boom(a): return np.concatenate([a,a[::-1][1:-1]],0)
T=[('marie','clip_s6a.mp4',0.41,10,2.4,'BRAZZAVILLE · 12:00',0.0),
   ('angele','clip_s11b.mp4',0.58,15,0,'PARIS · 12:00',0.12),
   ('foel','clip_s11c.mp4',0.27,45,0,'MONTRÉAL · 06:00',0.24),
   ('messie','clip_s11d.mp4',0.41,10,0,'TOKYO · 20:00',0.36),
   ('sita','clip_s9.mp4',0.43,0,9.0,'ABIDJAN · 11:00',0.48)]
V={n:boom(frames(p,cx,oy,st)) for n,p,cx,oy,st,_,_ in T}
GOLD=(232,184,64)
ease=lambda x: x*x*(3-2*x); clamp=lambda x,a=0,b=1: max(a,min(b,x))
a_=np.zeros((H,W,3),np.float32); y=np.linspace(0,1,H)[:,None]; x=np.linspace(0,1,W)[None,:]
a_[...,0]=6+8*(1-y); a_[...,1]=14+18*(1-y)*(0.4+0.6*x); a_[...,2]=34+34*(1-y)
BG=Image.fromarray(a_.clip(0,255).astype('uint8')).convert('RGBA')
def frame(i):
    t=i/FPS; im=BG.copy(); ov=Image.new('RGBA',(W,H),(0,0,0,0)); d=ImageDraw.Draw(ov)
    for idx,(name,_,_,_,_,label,t0) in enumerate(T):
        k=ease(clamp((t-t0)/0.4))
        if k<=0: continue
        x0=X0+idx*(TW+GAP); s=0.9+0.1*k; w,h=int(TW*s),int(TH*s); xx=x0+(TW-w)//2; yy=Y0+(TH-h)//2
        tile=Image.fromarray(V[name][i%len(V[name])]).convert('RGBA').resize((w,h),Image.LANCZOS); tile.putalpha(int(255*k)); ov.alpha_composite(tile,(xx,yy))
        d.rectangle((xx,yy,xx+w,yy+h),outline=GOLD+(int(230*k),),width=2)
        d.text((x0+TW//2,Y0+TH+22),label,font=f(15),fill=(255,255,255,int(255*k)),anchor='mm')
    c=ease(clamp((t-3.2)/0.8))
    if c>0: d.text((W//2,676),'Une gorgée. Un appel. Le monde se rapproche.',font=f(28),fill=(255,244,214,int(255*c)),anchor='mm')
    im.alpha_composite(ov); out=im.convert('RGB')
    u=min(t/2.2,(DUR-t)/1.6)
    if u<1:   # vu à travers la surface de l'eau
        a=np.asarray(out).astype(np.float32); A=16*(1-u)**2
        yy_,xx_=np.mgrid[0:H,0:W]
        dx=(A*np.sin(2*np.pi*(yy_/48.0+t*2.6))).astype(np.int32); dy=(A*0.8*np.sin(2*np.pi*(xx_/64.0+t*2.1))).astype(np.int32)
        a=a[np.clip(yy_+dy,0,H-1),np.clip(xx_+dx,0,W-1)]
        k=(1-u)**1.5; a=a*(1-0.14*k)+np.array([150,160,160],np.float32)*0.14*k+np.array([255,236,190],np.float32)*0.10*k
        out=Image.fromarray(a.clip(0,255).astype(np.uint8))
    return out
p=subprocess.Popen([FF,'-y','-loglevel','error','-f','rawvideo','-pix_fmt','rgb24','-s',f'{W}x{H}','-r',str(FPS),'-i','-','-c:v','libx264','-crf','16','-pix_fmt','yuv420p','mosaic.mp4'],stdin=subprocess.PIPE)
for i in range(N): p.stdin.write(frame(i).tobytes())
p.stdin.close(); p.wait(); print('ok',N)
