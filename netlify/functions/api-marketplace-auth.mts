// STAR Marketplace — comptes acheteurs/vendeurs (distincts des comptes staff
// `accounts`). Mêmes protections que le Guichet unique : verrouillage après
// tentatives échouées, réponse générique en cas d'échec de connexion.
import type { Context, Config } from "@netlify/functions";
import bcrypt from "bcryptjs";
import { ensureSchema, db, json } from "./_db.mts";
import { issueToken, requireAuth } from "./_auth.mts";

function clean(value: unknown, maxLen: number): string {
  return String(value ?? "").trim().slice(0, maxLen);
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MAX_FAILED_ATTEMPTS = 5;
const LOCKOUT_MINUTES = 15;
const ORG = "star_marketplace";

export default async (req: Request, _context: Context) => {
  await ensureSchema();
  const { sql } = db();

  if (req.method === "GET") {
    const session = await requireAuth(req);
    if (!session || session.org !== ORG) return json({ error: "Non authentifié" }, 401);
    const rows = await sql`
      SELECT id, email, nom, telephone, ville, est_vendeur, created_at
      FROM marketplace_users WHERE id = ${Number(session.sub)} LIMIT 1
    `;
    const u = rows[0] as any;
    if (!u) return json({ error: "Compte introuvable" }, 404);
    return json({
      user: {
        id: u.id, email: u.email, nom: u.nom, telephone: u.telephone,
        ville: u.ville, estVendeur: u.est_vendeur, createdAt: u.created_at,
      },
    });
  }

  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return json({ error: "Invalid JSON" }, 400);
  }

  const action = clean(body.action, 20);

  if (action === "login") {
    const email = clean(body.email, 160).toLowerCase();
    const password = String(body.password ?? "");
    if (!email || !password) return json({ error: "Email ou mot de passe manquant" }, 400);

    const rows = await sql`
      SELECT id, email, password_hash, nom, est_vendeur, failed_attempts, locked_until
      FROM marketplace_users WHERE email = ${email} LIMIT 1
    `;
    const u = rows[0] as any;
    const genericError = () => json({ error: "Identifiants incorrects" }, 401);
    if (!u) return genericError();

    if (u.locked_until && new Date(u.locked_until).getTime() > Date.now()) {
      const minutes = Math.ceil((new Date(u.locked_until).getTime() - Date.now()) / 60000);
      return json(
        { error: `Trop de tentatives. Réessayez dans ${minutes} minute${minutes > 1 ? "s" : ""}.` },
        429
      );
    }

    const ok = await bcrypt.compare(password, u.password_hash);
    if (!ok) {
      const attempts = (u.failed_attempts || 0) + 1;
      if (attempts >= MAX_FAILED_ATTEMPTS) {
        await sql`
          UPDATE marketplace_users
          SET failed_attempts = 0, locked_until = now() + (${LOCKOUT_MINUTES} || ' minutes')::interval
          WHERE id = ${u.id}
        `;
        return json(
          { error: `Trop de tentatives. Compte verrouillé ${LOCKOUT_MINUTES} minutes par sécurité.` },
          429
        );
      }
      await sql`UPDATE marketplace_users SET failed_attempts = ${attempts} WHERE id = ${u.id}`;
      return genericError();
    }

    if (u.failed_attempts > 0 || u.locked_until) {
      await sql`UPDATE marketplace_users SET failed_attempts = 0, locked_until = NULL WHERE id = ${u.id}`;
    }

    const token = await issueToken({
      sub: String(u.id), username: u.email, displayName: u.nom, org: ORG,
      role: u.est_vendeur ? "vendeur" : "acheteur",
    });
    return json({ token, user: { id: u.id, email: u.email, nom: u.nom, estVendeur: u.est_vendeur } });
  }

  if (action === "register") {
    const email = clean(body.email, 160).toLowerCase();
    const password = String(body.password ?? "");
    const nom = clean(body.nom, 120);
    const telephone = clean(body.telephone, 40);
    const ville = clean(body.ville, 80);
    const estVendeur = Boolean(body.estVendeur);

    if (!email || password.length < 8 || !nom || !telephone) {
      return json({ error: "Email, mot de passe (8+ caractères), nom et téléphone sont requis" }, 400);
    }
    if (!EMAIL_RE.test(email)) return json({ error: "Adresse email invalide" }, 400);

    const exists = await sql`SELECT id FROM marketplace_users WHERE email = ${email} LIMIT 1`;
    if (exists.length) return json({ error: "Un compte existe déjà avec cet email" }, 409);

    const passwordHash = await bcrypt.hash(password, 12);
    const rows = await sql`
      INSERT INTO marketplace_users (email, password_hash, nom, telephone, ville, est_vendeur)
      VALUES (${email}, ${passwordHash}, ${nom}, ${telephone}, ${ville}, ${estVendeur})
      RETURNING id, email, nom, est_vendeur
    `;
    const u = rows[0] as any;

    const token = await issueToken({
      sub: String(u.id), username: u.email, displayName: u.nom, org: ORG,
      role: u.est_vendeur ? "vendeur" : "acheteur",
    });
    return json({ token, user: { id: u.id, email: u.email, nom: u.nom, estVendeur: u.est_vendeur } }, 201);
  }

  return json({ error: "Action inconnue" }, 400);
};

export const config: Config = {
  path: "/api/marketplace-auth",
};
