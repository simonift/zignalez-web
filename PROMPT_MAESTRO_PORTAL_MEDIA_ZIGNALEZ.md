# PROMPT MAESTRO — Portal media de Zignalez (público + zona con login)

> Construye el sitio-portal: grilla de releases con portada desde YouTube en máxima
> calidad (link a YouTube + Spotify), galería de imágenes de Instagram, carrusel de
> TikTok con los videos más vistos/likeados, y una zona con **login** para pre-views/
> maquetas inéditas donde **no se permite descargar ni extraer el audio**.
> **Fuente única de datos del artista: `.claude/CONTEXTO.md`.** Ninguna cifra ni URL se
> inventa; lo que falta se marca `FALTA:`. Cierra con AUDITORÍA DE FUENTES.

## ROL
Director técnico + de conversión, adversarial. No entregues lo que suena bien:
entrega lo que es **técnicamente cierto y realmente construible**. Si un requisito
no se puede cumplir como está pedido, dilo, explica el límite y ofrece la versión
honesta más cercana. La precisión manda sobre la comodidad.

---

## 0. VERDAD TÉCNICA QUE GOBIERNA TODO EL PROMPT (no negociable)
1. **El audio no se puede volver incapturable.** Todo lo que suena se puede grabar
   (captura de audio del SO/pantalla, dev tools, interceptar el segmento). "No permitir
   capturar/extraer/descargar" se cumple **endureciendo el costo**, no prometiendo
   imposibilidad. El entregable dice "endurecido", nunca "imposible de capturar".
2. **Cada integración declara su nivel de dependencia** — CURADO (sin API, se puede
   hoy) vs API/OAUTH (requiere registro y revisión de app de la plataforma). No se
   promete "conexión directa automática" donde la plataforma exige aprobación.
3. **No se ripea video de YouTube** (viola sus Términos y es innecesario): se **embebe**
   el reproductor y se usan las **miniaturas oficiales** como portada.
4. **Login real, no cosmético.** Las maquetas van detrás de autenticación de verdad
   con verificación de propiedad del recurso (no ocultarlas en el front).
5. Paleta artista: negro `#0A0A0B`, violeta-UV `#8B3DFF`, cromo. **Prohibido rojo
   `#F80606`** (sello). Sin cifras de vanidad ni datos fuera de CONTEXTO.

## 1. PRIORIDAD (ROI — no todas las secciones valen igual)
El motor de conversión es **captura de contacto + zona de pre-views gateada**. La
galería de IG y el carrusel de TikTok son **prueba social y permanencia**, no el
motor. Orden de construcción: (1) grilla releases + captura, (2) zona login/pre-views,
(3) carrusel TikTok, (4) galería IG. No inviertas semanas en 3–4 antes de que 1–2
conviertan. Todo lo gateado vive sobre **hosting real + Worker+D1+R2**, no sobre el
sitio estático ni un túnel de laptop.

---

## 2. SECCIÓN A — Grilla de releases: portada YouTube máx calidad → YouTube + Spotify
**Nivel: CURADO (sin API). Construible hoy.**
- Portada = miniatura oficial en máxima resolución:
  `https://img.youtube.com/vi/<VIDEO_ID>/maxresdefault.jpg` (fallback `hqdefault.jpg`
  si no existe maxres). Alternativa formal: YouTube **oEmbed** para título + thumbnail.
- Al clic: se inserta **un** iframe `youtube-nocookie.com/embed/<ID>` (privacidad),
  uno activo a la vez (patrón fachada, LCP bajo). Junto al reproductor, **dos CTA**:
  "Ver en YouTube ↗" y **"Escuchar en Spotify ↗"** (link al álbum/track del catálogo).
- Datos de cada tarjeta salen de CONTEXTO (IDs de Spotify ya listados). El `VIDEO_ID`
  de YouTube de cada tema: `FALTA:` hasta que lo entregue el usuario. Sin inventarlos.

## 3. SECCIÓN B — Galería de imágenes de Instagram
**Nivel: CURADO (v1) / API+OAUTH+REVISIÓN (v2). [Verificado 2026: Basic Display API
deprecada.]**
- **v1 (recomendado para lanzar):** imágenes **exportadas y alojadas** por ti (R2 o
  la carpeta del sitio). Cero dependencia, cero riesgo de romperse cuando IG cambie.
- **v2 (automático):** **Instagram Graph API** con **cuenta Business/Creator + app
  con revisión de Meta** para leer tu media. Es la única vía soportada tras la
  deprecación de Basic Display. Declara el costo: registro de app, revisión, tokens
  que expiran. No lo pintes como "traer fotos de IG en 2 líneas".
- Regla: la galería **degrada** — si la API falla o el token expira, muestra las
  imágenes curadas, nunca un hueco roto.

## 4. SECCIÓN C — Carrusel TikTok: más vistos / más likeados
**Nivel: CURADO (v1) / DISPLAY API+OAUTH+APROBACIÓN (v2). [Verificado 2026.]**
- **No existe un feed público gratis que devuelva "tus top por likes/vistas".** Dos
  caminos honestos:
  - **v1 (recomendado):** tú eliges tus mejores N videos; se listan sus URLs y se
    embeben con **TikTok oEmbed**. El "más visto/likeado" lo curas tú (tú tienes el
    dato en TikTok Studio). Rápido, estable, cero aprobación.
  - **v2 (automático):** **TikTok Display API** (OAuth + registro y **aprobación** de
    la app) para listar tus videos con sus métricas y **ordenar del lado del cliente**
    por likes/vistas. Declara: revisión de la app, scopes, tokens. Sin aprobación, no hay v2.
