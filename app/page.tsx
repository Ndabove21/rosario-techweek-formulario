"use client";

import { useState } from "react";
import {
  FORMATOS, PILARES, NECESITA_VENUE, COSTOS, DIAS, BLOQUES, TEMATICAS,
  eventoSchema, venueSchema, speakerSchema,
} from "@/lib/schemas";

type Via = "evento" | "venue" | "speaker";
type Status = "idle" | "sending" | "ok" | "error";
type Errors = Record<string, string>;

const CARDS: { via: Via; n: string; titulo: string; desc: string }[] = [
  { via: "evento", n: "01", titulo: "Sumar evento", desc: "Agregá tu propio evento al calendario oficial de la TechWeek." },
  { via: "venue", n: "02", titulo: "Ofrecer venue", desc: "Abrí las puertas de tu espacio y recibí un evento de la semana." },
  { via: "speaker", n: "03", titulo: "Ser speaker", desc: "Compartí tu conocimiento con la comunidad en charlas y paneles." },
];

const SCHEMAS = { evento: eventoSchema, venue: venueSchema, speaker: speakerSchema };

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
  const [noSoyBot, setNoSoyBot] = useState(false);
  const [website, setWebsite] = useState(""); // honeypot

  const set = (k: string) => (v: string) => {
    setF((s) => ({ ...s, [k]: v }));
    if (errors[k]) setErrors((e) => ({ ...e, [k]: "" }));
  };
  const toggleTema = (t: string) => setTematicas((s) => (s.includes(t) ? s.filter((x) => x !== t) : [...s, t]));

  function choose(v: Via) {
    setF({}); setTematicas([]); setErrors({}); setNoSoyBot(false); setWebsite(""); setServerError("");
    setStatus("idle"); setVia(v);
    if (typeof window !== "undefined") window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function buildPayload(v: Via): Record<string, unknown> {
    const base = { via: v, noSoyBot, website };
    if (v === "evento") return { ...base, evento: f.evento, formato: f.formato, pilar: f.pilar,
      descripcion: f.descripcion, publicoObjetivo: f.publicoObjetivo, necesitaVenue: f.necesitaVenue,
      capacidad: f.capacidad, costo: f.costo, dia: f.dia, bloque: f.bloque, proponente: f.proponente,
      email: f.email, whatsapp: f.whatsapp, organizacion: f.organizacion ?? "", webLinkedin: f.webLinkedin ?? "" };
    if (v === "venue") return { ...base, espacio: f.espacio, direccion: f.direccion, capacidad: f.capacidad,
      costoDia: f.costoDia ? f.costoDia : undefined, equipamiento: f.equipamiento ?? "", contacto: f.contacto,
      email: f.email, telefono: f.telefono };
    return { ...base, nombre: f.nombre, rol: f.rol, organizacionRepresenta: f.organizacionRepresenta ?? "",
      bio: f.bio, tematicas, email: f.email, telefono: f.telefono ?? "", linkedin: f.linkedin ?? "" };
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!via) return;
    const parsed = SCHEMAS[via].safeParse(buildPayload(via));
    if (!parsed.success) {
      const errs: Errors = {};
      for (const issue of parsed.error.errors) {
        const k = String(issue.path[0] ?? "");
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
        <img src="https://rosariotechweek.com/logo.svg" alt="Rosario Tech Week" className="h-7 w-auto" />
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
                <button key={c.via} onClick={() => choose(c.via)}
                  className="group flex items-center gap-5 rounded-xl border border-white/12 bg-white/[0.02] p-5 text-left transition-colors hover:border-white/40 hover:bg-white/[0.04]">
                  <span className="font-mono text-xs text-neutral-600">— {c.n}</span>
                  <span className="flex-1">
                    <span className="block text-lg font-medium">{c.titulo}</span>
                    <span className="mt-0.5 block text-sm text-neutral-400">{c.desc}</span>
                  </span>
                  <span className="text-neutral-500 transition-transform group-hover:translate-x-0.5">Quiero sumarme →</span>
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

            {via === "evento" && <EventoFields f={f} set={set} errors={errors} />}
            {via === "venue" && <VenueFields f={f} set={set} errors={errors} />}
            {via === "speaker" && (
              <SpeakerFields f={f} set={set} errors={errors} tematicas={tematicas} toggleTema={toggleTema} />
            )}

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

function EventoFields({ f, set, errors }: FieldsProps) {
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
          ph="Contá de qué se trata, qué se lleva la gente, dinámica, invitados…" />
        <Text label="Público objetivo" val={f.publicoObjetivo} on={set("publicoObjetivo")} err={errors.publicoObjetivo} req ph="Ej: founders early-stage, devs, estudiantes" />
      </div>

      <div className="my-10 h-px bg-white/10" />
      <Eyebrow n="02">Logística</Eyebrow>
      <div className="grid gap-5">
        <Sel label="¿Necesita venue?" val={f.necesitaVenue} on={set("necesitaVenue")} options={NECESITA_VENUE} err={errors.necesitaVenue} req />
        <div className="grid gap-5 sm:grid-cols-2">
          <Text label="Capacidad estimada" val={f.capacidad} on={set("capacidad")} err={errors.capacidad} req type="number" ph="80" />
          <Sel label="Costo para el asistente" val={f.costo} on={set("costo")} options={COSTOS} err={errors.costo} req />
        </div>
        <div className="grid gap-5 sm:grid-cols-2">
          <Sel label="Día preferido" val={f.dia} on={set("dia")} options={DIAS} err={errors.dia} req />
          <Sel label="Bloque preferido" val={f.bloque} on={set("bloque")} options={BLOQUES} err={errors.bloque} req />
        </div>
      </div>

      <div className="my-10 h-px bg-white/10" />
      <Eyebrow n="03">Quién propone</Eyebrow>
      <div className="grid gap-5">
        <div className="grid gap-5 sm:grid-cols-2">
          <Text label="Nombre del proponente" val={f.proponente} on={set("proponente")} err={errors.proponente} req />
          <Text label="Organización" val={f.organizacion} on={set("organizacion")} err={errors.organizacion} ph="(opcional)" />
        </div>
        <div className="grid gap-5 sm:grid-cols-2">
          <Text label="Email" val={f.email} on={set("email")} err={errors.email} req type="email" />
          <Text label="WhatsApp" val={f.whatsapp} on={set("whatsapp")} err={errors.whatsapp} req type="tel" ph="+54 341…" />
        </div>
        <Text label="Web / LinkedIn" val={f.webLinkedin} on={set("webLinkedin")} err={errors.webLinkedin} type="url" ph="https://… (opcional)" />
      </div>
    </>
  );
}

function VenueFields({ f, set, errors }: FieldsProps) {
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
      <Eyebrow n="02">Contacto</Eyebrow>
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

function SpeakerFields({ f, set, errors, tematicas, toggleTema }: FieldsProps & { tematicas: string[]; toggleTema: (v: string) => void }) {
  return (
    <>
      <Eyebrow n="01">Vos</Eyebrow>
      <div className="grid gap-5">
        <div className="grid gap-5 sm:grid-cols-2">
          <Text label="Nombre y apellido" val={f.nombre} on={set("nombre")} err={errors.nombre} req />
          <Text label="Cargo / rol" val={f.rol} on={set("rol")} err={errors.rol} req ph="Ej: CTO, Founder, Data Lead" />
        </div>
        <Text label="Organización que representás" val={f.organizacionRepresenta} on={set("organizacionRepresenta")} err={errors.organizacionRepresenta} ph="(opcional)" />
        <Area label="Bio" val={f.bio} on={set("bio")} err={errors.bio} req rows={4} ph="Contá brevemente tu recorrido y de qué podés hablar." />
      </div>

      <div className="my-10 h-px bg-white/10" />
      <Eyebrow n="02">Temáticas</Eyebrow>
      <Chips label="¿De qué podés hablar? (elegí las que apliquen)" values={tematicas} options={TEMATICAS} onToggle={toggleTema} err={errors.tematicas} req />

      <div className="my-10 h-px bg-white/10" />
      <Eyebrow n="03">Contacto</Eyebrow>
      <div className="grid gap-5">
        <div className="grid gap-5 sm:grid-cols-2">
          <Text label="Email" val={f.email} on={set("email")} err={errors.email} req type="email" />
          <Text label="Teléfono" val={f.telefono} on={set("telefono")} err={errors.telefono} type="tel" ph="(opcional)" />
        </div>
        <Text label="LinkedIn" val={f.linkedin} on={set("linkedin")} err={errors.linkedin} type="url" ph="https://linkedin.com/in/… (opcional)" />
      </div>
    </>
  );
}
