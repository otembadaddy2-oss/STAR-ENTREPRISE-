# STAR ENTREPRISE — Domaine et email professionnel sur Hostinger

Décision de Carry OTEMBA, 16 octobre 2026 : **le site reste hébergé sur Netlify** (gratuit, là où tournent déjà les 28 fonctions serveur et la base de données) et **Hostinger sert pour le nom de domaine et l'email professionnel**.

Pourquoi : un hébergement Hostinger classique ne peut pas faire tourner les fonctions Netlify (devis, connexions, marketplace, StarVibe, guichet unique, Pili-Pili, S.O…) ni la base Netlify DB. Les déplacer demanderait de réécrire tout le backend. En reliant simplement le domaine Hostinger au site Netlify, tout continue de fonctionner.

| Rôle | Où |
|---|---|
| Site web + fonctions + base de données | Netlify — `star-entreprise.netlify.app` |
| Nom de domaine | Hostinger |
| Email professionnel (`contact@…`, `carry@…`) | Hostinger Email |

---

## Étape 1 — Retrouver (ou acheter) le domaine sur Hostinger

1. Se connecter sur **hpanel.hostinger.com**.
2. Menu **Domaines** → noter le nom exact (ex. `starentreprise.com`).
3. S'il n'y en a pas : **Domaines → Acheter un domaine**. Désactiver le renouvellement automatique si la carte ne le permet pas.

## Étape 2 — Relier le domaine au site Netlify

**Côté Netlify** (app.netlify.com → site *star-entreprise*) :
1. **Domain management → Add a domain** → saisir `www.<domaine>` puis valider.
2. Ajouter aussi le domaine nu `<domaine>` (Netlify redirigera vers `www`).

**Côté Hostinger** (hPanel → Domaines → `<domaine>` → **DNS / Nameservers**) — garder les serveurs DNS de Hostinger (sinon l'email ne marchera pas) et modifier les enregistrements :

| Type | Nom | Valeur | Remarque |
|---|---|---|---|
| A | `@` | `75.2.60.5` | adresse de Netlify ; supprimer les autres A sur `@` |
| CNAME | `www` | `star-entreprise.netlify.app` | supprimer l'ancien `www` s'il existe |

Ne **pas** toucher aux enregistrements `MX`, `TXT` (SPF/DKIM) ni `CNAME` `autodiscover` / `autoconfig` : ils servent à l'email.

**Ensuite, côté Netlify** : *Domain management → HTTPS → Verify DNS configuration*, puis **Provision certificate** (le cadenas HTTPS est gratuit). La propagation prend de quelques minutes à 24 h.

## Étape 3 — Créer l'email professionnel

1. hPanel → **Emails** → choisir le domaine → **Créer un compte email**.
2. Comptes conseillés :
   - `contact@<domaine>` — adresse publique du site (formulaires, signature)
   - `carry@<domaine>` — adresse personnelle du fondateur
3. Hostinger ajoute lui-même les enregistrements DNS de l'email. Vérifier dans **DNS** qu'ils sont présents :

| Type | Nom | Valeur |
|---|---|---|
| MX | `@` | `mx1.hostinger.com` (priorité 5) |
| MX | `@` | `mx2.hostinger.com` (priorité 10) |
| TXT | `@` | `v=spf1 include:_spf.mail.hostinger.com ~all` |
| TXT | `hostingermail-*._domainkey` | clé DKIM fournie par Hostinger |
| TXT | `_dmarc` | `v=DMARC1; p=none` |

4. Lire les mails : **mail.hostinger.com** (webmail), ou ajouter le compte dans l'application Gmail du téléphone (IMAP `imap.hostinger.com` port 993, SMTP `smtp.hostinger.com` port 465).

Si un enregistrement diffère de ce tableau, **la valeur affichée par Hostinger fait foi**.

## Étape 4 — Mettre le site à jour avec le vrai domaine

Une fois le domaine connu, depuis la racine du dépôt :

```bash
python3 tools/changer-domaine.py <domaine> --dry-run   # vérifier
python3 tools/changer-domaine.py <domaine>             # appliquer
```

Le script remplace l'adresse Netlify et l'ancien email `contact@star-entreprise.cg` par `https://www.<domaine>` et `contact@<domaine>` dans toutes les pages (liens de partage, images d'aperçu, contacts).

## Vérification finale

- [ ] `https://www.<domaine>` ouvre le site avec le cadenas HTTPS
- [ ] `https://<domaine>` redirige vers `www`
- [ ] Le formulaire de devis et les connexions (admin, marketplace, StarVibe) fonctionnent
- [ ] Un email envoyé à `contact@<domaine>` arrive, et une réponse ne tombe pas en spam

---
*Document maintenu par Claude à la demande de Carry OTEMBA.*

---

## Mise à jour du 19 octobre 2026 — qui est où

- **starentreprise.com** (compte Hostinger « DADDHY OTEMBA », offre Premium) héberge le **site PHP** livré le 18/10/2026 (paiements OpenPay, base MySQL, admin). **Ne pas relier ce domaine à Netlify** : cela remplacerait ce site.
- **Les applications du dépôt** (KOMYO, ALPHA, Pili-Pili, S.O, Maison de la Drépanocytose…) restent sur **Netlify** (fonctions Node + base Netlify) et prennent des **sous-domaines** :

| Application | Adresse | Route interne |
|---|---|---|
| KOMYO | `komyo.starentreprise.com` | `/starvibe/` |

Mise en service d'un sous-domaine, par exemple KOMYO :
1. Netlify → site *star-entreprise* → **Domain management → Add a domain** → `komyo.starentreprise.com`.
2. Hostinger → **Noms de domaine → DNS** → ajouter **un seul** enregistrement : type `CNAME`, nom `komyo`, valeur `star-entreprise.netlify.app`. Ne pas toucher aux autres lignes (site PHP, MX, SPF, DKIM).
3. Netlify → **HTTPS → Verify DNS → Provision certificate**.
4. `_redirects` envoie `komyo.starentreprise.com/` vers `/starvibe/` ; les pages et l'API (`/api/starvibe-*`) fonctionnent sur le même hôte.
