# PROMPT MAESTRO — Slide de Próximos Estrenos (sitio público Zignalez)

> Convierte la sección única "Próximo estreno" en un **carrusel de próximos estrenos**
> (adelantos sin audio) en el sitio estático de fans. Grounded en el `index.html` real
> desplegado en Cloudflare Pages (`zignalez-web.pages.dev`). Reversible, sin backend,
> sin romper el resto del sitio.

## ROL Y PRINCIPIO
Diseñador/desarrollador front del sitio de artista, adversarial. Regla dura: **el slide
existe para convertir a lista, no para lucirse.** Cada adelanto es "sin audio" a propósito
(el audio completo es el gancho de la lista y de Miembros). Nada de rojo del sello
(`#F80606` prohibido). Solo un video reproduce a la vez (peso/batería en móvil). Nada se
declara "listo" sin verlo renderizado y sin verificar que no rompe el layout 320–1440px.

## 0. ESTADO REAL (verificado esta sesión; re-verificar antes de tocar)
- Sitio **estático vanilla** (HTML/CSS/JS en un solo `index.html`, ~214 KB), servido por
  **Cloudflare Pages**. En vivo. Sin framework, sin build.
- Sección actual `#estreno`: **una sola** tarjeta 16:9 (`.estreno-frame` > `.estreno-vid`
  con `poster` base64 + `<source src="assets/teaser.mp4">`, overlay `.estreno-over` con
  kicker/título/lead/CTA) + una tira `.estreno-strip` de 4 miniaturas.
- Tokens de diseño existentes: `--uv:#8B3DFF`, `--uv-soft:#A66BFF`, `--chrome`, `--chrome-hi`,
  `--smoke`, `--line`, `--font-m:'Space Mono'`; títulos en **Syne**, cuerpo en **Manrope**.
- Assets nuevos ya generados (carpeta `assets/`): `lucebien.mp4` (LUCE BIEN — con Fox y Acheh;
  el metraje del set oscuro donde Simón entra con gafas naranjas; 7 s, 720p, mudo, 843 KB),
  `dispuesta.mp4` (DISPUESTA — ft. Flacko Loyal, 6 s, 720p, mudo, 371 KB) y sus posters
  `lucebien_poster.jpg`, `dispuesta_poster.jpg`. NOTA: `zignalez_v1.mp4` (que el sitio rotulaba
  "Hayabusa") es en realidad LUCE BIEN. El video de HAYABUSA (Simón solo en pantalla) aún no se
  ha entregado — sumar como 3er slide cuando llegue.

## DECISIONES QUE BLOQUEAN (resolver antes de ejecutar)
1. **Títulos y créditos reales (confirmado sep 2026).** Slide actual = **LUCE BIEN** (con Fox
   y Acheh) + **DISPUESTA** (ft. Flacko Loyal). `HAYABUSA` = con Flacko Loyal en el tema, pero
   en su VIDEO aparece solo Simón — su metraje aún NO se entregó, se suma como 3er slide cuando
   llegue. Confirmado que el metraje del set oscuro (Simón + Fox + Acheh) es LUCE BIEN, no Hayabusa.
2. **Orden del carrusel** = orden de prioridad de lanzamiento. Sin decisión → HAYABUSA
   primero (es el que ya estaba en el hero), DISPUESTA segundo.
3. **Reemplazar la tira de 4 miniaturas** por el carrusel, o conservar ambas. Sin decisión →
   el carrusel **reemplaza** `#estreno` completo (miniaturas quedan redundantes).

## MODELO DE DATOS (una entrada por estreno)
```
{ titulo, feat, estado, kicker, lead, poster, video }
```
- `estado`: p.ej. `GRABADO · EN EDICIÓN`, `MEZCLA`, `FECHA POR CONFIRMAR`.
- `kicker`: etiqueta corta arriba del título (`Próximo estreno`, `En camino`).
- `poster`/`video`: rutas bajo `assets/`. **Siempre mudo** (`muted`), loop, `playsinline`.

## COMPONENTE DE PRODUCCIÓN (drop-in, reemplaza la sección `#estreno`)
> Rutas `assets/…` (no base64) para no inflar el `index.html`. Añadir un estreno = duplicar
> un `<article class="slide">` y sumar un `.dot`. El JS toma el número de slides solo.

