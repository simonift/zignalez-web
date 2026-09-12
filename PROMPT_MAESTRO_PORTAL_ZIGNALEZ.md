# PROMPT MAESTRO — Portal de fans de Zignalez · v2 (con validación y derechos)

> Objetivo: el que se inscribe accede a pre-views/maquetas, fechas, RRSS y plataformas.
> **Cambio clave v2 (crítica del auditor): no se construye el portal con cuentas hasta
> validar que la demanda existe.** Se prueba barato primero. Grounded en `.claude/CONTEXTO.md`
> y `analista-rrss`. Ninguna cifra se inventa.

## PRINCIPIO
Convertir audiencia programada (llegó por algoritmo, no eligió al artista) en relación
propia. La escucha/pre-view es el gancho; el contacto/cuenta es lo que el artista controla.
**Regla dura de escala (del `arquitecto`): no construir infraestructura antes de tener la
demanda que la justifique.** Portal con cuentas + DB + VPS es para cuando los fans peleen
por entrar, no para 79 activos.

## 0. PERFIL DE NICHO (extraído de datos reales — analista-rrss + CONTEXTO, 23-08-2026)
- Convierte hoy: **79 activos** (planos) + los que reaccionan al contenido y se pierden.
  Núcleo **25–34 (37%), 70% masculino**. Geos de conversión: **Chile (70% activo),
  Argentina (52%)**, México (volumen, baja conversión). Urbano/freestyle chileno.
- Problema central: el contenido genera atención (≈43k likes TikTok) pero **no enruta**;
  93% de la audiencia es programada; guardado **0,48%**; link-in-bio = URL cruda a TNT enterrada.
- Estrategia que esto implica: capturar al que reacciona → pedir **guardar/seguir** →
  darle una razón exclusiva de volver (pre-views) → enrutar IG/TikTok al dominio.
- Tono: crudo, chileno, sin vanidad. Sin "350M" (es del sello), sin contador de seguidores,
  sin mostrar los 277.

---

# ⭐ FASE 0 — Validar la demanda ANTES de construir el portal (barato, esta semana)
La pregunta que decide todo: **¿la gente se inscribe por pre-views?** Se responde sin
cuentas, sin VPS, sin backend.
1. **Publicar la carta de captura** (`sitio-zignalez/index.html`) en Cloudflare **Pages**
   con `zignalez.com`. Es estático, seguro, permanente. El formulario captura correo
   (doble opt-in vía Worker+D1 cuando esté; o un ESP con doble opt-in de entrada).
2. **Apuntar el link-in-bio de IG/TikTok al dominio** — el paso de mayor ROI, 2 minutos.
3. **Entregar los pre-views como enlace privado**, no como app: un Spotify/SoundCloud
   *unlisted*, o un enlace con expiración, enviado por correo/WhatsApp a los inscritos.
   Cero música inédita detrás de un login que hay que asegurar.
4. **Medir 2–4 semanas**: inscritos por cada 100 visitas (meta 20%), y cuántos abren el
   pre-view. Eso ES la evidencia.

### ✅ Criterio FASE 0 / puerta al portal
Si un volumen relevante se inscribe y consume los pre-views → el portal con cuentas se
justifica y se pasa a FASE 2. **Si no → no se construye el portal; el dinero y el riesgo
se evitaron.** Este es el punto que el prompt v1 no tenía.

# FASE 1 — Cláusula de derechos de la música inédita (bloqueante legal/contractual)
Antes de distribuir un solo pre-view, resolver:
- **Fuga inevitable**: el audio streameado es extraíble (graba pantalla, intercepta el
  stream). Un login no lo impide. Asumir que todo pre-view puede filtrarse y decidir qué
  se arriesga.
- **Contrato con el sello/distribuidora**: distribuir masters sin lanzar —aun a fans—
  puede chocar con División Rec / The Orchard. **Confirmar que tienes el derecho** de
  difundir material inédito por canal propio. FALTA verificar.
- **Consentimiento y datos**: signup con doble opt-in + política de privacidad publicada
  (Ley 21.719 rige 01-12-2026; responsable Zignalez con RUT/domicilio/correo — FALTAN).

