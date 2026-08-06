import type { Context, Config } from "@netlify/functions";
import { getStore } from "@netlify/blobs";

interface DevisRecord {
  id: string;
  name: string;
  phone: string;
  formula: string;
  need: string;
  lang: "fr" | "en";
  createdAt: string;
}

function maskPhone(phone: string): string {
  const digits = phone.replace(/\s+/g, "");
  if (digits.length <= 5) return "•".repeat(digits.length);
  return digits.slice(0, 3) + "•".repeat(digits.length - 5) + digits.slice(-2);
}

export default async (req: Request, context: Context) => {
  const url = new URL(req.url);
  const id = (url.searchParams.get("id") || "").trim().toUpperCase();

  if (!id) {
    return new Response(JSON.stringify({ valid: false }), {
      status: 400,
      headers: { "content-type": "application/json" },
    });
  }

  const store = getStore("devis");
  const record = (await store.get(id, { type: "json" })) as DevisRecord | null;

  if (!record) {
    return new Response(JSON.stringify({ valid: false }), {
      status: 200,
      headers: { "content-type": "application/json" },
    });
  }

  return new Response(
    JSON.stringify({
      valid: true,
      data: {
        id: record.id,
        name: record.name,
        phoneMasked: maskPhone(record.phone),
        formula: record.formula,
        need: record.need,
        lang: record.lang,
        createdAt: record.createdAt,
      },
    }),
    { status: 200, headers: { "content-type": "application/json" } }
  );
};

export const config: Config = {
  path: "/api/verify-devis",
};
