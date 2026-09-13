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
    CREATE TABLE IF NOT EXISTS alpha_campaigns (
      id SERIAL PRIMARY KEY,
      nom TEXT NOT NULL,
      entreprise TEXT DEFAULT '',
      telephone TEXT NOT NULL,
      objectif TEXT DEFAULT '',
      message TEXT DEFAULT '',
      statut TEXT NOT NULL DEFAULT 'nouveau',
      created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
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
    CREATE TABLE IF NOT EXISTS guichet_citoyens (
      id SERIAL PRIMARY KEY,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      nom TEXT NOT NULL,
      prenom TEXT NOT NULL,
      date_naissance TEXT DEFAULT '',
      lieu_naissance TEXT DEFAULT '',
      nationalite TEXT DEFAULT '',
      telephone TEXT DEFAULT '',
      type_piece TEXT NOT NULL DEFAULT 'cni',
      numero_piece TEXT DEFAULT '',
      piece_blob_key TEXT DEFAULT '',
      piece_type_mime TEXT DEFAULT '',
      failed_attempts INTEGER NOT NULL DEFAULT 0,
      locked_until TIMESTAMPTZ,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now()
    )
  `;
  await sql`ALTER TABLE guichet_citoyens ADD COLUMN IF NOT EXISTS failed_attempts INTEGER NOT NULL DEFAULT 0`;
  await sql`ALTER TABLE guichet_citoyens ADD COLUMN IF NOT EXISTS locked_until TIMESTAMPTZ`;

  await sql`
    CREATE TABLE IF NOT EXISTS guichet_demandes (
      id SERIAL PRIMARY KEY,
      citoyen_id INTEGER NOT NULL REFERENCES guichet_citoyens(id) ON DELETE CASCADE,
      numero_dossier TEXT UNIQUE NOT NULL,
      service_code TEXT NOT NULL,
      service_label TEXT NOT NULL,
      statut TEXT NOT NULL DEFAULT 'recue',
      details TEXT DEFAULT '',
      piece_jointe_blob_key TEXT DEFAULT '',
      piece_jointe_nom TEXT DEFAULT '',
      created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
    )
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS alpha_vitrine (
      id SERIAL PRIMARY KEY,
      titre TEXT NOT NULL,
      client TEXT DEFAULT '',
      type_media TEXT NOT NULL DEFAULT 'image',
      type_mime TEXT DEFAULT '',
      blob_key TEXT NOT NULL,
      lien_externe TEXT DEFAULT '',
      actif BOOLEAN NOT NULL DEFAULT true,
      ordre INTEGER NOT NULL DEFAULT 0,
      created_by INTEGER REFERENCES accounts(id) ON DELETE SET NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now()
    )
  `;

  // STAR Marketplace — comptes vendeurs/acheteurs (distincts des comptes
  // staff `accounts`), annonces payantes à durée déterminée, et commandes
  // dont le paiement n'est validé que si le montant reçu correspond
  // exactement au montant attendu.
  await sql`
    CREATE TABLE IF NOT EXISTS marketplace_users (
      id SERIAL PRIMARY KEY,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      nom TEXT NOT NULL,
      telephone TEXT DEFAULT '',
      ville TEXT DEFAULT '',
      est_vendeur BOOLEAN NOT NULL DEFAULT false,
      failed_attempts INTEGER NOT NULL DEFAULT 0,
      locked_until TIMESTAMPTZ,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now()
    )
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS marketplace_listings (
      id SERIAL PRIMARY KEY,
      seller_id INTEGER NOT NULL REFERENCES marketplace_users(id) ON DELETE CASCADE,
      titre TEXT NOT NULL,
      description TEXT DEFAULT '',
      categorie TEXT DEFAULT 'autre',
      prix INTEGER NOT NULL,
      devise TEXT NOT NULL DEFAULT 'FCFA',
      photos TEXT DEFAULT '[]',
      ville TEXT DEFAULT '',
      duree_jours INTEGER NOT NULL DEFAULT 30,
      statut TEXT NOT NULL DEFAULT 'en_attente_paiement',
      expire_at TIMESTAMPTZ,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
    )
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS marketplace_listing_payments (
      id SERIAL PRIMARY KEY,
      listing_id INTEGER NOT NULL REFERENCES marketplace_listings(id) ON DELETE CASCADE,
      montant_attendu INTEGER NOT NULL,
      montant_recu INTEGER,
      devise TEXT NOT NULL DEFAULT 'FCFA',
      methode TEXT DEFAULT '',
      reference_transaction TEXT DEFAULT '',
      statut TEXT NOT NULL DEFAULT 'en_attente',
      created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      validated_at TIMESTAMPTZ
    )
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS marketplace_orders (
      id SERIAL PRIMARY KEY,
      listing_id INTEGER NOT NULL REFERENCES marketplace_listings(id) ON DELETE CASCADE,
      buyer_id INTEGER REFERENCES marketplace_users(id) ON DELETE SET NULL,
      acheteur_nom TEXT NOT NULL,
      acheteur_telephone TEXT NOT NULL,
      acheteur_email TEXT DEFAULT '',
      quantite INTEGER NOT NULL DEFAULT 1,
      montant_attendu INTEGER NOT NULL,
      montant_recu INTEGER,
      devise TEXT NOT NULL DEFAULT 'FCFA',
      methode_paiement TEXT DEFAULT '',
      reference_transaction TEXT DEFAULT '',
      statut TEXT NOT NULL DEFAULT 'en_attente_paiement',
      created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
    )
  `;

  // STAR VIBE — un compte par téléphone (protégé par un code PIN à 4
  // chiffres, comme un compte Mobile Money), qui peut porter plusieurs
  // profils : le profil personnel du titulaire, et un ou plusieurs profils
  // enfant (3-6 ans) créés et supervisés par ce même compte.
  await sql`
    CREATE TABLE IF NOT EXISTS starvibe_accounts (
      id SERIAL PRIMARY KEY,
      telephone TEXT UNIQUE NOT NULL,
      pin_hash TEXT NOT NULL,
      ville TEXT DEFAULT '',
      failed_attempts INTEGER NOT NULL DEFAULT 0,
      locked_until TIMESTAMPTZ,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now()
    )
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS starvibe_profiles (
      id SERIAL PRIMARY KEY,
      account_id INTEGER NOT NULL REFERENCES starvibe_accounts(id) ON DELETE CASCADE,
      nom TEXT NOT NULL,
      date_naissance TEXT NOT NULL,
      type_profil TEXT NOT NULL DEFAULT 'personnel',
      created_at TIMESTAMPTZ NOT NULL DEFAULT now()
    )
  `;

  // Vidéos du fil STAR VIBE — publiées uniquement depuis un profil
  // personnel (les profils enfant/PIOUPIOU restent hors du fil principal
  // en attendant leur espace dédié). Fichier stocké dans Netlify Blobs,
  // seule la clé est gardée en base. Une vidéo marquée "pour_enfants"
  // n'apparaît dans l'espace PIOUPIOU qu'après validation d'un compte
  // staff STAR ENTREPRISE (moderation_statut = 'approuve') — c'est le
  // vrai filtre de sécurité de l'espace enfants.
  await sql`
    CREATE TABLE IF NOT EXISTS starvibe_videos (
      id SERIAL PRIMARY KEY,
      account_id INTEGER NOT NULL REFERENCES starvibe_accounts(id) ON DELETE CASCADE,
      profile_id INTEGER NOT NULL REFERENCES starvibe_profiles(id) ON DELETE CASCADE,
      legende TEXT DEFAULT '',
      type_mime TEXT NOT NULL,
      blob_key TEXT NOT NULL,
      likes_count INTEGER NOT NULL DEFAULT 0,
      vues_count INTEGER NOT NULL DEFAULT 0,
      pour_enfants BOOLEAN NOT NULL DEFAULT false,
      moderation_statut TEXT NOT NULL DEFAULT 'approuve',
      created_at TIMESTAMPTZ NOT NULL DEFAULT now()
    )
  `;
  await sql`ALTER TABLE starvibe_videos ADD COLUMN IF NOT EXISTS pour_enfants BOOLEAN NOT NULL DEFAULT false`;
  await sql`ALTER TABLE starvibe_videos ADD COLUMN IF NOT EXISTS moderation_statut TEXT NOT NULL DEFAULT 'approuve'`;

  await sql`
    CREATE TABLE IF NOT EXISTS starvibe_likes (
      id SERIAL PRIMARY KEY,
      video_id INTEGER NOT NULL REFERENCES starvibe_videos(id) ON DELETE CASCADE,
      account_id INTEGER NOT NULL REFERENCES starvibe_accounts(id) ON DELETE CASCADE,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      UNIQUE(video_id, account_id)
    )
  `;

  // Abonnements KOMYO — un compte peut passer par plusieurs lignes au fil du
  // temps (historique) ; la ligne la plus récente fait foi pour le plan
  // actif. Même règle que les paiements Marketplace : un paiement n'est
  // validé QUE si montant_recu correspond EXACTEMENT à montant_attendu.
  // Tant qu'aucun webhook Mobile Money réel n'est branché, la confirmation
  // se fait manuellement par un compte staff STAR ENTREPRISE (voir
  // api-starvibe-subscription.mts, action "confirmer_paiement").
  await sql`
    CREATE TABLE IF NOT EXISTS starvibe_subscriptions (
      id SERIAL PRIMARY KEY,
      account_id INTEGER NOT NULL REFERENCES starvibe_accounts(id) ON DELETE CASCADE,
      plan TEXT NOT NULL DEFAULT 'gratuit',
      montant_attendu INTEGER NOT NULL DEFAULT 0,
      montant_recu INTEGER,
      methode TEXT DEFAULT '',
      reference_transaction TEXT DEFAULT '',
      statut TEXT NOT NULL DEFAULT 'actif',
      started_at TIMESTAMPTZ,
      expires_at TIMESTAMPTZ,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
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
