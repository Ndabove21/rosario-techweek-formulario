# Formulario de convocatoria — Rosario Tech Week 2026

Formulario público (una sola URL, tres caminos) que escribe cada envío directamente
en las bases de **Notion** del Hub, desde un backend propio. El token de Notion vive
**solo en el servidor**, nunca en el navegador.

- **Caminos:** Sumar evento · Ofrecer venue · Ser speaker (lógica condicional).
- **Stack:** Next.js (App Router) + TypeScript + Tailwind v4 + Zod + `@notionhq/client`.
- **Identidad:** replicada de `rosariotechweek.com` (dark `#0a0a0a`, patrón "— 01", tagline "Es tiempo de acelerar").

---

## 1. Correr en local

```bash
npm install
cp .env.example .env.local     # y completá NOTION_TOKEN
npm run dev                    # http://localhost:3000
```

## 2. Variables de entorno

| Variable | Qué es |
|---|---|
| `NOTION_TOKEN` | Secreto de la integración de Notion. **Solo en `.env.local` / Vercel, nunca en git.** |
| `NOTION_DB_EVENTOS` | Database ID base Eventos (ya provisto) |
| `NOTION_DB_ORGANIZACIONES` | Database ID base Organizaciones (ya provisto) |
| `NOTION_DB_PERSONAS` | Database ID base Personas (ya provisto) |
| `HEALTH_SECRET` | (opcional) protege `GET /api/health?secret=...` |

## 3. Dar acceso a la integración de Notion

1. Ir a `notion.so/my-integrations` → **New integration** → nombre **"RTW26 Formulario"** →
   workspace del Hub → permisos de contenido: **Read + Insert**. Copiar el
   **Internal Integration Secret** (empieza con `ntn_` o `secret_`) → pegarlo en `NOTION_TOKEN`.
2. **Compartir cada base con la integración:** abrí la página de Bases de Datos
   (`https://app.notion.com/p/Bases-de-Datos-3a5f8168129f810f97f4d15093adfe3d`) y en cada base
   (Eventos, Organizaciones, Personas): `•••` → **Connections** → **Connect to** → "RTW26 Formulario".
   *(Compartir la página madre suele heredar; verificá base por base.)*
3. **Verificar que todo está conectado** antes de producción:
   ```bash
   npm run dev
   # en el navegador o curl:
   curl http://localhost:3000/api/health
   ```
   Devuelve `ok: true` y el **título de cada base**. Si una falla con "could not find database",
   probablemente el ID sea de *data source* y no de *database* (nueva API de Notion) — reconfirmá
   el ID abriendo la base como página full y copiando los 32 caracteres de la URL.

## 4. Deploy en Vercel

1. Importar el repo en Vercel.
2. **Settings → Environment Variables:** cargar `NOTION_TOKEN` y los 3 `NOTION_DB_*`.
3. Deploy. El endpoint `GET /api/health` sirve para verificar en prod.

### Alternativa VPS / Hostinger (Node)
`npm run build && npm run start` detrás de **Nginx** con proxy a `localhost:3000` y
certificado **Let's Encrypt**. Cargar las env vars en el entorno del proceso (systemd / PM2).

## 5. Subdominio `eventos.rosariotechweek.com`

- **Vercel:** Project → Settings → Domains → agregar `eventos.rosariotechweek.com`. Vercel da un
  **CNAME**. En el panel DNS del dominio (Hostinger u otro): crear registro **CNAME**, host `eventos`,
  valor `cname.vercel-dns.com`. Esperar propagación.
- **VPS propio:** registro **A** de `eventos` → IP del server.

## Arquitectura de datos (mapeo a Notion)

Cada camino escribe en una base distinta, con **valores fijos** que setea el backend
(`lib/notion.ts`). Los `select`/`multi_select` se validan contra una **whitelist** (`lib/schemas.ts`)
antes de escribir — no se confía en lo que llega del cliente.

| Camino | Base | Fijos que setea el server |
|---|---|---|
| Evento | `NOTION_DB_EVENTOS` | Estado curaduría = `Recibido` · Vía de ingreso = `Propuesta de host` |
| Venue | `NOTION_DB_ORGANIZACIONES` | Tipo = `Venue` · Etapa = `Contactado` · Disponibilidad = `A confirmar` |
| Speaker | `NOTION_DB_PERSONAS` | Tipo = `Speaker` · Estado = `Propuesto` |

## Decisiones de v1 (documentadas)

- **Flyer / imagen (evento):** omitido en v1. La API de Notion no sube binarios a una propiedad
  `files` de forma estable con token de integración. En v2: subir a Vercel Blob y guardar la URL
  pública como *external file* en la propiedad `Flyer / imagen`.
- **"Organización que representa" (speaker):** esa propiedad es una **relación** en Notion (no
  escribible simple por API). En v1 se guarda como texto dentro de `Bio` con el prefijo
  `Representa a: …`; el equipo la vincula a mano.
- **Rate limit:** en memoria por IP (5/min). Para escala real, mover a Vercel KV / Upstash.

## Seguridad

- `NOTION_TOKEN` solo en el server (`app/api/*`, `lib/notion.ts`). No aparece en el bundle del cliente.
- Validación + sanitización con **Zod** en el servidor antes de escribir.
- **Honeypot** (`website`) + **rate limit** por IP + whitelist de opciones de `select`.
