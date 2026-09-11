import { NextResponse } from "next/server";
import { comunidadSchema } from "@/lib/comunidad-schemas";
import { guardarPersona } from "@/lib/comunidad-notion";
import { DB } from "@/lib/notion";

export const runtime = "nodejs";

/**
 * POST /api/comunidad — alta de una persona en la comunidad del Hub.
 *
 * Endpoint aparte de /api/submit a propósito: este form no sube archivos, no
 * necesita multipart y tiene un rate limit distinto (se espera mucho más
 * tráfico, con gente anotándose desde un QR en el mismo evento).
 */

// Rate limit en memoria por IP. Best-effort: en Vercel cada instancia tiene su
// propio Map, así que el tope real es por instancia. Alcanza para frenar spam
// de un script; para un ataque en serio haría falta Upstash/Vercel KV.
const HITS = new Map<string, { count: number; ts: number }>();
const WINDOW_MS = 60_000;
// Más alto que en /api/submit: en un stand con WiFi compartido, veinte personas
// se anotan desde la misma IP saliente en pocos minutos.
const MAX_POR_VENTANA = 20;

function rateLimited(ip: string): boolean {
  const now = Date.now();
  const h = HITS.get(ip);
  if (!h || now - h.ts > WINDOW_MS) {
    HITS.set(ip, { count: 1, ts: now });
    return false;
  }
  h.count += 1;
  return h.count > MAX_POR_VENTANA;
}

export async function POST(req: Request) {
  const ip = (req.headers.get("x-forwarded-for") ?? "").split(",")[0].trim() || "unknown";
  if (rateLimited(ip)) {
    return NextResponse.json(
      { ok: false, error: "Demasiados envíos seguidos. Probá de nuevo en un minuto." },
      { status: 429 },
    );
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Solicitud inválida." }, { status: 400 });
  }

  // Honeypot: si el campo trampa vino cargado es un bot. Respondemos ok para no
  // darle señal de que lo detectamos, pero no escribimos nada.
  if (body && typeof body === "object" && (body as Record<string, unknown>).website) {
    return NextResponse.json({ ok: true, creado: true });
  }

  const parsed = comunidadSchema.safeParse(body);
  if (!parsed.success) {
    const first = parsed.error.errors[0];
    return NextResponse.json(
      { ok: false, error: first?.message ?? "Revisá los datos e intentá otra vez." },
      { status: 422 },
    );
  }

  // DB.comunidad, no la env var: el ID tiene un default en lib/notion.ts.
  if (!process.env.NOTION_TOKEN || !DB.comunidad) {
    console.error("[comunidad] Falta NOTION_TOKEN o el ID de la base.");
    return NextResponse.json(
      { ok: false, error: "El servidor no está configurado. Probá de nuevo en unos minutos." },
      { status: 500 },
    );
  }

  try {
    const { creado } = await guardarPersona(parsed.data);
    // `creado: false` = ya estaba y se actualizó. El front lo usa para cambiar
    // el mensaje: "ya estabas en la comunidad, actualizamos tus datos".
    return NextResponse.json({ ok: true, creado });
  } catch (e) {
    console.error("[comunidad] Notion falló:", e);
    return NextResponse.json(
      { ok: false, error: "No pudimos guardar tus datos. Reintentá en un momento." },
      { status: 502 },
    );
  }
}
