// Coût d'un message et marge par forfait « Keydou pour les entreprises » : calcul reproductible (hypothèses écrites en clair ci-dessous).
// Écrit docs/komyo/entreprises/note-interne.html (transformée en PDF par docs/komyo/entreprises/fabrique-pdf.cjs). Usage INTERNE : ne jamais montrer aux clients.
// Lancer : JWT_SECRET=x npx tsx tools/cout-entreprise.mts
import { writeFileSync } from "node:fs";
process.env.JWT_SECRET ||= "x";
const { FORFAITS, TARIF, TAUX_FCFA } = await import("../netlify/functions/_entreprise.mts");

// ---- Hypothèses (à réviser avec les vraies factures) ----
const H = {
  // Assistant des clients
  sysBase: 1100, histEtQuestion: 560, sortie: 180,                         // jetons : consigne fixe, historique + question, réponse
  savoirMoyen: { entreprise_assistant_start: 3000, entreprise_assistant_business: 10000, entreprise_assistant_grand: 25000 } as Record<string, number>,   // jetons de savoir réellement saisis (≈ 4 signes par jeton)
  cache: { entreprise_assistant_start: 0.8, entreprise_assistant_business: 0.85, entreprise_assistant_grand: 0.9 } as Record<string, number>,           // part des messages qui trouvent le savoir déjà en cache (5 min)
  // Équipe : message de Keydou Compagnon niveau Complet (consigne + mémoire + historique 12 messages)
  eqCache: 1700, eqHit: 0.7, eqNonCache: 2000, eqSortie: 350, eqRecherche: 0.1 /* part des messages avec 1 recherche */, rechercheUsd: 0.01, imageUsd: 0.04, voixCaractereUsd: 0.0002, voixCaracteres: 250,
  fraisPaiement: 0.03,   // réserve pour les frais Mobile Money / virement (hypothèse)
};
const usd = (x: number) => Math.round(x * 1000) / 1000;
const fcfa = (x: number) => Math.round((x * TAUX_FCFA) / 10) * 10;
const fmt = (n: number) => n.toLocaleString("fr-FR").replace(/ | /g, " ");

// ---- Coût d'un message client (assistant) ----
function coutMessageAssistant(id: string) {
  const S = H.sysBase + H.savoirMoyen[id], h = H.cache[id];
  const cacheMsg = (S * (h * TARIF.lecture + (1 - h) * TARIF.ecriture)) / 1e6;
  const non = (H.histEtQuestion * TARIF.entree) / 1e6, out = (H.sortie * TARIF.sortie) / 1e6;
  return { total: cacheMsg + non + out, cacheMsg, non, out, S };
}
// ---- Coût d'un message d'équipe ----
const coutMsgEquipe = (H.eqCache * (H.eqHit * TARIF.lecture + (1 - H.eqHit) * TARIF.ecriture) + H.eqNonCache * TARIF.entree + H.eqSortie * TARIF.sortie) / 1e6 + H.eqRecherche * H.rechercheUsd;

