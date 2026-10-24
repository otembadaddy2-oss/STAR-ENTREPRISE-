import numpy as np, subprocess, math
from PIL import Image, ImageDraw, ImageFont, ImageFilter
W,H,FPS=1280,720,24; DUR=11.5; N=int(DUR*FPS)
FB='/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf'; FR='/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf'
f=lambda s,b=False: ImageFont.truetype(FB if b else FR,s)
FF=open('../ffpath').read().strip()
CW,CH=396,223
def frames(path,start=0,dur=3.0):
    raw=subprocess.run([FF,'-loglevel','error','-ss',str(start),'-t',str(dur),'-i',path,'-vf',f'fps={FPS},scale=-2:{CH},crop={CW}:{CH}','-f','rawvideo','-pix_fmt','rgb24','-'],capture_output=True).stdout
    a=np.frombuffer(raw,dtype=np.uint8); n=len(a)//(CW*CH*3); return a[:n*CW*CH*3].reshape(n,CH,CW,3)
def boom(a):  # aller-retour pour tenir 10 s
    return np.concatenate([a,a[::-1][1:-1]],0)
V={'marie':boom(frames('clip_s11a.mp4')),'angele':boom(frames('clip_s11b.mp4')),'foel':boom(frames('clip_s11c.mp4')),
   'messie':boom(frames('clip_s11d.mp4')),'sita':boom(frames('clip_s9.mp4',start=9.0,dur=3.0))}
LOGO=Image.open('/home/user/STAR-ENTREPRISE-/assets/img/pub/komyo-logo-or-monde.png').convert('RGBA'); LOGO.thumbnail((CW-30,CH-20))
GOLD=(232,184,64)
X=[24,442,860]; Y=[62,350]
cells=[('marie',0,0,'BRAZZAVILLE · 12:00',0.0),('angele',1,0,'PARIS · 12:00',0.12),('foel',2,0,'MONTRÉAL · 06:00',0.24),
       ('messie',0,1,'TOKYO · 20:00',0.36),('logo',1,1,'',0.72),('sita',2,1,'ABIDJAN · 11:00',0.48)]
ease=lambda x: x*x*(3-2*x); clamp=lambda x,a=0,b=1: max(a,min(b,x))
def bg():
    a=np.zeros((H,W,3),np.float32); y=np.linspace(0,1,H)[:,None]; x=np.linspace(0,1,W)[None,:]
    a[...,0]=6+8*(1-y); a[...,1]=14+18*(1-y)*(0.4+0.6*x); a[...,2]=34+34*(1-y)
    return Image.fromarray(a.clip(0,255).astype('uint8')).convert('RGBA')
BG=bg()
def frame(i):
    t=i/FPS; im=BG.copy(); ov=Image.new('RGBA',(W,H),(0,0,0,0)); d=ImageDraw.Draw(ov)
    for name,cx,cy,label,t0 in cells:
        k=ease(clamp((t-t0)/0.4))
        if k<=0: continue
        x0,y0=X[cx],Y[cy]; s=0.88+0.12*k
        w,h=int(CW*s),int(CH*s); xx=x0+(CW-w)//2; yy=y0+(CH-h)//2
        if name=='logo':
            tile=Image.new('RGBA',(CW,CH),(10,20,46,255)); lg=LOGO.copy(); tile.alpha_composite(lg,((CW-lg.width)//2,(CH-lg.height)//2))
        else:
            fr=V[name][i%len(V[name])]; tile=Image.fromarray(fr).convert('RGBA')
            z=1+0.02*(t/DUR); 
        tile=tile.resize((w,h),Image.LANCZOS)
        tile.putalpha(int(255*k)); ov.alpha_composite(tile,(xx,yy))
        d.rectangle((xx,yy,xx+w,yy+h),outline=GOLD+(int(230*k),),width=2)
        if label: d.text((x0+CW//2,y0+CH+18),label,font=f(15,True),fill=(255,255,255,int(255*k)),anchor='mm')
    # légende finale
    c=ease(clamp((t-5.2)/0.8))*ease(clamp((DUR-t)/0.6+0.0)) if DUR-t<0.6 else ease(clamp((t-5.2)/0.8))
    if c>0: d.text((W//2,665),'Une gorgée. Un appel. Le monde se rapproche.',font=f(26,True),fill=(255,244,214,int(255*c)),anchor='mm')
    im.alpha_composite(ov)
    out=im.convert('RGB')
    if t<2.2:   # vu à travers la surface de l'eau : ondulations qui se calment, teinte bleu-vert, éclat doré
        a=np.asarray(out).astype(np.float32); A=16*(1-t/2.2)**2
        yy,xx=np.mgrid[0:H,0:W]
        dx=(A*np.sin(2*np.pi*(yy/48.0+t*2.6))).astype(np.int32); dy=(A*0.8*np.sin(2*np.pi*(xx/64.0+t*2.1))).astype(np.int32)
        a=a[np.clip(yy+dy,0,H-1),np.clip(xx+dx,0,W-1)]
        k=(1-t/2.2)**1.5; a=a*(1-0.35*k)+np.array([20,110,120],np.float32)*0.35*k+np.array([255,230,160],np.float32)*0.18*k
        out=Image.fromarray(a.clip(0,255).astype(np.uint8))
    return out
p=subprocess.Popen([FF,'-y','-loglevel','error','-f','rawvideo','-pix_fmt','rgb24','-s',f'{W}x{H}','-r',str(FPS),'-i','-','-c:v','libx264','-crf','16','-pix_fmt','yuv420p','mosaic.mp4'],stdin=subprocess.PIPE)
for i in range(N): p.stdin.write(frame(i).tobytes())
p.stdin.close(); p.wait(); print('ok',N)
