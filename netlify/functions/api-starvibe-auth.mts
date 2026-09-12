// STAR VIBE — comptes réels (téléphone + code PIN à 4 chiffres, comme un
// compte Mobile Money). Un compte peut porter plusieurs profils : le
// profil personnel du titulaire, et des profils enfant (3-6 ans) qu'il
// supervise. Mêmes protections que les autres comptes du groupe :
// verrouillage après tentatives échouées, réponse générique en cas
// d'échec de connexion, code PIN toujours haché (jamais stocké en clair).
import type { Context, Config } from "@netlify/functions";
import bcrypt from "bcryptjs";
import { ensureSchema, db, json } from "./_db.mts";
import { issueToken, requireAuth } from "./_auth.mts";

function clean(value: unknown, maxLen: number): string {
  return String(value ?? "").trim().slice(0, maxLen);
}

const PIN_RE = /^\d{4}$/;
const MAX_FAILED_ATTEMPTS = 5;
const LOCKOUT_MINUTES = 15;
const ORG = "star_vibe";

function ageFromDate(dateStr: string): number | null {
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return null;
  if (d.getTime() > Date.now()) return null;
  const now = new Date();
  let age = now.getFullYear() - d.getFullYear();
  const m = now.getMonth() - d.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < d.getDate())) age--;
  return age;
}

