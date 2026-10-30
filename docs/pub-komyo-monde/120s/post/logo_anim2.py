import numpy as np, subprocess, math, sys
from PIL import Image, ImageDraw, ImageFont, ImageFilter
W,H,FPS=1280,720,24; DUR=float(sys.argv[1]) if len(sys.argv)>1 else 10.0; N=int(DUR*FPS)
FB='/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf'; FR='/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf'
f=lambda s,b=True: ImageFont.truetype(FB if b else FR,s)
FF=open('../ffpath').read().strip()
L=Image.open('logo2k.png').convert('RGBA'); LW,LH=L.size
S=700/LW; lw,lh=int(LW*S),int(LH*S); OX=(W-lw)//2; OY=14
Ls=L.resize((lw,lh),Image.LANCZOS); A=np.array(Ls); al=A[...,3]
def region(mask):
    B=A.copy(); B[...,3]=(al*mask).astype(np.uint8); return Image.fromarray(B)
yy,xx=np.mgrid[0:lh,0:lw]
def rows_of(y0,y1):
    m=np.zeros((lh,lw),np.float32); m[int(y0*S):int(y1*S),:]=1; return m
K_rows=rows_of(0,2190); WORD=rows_of(2190,2960); SLOG=rows_of(2960,3160); LINE=rows_of(3160,3369)
star_c=(3465*S,420*S); star_r=520*S; ball_c=(2331*S,525*S); ball_r=345*S
star_m=(((xx-star_c[0])**2+(yy-star_c[1])**2)<star_r**2).astype(np.float32)
ball_m=(((xx-ball_c[0])**2+(yy-ball_c[1])**2)<ball_r**2).astype(np.float32)*(1-star_m)
body_m=K_rows*(1-star_m)*(1-ball_m)
band=(al*WORD)>30; proj=np.convolve(band.sum(0).astype(float),np.ones(5)/5,'same'); cuts=[]
for c in (880,1670,2650,3340):
    c0=int(c*S); w0=int(120*S); seg=proj[c0-w0:c0+w0]; cuts.append(c0-w0+int(np.argmin(seg)))
edges=[0]+cuts+[lw]; letters=[]
for i in range(5):
    m=np.zeros((lh,lw),np.float32); m[:,edges[i]:edges[i+1]]=1; letters.append(region(WORD*m))
# slogan : une pièce par lettre (coupures aux colonnes vides)
sl=((al*SLOG)>30).sum(0); on=sl>0; runs=[]; i=0
while i<lw:
    if on[i]:
        j=i
        while j<lw and on[j]: j+=1
        runs.append((i,j)); i=j
    else: i+=1
merged=[]
for r in runs:
    if merged and r[0]-merged[-1][1]<3: merged[-1]=(merged[-1][0],r[1])
    else: merged.append(r)
slog_letters=[]
for (a0,a1) in merged:
    m=np.zeros((lh,lw),np.float32); m[:,a0:a1]=1; slog_letters.append(region(SLOG*m))
