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

export const DIAS = ["Lun 19/10", "Mar 20/10", "Mié 21/10", "Jue 22/10", "Vie 23/10"] as const;

export const BLOQUES = ["AM (9-12)", "PM (17-20)", "Noche (20+)"] as const;

// Venue: días que puede prestar (19 al 24/10) + franja horaria
export const DIAS_VENUE = [
  "Lun 19/10", "Mar 20/10", "Mié 21/10", "Jue 22/10", "Vie 23/10", "Sáb 24/10",
] as const;

export const FRANJAS = ["AM (09:00–13:00)", "PM (17:00–20:00)", "Otro"] as const;

// Para "Sumar evento": financiamiento del evento y necesidades de montaje.
export const FINANCIAMIENTO = [
  "Autofinanciado / la organización", "Sponsors / auspiciantes", "Cobro de entrada",
  "Necesita apoyo del Hub", "A definir",
] as const;

export const NECESIDADES = [
  "Proyector", "Pantalla / TV", "Sonido / micrófono", "Mesas", "Sillas / asientos",
  "Internet / wifi", "Streaming", "Catering", "Nada, lo resuelvo yo",
] as const;

export const TEMATICAS = [
  "IA / ML", "Startups", "Software / Dev", "Producto / UX", "Inversión / VC",
  "Growth / Marketing", "Data / Analytics", "Legal / Legaltech", "Fintech",
  "Ciberseguridad", "Comunidad / Cultura", "Industria / AgTech",
] as const;

const contarPalabras = (s: string) => s.trim().split(/\s+/).filter(Boolean).length;

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
  dia: z.enum(DIAS, { errorMap: () => ({ message: "Elegí un día." }) }),
  bloque: z.enum(BLOQUES, { errorMap: () => ({ message: "Elegí un bloque." }) }),
  proponente: z.string().min(2, "¿Cómo te llamás?"),
  email: z.string().email("Email inválido."),
  whatsapp: z.string().min(6, "Poné un WhatsApp válido."),
  organizacion: z.string().optional().default(""),
  webLinkedin: z.string().url("URL inválida.").optional().or(z.literal("")),
  // El organizador propone el contenido completo del evento
  tematicas: z.array(z.enum(TEMATICAS)).min(1, "Elegí al menos una temática."),
  speakers: z.string().min(3, "Proponé al menos un speaker (nombre y de qué habla)."),
  propuestaValor: z.string().min(20, "Contanos la propuesta de valor (mín. 20 caracteres)."),
  financiamiento: z.enum(FINANCIAMIENTO, { errorMap: () => ({ message: "Elegí cómo se financia." }) }),
  necesidades: z.array(z.enum(NECESIDADES)).min(1, "Elegí qué necesitás para el montaje."),
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
