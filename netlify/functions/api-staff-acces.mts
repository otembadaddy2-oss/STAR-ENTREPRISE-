// Accès du staff STAR ENTREPRISE au backend KOMYO / Keydou — par mot de passe seul (pas d'identifiant à retenir).
//
// Sécurité :
//  - le mot de passe seul est la clé : il doit être long (12 caractères minimum), jamais un numéro de téléphone ;
//  - trop d'essais ratés = blocage (par connexion Internet, et global) ;
//  - « mot de passe oublié » : code à 6 chiffres envoyé en notification sur le(s) téléphone(s) du staff
//    enregistré(s), ou code de secours (affiché une seule fois à chaque changement de mot de passe) ;
//  - les réponses d'erreur ne disent jamais si un compte existe.
// Le reste du groupe (SOS-DOC, Pili-Pili…) continue d'utiliser /api/auth avec identifiant.
import type { Context, Config } from "@netlify/functions";
import bcrypt from "bcryptjs";
import { createHash, randomInt } from "node:crypto";
import { ensureSchema, db, json } from "./_db.mts";
import { issueToken, requireAuth } from "./_auth.mts";
import { pushAll } from "./_push.mts";

const STAFF_ORG = "star_entreprise";
const MIN_MDP = 12;
const ALPHA_SECOURS = "ABCDEFGHJKMNPQRSTUVWXYZ23456789"; // sans 0/O/1/I/L pour éviter les confusions

type Row = Record<string, unknown>;
// deno-lint-ignore no-explicit-any
type Sql = any;

function clean(v: unknown, max: number): string { return String(v ?? "").trim().slice(0, max); }

function ipHash(req: Request): string {
  const ip = clean(req.headers.get("x-nf-client-connection-ip") || req.headers.get("x-forwarded-for") || "inconnue", 60);
  return createHash("sha256").update(ip + ":" + (process.env.JWT_SECRET || "")).digest("hex").slice(0, 24);
}

// ---------- Blocage après essais ratés ----------
async function verrou(sql: Sql, key: string): Promise<number> { // minutes restantes, 0 = libre
  const r = (await sql`SELECT locked_until FROM staff_login_guard WHERE key = ${key} AND locked_until > now()`) as Row[];
  if (!r[0]) return 0;
  const ms = new Date(String(r[0].locked_until)).getTime() - Date.now();
  return Math.max(1, Math.ceil(ms / 60000));
}
// Compte un essai raté. Renvoie le nombre d'essais restants avant blocage (0 = vient d'être bloqué).
async function echec(sql: Sql, key: string, max: number, fenetreMin: number, blocageMin: number): Promise<number> {
  const r = (await sql`
    INSERT INTO staff_login_guard (key, fails, window_start) VALUES (${key}, 1, now())
    ON CONFLICT (key) DO UPDATE SET
      fails = CASE WHEN staff_login_guard.window_start < now() - make_interval(mins => ${fenetreMin}::int) THEN 1 ELSE staff_login_guard.fails + 1 END,
      window_start = CASE WHEN staff_login_guard.window_start < now() - make_interval(mins => ${fenetreMin}::int) THEN now() ELSE staff_login_guard.window_start END
    RETURNING fails
  `) as { fails: number }[];
  const n = Number(r[0]?.fails || 1);
  if (n >= max) {
    await sql`UPDATE staff_login_guard SET locked_until = now() + make_interval(mins => ${blocageMin}::int), fails = 0, window_start = now() WHERE key = ${key}`;
    return 0;
  }
  return max - n;
}
async function effacer(sql: Sql, key: string) { await sql`DELETE FROM staff_login_guard WHERE key = ${key}`; }

const msgBloque = (min: number) => `Trop d'essais. Réessaie dans ${min} minute${min > 1 ? "s" : ""}.`;

// ---------- Règles du nouveau mot de passe ----------
function mdpFaible(mdp: string): string {
  if (mdp.length < MIN_MDP) return `Le mot de passe doit faire au moins ${MIN_MDP} caractères. Astuce : 3 ou 4 mots que tu retiens facilement, par exemple « Pointe-Noire.Mange.Mangue.2026 ».`;
  const bas = mdp.toLowerCase();
  const chiffres = mdp.replace(/\D/g, "");
  if (/^[\d\s+().-]+$/.test(mdp) || chiffres.includes("066565050") || chiffres.includes("242066565")) return "Pas de numéro de téléphone : il est affiché publiquement sur la page de paiement Keydou.";
  if (["motdepasse", "password", "azerty", "123456", "qwerty", "starentreprise", "komyo", "keydou", "carryotemba"].some((m) => bas.includes(m))) return "Ce mot de passe est trop facile à deviner. Choisis plutôt 3 ou 4 mots qui n'ont aucun rapport avec KOMYO.";
  if (new Set(bas).size < 5) return "Ce mot de passe est trop répétitif.";
  return "";
}

