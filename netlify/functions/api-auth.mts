// Connexion unique pour le groupe STAR ENTREPRISE et ses filiales
// (SOS-DOC, La Maison de la Drépanocytose, Pili-Pili Events, S.O — Gestion des membres).
import type { Context, Config } from "@netlify/functions";
import bcrypt from "bcryptjs";
import { ensureSchema, db, json } from "./_db.mts";
import { issueToken } from "./_auth.mts";

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

    const rows = await sql`
      SELECT id, username, password_hash, display_name, org, role
      FROM accounts WHERE username = ${username} LIMIT 1
    `;
    const account = rows[0] as
      | { id: number; username: string; password_hash: string; display_name: string; org: string; role: string }
      | undefined;

    if (!account) {
      return json({ error: "Identifiants incorrects" }, 401);
    }
    const ok = await bcrypt.compare(password, account.password_hash);
    if (!ok) {
      return json({ error: "Identifiants incorrects" }, 401);
    }

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
    if (!expected || setupToken !== expected) {
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
