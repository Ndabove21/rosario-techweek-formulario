import { Client } from "@notionhq/client";
import type { EventoInput, VenueInput, Submission, SpeakerInput } from "./schemas";

export const notion = new Client({ auth: process.env.NOTION_TOKEN });

export const DB = {
  eventos: process.env.NOTION_DB_EVENTOS ?? "",
  organizaciones: process.env.NOTION_DB_ORGANIZACIONES ?? "",
  speakers: process.env.NOTION_DB_SPEAKERS ?? "",
};

// ── Helpers: cada tipo de propiedad de Notion tiene su forma exacta ────────
const title = (t: string) => ({ title: [{ text: { content: t.slice(0, 2000) } }] });
const rich = (t: string) => ({ rich_text: [{ text: { content: (t || "").slice(0, 2000) } }] });
const sel = (name: string) => ({ select: { name } });
const multi = (names: readonly string[]) => ({ multi_select: names.map((name) => ({ name })) });
const num = (n?: number | null) => ({ number: n ?? null });
const email = (e: string) => ({ email: e || null });
const phone = (p: string) => ({ phone_number: p || null });
const url = (u?: string) => ({ url: u && u.length ? u : null });
const rel = (ids: string[]) => ({ relation: ids.map((id) => ({ id })) });

// El typing de pages.create es muy estricto; casteamos el arg completo a su
// tipo real sin acoplarnos a rutas internas del SDK.
type CreateArg = Parameters<typeof notion.pages.create>[0];
const crear = (arg: unknown) => notion.pages.create(arg as CreateArg);

// ── Camino 1 · Evento → EVENTOS (+ SPEAKERS vinculados) ───────────────────

/**
 * Crea una fila en 🗣️ Speakers ya vinculada al evento. La relación se escribe
 * en la creación (no hace falta el permiso "Update content"): Notion la refleja
 * sola del lado del evento, en su propiedad "Speakers".
 * Las temáticas se heredan del evento — la base de Speakers usa la misma lista.
 */
function crearSpeaker(sp: SpeakerInput, eventoId: string, tematicas: readonly string[]) {
  return crear({
    parent: { database_id: DB.speakers },
    properties: {
      "Nombre": title(sp.nombre),
      "Rol": rich(sp.rol ?? ""),
      "Bio": rich(sp.tema),
      "LinkedIn": url(sp.linkedin || undefined),
      "Temáticas": multi(tematicas),
      "Eventos como speaker": rel([eventoId]),
      // Valores fijos
      "Tipo": multi(["Speaker"]),
      "Estado": sel("Propuesto"),
    },
  });
}

async function crearEvento(d: EventoInput) {
  // EVENTOS no tiene columna de temáticas: se anexan al final de "Descripción".
  // Los speakers ya NO van acá — cada uno es una fila propia en 🗣️ Speakers.
  const descripcionCompleta =
    d.descripcion + `\n\n— Temáticas: ${d.tematicas.join(", ")}`;

  const evento = await crear({
    parent: { database_id: DB.eventos },
    properties: {
      "Evento": title(d.evento),
      "Formato": sel(d.formato),
      "Pilar": sel(d.pilar),
      "Descripción": rich(descripcionCompleta),
      "Objetivo": rich(d.propuestaValor),
      "Público objetivo": rich(d.publicoObjetivo),
      "¿Necesita venue?": sel(d.necesitaVenue),
      "Capacidad estimada": num(d.capacidad),
      "Costo para el asistente": sel(d.costo),
      // "Día" y "Bloque" quedan vacíos a propósito: los asigna el Hub en curaduría.
      "Proponente": rich(d.proponente),
      "Email proponente": email(d.email),
      "Teléfono proponente": phone(d.whatsapp),
      "Organización proponente": rich(d.organizacion ?? ""),
      "Web / LinkedIn": url(d.webLinkedin || undefined),
      // Valores fijos (no se le piden al usuario)
      "Estado curaduría": sel("Recibido"),
      "Vía de ingreso": sel("Propuesta de host"),
    },
  });

  if (!d.speakers.length) return evento;

  // Los speakers son secundarios: si alguno falla, la propuesta NO se pierde.
  // Se anexan los que fallaron a "Notas" del evento sería un update (permiso que
  // puede no estar), así que se reportan en el log del server para el equipo.
  const fallidos: string[] = [];
  for (const sp of d.speakers) {
    try {
      await crearSpeaker(sp, evento.id, d.tematicas);
    } catch (e) {
      fallidos.push(`${sp.nombre}: ${(e as { body?: { message?: string } })?.body?.message ?? String(e)}`);
    }
  }
  if (fallidos.length) {
    console.error(`[RTW26] Evento "${d.evento}" creado, pero fallaron ${fallidos.length} speaker(s):`, fallidos);
  }
  return evento;
}

// ── Camino 2 · Venue → ORGANIZACIONES ─────────────────────────────────────
function crearVenue(d: VenueInput) {
  const franjaTexto = d.franja === "Otro" ? `${d.franjaDesde}–${d.franjaHasta}` : d.franja;
  const notas =
    `Contacto: ${d.contacto} · Email: ${d.email} · Tel: ${d.telefono}` +
    ` · Días disponibles: ${d.dias.join(", ")} · Franja horaria: ${franjaTexto}`;
  return crear({
    parent: { database_id: DB.organizaciones },
    properties: {
      "Organización": title(d.espacio),
      "Dirección": rich(d.direccion),
      "Capacidad": num(d.capacidad),
      "Costo / día": num(d.costoDia ?? null),
      "Equipamiento AV": rich(d.equipamiento ?? ""),
      "Notas": rich(notas),
      // Valores fijos
      "Tipo": multi(["Venue"]),
      "Etapa": sel("Contactado"),
      "Disponibilidad": sel("A confirmar"),
    },
  });
}

/** Escribe la propuesta validada en la base de Notion que corresponda. */
export async function guardarEnNotion(data: Submission) {
  switch (data.via) {
    case "evento": return crearEvento(data);
    case "venue": return crearVenue(data);
  }
}
