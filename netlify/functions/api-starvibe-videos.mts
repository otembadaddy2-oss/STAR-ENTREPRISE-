// STAR VIBE — vrai fil vidéo, + espace enfants PIOUPIOU séparé et modéré.
//
// Publication réservée aux profils personnels (un profil enfant/PIOUPIOU
// ne peut ni publier ni voir le fil principal). Une vidéo marquée
// "pour_enfants" par son créateur n'apparaît dans l'espace PIOUPIOU
// qu'après validation par un compte staff STAR ENTREPRISE — c'est le
// vrai filtre de sécurité de l'espace enfants, pas une case décorative.
//
// Fichier vidéo stocké dans Netlify Blobs ; seule la clé est gardée en
// base (même schéma que la vitrine ALPHA).
import type { Context, Config } from "@netlify/functions";
import { getStore } from "@netlify/blobs";
import { randomBytes } from "node:crypto";
import { ensureSchema, db, json } from "./_db.mts";
import { requireAuth } from "./_auth.mts";
import { signedVideoUrl, hasActiveFamille } from "./_premium.mts";

const ORG = "star_vibe";
const STAFF_ORG = "star_entreprise";
const MAX_VIDEO_BYTES = 40_000_000; // 40 Mo — court format vertical
// Une fonction Netlify n'accepte pas plus de ~6 Mo par requête : la vidéo arrive donc en morceaux de 3 Mo,
// puis la publication les rassemble (14 morceaux de 3 Mo ≥ 40 Mo).
const CHUNK_MAX = 4_500_000;
const ESPACES_OUVERTS = ["talents", "business", "decouverte", "musique", "jeunes"];

// KOMYO Jeunes : réservé aux 13-17 ans (âge de la date de naissance du profil personnel).
// Les adultes ne le voient pas et n'y publient pas ; les mineurs ne publient pas dans Business (18 ans et +).
function ageFromDate(dateStr: string): number | null {
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime()) || d.getTime() > Date.now()) return null;
  const now = new Date();
  let age = now.getFullYear() - d.getFullYear();
  const m = now.getMonth() - d.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < d.getDate())) age--;
  return age;
}
const estJeune = (age: number | null) => age !== null && age >= 13 && age <= 17;
const MAX_CHUNKS = 14;
const UPLOAD_ID_RE = /^[a-z0-9]{10,24}$/;

function clean(value: unknown, maxLen: number): string {
  return String(value ?? "").trim().slice(0, maxLen);
}

interface VideoRow {
  id: number;
  account_id: number;
  profile_id: number;
  legende: string;
  type_mime: string;
  blob_key: string;
  likes_count: number;
  vues_count: number;
  comments_count: number;
  pour_enfants: boolean;
  espace?: string;
  moderation_statut: string;
  premium: boolean;
  disponible_le?: string | null;
  affiche_key?: string | null;
  created_at: string;
  auteur_nom?: string;
  telephone?: string;
}

// Une vidéo premium n'expose son lien (signé) qu'aux abonnés Famille actifs ;
// pour les autres, "verrouille" est vrai et aucun lien n'est donné.
function toApi(row: VideoRow, likedByMe: boolean, canWatchPremium = false, viewerAccountId = 0) {
  // Fermée tant que : (1) le parent n'a pas d'abonnement Famille actif, ou (2) la date d'ouverture n'est pas arrivée.
  // Décidé ici, côté serveur : une vidéo fermée n'a ni lien de lecture ni moyen d'être lue ou sautée.
  const pasEncore = Boolean(row.premium && row.disponible_le && new Date(row.disponible_le).getTime() > Date.now());
  const locked = row.premium && (!canWatchPremium || pasEncore);
  return {
    id: String(row.id),
    legende: row.legende,
    auteur: row.auteur_nom || "",
    likes: row.likes_count,
    vues: row.vues_count,
    commentaires: row.comments_count || 0,
    pourEnfants: row.pour_enfants,
    espace: row.espace || "general",
    auteurProfilId: row.profile_id,
    moderationStatut: row.moderation_statut,
    createdAt: row.created_at,
    likedByMe,
    estMoi: viewerAccountId > 0 && row.account_id === viewerAccountId,   // c'est ma vidéo : je peux la supprimer
    premium: row.premium,
    verrouille: locked,
    ouvert: row.premium ? !locked : true,
    raisonFermee: !locked ? "" : (!canWatchPremium ? "abonnement" : "date"),
    disponibleLe: row.premium ? (row.disponible_le || null) : null,
    afficheUrl: row.affiche_key ? `/api/starvibe-photo?key=${encodeURIComponent(row.affiche_key)}` : null,
    videoUrl: locked
      ? null
      : row.premium
        ? signedVideoUrl(row.blob_key)
        : `/api/starvibe-video-file?key=${encodeURIComponent(row.blob_key)}`,
  };
}

