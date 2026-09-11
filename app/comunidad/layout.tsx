import type { Metadata } from "next";

/**
 * Metadata propia del subdominio de comunidad. No repite <html>/<body>: eso lo
 * pone el layout raíz, que ya deja el fondo oscuro y la tipografía.
 */
export const metadata: Metadata = {
  title: "Sumate a la Comunidad — Rosario Innovation Hub",
  description:
    "Sumate a la comunidad del Rosario Innovation Hub y recibí eventos, oportunidades, capacitaciones y networking del ecosistema. Empezá por la Rosario Tech Week 2026.",
  metadataBase: new URL("https://comunidad.rosariotechweek.com"),
  openGraph: {
    title: "Sumate a la Comunidad — Rosario Innovation Hub",
    description:
      "Contanos quién sos, qué buscás y qué podés aportar. Dos minutos y quedás dentro de la comunidad del ecosistema.",
    type: "website",
  },
  robots: { index: true, follow: true },
};

export default function ComunidadLayout({ children }: { children: React.ReactNode }) {
  return children;
}
