// MESSAGERIE KOMYO — boîte de réception de chaque personne (reçus, accusés de réception, ventes, factures…).
// GET  ?mes=1                       : mes messages (du plus récent) + nombre de non lus.
// POST { action: "lu", id } | { action: "tout_lu" }
// POST { action: "ecrire", destinataire: "komyo", texte } : la personne écrit à l'équipe KOMYO (e-mail à contact@starentreprise.com + notification équipe + copie dans sa messagerie).
import type { Context, Config } from "@netlify/functions";
import { ensureSchema, db, json } from "./_db.mts";
import { requireAuth } from "./_auth.mts";
import { envoyerContact } from "./_mail.mts";
import { pushAll } from "./_push.mts";

export default async (req: Request, _context: Context) => {
  await ensureSchema();
  const { sql } = db();
  const session = await requireAuth(req);
  if (!session || session.org !== "star_vibe") return json({ error: "Non authentifié" }, 401);
  const accountId = Number(session.sub);
  if (req.method === "GET") {
    const rows = (await sql`SELECT id, kind, titre, texte, lien, lu, created_at FROM starvibe_messages WHERE account_id = ${accountId} ORDER BY id DESC LIMIT 60`) as Record<string, unknown>[];
    const n = ((await sql`SELECT COUNT(*)::int AS n FROM starvibe_messages WHERE account_id = ${accountId} AND lu = false`) as { n: number }[])[0]?.n || 0;
    return json({ nonLus: n, messages: rows.map((r) => ({ id: r.id, kind: r.kind, titre: r.titre, texte: r.texte, lien: r.lien, lu: r.lu, date: r.created_at })) });
  }
  if (req.method === "POST") {
    let body: Record<string, unknown>;
    try { body = await req.json(); } catch { return json({ error: "Invalid JSON" }, 400); }
    if (body.action === "ecrire") {
      // Seul destinataire pour l'instant : l'équipe KOMYO. (Écrire à un autre membre viendra avec le blocage de contacts.)
      if (String(body.destinataire || "komyo") !== "komyo") return json({ error: "Destinataire inconnu" }, 400);
      const texte = String(body.texte || "").replace(/\u0000/g, "").trim().slice(0, 1000);
      if (texte.length < 3) return json({ error: "Écris un message un peu plus long." }, 400);
      // Garde-fou : 5 messages par heure et par personne.
      const recents = ((await sql`SELECT COUNT(*)::int AS n FROM starvibe_messages WHERE account_id = ${accountId} AND kind = 'envoye' AND created_at > now() - interval '1 hour'`) as { n: number }[])[0]?.n || 0;
      if (recents >= 5) return json({ error: "Tu as déjà envoyé plusieurs messages. Réessaie dans une heure." }, 429);
      const acc = ((await sql`SELECT a.telephone, (SELECT p.nom FROM starvibe_profiles p WHERE p.account_id = a.id ORDER BY (p.type_profil = 'personnel') DESC, p.id ASC LIMIT 1) AS nom FROM starvibe_accounts a WHERE a.id = ${accountId}`) as { telephone: string; nom: string | null }[])[0];
      if (!acc) return json({ error: "Compte introuvable" }, 404);
      const nom = acc.nom || "Membre KOMYO";
      await sql`INSERT INTO starvibe_messages (account_id, kind, titre, texte, lien, lu) VALUES (${accountId}, 'envoye', 'Ton message à KOMYO', ${texte}, '', true)`;
      let mail = false;
      try { mail = await envoyerContact({ nom, contact: acc.telephone, message: texte }); } catch { /* le message reste enregistré */ }
      try { await pushAll(sql, { title: "Message d'un membre KOMYO", body: nom + " : " + texte.slice(0, 120), tag: "msg-membre", url: "/starvibe/keydou-admin.html" }); } catch { /* notification facultative */ }
      return json({ ok: true, envoye: mail });
    }
    if (body.action === "tout_lu") { await sql`UPDATE starvibe_messages SET lu = true WHERE account_id = ${accountId}`; return json({ ok: true }); }
    if (body.action === "lu") { await sql`UPDATE starvibe_messages SET lu = true WHERE id = ${Number(body.id)} AND account_id = ${accountId}`; return json({ ok: true }); }
  }
  return json({ error: "Requête inconnue" }, 400);
};
export const config: Config = { path: "/api/starvibe-messages" };
