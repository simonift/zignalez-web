# PROMPT MAESTRO — Vista del productor: el reproductor del sitio, estado profesional, diseño 3D

Repo: `~/zignalez-pipeline/sitio-zignalez` · Rama: `feat/productor-reproductor` (desde `master`; PR, nunca commit directo)
Página: `productor.html` + `assets/productor.js` (142 líneas) · Base: `supabase/fix-08-produccion-colaboradores.sql`
Referencia: reproductor de socios en `assets/app.js` (`montarZP` l. 737, `cablearZP` l. 830, `cablearOnda`/`pintarOnda` l. 1428–1560, `ponerMediaSession` l. 1551) y su CSS en `index.html` l. 280–570 (`.zp-*`, escena 3D)
Fecha: 29-09-2026

---

## 0. Diagnóstico (captura 29-09, 20:12)

| Problema | Dónde | Evidencia |
|---|---|---|
| `<audio controls>` nativo del navegador, sin identidad | `productor.html` l. 90; `.player` l. 49–52 | Es la única pantalla del sitio con el reproductor por defecto de Chrome. Un productor externo compara esto con Splice/Disco/Dropbox y pierde. |
| El estado es el enum crudo | `productor.js` l. 114: `item.etapa` → "RELEASE_READY", "DEMO" | Jerga interna de la base expuesta a un tercero. |
| Título con prefijo y paréntesis técnicos | "ZIGNALEZ - CARAMELO (LE CARTER)" | El artista es siempre Zignalez; el paréntesis es el productor o la versión. Se lee como nombre de archivo. |
| "Vence 29-10-2026" sin urgencia ni contexto | l. 116 | No dice cuántos días quedan ni cuándo se compartió. |
| Sin onda, sin scrub, sin teclado | `<audio>` nativo | El sitio ya tiene onda por `tracks.peaks` (fix-05), scrub por teclado y MediaSession; aquí no se usan. |
| Sin diferenciar lo nuevo | — | Cuatro tarjetas iguales; no se ve qué se compartió hoy. |

## 1. Rol

Diseñador-desarrollador del sitio. Lees `PROMPT_MAESTRO_PORTAL_ZIGNALEZ.md`, `PROMPT_MAESTRO_UNIFICAR_FRONTEND_ZIGNALEZ.md`,
el reproductor de socios completo (app.js + CSS) y `fix-08`. Cada fase es un commit propio en la rama. Vanilla JS,
sin frameworks, sin dependencias nuevas (solo supabase-js que ya está). Los scripts `comprobar-meta.sh` y
`comprobar-privacidad.sh` siguen verdes.

## 2. Invariantes (no negociables: vienen de fix-08 y del ADR-003)

- **Qué se ve lo decide la base**: la lista sale solo de `mis_versiones_compartidas()`. Ningún filtro ni dato nuevo
  en el front puede mostrar algo que la RPC no devuelva.
- **El MASTER nunca**: solo `role = 'LISTEN'`. El reproductor nuevo no recibe `file_path` de otro rol.
- **Revocación en ≤ 60 s**: URL firmada de 60 s → `fetch` → blob en memoria (`productor.js` l. 76–93). El reproductor
  del sitio se alimenta con ese blob (`URL.createObjectURL`), **no** con la URL firmada directa (que reproducida en
  streaming seguiría sonando tras revocar). Al revocar/cerrar sesión: `detener()` revoca el blob.
- `noindex, nofollow`, sin Clarity ni analítica en esta página (hoy no hay: sigue sin haber).
- Sin `localStorage` con datos de terceros; solo la sesión de supabase-js.
- Tokens: los de `index.html` l. 70–75, sin inventar colores. Acento del transporte dorado como en el sitio.

## 3. FASE 1 — Reproductor del sitio como módulo reutilizable

### 3.1 `assets/zp-player.js` (nuevo, ~350 líneas)
Extraer de `app.js` **solo** el reproductor (panel, transporte, onda, teclado, MediaSession, escena 3D del disco)
a un módulo con esta API, sin lógica de socios ni de letra:

```js
// window.ZP = { montar, cargar, detener, destruir }
ZP.montar(raiz, { conDisco: true, alReproducir(item, i){}, alTerminar(){}, decir(msg){} })
ZP.cargar(lista, i)         // lista: [{ id, titulo, subtitulo, peaks, fuente: async () => blobUrl }]
ZP.detener()                // pausa, quita src, no toca el blob (lo revoca quien lo creó)
```
- **Estructura y clases idénticas** a `montarZP` (`.zp > .zp-zona/.zp-escena/.zp-par/.zp-disco` + `.zp-panel` +
  `.zp-tr` + `.zp-estado`), para que el CSS de `index.html` l. 280–570 se copie a un `assets/zp-player.css`
  compartido y ambos HTML lo enlacen. `index.html` deja de tener ese CSS inline (fase 3) — **no antes**.
- Comportamiento 1:1: play/pausa con `aria-pressed`, anterior/siguiente sobre la lista, repetir 3 estados (0 por
  defecto), mudo, onda `canvas` con `ResizeObserver`, scrub por puntero y teclado (←/→ ±5 s, Shift ±30, PageUp/Down
  ±60, Home/End), `aria-valuetext` "1:23 de 3:45", barra neutra sin picos, MediaSession con `setPositionState`,
  `duration === Infinity` tratada como desconocida, textos de `aria-live` del sitio, disco que gira solo al sonar y
  se queda donde está al pausar, paralaje del puntero, `prefers-reduced-motion` → sin vaivén ni paralaje.
- `fuente()` es asíncrona a propósito: en el productor baja el blob (60 s + revocación); en socios seguirá siendo la
  URL firmada. El módulo no sabe de Supabase.

### 3.2 Picos para la onda
`mis_versiones_compartidas()` no devuelve `peaks`. **`supabase/fix-13-productor-picos.sql`**: la RPC agrega
`t.peaks` (ya existe en `tracks`, fix-05) y `s.shared_at` ya viene. Sin picos: barra neutra (nunca una onda
inventada). Solo se toca esa función; sin cambiar políticas.

## 4. FASE 2 — La vista del productor

### 4.1 Composición (mismo esqueleto que la sección de socios de `index.html`)
- ≥ 980 px: dos columnas `zp-cols` (448 px + resto): **izquierda** el reproductor con disco 3D (`conDisco: true`);
  **derecha** la lista. < 980 px: una columna, el reproductor **pegado abajo** (sticky, disco a `min(34vw,16vh,130px)`
  como el `@media` de socios l. 520–530).
- Cabecera: eyebrow "Zignalez · Colaboradores", H1 "Lo que te compartieron", correo + "Cerrar sesión" a la derecha.
  Debajo, una línea: "N temas · el más reciente hace X" (o "Nada compartido todavía").

### 4.2 Tarjeta de tema (`.zp-card`, reutilizando la lista de socios `.zp-lista`)
```
▶  CARAMELO                              NUEVO
   prod. LE CARTER · Demo · 2:45
   Compartido hace 2 h · vence en 30 días (29-10)
```
- **Título**: `titulo` sin el prefijo `ZIGNALEZ - ` (regex `^ZIGNALEZ\s*-\s*`, insensible a mayúsculas) y con el
  paréntesis final separado como línea 2 con prefijo "prod." **solo si** no empieza por "FT"/"FEAT" (en ese caso se
  queda en el título: "LUCE BIEN FT ACHEH & D-FOX"). Si el título no calza con el patrón, se muestra tal cual.
  Es cosmético: el dato no se altera ni se guarda.
