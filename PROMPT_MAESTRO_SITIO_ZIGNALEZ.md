# PROMPT MAESTRO — Sitio de Zignalez (carta de presentación + captura)

> Derivado del método probado en `taller890-sitio` (alcances por precio) y
> `divisionrec` (integración de assets), con el objetivo único del agente
> `web-conversion`. **Grounded en `.claude/CONTEXTO.md` — ninguna cifra se
> inventa.** Parametrizable: cambia el bloque PERFIL y sirve para otro artista.

## PRINCIPIO RECTOR
El sitio tiene **un solo trabajo**: convertir el tráfico del link-in-bio en
contactos que el artista controle (correo / WhatsApp). Métrica: contactos
capturados por cada 100 visitas; meta inicial 20%. La escucha del release actual
es el gancho que justifica la captura, **no** el fin. Todo lo demás —bio, EPK,
grilla— es subordinado a esas dos cosas. "Que se vea bien" no es un objetivo; es
un medio.

> **El recordatorio que se repite:** el sitio no genera tráfico, lo convierte.
> Mientras el link-in-bio de Instagram y TikTok no apunte al dominio, no recibe
> visitas y todo lo demás es decorativo. Es la acción de mayor ROI y cuesta 2 min.

## PERFIL (fuente única — para Zignalez, verificado 23-08-2026)
```
ARTISTA        = Zignalez ("El Zigg Ziggy")
GÉNERO         = urbano / freestyle chileno
BASE           = Santiago, Chile
SELLO          = División Rec (distribución)
SPOTIFY_ARTIST = 0M4ZFfQbpLYiLksk0QyOph
IG             = @zignalez (verificado)   TIKTOK = FALTA URL   YT = FALTA URL
RELEASE_ACTUAL = TNT (2026)   ALBUM_ID = 6ztusc6ns796KPZVr2GWfW
CATÁLOGO_DESTACADO = Gatas & Gangster's Remix (22.7K), RXRX (12.5K), LA DATA, XTUBIEN
PALETA         = negro #0A0A0B · violeta-UV #8B3DFF · cromo-plata #C7CCD1/#E8EAED · blanco puntual
PROHIBIDO      = rojo #F80606 (marca del sello, NO del artista)
```
Para revender: reemplaza este bloque por el PERFIL del otro artista y su propio
CONTEXTO verificado. Si un dato falta, va como `FALTA:` — nunca se rellena.

## NIVELES POR PRECIO (misma identidad, distinto alcance — modelo taller890)
Una sola calidad de diseño en los tres; cambia cuánto sitio hay. Regla
anti-canibalización: cada nivel deja *visiblemente* afuera algo que el siguiente
resuelve. (Fija tú los precios según tu piso de tarifa/hora; no van en el sitio.)

- **NIVEL 1 · PRESENCIA** — una sola pantalla larga: hero que rutea a escuchar el
  release actual + captura de correo (3 campos) + enlaces. La tarjeta de visita en
  su dominio. *Afuera:* la grilla de catálogo y el EPK.
- **NIVEL 2 · ESENCIAL** (objetivo comercial) — lo del template entregado: hero,
  grilla de releases con reproductor por fachada, captura correo+WhatsApp con doble
  opt-in, sección "Quién" con bio y cifras verificadas. *Afuera:* EPK descargable,
  páginas por release, video en vivo, panel de fechas.
- **NIVEL 3 · COMPLETO** — todo lo anterior + EPK press-ready (bio 3 versiones,
  fotos horizontal/vertical/en vivo, video, rider), páginas por release tipo
  producto, fechas/tour, y preparado para crecer (más artistas → workspace, solo
  cuando exista un 2º artista con nombre y fecha).

## ESTRUCTURA DEL SITIO (Nivel 2, el template)
1. **Hero** = tesis: nombre con glow UV, tagline, CTA primario "Escuchar «release»"
   y CTA secundario a la lista. Meta discreta (release actual, sello, IG). Sin
   `100vh` vacío: el hero mide lo que contiene.
