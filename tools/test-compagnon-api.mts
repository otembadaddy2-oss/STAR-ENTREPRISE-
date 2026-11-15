// Test de bout en bout de Keydou Compagnon v2 : le vrai code serveur contre une vraie base PostgreSQL locale,
// avec de FAUX services d'IA et d'images (aucun réseau, aucun coût).
// Lancer : service postgresql start ; NETLIFY_DB_URL=postgres://postgres:kt@localhost:5432/kt npx tsx tools/test-compagnon-api.mts
process.env.JWT_SECRET = "secret-de-test-assez-long-0123456789-abcdef";
process.env.ANTHROPIC_API_KEY = "faux"; process.env.IMAGE_API_KEY = "faux-image-0123456789abcdef"; process.env.VAPID_PUBLIC_KEY ||= "x";
if (!process.env.NETLIFY_DB_URL) process.env.NETLIFY_DB_URL = "postgres://postgres:kt@localhost:5432/kt";
const { ensureSchema, db } = await import("../netlify/functions/_db.mts");
const { issueToken } = await import("../netlify/functions/_auth.mts");
const api = (await import("../netlify/functions/api-starvibe-compagnon.mts")).default;
const fond = (await import("../netlify/functions/compagnon-image-background.mts")).default;
const { signerImage } = await import("../netlify/functions/_compagnon2.mts");
process.env.VOIX_API_KEY = "faux-voix-0123456789abcdef"; process.env.COMPAGNON_VOIX_COMPLET = "2";
const mp3 = Buffer.concat([Buffer.from([0xff, 0xfb, 0x90, 0x00]), Buffer.alloc(3000, 9)]); const appelsVoix: Record<string, any>[] = []; let voixStatut = 200;
let ko = 0; const ok = (c: boolean, m: string) => { console.log((c ? "OK  " : "ÉCHEC ") + m); if (!c) ko++; };

