// Test de bout en bout des DISCUSSIONS KOMYO (messages entre amis) : le vrai code serveur contre une vraie base PostgreSQL locale,
// avec un FAUX service de notifications (aucun réseau, aucun coût).
// Lancer : service postgresql start ; node --experimental-strip-types tools/test-dm.mts
process.env.JWT_SECRET = "secret-de-test-assez-long-0123456789-abcdef";
if (!process.env.NETLIFY_DB_URL) process.env.NETLIFY_DB_URL = "postgres://postgres:kt@localhost:5432/kt";
const { ensureSchema, db } = await import("../netlify/functions/_db.mts");
const { issueToken } = await import("../netlify/functions/_auth.mts");
const apiDm = (await import("../netlify/functions/api-starvibe-dm.mts")).default;
const apiMyo = (await import("../netlify/functions/api-starvibe-myo.mts")).default;
const webpush = (await import("web-push")).default as unknown as { sendNotification: (...a: unknown[]) => Promise<unknown> };
let ko = 0; const ok = (c: boolean, m: string) => { console.log((c ? "OK  " : "ÉCHEC ") + m); if (!c) ko++; };

await ensureSchema(); const { sql } = db();

// ---------- Faux service de notifications ----------
const envoisPush: { endpoint: string; payload: { title: string; body: string; url: string; tag: string } }[] = [];
let pushEnPanne = false;
webpush.sendNotification = async (sub: any, payload: any) => {
  if (pushEnPanne) throw new Error("service de notification en panne");
  envoisPush.push({ endpoint: sub.endpoint, payload: JSON.parse(String(payload)) });
  return {};
};

// ---------- Aides ----------
let n = 0;
async function compte(nom: string, naissance = "1990-01-01") {
  const tel = "242" + String(Math.floor(Math.random() * 9e8) + 1e8) + String(++n);
  const a = (await sql`INSERT INTO starvibe_accounts (telephone, pin_hash) VALUES (${tel}, 'x') RETURNING id`) as { id: number }[];
  const p = (await sql`INSERT INTO starvibe_profiles (account_id, nom, date_naissance, type_profil) VALUES (${a[0].id}, ${nom}, ${naissance}, 'personnel') RETURNING id`) as { id: number }[];
  const token = await issueToken({ sub: String(a[0].id), username: nom, displayName: nom, org: "star_vibe", role: "member" });
  return { id: a[0].id, profil: p[0].id, token, nom };
}
type C = { id: number; profil: number; token: string; nom: string };
const amis = async (a: C, b: C) => { await sql`INSERT INTO starvibe_myo (de_account, vers_account, statut) VALUES (${a.id}, ${b.id}, 'acceptee')`; };
const appel = (fn: (r: Request) => Promise<Response>, c: { token: string } | null, methode: string, chemin: string, corps?: unknown) =>
  fn(new Request("https://t.test" + chemin, { method: methode, headers: { "content-type": "application/json", ...(c ? { authorization: "Bearer " + c.token } : {}) }, body: corps === undefined ? undefined : JSON.stringify(corps) }));
const j = async (r: Response) => (await r.json().catch(() => ({}))) as Record<string, any>;
const dm = (c: { token: string } | null, m: string, qs: string, corps?: unknown) => appel(apiDm as any, c, m, "/api/starvibe-dm" + qs, corps);
const myo = (c: C, corps: unknown) => appel(apiMyo as any, c, "POST", "/api/starvibe-myo", corps);
const envoyer = (de: C, vers: C, texte: string) => dm(de, "POST", "", { action: "envoyer", profilId: vers.profil, texte });

