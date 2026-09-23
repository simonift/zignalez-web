
(function(){
  "use strict";

  /* ====== CONFIG — datos reales + slots para integrar ======
     VIDEOS: leídos del canal real @Zignalez (sept 2026). spotify: link de escucha;
     donde el tema aún no está en Spotify (inéditos/colabs sin confirmar), apunta a la
     página de artista — NO se inventan IDs de álbum. */
  var ARTIST_SPOTIFY = "https://open.spotify.com/artist/0M4ZFfQbpLYiLksk0QyOph";
  var VIDEOS = [
    {yt:"lzW1ZlMEqTs", t:"ORBITÁNDOTE (Studio Preview)", badge:"Preview", sp:ARTIST_SPOTIFY},
    {yt:"sf9pJw4ww8w", t:"HAYABUSA (Live)", badge:"con Flacko Loyal", uv:true, sp:ARTIST_SPOTIFY},
    {yt:"_nAUBog0kzk", t:"ALTA GAMA (ft Migue Ramos)", badge:"Video Lyrics", sp:"https://open.spotify.com/track/7N2R96fWEwgVT0PLRfSs0I"},
    {yt:"JGGHQ7kpn_Q", t:"GATAS & GANGSTERS", badge:"Video", sp:"https://open.spotify.com/album/0H5aw80rGzBj0G5HlNMXvY"},
    {yt:"tHt8pvWICdc", t:"Puesta Pa' Mí (ft Brignacio)", badge:"Show", sp:ARTIST_SPOTIFY, th:"hqdefault"},
    {yt:"auU93djdz84", t:"No Te Vuelvo A Ver (Brignacio ft Zignalez)", badge:"Video", sp:ARTIST_SPOTIFY},
    {yt:"D-GV3pneZGQ", t:"Sola llega, sola se va · #Hayabusa", badge:"Preview", sp:ARTIST_SPOTIFY, fb:true},
    {yt:"qSOU03PgyZY", t:"LA DATA · en el estudio", badge:"Behind", sp:"https://open.spotify.com/album/4F6wmBGKWZx3Xr5yyu1WO0"},
    {yt:"T_3B3-vrV-Y", t:"¿Soltamos LA DATA? · estudio", badge:"Behind", sp:"https://open.spotify.com/album/4F6wmBGKWZx3Xr5yyu1WO0"}
  ];
  // TikToks reales de @zignalez (extraídos sept 2026). Se pueden reordenar por vistas cuando cargues las métricas.
  var TIKTOKS = [
    {u:"https://www.tiktok.com/@zignalez/video/7675938769161293074", t:"Sola llega, sola se va \u00b7 #Hayabusa"},
    {u:"https://www.tiktok.com/@zignalez/video/7677398562413546770", t:"LUCE BIEN \u00b7 con Fox y Acheh"},
    {u:"https://www.tiktok.com/@zignalez/video/7679510103124462856", t:"El beat de Flackito"},
    {u:"https://www.tiktok.com/@zignalez/video/7578195536180727058", t:"ORBIT\u00c1NDOTE \u00b7 preview"},
    {u:"https://www.tiktok.com/@zignalez/video/7344853825775275269", t:"ALTA GAMA \u00b7 con Migue Ramos"},
    {u:"https://www.tiktok.com/@zignalez/video/7674483319764946183", t:"Construyendo en el estudio"},
    {u:"https://www.tiktok.com/@zignalez/video/7451274863244807429", t:"Lo que pas\u00f3 anoche"}
  ];
  // Slot: imágenes de Instagram (galería). Se cargan como URLs alojadas por ti.
  var IG_IMAGES = [];

  /* ====== VIDEOS ====== */
  var vgrid = document.getElementById('vgrid');
  var openVideo = null;
  function closeVideo(card){ if(!card) return; var f=card.querySelector('.vframe'); if(f){ var fr=f.querySelector('iframe'); if(fr) fr.remove(); } card.classList.remove('open'); if(openVideo===card) openVideo=null; }
  VIDEOS.forEach(function(v){
    var card = document.createElement('div'); card.className='vcard';
    var spDisabled = (v.sp === ARTIST_SPOTIFY);
    card.innerHTML =
      '<button class="vthumb" aria-label="Reproducir '+v.t+'">' +
        '<span class="vbadge'+(v.uv?' uv':'')+'">'+v.badge+'</span>' +
        '<span class="vfallback"><span class="vfb-mark">Zignalez</span><span class="vfb-title">'+v.t+'</span></span>' +
        '<img class="vimg" loading="lazy" alt="'+v.t+'">' +
        '<span class="vplay"><svg width="20" height="20" viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg></span>' +
      '</button>' +
      '<div class="vframe"><button class="vclose" type="button" aria-label="Volver a la portada">✕ Volver</button></div>' +
      '<div class="vbody">' +
        '<div class="vtitle">'+v.t+'</div>' +
        '<div class="vactions">' +
          '<a class="chip" href="https://www.youtube.com/watch?v='+v.yt+'" target="_blank" rel="noopener">YouTube ↗</a>' +
          '<a class="chip sp" href="'+v.sp+'" target="_blank" rel="noopener"'+(spDisabled?' title="En Spotify: pronto"':'')+'>'+(spDisabled?'Spotify · pronto ↗':'Spotify ↗')+'</a>' +
        '</div>' +
      '</div>';
    var thumb = card.querySelector('.vthumb');
    var frame = card.querySelector('.vframe');
    var img = card.querySelector('.vimg');
    if(v.fb){ card.classList.add('vthumb-fallback'); }
    else {
      /* th: primera resolucion que SI existe para ese video. Sin esto, videos sin
         miniatura HD generaban dos 404 en consola por visita (verificado 22-09-2026:
         tHt8pvWICdc no tiene maxres ni sd). */
      var res=['maxresdefault','sddefault','hqdefault','mqdefault'], ri=v.th?Math.max(0,res.indexOf(v.th)):0;
      function tryThumb(){ img.src='https://i.ytimg.com/vi/'+v.yt+'/'+res[ri]+'.jpg'; }
      img.addEventListener('error', function(){ ri++; if(ri<res.length) tryThumb(); else card.classList.add('vthumb-fallback'); });
      img.addEventListener('load', function(){ if(img.naturalWidth<=121){ ri++; if(ri<res.length) tryThumb(); else card.classList.add('vthumb-fallback'); } });
      tryThumb();
    }
    thumb.addEventListener('click', function(){
      if(openVideo && openVideo!==card) closeVideo(openVideo);
      if(!frame.querySelector('iframe')){ frame.insertAdjacentHTML('afterbegin', '<iframe title="'+v.t+'" loading="lazy" src="https://www.youtube-nocookie.com/embed/'+v.yt+'?autoplay=1&rel=0" allow="autoplay; encrypted-media; picture-in-picture; fullscreen" allowfullscreen></iframe>'); }
      card.classList.add('open'); openVideo=card;
    });
    card.querySelector('.vclose').addEventListener('click', function(e){ e.stopPropagation(); closeVideo(card); });
    vgrid.appendChild(card);
  });

  /* ====== TikTok ====== */
  var tkMount = document.getElementById('tk-mount');
  var openTk=null;
  function bindPlay(cell){ var pb=cell.querySelector('.tkc-play'); if(pb) pb.addEventListener('click',function(e){ e.preventDefault(); e.stopPropagation(); playTk(cell); }); }
  function closeTk(cell){ if(!cell) return; var c=cell.querySelector('.tkc-cover'); if(c && cell._poster!=null){ c.innerHTML=cell._poster; bindPlay(cell); } cell.classList.remove('playing'); if(openTk===cell) openTk=null; }
  function playTk(cell){
    if(openTk && openTk!==cell) closeTk(openTk);
    var id=cell.getAttribute('data-id'), t=cell.getAttribute('data-t')||'';
    var c=cell.querySelector('.tkc-cover');
    c.innerHTML='<iframe class="tkc-frame" title="'+t+'" src="https://www.tiktok.com/player/v1/'+id+'?loop=1&rel=0&autoplay=1&controls=1&music_info=0&description=0" allow="autoplay; fullscreen; encrypted-media; picture-in-picture" allowfullscreen></iframe>' +
      '<button class="tkc-close" type="button" aria-label="Volver a la portada">\u2715</button>';
    c.querySelector('.tkc-close').addEventListener('click',function(e){ e.stopPropagation(); closeTk(cell); });
    cell.classList.add('playing'); openTk=cell;
  }
  if(TIKTOKS.length){
    var rail = document.createElement('div'); rail.className='rail';
    TIKTOKS.forEach(function(v){
      var id=(v.u.match(/video\/(\d+)/)||[])[1]||'';
      var cell=document.createElement('div'); cell.className='tkc'; cell.setAttribute('data-id',id); cell.setAttribute('data-t',v.t);
      var poster='<span class="tkc-badge">TikTok</span>' +
        '<button class="tkc-play" type="button" aria-label="Reproducir '+v.t+'"><svg width="20" height="20" viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg></button>' +
        '<span class="tkc-title">'+v.t+'</span>' +
        '<a class="tkc-handle" href="'+v.u+'" target="_blank" rel="noopener">@zignalez \u2197</a>';
      cell._poster=poster;
      cell.innerHTML='<div class="tkc-cover">'+poster+'</div>';
      bindPlay(cell);
      rail.appendChild(cell);
    });
    tkMount.appendChild(rail);
  } else {
    tkMount.innerHTML = '<div class="placeholder-note">Aquí va el <b>carrusel de TikToks</b> de @zignalez.</div>';
  }

  /* ====== Instagram (reels destacados -> embed inline) ====== */
  var IG_REELS = [
    {c:"DcZ2NHBOj7C", t:"LUCE BIEN \u00b7 detrás de cámara"},
    {c:"DcPum1quVXj", t:"HAYABUSA \u00b7 ¿la soltamos?"},
    {c:"DcXmOaBuvX9", t:"Del boceto al set"},
    {c:"DcFkzFxuy6u", t:"Últimamente suena así"}
  ];
  var igMount = document.getElementById('ig-mount');
  var openIg=null;
  function bindIgPlay(cell){ var pb=cell.querySelector('.igc-play'); if(pb) pb.addEventListener('click',function(e){ e.preventDefault(); e.stopPropagation(); playIg(cell); }); }
  function closeIg(cell){ if(!cell) return; var c=cell.querySelector('.igc-cover'); if(c && cell._poster!=null){ c.innerHTML=cell._poster; bindIgPlay(cell); } cell.classList.remove('playing'); if(openIg===cell) openIg=null; }
  function playIg(cell){
    if(openIg && openIg!==cell) closeIg(openIg);
    var code=cell.getAttribute('data-code'), t=cell.getAttribute('data-t')||'';
    var c=cell.querySelector('.igc-cover');
    c.innerHTML='<iframe class="igc-frame" title="'+t+'" src="https://www.instagram.com/reel/'+code+'/embed/" allow="autoplay; clipboard-write; encrypted-media; picture-in-picture" scrolling="no"></iframe>' +
      '<button class="igc-close" type="button" aria-label="Volver a la portada">\u2715</button>';
    c.querySelector('.igc-close').addEventListener('click',function(e){ e.stopPropagation(); closeIg(cell); });
    cell.classList.add('playing'); openIg=cell;
  }
  if(IG_REELS.length){
    var igrail=document.createElement('div'); igrail.className='rail';
    IG_REELS.forEach(function(v){
      var cell=document.createElement('div'); cell.className='igc'; cell.setAttribute('data-code',v.c); cell.setAttribute('data-t',v.t);
      var poster='<span class="igc-badge">Instagram</span>' +
        '<button class="igc-play" type="button" aria-label="Reproducir '+v.t+'"><svg width="20" height="20" viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg></button>' +
        '<span class="igc-title">'+v.t+'</span>' +
        '<a class="igc-handle" href="https://www.instagram.com/reel/'+v.c+'/" target="_blank" rel="noopener">@zignalez \u2197</a>';
      cell._poster=poster;
      cell.innerHTML='<div class="igc-cover">'+poster+'</div>';
      bindIgPlay(cell);
      igrail.appendChild(cell);
    });
    igMount.appendChild(igrail);
  } else {
    igMount.innerHTML = '<div class="placeholder-note">Reels de @zignalez.</div>';
  }

  /* ====== Supabase: init ====== */
  var SUPABASE_URL = 'https://fdahfltjaqzdgmsgedcp.supabase.co';
  var SUPABASE_KEY = 'sb_publishable_TK7Jf1kWDATJ8o9Rmp7-Ew_61rPjCib';
  var sb = window.supabase ? window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY, {
    /* PKCE: el magic link vuelve con ?code=... y supabase-js lo canjea.
       NUNCA hay access_token ni refresh_token en la URL. Corrige H-01. */
    auth: { flowType: 'pkce', detectSessionInUrl: true, persistSession: true, autoRefreshToken: true }
  }) : null;

  /* ====== Formulario captura: registro con Supabase ====== */
  var form = document.getElementById('capture-form');
  var note = document.getElementById('note');
  var submitBtn = document.getElementById('submit');

  if(!sb){
    note.className = 'form-note dev';
    note.textContent = 'Un segundo…';
  }

  form.addEventListener('submit', function(e){
    e.preventDefault();
    if(!sb){
      note.className='form-note err';
      note.textContent='Algo falló de mi lado. Recarga la página y vuelve a intentar.';
      return;
    }
    var emailVal = form.email.value.trim();
    var wspVal = form.whatsapp ? form.whatsapp.value.trim() : '';
    if(!emailVal || !document.getElementById('consent').checked){
      note.className='form-note warn'; note.textContent='Falta tu correo y marcar el cuadrito de abajo.'; return;
    }
    submitBtn.disabled = true; note.className='form-note warn'; note.textContent='Mandando…';

    /* 1. signInWithOtp envía magic link y crea cuenta si no existe */
    sb.auth.signInWithOtp({
      email: emailVal,
      options: { emailRedirectTo: window.location.origin + '/?zona=miembros' }
    }).then(function(res){
      if(res.error) throw res.error;
      /* 2. Guardar el WhatsApp (opcional). El email/consentimiento los graba
         un trigger en auth.users al confirmar el magic link — no dependemos
         de que este insert funcione. PostgREST resuelve con {data,error} y
         NO rechaza la promesa, así que hay que revisar res.error a mano. */
      if(wspVal){
        sb.from('subscribers').insert(
          { email: emailVal, whatsapp: wspVal, consent_ts: Date.now(), source: 'web' }
        ).then(function(r){
          if(r && r.error && r.error.code !== '23505') console.warn('subscribers insert:', r.error);
        });
      }
      note.className='form-note ok';
      note.textContent='Listo. Te llegó un correo — ábrelo y quedas adentro.';
      submitBtn.textContent='Listo — revisa tu correo';
    }).catch(function(err){
      submitBtn.disabled=false;
      note.className='form-note err';
      note.textContent = authErrMsg(err);
    });
  });

  /* ====== Login zona miembros ====== */
  var loginForm = document.getElementById('login-form');
  var loginNote = document.getElementById('login-note');
  var loginSubmit = document.getElementById('login-submit');
  var membersGate = document.getElementById('members-gate');
  var membersContent = document.getElementById('members-content');
  var membersWelcome = document.getElementById('members-welcome');
  var logoutBtn = document.getElementById('logout-btn');

  /* Mensaje de rate limit: NUNCA comparar el string del error.
     GoTrue devuelve "...after %d seconds." con número variable y punto final.
     Se usa el status 429 / error.code, que sí son estables. */
  function authErrMsg(err){
    /* Log completo a la consola: sin esto el error es invisible para depurar.
       El usuario ve un mensaje corto; tú ves status, code y message. */
    console.error('[zignalez:auth]', {
      status:  err && err.status,
      code:    err && err.code,
      name:    err && err.name,
      message: err && err.message
    });
    if(!err) return 'Error desconocido.';
    if(err.status === 429 || err.code === 'over_email_send_rate_limit' || err.code === 'over_request_rate_limit'){
      return 'Ya te mandé varios. Espera unos minutos y lo intentamos de nuevo.';
    }
    if(err.status === 422 || err.code === 'validation_failed'){
      return 'Ese correo tiene algo raro. Revísalo.';
    }
    return 'No salió. Inténtalo de nuevo en un rato.';
  }

  function showMembers(user){
    membersGate.style.display = 'none';
    membersContent.classList.add('visible');
    membersWelcome.textContent = 'Ya estás dentro. Esto no está en ninguna plataforma.';
    /* Diferido con setTimeout: supabase-js tiene un bug documentado de deadlock
       si se llama una función async dentro del callback de onAuthStateChange. */
    setTimeout(loadTracks, 0);
    /* Llegada desde el magic link: bajar a la zona de miembros.
       El marcador va en la QUERY, nunca en el fragmento: Supabase concatena su
       propio '#access_token=...' al redirect, y un '#miembros' previo producía
       '#miembros#access_token=...', que supabase-js NO sabe parsear -> la sesión
       nunca se creaba y el gate no se abria jamas. */
    if(/[?&]zona=miembros/.test(window.location.search)){
      setTimeout(function(){
        var sec = document.getElementById('miembros');
        if(sec && sec.scrollIntoView) sec.scrollIntoView({ behavior:'smooth', block:'start' });
        if(window.history && history.replaceState){
          history.replaceState(null, '', window.location.pathname);
        }
      }, 60);
    }
  }
  function showGate(){
    membersGate.style.display = '';
    membersContent.classList.remove('visible');
    /* Resetear el form de login: sin esto, tras cerrar sesión el botón queda
       deshabilitado diciendo "Revisa tu correo" y no se puede volver a entrar. */
    if(loginSubmit){ loginSubmit.disabled = false; loginSubmit.textContent = 'Mándame el enlace'; }
    if(loginNote){ loginNote.className = 'login-note'; loginNote.textContent = ''; }
    stopPlayback();
  }

  if(loginForm && sb){
    loginForm.addEventListener('submit', function(e){
      e.preventDefault();
      var email = document.getElementById('login-email').value.trim();
      if(!email){ loginNote.className='login-note err'; loginNote.textContent='Te falta el correo.'; return; }
      loginSubmit.disabled = true;
      loginNote.className='login-note'; loginNote.textContent='';
      sb.auth.signInWithOtp({
        email: email,
        options: { emailRedirectTo: window.location.origin + '/?zona=miembros' }
      }).then(function(res){
        if(res.error) throw res.error;
        loginNote.className='login-note ok';
        loginNote.textContent='Va en camino. Revisa tu correo — a veces cae en promociones.';
        loginSubmit.textContent='Listo — revisa tu correo';
      }).catch(function(err){
        loginSubmit.disabled=false;
        loginNote.className='login-note err';
        loginNote.textContent = authErrMsg(err);
      });
    });
  }

  if(logoutBtn && sb){
    logoutBtn.addEventListener('click', function(){
      sb.auth.signOut().then(function(){ showGate(); });
    });
  }

  /* ====== Reproductor de maquetas ====== */
  var trackMount = document.getElementById('track-player');
  var audioEl = null, playingBtn = null, tracksLoaded = false;

  var ICON_PLAY  = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 5v14l11-7z"/></svg>';
  var ICON_PAUSE = '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/></svg>';

  function fmtDur(s){
    if(!s && s !== 0) return '';
    var m = Math.floor(s/60), r = s % 60;
    return m + ':' + (r < 10 ? '0' : '') + r;
  }
  /* Las dos columnas se crean UNA vez y nadie las vacia enteras. Antes
     setState hacia trackMount.textContent='', que ahora se llevaria por
     delante el disco, la onda y el transporte junto con la lista. */
  function asegurarCols(){
    if(ZP.cols && ZP.cols.parentNode === trackMount) return;
    trackMount.textContent = '';
    var cols  = el('div','zp-cols','zp-cols');
    var izq   = el('div','zp-izq','zp-izq');
    var der   = el('div','zp-der','zp-der');
    var lf    = el('div','zp-lf','zp-lf'); lf.hidden = true;
    var cab   = el('div','zp-lf-cab','zp-lf-cab');
    var lin   = el('div','zp-lf-lin','zp-lf-lin');
    var sep   = el('div','zp-lf-sep','zp-lf-sep'); sep.hidden = true;
    var cab2  = el('div','zp-lf-cab','zp-lf-cab2'); cab2.hidden = true;
    var sig   = el('div','zp-lf-sig','zp-lf-sig'); sig.hidden = true;
    var plana = el('div','zp-plana','zp-plana'); plana.hidden = true;
    lf.appendChild(cab); lf.appendChild(lin); lf.appendChild(sep);
    lf.appendChild(cab2); lf.appendChild(sig); lf.appendChild(plana);
    /* La ventana de 3 temas vive DENTRO del cuadro de la letra: un solo
       recuadro, dos zonas que se deslizan. */
    var sep2  = el('div','zp-lf-sep','zp-vent-sep'); sep2.hidden = true;
    var vent  = el('div','zp-vent','zp-vent'); vent.hidden = true;
    lf.appendChild(sep2); lf.appendChild(vent);

    var lista = el('div','zp-lista','zp-lista');   /* solo para mensajes de estado */
    der.appendChild(lf); der.appendChild(lista);
    cols.appendChild(izq); cols.appendChild(der);

    /* En reposo manda el carrusel horizontal, a todo el ancho. */
    var carr = el('div','zp-carrusel','zp-carrusel');
    carr.setAttribute('role','list');
    trackMount.appendChild(carr);
    trackMount.appendChild(cols);
    ZP.carr=carr; ZP.vent=vent; ZP.ventSep=sep2;
    ZP.cols=cols; ZP.izq=izq; ZP.der=der; ZP.lista=lista;
    ZP.lf=lf; ZP.lfCab=cab; ZP.lfLin=lin; ZP.lfSep=sep; ZP.lfCab2=cab2; ZP.lfSig=sig;
    ZP.plana=plana;
    ajustarTope();
  }

  /* El tope del modulo se MIDE, no se adivina. calc(100vh - 210px) era un
     numero inventado: el encabezado de la zona de miembros mide 250px en
     escritorio y 330px en movil (el titulo envuelve), asi que el modulo
     terminaba 21px por debajo del borde inferior justo donde decia caber.
     Aqui se calcula el hueco real y se publica como --zp-tope. */
  var topePend = 0;
  function ajustarTope(){
    if(!ZP.cols) return;
    /* En reposo .zp-cols esta en display:none: su rectangulo es cero y la
       medida no vale nada. Mejor no escribir que escribir un numero falso. */
    if(!ZP.cols.getBoundingClientRect().height) return;
    var nav = document.querySelector('.nav, header.nav, .site-nav');
    var altoNav = nav ? Math.round(nav.getBoundingClientRect().height) : 72;
    var sec = document.getElementById('miembros');
    var interno = 0;
    if(sec){
      /* Ambos rectangulos se desplazan juntos, asi que la resta no depende
         de donde este el scroll: es la altura del encabezado de la seccion. */
      interno = Math.round(ZP.cols.getBoundingClientRect().top - sec.getBoundingClientRect().top);
      if(interno < 0) interno = 0;
    }
    var anchoGrande = window.innerWidth >= 980;
    var hueco = window.innerHeight - altoNav - 16 - (anchoGrande ? interno : 0);

    /* El suelo tampoco se inventa: es el alto REAL del contenido de la columna
       del disco. Con un piso fijo (420/380) el modulo se comprimia por debajo
       de sus mandos y el play quedaba 85px fuera del borde en cualquier
       portatil de 768px, recortado por .members{overflow:clip}. Y en apaisado
       380px era mas alto que la pantalla entera. Si no cabe, el modulo crece y
       scrollea la pagina: preferible a perder el boton de reproducir. */
    /* Se mide con el tope QUITADO: con el tope puesto la columna ya esta
       comprimida y scrollHeight devuelve la caja, no el contenido, asi que el
       minimo salia mas bajo que el contenido real y seguia recortando. */
    ZP.cols.style.removeProperty('--zp-tope');
    var minIzq = ZP.izq ? Math.ceil(ZP.izq.getBoundingClientRect().height) : 0;
    var minimo = anchoGrande ? minIzq : (minIzq + 16 + minimoDer());
    if(minimo && hueco < minimo) hueco = minimo;
    if(hueco < 260) hueco = 260;
    ZP.cols.style.setProperty('--zp-tope', hueco + 'px');
    marcarLetraNavegable();
  }
  /* Lo que el cuadro de la derecha no puede ceder: sus partes fijas
     (cabecera, separadores y relleno) mas los minimos de las dos zonas que
     scrollean. Se mide, porque la cabecera envuelve a dos lineas en pantallas
     estrechas y una constante se quedaba corta entre 20 y 45px. */
  function minimoDer(){
    if(!ZP.lf || ZP.lf.hidden) return 200;
    var alto  = ZP.lf.getBoundingClientRect().height;
    var lin   = ZP.lfLin.getBoundingClientRect().height;
    var vent  = ZP.vent.getBoundingClientRect().height;
    var fijo  = alto - lin - vent;
    var mLin  = parseFloat(getComputedStyle(ZP.lfLin).minHeight) || 0;
    var mVent = parseFloat(getComputedStyle(ZP.vent).minHeight) || 0;
    var m = Math.ceil(fijo + mLin + mVent);
    return (m > 0 && isFinite(m)) ? m : 200;
  }

  /* WCAG 2.1.1: en movil el cuadro de la letra tiene scroll propio, y una zona
     que scrollea y no recibe foco es contenido inalcanzable con teclado --
     tambien para quien navega con un mando o un conmutador. El tabindex se
     pone SOLO cuando de verdad desborda: una parada de tabulacion que no
     scrollea nada es ruido para quien usa lector de pantalla. */
  function marcarLetraNavegable(){
    if(!ZP.lfLin) return;
    var desborda = ZP.lfLin.scrollHeight > ZP.lfLin.clientHeight + 1;
    if(desborda){
      if(ZP.lfLin.getAttribute('tabindex') !== '0'){
        ZP.lfLin.setAttribute('tabindex','0');
        ZP.lfLin.setAttribute('role','region');
        ZP.lfLin.setAttribute('aria-label','Letra');
      }
    } else if(ZP.lfLin.hasAttribute('tabindex')){
      /* No se lo quitamos mientras tenga el foco. Medido: con el foco en la
         letra, pasar de 390 a 1440 de ancho dejaba document.activeElement en
         BODY -- quien navega con teclado pierde el sitio y vuelve al principio
         del documento. Esperamos a que salga solo. */
      if(document.activeElement === ZP.lfLin){
        if(!ZP.lfLinEsperaBlur){
          ZP.lfLinEsperaBlur = 1;
          ZP.lfLin.addEventListener('blur', function(){
            ZP.lfLinEsperaBlur = 0; marcarLetraNavegable();
          }, { once:true });
        }
        return;
      }
      ZP.lfLin.removeAttribute('tabindex');
      ZP.lfLin.removeAttribute('role');
      ZP.lfLin.removeAttribute('aria-label');
    }
  }

  function ajustarTopeDiferido(){
    if(topePend) return;
    topePend = window.requestAnimationFrame ? requestAnimationFrame(function(){
      topePend = 0; ajustarTope();
    }) : setTimeout(function(){ topePend = 0; ajustarTope(); }, 60);
  }
  window.addEventListener('resize', ajustarTopeDiferido);
  window.addEventListener('orientationchange', ajustarTopeDiferido);

  /* El contenido de la columna izquierda no tiene su alto final en el momento
     de montar: la onda se dimensiona despues y las fuentes entran mas tarde.
     Medido en banco, la primera medida daba 448px donde el contenido real eran
     550px, y el tope solo se corregia si el usuario cambiaba el tamano de la
     ventana. Se vigila el contenido, no la columna: la columna va comprimida y
     su caja no cambia, el contenido si. */
  function vigilarIzq(){
    if(ZP.obsIzq || !window.ResizeObserver || !ZP.izq) return;
    var dentro = ZP.izq.firstElementChild;
    if(!dentro) return;
    ZP.obsIzq = new ResizeObserver(ajustarTopeDiferido);
    ZP.obsIzq.observe(dentro);
  }
  if(document.fonts && document.fonts.ready && document.fonts.ready.then){
    document.fonts.ready.then(ajustarTopeDiferido).catch(function(){});
  }
  function setState(msg){
    asegurarCols();
    ZP.lista.textContent = '';
    var p = document.createElement('p');
    p.className = 'tp-state';
    p.textContent = msg;
    ZP.lista.appendChild(p);
  }
  function stopPlayback(){
    if(ZP.raf){ cancelAnimationFrame(ZP.raf); ZP.raf = 0; }
    if(audioEl){ try{ audioEl.pause(); audioEl.removeAttribute('src'); audioEl.load(); }catch(e){} }
    if(playingBtn){ playingBtn.innerHTML = ICON_PLAY; playingBtn.classList.remove('is-playing'); playingBtn = null; }
    if(ZP.disco) ZP.disco.classList.remove('suena');
    if(ZP.raiz) ZP.raiz.classList.remove('visible');
    ZP.idx = -1;
    if(trackMount) trackMount.classList.remove('suena');
    if(ZP.vent){ ZP.vent.hidden = true; ZP.ventSep.hidden = true; }
    if(ZP.lf){ ZP.lf.hidden = true; }
  }

  function loadTracks(){
    if(!sb || !trackMount || tracksLoaded) return;
    tracksLoaded = true;
    setState('Buscando lo que hay…');

    /* RLS filtra por visible=TRUE, pero se filtra igual en el cliente:
       defensa en profundidad, no confianza en una sola capa. */
    sb.from('tracks')
      .select('id,title,description,file_path,duration_seconds,sort_order,peaks')
      .eq('visible', true)
      .order('sort_order', { ascending: true })
      .then(function(res){
        if(res.error){
          console.warn('tracks:', res.error);
          setState('No cargó. Recarga la página y debería salir.');
          tracksLoaded = false;
          return;
        }
        var tracks = res.data || [];
        if(!tracks.length){
          setState('Las maquetas están en el horno. Te aviso apenas suban.');
          return;
        }
        renderTracks(tracks);
      });
  }

  function renderTracks(tracks){
    asegurarCols();
    ZP.lista.textContent = '';
    ZP.tracks = tracks;
    ZP.filas = [];

    tracks.forEach(function(t){
      var row = document.createElement('div');
      row.className = 'tp-item';

      var btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'tp-play';
      btn.innerHTML = ICON_PLAY;                       /* SVG fijo, no dato externo */
      btn.setAttribute('aria-label', 'Reproducir ' + (t.title || ''));
      if(!t.file_path){ btn.disabled = true; btn.title = 'Todavía no lo subo'; }

      var info = document.createElement('div');
      info.className = 'tp-info';
      var tt = document.createElement('div');
      tt.className = 'tp-title';
      tt.textContent = t.title || '';                  /* textContent: sin XSS desde la BD */
      info.appendChild(tt);
      if(t.description){
        var dd = document.createElement('div');
        dd.className = 'tp-desc';
        dd.textContent = t.description;
        info.appendChild(dd);
      }

      var dur = document.createElement('span');
      dur.className = 'tp-dur';
      dur.textContent = fmtDur(t.duration_seconds);

      row.appendChild(btn); row.appendChild(info); row.appendChild(dur);
      ZP.filas.push(row);          /* no se monta: es el molde de la ventana */

      btn.addEventListener('click', function(){
        if(playingBtn === btn && audioEl){
          if(audioEl.paused){ audioEl.play().catch(function(){}); btn.innerHTML = ICON_PAUSE; btn.classList.add('is-playing'); }
          else { audioEl.pause(); btn.innerHTML = ICON_PLAY; btn.classList.remove('is-playing'); }
          return;
        }
        playTrack(t, btn);
      });

      /* Tarjeta del carrusel: mismo tema, otra forma. */
      var card = el('div','zp-card'); card.setAttribute('role','listitem');
      var cb = document.createElement('button');
      cb.type='button'; cb.className='zp-card-btn';
      cb.setAttribute('aria-label','Reproducir ' + (t.title || ''));
      if(!t.file_path){ cb.disabled = true; cb.title = 'Todavía no lo subo'; }
      var ct = el('div','zp-card-t'); ct.textContent = t.title || '';
      var cd = el('div','zp-card-d'); cd.textContent = t.description || '';
      var cdur = el('div','zp-card-dur'); cdur.textContent = fmtDur(t.duration_seconds);
      var cico = el('div','zp-card-ico'); cico.innerHTML = ICON_PLAY;
      cb.appendChild(cico); cb.appendChild(ct); cb.appendChild(cd); cb.appendChild(cdur);
      card.appendChild(cb);
      ZP.carr.appendChild(card);
      cb.addEventListener('click', function(){ playTrack(t, btn); });
    });

    montarZP();
  }

  /* TODOS los temas, con scroll propio y el que suena resaltado. Antes eran
     solo tres fijos: con 6 maquetas eso escondia la mitad del catalogo sin
     que nada indicara que habia mas. */
  function pintarVentana(){
    if(!ZP.vent || !ZP.tracks.length || ZP.idx < 0){
      if(ZP.vent){ ZP.vent.hidden = true; ZP.ventSep.hidden = true; }
      return;
    }
    var n = ZP.tracks.length, i = ZP.idx;
    var ini = 0, fin = n - 1;
    var volvia = ZP.vent.contains(document.activeElement);
    ZP.vent.textContent = '';
    for(var j = ini; j <= fin; j++){
      (function(k){
        var t = ZP.tracks[k];
        var f = el('div','zp-vt' + (k === i ? ' on' : ''));
        var b = document.createElement('button');
        b.type = 'button'; b.className = 'zp-vt-b';
        b.setAttribute('aria-label', (k === i ? 'Sonando: ' : 'Reproducir ') + (t.title || ''));
        if(k === i) b.setAttribute('aria-current','true');
        if(!t.file_path) b.disabled = true;
        var tt = el('span','zp-vt-t'); tt.textContent = t.title || '';
        var dd = el('span','zp-vt-d'); dd.textContent = fmtDur(t.duration_seconds);
        b.appendChild(tt); b.appendChild(dd);
        f.appendChild(b);
        ZP.vent.appendChild(f);
        b.addEventListener('click', function(){
          if(k === i){ if(audioEl.paused) audioEl.play().catch(function(){}); else audioEl.pause(); return; }
          zpAbrir(k, ZP.filas[k] ? ZP.filas[k].querySelector('.tp-play') : null);
        });
      })(j);
    }
    /* El cuadro contiene la lista, asi que se muestra siempre que algo suene;
       que haya letra o no lo deciden sus piezas internas, no el contenedor. */
    ZP.lf.hidden = false;
    ZP.vent.hidden = false;
    if(ZP.lf.classList.contains('sin-letra')) marcarSinLetra(true);
    ZP.ventSep.hidden = ZP.lf.classList.contains('sin-letra');

    /* Si el foco estaba en la lista, se devuelve: pintarVentana la reconstruye
       entera, el boton enfocado desaparece y el foco caia en BODY, mandando al
       usuario de teclado al principio del documento (WCAG 2.4.3). */
    if(volvia){
      var nuevo = ZP.vent.querySelector('.zp-vt.on button') ||
                  ZP.vent.querySelector('button');
      if(nuevo){
        try{ nuevo.focus({ preventScroll:true }); }catch(e){ nuevo.focus(); }
      }
    }

    /* El que suena, a la vista. Se mueve SOLO el scroll de la lista con
       aritmetica propia: scrollIntoView, incluso con block:'nearest',
       arrastra a todos los ancestros con scroll -- la pagina incluida --
       y el modulo se iba de pantalla al cambiar de tema. */
    var act = ZP.vent.querySelector('.zp-vt.on');
    if(act){
      var rv = ZP.vent.getBoundingClientRect(), ra = act.getBoundingClientRect();
      var arriba = (ra.top - rv.top) + ZP.vent.scrollTop;
      var abajo  = arriba + ra.height;
      if(arriba < ZP.vent.scrollTop){
        ZP.vent.scrollTop = arriba;
      } else if(abajo > ZP.vent.scrollTop + ZP.vent.clientHeight){
        ZP.vent.scrollTop = abajo - ZP.vent.clientHeight;
      }
    }
  }

  function playTrack(track, btn){
    var i = ZP.tracks.indexOf(track);
    zpAbrir(i >= 0 ? i : 0, btn);
  }

  /* ══════════════════════════════════════════════════════════════════
     EL DISCO · reproductor propio
     Reemplaza el control nativo del navegador, que no se puede
     tematizar de forma consistente entre navegadores y rompe la inmersion.
     ══════════════════════════════════════════════════════════════════ */

  var ZP = { tracks:[], filas:[], idx:-1, letra:[], estrofas:[], numerar:false, iLinea:-1,
             raf:0, cacheOk:false, arrastrando:false, tLento:0,
             firmadoEn:0, refirmando:false,
             /* 0 parar al final · 1 seguir la lista · 2 repetir este tema.
                Vivia en la franja; el boton se mudo al transporte. */
             repetir:0, picos:null, previa:null, ultBarra:-1 };

  /* Vida de la firma. 300s era demasiado corto para una sesion de escucha
     real; una hora cubre el caso normal y la re-firma cubre el resto. */
  var TTL_FIRMA = 3600;

  var SVG_PREV = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6h2v12H6zm3 6l9 6V6z"/></svg>';
  var SVG_NEXT = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M16 6h2v12h-2zM6 18l9-6-9-6z"/></svg>';
  var SVG_VOL  = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 9v6h4l5 4V5L8 9H4z"/><path d="M16 8.5a4.5 4.5 0 010 7v-7z"/></svg>';
  var SVG_MUDO = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 9v6h4l5 4V5L8 9H4z"/><path d="M16.5 9.5l4 4m0-4l-4 4" stroke="currentColor" stroke-width="2" fill="none"/></svg>';

  function el(tag, cls, id){
    var n = document.createElement(tag);
    if(cls) n.className = cls;
    if(id) n.id = id;
    return n;
  }

  function montarZP(){
    asegurarCols();
    /* Desmontaje explicito: renderTracks solo vacia la lista, no la columna
       del disco, asi que el nodo anterior hay que quitarlo a mano. */
    if(ZP.obs){ try{ ZP.obs.disconnect(); }catch(e){} ZP.obs = null; }
    if(ZP.raiz && ZP.raiz.parentNode) ZP.raiz.parentNode.removeChild(ZP.raiz);
    var raiz = el('div','zp','zp');

    var zona   = el('div','zp-zona');
    var escena = el('div','zp-escena','zp-escena');
    var par    = el('div','zp-par','zp-par');
    var disco = el('div','zp-disco','zp-disco');
    disco.setAttribute('aria-hidden','true');      /* decorativo: el estado lo dice el boton */
    par.appendChild(el('div','zp-canto2'));
    par.appendChild(el('div','zp-canto'));
    disco.appendChild(el('div','zp-iris'));
    var label = el('div','zp-label');
    var labelTxt = el('span', null, 'zp-label-txt');
    label.appendChild(labelTxt);
    disco.appendChild(label);
    disco.appendChild(el('div','zp-hoyo'));
    par.appendChild(disco);
    escena.appendChild(par);
    zona.appendChild(escena);
    zona.appendChild(el('div','zp-sombra'));

    var panel = el('div','zp-panel');
    var eyebrow = el('div','zp-eyebrow'); eyebrow.textContent = 'Sonando';
    var titulo  = el('h3','zp-title','zp-title');
    var desc    = el('p','zp-desc','zp-desc');
    panel.appendChild(eyebrow); panel.appendChild(titulo); panel.appendChild(desc);

    var tr = el('div','zp-tr');
    var bPrev = el('button','zp-b','zp-prev'); bPrev.type='button'; bPrev.innerHTML = SVG_PREV;
    bPrev.setAttribute('aria-label','Anterior');
    var bPlay = el('button','zp-b zp-grande','zp-play'); bPlay.type='button'; bPlay.innerHTML = ICON_PLAY;
    bPlay.setAttribute('aria-label','Reproducir'); bPlay.setAttribute('aria-pressed','false');
    var bNext = el('button','zp-b','zp-next'); bNext.type='button'; bNext.innerHTML = SVG_NEXT;
    bNext.setAttribute('aria-label','Siguiente');
    var tAct = el('span','zp-t','zp-actual'); tAct.textContent = '0:00';
    /* La onda REEMPLAZA a .zp-barra: mismo role=slider, mismo scrub. */
    var onda = el('div','zp-onda','zp-onda');
    onda.setAttribute('role','slider'); onda.tabIndex = 0;
    onda.setAttribute('aria-label','Posicion');
    onda.setAttribute('aria-valuemin','0'); onda.setAttribute('aria-valuemax','0');
    onda.setAttribute('aria-valuenow','0'); onda.setAttribute('aria-valuetext','0:00');
    var lienzo = document.createElement('canvas');
    onda.appendChild(lienzo);
    var tTot = el('span','zp-t','zp-total'); tTot.textContent = '0:00';
    var bRep = el('button','zp-b','zp-rep'); bRep.type='button'; bRep.innerHTML = SVG_REP;
    bRep.setAttribute('aria-label','Repetir: desactivado'); bRep.setAttribute('aria-pressed','false');
    var bVol = el('button','zp-b','zp-vol'); bVol.type='button'; bVol.innerHTML = SVG_VOL;
    bVol.setAttribute('aria-label','Silenciar'); bVol.setAttribute('aria-pressed','false');

    var linea = el('div','zp-linea');
    linea.appendChild(tAct); linea.appendChild(onda); linea.appendChild(tTot);
    var btns = el('div','zp-btns');
    btns.appendChild(bPrev); btns.appendChild(bPlay); btns.appendChild(bNext);
    btns.appendChild(bRep);  btns.appendChild(bVol);
    tr.appendChild(linea); tr.appendChild(btns);
    panel.appendChild(tr);

    var estado = el('div','zp-estado','zp-estado');
    estado.setAttribute('role','status'); estado.setAttribute('aria-live','polite');
    panel.appendChild(estado);

    raiz.appendChild(zona); raiz.appendChild(panel);
    ZP.izq.appendChild(raiz);

    audioEl = document.createElement('audio');
    audioEl.preload = 'none';
    audioEl.addEventListener('contextmenu', function(e){ e.preventDefault(); });
    /* Sin controls no ocupa espacio, pero va EN el DOM igual: Safari iOS trata
       de forma distinta a los elementos multimedia desconectados. */
    panel.appendChild(audioEl);

    ZP.raiz=raiz; ZP.disco=disco; ZP.par=par; ZP.zona=zona; ZP.labelTxt=labelTxt; ZP.titulo=titulo; ZP.desc=desc;
    ZP.bPlay=bPlay; ZP.bPrev=bPrev; ZP.bNext=bNext; ZP.bRep=bRep; ZP.bVol=bVol;
    ZP.tAct=tAct; ZP.tTot=tTot;
    ZP.onda=onda; ZP.lienzo=lienzo; ZP.ctx=lienzo.getContext('2d');
    ZP.picos=null; ZP.previa=null; ZP.ultBarra=-1; ZP.anchoBarra=0;
    ZP.estado=estado;

    cablearZP();
    cablearOnda();
    cablearParalaje();
  }

  function cablearZP(){
    ZP.bPlay.addEventListener('click', function(){ alternar(); });
    ZP.bPrev.addEventListener('click', function(){ saltar(-1); });
    ZP.bNext.addEventListener('click', function(){ saltar(1); });
    ZP.bVol.addEventListener('click', function(){ audioEl.muted = !audioEl.muted; pintarMudo(); });
    /* 0 = parar al final · 1 = seguir la lista · 2 = repetir este tema.
       El control estaba en la franja; sin el, 'ended' encadenaria seis WAV
       master sin que nadie lo pida. */
    ZP.bRep.addEventListener('click', function(){
      ZP.repetir = (ZP.repetir + 1) % 3;
      ZP.bRep.innerHTML = ZP.repetir === 2 ? SVG_REP1 : SVG_REP;
      ZP.bRep.classList.toggle('on', ZP.repetir > 0);
      ZP.bRep.setAttribute('aria-pressed', ZP.repetir > 0 ? 'true' : 'false');
      ZP.bRep.setAttribute('aria-label',
        ZP.repetir === 0 ? 'Repetir: desactivado' :
        ZP.repetir === 1 ? 'Repetir: toda la lista' : 'Repetir: este tema');
    });

    audioEl.addEventListener('play',  function(){
      ZP.disco.classList.add('suena');
      ZP.bPlay.innerHTML = ICON_PAUSE;
      ZP.bPlay.setAttribute('aria-label','Pausar');
      ZP.bPlay.setAttribute('aria-pressed','true');
      if(playingBtn){ playingBtn.innerHTML = ICON_PAUSE; playingBtn.classList.add('is-playing'); }
      if(!ZP.raf) ZP.raf = requestAnimationFrame(tic);
    });
    audioEl.addEventListener('pause', function(){
      /* El disco NO vuelve al origen: se queda donde esta, como un tocadiscos. */
      ZP.disco.classList.remove('suena');
      ZP.bPlay.innerHTML = ICON_PLAY;
      ZP.bPlay.setAttribute('aria-label','Reproducir');
      ZP.bPlay.setAttribute('aria-pressed','false');
      if(playingBtn){ playingBtn.innerHTML = ICON_PLAY; playingBtn.classList.remove('is-playing'); }
      if(ZP.raf){ cancelAnimationFrame(ZP.raf); ZP.raf = 0; }
      pintar();
    });
    audioEl.addEventListener('ended', function(){
      if(ZP.repetir === 2){ audioEl.currentTime = 0; audioEl.play().catch(function(){}); return; }
      if(ZP.repetir === 0 && ZP.idx === ZP.tracks.length - 1){ return; }
      saltar(1);
    });

    /* La cache del indice apunta hacia adelante tras un scrub hacia atras.
       Sin esto la letra se congela hasta que el audio la alcanza. */
    audioEl.addEventListener('seeking', function(){ ZP.cacheOk = false; });
    audioEl.addEventListener('seeked',  function(){ pintar(); sincronizarPos(); });

    audioEl.addEventListener('loadedmetadata', function(){
      ZP.tTot.textContent = duracion() ? fmtDur(Math.round(duracion())) : '--:--';
      pintarBuffer();
      sincronizarPos();
    });
    audioEl.addEventListener('progress', pintarBuffer);
    audioEl.addEventListener('waiting',  function(){ decir('Cargando audio…'); });
    audioEl.addEventListener('canplay',  function(){
      decir(''); pintarBuffer();
      if(ZP.tLento){ clearTimeout(ZP.tLento); ZP.tLento = 0; }
    });
    audioEl.addEventListener('error', function(){
      if(ZP.tLento){ clearTimeout(ZP.tLento); ZP.tLento = 0; }
      /* Un 403 por firma caducada llega aqui como un error generico. Antes de
         rendirse, se intenta renovar una vez. */
      if(ZP.idx >= 0 && firmaVencida() && !ZP.refirmando){ refirmar('error'); return; }
      decir('No se pudo cargar este tema.');
    });

    /* 'stalled' distingue red lenta de enlace muerto: si la firma esta
       vencida, es lo segundo. */
    audioEl.addEventListener('stalled', function(){
      if(ZP.idx >= 0 && firmaVencida() && !ZP.refirmando) refirmar('stalled');
    });

  }

  function decir(msg){ if(ZP.estado) ZP.estado.textContent = msg; }

  /* Play/pausa, con la comprobacion de firma ANTES de reanudar: es el caso
     real -- pausar, irse un rato, volver. */
  function alternar(){
    if(!audioEl.src) return;
    if(!audioEl.paused){ audioEl.pause(); return; }
    if(firmaVencida()){ refirmar('reanudar'); return; }
    audioEl.play().catch(function(){});
  }

  /* Arrastre con vista previa. El seek se aplica UNA vez, al soltar: es el
     comportamiento que el usuario espera de un scrubber y ademas evita la
     tormenta de peticiones Range. El rect se cachea en pointerdown porque el
     control no cambia de tamano mientras el dedo esta encima. */
  function conectarArrastre(elm, previa){
    var activo = false, rect = null, ultimo = 0;

    function frac(e){
      if(!rect) rect = elm.getBoundingClientRect();
      return Math.min(1, Math.max(0, (e.clientX - rect.left) / rect.width));
    }
    function soltar(){
      if(!activo) return;
      activo = false; rect = null;
      var d = duracion();
      if(d){ audioEl.currentTime = ultimo * d; }
      ZP.previa = null;
      pintar(); pintarOnda(true);
    }

    elm.addEventListener('pointerdown', function(e){
      activo = true; rect = elm.getBoundingClientRect();
      try{ elm.setPointerCapture(e.pointerId); }catch(err){}
      ultimo = frac(e); previa(ultimo);
      e.preventDefault();
    });
    elm.addEventListener('pointermove', function(e){
      if(!activo) return;
      ultimo = frac(e); previa(ultimo);
    });
    elm.addEventListener('pointerup', soltar);
    elm.addEventListener('pointercancel', soltar);
    elm.addEventListener('lostpointercapture', soltar);
  }

  function ponerSlider(elm, valor, maximo, texto){
    if(!elm) return;
    elm.setAttribute('aria-valuemax', maximo || 0);
    elm.setAttribute('aria-valuenow', valor || 0);
    elm.setAttribute('aria-valuetext', texto);
    elm.removeAttribute('aria-disabled');
  }

  function sliderSinDuracion(){
    [ZP.onda].forEach(function(elm){
      if(!elm) return;
      elm.setAttribute('aria-disabled','true');
      elm.setAttribute('aria-valuenow','0');
      elm.setAttribute('aria-valuetext','Duracion desconocida');
    });
  }

  /* Un unico sitio que decide el estado de silencio para los DOS botones.
     Antes la franja propagaba al disco pero el disco no propagaba a la
     franja, y ninguno cambiaba su aria-label: silenciado seguia anunciando
     "Silenciar". */
  function pintarMudo(){
    var m = audioEl.muted;
    [ZP.bVol].forEach(function(b){
      if(!b) return;
      b.innerHTML = m ? SVG_MUDO : SVG_VOL;
      b.setAttribute('aria-pressed', m ? 'true' : 'false');
      b.setAttribute('aria-label', m ? 'Activar sonido' : 'Silenciar');
      b.classList.toggle('on', m);
    });
  }

  /* Paralaje de puntero: la pista de profundidad mas barata y la mas
     convincente. Solo con raton -- en tactil no hay puntero que seguir y
     ademas el dedo tapa el disco. Se desactiva con reduced-motion. */
  function cablearParalaje(){
    var fino = window.matchMedia && window.matchMedia('(hover:hover) and (pointer:fine)').matches;
    var quieto = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if(!fino || quieto) return;

    var pendiente = 0, rx = 0, ry = 0;
    function aplicar(){
      pendiente = 0;
      ZP.par.style.transform = 'rotateX(' + rx.toFixed(2) + 'deg) rotateY(' + ry.toFixed(2) + 'deg)';
    }
    ZP.raiz.addEventListener('pointermove', function(e){
      var r = ZP.zona.getBoundingClientRect();
      var x = (e.clientX - (r.left + r.width/2))  / (r.width/2);
      var y = (e.clientY - (r.top  + r.height/2)) / (r.height/2);
      rx = Math.max(-1, Math.min(1, -y)) * 9;
      ry = Math.max(-1, Math.min(1,  x)) * 11;
      if(!pendiente) pendiente = requestAnimationFrame(aplicar);
    });
    ZP.raiz.addEventListener('pointerleave', function(){
      rx = 0; ry = 0;
      if(!pendiente) pendiente = requestAnimationFrame(aplicar);
    });
  }


  function saltar(d){
    if(!ZP.tracks.length) return;
    var n = ZP.tracks.length;
    var i = ZP.idx;
    for(var k = 0; k < n; k++){
      i = (i + d + n) % n;
      if(ZP.tracks[i].file_path){ zpAbrir(i, null); return; }
    }
  }

  function zpAbrir(i, btn){
    var t = ZP.tracks[i];
    if(!t || !t.file_path) return;

    if(ZP.idx === i && audioEl.src){
      if(audioEl.paused) audioEl.play().catch(function(){});
      else audioEl.pause();
      return;
    }

    if(playingBtn && playingBtn !== btn){
      playingBtn.innerHTML = ICON_PLAY; playingBtn.classList.remove('is-playing');
    }
    /* :nth-of-type se rompia en silencio en cuanto entraba cualquier nodo
       entre las filas. La lista se guarda al construirla. */
    playingBtn = btn || (ZP.filas[i] ? ZP.filas[i].querySelector('.tp-play') : null);
    ZP.idx = i;
    trackMount.classList.add('suena');
    pintarVentana();
    ZP.raiz.classList.add('visible');
    vigilarIzq();
    /* El tope se mide DESPUES de montar y mostrar: llamado antes, .zp-cols
       todavia estaba vacio (.zp aun sin 'visible'), el rectangulo daba cero y
       la medida se descartaba, asi que en la primera reproduccion no habia
       tope y solo aparecia tras el primer resize. */
    ajustarTope();

    ZP.titulo.textContent   = t.title || '';
    ZP.desc.textContent     = t.description || '';
    ZP.labelTxt.textContent = 'Zignalez';
    ZP.tAct.textContent     = '0:00';
    ZP.tTot.textContent     = fmtDur(t.duration_seconds) || '0:00';
    ZP.previa = null;

    cargarLetra(t.id);
    temaOnda(t);
    decir('Firmando enlace…');

    /* Signed URL de 300s: el archivo nunca es publico, el link caduca solo. */
    sb.storage.from('maquetas').createSignedUrl(t.file_path, TTL_FIRMA).then(function(res){
      if(res.error || !res.data || !res.data.signedUrl){
        console.warn('signedUrl:', res.error);
        decir('No se pudo abrir el enlace.');
        return;
      }
      decir('Cargando audio…');
      if(ZP.tLento) clearTimeout(ZP.tLento);
      /* Un WAV master pesa decenas de MB. Decirlo es mejor que un spinner eterno. */
      ZP.tLento = setTimeout(function(){
        if(audioEl.readyState < 3) decir('Este tema esta en calidad master y pesa bastante.');
      }, 8000);
      ZP.firmadoEn = Date.now();
      audioEl.src = res.data.signedUrl;
      audioEl.play().catch(function(e){ console.warn('play:', e); decir('Toca play para escuchar.'); });
      ponerMediaSession(t);
    });
  }

  /* ---------- Re-firma ---------- */

  function firmaVencida(){
    /* 80% de la vida: margen para que la peticion en curso no caiga justo
       en el limite. */
    return !ZP.firmadoEn || (Date.now() - ZP.firmadoEn) > TTL_FIRMA * 800;
  }

  /* Vuelve a firmar y REPONE la posicion. Sin restaurar currentTime el
     usuario perderia el punto donde iba, que es peor que el propio fallo. */
  function refirmar(motivo){
    var t = ZP.tracks[ZP.idx];
    if(!t || !t.file_path || ZP.refirmando) return Promise.resolve(false);
    ZP.refirmando = true;
    var pos = audioEl.currentTime || 0;
    var sonaba = !audioEl.paused;
    decir('Renovando el enlace…');
    return sb.storage.from('maquetas').createSignedUrl(t.file_path, TTL_FIRMA)
      .then(function(res){
        ZP.refirmando = false;
        if(res.error || !res.data || !res.data.signedUrl){
          decir('El enlace caduco y no se pudo renovar. Recarga la pagina.');
          return false;
        }
        ZP.firmadoEn = Date.now();
        audioEl.src = res.data.signedUrl;
        var reponer = function(){
          audioEl.removeEventListener('loadedmetadata', reponer);
          try{ audioEl.currentTime = pos; }catch(e){}
          if(sonaba) audioEl.play().catch(function(){});
        };
        audioEl.addEventListener('loadedmetadata', reponer);
        audioEl.load();
        console.warn('[zignalez:audio] re-firma por', motivo);
        return true;
      }, function(){
        ZP.refirmando = false;
        decir('El enlace caduco y no se pudo renovar. Recarga la pagina.');
        return false;
      });
  }

  /* ---------- Letra permanente ----------
     Vive en .zp-der, arriba, siempre visible. 'lines' es plana: se agrupa en
     estrofas por hueco entre marcas consecutivas. Antes hay que ORDENAR por
     t: cargarLetra filtraba pero no ordenaba y buscarLinea ya asume orden. */

  /* [Suposicion] 4s. No hay ninguna letra cargada con que calibrarlo. Si el
     agrupamiento degenera (una sola estrofa, o una estrofa por linea) se cae
     a ventana deslizante sin numerar, que es correcta en los dos extremos. */
  var HUECO_ESTROFA = 4;

  function limpiarLetra(){
    ZP.letra = []; ZP.estrofas = []; ZP.numerar = false;
    ZP.iLinea = -1; ZP.cacheOk = false;
    if(!ZP.lf) return;
    ZP.lfCab.textContent = ''; ZP.lfLin.textContent = '';
    ZP.lfCab2.textContent = ''; ZP.lfSig.textContent = '';
    ZP.lfSep.hidden = true; ZP.lfCab2.hidden = true; ZP.lfSig.hidden = true;
    ZP.plana.textContent = ''; ZP.plana.hidden = true;
    /* Se ocultan SOLO las piezas de la letra, nunca el cuadro entero.
       Desde que la lista de temas vive DENTRO de .zp-lf, ocultar el cuadro
       borraba tambien la lista: al pasar a un tema sin letra la columna
       derecha se quedaba en blanco y ya no volvia. Reproducido en banco. */
    ZP.lfCab.hidden = true; ZP.lfLin.hidden = true;
    marcarSinLetra(true);
  }

  /* El separador entre letra y lista solo tiene sentido si hay letra encima.
     Y sin letra el cuadro se quedaba sin titulo, huerfano: la cabecera pasa a
     anunciar la lista, que es lo unico que queda dentro. */
  function marcarSinLetra(sin){
    if(!ZP.lf) return;
    ZP.lf.classList.toggle('sin-letra', !!sin);
    if(ZP.ventSep && !ZP.vent.hidden) ZP.ventSep.hidden = !!sin;
    if(sin && ZP.lfCab && ZP.idx >= 0){
      var n = ZP.tracks ? ZP.tracks.length : 0;
      ZP.lfCab.textContent = n ? ('Maquetas · ' + n + (n === 1 ? ' tema' : ' temas'))
                               : 'Maquetas';
      ZP.lfCab.hidden = false;
    }
  }

  function agruparEstrofas(L){
    var g = [], ini = 0;
    for(var i = 1; i < L.length; i++){
      if(L[i].t - L[i-1].t > HUECO_ESTROFA){ g.push([ini, i-1]); ini = i; }
    }
    g.push([ini, L.length - 1]);
    return g;
  }

  function cargarLetra(trackId){
    asegurarCols();
    limpiarLetra();
    if(!sb) return;

    sb.from('track_lyrics').select('lines,plain').eq('track_id', trackId).maybeSingle()
      .then(function(res){
        if(res.error || !res.data) return;             /* sin letra: no se rompe nada */
        var L = res.data.lines;
        if(Array.isArray(L)){
          L = L.filter(function(x){
            return x && typeof x.l === 'string' && typeof x.t === 'number' && isFinite(x.t);
          });
          L.sort(function(a,b){ return a.t - b.t; });
        }
        if(Array.isArray(L) && L.length){
          ZP.letra = L;
          ZP.estrofas = agruparEstrofas(L);
          /* Una sola estrofa para todo el tema, o una estrofa por linea: en
             los dos casos numerar no informa de nada. */
          ZP.numerar = !(ZP.estrofas.length <= 1 || ZP.estrofas.length === L.length);
          ZP.lfCab.hidden = false; ZP.lfLin.hidden = false;
          marcarSinLetra(false);
          pintarLetraFija(-1);
        } else if(res.data.plain){
          /* Letra sin sincronizar: se muestra igual, sin tiempos. */
          ZP.plana.textContent = res.data.plain;
          ZP.plana.hidden = false;
          ZP.lfCab.hidden = false;
          marcarSinLetra(false);
        }
      });
  }

  function lineaLetraEl(x, activa, ya){
    var p = el('p', 'zp-l' + (activa ? ' on' : (ya ? ' ya' : '')));
    var marca = el('span','zp-l-t');
    marca.textContent = fmtDur(Math.floor(x.t));
    p.appendChild(marca);
    p.appendChild(document.createTextNode(x.l || ''));   /* sin XSS desde la BD */
    if(activa && ya !== 'reposo') p.setAttribute('aria-current','true');
    return p;
  }

  /* Ventana DESLIZANTE de 5 lineas centrada en la activa. No hay bloque fijo
     de "lo que viene": lo que viene son sencillamente las lineas de abajo, y
     se mueven con el audio. Un bloque estatico obliga a leer en dos sitios. */
  var VENTANA_LETRA = 5;
  function ventanaLetra(ini, fin, i){
    var n = fin - ini + 1;
    if(n <= VENTANA_LETRA) return [ini, fin];
    var a = Math.max(ini, Math.min(i - 2, fin - (VENTANA_LETRA - 1)));
    return [a, a + VENTANA_LETRA - 1];
  }

  function pintarLetraFija(i){
    if(!ZP.lf || !ZP.letra.length) return;
    var L = ZP.letra, ult = L.length - 1;
    var act = (i < 0) ? 0 : i;
    var ini, fin, e = -1, v;

    /* La cabecera dice en que estrofa vas; la VENTANA no se corta en el limite
       de la estrofa, cruza con naturalidad. Cortarla ahi dejaba media tarjeta
       vacia al final de cada estrofa. */
    if(ZP.numerar){
      for(var k = 0; k < ZP.estrofas.length; k++){
        if(act >= ZP.estrofas[k][0] && act <= ZP.estrofas[k][1]){ e = k; break; }
      }
      if(e < 0) e = 0;
      ZP.lfCab.textContent = 'Letra · Estrofa ' + (e + 1) + ' · En curso';
    } else {
      ZP.lfCab.textContent = 'Letra · En curso';
    }
    v = ventanaLetra(0, ult, act);
    ini = v[0]; fin = v[1];

    /* En reposo (i < 0) la linea 0 va resaltada igual: la maqueta A siempre
       tiene una linea destacada, y sin ella el bloque se lee como un volcado
       de texto plano. No lleva aria-current porque nada esta sonando. */
    var reposo = (i < 0);
    ZP.lfLin.textContent = '';
    for(var j = ini; j <= fin; j++){
      var esAct = reposo ? (j === ini) : (j === i);
      ZP.lfLin.appendChild(lineaLetraEl(L[j], esAct, reposo ? 'reposo' : (j < i)));
    }

    /* En movil el cuadro de la letra tiene su propio scroll (la pantalla no da
       para las cinco lineas), asi que la activa se acerca a la vista con la
       misma aritmetica que la lista: nada de scrollIntoView, que arrastraria
       la pagina entera. */
    if(ZP.lfLin.scrollHeight > ZP.lfLin.clientHeight + 1){
      var la = ZP.lfLin.querySelector('.zp-l.on');
      if(la){
        var rl = ZP.lfLin.getBoundingClientRect(), ra2 = la.getBoundingClientRect();
        var ar2 = (ra2.top - rl.top) + ZP.lfLin.scrollTop;
        var ab2 = ar2 + ra2.height;
        if(ar2 < ZP.lfLin.scrollTop) ZP.lfLin.scrollTop = ar2;
        else if(ab2 > ZP.lfLin.scrollTop + ZP.lfLin.clientHeight)
          ZP.lfLin.scrollTop = ab2 - ZP.lfLin.clientHeight;
      }
    }

    marcarLetraNavegable();

    /* Sin bloque estatico de "lo que viene": esas lineas ya estan en la
       ventana de arriba y se deslizan solas. */
    ZP.lfSig.textContent = '';
    ZP.lfSep.hidden = true; ZP.lfCab2.hidden = true; ZP.lfSig.hidden = true;
  }

  /* Camino rapido primero: en reproduccion normal la linea siguiente es casi
     siempre i o i+1. La binaria solo entra tras un salto -- que es el scrub. */
  function buscarLinea(t){
    var L = ZP.letra, n = L.length;
    if(!n) return -1;
    if(ZP.cacheOk){
      var i = ZP.iLinea;
      if(i >= 0 && t >= L[i].t && (i+1 >= n || t < L[i+1].t)) return i;
      if(i+1 < n && t >= L[i+1].t && (i+2 >= n || t < L[i+2].t)) return i+1;
    }
    var lo = 0, hi = n-1, r = -1;
    while(lo <= hi){
      var m = (lo + hi) >> 1;
      if(L[m].t <= t){ r = m; lo = m + 1; } else hi = m - 1;
    }
    ZP.cacheOk = true;
    return r;
  }

  function marcarLinea(i){
    ZP.iLinea = i;
    pintarLetraFija(i);
  }

  /* ---------- Pintado ---------- */
  /* La duracion del <audio> puede ser Infinity: el servidor no mando
     Content-Length, o la cabecera del archivo no la declara. Detectado el
     17-09-2026 probando con un servidor que transmitia sin longitud: la barra,
     los tiempos y el scrub quedaban muertos SIN decir nada.
     Respaldo: duration_seconds de la BD, que ya tenemos. */
  function duracion(){
    var d = audioEl.duration;
    if(d && isFinite(d) && d > 0) return d;
    var t = ZP.tracks[ZP.idx];
    if(t && t.duration_seconds > 0) return t.duration_seconds;
    return 0;
  }

  /* Lo cargado ya no es una barra propia: se pinta dentro del mismo lienzo. */
  function pintarBuffer(){
    if(!ZP.ctx) return;
    pintarOnda(true);
  }

  function pintar(){
    var d = duracion();
    if(!d){
      /* Sin duracion no hay posicion posible. Se dice, no se finge. */
      ZP.tAct.textContent = fmtDur(Math.floor(audioEl.currentTime));
      ZP.tTot.textContent = '--:--';
      sliderSinDuracion();
      return;
    }
    pintarOnda(false);
    var seg = Math.floor(audioEl.currentTime);
    if(seg !== ZP.ultSeg){
      ZP.ultSeg = seg;
      var total = Math.round(d), txt = fmtDur(seg) + ' de ' + fmtDur(total);
      ZP.tAct.textContent = fmtDur(seg);
      /* En SEGUNDOS, no en porcentaje: un paso de 5s sobre 5min es 1,67% y
         redondeado no se movia, asi que el lector de pantalla callaba. */
      ponerSlider(ZP.onda, seg, total, txt);
    }
  }

  /* timeupdate dispara a ~4 Hz y con intervalo irregular: para la letra se ve
     como un salto tardio. rAF no. */
  function tic(){
    if(audioEl.paused){ ZP.raf = 0; return; }
    pintar();
    /* Cada ~15 cuadros basta: buffered avanza a ritmo de red, no de pantalla. */
    if((ZP.cuadro = (ZP.cuadro || 0) + 1) % 15 === 0) pintarBuffer();
    var i = buscarLinea(audioEl.currentTime);
    if(i !== ZP.iLinea) marcarLinea(i);              /* solo repinta al CAMBIAR */
    ZP.raf = requestAnimationFrame(tic);
  }

  /* ══════════════════════════════════════════════════════════════════
     LA ONDA
     Venia de la franja, que se desmonto entera. Aqui estan, funcionando y en
     .zp-izq: el canvas y su dimensionado, pintarOnda, la lectura de
     tracks.peaks, la cabeza de posicion con su cache de ancho, el scrub por
     puntero y el scrub por TECLADO, que era el unico que habia.
     ══════════════════════════════════════════════════════════════════ */

  var SVG_REP  = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 7h10v3l4-4-4-4v3H5v6h2V7zm10 10H7v-3l-4 4 4 4v-3h12v-6h-2v4z"/></svg>';
  var SVG_REP1 = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 7h10v3l4-4-4-4v3H5v6h2V7zm10 10H7v-3l-4 4 4 4v-3h12v-6h-2v4z"/><text x="12" y="15" font-size="9" font-family="monospace" fill="currentColor" text-anchor="middle">1</text></svg>';

  /* Este resize es de ZP, no de la franja: invalida el ancho cacheado. */
  window.addEventListener('resize', function(){ ZP.anchoBarra = 0; });

  function cablearOnda(){
    /* --- scrub por puntero --- */
    conectarArrastre(ZP.onda, function(f){
      ZP.previa = f;
      pintarOnda(true);
      var d = duracion();
      if(d) ZP.tAct.textContent = fmtDur(Math.floor(f * d));
    });

    /* --- scrub por TECLADO: flechas ±5s, Shift ±30s, PageUp/Down ±60s,
       Home/End. Colgaba de la franja; sin el, el reproductor dejaba de ser
       usable con teclado. --- */
    ZP.onda.addEventListener('keydown', function(e){
      var d = duracion(); if(!d) return;
      var paso = e.shiftKey ? 30 : 5, dd = 0;
      if(e.key === 'ArrowRight') dd = paso;
      else if(e.key === 'ArrowLeft') dd = -paso;
      else if(e.key === 'PageUp')   dd = 60;
      else if(e.key === 'PageDown') dd = -60;
      else if(e.key === 'Home'){ audioEl.currentTime = 0; e.preventDefault(); pintar(); pintarOnda(true); return; }
      else if(e.key === 'End'){  audioEl.currentTime = d; e.preventDefault(); pintar(); pintarOnda(true); return; }
      else return;
      e.preventDefault();
      audioEl.currentTime = Math.min(d, Math.max(0, audioEl.currentTime + dd));
      pintar(); pintarOnda(true);
    });

    dimensionarOnda();
    if(window.ResizeObserver){
      ZP.obs = new ResizeObserver(function(){ dimensionarOnda(); pintarOnda(true); });
      ZP.obs.observe(ZP.onda);
    } else {
      window.addEventListener('resize', function(){ dimensionarOnda(); pintarOnda(true); });
    }
  }

  function dimensionarOnda(){
    if(!ZP.ctx || !ZP.onda) return;
    var r = ZP.onda.getBoundingClientRect();
    var dpr = Math.min(2, window.devicePixelRatio || 1);
    ZP.lienzo.width  = Math.max(1, Math.round(r.width  * dpr));
    ZP.lienzo.height = Math.max(1, Math.round(r.height * dpr));
    ZP.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ZP.ancho = r.width; ZP.alto = r.height;
    ZP.anchoBarra = r.width;
    ZP.ultBarra = -1;
  }

  /* Sin picos NO se dibuja una onda inventada: se dibuja una barra neutra.
     Una onda que no corresponde al audio es peor que ninguna, porque el
     usuario la usa para orientarse y le miente. */
  function pintarOnda(forzar){
    if(!ZP.ctx || !ZP.ancho) return;
    var d = duracion();
    var f = (ZP.previa != null) ? ZP.previa : (d ? Math.min(1, audioEl.currentTime / d) : 0);
    var P = ZP.picos;
    var n = P ? P.length : 0;
    var barra = n ? Math.floor(f * n) : Math.floor(f * 100);
    if(!forzar && barra === ZP.ultBarra) return;    /* solo al CAMBIAR de barra */
    ZP.ultBarra = barra;

    var c = ZP.ctx, W = ZP.ancho, H = ZP.alto, mitad = H/2;
    c.clearRect(0, 0, W, H);

    /* Lo cargado, antes en .zp-buf. */
    var fb = 0;
    try{
      var b = audioEl && audioEl.buffered;
      if(d && b && b.length) fb = Math.min(1, b.end(b.length - 1) / d);
    }catch(e){}
    /* Franja FINA abajo, no un rectangulo a toda altura: a toda altura se lee
       como una caja gris mal puesta detras de las barras y compite con ellas.
       Abajo informa de lo cargado sin ensuciar la onda. */
    if(fb > 0){
      c.fillStyle = 'rgba(199,204,209,.20)';
      c.fillRect(0, H - 2, W * fb, 2);
    }

    if(!n){
      c.fillStyle = 'rgba(199,204,209,.22)';
      c.fillRect(0, mitad-1.5, W, 3);
      c.fillStyle = '#f2d391';
      c.fillRect(0, mitad-1.5, W*f, 3);
      dibujarCabeza(c, W*f, H);
      return;
    }

    var paso = W / n, ancho = Math.max(1, paso * 0.62);
    for(var i = 0; i < n; i++){
      var h = Math.max(2, P[i] * (H - 6));
      c.fillStyle = (i < barra) ? 'rgba(242,211,145,.95)' : 'rgba(199,204,209,.26)';
      c.fillRect(i*paso + (paso-ancho)/2, mitad - h/2, ancho, h);
    }
    dibujarCabeza(c, W*f, H);
  }

  /* La cabeza lectora: una sola linea vertical a 1,5px, con un halo tenue
     para que se despegue de las barras claras. */
  function dibujarCabeza(c, x, H){
    var px = Math.max(0.75, Math.min(ZP.ancho - 0.75, x));
    c.fillStyle = 'rgba(255,233,176,.28)';
    c.fillRect(px - 2.5, 0, 5, H);
    c.fillStyle = '#ffe9b0';
    c.fillRect(px - 0.75, 0, 1.5, H);
  }

  function temaOnda(t){
    if(!ZP.ctx) return;
    var pk = t.peaks;
    ZP.picos = (Array.isArray(pk) && pk.length)
      ? pk.slice(0, 512).map(function(v){ v = +v; return (isFinite(v) && v > 0) ? Math.min(1, v) : 0; })
      : null;
    ZP.previa = null;
    ZP.ultBarra = -1;
    dimensionarOnda();
    pintarOnda(true);
  }

  /* ---------- Media Session ---------- */
  function ponerMediaSession(t){
    if(!('mediaSession' in navigator)) return;
    try{
      navigator.mediaSession.metadata = new MediaMetadata({
        title: t.title || 'Zignalez',
        artist: 'Zignalez',
        album: 'Maquetas',
        artwork: [{ src: 'assets/disco-512.jpg', sizes: '512x512', type: 'image/jpeg' }]
      });
      navigator.mediaSession.setActionHandler('play',  function(){ audioEl.play().catch(function(){}); });
      navigator.mediaSession.setActionHandler('pause', function(){ audioEl.pause(); });
      navigator.mediaSession.setActionHandler('previoustrack', function(){ saltar(-1); });
      navigator.mediaSession.setActionHandler('nexttrack',     function(){ saltar(1); });
      navigator.mediaSession.setActionHandler('seekto', function(d){
        if(d.seekTime != null){ audioEl.currentTime = d.seekTime; pintar(); sincronizarPos(); }
      });
    }catch(e){ console.warn('mediaSession:', e); }
  }

  /* En seeked y al cambiar de tema, NO en cada frame. */
  function sincronizarPos(){
    if(!('mediaSession' in navigator) || !navigator.mediaSession.setPositionState) return;
    var d = duracion();
    if(!d) return;
    try{
      navigator.mediaSession.setPositionState({
        duration: d,
        playbackRate: audioEl.playbackRate,
        position: Math.min(audioEl.currentTime, d)
      });
    }catch(e){}
  }

  /* ====== Auth state ======
     Solo onAuthStateChange: INITIAL_SESSION ya se dispara al cargar (con null si
     no hay sesión). Llamar además a getSession() duplicaba showMembers() y, con
     el reproductor conectado, duplicaba el fetch y el render. */
  var sesionAbierta = false;
  if(sb){
    sb.auth.onAuthStateChange(function(event, session){
      if(session && session.user){
        sesionAbierta = true;
        if(event === 'TOKEN_REFRESHED' || event === 'USER_UPDATED') return;  /* no recargar bajo los pies del usuario */
        showMembers(session.user);
      } else {
        tracksLoaded = false;
        showGate();
      }
    });

    /* ====== Red de seguridad del canje PKCE ======
       Con flowType 'pkce' el enlace vuelve con ?code=... y supabase-js lo canjea
       usando un "code verifier" guardado en ESTE navegador al pedir el enlace.
       Si el correo se abre en otro navegador — el visor interno de Gmail en el
       teléfono es el caso típico — el verifier no está y el canje falla.
       Sin esto, el usuario ve el gate otra vez y no entiende por qué: es el mismo
       fallo silencioso que ya nos costó caro. Aquí se dice en voz alta. */
    if(/[?&](code|error|error_description)=/.test(window.location.search)){
      setTimeout(function(){
        if(sesionAbierta) return;
        var params = new URLSearchParams(window.location.search);
        console.error('[zignalez:auth] canje PKCE sin sesión', {
          code: params.has('code'),
          error: params.get('error'),
          detalle: params.get('error_description')
        });
        if(loginNote){
          loginNote.className = 'login-note err';
          loginNote.textContent = 'El enlace no se pudo validar en este navegador. '
            + 'Ábrelo en el mismo navegador donde lo pediste, o pide uno nuevo desde aquí.';
        }
        var sec = document.getElementById('miembros');
        if(sec && sec.scrollIntoView) sec.scrollIntoView({ behavior:'smooth', block:'start' });
        if(window.history && history.replaceState){
          history.replaceState(null, '', window.location.pathname);
        }
      }, 4000);
    }
  }

})();
