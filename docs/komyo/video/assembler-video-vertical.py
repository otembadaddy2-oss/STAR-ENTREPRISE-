import json, bisect, math, subprocess, os
from PIL import Image, ImageDraw, ImageFont, ImageChops
G='/home/user/STAR-ENTREPRISE-/docs/komyo/guide-assets/'; R='/home/user/STAR-ENTREPRISE-/'
W,H=1080,1920; FPS=25; TOTAL=126.0
F=lambda n,s: ImageFont.truetype(G+n,s)
GOLD=(232,169,61); CORAL=(255,107,74); DEEP=(11,7,16); DIM=(185,173,152)
WX,WY,WW,WH=130,418,820,1182   # fenêtre du téléphone
def bg_base():
    im=Image.new('RGB',(W,H),DEEP); d=ImageDraw.Draw(im)
    for y in range(H):
        c=int(18+24*y/H); d.line([(0,y),(W,y)],fill=(c//2+4,c//3+2,c))
    return im
def wrap(d,txt,font,maxw):
    words=txt.split(); lines=[]; cur=''
    for w in words:
        t=(cur+' '+w).strip()
        if d.textlength(t,font=font)<=maxw: cur=t
        else: lines.append(cur); cur=w
    lines.append(cur); return lines
def ctext(d,y,t,font,fill): d.text(((W-d.textlength(t,font=font))/2,y),t,font=font,fill=fill)
KO=Image.open(R+'starvibe/assets/img/icons/komyo-logo-officiel-v1.png').convert('RGBA'); kw=300; kh=int(KO.size[1]*kw/KO.size[0]); KO=KO.resize((kw,kh),Image.LANCZOS)
def scene_bg(kick,title,body):
    im=bg_base(); d=ImageDraw.Draw(im)
    im.paste(KO,(W-kw-26,18),KO)
    d.text((40,70),"Keydou Compagnon",font=F('sora-800.ttf',40),fill=(255,255,255)); d.text((40,122),"Démonstration",font=F('inter-600.ttf',28),fill=GOLD)
    ctext(d,268,kick,F('inter-700.ttf',32),CORAL)
    y=318; ft=F('sora-800.ttf',52)
    for l in wrap(d,title,ft,980): ctext(d,y,l,ft,(255,255,255)); y+=66
    d.rounded_rectangle([WX-16,WY-16,WX+WW+16,WY+WH+16],radius=64,fill=(8,6,12),outline=(90,72,48),width=4)
    fb=F('inter-600.ttf',38); y=WY+WH+74
    for l in wrap(d,body,fb,980): ctext(d,y,l,fb,(240,232,215)); y+=52
    ctext(d,H-44,"Exemple de conversation avec un compte de démonstration · écrans réels de l'application",F('inter-400.ttf',22),DIM)
    return im
def card(lines,sub):
    im=bg_base(); d=ImageDraw.Draw(im)
    lg=Image.open(G+'star-logo-officiel.png').convert('RGBA'); lw=620; lh=int(lg.size[1]*lw/lg.size[0]); lg=lg.resize((lw,lh),Image.LANCZOS); im.paste(lg,((W-lw)//2,380),lg)
    y=380+lh+80
    for t,fs,col in lines:
        f=F('sora-800.ttf',fs)
        for l in wrap(d,t,f,980): ctext(d,y,l,f,col); y+=int(fs*1.3)
        y+=10
    for l in wrap(d,sub,F('inter-600.ttf',30),940): ctext(d,y+30,l,F('inter-600.ttf',30),DIM); y+=42
    return im
title_img=card([("Keydou Compagnon",84,(255,255,255)),("Démonstration pour les autorités compétentes du Congo-Brazzaville",44,GOLD)],"Créé par STAR ENTREPRISE · komyo.starentreprise.com")
end_img=card([("Créé par STAR ENTREPRISE",66,(255,255,255)),("Un seul groupe, toutes les solutions pour votre vie",42,GOLD)],"contact@starentreprise.com · WhatsApp +242 06 656 50 50 · komyo.starentreprise.com")
SC=[ (9.0,31.0,"1 · L'OUVERTURE","Le logo s'anime, une voix accueille","Le logo KOMYO s'anime, la voix de KOMYO accueille. Essai gratuit : 5 messages et 2 images."),
     (31.0,48.3,"2 · KEYDOU SE PRÉSENTE","Il parle, avec sa voix","Compte de démonstration (offre Prestige). Keydou se présente et lit ses réponses à voix haute."),
     (48.3,63.6,"3 · IL EXPLIQUE","Des réponses claires et simples","Le client parle ou écrit. Keydou répond en français : énergie, cuisine, études, droit."),
     (63.6,76.5,"4 · IL CRÉE DES RAPPELS","Il retient et prévient à l'heure dite","Un rendez-vous demandé à la voix devient un rappel, avec notification même application fermée."),
     (76.5,90.6,"5 · IL EST PRUDENT","Aucun horaire de médicament","Sécurité : pas d'ordonnance, pas de rappel de médicament. Keydou oriente vers un professionnel de santé."),
     (90.6,110.3,"6 · OFFRES ET PAIEMENT","4 offres, paiement Mobile Money","Essentiel 5 000 FCFA · Complet 19 $ · Premium 35 $ · Prestige 49 $. Paiement MTN ou Airtel Money, accès ouvert dès le dépôt reconnu."),
     (110.3,118.0,"7 · TRANSPARENCE","L'état réel de chaque service","Chaque service est affiché : connecté, pas connecté ou en panne. Le client télécharge ou efface ses données.") ]
SCBG=[scene_bg(k,t,b) for (_,_,k,t,b) in SC]
def smooth(x): return x*x*(3-2*x)
SCSTART=[a-9.0 for (a,_,*_x) in SC]; SCEND=[b-9.0 for (_,b,*_x) in SC]
def push(r):
    """Poussée très douce (1.00 -> 1.05) à chaque scène : le téléphone « respire » sans couper le texte."""
    for a,b in zip(SCSTART,SCEND):
        if a<=r<b: return 1.0+0.05*smooth((r-a)/(b-a))
    return 1.0
hf=json.load(open('/tmp/video/hf.json')); hfT=[t for t,_ in hf]; hs=json.load(open('/tmp/video/hs.json')); hsT=[t for t,_ in hs]
cache={}
def src(r):
    if r>=hsT[0]: i=max(0,bisect.bisect_right(hsT,r)-1); key=('s',hs[i][1]); path='/tmp/video/hs/'+hs[i][1]
    else: i=max(0,bisect.bisect_right(hfT,r)-1); key=('f',hf[i][1]); path='/tmp/video/hf/'+hf[i][1]
    if key not in cache:
        if len(cache)>6: cache.clear()
        im=Image.open(path).convert('RGB')
        if im.size!=(WW,WH): im=im.resize((WW,WH),Image.LANCZOS)
        cache[key]=im
    return cache[key]
mask=Image.new('L',(WW,WH),0); ImageDraw.Draw(mask).rounded_rectangle([0,0,WW-1,WH-1],radius=48,fill=255)
KSPEAK=[(38.6,47.7),(53.0,63.0),(68.5,73.4),(80.8,87.7)]
def speaking(v): return any(a<=v<=b for a,b in KSPEAK)
def window(r):
    z=push(r); w=WW/z; h=WH/z; cx=WW/2; cy=WH/2
    return src(r).resize((WW,WH),Image.BICUBIC,box=(cx-w/2,cy-h/2,cx+w/2,cy+h/2))
ff=subprocess.Popen(['ffmpeg','-y','-v','error','-f','rawvideo','-pix_fmt','rgb24','-s','%dx%d'%(W,H),'-r',str(FPS),'-i','-','-i','/tmp/video/out/audio.m4a','-map','0:v','-map','1:a','-c:v','libx264','-preset','medium','-crf','20','-pix_fmt','yuv420p','-c:a','copy','-t',str(TOTAL),'-movflags','+faststart','/tmp/video/out/KOMYO-Keydou-Compagnon-demonstration-vertical.mp4'],stdin=subprocess.PIPE)
n=int(TOTAL*FPS)
for i in range(n):
    v=i/FPS
    if v<9.0: frame=title_img
    elif v>=118.0: frame=end_img
    else:
        k=[j for j,(a,b,*_) in enumerate(SC) if a<=v<b][0]; frame=SCBG[k].copy(); r=v-9.0
        win=window(r); frame.paste(win,(WX,WY),mask)
        if speaking(v):
            d=ImageDraw.Draw(frame); t=v*9
            d.rounded_rectangle([WX-8,WY-8,WX+WW+8,WY+WH+8],radius=56,outline=GOLD,width=6)
            bx=W/2-100; yb=WY+WH+36
            for b in range(9):
                hh=14+int(26*abs(math.sin(t+b*0.9)))
                d.rounded_rectangle([bx+b*24,yb-hh//2+8,bx+b*24+14,yb+hh//2+8],radius=6,fill=GOLD)
    ff.stdin.write(frame.tobytes())
ff.stdin.close(); ff.wait(); print('ok')
