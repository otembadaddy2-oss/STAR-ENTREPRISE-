import numpy as np, subprocess, math, sys
from PIL import Image, ImageDraw, ImageFont, ImageFilter
W,H,FPS=1280,720,24
FF=open('../ffpath').read().strip()
FB='/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf'; FR='/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf'
f=lambda s,b=False: ImageFont.truetype(FB if b else FR,s)
K=Image.open('komyo_K_only.png').convert('RGBA')
LOGO=Image.open('logo2k.png').convert('RGBA')
GOLD=(232,184,64)
ease=lambda x: x*x*(3-2*x)
clamp=lambda x,a=0,b=1: max(a,min(b,x))
def coeffs(dst,src):
    A=[];B=[]
    for (x,y),(u,v) in zip(dst,src):
        A.append([x,y,1,0,0,0,-u*x,-u*y]); A.append([0,0,0,x,y,1,-v*x,-v*y]); B+= [u,v]
    return np.linalg.solve(np.array(A,float),np.array(B,float)).tolist()
def frames(path,t0,t1,box,size,fps=FPS):
    """images recadrées (x0,y0,x1,y1) -> size, boomerang prêt"""
    w=box[2]-box[0]; h=box[3]-box[1]
    cmd=[FF,'-loglevel','error','-ss',str(t0),'-t',str(t1-t0),'-i',path,'-vf',f'fps={fps},crop={w}:{h}:{box[0]}:{box[1]},scale={size[0]}:{size[1]}','-f','rawvideo','-pix_fmt','rgb24','-']
    raw=subprocess.run(cmd,capture_output=True,check=True).stdout
    n=len(raw)//(size[0]*size[1]*3)
    return [Image.fromarray(np.frombuffer(raw,np.uint8,size[0]*size[1]*3,i*size[0]*size[1]*3).reshape(size[1],size[0],3)) for i in range(n)]
def boom(fr,i):
    n=len(fr); p=i%(2*n-2) if n>1 else 0
    return fr[p if p<n else 2*n-2-p]
def rr_mask(size,r):
    m=Image.new('L',size,0); ImageDraw.Draw(m).rounded_rectangle((0,0,size[0]-1,size[1]-1),r,fill=255); return m
