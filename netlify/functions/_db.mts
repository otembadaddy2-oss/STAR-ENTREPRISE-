// Shared database helpers for the STAR ENTREPRISE group backend.
// One Postgres database (Netlify DB / Neon) shared across STAR ENTREPRISE
// and its filiales: SOS-DOC, La Maison de la Drépanocytose, Pili-Pili Events,
// S.O — Gestion des membres.
import { getDatabase } from "@netlify/database";

let initialized = false;

export function db() {
  return getDatabase();
}

// Idempotent schema setup — safe to call on every cold start.
export async function ensureSchema() {
  if (initialized) return;
  const { sql } = db();

  await sql`
    CREATE TABLE IF NOT EXISTS accounts (
      id SERIAL PRIMARY KEY,
      username TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      display_name TEXT NOT NULL,
      org TEXT NOT NULL DEFAULT 'star_entreprise',
      role TEXT NOT NULL DEFAULT 'admin',
      created_at TIMESTAMPTZ NOT NULL DEFAULT now()
    )
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS members (
      id SERIAL PRIMARY KEY,
      nom TEXT NOT NULL,
      prenom TEXT NOT NULL,
      adresse TEXT DEFAULT '',
      email TEXT DEFAULT '',
      date_naissance TEXT DEFAULT '',
      lieu_naissance TEXT DEFAULT '',
      ville TEXT DEFAULT '',
      pays TEXT DEFAULT '',
      fonction TEXT DEFAULT '',
      cv TEXT DEFAULT '',
      photo TEXT DEFAULT '',
      date_enregistrement TEXT NOT NULL,
      created_by INTEGER REFERENCES accounts(id) ON DELETE SET NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
    )
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS drepano_beneficiaires (
      id SERIAL PRIMARY KEY,
      nom TEXT NOT NULL,
      prenom TEXT NOT NULL,
      type TEXT NOT NULL DEFAULT 'famille',
      telephone TEXT DEFAULT '',
      ville TEXT DEFAULT '',
      notes TEXT DEFAULT '',
      date_enregistrement TEXT NOT NULL,
      created_by INTEGER REFERENCES accounts(id) ON DELETE SET NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
    )
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS pilipili_evenements (
      id SERIAL PRIMARY KEY,
      titre TEXT NOT NULL,
      date_event TEXT DEFAULT '',
      lieu TEXT DEFAULT '',
      description TEXT DEFAULT '',
      created_by INTEGER REFERENCES accounts(id) ON DELETE SET NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
    )
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS pilipili_inscriptions (
      id SERIAL PRIMARY KEY,
      evenement_id INTEGER NOT NULL REFERENCES pilipili_evenements(id) ON DELETE CASCADE,
      nom TEXT NOT NULL,
      prenom TEXT NOT NULL,
      telephone TEXT DEFAULT '',
      email TEXT DEFAULT '',
      date_inscription TEXT NOT NULL,
      created_by INTEGER REFERENCES accounts(id) ON DELETE SET NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now()
    )
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS leads (
      id SERIAL PRIMARY KEY,
      type TEXT NOT NULL DEFAULT 'contact',
      nom TEXT DEFAULT '',
      entreprise TEXT DEFAULT '',
      email TEXT DEFAULT '',
      telephone TEXT DEFAULT '',
      service TEXT DEFAULT '',
      message TEXT DEFAULT '',
      statut TEXT NOT NULL DEFAULT 'nouveau',
      created_at TIMESTAMPTZ NOT NULL DEFAULT now()
    )
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS jardis_documents (
      id SERIAL PRIMARY KEY,
      nom TEXT NOT NULL,
      dossier TEXT NOT NULL DEFAULT 'STAR ENTREPRISE',
      type_mime TEXT DEFAULT '',
      taille INTEGER DEFAULT 0,
      contenu_texte TEXT DEFAULT '',
      blob_key TEXT NOT NULL,
      tags TEXT DEFAULT '',
      created_by INTEGER REFERENCES accounts(id) ON DELETE SET NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now()
    )
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS jardis_log (
      id SERIAL PRIMARY KEY,
      action TEXT NOT NULL,
      detail TEXT DEFAULT '',
      doc_id INTEGER REFERENCES jardis_documents(id) ON DELETE SET NULL,
      created_by INTEGER REFERENCES accounts(id) ON DELETE SET NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now()
    )
  `;

  initialized = true;
}

export function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "content-type": "application/json" },
  });
}
