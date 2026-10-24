import numpy as np, subprocess, math, sys
from PIL import Image, ImageDraw, ImageFont, ImageFilter
W,H,FPS=1280,720,24; DUR=float(sys.argv[1]) if len(sys.argv)>1 else 9.6; N=int(DUR*FPS)
FB='/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf'; FR='/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf'
f=lambda s,b=True: ImageFont.truetype(FB if b else FR,s)
FF=open('../ffpath').read().strip()
L=Image.open('logo2k.png').convert('RGBA'); LW,LH=L.size
S=700/LW; lw,lh=int(LW*S),int(LH*S); OX=(W-lw)//2; OY=14
Ls=L.resize((lw,lh),Image.LANCZOS); A=np.array(Ls)
al=A[...,3]
def region(mask):
    B=A.copy(); B[...,3]=(al*mask).astype(np.uint8); return Image.fromarray(B)
yy,xx=np.mgrid[0:lh,0:lw]
sc=lambda v:v*S
# bandes verticales
def rows_of(y0,y1):
    m=np.zeros((lh,lw),np.float32); m[int(y0*S):int(y1*S),:]=1; return m
K_rows=rows_of(0,2190); WORD=rows_of(2190,2960); SLOG=rows_of(2960,3160); LINE=rows_of(3160,3369)
star_c=(3465*S,420*S); star_r=520*S; ball_c=(2331*S,525*S); ball_r=345*S
star_m=(((xx-star_c[0])**2+(yy-star_c[1])**2)<star_r**2).astype(np.float32)
ball_m=(((xx-ball_c[0])**2+(yy-ball_c[1])**2)<ball_r**2).astype(np.float32)*(1-star_m)
body_m=K_rows*(1-star_m)*(1-ball_m)
# lettres : coupures aux minima de projection
band=(al*WORD)>30; proj=band.sum(0).astype(float); proj=np.convolve(proj,np.ones(5)/5,'same')
cuts=[]
for c in (880,1670,2650,3340):
    c0=int(c*S); w0=int(120*S); seg=proj[c0-w0:c0+w0]; cuts.append(c0-w0+int(np.argmin(seg)))
edges=[0]+cuts+[lw]; letters=[]
for i in range(5):
    m=np.zeros((lh,lw),np.float32); m[:,edges[i]:edges[i+1]]=1; letters.append(region(WORD*m))
layers=dict(body=region(body_m),ball=region(ball_m),star=region(star_m),slog=region(SLOG),line=region(LINE))
def bbox(img): 
    b=img.split()[3].point(lambda v:255 if v>8 else 0).getbbox(); return b
bb={k:bbox(v) for k,v in layers.items()}; lb=[bbox(l) for l in letters]
ease=lambda x: x*x*(3-2*x); clamp=lambda x,a=0,b=1: max(a,min(b,x))
def back(x,s=1.7):
    x=clamp(x); return 1+(s+1)*(x-1)**3+s*(x-1)**2
# fond
a=np.zeros((H,W,3),np.float32); y=np.linspace(0,1,H)[:,None]; x=np.linspace(0,1,W)[None,:]
r=np.sqrt(((x-0.5)*1.5)**2+((y-0.4))**2)
a[...,0]=5+24*np.exp(-r*3.0); a[...,1]=9+30*np.exp(-r*3.0); a[...,2]=24+64*np.exp(-r*2.4)
BG=Image.fromarray(a.clip(0,255).astype('uint8')).convert('RGBA')
rng=np.random.default_rng(11); P=[(rng.uniform(0,W),rng.uniform(0,H),rng.uniform(0.3,1.0),rng.uniform(0,6.28)) for _ in range(70)]
GOLD=(255,214,102)
def paste_layer(canvas,img,box,scale=1.0,dx=0,dy=0,alpha=1.0,clip=None):
    if alpha<=0 or scale<=0: return
    crop=img.crop(box)
    if clip is not None: crop=crop.crop(clip)
    w,h=crop.size; nw,nh=max(1,int(w*scale)),max(1,int(h*scale))
    if (nw,nh)!=(w,h): crop=crop.resize((nw,nh),Image.LANCZOS)
    if alpha<1: crop.putalpha(crop.split()[3].point(lambda v:int(v*alpha)))
    cx=OX+box[0]+(clip[0] if clip else 0)+w/2+dx; cy=OY+box[1]+(clip[1] if clip else 0)+h/2+dy
    canvas.alpha_composite(crop,(int(cx-nw/2),int(cy-nh/2)))
