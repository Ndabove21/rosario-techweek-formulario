import { z } from "zod";

/**
 * Formulario "Sumate a la Comunidad" → base 🧑‍🤝‍🧑 Comunidad de Notion.
 *
 * La Tech Week es el motivo de entrada; el activo que se construye es la
 * comunidad del Rosario Innovation Hub. Por eso el formulario no pregunta por
 * un evento sino por la persona: quién es, qué busca y qué puede aportar.
 *
 * Los valores de acá tienen que coincidir EXACTO con los select/multi_select de
 * la base (tildes y barras incluidas) o la API de Notion tira 400 y se pierde el
 * alta. Los emojis del diseño NO se guardan: viven en EMOJI, solo para render.
 */

export const PERFILES = [
  "Profesional", "Estudiante", "Emprendedor/a", "Empresario/a / Founder",
  "Ejecutivo/a", "Inversor/a", "Docente / Investigador/a",
  "Representante institucional", "Miembro de una comunidad", "Freelancer",
  "Busco oportunidades laborales", "Otro",
] as const;

export const AREAS = [
  "Tecnología", "IA / Data", "Producto", "Marketing", "Ventas", "Finanzas",
  "RRHH / Talento", "Operaciones", "Innovación", "Emprendimiento", "Educación",
  "Investigación", "Gobierno", "Otro",
] as const;

export const NIVELES = [
  "Estudiante", "Junior", "Semi Senior", "Senior", "Manager / Lead",
  "Director / C-Level", "Founder", "Otro",
] as const;

export const TEMAS = [
  "Inteligencia Artificial", "Software", "Data", "Ciberseguridad", "Startups",
  "Emprendimiento", "Innovación", "Producto", "Marketing", "Ventas", "Finanzas",
  "Inversión", "Tecnología aplicada a empresas", "Gaming", "Agtech", "Insurtech",
  "Fintech", "Industria", "Educación", "Talento / Empleo", "Networking", "Otro",
] as const;

export const BUSCA = [
  "Oportunidades laborales", "Nuevos contactos", "Socios / co-founders",
  "Inversión", "Talento", "Clientes", "Conocimiento", "Capacitación",
  "Ideas / inspiración", "Vinculación con universidades",
  "Vinculación con startups", "Vinculación con empresas",
  "Oportunidades internacionales", "Otro",
] as const;

export const APORTA = [
  "Conocimiento", "Experiencia", "Mentoring", "Contactos", "Tecnología",
  "Talento", "Inversión", "Infraestructura", "Oportunidades laborales",
  "Proyectos", "Capacitación", "Charlas / Workshops", "Otro",
] as const;

export const PARTICIPACION = [
  "Como speaker", "Como workshop / capacitador", "Como participante",
  "Representando a mi empresa", "Representando a mi startup", "Como inversor",
  "Como sponsor / partner", "Como voluntario", "Generando contenido", "Otro",
] as const;

export const MOMENTOS = ["Mañana", "Tarde", "Noche", "Fin de semana"] as const;
export const MODALIDADES = ["Presencial", "Online", "Ambas"] as const;
export const RELACION_HUB = ["Sí", "No", "No estoy seguro/a"] as const;
export const COMO_CONOCIO = [
  "Evento", "Universidad", "Empresa", "Redes sociales", "Recomendación",
  "Comunidad", "Otro",
] as const;

export const RECIBIR = [
  "Agenda de eventos", "Oportunidades", "Empleo / talento",
  "Cursos / capacitaciones", "Networking", "Startups", "Inversión",
  "Noticias del ecosistema", "Contenido sobre tecnología",
] as const;

/**
 * Emojis del diseño. Se muestran en el form pero NO se guardan en Notion:
 * un `multi_select` con emoji en el nombre es un infierno para filtrar, para
 * exportar a CSV y para cruzar con cualquier otra herramienta.
 */
export const EMOJI: Record<string, string> = {
  // Perfil
  "Profesional": "👨‍💻", "Estudiante": "🎓", "Emprendedor/a": "🚀",
  "Empresario/a / Founder": "🏢", "Ejecutivo/a": "💼", "Inversor/a": "💰",
  "Docente / Investigador/a": "🧑‍🏫", "Representante institucional": "🏛️",
  "Miembro de una comunidad": "🤝", "Freelancer": "💻",
  "Busco oportunidades laborales": "🧑‍💼",
  // Qué busca
  "Oportunidades laborales": "💼", "Nuevos contactos": "🤝",
  "Socios / co-founders": "🚀", "Talento": "🧑‍💻", "Clientes": "🏢",
  "Conocimiento": "🧠", "Capacitación": "🎓", "Ideas / inspiración": "💡",
  "Vinculación con universidades": "🏫", "Vinculación con startups": "🚀",
  "Vinculación con empresas": "🏢", "Oportunidades internacionales": "🌎",
  // Participación
  "Como speaker": "🎤", "Como workshop / capacitador": "🧑‍🏫",
  "Como participante": "🤝", "Representando a mi empresa": "🏢",
  "Representando a mi startup": "🚀", "Como inversor": "💰",
  "Como sponsor / partner": "🤝", "Como voluntario": "🧑‍💻",
  "Generando contenido": "📸",
  // Qué querés recibir
  "Agenda de eventos": "📅", "Oportunidades": "🚀", "Empleo / talento": "💼",
  "Cursos / capacitaciones": "🎓", "Networking": "🤝", "Startups": "🚀",
  "Inversión": "💰", "Noticias del ecosistema": "📰",
  "Contenido sobre tecnología": "🧠",
};