// ---------- Compte principal et code de secours ----------
async function comptePrincipal(sql: Sql): Promise<number | null> {
  const r = (await sql`
    SELECT id FROM accounts WHERE org = ${STAFF_ORG}
    ORDER BY (username = 'carryotemba') DESC, (role = 'admin') DESC, id ASC LIMIT 1
  `) as { id: number }[];
  return r[0] ? Number(r[0].id) : null;
}
function nouveauCodeSecours(): string {
  let c = "";
  for (let i = 0; i < 16; i++) c += ALPHA_SECOURS[randomInt(0, ALPHA_SECOURS.length)];
  return c.match(/.{4}/g)!.join("-");
}
const normSecours = (v: string) => v.toUpperCase().replace(/[^A-Z2-9]/g, "");
async function poserCodeSecours(sql: Sql): Promise<string> {
  const code = nouveauCodeSecours();
  const h = await bcrypt.hash(normSecours(code), 10);
  await sql`INSERT INTO starvibe_settings (key, value) VALUES ('staff_recovery_hash', ${h}) ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value`;
  return code;
}

async function changerMdp(sql: Sql, accountId: number, mdp: string) {
  const h = await bcrypt.hash(mdp, 12);
  await sql`UPDATE accounts SET password_hash = ${h} WHERE id = ${accountId}`;
}
async function ouvrirSession(sql: Sql, accountId: number) {
  const a = (await sql`SELECT id, username, display_name, org, role FROM accounts WHERE id = ${accountId} LIMIT 1`) as Row[];
  const x = a[0];
  const token = await issueToken({ sub: String(x.id), username: String(x.username), displayName: String(x.display_name), org: String(x.org), role: String(x.role) });
  return { token, account: { id: x.id, username: x.username, displayName: x.display_name, org: x.org, role: x.role } };
}

