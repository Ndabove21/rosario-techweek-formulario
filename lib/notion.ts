import { Client } from "@notionhq/client";
import type { EventoInput, VenueInput, Submission } from "./schemas";

export const notion = new Client({ auth: process.env.NOTION_TOKEN });

export const DB = {
  eventos: process.env.NOTION_DB_EVENTOS ?? "",
  organizaciones: process.env.NOTION_DB_ORGANIZACIONES ?? "",
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
  // EVENTOS no tiene columnas para speakers/temáticas/financiamiento/montaje:
  // en v1 se anexan al final de "Descripción". Si el equipo crea esas propiedades,
  // se mapean como columnas propias.
  const descripcionCompleta =
    d.descripcion +
    `\n\n— Temáticas: ${d.tematicas.join(", ")}` +
    `\n— Speakers propuestos: ${d.speakers}` +
    `\n— Propuesta de valor: ${d.propuestaValor}` +
    `\n— Financiamiento: ${d.financiamiento}` +
    `\n— Necesidades de montaje: ${d.necesidades.join(", ")}`;
  return crear({
    parent: { database_id: DB.eventos },
    properties: {
      "Evento": title(d.evento),
      "Formato": sel(d.formato),
      "Pilar": sel(d.pilar),
      "Descripción": rich(descripcionCompleta),
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
