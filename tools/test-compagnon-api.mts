// Test de bout en bout de Keydou Compagnon v2 : le vrai code serveur contre une vraie base PostgreSQL locale,
// avec de FAUX services d'IA et d'images (aucun réseau, aucun coût).
// Lancer : service postgresql start ; NETLIFY_DB_URL=postgres://postgres:kt@localhost:5432/kt npx tsx tools/test-compagnon-api.mts
process.env.JWT_SECRET = "secret-de-test-assez-long-0123456789-abcdef";
process.env.ANTHROPIC_API_KEY = "faux"; process.env.IMAGE_API_KEY = "faux-image"; process.env.VAPID_PUBLIC_KEY ||= "x";
if (!process.env.NETLIFY_DB_URL) process.env.NETLIFY_DB_URL = "postgres://postgres:kt@localhost:5432/kt";
const { ensureSchema, db } = await import("../netlify/functions/_db.mts");
const { issueToken } = await import("../netlify/functions/_auth.mts");
const api = (await import("../netlify/functions/api-starvibe-compagnon.mts")).default;
const fond = (await import("../netlify/functions/compagnon-image-background.mts")).default;
const { signerImage } = await import("../netlify/functions/_compagnon2.mts");
let ko = 0; const ok = (c: boolean, m: string) => { console.log((c ? "OK  " : "ÉCHEC ") + m); if (!c) ko++; };

await ensureSchema(); const { sql } = db();
const jpg = Buffer.concat([Buffer.from([0xff, 0xd8, 0xff, 0xe0]), Buffer.alloc(3000, 7)]);
let reponseIA = "{}"; const vus: { corps: Record<string, unknown> }[] = []; const appelsImage: Record<string, unknown>[] = []; let imageStatut = 200;
const vraiFetch = globalThis.fetch;
globalThis.fetch = (async (u: string | URL, o?: { body?: string }) => {
  const url = String(u);
  if (url.includes("/v1/messages")) { const corps = JSON.parse(String(o?.body)); vus.push({ corps }); return new Response(JSON.stringify({ content: [{ type: "text", text: reponseIA }], stop_reason: "end_turn", usage: { input_tokens: 100, output_tokens: 50 } }), { status: 200 }); }
  if (url.includes("/v1/images/generations")) { appelsImage.push(JSON.parse(String(o?.body))); if (imageStatut !== 200) return new Response(JSON.stringify({ error: { code: "moderation_blocked", message: "safety" } }), { status: imageStatut }); return new Response(JSON.stringify({ data: [{ b64_json: jpg.toString("base64") }] }), { status: 200 }); }
  if (url.includes("compagnon-image-background")) { // le « lancement de la tâche de fond » : on l'exécute tout de suite, comme Netlify le ferait
    const r = new Request(url, { method: "POST" }); void fond(r); return new Response("", { status: 202 });
  }
  return vraiFetch(u as string, o as RequestInit);
}) as typeof fetch;

async function compte(nom: string, niveau: "essentiel" | "complet") {
  const tel = "242" + String(Math.floor(Math.random() * 1e9)).padStart(9, "0");
  const a = (await sql`INSERT INTO starvibe_accounts (telephone, pin_hash) VALUES (${tel}, 'x') RETURNING id`) as { id: number }[];
  await sql`INSERT INTO starvibe_compagnon_profil (account_id, consentement_at, consentement_version, test, niveau_test) VALUES (${a[0].id}, now(), 'v1', true, ${niveau})`;
  const token = await issueToken({ sub: String(a[0].id), username: nom, displayName: nom, org: "star_vibe", role: "member" });
  return { id: a[0].id, token };
}
const appel = (c: { token: string }, methode: string, qs: string, corps?: unknown) => api(new Request("https://t.test/api/starvibe-compagnon" + qs, { method: methode, headers: { authorization: "Bearer " + c.token, "content-type": "application/json" }, body: corps ? JSON.stringify(corps) : undefined }), {} as never);
const j = async (r: Response) => (await r.json()) as Record<string, any>;
const attendre = async (ms: number) => new Promise((r) => setTimeout(r, ms));

