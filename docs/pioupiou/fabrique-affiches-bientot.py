# Affiches « bientôt » des packs C (Compter) et D (Alphabet) — dessinées sans IA (logo officiel PIOUPIOU + pastilles colorées).
from PIL import Image, ImageDraw, ImageFont
G='docs/komyo/guide-assets/'
SORA=G+'sora-800.ttf'; INTER=G+'inter-700.ttf'
logo=Image.open('starvibe/assets/img/pioupiou-logo-slogan.png').convert('RGBA')
W,H=720,1280
COL=[(239,83,80),(255,167,38),(255,213,0),(102,187,106),(66,165,245),(171,71,188)]
def grad(c1,c2):
    im=Image.new('RGB',(W,H)); d=ImageDraw.Draw(im)
    for y in range(H):
        t=y/H; d.line((0,y,W,y),fill=tuple(int(c1[i]*(1-t)+c2[i]*t) for i in range(3)))
    return im
def titre(d,txt,y,col,size=64):
    f=ImageFont.truetype(SORA,size)
    while d.textlength(txt,font=f)>W-70: size-=2; f=ImageFont.truetype(SORA,size)
    d.text((W/2+3,y+4),txt,font=f,fill=(20,40,110),anchor='ma',stroke_width=9,stroke_fill=(20,40,110))
    d.text((W/2,y),txt,font=f,fill=col,anchor='ma',stroke_width=7,stroke_fill=(28,63,148))
    return size
def poster(code,l1,l2,symboles,out,c1,c2,nb):
    bg=grad(c1,c2); d=ImageDraw.Draw(bg)
    lw=250; lg=logo.resize((lw,int(lw*logo.size[1]/logo.size[0])),Image.LANCZOS); bg.paste(lg,(24,26),lg)
    pf=ImageFont.truetype(INTER,27); t=f'PACK {code} · BIENTÔT'; tw=d.textlength(t,font=pf); px1=W-30; px0=int(px1-tw-52)
    d.rounded_rectangle((px0,56,px1,106),25,fill=(244,123,32)); d.text(((px0+px1)/2,81),t,font=pf,fill='white',anchor='mm')
    s=titre(d,l1,300,(255,255,255)); titre(d,l2,300+s+14,(255,210,31))
    # grille de pastilles
    cols=3; r=96; gap=34; x0=(W-(cols*2*r+(cols-1)*gap))//2; y0=560
    ff=ImageFont.truetype(SORA,110)
    for i,sy in enumerate(symboles):
        cx=x0+r+(i%cols)*(2*r+gap); cy=y0+r+(i//cols)*(2*r+gap)
        c=COL[i%len(COL)]
        d.ellipse((cx-r+5,cy-r+8,cx+r+5,cy+r+8),fill=(20,40,110))
        d.ellipse((cx-r,cy-r,cx+r,cy+r),fill=c,outline='white',width=8)
        d.text((cx,cy-4),sy,font=ff,fill='white',anchor='mm',stroke_width=5,stroke_fill=(28,63,148))
    nf=ImageFont.truetype(INTER,34)
    d.rounded_rectangle((90,1130,W-90,1210),40,fill=(255,255,255)); d.text((W/2,1170),f'{nb} vidéos · le prix sera annoncé à la sortie',font=ImageFont.truetype(INTER,25),fill=(28,63,148),anchor='mm')
    bg.save(out,'WEBP',quality=82)
P='starvibe/assets/pioupiou/'
poster('C','Compter','avec PIOUPIOU',['1','2','3','4','5','6'],P+'affiche_C-bientot-v1.webp',(120,190,255),(255,236,170),10)
poster('D',"L'alphabet",'avec PIOUPIOU',['A','B','C','D','E','F'],P+'affiche_D-bientot-v1.webp',(255,196,120),(190,230,255),8)
