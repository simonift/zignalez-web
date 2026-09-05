# PROMPT MAESTRO — Correcciones del sitio de Zignalez → commit, push y deploy

> Deriva de la revisión del panel de agentes (web-conversion, validador-maquetas,
> arquitecto, auditor, analista-streaming) sobre `sitio-zignalez/index.html`.
> Grounded en `.claude/CONTEXTO.md`. Una fase por sesión; cada fase corre su
> criterio de aceptación y reporta literal. Nada se declara listo sin correrlo.

## PRINCIPIO
El sitio tiene un solo trabajo: convertir tráfico de link-in-bio en contactos
propios, y empujar el GUARDADO/seguir en Spotify (la métrica —0,48%— que gobierna
la distribución). Toda corrección se juzga por eso, no por estética.

---

## FASE C1 · Correcciones estructurales + bugs  — ✅ APLICADA (index.html)
Hecho por Claude, sin depender de assets:
1. **Jerarquía del hero invertida**: "Únete a la lista" pasa a CTA primario;
   "Escuchar TNT" a secundario; se agrega "Seguir en Spotify".
2. **Conversión pegada al player**: al abrir una portada aparece un CTA
   "Guardar/Seguir en Spotify + Únete a la lista" (convertir donde ocurre la escucha).
3. **Fuga eliminada**: se quitó el "Abrir en Spotify" junto al player.
4. **CTAs repetidos**: cierre de EPK y footer ahora llevan a la captura (antes el
   footer era 100% salida).
5. **Vanidad fuera**: los tiles de reproducciones acumuladas del EPK → hechos
   cualitativos (género, base, sello, catálogo). Se corrige el 5-vs-6 agregando el
   6º release a la grilla (Gatas & Gangster's original).
6. **Bugs (auditor)**: estado de éxito del formulario ahora es visualmente distinto
   del de error (clases `ok`/`err`/`warn`); `allow` del iframe completo
   (clipboard-write, fullscreen, picture-in-picture); portada activa marcada
   (`aria-pressed`); enlaces muertos de TikTok/YouTube deshabilitados ("pronto").
7. **WhatsApp** justificado con línea de valor.

### ✅ Criterio C1
Abrir el sitio: el CTA dominante del hero es la lista · tocar una portada muestra el
CTA de guardar/captura pegado · el footer lleva a la lista · no hay enlaces a `#`
muertos · éxito y error del form se ven distintos. (Verificable a ojo en el archivo.)

---

## FASE C2 · Identidad visual — PENDIENTE (requiere TUS assets; sin ellos es chasis)
Veredicto del `validador-maquetas`: **NO LISTO** sin esto.
1. **Foto real** del artista en el hero (el brief exige que los efectos refuercen la
   fotografía, no la reemplacen).
2. **Arte real de portadas** en la grilla (hoy son gradientes).
3. **Materiales del brief**: cuero, metal, superficies brillantes, humo ligero — hoy
   el diseño es plano. Sumar textura/grano.
4. **Reveal UV**: el violeta como mecánica (hover/scroll/luz negra), no solo halo.

### ✅ Criterio C2
El `validador-maquetas` pasa de NO LISTO a LISTO CON CONDICIONES: hay foto, hay
material, hay reveal UV. Sin esto **no se publica como "carta de presentación"**.

---

## FASE C3 · Legal / privacidad — PENDIENTE (requiere TUS datos; bloquea la captura)
`privacidad.html` está creado como BORRADOR con los `FALTA` marcados. Para publicarlo:
1. **Datos del responsable**: nombre, RUT, domicilio, correo de contacto. (FALTAN.)
2. **Plazo de conservación** tras la baja, con respaldo legal — **confirmar con
   abogado/a**, no de memoria. (FALTA.)
3. Fecha de vigencia. Revisar contra Ley 19.628 y **Ley 21.719 (rige 01-12-2026)**.

### ✅ Criterio C3
`privacidad.html` sin ningún `[ FALTA ]`, enlazada desde el formulario y el footer,
publicada ANTES de activar la captura. **Antipatrón crítico: activar el formulario
sin política = infracción, no detalle.**

---

## FASE C4 · Backend de captura (ADR-001) — PENDIENTE (desbloquea el form)
Worker + D1 (dueño del doble opt-in) + Resend (confirmación) + MailerLite (campañas).
Pegar la URL del Worker en `ENDPOINT_CAPTURA` del index — **solo después de C3**.

### ✅ Criterio C4
Un alta real dispara el correo de confirmación (doble opt-in); D1 guarda el contacto;
el form muestra el estado `ok`. Sin endpoint, sigue bloqueado con aviso (correcto).

---

## FASE C5 · Commit, push y deploy en Cloudflare — BLOQUEADA hoy (verificado)
Estado real (05-09, en la máquina): `zignalez-pipeline` **no es repo git**; **wrangler
no está instalado**; **gh no está instalado**; **SSH a GitHub falla** ("Host key
verification failed"). Node/npm sí están. Pasos, en orden:
1. `git init` en `zignalez-pipeline` (o un repo propio solo para `sitio-zignalez/`).
2. Arreglar auth de GitHub: `gh auth login` por HTTPS (evitar la capa SSH rota), crear
   el repo remoto, primer commit y push. Mensajes de commit honestos por fase.
3. Cloudflare Pages: **conectar el repo de GitHub por el dashboard** (build command
   vacío, output = carpeta del sitio) — es lo más simple y no requiere wrangler.
   Alternativa CLI: `npm i -g wrangler`, `wrangler login`, `wrangler pages deploy`.
4. Dominio + apuntar el **link-in-bio** de IG/TikTok al dominio. **Sin este último
   paso el sitio no recibe una sola visita** (mayor ROI, 2 minutos).

### ✅ Criterio C5
El sitio carga en el dominio, la política está publicada, el form captura con doble
opt-in, y el link-in-bio apunta al dominio. **No se hace deploy con captura activa
hasta que C3 y C4 estén cerradas.**

## AUDITORÍA DE FUENTES
- Verificado en disco (05-09): estado git/wrangler/gh/SSH (todos ausentes/rotos);
  correcciones C1 aplicadas en index.html; privacidad.html creado como borrador.
- De la revisión del panel: hallazgos de conversión, vanidad, NO LISTO visual, bugs.
- FALTA (bloquea publicar): datos del responsable, plazo legal, assets visuales,
  endpoint del Worker, auth de GitHub, cuenta/proyecto de Cloudflare.