```html
<!-- PRÓXIMOS ESTRENOS (carrusel) -->
<section id="estreno">
  <div class="wrap">
    <div class="sec-head"><h2>Próximos estrenos</h2><span class="eyebrow">Adelantos · la lista los ve primero</span></div>
    <div class="carousel" id="estrenoCar">
      <button class="arrow prev" aria-label="Anterior">‹</button>
      <button class="arrow next" aria-label="Siguiente">›</button>
      <div class="viewport"><div class="track">

        <article class="slide is-active" data-idx="0" aria-hidden="false">
          <div class="estreno-frame">
            <video class="estreno-vid" muted loop playsinline autoplay preload="metadata" poster="assets/lucebien_poster.jpg">
              <source src="assets/lucebien.mp4" type="video/mp4"></video>
            <div class="estreno-over">
              <div class="estreno-kicker">Próximo estreno · sin audio</div>
              <h3 class="estreno-title">LUCE BIEN</h3>
              <p class="estreno-feat">con Fox y Acheh · <span class="st">GRABADO · EN EDICIÓN</span></p>
              <p class="estreno-lead">Señal cruda desde el set. La lista lo ve —y lo escucha— primero, antes que el algoritmo.</p>
              <a class="btn btn-primary" href="#lista">Sé de los primeros</a>
            </div>
          </div>
        </article>

        <article class="slide" data-idx="1" aria-hidden="true">
          <div class="estreno-frame">
            <video class="estreno-vid" muted loop playsinline preload="metadata" poster="assets/dispuesta_poster.jpg">
              <source src="assets/dispuesta.mp4" type="video/mp4"></video>
            <div class="estreno-over">
              <div class="estreno-kicker">En camino · sin audio</div>
              <h3 class="estreno-title">DISPUESTA</h3>
              <p class="estreno-feat">ft. Flacko Loyal · <span class="st">GRABADO · EN EDICIÓN</span></p>
              <p class="estreno-lead">El segundo golpe. Otro adelanto sin audio: lo completo llega primero a la lista.</p>
              <a class="btn btn-primary" href="#lista">Sé de los primeros</a>
            </div>
          </div>
        </article>

      </div></div>
      <div class="dots">
        <button class="dot is-active" data-go="0" aria-label="Estreno 1"></button>
        <button class="dot" data-go="1" aria-label="Estreno 2"></button>
      </div>
      <div class="count"><span id="cNow">1</span> / <span id="cTot">2</span></div>
    </div>
  </div>
</section>
```

### CSS (añadir al `<style>` existente; usa los tokens ya definidos)
```css
.carousel{position:relative}
.viewport{overflow:hidden;border-radius:12px}
.track{display:flex;transition:transform .5s cubic-bezier(.22,.61,.36,1)}
.slide{min-width:100%}
.estreno-feat{font-family:var(--font-m);font-size:12px;letter-spacing:.08em;text-transform:uppercase;color:var(--chrome);margin:0 0 12px}
.estreno-feat .st{color:var(--smoke)}
.arrow{position:absolute;top:50%;transform:translateY(-50%);z-index:5;width:44px;height:44px;border-radius:50%;border:1px solid var(--line);background:rgba(10,10,11,.6);color:var(--chrome-hi);font-size:18px;cursor:pointer;display:grid;place-items:center;backdrop-filter:blur(6px);transition:.2s}
.arrow:hover{background:var(--uv);border-color:var(--uv)}
.arrow.prev{left:14px}.arrow.next{right:14px}
.dots{display:flex;gap:10px;justify-content:center;margin-top:18px}
.dot{width:9px;height:9px;border-radius:50%;border:0;background:var(--line);cursor:pointer;padding:0;transition:.2s}
.dot.is-active{background:var(--uv);width:26px;border-radius:6px}
.count{font-family:var(--font-m);font-size:11px;color:var(--smoke);letter-spacing:.15em;text-align:center;margin-top:10px}
@media(prefers-reduced-motion:reduce){.track{transition:none}}
```

### JS (añadir antes de `</body>`; auto-detecta nº de slides, reproduce solo el activo)
```javascript
(function(){
  var car=document.getElementById('estrenoCar'); if(!car)return;
  var track=car.querySelector('.track'), slides=[].slice.call(car.querySelectorAll('.slide'));
  var dots=[].slice.call(car.querySelectorAll('.dot')), vids=slides.map(function(s){return s.querySelector('video');});
  var now=document.getElementById('cNow'), i=0, n=slides.length, timer=null;
  var reduce=window.matchMedia&&window.matchMedia('(prefers-reduced-motion:reduce)').matches;
  function playOnly(k){vids.forEach(function(v,j){if(!v)return; if(j===k){v.play&&v.play().catch(function(){});} else {v.pause&&v.pause(); try{v.currentTime=0;}catch(e){}}});}
  function go(k){i=(k+n)%n; track.style.transform='translateX(-'+(i*100)+'%)';
    dots.forEach(function(d,j){d.classList.toggle('is-active',j===i);});
    slides.forEach(function(s,j){s.setAttribute('aria-hidden',j===i?'false':'true');});
    if(now)now.textContent=(i+1); playOnly(i); restart();}
  function restart(){if(reduce)return; clearInterval(timer); timer=setInterval(function(){go(i+1);},9000);}
  car.querySelector('.next').addEventListener('click',function(){go(i+1);});
  car.querySelector('.prev').addEventListener('click',function(){go(i-1);});
  dots.forEach(function(d){d.addEventListener('click',function(){go(+d.dataset.go);});});
  var x0=null; car.addEventListener('touchstart',function(e){x0=e.touches[0].clientX;},{passive:true});
  car.addEventListener('touchend',function(e){if(x0===null)return;var dx=e.changedTouches[0].clientX-x0;if(Math.abs(dx)>44)go(i+(dx<0?1:-1));x0=null;});
  playOnly(0); restart();
})();
```

