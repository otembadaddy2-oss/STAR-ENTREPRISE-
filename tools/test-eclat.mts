// Test d'ÉCLAT (le direct) : vrai code serveur, vraie base locale, FAUX service vidéo (aucun réseau, aucun coût).
// Lancer : service postgresql start ; NETLIFY_DB_URL=postgres://postgres:kt@localhost:5432/kt npx tsx tools/test-eclat.mts
process.env.JWT_SECRET = "secret-de-test-assez-long-0123456789-abcdef";
process.env.LIVEKIT_URL = "wss://test.livekit.cloud"; process.env.LIVEKIT_API_KEY = "APItest"; process.env.LIVEKIT_API_SECRET = "secret-de-test-assez-long-pour-hs256-0123456789";
if (!process.env.NETLIFY_DB_URL) process.env.NETLIFY_DB_URL = "postgres://postgres:kt@localhost:5432/kt";
const { jwtVerify } = await import("jose");
const { ensureSchema, db } = await import("../netlify/functions/_db.mts");
const { issueToken } = await import("../netlify/functions/_auth.mts");
const api = (await import("../netlify/functions/api-starvibe-eclat.mts")).default;
const { PLAFOND_SPECTATEURS, DUREE_MAX_MIN, titreNettoye, identiteValide, prevenirAbonnes, MAX_PREVENUS } = await import("../netlify/functions/_eclat.mts");
let ko = 0; const ok = (c: boolean, m: string) => { console.log((c ? "OK  " : "ÉCHEC ") + m); if (!c) ko++; };
await ensureSchema(); const { sql } = db();
const lk: { methode: string; corps: Record<string, any> }[] = []; let lkPanne = false;
const vraiFetch = globalThis.fetch;
globalThis.fetch = (async (u: string | URL, o?: { body?: string }) => {
  const url = String(u);
  if (url.includes("/twirp/livekit.RoomService/")) { if (lkPanne) throw new Error("réseau"); lk.push({ methode: url.split("/").pop()!, corps: JSON.parse(String(o?.body)) }); return new Response("{}", { status: 200 }); }
  return vraiFetch(u as string, o as RequestInit);
}) as typeof fetch;
async function membre(nom: string, photoKey = "") {
  const tel = "242" + String(Math.floor(Math.random() * 1e9)).padStart(9, "0");
  const a = (await sql`INSERT INTO starvibe_accounts (telephone, pin_hash) VALUES (${tel}, 'x') RETURNING id`) as { id: number }[];
  await sql`INSERT INTO starvibe_profiles (account_id, nom, date_naissance, type_profil, photo_key) VALUES (${a[0].id}, ${nom}, '1990-01-01', 'personnel', ${photoKey || null})`;
  const token = await issueToken({ sub: String(a[0].id), username: nom, displayName: nom, org: "star_vibe", role: "member" });
  return { id: a[0].id, token };
}
const appel = (c: { token: string }, methode: string, qs = "", corps?: unknown) => api(new Request("https://t.test/api/starvibe-eclat" + qs, { method: methode, headers: { authorization: "Bearer " + c.token, "content-type": "application/json" }, body: corps ? JSON.stringify(corps) : undefined }), {} as any);
const lire = async (r: Response) => ({ s: r.status, d: await r.json() as Record<string, any> });
const staffToken = await issueToken({ sub: "1", username: "carry", displayName: "Carry", org: "star_entreprise", role: "admin" });
const staff = { token: staffToken };

await sql`DELETE FROM starvibe_settings WHERE key = 'eclat_ouvert'`;
await sql`DELETE FROM starvibe_eclat_directs`;   // base de test : on repart de zéro (des directs d'un essai précédent fausseraient la liste)
const anim = await membre("Wilfried", "k1.jpg"), fan = await membre("Sabine"), inconnu = await membre("Hennoch");
await sql`INSERT INTO starvibe_salon_acces (account_id) VALUES (${anim.id}), (${fan.id}) ON CONFLICT DO NOTHING`;

// Test fermé : seuls les testeurs
let r = await lire(await appel(inconnu, "GET", "?directs=1")); ok(r.s === 200 && r.d.visible === false && /test fermé/.test(r.d.raison), "test fermé : un membre ordinaire ne voit pas ÉCLAT");
r = await lire(await appel(inconnu, "POST", "", { action: "demarrer", titre: "x" })); ok(r.s === 403, "test fermé : un membre ordinaire ne peut pas diffuser");
r = await lire(await appel(anim, "GET", "?directs=1")); ok(r.d.visible === true && r.d.directs.length === 0, "testeur : voit ÉCLAT, aucun direct pour l'instant");

