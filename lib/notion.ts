import { Client } from "@notionhq/client";
import type { EventoInput, VenueInput, SpeakerInput, Submission } from "./schemas";

export const notion = new Client({ auth: process.env.NOTION_TOKEN });

export const DB = {
  eventos: process.env.NOTION_DB_EVENTOS ?? "",
  organizaciones: process.env.NOTION_DB_ORGANIZACIONES ?? "",
  personas: process.env.NOTION_DB_PERSONAS ?? "",
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

// El typing de pages.create es muy estricto; casteamos el arg completo a su
// tipo real sin acoplarnos a rutas internas del SDK.
type CreateArg = Parameters<typeof notion.pages.create>[0];
const crear = (arg: unknown) => notion.pages.create(arg as CreateArg);

// ── Camino 1 · Evento → EVENTOS ───────────────────────────────────────────
function crearEvento(d: EventoInput) {
  return crear({
    parent: { database_id: DB.eventos },
    properties: {
      "Evento": title(d.evento),
      "Formato": sel(d.formato),
      "Pilar": sel(d.pilar),
      "Descripción": rich(d.descripcion),
      "Público objetivo": rich(d.publicoObjetivo),
      "¿Necesita venue?": sel(d.necesitaVenue),
      "Capacidad estimada": num(d.capacidad),
      "Costo para el asistente": sel(d.costo),
      "Día": sel(d.dia),
      "Bloque": sel(d.bloque),
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
}

// ── Camino 2 · Venue → ORGANIZACIONES ─────────────────────────────────────
function crearVenue(d: VenueInput) {
  const notas = `Contacto: ${d.contacto} · Email: ${d.email} · Tel: ${d.telefono}`;
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

// ── Camino 3 · Speaker → PERSONAS ─────────────────────────────────────────
function crearSpeaker(d: SpeakerInput) {
  // "Organización que representa" es una relación en Notion (no escribible simple
  // por API): en v1 se guarda como texto dentro de Bio. El equipo la vincula a mano.
  const bio = d.organizacionRepresenta
    ? `Representa a: ${d.organizacionRepresenta}. ${d.bio}`
    : d.bio;
  return crear({
    parent: { database_id: DB.personas },
    properties: {
      "Nombre": title(d.nombre),
      "Rol": rich(d.rol),
      "Bio": rich(bio),
      "Temáticas": multi(d.tematicas),
      "Email": email(d.email),
      "Teléfono": phone(d.telefono ?? ""),
      "LinkedIn": url(d.linkedin || undefined),
      // Valores fijos
      "Tipo": multi(["Speaker"]),
      "Estado": sel("Propuesto"),
    },
  });
}

/** Escribe la propuesta validada en la base de Notion que corresponda. */
export async function guardarEnNotion(data: Submission) {
  switch (data.via) {
    case "evento": return crearEvento(data);
    case "venue": return crearVenue(data);
    case "speaker": return crearSpeaker(data);
  }
}