await ensureSchema(); const { sql } = db();
const jpg = Buffer.concat([Buffer.from([0xff, 0xd8, 0xff, 0xe0]), Buffer.alloc(3000, 7)]);
let modelesHttp = 200; const modelesAbsents = new Set<string>(); let reponseIA = "{}"; const vus: { corps: Record<string, unknown> }[] = []; const appelsImage: Record<string, unknown>[] = []; let imageStatut = 200;
const vraiFetch = globalThis.fetch;
globalThis.fetch = (async (u: string | URL, o?: { body?: string }) => {
  const url = String(u);
  if (url.includes("/v1/messages")) { const corps = JSON.parse(String(o?.body)); vus.push({ corps }); return new Response(JSON.stringify({ content: [{ type: "text", text: reponseIA }], stop_reason: "end_turn", usage: { input_tokens: 100, output_tokens: 50 } }), { status: 200 }); }
  if (url.endsWith("/v1/models") && modelesHttp === 401) return new Response("{}", { status: 401 });
  if (url.endsWith("/v1/models")) return new Response(JSON.stringify({ data: ["gpt-4o", "gpt-image-1", "gpt-image-2", "gpt-image-1.5", "whisper-1"].map((id) => ({ id })) }), { status: 200 });
  if (url.includes("/v1/images/generations") && modelesAbsents.has(String(JSON.parse(String(o?.body)).model))) { appelsImage.push(JSON.parse(String(o?.body))); return new Response(JSON.stringify({ error: { code: "invalid_value", message: "The model `x` does not exist." } }), { status: 400 }); }
  if (url.includes("/v1/images/generations")) { appelsImage.push(JSON.parse(String(o?.body))); if (imageStatut !== 200) return new Response(JSON.stringify({ error: { code: "moderation_blocked", message: "safety" } }), { status: imageStatut }); return new Response(JSON.stringify({ data: [{ b64_json: jpg.toString("base64") }] }), { status: 200 }); }
  if (url.includes("api.elevenlabs.io/v1/text-to-speech/")) { appelsVoix.push({ url, cle: (o as any)?.headers?.["xi-api-key"], corps: JSON.parse(String(o?.body)) }); if (voixStatut !== 200) return new Response("{}", { status: voixStatut }); return new Response(mp3, { status: 200 }); }
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
  ok(d.capacites?.images === true && d.capacites.imagesMax === 35 && d.capacites.imagesRestantes === 35 && d.capacites.modes.length === 8, "état Complet : 25 images, 8 domaines (dont Tests)");
  ok(d.capacites.voix?.actif === true && d.capacites.voix.max === 2 && d.capacites.voix.restantes === 2, "état Complet : voix de Keydou active (2 lectures par jour pendant ce test)");
  ok(typeof d.compte?.initiales === "string" && d.compte.initiales.length >= 1 && Array.isArray(d.capacites.connecteurs) && d.capacites.connecteurs.find((x: any) => x.id === "images")?.statut === "actif" && d.capacites.connecteurs.find((x: any) => x.id === "voix")?.statut === "actif" && d.capacites.connecteurs.find((x: any) => x.id === "gmail")?.statut === "bientot" && d.capacites.liste.length === 7, "état : compte (initiales), connecteurs (images et voix actifs, Gmail bientôt) et capacités");
  d = await j(await appel(E, "GET", ""));
  ok(d.capacites?.imagesMax === 10 && d.capacites.piecesMax === 5 && d.capacites.voix?.actif === false, "état Essentiel : 3 images, 5 pièces par jour, pas de voix de Keydou");

  // --- Modes, réflexion, consigne ---
  reponseIA = JSON.stringify({ reponse: "Le paludisme est une maladie… Ce n'est pas un avis médical.", seuil: false, rappels: [], notes: [], supprimer_rappels: [], image: null });
  d = await j(await appel(C, "POST", "", { action: "chat", message: "J'ai de la fièvre depuis deux jours, est-ce le palu ?" }));
  let req = vus[vus.length - 1].corps as any;
  ok(d.mode === "sante", "la question de santé passe en mode Santé");
  ok(req.output_config.effort === "high" && req.max_tokens === 4500, "Complet + Santé : réflexion « high », 4 500 jetons");
  ok(req.system.length === 2 && /MODE MÉDECINE ET SANTÉ/.test(req.system[1].text) && /diagnostic/.test(req.system[1].text), "la consigne Santé est envoyée à l'IA");
  reponseIA = JSON.stringify({ reponse: "Pour le paracétamol, prends 500 mg matin et soir.", image: null });
  d = await j(await appel(C, "POST", "", { action: "chat", message: "Que prendre contre la fièvre ?" }));
  ok(/Je ne prescris jamais|je ne prescris jamais/.test(d.reponse), "filet de sécurité : une dose citée déclenche le rappel « je ne prescris jamais »");
  reponseIA = JSON.stringify({ reponse: "x".repeat(4000), image: null });
  d = await j(await appel(C, "POST", "", { action: "chat", message: "Explique-moi la physiopathologie du diabète" }));
  ok(d.reponse.length >= 3900, "Santé : une longue réponse n'est pas coupée à 1 800 signes");
  reponseIA = JSON.stringify({ reponse: "Réponse B", image: null });
  d = await j(await appel(C, "POST", "", { action: "chat", message: "Fais-moi passer un test de biologie moléculaire" }));
  req = vus[vus.length - 1].corps as any;
  ok(d.mode === "examens" && req.output_config.effort === "high" && /note sur 10 avec deux décimales/.test(req.system[1].text), "Tests : mode Tests, réflexion maximale, notation sur 10");
  d = await j(await appel(E, "POST", "", { action: "chat", message: "Bonjour Keydou", mode: "droit" }));
  req = vus[vus.length - 1].corps as any;
  ok(d.mode === "droit" && req.output_config.effort === "low" && req.max_tokens === 1400, "Essentiel : domaine choisi respecté, réflexion « low »");

  // --- Création d'image : succès (Complet) ---
  reponseIA = JSON.stringify({ reponse: "Je te prépare ça !", seuil: false, rappels: [], notes: [], supprimer_rappels: [], image: { prompt: "Un coucher de soleil sur le fleuve Congo, couleurs chaudes", format: "paysage" } });
  d = await j(await appel(C, "POST", "", { action: "chat", message: "Crée-moi une image d'un coucher de soleil sur le fleuve" }));
  ok(!!d.image?.id && d.image.statut === "attente" && d.capacites.imagesRestantes === 34, "image demandée : acceptée, il en reste 34");
  await attendre(400);
  const st = await j(await appel(C, "GET", `?image=${d.image.id}&statut=1`));
  ok(st.statut === "ok", "la tâche de fond a fabriqué l'image");
  ok(appelsImage[0].size === "1536x1024" && /No text/.test(String(appelsImage[0].prompt)) && appelsImage[0].output_format === "jpeg", "le service d'images reçoit le bon format, « sans texte », en JPEG");
  ok(appelsImage[0].model === "gpt-image-2", "le modèle le plus récent proposé par le service est choisi (gpt-image-2)");
  { // le modèle choisi n'existe pas chez ce compte : Keydou essaie le suivant tout seul
    modelesAbsents.add("gpt-image-2"); const avant = appelsImage.length;
    reponseIA = JSON.stringify({ reponse: "Je te prépare ça !", image: { prompt: "Un marché coloré à Pointe-Noire, lumière du matin", format: "carre" } });
    const dd = await j(await appel(C, "POST", "", { action: "chat", message: "Un marché coloré à Pointe-Noire" }));
    await attendre(500);
    const s3 = await j(await appel(C, "GET", `?image=${dd.image.id}&statut=1`));
    ok(s3.statut === "ok" && appelsImage.slice(avant).map((x: any) => x.model).join(",") === "gpt-image-2,gpt-image-1.5", "modèle absent : Keydou passe au suivant (gpt-image-1.5) et l'image est créée");
    modelesAbsents.delete("gpt-image-2");
    reponseIA = JSON.stringify({ reponse: "Je te prépare ça !", image: { prompt: "Un coucher de soleil sur le fleuve Congo, couleurs chaudes", format: "paysage" } });
  }
  const octets = await appel(C, "GET", `?image=${d.image.id}`);
  const buf = Buffer.from(await octets.arrayBuffer());
  ok(octets.status === 200 && octets.headers.get("content-type") === "image/jpeg" && buf.length === jpg.length, "l'image est servie à son propriétaire");
  const autre = await appel(E, "GET", `?image=${d.image.id}`);
  ok(autre.status === 404, "une autre personne ne peut PAS voir cette image");
  const hist = await j(await appel(C, "GET", "?historique=1"));
  ok(hist.messages.some((m: any) => /\[\[img:\d+\]\]/.test(m.texte)), "l'historique garde le repère de l'image");

  // --- Création d'image : Essentiel (10 images par mois) ---
  for (let i = 1; i <= 10; i++) {
    d = await j(await appel(E, "POST", "", { action: "chat", message: "Crée-moi une affiche d'anniversaire avec des ballons n°" + i }));
    ok(!!d.image?.id && d.capacites.imagesRestantes === 10 - i, "Essentiel : image " + i + " acceptée, il en reste " + (10 - i));
  }
  d = await j(await appel(E, "POST", "", { action: "chat", message: "Crée-moi encore une affiche d'anniversaire" }));
  ok(!d.image && /10 images/.test(d.reponse), "Essentiel : la 11e image du mois est refusée avec un message clair");
  await attendre(400);

  // --- Sécurité : enfants, faux documents, personnes réelles ---
  for (const [prompt, msg] of [["Un enfant qui joue au ballon", "dessine un enfant"], ["Une fausse carte d'identité congolaise", "fais une carte d'identité"], ["Le portrait du président", "portrait du président"], ["Une femme nue", "une femme nue"]] as string[][]) {
    reponseIA = JSON.stringify({ reponse: "Je te prépare ça !", image: { prompt, format: "carre" } });
    const avant = appelsImage.length;
    d = await j(await appel(C, "POST", "", { action: "chat", message: msg }));
    ok(!d.image && appelsImage.length === avant, "refusée sans appeler le service d'images : " + prompt);
  }
  ok((await j(await appel(C, "GET", ""))).capacites.imagesRestantes === 33, "les refus ne consomment pas de quota (une image de plus a été créée par le test du modèle suivant)");

  // --- Refus du service d'images (modération) : pas compté ---
  imageStatut = 400;
  reponseIA = JSON.stringify({ reponse: "Je te prépare ça !", image: { prompt: "Un paysage de montagne avec un lac", format: "carre" } });
  d = await j(await appel(C, "POST", "", { action: "chat", message: "Un paysage de montagne" }));
  await attendre(400);
  const st2 = await j(await appel(C, "GET", `?image=${d.image.id}&statut=1`));
  ok(st2.statut === "refuse", "refus du contrôle de sécurité du service : statut « refuse »");
  { // la raison technique de l'échec est gardée et montrée au testeur, sans clé
    const rr = await j(await appel(C, "GET", `?image=${d.image.id}&statut=1`));
    ok(/erreur 400|refusé/.test(String(rr.detail)) && !/sk-/.test(String(rr.detail)), "testeur : la raison technique est visible, sans clé");
  }
  imageStatut = 200;
  ok((await j(await appel(C, "GET", ""))).capacites.imagesRestantes === 33, "une image refusée ne compte pas dans le quota");

  // --- Quota mensuel épuisé ---
  const D = await compte("quota", "complet");
  for (let i = 0; i < 35; i++) await sql`INSERT INTO starvibe_compagnon_images (account_id, prompt, statut) VALUES (${D.id}, 'x', 'ok')`;
  reponseIA = JSON.stringify({ reponse: "Je te prépare ça !", image: { prompt: "Un jardin fleuri au printemps", format: "carre" } });
  d = await j(await appel(D, "POST", "", { action: "chat", message: "Un jardin fleuri" }));
  ok(!d.image && /35 images/.test(d.reponse), "quota épuisé : message clair avec le délai");

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

  // --- Voix de Keydou sur les réponses ---
  reponseIA = JSON.stringify({ reponse: "Bonjour ! Voici ma réponse, lue avec la voix de Keydou.", image: null });
  d = await j(await appel(C, "POST", "", { action: "chat", message: "Dis-moi bonjour" }));
  ok(Number(d.messageId) > 0, "la réponse donne l'identifiant du message (pour la voix)");
  const v1 = await appel(C, "GET", `?voix=${d.messageId}`); const bufV = Buffer.from(await v1.arrayBuffer());
  ok(v1.status === 200 && v1.headers.get("content-type") === "audio/mpeg" && bufV.length === mp3.length, "la voix est servie en MP3");
  ok(appelsVoix.length === 1 && appelsVoix[0].cle === "faux-voix-0123456789abcdef" && /Chloé|I6eWD84OrEngt4S4Antm/.test(appelsVoix[0].url) && appelsVoix[0].corps.model_id === "eleven_v4" && /^\[warm, friendly, smiling\] Bonjour/.test(appelsVoix[0].corps.text), "bonne voix (Chloé), bon modèle (eleven_v4), ton chaleureux");
  await appel(C, "GET", `?voix=${d.messageId}`);
  ok(appelsVoix.length === 1, "relecture du même message : servie depuis la mémoire, sans nouveau coût");
  ok((await j(await appel(C, "GET", ""))).capacites.voix.restantes === 1, "il reste 1 lecture sur 2");
  const idMsg = d.messageId;
  const vE = await appel(E, "GET", `?voix=${idMsg}`);
  ok(vE.status === 404, "une autre personne (Essentiel) ne peut pas lire ce message");
  reponseIA = JSON.stringify({ reponse: "Deuxième réponse pour la voix.", image: null });
  d = await j(await appel(C, "POST", "", { action: "chat", message: "Encore" }));
  ok((await appel(C, "GET", `?voix=${d.messageId}`)).status === 200, "2e lecture acceptée");
  reponseIA = JSON.stringify({ reponse: "Troisième réponse pour la voix.", image: null });
  d = await j(await appel(C, "POST", "", { action: "chat", message: "Et une troisième" }));
  const v3 = await appel(C, "GET", `?voix=${d.messageId}`); const d3 = await j(v3);
  ok(v3.status === 429 && d3.code === "voix_quota" && appelsVoix.length === 2, "3e lecture du jour : refusée (quota), aucun coût");
  const ok2 = await compte("voixok", "complet");
  reponseIA = JSON.stringify({ reponse: "Réponse pour tester une panne du service de voix.", image: null });
  d = await j(await appel(ok2, "POST", "", { action: "chat", message: "Panne ?" })); voixStatut = 500;
  const vp = await appel(ok2, "GET", `?voix=${d.messageId}`); const dp = await j(vp);
  ok(vp.status === 503 && dp.code === "voix_erreur" && (await j(await appel(ok2, "GET", ""))).capacites.voix.restantes === 2, "panne du service de voix : message clair, rien n'est compté");
  voixStatut = 200;
  const vE2 = await appel(E, "GET", "?voix=999999999");
  ok(vE2.status === 404, "Essentiel : voix de Keydou indisponible (offre sans voix)");
  await sql`DELETE FROM starvibe_compagnon_voix WHERE account_id = ${ok2.id}`; await sql`DELETE FROM starvibe_compagnon_messages WHERE account_id = ${ok2.id}`; await sql`DELETE FROM starvibe_compagnon_profil WHERE account_id = ${ok2.id}`; await sql`DELETE FROM starvibe_accounts WHERE id = ${ok2.id}`;

  // --- Effacer ---
  const av = Number(((await sql`SELECT COUNT(*) AS n FROM starvibe_compagnon_images WHERE account_id = ${C.id}`) as any[])[0].n);
  await appel(C, "POST", "", { action: "effacer" });
  const ap = Number(((await sql`SELECT COUNT(*) AS n FROM starvibe_compagnon_images WHERE account_id = ${C.id}`) as any[])[0].n);
  ok(av > 0 && ap === 0, "« Tout effacer » supprime aussi les images");
  ok(Number(((await sql`SELECT COUNT(*) AS n FROM starvibe_compagnon_voix WHERE account_id = ${C.id}`) as any[])[0].n) === 0, "…et les voix enregistrées");

  // --- Signature de la tâche de fond ---
  const ins = (await sql`INSERT INTO starvibe_compagnon_images (account_id, prompt) VALUES (${C.id}, 'Un paysage calme') RETURNING id`) as { id: number }[];
  const sansSig = await fond(new Request(`https://t.test/x?id=${ins[0].id}&sig=mauvaise`, { method: "POST" }));
  ok(sansSig.status === 403, "la tâche de fond refuse une signature invalide");
  const bonne = await fond(new Request(`https://t.test/x?id=${ins[0].id}&sig=${signerImage(ins[0].id)}`, { method: "POST" }));
  ok(bonne.status === 200, "…et accepte la bonne");

  // --- Clé collée par erreur (du texte au lieu d'une clé) : ni images ni voix annoncées ---
  const kImg = process.env.IMAGE_API_KEY, kVox = process.env.VOIX_API_KEY;
  process.env.IMAGE_API_KEY = "Envoie-moi la capture de la liste"; process.env.VOIX_API_KEY = "texte avec des espaces";
  d = await j(await appel(C, "GET", ""));
  ok(d.capacites.images === false && d.capacites.voix.actif === false, "texte collé par erreur : images et voix restent « bientôt », rien n'est annoncé");
  process.env.IMAGE_API_KEY = kImg; process.env.VOIX_API_KEY = kVox;

  // --- Interrupteur « Ouvert à l'abonnement » : réservé à l'équipe, avec journal ---
  const equipe = { token: await issueToken({ sub: "1", username: "carry", displayName: "Carry OTEMBA", org: "star_entreprise", role: "admin" }) };
  let ad = await appel(equipe, "GET", "?admin=1"); let adj = await j(ad);
  ok(ad.status === 200 && typeof adj.ouvert === "boolean" && Array.isArray(adj.journal), "équipe : l'état ouvert/fermé et le journal sont lisibles");
  const avantEtat = adj.ouvert;
  ok((await appel(C, "POST", "", { action: "ouvrir", on: true })).status === 403 && (await appel(C, "GET", "?admin=1")).status === 403, "un membre (même Complet) ne peut ni lire ni changer l'interrupteur");
  await appel(equipe, "POST", "", { action: "ouvrir", on: true }); adj = await j(await appel(equipe, "GET", "?admin=1"));
  ok(adj.ouvert === true && adj.journal[0].on === true && adj.journal[0].par === "Carry OTEMBA", "ouvrir : état « ouvert », journal « Carry OTEMBA »");
  await appel(equipe, "POST", "", { action: "ouvrir", on: false }); adj = await j(await appel(equipe, "GET", "?admin=1"));
  ok(adj.ouvert === false && adj.journal[0].on === false && adj.journal.length >= 2, "fermer : état « fermé », le journal garde l'historique");
  await appel(equipe, "POST", "", { action: "ouvrir", on: !!avantEtat });
  await sql`DELETE FROM starvibe_settings WHERE key = 'compagnon_ouvert_journal'`;

  // --- Ménage ---
  await sql`DELETE FROM starvibe_compagnon_voix WHERE account_id IN (${E.id}, ${C.id}, ${D.id})`;
  await sql`DELETE FROM starvibe_compagnon_images WHERE account_id IN (${E.id}, ${C.id}, ${D.id})`;
  await sql`DELETE FROM starvibe_compagnon_messages WHERE account_id IN (${E.id}, ${C.id}, ${D.id})`;
  await sql`DELETE FROM starvibe_compagnon_profil WHERE account_id IN (${E.id}, ${C.id}, ${D.id})`;
  await sql`DELETE FROM starvibe_accounts WHERE id IN (${E.id}, ${C.id}, ${D.id})`;

  // --- ESSAI GRATUIT : tout le monde installe ; 5 messages d'essai ; ensuite l'offre ---
  {
    const tel = "242" + String(Math.floor(Math.random() * 1e9)).padStart(9, "0");
    const a = (await sql`INSERT INTO starvibe_accounts (telephone, pin_hash) VALUES (${tel}, 'x') RETURNING id`) as { id: number }[];
    const X = { id: a[0].id, token: await issueToken({ sub: String(a[0].id), username: "essai", displayName: "essai", org: "star_vibe", role: "member" }) };
    let e = await j(await appel(X, "GET", "?acces=1")); ok(e.visible === true && e.ouvert === true, "essai : Keydou Compagnon est visible et ouvert à tout membre, sans case à cocher");
    let r0 = await appel(X, "GET", ""); e = await j(r0); ok(r0.status === 200 && e.acces?.niveau === "essai" && e.acces.label === "Essai gratuit" && e.acces.source === "essai", "essai : un membre sans abonnement entre en « Essai gratuit »");
    ok(e.quota.messagesMax === 5 && e.quota.messagesUtilises === 0 && e.capacites.imagesMax === 2 && e.capacites.piecesMax === 0 && e.capacites.voix.actif === false && e.capacites.liste.filter((x: any) => x.actif).map((x: any) => x.id).join() === "discussion,images", "essai : 5 messages et 2 images ; ni pièces, ni voix, ni rappels");
    await appel(X, "POST", "", { action: "consentir" });
    reponseIA = JSON.stringify({ reponse: "Bonjour !", seuil: false, rappels: [], notes: [], supprimer_rappels: [], image: null });
    // 2 images d'essai (chacune compte comme un message), la 3e est refusée avec l'invitation
    reponseIA = JSON.stringify({ reponse: "Voilà !", seuil: false, rappels: [], notes: [], supprimer_rappels: [], image: { prompt: "Un lion souriant en peinture à l'huile", format: "carre" } });
    let di1 = await j(await appel(X, "POST", "", { action: "chat", message: "Crée-moi un lion souriant n°1" })); let di2 = await j(await appel(X, "POST", "", { action: "chat", message: "Crée-moi un lion souriant n°2" }));
    ok(!!di1.image?.id && !!di2.image?.id && di2.capacites.imagesRestantes === 0, "essai : 2 images d'essai acceptées");
    const di3 = await j(await appel(X, "POST", "", { action: "chat", message: "Crée-moi un lion souriant n°3" }));
    ok(!di3.image && /2 images d'essai/.test(di3.reponse) && /10 images par mois/.test(di3.reponse) && /35 images par mois/.test(di3.reponse), "essai : la 3e image est refusée avec l'invitation (Essentiel 10, Complet 35)");
    reponseIA = JSON.stringify({ reponse: "Bonjour !", seuil: false, rappels: [], notes: [], supprimer_rappels: [], image: null });
    for (let i = 1; i <= 2; i++) { const r = await appel(X, "POST", "", { action: "chat", message: "Question " + i }); if (r.status !== 200) { ok(false, "essai : message " + (i + 3) + " accepté (statut " + r.status + ")"); } }
    const r6 = await appel(X, "POST", "", { action: "chat", message: "Question 6" }); const d6 = await j(r6);
    ok(r6.status === 402 && d6.code === "essai_termine" && d6.essaiTermine === true && /5 messages d'essai/.test(d6.error) && /5 000 FCFA/.test(d6.error) && /19 \$/.test(d6.error), "essai : après 5 messages, invitation claire à l'offre 5 000 FCFA ou 19 $ (Pro)");
    ok(vus.filter((v: any) => /ESSAI GRATUIT/.test(String(v.corps.system?.[1]?.text || ""))).length >= 1, "essai : l'IA est prévenue que la personne est en essai (réponses courtes, options réservées aux abonnés)");
    const rp = await appel(X, "POST", "", { action: "chat", message: "Regarde ça", piece: { data: "data:image/jpeg;base64," + jpg.toString("base64") } }); ok(rp.status === 402, "essai : pas de lecture de photos ni de PDF (402 avec l'invitation à s'abonner)");
    const rr = await appel(X, "POST", "", { action: "rappel_creer", titre: "RDV", quand: new Date(Date.now() + 86400000).toISOString().slice(0, 16) }); const dr = await j(rr); ok(rr.status === 400 && /abonnement/.test(dr.error), "essai : pas de rappel (invitation à s'abonner)");
    const rv = await appel(X, "GET", "?voix=1"); ok(rv.status === 404, "essai : pas de voix de Keydou");
    // abonnement ensuite : l'accès normal revient tout de suite
    await sql`INSERT INTO starvibe_subscriptions (account_id, plan, statut, montant_attendu, expires_at) VALUES (${X.id}, 'compagnon', 'actif', 5000, now() + interval '30 days')`;
    e = await j(await appel(X, "GET", "")); ok(e.acces?.niveau === "essentiel" && e.acces.source === "abonnement", "abonnement validé : l'essai laisse place à l'offre Essentiel aussitôt");
    const r7 = await appel(X, "POST", "", { action: "chat", message: "Question 7" }); ok(r7.status === 200, "abonné : peut de nouveau écrire (65 messages par jour)");
    // fermeture d'urgence
    await sql`INSERT INTO starvibe_settings (key, value) VALUES ('compagnon_ferme_urgence', 'on') ON CONFLICT (key) DO UPDATE SET value = 'on'`;
    e = await j(await appel(E, "GET", "?acces=1")); ok(e.ouvert === false, "fermeture d'urgence : l'état passe à fermé");
    await sql`DELETE FROM starvibe_settings WHERE key = 'compagnon_ferme_urgence'`;
    e = await j(await appel(E, "GET", "?acces=1")); ok(e.ouvert === true, "sans fermeture d'urgence : ouvert par défaut");
  }

  // --- CONNECTEURS : santé réelle, détection automatique, aucune insistance possible ---
  {
    const { noterSante, connecteurs: lister, SANTE_FRAIS_MS } = await import("../netlify/functions/_compagnon2.mts");
    const st = (cs: any[], id: string) => cs.find((x) => x.id === id)?.statut;
    let cs = (await j(await appel(C, "GET", "?sante=1"))).connecteurs;
    ok(st(cs, "images") === "actif" && st(cs, "claude") === "actif" && st(cs, "gmail") === "bientot" && st(cs, "canva") === "bientot", "connecteurs : les vrais sont « Connecté », ceux pas encore ouverts « Pas connecté »");
    await sql`DELETE FROM starvibe_settings WHERE key = 'compagnon_sante'`;
    modelesHttp = 401;
    cs = (await j(await appel(C, "GET", "?sante=1"))).connecteurs;
    ok(st(cs, "images") === "erreur" && /refusée/.test(cs.find((x: any) => x.id === "images").raison) && /Impossible de se connecter/.test(cs.find((x: any) => x.id === "images").detail), "connecteur à clé refusée : détecté tout seul, « Impossible de se connecter » avec la raison");
    d = await j(await appel(C, "GET", ""));
    ok(d.capacites.images === false && st(d.capacites.connecteurs, "images") === "erreur", "connecteur en panne : Keydou ne l'utilise plus (images désactivées)");
    await appel(C, "POST", "", { action: "consentir" });
    reponseIA = JSON.stringify({ reponse: "Voici", image: { prompt: "un chat", format: "carre" } });
    d = await j(await appel(C, "POST", "", { action: "chat", message: "Crée une image d'un chat" }));
    ok(!d.image && /momentanément indisponible/.test(d.reponse), "connecteur en panne : une demande d'image reçoit un message clair, sans insister ni facturer");
    modelesHttp = 200; await sql`DELETE FROM starvibe_settings WHERE key = 'compagnon_sante'`;
    cs = (await j(await appel(C, "GET", "?sante=1"))).connecteurs; ok(st(cs, "images") === "actif", "connecteur rétabli : redevient « Connecté » après vérification");
    await noterSante(sql, "voix", false, "erreur 401");
    ok(st(lister((await (await import("../netlify/functions/_compagnon2.mts")).lireSante(sql))), "voix") === "erreur" && st(lister({ voix: { ok: false, at: Date.now() - SANTE_FRAIS_MS - 1000, raison: "x" } }), "voix") === "actif", "une panne est signalée une heure, puis le connecteur est réessayé");
    await sql`DELETE FROM starvibe_settings WHERE key = 'compagnon_sante'`;
  }

  // --- CRÉDITS D'IMAGES : achat d'un pack par dépôt, solde, reconnaissance du dépôt, reçu ---
  {
    const abo = (await import("../netlify/functions/api-starvibe-subscription.mts")).default;
    const kd = (await import("../netlify/functions/api-starvibe-keydou.mts")).default;
    const { smsSecret } = await import("../netlify/functions/_push.mts");
    const staffTok = await issueToken({ sub: "1", username: "carry", displayName: "Carry", org: "star_entreprise", role: "admin" });
    const sub = (tok: string, methode: string, qs: string, corps?: unknown) => abo(new Request("https://t.test/api/starvibe-subscription" + qs, { method: methode, headers: { authorization: "Bearer " + tok, "content-type": "application/json" }, body: corps ? JSON.stringify(corps) : undefined }), {} as any);
    // un compte Essentiel (abonné) au numéro connu, dont le quota du mois est épuisé
    const tel = "24206" + String(Math.floor(Math.random() * 9e6) + 1e6);
    const a = (await sql`INSERT INTO starvibe_accounts (telephone, pin_hash) VALUES (${tel}, 'x') RETURNING id`) as { id: number }[];
    const P = { id: a[0].id, token: await issueToken({ sub: String(a[0].id), username: "pack", displayName: "pack", org: "star_vibe", role: "member" }) };
    await sql`INSERT INTO starvibe_compagnon_profil (account_id, consentement_at, consentement_version, test, niveau_test) VALUES (${P.id}, now(), 'v1', true, 'essentiel')`;
    for (let i = 0; i < 10; i++) await sql`INSERT INTO starvibe_compagnon_images (account_id, prompt, statut) VALUES (${P.id}, 'x', 'ok')`;
    reponseIA = JSON.stringify({ reponse: "Voilà !", image: { prompt: "Un jardin fleuri", format: "carre" } });
    let dd = await j(await appel(P, "POST", "", { action: "chat", message: "Crée-moi un jardin fleuri" }));
    ok(!dd.image && dd.offreImages === true && /achète un pack/.test(dd.reponse) && /10 images .*1 200 FCFA/.test(dd.reponse) && /30 images .*3 000 FCFA/.test(dd.reponse), "quota du mois fini : Keydou propose d'acheter un pack (10 images 1 200 FCFA, 30 images 3 000 FCFA)");
    dd = await j(await appel(P, "GET", "")); ok(dd.capacites.credits === 0 && dd.capacites.achatImages === true && dd.capacites.packs.length === 2, "état : solde 0, achat possible, deux packs proposés");
    // demande de pack
    let r = await sub(P.token, "POST", "", { action: "choisir_plan", plan: "credit_images_10", mois: 6 }); let d1 = await j(r);
    ok(r.status === 201 && d1.abonnement.montantAttendu === 1200 && d1.abonnement.statut === "en_attente_paiement" && /^KOMYO-\d+$/.test(d1.abonnement.referencePaiement) && d1.abonnement.mois === 1, "pack : demande créée à 1 200 FCFA (un seul pack, jamais « × mois »), référence de dépôt KOMYO-n");
    const id10 = Number(d1.abonnement.id);
    r = await sub(P.token, "POST", "", { action: "choisir_plan", plan: "credit_images_10" }); ok((await j(r)).abonnement.id === d1.abonnement.id, "pack : un deuxième toucher reprend la même demande");
    dd = await j(await appel(P, "POST", "", { action: "chat", message: "Crée-moi un jardin fleuri encore" })); ok(!dd.image, "pack non payé : aucune image de plus");
    // mauvais montant refusé, bon montant accepté (staff)
    r = await sub(staffTok, "POST", "", { action: "confirmer_paiement", subscriptionId: id10, montantRecu: 1000 }); ok((await j(r)).statut === "paiement_invalide", "dépôt d'un mauvais montant : refusé, aucune image ajoutée");
    dd = await j(await appel(P, "GET", "")); ok(dd.capacites.credits === 0, "après un mauvais montant : solde toujours 0");
    r = await sub(P.token, "POST", "", { action: "choisir_plan", plan: "credit_images_10" }); const d2 = await j(r); const id10b = Number(d2.abonnement.id);
    // reconnaissance automatique du dépôt par SMS (même système que les abonnements)
    const sms = await kd(new Request("https://t.test/api/starvibe-keydou?sms=1&s=" + smsSecret(), { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ message: `Vous avez recu 1200 XAF de PAYEUR (${tel}) sur votre compte mobile money 2026-11-15 22:37:34. Solde: 5525 XAF. FRAIS: FCFA 0. ID: 1234567890.`, from: "MobileMoney" }) }), {} as any);
    const ds = await j(sms); ok(ds.resultat === "valide_auto", "dépôt de 1 200 FCFA reçu par SMS : reconnu et validé tout seul");
    dd = await j(await appel(P, "GET", "")); ok(dd.capacites.credits === 10 && dd.capacites.imagesRestantes === 0, "pack payé : +10 images de crédit (le quota du mois reste à 0)");
    // l'image utilise le crédit
    dd = await j(await appel(P, "POST", "", { action: "chat", message: "Crée-moi un jardin fleuri n°2" }));
    ok(!!dd.image?.id && dd.capacites.credits === 9 && dd.capacites.imagesRestantes === 0, "image créée avec un crédit : il en reste 9");
    const ligne = (await sql`SELECT credit FROM starvibe_compagnon_images WHERE id = ${dd.image.id}`) as { credit: boolean }[]; ok(ligne[0].credit === true, "l'image est marquée « payée par crédit »");
    await attendre(300);
    // une image qui échoue n'est pas décomptée
    await sql`UPDATE starvibe_compagnon_images SET statut = 'erreur' WHERE id = ${dd.image.id}`;
    dd = await j(await appel(P, "GET", "")); ok(dd.capacites.credits === 10, "image en échec : le crédit est rendu");
    // le solde ne dépend pas du quota du mois (qui se renouvelle) : 30 jours plus tard les 10 images du mois reviennent, le crédit reste
    await sql`UPDATE starvibe_compagnon_images SET created_at = now() - interval '40 days' WHERE account_id = ${P.id} AND credit = false`;
    dd = await j(await appel(P, "GET", "")); ok(dd.capacites.imagesRestantes === 10 && dd.capacites.credits === 10, "le mois suivant : quota renouvelé et crédit intact");
    // un pack n'est jamais pris pour un abonnement
    r = await sub(P.token, "GET", ""); const cur = await j(r); ok(!/credit_images/.test(String(cur.abonnement?.plan)), "écran « mon abonnement » : le pack n'apparaît pas comme un abonnement");
    r = await sub(P.token, "GET", "?rappel=1"); ok((await j(r)).rappel === null, "pas de rappel d'échéance pour un pack");
    // pack de 30
    r = await sub(P.token, "POST", "", { action: "choisir_plan", plan: "credit_images_30" }); const d30 = await j(r); ok(d30.abonnement.montantAttendu === 3000, "pack 30 : 3 000 FCFA");
    r = await sub(staffTok, "POST", "", { action: "confirmer_paiement", subscriptionId: Number(d30.abonnement.id), montantRecu: 3000 }); ok((await j(r)).statut === "actif", "pack 30 : confirmé par l'équipe");
    dd = await j(await appel(P, "GET", "")); ok(dd.capacites.credits === 40, "10 + 30 : solde de 40 images");
    // reçu émis
    const rec = (await sql`SELECT titre FROM starvibe_recus WHERE ref_id = ${id10b} AND kind = 'abo' LIMIT 1`) as { titre: string }[]; ok(!!rec[0] && /pack de 10 images/.test(rec[0].titre), "un reçu « pack de 10 images » est émis");
    // l'essai gratuit ne peut pas acheter ; un inconnu non plus
    const tel2 = "24205" + String(Math.floor(Math.random() * 9e6) + 1e6);
    const b2 = (await sql`INSERT INTO starvibe_accounts (telephone, pin_hash) VALUES (${tel2}, 'x') RETURNING id`) as { id: number }[];
    const T = { token: await issueToken({ sub: String(b2[0].id), username: "essai2", displayName: "essai2", org: "star_vibe", role: "member" }) };
    r = await sub(T.token, "POST", "", { action: "choisir_plan", plan: "credit_images_10" }); const dt = await j(r);
    ok(r.status === 403 && dt.code === "abonnement_requis" && /abonne-toi d'abord/.test(dt.error), "essai gratuit : doit d'abord s'abonner avant d'acheter des images");
    const dEss = await j(await appel(T, "GET", "")); ok(dEss.capacites.achatImages === false, "essai gratuit : pas de bouton d'achat d'images");
    // ---- Offres Complet 19 $ / Premium 35 $ / Prestige 49 $ : avantages qui montent, paiement par dépôt, remises sur les packs
    const { AVANTAGES, LIMITES } = await import("../netlify/functions/_compagnon.mts");
    const ordre = ["essentiel", "complet", "premium", "prestige"] as const;
    for (const cle of ["messages", "recherches", "rappels", "images", "pieces", "voix", "notes", "historique", "jetonsGeneral", "jetonsProfond", "longueurReponse"] as const) {
      let croit = true; for (let i = 1; i < ordre.length; i++) if ((AVANTAGES[ordre[i]] as any)[cle] < (AVANTAGES[ordre[i - 1]] as any)[cle]) croit = false;
      ok(croit, "avantage « " + cle + " » : jamais moins à un niveau plus cher");
    }
    ok(AVANTAGES.premium.images === 70 && AVANTAGES.prestige.images === 120 && LIMITES.prestige.messages === 500, "chiffres Premium 70 images / Prestige 120 images / 500 messages");
    for (const [plan, niv, montant] of [["compagnon_premium", "premium", 20400], ["compagnon_prestige", "prestige", 28600]] as const) {
      const tl = "24206" + String(Math.floor(Math.random() * 9e6) + 1e6);
      const bx = (await sql`INSERT INTO starvibe_accounts (telephone, pin_hash) VALUES (${tl}, 'x') RETURNING id`) as { id: number }[];
      const U = { id: bx[0].id, token: await issueToken({ sub: String(bx[0].id), username: "n" + niv, displayName: "n" + niv, org: "star_vibe", role: "member" }) };
      r = await sub(U.token, "POST", "", { action: "choisir_plan", plan }); const dp = await j(r);
      ok(r.status === 201 && dp.abonnement.montantAttendu === montant, niv + " : demande de dépôt de " + montant + " FCFA");
      r = await sub(staffTok, "POST", "", { action: "confirmer_paiement", subscriptionId: Number(dp.abonnement.id), montantRecu: montant - 100 }); ok((await j(r)).statut === "paiement_invalide", niv + " : mauvais montant refusé");
      r = await sub(U.token, "POST", "", { action: "choisir_plan", plan }); const dp2 = await j(r);
      r = await sub(staffTok, "POST", "", { action: "confirmer_paiement", subscriptionId: Number(dp2.abonnement.id), montantRecu: montant }); ok((await j(r)).statut === "actif", niv + " : dépôt reconnu, abonnement actif");
      const eu = await j(await appel(U, "GET", "")); ok(eu.acces.niveau === niv && eu.quota.messagesMax === AVANTAGES[niv].messages, niv + " : le client profite aussitôt de ses " + AVANTAGES[niv].messages + " messages");
      ok(eu.capacites.imagesMax === AVANTAGES[niv].images, niv + " : " + AVANTAGES[niv].images + " images par mois");
      r = await sub(U.token, "POST", "", { action: "choisir_plan", plan: "credit_images_10" }); const dk = await j(r);
      ok(dk.abonnement.montantAttendu === (niv === "premium" ? 1080 : 960), niv + " : pack 10 images avec remise (" + (niv === "premium" ? "−10 %" : "−20 %") + ")");
    }
  }
} catch (e) { console.log("ÉCHEC : exception", e); ko++; }
console.log(ko ? "ECHECS : " + ko : "TOUS LES TESTS OK"); process.exit(ko ? 1 : 0);
