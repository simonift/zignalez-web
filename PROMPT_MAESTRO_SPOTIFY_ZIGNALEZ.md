# PROMPT MAESTRO — Integrar temas de Spotify en el sitio Zignalez (patrón División Rec)

> Añade al sitio público de Zignalez una sección **"Ya disponibles"** con reproducción de
> Spotify **inline**, replicando EXACTAMENTE el mecanismo del sitio de División Rec: tarjetas
> de carátula propias + un solo reproductor embebido controlado por la **Spotify iframe embed
> API**. Grounded en el código real de `divisionrec/index.html`. Estático, sin backend, sin
> claves de API.

## ROL Y PRINCIPIO
Desarrollador front del sitio de artista, adversarial. Regla dura: **replicar el patrón que
YA funciona en División Rec, no reinventarlo.** Un solo reproductor a la vez (peso/UX). Sin
rojo del sello (`#F80606` prohibido). Honestidad de datos: la API pública/embed de Spotify
**NO expone número de reproducciones** — eso solo existe en Spotify for Artists. Por lo tanto
esta sección hace ESCUCHAR, no muestra "plays". No inventar contadores.

## 0. ESTADO REAL (verificado esta sesión; re-verificar antes de tocar)
- **Patrón División Rec (leído de `divisionrec/index.html`):** sección `#musica` con un carrusel
  `.cf-track` de tarjetas `.release`. Cada tarjeta = carátula local `.webp` + botón `.rplay`
  con `data-sp="<TRACK_ID>"` + meta (título, artistas, link "Escuchar completo ↗" a
  `open.spotify.com/track/<id>`). Un contenedor oculto `#spWrap`/`#spPlayer`. Al final del
  body: `<script src="https://open.spotify.com/embed/iframe-api/v1" async>` + un IIFE que en
  `window.onSpotifyIframeApiReady` crea UN controlador con `API.createController(mount,{uri:
  'spotify:track:'+id,...})`, reproduce, alterna ▶/⏸, y con `loadUri` cambia de tema en el
  mismo player. Uno a la vez.
- **Sitio Zignalez hoy:** estático (Cloudflare Pages). Solo ENLAZA a Spotify (artist/album/track)
  desde la grilla `#videos`. **No** tiene reproductor inline ni sección "Ya disponibles".
  Tokens: `--uv:#8B3DFF`, `--uv-soft:#A66BFF`, `--chrome`, `--chrome-hi`, `--smoke`, `--line`,
  `--font-m:'Space Mono'`; títulos Syne, cuerpo Manrope.
- **Track IDs de Zignalez verificados esta sesión (oEmbed):** `TNT` = `39z3F5qQ0FSMplPiZ3Sq45`
  (carátula OK). **OJO:** el ID de `ALTA GAMA` que está hoy en el sitio (`7N2R96fWEwgVT0PLRfSs0I`)
  devuelve **404 en oEmbed** → enlace roto o tema no disponible; corregir o quitar.
- **Artista:** `open.spotify.com/artist/0M4ZFfQbpLYiLksk0QyOph`.

## DECISIONES QUE BLOQUEAN (resolver antes de ejecutar)
1. **Qué temas entran y en qué orden.** Solo temas de Zignalez **ya publicados** en Spotify
   (no adelantos — esos van en el carrusel de "Próximos estrenos"). Necesito la **lista de
   track IDs** (o los links de Spotify). Sin lista → solo TNT (único verificado) + placeholders.
2. **Carátulas: locales vs. Spotify CDN.** DR usa `.webp` locales (control total, sin dependencia
   externa). Recomendado igual para Zignalez: descargar cada carátula una vez a `assets/covers/`.
   Alternativa rápida: usar la `thumbnail_url` que da oEmbed (Spotify CDN) — funciona en Pages
   (sin CSP estricta) pero depende de un host externo. Sin decisión → locales.
3. **Formato:** carrusel horizontal (como DR) o grilla. Sin decisión → carrusel (idéntico a DR).
4. **Ubicación en la página:** nueva sección `#musica` "Ya disponibles" entre `#videos` y
   `#tiktok`. Sin decisión → ahí.

## MODELO DE DATOS (una entrada por tema publicado)
```
{ titulo, artistas, trackId, cover }
```
- `trackId`: el ID de Spotify del track (22 chars). `cover`: ruta local `assets/covers/<slug>.webp`.
- Solo temas donde Zignalez es artista principal o colaborador destacado.

