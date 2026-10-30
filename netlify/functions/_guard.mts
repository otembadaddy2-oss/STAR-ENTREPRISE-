// Compteurs anti-abus partagés (essais ratés, demandes répétées), stockés en base.
// Utilisés par la réinitialisation du code PIN des membres.
import { createHash } from "node:crypto";

// deno-lint-ignore no-explicit-any
type Sql = any;

export function ipHash(req: Request): string {
  const ip = String(req.headers.get("x-nf-client-connection-ip") || req.headers.get("x-forwarded-for") || "inconnue").trim().slice(0, 60);
  return createHash("sha256").update(ip + ":" + (process.env.JWT_SECRET || "")).digest("hex").slice(0, 24);
}

// Minutes de blocage restantes pour cette clé (0 = libre).
export async function verrou(sql: Sql, key: string): Promise<number> {
  const r = (await sql`SELECT locked_until FROM staff_login_guard WHERE key = ${key} AND locked_until > now()`) as { locked_until: string }[];
  if (!r[0]) return 0;
  return Math.max(1, Math.ceil((new Date(String(r[0].locked_until)).getTime() - Date.now()) / 60000));
}

// Compte un essai. Renvoie le nombre d'essais restants avant blocage (0 = vient d'être bloqué).
export async function echec(sql: Sql, key: string, max: number, fenetreMin: number, blocageMin: number): Promise<number> {
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

export async function effacer(sql: Sql, key: string) { await sql`DELETE FROM staff_login_guard WHERE key = ${key}`; }

export const msgBloque = (min: number) => `Trop d'essais. Réessaie dans ${min} minute${min > 1 ? "s" : ""}.`;