def chip(d,x,y,txt,fs=22,dot=True):
    w=int(d.textlength(txt,font=f(fs,True)))+(44 if dot else 24)
    d.rounded_rectangle((x,y,x+w,y+fs+22),(fs+22)//2,fill=(0,0,0,150))
    if dot: d.ellipse((x+14,y+(fs+22)//2-7,x+28,y+(fs+22)//2+7),fill=(58,210,98))
    d.text((x+(36 if dot else 12),y+(fs+22)//2),txt,font=f(fs,True),fill=(255,255,255),anchor='lm')
SW,SH=540,1120   # écran (2x)
def header(im,d,title='Appel vidéo',timer='00:12'):
    d.rectangle((0,0,SW,120),fill=(8,16,40))
    k=K.copy(); k.thumbnail((78,78)); im.paste(k,(24,20),k)
    d.text((112,40),'KOMYO',font=f(34,True),fill=GOLD,anchor='lm'); d.text((112,82),title,font=f(20),fill=(200,215,240),anchor='lm')
    d.rounded_rectangle((SW-150,38,SW-24,82),22,fill=(255,255,255,40)); d.text((SW-87,60),timer,font=f(22,True),fill=(255,255,255),anchor='mm')
def controls(im,d):
    y=SH-120; d.rectangle((0,y-24,SW,SH),fill=(8,16,40))
    for i,cx in enumerate((90,210,330)):
        d.ellipse((cx-40,y,cx+40,y+80),fill=(255,255,255,46))
        if i==0: d.rounded_rectangle((cx-9,y+20,cx+9,y+46),9,outline='white',width=4); d.line((cx,y+52,cx,y+60),fill='white',width=4)
        if i==1: d.rounded_rectangle((cx-20,y+26,cx+10,y+54),6,outline='white',width=4); d.polygon([(cx+12,y+34),(cx+24,y+27),(cx+24,y+53),(cx+12,y+46)],fill='white')
        if i==2: d.polygon([(cx-18,y+34),(cx-6,y+34),(cx+8,y+22),(cx+8,y+58),(cx-6,y+46),(cx-18,y+46)],fill='white'); d.arc((cx+4,y+28,cx+26,y+52),-50,50,fill='white',width=4)
    d.ellipse((SW-150,y-6,SW-30,y+86),fill=(226,58,58)); d.line((SW-112,y+30,SW-68,y+56),fill='white',width=6); d.line((SW-68,y+30,SW-112,y+56),fill='white',width=6)
def screen_1to1(main,selfv,label,timer):
    im=Image.new('RGB',(SW,SH),(8,16,40)); d=ImageDraw.Draw(im,'RGBA'); header(im,d,'Appel vidéo',timer)
    vh=SH-120-120-24
    im.paste(main.resize((SW-28,vh)),(14,126),rr_mask((SW-28,vh),34))
    chip(d,32,126+vh-70,label,22)
    if selfv is not None:
        sv=selfv.resize((120,160)); im.paste(sv,(SW-14-120-14,126+14),rr_mask((120,160),20)); d.rounded_rectangle((SW-14-120-14,126+14,SW-14-14,126+14+160),20,outline=(255,255,255,200),width=3)
    controls(im,d); return im
def screen_grid(tiles,labels,timer,online=5):
    im=Image.new('RGB',(SW,SH),(8,16,40)); d=ImageDraw.Draw(im,'RGBA'); header(im,d,'Groupe · %d en ligne'%online,timer)
    cw=(SW-14*3)//2; chh=(SH-120-120-24-14)//2
    for i,(t,lb) in enumerate(zip(tiles,labels)):
        x=14+(i%2)*(cw+14); y=126+(i//2)*(chh+14)
        im.paste(t.resize((cw,chh)),(x,y),rr_mask((cw,chh),28)); chip(d,x+10,y+chh-52,lb,17)
    controls(im,d); return im
def phone_layer(scr,rot=0,tilt=0.0):
    """téléphone avec cadre -> RGBA, rotation + légère perspective"""
    pw,ph=SW+44,SH+44
    ph_im=Image.new('RGBA',(pw+40,ph+40),(0,0,0,0)); d=ImageDraw.Draw(ph_im)
    d.rounded_rectangle((20,20,20+pw,20+ph),64,fill=(18,18,22,255),outline=(70,72,80,255),width=4)
    d.rounded_rectangle((26,26,14+pw,14+ph),58,outline=(40,42,50,255),width=3)
    ph_im.paste(scr,(42,42),rr_mask(scr.size,44))
    d.rounded_rectangle((pw//2-60,36,pw//2+100,56),10,fill=(5,5,8,255))   # îlot caméra
    if tilt:
        w,h=ph_im.size; s=tilt*w
        c=coeffs([(0,0),(w,0),(w,h),(0,h)],[(0,0+s*0.4),(w,0-s*0.0),(w,h+s*0.0),(0,h-s*0.4)])
        ph_im=ph_im.transform((w,h),Image.PERSPECTIVE,c,Image.BICUBIC)
    return ph_im.rotate(rot,resample=Image.BICUBIC,expand=True)
def fingers(base_phone_pos,size,skin,scale):
    """doigts/pouce simples, flous, qui tiennent le téléphone"""
    x,y,pw,ph=base_phone_pos
    L=Image.new('RGBA',(W,H),(0,0,0,0)); d=ImageDraw.Draw(L)
    dark=tuple(max(0,int(c*0.62)) for c in skin)
    # pouce à gauche + trois doigts derrière à droite
    d.ellipse((x-34*scale,y+ph*0.62,x+70*scale,y+ph*0.62+190*scale),fill=skin+(255,),outline=dark+(255,),width=3)
    for i in range(3):
        yy=y+ph*(0.50+0.10*i)
        d.rounded_rectangle((x+pw-26*scale,yy,x+pw+78*scale,yy+58*scale),int(28*scale),fill=skin+(255,),outline=dark+(255,),width=3)
    return L.filter(ImageFilter.GaussianBlur(1.2))
def compose(bg,scr,t,dur,skin,start_y=0.0,rot=-4,tilt=0.05,cx=0.60,ph_h=800,zoom_end=1.10,top=0.14):
    u=clamp(t/dur)
    z=1+(zoom_end-1)*ease(u)
    im=bg.copy().convert('RGBA')
    ph=phone_layer(scr,rot,tilt); sc=ph_h/ph.height*z; ph=ph.resize((int(ph.width*sc),int(ph.height*sc)),Image.LANCZOS)
    rise=ease(clamp(t/0.8)) if start_y else 1.0
    px=int(W*cx-ph.width/2+6*math.sin(t*1.7)); py=int(H*top+(1-rise)*H*0.9+4*math.sin(t*2.3))
    sh=Image.new('RGBA',im.size,(0,0,0,0)); ImageDraw.Draw(sh).rounded_rectangle((px+14,py+24,px+ph.width+14,py+ph.height+24),70,fill=(0,0,0,150)); sh=sh.filter(ImageFilter.GaussianBlur(26)); im.alpha_composite(sh)
    im.alpha_composite(ph,(px,py))
    return im.convert('RGB')
