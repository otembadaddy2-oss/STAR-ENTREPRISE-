import os, subprocess, textwrap
from PIL import Image, ImageDraw, ImageFont
G='/home/user/STAR-ENTREPRISE-/docs/komyo/guide-assets/'; R='/home/user/STAR-ENTREPRISE-/'
OUT='/tmp/video/out'; os.makedirs(OUT,exist_ok=True)
W,H=1920,1080
F=lambda n,s: ImageFont.truetype(G+n,s)
GOLD=(232,169,61); CORAL=(255,107,74); CREAM=(255,251,243); DEEP=(11,7,16); DIM=(185,173,152)
def bg_base():
    im=Image.new('RGB',(W,H),DEEP); d=ImageDraw.Draw(im)
    for y in range(H):
        c=int(18+22*y/H); d.line([(0,y),(W,y)],fill=(c//2+4,c//3+2,c))
    return im
def wrap(d,txt,font,maxw):
    words=txt.split(); lines=[]; cur=''
    for w in words:
        t=(cur+' '+w).strip()
        if d.textlength(t,font=font)<=maxw: cur=t
        else: lines.append(cur); cur=w
    lines.append(cur); return lines
PX,PY,PW,PH=150,60,480,960
def scene_bg(kick,title,body,path):
    im=bg_base(); d=ImageDraw.Draw(im)
    # bezel
    d.rounded_rectangle([PX-14,PY-14,PX+PW+14,PY+PH+14],radius=46,fill=(8,6,12),outline=(70,56,40),width=3)
    d.rounded_rectangle([PX-2,PY-2,PX+PW+2,PY+PH+2],radius=34,fill=(20,20,20))
    # logo KOMYO coin haut droit
    lg=Image.open(R+'starvibe/assets/img/icons/komyo-logo-officiel-v1.png').convert('RGBA'); lw=170; lh=int(lg.size[1]*lw/lg.size[0]); lg=lg.resize((lw,lh)); im.paste(lg,(W-lw-60,40),lg)
    d.text((780,200),kick,font=F('inter-700.ttf',30),fill=CORAL)
    y=250
    for l in wrap(d,title,F('sora-800.ttf',60),1000): d.text((780,y),l,font=F('sora-800.ttf',60),fill=(255,255,255)); y+=76
    d.rectangle([780,y+8,880,y+12],fill=GOLD); y+=40
    for l in wrap(d,body,F('inter-400.ttf',36),1000): d.text((780,y),l,font=F('inter-400.ttf',36),fill=(231,221,201)); y+=54
    d.text((780,H-70),"Exemple de conversation avec un compte de démonstration · écrans réels de l'application KOMYO",font=F('inter-400.ttf',24),fill=DIM)
    im.save(path)
def card(path,lines,sub,logo=True):
    im=bg_base(); d=ImageDraw.Draw(im)
    if logo:
        lg=Image.open(G+'star-logo-officiel.png').convert('RGBA'); lw=420; lh=int(lg.size[1]*lw/lg.size[0]); lg=lg.resize((lw,lh)); im.paste(lg,((W-lw)//2,90),lg)
    y=90+(lh if logo else 0)+50
    for t,fs,col in lines:
        f=F('sora-800.ttf',fs); d.text(((W-d.textlength(t,font=f))/2,y),t,font=f,fill=col); y+=int(fs*1.35)
    f=F('inter-600.ttf',30); d.text(((W-d.textlength(sub,font=f))/2,y+20),sub,font=f,fill=DIM)
    im.save(path)
card(OUT+'/title.png',[("Keydou Compagnon",84,(255,255,255)),("Démonstration pour les autorités compétentes du Congo-Brazzaville",38,GOLD)],"Créé par STAR ENTREPRISE · komyo.starentreprise.com")
card(OUT+'/end.png',[("Créé par STAR ENTREPRISE",64,(255,255,255)),("Un seul groupe, toutes les solutions pour votre vie",40,GOLD)],"contact@starentreprise.com · WhatsApp +242 06 656 50 50 · komyo.starentreprise.com")
SC=[ (9.0,31.0,"1 · L'OUVERTURE","Le logo s'anime, une voix accueille","Le logo KOMYO s'anime et la voix de KOMYO souhaite la bienvenue. Essai gratuit : 5 messages et 2 images, sans rien payer."),
     (31.0,48.3,"2 · KEYDOU SE PRÉSENTE","Il parle, avec sa voix","Compte de démonstration (offre Prestige). Keydou se présente et peut lire chaque réponse à voix haute."),
     (48.3,63.6,"3 · IL EXPLIQUE","Des réponses claires et simples","Le client parle ou écrit. Keydou répond en français, sur tous les sujets du quotidien : énergie, cuisine, études, droit."),
     (63.6,76.5,"4 · IL CRÉE DES RAPPELS","Il retient et prévient à l'heure dite","Un rendez-vous demandé à la voix devient un rappel. Le client est prévenu par notification, même application fermée."),
     (76.5,90.6,"5 · IL EST PRUDENT","Aucun horaire de médicament","Règle de sécurité : pas d'ordonnance, pas de rappel de médicament. Keydou oriente vers un professionnel de santé."),
     (90.6,110.3,"6 · IMAGES, OFFRES ET PAIEMENT","Quatre offres, paiement Mobile Money","Images à la demande, jamais d'une personne réelle ni d'un enfant. Essentiel 5 000 FCFA · Complet 19 $ · Premium 35 $ · Prestige 49 $. Paiement MTN ou Airtel, accès ouvert dès que le dépôt est reconnu."),
     (110.3,118.0,"7 · TRANSPARENCE","L'état réel de chaque service","Chaque service relié est affiché : connecté, pas connecté ou en panne. Le client peut télécharger ou effacer ses données.") ]
lst=[]
for i,(a,b,k,t,body) in enumerate(SC):
    p=OUT+'/s%d.png'%i; scene_bg(k,t,body,p); lst.append((p,b-a))
with open(OUT+'/bg.txt','w') as f:
    for p,dur in lst: f.write("file '%s'\nduration %.3f\n"%(p,dur))
    f.write("file '%s'\n"%lst[-1][0])
# audio schedule (video time = r + 9.0)
A='/tmp/video/audio/'
sched=[(A+'n0.mp3',0.5,1.0),(R+'starvibe/assets/audio/komyo-intro-voix-monde-v2.mp3',10.0,0.9),(A+'n1.mp3',21.9,1.0),(A+'n2.mp3',32.2,1.0),(A+'k1.mp3',38.6,1.0),
       (A+'k2.mp3',53.0,1.0),(A+'n3.mp3',63.6,1.0),(A+'k3.mp3',68.5,1.0),(A+'n4.mp3',76.5,1.0),(A+'k4.mp3',80.8,1.0),(A+'n5.mp3',90.6,1.0),(A+'n6.mp3',110.3,1.0)]
cmd=['ffmpeg','-y','-v','error']
for f,_,_ in sched: cmd+=['-i',f]
fc=[]
for i,(f,s,v) in enumerate(sched): fc.append("[%d:a]adelay=%d|%d,volume=%.2f[a%d]"%(i,int(s*1000),int(s*1000),v,i))
fc.append("".join("[a%d]"%i for i in range(len(sched)))+"amix=inputs=%d:normalize=0:dropout_transition=0,apad=whole_dur=126,atrim=0:126[aout]"%len(sched))
cmd+=['-filter_complex',";".join(fc),'-map','[aout]','-c:a','aac','-b:a','192k',OUT+'/audio.m4a']
subprocess.run(cmd,check=True)
rec=[os.path.join('/tmp/video/rec',f) for f in os.listdir('/tmp/video/rec') if f.endswith('.webm')][0]
# partie 1 : titre ; partie 2 : application ; partie 3 : fin
def run(c): subprocess.run(c,check=True)
common=['-r','25','-pix_fmt','yuv420p','-c:v','libx264','-preset','medium','-crf','20']
run(['ffmpeg','-y','-v','error','-loop','1','-t','9.0','-i',OUT+'/title.png']+common+[OUT+'/p1.mp4'])
run(['ffmpeg','-y','-v','error','-f','concat','-safe','0','-i',OUT+'/bg.txt','-i',rec,'-filter_complex',"[1:v]trim=0:109.0,setpts=PTS-STARTPTS,fps=25,scale=%d:%d:flags=lanczos,format=yuv420p[ph];[0:v]fps=25,format=yuv420p[bg];[bg][ph]overlay=%d:%d:shortest=1[v]"%(PW,PH,PX,PY),'-map','[v]','-t','109.0']+common+[OUT+'/p2.mp4'])
run(['ffmpeg','-y','-v','error','-loop','1','-t','8.0','-i',OUT+'/end.png']+common+[OUT+'/p3.mp4'])
with open(OUT+'/parts.txt','w') as f:
    for p in ('p1','p2','p3'): f.write("file '%s/%s.mp4'\n"%(OUT,p))
run(['ffmpeg','-y','-v','error','-f','concat','-safe','0','-i',OUT+'/parts.txt','-i',OUT+'/audio.m4a','-map','0:v','-map','1:a','-c:v','copy','-c:a','copy','-shortest','-movflags','+faststart',OUT+'/KOMYO-Keydou-Compagnon-demonstration.mp4'])
print('ok')