- **Prohibido scraping** de TikTok (frágil y contra ToS). Si no hay API aprobada, es v1.
- Carrusel accesible: teclado, `aria`, `prefers-reduced-motion`, lazy-load de embeds.

## 5. SECCIÓN D — Zona de pre-views/maquetas inéditas (LOGIN) — audio endurecido
**Nivel: requiere auth real + hosting real. Es el corazón del "no descargar audio".**
### Arquitectura (todo Cloudflare)
- **Almacenamiento:** R2 privado (nunca URL pública directa).
- **Registro/identidad:** D1. Login por **enlace mágico / token de un solo uso** por
  correo confirmado (doble opt-in), o auth con roles fan/admin. El fan **nunca** ve gestión.
- **Entrega:** Worker `GET /preview?token` valida sesión → emite **URL firmada de R2
  de expiración corta (~15 min)** → el front reproduce por `<audio>`/MSE. Sin link permanente.
### Endurecimiento anti-captura (lo máximo real, declarando el límite)
- **Sin botón de descarga**; `controlsList="nodownload noplaybackrate"`, sin menú
  contextual, sin `<a download>`, drag deshabilitado.
- **Streaming segmentado** (HLS/MSE) con segmentos por URL firmada efímera, en vez de
  un archivo único servible.
- **Voice-tag / marca de agua audible o inaudible** en el export del pre-view →
  **trazabilidad** de quién filtró (token por usuario). Es la mitigación que sí sirve.
- **DRM (EME/Widevine)** solo si el riesgo lo justifica: es lo único que sube la barra
  de verdad, pero es pesado, complejo y no cubre la grabación analógica. Opcional, no default.
- **Declaración obligatoria al usuario técnico:** "esto **encarece** la extracción; no
  la vuelve imposible. Un pre-view puede filtrarse; por eso se marca y se rastrea."
  Un prompt que prometa audio incapturable está mintiendo.

---

## 6. STACK Y RENDIMIENTO
- Público: HTML autocontenido + JS vanilla en **Cloudflare Pages**. Embeds (YT, TikTok)
  = única excepción de red; degradan a link. Reproductor por fachada. LCP < 2,5 s móvil.
- Gateado: **Worker + D1 + R2** en hosting real (no túnel). Auth con roles + ownership
  check por recurso. Secretos fuera del repo (no `JWT_SECRET` en texto plano).
- Accesibilidad AA en todo: foco, contraste, teclado, `alt`, `prefers-reduced-motion`.

## 7. ANTIPATRONES PROHIBIDOS
Prometer audio "imposible de capturar" · ripear/re-alojar video de YouTube · pintar
IG/TikTok como "conexión directa" sin declarar la revisión de app · scraping de
plataformas · gatear maquetas solo ocultándolas en el front · rojo del sello · cifras
de reproducciones de vanidad · portadas inventadas o VIDEO_IDs adivinados.

## 8. EVALUACIÓN POR ROLES (cada uno puede REPROBAR)
- **Arquitecto:** ¿reversible? ¿corre sin mantención? ¿se construyó 3–4 antes de que
  1–2 conviertan? ¿lo gateado está en hosting real?
- **Security:** ¿login real con roles + ownership? ¿URLs firmadas efímeras? ¿secretos
  fuera del repo? ¿se declaró el riesgo residual del audio en vez de negarlo?
- **Validador-maquetas (UI/UX):** ¿portadas reales de YouTube? ¿carrusel accesible?
  ¿degrada sin huecos rotos? ¿sin rojo?
- **Auditor:** ¿alguna promesa de "incapturable"? ¿algún VIDEO_ID o dato inventado?
  ¿alguna "conexión directa" que en verdad exige app review sin declararlo?

## 9. CRITERIOS DE ACEPTACIÓN
Portadas desde miniatura oficial de YouTube (máx calidad) con link a YT **y** Spotify ·
IG y TikTok con nivel de dependencia declarado (CURADO vs API/OAUTH) y degradación sin
huecos · carrusel accesible · zona de maquetas detrás de login real + R2 firmado +
anti-descarga endurecido + watermark, **con el riesgo residual declarado por escrito** ·
sin rojo del sello · cada URL/ID trazable a CONTEXTO o marcado `FALTA:`.

## AUDITORÍA DE FUENTES
- Verificado esta sesión (web, sept 2026): Instagram **Basic Display API deprecada** →
  automatizar imágenes exige Graph API + cuenta Business + revisión de app. TikTok: sin
  feed público gratis de "top por likes/vistas"; automatizar exige **Display API** con
  OAuth + aprobación de app (o curar con oEmbed). Miniatura máx de YouTube = patrón
  `img.youtube.com/vi/<ID>/maxresdefault.jpg`.
- Verificado esta sesión (CONTEXTO.md, 23-08-2026): IDs de Spotify del catálogo; paleta;
  prohibición del rojo. Datos numéricos con más de 30 días: declararlos al usarlos.
- No verificado / `FALTA`: los `VIDEO_ID` de YouTube de cada release; qué imágenes de IG
  y qué videos de TikTok se curan; el archivo del pre-view (formato/peso) que define R2 vs embed.
- Límite técnico declarado, no un dato faltante: **el audio no puede hacerse incapturable**;
  el entregable endurece y rastrea, no impide.

## Fuentes (verificación técnica, sept 2026)
- TikTok Display API — https://developers.tiktok.com/doc/display-api-get-started
- TikTok Research API (Query User Liked Videos) — https://developers.tiktok.com/docs/en/research-api-specs-query-user-liked-videos
- Instagram Basic Display API deprecation — https://www.getphyllo.com/post/instagram-basic-display-api-deprecation-what-it-is-for-developers-and-businesses
- Instagram Graph API 2026 — https://elfsight.com/blog/instagram-graph-api-complete-developer-guide-for-2026/
