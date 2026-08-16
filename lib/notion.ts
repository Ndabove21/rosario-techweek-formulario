import { Client } from "@notionhq/client";
import { FECHA_POR_DIA, TZ_AR } from "./schemas";
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

/**
 * Arma el rango ISO para "Fecha y horario" a partir del día elegido y las horas.
 * Si el fin es menor o igual al inicio, el evento cruza la medianoche y el fin
 * cae el día siguiente (el schema solo permite ese caso si termina de madrugada).
 */
function rangoHorario(dia: keyof typeof FECHA_POR_DIA, inicio: string, fin: string) {
  const fecha = FECHA_POR_DIA[dia];
  // Mediodía UTC para que sumar un día no cruce ningún borde raro.
  const sumarUnDia = (f: string) => {
    const d = new Date(`${f}T12:00:00Z`);
    d.setUTCDate(d.getUTCDate() + 1);
    return d.toISOString().slice(0, 10);
  };
  const fechaFin = fin <= inicio ? sumarUnDia(fecha) : fecha;
  return {
    date: {
      start: `${fecha}T${inicio}:00${TZ_AR}`,
      end: `${fechaFin}T${fin}:00${TZ_AR}`,
    },
  };
}

/** Bloque aproximado a partir de la hora de inicio, para la vista de grilla. */
function bloqueDesdeHora(inicio: string): string {
  const h = Number(inicio.slice(0, 2));
  if (h < 13) return "AM (9-12)";
  if (h < 20) return "PM (17-20)";
  return "Noche (20+)";
}

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
  // El lugar propio va acá y no en la propiedad "Venue": esa es una relación a
  // 🏠 Host y vincularla exigiría crear una organización por cada propuesta, sin
  // verificar. El equipo lo lee en curaduría y lo vincula a mano si corresponde.
  const descripcionCompleta =
    d.descripcion +
    `\n\n— Temáticas: ${d.tematicas.join(", ")}` +
    (d.lugarPropio?.trim() ? `\n— Lugar propio que aporta: ${d.lugarPropio.trim()}` : "");

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
      "Día": sel(d.dia),
      // Rango real con hora: alimenta la vista 📅 Agenda del equipo.
      "Fecha y horario": rangoHorario(d.dia, d.horaInicio, d.horaFin),
      // Derivado de la hora de inicio, para ordenar la grilla semanal.
      "Bloque": sel(bloqueDesdeHora(d.horaInicio)),
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