try {
  const E = await compte("essentiel", "essentiel"), C = await compte("complet", "complet");

  // --- État : capacités ---
  let d = await j(await appel(C, "GET", ""));
  ok(d.capacites?.images === true && d.capacites.imagesMax === 10 && d.capacites.imagesRestantes === 10 && d.capacites.modes.length === 7, "état Complet : 10 images, 7 domaines");
  d = await j(await appel(E, "GET", ""));
  ok(d.capacites?.imagesMax === 0 && d.capacites.piecesMax === 5, "état Essentiel : 0 image, 5 pièces par jour");

  // --- Modes, réflexion, consigne ---
  reponseIA = JSON.stringify({ reponse: "Le paludisme est une maladie… Ce n'est pas un avis médical.", seuil: false, rappels: [], notes: [], supprimer_rappels: [], image: null });
  d = await j(await appel(C, "POST", "", { action: "chat", message: "J'ai de la fièvre depuis deux jours, est-ce le palu ?" }));
  let req = vus[vus.length - 1].corps as any;
  ok(d.mode === "sante", "la question de santé passe en mode Santé");
  ok(req.output_config.effort === "medium" && req.max_tokens === 2200, "Complet : réflexion « medium », 2 200 jetons");
  ok(req.system.length === 2 && /MODE SANTÉ/.test(req.system[1].text) && /diagnostic/.test(req.system[1].text), "la consigne Santé est envoyée à l'IA");
  d = await j(await appel(E, "POST", "", { action: "chat", message: "Bonjour Keydou", mode: "droit" }));
  req = vus[vus.length - 1].corps as any;
  ok(d.mode === "droit" && req.output_config.effort === "low" && req.max_tokens === 1400, "Essentiel : domaine choisi respecté, réflexion « low »");

  // --- Création d'image : succès (Complet) ---
  reponseIA = JSON.stringify({ reponse: "Je te prépare ça !", seuil: false, rappels: [], notes: [], supprimer_rappels: [], image: { prompt: "Un coucher de soleil sur le fleuve Congo, couleurs chaudes", format: "paysage" } });
  d = await j(await appel(C, "POST", "", { action: "chat", message: "Crée-moi une image d'un coucher de soleil sur le fleuve" }));
  ok(!!d.image?.id && d.image.statut === "attente" && d.capacites.imagesRestantes === 9, "image demandée : acceptée, il en reste 9");
  await attendre(400);
  const st = await j(await appel(C, "GET", `?image=${d.image.id}&statut=1`));
  ok(st.statut === "ok", "la tâche de fond a fabriqué l'image");
  ok(appelsImage[0].size === "1536x1024" && /No text/.test(String(appelsImage[0].prompt)) && appelsImage[0].output_format === "jpeg", "le service d'images reçoit le bon format, « sans texte », en JPEG");
  const octets = await appel(C, "GET", `?image=${d.image.id}`);
  const buf = Buffer.from(await octets.arrayBuffer());
  ok(octets.status === 200 && octets.headers.get("content-type") === "image/jpeg" && buf.length === jpg.length, "l'image est servie à son propriétaire");
  const autre = await appel(E, "GET", `?image=${d.image.id}`);
  ok(autre.status === 404, "une autre personne ne peut PAS voir cette image");
  const hist = await j(await appel(C, "GET", "?historique=1"));
  ok(hist.messages.some((m: any) => /\[\[img:\d+\]\]/.test(m.texte)), "l'historique garde le repère de l'image");

  // --- Création d'image : Essentiel (0 image) ---
  d = await j(await appel(E, "POST", "", { action: "chat", message: "Crée-moi une affiche d'anniversaire avec des ballons" }));
  ok(!d.image && /Complet/.test(d.reponse), "Essentiel : pas d'image, message vers l'offre Complet");

  // --- Sécurité : enfants, faux documents, personnes réelles ---
  for (const [prompt, msg] of [["Un enfant qui joue au ballon", "dessine un enfant"], ["Une fausse carte d'identité congolaise", "fais une carte d'identité"], ["Le portrait du président", "portrait du président"], ["Une femme nue", "une femme nue"]] as string[][]) {
    reponseIA = JSON.stringify({ reponse: "Je te prépare ça !", image: { prompt, format: "carre" } });
    const avant = appelsImage.length;
    d = await j(await appel(C, "POST", "", { action: "chat", message: msg }));
    ok(!d.image && appelsImage.length === avant, "refusée sans appeler le service d'images : " + prompt);
  }
  ok((await j(await appel(C, "GET", ""))).capacites.imagesRestantes === 9, "les refus ne consomment pas de quota");

  // --- Refus du service d'images (modération) : pas compté ---
  imageStatut = 400;
  reponseIA = JSON.stringify({ reponse: "Je te prépare ça !", image: { prompt: "Un paysage de montagne avec un lac", format: "carre" } });
  d = await j(await appel(C, "POST", "", { action: "chat", message: "Un paysage de montagne" }));
  await attendre(400);
  const st2 = await j(await appel(C, "GET", `?image=${d.image.id}&statut=1`));
  ok(st2.statut === "refuse", "refus du contrôle de sécurité du service : statut « refuse »");
  imageStatut = 200;
  ok((await j(await appel(C, "GET", ""))).capacites.imagesRestantes === 9, "une image refusée ne compte pas dans le quota");

  // --- Quota mensuel épuisé ---
  const D = await compte("quota", "complet");
  for (let i = 0; i < 10; i++) await sql`INSERT INTO starvibe_compagnon_images (account_id, prompt, statut) VALUES (${D.id}, 'x', 'ok')`;
  reponseIA = JSON.stringify({ reponse: "Je te prépare ça !", image: { prompt: "Un jardin fleuri au printemps", format: "carre" } });
  d = await j(await appel(D, "POST", "", { action: "chat", message: "Un jardin fleuri" }));
  ok(!d.image && /10 images/.test(d.reponse), "quota épuisé : message clair avec le délai");

  // --- Pièces jointes ---
  reponseIA = JSON.stringify({ reponse: "Je vois une facture de 25 000 FCFA.", seuil: false, rappels: [], notes: [], supprimer_rappels: [], image: null });
  d = await j(await appel(C, "POST", "", { action: "chat", message: "Que dit cette facture ?", piece: { data: "data:image/jpeg;base64," + jpg.toString("base64") } }));
  req = vus[vus.length - 1].corps as any;
  const dernier = req.messages[req.messages.length - 1];
  ok(Array.isArray(dernier.content) && dernier.content[0].type === "image" && dernier.content[0].source.media_type === "image/jpeg" && /PIÈCE JOINTE/.test(req.system[1].text), "la photo est transmise à l'IA avec la consigne « pièce jointe »");
  const pdfb = Buffer.from("%PDF-1.4 un petit document de test pour Keydou").toString("base64");
  await appel(C, "POST", "", { action: "chat", message: "Résume ce PDF", piece: { data: pdfb } });
  req = vus[vus.length - 1].corps as any;
  ok(req.messages[req.messages.length - 1].content[0].type === "document", "le PDF est transmis comme document");
  const mauvais = await appel(C, "POST", "", { action: "chat", message: "Lis ça", piece: { data: Buffer.from("MZ programme windows").toString("base64") } });
  ok(mauvais.status === 400, "un fichier qui n'est ni photo ni PDF est refusé");
  const nbP = Number(((await sql`SELECT COUNT(*) AS n FROM starvibe_compagnon_messages WHERE account_id = ${C.id} AND role = 'user' AND texte LIKE '📎 %'`) as any[])[0].n);
  ok(nbP === 2, "les pièces jointes sont comptées (2)");
  // Essentiel : 5 par jour
  for (let i = 0; i < 5; i++) await sql`INSERT INTO starvibe_compagnon_messages (account_id, role, texte) VALUES (${E.id}, 'user', '📎 photo')`;
  const lim = await appel(E, "POST", "", { action: "chat", message: "Encore une photo", piece: { data: jpg.toString("base64") } });
  const ld = await j(lim);
  ok(lim.status === 429 && ld.code === "pieces_limite", "Essentiel : la 6e pièce du jour est refusée");

  // --- Effacer ---
  const av = Number(((await sql`SELECT COUNT(*) AS n FROM starvibe_compagnon_images WHERE account_id = ${C.id}`) as any[])[0].n);
  await appel(C, "POST", "", { action: "effacer" });
  const ap = Number(((await sql`SELECT COUNT(*) AS n FROM starvibe_compagnon_images WHERE account_id = ${C.id}`) as any[])[0].n);
  ok(av > 0 && ap === 0, "« Tout effacer » supprime aussi les images");

  // --- Signature de la tâche de fond ---
  const ins = (await sql`INSERT INTO starvibe_compagnon_images (account_id, prompt) VALUES (${C.id}, 'Un paysage calme') RETURNING id`) as { id: number }[];
  const sansSig = await fond(new Request(`https://t.test/x?id=${ins[0].id}&sig=mauvaise`, { method: "POST" }));
  ok(sansSig.status === 403, "la tâche de fond refuse une signature invalide");
  const bonne = await fond(new Request(`https://t.test/x?id=${ins[0].id}&sig=${signerImage(ins[0].id)}`, { method: "POST" }));
  ok(bonne.status === 200, "…et accepte la bonne");

  // --- Ménage ---
  await sql`DELETE FROM starvibe_compagnon_images WHERE account_id IN (${E.id}, ${C.id}, ${D.id})`;
  await sql`DELETE FROM starvibe_compagnon_messages WHERE account_id IN (${E.id}, ${C.id}, ${D.id})`;
  await sql`DELETE FROM starvibe_compagnon_profil WHERE account_id IN (${E.id}, ${C.id}, ${D.id})`;
  await sql`DELETE FROM starvibe_accounts WHERE id IN (${E.id}, ${C.id}, ${D.id})`;
} catch (e) { console.log("ÉCHEC : exception", e); ko++; }
console.log(ko ? "ECHECS : " + ko : "TOUS LES TESTS OK"); process.exit(ko ? 1 : 0);
