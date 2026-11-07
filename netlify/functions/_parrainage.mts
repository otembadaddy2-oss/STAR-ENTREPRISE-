// KOMYO — Parrainage : règles validées par Carry OTEMBA (7 novembre 2026).
//  - Un ami « compte » quand il a créé son compte avec le lien (ou le code) du parrain ET s'est connecté sur au moins 2 jours différents.
//  - Classement chaque mois (heure de Brazzaville) : 1er médaille d'or, 2e argent, 3e bronze, à condition d'avoir au moins 50 amis connectés dans le mois.
//  - Avantage : or 30 jours, argent 7 jours, bronze 3 jours de Pack « Les bonnes habitudes ». Jamais activé automatiquement :
//    l'équipe envoie d'abord un message au gagnant, puis l'avantage se choisit avec lui.
// deno-lint-ignore no-explicit-any
type Sql = any;

export const MIN_AMIS = 50;
export const MEDAILLES: Record<number, { nom: string; jours: number; emoji: string }> = {
  1: { nom: "or", jours: 30, emoji: "🥇" },
  2: { nom: "argent", jours: 7, emoji: "🥈" },
  3: { nom: "bronze", jours: 3, emoji: "🥉" },
};

const ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";   // sans I, O, 0, 1 : pas de confusion
const nouveauCode = () => { let c = ""; const b = crypto.getRandomValues(new Uint8Array(6)); for (const x of b) c += ALPHABET[x % ALPHABET.length]; return c; };

// Date du jour à Brazzaville (UTC+1), au format AAAA-MM-JJ.
export const jourLocal = (d = new Date()) => new Date(d.getTime() + 3600_000).toISOString().slice(0, 10);
export const moisLocal = (d = new Date()) => jourLocal(d).slice(0, 7);
export const moisValide = (m: string) => /^\d{4}-(0[1-9]|1[0-2])$/.test(m);

// Une ligne par jour et par compte, au plus. Silencieux : ne doit jamais gêner la connexion.
export async function noterConnexion(sql: Sql, accountId: number): Promise<void> {
  try { await sql`INSERT INTO starvibe_connexions (account_id, jour) VALUES (${accountId}, ${jourLocal()}::date) ON CONFLICT DO NOTHING`; } catch (e) { console.error("connexion", e); }
}

// Le code personnel du membre (créé à la première demande).
export async function codeDe(sql: Sql, accountId: number): Promise<string> {
  const r = (await sql`SELECT code_parrain FROM starvibe_accounts WHERE id = ${accountId}`) as { code_parrain: string | null }[];
  if (r[0]?.code_parrain) return r[0].code_parrain;
  for (let i = 0; i < 8; i++) {
    const c = nouveauCode();
    try {
      const u = (await sql`UPDATE starvibe_accounts SET code_parrain = ${c} WHERE id = ${accountId} AND code_parrain IS NULL RETURNING code_parrain`) as { code_parrain: string }[];
      if (u[0]) return u[0].code_parrain;
      const a = (await sql`SELECT code_parrain FROM starvibe_accounts WHERE id = ${accountId}`) as { code_parrain: string }[];
      if (a[0]?.code_parrain) return a[0].code_parrain;
    } catch { /* code déjà pris : on en tire un autre */ }
  }
  throw new Error("code parrain impossible");
}

export async function parrainDuCode(sql: Sql, code: string): Promise<number | null> {
  const c = String(code || "").toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 12);
  if (c.length < 4) return null;
  const r = (await sql`SELECT id FROM starvibe_accounts WHERE code_parrain = ${c} AND NOT guest LIMIT 1`) as { id: number }[];
  return r[0]?.id ?? null;
}

export interface LigneClassement { parrainId: number; amis: number; premier: string; nom: string; tel: string }

// Classement d'un mois : nombre d'amis devenus « connectés » (2e jour de connexion) ce mois-là, du plus au moins.
// Égalité : celui qui a atteint son total le plus tôt passe devant, puis le plus ancien compte.
export async function classement(sql: Sql, mois: string): Promise<LigneClassement[]> {
  const debut = `${mois}-01`;
  const rows = (await sql`
    WITH j AS (SELECT account_id, jour, row_number() OVER (PARTITION BY account_id ORDER BY jour) AS rn FROM starvibe_connexions),
    q AS (SELECT account_id, jour AS qualifie FROM j WHERE rn = 2),
    m AS (
      SELECT a.parrain_id, COUNT(*)::int AS amis, MAX(q.qualifie) AS dernier
      FROM starvibe_accounts a JOIN q ON q.account_id = a.id
      WHERE a.parrain_id IS NOT NULL AND a.parrain_id <> a.id AND q.qualifie >= ${debut}::date AND q.qualifie < (${debut}::date + interval '1 month')
      GROUP BY a.parrain_id
    )
    SELECT m.parrain_id, m.amis, m.dernier,
           COALESCE((SELECT nom FROM starvibe_profiles p WHERE p.account_id = m.parrain_id ORDER BY p.id LIMIT 1), '') AS nom,
           (SELECT telephone FROM starvibe_accounts WHERE id = m.parrain_id) AS tel
    FROM m ORDER BY m.amis DESC, m.dernier ASC, m.parrain_id ASC LIMIT 100`) as { parrain_id: number; amis: number; dernier: string; nom: string; tel: string }[];
  return rows.map((r) => ({ parrainId: r.parrain_id, amis: r.amis, premier: String(r.dernier).slice(0, 10), nom: r.nom || "", tel: r.tel || "" }));
}
