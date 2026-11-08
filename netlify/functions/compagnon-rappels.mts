// Keydou Compagnon : envoie les rappels qui arrivent à échéance (toutes les 5 minutes).
// - rappel « à l'avance » (avant_minutes) : une première notification, une seule fois ;
// - à l'heure : la notification principale ; un rappel qui se répète passe à sa prochaine date, les autres s'éteignent ;
// - un rappel en retard de plus de 24 h n'est pas envoyé (pas de notification périmée) ;
// - jamais pour une personne sans accès valide (abonnement terminé ou test retiré).
import type { Config } from "@netlify/functions";
import { ensureSchema, db } from "./_db.mts";
import { accesDe, pushCompte, suivante, formatDuree, texteFinAbonnement } from "./_compagnon.mts";
import { poster } from "./_msg.mts";

interface Due { id: number; account_id: number; titre: string; quand: string; repetition: string; avant_minutes: number; avant_envoye: boolean }

export default async () => {
  await ensureSchema();
  const { sql } = db();
  const dus = (await sql`
    SELECT id, account_id, titre, quand, repetition, avant_minutes, avant_envoye
    FROM starvibe_compagnon_rappels
    WHERE actif = true AND (quand <= now() OR (avant_minutes > 0 AND avant_envoye = false AND quand - make_interval(mins => avant_minutes) <= now()))
    ORDER BY quand ASC LIMIT 300
  `) as Due[];
  const acces = new Map<number, boolean>();
  let envoyes = 0;
  for (const r of dus) {
    if (!acces.has(r.account_id)) acces.set(r.account_id, !!(await accesDe(sql, r.account_id)));
    if (!acces.get(r.account_id)) continue;
    const quand = new Date(r.quand);
    const maintenant = new Date();
    const echu = quand.getTime() <= maintenant.getTime();
    if (!echu) { // notification à l'avance
      const reste = quand.getTime() - maintenant.getTime();
      await pushCompte(sql, r.account_id, { title: "🐻 Keydou te rappelle", body: `${r.titre} : dans ${formatDuree(reste)}.`, tag: `rappel-${r.id}-avant` });
      await sql`UPDATE starvibe_compagnon_rappels SET avant_envoye = true WHERE id = ${r.id}`;
      envoyes++;
      continue;
    }
    const retard = maintenant.getTime() - quand.getTime();
    if (retard <= 24 * 3600 * 1000) {
      await pushCompte(sql, r.account_id, { title: "🐻 Keydou te rappelle", body: r.titre, tag: `rappel-${r.id}` });
      envoyes++;
    }
    if (r.repetition) {
      const prochaine = suivante(quand, r.repetition, maintenant);
      await sql`UPDATE starvibe_compagnon_rappels SET quand = ${prochaine.toISOString()}, avant_envoye = false, envoye_at = now() WHERE id = ${r.id}`;
    } else {
      await sql`UPDATE starvibe_compagnon_rappels SET actif = false, envoye_at = now() WHERE id = ${r.id}`;
    }
  }

  // Fin d'abonnement : une notification et un message dans la messagerie KOMYO, UN JOUR AVANT la date de fin (une seule fois).
  // Pas de message si la personne a déjà reconduit (un autre abonnement Compagnon actif se termine plus tard).
  const fins = (await sql`
    SELECT s.id, s.account_id, s.plan, s.expires_at,
           (SELECT nom FROM starvibe_profiles p WHERE p.account_id = s.account_id AND p.type_profil = 'personnel' ORDER BY p.id LIMIT 1) AS nom
    FROM starvibe_subscriptions s
    WHERE s.plan IN ('compagnon', 'compagnon_complet') AND s.statut = 'actif' AND s.montant_attendu > 0
      AND s.expires_at > now() AND s.expires_at <= now() + interval '24 hours' AND s.rappel_veille_at IS NULL
      AND NOT EXISTS (SELECT 1 FROM starvibe_subscriptions o WHERE o.account_id = s.account_id AND o.plan IN ('compagnon', 'compagnon_complet') AND o.statut = 'actif' AND o.expires_at > s.expires_at)
    LIMIT 200
  `) as { id: number; account_id: number; plan: string; expires_at: string; nom: string | null }[];
  let prevenus = 0;
  for (const f of fins) {
    const t = texteFinAbonnement(new Date(f.expires_at));
    await sql`UPDATE starvibe_subscriptions SET rappel_veille_at = now() WHERE id = ${f.id}`;
    try { await pushCompte(sql, f.account_id, { title: "🐻 Ton abonnement Keydou se termine demain", body: t, tag: `fin-abo-${f.id}`, url: "/starvibe/compagnon.html" }); } catch { /* la messagerie reste */ }
    try { await poster(sql, f.account_id, { kind: "info", titre: "🐻 Ton abonnement Keydou Compagnon se termine demain", texte: `${f.nom ? "Bonjour " + f.nom + ". " : ""}${t}`, lien: "/starvibe/compagnon.html" }); } catch { /* ignore */ }
    prevenus++;
  }
  return new Response(JSON.stringify({ examines: dus.length, envoyes, finsAbonnement: prevenus }), { headers: { "content-type": "application/json" } });
};

export const config: Config = { schedule: "*/5 * * * *" };
