/* Campaña LUCE BIEN · 25-09-2026 · 30-09: cuenta regresiva al segundo + video oficial tras el estreno
   Un bloque, dos estados, conmutados por fecha en el cliente. Antes de
   2026-10-01 20:00 CLT: pre-save + cuenta regresiva. Después: "Escuchar ahora"
   al mismo enlace (Orchard redirige al release). Sin dependencias.
   Si este archivo no carga, el HTML ya muestra el estado PRE completo.
   Medición: Clarity via window.clarity('event', ...) — mismo patrón que app.js.
   Para probar el estado POST sin esperar: ?estreno=post en la URL. */
(function(){
  var root = document.getElementById('estrenoHero');
  if(!root) return;
  var T = Date.parse(root.getAttribute('data-estreno')); // ISO con offset -03:00
  if(isNaN(T)) return;
  var forzar = /[?&]estreno=post\b/.test(location.search);

  function clarity(n){ try{ if(typeof window.clarity==='function') window.clarity('event', n); }catch(e){} }

  function pintar(post){
    document.querySelectorAll('[data-pre]').forEach(function(el){ el.hidden = post; });
    document.querySelectorAll('[data-post]').forEach(function(el){ el.hidden = !post; });
    document.querySelectorAll('[data-cta][data-pre-txt]').forEach(function(a){
      a.textContent = post ? a.getAttribute('data-post-txt') : a.getAttribute('data-pre-txt');
    });
    document.documentElement.classList.toggle('estreno-post', post);
  }

  var cd = document.getElementById('estrenoCd');
  var box = document.getElementById('estrenoCdBox');
  var cells = {};
  if(box) box.querySelectorAll('[data-cd]').forEach(function(b){ cells[b.getAttribute('data-cd')] = b; });
  var dos = function(n){ return (n < 10 ? '0' : '') + n; };
  var ultMin = -1, ya = false;

  /* Tras el estreno, el adelanto mudo del carrusel deja paso al video oficial: un
     boton carga el iframe (youtube-nocookie, ya en frame-src de _headers). No se
     carga solo: el autoplay con sonido lo bloquea el navegador y el loop mudo
     seguiria sonando debajo. El video es PRIVADO hasta el estreno: por eso ningun
     enlace a YouTube se pinta antes de la hora. */
  function cablearVideo(){
    var slide = document.querySelector('[data-yt]'); if(!slide) return;
    var id = slide.getAttribute('data-yt'), titulo = slide.getAttribute('data-yt-title') || 'Video';
    var frame = slide.querySelector('.estreno-frame');
    slide.querySelectorAll('.estreno-ytbtn').forEach(function(b){
      b.addEventListener('click', function(){
        if(frame.querySelector('iframe')) return;
        var v = frame.querySelector('video'); if(v){ try{ v.pause(); }catch(e){} }
        frame.insertAdjacentHTML('afterbegin', '<iframe title="' + titulo + '" src="https://www.youtube-nocookie.com/embed/' + id + '?autoplay=1&rel=0" allow="autoplay; encrypted-media; picture-in-picture; fullscreen" allowfullscreen></iframe>');
        frame.classList.add('has-yt');
        clarity('video_slide_play');
      });
    });
  }

  function tick(){
    var ms = T - Date.now();
    if(forzar || ms <= 0){
      if(!ya){ ya = true; pintar(true); if(box) box.hidden = true; if(cd) cd.textContent = ''; cablearVideo(); }
      return;
    }
    pintar(false);
    var s = Math.floor(ms/1000), d = Math.floor(s/86400), h = Math.floor(s%86400/3600), m = Math.floor(s%3600/60), sg = s%60;
    if(cells.d){ cells.d.textContent = dos(d); cells.h.textContent = dos(h); cells.m.textContent = dos(m); cells.s.textContent = dos(sg); }
    if(box) box.classList.toggle('cd-hoy', d === 0);
    /* El texto hablado cambia una vez por minuto; el reloj visual, cada segundo. */
    var min = Math.floor(s/60);
    if(cd && min !== ultMin){
      ultMin = min;
      cd.textContent = d > 0 ? ('faltan ' + d + ' d ' + h + ' h') : ('faltan ' + h + ' h ' + m + ' min');
    }
    setTimeout(tick, 1000 - (Date.now() % 1000));
  }
  tick();

  document.querySelectorAll('[data-cta]').forEach(function(a){
    a.addEventListener('click', function(){
      clarity((document.documentElement.classList.contains('estreno-post') ? 'listen_' : 'presave_') + a.getAttribute('data-cta'));
    });
  });
})();
