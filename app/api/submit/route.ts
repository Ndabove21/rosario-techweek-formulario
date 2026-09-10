import { NextResponse } from "next/server";
import { submissionSchema, validarFlyer, FLYER_MAX_MB } from "@/lib/schemas";
import { guardarEnNotion, subirFlyer, type FlyerSubido } from "@/lib/notion";

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

  // El camino "evento" manda multipart (trae el flyer); "venue" sigue en JSON.
  const esMultipart = (req.headers.get("content-type") ?? "").includes("multipart/form-data");
  let body: unknown;
  let flyerFile: File | null = null;
  try {
    if (esMultipart) {
      const form = await req.formData();
      body = JSON.parse(String(form.get("payload") ?? "{}"));
      const f = form.get("flyer");
      flyerFile = f instanceof File && f.size > 0 ? f : null;
    } else {
      body = await req.json();
    }
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

  // El flyer es obligatorio en el camino "evento". Se revalida acá: el cliente
  // ya lo chequeó, pero no le creemos.
  if (parsed.data.via === "evento") {
    const problema = validarFlyer(flyerFile);
    if (problema) return NextResponse.json({ ok: false, error: problema }, { status: 422 });
  }

  // Se sube ANTES de crear la fila. Si Notion rechaza el archivo, el organizador
  // reintenta con el form todavía cargado — no queda una fila a medias.
  let flyer: FlyerSubido | null = null;
  if (flyerFile) {
    try {
      flyer = { uploadId: await subirFlyer(flyerFile), nombre: flyerFile.name };
    } catch (e) {
      console.error("[submit] Falló la subida del flyer:", e);
      return NextResponse.json(
        { ok: false, error: `No pudimos subir el flyer. Probá con un archivo más liviano (hasta ${FLYER_MAX_MB} MB) o reintentá.` },
        { status: 502 },
      );
    }
  }

  try {
    await guardarEnNotion(parsed.data, flyer);
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("[submit] Notion falló:", e);
    return NextResponse.json(
      { ok: false, error: "No pudimos guardar tu propuesta. Reintentá en un momento." },
      { status: 502 },
    );
  }
}
