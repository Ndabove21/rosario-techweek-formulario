import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"], display: "swap" });

export const metadata: Metadata = {
  title: "Sumate — Rosario Tech Week 2026",
  description:
    "Sumá tu evento u ofrecé tu venue para la Rosario Tech Week 2026. Es tiempo de acelerar.",
  metadataBase: new URL("https://eventos.rosariotechweek.com"),
  openGraph: {
    title: "Sumate — Rosario Tech Week 2026",
    description: "Es tiempo de acelerar. 19–23 de octubre de 2026 · Rosario, Argentina.",
    type: "website",
  },
  robots: { index: true, follow: true },
};

export const viewport: Viewport = {
  themeColor: "#0a0a0a",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body className={`${inter.className} min-h-dvh bg-[#0a0a0a] text-neutral-100 antialiased`}>
        {children}
      </body>
    </html>
  );
}