// Démarrer
r = await lire(await appel(anim, "POST", "", { action: "demarrer", titre: "  Culte   du   dimanche  " }));
const code = r.d.code as string; ok(r.s === 201 && /^[A-HJ-NP-Z2-9]{8}$/.test(code) && r.d.titre === "Culte du dimanche", "démarrer : code valide, titre nettoyé");
const cr = lk.find((x) => x.methode === "CreateRoom");
ok(!!cr && cr.corps.max_participants === PLAFOND_SPECTATEURS + 1 && cr.corps.name === code, "démarrer : salle créée avec le plafond de spectateurs");
const jtH = (await jwtVerify(r.d.jeton, new TextEncoder().encode(process.env.LIVEKIT_API_SECRET!))).payload as any;
ok(jtH.video.canPublish === true && jtH.video.room === code && jtH.name === "Wilfried" && JSON.parse(jtH.metadata).p.includes("k1.jpg"), "jeton animateur : publie ; porte son nom et sa photo");
ok(jtH.exp - jtH.nbf <= DUREE_MAX_MIN * 60 + 20, "jeton : valable au plus une heure");

// Liste et regarder
r = await lire(await appel(fan, "GET", "?directs=1")); ok(r.d.directs.length === 1 && r.d.directs[0].code === code && r.d.directs[0].hote === "Wilfried" && r.d.directs[0].photo.includes("k1.jpg"), "liste : le direct en cours apparaît avec son animateur et sa photo");
r = await lire(await appel(fan, "POST", "", { action: "regarder", code }));
const jtS = (await jwtVerify(r.d.jeton, new TextEncoder().encode(process.env.LIVEKIT_API_SECRET!))).payload as any;
ok(r.s === 200 && jtS.video.canPublish === false && jtS.video.canSubscribe === true && jtS.video.canPublishData === true && r.d.animateur === false && r.d.hoteIdentite === `m${anim.id}`, "regarder : le spectateur reçoit mais ne publie pas la vidéo ; il peut écrire et réagir");
r = await lire(await appel(inconnu, "POST", "", { action: "regarder", code })); ok(r.s === 403, "test fermé : un membre ordinaire ne peut pas regarder");
r = await lire(await appel(anim, "POST", "", { action: "regarder", code })); ok(r.d.animateur === true, "l'animateur qui revient retrouve son rôle");

// Droits de l'animateur
r = await lire(await appel(fan, "POST", "", { action: "terminer", code })); ok(r.s === 403, "un spectateur ne peut pas terminer le direct");
r = await lire(await appel(fan, "POST", "", { action: "retirer", code, identite: `m${anim.id}` })); ok(r.s === 403, "un spectateur ne peut pas retirer quelqu'un");
r = await lire(await appel(anim, "POST", "", { action: "retirer", code, identite: `m${fan.id}` })); ok(r.s === 200 && lk.some((x) => x.methode === "RemoveParticipant" && x.corps.identity === `m${fan.id}`), "l'animateur peut retirer un spectateur");
r = await lire(await appel(anim, "POST", "", { action: "retirer", code, identite: `m${anim.id}` })); ok(r.s === 400, "l'animateur ne peut pas se retirer lui-même");
r = await lire(await appel(anim, "POST", "", { action: "retirer", code, identite: "x; DROP" })); ok(r.s === 400, "identité douteuse refusée");

// Battement : un direct sans signe de vie disparaît de la liste
r = await lire(await appel(anim, "POST", "", { action: "battement", code })); ok(r.d.ok === true && r.d.fini === false, "battement : le direct continue");
await sql`UPDATE starvibe_eclat_directs SET vu_at = now() - interval '5 minutes' WHERE code = ${code}`;
r = await lire(await appel(fan, "GET", "?directs=1")); ok(r.d.directs.length === 0, "sans signe de vie de l'animateur : le direct n'est plus proposé");
await appel(anim, "POST", "", { action: "battement", code });
r = await lire(await appel(fan, "GET", "?directs=1")); ok(r.d.directs.length === 1, "le signe de vie le fait réapparaître");

// Un seul direct à la fois
r = await lire(await appel(anim, "POST", "", { action: "demarrer", titre: "Deuxième" })); const code2 = r.d.code;
ok(code2 !== code && lk.some((x) => x.methode === "DeleteRoom" && x.corps.room === code), "un nouveau direct ferme l'ancien");
r = await lire(await appel(fan, "POST", "", { action: "regarder", code })); ok(r.s === 410 && r.d.code === "termine", "regarder un direct fermé : message « terminé »");

// Terminer
r = await lire(await appel(anim, "POST", "", { action: "terminer", code: code2 })); ok(r.s === 200, "terminer : ok");
r = await lire(await appel(fan, "GET", "?directs=1")); ok(r.d.directs.length === 0, "terminer : plus aucun direct proposé");
r = await lire(await appel(anim, "POST", "", { action: "battement", code: code2 })); ok(r.d.fini === true, "battement après la fin : l'animateur est prévenu");

// Plafond de directs par jour (membre non testeur, ÉCLAT ouvert à tous)
await sql`INSERT INTO starvibe_settings (key, value) VALUES ('eclat_ouvert', 'on') ON CONFLICT (key) DO UPDATE SET value = 'on'`;
const simple = await membre("Armel"); let dernier = 0;
for (let i = 0; i < 4; i++) { const x = await lire(await appel(simple, "POST", "", { action: "demarrer", titre: "t" + i })); dernier = x.s; }
ok(dernier === 429, "membre ordinaire : 3 directs par jour au plus");
r = await lire(await appel(inconnu, "GET", "?directs=1")); ok(r.d.visible === true, "ouvert à tous : un membre ordinaire voit ÉCLAT");

