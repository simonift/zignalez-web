/* Campaña LUCE BIEN · 25-09-2026 · 30-09: cuenta regresiva al segundo · 01-10: estado POST
   Un bloque, dos estados, conmutados por fecha en el cliente. Antes de
   2026-10-01 20:00 CLT: pre-save + cuenta regresiva. Después: "Escúchalo ahora"
   (Orchard redirige al release), badge SALIÓ HOY y video oficial en el slide 0.
   Sin dependencias. Si este archivo no carga, el HTML ya muestra el estado PRE.
   Reloj: Date.now() del dispositivo corregido con la cabecera Date (+Age) del
   propio sitio (un HEAD same-origin). En la ventana de ±10 min del estreno el
   primer tick espera esa respuesta (máx. 1,5 s) para no conmutar con un reloj
   adelantado. Si el HEAD falla, se usa el reloj local tal cual.
   Video: es PRIVADO en YouTube hasta la hora. Las entradas al video (tarjeta,
   play grande, enlaces) solo se muestran cuando la miniatura de YouTube responde
   (sonda con Image, reintento cada 30 s); mientras, "Escúchalo ahora" manda.
   Medición: Clarity via window.clarity('event', ...) — mismo patrón que app.js.
   Para probar el estado POST sin esperar: ?estreno=post (salta la sonda).
   Para ensayar el momento 20:00: ?estreno=en:15 (conmuta a los 15 s). */
