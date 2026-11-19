"""Assemble une version « un seul fichier » du jeu ASTRO QUEST (HTML + CSS + JS + questions) pour l'essayer sur un lien privé,
sans rien publier sur le site. Le code du jeu est celui du dossier jeu-astro/ (aucune copie à maintenir).
Lancer : python3 tools/fabrique-jeu-astro-essai.py [fichier de sortie]"""
import re, sys
base = "jeu-astro/"
html = open(base + "index.html", encoding="utf-8").read()
style = re.search(r"<style>(.*?)</style>", html, re.S).group(1)
corps = re.search(r"(<div id=\"jeu\">.*?)<script src=\"questions.js\">", html, re.S).group(1)
questions = open(base + "questions.js", encoding="utf-8").read()
jeu = open(base + "game.js", encoding="utf-8").read()
sortie = sys.argv[1] if len(sys.argv) > 1 else "/tmp/astro-quest-essai.html"
page = ("<title>Astro Quest</title>\n<style>\n:root{color-scheme:dark}\n" + style + "\n</style>\n" + corps +
        "<script>\n" + questions + "\n</script>\n<script>\n" + jeu + "\n</script>\n")
open(sortie, "w", encoding="utf-8").write(page)
print("écrit", sortie, len(page) // 1024, "Ko")
