import numpy as np, subprocess, math
from PIL import Image, ImageDraw, ImageFont, ImageFilter
W,H,FPS=1280,720,24
DUR=4.2; N=int(DUR*FPS)
FB='/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf'; FR='/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf'
f=lambda s,b=False: ImageFont.truetype(FB if b else FR,s)
LOGO=Image.open('/home/user/STAR-ENTREPRISE-/assets/img/pub/komyo-logo-or-monde.png').convert('RGBA')
K=Image.open('/home/user/STAR-ENTREPRISE-/starvibe/assets/img/icons/komyo-k-v2.png').convert('RGBA')
ANG=Image.open('/home/user/STAR-ENTREPRISE-/docs/pub-komyo-monde/120s/personnages/angele.jpg').convert('RGB')
ANG=ANG.crop((60,40,660,640)).resize((200,200))
GOLD=(232,184,64); NAVY=(8,18,44)
ease=lambda x: x*x*(3-2*x)
clamp=lambda x,a=0,b=1: max(a,min(b,x))
def bg():
    a=np.zeros((H,W,3),np.float32); y=np.linspace(0,1,H)[:,None]; x=np.linspace(0,1,W)[None,:]
    a[...,0]=8+10*x*(1-y); a[...,1]=18+22*(1-y)*x; a[...,2]=44+40*(1-y)
    im=Image.fromarray(a.clip(0,255).astype('uint8'))
    d=ImageDraw.Draw(im,'RGBA')
    rng=np.random.default_rng(3)
    for _ in range(26):
        cx,cy,r=rng.integers(0,W),rng.integers(0,H),rng.integers(8,40); d.ellipse((cx-r,cy-r,cx+r,cy+r),fill=(232,184,64,rng.integers(10,30)))
    return im.filter(ImageFilter.GaussianBlur(6))
