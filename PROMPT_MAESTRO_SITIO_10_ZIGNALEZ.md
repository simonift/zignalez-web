# PROMPT MAESTRO — Sitio musical Zignalez, evaluación ≥ 9/10
## Emoción de show en vivo + máxima conversión, anclado en investigación

> Construye y **auto-evalúa** el sitio musical de Zignalez hasta acercarlo a un 10 en una
> rúbrica explícita. Fundado en psicología de la música + marketing de fans (fuentes reales,
> abajo) y en `.claude/CONTEXTO.md` (fuente única de datos del artista). Ninguna cifra, URL,
> cover o VIDEO_ID se inventa: lo que falta se marca `FALTA:`. Cierra con AUDITORÍA.

## ROL Y PRINCIPIO
Director creativo + de conversión, adversarial. Un "10" no se declara: se **aproxima** contra
una rúbrica y se demuestra. Anunciar "es un 10" es autoengaño (se penaliza). La tensión central
que este prompt **resuelve, no ignora**: *emoción de show en vivo* (inmersivo, pesado, con
fricción) tira contra *captar la máxima cantidad de clientes* (rápido, directo). Regla dura:
**la emoción está al servicio de la única acción; si un efecto retrasa el LCP, tapa el CTA o
secuestra el scroll, se elimina.** Emoción y conversión no se maximizan ambas al tope — se
integran: primero golpe emocional en <2,5 s, e inmediatamente una acción clara.

---

## 0. FUNDAMENTOS DE INVESTIGACIÓN (verificar en sesión; traducir cada uno a una regla de diseño)
Cada pilar es un mecanismo, no decoración. El diseño debe poder señalar qué mecanismo activa.

1. **Emoción musical — teoría unificada de Juslin (mecanismos BRECVEMA).** La música no emociona
   por un solo canal: contagio, imaginería visual, memoria episódica, expectativa, y juicio
   estético operan juntos. → *Regla:* el sitio no solo "pone a sonar" — apoya la escucha con
   imagen (cover en alta), contexto y una narrativa que dispara memoria/expectativa. La emoción
   de entrada nace de imagen + sonido + tensión, no de un autoplay.
2. **Vínculo parasocial + transmisión en vivo.** La investigación sobre fans muestra que la
   *interacción cuasi-social* — sentir que el artista te habla, sobre todo en formato "en vivo" —
   construye apego y lealtad sostenida. → *Regla:* la "sensación de show en vivo" se diseña como
   **dirección directa del artista al visitante** (primera persona, "te", material que se siente
   presente/inmediato), no como fuegos artificiales. El teaser de inéditos es el gancho parasocial.
3. **Primera impresión ~50 ms + efecto estética-usabilidad.** El juicio de una web se forma en
   decenas de milisegundos y contamina la percepción de todo lo demás (halo). → *Regla:* el primer
   viewport debe ser estéticamente impecable y cargar visualmente casi instantáneo — el cover en
   alta y el nombre son lo primero que pinta; nada de layout roto o placeholder a la vista.
4. **Embudo oyente→superfan (direct-to-fan).** Convertir es un embudo: desconocido → oyente →
   contacto propio → superfan. El sitio no genera tráfico, lo **convierte** y **retiene**. →
   *Regla:* una sola acción primaria por pantalla, el contacto propio como objetivo, y una razón
   exclusiva de volver (los inéditos). Sin captura, todo lo demás es decorativo.

## 1. GROUNDING (de CONTEXTO.md — verificado 23-08-2026; declarar si >30 días)
- Audiencia fusionada (de análisis previo): entra joven por TikTok/IG (demanda de búsqueda real
  por **"flacko loyal"**), convierte núcleo chileno 25–34. Identidad compartida: cachan el
  freestyle real, desconfían de la máquina, quieren **estar adentro antes que el resto**.
- Gancho con fecha: **HAYABUSA (con Flacko Loyal)** y **LUCE BIEN (con ACHEH y D-FOX)**, inéditos
  en edición, temas propios de Zignalez → razón exclusiva para inscribirse.
- Paleta: negro `#0A0A0B`, violeta-UV `#8B3DFF`, cromo. **Prohibido rojo `#F80606`** (sello).
- Prohibido: cifras de vanidad (277 oyentes, reproducciones en crudo), "350M" del sello, contadores.