## CÓMO GENERAR EL ADELANTO DE UN NUEVO TEMA (ffmpeg, desde el video maestro)
> Regla: adelanto **corto (6–8 s), mudo, 720p, optimizado (<1 MB), que entre en el momento
> donde aparece el artista**. Elegir el `-ss` viendo frames del comienzo primero.
```bash
# preview mudo, 720p, loop-friendly, faststart
ffmpeg -ss <SEG_INICIO> -t 7 -i MASTER.mp4 -an \
  -vf "scale=1280:720:force_original_aspect_ratio=increase,crop=1280:720,eq=contrast=1.03:saturation=1.05" \
  -c:v libx264 -pix_fmt yuv420p -profile:v high -crf 30 -movflags +faststart -r 25 assets/<slug>.mp4
# poster
ffmpeg -ss <SEG_POSTER> -i MASTER.mp4 -frames:v 1 \
  -vf "scale=1280:720:force_original_aspect_ratio=increase,crop=1280:720" -q:v 3 assets/<slug>_poster.jpg
```

## FASES
1. **Reemplazar** `#estreno` por el bloque HTML de arriba; pegar CSS y JS en su lugar.
2. Copiar `lucebien.mp4`, `dispuesta.mp4` y sus posters a `assets/`.
3. **Verificar renderizado** (desktop + móvil 320/390 px): un solo video reproduce, flechas
   y puntos funcionan, swipe en móvil, CTA lleva a `#lista`, sin overflow horizontal, sin rojo.
4. Actualizar el `hero-meta` si el estreno destacado cambia (hoy dice `HAYABUSA (con Flacko Loyal)`).
5. Re-deploy a Cloudflare Pages (drag-drop de la carpeta o `wrangler pages deploy`).

## GUARDRAILS
Sin rojo `#F80606` · adelantos **siempre mudos** (el audio es el gancho de la lista) · un
video activo a la vez · `prefers-reduced-motion` respetado · assets `<1 MB` c/u · el slide
**no** consume backend (es estático) · añadir estreno = duplicar `<article>` + `<button.dot>`,
nada de tocar el JS.

## CRITERIOS DE ACEPTACIÓN
`#estreno` = carrusel con ≥2 estrenos reales · HAYABUSA abre con Simón (gafas naranjas) ·
solo el slide activo reproduce · navegación por flechas/puntos/swipe/autoplay 9 s · responsive
320–1440 sin overflow · CTA a la lista en cada slide · cero rojo · pesa poco.

## AUDITORÍA DE FUENTES
- **Verificado esta sesión (ffprobe/frames/render + confirmación del usuario):** `zignalez_v1.mp4`
  (4K, 180 s) abre con Simón (tank top, **gafas naranjas**) + Fox y Acheh en el set oscuro →
  es **LUCE BIEN** (el sitio lo rotulaba mal como "Hayabusa"). `Zignalez ft flacko.mp4` (1080p,
  149 s) con placa de título **"DISPUESTA"** (0:20 y 2:25) → **DISPUESTA (ft. Flacko Loyal)**.
  Ambos adelantos cortados, mudos, 720p; carrusel renderizado en 2 slides sin romper el diseño
  (tokens UV/Syne/Space Mono, sin rojo).
- **Confirmado por el usuario:** Hayabusa = con Flacko Loyal en el tema (video: Simón solo);
  Luce Bien = con Fox y Acheh; Dispuesta = con Flacko Loyal.
- **Dato faltante:** el metraje del video de HAYABUSA (Simón solo) — no entregado aún; se suma
  como 3er slide cuando llegue. Falta confirmar orden de prioridad y si se elimina la tira de
  4 miniaturas al integrar en el `index.html`.
