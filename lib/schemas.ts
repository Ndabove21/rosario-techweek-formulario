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

// Binario a propósito: o tenés lugar o no. La opción "Es flexible" existe en el
// select de Notion pero se sacó del form — no le decía nada útil a quien asigna
// venues. El equipo puede seguir usándola a mano.
export const NECESITA_VENUE = [
  "Trae su propio lugar", "Necesita que el Hub le asigne uno",
] as const;

export const COSTOS = ["Gratuito", "Pago", "A definir"] as const;

// Los 6 días de la semana (19 al 24/10 de 2026). Deben coincidir EXACTO con el
// select "Día" de la base EVENTOS.
export const DIAS = [
  "Lun 19/10", "Mar 20/10", "Mié 21/10", "Jue 22/10", "Vie 23/10", "Sáb 24/10",
] as const;

/** El venue ofrece disponibilidad sobre el mismo rango de días. */
export const DIAS_VENUE = DIAS;

/**
 * Fecha real de cada día, para escribir "Fecha y horario" en Notion y que el
 * evento aparezca en la vista 📅 Agenda. Verificado contra el calendario 2026:
 * el 19/10/2026 cae lunes y el 24/10/2026 sábado.
 */
export const FECHA_POR_DIA: Record<(typeof DIAS)[number], string> = {
  "Lun 19/10": "2026-10-19",
  "Mar 20/10": "2026-10-20",
  "Mié 21/10": "2026-10-21",
  "Jue 22/10": "2026-10-22",
  "Vie 23/10": "2026-10-23",
  "Sáb 24/10": "2026-10-24",
};

/** Argentina no tiene horario de verano: siempre UTC-03:00. */
export const TZ_AR = "-03:00";

const HORA_RE = /^([01]\d|2[0-3]):([0-5]\d)$/;

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
  // Solo si trae su propio lugar. Obligatorio en ese caso (ver superRefine).
  lugarPropio: z.string().max(300).optional().default(""),
  capacidad: z.coerce.number().int().positive("Poné una capacidad válida."),
  costo: z.enum(COSTOS, { errorMap: () => ({ message: "Elegí una opción." }) }),
  // Día y horario del evento, dentro de la semana (19 al 24/10).
  dia: z.enum(DIAS, { errorMap: () => ({ message: "Elegí el día." }) }),
  horaInicio: z.string().regex(HORA_RE, "Poné la hora de inicio (HH:MM)."),
  horaFin: z.string().regex(HORA_RE, "Poné la hora de fin (HH:MM)."),
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
    // Horario: normalmente el fin va después del inicio, pero un after office
    // puede terminar pasada la medianoche (22:00 → 01:00). Se acepta ese caso
    // solo si el fin es de madrugada; si no, es un error de carga.
    if (d.via === "evento" && HORA_RE.test(d.horaInicio) && HORA_RE.test(d.horaFin)) {
      if (d.horaFin <= d.horaInicio && d.horaFin >= "06:00") {
        ctx.addIssue({
          code: z.ZodIssueCode.custom, path: ["horaFin"],
          message: "El fin tiene que ser posterior al inicio.",
        });
      }
    }
    // Si trae su propio lugar, hay que saber cuál es.
    if (d.via === "evento" && d.necesitaVenue === "Trae su propio lugar" && !d.lugarPropio?.trim()) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom, path: ["lugarPropio"],
        message: "Decinos dónde lo hacés (nombre y dirección).",
      });
    }
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
