/* Carrusel de riel compartido · 03-10-2026 · HdU-42
 *
 *   Engancha TODA .cf-wrap del documento: su .cf-track y sus .cf-prev/.cf-next.
 *   Antes esta lógica vivía dentro de spotify.js atada a #cfMusica; al agregar
 *   Videos habría quedado duplicada, y el próximo arreglo se haría en uno de los
 *   dos archivos (M-7). Fuente única.
 *
 *   NO sustituye a carrusel.js, que es otra cosa: ese tiene autoavance, puntos y
 *   control de <video>, y sirve solo a #estrenoCar.
 *
 *   Idempotente: se puede volver a llamar cuando se pintan tarjetas nuevas.
 */
(function(){
  "use strict";
  var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion:reduce)').matches;

  function separacion(track){
    var cs = getComputedStyle(track);
    return parseFloat(cs.columnGap) || parseFloat(cs.gap) || 16;
  }

  function montar(wrp){
    var track = wrp.querySelector('.cf-track');
    if(!track) return;
    var pv = wrp.querySelector('.cf-prev'), nx = wrp.querySelector('.cf-next');

    function paso(d){
      var c = track.firstElementChild;
      if(!c) return;
      track.scrollBy({
        left: d * (c.getBoundingClientRect().width + separacion(track)),
        behavior: reduce ? 'auto' : 'smooth'
      });
    }

    /* Una flecha que no lleva a ninguna parte es ruido: se esconde si no sobra
       contenido, y en los extremos la que ya no aplica queda deshabilitada. */
    function estado(){
      var sobra = track.scrollWidth - track.clientWidth > 8;
      if(pv){ pv.hidden = !sobra; pv.disabled = track.scrollLeft <= 2; }
      if(nx){ nx.hidden = !sobra; nx.disabled = track.scrollLeft + track.clientWidth >= track.scrollWidth - 2; }
    }

    if(pv) pv.addEventListener('click', function(){ paso(-1); });
    if(nx) nx.addEventListener('click', function(){ paso(1); });
    track.addEventListener('scroll', estado, { passive: true });

    if(window.ResizeObserver){
      try { new ResizeObserver(estado).observe(track); } catch(e){ window.addEventListener('resize', estado); }
    } else {
      window.addEventListener('resize', estado);
    }
    estado();
  }

  function todos(){
    Array.prototype.forEach.call(document.querySelectorAll('.cf-wrap'), function(w){
      if(w.dataset.cfListo === '1') return;
      w.dataset.cfListo = '1';
      montar(w);
    });
  }

  todos();
  /* Las tarjetas de Videos se pintan desde app.js, algunas con temporizador:
     quien pinte vuelve a llamar esto. */
  window.ZCR = { montar: todos };
})();
