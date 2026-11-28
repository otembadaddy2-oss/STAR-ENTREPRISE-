"""Génère netlify/functions/_sarah_savoir.mts : le savoir de Sarah (agent, guide, filiales, nouveautés) embarqué dans la fonction WhatsApp.
Lancer après toute modification de ces documents : python3 tools/fabrique-savoir-sarah.py"""
import os, re
R = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
def lire(p): return open(os.path.join(R, p), encoding='utf-8').read()
agent = lire('.claude/agents/sarah-star.md'); agent = re.sub(r'^---.*?---\s*', '', agent, count=1, flags=re.S)
# le format « message + notes pour l'équipe » est celui de l'agent de travail ; sur WhatsApp, la consigne de canal le remplace
agent = re.sub(r'## Format de ta réponse.*?(?=\n## )', '', agent, flags=re.S)
parts = [('PERSONNALITÉ, RÈGLES ET TARIFS (agent Sarah)', agent), ('GUIDE DE GESTION DES CLIENTS KOMYO ET KEYDOU', lire('docs/komyo/SARAH-Guide-gestion-clients-KOMYO-Keydou.md')), ('FICHES DU GROUPE ET DES PROJETS', lire('docs/sarah/FILIALES-ET-PROJETS.md')), ('NOUVEAUTÉS DE NOVEMBRE 2026', lire('docs/sarah/NOUVEAUTES-NOVEMBRE-2026.md'))]
texte = '\n\n'.join(f'=== {t} ===\n{c.strip()}' for t, c in parts)
esc = texte.replace('\\', '\\\\').replace('`', '\\`').replace('${', '\\${')
open(os.path.join(R, 'netlify/functions/_sarah_savoir.mts'), 'w', encoding='utf-8').write('// FICHIER GÉNÉRÉ par tools/fabrique-savoir-sarah.py : ne pas modifier à la main.\nexport const SAVOIR_SARAH = `' + esc + '`;\nexport const SAVOIR_SARAH_TAILLE = ' + str(len(texte)) + ';\n')
print('OK', len(texte), 'caractères')
