#!/usr/bin/env python3
"""Contrôle AVANT chaque déploiement Netlify (un déploiement coûte des crédits).
Usage : python3 tools/verif-avant-deploiement.py [fichier.html ...]
Sans argument : les pages HTML modifiées depuis le dernier déploiement noté (git diff HEAD~10) ou toutes celles de starvibe/.
Vérifie, pour chaque page, sous TOUTES les adresses où elle sera servie (son chemin réel + les adresses courtes
« réécrites » par _redirects en statut 200) : que chaque image / script / feuille de style / lien local existe,
que les adresses absolues du site (og:image, etc.) pointent vers un vrai fichier, et que l'image d'aperçu est légère."""
import os, re, subprocess, sys
from urllib.parse import urlparse, unquote
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
HOSTS = ('komyo.starentreprise.com', 'star-entreprise.netlify.app', 'www.starentreprise.com')

def rewrites():
    out = {}
    for l in open(os.path.join(ROOT, '_redirects'), encoding='utf-8'):
        l = l.split('#')[0].strip()
        if not l or l.startswith('http'): continue
        p = l.split()
        if len(p) >= 3 and p[2].rstrip('!') == '200' and not p[0].endswith('*'):
            out.setdefault('/' + p[1].strip('/'), []).append(p[0])
    return out

def exists(path):
    f = os.path.join(ROOT, unquote(path).lstrip('/'))
    return os.path.isfile(f) or (os.path.isdir(f) and os.path.isfile(os.path.join(f, 'index.html')))

def refs(html):
    for m in re.finditer(r'''(?:src|href|poster|data-src)\s*=\s*["']([^"']+)["']''', html): yield m.group(1)
    for m in re.finditer(r"""url\(\s*["']?([^)"']+)""", html): yield m.group(1)

def main():
    args = sys.argv[1:]
    if not args:
        try:
            args = subprocess.run(['git', 'diff', '--name-only', 'HEAD~10', '--', '*.html'], cwd=ROOT, capture_output=True, text=True).stdout.split()
        except Exception: args = []
    rw = rewrites(); erreurs = 0; verifies = 0
    for a in args:
        rel = os.path.relpath(os.path.abspath(a), ROOT) if os.path.isabs(a) or os.path.exists(a) else a
        if not os.path.isfile(os.path.join(ROOT, rel)) or not rel.endswith('.html'): continue
        html = open(os.path.join(ROOT, rel), encoding='utf-8', errors='ignore').read()
        base = '/' + rel
        urls = [base] + rw.get(base, [])
        for u in urls:
            for r in set(refs(html)):
                if re.match(r'(mailto:|tel:|sms:|javascript:|data:|#|blob:|\{|\$)', r) or 'wa.me' in r: continue
                pr = urlparse(r)
                if pr.scheme in ('http', 'https'):
                    if pr.netloc not in HOSTS: continue
                    path = pr.path or '/'
                else:
                    path = pr.path
                    if not path: continue
                    if not path.startswith('/'):
                        d = os.path.dirname(u.split('?')[0])
                        path = os.path.normpath(os.path.join(d, path)).replace('\\', '/')
                if path in rw or path.endswith('/') and path != '/' and False: continue
                if path == '/' or path in ('/starvibe/', '/starvibe'): continue
                verifies += 1
                if not exists(path) and path not in rw:
                    erreurs += 1; print(f'ERREUR  {rel} servie sous {u} : « {r} » -> {path} introuvable')
        for m in re.finditer(r'property="og:image"\s+content="([^"]+)"', html):
            pr = urlparse(m.group(1)); f = os.path.join(ROOT, pr.path.lstrip('/'))
            if pr.netloc not in HOSTS or not os.path.isfile(f): erreurs += 1; print(f'ERREUR  {rel} : og:image {m.group(1)} introuvable')
            elif os.path.getsize(f) > 300 * 1024: erreurs += 1; print(f'ERREUR  {rel} : image d’aperçu trop lourde ({os.path.getsize(f)//1024} Ko > 300 Ko)')
            else: print(f'ok      {rel} : aperçu {pr.path} ({os.path.getsize(f)//1024} Ko)')
        print(f'ok      {rel} : servie sous {", ".join(urls)}')
    print(f'\n{verifies} références contrôlées, {erreurs} erreur(s).')
    sys.exit(1 if erreurs else 0)
main()