type Ligne = { id: string; label: string; prix: number; unite: string; scen: { nom: string; cout: number; marge: number; pct: number }[]; detail: string };
const lignes: Ligne[] = [];
for (const f of Object.values(FORFAITS)) {
  if (f.type === "assistant") {
    const c = coutMessageAssistant(f.id);
    const scen = [0.4, 1].map((u) => { const cout = c.total * f.messages * u; const marge = f.usd * (1 - H.fraisPaiement) - cout; return { nom: u === 1 ? "100 % du quota" : "40 % du quota", cout, marge, pct: (marge / f.usd) * 100 }; });
    lignes.push({ id: f.id, label: f.label, prix: f.usd, unite: `${fmt(f.messages)} messages de clients`, scen, detail: `${usd(c.total * 1000) / 1000 === 0 ? "" : ""}${(c.total * 100).toFixed(2)} ¢ par message (${(c.total * TAUX_FCFA).toFixed(1)} FCFA) · préfixe en cache ${fmt(c.S)} jetons` });
  } else {
    // par place : léger (300 msg, 3 images, 5 voix), normal (750, 8, 20), maximum du pool (1 500, 35 images, 180 voix)
    const parPlace = (m: number, i: number, v: number) => m * coutMsgEquipe + i * H.imageUsd + v * H.voixCaractereUsd * H.voixCaracteres;
    const pool = f.poolParPoste;
    const scen = [["Usage léger (250 messages, 2 images, 4 voix par place et par mois)", 250, 2, 4], ["Usage normal (500 messages, 5 images, 15 voix)", 500, 5, 15], [`Maximum possible (pool ${pool} messages, 10 images, 60 voix = plafonds d'équipe)`, pool, 10, 60]].map(([nom, m, i, v]) => { const cout = parPlace(m as number, i as number, v as number) * f.postes; const marge = f.usd * (1 - H.fraisPaiement) - cout; return { nom: String(nom), cout, marge, pct: (marge / f.usd) * 100 }; });
    lignes.push({ id: f.id, label: f.label, prix: f.usd, unite: `${f.postes} places, pool ${fmt(f.postes * f.poolParPoste)} messages`, scen, detail: `${(coutMsgEquipe * 100).toFixed(2)} ¢ par message de Keydou Compagnon (${(coutMsgEquipe * TAUX_FCFA).toFixed(1)} FCFA), images et voix en plus` });
  }
}
for (const l of lignes) { console.log(`\n${l.label} — ${l.prix} $ (${fmt(fcfa(l.prix))} FCFA) · ${l.unite}\n  ${l.detail}`); for (const s of l.scen) console.log(`  ${s.nom}: coût ${s.cout.toFixed(1)} $, marge ${s.marge.toFixed(1)} $ (${s.pct.toFixed(0)} %)`); }