- **Etapa** con etiqueta y color, nunca el enum: `IDEA` Idea · `DEMO` Demo · `RECORDING` Grabación · `MIXING` Mezcla
  · `MASTERING` Máster · `RELEASE_READY` Lista para lanzar · `RELEASED` Lanzada. Chip `.chip` del sitio; las dos
  últimas en `--uv-soft`, el resto en `--smoke`. Un enum desconocido se muestra tal cual (no se oculta).
- **Vigencia**: "vence en N días (dd-mm)"; N ≤ 7 → chip ámbar `--amber` "vence en N días"; N ≤ 1 → "vence hoy/mañana".
  "Compartido hace X" con `Intl.RelativeTimeFormat('es-CL')`.
- **NUEVO**: compartido hace < 48 h (`shared_at`).
- Play en la tarjeta = `ZP.cargar(lista, i)`; la tarjeta activa se marca (`.on`) y el disco muestra el título en
  `.zp-label`. Tarjeta entera clicable con `role=button`, foco visible, 44 px de alto mínimo.
- Estado de carga por tarjeta ("Bajando…") mientras llega el blob; error inline si la URL venció ("El acceso venció.
  Recarga la página.").

### 4.3 Login
Misma tarjeta pero con el disco 3D estático (sin girar) como pieza visual a la izquierda en ≥ 980 px; en móvil solo
el formulario. Mensajes actuales sin cambios (ya están en español y son correctos).

### 4.4 Vacío
Sin shares: el disco quieto + "Nada compartido todavía. Cuando Zignalez te comparta un tema, aparece aquí con su
fecha de vencimiento." Sin botón, sin enlace.

## 5. FASE 3 — Unificar con socios (opcional, medido)
`index.html` pasa a usar `assets/zp-player.js` + `zp-player.css` y `app.js` pierde `montarZP`/`cablearZP`/onda.
**Compuerta**: antes y después, la sección de socios se prueba a mano con la lista completa (LRC sincronizado,
extracto de 30 s de fix-12, MediaSession en iOS). Si algo cambia, la fase se revierte y el productor sigue con su
copia. Es la fase con más riesgo de regresión y menos valor visible: va última y se puede no hacer.

## 6. Verificación (compuerta de cada fase)

- [ ] `./comprobar-meta.sh` y `./comprobar-privacidad.sh` verdes; `productor.html` sigue con `noindex`.
- [ ] Revocar un share en el admin → en ≤ 60 s el tema desaparece al recargar y, si sonaba, el blob ya cargado
      termina pero un nuevo ▶ falla con "El acceso venció" (mismo comportamiento que hoy, l. 76–93).
- [ ] `document.querySelectorAll('audio').length === 1`; ningún `src` apunta a una URL firmada (siempre `blob:`).
- [ ] Teclado: Tab por tarjetas → ▶ → onda → mandos; ←/→/Home/End en la onda; Esc no hace nada raro.
- [ ] VoiceOver: etapa se lee como "Lista para lanzar", no "RELEASE READY"; el estado Sonando/Pausado se anuncia.
- [ ] 390 px: sin scroll horizontal; reproductor pegado abajo no tapa la última tarjeta (`scroll-padding-bottom`).
- [ ] Onda real para temas con `peaks` (LUCE BIEN, HAYABUSA si los tienen calculados en el admin: botón "Calcular
      onda"); barra neutra para CARAMELO hasta calcularlos.
- [ ] `prefers-reduced-motion: reduce` → disco sin vaivén ni paralaje; gira igual al sonar.
- [ ] Lighthouse accesibilidad ≥ 95 en `/productor` (móvil).
- [ ] Captura antes/después a 1440×900 y 390×844 en el PR.

## 7. Fuera de alcance

- Letra sincronizada en la vista del productor (el LRC es de socios; un productor no lo necesita).
- Comentarios/feedback del productor sobre el tema (otro prompt: requiere tabla y política nuevas).
- Compartir desde la fila del archivo en el admin (se propuso el 29-09; es del admin, no de esta vista).
- Descargar el WAV: el ADR-003 lo prohíbe para LISTEN; no se agrega botón.