### Catálogo real (orden entregado por Simón, sep 2026 — carátulas extraídas por oEmbed)
| # | Título | Tipo | ID Spotify | Cover (Spotify CDN) |
|---|---|---|---|---|
| 1 | TNT | track | `39z3F5qQ0FSMplPiZ3Sq45` | ab67616d…420ee9d6 |
| 2 | LA SANTA | track | `0b5TZ1rYIs7RWYpkK1syKZ` | ab67616d…96d44c13 |
| 3 | RXRX | track | `2UvTtatmyZtAaiUCbilwfi` | ab67616d…5ed203bc |
| 4 | Gatas & Gangster's · Remix | track | `1cEzQt1h3qLLsg0mAbc0Pe` | ab67616d…d6ff8a5a |
| 5 | Uoh Uoh Oh | track | `5hwVnDSDqxKYXjISWiLHxA` | ab67616d…019fe976 |
| 6 | XTUBIEN | track | `6oXEgq1ONokai4NJfMGZ50` | ab67616d…4c5c0cc6 |
| 7 | TU CUERPO | track | `2b8QPcCxlVcshzY2wkjQv1` | ab67616d…950b77a8 |
| 8 | Noche De San Juan | track | `01xXdyNaoQrYXWdf0fDWUN` | ab67616d…fea18359 |
| 9 | Puesta Pa' Mí | track | `4rkR31X7T4lPKUMfgf2T7k` | ab67616d…f6af7e9a |
| 10 | ALTA GAMA | album | `7N2R96fWEwgVT0PLRfSs0I` | ab67616d…3860d911 |
| 11 | Gatas & Gangster's | track | `6AOWWE9WOoxC4C3e8J7Mfj` | ab67616d…a6f2f221 |
| 12 | Destellos del Ayer (EP) | album | `1Sautb9bg1gTplWi2lWIcJ` | ab67616d…f6af7e9a |
| 13 | This Is Zignalez (remixes) | playlist | `154wSLjcWlNuN9jkAiE2OH` | ab67706c…d7c57c21 |

> Cover completa = `https://image-cdn-fa.spotifycdn.com/image/<hash completo>` (algunas en `image-cdn-ak`). El sitio referencia estas URLs directas (funcionan en Cloudflare Pages). Para máxima robustez, descargarlas a `assets/covers/*.webp`. Puesta Pa' Mí y Destellos del Ayer comparten portada (Puesta va en ese EP). `data-uri` = `spotify:track|album|playlist:<ID>`.

## CÓDIGO (drop-in, sección `#musica` + CSS con tokens Zignalez + JS)

### HTML — sección (una `.release` por tema; el JS detecta el número solo)
```html
<!-- YA DISPONIBLES (Spotify inline, patrón División Rec) -->
<section id="musica">
  <div class="wrap">
    <div class="sec-head"><h2>Ya disponibles</h2><span class="eyebrow">Escucha en Spotify · toca la carátula</span></div>
    <div class="cf-wrap">
      <button class="cf-arrow cf-prev" aria-label="Anterior">‹</button>
      <div class="cf-track" id="cfMusica">

        <div class="release">
          <div class="rcover">
            <img class="cover" src="assets/covers/tnt.webp" alt="TNT" loading="lazy">
            <button class="rplay" type="button" data-sp="39z3F5qQ0FSMplPiZ3Sq45" aria-label="Reproducir extracto de TNT" aria-pressed="false">▶</button>
          </div>
          <div class="rmeta">
            <h4>TNT</h4><span>Zignalez</span>
            <a class="rfull" href="https://open.spotify.com/track/39z3F5qQ0FSMplPiZ3Sq45" target="_blank" rel="noopener">Escuchar completo ↗</a>
          </div>
        </div>
        <!-- …duplicar .release por cada tema… -->

      </div>
      <button class="cf-arrow cf-next" aria-label="Siguiente">›</button>
    </div>
    <div id="spWrap" class="sp-wrap" hidden><div class="sp-lbl">Extracto en Spotify</div><div id="spPlayer"></div></div>
  </div>
</section>
```

