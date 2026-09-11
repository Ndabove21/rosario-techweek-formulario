"use client";

import { useEffect, useState } from "react";
import {
  PERFILES, AREAS, NIVELES, TEMAS, BUSCA, APORTA, PARTICIPACION,
  MOMENTOS, MODALIDADES, RELACION_HUB, COMO_CONOCIO, RECIBIR,
  MAX_TEMAS, TECH_WEEK, conEmoji, comunidadSchema,
} from "@/lib/comunidad-schemas";
import { Eyebrow, Text, Sel, Chips, Check } from "@/components/campos";

/**
 * "Sumate a la Comunidad" — el alta de personas del Rosario Innovation Hub.
 *
 * La Tech Week es el motivo de entrada, no el objeto del formulario: por eso no
 * se llama "Formulario Tech Week" ni pregunta por un evento. Pregunta por la
 * persona, para poder vincularla después (quien busca talento con quien lo
 * ofrece, startups con inversores, estudiantes con empresas que contratan).
 *
 * Regla de diseño: 7 campos obligatorios, el resto opcional y claramente
 * marcado como tal. Tiene que poder completarse en dos minutos.
 */

type Status = "idle" | "sending" | "ok" | "error";
type Errors = Record<string, string>;

export default function ComunidadPage() {
  const [status, setStatus] = useState<Status>("idle");
  const [yaEstaba, setYaEstaba] = useState(false);
  const [serverError, setServerError] = useState("");
  const [errors, setErrors] = useState<Errors>({});
  const [f, setF] = useState<Record<string, string>>({});
  const [temas, setTemas] = useState<string[]>([]);
  const [busca, setBusca] = useState<string[]>([]);
  const [aporta, setAporta] = useState<string[]>([]);
  const [participacion, setParticipacion] = useState<string[]>([]);
  const [momentos, setMomentos] = useState<string[]>([]);
  const [recibir, setRecibir] = useState<string[]>([]);
  const [consentimiento, setConsentimiento] = useState(false);
  const [comercial, setComercial] = useState(false);
  const [noSoyBot, setNoSoyBot] = useState(false);
  const [website, setWebsite] = useState(""); // honeypot
  const [ref, setRef] = useState("");
  // Los campos secundarios arrancan plegados: la primera impresión del form es
  // corta. Quien quiera dar más contexto lo abre.
  const [ampliar, setAmpliar] = useState(false);
  /** Cuenta los intentos fallidos. Solo sirve para disparar el scroll al error. */
  const [fallo, setFallo] = useState(0);

  /**
   * De dónde vino la persona: ?ref=qr-stand, ?ref=instagram, ?ref=universidad.
   * Se guarda en las Notas de Notion y es lo único que después permite saber
   * qué canal trajo gente de verdad y cuál solo hizo ruido.
   */
  useEffect(() => {
    const v = new URLSearchParams(window.location.search).get("ref");
    if (v) setRef(v.slice(0, 80));
  }, []);

  // Después de un envío rechazado, llevar la pantalla al primer campo en rojo.
  useEffect(() => {
    if (!fallo) return;
    document
      .querySelector<HTMLElement>("[data-error='1']")
      ?.scrollIntoView({ behavior: "smooth", block: "center" });
  }, [fallo]);

  const set = (k: string) => (v: string) => {
    setF((s) => ({ ...s, [k]: v }));
    if (errors[k]) setErrors((e) => ({ ...e, [k]: "" }));
  };

  /** Toggle de multi-select que además limpia el error del campo. */
  const toggler =
    (clave: string, set: React.Dispatch<React.SetStateAction<string[]>>) => (v: string) => {
      set((s) => (s.includes(v) ? s.filter((x) => x !== v) : [...s, v]));
      if (errors[clave]) setErrors((e) => ({ ...e, [clave]: "" }));
    };

  const todoRecibir = recibir.length === RECIBIR.length;

  function payload() {
    return {
      nombre: f.nombre ?? "", email: f.email ?? "", whatsapp: f.whatsapp ?? "",
      linkedin: f.linkedin ?? "", perfil: f.perfil ?? "",
      organizacion: f.organizacion ?? "", cargo: f.cargo ?? "",
      area: f.area ?? "", nivel: f.nivel ?? "",
      temas, busca, aporta, participacion, momentos,
      modalidad: f.modalidad ?? "",
      relacionHub: f.relacionHub ?? "", comoConocio: f.comoConocio ?? "",
      recibir, consentimiento, consentimientoComercial: comercial,
      ref, website, noSoyBot,
    };
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const parsed = comunidadSchema.safeParse(payload());
    if (!parsed.success) {
      const errs: Errors = {};
      for (const issue of parsed.error.errors) {
        const k = issue.path.join(".");
        if (k && !errs[k]) errs[k] = issue.message;
      }
      setErrors(errs);
      // Si el error está en la parte plegada, abrirla: si no, el formulario se
      // niega a enviar señalando un campo que la persona no puede ver.
      const secundarios = ["organizacion", "cargo", "area", "nivel", "modalidad", "relacionHub", "comoConocio"];
      if (Object.keys(errs).some((k) => secundarios.includes(k))) setAmpliar(true);
      // El scroll al primer error lo hace el efecto de abajo: acá el DOM todavía
      // no tiene los data-error de este intento.
      setFallo((n) => n + 1);
      return;
    }

    setStatus("sending");
    setServerError("");
    try {
      const res = await fetch("/api/comunidad", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(parsed.data),
      });
      const json = await res.json();
      if (!res.ok || !json.ok) throw new Error(json.error || "No pudimos guardar tus datos.");
      setYaEstaba(json.creado === false);
      setStatus("ok");
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (err) {
      setStatus("error");
      setServerError(err instanceof Error ? err.message : "No pudimos enviar. Reintentá.");
    }
  }

  return (
    <main className="mx-auto flex min-h-dvh max-w-2xl flex-col px-5 py-10 md:py-16">
      <header className="flex items-center justify-between">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="https://rosariotechweek.com/logo.svg" alt="Rosario Tech Week" className="h-16 w-auto sm:h-20" />
        <span className="font-mono text-[11px] uppercase tracking-[0.22em] text-neutral-500">Comunidad</span>
      </header>

      <div className="flex flex-1 flex-col justify-center py-12">
        {status === "ok" ? (
          <Listo yaEstaba={yaEstaba} />
        ) : (
          <>
            <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-neutral-500">
              — 00 · Rosario Innovation Hub
            </p>
            <h1 className="mt-5 text-4xl font-semibold tracking-tight md:text-5xl">
              Sumate a la Comunidad
            </h1>
            <p className="mt-4 max-w-lg text-[15px] leading-relaxed text-neutral-400">
              Empezamos por la Rosario Tech Week ({TECH_WEEK}), pero esto no termina ahí:
              vas a recibir los eventos, oportunidades, capacitaciones y propuestas de
              vinculación del ecosistema durante todo el año. Son dos minutos.
            </p>
            <p className="mt-3 max-w-lg text-[14px] leading-relaxed text-neutral-500">
              Cuanto mejor nos cuentes qué buscás y qué podés aportar, mejor podemos
              conectarte con la persona correcta.
            </p>

            <form onSubmit={submit} noValidate className="mt-12 grid gap-14">
              {/* ── 01 · Quién sos ─────────────────────────────────────── */}
              <section>
                <Eyebrow n="01">Quién sos</Eyebrow>
                <div className="grid gap-5">
                  <Campo err={errors.nombre}>
                    <Text label="Nombre y apellido" req val={f.nombre} on={set("nombre")}
                      err={errors.nombre} ph="Cómo te presentás" />
                  </Campo>
                  <Campo err={errors.email}>
                    <Text label="Email" req type="email" val={f.email} on={set("email")}
                      err={errors.email} ph="tu@email.com" />
                  </Campo>
                  <div className="grid gap-5 sm:grid-cols-2">
                    <Text label="WhatsApp" type="tel" val={f.whatsapp} on={set("whatsapp")}
                      err={errors.whatsapp} ph="+54 341 ..." />
                    <Text label="LinkedIn" val={f.linkedin} on={set("linkedin")}
                      err={errors.linkedin} ph="linkedin.com/in/tu-perfil" />
                  </div>
                  <Campo err={errors.perfil}>
                    <Sel label="¿Cuál describe mejor tu perfil?" req val={f.perfil} on={set("perfil")}
                      options={PERFILES} render={conEmoji} err={errors.perfil}
                      placeholder="Elegí tu perfil…" />
                  </Campo>
                </div>
              </section>

              {/* ── 02 · Qué te interesa ──────────────────────────────── */}
              <section>
                <Eyebrow n="02">Qué te interesa</Eyebrow>
                <Campo err={errors.temas}>
                  <Chips label="Temas que te interesan" req values={temas} options={TEMAS}
                    onToggle={toggler("temas", setTemas)} err={errors.temas} max={MAX_TEMAS}
                    hint={`Elegí hasta ${MAX_TEMAS}, los que más te representen.`} />
                </Campo>
              </section>

              {/* ── 03 · Qué buscás ───────────────────────────────────── */}
              <section>
                <Eyebrow n="03">Qué buscás</Eyebrow>
                <Campo err={errors.busca}>
                  <Chips label="¿Qué te gustaría encontrar?" req values={busca} options={BUSCA}
                    onToggle={toggler("busca", setBusca)} err={errors.busca} render={conEmoji}
                    hint="Con esto te conectamos con quien tenga lo que buscás." />
                </Campo>
              </section>

              {/* ── 04 · Qué aportás ──────────────────────────────────── */}
              <section>
                <Eyebrow n="04">Qué podés aportar</Eyebrow>
                <Campo err={errors.aporta}>
                  <Chips label="¿Qué podrías aportarle a la comunidad?" req values={aporta}
                    options={APORTA} onToggle={toggler("aporta", setAporta)} err={errors.aporta}
                    hint="Todos tenemos algo. Esto es lo que hace que la comunidad funcione en las dos direcciones." />
                </Campo>
              </section>

              {/* ── 05 · Tech Week ────────────────────────────────────── */}
              <section>
                <Eyebrow n="05">Tech Week</Eyebrow>
                <div className="grid gap-8">
                  <Chips label="¿Cómo te gustaría participar?" values={participacion}
                    options={PARTICIPACION} onToggle={toggler("participacion", setParticipacion)}
                    render={conEmoji}
                    hint="Opcional. Si te interesa dar una charla o sumar a tu empresa, este es el lugar para decirlo." />
                  <Chips label="¿Qué momentos te vienen mejor?" values={momentos} options={MOMENTOS}
                    onToggle={toggler("momentos", setMomentos)} />
                </div>
              </section>

              {/* ── 06 · Qué querés recibir ───────────────────────────── */}
              <section>
                <Eyebrow n="06">Qué querés recibir</Eyebrow>
                <Chips label="Del Rosario Innovation Hub" values={recibir} options={RECIBIR}
                  onToggle={toggler("recibir", setRecibir)} render={conEmoji}
                  hint="Opcional. Si no elegís nada, te mandamos lo esencial." />
                <button type="button"
                  onClick={() => setRecibir(todoRecibir ? [] : [...RECIBIR])}
                  className="mt-3 font-mono text-[11px] uppercase tracking-[0.2em] text-neutral-500 transition-colors hover:text-neutral-200">
                  {todoRecibir ? "Limpiar selección" : "Quiero todo →"}
                </button>
              </section>

              {/* ── Ampliar: lo opcional, plegado ─────────────────────── */}
              <section>
                <button type="button" onClick={() => setAmpliar((v) => !v)}
                  className="flex w-full items-center justify-between rounded-xl border border-white/12 bg-white/[0.02] px-5 py-4 text-left transition-colors hover:border-white/30">
                  <span>
                    <span className="block text-[15px] font-medium text-neutral-200">
                      Contanos un poco más
                    </span>
                    <span className="mt-0.5 block text-[13px] text-neutral-500">
                      Opcional — dónde trabajás, tu nivel y tu relación con el Hub.
                    </span>
                  </span>
                  <span className="ml-4 shrink-0 text-neutral-500">{ampliar ? "−" : "+"}</span>
                </button>

                {ampliar && (
                  <div className="mt-6 grid gap-8">
                    <div className="grid gap-5">
                      <div className="grid gap-5 sm:grid-cols-2">
                        <Text label="Organización / Empresa / Universidad" val={f.organizacion}
                          on={set("organizacion")} err={errors.organizacion} />
                        <Text label="Cargo / Rol" val={f.cargo} on={set("cargo")} err={errors.cargo} />
                      </div>
                      <div className="grid gap-5 sm:grid-cols-2">
                        <Sel label="Área" val={f.area} on={set("area")} options={AREAS} err={errors.area} />
                        <Sel label="¿En qué nivel estás?" val={f.nivel} on={set("nivel")}
                          options={NIVELES} err={errors.nivel} />
                      </div>
                      <Sel label="¿Preferís presencial u online?" val={f.modalidad}
                        on={set("modalidad")} options={MODALIDADES} err={errors.modalidad} />
                    </div>

                    <div className="grid gap-5">
                      <Sel label="¿Ya participaste de alguna actividad del Hub?" val={f.relacionHub}
                        on={set("relacionHub")} options={RELACION_HUB} err={errors.relacionHub} />
                      {/* Solo tiene sentido si ya participó de algo. */}
                      {f.relacionHub === "Sí" && (
                        <Campo err={errors.comoConocio}>
                          <Sel label="¿Cómo conociste al Hub?" req val={f.comoConocio}
                            on={set("comoConocio")} options={COMO_CONOCIO} err={errors.comoConocio} />
                        </Campo>
                      )}
                    </div>
                  </div>
                )}
              </section>

              {/* ── Consentimiento ───────────────────────────────────── */}
              <section>
                <Eyebrow n="07">Para terminar</Eyebrow>
                <div className="grid gap-4 rounded-xl border border-white/12 bg-white/[0.02] p-5">
                  <Campo err={errors.consentimiento}>
                    <Check checked={consentimiento} on={(v) => {
                      setConsentimiento(v);
                      if (errors.consentimiento) setErrors((e) => ({ ...e, consentimiento: "" }));
                    }} err={errors.consentimiento}>
                      Quiero recibir comunicaciones del Rosario Innovation Hub sobre eventos,
                      oportunidades, contenidos y actividades de la comunidad. <span className="text-neutral-500">*</span>
                    </Check>
                  </Campo>
                  {/* Consentimiento comercial SEPARADO y opcional: mezclarlo con el
                      anterior invalidaría los dos (Ley 25.326). */}
                  <Check checked={comercial} on={setComercial}>
                    También acepto recibir propuestas comerciales de sponsors y partners del Hub.
                  </Check>
                  <div className="h-px bg-white/8" />
                  <Campo err={errors.noSoyBot}>
                    <Check checked={noSoyBot} on={(v) => {
                      setNoSoyBot(v);
                      if (errors.noSoyBot) setErrors((e) => ({ ...e, noSoyBot: "" }));
                    }} err={errors.noSoyBot}>
                      Confirmo que soy una persona real. <span className="text-neutral-500">*</span>
                    </Check>
                  </Campo>
                </div>

                {/* Honeypot: invisible para humanos, los bots lo completan. */}
                <div aria-hidden className="absolute left-[-9999px] h-0 w-0 overflow-hidden">
                  <label>
                    No completar
                    <input type="text" tabIndex={-1} autoComplete="off" value={website}
                      onChange={(e) => setWebsite(e.target.value)} />
                  </label>
                </div>

                <p className="mt-4 text-xs leading-relaxed text-neutral-600">
                  Tus datos los usa el Rosario Innovation Hub para conectarte con el
                  ecosistema. No se venden ni se ceden a terceros. Podés pedir la baja
                  cuando quieras respondiendo cualquiera de nuestros correos.
                </p>

                <button type="submit" disabled={status === "sending"}
                  className="mt-8 w-full rounded-lg bg-white px-6 py-3.5 text-[15px] font-medium text-black transition-opacity hover:opacity-90 disabled:opacity-50">
                  {status === "sending" ? "Sumándote…" : "Sumarme a la comunidad"}
                </button>

                {status === "error" && (
                  <p className="mt-4 text-center text-sm text-red-400">{serverError}</p>
                )}
                {Object.keys(errors).length > 0 && status !== "sending" && (
                  <p className="mt-4 text-center text-sm text-neutral-500">
                    Revisá los campos marcados en rojo.
                  </p>
                )}
              </section>
            </form>
          </>
        )}
      </div>

      <footer className="mt-auto pt-10 text-center font-mono text-[11px] uppercase tracking-[0.2em] text-neutral-700">
        Rosario Innovation Hub
      </footer>
    </main>
  );
}

