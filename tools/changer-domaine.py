#!/usr/bin/env python3
"""Bascule le site STAR ENTREPRISE sur son nom de domaine définitif.

Remplace, dans toutes les pages du site, l'ancienne adresse Netlify et
l'ancien email de contact par le domaine et l'email professionnels.

Usage (depuis la racine du dépôt) :
    python3 tools/changer-domaine.py starentreprise.com
    python3 tools/changer-domaine.py starentreprise.com --email contact@starentreprise.com
    python3 tools/changer-domaine.py starentreprise.com --dry-run   # montre sans modifier
"""
import argparse
import pathlib
import re
import sys

ANCIENNES_URLS = [
    "https://star-entreprise.netlify.app",
    "https://starentreprise.vercel.app",
]
ANCIEN_EMAIL = "contact@star-entreprise.cg"
EXTENSIONS = {".html", ".txt", ".xml", ".json", ".js", ".webmanifest"}
IGNORER = {"node_modules", ".git", "docs"}


def fichiers(racine):
    for p in racine.rglob("*"):
        if p.is_file() and p.suffix in EXTENSIONS and not (IGNORER & set(p.parts)):
            yield p


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("domaine", help="ex. starentreprise.com (sans https://, sans www)")
    ap.add_argument("--email", help="email de contact (par défaut contact@<domaine>)")
    ap.add_argument("--dry-run", action="store_true", help="affiche les changements sans écrire")
    a = ap.parse_args()

    domaine = a.domaine.strip().lower().removeprefix("https://").removeprefix("http://").removeprefix("www.").rstrip("/")
    if not re.fullmatch(r"[a-z0-9-]+(\.[a-z0-9-]+)+", domaine):
        sys.exit(f"Domaine invalide : {a.domaine}")
    nouvelle_url = f"https://www.{domaine}"
    email = a.email or f"contact@{domaine}"

    racine = pathlib.Path(__file__).resolve().parent.parent
    total = 0
    for f in fichiers(racine):
        texte = f.read_text(encoding="utf-8", errors="ignore")
        nouveau = texte
        for ancienne in ANCIENNES_URLS:
            nouveau = nouveau.replace(ancienne, nouvelle_url)
        nouveau = nouveau.replace(ANCIEN_EMAIL, email)
        if nouveau != texte:
            n = sum(texte.count(x) for x in ANCIENNES_URLS) + texte.count(ANCIEN_EMAIL)
            total += n
            print(f"{f.relative_to(racine)} : {n} remplacement(s)")
            if not a.dry_run:
                f.write_text(nouveau, encoding="utf-8")
    print(f"\n{total} remplacement(s) {'à faire' if a.dry_run else 'effectués'} -> {nouvelle_url} / {email}")


if __name__ == "__main__":
    main()