(function(){
  var root = document.getElementById('estrenoHero');
  if(!root) return;
  var T = Date.parse(root.getAttribute('data-estreno')); // ISO con offset -03:00 → epoch UTC
  if(isNaN(T)) return;
  var q = location.search;
  var forzar = /[?&]estreno=post\b/.test(q);
  var ensayo = /[?&]estreno=en:(\d+)/.exec(q);
  if(ensayo) T = Date.now() + (+ensayo[1]) * 1000;
  var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion:reduce)').matches;
  var skew = 0; // ms a sumar al reloj local
  function ahora(){ return Date.now() + skew; }
  var DIA = 86400000;

  function clarity(n){ try{ if(typeof window.clarity==='function') window.clarity('event', n); }catch(e){} }

  function pintar(post){
    document.querySelectorAll('[data-pre]').forEach(function(el){ el.hidden = post; });
    document.querySelectorAll('[data-post]').forEach(function(el){ el.hidden = !post; });
    document.querySelectorAll('[data-cta][data-pre-txt]').forEach(function(a){
      a.textContent = post ? a.getAttribute('data-post-txt') : a.getAttribute('data-pre-txt');
    });
    document.documentElement.classList.toggle('estreno-post', post);
    if(post){
      /* "Salió hoy" las primeras 24 h; después "Ya salió". */
      var hoy = ahora() - T < DIA;
      document.querySelectorAll('[data-hoy][data-luego]').forEach(function(el){ el.textContent = el.getAttribute(hoy ? 'data-hoy' : 'data-luego'); });
      if(!/ya salió/i.test(document.title)) document.title = 'LUCE BIEN — ya salió · Zignalez feat. ACHEH & D-FOX';
    }
  }

  var cd = document.getElementById('estrenoCd');
  var box = document.getElementById('estrenoCdBox');
  var cells = {};
  if(box) box.querySelectorAll('[data-cd]').forEach(function(b){ cells[b.getAttribute('data-cd')] = b; });
  var dos = function(n){ return (n < 10 ? '0' : '') + n; };
  var ultMin = -1, ya = false, revelando = false, cablado = false;

  /* ---- Video oficial ---------------------------------------------------------
     Tras el estreno, el adelanto mudo del slide 0 deja paso al video oficial: un
     clic (play grande, boton del slide, tarjeta del hero) crea el iframe
     (youtube-nocookie, ya en frame-src de _headers). No se carga solo: el autoplay
     con sonido lo bloquea el navegador y el loop mudo seguiria sonando debajo.
     Una sola ruta de iframe para todas las entradas. */
  var slide = document.querySelector('[data-yt]');
  var ytId = slide && slide.getAttribute('data-yt');
  if(ytId && !/^[\w-]{11}$/.test(ytId)) ytId = null;
  function frameDe(){ return slide ? slide.querySelector('.estreno-frame') : null; }
  function reproducir(origen){
    var frame = frameDe(); if(!frame || !ytId) return;
    if(window.ZC){ try{ window.ZC.parar(); if(window.ZC.indice() !== 0) window.ZC.go(0); }catch(e){} }
    var f = frame.querySelector('iframe');
    if(f){ try{ f.focus({ preventScroll: true }); }catch(e){} return; }
    var v = frame.querySelector('video'); if(v){ try{ v.pause(); }catch(e){} }
    f = document.createElement('iframe');
    f.title = slide.getAttribute('data-yt-title') || 'Video';
    f.src = 'https://www.youtube-nocookie.com/embed/' + encodeURIComponent(ytId) + '?autoplay=1&rel=0';
    f.setAttribute('allow', 'autoplay; encrypted-media; picture-in-picture; fullscreen');
    f.setAttribute('allowfullscreen', '');
    frame.insertBefore(f, frame.firstChild);
    var volver = document.createElement('button');
    volver.type = 'button'; volver.className = 'estreno-volver'; volver.textContent = 'Cerrar video';
    volver.addEventListener('click', quitarVideo);
    frame.appendChild(volver);
    frame.classList.add('has-yt');
    try{ f.focus({ preventScroll: true }); }catch(e){}
    clarity('video_play_' + (origen || 'slide'));
  }
  function quitarVideo(){
    var frame = frameDe(); if(!frame) return;
    var f = frame.querySelector('iframe'); if(!f) return;
    f.remove(); frame.classList.remove('has-yt');
    var b = frame.querySelector('.estreno-volver'); if(b) b.remove();
    var v = frame.querySelector('video'); if(v){ try{ v.play().catch(function(){}); }catch(e){} }
    var big = frame.querySelector('.estreno-play-big'); if(big){ try{ big.focus({ preventScroll: true }); }catch(e){} }
  }
  function cablearVideo(){
    if(cablado) return; cablado = true;
    if(slide) slide.querySelectorAll('.estreno-ytbtn').forEach(function(b){
      b.addEventListener('click', function(){ reproducir(b.getAttribute('data-cta') || 'slide'); });
    });
    /* Entradas del hero: el href real (youtu.be) sirve sin JS; con JS se reproduce aqui. */
    document.querySelectorAll('[data-yt-play]').forEach(function(a){
      a.addEventListener('click', function(ev){
        ev.preventDefault();
        var sec = document.getElementById('estreno');
        if(sec) sec.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'center' });
        reproducir(a.getAttribute('data-cta') || 'hero');
      });
    });
    var car = document.getElementById('estrenoCar');
    if(car) car.addEventListener('zc:go', function(e){ if(e.detail !== 0) quitarVideo(); });
  }

  /* Sonda de disponibilidad: si el video sigue privado, i.ytimg.com no entrega la
     miniatura (404) o entrega el placeholder de 120x90. Mientras no responda, las
     entradas al video quedan ocultas y se muestra la nota de espera. Reintento cada
     30 s. La CDN de miniaturas puede tardar unos minutos tras pasar a publico. */
  var videoListo = false, sondaTimer = null;
  function entradasVideo(on){
    document.querySelectorAll('[data-yt-play],[data-yt-link],.estreno-ytbtn').forEach(function(el){ el.hidden = !on; });
    document.querySelectorAll('[data-yt-espera]').forEach(function(el){ el.hidden = on; });
  }
  function sondear(){
    if(videoListo || !ytId) return;
    var img = new Image();
    img.onload = function(){
      if(img.naturalWidth > 121){ videoListo = true; entradasVideo(true); clarity('video_disponible'); }
      else sondaTimer = setTimeout(sondear, 30000);
    };
    img.onerror = function(){ sondaTimer = setTimeout(sondear, 30000); };
    img.src = 'https://i.ytimg.com/vi/' + ytId + '/hqdefault.jpg?t=' + Math.floor(Date.now() / 30000);
  }

  function activar(){
    ya = true;
    pintar(true);
    if(box) box.hidden = true;
    cablearVideo();
    if(forzar || ensayo){ videoListo = true; entradasVideo(true); } else { entradasVideo(false); sondear(); }
    try{ document.dispatchEvent(new CustomEvent('estreno:post', { detail: { ahora: ahora() } })); }catch(e){}
  }

  /* Momento 20:00:00 con el visitante en la pagina: reloj en 00:00:00:00 en ambar,
     destello del bloque, entra el badge, foco al CTA (solo si el foco no esta en
     otra cosa) y un solo anuncio hablado. Con reduced-motion: sin animaciones,
     conmutacion inmediata, mismo foco/anuncio. */
  function revelar(){
    if(revelando) return; revelando = true;
    var paso = reduce ? 0 : 600, paso2 = reduce ? 0 : 1400, paso3 = reduce ? 0 : 2000;
    if(cells.d){ cells.d.textContent = cells.h.textContent = cells.m.textContent = cells.s.textContent = '00'; }
    if(box && !reduce) box.classList.add('cd-cero');
    setTimeout(function(){ if(!reduce) root.classList.add('is-revelando'); }, paso);
    setTimeout(function(){ activar(); clarity('estreno_live'); }, paso2);
    setTimeout(function(){
      var cta = document.getElementById('ctaEstreno'), act = document.activeElement;
      if(cta && (!act || act === document.body || root.contains(act))){ try{ cta.focus({ preventScroll: true }); }catch(e){} }
      if(cd){ cd.textContent = 'LUCE BIEN ya está disponible.'; setTimeout(function(){ cd.textContent = ''; }, 6000); }
      root.classList.remove('is-revelando');
    }, paso3);
  }

  var primera = true;
  function tick(){
    if(ya || revelando) return;
    var ms = T - ahora();
    if(forzar){ activar(); if(cd) cd.textContent = ''; return; }
    if(ms <= 0){
      /* Si la pagina se abrio ya pasada la hora, no hay secuencia: estado POST directo. */
      if(primera) { activar(); if(cd) cd.textContent = ''; } else { revelar(); }
      return;
    }
    primera = false;
    var s = Math.floor(ms/1000), d = Math.floor(s/86400), h = Math.floor(s%86400/3600), m = Math.floor(s%3600/60), sg = s%60;
    if(cells.d){ cells.d.textContent = dos(d); cells.h.textContent = dos(h); cells.m.textContent = dos(m); cells.s.textContent = dos(sg); }
    if(box) box.classList.toggle('cd-hoy', d === 0);
    /* El texto hablado cambia una vez por minuto; el reloj visual, cada segundo. */
    var min = Math.floor(s/60);
    if(cd && min !== ultMin){
      ultMin = min;
      cd.textContent = d > 0 ? ('faltan ' + d + ' d ' + h + ' h') : ('faltan ' + h + ' h ' + m + ' min');
    }
    setTimeout(tick, 1000 - (ahora() % 1000));
  }

  /* Correccion del reloj del dispositivo con la hora del servidor: cabecera Date
     (resolucion 1 s) + Age (si el borde de Cloudflare sirvio de cache, RFC 9111).
     Solo se aplica si la diferencia supera 5 s: menos que eso es latencia, no
     desajuste. Si el HEAD falla (file://, sin red) no cambia nada. */
  function corregirReloj(){
    if(ensayo || forzar || location.protocol.indexOf('http') !== 0) return Promise.resolve();
    var t0 = Date.now();
    try{
      return fetch(location.pathname, { method: 'HEAD', cache: 'no-store' }).then(function(r){
        var d = r.headers.get('date'); if(!d) return;
        var srv = Date.parse(d); if(isNaN(srv)) return;
        srv += (parseInt(r.headers.get('age'), 10) || 0) * 1000;
        var est = srv + (Date.now() - t0) / 2 - Date.now();
        if(Math.abs(est) > 5000){ skew = est; clarity('reloj_corregido'); }
      }).catch(function(){});
    }catch(e){ return Promise.resolve(); }
  }

  pintar(false);
  var cerca = Math.abs(T - Date.now()) < 10 * 60 * 1000;
  var arranque = corregirReloj();
  if(cerca){
    /* Cerca de la hora el primer tick espera la hora del servidor (maximo 1,5 s). */
    var espera = new Promise(function(res){ setTimeout(res, 1500); });
    Promise.race([arranque, espera]).then(tick, tick);
  } else {
    tick();
  }

  /* Compartir nativo (Web Share API); sin soporte, copia el enlace. */
  var share = document.getElementById('btnCompartir');
  if(share){
    var urlShare = 'https://zignalez.cl/?utm_source=share&utm_medium=whatsapp&utm_campaign=lucebien';
    share.addEventListener('click', function(){
      clarity('share');
      if(navigator.share){
        navigator.share({ title: 'LUCE BIEN — Zignalez feat. ACHEH & D-FOX', text: 'Salió LUCE BIEN. Escúchalo y mira el video:', url: urlShare }).catch(function(){});
        return;
      }
      var txt = share.textContent;
      var listo = function(){ share.textContent = 'Link copiado'; share.classList.add('btn-copiado'); setTimeout(function(){ share.textContent = txt; share.classList.remove('btn-copiado'); }, 2500); };
      var mostrar = function(){ share.textContent = urlShare; setTimeout(function(){ share.textContent = txt; }, 8000); };
      if(navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(urlShare).then(listo, mostrar);
      else mostrar();
    });
  }

  document.querySelectorAll('[data-cta]').forEach(function(a){
    if(a.hasAttribute('data-yt-play') || a.classList.contains('estreno-ytbtn') || a.id === 'btnCompartir') return; // ya medidos
    a.addEventListener('click', function(){
      clarity((document.documentElement.classList.contains('estreno-post') ? 'listen_' : 'presave_') + a.getAttribute('data-cta'));
    });
  });
})();
