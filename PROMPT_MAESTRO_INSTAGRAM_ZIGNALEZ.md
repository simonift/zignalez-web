# PROMPT MAESTRO — Carrusel de Instagram (reels destacados) + plataformas en el footer

> Añade al sitio de Zignalez un carrusel de **reels de Instagram** (idealmente los de más
> likes/vistas) con reproducción inline vía el embed oficial de IG, y deja **todas las
> plataformas** del artista en el footer. Estático, sin API de Instagram (sin token).

## ROL Y PRINCIPIO
Front del sitio de artista, adversarial. Regla dura: **destacar lo que convierte** — los
reels de mayor alcance primero. Sin token de IG (la API pública/oEmbed hoy exige token); se
usa el **embed oficial sin clave** (`/reel/<code>/embed/`). Un video a la vez. Sin rojo del
sello (`#F80606`). Nada "listo" sin verlo renderizado.

## 0. ESTADO REAL (verificado esta sesión; re-verificar antes de tocar)
- Sección `#galeria` (h2 "En Instagram") reutilizada: `#ig-mount` ahora renderiza tarjetas de
  reel (façade) que al tocar play cargan `https://www.instagram.com/reel/<code>/embed/` inline,
  un video a la vez, con botón "✕ Volver". Follow-cta con gradiente IG.
- **Seed actual = 4 reels RECIENTES** (extraídos del perfil logueado, orden del grid, NO
  rankeados por likes/vistas): `DcZ2NHBOj7C` (LUCE BIEN · detrás), `DcPum1quVXj` (HAYABUSA),
  `DcXmOaBuvX9` (del boceto al set), `DcFkzFxuy6u` ("Últimamente suena así").
- **Footer**: Spotify, YouTube, TikTok, Instagram, **Threads** (`@zignalez` en threads.com,
  descubierto esta sesión). Faltan por confirmar: Apple Music, SoundCloud, Deezer, Amazon Music.
- Perfil IG: **@zignalez**, 53 publicaciones, ~1.618 seguidores (sep 2026).

## EXTRACCIÓN DESDE CHROME (para rankear por likes/vistas)
> El árbol de accesibilidad **no** expone los contadores; hay que leerlos con el `javascript_tool`
> (estar logueado en el Chrome del usuario). Método:
1. Chrome logueado → `https://www.instagram.com/zignalez/reels/` (los reels muestran **vistas**
   como texto overlay) y `/zignalez/` (posts).
2. `javascript_tool`: recolectar `a[href*="/reel/"]` y `a[href*="/p/"]` → `code`, la miniatura
   (`img.src`), el caption (`img.alt`) y el número de vistas/likes del overlay (parsear "24,6 mil"
   → 24600). Hacer scroll para cargar más (grid virtualizado).
3. Ordenar desc por vistas (reels) y/o likes (posts), tomar **top 6–8**.
4. Poblar `IG_REELS = [{c:<code>, t:<caption corto>}]` en ese orden.
> Límite declarado: si el `javascript_tool` está caído (clasificador) o IG mete un checkpoint
> anti-bot, pedir al usuario los links de sus posts top o un screenshot de la vista Reels.

## COMPONENTE (ya implementado — mantener)
- `IG_REELS` (array de `{c,t}`) → una tarjeta `.igc` por reel: `igc-cover` 9:16 con badge
  "Instagram", play, título y `@zignalez ↗`. Al tocar play, el cover se reemplaza por
  `<iframe class="igc-frame" src="https://www.instagram.com/reel/<code>/embed/" scrolling="no">`
  y la tarjeta crece a ~560 px de alto para mostrar el reel completo; botón "✕ Volver" restaura
  la portada. Un `openIg` activo a la vez.
- Para posts (foto/carrusel) usar `/p/<code>/embed/` en vez de `/reel/`.

## FOOTER — TODAS LAS PLATAFORMAS
```html
<div class="social">
  <a href="https://open.spotify.com/artist/0M4ZFfQbpLYiLksk0QyOph" target="_blank" rel="noopener">Spotify</a>
  <a href="https://www.youtube.com/@Zignalez" target="_blank" rel="noopener">YouTube</a>
  <a href="https://www.tiktok.com/@zignalez" target="_blank" rel="noopener">TikTok</a>
  <a href="https://instagram.com/zignalez" target="_blank" rel="noopener">Instagram</a>
  <a href="https://www.threads.com/@zignalez" target="_blank" rel="noopener">Threads</a>
  <!-- añadir cuando se confirmen URLs reales: Apple Music, SoundCloud, Deezer, Amazon Music -->
</div>
```
> Regla: **no** poner links de plataformas sin verificar la URL real del perfil (un link muerto
> en la bio de un artista resta). Al distribuir por División Rec probablemente existan Apple
> Music/Deezer/Amazon — confirmar cada URL antes de sumarla.

## GUARDRAILS
Sin rojo `#F80606` · sin token de IG (embed oficial) · un video a la vez · reels de mayor
alcance primero · sin links de plataforma sin verificar · reversible.

## CRITERIOS DE ACEPTACIÓN
Carrusel `#galeria` con ≥4 reels reales reproduciendo inline (embed IG), idealmente ordenados
por vistas/likes; footer con todas las plataformas verificadas; sin rojo; responsive.

## AUDITORÍA DE FUENTES
- **Verificado esta sesión (Chrome logueado, read_page):** perfil @zignalez (53 posts, ~1.618
  seguidores); 4 reels con caption (`DcZ2NHBOj7C`, `DcPum1quVXj`, `DcXmOaBuvX9`, `DcFkzFxuy6u`);
  Threads `@zignalez` presente; sección `#galeria` y footer actualizados y renderizados (4
  tarjetas, 5 plataformas, 0 `#F80606`).
- **NO logrado esta sesión:** ranking por likes/vistas — el `javascript_tool` de Chrome estuvo
  caído (clasificador no disponible, 3 intentos) y los contadores no salen por lectura del árbol
  de accesibilidad. El seed son los 4 reels **recientes**, no los top.
- **Por confirmar:** URLs reales de Apple Music/SoundCloud/Deezer/Amazon (no se agregaron por no
  verificarlas); el embed de IG solo se confirma visualmente en el navegador del usuario.
- **Dato faltante que más cambiaría el resultado:** las vistas/likes por reel (para rankear) —
  se obtienen re-corriendo la extracción con el `javascript_tool` activo, o con tu input.
