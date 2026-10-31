// Test de la lecture des SMS Mobile Money : un dépôt reçu est reconnu, un achat ou un paiement ne l'est jamais.
process.env.JWT_SECRET = "secret-de-test";
const m = await import("../netlify/functions/_push.mts");
const cas: [string, boolean][] = [
 ["Votre paiement de 200 F a AIRTIME, a ete effectue le 2026-10-31 22:07:20. Solde est de 4025 F. Frais: 0 F. ID de la transaction: 8464808704. Vous avez gagne 1points pour la promo Sepela na MoMo Ed2.", false],
 ["Votre achat de credit de XAF 200 XAF a ete realise avec succes. Solde: XAF 4,025 XAF. ID: 8464808704", false],
 ["Votre paiement de 650 F a MTN FORFAIT, a ete effectue. Solde est de 14725 F. Vous avez achete avec succes un forfait 6GB + bonus a 650F de 650.0 FCFA.", false],
 ["Vous avez recu 1500 FCFA de 06 612 34 56. Solde: 6000 FCFA. ID: 123", true],
 ["Vous avez reçu un dépôt de 1 500 FCFA de DUPONT Jean (066123456). KDU-12", true],
 ["Votre compte a ete credite de 1500 XAF par 06 612 34 56. Solde: 5000 XAF", true],
 ["Depot de 1500 FCFA recu de 066123456", true],
 ["Vous avez envoye 1500 FCFA a 066123456", false],
 ["Retrait de 5000 FCFA effectue", false],
 // Forme réelle d'un SMS de dépôt MTN Congo (31/10/2026) ; nom et numéro fictifs.
 ["Vous avez recu 1500 XAF de NOM PRENOM (242061234567) sur votre compte mobile money 2026-10-31 22:37:34. Message de l'exp diteur: . Solde: 5525 XAF. FRAIS: FCFA 0. ID: 1234567890.", true],
 ["Vous avez reçu un paiement de 1500 FCFA de 066123456. Solde: 3000 FCFA", true],
];
let bad=0;
for (const [t,att] of cas){ const r=m.parseSms(t); const ok=r.depot===att; if(!ok)bad++; console.log(ok?"OK ":"KO ", r.depot, r.montant, t.slice(0,60)); }
const vrai = m.parseSms("Vous avez recu 1500 XAF de NOM PRENOM (242061234567) sur votre compte mobile money 2026-10-31 22:37:34. Solde: 5525 XAF. FRAIS: FCFA 0. ID: 1234567890.");
if (vrai.montant !== 1500 || vrai.numero !== "061234567") { bad++; console.log("KO SMS réel : montant", vrai.montant, "numéro", vrai.numero); }
console.log(bad ? "ÉCHECS : " + bad : "tous les tests passent");
if (bad) process.exit(1);