// Initiales d'un nom, pour l'avatar rond affiché dans les notifications
// d'activité — même logique que côté client (fil.html), gardée en
// cohérence ici pour l'éventuelle réutilisation serveur.
function initials(nom: string): string {
  const parts = String(nom || "").trim().split(/\s+/);
  const a = parts[0]?.[0] || "?";
  const b = parts[1]?.[0] || "";
  return (a + b).toUpperCase();
}

// Photo de profil (Netlify Blobs "starvibe-photos"), ou null : le client
// affiche alors les initiales.
function photoUrl(key: string | null | undefined): string | null {
  return key ? `/api/starvibe-photo?key=${encodeURIComponent(key)}` : null;
}

function toModerationApi(row: VideoRow) {
  return {
    id: String(row.id),
    legende: row.legende,
    auteur: row.auteur_nom || "",
    telephone: row.telephone || "",
    createdAt: row.created_at,
    videoUrl: signedVideoUrl(row.blob_key),
  };
}

export default async (req: Request, _context: Context) => {
  await ensureSchema();
  const { sql } = db();
  const url = new URL(req.url);

  // --- File de modération PIOUPIOU (réservée au staff STAR ENTREPRISE) ---
  if (req.method === "GET" && url.searchParams.get("moderation") === "1") {
    const staff = await requireAuth(req);
    if (!staff || staff.org !== STAFF_ORG) return json({ error: "Non autorisé" }, 403);

    const rows = (await sql`
      SELECT v.*, p.nom AS auteur_nom, a.telephone
      FROM starvibe_videos v
      JOIN starvibe_profiles p ON p.id = v.profile_id
      JOIN starvibe_accounts a ON a.id = v.account_id
      WHERE (v.pour_enfants = true OR v.espace = 'jeunes') AND v.moderation_statut = 'en_attente'
      ORDER BY v.id ASC LIMIT 30
    `) as VideoRow[];

    return json({ videos: rows.map(toModerationApi) });
  }

  // --- Envoi d'un morceau de vidéo (binaire brut, compte STAR VIBE) ---
  if (req.method === "POST" && url.searchParams.get("chunk") === "1") {
    const session = await requireAuth(req);
    if (!session || session.org !== ORG) return json({ error: "Non authentifié" }, 401);
    const up = url.searchParams.get("id") || "";
    const i = Number(url.searchParams.get("i")), n = Number(url.searchParams.get("n"));
    if (!UPLOAD_ID_RE.test(up) || !Number.isInteger(i) || !Number.isInteger(n) || i < 0 || i >= n || n > MAX_CHUNKS) {
      return json({ error: "Morceau de vidéo invalide" }, 400);
    }
    const part = await req.arrayBuffer();
    if (part.byteLength === 0 || part.byteLength > CHUNK_MAX) return json({ error: "Morceau de vidéo invalide" }, 400);
    await getStore("starvibe-videos-tmp").set(`${session.sub}/${up}/${i}`, part);
    return json({ ok: true });
  }

  // --- Décision de modération (staff) ---
  if (req.method === "POST") {
    let earlyBody: Record<string, unknown>;
    try {
      earlyBody = await req.json();
    } catch {
      return json({ error: "Invalid JSON" }, 400);
    }

    if (clean(earlyBody.action, 20) === "moderer") {
      const staff = await requireAuth(req);
      if (!staff || staff.org !== STAFF_ORG) return json({ error: "Non autorisé" }, 403);

      const videoId = Number(earlyBody.videoId);
      const decision = clean(earlyBody.decision, 20);
      if (!videoId || !["approuve", "rejete"].includes(decision)) {
        return json({ error: "videoId et decision (approuve|rejete) requis" }, 400);
      }

      const premium = decision === "approuve" && Boolean(earlyBody.premium);
      const rows = (await sql`
        UPDATE starvibe_videos SET moderation_statut = ${decision}, premium = ${premium}
        WHERE id = ${videoId} RETURNING id
      `) as { id: number }[];
      if (!rows[0]) return json({ error: "Vidéo introuvable" }, 404);
      return json({ ok: true, moderationStatut: decision, premium });
    }

    // Le staff peut aussi passer une vidéo déjà approuvée en premium (ou la
    // rendre gratuite) sans la remodérer.
    if (clean(earlyBody.action, 20) === "definir_premium") {
      const staff = await requireAuth(req);
      if (!staff || staff.org !== STAFF_ORG) return json({ error: "Non autorisé" }, 403);
      const videoId = Number(earlyBody.videoId);
      if (!videoId) return json({ error: "videoId requis" }, 400);
      const premium = Boolean(earlyBody.premium);
      const dateBrute = clean(earlyBody.disponibleLe, 40);
      const date = dateBrute ? new Date(dateBrute) : null;
      if (dateBrute && (!date || Number.isNaN(date.getTime()))) return json({ error: "Date d'ouverture invalide" }, 400);
      if (date && !premium) return json({ error: "Une date d'ouverture s'applique à une vidéo premium (Famille)" }, 400);
      const rows = (await sql`
        UPDATE starvibe_videos SET premium = ${premium}, disponible_le = ${premium && date ? date.toISOString() : null}
        WHERE id = ${videoId} RETURNING id, affiche_key
      `) as { id: number; affiche_key: string | null }[];
      if (!rows[0]) return json({ error: "Vidéo introuvable" }, 404);
      // Affiche (image) de la vidéo : JPEG, PNG ou WebP, 1,5 Mo au plus. Remplace la précédente.
      const img = String(earlyBody.afficheBase64 ?? "");
      let afficheUrl: string | null = rows[0].affiche_key ? `/api/starvibe-photo?key=${encodeURIComponent(rows[0].affiche_key)}` : null;
      if (img) {
        const mime = clean(earlyBody.afficheMime, 40) || "image/jpeg";
        if (!["image/jpeg", "image/png", "image/webp"].includes(mime)) return json({ error: "L'affiche doit être en JPEG, PNG ou WebP" }, 400);
        const octets = Buffer.from(img.includes(",") ? img.split(",")[1] : img, "base64");
        if (!octets.byteLength || octets.byteLength > 1_500_000) return json({ error: "Affiche vide ou trop lourde (1,5 Mo au plus)" }, 400);
        const store = getStore("starvibe-photos");
        const cle = `affiche-${videoId}-${Date.now()}-${randomBytes(4).toString("hex")}`;
        await store.set(cle, octets, { metadata: { typeMime: mime } });
        await sql`UPDATE starvibe_videos SET affiche_key = ${cle} WHERE id = ${videoId}`;
        if (rows[0].affiche_key) await store.delete(rows[0].affiche_key).catch(() => {});
        afficheUrl = `/api/starvibe-photo?key=${encodeURIComponent(cle)}`;
      }
      return json({ ok: true, premium, disponibleLe: premium && date ? date.toISOString() : null, afficheUrl });
    }

    // --- Toute autre action passe par le compte STAR VIBE de l'utilisateur ---
    const session = await requireAuth(req);
    if (!session || session.org !== ORG) return json({ error: "Non authentifié" }, 401);
    const accountId = Number(session.sub);
    const action = clean(earlyBody.action, 20);

    if (action === "publier") {
      const profileId = Number(earlyBody.profileId);
      const legende = clean(earlyBody.legende, 300);
      const typeMime = clean(earlyBody.typeMime, 100) || "video/mp4";
      const fileBase64 = String(earlyBody.fileBase64 ?? "");
      const uploadId = clean(earlyBody.uploadId, 30);
      const nChunks = Number(earlyBody.nChunks);
      const pourEnfants = Boolean(earlyBody.pourEnfants);
      // espaces ouverts : talents, business, découverte (une vidéo pour enfants reste toujours dans PIOUPIOU, après vérification)
      const espaceDemande = clean(earlyBody.espace, 20).toLowerCase();
      const espace = !pourEnfants && ESPACES_OUVERTS.includes(espaceDemande) ? espaceDemande : "general";

      if (!profileId || (!fileBase64 && !uploadId)) return json({ error: "Profil et vidéo requis" }, 400);
      if (!typeMime.startsWith("video/")) return json({ error: "Le fichier doit être une vidéo" }, 400);

      const profRows = (await sql`
        SELECT id, type_profil, date_naissance FROM starvibe_profiles WHERE id = ${profileId} AND account_id = ${accountId} LIMIT 1
      `) as { id: number; type_profil: string; date_naissance: string }[];
      const profile = profRows[0];
      if (!profile) return json({ error: "Profil introuvable" }, 404);
      if (profile.type_profil !== "personnel") {
        return json({ error: "Seul un profil personnel peut publier une vidéo" }, 403);
      }
      const agePublieur = ageFromDate(String(profile.date_naissance));
      if (espace === "jeunes" && !estJeune(agePublieur)) {
        return json({ error: "KOMYO Jeunes est réservé aux 13-17 ans." }, 403);
      }
      if (espace === "business" && agePublieur !== null && agePublieur < 18) {
        return json({ error: "KOMYO Business est réservé aux 18 ans et plus." }, 403);
      }

      let bytes: Buffer;
      const tmpKeys: string[] = [];
      const tmp = getStore("starvibe-videos-tmp");
      if (uploadId) {
        if (!UPLOAD_ID_RE.test(uploadId) || !Number.isInteger(nChunks) || nChunks < 1 || nChunks > MAX_CHUNKS) {
          return json({ error: "Envoi incomplet, réessaie." }, 400);
        }
        const parts: Buffer[] = [];
        for (let k = 0; k < nChunks; k++) {
          const key = `${accountId}/${uploadId}/${k}`;
          const part = await tmp.get(key, { type: "arrayBuffer" });
          if (!part) return json({ error: "Envoi incomplet, réessaie." }, 400);
          parts.push(Buffer.from(part));
          tmpKeys.push(key);
        }
        bytes = Buffer.concat(parts);
      } else {
        const raw = fileBase64.includes(",") ? fileBase64.split(",")[1] : fileBase64;
        bytes = Buffer.from(raw, "base64");
      }
      if (bytes.byteLength > MAX_VIDEO_BYTES) {
        return json({ error: "Vidéo trop volumineuse (limite 40 Mo)" }, 400);
      }
      if (bytes.byteLength === 0) return json({ error: "Fichier vidéo vide" }, 400);

      const store = getStore("starvibe-videos");
      const blobKey = `${Date.now()}-${randomBytes(4).toString("hex")}`;
      await store.set(blobKey, bytes, { metadata: { typeMime } });

      const moderationStatut = pourEnfants || espace === "jeunes" ? "en_attente" : "approuve";   // KOMYO Jeunes : chaque vidéo est vérifiée par le staff avant d'apparaître

      const rows = (await sql`
        INSERT INTO starvibe_videos (account_id, profile_id, legende, type_mime, blob_key, pour_enfants, moderation_statut, espace)
        VALUES (${accountId}, ${profileId}, ${legende}, ${typeMime}, ${blobKey}, ${pourEnfants}, ${moderationStatut}, ${espace})
        RETURNING *
      `) as VideoRow[];
      const created = rows[0];
      for (const key of tmpKeys) { try { await tmp.delete(key); } catch { /* sans gravité : ménage seulement */ } }
      created.premium = false;
      created.auteur_nom = (await sql`SELECT nom FROM starvibe_profiles WHERE id = ${profileId}`)[0]?.nom || "";

      return json({ video: toApi(created, false) }, 201);
    }

    // --- Supprimer sa propre vidéo (la vidéo, ses j'aime, ses commentaires et son fichier) ---
    if (action === "supprimer") {
      const videoId = Number(earlyBody.videoId);
      if (!videoId) return json({ error: "videoId requis" }, 400);
      const gone = (await sql`
        DELETE FROM starvibe_videos WHERE id = ${videoId} AND account_id = ${accountId} RETURNING blob_key
      `) as { blob_key: string }[];
      if (!gone[0]) return json({ error: "Vidéo introuvable, ou ce n'est pas la tienne." }, 404);
      try { await getStore("starvibe-videos").delete(gone[0].blob_key); } catch { /* le fichier orphelin ne gêne personne */ }
      return json({ ok: true });
    }

    if (action === "like" || action === "unlike") {
      const videoId = Number(earlyBody.videoId);
      if (!videoId) return json({ error: "videoId requis" }, 400);

      if (action === "like") {
        const inserted = await sql`
          INSERT INTO starvibe_likes (video_id, account_id) VALUES (${videoId}, ${accountId})
          ON CONFLICT (video_id, account_id) DO NOTHING
          RETURNING id
        `;
        if (inserted.length) {
          await sql`UPDATE starvibe_videos SET likes_count = likes_count + 1 WHERE id = ${videoId}`;
        }
      } else {
        const deleted = await sql`
          DELETE FROM starvibe_likes WHERE video_id = ${videoId} AND account_id = ${accountId} RETURNING id
        `;
        if (deleted.length) {
          await sql`UPDATE starvibe_videos SET likes_count = GREATEST(likes_count - 1, 0) WHERE id = ${videoId}`;
        }
      }

      const rows = (await sql`SELECT likes_count FROM starvibe_videos WHERE id = ${videoId}`) as { likes_count: number }[];
      if (!rows[0]) return json({ error: "Vidéo introuvable" }, 404);
      return json({ likes: rows[0].likes_count, likedByMe: action === "like" });
    }

    if (action === "vue") {
      const videoId = Number(earlyBody.videoId);
      if (!videoId) return json({ error: "videoId requis" }, 400);
      await sql`UPDATE starvibe_videos SET vues_count = vues_count + 1 WHERE id = ${videoId}`;
      return json({ ok: true });
    }

    // Fin de visionnage : durée réelle regardée + % de la vidéo vu. Envoyé
    // par le client quand la vidéo sort de l'écran. Jamais de vues_count ici
    // (déjà compté par l'action "vue") — uniquement la donnée d'analyse.
    if (action === "fin_vue") {
      const videoId = Number(earlyBody.videoId);
      const watchSeconds = Math.max(0, Math.round(Number(earlyBody.watchSeconds) || 0));
      const percent = Math.max(0, Math.min(100, Math.round(Number(earlyBody.percent) || 0)));
      if (!videoId || watchSeconds <= 0) return json({ ok: true }); // rien à enregistrer
      await sql`
        INSERT INTO starvibe_view_sessions (video_id, account_id, watch_seconds, percent_watched)
        VALUES (${videoId}, ${accountId}, ${watchSeconds}, ${percent})
      `;
      return json({ ok: true });
    }

    if (action === "commenter") {
      const videoId = Number(earlyBody.videoId);
      const profileId = Number(earlyBody.profileId);
      const texte = clean(earlyBody.texte, 300);
      let parentId = Number(earlyBody.parentId) || 0;
      if (!videoId || !profileId || !texte) {
        return json({ error: "videoId, profileId et texte requis" }, 400);
      }

      const profRows = (await sql`
        SELECT id, nom, photo_key FROM starvibe_profiles WHERE id = ${profileId} AND account_id = ${accountId} LIMIT 1
      `) as { id: number; nom: string; photo_key: string | null }[];
      const profile = profRows[0];
      if (!profile) return json({ error: "Profil introuvable" }, 404);

      // réponse à un commentaire : le parent doit exister sur la même vidéo ; une réponse à une réponse se range sous le commentaire d'origine
      if (parentId) {
        const par = (await sql`SELECT id, parent_id FROM starvibe_comments WHERE id = ${parentId} AND video_id = ${videoId} LIMIT 1`) as { id: number; parent_id: number | null }[];
        if (!par[0]) return json({ error: "Commentaire introuvable" }, 404);
        parentId = par[0].parent_id || par[0].id;
      }

      const rows = (await sql`
        INSERT INTO starvibe_comments (video_id, account_id, profile_id, texte, parent_id)
        VALUES (${videoId}, ${accountId}, ${profileId}, ${texte}, ${parentId || null})
        RETURNING id, texte, created_at
      `) as { id: number; texte: string; created_at: string }[];
      const created = rows[0];
      if (!created) return json({ error: "Vidéo introuvable" }, 404);

      const countRows = (await sql`
        UPDATE starvibe_videos SET comments_count = comments_count + 1 WHERE id = ${videoId} RETURNING comments_count
      `) as { comments_count: number }[];

      return json({
        comment: {
          id: String(created.id),
          texte: created.texte,
          auteur: profile.nom,
          initiales: initials(profile.nom),
          photoUrl: photoUrl(profile.photo_key),
          createdAt: created.created_at,
          accountId,
          parentId: parentId || null,
        },
        commentaires: countRows[0]?.comments_count ?? 0,
      }, 201);
    }

    // Ouverture de la liste des notifications : tout devient "lu". Rien
    // n'est supprimé — la liste reste consultable.
    if (action === "notifs_vues") {
      await sql`UPDATE starvibe_accounts SET notifs_vues_at = now() WHERE id = ${accountId}`;
      return json({ ok: true });
    }

    return json({ error: "Action inconnue" }, 400);
  }

  if (req.method !== "GET") return json({ error: "Method not allowed" }, 405);

  // --- Statistiques du créateur : uniquement SES vidéos, jamais celles des
  //     autres. Durée moyenne regardée, % moyen vu, j'aime, commentaires,
  //     vues — pour une vraie lecture de performance, pas qu'un chiffre. ---
  if (url.searchParams.get("statistiques") === "1") {
    const session = await requireAuth(req);
    if (!session || session.org !== ORG) return json({ error: "Non authentifié" }, 401);
    const accountId = Number(session.sub);

    const rows = (await sql`
      SELECT v.id, v.legende, v.likes_count, v.vues_count, v.comments_count, v.created_at,
        COALESCE(AVG(s.watch_seconds), 0) AS watch_moyen,
        COALESCE(AVG(s.percent_watched), 0) AS pourcent_moyen,
        COUNT(s.id) AS sessions_mesurees
      FROM starvibe_videos v
      LEFT JOIN starvibe_view_sessions s ON s.video_id = v.id
      WHERE v.account_id = ${accountId}
      GROUP BY v.id
      ORDER BY v.id DESC LIMIT 100
    `) as Array<{
      id: number; legende: string; likes_count: number; vues_count: number; comments_count: number;
      created_at: string; watch_moyen: string; pourcent_moyen: string; sessions_mesurees: string;
    }>;

    return json({
      videos: rows.map((r) => ({
        id: String(r.id),
        legende: r.legende,
        likes: r.likes_count,
        vues: r.vues_count,
        commentaires: r.comments_count,
        createdAt: r.created_at,
        dureeRegardeeMoyenne: Math.round(Number(r.watch_moyen)),
        pourcentRegardeMoyen: Math.round(Number(r.pourcent_moyen)),
        sessionsMesurees: Number(r.sessions_mesurees),
      })),
    });
  }

  // --- Liste des commentaires d'une vidéo (bottom sheet) ---
  if (url.searchParams.get("commentaires") === "1") {
    const session = await requireAuth(req);
    if (!session || session.org !== ORG) return json({ error: "Non authentifié" }, 401);

    const videoId = Number(url.searchParams.get("videoId"));
    if (!videoId) return json({ error: "videoId requis" }, 400);

    const rows = (await sql`
      SELECT c.id, c.texte, c.created_at, c.account_id, c.parent_id, p.nom AS auteur_nom, p.photo_key, (c.account_id = v.account_id) AS est_createur
      FROM starvibe_comments c
      JOIN starvibe_profiles p ON p.id = c.profile_id
      JOIN starvibe_videos v ON v.id = c.video_id
      WHERE c.video_id = ${videoId}
      ORDER BY c.id DESC LIMIT 300
    `) as { id: number; texte: string; created_at: string; account_id: number; parent_id: number | null; auteur_nom: string; photo_key: string | null; est_createur: boolean }[];

    return json({
      commentaires: rows.map((r) => ({
        id: String(r.id),
        texte: r.texte,
        auteur: r.auteur_nom,
        initiales: initials(r.auteur_nom),
        photoUrl: photoUrl(r.photo_key),
        createdAt: r.created_at,
        accountId: r.account_id,
        parentId: r.parent_id ? String(r.parent_id) : null,
        estCreateur: r.est_createur,
      })),
    });
  }

  // --- Activité récente d'une vidéo (j'aime + commentaires), pour la
  //     petite notification façon TikTok qui apparaît au-dessus du fil
  //     pendant qu'on regarde. Jamais d'invention : uniquement les vrais
  //     événements survenus depuis "since". ---
  if (url.searchParams.get("activite") === "1") {
    const session = await requireAuth(req);
    if (!session || session.org !== ORG) return json({ error: "Non authentifié" }, 401);

    const videoId = Number(url.searchParams.get("videoId"));
    const since = url.searchParams.get("since") || "1970-01-01T00:00:00Z";
    if (!videoId) return json({ error: "videoId requis" }, 400);

    const likeRows = (await sql`
      SELECT l.id, l.created_at, l.account_id, p.nom AS auteur_nom, p.photo_key
      FROM starvibe_likes l
      JOIN starvibe_profiles p ON p.account_id = l.account_id AND p.type_profil = 'personnel'
      WHERE l.video_id = ${videoId} AND l.created_at > ${since}
      ORDER BY l.id DESC LIMIT 10
    `) as { id: number; created_at: string; account_id: number; auteur_nom: string; photo_key: string | null }[];

    const commentRows = (await sql`
      SELECT c.id, c.texte, c.created_at, c.account_id, p.nom AS auteur_nom, p.photo_key
      FROM starvibe_comments c
      JOIN starvibe_profiles p ON p.id = c.profile_id
      WHERE c.video_id = ${videoId} AND c.created_at > ${since}
      ORDER BY c.id DESC LIMIT 10
    `) as { id: number; texte: string; created_at: string; account_id: number; auteur_nom: string; photo_key: string | null }[];

    const evenements = [
      ...likeRows.map((r) => ({
        type: "like" as const,
        auteur: r.auteur_nom,
        initiales: initials(r.auteur_nom),
        photoUrl: photoUrl(r.photo_key),
        texte: "",
        accountId: r.account_id,
        createdAt: r.created_at,
      })),
      ...commentRows.map((r) => ({
        type: "comment" as const,
        auteur: r.auteur_nom,
        initiales: initials(r.auteur_nom),
        photoUrl: photoUrl(r.photo_key),
        texte: r.texte,
        accountId: r.account_id,
        createdAt: r.created_at,
      })),
    ].sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());

    return json({ evenements, now: new Date().toISOString() });
  }

  // --- Notifications de l'abonné (bulle flottante KOMYO) : j'aime et
  //     commentaires reçus sur SES vidéos, par d'autres que lui. Les 30
  //     plus récents + le nombre de non lus depuis la dernière ouverture
  //     de la liste (notifs_vues_at). ---
  if (url.searchParams.get("notifications") === "1") {
    const session = await requireAuth(req);
    if (!session || session.org !== ORG) return json({ error: "Non authentifié" }, 401);
    const accountId = Number(session.sub);

    const accRows = (await sql`
      SELECT notifs_vues_at FROM starvibe_accounts WHERE id = ${accountId} LIMIT 1
    `) as { notifs_vues_at: string | null }[];
    const vuesAt = accRows[0]?.notifs_vues_at || "1970-01-01T00:00:00Z";

    const likeRows = (await sql`
      SELECT l.id, l.created_at, l.account_id, l.video_id, v.legende, p.nom AS auteur_nom, p.photo_key
      FROM starvibe_likes l
      JOIN starvibe_videos v ON v.id = l.video_id
      JOIN starvibe_profiles p ON p.account_id = l.account_id AND p.type_profil = 'personnel'
      WHERE v.account_id = ${accountId} AND l.account_id <> ${accountId}
      ORDER BY l.created_at DESC LIMIT 30
    `) as { id: number; created_at: string; account_id: number; video_id: number; legende: string; auteur_nom: string; photo_key: string | null }[];

    const commentRows = (await sql`
      SELECT c.id, c.texte, c.created_at, c.account_id, c.video_id, v.legende, p.nom AS auteur_nom, p.photo_key
      FROM starvibe_comments c
      JOIN starvibe_videos v ON v.id = c.video_id
      JOIN starvibe_profiles p ON p.id = c.profile_id
      WHERE v.account_id = ${accountId} AND c.account_id <> ${accountId}
      ORDER BY c.created_at DESC LIMIT 30
    `) as { id: number; texte: string; created_at: string; account_id: number; video_id: number; legende: string; auteur_nom: string; photo_key: string | null }[];

    const countRows = (await sql`
      SELECT
        (SELECT COUNT(*) FROM starvibe_likes l JOIN starvibe_videos v ON v.id = l.video_id
          WHERE v.account_id = ${accountId} AND l.account_id <> ${accountId} AND l.created_at > ${vuesAt})
        +
        (SELECT COUNT(*) FROM starvibe_comments c JOIN starvibe_videos v ON v.id = c.video_id
          WHERE v.account_id = ${accountId} AND c.account_id <> ${accountId} AND c.created_at > ${vuesAt})
        AS n
    `) as { n: string }[];

    const vuesTime = new Date(vuesAt).getTime();
    const evenements = [
      ...likeRows.map((r) => ({
        id: `like-${r.id}`,
        type: "like" as const,
        auteur: r.auteur_nom,
        initiales: initials(r.auteur_nom),
        photoUrl: photoUrl(r.photo_key),
        texte: "",
        videoId: String(r.video_id),
        legende: r.legende,
        createdAt: r.created_at,
      })),
      ...commentRows.map((r) => ({
        id: `comment-${r.id}`,
        type: "comment" as const,
        auteur: r.auteur_nom,
        initiales: initials(r.auteur_nom),
        photoUrl: photoUrl(r.photo_key),
        texte: r.texte,
        videoId: String(r.video_id),
        legende: r.legende,
        createdAt: r.created_at,
      })),
    ]
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, 30)
      .map((e) => ({ ...e, nonLu: new Date(e.createdAt).getTime() > vuesTime }));

    return json({ evenements, nonLues: Number(countRows[0]?.n || 0), now: new Date().toISOString() });
  }

  // --- Lecture du fil (utilisateur STAR VIBE) ---
  const session = await requireAuth(req);
  if (!session || session.org !== ORG) return json({ error: "Non authentifié" }, 401);
  const accountId = Number(session.sub);

  // Une vidéo n'est jamais visible tant qu'elle n'est pas "approuve" — pour
  // le fil principal (pour_enfants = false) c'est automatique dès la
  // publication ; pour PIOUPIOU (pour_enfants = true), ça n'arrive qu'après
  // validation par un compte staff (voir plus haut, action "moderer").
  // Une seule vidéo (invitation « Regarder ensemble ») : mêmes règles que le fil — approuvée, jamais PIOUPIOU, KOMYO Jeunes réservé aux 13-17 ans.
  const une = Number(url.searchParams.get("une"));
  if (une) {
    const r = (await sql`
      SELECT v.*, p.nom AS auteur_nom FROM starvibe_videos v JOIN starvibe_profiles p ON p.id = v.profile_id
      WHERE v.id = ${une} AND v.moderation_statut = 'approuve' AND v.pour_enfants = false LIMIT 1
    `) as VideoRow[];
    if (!r[0]) return json({ video: null }, 404);
    if (r[0].espace === "jeunes") {
      const pers = (await sql`SELECT date_naissance FROM starvibe_profiles WHERE account_id = ${accountId} AND type_profil = 'personnel' LIMIT 1`) as { date_naissance: string }[];
      if (!pers[0] || !estJeune(ageFromDate(String(pers[0].date_naissance)))) return json({ video: null, reserve: true }, 403);
    }
    const aime = (await sql`SELECT 1 FROM starvibe_likes WHERE account_id = ${accountId} AND video_id = ${une} LIMIT 1`) as unknown[];
    return json({ video: toApi(r[0], aime.length > 0, await hasActiveFamille(sql, accountId), accountId) });
  }

  const espaceParam = (url.searchParams.get("espace") || "").toLowerCase();
  const wantKids = espaceParam === "pioupiou";
  const espaceFiltre = ESPACES_OUVERTS.includes(espaceParam) ? espaceParam : "";   // "" = fil principal : toutes les vidéos non enfants
  const before = Number(url.searchParams.get("before")) || null;

  // KOMYO Jeunes : seuls les 13-17 ans le voient. Les autres reçoivent une liste vide.
  if (espaceFiltre === "jeunes") {
    const pers = (await sql`SELECT date_naissance FROM starvibe_profiles WHERE account_id = ${accountId} AND type_profil = 'personnel' LIMIT 1`) as { date_naissance: string }[];
    if (!pers[0] || !estJeune(ageFromDate(String(pers[0].date_naissance)))) return json({ videos: [], reserve: true });
  }

  const rows = (before
    ? await sql`
        SELECT v.*, p.nom AS auteur_nom
        FROM starvibe_videos v
        JOIN starvibe_profiles p ON p.id = v.profile_id
        WHERE v.pour_enfants = ${wantKids} AND v.moderation_statut = 'approuve' AND (v.premium = false OR ${wantKids}) AND ((${espaceFiltre} = '' AND v.espace <> 'jeunes') OR (${espaceFiltre} <> '' AND v.espace = ${espaceFiltre})) AND v.id < ${before}
        ORDER BY v.id DESC LIMIT 10
      `
    : await sql`
        SELECT v.*, p.nom AS auteur_nom
        FROM starvibe_videos v
        JOIN starvibe_profiles p ON p.id = v.profile_id
        WHERE v.pour_enfants = ${wantKids} AND v.moderation_statut = 'approuve' AND (v.premium = false OR ${wantKids}) AND ((${espaceFiltre} = '' AND v.espace <> 'jeunes') OR (${espaceFiltre} <> '' AND v.espace = ${espaceFiltre}))
        ORDER BY v.id DESC LIMIT 10
      `) as VideoRow[];

  const ids = rows.map((r) => r.id);
  const likedRows = ids.length
    ? ((await sql`
        SELECT video_id FROM starvibe_likes WHERE account_id = ${accountId} AND video_id = ANY(${ids})
      `) as { video_id: number }[])
    : [];
  const likedSet = new Set(likedRows.map((r) => r.video_id));

  const canWatchPremium = await hasActiveFamille(sql, accountId);
  return json({ videos: rows.map((r) => toApi(r, likedSet.has(r.id), canWatchPremium, accountId)), abonneFamille: canWatchPremium });
};

export const config: Config = {
  path: "/api/starvibe-videos",
};
