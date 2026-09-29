/* zp-player.js · Zignalez · 29-09-2026
 *
 * EL DISCO como módulo (PROMPT_MAESTRO_PRODUCTOR_ZIGNALEZ §3.1): el reproductor de socios de
 * app.js (montarZP / cablearZP / cablearOnda / pintarOnda / ponerMediaSession) sin la lógica de
 * socios, letra ni Supabase. Misma estructura y clases .zp-* que index.html; el CSS vive en
 * assets/zp-player.css.
 *
 *   window.ZP = { montar, cargar, detener, destruir, indice }
 *   ZP.montar(raiz, { conDisco:true, alReproducir(item,i){}, alTerminar(){}, decir(msg){} })
 *   ZP.cargar(lista, i)   // lista: [{ id, titulo, subtitulo, etiqueta, peaks, duration_seconds,
 *                         //          fuente: async () => url }]  (la URL puede ser blob:)
 *   ZP.detener()          // pausa y quita src; el blob lo revoca quien lo creó
 *
 * `fuente()` es asíncrona a propósito: en el productor devuelve un blob en memoria (fix-08,
 * revocación ≤ 60 s); en socios podrá devolver la URL firmada. El módulo no sabe de dónde viene.
 */
(function () {
  'use strict';

  var ICON_PLAY  = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 5v14l11-7z"/></svg>';
  var ICON_PAUSE = '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/></svg>';
  var SVG_PREV = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6h2v12H6zm3 6l9 6V6z"/></svg>';
  var SVG_NEXT = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M16 6h2v12h-2zM6 18l9-6-9-6z"/></svg>';
  var SVG_VOL  = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 9v6h4l5 4V5L8 9H4z"/><path d="M16 8.5a4.5 4.5 0 010 7v-7z"/></svg>';
  var SVG_MUDO = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 9v6h4l5 4V5L8 9H4z"/><path d="M16.5 9.5l4 4m0-4l-4 4" stroke="currentColor" stroke-width="2" fill="none"/></svg>';
  var SVG_REP  = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 7h10v3l4-4-4-4v3H5v6h2V7zm10 10H7v-3l-4 4 4 4v-3h12v-6h-2v4z"/></svg>';
  var SVG_REP1 = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 7h10v3l4-4-4-4v3H5v6h2V7zm10 10H7v-3l-4 4 4 4v-3h12v-6h-2v4z"/><text x="12" y="15" font-size="9" font-family="monospace" fill="currentColor" text-anchor="middle">1</text></svg>';

  var S = null;      /* estado del reproductor montado; null = desmontado */
  var audioEl = null;

  function el(tag, cls, id) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (id) n.id = id;
    return n;
  }
  function fmtDur(s) {
    var n = Math.floor(+s);
    if (!isFinite(n) || n < 0) return '';
    return Math.floor(n / 60) + ':' + String(n % 60).padStart(2, '0');
  }
  function decir(msg) {
    if (S && S.estado) S.estado.textContent = msg || '';
    if (S && S.op.decir) { try { S.op.decir(msg || ''); } catch (e) { /* nada */ } }
  }

  /* ---------- montaje ---------- */
  function montar(raiz, op) {
    destruir();
    op = op || {};
    S = { op: op, lista: [], idx: -1, repetir: 0, picos: null, previa: null, ultBarra: -1, ultSeg: -1,
          raf: 0, cuadro: 0, ancho: 0, alto: 0, obs: null, cargando: 0 };

    var zp = el('div', 'zp visible', 'zp');
    raiz.appendChild(zp);
    S.raiz = zp;

    if (op.conDisco !== false) {
      var zona = el('div', 'zp-zona');
      var escena = el('div', 'zp-escena');
      var par = el('div', 'zp-par');
      var disco = el('div', 'zp-disco');
      disco.setAttribute('aria-hidden', 'true');
      par.appendChild(el('div', 'zp-canto2'));
      par.appendChild(el('div', 'zp-canto'));
      disco.appendChild(el('div', 'zp-iris'));
      var label = el('div', 'zp-label');
      var labelTxt = el('span');
      labelTxt.textContent = 'Zignalez';
      label.appendChild(labelTxt);
      disco.appendChild(label);
      disco.appendChild(el('div', 'zp-hoyo'));
      par.appendChild(disco);
      escena.appendChild(par);
      zona.appendChild(escena);
      zona.appendChild(el('div', 'zp-sombra'));
      zp.appendChild(zona);
      S.zona = zona; S.par = par; S.disco = disco; S.labelTxt = labelTxt;
    }

    var panel = el('div', 'zp-panel');
    var eyebrow = el('div', 'zp-eyebrow'); eyebrow.textContent = 'Nada sonando';
    var titulo = el('h3', 'zp-title'); titulo.textContent = 'Elige un tema';
    var desc = el('p', 'zp-desc'); desc.textContent = '';
    panel.appendChild(eyebrow); panel.appendChild(titulo); panel.appendChild(desc);

    var tr = el('div', 'zp-tr');
    var bPrev = el('button', 'zp-b zp-prev'); bPrev.type = 'button'; bPrev.innerHTML = SVG_PREV; bPrev.setAttribute('aria-label', 'Anterior');
    var bPlay = el('button', 'zp-b zp-grande zp-play'); bPlay.type = 'button'; bPlay.innerHTML = ICON_PLAY;
    bPlay.setAttribute('aria-label', 'Reproducir'); bPlay.setAttribute('aria-pressed', 'false');
    var bNext = el('button', 'zp-b zp-next'); bNext.type = 'button'; bNext.innerHTML = SVG_NEXT; bNext.setAttribute('aria-label', 'Siguiente');
    var tAct = el('span', 'zp-t zp-actual'); tAct.textContent = '0:00';
    var onda = el('div', 'zp-onda');
    onda.setAttribute('role', 'slider'); onda.tabIndex = 0;
    onda.setAttribute('aria-label', 'Posición');
    onda.setAttribute('aria-valuemin', '0'); onda.setAttribute('aria-valuemax', '0');
    onda.setAttribute('aria-valuenow', '0'); onda.setAttribute('aria-valuetext', 'Duración desconocida');
    onda.setAttribute('aria-disabled', 'true');
    var lienzo = document.createElement('canvas');
    onda.appendChild(lienzo);
    var tTot = el('span', 'zp-t zp-total'); tTot.textContent = '--:--';
    var bRep = el('button', 'zp-b zp-rep'); bRep.type = 'button'; bRep.innerHTML = SVG_REP;
    bRep.setAttribute('aria-label', 'Repetir: desactivado'); bRep.setAttribute('aria-pressed', 'false');
    var bVol = el('button', 'zp-b zp-vol'); bVol.type = 'button'; bVol.innerHTML = SVG_VOL;
    bVol.setAttribute('aria-label', 'Silenciar'); bVol.setAttribute('aria-pressed', 'false');

    var linea = el('div', 'zp-linea');
    linea.appendChild(tAct); linea.appendChild(onda); linea.appendChild(tTot);
    var btns = el('div', 'zp-btns');
    btns.appendChild(bPrev); btns.appendChild(bPlay); btns.appendChild(bNext); btns.appendChild(bRep); btns.appendChild(bVol);
    tr.appendChild(linea); tr.appendChild(btns);
    panel.appendChild(tr);

    var estado = el('div', 'zp-estado');
    estado.setAttribute('role', 'status'); estado.setAttribute('aria-live', 'polite');
    panel.appendChild(estado);
    zp.appendChild(panel);

    /* Sin controls no ocupa espacio, pero va EN el DOM igual: Safari iOS trata
       de forma distinta a los elementos multimedia desconectados. */
    audioEl = document.createElement('audio');
    audioEl.preload = 'none';
    audioEl.addEventListener('contextmenu', function (e) { e.preventDefault(); });
    panel.appendChild(audioEl);

    S.eyebrow = eyebrow; S.titulo = titulo; S.desc = desc;
    S.bPlay = bPlay; S.bPrev = bPrev; S.bNext = bNext; S.bRep = bRep; S.bVol = bVol;
    S.tAct = tAct; S.tTot = tTot; S.onda = onda; S.lienzo = lienzo; S.ctx = lienzo.getContext('2d');
    S.estado = estado;

    cablear();
    cablearOnda();
    cablearParalaje();
    pintarBotones();
    return zp;
  }

  function destruir() {
    if (!S) return;
    detener();
    if (S.raf) { cancelAnimationFrame(S.raf); S.raf = 0; }
    if (S.obs) { try { S.obs.disconnect(); } catch (e) { /* nada */ } }
    if (S.raiz && S.raiz.parentNode) S.raiz.parentNode.removeChild(S.raiz);
    S = null; audioEl = null;
  }

  /* ---------- transporte ---------- */
  function cablear() {
    S.bPlay.addEventListener('click', alternar);
    S.bPrev.addEventListener('click', function () { saltar(-1); });
    S.bNext.addEventListener('click', function () { saltar(1); });
    S.bVol.addEventListener('click', function () { audioEl.muted = !audioEl.muted; pintarMudo(); });
    /* 0 = parar al final · 1 = seguir la lista · 2 = repetir este tema. */
    S.bRep.addEventListener('click', function () {
      S.repetir = (S.repetir + 1) % 3;
      S.bRep.innerHTML = S.repetir === 2 ? SVG_REP1 : SVG_REP;
      S.bRep.classList.toggle('on', S.repetir > 0);
      S.bRep.setAttribute('aria-pressed', S.repetir > 0 ? 'true' : 'false');
      S.bRep.setAttribute('aria-label',
        S.repetir === 0 ? 'Repetir: desactivado' : S.repetir === 1 ? 'Repetir: toda la lista' : 'Repetir: este tema');
    });

    audioEl.addEventListener('play', function () {
      if (S.disco) S.disco.classList.add('suena');
      S.bPlay.innerHTML = ICON_PAUSE;
      S.bPlay.setAttribute('aria-label', 'Pausar');
      S.bPlay.setAttribute('aria-pressed', 'true');
      S.eyebrow.textContent = 'Sonando';
      if (!S.raf) S.raf = requestAnimationFrame(tic);
      ponerPlaybackState('playing');
    });
    audioEl.addEventListener('pause', function () {
      /* El disco NO vuelve al origen: se queda donde está, como un tocadiscos. */
      if (S.disco) S.disco.classList.remove('suena');
      S.bPlay.innerHTML = ICON_PLAY;
      S.bPlay.setAttribute('aria-label', 'Reproducir');
      S.bPlay.setAttribute('aria-pressed', 'false');
      if (S.idx >= 0) S.eyebrow.textContent = 'Pausado';
      if (S.raf) { cancelAnimationFrame(S.raf); S.raf = 0; }
      pintar();
      ponerPlaybackState('paused');
    });
    audioEl.addEventListener('ended', function () {
      if (S.repetir === 2) { audioEl.currentTime = 0; audioEl.play().catch(function () {}); return; }
      if (S.op.alTerminar) { try { S.op.alTerminar(S.lista[S.idx], S.idx); } catch (e) { /* nada */ } }
      if (S.repetir === 0 && S.idx === S.lista.length - 1) return;
      if (S.repetir === 0 && S.lista.length <= 1) return;
      saltar(1);
    });
    audioEl.addEventListener('seeked', function () { pintar(); pintarOnda(true); });
    audioEl.addEventListener('loadedmetadata', function () {
      S.tTot.textContent = duracion() ? fmtDur(Math.round(duracion())) : '--:--';
      pintarOnda(true); pintar(); ponerPosicion();
    });
    audioEl.addEventListener('progress', function () { pintarOnda(true); });
    audioEl.addEventListener('waiting', function () { decir('Cargando audio…'); });
    audioEl.addEventListener('canplay', function () { decir(''); pintarOnda(true); });
    audioEl.addEventListener('error', function () { decir('No se pudo cargar este tema.'); });
  }

  function alternar() {
    if (!audioEl || !audioEl.src) { if (S && S.lista.length && S.idx < 0) cargar(S.lista, 0); return; }
    if (!audioEl.paused) { audioEl.pause(); return; }
    audioEl.play().catch(function () { decir('Toca play para escuchar.'); });
  }

  function saltar(d) {
    if (!S || !S.lista.length) return;
    var n = S.lista.length, i = S.idx;
    for (var k = 0; k < n; k++) {
      i = (i + d + n) % n;
      if (S.lista[i].fuente) { abrir(i); return; }
    }
  }

  function pintarBotones() {
    var n = S.lista.length;
    S.bPrev.disabled = n < 2;
    S.bNext.disabled = n < 2;
    S.bPlay.disabled = n === 0;
  }

  function pintarMudo() {
    var m = audioEl.muted;
    S.bVol.innerHTML = m ? SVG_MUDO : SVG_VOL;
    S.bVol.setAttribute('aria-pressed', m ? 'true' : 'false');
    S.bVol.classList.toggle('on', m);
  }

  /* ---------- carga ---------- */
  function cargar(lista, i) {
    if (!S) return;
    S.lista = lista || [];
    pintarBotones();
    if (typeof i === 'number' && i >= 0) abrir(i);
  }

  function abrir(i) {
    var t = S.lista[i];
    if (!t || !t.fuente) return;

    if (S.idx === i && audioEl.src) { alternar(); return; }

    S.idx = i;
    S.titulo.textContent = t.titulo || '';
    S.desc.textContent = t.subtitulo || '';
    if (S.labelTxt) S.labelTxt.textContent = t.etiqueta || 'Zignalez';
    S.tAct.textContent = '0:00';
    S.tTot.textContent = fmtDur(t.duration_seconds) || '--:--';
    S.previa = null; S.ultSeg = -1;
    S.eyebrow.textContent = 'Cargando';
    temaOnda(t);
    decir('Bajando el audio…');
    if (S.op.alReproducir) { try { S.op.alReproducir(t, i); } catch (e) { /* nada */ } }

    var token = ++S.cargando;
    Promise.resolve().then(function () { return t.fuente(); }).then(function (url) {
      if (!S || token !== S.cargando) return;   /* llegó otra carga antes */
      if (!url) throw new Error('sin audio');
      audioEl.src = url;
      audioEl.load();
      decir('Cargando audio…');
      audioEl.play().catch(function () { decir('Toca play para escuchar.'); });
      ponerMediaSession(t);
    }).catch(function (e) {
      if (!S || token !== S.cargando) return;
      S.eyebrow.textContent = 'Nada sonando';
      decir((e && e.message) || 'No se pudo abrir este tema.');
    });
  }

  function detener() {
    if (!audioEl) return;
    try { audioEl.pause(); } catch (e) { /* nada */ }
    audioEl.removeAttribute('src');
    try { audioEl.load(); } catch (e) { /* nada */ }
    if (S) { S.idx = -1; S.eyebrow.textContent = 'Nada sonando'; S.picos = null; S.ultBarra = -1; pintarOnda(true); }
  }

  /* ---------- pintado ---------- */
  function duracion() {
    var d = audioEl.duration;
    if (d && isFinite(d) && d > 0) return d;
    var t = S.lista[S.idx];
    if (t && t.duration_seconds > 0) return +t.duration_seconds;
    return 0;
  }

  function ponerSlider(valor, maximo, texto) {
    S.onda.setAttribute('aria-valuemax', maximo || 0);
    S.onda.setAttribute('aria-valuenow', valor || 0);
    S.onda.setAttribute('aria-valuetext', texto);
    S.onda.removeAttribute('aria-disabled');
  }
  function sliderSinDuracion() {
    S.onda.setAttribute('aria-disabled', 'true');
    S.onda.setAttribute('aria-valuenow', '0');
    S.onda.setAttribute('aria-valuetext', 'Duración desconocida');
  }

  function pintar() {
    var d = duracion();
    if (!d) {
      S.tAct.textContent = fmtDur(Math.floor(audioEl.currentTime)) || '0:00';
      S.tTot.textContent = '--:--';
      sliderSinDuracion();
      return;
    }
    pintarOnda(false);
    var seg = Math.floor(audioEl.currentTime);
    if (seg !== S.ultSeg) {
      S.ultSeg = seg;
      var total = Math.round(d), txt = fmtDur(seg) + ' de ' + fmtDur(total);
      S.tAct.textContent = fmtDur(seg);
      /* En SEGUNDOS, no en porcentaje: un paso de 5 s sobre 5 min es 1,67 % y
         redondeado no se movía, así que el lector de pantalla callaba. */
      ponerSlider(seg, total, txt);
      ponerPosicion();
    }
  }

  function tic() {
    if (!S || audioEl.paused) { if (S) S.raf = 0; return; }
    pintar();
    if ((S.cuadro = (S.cuadro || 0) + 1) % 15 === 0) pintarOnda(true);
    S.raf = requestAnimationFrame(tic);
  }

  /* ---------- la onda ---------- */
  function conectarArrastre(elm, previa) {
    var activo = false, rect = null, ultimo = 0;
    function frac(e) {
      if (!rect) rect = elm.getBoundingClientRect();
      return Math.min(1, Math.max(0, (e.clientX - rect.left) / rect.width));
    }
    function soltar(aplicar) {
      if (!activo) return;
      activo = false; rect = null;
      var d = duracion();
      if (aplicar && d) audioEl.currentTime = ultimo * d;
      S.previa = null;
      pintar(); pintarOnda(true);
    }
    elm.addEventListener('pointerdown', function (e) {
      if (!duracion()) return;
      activo = true; rect = elm.getBoundingClientRect();
      try { elm.setPointerCapture(e.pointerId); } catch (err) { /* nada */ }
      ultimo = frac(e); previa(ultimo);
      e.preventDefault();
    });
    elm.addEventListener('pointermove', function (e) { if (!activo) return; ultimo = frac(e); previa(ultimo); });
    elm.addEventListener('pointerup', function () { soltar(true); });
    /* Un cancel del sistema no es un seek. */
    elm.addEventListener('pointercancel', function () { soltar(false); });
    elm.addEventListener('lostpointercapture', function () { soltar(false); });
  }

  function cablearOnda() {
    conectarArrastre(S.onda, function (f) {
      S.previa = f;
      pintarOnda(true);
      var d = duracion();
      if (d) S.tAct.textContent = fmtDur(Math.floor(f * d));
    });
    /* Teclado: flechas ±5 s, Shift ±30 s, PageUp/Down ±60 s, Home/End. */
    S.onda.addEventListener('keydown', function (e) {
      var d = duracion(); if (!d) return;
      var paso = e.shiftKey ? 30 : 5, dd = 0;
      if (e.key === 'ArrowRight') dd = paso;
      else if (e.key === 'ArrowLeft') dd = -paso;
      else if (e.key === 'PageUp') dd = 60;
      else if (e.key === 'PageDown') dd = -60;
      else if (e.key === 'Home') { audioEl.currentTime = 0; e.preventDefault(); pintar(); pintarOnda(true); return; }
      else if (e.key === 'End') { audioEl.currentTime = d; e.preventDefault(); pintar(); pintarOnda(true); return; }
      else if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); alternar(); return; }
      else return;
      e.preventDefault();
      audioEl.currentTime = Math.min(d, Math.max(0, audioEl.currentTime + dd));
      pintar(); pintarOnda(true);
    });

    dimensionarOnda();
    if (window.ResizeObserver) {
      S.obs = new ResizeObserver(function () { dimensionarOnda(); pintarOnda(true); });
      S.obs.observe(S.onda);
    } else {
      window.addEventListener('resize', function () { dimensionarOnda(); pintarOnda(true); });
    }
  }

  function dimensionarOnda() {
    if (!S || !S.ctx) return;
    var r = S.onda.getBoundingClientRect();
    if (S.ancho === r.width && S.alto === r.height) return;
    var dpr = Math.min(2, window.devicePixelRatio || 1);
    S.lienzo.width = Math.max(1, Math.round(r.width * dpr));
    S.lienzo.height = Math.max(1, Math.round(r.height * dpr));
    S.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    S.ancho = r.width; S.alto = r.height;
    S.ultBarra = -1;
  }

  /* Sin picos NO se dibuja una onda inventada: se dibuja una barra neutra.
     Una onda que no corresponde al audio le miente al usuario. */
  function pintarOnda(forzar) {
    if (!S || !S.ctx || !S.ancho) return;
    var d = duracion();
    var f = (S.previa != null) ? S.previa : (d ? Math.min(1, audioEl.currentTime / d) : 0);
    var P = S.picos, n = P ? P.length : 0;
    var barra = n ? Math.floor(f * n) : Math.floor(f * 100);
    if (!forzar && barra === S.ultBarra) return;
    S.ultBarra = barra;

    var c = S.ctx, W = S.ancho, H = S.alto, mitad = H / 2;
    c.clearRect(0, 0, W, H);

    var fb = 0;
    try {
      var b = audioEl && audioEl.buffered;
      if (d && b && b.length) fb = Math.min(1, b.end(b.length - 1) / d);
    } catch (e) { /* buffered puede lanzar antes de cargar */ }
    if (fb > 0) { c.fillStyle = 'rgba(199,204,209,.20)'; c.fillRect(0, H - 2, W * fb, 2); }

    if (!n) {
      c.fillStyle = 'rgba(199,204,209,.22)'; c.fillRect(0, mitad - 1.5, W, 3);
      c.fillStyle = '#f2d391'; c.fillRect(0, mitad - 1.5, W * f, 3);
      cabeza(c, W * f, H);
      return;
    }
    var paso = W / n, ancho = Math.max(1, paso * 0.62);
    for (var i = 0; i < n; i++) {
      var h = Math.max(2, P[i] * (H - 6));
      c.fillStyle = (i < barra) ? 'rgba(242,211,145,.95)' : 'rgba(199,204,209,.26)';
      c.fillRect(i * paso + (paso - ancho) / 2, mitad - h / 2, ancho, h);
    }
    cabeza(c, W * f, H);
  }

  function cabeza(c, x, H) {
    var px = Math.max(0.75, Math.min(S.ancho - 0.75, x));
    c.fillStyle = 'rgba(255,233,176,.28)'; c.fillRect(px - 2.5, 0, 5, H);
    c.fillStyle = '#ffe9b0'; c.fillRect(px - 0.75, 0, 1.5, H);
  }

  function temaOnda(t) {
    var pk = t && t.peaks;
    S.picos = (Array.isArray(pk) && pk.length)
      ? pk.slice(0, 512).map(function (v) { v = +v; return (isFinite(v) && v > 0) ? Math.min(1, v) : 0; })
      : null;
    S.previa = null; S.ultBarra = -1;
    dimensionarOnda();
    pintarOnda(true);
  }

  /* ---------- paralaje (solo ratón, sin reduced-motion) ---------- */
  function cablearParalaje() {
    if (!S.par) return;
    var fino = window.matchMedia && window.matchMedia('(hover:hover) and (pointer:fine)').matches;
    var quieto = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (!fino || quieto) return;
    var pendiente = 0, rx = 0, ry = 0;
    function aplicar() {
      pendiente = 0;
      if (S && S.par) S.par.style.transform = 'rotateX(' + rx.toFixed(2) + 'deg) rotateY(' + ry.toFixed(2) + 'deg)';
    }
    S.raiz.addEventListener('pointermove', function (e) {
      var r = S.zona.getBoundingClientRect();
      var x = (e.clientX - (r.left + r.width / 2)) / (r.width / 2);
      var y = (e.clientY - (r.top + r.height / 2)) / (r.height / 2);
      rx = Math.max(-1, Math.min(1, -y)) * 9;
      ry = Math.max(-1, Math.min(1, x)) * 11;
      if (!pendiente) pendiente = requestAnimationFrame(aplicar);
    });
    S.raiz.addEventListener('pointerleave', function () {
      rx = 0; ry = 0;
      if (!pendiente) pendiente = requestAnimationFrame(aplicar);
    });
  }

  /* ---------- Media Session ---------- */
  function ponerMediaSession(t) {
    if (!('mediaSession' in navigator)) return;
    try {
      navigator.mediaSession.metadata = new MediaMetadata({
        title: t.titulo || 'Zignalez', artist: 'Zignalez', album: t.subtitulo || 'Maquetas',
        artwork: [{ src: 'assets/disco-512.jpg', sizes: '512x512', type: 'image/jpeg' }]
      });
      navigator.mediaSession.setActionHandler('play', function () { audioEl.play().catch(function () {}); });
      navigator.mediaSession.setActionHandler('pause', function () { audioEl.pause(); });
      navigator.mediaSession.setActionHandler('previoustrack', function () { saltar(-1); });
      navigator.mediaSession.setActionHandler('nexttrack', function () { saltar(1); });
      navigator.mediaSession.setActionHandler('seekto', function (d) {
        if (d.seekTime != null) { audioEl.currentTime = d.seekTime; pintar(); ponerPosicion(); }
      });
    } catch (e) { /* navegadores sin MediaSession completa */ }
  }
  function ponerPosicion() {
    if (!('mediaSession' in navigator) || !navigator.mediaSession.setPositionState) return;
    var d = duracion(); if (!d) return;
    try {
      navigator.mediaSession.setPositionState({ duration: d, playbackRate: audioEl.playbackRate, position: Math.min(audioEl.currentTime, d) });
    } catch (e) { /* fuera de rango */ }
  }
  function ponerPlaybackState(s) {
    try { if ('mediaSession' in navigator) navigator.mediaSession.playbackState = s; } catch (e) { /* nada */ }
  }

  window.ZP = { montar: montar, cargar: cargar, detener: detener, destruir: destruir, indice: function () { return S ? S.idx : -1; } };
})();
