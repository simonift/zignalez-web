/* Ruleta de inéditos · 03-10-2026 · ADR-007
 *
 *   Girar es anónimo y gratis. Elegir cuesta el correo, y esa elección se
 *   registra DESPUÉS del magic link (fix-13: registrar_eleccion es solo para
 *   authenticated). Así anon no infla la señal y solo cuentan los confirmados.
 *
 *   Fuente única de los temas sorteables: preview_publico() de fix-11. No se
 *   consulta tracks directo ni se duplica la condición "visible + preview".
 *
 *   M-7: si no hay ningún extracto publicado, la ruleta NO se anuncia. Se dice
 *   que no hay nada, en vez de girar en vacío.
 */
(function(){
  "use strict";

  var SUPABASE_URL = 'https://fdahfltjaqzdgmsgedcp.supabase.co';
  var SUPABASE_KEY = 'sb_publishable_TK7Jf1kWDATJ8o9Rmp7-Ew_61rPjCib';
  var sb = window.supabase ? window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY) : null;

  /* Clarity encola lo que llega antes de que cargue su script. */
  function evento(n){ try{ if(typeof window.clarity === 'function') window.clarity('event', n); }catch(e){} }

  var $ = function(id){ return document.getElementById(id); };
  var PENDIENTE = 'zig_eleccion_pendiente';
  var OIDAS     = 'zig_ruleta_oidas';
  var LIMITE    = 1;   /* temas de regalo antes de pedir el correo */

  /* LÍMITE BLANDO, y se dice: el extracto es un objeto público en previews/, y
     cualquier tope en el cliente se salta con una ventana de incógnito. No es
     un candado, es una puerta: su trabajo es pedir el correo en el momento en
     que la persona ya quiere más, no proteger el audio — que ya es público.
     El límite DURO existe y es otro: escucha_unica_activa() sobre el tema
     completo, para quien sí tiene sesión (fix-11). */
  function oidas(){
    try { return JSON.parse(localStorage.getItem(OIDAS) || '[]'); } catch(e){ return []; }
  }
  function marcarOida(id){
    try {
      var a = oidas();
      if(a.indexOf(id) < 0){ a.push(id); localStorage.setItem(OIDAS, JSON.stringify(a)); }
    } catch(e){}
  }
  function bloqueado(){ return oidas().length >= LIMITE; }

  var temas = [], girando = false, salido = null;
  var RADIO = 66;            /* distancia de la etiqueta al centro, en px */
  var MAX_ETIQUETA = 11;     /* caracteres antes de recortar; se ajusta al nº de temas */

  function paso(id){
    ['paso-rueda','paso-tema','paso-elegir','paso-bloqueo','paso-correo'].forEach(function(p){
      var el = $(p); if(el) el.hidden = (p !== id);
    });
    try{ window.scrollTo({top:0, behavior:'instant'}); }catch(e){ window.scrollTo(0,0); }
  }

  function guardar(k, v){ try{ sessionStorage.setItem(k, v); }catch(e){} }
  function leer(k){ try{ return sessionStorage.getItem(k); }catch(e){ return null; } }
  function borrar(k){ try{ sessionStorage.removeItem(k); }catch(e){} }

  /* ── 1 · Cargar los temas sorteables ──────────────────────────────── */
  if(!sb){
    $('subRueda').textContent = 'No se pudo cargar. Prueba recargando la página.';
    return;
  }

  sb.rpc('preview_publico').then(function(r){
    if(r && r.error){ console.warn('preview_publico:', r.error); }
    temas = (r && r.data) || [];

    if(temas.length === 0){
      /* M-7: no se anuncia lo que no suena. */
      $('subRueda').textContent = 'Todavía no hay ningún extracto publicado. Vuelve pronto.';
      $('bGirar').remove();
      return;
    }

    $('subRueda').textContent = temas.length === 1
      ? 'Hay un tema inédito esperando. La ruleta te deja oír el gancho, sin registrarte.'
      : temas.length + ' maquetas inéditas. La ruleta elige una y te deja oír el gancho. Sin registrarte, sin dar nada.';

    /* Con más porciones hay menos cuerda por etiqueta: se recorta antes. */
    MAX_ETIQUETA = temas.length <= 4 ? 11 : (temas.length <= 6 ? 9 : 7);
    dibujarRueda();
    dibujarFichas();
    $('bGirar').disabled = false;
    evento('ruleta_vista');
    volviendoDelCorreo();
  });

  /* 03-10-2026 · Verificado en producción: los títulos de tracks traen el nombre
     del artista delante y el productor en paréntesis — el hero en vivo muestra
     "ZIGNALEZ - HAYABUSA (FLACKOLOYAL)". Tomar las 4 primeras letras tal cual
     daba "ZIGN" para TODOS los temas: la rueda quedaba ilegible.
     limpiar() solo quita el prefijo del propio artista, redundante en su propio
     sitio. No inventa ni recorta nada más: el paréntesis del productor se
     conserva en el título visible y solo se ignora al derivar el código. */
  function limpiar(t){
    var s = (t.titulo || '').trim();
    return s.replace(/^\s*zignalez\s*[-–—:·]\s*/i, '') || (t.titulo || '');
  }

  /* 03-10-2026 · Verificado en la página en vivo: el código de 4 letras no dice
     qué tema es ("HAYA", "ELTE"), y encima salía tangencial, así que CARA y ELTE
     se leían al revés. Ahora la rueda muestra el nombre corto y derecho.
     corto(): quita el featuring y el paréntesis del productor, que no caben, y
     recorta en el límite de palabra. No inventa: solo acorta. */
  function corto(t){
    var s = limpiar(t)
      .replace(/\([^)]*\)/g, ' ')
      .replace(/\s+(ft|feat|con)\.?\s.*$/i, '')
      .replace(/\s+/g, ' ')
      .trim();
    if(s.length <= MAX_ETIQUETA) return s;
    var corte = s.slice(0, MAX_ETIQUETA);
    var esp = corte.lastIndexOf(' ');
    return (esp > 4 ? corte.slice(0, esp) : corte).trim() + '\u2026';
  }

  var etiquetas = [];

  function dibujarRueda(){
    var rueda = $('rueda'), n = temas.length, seg = 360 / n;
    var trozos = temas.map(function(_, i){
      var c = (i % 2) ? 'rgba(255,255,255,.035)' : 'rgba(139,61,255,.13)';
      return c + ' ' + (i*seg) + 'deg ' + ((i+1)*seg) + 'deg';
    }).join(', ');
    rueda.style.background = 'conic-gradient(' + trozos + ')';

    rueda.innerHTML = '';
    etiquetas = temas.map(function(t){
      var b = document.createElement('b');
      b.textContent = corto(t);
      rueda.appendChild(b);
      return b;
    });
    colocarEtiquetas(0);
  }

  /* Las etiquetas orbitan con su porción pero NO ruedan con ella: se les aplica
     la rotación inversa de la rueda, así quedan derechas en todo momento, también
     cuando el giro se detiene en un ángulo cualquiera. La transición es la misma
     que la de la rueda (CSS), por eso acompañan el movimiento sin saltos. */
  function colocarEtiquetas(giroRueda){
    var n = temas.length, seg = 360 / n;
    etiquetas.forEach(function(b, i){
      var ang = (i*seg + seg/2) - 90;
      b.style.transform = 'rotate(' + ang + 'deg) translate(' + RADIO + 'px) rotate(' + (-ang - giroRueda) + 'deg) translate(-50%,-50%)';
    });
  }

  var vueltas = 0;
  $('bGirar').addEventListener('click', function(){
    if(girando || temas.length === 0) return;
    if(bloqueado()){ evento('ruleta_bloqueada'); pintarCandados(); paso('paso-bloqueo'); return; }
    girando = true;
    var b = this; b.disabled = true;
    var rueda = $('rueda');


    var i = Math.floor(Math.random() * temas.length);
    var seg = 360 / temas.length;
    vueltas += 5;
    var giro = vueltas*360 - (i*seg + seg/2);
    rueda.style.transform = 'rotate(' + giro + 'deg)';
    colocarEtiquetas(giro);
    evento('giro');

    setTimeout(function(){
      salido = temas[i];
      mostrarTema(salido);
      girando = false; b.disabled = false;
    }, 4300);
  });

  /* ── 3 · Resultado y reproductor ──────────────────────────────────── */
  var audio = new Audio(); audio.preload = 'none';
  var disco = null;
  var barras = [], NB = 42, firmadoPara = null, raf = null;

  (function ondaInicial(){
    var onda = $('onda');
    for(var i=0;i<NB;i++){
      var b = document.createElement('i');
      b.style.height = Math.min(22 + Math.round(Math.abs(Math.sin(i*0.9))*58 + (i%5)*4), 100) + '%';
      onda.appendChild(b); barras.push(b);
    }
  })();

  function fmt(s){ var m=Math.floor(s/60), r=Math.floor(s%60); return m+':'+(r<10?'0':'')+r; }

  function pintarOnda(frac){
    var hasta = Math.floor(frac * NB);
    for(var i=0;i<NB;i++){ barras[i].classList.toggle('on', i <= hasta); }
  }

  function mostrarTema(t){
    if(!disco && window.ZDisco){
      disco = window.ZDisco.crear(corto(t));
      $('discoMonta').appendChild(disco.zona);
    } else if(disco){
      disco.poner(corto(t));
      disco.sonando(false);
    }
    $('tTitulo').textContent = limpiar(t);
    /* FALTA: preview_publico() no devuelve créditos. No se inventan: la línea
       queda vacía hasta que la RPC los exponga. */
    $('tCred').hidden = true;
    $('tTotal').textContent = fmt(t.preview_seconds || 30);
    $('tAhora').textContent = '0:00';
    $('tEstado').textContent = 'RECIÉN PUBLICADA';
    pararAudio(); pintarOnda(-1);
    paso('paso-tema');
  }

  function pararAudio(){
    try{ audio.pause(); }catch(e){}
    if(disco) disco.sonando(false);
    if(raf){ cancelAnimationFrame(raf); raf = null; }
    $('icoPlay').setAttribute('d','M3 1.8v12.4L14 8z');
  }

  function seguir(){
    if(audio.paused) return;
    var d = audio.duration || (salido && salido.preview_seconds) || 30;
    $('tAhora').textContent = fmt(audio.currentTime);
    pintarOnda(audio.currentTime / d);
    raf = requestAnimationFrame(seguir);
  }

  $('bPlay').addEventListener('click', function(){
    if(!salido) return;
    if(!audio.paused){ pararAudio(); return; }

    if(firmadoPara === salido.track_id && audio.src){
      audio.play().then(function(){ if(disco) disco.sonando(true); $('icoPlay').setAttribute('d','M3.5 2h3.2v12H3.5zM9.3 2h3.2v12H9.3z'); raf = requestAnimationFrame(seguir); })
                  .catch(function(){ $('tEstado').textContent = 'TOCA OTRA VEZ PARA OÍR'; });
      return;
    }

    $('tEstado').textContent = 'CARGANDO…';
    sb.storage.from('maquetas').createSignedUrl(salido.preview_path, 300).then(function(res){
      if(res.error || !res.data || !res.data.signedUrl){
        $('tEstado').textContent = 'NO SE PUDO CARGAR. PRUEBA EN SPOTIFY.';
        return;
      }
      firmadoPara = salido.track_id;
      audio.src = res.data.signedUrl;
      $('tEstado').textContent = 'RECIÉN PUBLICADA';
      audio.play().then(function(){
        evento('extracto_play');
        if(disco) disco.sonando(true);
        $('icoPlay').setAttribute('d','M3.5 2h3.2v12H3.5zM9.3 2h3.2v12H9.3z');
        raf = requestAnimationFrame(seguir);
      }).catch(function(){ $('tEstado').textContent = 'TOCA OTRA VEZ PARA OÍR'; });
    });
  });

  audio.addEventListener('ended', function(){
    evento('extracto_fin');
    if(salido) marcarOida(salido.track_id);
    pararAudio(); pintarOnda(1);
    $('tAhora').textContent = $('tTotal').textContent;
  });

  /* ── Catálogo con candado ──────────────────────────────────────────
     Todos los temas a la vista, cerrados salvo el que ya oyó. Que se vea lo que
     hay es el punto: un candado sobre una lista vacía no tienta a nadie. */
  function pintarCandados(){
    var caja = $('candados'); if(!caja) return;
    var ya = oidas();
    caja.innerHTML = '';
    temas.forEach(function(t){
      var oida = ya.indexOf(t.track_id) >= 0;
      var d = document.createElement('div');
      d.className = 'cand' + (oida ? ' oida' : '');
      var n = document.createElement('div'); n.className = 'n'; n.textContent = corto(t);
      var sb = document.createElement('div'); sb.className = 's';
      sb.textContent = oida ? 'Ya la oíste' : 'Cerrada';
      var ic = document.createElement('span'); ic.className = 'ic';
      ic.innerHTML = oida
        ? '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6L9 17l-5-5"/></svg>'
        : '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><rect x="4.5" y="10.5" width="15" height="10" rx="2"/><path d="M8 10.5V7a4 4 0 0 1 8 0v3.5"/></svg>';
      d.appendChild(n); d.appendChild(sb); d.appendChild(ic);
      caja.appendChild(d);
    });
    var ya1 = temas.filter(function(t){ return ya.indexOf(t.track_id) >= 0; })[0];
    $('bloqueoSub').textContent = ya1
      ? 'Ya oíste ' + corto(ya1) + '. Deja tu correo, eliges cuál sigue, y además te enteras cuando salgan.'
      : 'Deja tu correo, eliges cuál quieres oír, y además te enteras cuando salgan.';
  }

  /* ── 4 · Elegir ───────────────────────────────────────────────────── */
  var elegido = null;

  function dibujarFichas(){
    var caja = $('fichas'); caja.innerHTML = '';
    temas.forEach(function(t){
      var b = document.createElement('button');
      b.type = 'button'; b.className = 'tema'; b.setAttribute('aria-pressed','false');
      var em = document.createElement('em'); em.textContent = corto(t);
      b.appendChild(em); b.appendChild(document.createTextNode(limpiar(t)));
      b.addEventListener('click', function(){
        elegido = t;
        Array.prototype.forEach.call(caja.children, function(x){ x.setAttribute('aria-pressed','false'); });
        b.setAttribute('aria-pressed','true');
        validar();
      });
      caja.appendChild(b);
    });
  }

  function validar(){
    var ok = /\S+@\S+\.\S+/.test($('correo').value) && $('acepto').checked && elegido;
    $('bEnviar').disabled = !ok;
  }
  $('correo').addEventListener('input', validar);
  $('acepto').addEventListener('change', validar);

  function aviso(txt, mal){
    var a = $('avisoElegir');
    if(!txt){ a.hidden = true; return; }
    a.textContent = txt; a.className = 'aviso' + (mal ? ' mal' : ''); a.hidden = false;
  }

  $('bEnviar').addEventListener('click', function(){
    if(!elegido) return;
    var b = this, correo = $('correo').value.trim();
    b.disabled = true; aviso('Enviando…', false);

    guardar(PENDIENTE, elegido.track_id);

    sb.auth.signInWithOtp({
      email: correo,
      options: { emailRedirectTo: location.origin + '/ruleta' }
    }).then(function(r){
      if(r && r.error){
        b.disabled = false;
        aviso('No se pudo enviar el correo. Revisa la dirección e inténtalo de nuevo.', true);
        borrar(PENDIENTE);
        return;
      }
      evento('otp_enviado');
      /* Alta en la lista. 23505 = ya estaba: no es error para el visitante. */
      sb.from('subscribers').insert({ email: correo }).then(function(ins){
        if(ins && ins.error && ins.error.code !== '23505') console.warn('subscribers insert:', ins.error);
      });
      $('elegidoTitulo').textContent = limpiar(elegido);
      evento('eleccion_enviada');
      paso('paso-correo');
    });
  });

  /* ── 5 · Vuelta del magic link: registrar la elección ──────────────── */
  function volviendoDelCorreo(){
    var pend = leer(PENDIENTE);
    if(!pend) return;
    sb.auth.getSession().then(function(s){
      if(!(s && s.data && s.data.session)) return;   /* aún sin confirmar */

      /* El tema es lo que se le prometió al visitante: se entrega SIEMPRE que
         haya confirmado el correo. El registro de la elección es telemetría
         nuestra, y es el mejor esfuerzo. Si fix-13 todavía no está aplicado,
         registrar_eleccion no existe y la RPC falla; eso no puede costarle el
         tema a quien ya dejó su correo (M-7: el fallo no se traga en silencio,
         pero tampoco se le cobra al usuario). */
      var t = temas.filter(function(x){ return x.track_id === pend; })[0];
      borrar(PENDIENTE);
      evento('optin_confirmado');
      if(t){ salido = t; mostrarTema(t); }

      sb.rpc('registrar_eleccion', { p_track_id: pend }).then(function(r){
        if(r && r.error){
          /* 42883 / PGRST202 = la función no existe todavía (falta fix-13). */
          console.warn('registrar_eleccion no disponible:', r.error.message || r.error);
          evento('eleccion_no_registrada');
        }
      });
    });
  }

  /* ── 6 · Navegación ───────────────────────────────────────────────── */
  $('bDesbloquear').addEventListener('click', function(){ aviso(''); evento('eleccion_abierta'); paso('paso-elegir'); });
  $('bVolverRueda').addEventListener('click', function(){ paso('paso-rueda'); });
  $('bElegir1').addEventListener('click', function(){ aviso(''); evento('eleccion_abierta'); paso('paso-elegir'); });
  $('bElegir2').addEventListener('click', function(){ aviso(''); evento('eleccion_abierta'); paso('paso-elegir'); });
  $('bOtra').addEventListener('click', function(){
    pararAudio(); pintarOnda(-1);
    if(bloqueado()){ pintarCandados(); paso('paso-bloqueo'); return; }
    paso('paso-rueda');
  });
  $('bVolver').addEventListener('click', function(){
    $('rueda').style.transform = ''; vueltas = 0; colocarEtiquetas(0);
    paso('paso-rueda');
  });
})();