/** Etiqueta con emoji para el front. En Notion se guarda el valor pelado. */
export const conEmoji = (v: string) => (EMOJI[v] ? `${EMOJI[v]} ${v}` : v);

/**
 * Tope de temas. Con 22 opciones, quien marca 15 no está diciendo nada: la
 * segmentación se vuelve ruido. El front deshabilita las opciones restantes al
 * llegar al tope, así nadie se entera recién al apretar "Enviar".
 */
export const MAX_TEMAS = 8;

/** Todo el que entra por este formulario queda marcado con este origen. */
export const ORIGEN = "Rosario Tech Week 2026";

/** Fechas de la semana, para el copy del form. */
export const TECH_WEEK = "19 al 24 de octubre de 2026";

/**
 * URL tolerante para LinkedIn: la gente escribe "linkedin.com/in/juan" sin
 * protocolo y `z.string().url()` lo rechaza. Se normaliza antes de validar y se
 * guarda ya normalizada. Vacío pasa como "".
 */
const urlTolerante = (msg: string) =>
  z.preprocess((v) => {
    const s = String(v ?? "").trim();
    if (!s) return "";
    return /^https?:\/\//i.test(s) ? s : `https://${s}`;
  }, z.union([z.literal(""), z.string().url(msg)]));

/** Select opcional: "" es una respuesta válida (no contestó). */
const selOpcional = <T extends readonly [string, ...string[]]>(opciones: T) =>
  z.union([z.literal(""), z.enum(opciones)]).optional().default("");

export const comunidadSchema = z
  .object({
    // ── 01 · Quién sos ──────────────────────────────────────────────────
    nombre: z.string().min(2, "Poné tu nombre y apellido."),
    // El email es el identificador de la persona en el CRM del Hub: si ya
    // existe, el alta actualiza esa fila en vez de duplicarla.
    email: z.string().trim().toLowerCase().email("Revisá el email."),
    whatsapp: z.string().optional().default(""),
    linkedin: urlTolerante("Revisá el LinkedIn (ej: linkedin.com/in/tu-perfil)."),
    perfil: z.enum(PERFILES, { errorMap: () => ({ message: "Elegí el perfil que mejor te describe." }) }),

    // ── 02 · Qué hacés (todo opcional: enriquece, no traba) ─────────────
    organizacion: z.string().max(200).optional().default(""),
    cargo: z.string().max(200).optional().default(""),
    area: selOpcional(AREAS),
    nivel: selOpcional(NIVELES),

    // ── 03 · Qué te interesa / buscás / aportás ─────────────────────────
    temas: z
      .array(z.enum(TEMAS))
      .min(1, "Elegí al menos un tema.")
      .max(MAX_TEMAS, `Elegí hasta ${MAX_TEMAS} temas, los que más te representen.`),
    busca: z.array(z.enum(BUSCA)).min(1, "Contanos qué estás buscando."),
    aporta: z.array(z.enum(APORTA)).min(1, "Contanos qué podés aportar."),

    // ── 04 · Tech Week (opcional) ───────────────────────────────────────
    participacion: z.array(z.enum(PARTICIPACION)).default([]),
    momentos: z.array(z.enum(MOMENTOS)).default([]),
    modalidad: selOpcional(MODALIDADES),

    // ── 05 · Relación con el Hub (opcional) ─────────────────────────────
    relacionHub: selOpcional(RELACION_HUB),
    comoConocio: selOpcional(COMO_CONOCIO),

    // ── 06 · Comunicación y consentimiento ──────────────────────────────
    recibir: z.array(z.enum(RECIBIR)).default([]),
    /**
     * Consentimiento para las comunicaciones del Hub. Obligatorio porque es el
     * objeto mismo del formulario: sumarse a la comunidad ES aceptar que te
     * escriban. Lo comercial va aparte y es libre — mezclarlos invalidaría el
     * consentimiento (Ley 25.326).
     */
    consentimiento: z.boolean().refine((v) => v === true, {
      message: "Necesitamos tu OK para sumarte a la comunidad.",
    }),
    consentimientoComercial: z.boolean().optional().default(false),

    /** De dónde vino el link (?ref=qr-stand, ?ref=instagram…). Se guarda en Notas. */
    ref: z.string().max(80).optional().default(""),

    // Anti-spam: honeypot invisible + confirmación explícita.
    website: z.string().max(0).optional().default(""),
    noSoyBot: z.boolean().refine((v) => v === true, { message: "Confirmá que no sos un bot." }),
  })
  .superRefine((d, ctx) => {
    // "¿Cómo conociste al Hub?" solo tiene sentido si ya participó de algo.
    if (d.relacionHub === "Sí" && !d.comoConocio) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["comoConocio"],
        message: "Contanos cómo llegaste al Hub.",
      });
    }
  });

export type ComunidadInput = z.infer<typeof comunidadSchema>;
