"use client";

import { useState } from "react";
import {
  FORMATOS, PILARES, NECESITA_VENUE, COSTOS, TEMATICAS,
  DIAS_VENUE, FRANJAS, MAX_SPEAKERS, submissionSchema,
} from "@/lib/schemas";

/** Un speaker en el estado del form (todos string: se validan al enviar). */
type Speaker = { nombre: string; rol: string; tema: string; linkedin: string };
const speakerVacio = (): Speaker => ({ nombre: "", rol: "", tema: "", linkedin: "" });

type Via = "evento" | "venue";
type Status = "idle" | "sending" | "ok" | "error";
type Errors = Record<string, string>;

const CARDS: { via: Via; n: string; titulo: string; desc: string }[] = [
  { via: "evento", n: "01", titulo: "Sumar evento", desc: "Proponé tu evento —con speakers, temática y propuesta— para el calendario oficial." },
  { via: "venue", n: "02", titulo: "Ofrecer venue", desc: "Abrí las puertas de tu espacio y recibí un evento de la semana." },
];

const inputCls =
  "w-full rounded-lg border border-white/12 bg-white/[0.03] px-3.5 py-2.5 text-[15px] text-neutral-100 outline-none transition-colors focus:border-white/40 focus:bg-white/[0.05]";

// ── Campos reutilizables ──────────────────────────────────────────────────
function Eyebrow({ n, children }: { n: string; children: React.ReactNode }) {
  return (
    <p className="mb-6 font-mono text-[11px] uppercase tracking-[0.22em] text-neutral-500">
      — {n} · {children}
    </p>
  );
}
function Lbl({ children, req }: { children: React.ReactNode; req?: boolean }) {
  return (
    <span className="mb-1.5 block text-[13px] font-medium text-neutral-300">
      {children} {req && <span className="text-neutral-500">*</span>}
    </span>
  );
}
function Err({ msg }: { msg?: string }) {
  return msg ? <p className="mt-1.5 text-xs text-red-400">{msg}</p> : null;
}
function Text({ label, val, on, err, req, type = "text", ph }: {
  label: string; val: string; on: (v: string) => void; err?: string; req?: boolean; type?: string; ph?: string;
}) {
  return (
    <label className="block">
      <Lbl req={req}>{label}</Lbl>
      <input type={type} value={val ?? ""} onChange={(e) => on(e.target.value)} placeholder={ph}
        className={inputCls} />
      <Err msg={err} />
    </label>
  );
}
function Area({ label, val, on, err, req, ph, rows = 5 }: {
  label: string; val: string; on: (v: string) => void; err?: string; req?: boolean; ph?: string; rows?: number;
}) {
  return (
    <label className="block">
      <Lbl req={req}>{label}</Lbl>
      <textarea value={val ?? ""} onChange={(e) => on(e.target.value)} rows={rows} placeholder={ph}
        className={`${inputCls} resize-y leading-relaxed`} />
      <Err msg={err} />
    </label>
  );
}
function Sel({ label, val, on, options, err, req }: {
  label: string; val: string; on: (v: string) => void; options: readonly string[]; err?: string; req?: boolean;
}) {
  return (
    <label className="block">
      <Lbl req={req}>{label}</Lbl>
      <select value={val ?? ""} onChange={(e) => on(e.target.value)} className={`${inputCls} appearance-none`}>
        <option value="" disabled>Elegí una opción…</option>
        {options.map((o) => <option key={o} value={o}>{o}</option>)}
      </select>
      <Err msg={err} />
    </label>
  );
}
function Chips({ label, values, options, onToggle, err, req }: {
  label: string; values: string[]; options: readonly string[]; onToggle: (v: string) => void; err?: string; req?: boolean;
}) {
  return (
    <div>
      <Lbl req={req}>{label}</Lbl>
      <div className="flex flex-wrap gap-2">
        {options.map((o) => {
          const active = values.includes(o);
          return (
            <button key={o} type="button" onClick={() => onToggle(o)}
              className={`rounded-full border px-3.5 py-1.5 text-[13px] transition-colors ${
                active ? "border-white bg-white text-black" : "border-white/15 text-neutral-300 hover:border-white/40"
              }`}>
              {o}
            </button>
          );
        })}
      </div>
      <Err msg={err} />
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────
export default function Page() {
  const [via, setVia] = useState<Via | null>(null);
  const [status, setStatus] = useState<Status>("idle");
  const [serverError, setServerError] = useState("");
  const [errors, setErrors] = useState<Errors>({});
  const [f, setF] = useState<Record<string, string>>({});
  const [tematicas, setTematicas] = useState<string[]>([]);
  const [diasVenue, setDiasVenue] = useState<string[]>([]);
  const [speakers, setSpeakers] = useState<Speaker[]>([]);
  const [noSoyBot, setNoSoyBot] = useState(false);
  const [website, setWebsite] = useState(""); // honeypot

  const set = (k: string) => (v: string) => {
    setF((s) => ({ ...s, [k]: v }));
    if (errors[k]) setErrors((e) => ({ ...e, [k]: "" }));
  };
  const toggleTema = (t: string) => setTematicas((s) => (s.includes(t) ? s.filter((x) => x !== t) : [...s, t]));
  const toggleDia = (t: string) => setDiasVenue((s) => (s.includes(t) ? s.filter((x) => x !== t) : [...s, t]));

  const addSpeaker = () => setSpeakers((s) => (s.length >= MAX_SPEAKERS ? s : [...s, speakerVacio()]));
  const rmSpeaker = (i: number) => setSpeakers((s) => s.filter((_, j) => j !== i));
  const setSpeaker = (i: number, k: keyof Speaker) => (v: string) => {
    setSpeakers((s) => s.map((sp, j) => (j === i ? { ...sp, [k]: v } : sp)));
    const ek = `speakers.${i}.${k}`;
    if (errors[ek]) setErrors((e) => ({ ...e, [ek]: "" }));
  };

  function choose(v: Via) {
    setF({}); setTematicas([]); setDiasVenue([]); setSpeakers([]); setErrors({}); setNoSoyBot(false); setWebsite(""); setServerError("");
    setStatus("idle"); setVia(v);
    if (typeof window !== "undefined") window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function buildPayload(v: Via): Record<string, unknown> {
    const base = { via: v, noSoyBot, website };
    if (v === "evento") return { ...base, evento: f.evento, formato: f.formato, pilar: f.pilar,
      descripcion: f.descripcion, publicoObjetivo: f.publicoObjetivo, necesitaVenue: f.necesitaVenue,
      lugarPropio: f.lugarPropio ?? "", capacidad: f.capacidad, costo: f.costo, proponente: f.proponente,
      email: f.email, whatsapp: f.whatsapp, organizacion: f.organizacion ?? "", webLinkedin: f.webLinkedin ?? "",
      tematicas, speakers, propuestaValor: f.propuestaValor };
    return { ...base, espacio: f.espacio, direccion: f.direccion, capacidad: f.capacidad,
      costoDia: f.costoDia ? f.costoDia : undefined, equipamiento: f.equipamiento ?? "", contacto: f.contacto,
      email: f.email, telefono: f.telefono, dias: diasVenue, franja: f.franja,
      franjaDesde: f.franjaDesde ?? "", franjaHasta: f.franjaHasta ?? "" };
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!via) return;
    const parsed = submissionSchema.safeParse(buildPayload(via));
    if (!parsed.success) {
      const errs: Errors = {};
      for (const issue of parsed.error.errors) {
        // path.join da "evento" para campos simples y "speakers.0.nombre" para
        // los anidados de la lista de speakers.
        const k = issue.path.join(".");
        if (k && !errs[k]) errs[k] = issue.message;
      }
      setErrors(errs);
      return;
    }
    setStatus("sending"); setServerError("");
    try {
      const res = await fetch("/api/submit", {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(parsed.data),
      });
      const json = await res.json();
      if (!res.ok || !json.ok) throw new Error(json.error || "No pudimos enviar tu propuesta.");
      setStatus("ok");
      if (typeof window !== "undefined") window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (err) {
      setStatus("error");
      setServerError(err instanceof Error ? err.message : "No pudimos enviar. Reintentá.");
    }
  }

  return (
    <main className="mx-auto flex min-h-dvh max-w-2xl flex-col px-5 py-10 md:py-16">
      {/* Header */}
      <header className="flex items-center justify-between">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="https://rosariotechweek.com/logo.svg" alt="Rosario Tech Week" className="h-16 w-auto sm:h-20" />
        <span className="font-mono text-[11px] uppercase tracking-[0.22em] text-neutral-500">Convocatoria</span>
      </header>

      <div className="flex flex-1 flex-col justify-center py-12">
        {status === "ok" ? (
          <Success />
        ) : !via ? (
          <>
            <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-neutral-500">— 00 · Es tiempo de acelerar</p>
            <h1 className="mt-5 text-4xl font-semibold tracking-tight md:text-5xl">Sumate a la Rosario Tech Week 2026</h1>
            <p className="mt-4 max-w-lg text-[15px] leading-relaxed text-neutral-400">
              Del 19 al 23 de octubre. Elegí cómo querés ser parte y contanos tu propuesta —
              el equipo la revisa en menos de 48 hs hábiles.
            </p>
            <div className="mt-10 grid gap-3">
              {CARDS.map((c) => (
                // En mobile apila (si no, las 3 columnas estrangulan el texto);
                // desde sm vuelve a la fila de siempre.
                <button key={c.via} onClick={() => choose(c.via)}
                  className="group flex flex-col items-start gap-2 rounded-xl border border-white/12 bg-white/[0.02] p-5 text-left transition-colors hover:border-white/40 hover:bg-white/[0.04] sm:flex-row sm:items-center sm:gap-5">
                  <span className="font-mono text-xs text-neutral-600">— {c.n}</span>
                  <span className="flex-1">
                    <span className="block text-lg font-medium">{c.titulo}</span>
                    <span className="mt-0.5 block text-sm text-neutral-400">{c.desc}</span>
                  </span>
                  <span className="mt-1 text-neutral-500 transition-transform group-hover:translate-x-0.5 sm:mt-0">Quiero sumarme →</span>
                </button>
              ))}
            </div>
          </>
        ) : (
          <form onSubmit={submit} noValidate>
            <button type="button" onClick={() => setVia(null)}
              className="mb-8 font-mono text-[11px] uppercase tracking-[0.2em] text-neutral-500 transition-colors hover:text-neutral-200">
              ← Volver
            </button>

            {via === "evento" && (
              <EventoFields f={f} set={set} errors={errors} tematicas={tematicas} toggleTema={toggleTema}
                speakers={speakers} addSpeaker={addSpeaker} rmSpeaker={rmSpeaker} setSpeaker={setSpeaker} />
            )}
            {via === "venue" && <VenueFields f={f} set={set} errors={errors} dias={diasVenue} toggleDia={toggleDia} />}

            {/* honeypot: invisible para humanos */}
            <input type="text" name="website" value={website} onChange={(e) => setWebsite(e.target.value)}
              tabIndex={-1} autoComplete="off" aria-hidden="true"
              className="absolute left-[-9999px] h-0 w-0 opacity-0" />

            <label className="mt-8 flex items-start gap-3">
              <input type="checkbox" checked={noSoyBot} onChange={(e) => { setNoSoyBot(e.target.checked); if (errors.noSoyBot) setErrors((x) => ({ ...x, noSoyBot: "" })); }}
                className="mt-0.5 size-4 accent-white" />
              <span className="text-sm text-neutral-400">No soy un bot y la información es real.</span>
            </label>
            <Err msg={errors.noSoyBot} />

            {status === "error" && (
              <div className="mt-6 rounded-lg border border-red-500/30 bg-red-500/5 p-4 text-sm text-red-300">
                {serverError} — revisá y reintentá; no se perdió lo que cargaste.
              </div>
            )}

            <button type="submit" disabled={status === "sending"}
              className="mt-8 inline-flex h-12 w-full items-center justify-center rounded-lg bg-white px-6 text-[15px] font-medium text-black transition-opacity hover:opacity-90 disabled:opacity-50 sm:w-auto">
              {status === "sending" ? "Enviando…" : "Enviar propuesta →"}
            </button>
          </form>
        )}
      </div>

      <footer className="mt-auto border-t border-white/10 pt-6 font-mono text-[11px] uppercase tracking-[0.14em] text-neutral-600">
        Rosario TechWeek · 2da Edición · 19–23 Octubre 2026 · Rosario, Argentina
      </footer>
    </main>
  );
}

// ── Pantalla de éxito ──────────────────────────────────────────────────────
function Success() {
  return (
    <div className="text-center">
      <div className="mx-auto flex size-12 items-center justify-center rounded-full border border-white/20 text-xl">✓</div>
      <h1 className="mt-6 text-3xl font-semibold tracking-tight">¡Gracias!</h1>
      <p className="mx-auto mt-4 max-w-md text-[15px] leading-relaxed text-neutral-400">
        Recibimos tu propuesta. El equipo la revisa en menos de 48 hs hábiles y te escribimos por email.
        <br /><br />
        Dudas: <a href="mailto:eventos@rosariotechweek.com" className="text-neutral-200 underline underline-offset-4">eventos@rosariotechweek.com</a>
      </p>
    </div>
  );
}

// ── Los 3 caminos ──────────────────────────────────────────────────────────
type FieldsProps = { f: Record<string, string>; set: (k: string) => (v: string) => void; errors: Errors };

/** Lista dinámica de speakers. Opcional: hay formatos que no llevan ninguno. */
function SpeakersBlock({ speakers, add, rm, set, errors }: {
  speakers: Speaker[]; add: () => void; rm: (i: number) => void;
  set: (i: number, k: keyof Speaker) => (v: string) => void; errors: Errors;
}) {
  return (
    <div>
      <Lbl>Speakers que proponés</Lbl>
      <p className="mb-4 text-[13px] leading-relaxed text-neutral-500">
        Opcional — si tu evento no lleva speakers (networking, after office, visita), dejalo vacío.
        Cada persona que cargues queda registrada para la curaduría.
      </p>

      {speakers.map((sp, i) => (
        <div key={i} className="mb-3 rounded-xl border border-white/12 bg-white/[0.02] p-4">
          <div className="mb-3 flex items-center justify-between">
            <span className="font-mono text-[11px] uppercase tracking-[0.2em] text-neutral-500">
              Speaker {String(i + 1).padStart(2, "0")}
            </span>
            <button type="button" onClick={() => rm(i)}
              className="text-[13px] text-neutral-500 transition-colors hover:text-red-400">
              Quitar
            </button>
          </div>
          <div className="grid gap-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <Text label="Nombre y apellido" val={sp.nombre} on={set(i, "nombre")} err={errors[`speakers.${i}.nombre`]} req ph="Juana Pérez" />
              <Text label="Rol / organización" val={sp.rol} on={set(i, "rol")} err={errors[`speakers.${i}.rol`]} ph="CTO en Acme (opcional)" />
            </div>
            <Text label="¿De qué habla?" val={sp.tema} on={set(i, "tema")} err={errors[`speakers.${i}.tema`]} req ph="IA aplicada a pymes industriales" />
            <Text label="LinkedIn" val={sp.linkedin} on={set(i, "linkedin")} err={errors[`speakers.${i}.linkedin`]} type="url" ph="linkedin.com/in/perfil (opcional)" />
          </div>
        </div>
      ))}

      {speakers.length < MAX_SPEAKERS && (
        <button type="button" onClick={add}
          className="w-full rounded-lg border border-dashed border-white/20 px-4 py-3 text-[14px] text-neutral-400 transition-colors hover:border-white/40 hover:text-neutral-200">
          + Agregar {speakers.length ? "otro " : ""}speaker
        </button>
      )}
      {speakers.length >= MAX_SPEAKERS && (
        <p className="text-[13px] text-neutral-500">Llegaste al máximo de {MAX_SPEAKERS} speakers.</p>
      )}
      <Err msg={errors.speakers} />
    </div>
  );
}

function EventoFields({ f, set, errors, tematicas, toggleTema, speakers, addSpeaker, rmSpeaker, setSpeaker }: FieldsProps & {
  tematicas: string[]; toggleTema: (v: string) => void;
  speakers: Speaker[]; addSpeaker: () => void; rmSpeaker: (i: number) => void;
  setSpeaker: (i: number, k: keyof Speaker) => (v: string) => void;
}) {
  return (
    <>
      <Eyebrow n="01">El evento</Eyebrow>
      <div className="grid gap-5">
        <Text label="Nombre del evento" val={f.evento} on={set("evento")} err={errors.evento} req ph="Ej: Panel de IA aplicada" />
        <div className="grid gap-5 sm:grid-cols-2">
          <Sel label="Formato" val={f.formato} on={set("formato")} options={FORMATOS} err={errors.formato} req />
          <Sel label="Pilar" val={f.pilar} on={set("pilar")} options={PILARES} err={errors.pilar} req />
        </div>
        <Area label="Descripción (mín. 100 palabras)" val={f.descripcion} on={set("descripcion")} err={errors.descripcion} req rows={6}
          ph="Contá de qué se trata, qué se lleva la gente, dinámica…" />
        <Text label="Público objetivo" val={f.publicoObjetivo} on={set("publicoObjetivo")} err={errors.publicoObjetivo} req ph="Ej: founders early-stage, devs, estudiantes" />
      </div>

      <div className="my-10 h-px bg-white/10" />
      <Eyebrow n="02">Contenido y speakers</Eyebrow>
      <div className="grid gap-5">
        <Chips label="Temáticas que toca el evento" values={tematicas} options={TEMATICAS} onToggle={toggleTema} err={errors.tematicas} req />
        <SpeakersBlock speakers={speakers} add={addSpeaker} rm={rmSpeaker} set={setSpeaker} errors={errors} />
        <Area label="Propuesta de valor del evento" val={f.propuestaValor} on={set("propuestaValor")} err={errors.propuestaValor} req rows={3}
          ph="¿Por qué vale la pena? ¿Qué lo hace único?" />
      </div>

      <div className="my-10 h-px bg-white/10" />
      <Eyebrow n="03">Logística</Eyebrow>
      <div className="grid gap-5">
        <Sel label="¿Tenés dónde hacerlo?" val={f.necesitaVenue} on={set("necesitaVenue")} options={NECESITA_VENUE} err={errors.necesitaVenue} req />
        {f.necesitaVenue === "Trae su propio lugar" && (
          <Text label="¿Dónde lo hacés?" val={f.lugarPropio} on={set("lugarPropio")} err={errors.lugarPropio} req
            ph="Nombre y dirección. Ej: Cowork Nodo, Córdoba 1234" />
        )}
        <p className="-mt-2 text-[13px] leading-relaxed text-neutral-500">
          Los eventos son autogestionados: vos resolvés el montaje y la producción. Si no tenés lugar,
          el Hub te asigna uno y define el día y el bloque (mañana o tarde) según la grilla.
        </p>
        <div className="grid gap-5 sm:grid-cols-2">
          <Text label="¿Cuántas personas proyectás? (lo más real posible)" val={f.capacidad} on={set("capacidad")} err={errors.capacidad} req type="number" ph="80" />
          <Sel label="Costo para el asistente" val={f.costo} on={set("costo")} options={COSTOS} err={errors.costo} req />
        </div>
      </div>

      <div className="my-10 h-px bg-white/10" />
      <Eyebrow n="04">Quién propone</Eyebrow>
      <div className="grid gap-5">
        <div className="grid gap-5 sm:grid-cols-2">
          <Text label="Nombre del proponente" val={f.proponente} on={set("proponente")} err={errors.proponente} req />
          <Text label="Organización" val={f.organizacion} on={set("organizacion")} err={errors.organizacion} ph="(opcional)" />
        </div>
        <div className="grid gap-5 sm:grid-cols-2">
          <Text label="Email" val={f.email} on={set("email")} err={errors.email} req type="email" />
          <Text label="WhatsApp" val={f.whatsapp} on={set("whatsapp")} err={errors.whatsapp} req type="tel" ph="+54 341…" />
        </div>
        <Text label="Web / LinkedIn" val={f.webLinkedin} on={set("webLinkedin")} err={errors.webLinkedin} type="url" ph="linkedin.com/in/tu-perfil (opcional)" />
      </div>
    </>
  );
}

function VenueFields({ f, set, errors, dias, toggleDia }: FieldsProps & { dias: string[]; toggleDia: (v: string) => void }) {
  return (
    <>
      <Eyebrow n="01">El espacio</Eyebrow>
      <div className="grid gap-5">
        <Text label="Nombre del espacio" val={f.espacio} on={set("espacio")} err={errors.espacio} req />
        <Text label="Dirección" val={f.direccion} on={set("direccion")} err={errors.direccion} req />
        <div className="grid gap-5 sm:grid-cols-2">
          <Text label="Capacidad (personas)" val={f.capacidad} on={set("capacidad")} err={errors.capacidad} req type="number" ph="120" />
          <Text label="Costo por día" val={f.costoDia} on={set("costoDia")} err={errors.costoDia} type="number" ph="(opcional)" />
        </div>
        <Area label="Equipamiento (proyector, sonido, etc.)" val={f.equipamiento} on={set("equipamiento")} err={errors.equipamiento} rows={3} ph="Proyector, sonido, sillas, wifi…" />
      </div>

      <div className="my-10 h-px bg-white/10" />
      <Eyebrow n="02">Disponibilidad</Eyebrow>
      <div className="grid gap-5">
        <Chips label="¿Qué días podés prestar el espacio? (19 al 24/10)" values={dias} options={DIAS_VENUE} onToggle={toggleDia} err={errors.dias} req />
        <Sel label="Franja horaria" val={f.franja} on={set("franja")} options={FRANJAS} err={errors.franja} req />
        {f.franja === "Otro" && (
          <div className="grid gap-5 sm:grid-cols-2">
            <Text label="Desde" val={f.franjaDesde} on={set("franjaDesde")} err={errors.franjaDesde} req type="time" />
            <Text label="Hasta" val={f.franjaHasta} on={set("franjaHasta")} err={errors.franjaHasta} req type="time" />
          </div>
        )}
      </div>

      <div className="my-10 h-px bg-white/10" />
      <Eyebrow n="03">Contacto</Eyebrow>
      <div className="grid gap-5">
        <Text label="Persona de contacto" val={f.contacto} on={set("contacto")} err={errors.contacto} req />
        <div className="grid gap-5 sm:grid-cols-2">
          <Text label="Email" val={f.email} on={set("email")} err={errors.email} req type="email" />
          <Text label="Teléfono" val={f.telefono} on={set("telefono")} err={errors.telefono} req type="tel" ph="+54 341…" />
        </div>
      </div>
    </>
  );
}

