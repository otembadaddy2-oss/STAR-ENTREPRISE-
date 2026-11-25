// PASSEPORT SÛR — comptes du personnel : identifiant + mot de passe, sessions, droits par rôle, mot de passe oublié.
// Un espace est « sécurisé » dès qu'un compte Préfecture (administrateur) existe : tous les postes doivent alors se connecter.
// Les mots de passe ne sont JAMAIS stockés : seulement une empreinte scrypt avec un sel propre à chaque compte.
// LIMITE (démonstration) : aucun service d'envoi de courriel/SMS n'est branché. « Mot de passe oublié » = demande visible de la Préfecture,
// qui réinitialise ; la Préfecture elle-même dispose d'un code de secours remis une seule fois à la création de l'espace.
import { scrypt, randomBytes, timingSafeEqual, createHash } from "node:crypto";

export const ROLES = ["prefecture", "ministere", "accueil", "agent", "caisse", "porte"] as const;
export type Role = (typeof ROLES)[number];
export const NOM_ROLE: Record<string, string> = { prefecture: "Préfecture", ministere: "Ministère", accueil: "Accueil", agent: "Agent de guichet", caisse: "Caisse", porte: "Agent de porte" };

// Ce que chaque rôle peut faire sur un espace sécurisé (appliqué côté serveur, pas seulement dans l'écran).
export const DROITS: Record<Role, string[]> = {
  prefecture: ["sync", "ecrire", "payer", "appeler", "rappeler", "absent", "reglages", "supprimer", "comptes", "journal", "piece-lire", "piece-ecrire"],
  ministere: ["sync", "journal", "piece-lire"],
  accueil: ["sync", "ecrire", "payer", "piece-lire", "piece-ecrire"],
  agent: ["sync", "ecrire", "piece-lire", "piece-ecrire"],
  caisse: ["sync", "ecrire", "payer", "piece-lire", "piece-ecrire"],
  porte: ["sync", "appeler", "rappeler", "absent", "piece-lire"],
};

const ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
const aleatoire = (n: number) => { const b = randomBytes(n); let s = ""; for (let i = 0; i < n; i++) s += ALPHABET[b[i] % ALPHABET.length]; return s; };
const empreinteJeton = (j: string) => createHash("sha256").update(j).digest("hex");
const scryptHex = (mdp: string, sel: string) => new Promise<string>((ok, ko) => scrypt(mdp.normalize("NFKC"), Buffer.from(sel, "hex"), 32, { N: 16384, r: 8, p: 1, maxmem: 64 * 1024 * 1024 }, (e, k) => (e ? ko(e) : ok(k.toString("hex")))));
const egal = (a: string, b: string) => { const x = Buffer.from(a), y = Buffer.from(b); return x.length === y.length && timingSafeEqual(x, y); };

