import { NextResponse } from "next/server";
import { submissionSchema } from "@/lib/schemas";
import { guardarEnNotion } from "@/lib/notion";

export const runtime = "nodejs";

// Rate limit simple en memoria por IP (best-effort; para prod a gran escala,
// mover a Upstash/Vercel KV). Alcanza para frenar spam básico.
const HITS = new Map<string, { count: number; ts: number }>();
const WINDOW_MS = 60_000; // 1 minuto
const MAX_POR_VENTANA = 5;

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

  // Honeypot: si el campo trampa vino con contenido, es un bot. Respondemos OK
  // para no darle señal, pero no escribimos nada.
  if (body && typeof body === "object" && (body as Record<string, unknown>).website) {
    return NextResponse.json({ ok: true });
  }

  // Validación + whitelist en servidor (no confiamos en el cliente).
  const parsed = submissionSchema.safeParse(body);
  if (!parsed.success) {
    const first = parsed.error.errors[0];
    return NextResponse.json(
      { ok: false, error: first?.message ?? "Revisá los datos e intentá otra vez." },
      { status: 422 },
    );
  }

  if (!process.env.NOTION_TOKEN) {
    console.error("[submit] Falta NOTION_TOKEN en el entorno.");
    return NextResponse.json(
      { ok: false, error: "El servidor no está configurado. Probá de nuevo en unos minutos." },
      { status: 500 },
    );
  }

  try {
    await guardarEnNotion(parsed.data);
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("[submit] Notion falló:", e);
    return NextResponse.json(
      { ok: false, error: "No pudimos guardar tu propuesta. Reintentá en un momento." },
      { status: 502 },
    );
  }
}
