# Fabrique x-saphir-arena-fichier-unique.html (jeu complet dans un seul fichier, pour l'ouvrir sur téléphone)
import re,base64,os
os.chdir(os.path.dirname(os.path.abspath(__file__)))
h=open('index.html').read(); css=open('css/arena.css').read()
h=re.sub(r'<link rel="stylesheet" href="css/arena.css[^"]*">',lambda m:'<style>'+css+'</style>',h)
for l in ['<link rel="manifest" href="manifest.webmanifest">','<link rel="icon" href="icons/icon-192.png">','<link rel="apple-touch-icon" href="icons/icon-192.png">']: h=h.replace(l,'')
h=re.sub(r'<script src="([^"]+)"></script>',lambda m:'<script>'+open(m.group(1).split('?')[0]).read().replace('</script>','<\\/script>')+'</script>',h)
h=h.replace("a.src = 'img/' + id + '-portrait.jpg';","a.src = (window.__IMG||{})[id] || ('img/' + id + '-portrait.jpg');")
imgs='{'+','.join("%s:'data:image/jpeg;base64,%s'"%(c,base64.b64encode(open('img/%s-portrait.jpg'%c,'rb').read()).decode()) for c in ['calpros','nia','ayanda','kormal'])+'}'
h=h.replace('<script>/* X SAPHIR — ARENA : les données','<script>window.__IMG='+imgs+';</script><script>/* X SAPHIR — ARENA : les données',1)
open('x-saphir-arena-fichier-unique.html','w').write(h); print(len(h)//1024,'Ko')
