import { notion, DB, title, rich, sel, multi, email, phone, url } from "./notion";
import { ORIGEN } from "./comunidad-schemas";
import type { ComunidadInput } from "./comunidad-schemas";

/**
 * Escribe una persona en la base 🧑‍🤝‍🧑 Comunidad.
 *
 * El email es el identificador: si la persona ya está, se ACTUALIZA su fila en
 * vez de crear una segunda. Sin esto, entre la Tech Week y los eventos que
 * vengan después la base se llenaría de duplicados y la segmentación
 * ("inversores interesados en IA") devolvería a la misma persona tres veces.
 */

type Props = Record<string, unknown>;
type CreateArg = Parameters<typeof notion.pages.create>[0];
type UpdateArg = Parameters<typeof notion.pages.update>[0];
type QueryArg = Parameters<typeof notion.databases.query>[0];

/** Un select vacío ("" = no contestó) tiene que ir como null, no como {name:""}. */
const selOpt = (v: string) => (v ? sel(v) : { select: null });

/** Los multi vacíos se omiten al actualizar: ver `propiedades`. */
const noVacio = (a: readonly string[]) => a.length > 0;

/**
 * Busca a la persona por email. Devuelve el id de la fila o null.
 * Si la query falla (permisos, red), devolvemos null y el alta sigue como
 * creación: preferimos un duplicado —que el equipo mergea— antes que perder a
 * alguien que se quiso sumar.
 */
async function buscarPorEmail(mail: string): Promise<string | null> {
  try {
    const r = await notion.databases.query({
      database_id: DB.comunidad,
      filter: { property: "Email", email: { equals: mail } },
      page_size: 1,
    } as QueryArg);
    return r.results[0]?.id ?? null;
  } catch (e) {
    console.error("[comunidad] No se pudo buscar por email, se crea fila nueva:", e);
    return null;
  }
}

/**
 * Arma las propiedades de Notion.
 *
 * `esActualizacion` cambia una regla clave: en un alta nueva se escribe todo,
 * incluso lo vacío. En una actualización se OMITE lo que llegó vacío, para que
 * quien vuelve a anotarse rápido (solo nombre, email y perfil) no borre los
 * intereses que había cargado la primera vez. Actualizar nunca destruye dato.
 */
function propiedades(d: ComunidadInput, esActualizacion: boolean): Props {
  const notas = [
    d.ref ? `Llegó por: ${d.ref}` : "",
    d.consentimientoComercial ? "Aceptó propuestas comerciales de sponsors/partners." : "",
  ].filter(Boolean).join(" · ");

  // Los consentimientos SÍ se pisan siempre, incluso si llegan en false: vale la
  // última voluntad manifestada. Si alguien vuelve a completar el formulario y
  // esta vez no marca la casilla comercial, eso es un opt-out y hay que
  // respetarlo, no conservar el "sí" de la vez anterior.
  const siempre: Props = {
    "Nombre y apellido": title(d.nombre),
    "Email": email(d.email),
    "Perfil": sel(d.perfil),
    "Consentimiento comunicaciones": { checkbox: d.consentimiento },
    "Consentimiento comercial": { checkbox: d.consentimientoComercial ?? false },
  };

  // Campos que pisan solo si vienen con algo (o si es un alta nueva).
  const opcional = (clave: string, valor: unknown, tieneContenido: boolean) =>
    !esActualizacion || tieneContenido ? { [clave]: valor } : {};

  return {
    ...siempre,
    ...opcional("WhatsApp", phone(d.whatsapp ?? ""), Boolean(d.whatsapp)),
    ...opcional("LinkedIn", url(d.linkedin || undefined), Boolean(d.linkedin)),
    ...opcional("Organización", rich(d.organizacion ?? ""), Boolean(d.organizacion)),
    ...opcional("Cargo / Rol", rich(d.cargo ?? ""), Boolean(d.cargo)),
    ...opcional("Área", selOpt(d.area ?? ""), Boolean(d.area)),
    ...opcional("Nivel", selOpt(d.nivel ?? ""), Boolean(d.nivel)),
    ...opcional("Temas de interés", multi(d.temas), noVacio(d.temas)),
    ...opcional("Qué busca", multi(d.busca), noVacio(d.busca)),
    ...opcional("Qué puede aportar", multi(d.aporta), noVacio(d.aporta)),
    ...opcional("Participación Tech Week", multi(d.participacion), noVacio(d.participacion)),
    ...opcional("Momentos", multi(d.momentos), noVacio(d.momentos)),
    ...opcional("Modalidad", selOpt(d.modalidad ?? ""), Boolean(d.modalidad)),
    ...opcional("Relación con el Hub", selOpt(d.relacionHub ?? ""), Boolean(d.relacionHub)),
    ...opcional("Cómo conoció al Hub", selOpt(d.comoConocio ?? ""), Boolean(d.comoConocio)),
    ...opcional("Qué quiere recibir", multi(d.recibir), noVacio(d.recibir)),
    ...opcional("Notas", rich(notas), Boolean(notas)),
    // Origen y Estado se sellan en el alta y no se vuelven a tocar: si el equipo
    // movió a alguien a "Contactado", un segundo envío no lo devuelve a "Nuevo".
    ...(esActualizacion ? {} : { "Origen": sel(ORIGEN), "Estado": sel("Nuevo") }),
  };
}

export type ResultadoAlta = { creado: boolean; id: string };

/** Da de alta (o actualiza) a la persona. Devuelve si fue alta nueva. */
export async function guardarPersona(d: ComunidadInput): Promise<ResultadoAlta> {
  if (!DB.comunidad) throw new Error("Falta NOTION_DB_COMUNIDAD.");

  const existente = await buscarPorEmail(d.email);

  if (existente) {
    const r = await notion.pages.update({
      page_id: existente,
      properties: propiedades(d, true),
    } as unknown as UpdateArg);
    return { creado: false, id: r.id };
  }

  const r = await notion.pages.create({
    parent: { database_id: DB.comunidad },
    properties: propiedades(d, false),
  } as unknown as CreateArg);
  return { creado: true, id: r.id };
}
