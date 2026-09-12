# PROMPT MAESTRO — Corto "SIN SEÑAL → CON ZIGNALEZ" (visual de show)

> Brief creativo + técnico para producir un corto de reveal para uso EN VIVO (opener de show
> / visual de pantalla), no para el sitio web. Concepto: dead air / sin señal → interferencia →
> el lock: entra Zignalez. Un prompt maestro **dirige** la producción; no la renderiza.
> Grounded en la identidad de `.claude/CONTEXTO.md`. Nada inventado; lo que falte va `FALTA:`.

## 0. DECISIÓN DE CAMINO (el prompt no avanza sin fijarla)
El mismo brief, tres formas de ejecutarlo. Declara cuál usas:
- **A · Motion graphics / compositing (After Effects)** — el camino correcto para la señal, glitch,
  scanlines, barras y el reveal del wordmark. Control total, texto perfecto. *Recomendado como base.*
- **B · 3D (Blender/Cinema4D/Unreal)** — solo para el objeto héroe (Hayabusa, objeto cromo, o el
  wordmark como pieza cromo-UV materializándose desde partículas). Se compone sobre A.
- **C · IA de video (Runway/Kling/Sora/Luma)** — genera fondos/atmósfera de estática y "máquina"
  en clips de 5–10 s. **Límite duro: no rinde texto legible ni logos consistentes** → el nombre
  ZIGNALEZ SIEMPRE se hace en A (compositing), nunca se le deja a la IA.
- **Recomendado: híbrido B/C para el material + A para señal, reveal y edición final.**

## 1. FORMATO Y ENTREGABLES (fijar antes de producir)
- **Uso**: pantalla de show. Default **16:9, 3840×2160, 24–30 fps**. `FALTA:` relación real de la
  pantalla del venue (si es LED vertical o wall raro, cambia todo).
- **Duraciones**: (a) **opener 15–25 s** (dead air → lock → hold del nombre); (b) **loop pre-show
  6–10 s** (estática buscando señal, sin resolver, para dejar en bucle antes de que entre).
- **Audio**: el lock se sincroniza al **drop de un tema** (default HAYABUSA); entregar con y sin
  música. **Sin depender del audio del venue** para que se entienda visualmente.
- Entregables: master ProRes/H.264 + versión loop + still del frame del lock (para flyers/RRSS).

## 2. IDENTIDAD (de CONTEXTO — no negociable)
Negro `#0A0A0B` · violeta-UV `#8B3DFF` · cromo-plata · blanco puntual reactivo. **Prohibido rojo
`#F80606`** (sello). Materiales del brief: cuero, metal, superficies brillantes, humo ligero. El
UV **aparece** como energía (no glow plano). Marca: ZIGNALEZ / "El Zigg Ziggy". Universo Hayabusa =
presencia de máquina; "La Señal" = transmisión.

## 3. GUION POR BEATS (shot list)
**BEAT 1 — DEAD AIR / SIN SEÑAL (0–5 s).** Negro. Estática de TV, ruido de nieve, una portadora
tenue. Barras de señal buscando. Overlay tipo OSD: `NO SIGNAL` / `SEARCHING…`. Frío, sin color, sin UV.
**BEAT 2 — INTERFERENCIA (5–12 s).** La señal engancha y se cae. Fragmentos que asoman entre el
ruido: silueta, destellos de cromo, la Hayabusa insinuada, un flicker de UV que intenta prender.
Glitch, datamosh, scanlines. Tensión de expectativa (mecanismo Juslin: la emoción vive en la espera).
**BEAT 3 — EL LOCK / CON ZIGNALEZ (12–16 s).** La señal **entra de golpe**, sincronizada al drop:
surge de UV, el ruido colapsa en foco, el cromo se arma, y el **wordmark ZIGNALEZ se materializa
desde las partículas/estática** (compositing, texto perfecto). Todo nítido. Es el clímax único.
**BEAT 4 — HOLD (16–22 s).** El nombre sostenido con vida (UV respirando, humo, reflejos cromo).
Cierra en el logo o el arte del release. Para el loop pre-show, se corta antes del lock y se cicla en BEAT 1–2.

## 4. DÓNDE EL 3D SÍ GANA (no meter 3D porque sí)
- **Wordmark ZIGNALEZ** como pieza cromo-UV que se ensambla desde partículas (Blender + partículas).
- **Hayabusa / objeto máquina** girando o emergiendo del humo (si hay modelo; si no, `FALTA: modelo 3D`).
- Todo lo demás (estática, glitch, barras, scanlines, grade UV) es motion graphics 2D — más rápido y preciso.

## 5. BLOQUES DE PROMPT POR CAMINO (para copiar al motor elegido)
- **IA de video (fondos/atmósfera, camino C)** — describir: "dark broadcast static, analog TV noise,
  signal bars searching, chrome fragments and violet-UV glints emerging from glitch, volumetric smoke,
  cinematic, high contrast black, no text". Generar 3–4 clips de 5–10 s, **sin texto**. El texto va aparte.
- **3D (objeto héroe, camino B)** — escena: material cromo pulido + emisión UV `#8B3DFF`, HDRI oscuro,
  humo, cámara lenta orbitando; el wordmark como mesh que se compone desde partículas.
- **Compositing (camino A)** — montar fondos + 3D, añadir glitch/scanlines/OSD, **rendir el wordmark
  nítido**, grade UV/cromo, sync del lock al drop. Aquí se garantiza que el nombre se lee perfecto.

## 6. RÚBRICA ≥ 9/10 (autoevaluar e iterar; no autodeclarar el 10)
1. Tensión de la espera (¿el "sin señal" genera expectativa real?). 2. Impacto del lock (¿el reveal
golpea, sincronizado?). 3. Wordmark nítido y correcto (cero deformación de IA). 4. Consistencia de
marca (UV/cromo, **sin rojo**). 5. Coherencia del concepto "La Señal". 6. Calidad técnica (sin
artefactos feos, grade limpio). 7. Legibilidad a distancia en pantalla de show. 8. Loop invisible
(el pre-show cicla sin costura). 9. Funciona sin audio del venue. 10. Entregables completos (opener +
loop + still, con y sin música).

## 7. ANTIPATRONES
Dejar el wordmark a la IA (sale deforme) · rojo del sello · UV como glow plano permanente · glitch
gratuito que no construye hacia el lock · un corto que solo se entiende con la música puesta · 3D
metido donde el 2D es mejor · resolución/relación que no calza con la pantalla real del venue.

## 8. CRITERIOS DE ACEPTACIÓN
Camino declarado · beats 1–4 presentes · lock sincronizado al drop · wordmark perfecto vía
compositing · sin rojo · opener + loop + still entregados · relación/resolución = pantalla real
(o `FALTA:`) · rúbrica ≥9 con evidencia o gap declarado.

## AUDITORÍA DE FUENTES
- Verificado esta sesión: identidad y universo (CONTEXTO.md — paleta, prohibición del rojo, Hayabusa=
  máquina, "frequency room"); límite de IA de video para texto/logos (conocimiento técnico vigente,
  [Probable] — no probado con TU motor específico esta sesión).
- `FALTA` (bloquea producción real): relación/resolución de la pantalla del venue; modelo 3D de la
  Hayabusa; qué tema para el drop del lock; motor de producción elegido (A/B/C).
- Límite declarado: un prompt maestro dirige, no renderiza; el 3D es posible pero requiere un artista
  o una herramienta que lo ejecute — no sale de este documento solo.