BALL=(OX+ball_c[0],OY+ball_c[1]); STAR=(OX+star_c[0],OY+star_c[1])
def comet(t):
    ov=Image.new('RGBA',(W,H),(0,0,0,0)); d=ImageDraw.Draw(ov)
    p=clamp((t-0.15)/0.9)
    if 0<p<1.4:
        pts=[]
        for i in range(60):
            u=i/59*min(p,1)
            bx=(1-u)**2*(60)+2*(1-u)*u*(520)+u*u*STAR[0]; by=(1-u)**2*(640)+2*(1-u)*u*(520)+u*u*STAR[1]
            pts.append((bx,by))
        fade=1-clamp((t-1.05)/0.5)
        for wd,al_ in ((18,40),(8,110),(3,255)):
            d.line(pts,fill=GOLD+(int(al_*fade),),width=wd)
        ov=ov.filter(ImageFilter.GaussianBlur(1.5)) if fade>0 else ov
    return ov
def dots(t):
    ov=Image.new('RGBA',(W,H),(0,0,0,0)); d=ImageDraw.Draw(ov)
    cols=[(255,170,40),(255,90,70),(255,235,140)]
    for i,c in enumerate(cols):
        t0=0.55+i*0.18; u=(t-t0)/0.75
        if 0<=u<=1:
            sx=BALL[0]-200+i*180; sy=H+20
            px=sx+(BALL[0]-sx)*ease(u); py=sy+(BALL[1]-sy)*ease(u)-math.sin(math.pi*u)*140
            rad=14*(1-0.5*u)+4
            d.ellipse((px-rad,py-rad,px+rad,py+rad),fill=c+(255,))
            for k in range(1,5): d.ellipse((px-rad*0.7,py+k*10-rad*0.7,px+rad*0.7,py+k*10+rad*0.7),fill=c+(int(70/k),))
    return ov