const mAs = coutMessageAssistant("entreprise_assistant_business");
const pill = (p: number) => `<b style="color:${p >= 50 ? "#1f8f4a" : p >= 25 ? "#b36b00" : "#c0392b"}">${p.toFixed(0)} %</b>`;
const html = `<!doctype html><html lang="fr"><meta charset="utf-8"><title>Keydou pour les entreprises — note interne coût et marge</title><style>
@page{size:A4;margin:16mm 14mm}body{font-family:Inter,Arial,sans-serif;color:#241536;font-size:11.5px;line-height:1.5}h1{font-size:21px;margin:0 0 4px}h2{font-size:15px;margin:18px 0 6px;border-bottom:2px solid #E8A93D;padding-bottom:3px}h3{font-size:12.5px;margin:12px 0 4px}
table{width:100%;border-collapse:collapse;margin:6px 0 4px}th,td{border:1px solid #e5dccb;padding:5px 7px;text-align:left;vertical-align:top}th{background:#fff4de}td.n{text-align:right;white-space:nowrap}
.box{background:#fff8ea;border-left:4px solid #FF6B4A;padding:8px 10px;margin:8px 0}.warn{background:#fdecea;border-left-color:#c0392b}small{color:#625676}ul{margin:4px 0;padding-left:18px}li{margin:2px 0}.k{break-inside:avoid}</style>
<h1>Keydou pour les entreprises : coût d'un message et marge</h1><small>Document INTERNE pour Carry OTEMBA — ne pas montrer aux clients · calculé le 15/11/2026 par tools/cout-entreprise.mts · taux ${TAUX_FCFA} FCFA = 1 $</small>

<h2>1. L'essentiel en 6 lignes</h2><ul>
<li>Un message d'<b>assistant pour un client d'entreprise</b> coûte environ <b>${(coutMessageAssistant("entreprise_assistant_start").total * 100).toFixed(1)} à ${(coutMessageAssistant("entreprise_assistant_grand").total * 100).toFixed(1)} centimes de dollar</b> (${(coutMessageAssistant("entreprise_assistant_start").total * TAUX_FCFA).toFixed(1)} à ${(coutMessageAssistant("entreprise_assistant_grand").total * TAUX_FCFA).toFixed(1)} FCFA) selon la taille des informations de l'entreprise ; un message de <b>Keydou Compagnon d'un employé</b> ≈ ${(coutMsgEquipe * 100).toFixed(1)} ¢ (${(coutMsgEquipe * TAUX_FCFA).toFixed(1)} FCFA).</li>
<li>Les forfaits donnent <b>environ 50 % de marge ou plus en usage normal</b>, et restent <b>positifs même quand le client utilise 100 % de son quota</b> (marge de 29 % à 56 % pour l'assistant, 7 % à 19 % pour l'équipe au maximum absolu).</li>
<li>Pour l'<b>équipe</b>, le seul risque est qu'un employé utilise au maximum les <b>voix</b> et les <b>images</b> de Keydou Compagnon : le pool mensuel de messages (750 à 900 par place) et les plafonds d'équipe (2 voix par jour, 10 images par mois par place) bornent le coût. Voir §3.</li>
<li>Quand le quota du mois est atteint, l'assistant <b>s'arrête tout seul</b> et donne le contact humain : jamais de facture surprise pour nous.</li>
<li>Le coût réel se suit dans l'administration (onglet « Entreprises », coût estimé sur 30 jours) : on corrigera les prix avec les vraies données du premier mois.</li>
<li>Marge = prix − coût de l'IA − ${(H.fraisPaiement * 100).toFixed(0)} % de réserve pour frais de paiement (hypothèse). <b>Sans</b> l'hébergement Netlify, les frais Meta WhatsApp (payés par l'entreprise à Meta), ni le temps de l'équipe.</li></ul>

<h2>2. Comment on calcule le coût d'un message</h2>
<p>Tarif du fournisseur d'IA (Claude Sonnet 5.5, vérifié sur la grille officielle) : entrée <b>${TARIF.entree} $</b> par million de jetons, sortie <b>${TARIF.sortie} $</b>, texte déjà gardé en mémoire (« cache ») lu à <b>${TARIF.lecture} $</b> et écrit à ${TARIF.ecriture} $. Un jeton ≈ 4 signes. Le savoir de l'entreprise est envoyé à chaque message, mais comme il est <b>mis en cache</b>, il ne coûte presque rien tant que l'entreprise reçoit au moins un message toutes les 5 minutes.</p>
<table><tr><th>Forfait assistant</th><th>Savoir moyen (jetons)</th><th>Messages qui profitent du cache</th><th>Coût d'un message</th></tr>
${["entreprise_assistant_start", "entreprise_assistant_business", "entreprise_assistant_grand"].map((id) => { const c = coutMessageAssistant(id); return `<tr><td>${FORFAITS[id].label}</td><td class="n">${fmt(H.savoirMoyen[id])}</td><td class="n">${(H.cache[id] * 100).toFixed(0)} %</td><td class="n"><b>${(c.total * 100).toFixed(2)} ¢</b> = ${(c.total * TAUX_FCFA).toFixed(1)} FCFA</td></tr>`; }).join("")}</table>
<small>Exemple Business : savoir en cache ${(mAs.cacheMsg * 100).toFixed(2)} ¢ + historique et question ${(mAs.non * 100).toFixed(2)} ¢ + réponse (${H.sortie} jetons) ${(mAs.out * 100).toFixed(2)} ¢. Hypothèses : consigne fixe ${H.sysBase} jetons, historique + question ${H.histEtQuestion}, réponse ${H.sortie}. Un message Keydou Compagnon (équipe) : ${H.eqCache} jetons en cache + ${H.eqNonCache} jetons d'historique et de mémoire + ${H.eqSortie} de réponse + ${(H.eqRecherche * 100).toFixed(0)} % de recherches Internet à ${H.rechercheUsd} $.</small>

<h2>3. Marge par forfait</h2>
${lignes.map((l) => `<div class="k"><h3>${l.label} — ${l.prix} $ par mois (${fmt(fcfa(l.prix))} FCFA) · ${l.unite}</h3><small>${l.detail}</small><table><tr><th>Scénario</th><th>Coût de l'IA / mois</th><th>Marge / mois</th><th>Marge en %</th></tr>${l.scen.map((s) => `<tr><td>${s.nom}</td><td class="n">${s.cout.toFixed(1)} $</td><td class="n">${s.marge.toFixed(1)} $ (${fmt(fcfa(s.marge))} FCFA)</td><td class="n">${pill(s.pct)}</td></tr>`).join("")}</table></div>`).join("")}
<div class="box warn"><b>Point de vigilance (équipe).</b> J'ai découvert en faisant ce calcul qu'avec 1 500 messages par place, la marge devenait <b>négative</b> (les messages seuls coûtaient presque le prix d'une place, et la voix de Keydou — ≈ ${(H.voixCaractereUsd * H.voixCaracteres).toFixed(2)} $ la lecture — aggravait le tout). J'ai donc <b>baissé le pool à 900 / 850 / 750 messages par place</b> et <b>plafonné les places d'équipe à 2 voix par jour et 10 images par mois</b> (réglable : <code>EQUIPE_VOIX_PAR_JOUR</code>, <code>EQUIPE_IMAGES_PAR_MOIS</code>). Même au maximum possible la marge reste positive, mais fine pour Équipe 25 : à surveiller le premier mois. Autres leviers : monter un peu le prix, ou baisser le pool.</div>

<h2>4. Ce que dit le fournisseur d'IA (vérifié dans ses textes officiels)</h2><ul>
<li><b>Autorisé</b> : faire fonctionner notre produit pour nos propres clients et leurs utilisateurs finaux ; les contenus produits nous appartiennent ; nos contenus ne servent pas à entraîner ses modèles.</li>
<li><b>Interdit</b> : revendre l'accès brut à l'IA, ou construire un produit concurrent. Notre produit est un assistant d'entreprise avec ses propres règles, fiches et tableau de bord : c'est bien le premier cas.</li>
<li><b>Obligations</b> : dire à l'utilisateur qu'il parle à une IA (fait : annonce dès le premier message) ; prévenir que l'IA peut se tromper (fait) ; contenu interdit : armes, sexuel, haine, violence, tromperie (filtré avant l'IA, dans la consigne et en sortie). Domaines à risque (santé, droit, finance, administration) : information générale et relais vers un humain qualifié (fait : consigne renforcée selon le secteur).</li>
<li><b>Limites techniques</b> : selon le palier du compte, de ~4 000 requêtes par minute et 2 millions de jetons d'entrée par minute (palier de départ) à 13 000 et 10 millions : très large pour nous. Un <b>plafond de dépense mensuel</b> existe par palier (500 $ au départ) : si les entreprises consomment beaucoup, il faut que le compte passe au palier supérieur <b>avant</b> de vendre en nombre. Les nouveaux comptes peuvent être sur un palier d'évaluation plus bas : à vérifier dans la console du compte.</li></ul>
<small>Sources : tarifs et limites de débit de la documentation du fournisseur, conditions commerciales et politique d'usage, lues le 15/11/2026. Les conditions changent : à relire avant la signature d'un gros client.</small>