2. **La música**: grilla de portadas (fachada). Al clic, se inserta **un** iframe
   de Spotify (uno activo a la vez). Enlace de escape "Abrir en Spotify".
3. **La lista** (captura): correo + WhatsApp opcional + consentimiento no
   preseleccionado. Máx 3 campos. Copy que vende el porqué (no depender del algoritmo).
4. **Quién / EPK-lite**: bio (con slot `FALTA` para el relato real) + cifras
   SOLO verificadas + respaldo del sello. Sin contador de seguidores.
5. **Footer**: streaming + redes + aviso de privacidad (enlace obligatorio).

## REGLAS NO NEGOCIABLES DEL FORMULARIO
1. **Debe apuntar a un endpoint real.** Si `ENDPOINT_CAPTURA` está vacío, el sitio
   **avisa y bloquea el envío**. Nunca finge éxito 200. (En el template esto ya está.)
2. Doble opt-in en el proveedor. Arquitectura decidida (ADR-001): **Worker + D1**
   dueño del doble opt-in; Resend para el correo de confirmación; MailerLite solo
   como canal de campañas (ESP intercambiable). D1 es el sistema de registro.
3. Consentimiento explícito, casilla no preseleccionada. Máx 3 campos.
4. **Política de privacidad publicada antes de recibir un solo dato.** Ley 21.719
   rige el **01-12-2026**; tratar datos con finalidad distinta a la declarada es
   infracción grave. Datos del responsable (RUT, domicilio, correo): FALTAN.

## STACK Y RENDIMIENTO (fijos)
- **Un solo HTML autocontenido, JS vanilla, sin build.** Se arrastra a Cloudflare
  Pages. Embeds de plataforma = única excepción de red, y degradan a enlace normal.
- Reproductor por fachada (portadas primero; iframe al clic). LCP < 2,5 s en 4G,
  JS propio < 15 KB, Lighthouse ≥ 90 móvil / ≥ 95 accesibilidad.
- Accesibilidad AA: foco visible, contraste, teclado, `alt`, `prefers-reduced-motion`.

## ANTIPATRONES PROHIBIDOS
- Badge "350M+ streams" (es del sello, no del artista) o cualquier cifra inventada.
- Contadores de seguidores. Mostrar los 277 oyentes mensuales (debilita, no vende).
- Formulario que finge éxito sin endpoint. Pop-up de captura al entrar. Autoplay.
- Usar el rojo de División Rec. Scroll-jacking. 15 iframes al cargar.
- Publicar sin política de privacidad.
- Construir entidad multi-artista antes de que exista un 2º artista real.

## CRITERIOS DE ACEPTACIÓN
El sitio carga en < 2,5 s en 4G · una portada abre un reproductor y suena · el
formulario, con endpoint real, captura y dispara el doble opt-in (y sin endpoint,
bloquea con aviso) · Lighthouse ≥ 90/95 · el link-in-bio de IG y TikTok apunta al
dominio · ninguna cifra fuera de CONTEXTO.

## AUDITORÍA DE FUENTES (de este maestro)
- Verificado (leído en disco): PERFIL de `.claude/CONTEXTO.md`; método de niveles de
  `taller890-sitio/prompt-maestro-alcances.md`; objetivo único y reglas de formulario
  del agente `web-conversion`; arquitectura ADR-001 (Worker+D1) de la memoria del sitio.
- Patrones de sitios de artistas: investigación web (top musician sites 2026 + checklist
  EPK) — patrones, no cifras del artista.
- FALTA (bloquea publicar): RUT/domicilio/correo del responsable; URLs de TikTok/YouTube;
  bio real; fotos de prensa; endpoint del Worker; CTR real del link-in-bio (sin él,
  cualquier proyección de conversión es `[Suposición]`).
