"""Fabrique (1) la démo STAR GPU + UC STAR en UN seul fichier HTML et (2) le dossier/zip « STAR-TECH » à garder.
Lancer depuis la racine du dépôt : python3 tools/fabrique-star-tech.py [dossier de sortie]"""
import os, re, sys, zipfile
sortie = sys.argv[1] if len(sys.argv) > 1 else "/tmp/star-tech"
os.makedirs(sortie, exist_ok=True)
lire = lambda f: open(f, encoding="utf-8").read()
gpu, uc, ia, wg, page = lire("star-gpu/star-gpu.js"), lire("star-gpu/uc-star.js"), lire("star-gpu/star-ia.js"), lire("star-gpu/star-ia-webgpu.js"), lire("star-gpu/index.html")
for nom, code in (("star-gpu.js", gpu), ("uc-star.js", uc), ("star-ia.js", ia), ("star-ia-webgpu.js", wg)):
    assert "</script" not in code.lower(), nom + " contient </script : insertion impossible dans une page"
page = page.replace('<script src="star-gpu.js"></script>', "<script>\n" + gpu + "\n</script>").replace('<script src="uc-star.js"></script>', "<script>\n" + uc + "\n</script>").replace('<script src="star-ia.js"></script>', "<script>\n" + ia + "\n</script>").replace('<script src="star-ia-webgpu.js"></script>', "<script>\n" + wg + "\n</script>")
assert 'src="star-' not in page and 'src="uc-star' not in page, "une bibliothèque n'a pas été insérée dans la page"
# copie du code en texte (pour le calcul en arrière-plan : le travailleur reçoit ce texte)
page = page.replace("</body></html>", '<script type="text/plain" id="srcGpu">' + gpu + '</script><script type="text/plain" id="srcIa">' + ia + '</script><script type="text/plain" id="srcWg">' + wg + '</script></body></html>')
open(os.path.join(sortie, "STAR-TECH-demo.html"), "w", encoding="utf-8").write(page)   # page complète (à ouvrir ou à publier telle quelle)
corps = re.sub(r"^<!doctype html>\s*<html[^>]*>\s*<head>\s*<meta charset=\"utf-8\">\s*<meta name=\"viewport\"[^>]*>\s*", "", page, flags=re.I)
open(os.path.join(sortie, "STAR-TECH-demo-artifact.html"), "w", encoding="utf-8").write(corps.replace("</head><body>", "</head>\n").replace("</body></html>", ""))
import hashlib
fichiers = [("star-gpu/star-gpu.js", "star-gpu.js"), ("star-gpu/uc-star.js", "uc-star.js"), ("star-gpu/star-ia.js", "star-ia.js"), ("star-gpu/star-ia-webgpu.js", "star-ia-webgpu.js"), (os.path.join(sortie, "STAR-TECH-demo.html"), "demo.html"), ("star-gpu/LISEZMOI.txt", "LISEZMOI.txt")]
for f in ("MODE-D-EMPLOI.txt", "LICENCE.txt", "NOTICES.txt", "CHANGELOG.txt"): fichiers.append(("star-gpu/pack/" + f, f))
for src, _ in fichiers: assert os.path.exists(src), "fichier manquant : " + src
sommes = "".join("%s  %s\n" % (hashlib.sha256(open(src, "rb").read()).hexdigest(), nom) for src, nom in fichiers)   # empreintes : prouvent que les fichiers n'ont pas été modifiés
with zipfile.ZipFile(os.path.join(sortie, "STAR-TECH.zip"), "w", zipfile.ZIP_DEFLATED) as z:
    for src, nom in fichiers: z.write(src, "STAR-TECH/" + nom)
    z.writestr("STAR-TECH/SHA256SUMS.txt", sommes)
print("écrit dans", sortie, sorted(os.listdir(sortie)))
