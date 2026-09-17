
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
    {yt:"tHt8pvWICdc", t:"Puesta Pa' Mí (ft Brignacio)", badge:"Show", sp:ARTIST_SPOTIFY},
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
      var res=['maxresdefault','sddefault','hqdefault','mqdefault'], ri=0;
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
  function setState(msg){
    trackMount.textContent = '';
    var p = document.createElement('p');
    p.className = 'tp-state';
    p.textContent = msg;
    trackMount.appendChild(p);
  }
  function stopPlayback(){
    if(ZP.raf){ cancelAnimationFrame(ZP.raf); ZP.raf = 0; }
    if(audioEl){ try{ audioEl.pause(); audioEl.removeAttribute('src'); audioEl.load(); }catch(e){} }
    if(playingBtn){ playingBtn.innerHTML = ICON_PLAY; playingBtn.classList.remove('is-playing'); playingBtn = null; }
    if(ZP.disco) ZP.disco.classList.remove('suena');
    if(ZP.raiz) ZP.raiz.classList.remove('visible');
    if(ZF){ ZF.raiz.classList.remove('visible'); ZF.mini.classList.remove('suena'); }
    document.body.classList.remove('con-franja');
    ZP.idx = -1;
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
    trackMount.textContent = '';
    ZP.tracks = tracks;

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
      trackMount.appendChild(row);

      btn.addEventListener('click', function(){
        if(playingBtn === btn && audioEl){
          if(audioEl.paused){ audioEl.play().catch(function(){}); btn.innerHTML = ICON_PAUSE; btn.classList.add('is-playing'); }
          else { audioEl.pause(); btn.innerHTML = ICON_PLAY; btn.classList.remove('is-playing'); }
          return;
        }
        playTrack(t, btn);
      });
    });

    montarZP();
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

  var ZP = { tracks:[], idx:-1, letra:[], lineEls:[], iLinea:-1,
             raf:0, cacheOk:false, arrastrando:false, tLento:0,
             firmadoEn:0, refirmando:false };

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

    var letra = el('div','zp-letra','zp-letra');
    var pista = el('div','zp-pista','zp-pista');
    letra.appendChild(pista);
    letra.hidden = true;
    panel.appendChild(letra);

    var plana = el('div','zp-plana','zp-plana');
    plana.hidden = true;
    panel.appendChild(plana);

    var tr = el('div','zp-tr');
    var bPrev = el('button','zp-b','zp-prev'); bPrev.type='button'; bPrev.innerHTML = SVG_PREV;
    bPrev.setAttribute('aria-label','Anterior');
    var bPlay = el('button','zp-b zp-grande','zp-play'); bPlay.type='button'; bPlay.innerHTML = ICON_PLAY;
    bPlay.setAttribute('aria-label','Reproducir'); bPlay.setAttribute('aria-pressed','false');
    var bNext = el('button','zp-b','zp-next'); bNext.type='button'; bNext.innerHTML = SVG_NEXT;
    bNext.setAttribute('aria-label','Siguiente');
    var tAct = el('span','zp-t','zp-actual'); tAct.textContent = '0:00';
    var barra = el('div','zp-barra','zp-barra');
    barra.setAttribute('role','slider'); barra.tabIndex = 0;
    barra.setAttribute('aria-label','Posicion');
    barra.setAttribute('aria-valuemin','0'); barra.setAttribute('aria-valuemax','0');
    barra.setAttribute('aria-valuenow','0'); barra.setAttribute('aria-valuetext','0:00');
    barra.appendChild(el('div','zp-riel'));
    barra.appendChild(el('div','zp-buf','zp-buf'));
    barra.appendChild(el('div','zp-prog','zp-prog'));
    barra.appendChild(el('div','zp-pin','zp-pin'));
    var tTot = el('span','zp-t','zp-total'); tTot.textContent = '0:00';
    var bVol = el('button','zp-b','zp-vol'); bVol.type='button'; bVol.innerHTML = SVG_VOL;
    bVol.setAttribute('aria-label','Silenciar'); bVol.setAttribute('aria-pressed','false');

    var linea = el('div','zp-linea');
    linea.appendChild(tAct); linea.appendChild(barra); linea.appendChild(tTot);
    var btns = el('div','zp-btns');
    btns.appendChild(bPrev); btns.appendChild(bPlay); btns.appendChild(bNext); btns.appendChild(bVol);
    tr.appendChild(linea); tr.appendChild(btns);
    panel.appendChild(tr);

    var estado = el('div','zp-estado','zp-estado');
    estado.setAttribute('role','status'); estado.setAttribute('aria-live','polite');
    panel.appendChild(estado);

    raiz.appendChild(zona); raiz.appendChild(panel);
    trackMount.appendChild(raiz);

    audioEl = document.createElement('audio');
    audioEl.preload = 'none';
    audioEl.addEventListener('contextmenu', function(e){ e.preventDefault(); });
    /* Sin controls no ocupa espacio, pero va EN el DOM igual: Safari iOS trata
       de forma distinta a los elementos multimedia desconectados. */
    panel.appendChild(audioEl);

    ZP.raiz=raiz; ZP.disco=disco; ZP.par=par; ZP.zona=zona; ZP.labelTxt=labelTxt; ZP.titulo=titulo; ZP.desc=desc;
    ZP.letra=[]; ZP.cajaLetra=letra; ZP.pista=pista; ZP.plana=plana;
    ZP.bPlay=bPlay; ZP.bPrev=bPrev; ZP.bNext=bNext; ZP.bVol=bVol;
    ZP.tAct=tAct; ZP.tTot=tTot; ZP.barra=barra; ZP.buf=document.getElementById('zp-buf');
    ZP.prog=document.getElementById('zp-prog'); ZP.pin=document.getElementById('zp-pin');
    ZP.estado=estado;

    cablearZP();
    cablearParalaje();
    montarFranja();
  }

  function cablearZP(){
    ZP.bPlay.addEventListener('click', function(){ alternar(); });
    ZP.bPrev.addEventListener('click', function(){ saltar(-1); });
    ZP.bNext.addEventListener('click', function(){ saltar(1); });
    ZP.bVol.addEventListener('click', function(){ audioEl.muted = !audioEl.muted; pintarMudo(); });

    audioEl.addEventListener('play',  function(){
      ZP.disco.classList.add('suena');
      if(ZF){ ZF.mini.classList.add('suena'); ZF.play.innerHTML = ICON_PAUSE;
              ZF.play.setAttribute('aria-label','Pausar');
              ZF.play.setAttribute('aria-pressed','true'); }
      ZP.bPlay.innerHTML = ICON_PAUSE;
      ZP.bPlay.setAttribute('aria-label','Pausar');
      ZP.bPlay.setAttribute('aria-pressed','true');
      if(playingBtn){ playingBtn.innerHTML = ICON_PAUSE; playingBtn.classList.add('is-playing'); }
      if(!ZP.raf) ZP.raf = requestAnimationFrame(tic);
    });
    audioEl.addEventListener('pause', function(){
      /* El disco NO vuelve al origen: se queda donde esta, como un tocadiscos. */
      ZP.disco.classList.remove('suena');
      if(ZF){ ZF.mini.classList.remove('suena'); ZF.play.innerHTML = ICON_PLAY;
              ZF.play.setAttribute('aria-label','Reproducir');
              ZF.play.setAttribute('aria-pressed','false'); }
      ZP.bPlay.innerHTML = ICON_PLAY;
      ZP.bPlay.setAttribute('aria-label','Reproducir');
      ZP.bPlay.setAttribute('aria-pressed','false');
      if(playingBtn){ playingBtn.innerHTML = ICON_PLAY; playingBtn.classList.remove('is-playing'); }
      if(ZP.raf){ cancelAnimationFrame(ZP.raf); ZP.raf = 0; }
      pintar();
    });
    audioEl.addEventListener('ended', function(){
      if(ZF && ZF.repetir === 2){ audioEl.currentTime = 0; audioEl.play().catch(function(){}); return; }
      if(ZF && ZF.repetir === 0 && ZP.idx === ZP.tracks.length - 1){ return; }
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

    /* --- scrub --- */
    conectarArrastre(ZP.barra, function(f){
      /* vista previa: solo pintura, sin tocar el audio */
      ZP.prog.style.transform = 'translateY(-50%) scaleX(' + f.toFixed(4) + ')';
      if(!ZP.anchoBarra) ZP.anchoBarra = ZP.barra.getBoundingClientRect().width;
      ZP.pin.style.transform = 'translate(-50%,-50%) translateX(' + (f * ZP.anchoBarra).toFixed(1) + 'px)';
      var d = duracion();
      if(d) ZP.tAct.textContent = fmtDur(Math.floor(f * d));
    });
    ZP.barra.addEventListener('keydown', function(e){
      var dur = duracion();
      if(!dur) return;
      var paso = e.shiftKey ? 30 : 5, d = 0;
      if(e.key === 'ArrowRight') d = paso;
      else if(e.key === 'ArrowLeft') d = -paso;
      else if(e.key === 'PageUp')   d = 60;
      else if(e.key === 'PageDown') d = -60;
      else if(e.key === 'Home'){ audioEl.currentTime = 0;   e.preventDefault(); pintar(); return; }
      else if(e.key === 'End'){  audioEl.currentTime = dur; e.preventDefault(); pintar(); return; }
      else return;
      e.preventDefault();
      audioEl.currentTime = Math.min(dur, Math.max(0, audioEl.currentTime + d));
      pintar();
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
      ZF && (ZF.previa = null);
      pintar(); if(ZF) pintarOnda(true);
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
    [ZP.barra, ZF && ZF.onda].forEach(function(elm){
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
    [ZP.bVol, ZF && ZF.vol].forEach(function(b){
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
    playingBtn = btn || document.querySelector('.tp-item:nth-of-type(' + (i+1) + ') .tp-play');
    ZP.idx = i;
    ZP.raiz.classList.add('visible');

    ZP.titulo.textContent   = t.title || '';
    ZP.desc.textContent     = t.description || '';
    ZP.labelTxt.textContent = 'Zignalez';
    ZP.tAct.textContent     = '0:00';
    ZP.tTot.textContent     = fmtDur(t.duration_seconds) || '0:00';
    ZP.prog.style.transform = 'translateY(-50%) scaleX(0)';
    ZP.buf.style.transform  = 'translateY(-50%) scaleX(0)';
    ZP.pin.style.left       = '0%';

    cargarLetra(t.id);
    franjaTema(t);
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

  /* ---------- Letra ---------- */
  function cargarLetra(trackId){
    ZP.letra = []; ZP.lineEls = []; ZP.iLinea = -1; ZP.cacheOk = false;
    ZP.pista.textContent = '';
    ZP.cajaLetra.hidden = true;
    ZP.plana.hidden = true; ZP.plana.textContent = '';
    if(!sb) return;

    sb.from('track_lyrics').select('lines,plain').eq('track_id', trackId).maybeSingle()
      .then(function(res){
        if(res.error || !res.data) return;             /* sin letra: no se rompe nada */
        var L = res.data.lines;
        if(Array.isArray(L)){
          L = L.filter(function(x){
            return x && typeof x.l === 'string' && typeof x.t === 'number' && isFinite(x.t);
          });
        }
        if(Array.isArray(L) && L.length){
          ZP.letra = L;
          L.forEach(function(x){
            var p = el('p','zp-l');
            p.textContent = x.l || '';                 /* textContent: sin XSS desde la BD */
            ZP.pista.appendChild(p);
            ZP.lineEls.push(p);
          });
          ZP.cajaLetra.hidden = false;
          ZP.pista.style.transform = 'translateY(0px)';
          /* Una sola pasada de medicion, fuera del bucle de reproduccion. */
          ZP.offsets = ZP.lineEls.map(function(q){ return q.offsetTop + q.offsetHeight/2; });
        } else if(res.data.plain){
          ZP.plana.textContent = res.data.plain;
          ZP.plana.hidden = false;
        }
      });
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
    if(ZP.iLinea >= 0 && ZP.lineEls[ZP.iLinea]){
      ZP.lineEls[ZP.iLinea].classList.remove('on');
      ZP.lineEls[ZP.iLinea].removeAttribute('aria-current');
    }
    ZP.iLinea = i;
    if(i < 0 || !ZP.lineEls[i]){ ZP.pista.style.transform = 'translateY(0px)'; return; }
    var e = ZP.lineEls[i];
    e.classList.add('on');
    e.setAttribute('aria-current','true');
    var off = (ZP.offsets && ZP.offsets[i] != null)
      ? ZP.offsets[i] : (e.offsetTop + e.offsetHeight/2);
    ZP.pista.style.transform = 'translateY(' + (-off) + 'px)';
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

  function pintarBuffer(){
    var d = duracion();
    if(!d) return;
    var b = audioEl.buffered;
    if(!b || !b.length) return;
    var fin = Math.min(1, b.end(b.length - 1) / d);
    ZP.buf.style.transform = 'translateY(-50%) scaleX(' + fin.toFixed(4) + ')';
  }

  function pintar(){
    var d = duracion();
    if(!d){
      /* Sin duracion no hay barra posible. Se dice, no se finge. */
      ZP.tAct.textContent = fmtDur(Math.floor(audioEl.currentTime));
      ZP.tTot.textContent = '--:--';
      sliderSinDuracion();
      return;
    }
    var f = Math.min(1, audioEl.currentTime / d);
    ZP.prog.style.transform = 'translateY(-50%) scaleX(' + f.toFixed(4) + ')';
    if(!ZP.anchoBarra) ZP.anchoBarra = ZP.barra.getBoundingClientRect().width;
    ZP.pin.style.transform = 'translate(-50%,-50%) translateX(' + (f * ZP.anchoBarra).toFixed(1) + 'px)';
    if(ZF) pintarOnda(false);
    var seg = Math.floor(audioEl.currentTime);
    if(seg !== ZP.ultSeg){
      ZP.ultSeg = seg;
      var total = Math.round(d), txt = fmtDur(seg) + ' de ' + fmtDur(total);
      ZP.tAct.textContent = fmtDur(seg);
      /* En SEGUNDOS, no en porcentaje: un paso de 5s sobre 5min es 1,67% y
         redondeado no se movia, asi que el lector de pantalla callaba. */
      ponerSlider(ZP.barra, seg, total, txt);
      if(ZF){
        ZF.ultSeg = seg;
        ZF.tiempo.textContent = fmtDur(seg) + ' / ' + fmtDur(total);
        ponerSlider(ZF.onda, seg, total, txt);
      }
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
     LA FRANJA
     Comparte audioEl con el disco. Todo lo que pinta sale del MISMO
     estado; no guarda una copia propia de nada.
     ══════════════════════════════════════════════════════════════════ */

  var SVG_REP  = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 7h10v3l4-4-4-4v3H5v6h2V7zm10 10H7v-3l-4 4 4 4v-3h12v-6h-2v4z"/></svg>';
  var SVG_REP1 = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 7h10v3l4-4-4-4v3H5v6h2V7zm10 10H7v-3l-4 4 4 4v-3h12v-6h-2v4z"/><text x="12" y="15" font-size="9" font-family="monospace" fill="currentColor" text-anchor="middle">1</text></svg>';
  var SVG_EXP  = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 8l6 6H6z"/></svg>';

  function montarFranja(){
    /* Desmontaje explicito. La franja cuelga de <body>, no de trackMount, asi
       que el textContent='' de renderTracks no la alcanza. */
    if(ZF){
      if(ZF.obs) try{ ZF.obs.disconnect(); }catch(e){}
      if(ZF.raiz && ZF.raiz.parentNode) ZF.raiz.parentNode.removeChild(ZF.raiz);
      ZF = null;
    }
    var raiz = el('div','zf','zf');
    raiz.setAttribute('role','region');
    raiz.setAttribute('aria-label','Reproductor');
    /* La zona privada no se graba: la mascara esta en <section id="miembros">
       y la franja es HERMANA de esa seccion, no descendiente, asi que no la
       heredaba. El titulo de cada maqueta inedita se estaba grabando. */
    raiz.setAttribute('data-clarity-mask','True');
    var caja = el('div','zf-caja');

    var mini = el('div','zf-disco','zf-disco');
    mini.setAttribute('aria-hidden','true');

    var meta = el('div','zf-meta');
    var t1 = el('div','zf-t1','zf-t1');
    var t2 = el('div','zf-t2','zf-t2'); t2.textContent = 'Zignalez';
    meta.appendChild(t1); meta.appendChild(t2);

    var onda = el('div','zf-onda','zf-onda');
    onda.setAttribute('role','slider'); onda.tabIndex = 0;
    onda.setAttribute('aria-label','Posicion');
    onda.setAttribute('aria-valuemin','0'); onda.setAttribute('aria-valuemax','0');
    onda.setAttribute('aria-valuenow','0'); onda.setAttribute('aria-valuetext','0:00');
    var lienzo = document.createElement('canvas');
    onda.appendChild(lienzo);

    var tiempo = el('div','zf-tiempo','zf-tiempo'); tiempo.textContent = '0:00 / 0:00';

    var btns = el('div','zf-btns');
    function bt(cls, svg, etiqueta){
      var b = el('button','zf-b ' + cls); b.type='button'; b.innerHTML = svg;
      b.setAttribute('aria-label', etiqueta); return b;
    }
    var fPrev = bt('zf-prev', SVG_PREV, 'Anterior');
    var fPlay = bt('zf-play', ICON_PLAY, 'Reproducir');
    fPlay.setAttribute('aria-pressed','false');
    var fNext = bt('zf-next', SVG_NEXT, 'Siguiente');
    var fRep  = bt('zf-rep',  SVG_REP,  'Repetir: desactivado');
    var fVol  = bt('zf-vol',  SVG_VOL,  'Silenciar');
    btns.appendChild(fPrev); btns.appendChild(fPlay); btns.appendChild(fNext);
    btns.appendChild(fRep);  btns.appendChild(fVol);

    caja.appendChild(mini); caja.appendChild(meta); caja.appendChild(onda);
    caja.appendChild(tiempo); caja.appendChild(btns);

    var exp = el('button','zf-exp','zf-exp'); exp.type='button';
    exp.innerHTML = SVG_EXP; exp.setAttribute('aria-label','Ver el disco');

    var fila = el('div','zf-fila');
    exp.style.pointerEvents = 'auto';
    fila.appendChild(caja); fila.appendChild(exp);
    raiz.appendChild(fila);
    document.body.appendChild(raiz);

    ZF = { raiz:raiz, mini:mini, t1:t1, tiempo:tiempo, onda:onda, lienzo:lienzo,
           ctx:lienzo.getContext('2d'), play:fPlay, prev:fPrev, next:fNext,
           rep:fRep, vol:fVol, exp:exp, picos:null, ultBarra:-1, repetir:0 };

    cablearFranja();
    dimensionarOnda();
    if(window.ResizeObserver){
      ZF.obs = new ResizeObserver(function(){ ZP.anchoBarra = 0; dimensionarOnda(); pintarOnda(true); });
      ZF.obs.observe(onda);
    } else {
      window.addEventListener('resize', function(){ dimensionarOnda(); pintarOnda(true); });
    }
  }

  var ZF = null;
  window.addEventListener('resize', function(){ ZP.anchoBarra = 0; });

  function cablearFranja(){
    ZF.play.addEventListener('click', function(){ alternar(); });
    ZF.prev.addEventListener('click', function(){ saltar(-1); });
    ZF.next.addEventListener('click', function(){ saltar(1); });
    ZF.vol.addEventListener('click', function(){
      audioEl.muted = !audioEl.muted;
      ZF.vol.innerHTML = audioEl.muted ? SVG_MUDO : SVG_VOL;
      ZF.vol.classList.toggle('on', audioEl.muted);
      if(ZP.bVol){ ZP.bVol.innerHTML = ZF.vol.innerHTML;
                   ZP.bVol.setAttribute('aria-pressed', audioEl.muted ? 'true':'false'); }
    });
    /* 0 = sin repetir · 1 = repetir todo · 2 = repetir este */
    ZF.rep.addEventListener('click', function(){
      ZF.repetir = (ZF.repetir + 1) % 3;
      ZF.rep.innerHTML = ZF.repetir === 2 ? SVG_REP1 : SVG_REP;
      ZF.rep.classList.toggle('on', ZF.repetir > 0);
      ZF.rep.setAttribute('aria-label',
        ZF.repetir === 0 ? 'Repetir: desactivado' :
        ZF.repetir === 1 ? 'Repetir: toda la lista' : 'Repetir: este tema');
    });
    ZF.exp.addEventListener('click', function(){
      if(!ZP.raiz || !ZP.raiz.scrollIntoView) return;
      var quieto = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      ZP.raiz.scrollIntoView({ behavior: quieto ? 'auto' : 'smooth', block:'center' });
    });

    /* --- scrub sobre la onda --- */
    conectarArrastre(ZF.onda, function(f){
      ZF.previa = f;
      pintarOnda(true);
      var d = duracion();
      if(d) ZF.tiempo.textContent = fmtDur(Math.floor(f * d)) + ' / ' + fmtDur(Math.round(d));
    });
    ZF.onda.addEventListener('keydown', function(e){
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
  }

  function dimensionarOnda(){
    if(!ZF) return;
    var r = ZF.onda.getBoundingClientRect();
    var dpr = Math.min(2, window.devicePixelRatio || 1);
    ZF.lienzo.width  = Math.max(1, Math.round(r.width  * dpr));
    ZF.lienzo.height = Math.max(1, Math.round(r.height * dpr));
    ZF.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ZF.ancho = r.width; ZF.alto = r.height;
  }

  /* Sin picos NO se dibuja una onda inventada: se dibuja una barra neutra.
     Una onda que no corresponde al audio es peor que ninguna, porque el
     usuario la usa para orientarse y le miente. */
  function pintarOnda(forzar){
    if(!ZF || !ZF.ancho) return;
    var d = duracion();
    var f = (ZF.previa != null) ? ZF.previa : (d ? Math.min(1, audioEl.currentTime / d) : 0);
    var P = ZF.picos;
    var n = P ? P.length : 0;
    var barra = n ? Math.floor(f * n) : Math.floor(f * 100);
    if(!forzar && barra === ZF.ultBarra) return;    /* solo al CAMBIAR de barra */
    ZF.ultBarra = barra;

    var c = ZF.ctx, W = ZF.ancho, H = ZF.alto, mitad = H/2;
    c.clearRect(0, 0, W, H);

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

  /* La cabeza lectora: la linea vertical de untitled. Una sola, a 1,5px,
     con un halo tenue para que se despegue de las barras claras. */
  function dibujarCabeza(c, x, H){
    var px = Math.max(0.75, Math.min(ZF.ancho - 0.75, x));
    c.fillStyle = 'rgba(255,233,176,.28)';
    c.fillRect(px - 2.5, 0, 5, H);
    c.fillStyle = '#ffe9b0';
    c.fillRect(px - 0.75, 0, 1.5, H);
  }

  function franjaTema(t){
    if(!ZF) return;
    ZF.t1.textContent = t.title || '';
    var pk = t.peaks;
    ZF.picos = (Array.isArray(pk) && pk.length)
      ? pk.slice(0, 512).map(function(v){ v = +v; return (isFinite(v) && v > 0) ? Math.min(1, v) : 0; })
      : null;
    ZF.ultBarra = -1;
    ZF.raiz.classList.add('visible');
    document.body.classList.add('con-franja');
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
