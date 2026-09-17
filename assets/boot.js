/* Sustituye los on*= en linea, que dejan de ejecutarse al quitar
   'unsafe-inline' de script-src. El evento 'error' de <img> no burbujea,
   pero si se ve en fase de captura sobre document. */
document.addEventListener('error', function(e){
  var t = e.target;
  if(t && t.tagName === 'IMG'){
    var c = t.closest && t.closest('.rcover');
    if(c) c.classList.add('nocover');
  }
}, true);
