// Connexion unique pour le groupe STAR ENTREPRISE et ses filiales
// (SOS-DOC, La Maison de la Drépanocytose, Pili-Pili Events, S.O — Gestion des membres).
import type { Context, Config } from "@netlify/functions";
import bcrypt from "bcryptjs";
import { ensureSchema, db, json } from "./_db.mts";
import { timingSafeEqual } from "node:crypto";
import { issueToken } from "./_auth.mts";
import { ipHash, verrou, echec, effacer, msgBloque } from "./_guard.mts";

// Hash factice : on compare toujours un mot de passe, même quand l'identifiant n'existe pas (même durée de réponse).
const HASH_FACTICE = "$2a$12$C6UzMDM.H6dfI/f/IKcEeO5hWbrz0Bm8XK3x3p5uJ7kqX9z2yQe6e";
function egal(a: string, b: string): boolean { const x = Buffer.from(a), y = Buffer.from(b); return x.length === y.length && timingSafeEqual(x, y); }

function clean(value: unknown, maxLen: number): string {
  return String(value ?? "").trim().slice(0, maxLen);
}

export default async (req: Request, _context: Context) => {
  if (req.method !== "POST") {
    return json({ error: "Method not allowed" }, 405);
  }

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return json({ error: "Invalid JSON" }, 400);
  }

  const action = clean(body.action, 20);
  await ensureSchema();
  const { sql } = db();

  if (action === "login") {
    const username = clean(body.username, 80).toLowerCase();
    const password = String(body.password ?? "");
    if (!username || !password) {
      return json({ error: "Identifiant ou mot de passe manquant" }, 400);
    }

    // Anti-pirates : 5 essais ratés par identifiant et par connexion (verrou 15 min), 20 par connexion en 1 h (verrou 1 h).
    const ip = ipHash(req), kIp = `auth:ip:${ip}`, kUser = `auth:user:${ip}:${username}`;
    // + limite par identifiant, quelle que soit l'adresse (attaque depuis des adresses qui changent) : 12 essais ratés en 30 min → blocage 15 min.
    const kGlob = `auth:acct:${username}`;
    const bloc = Math.max(await verrou(sql, kIp), await verrou(sql, kUser), await verrou(sql, kGlob));
    if (bloc > 0) return json({ error: msgBloque(bloc) }, 429);

    const rows = await sql`
      SELECT id, username, password_hash, display_name, org, role
      FROM accounts WHERE username = ${username} LIMIT 1
    `;
    const account = rows[0] as
      | { id: number; username: string; password_hash: string; display_name: string; org: string; role: string }
      | undefined;

    const ok = await bcrypt.compare(password, account ? account.password_hash : HASH_FACTICE);
    if (!account || !ok) {
      await echec(sql, kIp, 20, 60, 60);
      await echec(sql, kUser, 5, 15, 15);
      await echec(sql, kGlob, 12, 30, 15);
      return json({ error: "Identifiants incorrects" }, 401);
    }
    await effacer(sql, kUser);

    const token = await issueToken({
      sub: String(account.id),
      username: account.username,
      displayName: account.display_name,
      org: account.org,
      role: account.role,
    });

    return json({
      token,
      account: {
        id: account.id,
        username: account.username,
        displayName: account.display_name,
        org: account.org,
        role: account.role,
      },
    });
  }

  if (action === "bootstrap") {
    // Crée ou met à jour un compte — protégé par un jeton de configuration
    // connu uniquement de l'administrateur (variable d'environnement SETUP_TOKEN).
    const setupToken = clean(body.setupToken, 200);
    const expected = process.env.SETUP_TOKEN || "";
    const kSetup = `auth:setup:${ipHash(req)}`;
    const blocS = Math.max(await verrou(sql, kSetup), await verrou(sql, "auth:setup:global"));
    if (blocS > 0) return json({ error: msgBloque(blocS) }, 429);
    if (!expected || !egal(setupToken, expected)) {
      await echec(sql, kSetup, 5, 60, 120);
      await echec(sql, "auth:setup:global", 10, 60, 120); // quelles que soient les adresses
      return json({ error: "Jeton de configuration invalide" }, 403);
    }

    const username = clean(body.username, 80).toLowerCase();
    const password = String(body.password ?? "");
    const displayName = clean(body.displayName, 120) || username;
    const org = clean(body.org, 40) || "star_entreprise";
    const role = clean(body.role, 40) || "admin";

    if (!username || password.length < 8) {
      return json(
        { error: "Identifiant requis, mot de passe d'au moins 8 caractères" },
        400
      );
    }

    const passwordHash = await bcrypt.hash(password, 12);

    await sql`
      INSERT INTO accounts (username, password_hash, display_name, org, role)
      VALUES (${username}, ${passwordHash}, ${displayName}, ${org}, ${role})
      ON CONFLICT (username)
      DO UPDATE SET password_hash = EXCLUDED.password_hash,
                    display_name = EXCLUDED.display_name,
                    org = EXCLUDED.org,
                    role = EXCLUDED.role
    `;

    return json({ ok: true, username, org, role });
  }

  return json({ error: "Action inconnue" }, 400);
};

export const config: Config = {
  path: "/api/auth",
};