## 2. EL CONCEPTO — "La Señal / Sintonizar la transmisión"
Un concepto, no efectos sueltos. Zignalez = **señal**. Entrar al sitio = **sintonizar una
transmisión en vivo** del artista. Coherente con la marca (UV que *aparece* como energía, cromo,
"El Zigg Ziggy"), con el mecanismo parasocial (transmisión = presencia), y con el catálogo
(HAYABUSA = máquina/presencia; LUCE BIEN = "the frequency room"). La emoción de entrada:
un **"lock de señal" cinemático de 2–3 s** (estática→foco, el UV revela el nombre y el cover
del release actual) que **resuelve** en el hero con el CTA visible. Se ejecuta una vez, respeta
`prefers-reduced-motion`, y **nunca** bloquea el contenido ni retrasa el LCP real.

## 3. EXPERIENCIA "SHOW EN VIVO" (dentro de los límites de rendimiento y conversión)
- **Dirección directa del artista** (parasocial): copy en primera persona, material que se siente
  presente ("esto es lo que viene", "primero acá").
- **Sonido bajo interacción, jamás autoplay** (los navegadores lo bloquean y arruina la UX): el
  usuario decide reproducir; ahí entra el reproductor por fachada.
- **Reveal UV como mecánica** (hover/scroll/estado activo), no glow plano permanente.
- **Un momento de clímax**, no diez: el lock de señal en la entrada. El resto es limpio y rápido.
- **Prohibido**: autoplay de audio, scroll-jacking, intro que no se pueda saltar, animación que
  retrase el primer viewport.

## 4. CATÁLOGO COMPLETO + PIPELINE DE COVER ART (calidad = emoción)
Considera **todo** el catálogo de CONTEXTO (propios: TNT, LA DATA, RXRX, Gatas & Gangster's
[Remix y original], XTUBIEN; y colaboraciones: LA SANTA, TU CUERPO, ALTA GAMA, Destellos Del Ayer,
Uoh Uoh Oh, Amores Tóxicos, Esto No Es Un EP, Ta Xplotao, Como Te Va) + los 9 videos reales de
YouTube. Marca artista principal donde CONTEXTO lo tenga sin confirmar.

**Pipeline de calidad de cover (en orden — la calidad no se inventa):**
1. **Fuente máster oficial** primero: arte original del sello/distribuidora (The Orchard/División
   Rec) o el arte en alta de Spotify/Apple (hasta 3000×3000). Es lo mejor y evita upscaling.
2. Si no hay máster: mayor resolución pública disponible (Spotify i.scdn, Apple, YouTube maxres).
3. **Upscaling solo como último recurso**, declarando el límite: el upscaling **no crea detalle
   que no existe** — recupera nitidez, no inventa arte. Un cover de 300px upscalado no iguala a un
   máster. Si el resultado no llega a calidad de portada, se marca `FALTA: máster de <tema>`.
4. **Consistencia de galería**: todos al mismo tamaño/relación, tratamiento coherente (grano/UV
   sutil del brief) sin deformar el arte. La foto/arte manda sobre el efecto.
- Regla dura: **no inventar covers ni generar arte falso** que se haga pasar por el oficial.

## 5. MOTOR DE CONVERSIÓN (sigue siendo el trabajo)
Una acción primaria por pantalla · captura de contacto propio (doble opt-in, Worker+D1) · razón
exclusiva de volver (inéditos gateados) · link-in-bio de IG/TikTok apuntando al dominio (mayor ROI).
Sin política de privacidad publicada, la captura no se activa (Ley 21.719 rige 01-12-2026).

## 6. RÚBRICA DE EVALUACIÓN — meta ≥ 9/10 en cada dimensión (0–10)
Autoevalúa, reporta el puntaje por dimensión con evidencia, e **itera hasta ≥9 en todas**. Si algo
queda <9, dilo y explica qué falta — no infles el número.
1. **Impacto emocional a la entrada** (¿el primer viewport genera emoción en <2,5 s, con imagen+
   nombre, sin romper carga?).
