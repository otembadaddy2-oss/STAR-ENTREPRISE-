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
  // Photo de profil KOMYO (profils personnels uniquement — jamais pour un
  // profil enfant PIOUPIOU). Fichier dans Netlify Blobs "starvibe-photos",
  // seule la clé est gardée ici. Affichée dans la bulle flottante, les
  // notifications et les commentaires.
  await sql`ALTER TABLE starvibe_profiles ADD COLUMN IF NOT EXISTS photo_key TEXT`;

  // Dernière ouverture de la liste des notifications KOMYO (bulle flottante) :
  // tout ce qui est arrivé après est "non lu". Fermer la bulle ne touche pas
  // à cette date — les notifications restent là, seule la bulle disparaît.
  await sql`ALTER TABLE starvibe_accounts ADD COLUMN IF NOT EXISTS notifs_vues_at TIMESTAMPTZ`;
  // Clients de Keydou sans compte KOMYO : un compte "invité" est créé à la volée (nom, téléphone déclarés).
  await sql`ALTER TABLE starvibe_accounts ADD COLUMN IF NOT EXISTS pays TEXT NOT NULL DEFAULT ''`;
  await sql`ALTER TABLE starvibe_accounts ADD COLUMN IF NOT EXISTS guest BOOLEAN NOT NULL DEFAULT false`;
  await sql`ALTER TABLE starvibe_accounts ADD COLUMN IF NOT EXISTS guest_nom TEXT NOT NULL DEFAULT ''`;
  await sql`ALTER TABLE starvibe_accounts ADD COLUMN IF NOT EXISTS guest_tel TEXT NOT NULL DEFAULT ''`;
  await sql`ALTER TABLE starvibe_accounts ADD COLUMN IF NOT EXISTS guest_ip TEXT NOT NULL DEFAULT ''`;

  await sql`ALTER TABLE starvibe_videos ADD COLUMN IF NOT EXISTS pour_enfants BOOLEAN NOT NULL DEFAULT false`;
  await sql`ALTER TABLE starvibe_videos ADD COLUMN IF NOT EXISTS moderation_statut TEXT NOT NULL DEFAULT 'approuve'`;
  await sql`ALTER TABLE starvibe_videos ADD COLUMN IF NOT EXISTS premium BOOLEAN NOT NULL DEFAULT false`;
  // espace de la vidéo : general (fil principal), talents, business ou decouverte (PIOUPIOU reste marqué par pour_enfants)
  await sql`ALTER TABLE starvibe_videos ADD COLUMN IF NOT EXISTS espace TEXT NOT NULL DEFAULT 'general'`;

  // Keydou, assistant multiservices : une demande = un service payant (1 000 FCFA).
  await sql`
    CREATE TABLE IF NOT EXISTS starvibe_keydou_requests (
      id SERIAL PRIMARY KEY,
      account_id INTEGER NOT NULL REFERENCES starvibe_accounts(id) ON DELETE CASCADE,
      service TEXT NOT NULL,
      demande_vocale TEXT NOT NULL DEFAULT '',
      montant_attendu INTEGER NOT NULL DEFAULT 1000,
      montant_recu INTEGER,
      reference_transaction TEXT NOT NULL DEFAULT '',
      paiement_declare_at TIMESTAMPTZ,
      statut TEXT NOT NULL DEFAULT 'en_attente_paiement',
      details JSONB NOT NULL DEFAULT '{}'::jsonb,
      traite BOOLEAN NOT NULL DEFAULT false,
      paid_at TIMESTAMPTZ,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
    )
  `;
  await sql`ALTER TABLE starvibe_keydou_requests ADD COLUMN IF NOT EXISTS ville TEXT NOT NULL DEFAULT ''`;
  // Mémoire de Keydou : l'annuaire des lieux (modifiable par le staff).
  await sql`
    CREATE TABLE IF NOT EXISTS starvibe_keydou_lieux (
      id SERIAL PRIMARY KEY,
      service TEXT NOT NULL,
      ville TEXT NOT NULL,
      nom TEXT NOT NULL,
      adresse TEXT NOT NULL DEFAULT '',
      telephone TEXT NOT NULL DEFAULT '',
      whatsapp TEXT NOT NULL DEFAULT '',
      description TEXT NOT NULL DEFAULT '',
      source_url TEXT NOT NULL DEFAULT '',
      source_note TEXT NOT NULL DEFAULT '',
      verifie BOOLEAN NOT NULL DEFAULT false,
      actif BOOLEAN NOT NULL DEFAULT true,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
    )
  `;
  // Journal de tous les contacts avec Keydou (affiché en direct côté staff, exportable en Excel).
  await sql`
    CREATE TABLE IF NOT EXISTS starvibe_keydou_events (
      id SERIAL PRIMARY KEY,
      account_id INTEGER NOT NULL REFERENCES starvibe_accounts(id) ON DELETE CASCADE,
      type TEXT NOT NULL,
      texte TEXT NOT NULL DEFAULT '',
      service TEXT NOT NULL DEFAULT '',
      ville TEXT NOT NULL DEFAULT '',
      request_id INTEGER,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now()
    )
  `;
  await sql`CREATE INDEX IF NOT EXISTS idx_keydou_events_created ON starvibe_keydou_events (created_at DESC)`;
  await sql`ALTER TABLE starvibe_keydou_requests ADD COLUMN IF NOT EXISTS numero_paiement TEXT NOT NULL DEFAULT ''`;
  // Notifications "Valider le dépôt ? Oui / Non" sur le téléphone du staff (Web Push).
  await sql`
    CREATE TABLE IF NOT EXISTS starvibe_push_subs (
      id SERIAL PRIMARY KEY,
      endpoint TEXT UNIQUE NOT NULL,
      p256dh TEXT NOT NULL,
      auth TEXT NOT NULL,
      label TEXT NOT NULL DEFAULT '',
      created_at TIMESTAMPTZ NOT NULL DEFAULT now()
    )
  `;
  // Journal des SMS de dépôt transférés depuis le téléphone de réception (reconnaissance automatique).
  await sql`
    CREATE TABLE IF NOT EXISTS starvibe_sms_log (
      id SERIAL PRIMARY KEY,
      expediteur TEXT NOT NULL DEFAULT '',
      message TEXT NOT NULL DEFAULT '',
      montant INTEGER,
      numero TEXT NOT NULL DEFAULT '',
      resultat TEXT NOT NULL DEFAULT '',
      created_at TIMESTAMPTZ NOT NULL DEFAULT now()
    )
  `;
  await sql`
    CREATE TABLE IF NOT EXISTS starvibe_settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL DEFAULT ''
    )
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS starvibe_likes (
      id SERIAL PRIMARY KEY,
      video_id INTEGER NOT NULL REFERENCES starvibe_videos(id) ON DELETE CASCADE,
      account_id INTEGER NOT NULL REFERENCES starvibe_accounts(id) ON DELETE CASCADE,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      UNIQUE(video_id, account_id)
    )
  `;

  await sql`ALTER TABLE starvibe_videos ADD COLUMN IF NOT EXISTS comments_count INTEGER NOT NULL DEFAULT 0`;

  await sql`
    CREATE TABLE IF NOT EXISTS starvibe_comments (
      id SERIAL PRIMARY KEY,
      video_id INTEGER NOT NULL REFERENCES starvibe_videos(id) ON DELETE CASCADE,
      account_id INTEGER NOT NULL REFERENCES starvibe_accounts(id) ON DELETE CASCADE,
      profile_id INTEGER NOT NULL REFERENCES starvibe_profiles(id) ON DELETE CASCADE,
      texte TEXT NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now()
    )
  `;

  // Réponses aux commentaires (un seul niveau : une réponse à une réponse se range sous le commentaire d'origine)
  await sql`ALTER TABLE starvibe_comments ADD COLUMN IF NOT EXISTS parent_id INTEGER REFERENCES starvibe_comments(id) ON DELETE CASCADE`;

  // Statistiques de visionnage réelles (durée + % regardé), pour donner aux
  // créateurs KOMYO une vraie analyse — pas qu'un compteur qui monte comme
  // sur la plupart des apps vidéo grand public.
  await sql`
    CREATE TABLE IF NOT EXISTS starvibe_view_sessions (
      id SERIAL PRIMARY KEY,
      video_id INTEGER NOT NULL REFERENCES starvibe_videos(id) ON DELETE CASCADE,
      account_id INTEGER NOT NULL REFERENCES starvibe_accounts(id) ON DELETE CASCADE,
      watch_seconds INTEGER NOT NULL DEFAULT 0,
      percent_watched INTEGER NOT NULL DEFAULT 0,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now()
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

  // Rappels d'échéance : un message 3 jours avant la fin, un autre à la fin (une seule fois chacun)
  await sql`ALTER TABLE starvibe_subscriptions ADD COLUMN IF NOT EXISTS rappel_j3_at TIMESTAMPTZ`;
  await sql`ALTER TABLE starvibe_subscriptions ADD COLUMN IF NOT EXISTS rappel_fin_at TIMESTAMPTZ`;

  // Installations de l'application KOMYO (suivi des abonnés, en direct dans le backend).
  // Une ligne par appareil : install_id est tiré au hasard par l'appareil lui-même.
  // Aucun identifiant publicitaire ni adresse IP en clair : seulement un hachage de l'IP
  // pour freiner les envois en masse. Le nom et le numéro ne sont renseignés que si la
  // personne est connectée à KOMYO ou a écrit ses coordonnées à Keydou.
  await sql`
    CREATE TABLE IF NOT EXISTS starvibe_installs (
      id SERIAL PRIMARY KEY,
      install_id TEXT UNIQUE NOT NULL,
      source TEXT NOT NULL DEFAULT '',
      platform TEXT NOT NULL DEFAULT '',
      navigateur TEXT NOT NULL DEFAULT '',
      account_id INTEGER,
      invite BOOLEAN NOT NULL DEFAULT false,
      nom TEXT NOT NULL DEFAULT '',
      telephone TEXT NOT NULL DEFAULT '',
      ville TEXT NOT NULL DEFAULT '',
      launches INTEGER NOT NULL DEFAULT 0,
      ip_hash TEXT NOT NULL DEFAULT '',
      installed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      last_seen TIMESTAMPTZ NOT NULL DEFAULT now()
    )
  `;

  // Accès du staff par mot de passe seul : compteurs anti-essais (par connexion Internet et global),
  // et codes de réinitialisation à usage unique (stockés hachés, valables 10 minutes).
  await sql`
    CREATE TABLE IF NOT EXISTS staff_login_guard (
      key TEXT PRIMARY KEY,
      fails INTEGER NOT NULL DEFAULT 0,
      window_start TIMESTAMPTZ NOT NULL DEFAULT now(),
      locked_until TIMESTAMPTZ
    )
  `;
  await sql`
    CREATE TABLE IF NOT EXISTS staff_reset_codes (
      id SERIAL PRIMARY KEY,
      account_id INTEGER NOT NULL,
      code_hash TEXT NOT NULL,
      tries INTEGER NOT NULL DEFAULT 0,
      used BOOLEAN NOT NULL DEFAULT false,
      expires_at TIMESTAMPTZ NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now()
    )
  `;

  // Code PIN oublié par un membre KOMYO : le membre fait une demande, le staff vérifie son identité puis
  // génère un code temporaire (haché, 24 h, 5 essais) qu'il lui envoie par WhatsApp.
  await sql`
    CREATE TABLE IF NOT EXISTS starvibe_pin_resets (
      id SERIAL PRIMARY KEY,
      account_id INTEGER NOT NULL,
      telephone TEXT NOT NULL DEFAULT '',
      nom_indique TEXT NOT NULL DEFAULT '',
      statut TEXT NOT NULL DEFAULT 'en_attente',
      code_hash TEXT NOT NULL DEFAULT '',
      code_expire TIMESTAMPTZ,
      tries INTEGER NOT NULL DEFAULT 0,
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

  // MYO : invitations d'amitié (suivre + devenir ami). Une ligne par invitation ; statut : en_attente, acceptee, refusee.
  await sql`
    CREATE TABLE IF NOT EXISTS starvibe_myo (
      id SERIAL PRIMARY KEY,
      de_account INTEGER NOT NULL REFERENCES starvibe_accounts(id) ON DELETE CASCADE,
      vers_account INTEGER NOT NULL REFERENCES starvibe_accounts(id) ON DELETE CASCADE,
      statut TEXT NOT NULL DEFAULT 'en_attente',
      created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      repondu_at TIMESTAMPTZ,
      UNIQUE (de_account, vers_account)
    )
  `;
  await sql`CREATE INDEX IF NOT EXISTS starvibe_myo_vers_idx ON starvibe_myo (vers_account, statut)`;

  // KABA+ : partage de contact (Gmail ou WhatsApp) entre amis Myo adultes, uniquement avec l'accord de la personne
  await sql`ALTER TABLE starvibe_accounts ADD COLUMN IF NOT EXISTS contact_gmail TEXT NOT NULL DEFAULT ''`;
  await sql`
    CREATE TABLE IF NOT EXISTS starvibe_kaba (
      id SERIAL PRIMARY KEY,
      de_account INTEGER NOT NULL REFERENCES starvibe_accounts(id) ON DELETE CASCADE,
      vers_account INTEGER NOT NULL REFERENCES starvibe_accounts(id) ON DELETE CASCADE,
      type TEXT NOT NULL,
      statut TEXT NOT NULL DEFAULT 'en_attente',
      valeur TEXT NOT NULL DEFAULT '',
      created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      repondu_at TIMESTAMPTZ,
      vu_at TIMESTAMPTZ
    )
  `;
  await sql`CREATE INDEX IF NOT EXISTS starvibe_kaba_vers_idx ON starvibe_kaba (vers_account, statut)`;

  // REGARDER ENSEMBLE : un ami Myo t'invite à regarder la même vidéo. Oui = la vidéo s'ouvre chez toi ; Non = rien ne se passe.
  await sql`
    CREATE TABLE IF NOT EXISTS starvibe_regarder (
      id SERIAL PRIMARY KEY,
      de_account INTEGER NOT NULL REFERENCES starvibe_accounts(id) ON DELETE CASCADE,
      vers_account INTEGER NOT NULL REFERENCES starvibe_accounts(id) ON DELETE CASCADE,
      video_id INTEGER NOT NULL REFERENCES starvibe_videos(id) ON DELETE CASCADE,
      statut TEXT NOT NULL DEFAULT 'en_attente',
      created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      repondu_at TIMESTAMPTZ
    )
  `;
  await sql`CREATE INDEX IF NOT EXISTS starvibe_regarder_vers_idx ON starvibe_regarder (vers_account, statut)`;

  // ANNONCES : message qui défile chez tous les abonnés pendant une durée payée (2 semaines ou 1 mois)
  await sql`
    CREATE TABLE IF NOT EXISTS starvibe_pub (
      id SERIAL PRIMARY KEY,
      account_id INTEGER NOT NULL REFERENCES starvibe_accounts(id) ON DELETE CASCADE,
      texte TEXT NOT NULL,
      lien TEXT NOT NULL DEFAULT '',
      categorie TEXT NOT NULL DEFAULT 'autre',
      plan TEXT NOT NULL,
      jours INTEGER NOT NULL,
      montant_attendu INTEGER NOT NULL,
      montant_recu INTEGER,
      reference_transaction TEXT NOT NULL DEFAULT '',
      statut TEXT NOT NULL DEFAULT 'en_attente_paiement',
      refus_motif TEXT NOT NULL DEFAULT '',
      started_at TIMESTAMPTZ,
      expires_at TIMESTAMPTZ,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now()
    )
  `;

  // ÉCLAT (le direct de KOMYO) : liste d'attente en attendant le vrai direct
  await sql`
    CREATE TABLE IF NOT EXISTS starvibe_eclat_attente (
      account_id INTEGER PRIMARY KEY REFERENCES starvibe_accounts(id) ON DELETE CASCADE,
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
