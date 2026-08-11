import { NextResponse } from "next/server";
import { notion, DB } from "@/lib/notion";

export const runtime = "nodejs";

/**
 * GET /api/health  —  confirma que el token alcanza las 3 bases (Eventos, Host
 * y Speakers) ANTES de salir a producción. Devuelve el título de cada base (para
 * verificar que son las correctas) o el error de la API. Si un ID es de
 * "database" vs "data source" y la API lo rechaza, se ve acá.
 * Se protege con ?secret=<HEALTH_SECRET> si esa env var está seteada.
 */
export async function GET(req: Request) {
  const secret = process.env.HEALTH_SECRET;
  if (secret && new URL(req.url).searchParams.get("secret") !== secret) {
    return NextResponse.json({ ok: false, error: "No autorizado." }, { status: 401 });
  }
  if (!process.env.NOTION_TOKEN) {
    return NextResponse.json({ ok: false, error: "Falta NOTION_TOKEN." }, { status: 500 });
  }

  const bases: Record<string, unknown> = {};
  for (const [nombre, id] of Object.entries(DB)) {
    if (!id) {
      bases[nombre] = { ok: false, error: "Falta el Database ID (env var vacía)." };
      continue;
    }
    try {
      const db = (await notion.databases.retrieve({ database_id: id })) as {
        title?: { plain_text?: string }[];
      };
      bases[nombre] = { ok: true, id, titulo: db.title?.[0]?.plain_text ?? "(sin título)" };
    } catch (e) {
      const err = e as { body?: { message?: string }; message?: string };
      bases[nombre] = { ok: false, id, error: err?.body?.message ?? err?.message ?? String(e) };
    }
  }

  const allOk = Object.values(bases).every((b) => (b as { ok: boolean }).ok);
  return NextResponse.json({ ok: allOk, bases }, { status: allOk ? 200 : 502 });
}
