/* Campaña LUCE BIEN · 25-09-2026
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
  function tick(){
    var ms = T - Date.now();
    if(forzar || ms <= 0){ pintar(true); return; }
    pintar(false);
    var s = Math.floor(ms/1000), d = Math.floor(s/86400), h = Math.floor(s%86400/3600), m = Math.floor(s%3600/60);
    if(cd) cd.textContent = d > 0 ? ('faltan ' + d + ' d ' + h + ' h') : ('faltan ' + h + ' h ' + m + ' min');
    setTimeout(tick, 60000);
  }
  tick();

  document.querySelectorAll('[data-cta]').forEach(function(a){
    a.addEventListener('click', function(){
      clarity((document.documentElement.classList.contains('estreno-post') ? 'listen_' : 'presave_') + a.getAttribute('data-cta'));
    });
  });
})();