---

# FASE 2 — Portal con cuentas (SOLO si FASE 0 validó demanda)
Reutiliza Artist Release OS. Estructura:
- **Público**: landing (foto real) → catálogo con reproductor → teaser de pre-estrenos
  bloqueado ("🔒 solo miembros") → signup. Fechas, RRSS, plataformas.
- **Miembro**: pre-views gateadas por rol, fechas, RRSS, plataformas. NO ve gestión.

## Estilo unificado — la mezcla (spec, no dirección vaga)
- **Base**: negro `#0A0A0B`, **violeta-UV `#8B3DFF`**, cromo-plata, blanco puntual.
  **Prohibido rojo `#F80606`** (sello).
- **Superficie (aporte cyber-urbano)**: glassmorphism **sutil** — paneles con
  `backdrop-filter: blur(10–14px)` sobre negro, borde `1px` cromo a baja opacidad; neón
  solo en CTAs y el reveal UV. **Al servicio de los materiales del brief** (cuero, metal,
  humo), no en vez de la fotografía. Regla: si el vidrio/neón compite con la foto, gana la foto.
- **Reveal UV**: el violeta como energía que *aparece* con interacción (hover/scroll/estado
  activo), no un glow plano permanente.
- **Tipografía**: Syne (display) + Manrope (cuerpo) + Space Mono (labels/data). Una sola.

## Hosting y seguridad (guardrails NO negociables)
- **Hosting real, NO túnel de laptop.** Hetzner CX (€5–19/mes) u Oracle Free para
  backend+DB; landing estático en Pages. Portal en `app.zignalez.com`; la raíz queda para
  la carta pública.
- **Seguridad antes de exponer**: `JWT_SECRET` fuera de texto plano (D-17); **roles fan
  vs admin** (D-18) — el fan jamás ve gestión; verificación de propiedad en media (D-07);
  **quitar credencial de prueba pública** (`user@example.com`/`password123`); gateo de
  pre-views por rol de verdad, no ocultar en el front.

## 3. EVALUACIÓN POR ROLES (adversarial, cada rol puede REPROBAR)
- **Arquitecto**: ¿se saltó la FASE 0? ¿reversible? ¿corre 3 meses sin mantención?
  ¿sobre-ingeniería para la escala? (Un portal antes de validar demanda reprueba.)
- **Security**: secretos fuera del repo, authz por rol, sin credencial pública, datos con
  base legal. Reprueba D-17/18/07 abiertos y cualquier pre-view sin cláusula de derechos.
- **Validador-maquetas (UI/UX)**: ¿foto real? ¿materiales + reveal UV, no glow plano?
  ¿sin rojo del sello? Veredicto LISTO / CON CONDICIONES / NO LISTO.
- **Analista-streaming**: ¿empuja GUARDAR/seguir, no vanidad? ¿el signup captura al que
  reacciona al contenido?
- **Auditor**: falso éxito, cifras fuera de CONTEXTO, "listo" sin probar, enlaces muertos,
  aprobaciones sin cobertura declarada.

## ✅ CRITERIOS DE ACEPTACIÓN GLOBALES
FASE 0 corrió y midió demanda real · derechos de pre-views confirmados · si se construye
el portal, va en hosting real (no túnel), con roles, sin secretos ni credenciales públicas,
estilo mezclado con foto real, y el link-in-bio apunta al dominio.

## AUDITORÍA DE FUENTES
- Verificado (disco, esta sesión): nicho derivado de `analista-rrss.md` + `CONTEXTO.md`
  (79 activos, 25–34/70%M, 0,48% guardado, 93% programada); defectos D-07/17/18 de FLUJOS.md;
  el portal se expuso por túnel `cloudflared` desde localhost con credencial pública.
- Corrección v2 sobre v1: se agregó FASE 0 (validación barata) y FASE 1 (derechos), que v1
  no tenía; el portal pasa a ser condicional a la evidencia, no el punto de partida.
- FALTA (bloquea): evidencia de demanda (FASE 0); derecho contractual sobre inéditos;
  hosting elegido; RUT/domicilio/correo del responsable; fixes D-17/18/07; foto real.
