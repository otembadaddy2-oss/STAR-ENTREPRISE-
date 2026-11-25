#!/bin/bash
# Fabrique « APP-Passeport-de-A-a-Z.zip » : TOUT Passeport Sûr dans une seule archive (application, serveur, tests, documents, vidéo, historique).
# À relancer à chaque évolution :  bash tools/fabriquer-zip-passeport.sh   → docs/passeport-sur/APP-Passeport-de-A-a-Z.zip (jamais public : voir _redirects).
set -e
RACINE="$(cd "$(dirname "$0")/.." && pwd)"; cd "$RACINE"
NOM="APP-Passeport-de-A-a-Z"; TMP="$(mktemp -d)"; D="$TMP/$NOM"
mkdir -p "$D/1-Application" "$D/2-Serveur" "$D/3-Documents" "$D/4-Tests" "$D/5-Fabrication-des-documents" "$D/6-Historique"
cp -r passeport-demo/. "$D/1-Application/"
for f in _passeport _comptes _audit _integrite _db api-passeport api-passeport-piece; do cp "netlify/functions/$f.mts" "$D/2-Serveur/"; done
cp tools/serveur-local-passeport.mts tools/test-passeport-serveur.mts "$D/2-Serveur/"
# réglages de protection propres à Passeport Sûr (extraits de _headers, _redirects, robots.txt du site)
{ echo "# Extraits des fichiers du site qui protègent Passeport Sûr (à reporter sur l'hébergement choisi)"; echo; echo "## _headers"; awk '/Passeport Sûr/{p=1} p{print} /^$/{if(p&&++b>1)p=0}' _headers; echo; echo "## _redirects"; grep -n "passeport\|documents-filiales\|^/tools" _redirects || true; echo; echo "## robots.txt"; grep -n "passeport" robots.txt || true; } > "$D/2-Serveur/reglages-de-protection.txt"
cp docs/passeport-sur/*.pdf docs/passeport-sur/*.mp4 "$D/3-Documents/"; cp tools/documents-passeport/video/texte-de-la-voix.txt "$D/3-Documents/"
cp tools/tests-passeport/*.cjs tools/tests-passeport/LISEZ-MOI.md "$D/4-Tests/" 2>/dev/null || cp tools/tests-passeport/*.cjs "$D/4-Tests/"
for f in tools/tests-passeport/ocr_*.png tools/tests-passeport/visage-test.png tools/tests-passeport/doc-test.pdf tools/tests-passeport/faux-format.txt; do [ -f "$f" ] && cp "$f" "$D/4-Tests/"; done
cp tools/documents-passeport/*.cjs tools/documents-passeport/video-cadre.html "$D/5-Fabrication-des-documents/"
# historique : seulement ce qui concerne Passeport Sûr (jamais les autres projets)
awk 'NR>=466' docs/komyo/RAPPELS-A-NE-PAS-OUBLIER.md | awk 'BEGIN{s=0} /^## .*FUTURS PROJETS/{s=1;next} /^## /{s=0} !s{print}' > "$D/6-Historique/historique-passeport-sur.md"
cat > "$D/LISEZ-MOI.txt" <<'EOF'
APP PASSEPORT DE A à Z — copie complète de « Passeport Sûr »
Conçu par STAR ENTREPRISE, Brazzaville.

LE BUT DE L'APPLICATION
Que chaque demande de passeport soit SUIVIE de A à Z, que chaque personne soit reçue DANS L'ORDRE (file d'attente, portes, écran de salle),
et que les FRAUDES et contournements soient repérés automatiquement (le Ministre est alerté, avec un son).

CE QUE CONTIENT CETTE ARCHIVE
1-Application ........ l'application elle-même (ouvrir index.html via un serveur : voir ci-dessous). Installable sur téléphone et ordinateur.
2-Serveur ............ les fonctions du serveur (espaces partagés, comptes, caisse, journal de sécurité) + le serveur de test local + réglages de protection.
3-Documents .......... dossier de présentation (Ministère), guide d'utilisation A à Z, vidéo guide (sous-titrée), texte de la voix off.
4-Tests .............. les tests automatiques (navigateur et serveur) qui vérifient l'application.
5-Fabrication-des-documents ... les programmes qui refont les PDF et la vidéo (captures d'écran réelles de l'application).
6-Historique ......... les décisions et les étapes, jour par jour.

EN LIGNE (démonstration)  https://star-entreprise.netlify.app/passeport-demo/
Page d'installation à partager  https://star-entreprise.netlify.app/passeport-demo/installer.html

POINTS IMPORTANTS
- Montant officiel du passeport : 50 000 FCFA (sauf décision du gouvernement), préenregistré. Pour le changer : profil Préfecture > Réglages > « Montant officiel du passeport ».
- C'est une DÉMONSTRATION : toutes les personnes, pièces et numéros sont fictifs. Ne pas y saisir de vraies données avant la validation du Ministère,
  le choix de l'hébergement (serveur dédié recommandé) et le respect de la protection des données personnelles.
- Aucun mot de passe ni clé secrète n'est dans cette archive. Les mots de passe des comptes sont choisis par chaque personne ; la Préfecture crée les comptes.
- La voix off de Clémence (ElevenLabs) n'est pas encore dans la vidéo.

POUR REFAIRE FONCTIONNER SUR UN ORDINATEUR (technicien)
1) Installer Node.js (v22 ou plus) et PostgreSQL. Créer la base indiquée dans 2-Serveur/serveur-local-passeport.mts (variable NETLIFY_DB_URL).
2) Placer 1-Application dans un dossier « passeport-demo » et 2-Serveur dans « netlify/functions » (les deux fichiers serveur-local et test-passeport-serveur dans « tools »).
3) node --experimental-strip-types tools/serveur-local-passeport.mts 8766   puis ouvrir http://localhost:8766/passeport-demo/index.html
4) Tests : voir 4-Tests/LISEZ-MOI.md.

POUR METTRE EN LIGNE
Le dépôt GitHub de STAR ENTREPRISE contient tout (branche principale = site en ligne). Toute modification de l'application se fait avec Claude, sur demande de Carry.
EOF
rm -f "docs/passeport-sur/$NOM.zip"; (cd "$TMP" && zip -qr "$RACINE/docs/passeport-sur/$NOM.zip" "$NOM"); rm -rf "$TMP"
ls -la "docs/passeport-sur/$NOM.zip"
