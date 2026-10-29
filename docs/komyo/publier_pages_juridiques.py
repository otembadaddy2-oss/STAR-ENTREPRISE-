# Publie les pages juridiques : à lancer SEULEMENT quand tous les champs « À COMPLÉTER » sont remplis.
# 1) refuse s'il reste un champ à compléter ; 2) copie les 4 pages dans starvibe/ ; 3) ajoute les liens (pied de page, tarifs, inscription).
import glob, shutil, sys, re
R='/home/user/STAR-ENTREPRISE-/'; D=R+'docs/komyo/pages-juridiques-brouillon/'; V=R+'starvibe/'
pages=sorted(glob.glob(D+'*.html')); restes=[(p.split('/')[-1],len(re.findall(r'class="todo"',open(p).read()))) for p in pages]
bloque=[x for x in restes if x[1]]
if bloque: sys.exit('Publication refusée, il reste des champs à compléter : %s'%bloque)
for p in pages: shutil.copy(p,V)
LEG='<a href="conditions.html" style="text-decoration:underline">Conditions</a> · <a href="remboursement.html" style="text-decoration:underline">Remboursements</a> · <a href="confidentialite.html" style="text-decoration:underline">Confidentialité</a> · <a href="mentions-legales.html" style="text-decoration:underline">Mentions légales</a>'
def sub(f,a,b):
    s=open(V+f).read()
    if 'conditions.html' in s: return
    assert s.count(a)==1,(f,a[:40]); open(V+f,'w').write(s.replace(a,b,1))
foot='  <div class="credit"><b>STAR ENTREPRISE</b> — Tous droits réservés.</div>\n</footer>'
for f in ('accueil.html','index.html'): sub(f,foot,'  <div class="credit">'+LEG+'</div>\n'+foot)
a='</div>\n<script src="assets/komyo-prix-v2.js" defer></script>'; sub('tarifs.html',a,'  <p class="note">'+LEG+'</p>\n'+a)
a='<button type="submit" class="submitbtn" id="btnSubmit">Créer mon compte</button>'
sub('inscription.html',a,a+'\n        <p style="font-size:12px;color:#6b5f80;text-align:center;margin:10px 0 0;line-height:1.5">En créant un compte, tu acceptes les <a href="conditions.html" style="color:inherit;text-decoration:underline">conditions d\'utilisation</a> et la <a href="confidentialite.html" style="color:inherit;text-decoration:underline">politique de confidentialité</a>.</p>')
print('Pages juridiques publiées dans starvibe/ : il reste à les déployer.')
