// Keydou Compagnon : envoie les rappels qui arrivent à échéance (toutes les 5 minutes).
// - rappel « à l'avance » (avant_minutes) : une première notification, une seule fois ;
// - à l'heure : la notification principale ; un rappel qui se répète passe à sa prochaine date, les autres s'éteignent ;
// - un rappel en retard de plus de 24 h n'est pas envoyé (pas de notification périmée) ;
// - jamais pour une personne sans accès valide (abonnement terminé ou test retiré).
import type { Config } from "@netlify/functions";
import { ensureSchema, db } from "./_db.mts";
import { accesDe, pushCompte, suivante, formatDuree } from "./_compagnon.mts";

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
  return new Response(JSON.stringify({ examines: dus.length, envoyes }), { headers: { "content-type": "application/json" } });
};

export const config: Config = { schedule: "*/5 * * * *" };