def frame(i):
    t=i/FPS; im=BG.copy(); ov=Image.new('RGBA',(W,H),(0,0,0,0)); d=ImageDraw.Draw(ov)
    for px,py,sp,ph in P:
        al_=int(120*(0.5+0.5*math.sin(t*1.7*sp+ph))*ease(clamp(t/1.0))); yq=(py-t*20*sp)%H; d.ellipse((px-2,yq-2,px+2,yq+2),fill=(232,184,64,al_))
    im.alpha_composite(ov); ov=Image.new('RGBA',(W,H),(0,0,0,0))
    im.alpha_composite(comet(t)); im.alpha_composite(dots(t))
    cv=Image.new('RGBA',(W,H),(0,0,0,0))
    # boule
    ub=clamp((t-1.25)/0.55)
    if ub>0: paste_layer(cv,layers['ball'],bb['ball'],scale=back(ub,2.2),alpha=clamp(ub*3))
    # corps du K : balayage diagonal le long de la comète
    ub2=clamp((t-1.35)/1.0)
    if ub2>0:
        x0,y0,x1,y1=bb['body']; m=Image.new('L',(x1-x0,y1-y0),0); md=ImageDraw.Draw(m)
        wd=x1-x0; hh=y1-y0; thr=ease(ub2)*(wd+hh)*1.05
        md.polygon([(0,hh),(thr,hh),(thr-hh*0.9,0),(0,0)],fill=255)
        b=layers['body'].crop((x0,y0,x1,y1)); b.putalpha(Image.composite(b.split()[3],Image.new('L',b.size,0),m)); cv.alpha_composite(b,(OX*0+x0+OX,y0+OY)) if False else cv.alpha_composite(b,(x0+OX,y0+OY))
    # étoile
    us=clamp((t-2.0)/0.6)
    if us>0: paste_layer(cv,layers['star'],bb['star'],scale=back(us,2.5),alpha=clamp(us*3))
    # lettres KOMYO
    for k,(lg,bx) in enumerate(zip(letters,lb)):
        u=clamp((t-2.45-k*0.13)/0.5)
        if u>0 and bx: paste_layer(cv,lg,bx,scale=0.7+0.3*back(u,1.8),dy=(1-ease(u))*45,alpha=clamp(u*2.5))
    # slogan : ouverture depuis le centre
    uu=clamp((t-3.5)/0.9)
    if uu>0 and bb['slog']:
        x0,y0,x1,y1=bb['slog']; wd=(x1-x0); half=wd/2*ease(uu); c0=int(wd/2-half); c1=int(wd/2+half)+1
        if c1>c0: paste_layer(cv,layers['slog'],bb['slog'],clip=(c0,0,c1,y1-y0))
    ul=clamp((t-3.8)/0.8)
    if ul>0 and bb['line']:
        x0,y0,x1,y1=bb['line']; wd=(x1-x0); half=wd/2*ease(ul); c0=int(wd/2-half); c1=int(wd/2+half)+1
        paste_layer(cv,layers['line'],bb['line'],clip=(c0,0,c1,y1-y0))
    # reflet doré qui balaie le logo
    sw=clamp((t-4.7)/1.1)
    if 0<sw<1:
        sh=Image.new('RGBA',(W,H),(0,0,0,0)); sd=ImageDraw.Draw(sh); sx=-150+sw*(W+300)
        sd.polygon([(sx,0),(sx+90,0),(sx+30,H),(sx-60,H)],fill=(255,248,220,170)); sh=sh.filter(ImageFilter.GaussianBlur(6))
        a_=np.array(cv)[...,3]; sa=np.array(sh); sa[...,3]=(sa[...,3].astype(np.float32)*a_/255).astype(np.uint8); cv.alpha_composite(Image.fromarray(sa))
    # lueur douce autour du logo
    glow=cv.filter(ImageFilter.GaussianBlur(18)); ga=np.array(glow); ga[...,3]=(ga[...,3]*0.45).astype(np.uint8)
    im.alpha_composite(Image.fromarray(ga)); im.alpha_composite(cv)
    # étincelles finales
    ov=Image.new('RGBA',(W,H),(0,0,0,0)); d=ImageDraw.Draw(ov)
    if t>2.0:
        for k in range(8):
            ph=t*1.6+k*0.8; al_=int(255*max(0,math.sin(ph))**3)
            sx=STAR[0]+math.cos(k*2.1)*(60+k*12); sy=STAR[1]+math.sin(k*1.7)*(40+k*10)
            d.line((sx-9,sy,sx+9,sy),fill=(255,244,200,al_),width=2); d.line((sx,sy-9,sx,sy+9),fill=(255,244,200,al_),width=2)
    # appel à l'action
    n1=int(clamp((t-6.3)/0.9)*len('Télécharge KOMYO')); n2=int(clamp((t-7.3)/1.2)*len('komyo.starentreprise.com'))
    if n1: d.text((W//2,626),'Télécharge KOMYO'[:n1],font=f(36),fill=(255,244,214,255),anchor='mm')
    if n2: d.text((W//2,676),'komyo.starentreprise.com'[:n2],font=f(26,False),fill=(232,184,64,255),anchor='mm')
    im.alpha_composite(ov); out=im.convert('RGB')
    fo=ease(clamp((DUR-t)/0.7)); fi=ease(clamp(t/0.3))
    if fo<1 or fi<1: out=Image.blend(Image.new('RGB',(W,H),(0,0,0)),out,min(fo,fi))
    return out
if __name__=='__main__':
    p=subprocess.Popen([FF,'-y','-loglevel','error','-f','rawvideo','-pix_fmt','rgb24','-s',f'{W}x{H}','-r',str(FPS),'-i','-','-c:v','libx264','-crf','15','-pix_fmt','yuv420p','logo_anim.mp4'],stdin=subprocess.PIPE)
    for i in range(N): p.stdin.write(frame(i).tobytes())
    p.stdin.close(); p.wait(); print('ok',N, 'coupures lettres',edges)