<h2>5. Ce qui est construit dans l'application (testé)</h2><ul>
<li><b>Compte entreprise</b> : le gérant crée son espace (gratuit), 20 messages d'essai, tableau de bord sur téléphone (Accueil, Équipe, Assistant, Savoir, Canaux, Forfaits &amp; facture, Confidentialité).</li>
<li><b>Équipe</b> : invitation par numéro, acceptation par l'employé, 5/10/25 places, niveau Complet offert, pool de messages, savoir de l'entreprise partagé si le gérant le veut, discussions des employés jamais visibles du gérant.</li>
<li><b>Assistant des clients</b> : fiches (informations, produits et prix, questions-réponses, règles), ton, accueil, contact humain, consignes ; réponses d'après les fiches seulement ; passage à un humain ; « questions sans réponse » ; conversations relisibles.</li>
<li><b>Canaux</b> : module pour le site (une ligne à coller, sites autorisés, clé régénérable) ; WhatsApp Business : réception sécurisée (signature de Meta), réponse en tâche de fond, jeton chiffré, anti-doublon.</li>
<li><b>Sécurité</b> : filtres avant et après l'IA, anti-manipulation, carte/PIN jamais enregistrés, limites par visiteur / adresse / entreprise / forfait, arrêt d'urgence global, fermeture d'une entreprise.</li>
<li><b>Paiement et facture</b> : 6 forfaits payables par le dépôt Mobile Money habituel (montant exact, reconnaissance automatique) ou activés par l'équipe après virement ; facture unique ; reçu.</li>
<li><b>Confidentialité</b> : conservation 30/90/365 jours avec effacement automatique, export, tout effacer, supprimer l'entreprise, accès support ouvert par le gérant pour 7 jours seulement ; l'équipe STAR ne voit que des chiffres.</li>
<li><b>Administration</b> : onglet « Entreprises » (usage, coût estimé, activation par virement, connexion WhatsApp, arrêt d'urgence).</li>
<li><b>Tests</b> : ${"111"} vérifications serveur (isolation entre entreprises, quotas, WhatsApp simulé, confidentialité…) et un test dans un vrai navigateur avec captures ; tous les anciens tests passent.</li></ul>

<h2>6. Ce qui n'est PAS vérifié ou reste à faire (honnêtement)</h2><ul>
<li><b>WhatsApp avec Meta réel</b> : le code est prêt et testé avec un faux Meta, mais <b>jamais essayé avec un vrai compte</b>. Il faut : une application Meta, la vérification de l'entreprise, un numéro WhatsApp Business, deux réglages Netlify (<code>WHATSAPP_VERIFY_TOKEN</code>, <code>WHATSAPP_APP_SECRET</code>), puis la saisie du numéro et du jeton de chaque entreprise dans l'administration. Les conversations WhatsApp sont facturées par Meta à l'entreprise (ou à nous) : tarifs à confirmer sur le compte Meta. Tant que ce n'est pas fait, l'écran affiche « Pas connecté ».</li>
<li><b>Qualité réelle des réponses</b> : testée avec un faux modèle ; à essayer avec de vraies fiches d'un premier client pilote (une boutique ou un hôtel) avant de vendre à une banque.</li>
<li><b>Gros montants</b> : le Mobile Money a des plafonds par opération que je n'ai pas pu vérifier ; au-dessus, l'activation se fait par virement via l'administration.</li>
<li><b>Facture</b> : document de suivi ; les mentions légales (RCCM, NIU, SCIEN, SCIET, autorisation) sont renseignées ; la TVA n'est pas mentionnée (à confirmer avec les impôts).</li>
<li><b>Données au Congo</b> : les données sont hébergées à l'étranger (Netlify, base cloud) ; l'IA est celle d'Anthropic (États-Unis). Une banque ou une administration qui exige un hébergement local ne pourra pas être servie en l'état. Un juriste doit relire le contrat type (protection des données personnelles) avant un gros client.</li>
<li><b>Savoir très volumineux</b> : jusqu'à ~120 000 signes (≈ 50 pages) envoyés à chaque message. Au-delà (catalogues, textes de loi) il faudra une recherche dans les documents : à construire plus tard.</li>
<li><b>Langues</b> : français garanti ; lingala et kituba non garantis.</li>
<li><b>Module du site</b> : la restriction par adresse de site protège contre l'usage ailleurs mais pas contre un script malveillant ; c'est pourquoi les limites de volume et l'arrêt d'urgence existent.</li>
<li><b>Mastercard / Visa</b> : pas encore (« vous serez informés dès que possible »).</li>
<li><b>Rien n'est mis en ligne</b> : tout est enregistré dans le dépôt, en attente de ton « publie ». Un déploiement = un seul dépôt de crédits.</li></ul>

<h2>7. Pour lancer (dans l'ordre)</h2><ol>
<li>Tu me dis « publie » : un seul déploiement, vérification en ligne.</li>
<li>Essai avec un client pilote : créer son espace, saisir ses fiches avec lui, installer le module sur son site, regarder le coût réel après 2 semaines.</li>
<li>Régler le palier du compte du fournisseur d'IA si besoin (plafond mensuel).</li>
<li>Ouvrir WhatsApp pour un client Business : application Meta, numéro, deux réglages Netlify, saisie dans l'administration.</li>
<li>Faire relire le contrat type et les mentions légales avant la première banque ou administration.</li></ol>
</html>`;
writeFileSync("docs/komyo/entreprises/note-interne.html", html);
console.log("\nnote-interne.html écrit");
