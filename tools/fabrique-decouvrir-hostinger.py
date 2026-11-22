#!/usr/bin/env python3
"""Fabrique le zip « prêt pour Hostinger » de la page decouvrir/ (à déposer dans public_html).
Usage : python3 tools/fabrique-decouvrir-hostinger.py <dossier du site officiel décompressé> <fichier.zip de sortie>
La clé publique du formulaire CV est lue dans carrieres.html du site officiel et n'est JAMAIS écrite dans le dépôt."""
import os, re, sys, zipfile
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
site, sortie = sys.argv[1], sys.argv[2]
src = open(site + '/carrieres.html', encoding='utf-8', errors='ignore').read()
m = re.search(r"STAR_API_KEY\s*=\s*['\"]([^'\"]+)['\"]", src) or re.search(r"API_KEY\s*=\s*['\"]([^'\"]+)['\"]", src)
assert m, "clé du formulaire introuvable"
cle = m.group(1)
h = open(ROOT + '/decouvrir/index.html', encoding='utf-8').read()
h = h.replace('<meta name="robots" content="noindex">', '<link rel="canonical" href="https://www.starentreprise.com/decouvrir/"><meta property="og:url" content="https://www.starentreprise.com/decouvrir/"><meta property="og:type" content="website">')
for k in ('og:image', 'twitter:image'):
    h = h.replace('content="img/partage.jpg"', 'content="https://www.starentreprise.com/decouvrir/img/partage.jpg"')
h = h.replace('<style>', "<script>window.STAR_CONFIG={apiKey:'" + cle + "',endpoint:'/backend/candidature-cv.php'};</script><style>", 1)
htaccess = """# Page « Découvrez qui est STAR ENTREPRISE » — réglages de vitesse (Hostinger / LiteSpeed)
DirectoryIndex index.html
AddType video/mp4 .mp4
AddType font/woff2 .woff2
AddType image/webp .webp
<IfModule mod_deflate.c>
  AddOutputFilterByType DEFLATE text/html text/css application/javascript
</IfModule>
<IfModule mod_expires.c>
  ExpiresActive On
  ExpiresByType image/webp "access plus 1 month"
  ExpiresByType video/mp4 "access plus 1 month"
  ExpiresByType font/woff2 "access plus 1 year"
  ExpiresByType text/html "access plus 10 minutes"
</IfModule>
"""
LISEZ = """STAR ENTREPRISE — page « Découvrez qui est STAR ENTREPRISE »
Adresse finale : https://www.starentreprise.com/decouvrir/
À déposer dans public_html (le dossier « decouvrir » se crée tout seul à l'extraction).
Droits réservés © STAR ENTREPRISE.
"""
with zipfile.ZipFile(sortie, 'w', zipfile.ZIP_STORED) as z:   # stockage simple : les médias sont déjà compressés
    z.writestr('decouvrir/index.html', h)
    z.writestr('decouvrir/.htaccess', htaccess)
    z.writestr('decouvrir/LISEZ-MOI.txt', LISEZ)
    for d in ['img', 'video', 'polices']:
        for f in sorted(os.listdir(f'{ROOT}/decouvrir/{d}')):
            z.write(f'{ROOT}/decouvrir/{d}/{f}', f'decouvrir/{d}/{f}')
print('zip', sortie, os.path.getsize(sortie) // 1024, 'Ko')