### CSS (usa los tokens ya definidos; sin rojo)
```css
#musica .cf-wrap{position:relative}
#musica .cf-track{display:flex;gap:16px;overflow-x:auto;scroll-snap-type:x mandatory;padding:4px 2px 12px;scrollbar-width:none}
#musica .cf-track::-webkit-scrollbar{display:none}
#musica .release{flex:0 0 220px;scroll-snap-align:start}
#musica .rcover{position:relative;aspect-ratio:1;border:1px solid var(--line);border-radius:10px;overflow:hidden;background:#000}
#musica .cover{width:100%;height:100%;object-fit:cover;display:block}
#musica .rplay{position:absolute;right:12px;bottom:12px;width:48px;height:48px;border-radius:50%;border:0;background:var(--uv);color:#fff;font-size:18px;cursor:pointer;display:grid;place-items:center;box-shadow:0 6px 20px rgba(0,0,0,.4);transition:.2s}
#musica .rplay:hover{background:var(--uv-soft)}
#musica .rplay.playing{background:var(--chrome-hi);color:var(--ink)}
#musica .rmeta{padding:12px 2px 0}
#musica .rmeta h4{font-family:'Syne',sans-serif;color:var(--chrome-hi);margin:0 0 2px;font-size:17px}
#musica .rmeta span{display:block;color:var(--smoke);font-size:13px;margin-bottom:6px}
#musica .rfull{font-family:var(--font-m);font-size:11px;letter-spacing:.08em;text-transform:uppercase;color:var(--uv-soft);text-decoration:none}
#musica .cf-arrow{position:absolute;top:38%;transform:translateY(-50%);z-index:5;width:40px;height:40px;border-radius:50%;border:1px solid var(--line);background:rgba(10,10,11,.7);color:var(--chrome-hi);font-size:18px;cursor:pointer;-webkit-backdrop-filter:blur(6px);backdrop-filter:blur(6px)}
#musica .cf-arrow:hover{background:var(--uv);border-color:var(--uv)}
#musica .cf-prev{left:-6px}#musica .cf-next{right:-6px}
#musica .sp-wrap{margin-top:18px;border:1px solid var(--line);border-radius:10px;padding:12px;background:var(--ink-2,#141419)}
#musica .sp-lbl{font-family:var(--font-m);font-size:11px;letter-spacing:.2em;text-transform:uppercase;color:var(--uv-soft);margin-bottom:8px}
```

### JS (Spotify iframe embed API — mismo mecanismo que División Rec; antes de `</body>`)
```html
<script src="https://open.spotify.com/embed/iframe-api/v1" async></script>
<script>
(function(){
  var wrap=document.getElementById('spWrap'); if(!wrap) return;
  var mount=document.getElementById('spPlayer');
  var API=null, ctrl=null, pend=null, curBtn=null;
  window.onSpotifyIframeApiReady=function(a){ API=a; if(pend){go(pend.id,pend.btn);pend=null;} };
  function setBtn(b,on){ if(!b)return; b.classList.toggle('playing',on); b.textContent=on?'⏸':'▶'; b.setAttribute('aria-pressed',on?'true':'false'); }
  function go(id,btn){
    wrap.hidden=false;
    if(!API){ pend={id:id,btn:btn}; return; }
    if(curBtn&&curBtn!==btn) setBtn(curBtn,false);
    curBtn=btn; setBtn(btn,true);
    if(!ctrl){ API.createController(mount,{uri:'spotify:track:'+id,width:'100%',height:80},function(c){ ctrl=c; ctrl.addListener('playback_update',function(e){ if(e&&e.data&&typeof e.data.isPaused!=='undefined'){ setBtn(curBtn,!e.data.isPaused); } }); ctrl.play(); }); }
    else { ctrl.loadUri('spotify:track:'+id); ctrl.play(); }
  }
  document.querySelectorAll('#musica .rplay').forEach(function(btn){
    btn.addEventListener('click',function(e){ e.preventDefault(); e.stopPropagation();
      var id=btn.getAttribute('data-sp');
      if(curBtn===btn && ctrl){ if(btn.classList.contains('playing')){ctrl.pause();setBtn(btn,false);} else {ctrl.play();setBtn(btn,true);} return; }
      go(id,btn);
    });
  });
  // flechas del carrusel
  var track=document.getElementById('cfMusica');
  function step(d){ var c=track.querySelector('.release'); if(!c)return; var w=c.getBoundingClientRect().width+16; track.scrollBy({left:d*w,behavior:'smooth'}); }
  var p=wrap.parentNode.querySelector('.cf-prev'), n=wrap.parentNode.querySelector('.cf-next');
  if(p)p.addEventListener('click',function(){step(-1);}); if(n)n.addEventListener('click',function(){step(1);});
})();
</script>
```

