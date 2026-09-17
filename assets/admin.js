
(function () {
  'use strict';

  var SUPABASE_URL = 'https://fdahfltjaqzdgmsgedcp.supabase.co';
  var SUPABASE_KEY = 'sb_publishable_TK7Jf1kWDATJ8o9Rmp7-Ew_61rPjCib';
  var BUCKET = 'maquetas';

  var sb = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY, {
    auth: { flowType: 'pkce', detectSessionInUrl: true, persistSession: true, autoRefreshToken: true }
  });

  /* ---------------- helpers ---------------- */
  var $ = function (id) { return document.getElementById(id); };

  function show(screen) {
    var all = document.querySelectorAll('.screen');
    for (var i = 0; i < all.length; i++) all[i].classList.remove('active');
    var el = $('screen-' + screen);
    if (el) el.classList.add('active');
    window.scrollTo(0, 0);
  }

  // NOTE: status visibility is controlled ONLY via the `hidden` class.
  // Never touch style.display on these nodes.
  function setStatus(el, msg, kind) {
    if (!el) return;
    el.textContent = msg || '';
    el.classList.remove('ok', 'err');
    if (kind) el.classList.add(kind);
    if (msg) el.classList.remove('hidden');
    else el.classList.add('hidden');
  }
  function clearStatus(el) { setStatus(el, '', null); }

  function busy(btn, on, labelWhenBusy) {
    if (!btn) return;
    if (on) {
      if (btn.dataset.label === undefined) btn.dataset.label = btn.textContent;
      btn.disabled = true;
      btn.textContent = labelWhenBusy || btn.dataset.label;
    } else {
      btn.disabled = false;
      if (btn.dataset.label !== undefined) btn.textContent = btn.dataset.label;
    }
  }
  // Hard reset of every button that could be left disabled.
  function resetAllButtons() {
    var bs = document.querySelectorAll('.btn');
    for (var i = 0; i < bs.length; i++) {
      var b = bs[i];
      b.disabled = false;
      if (b.dataset.label !== undefined) { b.textContent = b.dataset.label; delete b.dataset.label; }
    }
  }

  function slugify(s) {
    return String(s || '')
      .normalize('NFD').replace(/[̀-ͯ]/g, '')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 80);
  }

  function fmtDur(sec) {
    var n = parseInt(sec, 10);
    if (!isFinite(n) || n < 0) return '--:--';
    var m = Math.floor(n / 60), s = n % 60;
    return m + ':' + (s < 10 ? '0' + s : String(s));
  }

  function extOf(name) {
    var m = /\.([a-z0-9]{1,6})$/i.exec(String(name || ''));
    return m ? m[1].toLowerCase() : 'mp3';
  }

  function errMsg(error, fallback) {
    if (!error) return fallback || 'Error desconocido.';
    if (error.status === 429 || error.code === 'over_email_send_rate_limit') {
      return 'Demasiados intentos. Espera un momento antes de pedir otro enlace.';
    }
    return error.message || fallback || 'Ocurrió un error.';
  }

  function readDuration(file) {
    return new Promise(function (resolve) {
      var url = URL.createObjectURL(file);
      var a = new Audio();
      var done = false;
      var finish = function (val) {
        if (done) return;
        done = true;
        URL.revokeObjectURL(url);
        resolve(val);
      };
      a.preload = 'metadata';
      a.addEventListener('loadedmetadata', function () {
        var d = a.duration;
        finish(isFinite(d) && d > 0 ? Math.round(d) : null);
      });
      a.addEventListener('error', function () { finish(null); });
      setTimeout(function () { finish(null); }, 12000);
      a.src = url;
    });
  }

  /* ---------------- state ---------------- */
  var state = { user: null, tracks: [], pendingFile: null, pendingDuration: null, pendingPeaks: null, booted: false, listadoOk: false };

  /* ---------------- auth ---------------- */
  var loginForm = $('login-form');
  var loginStatus = $('login-status');
  var btnLogin = $('btn-login');

  loginForm.addEventListener('submit', function (ev) {
    ev.preventDefault();
    var email = $('email').value.trim();
    if (!email || email.indexOf('@') < 1) {
      setStatus(loginStatus, 'Escribe un correo válido.', 'err');
      return;
    }
    busy(btnLogin, true, 'Enviando…');
    setStatus(loginStatus, 'Enviando enlace…', null);

    sb.auth.signInWithOtp({
      email: email,
      options: { emailRedirectTo: window.location.href.split('#')[0] }
    }).then(function (res) {
      busy(btnLogin, false);
      if (res.error) {
        setStatus(loginStatus, errMsg(res.error, 'No pudimos enviar el enlace.'), 'err');
        return;
      }
      setStatus(loginStatus, 'Listo. Revisa tu correo y abre el enlace desde este mismo dispositivo.', 'ok');
    }).catch(function (e) {
      busy(btnLogin, false);
      setStatus(loginStatus, 'Falló la conexión: ' + (e && e.message ? e.message : 'sin detalle'), 'err');
    });
  });

  function logout() {
    sb.auth.signOut().then(function () {
      // onAuthStateChange -> SIGNED_OUT handles the screen swap.
    });
  }
  $('btn-logout').addEventListener('click', logout);
  $('btn-logout-denied').addEventListener('click', logout);

  // Rule: only onAuthStateChange, never also getSession(). INITIAL_SESSION fires
  // on load (with null when there's no session).
  // Rule: no awaited supabase call inside this callback — defer with setTimeout.
  sb.auth.onAuthStateChange(function (event, session) {
    if (event === 'SIGNED_OUT' || !session || !session.user) {
      state.user = null;
      state.tracks = [];
      stopPlayer();
      resetAllButtons();
      resetUploadForm();
      clearStatus(loginStatus);
      clearStatus($('upload-status'));
      clearStatus($('create-status'));
      clearStatus($('list-status'));
      show('login');
      return;
    }
    if (event === 'TOKEN_REFRESHED' && state.booted) return;
    if (event === 'USER_UPDATED' && state.booted) return;

    state.user = session.user;
    if (state.booted) return;
    show('loading');
    setTimeout(bootAdmin, 0);
  });

  function bootAdmin() {
    sb.rpc('is_admin').then(function (res) {
      if (res.error || res.data !== true) {
        var de = $('denied-email');
        de.textContent = (state.user && state.user.email) || '';
        resetAllButtons();
        show('denied');
        return;
      }
      state.booted = true;
      $('panel-email').textContent = (state.user && state.user.email) || '';
      resetAllButtons();
      show('panel');
      loadTracks();
      loadSubscriberCount();
    }).catch(function () {
      $('denied-email').textContent = (state.user && state.user.email) || '';
      resetAllButtons();
      show('denied');
    });
  }

  /* ---------------- shared player ---------------- */
  var player = $('player');
  var playerbar = $('playerbar');
  var nowPlaying = $('now-playing');

  function stopPlayer() {
    try { player.pause(); } catch (e) {}
    player.removeAttribute('src');
    try { player.load(); } catch (e) {}
    playerbar.classList.remove('open');
    nowPlaying.textContent = '';
  }

  function playTrack(track, btn) {
    if (!track.file_path) return;
    busy(btn, true, '…');
    sb.storage.from(BUCKET).createSignedUrl(track.file_path, 300).then(function (res) {
      busy(btn, false);
      if (res.error || !res.data || !res.data.signedUrl) {
        setStatus($('list-status'), errMsg(res.error, 'No se pudo generar el enlace del audio.'), 'err');
        return;
      }
      clearStatus($('list-status'));
      nowPlaying.textContent = 'Sonando: ' + (track.title || track.slug);
      playerbar.classList.add('open');
      player.src = res.data.signedUrl;
      var p = player.play();
      if (p && p.catch) p.catch(function () { /* el usuario puede darle play manualmente */ });
    }).catch(function (e) {
      busy(btn, false);
      setStatus($('list-status'), 'Error al reproducir: ' + (e && e.message ? e.message : ''), 'err');
    });
  }

  /* ---------------- tracks ---------------- */
  var listEl = $('tracks');
  var listStatus = $('list-status');

  function loadTracks() {
    listEl.textContent = '';
    var loading = document.createElement('div');
    loading.className = 'empty';
    loading.textContent = 'Cargando…';
    listEl.appendChild(loading);

    sb.from('tracks')
      .select('id,title,slug,file_path,duration_seconds,sort_order,visible,description,peaks')
      .order('sort_order', { ascending: true })
      .order('created_at', { ascending: true })
      .then(function (res) {
        if (res.error) {
          state.listadoOk = false;
          state.tracks = [];
          listEl.textContent = '';
          var e = document.createElement('div');
          e.className = 'empty';
          e.textContent = 'No se pudo cargar el listado.';
          listEl.appendChild(e);
          /* Un fallo por columna ausente no es "error al cargar": es una
             migracion sin ejecutar, y el mensaje crudo de PostgREST no lo
             dice. Nombrarla ahorra la investigacion entera. */
          var m = String(res.error && res.error.message || '');
          var falta = m.match(/'([a-z_]+)' column of '([a-z_]+)'/i);
          setStatus(listStatus, falta
            ? 'Falta la columna "' + falta[1] + '" en la tabla "' + falta[2] + '": hay una migracion sin ejecutar en Supabase. Hasta que la ejecutes, el listado y la subida no funcionan.'
            : errMsg(res.error, 'Error al cargar maquetas.'), 'err');
          if (typeof revisarSlug === 'function') revisarSlug();
          return;
        }
        clearStatus(listStatus);
        state.listadoOk = true;
        state.tracks = res.data || [];
        renderTracks();
        updateStats();
        if (typeof revisarSlug === 'function') revisarSlug();
      });
  }
  $('btn-reload').addEventListener('click', loadTracks);

  function updateStats() {
    $('stat-tracks').textContent = String(state.tracks.length);
    var v = 0;
    for (var i = 0; i < state.tracks.length; i++) if (state.tracks[i].visible) v++;
    $('stat-visibles').textContent = String(v);
  }


  /* ══════════════════════════════════════════════════════════════════
     EDITOR DE LETRAS
     Dos vias: pegar LRC (la salida de escape) y marcar al vuelo (la que
     de verdad se usa). Se guarda YA PARSEADO; el trigger del servidor
     rechaza tiempos desordenados, asi que el cliente no es la ultima
     linea de defensa -- solo la primera.
     ══════════════════════════════════════════════════════════════════ */

  function mmss(t){
    if(t === null || t === undefined || isNaN(t)) return '--:--.--';
    var m = Math.floor(t/60), r = t - m*60;
    return m + ':' + (r < 10 ? '0' : '') + r.toFixed(2);
  }

  /* Acepta '[mm:ss.xx] texto' y tambien texto pelado. */
  function parseLetra(txt){
    var out = [];
    var brutas = String(txt).split(/\r?\n/);
    for(var i = 0; i < brutas.length; i++){
      var linea = brutas[i];
      if(!linea.trim()) continue;
      var m = linea.match(/^\s*\[(\d{1,2}):(\d{1,2}(?:[.:]\d{1,3})?)\]\s*(.*)$/);
      if(m){
        var seg = parseFloat(String(m[2]).replace(':', '.'));
        out.push({ t: +(parseInt(m[1],10)*60 + seg).toFixed(2), l: m[3].trim() });
      } else {
        out.push({ t: null, l: linea.trim() });
      }
    }
    return out;
  }

  function aLRC(lineas){
    return lineas.map(function(x){
      return (x.t === null || x.t === undefined ? '' : '[' + mmss(x.t) + '] ') + x.l;
    }).join('\n');
  }

  var marcadoActivo = null;   /* solo un panel puede estar marcando */

  function panelLetra(t, boton){
    var caja = el('div', 'letra');
    var cargado = false;

    var ta = document.createElement('textarea');
    ta.placeholder = 'Pega la letra, una linea por renglon.\nSi ya trae [mm:ss.xx] al principio, se respeta.';
    var lbl = el('label', 'lbl', 'Letra');
    var campo = el('div', 'field');
    campo.appendChild(lbl); campo.appendChild(ta);
    caja.appendChild(campo);

    var acciones = el('div', 'row-actions');
    var bMarcar = el('button', 'btn sm', 'Marcar al vuelo');   bMarcar.type = 'button';
    var bStamp  = el('button', 'btn primary sm', 'Marcar (espacio)'); bStamp.type = 'button';
    var bAtras  = el('button', 'btn ghost sm', 'Atras');        bAtras.type = 'button';
    var bSalir  = el('button', 'btn ghost sm', 'Terminar');     bSalir.type = 'button';
    var bGuardar= el('button', 'btn primary sm', 'Guardar letra'); bGuardar.type = 'button';
    var bBorrar = el('button', 'btn ghost sm', 'Quitar tiempos'); bBorrar.type = 'button';
    bStamp.style.display = bAtras.style.display = bSalir.style.display = 'none';
    acciones.appendChild(bMarcar); acciones.appendChild(bStamp);
    acciones.appendChild(bAtras);  acciones.appendChild(bSalir);
    acciones.appendChild(bGuardar); acciones.appendChild(bBorrar);
    caja.appendChild(acciones);

    var lista = el('div', 'lineas');
    lista.tabIndex = 0;
    lista.setAttribute('role','listbox');
    lista.setAttribute('aria-label','Lineas de la letra');
    lista.style.display = 'none';
    caja.appendChild(lista);

    var ayuda = el('p', 'letra-ayuda',
      'Marcar al vuelo: suena el tema y cada pulsacion fija el tiempo de la linea resaltada. ' +
      'Espacio marca, flecha izquierda retrocede una linea. Los tiempos deben ir en aumento: ' +
      'el servidor rechaza el guardado si alguno queda fuera de orden.');
    caja.appendChild(ayuda);

    var est = el('div', 'status hidden');
    est.setAttribute('role', 'status');
    caja.appendChild(est);

    var L = [], idx = 0, marcando = false;

    function pintarLista(){
      lista.textContent = '';
      L.forEach(function(x, i){
        var f = el('div', 'ln' + (i === idx ? ' actual' : '') + (x.t !== null && x.t !== undefined ? ' lista' : ''));
        var ct = el('span', 'ln-t' + (x.t === null || x.t === undefined ? ' vacio' : ''), mmss(x.t));
        var cx = el('span', 'ln-x', x.l);
        f.appendChild(ct); f.appendChild(cx);
        f.addEventListener('click', function(){ idx = i; pintarLista(); });
        lista.appendChild(f);
      });
      var act = lista.querySelector('.ln.actual');
      if(act && act.scrollIntoView) act.scrollIntoView({ block: 'nearest' });
    }

    function marcar(){
      if(!L.length || idx >= L.length) return;
      L[idx].t = +Math.max(0, player.currentTime).toFixed(2);
      idx = Math.min(L.length, idx + 1);
      pintarLista();
    }
    function atras(){
      idx = Math.max(0, idx - 1);
      L[idx].t = null;
      pintarLista();
    }
    function tecla(e){
      if(!marcando) return;
      /* Solo dentro de la lista enfocada. Sin esto el atajo secuestraba todo
         el documento: un espacio en el campo "Titulo" estampaba un tiempo y
         ningun boton de la pagina se podia activar con el teclado. */
      var t = e.target;
      if(t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.isContentEditable)) return;
      if(!lista.contains(t) && t !== lista) return;
      if(e.code === 'Space'){ e.preventDefault(); marcar(); }
      else if(e.key === 'ArrowLeft'){ e.preventDefault(); atras(); }
    }

    function modo(activo){
      if(activo && marcadoActivo && marcadoActivo !== salirModo) marcadoActivo(false);
      marcadoActivo = activo ? salirModo : (marcadoActivo === salirModo ? null : marcadoActivo);
      marcando = activo;
      ta.style.display   = activo ? 'none' : '';
      lbl.style.display  = activo ? 'none' : '';
      lista.style.display = activo ? '' : 'none';
      bMarcar.style.display = activo ? 'none' : '';
      bBorrar.style.display = activo ? 'none' : '';
      bStamp.style.display = bAtras.style.display = bSalir.style.display = activo ? '' : 'none';
      if(activo){ lista.addEventListener('keydown', tecla); try{ lista.focus(); }catch(e){} }
      else        lista.removeEventListener('keydown', tecla);
    }

    function salirModo(v){ modo(v === undefined ? false : v); }

    bMarcar.addEventListener('click', function(){
      L = parseLetra(ta.value);
      if(!L.length){ setStatus(est, 'Escribe o pega la letra primero.', 'err'); return; }
      clearStatus(est);
      idx = 0; pintarLista(); modo(true);
      playTrack(t, bMarcar);
    });
    bStamp.addEventListener('click', marcar);
    bAtras.addEventListener('click', atras);
    bSalir.addEventListener('click', function(){
      ta.value = aLRC(L); modo(false); try{ player.pause(); }catch(e){}
    });
    bBorrar.addEventListener('click', function(){
      var x = parseLetra(ta.value).map(function(y){ return { t: null, l: y.l }; });
      ta.value = x.map(function(y){ return y.l; }).join('\n');
      setStatus(est, 'Tiempos quitados. No se ha guardado todavia.', 'ok');
    });

    bGuardar.addEventListener('click', function(){
      var fuente = marcando ? L : parseLetra(ta.value);
      var conTiempo = fuente.filter(function(x){ return x.t !== null && x.t !== undefined; });
      var plana = fuente.map(function(x){ return x.l; }).join('\n');

      /* Primera linea de defensa. La ultima es el trigger del servidor. */
      for(var i = 1; i < conTiempo.length; i++){
        if(conTiempo[i].t <= conTiempo[i-1].t){
          setStatus(est, 'Los tiempos no van en aumento: "' + conTiempo[i].l +
                         '" esta en ' + mmss(conTiempo[i].t) + ' y la anterior en ' +
                         mmss(conTiempo[i-1].t) + '.', 'err');
          return;
        }
      }
      if(conTiempo.length && conTiempo.length !== fuente.length){
        setStatus(est, 'Faltan ' + (fuente.length - conTiempo.length) +
                       ' lineas por marcar. Se guardan solo las marcadas.', 'ok');
      }

      busy(bGuardar, true, 'Guardando…');
      sb.from('track_lyrics')
        .upsert({ track_id: t.id, lines: conTiempo, plain: plana }, { onConflict: 'track_id' })
        .then(function(res){
          busy(bGuardar, false);
          if(res.error){ setStatus(est, errMsg(res.error, 'No se pudo guardar la letra.'), 'err'); return; }
          setStatus(est, 'Letra guardada: ' + conTiempo.length + ' lineas con tiempo.', 'ok');
        });
    });

    boton.addEventListener('click', function(){
      var abierto = caja.classList.toggle('open');
      if(!abierto){ modo(false); return; }
      if(cargado) return;
      cargado = true;
      sb.from('track_lyrics').select('lines,plain').eq('track_id', t.id).maybeSingle()
        .then(function(res){
          if(res.error || !res.data){ return; }
          var d = res.data;
          if(Array.isArray(d.lines) && d.lines.length) ta.value = aLRC(d.lines);
          else if(d.plain) ta.value = d.plain;
        });
    });

    return caja;
  }

  function renderTracks() {
    listEl.textContent = '';
    if (!state.tracks.length) {
      var e = document.createElement('div');
      e.className = 'empty';
      e.textContent = 'Vacío. Sube la primera.';
      listEl.appendChild(e);
      return;
    }
    for (var i = 0; i < state.tracks.length; i++) {
      listEl.appendChild(buildRow(state.tracks[i]));
    }
  }

  function el(tag, cls, text) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text !== undefined && text !== null) n.textContent = text;
    return n;
  }

  function buildRow(t) {
    var row = el('div', 'track');
    row.dataset.id = t.id;

    /* -- head -- */
    var head = el('div', 'track-head');
    var idBox = el('div', 'track-id');
    idBox.appendChild(el('div', 'track-title', t.title || '(sin título)'));

    var meta = el('div', 'meta');
    meta.appendChild(el('span', null, '/' + (t.slug || '')));
    meta.appendChild(el('span', null, t.file_path ? t.file_path : 'Sin archivo'));
    meta.appendChild(el('span', null, fmtDur(t.duration_seconds)));
    meta.appendChild(el('span', null, 'Orden ' + (t.sort_order === null || t.sort_order === undefined ? 0 : t.sort_order)));
    idBox.appendChild(meta);
    head.appendChild(idBox);

    /* -- switch -- */
    var swWrap = el('label', 'sw');
    var chk = document.createElement('input');
    chk.type = 'checkbox';
    chk.checked = !!t.visible;
    var knob = el('span', 'track-sw');
    var swTxt = el('span', 'txt', t.visible ? 'Visible' : 'Oculta');
    swWrap.appendChild(chk); swWrap.appendChild(knob); swWrap.appendChild(swTxt);
    head.appendChild(swWrap);
    row.appendChild(head);

    chk.addEventListener('change', function () {
      var next = chk.checked;
      // optimista
      swTxt.textContent = next ? 'Visible' : 'Oculta';
      chk.disabled = true;
      sb.from('tracks').update({ visible: next }).eq('id', t.id).then(function (res) {
        chk.disabled = false;
        if (res.error) {
          // rollback
          chk.checked = !next;
          swTxt.textContent = !next ? 'Visible' : 'Oculta';
          setStatus(listStatus, errMsg(res.error, 'No se pudo cambiar la visibilidad.'), 'err');
          return;
        }
        t.visible = next;
        clearStatus(listStatus);
        updateStats();
      });
    });

    /* -- actions -- */
    var actions = el('div', 'row-actions');
    actions.style.marginTop = '14px';

    var btnPlay = el('button', 'btn sm', 'Escuchar');
    btnPlay.type = 'button';
    if (!t.file_path) btnPlay.disabled = true;
    btnPlay.addEventListener('click', function () { playTrack(t, btnPlay); });
    actions.appendChild(btnPlay);

    var btnEdit = el('button', 'btn sm ghost', 'Editar');
    btnEdit.type = 'button';
    actions.appendChild(btnEdit);

    var btnOnda = el('button', 'btn sm ghost', t.peaks ? 'Onda ✓' : 'Calcular onda');
    btnOnda.type = 'button';
    if (!t.file_path) btnOnda.disabled = true;
    btnOnda.title = 'Descarga el archivo una vez y guarda la forma de onda.';
    btnOnda.addEventListener('click', function () {
      busy(btnOnda, true, 'Descargando…');
      sb.storage.from(BUCKET).createSignedUrl(t.file_path, 300).then(function (r) {
        if (r.error || !r.data) throw (r.error || new Error('sin enlace'));
        return fetch(r.data.signedUrl);
      }).then(function (resp) {
        if (!resp.ok) throw new Error('HTTP ' + resp.status);
        var largo = parseInt(resp.headers.get('content-length') || '0', 10);
        if (largo > 120 * 1024 * 1024) throw new Error('El archivo pesa mas de 120 MB.');
        busy(btnOnda, true, 'Analizando…');
        return resp.arrayBuffer();
      }).then(calcularPicos).then(function (pk) {
        if (!pk) throw new Error('El audio salio en silencio.');
        return sb.from('tracks').update({ peaks: pk }).eq('id', t.id).select();
      }).then(function (res) {
        busy(btnOnda, false);
        if (res.error) { setStatus($('list-status'), errMsg(res.error, 'No se pudo guardar la onda.'), 'err'); return; }
        t.peaks = res.data && res.data[0] ? res.data[0].peaks : true;
        btnOnda.textContent = 'Onda ✓';
        setStatus($('list-status'), 'Onda calculada para ' + (t.title || t.slug) + '.', 'ok');
      }).catch(function (e) {
        busy(btnOnda, false);
        setStatus($('list-status'), 'No se pudo calcular la onda: ' + (e && e.message ? e.message : e), 'err');
      });
    });
    actions.appendChild(btnOnda);

    var btnLetra = el('button', 'btn sm ghost', 'Letra');
    btnLetra.type = 'button';
    actions.appendChild(btnLetra);

    var btnDel = el('button', 'btn sm danger', 'Eliminar');
    btnDel.type = 'button';
    actions.appendChild(btnDel);

    row.appendChild(actions);

    /* -- edit form -- */
    var edit = el('div', 'edit');

    var g = el('div', 'grid3');
    var fTitle = fieldInput('Título', 'text', t.title || '');
    var fSlug = fieldInput('Slug', 'text', t.slug || '');
    var fOrder = fieldInput('Orden', 'number', (t.sort_order === null || t.sort_order === undefined) ? 0 : t.sort_order);
    g.appendChild(fTitle.wrap); g.appendChild(fSlug.wrap); g.appendChild(fOrder.wrap);
    edit.appendChild(g);

    var g2 = el('div', 'grid2');
    var fFile = fieldInput('Archivo', 'text', t.file_path || '');
    var fDur = fieldInput('Duración (seg)', 'number', (t.duration_seconds === null || t.duration_seconds === undefined) ? '' : t.duration_seconds);
    g2.appendChild(fFile.wrap); g2.appendChild(fDur.wrap);
    edit.appendChild(g2);

    var dWrap = el('div', 'field');
    var dLbl = el('label', 'lbl', 'Descripción');
    var dTa = document.createElement('textarea');
    dTa.value = t.description || '';
    dLbl.setAttribute('for', 'desc-' + t.id);
    dTa.id = 'desc-' + t.id;
    dWrap.appendChild(dLbl); dWrap.appendChild(dTa);
    edit.appendChild(dWrap);

    var editActions = el('div', 'row-actions');
    var btnSave = el('button', 'btn primary sm', 'Guardar');
    btnSave.type = 'button';
    var btnCancel = el('button', 'btn ghost sm', 'Cancelar');
    btnCancel.type = 'button';
    editActions.appendChild(btnSave); editActions.appendChild(btnCancel);
    edit.appendChild(editActions);

    var rowStatus = el('div', 'status hidden');
    rowStatus.setAttribute('role', 'status');
    edit.appendChild(rowStatus);
    row.appendChild(edit);

    row.appendChild(panelLetra(t, btnLetra));

    btnEdit.addEventListener('click', function () {
      var open = edit.classList.toggle('open');
      btnEdit.textContent = open ? 'Cerrar' : 'Editar';
      btnEdit.dataset.label = btnEdit.textContent;
    });
    btnCancel.addEventListener('click', function () {
      fTitle.input.value = t.title || '';
      fSlug.input.value = t.slug || '';
      fOrder.input.value = (t.sort_order === null || t.sort_order === undefined) ? 0 : t.sort_order;
      fFile.input.value = t.file_path || '';
      fDur.input.value = (t.duration_seconds === null || t.duration_seconds === undefined) ? '' : t.duration_seconds;
      dTa.value = t.description || '';
      clearStatus(rowStatus);
      edit.classList.remove('open');
      btnEdit.textContent = 'Editar';
      btnEdit.dataset.label = 'Editar';
    });

    btnSave.addEventListener('click', function () {
      var title = fTitle.input.value.trim();
      var slug = slugify(fSlug.input.value.trim() || title);
      if (!title) { setStatus(rowStatus, 'El título no puede ir vacío.', 'err'); return; }
      if (!slug) { setStatus(rowStatus, 'El slug no puede ir vacío.', 'err'); return; }
      fSlug.input.value = slug;

      var orderVal = parseInt(fOrder.input.value, 10);
      var durVal = parseInt(fDur.input.value, 10);
      var payload = {
        title: title,
        slug: slug,
        description: dTa.value.trim() || null,
        sort_order: isFinite(orderVal) ? orderVal : 0,
        file_path: fFile.input.value.trim() || null,
        duration_seconds: isFinite(durVal) ? durVal : null
      };

      busy(btnSave, true, 'Guardando…');
      setStatus(rowStatus, 'Guardando…', null);
      sb.from('tracks').update(payload).eq('id', t.id).select().then(function (res) {
        busy(btnSave, false);
        if (res.error) {
          setStatus(rowStatus, errMsg(res.error, 'No se pudo guardar.'), 'err');
          return;
        }
        var updated = (res.data && res.data[0]) ? res.data[0] : null;
        for (var k in payload) if (Object.prototype.hasOwnProperty.call(payload, k)) t[k] = payload[k];
        if (updated) { for (var k2 in updated) if (Object.prototype.hasOwnProperty.call(updated, k2)) t[k2] = updated[k2]; }
        setStatus(rowStatus, 'Guardado.', 'ok');
        // refrescar cabecera sin innerHTML
        idBox.textContent = '';
        idBox.appendChild(el('div', 'track-title', t.title || '(sin título)'));
        var m2 = el('div', 'meta');
        m2.appendChild(el('span', null, '/' + (t.slug || '')));
        m2.appendChild(el('span', null, t.file_path ? t.file_path : 'Sin archivo'));
        m2.appendChild(el('span', null, fmtDur(t.duration_seconds)));
        m2.appendChild(el('span', null, 'Orden ' + (t.sort_order === null || t.sort_order === undefined ? 0 : t.sort_order)));
        idBox.appendChild(m2);
        btnPlay.disabled = !t.file_path;
      });
    });

    /* -- delete (confirmación inline, sin window.confirm) -- */
    var conf = el('div', 'confirm');
    conf.appendChild(el('span', 'q', '¿Seguro? Se borra el archivo y la ficha.'));
    var yes = el('button', 'btn sm danger', 'Sí, eliminar');
    yes.type = 'button';
    var no = el('button', 'btn sm ghost', 'No');
    no.type = 'button';
    conf.appendChild(yes); conf.appendChild(no);
    row.appendChild(conf);

    btnDel.addEventListener('click', function () {
      conf.classList.add('open');
      btnDel.disabled = true;
    });
    no.addEventListener('click', function () {
      conf.classList.remove('open');
      btnDel.disabled = false;
    });
    yes.addEventListener('click', function () {
      busy(yes, true, 'Eliminando…');
      no.disabled = true;
      row.classList.add('busy');

      var stepStorage = t.file_path
        ? sb.storage.from(BUCKET).remove([t.file_path])
        : Promise.resolve({ data: null, error: null });

      stepStorage.then(function (sres) {
        if (sres && sres.error) {
          // seguimos igual: la ficha se borra aunque el archivo falle
          setStatus(listStatus, 'Aviso: no se pudo borrar el archivo (' + errMsg(sres.error, '') + '). Se elimina la ficha igual.', 'err');
        }
        return sb.from('tracks').delete().eq('id', t.id);
      }).then(function (dres) {
        row.classList.remove('busy');
        busy(yes, false);
        no.disabled = false;
        if (dres.error) {
          conf.classList.remove('open');
          btnDel.disabled = false;
          setStatus(listStatus, errMsg(dres.error, 'No se pudo eliminar la maqueta.'), 'err');
          return;
        }
        var idx = state.tracks.indexOf(t);
        if (idx >= 0) state.tracks.splice(idx, 1);
        renderTracks();
        updateStats();
      }).catch(function (e) {
        row.classList.remove('busy');
        busy(yes, false);
        no.disabled = false;
        btnDel.disabled = false;
        conf.classList.remove('open');
        setStatus(listStatus, 'Error al eliminar: ' + (e && e.message ? e.message : ''), 'err');
      });
    });

    return row;
  }

  function fieldInput(label, type, value) {
    var wrap = el('div', 'field');
    var l = el('label', 'lbl', label);
    var i = document.createElement('input');
    i.type = type;
    if (type === 'number') i.step = '1';
    i.value = (value === null || value === undefined) ? '' : String(value);
    i.autocomplete = 'off';
    wrap.appendChild(l); wrap.appendChild(i);
    return { wrap: wrap, input: i, label: l };
  }


  /* ══════════════════════════════════════════════════════════════════
     PICOS DE ONDA
     Se calculan UNA vez, aqui, sobre el archivo que ya esta en el disco
     de quien sube: coste de red cero. Nunca en el navegador del fan --
     decodeAudioData sobre un WAV de 40 MB lo expande a ~250 MB de
     Float32 en memoria, y en un telefono eso cierra la pestana.
     ══════════════════════════════════════════════════════════════════ */

  var N_PICOS = 140;

  function calcularPicos(bufferArray){
    var OAC = window.OfflineAudioContext || window.webkitOfflineAudioContext;
    var AC  = window.AudioContext || window.webkitAudioContext;
    if(!OAC && !AC) return Promise.reject(new Error('Este navegador no puede decodificar audio.'));
    var ac = OAC ? new OAC(1, 1, 44100) : new AC();
    function cerrar(){ try{ if(ac.close) ac.close(); }catch(e){} }
    return new Promise(function(res, rej){
      /* decodeAudioData con callbacks: Safari antiguo no devuelve promesa. */
      var p = ac.decodeAudioData(bufferArray, function(buf){ res(buf); }, function(e){ rej(e || new Error('decode')); });
      if(p && p.then) p.then(res, rej);
    }).then(function(buf){
      var canales = Math.min(2, buf.numberOfChannels);
      var n = buf.length, porTramo = Math.max(1, Math.floor(n / N_PICOS));
      var picos = [], maximo = 0, pistas = [];
      for(var k = 0; k < canales; k++) pistas.push(buf.getChannelData(k));
      for(var i = 0; i < N_PICOS; i++){
        var ini = i * porTramo, fin = Math.min(n, ini + porTramo), m = 0;
        for(var c = 0; c < canales; c++){
          var datos = pistas[c];
          /* Ventanas CONTIGUAS, no muestras sueltas: un salto fijo puede batir
             con la frecuencia de un bajo sostenido y muestrear siempre una
             fase parecida, subestimando el pico de ese tramo. */
          var largo = fin - ini, ventanas = 16, ancho = Math.max(1, Math.floor(largo / (ventanas * 3)));
          var paso = Math.max(ancho, Math.floor(largo / ventanas));
          for(var w = ini; w < fin; w += paso){
            var tope = Math.min(fin, w + ancho);
            for(var j = w; j < tope; j++){
              var v = datos[j] < 0 ? -datos[j] : datos[j];
              if(v > m) m = v;
            }
          }
        }
        picos.push(m);
        if(m > maximo) maximo = m;
      }
      cerrar();
      if(maximo <= 0) return null;   /* silencio absoluto: mejor sin onda que una plana */
      return picos.map(function(v){ return Math.round(Math.min(1, v / maximo) * 1000) / 1000; });
    }, function(e){ cerrar(); throw e; });
  }

  function picosDeArchivo(f){
    return f.arrayBuffer().then(calcularPicos);
  }

  /* ---------------- upload ---------------- */
  var drop = $('drop');
  var fileInput = $('file');
  var uploadMeta = $('upload-meta');
  var uploadBar = $('upload-bar');
  var uploadStatus = $('upload-status');
  var btnUpload = $('btn-upload');

  drop.addEventListener('click', function () { fileInput.click(); });
  drop.addEventListener('keydown', function (ev) {
    if (ev.key === 'Enter' || ev.key === ' ') { ev.preventDefault(); fileInput.click(); }
  });
  ['dragenter', 'dragover'].forEach(function (n) {
    drop.addEventListener(n, function (ev) { ev.preventDefault(); drop.classList.add('over'); });
  });
  ['dragleave', 'drop'].forEach(function (n) {
    drop.addEventListener(n, function (ev) { ev.preventDefault(); drop.classList.remove('over'); });
  });
  drop.addEventListener('drop', function (ev) {
    var f = ev.dataTransfer && ev.dataTransfer.files && ev.dataTransfer.files[0];
    if (f) pickFile(f);
  });
  fileInput.addEventListener('change', function () {
    var f = fileInput.files && fileInput.files[0];
    if (f) pickFile(f);
  });

  function resetUploadForm() {
    state.pendingFile = null;
    state.pendingDuration = null;
    uploadMeta.style.display = 'none';
    uploadBar.classList.add('hidden');
    fileInput.value = '';
    $('up-title').value = '';
    $('up-slug').value = '';
    $('up-desc').value = '';
    $('up-lyrics').value = '';
    $('up-order').value = '0';
    state.pendingPeaks = null;
    var av = $('up-aviso'); av.classList.add('hidden'); av.textContent = '';
    drop.querySelector('.big').textContent = 'Suelta el audio acá';
    drop.querySelector('.sub').textContent = 'o haz clic para elegirlo';
  }
  $('btn-upload-cancel').addEventListener('click', function () {
    resetUploadForm();
    clearStatus(uploadStatus);
  });

  function pickFile(f) {
    if (f.type && f.type.indexOf('audio/') !== 0) {
      setStatus(uploadStatus, 'Ese archivo no es audio.', 'err');
      return;
    }
    clearStatus(uploadStatus);
    state.pendingFile = f;
    state.pendingDuration = null;
    state.pendingPeaks = null;

    var base = f.name.replace(/\.[^.]+$/, '');
    var s = slugify(base) || ('maqueta-' + Date.now());
    $('up-slug').value = s;
    if (!$('up-title').value.trim()) $('up-title').value = base;
    revisarSlug();

    var mb = (f.size / (1024 * 1024)).toFixed(1);
    drop.querySelector('.big').textContent = f.name;
    drop.querySelector('.sub').textContent = mb + ' MB · leyendo duración…';
    uploadMeta.style.display = 'block';

    readDuration(f).then(function (d) {
      if (state.pendingFile !== f) return;
      state.pendingDuration = d;
      drop.querySelector('.sub').textContent = mb + ' MB · ' + (d ? fmtDur(d) : 'duración desconocida') + ' · calculando onda…';
      return picosDeArchivo(f);
    }).then(function (pk) {
      if (state.pendingFile !== f) return;
      state.pendingPeaks = pk;
      drop.querySelector('.sub').textContent = mb + ' MB · ' +
        (state.pendingDuration ? fmtDur(state.pendingDuration) : 'duración desconocida') +
        (pk ? ' · onda lista' : ' · sin onda');
    }).catch(function (e) {
      if (state.pendingFile !== f) return;
      /* Que no se pueda dibujar la onda no impide subir el tema. */
      console.warn('picos:', e);
      state.pendingPeaks = null;
      drop.querySelector('.sub').textContent = mb + ' MB · ' +
        (state.pendingDuration ? fmtDur(state.pendingDuration) : 'duración desconocida') + ' · sin onda';
    });
  }

  /* Decir en voz alta si esto va a CREAR o a ACTUALIZAR, y con que.
     El panel ya lo decidia solo, en silencio, mirando state.tracks. Cuando el
     listado no carga esa lista queda vacia y la decision se vuelve "crear"
     sin que nadie lo note: dos fichas con el mismo slug. El indice unico de
     fix-07 lo impide en el servidor; esto lo hace visible antes de tocar nada. */
  function buscarPorSlug(slug) {
    for (var i = 0; i < state.tracks.length; i++) {
      if (state.tracks[i].slug === slug) return state.tracks[i];
    }
    return null;
  }

  function revisarSlug() {
    var av = $('up-aviso');
    var slug = slugify($('up-slug').value.trim() || $('up-title').value.trim());
    if (!slug) { av.classList.add('hidden'); av.textContent = ''; return; }

    if (!state.listadoOk) {
      av.textContent = 'El listado no cargo, asi que no puedo saber si este slug ya existe. ' +
                       'Recarga el listado antes de subir: si existe y no lo detecto, se crearia una ficha duplicada.';
      av.className = 'status err';
      return;
    }
    var t = buscarPorSlug(slug);
    if (t) {
      av.textContent = 'Vas a ACTUALIZAR "' + (t.title || slug) + '". El archivo se reemplaza. ' +
                       'Lo que dejes vacio aqui se conserva como esta.';
      av.className = 'status ok';
    } else {
      av.textContent = 'Vas a CREAR una maqueta nueva con el slug "' + slug + '".';
      av.className = 'status';
    }
  }

  $('up-slug').addEventListener('input', revisarSlug);
  $('up-slug').addEventListener('blur', revisarSlug);
  $('up-title').addEventListener('input', function () {
    if (!$('up-slug').value.trim()) revisarSlug();
  });

  btnUpload.addEventListener('click', function () {
    var f = state.pendingFile;
    if (!f) { setStatus(uploadStatus, 'Primero elige un archivo.', 'err'); return; }

    var title = $('up-title').value.trim();
    var slug = slugify($('up-slug').value.trim() || title);
    if (!title) { setStatus(uploadStatus, 'Ponle un título.', 'err'); return; }
    if (!slug) { setStatus(uploadStatus, 'El slug no puede ir vacío.', 'err'); return; }
    $('up-slug').value = slug;

    var filename = slug + '.' + extOf(f.name);
    var orderVal = parseInt($('up-order').value, 10);
    var desc = $('up-desc').value.trim();

    busy(btnUpload, true, 'Subiendo…');
    uploadBar.classList.remove('hidden');
    setStatus(uploadStatus, 'Subiendo ' + filename + '…', null);

    sb.storage.from(BUCKET).upload(filename, f, {
      upsert: true,
      contentType: f.type || 'audio/mpeg'
    }).then(function (ures) {
      if (ures.error) {
        busy(btnUpload, false);
        uploadBar.classList.add('hidden');
        setStatus(uploadStatus, errMsg(ures.error, 'Falló la subida.'), 'err');
        return null;
      }
      setStatus(uploadStatus, 'Archivo listo. Guardando la ficha…', null);

      // ¿ya existe una maqueta con ese slug? -> update, si no -> insert
      var existing = null;
      for (var i = 0; i < state.tracks.length; i++) {
        if (state.tracks[i].slug === slug) { existing = state.tracks[i]; break; }
      }
      var payload = {
        title: title,
        slug: slug,
        file_path: filename,
        sort_order: isFinite(orderVal) ? orderVal : 0
      };

      /* Reemplazar el archivo de un tema que YA existe no puede borrar lo que
         no volviste a escribir. Antes el payload mandaba description:null y
         peaks:null siempre, asi que resubir un master con la caja de
         descripcion vacia dejaba la ficha sin descripcion, en silencio.
         Para BORRAR un campo esta el editor de la fila, que viene relleno:
         ahi una caja vacia si es una decision tuya. Aqui no lo es. */
      function poner(campo, valor) {
        if (valor !== null && valor !== undefined && valor !== '') payload[campo] = valor;
        else if (!existing) payload[campo] = null;
      }
      poner('description', desc);
      poner('peaks', state.pendingPeaks);
      poner('duration_seconds', state.pendingDuration);

      if (existing) {
        return sb.from('tracks').update(payload).eq('id', existing.id).select();
      }
      return sb.from('tracks').insert(payload).select();
    }).then(function (res) {
      if (!res) return;
      busy(btnUpload, false);
      uploadBar.classList.add('hidden');
      if (res.error) {
        setStatus(uploadStatus, errMsg(res.error, 'El archivo subió pero no se pudo guardar la ficha.'), 'err');
        return;
      }
      var fila = (res.data && res.data[0]) ? res.data[0] : null;
      var letra = $('up-lyrics').value.trim();

      /* Sin letra escrita NO se toca track_lyrics. Si se guardara un registro
         vacio, resubir el archivo de un tema que ya tiene la letra marcada con
         tiempos la borraria. */
      if (!letra || !fila) {
        setStatus(uploadStatus, 'Maqueta subida: ' + filename, 'ok');
        resetUploadForm();
        loadTracks();
        return;
      }

      var L = parseLetra(letra);
      var conTiempo = L.filter(function (x) { return x.t !== null && x.t !== undefined; });
      setStatus(uploadStatus, 'Ficha lista. Guardando la letra…', null);
      sb.from('track_lyrics').upsert({
        track_id: fila.id,
        lines: conTiempo,
        plain: L.map(function (x) { return x.l; }).join('\n')
      }, { onConflict: 'track_id' }).then(function (lres) {
        if (lres.error) {
          /* El audio y la ficha YA estan guardados. Decirlo, y no perder la
             letra: el formulario no se limpia para que puedas reintentar. */
          setStatus(uploadStatus, 'Maqueta subida, pero la letra no se guardo: ' +
            errMsg(lres.error, '') + ' La letra sigue en el formulario.', 'err');
          loadTracks();
          return;
        }
        setStatus(uploadStatus, 'Maqueta subida: ' + filename + ' · letra con ' +
          L.length + ' lineas' + (conTiempo.length ? ' (' + conTiempo.length + ' con tiempo)' : ' (sin tiempos todavia)'), 'ok');
        resetUploadForm();
        loadTracks();
      });
    }).catch(function (e) {
      busy(btnUpload, false);
      uploadBar.classList.add('hidden');
      setStatus(uploadStatus, 'Error inesperado: ' + (e && e.message ? e.message : ''), 'err');
    });
  });

  /* ---------------- crear sin archivo ---------------- */
  var newForm = $('new-form');
  var btnNewToggle = $('btn-new-toggle');
  var createStatus = $('create-status');

  btnNewToggle.addEventListener('click', function () {
    var open = newForm.style.display === 'none';
    newForm.style.display = open ? 'block' : 'none';
    btnNewToggle.textContent = open ? 'Ocultar' : 'Mostrar';
    btnNewToggle.dataset.label = btnNewToggle.textContent;
  });

  $('nw-title').addEventListener('blur', function () {
    if (!$('nw-slug').value.trim()) $('nw-slug').value = slugify($('nw-title').value);
  });

  $('btn-create').addEventListener('click', function () {
    var btn = $('btn-create');
    var title = $('nw-title').value.trim();
    var slug = slugify($('nw-slug').value.trim() || title);
    if (!title) { setStatus(createStatus, 'Ponle un título.', 'err'); return; }
    if (!slug) { setStatus(createStatus, 'El slug no puede ir vacío.', 'err'); return; }
    $('nw-slug').value = slug;
    var orderVal = parseInt($('nw-order').value, 10);

    busy(btn, true, 'Creando…');
    setStatus(createStatus, 'Creando…', null);

    sb.from('tracks').insert({
      title: title,
      slug: slug,
      description: $('nw-desc').value.trim() || null,
      sort_order: isFinite(orderVal) ? orderVal : 0,
      file_path: $('nw-file').value.trim() || null
    }).select().then(function (res) {
      busy(btn, false);
      if (res.error) {
        setStatus(createStatus, errMsg(res.error, 'No se pudo crear la maqueta.'), 'err');
        return;
      }
      setStatus(createStatus, 'Maqueta creada.', 'ok');
      $('nw-title').value = '';
      $('nw-slug').value = '';
      $('nw-desc').value = '';
      $('nw-file').value = '';
      $('nw-order').value = '0';
      loadTracks();
    });
  });

  /* ---------------- subscribers ---------------- */
  function loadSubscriberCount() {
    sb.from('subscribers').select('*', { count: 'exact', head: true }).then(function (res) {
      if (res.error) { $('stat-subs').textContent = '—'; return; }
      $('stat-subs').textContent = String(res.count === null || res.count === undefined ? 0 : res.count);
    });
  }

  function csvCell(v) {
    if (v === null || v === undefined) return '';
    var s = String(v);
    /* Prefijo de apostrofe DENTRO del campo: entrecomillar no sirve, Excel
         quita las comillas al parsear y evalua la formula igual. */
      if (/^[=+\-@\t\r]/.test(s)) s = "'" + s;
      if (/["\n\r,]/.test(s)) s = '"' + s.replace(/"/g, '""') + '"';
    return s;
  }

  $('btn-csv').addEventListener('click', function () {
    var btn = $('btn-csv');
    busy(btn, true, 'Exportando…');
    sb.from('subscribers').select('*').then(function (res) {
      busy(btn, false);
      if (res.error) {
        setStatus(listStatus, errMsg(res.error, 'No se pudo exportar.'), 'err');
        return;
      }
      var rows = res.data || [];
      if (!rows.length) {
        setStatus(listStatus, 'No hay suscriptores para exportar.', 'err');
        return;
      }
      var cols = Object.keys(rows[0]);
      var lines = [cols.map(csvCell).join(',')];
      for (var i = 0; i < rows.length; i++) {
        var r = rows[i];
        var line = [];
        for (var c = 0; c < cols.length; c++) line.push(csvCell(r[cols[c]]));
        lines.push(line.join(','));
      }
      var blob = new Blob(['﻿' + lines.join('\r\n')], { type: 'text/csv;charset=utf-8' });
      var url = URL.createObjectURL(blob);
      var a = document.createElement('a');
      a.href = url;
      a.download = 'suscriptores-' + new Date().toISOString().slice(0, 10) + '.csv';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(function () { URL.revokeObjectURL(url); }, 2000);
      clearStatus(listStatus);
    });
  });

})();
