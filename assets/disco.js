/* Disco 3D compartido · 03-10-2026
 *
 *   Era CSS dentro de index.html y DOM dentro de app.js. Al pedirlo también en
 *   /ruleta habría quedado duplicado en dos archivos, y el próximo arreglo se
 *   haría en uno de los dos (M-7). Ahora la definición vive acá y la usan las
 *   dos páginas.
 *
 *   El JS del reproductor de miembros (app.js) NO se tocó: construye el mismo
 *   DOM con las mismas clases y sigue funcionando igual. Migrarlo a crear() es
 *   un paso aparte, para no desestabilizar el reproductor en el mismo cambio.
 *
 *   Uso:
 *     var d = ZDisco.crear('LUCE BIEN');
 *     contenedor.appendChild(d.zona);
 *     d.sonando(true);            // arranca el giro y el iris
 *     d.poner('HAYABUSA');        // cambia la etiqueta
 */
(function(){
  "use strict";
  var CSS = "  /* ---- Escena 3D ----------------------------------------------------\n     Tres transformaciones SEPARADAS, y el orden importa:\n       .zp-zona    perspective (la camara)\n       .zp-escena  vaiven lento  -- inclinacion que respira\n       .zp-par     paralaje del puntero\n       .zp-disco   rotateZ      -- el giro, y SOLO el giro\n     Si la inclinacion viviera en el mismo elemento que el giro, el disco\n     daria tumbos como una moneda en vez de girar sobre su eje.\n     ------------------------------------------------------------------- */\n  .zp-zona{position:relative;display:grid;place-items:center;flex-shrink:0;\n     perspective:760px;perspective-origin:50% 38%;padding:8px 0 22px}\n  .zp-escena{transform-style:preserve-3d;\n     animation:zp-vaiven 11s ease-in-out infinite}\n  .zp-par{transform-style:preserve-3d;transition:transform .32s ease-out;\n     position:relative}\n  @keyframes zp-vaiven{\n    0%,100%{transform:rotateX(25deg) rotateY(-7deg)}\n    50%    {transform:rotateX(30deg) rotateY(7deg)}\n  }\n\n  /* El alto manda tanto como el ancho: en un portatil de 768px de alto un\n     disco de 230px deja la lista fuera de pantalla. */\n  .zp-disco{--d:min(58vw,26vh,230px);width:var(--d);height:var(--d);border-radius:50%;position:relative;\n     transform-style:preserve-3d;\n     background:\n       repeating-radial-gradient(circle at 50% 50%,rgba(0,0,0,.34) 0 1px,rgba(0,0,0,0) 1px 3px),\n       conic-gradient(from 0deg,#7a5210,#e8c169,#fff4cd,#d9a63f,#8a5f14,#f2d391,#b8862c,#e8c169,#7a5210);\n     animation:zp-girar 1.8s linear infinite;animation-play-state:paused}\n  .zp-disco.suena{animation-play-state:running}\n\n  /* Canto: dos capas hundidas en Z. El ojo lee la diferencia de luminancia\n     entre ellas como grosor. Mas capas no aportan y cuestan composicion. */\n  .zp-canto,.zp-canto2{position:absolute;inset:0;border-radius:50%;pointer-events:none;\n     background:conic-gradient(from 0deg,#3a2708,#8a6420,#c9a35a,#6b4a12,#2e1f06,#a8823a,#5c400f,#3a2708)}\n  .zp-canto {transform:translateZ(-4px)  scale(1.018);filter:brightness(.62)}\n  .zp-canto2{transform:translateZ(-8px)  scale(1.028);filter:brightness(.30)}\n\n  /* Segunda capa girando a OTRA velocidad y en sentido inverso. Un solo\n     elemento girando entero se ve plano; la diferencia de velocidad es lo que\n     produce la difraccion. */\n  .zp-iris{position:absolute;inset:0;border-radius:50%;mix-blend-mode:overlay;\n     background:repeating-conic-gradient(from 0deg,\n       rgba(255,40,90,.13) 0deg 5deg,rgba(255,196,0,.13) 5deg 10deg,\n       rgba(60,255,170,.13) 10deg 15deg,rgba(0,150,255,.13) 15deg 20deg,\n       rgba(170,60,255,.13) 20deg 25deg,rgba(255,255,255,.05) 25deg 30deg);\n     animation:zp-girar 6.4s linear infinite reverse;animation-play-state:paused}\n  .zp-disco.suena .zp-iris{animation-play-state:running}\n\n  /* El reflejo NO gira pero SI se inclina: pertenece a la sala, proyectado\n     sobre un disco inclinado. Por eso vive en .zp-par y no en .zp-disco. */\n  .zp-par::after{content:'';position:absolute;inset:0;border-radius:50%;pointer-events:none;\n     transform:translateZ(1px);\n     background:linear-gradient(112deg,\n                rgba(255,255,255,0) 6%,  rgba(255,255,255,.62) 17%, rgba(255,255,255,.10) 27%,\n                rgba(255,255,255,0) 40%, rgba(0,0,0,.30) 56%,\n                rgba(255,255,255,0) 70%, rgba(255,255,255,.34) 82%, rgba(255,255,255,0) 92%);\n     mix-blend-mode:overlay}\n  /* Borde iluminado: separa el disco del fondo negro y remata el canto. */\n  .zp-par::before{content:'';position:absolute;inset:-1px;border-radius:50%;pointer-events:none;\n     transform:translateZ(2px);\n     box-shadow:inset 0 1px 1px rgba(255,255,255,.45), inset 0 -2px 3px rgba(0,0,0,.6),\n                0 0 0 1px rgba(255,214,128,.30)}\n\n  /* Sombra de contacto: sin ella el disco flota sobre la nada y el 3D no\n     termina de cerrar. Va en la zona, fuera de la escena, sin perspectiva. */\n  .zp-sombra{position:absolute;left:50%;bottom:2px;width:64%;height:16px;\n     transform:translateX(-50%);border-radius:50%;pointer-events:none;\n     background:radial-gradient(ellipse at center,rgba(0,0,0,.72),rgba(0,0,0,0) 72%);\n     filter:blur(6px);animation:zp-sombra 11s ease-in-out infinite}\n  @keyframes zp-sombra{\n    0%,100%{transform:translateX(-50%) scaleX(1) ;opacity:.85}\n    50%    {transform:translateX(-50%) scaleX(.92);opacity:.70}\n  }\n\n  /* Etiqueta y orificio: van 1px por delante de la cara para que el\n     preserve-3d no los reordene detras del disco. */\n  .zp-label{position:absolute;inset:31%;border-radius:50%;display:grid;\n     align-items:end;justify-items:center;text-align:center;\n     padding:0 8% 15%;overflow:hidden;transform:translateZ(1px);\n     background:radial-gradient(circle at 50% 42%,#1a1a20,#0b0b0f 74%);\n     box-shadow:inset 0 0 0 1px rgba(255,214,128,.34),0 0 16px rgba(0,0,0,.6)}\n  /* Dos lineas como maximo y recortado en JS: el texto de una etiqueta vive\n     dentro de un CIRCULO, no de la caja cuadrada que lo contiene. */\n  .zp-label span{font-family:var(--font-m);font-size:8px;letter-spacing:.30em;\n     text-transform:uppercase;color:rgba(255,214,128,.85);line-height:1.4;\n     white-space:nowrap;overflow:hidden;max-width:100%}\n  .zp-hoyo{position:absolute;inset:46.5%;border-radius:50%;background:var(--ink);\n     transform:translateZ(2px);\n     box-shadow:inset 0 0 0 1px rgba(255,214,128,.28),0 0 6px rgba(0,0,0,.8)}\n\n  @keyframes zp-girar{to{transform:rotate(360deg)}}";

  var puesto = false;
  function estilos(){
    if(puesto || document.getElementById('zdisco-css')) return;
    puesto = true;
    var st = document.createElement('style');
    st.id = 'zdisco-css';
    st.textContent = CSS;
    document.head.appendChild(st);
  }

  function el(tag, cls){ var n = document.createElement(tag); if(cls) n.className = cls; return n; }

  /* La etiqueta vive dentro de un CÍRCULO, no de la caja que lo contiene: el
     texto largo se recorta acá, no con CSS. */
  function recortar(s){
    s = String(s || '').trim();
    return s.length > 18 ? s.slice(0, 17).trim() + '\u2026' : s;
  }

  function crear(texto){
    estilos();
    var zona = el('div','zp-zona');
    var escena = el('div','zp-escena');
    var par = el('div','zp-par');
    var disco = el('div','zp-disco');
    disco.setAttribute('aria-hidden','true');   /* decorativo: el estado lo dice el botón */

    disco.appendChild(el('div','zp-canto'));
    disco.appendChild(el('div','zp-canto2'));
    disco.appendChild(el('div','zp-iris'));

    var label = el('div','zp-label');
    var span = document.createElement('span');
    span.textContent = recortar(texto);
    label.appendChild(span);
    disco.appendChild(label);
    disco.appendChild(el('div','zp-hoyo'));

    par.appendChild(disco);
    escena.appendChild(par);
    zona.appendChild(escena);
    zona.appendChild(el('div','zp-sombra'));

    return {
      zona: zona,
      disco: disco,
      poner: function(t){ span.textContent = recortar(t); },
      sonando: function(on){ disco.classList.toggle('suena', !!on); }
    };
  }

  window.ZDisco = { crear: crear, estilos: estilos };
})();
