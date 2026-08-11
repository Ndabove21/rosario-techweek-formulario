import { z } from "zod";

// ─────────────────────────────────────────────────────────────────────────
// Opciones (whitelist). Deben coincidir EXACTO con los `select`/`multi_select`
// de Notion (mayúsculas, tildes, barras). Se usan en el form Y en el server.
// ─────────────────────────────────────────────────────────────────────────
export const FORMATOS = [
  "Keynote", "Presentación", "Panel", "Round Table", "Workshop", "Meetup",
  "Networking", "Demo Day", "Pitch Competition", "Cena", "After Office",
  "Visita / Open House",
] as const;

export const PILARES = ["Conocimiento", "Comunidad", "Negocios"] as const;

export const NECESITA_VENUE = [
  "Trae su propio lugar", "Necesita que el Hub le asigne uno", "Es flexible",
] as const;

export const COSTOS = ["Gratuito", "Pago", "A definir"] as const;

// Nota: "Día" y "Bloque" existen como propiedades en la base EVENTOS, pero NO se
// le piden al proponente — los eventos son autogestionados y el Hub asigna la
// grilla durante la curaduría. Se cargan a mano en Notion.

// Venue: días que puede prestar (19 al 24/10) + franja horaria
export const DIAS_VENUE = [
  "Lun 19/10", "Mar 20/10", "Mié 21/10", "Jue 22/10", "Vie 23/10", "Sáb 24/10",
] as const;

export const FRANJAS = ["AM (09:00–13:00)", "PM (17:00–20:00)", "Otro"] as const;

export const TEMATICAS = [
  "IA / ML", "Startups", "Software / Dev", "Producto / UX", "Inversión / VC",
  "Growth / Marketing", "Data / Analytics", "Legal / Legaltech", "Fintech",
  "Ciberseguridad", "Comunidad / Cultura", "Industria / AgTech",
] as const;

const contarPalabras = (s: string) => s.trim().split(/\s+/).filter(Boolean).length;

/** Tope de speakers por propuesta (un panel grande no pasa de esto). */
export const MAX_SPEAKERS = 8;

/**
 * URL tolerante: la gente escribe "www.algo.com" o "linkedin.com/in/juan" sin
 * protocolo, y `z.string().url()` los rechaza. Acá se normaliza antes de validar
 * (se le antepone https://) y se guarda en Notion ya normalizada. Campo opcional:
 * vacío pasa como "".
 */
const urlTolerante = (msg: string) =>
  z.preprocess((v) => {
    const s = String(v ?? "").trim();
    if (!s) return "";
    return /^https?:\/\//i.test(s) ? s : `https://${s}`;
  }, z.union([z.literal(""), z.string().url(msg)]));

/**
 * Speaker propuesto. Cada uno se convierte en una fila de la base 🗣️ Speakers,
 * vinculada al evento. La sección es OPCIONAL: hay formatos (After Office, Cena,
 * Networking, Visita) que no llevan speakers, y obligarlos frenaba el envío.
 */
export const speakerSchema = z.object({
  nombre: z.string().min(2, "Poné nombre y apellido."),
  rol: z.string().max(200).optional().default(""),
  tema: z.string().min(3, "Contá de qué habla."),
  linkedin: urlTolerante("Revisá el LinkedIn (ej: linkedin.com/in/perfil)."),
});

// Campos anti-spam comunes a los 3 caminos
const antiSpam = {
  // honeypot: invisible para humanos, debe llegar vacío
  website: z.string().max(0).optional().default(""),
  noSoyBot: z.boolean().refine((v) => v === true, { message: "Confirmá que no sos un bot." }),
};

// ── Camino 1 · Sumar evento → base EVENTOS ──────────────────────────────
export const eventoSchema = z.object({
  via: z.literal("evento"),
  evento: z.string().min(3, "Poné el nombre del evento."),
  formato: z.enum(FORMATOS, { errorMap: () => ({ message: "Elegí un formato." }) }),
  pilar: z.enum(PILARES, { errorMap: () => ({ message: "Elegí un pilar." }) }),
  descripcion: z.string().refine((s) => contarPalabras(s) >= 100, {
    message: "La descripción debe tener al menos 100 palabras.",
  }),
  publicoObjetivo: z.string().min(3, "Contanos a quién apunta."),
  necesitaVenue: z.enum(NECESITA_VENUE, { errorMap: () => ({ message: "Elegí una opción." }) }),
  capacidad: z.coerce.number().int().positive("Poné una capacidad válida."),
  costo: z.enum(COSTOS, { errorMap: () => ({ message: "Elegí una opción." }) }),
  proponente: z.string().min(2, "¿Cómo te llamás?"),
  email: z.string().email("Email inválido."),
  whatsapp: z.string().min(6, "Poné un WhatsApp válido."),
  organizacion: z.string().optional().default(""),
  webLinkedin: urlTolerante("Revisá la dirección (ej: linkedin.com/in/tu-perfil)."),
  // El organizador propone el contenido completo del evento
  tematicas: z.array(z.enum(TEMATICAS)).min(1, "Elegí al menos una temática."),
  // Opcional: no todos los formatos llevan speakers.
  speakers: z.array(speakerSchema).max(MAX_SPEAKERS, `Máximo ${MAX_SPEAKERS} speakers.`).default([]),
  propuestaValor: z.string().min(20, "Contanos la propuesta de valor (mín. 20 caracteres)."),
  ...antiSpam,
});

// ── Camino 2 · Ofrecer venue → base ORGANIZACIONES ──────────────────────
export const venueSchema = z.object({
  via: z.literal("venue"),
  espacio: z.string().min(2, "Poné el nombre del espacio."),
  direccion: z.string().min(4, "Poné la dirección."),
  capacidad: z.coerce.number().int().positive("Poné una capacidad válida."),
  costoDia: z.coerce.number().nonnegative().optional(),
  equipamiento: z.string().optional().default(""),
  contacto: z.string().min(2, "¿Con quién nos contactamos?"),
  email: z.string().email("Email inválido."),
  telefono: z.string().min(6, "Poné un teléfono válido."),
  // disponibilidad del espacio
  dias: z.array(z.enum(DIAS_VENUE)).min(1, "Elegí al menos un día que puedas prestar el espacio."),
  franja: z.enum(FRANJAS, { errorMap: () => ({ message: "Elegí una franja horaria." }) }),
  franjaDesde: z.string().optional().default(""),
  franjaHasta: z.string().optional().default(""),
  ...antiSpam,
});

export const submissionSchema = z
  .discriminatedUnion("via", [eventoSchema, venueSchema])
  .superRefine((d, ctx) => {
    // Si la franja es "Otro", el inicio y fin son obligatorios.
    if (d.via === "venue" && d.franja === "Otro") {
      if (!d.franjaDesde) ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["franjaDesde"], message: "Indicá desde qué hora." });
      if (!d.franjaHasta) ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["franjaHasta"], message: "Indicá hasta qué hora." });
    }
  });

export type Submission = z.infer<typeof submissionSchema>;
export type EventoInput = z.infer<typeof eventoSchema>;
export type VenueInput = z.infer<typeof venueSchema>;
export type SpeakerInput = z.infer<typeof speakerSchema>;
