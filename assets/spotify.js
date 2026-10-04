(function(){
  // Reproductor de Spotify SIN la API de iframes.
  //
  // POR QUE: la API (open.spotify.com/embed/iframe-api/v1) carga un segundo
  // script desde embed-cdn.spotifycdn.com que llama a eval() sobre cadenas.
  // Eso exige 'unsafe-eval' en script-src para TODO el sitio -- y la zona de
  // miembros vive en este mismo index.html, el mismo documento que pinta
  // letras y titulos que vienen de la base de datos. _headers no puede acotar
  // por ruta lo que comparte documento.
  //
  // Un <iframe> normal hace lo mismo sin pedir nada: frame-src ya permite
  // open.spotify.com. Verificado contra la CSP de produccion.
  //
  // QUE SE PIERDE: el play/pausa desde los botones de la ficha y el estado
  // sincronizado. El visitante da un clic mas, dentro del reproductor. Son
  // embeds publicos de marketing -- preview de 30 s para quien no tiene
  // cuenta -- no tu zona de miembros.
  var wrap  = document.getElementById('spWrap'); if(!wrap) return;
  var mount = document.getElementById('spPlayer');
  var curBtn = null, curUri = null;

  function marcar(b,on){
    if(!b) return;
    b.classList.toggle('playing', on);
    b.textContent = on ? '⏸' : '▶';
    b.setAttribute('aria-pressed', on ? 'true' : 'false');
  }

  // spotify:track:ID -> https://open.spotify.com/embed/track/ID
  function aEmbed(uri){
    if(!uri) return null;
    var m = String(uri).match(/^spotify:([a-z]+):([A-Za-z0-9]+)$/);
    if(m) return 'https://open.spotify.com/embed/' + m[1] + '/' + m[2] + '?utm_source=generator';
    m = String(uri).match(/^https:\/\/open\.spotify\.com\/(?:embed\/)?([a-z]+)\/([A-Za-z0-9]+)/);
    if(m) return 'https://open.spotify.com/embed/' + m[1] + '/' + m[2] + '?utm_source=generator';
    return null;  // formato desconocido: no inventamos una URL
  }

  // Un track cabe en 80 px; un album o una playlist muestran lista y necesitan
  // mas alto o salen recortados. Los data-uri de la ficha incluyen los tres.
  function alto(src){ return /\/embed\/(album|playlist)\//.test(src) ? '152' : '80'; }

  function montar(uri, btn){
    var src = aEmbed(uri);
    if(!src){ return; }           // sin URL valida no se abre el panel vacio
    wrap.hidden = false;
    if(curBtn && curBtn !== btn) marcar(curBtn, false);
    curBtn = btn;

    if(curUri !== src){
      curUri = src;
      mount.textContent = '';     // no innerHTML con datos: se construye el nodo
      var f = document.createElement('iframe');
      f.src = src;
      f.width = '100%';
      f.height = alto(src);
      f.loading = 'lazy';
      f.style.border = '0';
      f.setAttribute('allow','autoplay; clipboard-write; encrypted-media; picture-in-picture');
      f.setAttribute('title','Reproductor de Spotify');
      mount.appendChild(f);
    }
    // El iframe simple no arranca solo: el estado del boton lo dice honestamente.
    marcar(btn, false);
    wrap.scrollIntoView({ behavior:'smooth', block:'nearest' });
  }

  document.querySelectorAll('#musica .rplay').forEach(function(btn){
    btn.addEventListener('click', function(e){
      e.preventDefault(); e.stopPropagation();
      montar(btn.getAttribute('data-uri'), btn);
    });
  });

  /* 03-10-2026 · El carrusel de esta seccion lo mueve assets/carrusel-rail.js,
     que engancha toda .cf-wrap del documento. Antes vivia aqui, atado a
     #cfMusica; al agregar Videos habria quedado duplicado (HdU-42, M-7). */
})();
