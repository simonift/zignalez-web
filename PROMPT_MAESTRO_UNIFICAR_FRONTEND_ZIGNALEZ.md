# PROMPT MAESTRO — Un dominio, dos caras: sitio Zignalez (público) + Admin, en frontend-angular

> Integra el **sitio público de fans de Zignalez** (área pública) y la **administración**
> (Artist Release OS) en la MISMA app Angular, bajo un mismo dominio, sin exponer el admin
> al público. Repo: `simonift/zignalez-sitio` (monorepo Artist Release OS), carpeta
> `frontend-angular`. Reversible, por fases, con ADR. Grounded en el estado real del repo.

## ROL Y PRINCIPIO
Arquitecto frontend + seguridad, adversarial. Regla dura: **un guard de Angular no es
seguridad, es UX** — la autorización vive en el api-gateway por rol. Bajo un mismo dominio,
público y admin comparten origen: la separación tiene que ser real (backend + bundle + CSP),
no solo rutas ocultas. Nada se declara "listo" sin correr su criterio.

## 0. ESTADO REAL (verificado 06-09-2026 en el Mac; re-verificar antes de tocar)
- **Angular 21 standalone** (sin NgModules). `frontend-angular` servido por **nginx** con
  `try_files … /index.html` y proxy `/api/ → api-gateway:8080`.
- `app.routes.ts` actual: `'' → LandingComponent` (público, sin guard) · `'login'` ·
  `'' + DashboardLayoutComponent + canActivate:[authGuard]` con hijos `dashboard, songs,
  songs/:id, releases, releases/:id` · `** → NotFound`.
- `core/guards/auth.guard.ts` (único guard). `features/`: public-home/landing, auth/login,
  dashboard, catalog, release, media.
- **nginx CSP actual (estricta)**: `script-src 'self'`; `img-src 'self' data:`;
  `connect-src 'self'`; style/font permiten Google Fonts. → **bloquea YouTube/TikTok/ytimg**.
- El sitio Zignalez que se integra es vanilla (YouTube fachada, TikTok embed, captura) — hoy
  entregado como `index.html` v2 (9 videos reales, carrusel TikTok, form apagado).

## DECISIONES QUE BLOQUEAN (resolver antes de ejecutar)
1. **Namespace del admin**: **`/admin/*` (recomendado)** para que el público sea dueño del
   root, o mantenerlo en root, o subdominio `app.zignalez.com` (máxima separación, pero eso
   ya no es "un mismo dominio"). Sin decisión → se asume `/admin/*`.
2. **Fidelidad de port**: **portar el sitio a componentes Angular standalone (recomendado)**
   vs incrustar el HTML estático tal cual en un componente (rápido, no idiomático, difícil de
   mantener). Sin decisión → componentes.
3. **Aceptar el tradeoff de CSP por ruta**: público con CSP permisiva (embeds) y `/admin`+`/api`
   estrictos. Es inevitable para tener embeds y admin en el mismo dominio.

---

## FASE 1 — Namespacing + lazy-load (aislar las dos caras)
- Mover el admin bajo **`/admin/*`** (dashboard, songs, releases, media) detrás de `authGuard`,
  y **lazy-load** (`loadComponent`/`loadChildren`) para que un visitante público **no descargue
  el bundle de admin**. El público (`/`, y sub-rutas del sitio) queda eager/liviano.
- `LandingComponent` (o un nuevo `features/zignalez`) pasa a ser el sitio de fans.
- **Aceptación**: build muestra el admin en su propio chunk cargado solo tras login; el bundle
  inicial que recibe un anónimo no contiene código de admin.

## FASE 2 — Portar el sitio Zignalez al área pública (a componentes)
- Descomponer el `index.html` v2 en componentes standalone: `hero`, `video-grid` (fachada
  YouTube → iframe al clic, links YouTube+Spotify), `tiktok-rail`, `capture-form`, footer.