layers=dict(body=region(body_m),ball=region(ball_m),star=region(star_m),line=region(LINE))
def bbox(img): return img.split()[3].point(lambda v:255 if v>8 else 0).getbbox()
bb={k:bbox(v) for k,v in layers.items()}; lb=[bbox(l) for l in letters]; sb=[bbox(l) for l in slog_letters]
ease=lambda x: x*x*(3-2*x); clamp=lambda x,a=0,b=1: max(a,min(b,x))
def eo3(x): x=clamp(x); return 1-(1-x)**3
def elastic(x): x=clamp(x); return 1.0 if x>=1 else (0.0 if x<=0 else 1-math.exp(-6.5*x)*math.cos(11*x))
def back(x,s=1.9): x=clamp(x); return 1+(s+1)*(x-1)**3+s*(x-1)**2
a=np.zeros((H,W,3),np.float32); y=np.linspace(0,1,H)[:,None]; x=np.linspace(0,1,W)[None,:]
r=np.sqrt(((x-0.5)*1.5)**2+((y-0.4))**2)
a[...,0]=5+24*np.exp(-r*3.0); a[...,1]=9+30*np.exp(-r*3.0); a[...,2]=24+64*np.exp(-r*2.4)
BG=Image.fromarray(a.clip(0,255).astype('uint8')).convert('RGBA')
rng=np.random.default_rng(11); P=[(rng.uniform(0,W),rng.uniform(0,H),rng.uniform(0.3,1.0),rng.uniform(0,6.28)) for _ in range(70)]
GOLD=(255,214,102); CEN=(W/2,290)
BALL=(OX+ball_c[0],OY+ball_c[1]); STAR=(OX+star_c[0],OY+star_c[1])
DOTC=[(255,176,46),(236,70,52),(255,236,150)]
def paste(cv,img,box,scale=1.0,dx=0,dy=0,alpha=1.0,rot=0,clip=None,cen=None):
    if alpha<=0 or scale<=0 or box is None: return
    crop=img.crop(box)
    if clip is not None: crop=crop.crop(clip)
    w,h=crop.size
    if w<1 or h<1: return
    cx=OX+box[0]+(clip[0] if clip else 0)+w/2+dx; cy=OY+box[1]+(clip[1] if clip else 0)+h/2+dy
    nw,nh=max(1,int(w*scale)),max(1,int(h*scale))
    if (nw,nh)!=(w,h): crop=crop.resize((nw,nh),Image.LANCZOS)
    if rot: crop=crop.rotate(rot,resample=Image.BICUBIC,expand=True)
    if alpha<1: crop.putalpha(crop.split()[3].point(lambda v:int(v*alpha)))
    cv.alpha_composite(crop,(int(cx-crop.width/2),int(cy-crop.height/2)))
def stroke(d,pts,wmax,col,u0,u1,taper=True):
    n=len(pts); u0=clamp(u0); u1=clamp(u1)
    i0,i1=int(u0*(n-1)),int(u1*(n-1))
    if i1<=i0: return
    for i in range(i0,i1+1):
        u=(i-i0)/max(1,i1-i0)
        wd=wmax*(math.sin(math.pi*min(1,u*0.9+0.05))**0.6 if taper else 1)
        x_,y_=pts[i]; d.ellipse((x_-wd/2,y_-wd/2,x_+wd/2,y_+wd/2),fill=col)
def bez(p0,p1,p2,p3,n=60):
    out=[]
    for i in range(n):
        u=i/(n-1); out.append(tuple((1-u)**3*p0[k]+3*(1-u)**2*u*p1[k]+3*(1-u)*u**2*p2[k]+u**3*p3[k] for k in (0,1)))
    return out
cx0,cy0=CEN
STR=[bez((cx0-30,cy0+70),(cx0-190,cy0+110),(cx0-210,cy0-40),(cx0-120,cy0-80)),     # « ( » à gauche
     bez((cx0+4,cy0+90),(cx0-30,cy0+10),(cx0+30,cy0-30),(cx0+6,cy0-110)),            # trait central
     bez((cx0+40,cy0+70),(cx0+200,cy0+110),(cx0+210,cy0-40),(cx0+120,cy0-80))]       # « ) » à droite
