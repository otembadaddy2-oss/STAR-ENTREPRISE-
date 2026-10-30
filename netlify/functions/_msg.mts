// Messagerie KOMYO : dépose un message dans la boîte d'une personne (gratuit, dans l'application).
// deno-lint-ignore no-explicit-any
type Sql = any;
export async function poster(sql: Sql, accountId: number | null, m: { kind: string; titre: string; texte: string; lien?: string }): Promise<void> {
  if (!accountId) return;
  try {
    await sql`INSERT INTO starvibe_messages (account_id, kind, titre, texte, lien) VALUES (${accountId}, ${m.kind}, ${String(m.titre).slice(0, 160)}, ${String(m.texte).slice(0, 4000)}, ${m.lien || ""})`;
  } catch (e) { console.error("messagerie", e); }
}