- Config (VIDEOS, TIKTOKS) → un `zignalez.config.ts` o servicio; el form usa **HttpClient**
  al endpoint de captura vía `/api/…` (doble opt-in), no fetch suelto. Sin endpoint → bloquea
  con aviso (no finge éxito). Estilos: a CSS de componente o global, **sin el rojo `#F80606`**.
- **Aceptación**: `/` renderiza el sitio de fans real (9 videos, TikTok, captura); una portada
  abre el reproductor; el form, sin endpoint, avisa y bloquea.

## FASE 3 — Seguridad (NO negociable — el corazón de "un dominio")
- `authGuard` valida sesión **y rol** (fan vs admin, defecto D-18); el fan jamás ve admin.
- **La autorización real va en el api-gateway por rol en cada endpoint** — el guard solo oculta
  UI. Verificar que un token de fan (o sin token) reciba 401/403 en rutas de admin del gateway.
- Verificación de propiedad en media (D-07). Sin credenciales de prueba públicas. `JWT_SECRET`
  fuera de texto plano (D-17).
- **Aceptación**: pegarle a `/admin/*` sin sesión redirige; pegarle al endpoint admin del
  gateway sin rol da 401/403 (probado), no solo la UI oculta.

## FASE 4 — CSP por ruta en nginx (permitir embeds sin abrir el admin)
- En `nginx.conf`, CSP **por `location`**:
  - Rutas públicas: `frame-src` y `img-src` para `https://www.youtube-nocookie.com`,
    `https://*.ytimg.com`, `https://www.tiktok.com`; `script-src` para el embed de TikTok;
    fonts de Google como hoy.
  - `/admin` y `/api`: CSP **estricta** (como la actual).
- **Declarar el tradeoff**: abrir embeds ensancha la superficie en el dominio que también sirve
  admin — por eso la CSP estricta se mantiene en admin/api, y los embeds solo en público.
- **Aceptación**: el sitio público carga YouTube/TikTok/portadas; `/admin` conserva CSP estricta.

## FASE 5 — Un dominio (routing + servir)
- Angular routing: público en root, `/admin/*` gateado, `/login`. nginx `try_files … /index.html`
  ya soporta el SPA. Un solo dominio (ej. `zignalez.com`); si algún día se separa, subdominio.
- **Aceptación**: en un dominio, `/` = fans, `/admin` = gestión tras login, `/api` = gateway;
  ningún dato de admin visible sin rol.

## GUARDRAILS
No romper los microservicios ni sus contratos · el sitio público **no** consume endpoints de
admin · sin rojo del sello · captura sin política publicada = no se activa (Ley 21.719) ·
lazy-load obligatorio para el admin · cada fase con ADR en `.claude/decisiones/` · reversible.

## CRITERIOS DE ACEPTACIÓN GLOBALES
Una sola app, un dominio · `/` = sitio Zignalez real · admin bajo `/admin/*` lazy, con guard
por rol **y** authz de gateway probada · CSP por ruta (público con embeds, admin/api estrictos)
· bundle anónimo sin código de admin · sin rojo, sin vanidad · cada fase con ADR.

## AUDITORÍA DE FUENTES
- Verificado esta sesión (device_bash): Angular 21 standalone; `app.routes.ts` con Landing
  público + admin bajo `authGuard`; único guard `auth.guard.ts`; features public-home/auth/
  dashboard/catalog/release/media; nginx con CSP estricta que bloquea youtube/tiktok/ytimg y
  proxy `/api → api-gateway:8080`; remote del repo es `git@github.com:simonift/zignalez-sitio`.
- [Probable], criterio de arquitectura: `/admin/*` + lazy-load + CSP por ruta + authz en gateway
  es el patrón correcto para público+admin en un dominio; no es regla, es ingeniería.
- `FALTA` (bloquea): decisiones 1–3; el endpoint real de captura; si `authGuard` ya valida rol
  o solo sesión (revisar `auth.guard.ts`); si el gateway ya hace authz por rol (revisar).
- Límite declarado: un mismo dominio implica CSP compartida salvo que se separe por `location`;
  abrir embeds en público ensancha superficie — mitigado manteniendo admin/api estrictos.
