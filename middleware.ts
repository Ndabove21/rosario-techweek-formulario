import { NextResponse, type NextRequest } from "next/server";

/**
 * Un solo proyecto de Vercel, dos formularios, dos subdominios:
 *
 *   eventos.rosariotechweek.com     → "/"          (convocatoria de eventos)
 *   comunidad.rosariotechweek.com   → "/comunidad" (alta en la comunidad del Hub)
 *
 * El rewrite es solo para la raíz: quien entra al subdominio de comunidad ve el
 * form de comunidad sin que la URL cambie. Todo lo demás (las rutas de /api,
 * los assets) se sirve igual desde los dos hosts, así que no hace falta
 * duplicar nada.
 *
 * /comunidad sigue siendo accesible por su path en cualquier host: sirve para
 * probar en el dominio de Vercel ANTES de tocar el DNS.
 */
const HOSTS_COMUNIDAD = new Set([
  "comunidad.rosariotechweek.com",
  // Alias del preview de Vercel, por si se asigna un dominio de prueba.
  "comunidad-rtw26.vercel.app",
]);

export function middleware(req: NextRequest) {
  const host = (req.headers.get("host") ?? "").split(":")[0].toLowerCase();
  if (!HOSTS_COMUNIDAD.has(host)) return NextResponse.next();

  const url = req.nextUrl.clone();
  url.pathname = "/comunidad";
  return NextResponse.rewrite(url);
}

// Solo la raíz. Sin esto, el middleware correría también para /_next y los
// assets, y el rewrite rompería la carga de los chunks.
export const config = { matcher: "/" };
