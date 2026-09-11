# Formulario de convocatoria — Rosario Tech Week 2026

Formulario público (una sola URL, tres caminos) que escribe cada envío directamente
en las bases de **Notion** del Hub, desde un backend propio. El token de Notion vive
**solo en el servidor**, nunca en el navegador.

- **Caminos:** Sumar evento · Ofrecer venue · Ser speaker (lógica condicional).
- **Segundo formulario:** alta en la comunidad del Hub (`/comunidad`). Ver §6.
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
| `NOTION_DB_SPEAKERS` | Database ID base Speakers (ya provisto) |
| `NOTION_DB_COMUNIDAD` | Database ID base 🧑‍🤝‍🧑 Comunidad — la alimenta `/comunidad` |
| `HEALTH_SECRET` | (opcional) protege `GET /api/health?secret=...` |

## 3. Dar acceso a la integración de Notion

1. Ir a `notion.so/my-integrations` → **New integration** → nombre **"RTW26 Formulario"** →
   workspace del Hub → permisos de contenido: **Read + Insert**. Copiar el
   **Internal Integration Secret** (empieza con `ntn_` o `secret_`) → pegarlo en `NOTION_TOKEN`.
2. **Compartir cada base con la integración:** abrí la página de Bases de Datos
   (`https://app.notion.com/p/Bases-de-Datos-3a5f8168129f810f97f4d15093adfe3d`) y en cada base
   (Eventos, Host, Speakers, Comunidad): `•••` → **Connections** → **Connect to** → "RTW26 Formulario".
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

## Cómo embeberlo en el sitio principal (para quien lo integra)

⚠️ **Esto NO es un snippet HTML estático**: es una app Next.js con **backend** — la ruta
`app/api/submit` escribe en Notion del lado del servidor. No se puede pegar como HTML suelto en
un hosting estático; necesita correr con Node. Dos formas:

**A · Standalone + iframe/link (lo más simple)**
1. Deployar este repo tal cual en **Vercel** (con las env vars de Notion cargadas).
2. Apuntar `eventos.rosariotechweek.com` a ese deploy (CNAME → `cname.vercel-dns.com`).
3. En el sitio principal, enlazar los botones "Quiero sumarme" a esa URL, **o** embeber con iframe:
   ```html
   <iframe src="https://eventos.rosariotechweek.com" style="width:100%;min-height:100vh;border:0"></iframe>
   ```

**B · Integrar en el código del sitio principal (si es Next.js App Router)**
1. Copiar `app/page.tsx` (p. ej. como ruta `/sumate`), `app/api/submit/route.ts` y `lib/`.
2. Instalar `@notionhq/client` y `zod` en el proyecto principal.
3. Cargar las env vars de Notion en ese proyecto y verificar con `/api/health`.

**En cualquier caso:** sin `NOTION_TOKEN` configurado (y las bases compartidas con la integración),
el form **no escribe en Notion**. Ver secciones **2** y **3**.

## Seguridad

- `NOTION_TOKEN` solo en el server (`app/api/*`, `lib/notion.ts`). No aparece en el bundle del cliente.
- Validación + sanitización con **Zod** en el servidor antes de escribir.
- **Honeypot** (`website`) + **rate limit** por IP + whitelist de opciones de `select`.

---

## 6. Segundo formulario — "Sumate a la Comunidad" (`/comunidad`)

Mismo proyecto, misma app, **otro subdominio**. La Tech Week es el motivo de entrada;
lo que se construye es la base de personas del **Rosario Innovation Hub**.

| | |
|---|---|
| URL pública | `https://comunidad.rosariotechweek.com` |
| Ruta real | `/comunidad` (también accesible por path en cualquier host) |
| Endpoint | `POST /api/comunidad` (JSON, sin archivos) |
| Base de Notion | `🧑‍🤝‍🧑 Comunidad` → `NOTION_DB_COMUNIDAD` |
| Archivos | `app/comunidad/`, `app/api/comunidad/`, `lib/comunidad-*.ts`, `middleware.ts` |

### Cómo funciona el subdominio

`middleware.ts` mira el `Host` de cada request: si es `comunidad.rosariotechweek.com`,
reescribe `/` → `/comunidad`. El matcher es **solo la raíz**, así que `/api/*` y los
assets se sirven igual desde los dos hosts y no hay nada duplicado.

Para que funcione hay que **agregar el dominio al proyecto en Vercel**
(Settings → Domains → `comunidad.rosariotechweek.com`). Sin eso, la ruta
`/comunidad` sigue andando por path — sirve para probar antes de tocar el DNS.

### El email es el identificador

Si alguien ya está en la base, el alta **actualiza su fila** en vez de crear una
segunda (`lib/comunidad-notion.ts`). Dos reglas que valen la pena recordar:

- Un segundo envío **nunca borra** datos: los campos que llegan vacíos se omiten,
  así que quien completa rápido no pierde los intereses que cargó la primera vez.
- **Excepción: los consentimientos siempre se pisan**, incluso en `false`. Vale la
  última voluntad manifestada — no marcar la casilla comercial es un opt-out.
- `Origen` y `Estado` se sellan en el alta y no se vuelven a tocar: si el equipo
  movió a alguien a "Contactado", un segundo envío no lo devuelve a "Nuevo".

### Trazabilidad de canales

El form lee `?ref=` de la URL y lo guarda en `Notas` ("Llegó por: qr-stand").
Usalo en cada QR y en cada posteo (`?ref=qr-stand`, `?ref=instagram`,
`?ref=unr`) — es lo único que después permite saber qué canal trajo gente.

### Decisiones de producto

- **Obligatorios: 7.** Nombre, email, perfil, temas, qué busca, qué aporta y el
  consentimiento. Todo lo demás es opcional y vive plegado en "Contanos un poco más".
- **Tope de 8 temas**, aplicado en el UI (las opciones restantes se deshabilitan).
  Quien marca 15 de 22 no está diciendo nada: la segmentación se vuelve ruido.
- **Los emojis no se guardan en Notion.** Viven en `EMOJI` de `lib/comunidad-schemas.ts`
  y son solo para render: un `multi_select` con emoji en el nombre es un infierno
  para filtrar y para exportar.
- **Consentimiento comercial separado** del de comunicaciones del Hub. Mezclarlos
  invalidaría los dos (Ley 25.326).