export const loginPropre = (v: unknown) => String(v ?? "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim().toLowerCase().replace(/[^a-z0-9._-]/g, "").slice(0, 30);
export function verifierMotDePasse(m: string): string | null {
  if (typeof m !== "string" || m.length < 8) return "Le mot de passe doit avoir au moins 8 caractères.";
  if (m.length > 100) return "Le mot de passe est trop long.";
  if (!/[A-Za-z]/.test(m) || !/[0-9]/.test(m)) return "Le mot de passe doit contenir au moins une lettre et un chiffre.";
  return null;
}
const MAX_ECHECS = 5, BLOCAGE_MIN = 15, SESSION_H = 12;

export async function ensureComptes(sql: any) {
  await sql`ALTER TABLE pss_espaces ADD COLUMN IF NOT EXISTS securise BOOLEAN NOT NULL DEFAULT false`;
  await sql`CREATE TABLE IF NOT EXISTS pss_comptes (espace TEXT NOT NULL REFERENCES pss_espaces(code) ON DELETE CASCADE, login TEXT NOT NULL, nom TEXT NOT NULL, role TEXT NOT NULL,
    sel TEXT NOT NULL, hash TEXT NOT NULL, secours_sel TEXT, secours_hash TEXT, actif BOOLEAN NOT NULL DEFAULT true, doit_changer BOOLEAN NOT NULL DEFAULT false,
    cree_le TIMESTAMPTZ NOT NULL DEFAULT now(), dernier_login TIMESTAMPTZ, PRIMARY KEY (espace, login))`;
  await sql`CREATE TABLE IF NOT EXISTS pss_sessions (jeton TEXT PRIMARY KEY, espace TEXT NOT NULL REFERENCES pss_espaces(code) ON DELETE CASCADE, login TEXT NOT NULL, expire TIMESTAMPTZ NOT NULL)`;
  await sql`CREATE INDEX IF NOT EXISTS pss_sessions_login ON pss_sessions (espace, login)`;
  await sql`CREATE TABLE IF NOT EXISTS pss_echecs (espace TEXT NOT NULL, cle TEXT NOT NULL, nb INT NOT NULL DEFAULT 0, bloque_jusqua TIMESTAMPTZ, maj TIMESTAMPTZ NOT NULL DEFAULT now(), PRIMARY KEY (espace, cle))`;
  await sql`CREATE TABLE IF NOT EXISTS pss_oublis (espace TEXT NOT NULL REFERENCES pss_espaces(code) ON DELETE CASCADE, login TEXT NOT NULL, demande_le TIMESTAMPTZ NOT NULL DEFAULT now(), PRIMARY KEY (espace, login))`;
}

export function creerComptes(sql: any) {
  const compteDe = (r: any) => ({ login: r.login as string, nom: r.nom as string, role: r.role as Role, actif: !!r.actif, doitChanger: !!r.doit_changer, dernierLogin: r.dernier_login || null });
  const bloque = async (code: string, cle: string) => {
    const r = (await sql`SELECT nb, bloque_jusqua FROM pss_echecs WHERE espace = ${code} AND cle = ${cle}`) as any[];
    if (r[0]?.bloque_jusqua && new Date(r[0].bloque_jusqua).getTime() > Date.now()) return Math.ceil((new Date(r[0].bloque_jusqua).getTime() - Date.now()) / 60000);
    return 0;
  };
  const echec = async (code: string, cle: string) => {
    const r = (await sql`INSERT INTO pss_echecs (espace, cle, nb) VALUES (${code}, ${cle}, 1) ON CONFLICT (espace, cle) DO UPDATE SET nb = CASE WHEN pss_echecs.bloque_jusqua IS NOT NULL AND pss_echecs.bloque_jusqua < now() THEN 1 ELSE pss_echecs.nb + 1 END, maj = now() RETURNING nb`) as any[];
    if (Number(r[0].nb) >= MAX_ECHECS) await sql`UPDATE pss_echecs SET nb = 0, bloque_jusqua = now() + (${BLOCAGE_MIN} || ' minutes')::interval WHERE espace = ${code} AND cle = ${cle}`;
  };
  const reussite = (code: string, cle: string) => sql`DELETE FROM pss_echecs WHERE espace = ${code} AND cle = ${cle}`;
  const nouvelleSession = async (code: string, login: string) => {
    const jeton = randomBytes(32).toString("hex");
    await sql`DELETE FROM pss_sessions WHERE expire < now()`;
    await sql`INSERT INTO pss_sessions (jeton, espace, login, expire) VALUES (${empreinteJeton(jeton)}, ${code}, ${login}, now() + (${SESSION_H} || ' hours')::interval)`;
    return jeton;
  };
  const SEL_FACTICE = randomBytes(16).toString("hex");
  // Limiteur « fenêtre glissante simple » (anti-force-brute par adresse) : bloqué quand le compteur atteint max dans la fenêtre.
  const fenetreBloquee = async (code: string, cle: string, max: number, minutes: number) => {
    const r = (await sql`SELECT nb, maj FROM pss_echecs WHERE espace = ${code} AND cle = ${cle}`) as any[];
    if (!r[0]) return 0; const fin = new Date(r[0].maj).getTime() + minutes * 60000;
    return Number(r[0].nb) >= max && fin > Date.now() ? Math.ceil((fin - Date.now()) / 60000) : 0;
  };
  const fenetreCompter = (code: string, cle: string, minutes: number) => sql`INSERT INTO pss_echecs (espace, cle, nb, maj) VALUES (${code}, ${cle}, 1, now())
    ON CONFLICT (espace, cle) DO UPDATE SET nb = CASE WHEN pss_echecs.maj < now() - (${minutes} || ' minutes')::interval THEN 1 ELSE pss_echecs.nb + 1 END, maj = CASE WHEN pss_echecs.maj < now() - (${minutes} || ' minutes')::interval THEN now() ELSE pss_echecs.maj END`;

  return {
    fenetreBloquee, fenetreCompter,
    async securise(code: string): Promise<boolean> { const r = (await sql`SELECT securise FROM pss_espaces WHERE code = ${code}`) as any[]; return !!r[0]?.securise; },

    // Rend un espace sécurisé en créant le compte administrateur (Préfecture). Renvoie le code de secours, affiché une seule fois.
    async securiser(code: string, login: string, nom: string, mdp: string) {
      login = loginPropre(login); nom = String(nom || "").replace(/[\u0000-\u001f<>]/g, " ").trim().slice(0, 60);
      if (login.length < 3) return { erreur: "L'identifiant doit avoir au moins 3 caractères (lettres, chiffres, . _ -).", statut: 400 };
      if (!nom) return { erreur: "Indiquez le nom de l'administrateur.", statut: 400 };
      const pb = verifierMotDePasse(mdp); if (pb) return { erreur: pb, statut: 400 };
      const sel = randomBytes(16).toString("hex"), hash = await scryptHex(mdp, sel), secours = aleatoire(4) + "-" + aleatoire(4) + "-" + aleatoire(4), ssel = randomBytes(16).toString("hex"), shash = await scryptHex(secours, ssel);
      const ok = (await sql`UPDATE pss_espaces SET securise = true WHERE code = ${code} AND securise = false RETURNING code`) as any[];
      if (!ok[0]) return { erreur: "Cet espace est déjà sécurisé.", statut: 409 };
      await sql`INSERT INTO pss_comptes (espace, login, nom, role, sel, hash, secours_sel, secours_hash) VALUES (${code}, ${login}, ${nom}, 'prefecture', ${sel}, ${hash}, ${ssel}, ${shash})`;
      return { login, secours };
    },

    async connexion(code: string, loginBrut: string, mdp: string) {
      const login = loginPropre(loginBrut), cle = "login:" + login;
      const min = await bloque(code, cle); if (min) return { erreur: "Trop d'essais. Réessayez dans " + min + " minute" + (min > 1 ? "s" : "") + ".", statut: 429 };
      const r = (await sql`SELECT * FROM pss_comptes WHERE espace = ${code} AND login = ${login}`) as any[];
      const h = await scryptHex(String(mdp || ""), r[0]?.sel || SEL_FACTICE);   // même durée que le compte existe ou non
      if (!r[0] || !r[0].actif || !egal(h, r[0].hash)) { await echec(code, cle); return { erreur: "Identifiant ou mot de passe incorrect.", statut: 401 }; }
      await reussite(code, cle); await sql`UPDATE pss_comptes SET dernier_login = now() WHERE espace = ${code} AND login = ${login}`;
      return { jeton: await nouvelleSession(code, login), compte: compteDe(r[0]) };
    },

    async authentifier(code: string, jeton: string) {
      if (!jeton || !/^[a-f0-9]{64}$/.test(jeton)) return null;
      const r = (await sql`SELECT c.* FROM pss_sessions s JOIN pss_comptes c ON c.espace = s.espace AND c.login = s.login WHERE s.jeton = ${empreinteJeton(jeton)} AND s.espace = ${code} AND s.expire > now() AND c.actif = true`) as any[];
      return r[0] ? compteDe(r[0]) : null;
    },
    async deconnexion(jeton: string) { if (jeton) await sql`DELETE FROM pss_sessions WHERE jeton = ${empreinteJeton(jeton)}`; return { ok: true }; },

    async changerMotDePasse(code: string, login: string, ancien: string, nouveau: string) {
      const cle = "login:" + login, min = await bloque(code, cle); if (min) return { erreur: "Trop d'essais. Réessayez dans " + min + " minute(s).", statut: 429 };
      const pb = verifierMotDePasse(nouveau); if (pb) return { erreur: pb, statut: 400 };
      const r = (await sql`SELECT sel, hash FROM pss_comptes WHERE espace = ${code} AND login = ${login}`) as any[];
      if (!r[0] || !egal(await scryptHex(String(ancien || ""), r[0].sel), r[0].hash)) { await echec(code, cle); return { erreur: "L'ancien mot de passe est incorrect.", statut: 401 }; }
      if (ancien === nouveau) return { erreur: "Choisissez un mot de passe différent de l'ancien.", statut: 400 };
      const sel = randomBytes(16).toString("hex"); await sql`UPDATE pss_comptes SET sel = ${sel}, hash = ${await scryptHex(nouveau, sel)}, doit_changer = false WHERE espace = ${code} AND login = ${login}`;
      await reussite(code, cle); await sql`DELETE FROM pss_oublis WHERE espace = ${code} AND login = ${login}`;
      return { jeton: await nouvelleSession(code, login) };   // les autres sessions de ce compte sont fermées plus bas
    },
    async fermerAutresSessions(code: string, login: string, jetonGarde: string) { await sql`DELETE FROM pss_sessions WHERE espace = ${code} AND login = ${login} AND jeton <> ${empreinteJeton(jetonGarde || "")}`; },

    // « Mot de passe oublié » : la demande est notée pour la Préfecture. Réponse identique que le compte existe ou non (pas de fuite d'identifiants).
    async oubli(code: string, loginBrut: string) {
      const login = loginPropre(loginBrut), cle = "oubli:" + login, min = await bloque(code, cle); if (min) return { erreur: "Trop de demandes. Réessayez plus tard.", statut: 429 };
      await echec(code, cle);
      const r = (await sql`SELECT login FROM pss_comptes WHERE espace = ${code} AND login = ${login} AND actif = true`) as any[];
      if (r[0]) await sql`INSERT INTO pss_oublis (espace, login) VALUES (${code}, ${login}) ON CONFLICT (espace, login) DO UPDATE SET demande_le = now()`;
      return { ok: true, message: "Si cet identifiant existe, la demande a été transmise à la Préfecture. Elle vous remettra un mot de passe temporaire." };
    },
    // La Préfecture a perdu son mot de passe : code de secours remis à la création (un seul usage, un nouveau est alors fourni).
    async secours(code: string, loginBrut: string, codeSecours: string, nouveau: string) {
      const login = loginPropre(loginBrut), cle = "secours:" + login, min = await bloque(code, cle); if (min) return { erreur: "Trop d'essais. Réessayez dans " + min + " minute(s).", statut: 429 };
      const pb = verifierMotDePasse(nouveau); if (pb) return { erreur: pb, statut: 400 };
      const r = (await sql`SELECT secours_sel, secours_hash FROM pss_comptes WHERE espace = ${code} AND login = ${login} AND role = 'prefecture' AND actif = true`) as any[];
      const propre = String(codeSecours || "").toUpperCase().replace(/[^A-Z0-9]/g, "").replace(/(.{4})(?=.)/g, "$1-");
      const h = await scryptHex(propre, r[0]?.secours_sel || SEL_FACTICE);
      if (!r[0] || !r[0].secours_hash || !egal(h, r[0].secours_hash)) { await echec(code, cle); return { erreur: "Identifiant ou code de secours incorrect.", statut: 401 }; }
      const sel = randomBytes(16).toString("hex"), nouveauSecours = aleatoire(4) + "-" + aleatoire(4) + "-" + aleatoire(4), ssel = randomBytes(16).toString("hex");
      await sql`UPDATE pss_comptes SET sel = ${sel}, hash = ${await scryptHex(nouveau, sel)}, secours_sel = ${ssel}, secours_hash = ${await scryptHex(nouveauSecours, ssel)}, doit_changer = false WHERE espace = ${code} AND login = ${login}`;
      await sql`DELETE FROM pss_sessions WHERE espace = ${code} AND login = ${login}`; await reussite(code, cle);
      return { ok: true, secours: nouveauSecours };
    },

    // ----- Gestion par la Préfecture -----
    async lister(code: string) {
      const l = (await sql`SELECT login, nom, role, actif, doit_changer, dernier_login FROM pss_comptes WHERE espace = ${code} ORDER BY role, login`) as any[];
      const o = (await sql`SELECT login, demande_le FROM pss_oublis WHERE espace = ${code} ORDER BY demande_le`) as any[];
      return { comptes: l.map(compteDe), oublis: o.map(x => ({ login: x.login, demandeLe: x.demande_le })) };
    },
    async creerCompte(code: string, loginBrut: string, nom: string, role: string) {
      const login = loginPropre(loginBrut); nom = String(nom || "").replace(/[\u0000-\u001f<>]/g, " ").trim().slice(0, 60);
      if (login.length < 3) return { erreur: "L'identifiant doit avoir au moins 3 caractères (lettres, chiffres, . _ -).", statut: 400 };
      if (!nom) return { erreur: "Indiquez le nom de la personne.", statut: 400 };
      if (!(ROLES as readonly string[]).includes(role)) return { erreur: "Rôle inconnu.", statut: 400 };
      const n = ((await sql`SELECT count(*)::int AS n FROM pss_comptes WHERE espace = ${code}`) as any[])[0].n; if (n >= 200) return { erreur: "Nombre maximal de comptes atteint.", statut: 409 };
      const temp = aleatoire(10), sel = randomBytes(16).toString("hex");
      const r = (await sql`INSERT INTO pss_comptes (espace, login, nom, role, sel, hash, doit_changer) VALUES (${code}, ${login}, ${nom}, ${role}, ${sel}, ${await scryptHex(temp, sel)}, true) ON CONFLICT DO NOTHING RETURNING login`) as any[];
      if (!r[0]) return { erreur: "Cet identifiant existe déjà.", statut: 409 };
      return { login, motDePasseTemporaire: temp };
    },
    async reinitialiser(code: string, loginBrut: string) {
      const login = loginPropre(loginBrut), temp = aleatoire(10), sel = randomBytes(16).toString("hex");
      const r = (await sql`UPDATE pss_comptes SET sel = ${sel}, hash = ${await scryptHex(temp, sel)}, doit_changer = true WHERE espace = ${code} AND login = ${login} RETURNING login`) as any[];
      if (!r[0]) return { erreur: "Compte introuvable.", statut: 404 };
      await sql`DELETE FROM pss_sessions WHERE espace = ${code} AND login = ${login}`; await sql`DELETE FROM pss_oublis WHERE espace = ${code} AND login = ${login}`; await sql`DELETE FROM pss_echecs WHERE espace = ${code} AND cle = ${"login:" + login}`;
      return { login, motDePasseTemporaire: temp };
    },
    async basculer(code: string, loginBrut: string, actif: boolean, moi: string) {
      const login = loginPropre(loginBrut); if (login === moi && !actif) return { erreur: "Vous ne pouvez pas désactiver votre propre compte.", statut: 400 };
      if (!actif) { const a = ((await sql`SELECT count(*)::int AS n FROM pss_comptes WHERE espace = ${code} AND role = 'prefecture' AND actif = true AND login <> ${login}`) as any[])[0].n; const c = (await sql`SELECT role FROM pss_comptes WHERE espace = ${code} AND login = ${login}`) as any[]; if (c[0]?.role === "prefecture" && a < 1) return { erreur: "Il doit rester au moins un compte Préfecture actif.", statut: 400 }; }
      const r = (await sql`UPDATE pss_comptes SET actif = ${!!actif} WHERE espace = ${code} AND login = ${login} RETURNING login`) as any[]; if (!r[0]) return { erreur: "Compte introuvable.", statut: 404 };
      if (!actif) await sql`DELETE FROM pss_sessions WHERE espace = ${code} AND login = ${login}`;
      return { ok: true };
    },
  };
}
