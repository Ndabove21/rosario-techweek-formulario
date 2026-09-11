"use client";

/**
 * Campos de formulario compartidos por los dos formularios del proyecto:
 * la convocatoria de eventos ("/") y el alta en la comunidad ("/comunidad").
 * Vivían dentro de app/page.tsx; se extrajeron acá cuando apareció el segundo
 * form, para que los dos se vean igual sin mantener dos copias.
 */

export const inputCls =
  "w-full rounded-lg border border-white/12 bg-white/[0.03] px-3.5 py-2.5 text-[15px] text-neutral-100 outline-none transition-colors focus:border-white/40 focus:bg-white/[0.05]";

export function Eyebrow({ n, children }: { n: string; children: React.ReactNode }) {
  return (
    <p className="mb-6 font-mono text-[11px] uppercase tracking-[0.22em] text-neutral-500">
      — {n} · {children}
    </p>
  );
}

export function Lbl({ children, req }: { children: React.ReactNode; req?: boolean }) {
  return (
    <span className="mb-1.5 block text-[13px] font-medium text-neutral-300">
      {children} {req && <span className="text-neutral-500">*</span>}
    </span>
  );
}

export function Err({ msg }: { msg?: string }) {
  return msg ? <p className="mt-1.5 text-xs text-red-400">{msg}</p> : null;
}

export function Hint({ children }: { children: React.ReactNode }) {
  return <p className="mb-2.5 -mt-0.5 text-xs leading-relaxed text-neutral-500">{children}</p>;
}

export function Text({ label, val, on, err, req, type = "text", ph }: {
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

export function Area({ label, val, on, err, req, ph, rows = 5 }: {
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

/**
 * `render` cambia SOLO lo que se ve. El value de cada <option> sigue siendo el
 * string pelado, que es el que viaja al servidor y tiene que coincidir exacto
 * con el select de Notion: si el emoji entrara en el valor, la API tira 400.
 */
export function Sel({ label, val, on, options, err, req, placeholder = "Elegí una opción…", render }: {
  label: string; val: string; on: (v: string) => void; options: readonly string[];
  err?: string; req?: boolean; placeholder?: string; render?: (v: string) => string;
}) {
  return (
    <label className="block">
      <Lbl req={req}>{label}</Lbl>
      <select value={val ?? ""} onChange={(e) => on(e.target.value)} className={`${inputCls} appearance-none`}>
        <option value="" disabled>{placeholder}</option>
        {options.map((o) => <option key={o} value={o}>{render ? render(o) : o}</option>)}
      </select>
      <Err msg={err} />
    </label>
  );
}

/**
 * Multi-select como chips.
 *
 * `max` es un tope duro: al alcanzarlo, las opciones no elegidas se deshabilitan
 * en el momento. Es a propósito que se sienta en el UI y no al enviar — que el
 * formulario rebote recién en el submit, después de veinte clics, es la forma
 * más rápida de que alguien lo abandone.
 */
export function Chips({ label, values, options, onToggle, err, req, max, hint, render }: {
  label: string; values: string[]; options: readonly string[]; onToggle: (v: string) => void;
  err?: string; req?: boolean; max?: number; hint?: React.ReactNode; render?: (v: string) => string;
}) {
  const lleno = max != null && values.length >= max;
  return (
    <div>
      <Lbl req={req}>{label}</Lbl>
      {hint && <Hint>{hint}</Hint>}
      <div className="flex flex-wrap gap-2">
        {options.map((o) => {
          const active = values.includes(o);
          const bloqueada = lleno && !active;
          return (
            <button key={o} type="button" disabled={bloqueada} onClick={() => onToggle(o)}
              className={`rounded-full border px-3.5 py-1.5 text-[13px] transition-colors ${
                active
                  ? "border-white bg-white text-black"
                  : bloqueada
                    ? "cursor-not-allowed border-white/8 text-neutral-600"
                    : "border-white/15 text-neutral-300 hover:border-white/40"
              }`}>
              {render ? render(o) : o}
            </button>
          );
        })}
      </div>
      {max != null && (
        <p className="mt-2 font-mono text-[11px] text-neutral-600">
          {values.length} / {max}
        </p>
      )}
      <Err msg={err} />
    </div>
  );
}

/** Checkbox con texto largo al lado (consentimientos, confirmaciones). */
export function Check({ checked, on, err, children }: {
  checked: boolean; on: (v: boolean) => void; err?: string; children: React.ReactNode;
}) {
  return (
    <div>
      <label className="flex cursor-pointer items-start gap-3">
        <input type="checkbox" checked={checked} onChange={(e) => on(e.target.checked)}
          className="mt-0.5 h-4 w-4 shrink-0 accent-white" />
        <span className="text-[13px] leading-relaxed text-neutral-300">{children}</span>
      </label>
      <Err msg={err} />
    </div>
  );
}
