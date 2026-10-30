# Choisir sa passerelle de paiement
_KOMYO · STAR ENTREPRISE — 29/10/2026_

But : recevoir les paiements des clients (carte Visa / Mastercard, MTN MoMo, Airtel Money) sur un compte marchand, puis **envoyer l'argent sur ton MTN MoMo** et le retirer en espèces chez un agent. Document du 29 octobre 2026, à remplir au fil de tes appels. **Les informations ci-dessous viennent de recherches sur internet (pages commerciales et blogs) : rien n'est confirmé tant que le service ne te l'a pas écrit.**


## 1. Le chemin de l'argent

- Le client paie par carte ou par Mobile Money sur KOMYO.
- L'argent arrive sur ton **compte marchand** chez la passerelle de paiement.
- La passerelle **envoie le solde sur ton numéro MTN MoMo** (retrait / virement vers Mobile Money).
- Tu retires l'argent chez un agent MTN Mobile Money.


## 2. Les services à contacter

| Service | Ce que j'ai lu (à confirmer) | Type |
|---|---|---|
| Moneroo | Page de couverture : Visa et Mastercard en XAF pour le Congo, MTN et Airtel. Page non ouverte par moi. | Passerelle (cartes + Mobile Money) |
| CinetPay | Afrique francophone ; une fiche Shopify cite le Congo. Détails cartes et retrait non confirmés. | Passerelle |
| Hub2 | Paiements par Mobile Money et carte en Afrique. Pas de détail Congo trouvé. | Passerelle |
| Flutterwave | Cartes et Mobile Money en Afrique. Rien ne confirme le Congo-Brazzaville. | Passerelle |
| PayDunya, Monetbil, DPO Pay | Cités dans des comparatifs. Congo non confirmé. | Passerelles |
| OpenPay, PayZen Congo, Capay | Solutions locales ou régionales, surtout Mobile Money. | Mobile Money (cartes ?) |
| MTN MoMo et Airtel Money en direct | API marchande de collecte et de décaissement. Compte marchand, dossier entreprise et tests nécessaires. Pas de cartes. | Opérateurs |
| Stripe, PayPal | À ma connaissance, pas de compte marchand avec retrait local depuis le Congo-Brazzaville. À vérifier. | International |


## 3. La grille à remplir pour chaque service (une ligne par appel)

| Question | Réponse du service |
|---|---|
| Le Congo-Brazzaville est-il couvert pour les ENCAISSEMENTS ? (à distinguer du Congo-RDC) |  |
| Visa et Mastercard acceptés ? (et American Express, Apple Pay, Google Pay ?) |  |
| MTN MoMo et Airtel Money acceptés pour l'encaissement ? |  |
| RETRAIT vers MTN MoMo du Congo-Brazzaville : possible ? Manuel ou automatique ? Montant minimum ? |  |
| Frais par paiement carte / par paiement Mobile Money / par retrait |  |
| Délai pour recevoir l'argent (en jours) et pour le retrait sur MTN (en heures) |  |
| Compte au nom de l'entreprise : documents demandés et délai d'ouverture |  |
| Le numéro MTN qui reçoit doit-il être au nom de l'entreprise ou du gérant ? |  |
| Mode test (sandbox) disponible pour que je branche KOMYO avant de passer en vrai ? |  |
| Confirmation automatique du paiement (webhook) et remboursements possibles ? |  |


## 4. Message à envoyer (WhatsApp ou e-mail)

> Bonjour, je suis Carry OTEMBA, dirigeant de STAR ENTREPRISE (Congo-Brazzaville, Pointe-Noire / Brazzaville). Nous avons une application, KOMYO, et nous voulons encaisser des paiements par carte Visa/Mastercard et par MTN MoMo / Airtel Money, puis recevoir nos fonds sur notre MTN MoMo. Pouvez-vous me répondre : 1) le Congo-Brazzaville est-il couvert pour les encaissements ? 2) cartes Visa et Mastercard acceptées ? 3) retrait vers MTN MoMo du Congo-Brazzaville possible, avec quels frais et quel délai ? 4) quels documents pour ouvrir un compte entreprise ? 5) un mode test pour intégration par API ? Merci.


## 5. Documents à préparer (tu as déjà le registre de commerce et le numéro fiscal)

- ☐ Registre de commerce de STAR ENTREPRISE
- ☐ Numéro d'identification fiscale
- ☐ Statuts de l'entreprise (si demandés)
- ☐ Pièce d'identité du gérant (recto/verso, lisible)
- ☐ Adresse de l'entreprise et justificatif
- ☐ Numéro MTN MoMo du titulaire du compte (SIM enregistrée au bon nom)
- ☐ Adresse du site : https://komyo.starentreprise.com
- ☐ Mentions légales, conditions de vente et politique de remboursement publiées sur le site (beaucoup de services les demandent)
- ☐ E-mail professionnel : contact@starentreprise.com


## 6. Après le choix : ce que je fais dans KOMYO

- Je branche le paiement par carte et Mobile Money pour les abonnements, les annonces et Keydou, avec **confirmation automatique** du paiement.
- Les clés vont dans les réglages secrets de Netlify, jamais dans le code ni dans la conversation.
- Je teste d'abord en mode test, puis un petit paiement réel de ta part.
- Je garde la confirmation manuelle actuelle comme solution de secours.


## 7. Sécurité et prudence

- Ne donne jamais les clés secrètes dans un message, un e-mail ou un groupe.
- Utilise uniquement le site officiel du service (adresse écrite à la main), jamais un lien reçu par message.
- Aucun service sérieux ne demande de payer des frais « de déblocage » avant d'ouvrir ton compte.
- Sépare l'argent de l'entreprise et ton argent personnel.

_À compléter : nom du service retenu, date d'ouverture du compte, frais confirmés par écrit._
