# PROMPT MAESTRO — Adaptación mobile del sitio Zignalez

> Deja el sitio público de Zignalez impecable en teléfono (320–430 px), sin romper el
> desktop. Grounded en una auditoría real del `index.html` a 390 y 320 px. Estático, sin
> framework. Reversible (solo CSS + un ajuste de clase).

## ROL Y PRINCIPIO
Ingeniero front mobile-first, adversarial. Regla dura: **en teléfono el pulgar manda** —
legibilidad y toques de ≥44 px sobre densidad visual. Cero scroll horizontal de página.
Carruseles se navegan con **swipe** (las flechas son de desktop). Un solo media activo a la
vez. Respetar `prefers-reduced-motion` y el `safe-area` del notch. Sin el rojo del sello
(`#F80606`). Nada se declara "listo" sin verlo renderizado a 390 y 320 px.

## 0. ESTADO REAL (auditado esta sesión con Playwright a 390/320 px; re-verificar antes de tocar)
- Sin overflow horizontal de página (`document.scrollWidth == innerWidth == 390`). ✔
- **Hero, grilla de Videos (1 col), formulario y footer**: correctos en mobile. ✔
- **Rails horizontales** (Spotify "Ya disponibles" `.cf-track`, TikTok `.tkc`): se deslizan
  bien con el pulgar; se ven ~1.7 tarjetas. ✔
- **BUG 1 — Carrusel "Próximos estrenos"**: la tarjeta usa overlay absoluto sobre un marco
  16:9; en 390 px el marco es bajo y el texto (kicker/título/lead/CTA) se **encimaba** y el
  título quedaba oculto. → Arreglado: en mobile el video va como bloque 16:9 y el texto/CTA
  van **debajo** sobre fondo sólido; flechas ocultas (queda swipe + dots).
- **BUG 2 — Óvalo gigante del botón "Seguir en TikTok"**: el `<a class="follow-cta tk">`
  chocaba con una regla vieja `.tk{flex:0 0 320px}` del carrusel TikTok anterior; en
  `.sec-head` (que en mobile es `flex-direction:column`) ese `flex-basis:320px` se leía como
  **320 px de alto** → píldora deformada. → Arreglado: eliminada la regla `.tk` muerta (el
  carrusel ahora es `.tkc`) y `.follow-cta{flex:0 0 auto;align-self:flex-start}` como blindaje.

## REGLAS MOBILE POR SECCIÓN (breakpoint principal: `@media(max-width:640px)`)
- **Nav**: logo + CTA "Únete a la lista" visibles; los links pueden colapsar. El CTA no se
  encoge por debajo de 44 px de alto.
- **Hero**: título fluido (`clamp`), botones full-width apilados, meta en una columna.
- **Próximos estrenos (carrusel)**: `estreno-frame` sin `aspect-ratio` fijo; `estreno-vid`
  `position:relative` como bloque 16:9; `estreno-over` `position:relative` con fondo sólido y
  padding; `arrow` ocultas; título ~30 px; CTA `display:block`. Navegación por swipe + dots.
- **Videos**: grilla a 1 columna (`minmax(min(100%,300px),1fr)` ya lo hace); el reproductor
  abre inline; botón "✕ Volver" alcanzable; miniatura con fallback de marca si el thumb falla.
- **Ya disponibles (Spotify)** y **TikTok**: rails con `scroll-snap-type:x mandatory`,
  `-webkit-overflow-scrolling:touch`, sin scrollbar; tarjetas 200–220 px; play ≥44 px.
- **Formulario**: inputs `font-size:16px` (evita el zoom automático de iOS); labels claras;
  botón full-width; checkbox de consentimiento con área de toque generosa.
- **Follow CTAs (YouTube/TikTok/Spotify)**: `flex:0 0 auto`, nunca estirados; una sola línea o
  wrap limpio; íconos con color de plataforma solo en el chip.
- **Deep-link a apps** (ya implementado): en móvil los links de Spotify/YouTube/Instagram
  abren la app nativa con fallback web; TikTok abre su app por universal link.

## CHECKLIST DE VERIFICACIÓN (correr a 390 y 320 px)
1. `document.scrollWidth === window.innerWidth` (cero scroll horizontal) en toda la página.
2. Ningún texto encimado ni cortado; todos los títulos visibles.
3. Toques ≥44×44 px (play, flechas si existen, CTAs, dots, checkbox).
4. Inputs a 16 px (sin zoom en iOS).
5. Un solo video/Spotify reproduce a la vez; "Volver" cierra el embed.
6. `prefers-reduced-motion`: sin autoplay de carrusel ni animaciones agresivas.
7. Sin `#F80606`. Respeta `env(safe-area-inset-*)` si hay barra/notch.

## GUARDRAILS
Solo CSS + el fix de la clase colisionada; no tocar la lógica JS ni el desktop · rails con
swipe, no dependas de flechas en móvil · sin rojo del sello · un media activo a la vez ·
reversible.

## CRITERIOS DE ACEPTACIÓN
A 320–430 px: cero scroll horizontal; carrusel de estrenos legible (video arriba, texto y CTA
abajo, título visible); botones de seguir como píldoras normales; rails deslizables; formulario
sin zoom; reproducción de a uno; sin rojo. Desktop intacto.

## AUDITORÍA DE FUENTES
- **Verificado esta sesión (Playwright 390/320 px):** sin overflow horizontal; hero/videos/
  form/footer OK; rails deslizables OK; **BUG 1** (carrusel encimado) y **BUG 2** (óvalo del
  follow-cta TikTok, medido 209×**320 px** por colisión `.follow-cta.tk` con `.tk{flex:0 0
  320px}`) reproducidos y **corregidos** (CTA ahora 42 px; carrusel con video-arriba/texto-abajo).
- **Decisión declarada:** en móvil se ocultan las flechas del carrusel a favor de swipe+dots
  (patrón estándar touch); si prefieres flechas también en móvil, se reponen con `top` ajustado
  al centro del video.
- **Dato faltante que más cambiaría el resultado:** pruebas en dispositivos reales (iOS Safari
  con notch / Android Chrome) — el render headless no cubre `safe-area` ni el zoom real de iOS.
