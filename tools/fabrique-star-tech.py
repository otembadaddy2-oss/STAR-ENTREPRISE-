"""Fabrique (1) la démo STAR GPU + UC STAR en UN seul fichier HTML et (2) le dossier/zip « STAR-TECH » à garder.
Lancer depuis la racine du dépôt : python3 tools/fabrique-star-tech.py [dossier de sortie]"""
import os, re, sys, zipfile
sortie = sys.argv[1] if len(sys.argv) > 1 else "/tmp/star-tech"
os.makedirs(sortie, exist_ok=True)
lire = lambda f: open(f, encoding="utf-8").read()
gpu, uc, page = lire("star-gpu/star-gpu.js"), lire("star-gpu/uc-star.js"), lire("star-gpu/index.html")
for nom, code in (("star-gpu.js", gpu), ("uc-star.js", uc)):
    assert "</script" not in code.lower(), nom + " contient </script : insertion impossible dans une page"
page = page.replace('<script src="star-gpu.js"></script>', "<script>\n" + gpu + "\n</script>").replace('<script src="uc-star.js"></script>', "<script>\n" + uc + "\n</script>")
open(os.path.join(sortie, "STAR-TECH-demo.html"), "w", encoding="utf-8").write(page)   # page complète (à ouvrir ou à publier telle quelle)
corps = re.sub(r"^<!doctype html>\s*<html[^>]*>\s*<head>\s*<meta charset=\"utf-8\">\s*<meta name=\"viewport\"[^>]*>\s*", "", page, flags=re.I)
open(os.path.join(sortie, "STAR-TECH-demo-artifact.html"), "w", encoding="utf-8").write(corps.replace("</head><body>", "</head>\n").replace("</body></html>", ""))
with zipfile.ZipFile(os.path.join(sortie, "STAR-TECH.zip"), "w", zipfile.ZIP_DEFLATED) as z:
    z.write("star-gpu/star-gpu.js", "STAR-TECH/star-gpu.js"); z.write("star-gpu/uc-star.js", "STAR-TECH/uc-star.js")
    z.write(os.path.join(sortie, "STAR-TECH-demo.html"), "STAR-TECH/demo.html")
    if os.path.exists("star-gpu/LISEZMOI.txt"): z.write("star-gpu/LISEZMOI.txt", "STAR-TECH/LISEZMOI.txt")
print("écrit dans", sortie, sorted(os.listdir(sortie)))