export default async (req: Request, _context: Context) => {
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);
  let body: Record<string, unknown>;
  try { body = (await req.json()) as Record<string, unknown>; } catch { return json({ error: "Requête invalide" }, 400); }
  const action = clean(body.action, 30);
  await ensureSchema();
  const { sql } = db();
  const ip = ipHash(req);

  // --- Connexion : le mot de passe seul ---
  if (action === "login") {
    const mdp = String(body.password ?? "");
    if (!mdp) return json({ error: "Écris ton mot de passe." }, 400);
    const kIp = `ip:login:${ip}`, kGlob = "global:login";
    const bloc = Math.max(await verrou(sql, kIp), await verrou(sql, kGlob));
    if (bloc) return json({ error: msgBloque(bloc), bloque: true }, 429);

    const comptes = (await sql`
      SELECT id, password_hash FROM accounts WHERE org = ${STAFF_ORG} ORDER BY id LIMIT 8
    `) as { id: number; password_hash: string }[];
    let trouve: number | null = null;
    for (const c of comptes) {
      if (await bcrypt.compare(mdp, c.password_hash)) { trouve = c.id; break; }
    }
    if (trouve === null) {
      const reste = await echec(sql, kIp, 5, 15, 15);
      await echec(sql, kGlob, 40, 60, 10);
      if (reste === 0) return json({ error: msgBloque(15), bloque: true }, 429);
      return json({ error: `Mot de passe incorrect. Il te reste ${reste} essai${reste > 1 ? "s" : ""}.`, reste }, 401);
    }
    await effacer(sql, kIp);
    return json(await ouvrirSession(sql, trouve));
  }

  // --- Mot de passe oublié, 1re étape : un code à 6 chiffres sur le(s) téléphone(s) du staff ---
  if (action === "forgot_start") {
    const kIp = `ip:forgot:${ip}`, kGlob = "global:forgot";
    const bloc = Math.max(await verrou(sql, kIp), await verrou(sql, kGlob));
    if (bloc) return json({ error: msgBloque(bloc), bloque: true }, 429);
    await echec(sql, kIp, 4, 60, 30);   // 3 demandes par heure et par connexion
    await echec(sql, kGlob, 12, 60, 30);
    const id = await comptePrincipal(sql);
    let envoye = 0;
    if (id !== null) {
      const code = String(randomInt(0, 1000000)).padStart(6, "0");
      const h = await bcrypt.hash(code, 10);
      await sql`UPDATE staff_reset_codes SET used = true WHERE account_id = ${id} AND NOT used`;
      await sql`INSERT INTO staff_reset_codes (account_id, code_hash, expires_at) VALUES (${id}, ${h}, now() + interval '10 minutes')`;
      envoye = await pushAll(sql, {
        title: "Code de réinitialisation KOMYO",
        body: `${code} — valable 10 minutes. Ne le donne à personne.`,
        tag: "staff-reset", url: "/starvibe/keydou-admin.html",
      });
    }
    return json({ ok: true, envoye });
  }

  // --- 2e étape : le code reçu + le nouveau mot de passe ---
  if (action === "forgot_finish") {
    const kIp = `ip:code:${ip}`;
    const bloc = await verrou(sql, kIp);
    if (bloc) return json({ error: msgBloque(bloc), bloque: true }, 429);
    const code = clean(body.code, 12).replace(/\D/g, "");
    const mdp = String(body.newPassword ?? "");
    const faible = mdpFaible(mdp);
    if (faible) return json({ error: faible }, 400);
    if (code.length !== 6) return json({ error: "Le code fait 6 chiffres." }, 400);
    const rows = (await sql`
      SELECT id, account_id, code_hash, tries FROM staff_reset_codes
      WHERE NOT used AND expires_at > now() ORDER BY id DESC LIMIT 1
    `) as { id: number; account_id: number; code_hash: string; tries: number }[];
    const r = rows[0];
    if (!r) return json({ error: "Code expiré ou inexistant : demande-en un nouveau." }, 400);
    if (!(await bcrypt.compare(code, r.code_hash))) {
      const t = r.tries + 1;
      if (t >= 5) await sql`UPDATE staff_reset_codes SET used = true, tries = ${t} WHERE id = ${r.id}`;
      else await sql`UPDATE staff_reset_codes SET tries = ${t} WHERE id = ${r.id}`;
      await echec(sql, kIp, 8, 60, 30);
      return json({ error: t >= 5 ? "Trop d'erreurs sur ce code : demande-en un nouveau." : `Code incorrect. Il te reste ${5 - t} essai${5 - t > 1 ? "s" : ""}.` }, 400);
    }
    await sql`UPDATE staff_reset_codes SET used = true WHERE id = ${r.id}`;
    await changerMdp(sql, r.account_id, mdp);
    await effacer(sql, `ip:login:${ip}`);
    const secours = await poserCodeSecours(sql);
    return json({ ...(await ouvrirSession(sql, r.account_id)), codeSecours: secours });
  }

  // --- Ou : le code de secours + le nouveau mot de passe ---
  if (action === "forgot_recovery") {
    const kIp = `ip:recov:${ip}`;
    const bloc = await verrou(sql, kIp);
    if (bloc) return json({ error: msgBloque(bloc), bloque: true }, 429);
    const mdp = String(body.newPassword ?? "");
    const faible = mdpFaible(mdp);
    if (faible) return json({ error: faible }, 400);
    const saisi = normSecours(clean(body.recoveryCode, 40));
    const h = (await sql`SELECT value FROM starvibe_settings WHERE key = 'staff_recovery_hash'`) as { value: string }[];
    const ok = saisi.length === 16 && !!h[0] && (await bcrypt.compare(saisi, h[0].value));
    if (!ok) {
      const reste = await echec(sql, kIp, 5, 60, 60);
      return json({ error: reste === 0 ? msgBloque(60) : `Code de secours incorrect. Il te reste ${reste} essai${reste > 1 ? "s" : ""}.` }, 400);
    }
    const id = await comptePrincipal(sql);
    if (id === null) return json({ error: "Aucun compte staff." }, 400);
    await changerMdp(sql, id, mdp);
    await effacer(sql, kIp); await effacer(sql, `ip:login:${ip}`);
    const secours = await poserCodeSecours(sql); // l'ancien code est remplacé
    return json({ ...(await ouvrirSession(sql, id)), codeSecours: secours });
  }

  // --- Connecté : générer un nouveau code de secours (l'ancien devient inutilisable) ---
  if (action === "recovery_new") {
    const s = await requireAuth(req);
    if (!s || s.org !== STAFF_ORG) return json({ error: "Non autorisé" }, 403);
    return json({ codeSecours: await poserCodeSecours(sql) });
  }

  return json({ error: "Action inconnue" }, 400);
};

export const config: Config = {
  path: "/api/staff-acces",
};