BG=bg()
def screen(t):
    """écran 300x620 du téléphone selon le temps t"""
    sw,sh=300,620
    im=Image.new('RGB',(sw,sh),(10,20,48)); d=ImageDraw.Draw(im,'RGBA')
    # dégradé
    for yy in range(sh): d.line((0,yy,sw,yy),fill=(10+int(14*yy/sh),22+int(26*yy/sh),52+int(40*yy/sh)))
    # barre d'état
    d.text((18,10),'12:00',font=f(13,True),fill=(255,255,255))
    data_on=t>=1.55
    # pastille « Données mobiles »
    if t>=1.45:
        k=ease(clamp((t-1.45)/0.25)); pw=int(150*k)
        if pw>20:
            d.rounded_rectangle((sw-pw-12,6,sw-12,30),12,fill=(255,255,255,40))
            if pw>120:
                d.text((sw-pw-2,11),'Données mobiles',font=f(10),fill=(255,255,255))
                sx=sw-50; on=ease(clamp((t-1.8)/0.25))
                d.rounded_rectangle((sx,11,sx+30,25),7,fill=(int(120-120*on+40*on),int(130+60*on),int(140-40*on),255) if False else ((80+int(-30*on),int(90+110*on),int(100-30*on),255)))
                d.ellipse((sx+2+int(16*on),13,sx+14+int(16*on),23),fill=(255,255,255))
    if data_on:
        for i,hh in enumerate((4,7,10,13)): d.rectangle((sw-92-(0),30,sw-92,30),fill=None)
    if t<1.55:   # ---- appel entrant
        d.text((sw//2,70),'Appel entrant',font=f(15),fill=(200,215,240),anchor='mm')
        pulse=(t*2.2)%1
        for r in (112,128):
            a=int(90*(1-pulse)) if r==128 else int(50)
            d.ellipse((sw//2-r-int(10*pulse),170-r//1-int(10*pulse)+ -0,sw//2+r+int(10*pulse),170+r+int(10*pulse)),outline=(232,184,64,a),width=2) if False else None
        cx,cy=sw//2,190
        for r,a in ((104+int(14*pulse),int(110*(1-pulse))),(104,60)):
            d.ellipse((cx-r,cy-r,cx+r,cy+r),outline=(232,184,64,a),width=3)
        m=Image.new('L',(200,200),0); ImageDraw.Draw(m).ellipse((0,0,199,199),fill=255); im.paste(ANG,(cx-100,cy-100),m)
        d.text((sw//2,332),'ANGÈLE',font=f(30,True),fill=(255,255,255),anchor='mm')
        d.text((sw//2,366),'PARIS',font=f(17,True),fill=(232,184,64),anchor='mm')
        # boutons
        d.ellipse((50,500,118,568),fill=(226,58,58)); d.line((70,520,98,548),fill='white',width=5); d.line((98,520,70,548),fill='white',width=5)
        gp=int(7*abs(math.sin(t*6)))
        d.ellipse((182-gp,500-gp,250+gp,568+gp),fill=(58,200,98)); d.ellipse((186,504,246,564),fill=(58,200,98))
        d.arc((198,518,232,552),200,340,fill='white',width=5)
        d.text((84,590),'Refuser',font=f(11),fill=(200,215,240),anchor='mm'); d.text((216,590),'Répondre',font=f(11),fill=(200,215,240),anchor='mm')
    elif t<2.75:   # ---- en appel, icône KOMYO
        d.text((sw//2,70),'En appel',font=f(15),fill=(200,215,240),anchor='mm')
        d.text((sw//2,96),f'00:0{int(clamp((t-1.55)*1.0,0,2.9))+1}',font=f(14,True),fill=(255,255,255),anchor='mm')
        cx,cy=sw//2,190
        m=Image.new('L',(120,120),0); ImageDraw.Draw(m).ellipse((0,0,119,119),fill=255); im.paste(ANG.resize((120,120)),(cx-60,cy-60-20),m)
        d.text((sw//2,300),'ANGÈLE · PARIS',font=f(16,True),fill=(255,255,255),anchor='mm')
        # grille d'icônes
        for i in range(6):
            gx=36+(i%3)*84; gy=360+(i//3)*84
            d.rounded_rectangle((gx,gy,gx+58,gy+58),16,fill=(255,255,255,28))
        # icône KOMYO (case 3), qui pulse puis est touchée
        gx,gy=36+2*84,360; pul=1+0.06*math.sin(t*9) if t>2.05 else 1
        sz=int(58*pul); ox=gx+29-sz//2; oy=gy+29-sz//2
        d.rounded_rectangle((ox,oy,ox+sz,oy+sz),16,fill=(14,26,60),outline=GOLD,width=2)
        kk=K.copy(); kk.thumbnail((int(sz*0.62),int(sz*0.62))); im.paste(kk,(ox+(sz-kk.width)//2,oy+(sz-kk.height)//2),kk)
        d.text((gx+29,gy+72),'KOMYO',font=f(10,True),fill=(255,255,255),anchor='mm')
        # doigt
        if 2.2<t<2.75:
            k=ease(clamp((t-2.2)/0.35)); fx=int(260-(260-(gx+29))*k); fy=int(560-(560-(gy+29))*k)
            d.ellipse((fx-20,fy-20,fx+20,fy+20),fill=(255,255,255,90),outline=(255,255,255,200),width=2)
    else:   # ---- application KOMYO
        k=ease(clamp((t-2.75)/0.35))
        d.rectangle((0,0,sw,sh),fill=(8,16,40))
        lg=LOGO.copy(); lg.thumbnail((int(250+20*k),int(250+20*k))); im.paste(lg,(sw//2-lg.width//2,130),lg)
        # bouton « passer en vidéo »
        bt=clamp((t-3.05)/0.3)
        d.rounded_rectangle((40,470,sw-40,526),28,fill=(232,184,64,int(255*bt)))
        d.text((sw//2,498),'Passer en vidéo',font=f(17,True),fill=(10,20,48),anchor='mm') if bt>0.5 else None
        if t>3.5:
            q=clamp((t-3.5)/0.25); cx,cy=sw//2,498
            d.ellipse((cx-16,cy-16,cx+16,cy+16),fill=(255,255,255,int(90*q)),outline=(255,255,255,200))
        if t>3.55:  # connexion
            ang=(t-3.55)*500
            d.arc((sw//2-30,570-30-20,sw//2+30,570+30-20),ang,ang+250,fill=GOLD,width=4)
    return im
def phone(t):
    sw,sh=300,620
    scr=screen(t)
    px,py=800,(H-650)//2
    shake=0
    if t<1.5: shake=int(4*math.sin(t*70)*(1-abs(((t*2.2)%1)-0.5)*0) )
    body=Image.new('RGBA',(330,650),(0,0,0,0)); d=ImageDraw.Draw(body)
    d.rounded_rectangle((0,0,329,649),44,fill=(28,30,36,255),outline=(90,95,110,255),width=3)
    msk=Image.new('L',(sw,sh),0); ImageDraw.Draw(msk).rounded_rectangle((0,0,sw-1,sh-1),34,fill=255)
    body.paste(scr,(15,15),msk)
    d.rounded_rectangle((120,22,210,40),9,fill=(8,8,10,255))
    return body,px+shake,py
def frame(i):
    t=i/FPS
    im=BG.copy().convert('RGBA')
    body,px,py=phone(t)
    # ombre
    sh=Image.new('RGBA',(W,H),(0,0,0,0)); ImageDraw.Draw(sh).rounded_rectangle((px+10,py+30,px+340,py+690),48,fill=(0,0,0,110)); im.alpha_composite(sh.filter(ImageFilter.GaussianBlur(18)))
    # entrée douce
    ent=ease(clamp(t/0.3)); 
    im.alpha_composite(body,(int(px),int(py+(1-ent)*40)))
    ov=Image.new('RGBA',(W,H),(0,0,0,0)); d2=ImageDraw.Draw(ov)
    steps=[(0.0,1.55,'1',['Angèle t\'appelle','depuis Paris']),(1.55,2.75,'2',['Active tes','données mobiles']),(2.75,3.7,'3',['Ouvre KOMYO','et passe en vidéo'])]
    for a_,b_,n,lines in steps:
        if a_<=t<b_:
            k=ease(clamp((t-a_)/0.25))
            x0=70-int((1-k)*30)
            d2.ellipse((x0,150,x0+72,222),fill=(232,184,64,int(255*k)))
            d2.text((x0+36,187),n,font=f(40,True),fill=(10,20,48,int(255*k)),anchor='mm')
            for li,txt in enumerate(lines):
                d2.text((x0+100,168+li*48+(0 if len(lines)==2 else 10)),txt,font=f(38,True),fill=(255,255,255,int(255*k)),anchor='lm')
    if 1.5<=t<2.75:
        k=ease(clamp((t-1.5)/0.3)); on=ease(clamp((t-1.8)/0.3))
        x0,y0=70-int((1-k)*30),340
        d2.rounded_rectangle((x0,y0,x0+420,y0+100),50,fill=(255,255,255,int(34*k)),outline=(255,255,255,int(130*k)),width=2)
        d2.text((x0+34,y0+50),'Données mobiles',font=f(26,True),fill=(255,255,255,int(255*k)),anchor='lm')
        sx=x0+318
        d2.rounded_rectangle((sx,y0+26,sx+80,y0+74),24,fill=(int(90-40*on),int(100+100*on),int(110-40*on),int(255*k)))
        d2.ellipse((sx+5+int(30*on),y0+31,sx+43+int(30*on),y0+69),fill=(255,255,255,int(255*k)))
        if on>0.9: d2.text((x0+210,y0+140),'ACTIVÉ',font=f(26,True),fill=(232,184,64,255),anchor='mm')
    im.alpha_composite(ov)
    out=im.convert('RGB')
    # zoom d'entrée dans l'écran (traversée) sur la fin
    z=clamp((t-3.7)/0.5)
    if z>0:
        s=1+ease(z)*5.0; cx,cy=965,H//2
        cw,ch=int(W/s),int(H/s); x0=int(max(0,min(W-cw,cx-cw//2))); y0=int(max(0,min(H-ch,cy-ch//2))); crop=out.crop((x0,y0,x0+cw,y0+ch)).resize((W,H),Image.LANCZOS)
        flash=ease(clamp((t-3.95)/0.25))
        out=Image.blend(crop,Image.new('RGB',(W,H),(255,244,214)),flash*0.9)
    return out
FF=open('../ffpath').read().strip()
p=subprocess.Popen([FF,'-y','-loglevel','error','-f','rawvideo','-pix_fmt','rgb24','-s',f'{W}x{H}','-r',str(FPS),'-i','-','-c:v','libx264','-crf','16','-pix_fmt','yuv420p','phone_insert.mp4'],stdin=subprocess.PIPE)
for i in range(N): p.stdin.write(frame(i).tobytes())
p.stdin.close(); p.wait(); print('ok',N)