/**
 * Marca el campo con data-error para poder llevarle el scroll al primero que
 * falló. El wrapper no dibuja nada: solo deja la marca en el DOM.
 */
function Campo({ err, children }: { err?: string; children: React.ReactNode }) {
  return <div data-error={err ? "1" : undefined}>{children}</div>;
}

function Listo({ yaEstaba }: { yaEstaba: boolean }) {
  return (
    <div className="text-center">
      <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-neutral-500">
        — {yaEstaba ? "Datos actualizados" : "Ya estás adentro"}
      </p>
      <h1 className="mt-5 text-4xl font-semibold tracking-tight md:text-5xl">
        {yaEstaba ? "Actualizamos tus datos" : "Bienvenido/a a la comunidad"}
      </h1>
      <p className="mx-auto mt-5 max-w-md text-[15px] leading-relaxed text-neutral-400">
        {yaEstaba
          ? "Ya estabas en la comunidad del Hub y acabamos de actualizar tu perfil con lo que nos contaste."
          : "Te vamos a escribir con la agenda de la Rosario Tech Week y con lo que pediste recibir del ecosistema."}
      </p>
      <p className="mx-auto mt-4 max-w-md text-[14px] leading-relaxed text-neutral-500">
        Si conocés a alguien que tendría que estar acá, pasale el link.
      </p>
      <a href="https://rosariotechweek.com"
        className="mt-10 inline-block rounded-lg border border-white/15 px-6 py-3 text-[15px] text-neutral-200 transition-colors hover:border-white/40">
        Ir a rosariotechweek.com →
      </a>
    </div>
  );
}