## CÓMO OBTENER track ID y carátula (sin API con clave)
- **Track ID:** en Spotify, tema → Compartir → Copiar enlace → `open.spotify.com/track/<ID>?...`;
  el `<ID>` (22 chars antes del `?`) es el `data-sp`. O desde Spotify for Artists.
- **Validar ID + carátula (oEmbed público, sin clave):**
  `https://open.spotify.com/oembed?url=https://open.spotify.com/track/<ID>` → JSON con `title`
  y `thumbnail_url`. Si da **404**, el ID está mal o el tema no está disponible (caso ALTA GAMA).
- **Carátula local:** descargar la `thumbnail_url`, convertir a `.webp` (300–640 px), guardar en
  `assets/covers/<slug>.webp`. (En Chile: `cwebp cover.jpg -q 82 -o assets/covers/<slug>.webp`.)

## HONESTIDAD / LÍMITES (declararlos, no maquillarlos)
- **Sin contador de reproducciones**: la API embed/pública NO lo entrega. Si algún día quieres
  mostrar "X reproducciones", el dato sale de **Spotify for Artists** y hay que cargarlo a mano
  (o pactar un backend que lo lea). No fabricar cifras.
- **Extracto vs. completo**: el player embed reproduce un preview (o el tema completo si el
  visitante tiene sesión Spotify, según región). El link "Escuchar completo ↗" cubre el resto.
- **Script externo**: carga `open.spotify.com/embed/iframe-api/v1`. Funciona en Cloudflare Pages
  (sin CSP estricta). Si algún día el sitio va tras CSP estricta (p.ej. dentro del Angular/nginx),
  hay que permitir `script-src`/`frame-src` de `open.spotify.com` en esa ruta.

## FASES
1. Reunir la lista real de temas publicados (track IDs) y validarlos con oEmbed (descartar 404).
2. Descargar carátulas a `assets/covers/*.webp`.
3. Pegar sección `#musica` + CSS + JS; una `.release` por tema.
4. Corregir o quitar el ALTA GAMA roto de la grilla `#videos` (o apuntarlo al ID correcto).
5. Verificar: toca carátula → suena inline, un solo player a la vez, ▶/⏸ correcto, "Escuchar
   completo" abre Spotify, responsive 320–1440, sin rojo. Re-deploy a Pages.

## GUARDRAILS
Sin rojo `#F80606` · un solo reproductor activo · solo temas publicados (adelantos van en
"Próximos estrenos") · sin contadores inventados · carátulas locales optimizadas · el sitio
sigue estático (sin backend) · cada tema con link "Escuchar completo" al track real.

## CRITERIOS DE ACEPTACIÓN
Sección "Ya disponibles" con ≥1 tema real reproduciendo inline vía Spotify embed API (idéntico
a División Rec), un player a la vez, carátulas propias, links al track, responsive, cero rojo,
sin cifras de plays falsas.

## AUDITORÍA DE FUENTES
- **Verificado esta sesión:** patrón de Spotify leído directo de `divisionrec/index.html`
  (tarjetas `.release` + `data-sp` + `#spWrap`/`#spPlayer` + `embed/iframe-api/v1` +
  `API.createController({uri:'spotify:track:'+id})`, un player a la vez); sitio Zignalez hoy
  solo enlaza a Spotify, sin reproductor inline; `TNT`=`39z3F5qQ0FSMplPiZ3Sq45` validado por
  oEmbed (título+carátula OK); `ALTA GAMA`=`7N2R96fWEwgVT0PLRfSs0I` da **404** en oEmbed.
- **Confirmado antes (se mantiene):** la API pública/embed de Spotify NO expone reproducciones;
  eso vive solo en Spotify for Artists.
- **Dato faltante que más cambiaría el resultado:** la **lista real de track IDs** de Zignalez
  publicados (hoy solo 1 verificado: TNT). Con esa lista se puebla la sección completa y se
  autovalidan IDs + carátulas por oEmbed.