TIPS=[STR[0][-1],STR[1][-1],STR[2][-1]]
def render(t):
    im=BG.copy(); ov=Image.new('RGBA',(W,H),(0,0,0,0)); d=ImageDraw.Draw(ov)
    for px,py,sp,ph in P:
        al_=int(120*(0.5+0.5*math.sin(t*1.7*sp+ph))*ease(clamp(t/1.0))); yq=(py-t*20*sp)%H; d.ellipse((px-2,yq-2,px+2,yq+2),fill=(232,184,64,al_))
    im.alpha_composite(ov); ov=Image.new('RGBA',(W,H),(0,0,0,0)); d=ImageDraw.Draw(ov)
    # --- iris d'ouverture (cercle doré qui s'ouvre sur le fond sombre)
    if t<0.75:
        r1=eo3(t/0.45)*950; r2=eo3((t-0.12)/0.5)*950
        if r1>0: d.ellipse((CEN[0]-r1,CEN[1]-r1,CEN[0]+r1,CEN[1]+r1),fill=GOLD+(int(255*(1-clamp((t-0.35)/0.4))),))
        if r2>0: d.ellipse((CEN[0]-r2,CEN[1]-r2,CEN[0]+r2,CEN[1]+r2),fill=(7,14,36,255))
    # --- disque doré coupé en deux, qui se resserre puis éclate en points
    if 0.3<t<1.45:
        u=clamp((t-0.3)/1.0); R=96*(1.0-0.30*ease(u))*back(clamp((t-0.3)/0.3),1.4)
        gap=18+10*math.sin(u*9)*(1-u); rot=8*math.sin(u*6)
        bx,by=bb['ball'][0],bb['ball'][1]
        bimg=layers['ball'].crop(bb['ball']); bw,bh=bimg.size
        # deux pièces : au-dessus / au-dessous d'une diagonale
        yb,xb=np.mgrid[0:bh,0:bw]; cx_,cy_=bw/2,bh/2
        mA=((yb-cy_)<-0.55*(xb-cx_)-6).astype(np.uint8)*255; mB=255-mA
        for m,sgn in ((mA,-1),(mB,1)):
            pc=bimg.copy(); pc.putalpha(Image.fromarray((np.array(pc.split()[3]).astype(np.float32)*(m/255.0)).astype(np.uint8)))
            sc=2*R/bw; pcr=pc.resize((int(bw*sc),int(bh*sc)),Image.LANCZOS)
            ox_=CEN[0]+sgn*gap*0.45*(-1 if sgn<0 else 1)*0.7; oy_=CEN[1]+sgn*gap*0.6
            fade=1-clamp((t-1.3)/0.12)
            if fade>0:
                pcr=pcr.rotate(rot*sgn,resample=Image.BICUBIC,expand=True)
                if fade<1: pcr.putalpha(pcr.split()[3].point(lambda v:int(v*fade)))
                ov.alpha_composite(pcr,(int(ox_-pcr.width/2),int(oy_-pcr.height/2)))
        for k in range(6):   # éclats triangulaires
            ang=k*1.05+u*2; dist=(60+40*k%50)*(0.5+u); px_=CEN[0]+math.cos(ang)*dist; py_=CEN[1]+math.sin(ang)*dist*0.8
            d.polygon([(px_,py_-5),(px_+4,py_+4),(px_-4,py_+4)],fill=GOLD+(int(200*(1-u)),))
    # --- éclatement en petits points
    if 1.3<t<1.6:
        u=(t-1.3)/0.3
        for k in range(5):
            ang=k*1.26+0.4; dist=40*eo3(u); rr=9*(1-0.5*u)
            d.ellipse((CEN[0]+math.cos(ang)*dist-rr,CEN[1]+math.sin(ang)*dist-rr,CEN[0]+math.cos(ang)*dist+rr,CEN[1]+math.sin(ang)*dist+rr),fill=GOLD+(int(255*(1-u)),))
    # --- trois traits de pinceau : tracé puis rétractation vers les pointes
    if 1.38<t<2.0:
        for si,pts in enumerate(STR):
            g=(t-1.38-si*0.03)
            ud=ease(clamp(g/0.28)); ur=ease(clamp((g-0.26)/0.34))
            if ud>0: stroke(d,pts,26-si*2,GOLD+(255,),min(ur,0.97),max(ud,ur+0.03))
    # --- gouttes (pointes) puis points en ligne
    if 1.86<t<2.5:
        gu=clamp((t-1.86)/0.22); cu=clamp((t-2.06)/0.22)
        for k in range(3):
            px_=cx0+(k-1)*62*(0.6+0.4*ease(cu)); py_=(cy0-70+(k%2)*8)*(1-ease(cu))+(cy0-12)*ease(cu)+ (math.sin(t*5+k)*3 if cu>=1 else 0)
            col=DOTC[k]; s_=1+0.35*math.sin(math.pi*cu)*(1-ease(cu)) 
            if cu<1:   # goutte : pointe vers le haut
                hh=44*(1-0.6*ease(cu))*gu; ww=20*(0.8+0.5*ease(cu))
                d.polygon([(px_,py_-hh*0.9),(px_+ww/2,py_+ww*0.1),(px_,py_+ww*0.55),(px_-ww/2,py_+ww*0.1)],fill=col+(255,))
                d.ellipse((px_-ww/2,py_-ww*0.3,px_+ww/2,py_+ww*0.7),fill=col+(255,))
            else:
                d.ellipse((px_-11,py_-11,px_+11,py_+11),fill=col+(255,))
    # --- voyage des points vers la place de la boule
    if 2.4<t<3.15:
        u=ease(clamp((t-2.4)/0.7))
        for k in range(3):
            sx=cx0+(k-1)*62*1.0+ (22 if t>2.28 else 0); sy=cy0-12+ (k-1)*16*clamp((t-2.28)/0.2)
            ex,ey=BALL[0]+(k-1)*3,BALL[1]+(k-1)*3
            px_=sx+(ex-sx)*u; py_=sy+(ey-sy)*u-math.sin(math.pi*u)*90*(1+0.3*k)
            rr=11*(1-0.35*u); col=DOTC[k]
            for tr in range(1,5): d.ellipse((px_-rr*0.8+(sx-ex)*0.012*tr,py_-rr*0.8,px_+rr*0.8+(sx-ex)*0.012*tr,py_+rr*0.8),fill=col+(int(70/tr),))
            d.ellipse((px_-rr,py_-rr,px_+rr,py_+rr),fill=col+(255,))
    elif t<=2.4 and 2.28<t:
        pass
    im.alpha_composite(ov)
    cv=Image.new('RGBA',(W,H),(0,0,0,0))
    # --- le logo se dessine
    ub=clamp((t-3.0)/0.6)
    if ub>0: paste(cv,layers['ball'],bb['ball'],scale=max(0.01,elastic(ub)),alpha=clamp(ub*4))
    ub2=clamp((t-2.65)/0.95)
    if ub2>0:
        x0,y0,x1,y1=bb['body']; m=Image.new('L',(x1-x0,y1-y0),0); md=ImageDraw.Draw(m); wd=x1-x0; hh=y1-y0
        thr=ease(ub2)*(wd+hh)*1.05; md.polygon([(0,hh),(thr,hh),(thr-hh*0.9,0),(0,0)],fill=255)
        b=layers['body'].crop((x0,y0,x1,y1)); b.putalpha(Image.composite(b.split()[3],Image.new('L',b.size,0),m)); cv.alpha_composite(b,(x0+OX,y0+OY))
    us=clamp((t-3.25)/0.55)
    if us>0: paste(cv,layers['star'],bb['star'],scale=max(0.01,elastic(us)),alpha=clamp(us*4))
    for k,(lg,bx) in enumerate(zip(letters,lb)):
        u=clamp((t-3.05-k*0.12)/0.55)
        if u>0 and bx: paste(cv,lg,bx,scale=max(0.01,elastic(u)),dy=(1-eo3(u))*55,alpha=clamp(u*4),rot=(1-eo3(u))*(-8 if k%2 else 8))
    order=[0,6,2,10,4,13,8,1,11,3,15,7,5,12,9,14,16,17,18,19,20]
    for rank,idx in enumerate(range(len(sb))):
        pos=(rank*7)%len(sb)
        u=clamp((t-3.7-pos*0.035)/0.45)
        if u>0 and sb[idx]: paste(cv,slog_letters[idx],sb[idx],scale=max(0.01,elastic(u)),dy=(1-eo3(u))*28,alpha=clamp(u*4))
    ul=clamp((t-4.55)/0.7)
    if ul>0 and bb['line']:
        x0,y0,x1,y1=bb['line']; wd=x1-x0; half=wd/2*ease(ul); c0=int(wd/2-half); c1=int(wd/2+half)+1
        paste(cv,layers['line'],bb['line'],clip=(c0,0,c1,y1-y0))
    # petit rebond de l'ensemble (comme dans ton exemple) : léger agrandissement qui se pose
    sc_all=1+0.06*math.exp(-(max(0,t-3.55))*5.5)*math.cos(max(0,t-3.55)*13)*(1 if t>3.55 else 0)
    if abs(sc_all-1)>1e-3:
        cv=cv.resize((int(W*sc_all),int(H*sc_all)),Image.LANCZOS); 
        lc=Image.new('RGBA',(W,H),(0,0,0,0)); lc.alpha_composite(cv,(int((W-cv.width)/2),int((H-cv.height)/2+ (sc_all-1)*40))); cv=lc
    sw=clamp((t-5.0)/1.1)
    if 0<sw<1:
        sh=Image.new('RGBA',(W,H),(0,0,0,0)); sd=ImageDraw.Draw(sh); sx=-150+sw*(W+300)
        sd.polygon([(sx,0),(sx+90,0),(sx+30,H),(sx-60,H)],fill=(255,248,220,170)); sh=sh.filter(ImageFilter.GaussianBlur(6))
        a_=np.array(cv)[...,3]; sa=np.array(sh); sa[...,3]=(sa[...,3].astype(np.float32)*a_/255).astype(np.uint8); cv.alpha_composite(Image.fromarray(sa))
    glow=cv.filter(ImageFilter.GaussianBlur(18)); ga=np.array(glow); ga[...,3]=(ga[...,3]*0.45).astype(np.uint8)
    im.alpha_composite(Image.fromarray(ga)); im.alpha_composite(cv)
    ov=Image.new('RGBA',(W,H),(0,0,0,0)); d=ImageDraw.Draw(ov)
    if t>3.4:
        for k in range(8):
            ph=t*1.6+k*0.8; al_=int(255*max(0,math.sin(ph))**3)
            sx=STAR[0]+math.cos(k*2.1)*(60+k*12); sy=STAR[1]+math.sin(k*1.7)*(40+k*10)
            d.line((sx-9,sy,sx+9,sy),fill=(255,244,200,al_),width=2); d.line((sx,sy-9,sx,sy+9),fill=(255,244,200,al_),width=2)
    n1=int(clamp((t-6.4)/0.9)*len('Télécharge KOMYO')); n2=int(clamp((t-7.4)/1.2)*len('komyo.starentreprise.com'))
    if n1: d.text((W//2,626),'Télécharge KOMYO'[:n1],font=f(36),fill=(255,244,214,255),anchor='mm')
    if n2: d.text((W//2,676),'komyo.starentreprise.com'[:n2],font=f(26,False),fill=(232,184,64,255),anchor='mm')
    im.alpha_composite(ov); return im.convert('RGB')
def frame(i):
    t=i/FPS
    if t<3.9:   # flou de mouvement sur la partie rapide
        subs=[render(t+(j-1)*(0.5/FPS)) for j in range(3)]
        arr=sum(np.asarray(s,dtype=np.float32) for s in subs)/3.0; out=Image.fromarray(arr.astype(np.uint8))
    else: out=render(t)
    fo=ease(clamp((DUR-t)/0.7)); fi=ease(clamp(t/0.15))
    if fo<1 or fi<1: out=Image.blend(Image.new('RGB',(W,H),(0,0,0)),out,min(fo,fi))
    return out
if __name__=='__main__':
    p=subprocess.Popen([FF,'-y','-loglevel','error','-f','rawvideo','-pix_fmt','rgb24','-s',f'{W}x{H}','-r',str(FPS),'-i','-','-c:v','libx264','-crf','15','-pix_fmt','yuv420p','logo_anim2.mp4'],stdin=subprocess.PIPE)
    for i in range(N): p.stdin.write(frame(i).tobytes())
    p.stdin.close(); p.wait(); print('ok',N,'lettres du slogan',len(sb))