// Service vidéo en panne
await sql`DELETE FROM starvibe_eclat_directs WHERE hote_id = ${anim.id}`; lkPanne = true;
r = await lire(await appel(anim, "POST", "", { action: "demarrer", titre: "p" })); ok(r.s === 502 && /service vidéo/.test(r.d.error), "panne du service vidéo : message clair, aucun direct fantôme");
const fantome = (await sql`SELECT 1 FROM starvibe_eclat_directs WHERE hote_id = ${anim.id}`) as unknown[]; ok(fantome.length === 0, "panne : rien n'est enregistré");
lkPanne = false;


// Prévenir les abonnés (téléphone) : seulement ceux qui suivent l'animateur ; test fermé : seulement ceux qui ont accès
{
  const suit = await membre("Suiveur testeur"), suit2 = await membre("Suiveur ordinaire"), pasAbonne = await membre("Pas abonné"), bloque = await membre("Bloqué");
  await sql`INSERT INTO starvibe_salon_acces (account_id) VALUES (${suit.id}) ON CONFLICT DO NOTHING`;
  await sql`INSERT INTO starvibe_follows (follower, followed) VALUES (${suit.id}, ${anim.id}), (${suit2.id}, ${anim.id}), (${bloque.id}, ${anim.id}) ON CONFLICT DO NOTHING`;
  await sql`INSERT INTO starvibe_blocks (blocker, blocked) VALUES (${anim.id}, ${bloque.id}) ON CONFLICT DO NOTHING`;
  const avis = { title: "🔴 Wilfried est en direct", body: "Culte", tag: "eclat-X", url: "/starvibe/eclat.html?v=X" };
  const recus: number[] = []; const envoi = async (_s: unknown, id: number) => { recus.push(id); return 1; };
  let n = await prevenirAbonnes(sql, anim.id, false, avis, envoi);
  ok(n === 1 && recus.length === 1 && recus[0] === suit.id, "test fermé : seul l'abonné qui a accès est prévenu (pas les autres, pas le bloqué)");
  recus.length = 0; n = await prevenirAbonnes(sql, anim.id, true, avis, envoi);
  ok(n === 2 && recus.includes(suit.id) && recus.includes(suit2.id) && !recus.includes(pasAbonne.id) && !recus.includes(bloque.id), "ouvert à tous : tous les abonnés sont prévenus, jamais une personne bloquée ni un non-abonné");
  n = await prevenirAbonnes(sql, anim.id, true, avis, async () => { throw new Error("panne"); }); ok(n === 0, "panne d'envoi : aucune erreur, le direct démarre quand même");
  const t0 = Date.now(); n = await prevenirAbonnes(sql, anim.id, true, avis, () => new Promise<number>((r) => setTimeout(() => r(1), 10000)), 300); ok(Date.now() - t0 < 2000, "envoi trop lent : le direct n'attend pas (durée bornée)");
  ok(MAX_PREVENUS === 200, "plafond : 200 personnes prévenues par direct");
  // abonnement du téléphone
  let r2 = await lire(await appel(suit, "POST", "", { action: "notifier", subscription: { endpoint: "https://push.test/abc", keys: { p256dh: "p", auth: "a" } } }));
  const lig = (await sql`SELECT account_id FROM starvibe_compagnon_push WHERE endpoint = 'https://push.test/abc'`) as { account_id: number }[];
  ok(r2.s === 200 && lig[0]?.account_id === suit.id, "notifier : le téléphone est enregistré pour être prévenu");
  r2 = await lire(await appel(suit, "POST", "", { action: "notifier", subscription: { endpoint: "x" } })); ok(r2.s === 400, "notifier : abonnement invalide refusé");
  await sql`DELETE FROM starvibe_compagnon_push WHERE endpoint = 'https://push.test/abc'`;
}
// Liste d'attente conservée + équipe
r = await lire(await appel(fan, "POST", "", { action: "rejoindre" })); ok(r.d.inscrit === true, "liste d'attente : toujours disponible");
r = await lire(await appel(staff, "POST", "", { action: "ouvrir", on: false })); ok(r.s === 200, "équipe : peut refermer ÉCLAT");
r = await lire(await appel(staff, "GET", "?admin=1")); ok(r.d.ouvert === false && r.d.pret === true && Array.isArray(r.d.directs), "équipe : état et derniers directs");
r = await lire(await appel(inconnu, "POST", "", { action: "ouvrir", on: true })); ok(r.s !== 200 || r.d.ok !== true, "un membre ne peut pas ouvrir ÉCLAT à tous");
ok(titreNettoye("") === "Direct ÉCLAT" && titreNettoye("a".repeat(200)).length === 60 && identiteValide("m12") && !identiteValide("12"), "titres et identités");
await sql`DELETE FROM starvibe_settings WHERE key = 'eclat_ouvert'`; await sql`DELETE FROM starvibe_eclat_directs`;
console.log(ko ? `\n${ko} ÉCHEC(S)` : "\nTOUS LES TESTS OK"); process.exit(ko ? 1 : 0);