export default async (req: Request, _context: Context) => {
  await ensureSchema();
  const { sql } = db();

  if (req.method === "GET") {
    const session = await requireAuth(req);
    if (!session || session.org !== ORG) return json({ error: "Non authentifié" }, 401);
    const accountId = Number(session.sub);
    const accRows = await sql`
      SELECT id, telephone, ville, created_at FROM starvibe_accounts WHERE id = ${accountId} LIMIT 1
    `;
    const account = accRows[0] as any;
    if (!account) return json({ error: "Compte introuvable" }, 404);
    const profiles = await sql`
      SELECT id, nom, date_naissance, type_profil, created_at
      FROM starvibe_profiles WHERE account_id = ${accountId} ORDER BY id ASC
    `;
    return json({
      account: { id: account.id, telephone: account.telephone, ville: account.ville, createdAt: account.created_at },
      profiles,
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
    const telephone = clean(body.telephone, 40).replace(/[^\d+]/g, "");
    const pin = String(body.pin ?? "");
    if (!telephone || !pin) return json({ error: "Numéro de téléphone ou code PIN manquant" }, 400);

    const rows = await sql`
      SELECT id, telephone, pin_hash, ville, failed_attempts, locked_until
      FROM starvibe_accounts WHERE telephone = ${telephone} LIMIT 1
    `;
    const acc = rows[0] as any;
    const genericError = () => json({ error: "Numéro ou code PIN incorrect" }, 401);
    if (!acc) return genericError();

    if (acc.locked_until && new Date(acc.locked_until).getTime() > Date.now()) {
      const minutes = Math.ceil((new Date(acc.locked_until).getTime() - Date.now()) / 60000);
      return json(
        { error: `Trop de tentatives. Réessayez dans ${minutes} minute${minutes > 1 ? "s" : ""}.` },
        429
      );
    }

    const ok = await bcrypt.compare(pin, acc.pin_hash);
    if (!ok) {
      const attempts = (acc.failed_attempts || 0) + 1;
      if (attempts >= MAX_FAILED_ATTEMPTS) {
        await sql`
          UPDATE starvibe_accounts
          SET failed_attempts = 0, locked_until = now() + (${LOCKOUT_MINUTES} || ' minutes')::interval
          WHERE id = ${acc.id}
        `;
        return json(
          { error: `Trop de tentatives. Compte verrouillé ${LOCKOUT_MINUTES} minutes par sécurité.` },
          429
        );
      }
      await sql`UPDATE starvibe_accounts SET failed_attempts = ${attempts} WHERE id = ${acc.id}`;
      return genericError();
    }

    if (acc.failed_attempts > 0 || acc.locked_until) {
      await sql`UPDATE starvibe_accounts SET failed_attempts = 0, locked_until = NULL WHERE id = ${acc.id}`;
    }

    const profiles = await sql`
      SELECT id, nom, date_naissance, type_profil FROM starvibe_profiles
      WHERE account_id = ${acc.id} ORDER BY id ASC
    `;
    const token = await issueToken({
      sub: String(acc.id), username: acc.telephone, displayName: (profiles[0] as any)?.nom || acc.telephone,
      org: ORG, role: "titulaire",
    });
    return json({ token, account: { id: acc.id, telephone: acc.telephone, ville: acc.ville }, profiles });
  }

  if (action === "register") {
    const telephone = clean(body.telephone, 40).replace(/[^\d+]/g, "");
    const pin = String(body.pin ?? "");
    const nom = clean(body.nom, 120);
    const dateNaissance = clean(body.dateNaissance, 20);
    const ville = clean(body.ville, 80);
    const typeProfil = clean(body.typeProfil, 20) === "enfant" ? "enfant" : "personnel";

    if (telephone.replace(/\D/g, "").length < 8) {
      return json({ error: "Numéro de téléphone invalide" }, 400);
    }
    if (!PIN_RE.test(pin)) return json({ error: "Le code PIN doit contenir exactement 4 chiffres" }, 400);
    if (!nom) return json({ error: "Le nom est requis" }, 400);
    if (!dateNaissance) return json({ error: "La date de naissance est requise" }, 400);

    const age = ageFromDate(dateNaissance);
    if (age === null) return json({ error: "Date de naissance invalide" }, 400);
    if (typeProfil === "enfant") {
      if (age < 3 || age > 6) return json({ error: "L'espace enfants est réservé aux 3-6 ans" }, 400);
    } else {
      if (age < 13) return json({ error: "STAR VIBE est réservé aux 13 ans et plus (sauf profil enfant 3-6 ans)" }, 400);
    }

    const exists = await sql`SELECT id FROM starvibe_accounts WHERE telephone = ${telephone} LIMIT 1`;
    if (exists.length) {
      return json({ error: "Un compte existe déjà avec ce numéro — connecte-toi plutôt" }, 409);
    }

    const pinHash = await bcrypt.hash(pin, 12);
    const accRows = await sql`
      INSERT INTO starvibe_accounts (telephone, pin_hash, ville)
      VALUES (${telephone}, ${pinHash}, ${ville})
      RETURNING id, telephone, ville
    `;
    const acc = accRows[0] as any;

    const profRows = await sql`
      INSERT INTO starvibe_profiles (account_id, nom, date_naissance, type_profil)
      VALUES (${acc.id}, ${nom}, ${dateNaissance}, ${typeProfil})
      RETURNING id, nom, date_naissance, type_profil
    `;
    const profile = profRows[0] as any;

    const token = await issueToken({
      sub: String(acc.id), username: acc.telephone, displayName: nom, org: ORG, role: "titulaire",
    });
    return json(
      { token, account: { id: acc.id, telephone: acc.telephone, ville: acc.ville }, profiles: [profile] },
      201
    );
  }

  if (action === "add-profile") {
    const session = await requireAuth(req);
    if (!session || session.org !== ORG) return json({ error: "Non authentifié" }, 401);

    const nom = clean(body.nom, 120);
    const dateNaissance = clean(body.dateNaissance, 20);
    const typeProfil = clean(body.typeProfil, 20) === "enfant" ? "enfant" : "personnel";

    if (!nom || !dateNaissance) return json({ error: "Nom et date de naissance requis" }, 400);
    const age = ageFromDate(dateNaissance);
    if (age === null) return json({ error: "Date de naissance invalide" }, 400);
    if (typeProfil === "enfant" && (age < 3 || age > 6)) {
      return json({ error: "L'espace enfants est réservé aux 3-6 ans" }, 400);
    }

    const rows = await sql`
      INSERT INTO starvibe_profiles (account_id, nom, date_naissance, type_profil)
      VALUES (${Number(session.sub)}, ${nom}, ${dateNaissance}, ${typeProfil})
      RETURNING id, nom, date_naissance, type_profil
    `;
    return json({ profile: rows[0] }, 201);
  }

  return json({ error: "Action inconnue" }, 400);
};

export const config: Config = {
  path: "/api/starvibe-auth",
};