2. **Claridad de la acción** (¿se entiende en 5 s qué hacer? ¿una sola primaria?).
3. **Calidad del catálogo/cover** (¿arte en alta, coherente, real? ¿todo el catálogo?).
4. **Sensación de "en vivo"/parasocial** (¿el artista se siente presente y hablándote?).
5. **Rendimiento** (LCP <2,5 s en 4G, JS propio liviano, sin 15 iframes al cargar).
6. **Accesibilidad AA** (foco visible propio, contraste, teclado, `alt`, reduced-motion, un-video-a-la-vez).
7. **Mecánica de conversión** (captura real con doble opt-in; CTAs sin callejón sin salida).
8. **Consistencia de marca** (UV/cromo, sin rojo del sello, sin vanidad).
9. **Coherencia del concepto** (todo sirve a "La Señal", nada suelto).
10. **Honestidad/integridad** (sin datos inventados, sin promesas que no se cumplen, riesgos declarados).

## 7. EVALUACIÓN POR ROLES (adversarial; cada rol puede reprobar y baja el puntaje)
- **Validador-maquetas (UX/UI):** primer viewport, jerarquía, foco, un-video-a-la-vez, degradación.
- **Analista-streaming:** ¿empuja guardar/seguir + captura? ¿el gancho parasocial (inéditos) tiene salida real?
- **Security/Legal:** captura con base legal; inéditos gateados de verdad; secretos fuera del repo.
- **Auditor:** ¿algún "10" autodeclarado sin evidencia? ¿cover inventado? ¿cifra fuera de CONTEXTO?
  ¿efecto que rompe LCP? ¿promesa sin backend?

## 8. CRITERIOS DE ACEPTACIÓN
Rúbrica ≥9 en todas las dimensiones con evidencia (o el gap declarado) · concepto "La Señal"
coherente y saltable · covers en alta reales de todo el catálogo (o `FALTA:` por tema) · LCP <2,5 s ·
captura real con doble opt-in y política publicada · sin rojo, sin vanidad, sin autoplay, sin
scroll-jacking · cada afirmación factual trazable a CONTEXTO o a la sesión.

## AUDITORÍA DE FUENTES
- Verificado esta sesión (búsqueda web, sept 2026 — títulos/marcos, no lectura íntegra de cada paper):
  teoría unificada de emociones musicales de Juslin (BRECVEMA); investigación de vínculo parasocial
  fan-artista y lealtad vía transmisión en vivo; estudio de primera impresión ~50 ms (Lindgaard) y
  efecto estética-usabilidad; marco de embudo oyente→superfan (direct-to-fan). Confianza [Probable]
  a nivel de marco: no leí el texto completo de cada estudio; no atribuyo cifras exactas.
- De CONTEXTO.md (23-08-2026): catálogo, paleta, prohibiciones, audiencia, HAYABUSA/LUCE BIEN.
- `FALTA`: másters de cover en alta por tema; VIDEO_IDs ya extraídos de YouTube (9, esta sesión);
  confirmación de artista principal en 9 colaboraciones; datos del responsable para la política.
- Límite declarado, no dato faltante: un "10" es asintótico — la rúbrica lo aproxima y lo mide;
  el upscaling no crea detalle inexistente. Ambos son límites reales, no pesimismo.

## Fuentes (verificación, sept 2026)
- Juslin — teoría unificada de emociones musicales: https://www.sciencedirect.com/science/article/pii/S1571064513000638 · https://pubmed.ncbi.nlm.nih.gov/23769678/
- Vínculo parasocial fan-artista (tesis): https://pdxscholar.library.pdx.edu/honorstheses/1146/
- Parasocial + transmisión en vivo, lealtad (estudio): https://pmc.ncbi.nlm.nih.gov/articles/PMC8996109/
- Primera impresión ~50 ms (Lindgaard et al.): https://www.tandfonline.com/doi/abs/10.1080/01449290500330448
- Efecto estética-usabilidad (NN/g): https://www.nngroup.com/articles/aesthetic-minimalist-design/
- Embudo oyente→superfan (direct-to-fan): https://diymusician.cdbaby.com/music-marketing/from-casual-listeners-to-fans/ · https://www.waterandmusic.com/music-data-decoded-fan-first-marketing/
