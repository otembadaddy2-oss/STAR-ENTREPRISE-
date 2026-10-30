import numpy as np, subprocess, math
from PIL import Image, ImageDraw, ImageFont, ImageFilter
W,H,FPS=1280,720,24; DUR=11.35; N=int(DUR*FPS)
FB='/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf'; FR='/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf'
f=lambda s,b=False: ImageFont.truetype(FB if b else FR,s)
FF=open('../ffpath').read().strip()
LOGO=Image.open('/home/user/STAR-ENTREPRISE-/assets/img/pub/komyo-logo-or-monde.png').convert('RGBA'); LOGO.thumbnail((640,520))
ease=lambda x: x*x*(3-2*x); clamp=lambda x,a=0,b=1: max(a,min(b,x))
a=np.zeros((H,W,3),np.float32); yy=np.linspace(0,1,H)[:,None]; xx=np.linspace(0,1,W)[None,:]
r=np.sqrt(((xx-0.5)*1.6)**2+((yy-0.42))**2)
a[...,0]=5+22*np.exp(-r*3.2); a[...,1]=10+30*np.exp(-r*3.2); a[...,2]=26+60*np.exp(-r*2.6)
BG=Image.fromarray(a.clip(0,255).astype('uint8')).convert('RGBA')
rng=np.random.default_rng(11); P=[(rng.uniform(0,W),rng.uniform(0,H),rng.uniform(0.3,1.0),rng.uniform(0,6.28)) for _ in range(60)]
CTA1='Télécharge KOMYO'; CTA2='komyo.starentreprise.com'
def frame(i):
    t=i/FPS; im=BG.copy(); ov=Image.new('RGBA',(W,H),(0,0,0,0)); d=ImageDraw.Draw(ov)
    for px,py,sp,ph in P:    # poussière d'or
        al=int(120*(0.5+0.5*math.sin(t*1.7*sp+ph))*ease(clamp(t/1.2))); y=(py-t*18*sp)%H
        d.ellipse((px-2,y-2,px+2,y+2),fill=(232,184,64,al))
    k=ease(clamp((t-0.3)/1.4)); sc=0.92+0.08*ease(clamp(t/6.0))
    lg=LOGO.resize((int(LOGO.width*sc),int(LOGO.height*sc)),Image.LANCZOS)
    # balayage de lumière
    sweep=Image.new('RGBA',lg.size,(0,0,0,0)); sd=ImageDraw.Draw(sweep)
    sx=int((clamp((t-1.2)/1.6))*(lg.width+200))-100
    sd.polygon([(sx,0),(sx+60,0),(sx+20,lg.height),(sx-40,lg.height)],fill=(255,244,214,150))
    msk=lg.split()[3]; sw=Image.composite(sweep,Image.new('RGBA',lg.size,(0,0,0,0)),msk)
    lg2=lg.copy(); lg2.alpha_composite(sw)
    lg2.putalpha(Image.eval(lg2.split()[3],lambda v:int(v*k)))
    ov.alpha_composite(lg2,((W-lg2.width)//2,70))
    # texte tapé
    n1=int(clamp((t-3.0)/1.0)*len(CTA1)); n2=int(clamp((t-4.3)/1.3)*len(CTA2))
    if n1: d.text((W//2,630-0),CTA1[:n1],font=f(36,True),fill=(255,244,214,255),anchor='mm')
    if n2: d.text((W//2,676),CTA2[:n2],font=f(26,False),fill=(232,184,64,255),anchor='mm')
    im.alpha_composite(ov)
    out=im.convert('RGB')
    fin=1.0; fout=ease(clamp((DUR-t)/0.8))
    if fin<1 or fout<1:
        out=Image.blend(Image.new('RGB',(W,H),(0,0,0)),out,min(fin,fout))
    return out
p=subprocess.Popen([FF,'-y','-loglevel','error','-f','rawvideo','-pix_fmt','rgb24','-s',f'{W}x{H}','-r',str(FPS),'-i','-','-c:v','libx264','-crf','16','-pix_fmt','yuv420p','endcard.mp4'],stdin=subprocess.PIPE)
for i in range(N): p.stdin.write(frame(i).tobytes())
p.stdin.close(); p.wait(); print('ok',N)