try {
  const alice = await compte("Alice"), bob = await compte("Bob"), carla = await compte("Carla"), denis = await compte("Denis"), eve = await compte("Eve");
  const mina = await compte("Mina", "2012-05-05"), noe = await compte("Noé", "2012-06-06");
  await amis(alice, bob); await amis(alice, denis); await amis(bob, eve); await amis(mina, noe);

  // ================= 1. Accès =================
  ok((await dm(null, "GET", "?conversations=1")).status === 401, "sans connexion : refusé (401)");
  const staff = { token: await issueToken({ sub: "1", username: "carry", displayName: "Carry", org: "star_entreprise", role: "admin" }) };
  ok((await dm(staff, "GET", "?conversations=1")).status === 401, "un compte du personnel STAR n'est pas un membre KOMYO : refusé");

  // ================= 2. Liste des amis =================
  let d = await j(await dm(alice, "GET", "?conversations=1"));
  ok(d.autorise === true && d.conversations.length === 2, "Alice voit ses 2 amis (Bob, Denis), pas Carla qui n'est pas son amie");
  ok(!d.conversations.some((x: any) => x.nom === "Carla"), "un inconnu n'apparaît jamais dans la liste");

  // ================= 3. Envoi, réception, lecture =================
  let r = await envoyer(alice, bob, "Bonjour Bob, tu viens ce soir ?");
  d = await j(r);
  ok(r.status === 200 && d.ok && d.message.texte === "Bonjour Bob, tu viens ce soir ?", "Alice écrit à Bob : message enregistré");
  d = await j(await dm(bob, "GET", "?nonlus=1")); ok(d.nonLus === 1, "Bob a 1 message non lu (pastille)");
  d = await j(await dm(bob, "GET", "?conversations=1"));
  const chezBob = d.conversations.find((x: any) => x.nom === "Alice");
  ok(chezBob && chezBob.nonLus === 1 && chezBob.dernier.texte.startsWith("Bonjour Bob") && chezBob.dernier.deMoi === false, "chez Bob : Alice en haut, 1 non lu, dernier message visible");
  d = await j(await dm(alice, "GET", `?avec=${bob.profil}`));
  ok(d.messages.length === 1 && d.messages[0].moi === true && d.messages[0].lu === false, "chez Alice : son message est « envoyé », pas encore lu");
  d = await j(await dm(bob, "GET", `?avec=${alice.profil}`));
  ok(d.messages.length === 1 && d.messages[0].moi === false && d.ami.nom === "Alice", "Bob ouvre la discussion : il lit le message d'Alice");
  d = await j(await dm(bob, "GET", "?nonlus=1")); ok(d.nonLus === 0, "après ouverture, Bob n'a plus de message non lu");
  d = await j(await dm(alice, "GET", `?avec=${bob.profil}`)); ok(d.messages[0].lu === true, "Alice voit que Bob a lu son message");
  await envoyer(bob, alice, "Oui j'arrive !");
  d = await j(await dm(alice, "GET", `?avec=${bob.profil}&apres=${d.messages[0].id}`));
  ok(d.messages.length === 1 && d.messages[0].texte === "Oui j'arrive !", "lecture incrémentale (« apres ») : seulement le nouveau message");

  // ================= 4. Règles =================
  r = await envoyer(carla, alice, "Salut"); d = await j(r);
  ok(r.status === 403 && d.code === "pas_amis", "un inconnu ne peut pas écrire (pas amis)");
  r = await dm(carla, "GET", `?avec=${alice.profil}`); ok(r.status === 403, "un inconnu ne peut pas lire une discussion");
  r = await envoyer(mina, noe, "Coucou"); d = await j(r);
  ok(r.status === 403 && d.code === "mineur", "deux amis MINEURS : discussion fermée (réservée aux 18 ans et plus)");
  d = await j(await dm(mina, "GET", "?conversations=1")); ok(d.autorise === false && d.conversations.length === 0, "un mineur voit un message d'explication, aucune conversation");
  r = await envoyer(alice, alice, "moi"); ok(r.status === 403, "on ne s'écrit pas à soi-même");
  r = await dm(alice, "POST", "", { action: "envoyer", profilId: 99999999, texte: "x" }); ok(r.status === 404, "personne inconnue : 404");
  r = await envoyer(alice, bob, "   "); d = await j(r); ok(r.status === 400 && d.code === "vide", "message vide refusé");
  r = await envoyer(alice, bob, "é".repeat(3000)); d = await j(r); ok(d.message.texte.length === 1000, "un message est coupé à 1 000 caractères");
  r = await envoyer(alice, bob, "a\u0000b"); d = await j(r); ok(d.message.texte === "ab", "les caractères de contrôle sont retirés");

  // ================= 5. Limites contre le harcèlement =================
  const spam = await compte("Spam"), cible = await compte("Cible"); await amis(spam, cible);
  for (let i = 0; i < 30; i++) await sql`INSERT INTO starvibe_dm (de_account, vers_account, texte) VALUES (${spam.id}, ${cible.id}, ${"m" + i})`;
  r = await envoyer(spam, cible, "31e"); d = await j(r);
  ok(r.status === 429 && d.code === "limite", "au-delà de 30 messages en 10 minutes : « Doucement » (429)");
  const long = await compte("Long"), cible2 = await compte("Cible2"); await amis(long, cible2);
  for (let i = 0; i < 400; i++) await sql`INSERT INTO starvibe_dm (de_account, vers_account, texte, created_at) VALUES (${long.id}, ${cible2.id}, ${"m" + i}, now() - interval '3 hours')`;
  r = await envoyer(long, cible2, "401e"); d = await j(r);
  ok(r.status === 429 && d.code === "limite_jour", "au-delà de 400 messages par jour : limite du jour (429)");

  // ================= 6. Notification sur le téléphone =================
  r = await dm(bob, "POST", "", { action: "notifier", subscription: { endpoint: "https://push.test/bob", keys: { p256dh: "p", auth: "a" } }, label: "Android" });
  ok(r.status === 200, "Bob active les notifications sur son téléphone");
  r = await dm(bob, "POST", "", { action: "notifier", subscription: { endpoint: "https://push.test/mauvais" } }); ok(r.status === 400, "abonnement incomplet refusé");
  envoisPush.length = 0;
  r = await envoyer(alice, bob, "Tu as vu la photo ? " + "x".repeat(200)); d = await j(r);
  ok(d.notifie === true && envoisPush.length === 1, "un message envoyé déclenche une notification chez Bob");
  const p = envoisPush[0]?.payload;
  ok(p?.title === "Alice" && p.body.length <= 91 && p.url === `/starvibe/discussions.html?avec=${alice.profil}`, "la notification porte le nom d'Alice, un début du message (coupé) et ouvre directement la discussion");
  ok(envoisPush[0]?.endpoint === "https://push.test/bob", "la notification va au téléphone de Bob (pas à un autre)");
  d = await j(await envoyer(alice, denis, "Salut Denis")); ok(d.ok === true && d.notifie === false, "ami sans notification activée : message envoyé, pas de notification (il le verra en ouvrant KOMYO)");
  pushEnPanne = true; r = await envoyer(alice, bob, "Message pendant une panne de notification"); d = await j(r); pushEnPanne = false;
  ok(r.status === 200 && d.ok === true, "si le service de notification est en panne, le message part quand même");

  // ================= 7. Signalement =================
  r = await dm(carla, "POST", "", { action: "signaler", profilId: alice.profil, motif: "x" }); ok(r.status === 400, "on ne peut signaler que quelqu'un avec qui on a discuté");
  r = await dm(bob, "POST", "", { action: "signaler", profilId: alice.profil, motif: "Insultes", joindre: true }); d = await j(r);
  ok(r.status === 200 && d.ok && /bloquer/.test(d.message) && d.enPause === false, "Bob signale Alice : merci + conseil de bloquer");
  const sig = (await sql`SELECT extrait, motif FROM starvibe_dm_signalements WHERE de_account = ${bob.id} AND contre_account = ${alice.id}`) as { extrait: string; motif: string }[];
  ok(sig[0]?.motif === "Insultes" && sig[0].extrait.includes("Alice :") && sig[0].extrait.includes("Moi :"), "l'extrait des derniers messages est joint, car Bob l'a demandé");
  r = await dm(denis, "POST", "", { action: "signaler", profilId: alice.profil, motif: "Spam" }); d = await j(r);
  const sig2 = (await sql`SELECT extrait FROM starvibe_dm_signalements WHERE de_account = ${denis.id}`) as { extrait: string }[];
  ok(sig2[0].extrait === "", "sans « joindre », aucun message n'est copié (vie privée)");
  ok((await j(await envoyer(alice, bob, "encore"))).ok === true, "2 personnes ont signalé : Alice peut encore écrire (seuil = 3)");
  // une 3e personne différente
  const zoe = await compte("Zoé"); await amis(zoe, alice); await sql`INSERT INTO starvibe_dm (de_account, vers_account, texte) VALUES (${alice.id}, ${zoe.id}, 'hello')`;
  d = await j(await dm(zoe, "POST", "", { action: "signaler", profilId: alice.profil, motif: "Harcèlement" }));
  ok(d.enPause === true, "3 personnes différentes : l'envoi d'Alice est mis en pause");
  r = await envoyer(alice, bob, "je continue"); d = await j(r);
  ok(r.status === 403 && d.code === "pause", "Alice ne peut plus envoyer pendant la pause");
  d = await j(await dm(bob, "GET", `?avec=${alice.profil}`)); ok(Array.isArray(d.messages), "ses amis peuvent toujours lire l'historique");
  // un seul signaleur répété ne déclenche pas la pause
  const fan = await compte("Fan"), star = await compte("Star"); await amis(fan, star); await sql`INSERT INTO starvibe_dm (de_account, vers_account, texte) VALUES (${star.id}, ${fan.id}, 'yo')`;
  for (let i = 0; i < 5; i++) await dm(fan, "POST", "", { action: "signaler", profilId: star.profil, motif: "rép " + i });
  ok((await j(await envoyer(star, fan, "toujours là"))).ok === true, "une seule personne qui signale 5 fois ne met pas l'autre en pause (3 personnes DIFFÉRENTES)");

  // ================= 8. Blocage (via Myo) =================
  r = await myo(bob, { action: "bloquer", profilId: eve.profil }); ok(r.status === 200, "Bob bloque Eve");
  r = await envoyer(eve, bob, "Bob ?"); d = await j(r); ok(r.status === 403, "Eve ne peut plus écrire à Bob");
  r = await envoyer(bob, eve, "Eve ?"); ok(r.status === 403, "Bob ne peut plus écrire à Eve non plus");
  d = await j(await dm(bob, "GET", "?conversations=1")); ok(!d.conversations.some((x: any) => x.nom === "Eve"), "Eve disparaît de la liste de Bob");
  d = await j(await dm(eve, "GET", "?conversations=1")); ok(!d.conversations.some((x: any) => x.nom === "Bob"), "Bob disparaît de la liste d'Eve");
  // amitié retirée sans blocage
  await sql`DELETE FROM starvibe_myo WHERE (de_account = ${alice.id} AND vers_account = ${denis.id})`;
  r = await envoyer(denis, alice, "on n'est plus amis"); ok(r.status === 403, "amitié retirée : plus de discussion possible");

  // ================= 9. Divers =================
  d = await j(await dm(alice, "GET", "?pushkey=1")); ok(typeof d.publicKey === "string" && d.publicKey.length > 40, "la clé publique des notifications est fournie");
  r = await dm(alice, "POST", "", { action: "inconnue", profilId: bob.profil }); ok(r.status === 400, "action inconnue : 400");
  r = await appel(apiDm as any, alice, "DELETE", "/api/starvibe-dm"); ok(r.status === 405, "méthode non autorisée : 405");
} catch (e) {
  console.log("ÉCHEC : exception", e); ko++;
}
console.log(ko ? `\n${ko} ÉCHEC(S)` : "\nTOUS LES TESTS PASSENT");
process.exit(ko ? 1 : 0);
