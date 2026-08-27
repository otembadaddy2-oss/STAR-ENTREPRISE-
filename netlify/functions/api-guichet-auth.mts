// KINDIMBOU — Guichet unique de la République du Congo.
// Comptes citoyens (distincts des comptes staff `accounts`), avec dépôt
// sécurisé de la pièce d'identité (CNI, passeport ou carte de résident)
// dans Netlify Blobs — jamais exposée par une URL publique.
import type { Context, Config } from "@netlify/functions";
import bcrypt from "bcryptjs";
import { getStore } from "@netlify/blobs";
import { randomBytes } from "node:crypto";
import { ensureSchema, db, json } from "./_db.mts";
import { issueToken, requireAuth } from "./_auth.mts";

function clean(value: unknown, maxLen: number): string {
  return String(value ?? "").trim().slice(0, maxLen);
}

const TYPES_PIECE = new Set(["cni", "passeport", "carte_resident"]);
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MAX_FAILED_ATTEMPTS = 5;
const LOCKOUT_MINUTES = 15;

export default async (req: Request, _context: Context) => {
  await ensureSchema();
  const { sql } = db();

  if (req.method === "GET") {
    const session = await requireAuth(req);
    if (!session || session.org !== "guichet_unique") return json({ error: "Non authentifié" }, 401);
    const rows = await sql`
      SELECT id, email, nom, prenom, date_naissance, lieu_naissance, nationalite,
             telephone, type_piece, numero_piece, piece_blob_key, created_at
      FROM guichet_citoyens WHERE id = ${Number(session.sub)} LIMIT 1
    `;
    const c = rows[0] as any;
    if (!c) return json({ error: "Compte introuvable" }, 404);
    return json({
      citoyen: {
        id: c.id, email: c.email, nom: c.nom, prenom: c.prenom,
        dateNaissance: c.date_naissance, lieuNaissance: c.lieu_naissance,
        nationalite: c.nationalite, telephone: c.telephone,
        typePiece: c.type_piece, numeroPiece: c.numero_piece,
        pieceDeposee: !!c.piece_blob_key, createdAt: c.created_at,
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
      SELECT id, email, password_hash, nom, prenom, failed_attempts, locked_until
      FROM guichet_citoyens WHERE email = ${email} LIMIT 1
    `;
    const c = rows[0] as any;

    // Réponse générique (n'indique jamais si l'email existe) pour limiter
    // l'énumération de comptes, tout en appliquant un verrouillage réel.
    const genericError = () => json({ error: "Identifiants incorrects" }, 401);

    if (!c) return genericError();

    if (c.locked_until && new Date(c.locked_until).getTime() > Date.now()) {
      const minutes = Math.ceil((new Date(c.locked_until).getTime() - Date.now()) / 60000);
      return json(
        { error: `Trop de tentatives. Réessayez dans ${minutes} minute${minutes > 1 ? "s" : ""}.` },
        429
      );
    }

    const ok = await bcrypt.compare(password, c.password_hash);
    if (!ok) {
      const attempts = (c.failed_attempts || 0) + 1;
      if (attempts >= MAX_FAILED_ATTEMPTS) {
        await sql`
          UPDATE guichet_citoyens
          SET failed_attempts = 0, locked_until = now() + (${LOCKOUT_MINUTES} || ' minutes')::interval
          WHERE id = ${c.id}
        `;
        return json(
          { error: `Trop de tentatives. Compte verrouillé ${LOCKOUT_MINUTES} minutes par sécurité.` },
          429
        );
      }
      await sql`UPDATE guichet_citoyens SET failed_attempts = ${attempts} WHERE id = ${c.id}`;
      return genericError();
    }

    if (c.failed_attempts > 0 || c.locked_until) {
      await sql`UPDATE guichet_citoyens SET failed_attempts = 0, locked_until = NULL WHERE id = ${c.id}`;
    }

    const token = await issueToken({
      sub: String(c.id),
      username: c.email,
      displayName: `${c.prenom} ${c.nom}`,
      org: "guichet_unique",
      role: "citoyen",
    });
    return json({ token, citoyen: { id: c.id, email: c.email, nom: c.nom, prenom: c.prenom } });
  }

  if (action === "register") {
    const email = clean(body.email, 160).toLowerCase();
    const password = String(body.password ?? "");
    const nom = clean(body.nom, 100);
    const prenom = clean(body.prenom, 100);
    const dateNaissance = clean(body.dateNaissance, 20);
    const lieuNaissance = clean(body.lieuNaissance, 120);
    const nationalite = clean(body.nationalite, 80);
    const telephone = clean(body.telephone, 40);
    const typePiece = clean(body.typePiece, 20) || "cni";
    const numeroPiece = clean(body.numeroPiece, 60);
    const pieceBase64 = String(body.pieceBase64 ?? "");
    const pieceMime = clean(body.pieceMime, 100);

    if (!email || password.length < 8 || !nom || !prenom) {
      return json({ error: "Email, mot de passe (8+ caractères), nom et prénom sont requis" }, 400);
    }
    if (!EMAIL_RE.test(email)) {
      return json({ error: "Adresse email invalide" }, 400);
    }
    if (!TYPES_PIECE.has(typePiece)) {
      return json({ error: "Type de pièce invalide" }, 400);
    }

    const exists = await sql`SELECT id FROM guichet_citoyens WHERE email = ${email} LIMIT 1`;
    if (exists.length) return json({ error: "Un compte existe déjà avec cet email" }, 409);

    let blobKey = "";
    if (pieceBase64) {
      const raw = pieceBase64.includes(",") ? pieceBase64.split(",")[1] : pieceBase64;
      const bytes = Buffer.from(raw, "base64");
      if (bytes.byteLength > 8_000_000) {
        return json({ error: "Fichier trop volumineux (limite 8 Mo)" }, 400);
      }
      blobKey = `${Date.now()}-${randomBytes(4).toString("hex")}`;
      const store = getStore("guichet-pieces");
      await store.set(blobKey, bytes, { metadata: { mime: pieceMime, email } });
    }

    const passwordHash = await bcrypt.hash(password, 12);
    const rows = await sql`
      INSERT INTO guichet_citoyens
        (email, password_hash, nom, prenom, date_naissance, lieu_naissance, nationalite,
         telephone, type_piece, numero_piece, piece_blob_key, piece_type_mime)
      VALUES
        (${email}, ${passwordHash}, ${nom}, ${prenom}, ${dateNaissance}, ${lieuNaissance}, ${nationalite},
         ${telephone}, ${typePiece}, ${numeroPiece}, ${blobKey}, ${pieceMime})
      RETURNING id, email, nom, prenom
    `;
    const c = rows[0] as any;

    const token = await issueToken({
      sub: String(c.id),
      username: c.email,
      displayName: `${c.prenom} ${c.nom}`,
      org: "guichet_unique",
      role: "citoyen",
    });
    return json({ token, citoyen: { id: c.id, email: c.email, nom: c.nom, prenom: c.prenom } }, 201);
  }

  return json({ error: "Action inconnue" }, 400);
};

export const config: Config = {
  path: "/api/guichet-auth",
};
