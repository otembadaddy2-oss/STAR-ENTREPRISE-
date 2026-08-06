import type { Context, Config } from "@netlify/functions";
import { getStore } from "@netlify/blobs";
import { randomBytes } from "node:crypto";

interface DevisRecord {
  id: string;
  name: string;
  phone: string;
  formula: string;
  need: string;
  lang: "fr" | "en";
  createdAt: string;
}

function clean(value: unknown, maxLen: number): string {
  return String(value ?? "").trim().slice(0, maxLen);
}

function makeId(): string {
  const year = new Date().getUTCFullYear();
  const rand = randomBytes(4).toString("hex").toUpperCase();
  return `STAR-${year}-${rand}`;
}

export default async (req: Request, context: Context) => {
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { "content-type": "application/json" },
    });
  }

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: "Invalid JSON" }), {
      status: 400,
      headers: { "content-type": "application/json" },
    });
  }

  const name = clean(body.name, 120);
  const phone = clean(body.phone, 40);
  const formula = clean(body.formula, 60);
  const need = clean(body.need, 800);
  const lang: "fr" | "en" = body.lang === "en" ? "en" : "fr";

  if (!name || !phone) {
    return new Response(JSON.stringify({ error: "Missing name or phone" }), {
      status: 400,
      headers: { "content-type": "application/json" },
    });
  }

  const store = getStore("devis");

  let id = makeId();
  for (let attempt = 0; attempt < 5; attempt += 1) {
    const existing = await store.get(id);
    if (!existing) break;
    id = makeId();
  }

  const record: DevisRecord = {
    id,
    name,
    phone,
    formula,
    need,
    lang,
    createdAt: new Date().toISOString(),
  };

  await store.setJSON(id, record);

  return new Response(JSON.stringify({ id: record.id, createdAt: record.createdAt }), {
    status: 200,
    headers: { "content-type": "application/json" },
  });
};

export const config: Config = {
  path: "/api/create-devis",
};
