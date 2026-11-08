from PIL import Image, ImageDraw, ImageFont, ImageFilter
import sys
G='docs/komyo/guide-assets/'
SORA=G+'sora-800.ttf'; INTER=G+'inter-700.ttf'
logo=Image.open('starvibe/assets/img/pioupiou-logo-slogan.png').convert('RGBA')
def fit(draw,txt,maxw,size):
    while size>30:
        f=ImageFont.truetype(SORA,size)
        if draw.textlength(txt,font=f)<=maxw: return f
        size-=2
    return f
def make(src,code,l1,l2,age,out,srcimg=None):
    art=(srcimg or Image.open(src)).convert('RGB')
    W,H=720,1280
    bg=art.resize((W,H)).filter(ImageFilter.GaussianBlur(22))
    # voile clair pour la lisibilité du titre
    bg=Image.blend(bg,Image.new('RGB',(W,H),(255,255,255)),0.12)
    aw=570; ah=int(aw*16/9)  # 570x1013
    a=art.resize((aw,ah),Image.LANCZOS)
    mask=Image.new('L',(aw,ah),0); ImageDraw.Draw(mask).rounded_rectangle((0,0,aw-1,ah-1),30,fill=255)
    ax=(W-aw)//2; ay=H-ah-20
    frame=Image.new('RGB',(aw+12,ah+12),(255,255,255)); fm=Image.new('L',frame.size,0); ImageDraw.Draw(fm).rounded_rectangle((0,0,frame.size[0]-1,frame.size[1]-1),36,fill=255)
    bg.paste(frame,(ax-6,ay-6),fm); bg.paste(a,(ax,ay),mask)
    d=ImageDraw.Draw(bg)
    lw=190; lg=logo.resize((lw,int(lw*logo.size[1]/logo.size[0])),Image.LANCZOS); bg.paste(lg,(24,26),lg)
    # pastille orange
    pf=ImageFont.truetype(INTER,27); t=f'ÉPISODE {code} · {age}'
    tw=d.textlength(t,font=pf); px1=W-30; px0=int(px1-tw-52)
    d.rounded_rectangle((px0,56,px1,106),25,fill=(244,123,32)); d.text(((px0+px1)/2,81),t,font=pf,fill='white',anchor='mm')
    # titre : 1re ligne blanche, 2e ligne jaune, contour bleu foncé
    y=150
    for txt,col in ((l1,(255,255,255)),(l2,(255,210,31))):
        f=fit(d,txt,W-60,60)
        d.text((W/2+3,y+4),txt,font=f,fill=(20,40,110),anchor='ma',stroke_width=9,stroke_fill=(20,40,110))
        d.text((W/2,y),txt,font=f,fill=col,anchor='ma',stroke_width=7,stroke_fill=(28,63,148))
        y+=f.size+14
    bg.save(out,'WEBP',quality=80)
P='starvibe/assets/pioupiou/'
import shutil
eps=[('A6',"S'il te plaît !",'On demande poliment','3 À 6 ANS'),
     ('A7','Au revoir !',"On dit au revoir",'3 À 6 ANS'),
     ('A8','Les dents','du soir !','3 À 6 ANS'),
     ('A9','Bonne nuit papa,','bonne nuit maman !','3 À 6 ANS'),
     ('A10','Bravo !','Quelle belle journée !','3 À 6 ANS')]
import os
for c,l1,l2,age in eps:
    srcf=P+f'affiche_{c}-v1.webp'
    bak=f'/tmp/hym/orig_{c}.webp'
    if not os.path.exists(bak): shutil.copy(srcf,bak)
    make(bak,c,l1,l2,age,srcf)
hy=[('B1','end_congo','Hymne national','Congo-Brazzaville'),('B7','end_guinee','Hymne national','Guinée-Conakry'),('B8','end_cotedivoire','Hymne national',"Côte d'Ivoire")]
for c,n,l1,l2 in hy:
    vid={'B1':'congo','B7':'guinee','B8':'cotedivoire'}[c]
    os.system(f'ffmpeg -v error -y -ss {{}} -i /tmp/hym/full/{vid}.mp4 -frames:v 1 -vf scale=720:1280 /tmp/hym/clean_{c}.png'.format(0)) if False else None
for c,n,l1,l2 in hy:
    make(None,c,l1,l2,'4 À 6 ANS',P+f'affiche_{c}-v1.webp',srcimg=Image.open(f'/tmp/hym/clean_{c}.png'))
