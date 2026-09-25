// admin-produccion.js · Zignalez · 24-09-2026 · v1.1
//
// Catálogo con etapas, versiones y sus archivos, colaboradores, shares y
// bitácora (PROMPT_MAESTRO_HDU_CATALOGO v1.1: HdU-05…08, 12…16), borrado con
// guardas y lanzamiento mínimo (PROMPT_MAESTRO_HDU_BORRADO_Y_LANZAMIENTO v1.0:
// HdU-17…25). v1.2 · 25-09-2026.
//
// Módulo nuevo junto al admin.js legado (HdU-04, estrangulamiento): no toca su
// lógica. Se engancha por window.ZignalezAdmin / 'zg-admin-ready'.
//
// Toda regla de permiso vive en la base (fix-02 + fix-08). Lo que este archivo
// deshabilita en pantalla es comodidad, no seguridad: si la base rechaza, se
// muestra el mensaje de la base tal cual.
//
// El DOM se construye con nodos (el()), nunca con innerHTML sobre datos.

const STAGES = ['IDEA', 'DEMO', 'RECORDING', 'MIXING', 'MASTERING', 'RELEASE_READY', 'RELEASED'];
const ROLES_COLAB = ['PRODUCTOR', 'FEATURE', 'SELLO', 'OTRO'];
const PLAZO_MAX_DIAS = 30;      // espejo de share_plazo_maximo() en fix-08; la base manda
const PLAZO_DEFAULT_DIAS = 14;
const PENDING_VIEJO_MIN = 15;   // una subida PENDING más vieja que esto quedó a medias
const REL_STATES = ['PLANNING', 'READY', 'SCHEDULED', 'RELEASED'];
const PLATAFORMAS = ['SPOTIFY', 'APPLE', 'YOUTUBE', 'DEEZER', 'TIDAL', 'AMAZON'];  // lista cerrada de fix-03
const AVISO_ANTELACION_DIAS = 14;

let ZA = null;                  // { sb, bucket, user }
let root = null;
const st = {
  tracks: [], versions: [], media: [], collabs: [], shares: [], stageLog: [], audit: [],
  releases: {},                 // track_id → release (fix-03 + fix-10)
  filtro: 'TODAS', abierto: new Set(), falta: null, falta03: false
};

/* ───────────── helpers ───────────── */

function el(tag, attrs, ...children) {
  const n = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs || {})) {
    if (v === null || v === undefined || v === false) continue;
    if (k === 'class') n.className = v;
    else if (k === 'text') n.textContent = v;
    else if (k.startsWith('on')) n.addEventListener(k.slice(2), v);
    else if (v === true) n.setAttribute(k, '');
    else n.setAttribute(k, v);
  }
  for (const c of children.flat()) {
    if (c === null || c === undefined || c === false) continue;
    n.appendChild(typeof c === 'string' ? document.createTextNode(c) : c);
  }
  return n;
}

function status(msg, kind) {
  const n = el('div', { class: 'status' + (kind ? ' ' + kind : '') + (msg ? '' : ' hidden'), role: 'status', 'aria-live': 'polite' });
  n.textContent = msg || '';
  return n;
}
function setStatus(n, msg, kind) {
  n.textContent = msg || '';
  n.classList.remove('ok', 'err');
  if (kind) n.classList.add(kind);
  n.classList.toggle('hidden', !msg);
}

// El mensaje de la base ya viene en castellano (fix-08): se muestra tal cual.
function errText(error, fallback) {
  if (!error) return fallback || 'Error desconocido.';
  return (error.message || fallback || 'Error.') + (error.code ? ' [' + error.code + ']' : '');
}

function fmtFecha(iso) {
  if (!iso) return '—';
  const d = new Date(iso);
  return d.toLocaleDateString('es-CL', { day: '2-digit', month: '2-digit', year: 'numeric' });
}
function fmtFechaHora(iso) {
  if (!iso) return '—';
  const d = new Date(iso);
  return d.toLocaleString('es-CL', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}
function fmtBytes(n) {
  if (!n && n !== 0) return '—';
  if (n < 1024 * 1024) return Math.round(n / 1024) + ' KB';
  return (n / (1024 * 1024)).toFixed(1) + ' MB';
}
function fmtDur(sec) {
  const n = parseInt(sec, 10);
  if (!isFinite(n) || n < 0) return '—';
  return Math.floor(n / 60) + ':' + String(n % 60).padStart(2, '0');
}
function extOf(name) {
  const m = /\.([a-z0-9]{1,6})$/i.exec(String(name || ''));
  return m ? m[1].toLowerCase() : 'bin';
}
function readDuration(file) {
  return new Promise((resolve) => {
    const url = URL.createObjectURL(file);
    const a = new Audio();
    let done = false;
    const fin = (v) => { if (done) return; done = true; URL.revokeObjectURL(url); resolve(v); };
    a.preload = 'metadata';
    a.addEventListener('loadedmetadata', () => fin(isFinite(a.duration) && a.duration > 0 ? Math.round(a.duration) : null));
    a.addEventListener('error', () => fin(null));
    setTimeout(() => fin(null), 12000);
    a.src = url;
  });
}
// HdU-25: día LOCAL, no UTC. Con toISOString(), después de las 21:00 en Chile
// "hoy" ya era mañana y el selector corría un día.
function hoyMas(dias) {
  const d = new Date();
  d.setDate(d.getDate() + dias);
  const p = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}
// Fecha elegida (día local) → fin de ese día. Si cae más allá del plazo, la base
// lo rechaza con SHARE_PLAZO_EXCEDIDO; aquí se recorta para no provocarlo.
function venceEl(fechaYMD) {
  const d = new Date(fechaYMD + 'T23:59:00');
  const max = new Date(Date.now() + PLAZO_MAX_DIAS * 86400000 - 60000);
  return (d > max ? max : d).toISOString();
}

// Confirmación inline, mismo patrón que el legado (.confirm + .q + .open).
// Nunca window.confirm: bloquea el hilo y no se puede probar.
function confirmarInline(btn, pregunta, onSi) {
  const conf = el('div', { class: 'confirm' });
  const si = el('button', { class: 'btn sm danger', type: 'button', text: 'Sí, eliminar' });
  const no = el('button', { class: 'btn sm ghost', type: 'button', text: 'No' });
  conf.append(el('span', { class: 'q', text: pregunta }), si, no);
  btn.addEventListener('click', () => { conf.classList.add('open'); btn.disabled = true; });
  no.addEventListener('click', () => { conf.classList.remove('open'); btn.disabled = false; });
  si.addEventListener('click', async () => {
    si.disabled = true; no.disabled = true;
    try { await onSi(); } finally { si.disabled = false; no.disabled = false; btn.disabled = false; conf.classList.remove('open'); }
  });
  return conf;
}

// Rol sugerido por tipo de archivo (HdU-18). Sugerencia, no imposición: un
// MASTER en mp3 es legítimo para una maqueta antigua.
function rolSugerido(file) {
  const t = (file.type || '').toLowerCase();
  const ext = extOf(file.name);
  if (/wav|flac|aiff|x-aiff|x-wav/.test(t) || ['wav', 'flac', 'aif', 'aiff'].includes(ext)) return 'MASTER';
  if (/mp4|aac|mpeg|m4a|ogg|opus/.test(t) || ['m4a', 'mp3', 'aac', 'ogg', 'opus'].includes(ext)) return 'LISTEN';
  return null;
}

// Tras borrar en la base, limpiar el bucket. Si falla, la fila ya no existe:
// se avisa y objetos_huerfanos() lo encuentra después (fix-09).
async function limpiarBucket(rutas) {
  if (!rutas || rutas.length === 0) return '';
  const r = await ZA.sb.storage.from(ZA.bucket).remove(rutas);
  if (r.error) return ` Aviso: ${rutas.length} archivo(s) no se pudieron borrar del bucket (${errText(r.error)}); quedan como huérfanos.`;
  return ` ${rutas.length} archivo(s) borrados del bucket.`;
}

// Fecha de estreno: día local → 00:00 America/Santiago del dispositivo, TIMESTAMPTZ.
function estrenoISO(fechaYMD) {
  return fechaYMD ? new Date(fechaYMD + 'T00:00:00').toISOString() : null;
}
function estrenoYMD(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  const p = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}
const releaseDe = (trackId) => st.releases[trackId] || null;
// Decisión 25-09: la fecha de estreno se ofrece cuando el tema tiene material
// en MASTERING o más (o ya existe un lanzamiento). En IDEA/DEMO/RECORDING/
// MIXING no tiene sentido hablar de estreno y el bloque no aparece.
const ETAPAS_ESTRENO = ['MASTERING', 'RELEASE_READY', 'RELEASED'];
const admiteEstreno = (trackId) => !!releaseDe(trackId) || versionesDe(trackId).some((v) => ETAPAS_ESTRENO.includes(v.stage));

/* ───────────── derivados del estado ───────────── */

const versionesDe = (trackId) => st.versions.filter((v) => v.track_id === trackId);
const mediaDe = (versionId) => st.media.filter((m) => m.version_id === versionId);
const trackDe = (trackId) => st.tracks.find((t) => t.id === trackId);
const versionDe = (versionId) => st.versions.find((v) => v.id === versionId);

function listenConfirmado(versionId) {
  return st.media.some((m) => m.version_id === versionId && m.role === 'LISTEN' && m.status === 'UPLOADED');
}

function estadoShare(s) {
  if (s.revoked_at) return 'REVOCADO';
  if (new Date(s.expires_at) <= new Date()) return 'VENCIDO';
  return 'VIGENTE';
}

// HdU-15: el estado propio del colaborador.
function estadoColab(c) {
  if (!c.active) return 'SUSPENDIDO';
  const suyos = st.shares.filter((s) => s.collaborator_id === c.user_id);
  if (suyos.length === 0) return 'SIN MATERIAL';
  if (suyos.some((s) => estadoShare(s) === 'VIGENTE')) return 'ACTIVO';
  return 'ACCESO VENCIDO';
}

function pendingViejo(m) {
  return m.status === 'PENDING' && (Date.now() - new Date(m.created_at).getTime()) > PENDING_VIEJO_MIN * 60000;
}

/* ───────────── carga ───────────── */

async function cargar() {
  const sb = ZA.sb;
  const [tr, sv, vm, co, vs, lg, au, rt] = await Promise.all([
    sb.from('tracks').select('id,title,slug,visible,file_path,sort_order').order('sort_order').order('created_at'),
    sb.from('song_versions').select('id,track_id,stage,notes,is_public,created_at').order('created_at', { ascending: false }),
    sb.from('version_media').select('id,version_id,role,file_path,file_name,content_type,size_bytes,duration_seconds,status,created_at,confirmed_at'),
    sb.from('collaborators').select('user_id,display_name,role,active,created_at').order('created_at'),
    // revoked_at y las dos bitácoras son de fix-08: si faltan, se avisa en vez de fallar mudo.
    sb.from('version_shares').select('version_id,collaborator_id,shared_by,shared_at,expires_at,revoked_at'),
    sb.from('song_version_stage_log').select('version_id,stage_from,stage_to,changed_at').order('changed_at', { ascending: false }),
    sb.from('acceso_auditoria').select('tabla,accion,actor,fila_antes,fila_despues,ocurrido_el').order('ocurrido_el', { ascending: false }).limit(25),
    // fix-03: si falta, el bloque Lanzamiento lo dice y no falla nada más.
    sb.from('release_tracks').select('track_id,release:releases(id,title,release_type,status,release_date,platforms)')
  ]);

  const base = [tr, sv, vm, co].find((r) => r.error);
  if (base) throw base.error;
  st.falta = [vs, lg, au].some((r) => r.error) ? 'fix-08' : null;

  st.tracks = tr.data || [];
  st.versions = sv.data || [];
  st.media = vm.data || [];
  st.collabs = co.data || [];
  st.shares = vs.error ? [] : vs.data || [];
  st.stageLog = lg.error ? [] : lg.data || [];
  st.audit = au.error ? [] : au.data || [];
  st.falta03 = !!rt.error;
  st.releases = {};
  if (!rt.error) {
    // Un tema puede tener lanzamientos RELEASED antiguos y uno abierto: gana el abierto.
    for (const r of rt.data || []) {
      if (!r.release) continue;
      const actual = st.releases[r.track_id];
      if (!actual || (actual.status === 'RELEASED' && r.release.status !== 'RELEASED')) st.releases[r.track_id] = r.release;
    }
  }
}

async function recargar(nota) {
  try {
    await cargar();
    pintar();
    if (nota) setStatus(root.querySelector('#zg-global'), nota, 'ok');
  } catch (e) {
    root.textContent = '';
    root.appendChild(el('div', { class: 'zg-banner', text: 'No se pudo cargar producción: ' + errText(e) }));
  }
}

/* ───────────── reproducción (reutiliza el reproductor del panel) ───────────── */

async function reproducir(m, titulo, btn) {
  const player = document.getElementById('player');
  const bar = document.getElementById('playerbar');
  const now = document.getElementById('now-playing');
  btn.disabled = true;
  const { data, error } = await ZA.sb.storage.from(ZA.bucket).createSignedUrl(m.file_path, 300);
  btn.disabled = false;
  if (error || !data?.signedUrl) {
    setStatus(root.querySelector('#zg-global'), errText(error, 'No se pudo generar el enlace del audio.'), 'err');
    return;
  }
  now.textContent = 'Sonando: ' + titulo + ' · ' + m.role;
  bar.classList.add('open');
  player.src = data.signedUrl;
  player.play().catch(() => {});
}

/* ───────────── subir (HdU-06) ───────────── */

// Crea (si hace falta) la versión, su fila de medio PENDING, sube a una ruta
// inmutable sin upsert y confirma contra el bucket. Todo fallo deja rastro:
// la fila queda FAILED, nunca PENDING para siempre.
async function subirArchivo({ track, version, file, role, stage, notes, estreno }, out) {
  const sb = ZA.sb;
  let v = version;
  let versionNueva = false;

  if (!v) {
    const r = await sb.from('song_versions').insert({ track_id: track.id, stage, notes: notes || null }).select().single();
    if (r.error) return setStatus(out, 'No se creó la versión: ' + errText(r.error), 'err');
    v = r.data;
    versionNueva = true;
  }

  const ruta = `${ZA.user.id}/${track.id}/${v.id}/${role.toLowerCase()}-${Date.now()}.${extOf(file.name)}`;
  setStatus(out, 'Leyendo duración…', null);
  const dur = await readDuration(file);

  // HdU-23: UNIQUE (version_id, role). Una fila FAILED del mismo rol bloquea el
  // reintento con "duplicate key". Se borra antes; nunca upsert (pisaría un
  // UPLOADED con la pantalla desactualizada).
  await sb.from('version_media').delete().eq('version_id', v.id).eq('role', role).eq('status', 'FAILED');

  const ins = await sb.from('version_media').insert({
    version_id: v.id,
    role,
    file_path: ruta,
    file_name: file.name,
    content_type: file.type || 'application/octet-stream',
    size_bytes: file.size,
    duration_seconds: dur
  }).select().single();
  if (ins.error) {
    if (versionNueva) await sb.from('song_versions').delete().eq('id', v.id);
    return setStatus(out, 'No se registró el archivo: ' + errText(ins.error), 'err');
  }
  const m = ins.data;

  setStatus(out, 'Subiendo ' + file.name + ' (' + fmtBytes(file.size) + ')…', null);
  const up = await sb.storage.from(ZA.bucket).upload(ruta, file, { upsert: false, contentType: file.type || undefined });
  if (up.error) {
    await sb.from('version_media').update({ status: 'FAILED' }).eq('id', m.id);
    await recargar();
    return setStatus(root.querySelector('#zg-global'), 'La subida falló y quedó marcada como FAILED: ' + errText(up.error), 'err');
  }

  const conf = await sb.rpc('confirm_version_media', { p_media_id: m.id });
  if (conf.error) {
    await recargar();
    return setStatus(root.querySelector('#zg-global'), 'Subido, pero la confirmación falló: ' + errText(conf.error), 'err');
  }
  if (conf.data?.status !== 'UPLOADED') {
    await recargar();
    return setStatus(root.querySelector('#zg-global'), 'El archivo no quedó en el bucket: la fila se marcó FAILED.', 'err');
  }
  let nota = '';
  // HdU-20/21: fecha de estreno opcional al subir el MASTER. Deja el lanzamiento
  // en PLANNING con fecha (decisión 25-09). Programar es un acto aparte.
  if (role === 'MASTER' && estreno && !st.falta03) {
    const rel = releaseDe(track.id);
    if (!rel) {
      const c = await sb.rpc('crear_single', { p_track_id: track.id, p_release_date: estrenoISO(estreno) });
      nota = c.error ? ` El archivo quedó, pero no se creó el lanzamiento: ${errText(c.error)}` : ` Lanzamiento creado con estreno el ${fmtFecha(estrenoISO(estreno))}.`;
    } else if (rel.status !== 'RELEASED') {
      const u = await sb.from('releases').update({ release_date: estrenoISO(estreno) }).eq('id', rel.id);
      nota = u.error ? ` El archivo quedó, pero la fecha no se guardó: ${errText(u.error)}` : ` Fecha de estreno actualizada al ${fmtFecha(estrenoISO(estreno))}.`;
    } else nota = ' El lanzamiento ya está RELEASED: la fecha no se toca.';
  }
  await recargar(`${role} de «${track.title}» subido y confirmado.` + nota);
}

function formSubida({ track, version }) {
  const out = status();
  const file = el('input', { type: 'file', accept: 'audio/*' });
  const faltantes = version
    ? ['LISTEN', 'MASTER'].filter((r) => !mediaDe(version.id).some((m) => m.role === r && m.status !== 'FAILED'))
    : ['LISTEN', 'MASTER'];
  if (faltantes.length === 0) return null;

  const role = el('select', {}, faltantes.map((r) =>
    el('option', { value: r, text: r === 'LISTEN' ? 'LISTEN — escucha (mp3/aac liviano)' : 'MASTER — original (wav/flac)' })));
  const aviso = el('p', { class: 'zg-nota hidden' });
  file.addEventListener('change', () => {
    const f = file.files[0];
    const sug = f ? rolSugerido(f) : null;
    if (sug && faltantes.includes(sug)) {
      role.value = sug;
      aviso.textContent = sug === 'MASTER'
        ? 'Un WAV/FLAC es el original: va como MASTER. El LISTEN es el .m4a/.mp3 que oyen los demás.'
        : 'Archivo liviano: va como LISTEN (lo que se reproduce). El MASTER es el WAV/FLAC original.';
      aviso.classList.remove('hidden');
    } else if (sug && !faltantes.includes(sug)) {
      aviso.textContent = `Por el tipo de archivo parece ${sug}, pero esta versión ya tiene ${sug}. Revisa antes de subir.`;
      aviso.classList.remove('hidden');
    } else aviso.classList.add('hidden');
  });
  const stage = el('select', {}, STAGES.filter((s) => s !== 'RELEASED').map((s) =>
    el('option', { value: s, text: s, selected: s === 'DEMO' })));
  const notes = el('input', { type: 'text', placeholder: 'Notas internas (opcional; el colaborador no las ve)' });
  const rel = releaseDe(track.id);
  const estreno = el('input', { type: 'date', min: hoyMas(1), value: rel ? estrenoYMD(rel.release_date) : '' });
  const estrenoWrap = el('div', { class: 'field hidden' },
    el('label', { class: 'lbl', text: 'Fecha de estreno (opcional; editable después)' }), estreno,
    st.falta03 ? el('p', { class: 'zg-nota', text: 'Requiere ejecutar fix-03 y fix-10 en Supabase.' }) :
    rel && rel.status === 'RELEASED' ? el('p', { class: 'zg-nota', text: 'Este tema ya se publicó: la fecha está congelada.' }) : null);
  // Solo con MASTER y solo si la etapa (la elegida para la versión nueva, o la
  // de la versión existente) está en MASTERING/RELEASE_READY, o ya hay lanzamiento.
  const etapaOk = () => !!rel || ETAPAS_ESTRENO.includes(version ? version.stage : stage.value);
  const syncEstreno = () => estrenoWrap.classList.toggle('hidden', role.value !== 'MASTER' || !etapaOk());
  role.addEventListener('change', syncEstreno);
  file.addEventListener('change', syncEstreno);
  stage.addEventListener('change', syncEstreno);
  syncEstreno();
  if (st.falta03 || (rel && rel.status === 'RELEASED')) estreno.disabled = true;
  const btn = el('button', { class: 'btn primary sm', type: 'button', text: version ? 'Agregar archivo' : 'Subir versión nueva' });

  btn.addEventListener('click', async () => {
    const f = file.files[0];
    if (!f) return setStatus(out, 'Elige un archivo de audio.', 'err');
    btn.disabled = true;
    await subirArchivo({ track, version, file: f, role: role.value, stage: stage.value, notes: notes.value.trim(), estreno: estreno.disabled ? '' : estreno.value }, out);
    btn.disabled = false;
  });

  return el('div', { class: 'zg-sub' },
    el('p', { class: 'eyebrow', text: version ? 'Agregar archivo a esta versión' : 'Nueva versión (no reemplaza las anteriores)' }),
    el('div', { class: 'grid2' },
      el('div', { class: 'field' }, el('label', { class: 'lbl', text: 'Archivo' }), file),
      el('div', { class: 'field' }, el('label', { class: 'lbl', text: 'Tipo de archivo' }), role)),
    aviso,
    estrenoWrap,
    version ? null : el('div', { class: 'grid2' },
      el('div', { class: 'field' }, el('label', { class: 'lbl', text: 'Etapa inicial' }), stage),
      el('div', { class: 'field' }, el('label', { class: 'lbl', text: 'Notas' }), notes)),
    btn, out);
}

/* ───────────── catálogo y tema (HdU-05, 07, 08) ───────────── */

async function cambiarEtapa(v, nueva, out) {
  const { error } = await ZA.sb.from('song_versions').update({ stage: nueva }).eq('id', v.id);
  if (error) return setStatus(out, errText(error), 'err');
  await recargar(`Etapa cambiada a ${nueva}.`);
}

async function publicar(v, out) {
  const { error } = await ZA.sb.rpc('publish_song_version', { p_version_id: v.id });
  if (error) return setStatus(out, errText(error), 'err');
  await recargar('Versión publicada: es el archivo que sirve la maqueta. La visibilidad para fans sigue en el listado de arriba.');
}

// HdU-17. La base decide (song_versions_no_borrar): pública, RELEASED o
// sosteniendo un lanzamiento programado → mensaje tal cual.
async function eliminarVersion(v, out) {
  const r = await ZA.sb.rpc('borrar_version', { p_version_id: v.id });
  if (r.error) return setStatus(out, errText(r.error), 'err');
  const nota = await limpiarBucket(r.data || []);
  await recargar('Versión eliminada.' + nota);
}

// HdU-18. Quitar un archivo o cambiarle el rol. version_media_protege_publico
// y version_media_protege_master (base) rechazan lo que no corresponde.
async function eliminarMedio(m, out) {
  const r = await ZA.sb.from('version_media').delete().eq('id', m.id);
  if (r.error) return setStatus(out, errText(r.error), 'err');
  const nota = await limpiarBucket([m.file_path]);
  await recargar(`${m.role} eliminado.` + nota);
}
async function cambiarRol(m, nuevo, out) {
  const r = await ZA.sb.from('version_media').update({ role: nuevo }).eq('id', m.id);
  if (r.error) return setStatus(out, errText(r.error), 'err');
  await recargar(`Archivo marcado como ${nuevo}.`);
}

// HdU-19. Todo o nada: si una versión no se puede borrar, no se borra nada.
async function eliminarTema(track, out) {
  const r = await ZA.sb.rpc('borrar_tema', { p_track_id: track.id });
  if (r.error) return setStatus(out, errText(r.error), 'err');
  const nota = await limpiarBucket(r.data || []);
  st.abierto.delete(track.id);
  await recargar(`«${track.title}» eliminado con sus versiones.` + nota);
  // El listado legado no sabe que el tema ya no existe: se le pide recargar.
  document.dispatchEvent(new CustomEvent('zg-tracks-cambiaron'));
}

async function marcarFallida(m) {
  const { error } = await ZA.sb.from('version_media').update({ status: 'FAILED' }).eq('id', m.id);
  if (error) return setStatus(root.querySelector('#zg-global'), errText(error), 'err');
  await recargar('Subida incompleta marcada como FAILED.');
}

function tablaMedia(v, titulo, out) {
  const filas = mediaDe(v.id).sort((a, b) => a.role.localeCompare(b.role));
  if (filas.length === 0) return el('p', { class: 'zg-nota', text: 'Esta versión aún no tiene archivos.' });
  const bloqueada = v.is_public || v.stage === 'RELEASED';
  return el('div', { class: 'zg-scroll' }, el('table', { class: 'zg-tabla' },
    el('thead', {}, el('tr', {}, ['Rol', 'Archivo', 'Formato', 'Tamaño', 'Duración', 'Estado', ''].map((h) => el('th', { text: h })))),
    el('tbody', {}, filas.flatMap((m) => {
      const viejo = pendingViejo(m);
      const acc = [];
      const extra = [];
      if (m.status === 'UPLOADED') {
        const b = el('button', { class: 'btn ghost sm', type: 'button', text: 'Oír' });
        b.addEventListener('click', () => reproducir(m, titulo, b));
        acc.push(b);
      }
      if (viejo) {
        const b = el('button', { class: 'btn danger sm', type: 'button', text: 'Marcar fallida' });
        b.addEventListener('click', () => marcarFallida(m));
        acc.push(b);
      }
      // HdU-18: cambiar rol si el otro está libre; eliminar archivo. Se ocultan
      // cuando la base los rechazaría (pública / RELEASED): comodidad, no seguridad.
      const otro = m.role === 'MASTER' ? 'LISTEN' : 'MASTER';
      const otroLibre = !mediaDe(v.id).some((x) => x.role === otro && x.status !== 'FAILED');
      if (!bloqueada && otroLibre && m.status === 'UPLOADED') {
        const b = el('button', { class: 'btn ghost sm', type: 'button', text: `Cambiar a ${otro}` });
        b.addEventListener('click', () => cambiarRol(m, otro, out));
        acc.push(b);
      }
      if (!bloqueada) {
        const b = el('button', { class: 'btn danger sm', type: 'button', text: 'Eliminar archivo' });
        acc.push(b);
        extra.push(el('tr', {}, el('td', { colspan: '7' },
          confirmarInline(b, `¿Borrar ${m.file_name} (${fmtBytes(m.size_bytes)})? Se borra del bucket.`, () => eliminarMedio(m, out)))));
      }
      return [el('tr', {},
        el('td', {}, el('span', { class: 'pill' + (m.role === 'MASTER' ? ' master' : ' on'), text: m.role })),
        el('td', { class: 'mono', text: m.file_name }),
        el('td', { text: m.content_type }),
        el('td', { text: fmtBytes(m.size_bytes) }),
        el('td', { text: fmtDur(m.duration_seconds) }),
        el('td', {}, el('span', {
          class: 'pill' + (m.status === 'UPLOADED' ? ' on' : m.status === 'FAILED' || viejo ? ' warn' : ''),
          text: viejo ? 'SUBIDA INCOMPLETA' : m.status
        })),
        el('td', {}, el('div', { class: 'row-actions' }, acc))), ...extra];
    }))));
}

function bloqueVersion(track, v, n) {
  const out = status();
  const chips = el('div', { class: 'zg-chips' }, STAGES.map((s) => {
    const c = el('button', { class: 'zg-chip' + (s === v.stage ? ' on' : ''), type: 'button', text: s });
    if (s === v.stage) c.disabled = true;
    else c.addEventListener('click', () => cambiarEtapa(v, s, out));
    return c;
  }));
  const ultimo = st.stageLog.find((l) => l.version_id === v.id);
  const pub = el('button', { class: 'btn sm', type: 'button', text: v.is_public ? 'Publicada' : 'Publicar esta versión' });
  if (v.is_public || !listenConfirmado(v.id)) {
    pub.disabled = true;
    if (!v.is_public) pub.title = 'Necesita un archivo LISTEN confirmado.';
  } else pub.addEventListener('click', () => publicar(v, out));

  return el('div', { class: 'zg-version' },
    el('div', { class: 'track-head' },
      el('div', {},
        el('div', { class: 'track-title', text: `Versión ${n} · ${fmtFechaHora(v.created_at)}` }),
        el('div', { class: 'meta' },
          v.is_public ? el('span', { class: 'pill on', text: 'Pública' }) : null,
          v.notes ? el('span', { text: 'Notas: ' + v.notes }) : null,
          ultimo ? el('span', { text: `Etapa desde ${fmtFechaHora(ultimo.changed_at)}` + (ultimo.stage_from ? ` (antes ${ultimo.stage_from})` : '') }) : null)),
      pub),
    chips,
    el('p', { class: 'zg-nota', text: 'RELEASED exige un MASTER confirmado: la base rechaza el cambio si falta.' }),
    tablaMedia(v, track.title, out),
    formSubida({ track, version: v }),
    bloqueEliminarVersion(track, v, out),
    out);
}

// HdU-17. Enumera lo que se va. Si la base lo rechaza (pública, RELEASED,
// lanzamiento programado), el mensaje aparece en `out` tal cual.
function bloqueEliminarVersion(track, v, out) {
  const medios = mediaDe(v.id);
  const bytes = medios.reduce((a, m) => a + (m.size_bytes || 0), 0);
  const shares = st.shares.filter((s) => s.version_id === v.id && estadoShare(s) === 'VIGENTE').length;
  const btn = el('button', { class: 'btn danger sm', type: 'button', text: 'Eliminar versión' });
  if (v.is_public) { btn.disabled = true; btn.title = 'Despublica el tema antes de borrar esta versión.'; }
  if (v.stage === 'RELEASED') { btn.disabled = true; btn.title = 'Una versión RELEASED no se borra; cambia la etapa primero.'; }
  const q = `¿Borrar la versión ${fmtFechaHora(v.created_at)} de «${track.title}»? Se van ${medios.length} archivo(s) (${fmtBytes(bytes)}), ${shares} acceso(s) vigente(s) y el historial de etapas. Queda rastro en la bitácora.`;
  return el('div', { class: 'row-actions', style: 'margin-top:12px' }, btn, confirmarInline(btn, q, () => eliminarVersion(v, out)));
}

// HdU-19. "Eliminar tema completo": el legado ya no borra temas con versiones.
function bloqueEliminarTema(track, out) {
  const vs = versionesDe(track.id);
  const btn = el('button', { class: 'btn danger sm', type: 'button', text: 'Eliminar tema completo' });
  const q = `¿Borrar «${track.title}» con sus ${vs.length} versión(es), todos sus archivos y la maqueta legada? Si alguna versión está pública o en un lanzamiento, no se borra nada.`;
  return el('div', { class: 'row-actions', style: 'margin-top:16px' }, btn, confirmarInline(btn, q, () => eliminarTema(track, out)));
}

/* ───────────── lanzamiento (HdU-20, 21, 22) ───────────── */

async function guardarFecha(rel, ymd, out) {
  const r = await ZA.sb.from('releases').update({ release_date: estrenoISO(ymd) }).eq('id', rel.id);
  if (r.error) return setStatus(out, errText(r.error), 'err');
  await recargar(ymd ? 'Fecha de estreno: ' + fmtFecha(estrenoISO(ymd)) + '.' : 'Fecha de estreno quitada.');
}
async function cambiarEstadoRelease(rel, nuevo, out) {
  const r = await ZA.sb.from('releases').update({ status: nuevo }).eq('id', rel.id);
  if (r.error) return setStatus(out, errText(r.error), 'err');
  await recargar(`Lanzamiento en ${nuevo}.`);
}
async function guardarPlataformas(rel, lista, out) {
  const r = await ZA.sb.from('releases').update({ platforms: lista }).eq('id', rel.id);
  if (r.error) return setStatus(out, errText(r.error), 'err');
  await recargar('Plataformas guardadas.');
}
async function crearLanzamiento(track, ymd, out) {
  const r = await ZA.sb.rpc('crear_single', { p_track_id: track.id, p_release_date: estrenoISO(ymd) });
  if (r.error) return setStatus(out, errText(r.error), 'err');
  await recargar(ymd ? 'Lanzamiento creado con estreno el ' + fmtFecha(estrenoISO(ymd)) + '.' : 'Lanzamiento creado sin fecha.');
}
async function eliminarLanzamiento(rel, out) {
  const r = await ZA.sb.from('releases').delete().eq('id', rel.id);
  if (r.error) return setStatus(out, errText(r.error), 'err');
  await recargar('Lanzamiento eliminado. El tema y sus versiones siguen intactos.');
}

function bloqueLanzamiento(track) {
  const out = status();
  if (!admiteEstreno(track.id)) {
    return el('div', { class: 'zg-sub' }, el('p', { class: 'eyebrow', text: 'Lanzamiento' }),
      el('p', { class: 'zg-nota', text: 'La fecha de estreno se habilita cuando una versión llega a MASTERING o RELEASE_READY.' }));
  }
  if (st.falta03) {
    return el('div', { class: 'zg-sub' }, el('p', { class: 'eyebrow', text: 'Lanzamiento' }),
      el('p', { class: 'zg-nota', text: 'La fecha de estreno vive en la tabla de lanzamientos (fix-03). Ejecuta fix-03 y fix-10 en Supabase para activarla.' }));
  }
  const rel = releaseDe(track.id);
  if (!rel) {
    const fecha = el('input', { type: 'date', min: hoyMas(1) });
    const btn = el('button', { class: 'btn primary sm', type: 'button', text: 'Fijar fecha de estreno' });
    btn.addEventListener('click', async () => { btn.disabled = true; await crearLanzamiento(track, fecha.value, out); btn.disabled = false; });
    return el('div', { class: 'zg-sub' }, el('p', { class: 'eyebrow', text: 'Lanzamiento' }),
      el('p', { class: 'zg-nota', text: 'Sin lanzamiento. Fija una fecha (o crea el lanzamiento sin fecha y decídela después). Un tema = un single.' }),
      el('div', { class: 'grid2' }, el('div', { class: 'field' }, el('label', { class: 'lbl', text: 'Fecha de estreno (opcional)' }), fecha), el('div', { class: 'field' }, btn)),
      out);
  }
  const terminal = rel.status === 'RELEASED';
  const fecha = el('input', { type: 'date', value: estrenoYMD(rel.release_date), min: terminal ? null : hoyMas(1) });
  if (terminal) { fecha.disabled = true; fecha.title = 'Congelada al publicar (RELEASED_INMUTABLE).'; }
  const guardar = el('button', { class: 'btn primary sm', type: 'button', text: 'Guardar fecha' });
  guardar.disabled = terminal;
  guardar.addEventListener('click', () => guardarFecha(rel, fecha.value, out));
  const quitar = ['PLANNING', 'READY'].includes(rel.status) && rel.release_date
    ? el('button', { class: 'btn ghost sm', type: 'button', text: 'Quitar fecha' }) : null;
  if (quitar) quitar.addEventListener('click', () => guardarFecha(rel, '', out));

  // Aviso, no bloqueo: menos de 14 días y no programado.
  const dias = rel.release_date ? Math.round((new Date(rel.release_date) - Date.now()) / 86400000) : null;
  const aviso = dias !== null && dias < AVISO_ANTELACION_DIAS && rel.status !== 'SCHEDULED' && !terminal
    ? el('p', { class: 'zg-nota', text: `Faltan ${dias} día(s) y el lanzamiento no está programado (SCHEDULED). Las plataformas piden el material con antelación.` }) : null;

  const chips = el('div', { class: 'zg-chips' }, REL_STATES.map((s) => {
    const c = el('button', { class: 'zg-chip' + (s === rel.status ? ' on' : ''), type: 'button', text: s });
    if (s === rel.status || terminal) c.disabled = true;
    else c.addEventListener('click', () => cambiarEstadoRelease(rel, s, out));
    if (terminal && s !== rel.status) c.title = 'RELEASED es terminal.';
    return c;
  }));

  const plats = el('div', { class: 'zg-chips' }, PLATAFORMAS.map((p) => {
    const c = el('button', { class: 'zg-chip' + ((rel.platforms || []).includes(p) ? ' on' : ''), type: 'button', text: p });
    c.style.cursor = 'pointer';
    if (terminal) c.disabled = true;
    else c.addEventListener('click', () => {
      const cur = new Set(rel.platforms || []);
      cur.has(p) ? cur.delete(p) : cur.add(p);
      guardarPlataformas(rel, [...cur], out);
    });
    return c;
  }));

  const nodos = [
    el('p', { class: 'eyebrow', text: `Lanzamiento · ${rel.release_type} · ${rel.status}` }),
    el('div', { class: 'grid2' },
      el('div', { class: 'field' }, el('label', { class: 'lbl', text: terminal ? 'Fecha de estreno (congelada)' : 'Fecha de estreno' }), fecha),
      el('div', { class: 'field' }, el('div', { class: 'row-actions' }, guardar, quitar))),
    aviso,
    el('p', { class: 'zg-nota', text: 'Estado. READY/SCHEDULED exigen una versión RELEASE_READY con MASTER confirmado; SCHEDULED exige fecha; RELEASED congela todo.' }),
    chips,
    el('p', { class: 'zg-nota', text: 'Plataformas' }), plats
  ];
  if (rel.status === 'PLANNING') {
    const del = el('button', { class: 'btn danger sm', type: 'button', text: 'Eliminar lanzamiento' });
    nodos.push(el('div', { class: 'row-actions', style: 'margin-top:12px' }, del,
      confirmarInline(del, '¿Eliminar el lanzamiento? El tema y sus versiones no se tocan.', () => eliminarLanzamiento(rel, out))));
  }
  nodos.push(out);
  return el('div', { class: 'zg-sub' }, nodos);
}

function detalleTema(track) {
  const vs = versionesDe(track.id);
  const nodos = [];
  const publicada = vs.find((v) => v.is_public);
  if (publicada && track.file_path && !mediaDe(publicada.id).some((m) => m.file_path === track.file_path)) {
    nodos.push(el('div', { class: 'zg-banner', text:
      'La maqueta sirve un archivo que no es el de la versión publicada. Probablemente se subió por el formulario legado. ' +
      'Regla (ADR-005): a un tema con versiones se le sube una versión nueva, no una maqueta.' }));
  }
  if (!publicada && track.file_path && vs.length > 0) {
    nodos.push(el('p', { class: 'zg-nota', text: 'Mientras no publiques una versión, la maqueta sigue sirviendo su archivo legado.' }));
  }
  nodos.push(bloqueLanzamiento(track));
  nodos.push(formSubida({ track, version: null }));
  vs.forEach((v, i) => nodos.push(bloqueVersion(track, v, vs.length - i)));
  if (vs.length > 0) {
    const out = status();
    nodos.push(bloqueEliminarTema(track, out), out);
  }
  return el('div', { class: 'edit open' }, nodos);
}

function etapaActual(trackId) {
  const vs = versionesDe(trackId);        // ya viene ordenado del más nuevo al más viejo
  return vs.length ? vs[0].stage : null;
}

function tarjetaCatalogo() {
  const filtro = el('select', { 'aria-label': 'Filtrar por etapa' },
    ['TODAS', 'SIN VERSIONES', ...STAGES].map((s) => el('option', { value: s, text: s, selected: s === st.filtro })));
  filtro.addEventListener('change', () => { st.filtro = filtro.value; pintar(); });

  const lista = st.tracks.filter((t) => {
    const e = etapaActual(t.id);
    if (st.filtro === 'TODAS') return true;
    if (st.filtro === 'SIN VERSIONES') return e === null;
    return e === st.filtro;
  });

  return el('div', { class: 'card' },
    el('div', { class: 'head' }, el('h2', { text: 'Catálogo y versiones' }), el('span', { class: 'pill', text: `${st.versions.length} versiones` })),
    el('div', { class: 'zg-filtro' }, el('label', { class: 'lbl', text: 'Etapa', style: 'margin:0' }), filtro),
    lista.length === 0 ? el('div', { class: 'empty', text: 'Ningún tema en esa etapa.' }) : null,
    lista.map((t) => {
      const e = etapaActual(t.id);
      const n = versionesDe(t.id).length;
      const abierto = st.abierto.has(t.id);
      const btn = el('button', { class: 'btn ghost sm', type: 'button', text: abierto ? 'Cerrar' : 'Abrir' });
      btn.addEventListener('click', () => {
        if (abierto) st.abierto.delete(t.id); else st.abierto.add(t.id);
        pintar();
      });
      return el('div', { class: 'track' },
        el('div', { class: 'track-head' },
          el('div', { class: 'track-id' },
            el('div', { class: 'track-title', text: t.title || t.slug }),
            el('div', { class: 'meta' },
              el('span', { class: 'pill' + (e ? ' on' : ' off'), text: e || 'SIN VERSIONES · LEGADO' }),
              el('span', { text: `${n} ${n === 1 ? 'versión' : 'versiones'}` }),
              el('span', { class: 'pill' + (t.visible ? ' on' : ' off'), text: t.visible ? 'Visible' : 'Oculta' }),
              (() => { const r = releaseDe(t.id); return r && r.release_date
                ? el('span', { class: 'pill' + (r.status === 'RELEASED' ? ' on' : ' master'), text: (r.status === 'RELEASED' ? 'Estrenado ' : 'Estreno ') + fmtFecha(r.release_date) })
                : r ? el('span', { class: 'pill off', text: 'Lanzamiento sin fecha' }) : null; })())),
          btn),
        abierto ? detalleTema(t) : null);
    }));
}

/* ───────────── colaboradores y shares (HdU-12, 13, 15) ───────────── */

async function altaColaborador(email, nombre, rol, out) {
  if (!email || email.indexOf('@') < 1) return setStatus(out, 'Escribe un correo válido.', 'err');
  if (!nombre) return setStatus(out, 'Escribe el nombre con que lo vas a reconocer.', 'err');
  const b = await ZA.sb.rpc('buscar_usuario_por_correo', { p_email: email });
  if (b.error) return setStatus(out, errText(b.error), 'err');
  if (!b.data) {
    return setStatus(out, 'Ese correo no tiene cuenta. Pídele que inicie sesión una vez en zignalez.cl (o en /productor.html) con ese correo y vuelve a intentarlo.', 'err');
  }
  if (st.collabs.some((c) => c.user_id === b.data)) return setStatus(out, 'Esa persona ya es colaborador.', 'err');
  const r = await ZA.sb.from('collaborators').insert({ user_id: b.data, display_name: nombre, role: rol });
  if (r.error) return setStatus(out, errText(r.error), 'err');
  await recargar(`${nombre} quedó como ${rol}.`);
}

async function cambiarActivo(c, activo) {
  const r = await ZA.sb.from('collaborators').update({ active: activo }).eq('user_id', c.user_id);
  if (r.error) return setStatus(root.querySelector('#zg-global'), errText(r.error), 'err');
  await recargar(activo ? `${c.display_name} reactivado.` : `${c.display_name} suspendido: su acceso se cortó.`);
}

// Compartir y renovar usan el mismo upsert: el trigger de fix-08 fuerza autor,
// fecha y plazo, y trata "vencido/revocado → vigente" como un share nuevo.
async function compartir(versionId, collaboratorId, fecha, out) {
  if (!versionId) return setStatus(out, 'Elige una versión.', 'err');
  if (!fecha) return setStatus(out, 'La fecha de vencimiento es obligatoria.', 'err');
  const r = await ZA.sb.from('version_shares').upsert(
    { version_id: versionId, collaborator_id: collaboratorId, expires_at: venceEl(fecha), revoked_at: null },
    { onConflict: 'version_id,collaborator_id' });
  if (r.error) return setStatus(out, errText(r.error), 'err');
  await recargar('Compartido hasta el ' + fmtFecha(venceEl(fecha)) + '.');
}

async function revocar(s) {
  const r = await ZA.sb.from('version_shares').update({ revoked_at: new Date().toISOString() })
    .eq('version_id', s.version_id).eq('collaborator_id', s.collaborator_id);
  if (r.error) return setStatus(root.querySelector('#zg-global'), errText(r.error), 'err');
  await recargar('Acceso revocado. Un enlace de audio ya abierto puede seguir sonando hasta 60 s.');
}

function etiquetaVersion(v) {
  const t = trackDe(v.track_id);
  return `${t ? t.title : '¿?'} · ${v.stage} · ${fmtFecha(v.created_at)}`;
}

function formCompartir(c) {
  const out = status();
  const compartibles = st.versions.filter((v) => listenConfirmado(v.id));
  if (compartibles.length === 0) {
    return el('p', { class: 'zg-nota', text: 'No hay versiones con archivo LISTEN confirmado. Sin LISTEN el colaborador no oiría nada, así que no se puede compartir.' });
  }
  const sel = el('select', {}, el('option', { value: '', text: 'Elige una versión…' }),
    compartibles.map((v) => el('option', { value: v.id, text: etiquetaVersion(v) })));
  const fecha = el('input', { type: 'date', value: hoyMas(PLAZO_DEFAULT_DIAS), min: hoyMas(1), max: hoyMas(PLAZO_MAX_DIAS) });
  const btn = el('button', { class: 'btn primary sm', type: 'button', text: 'Compartir' });
  btn.addEventListener('click', async () => {
    btn.disabled = true;
    await compartir(sel.value, c.user_id, fecha.value, out);
    btn.disabled = false;
  });
  return el('div', { class: 'zg-sub' },
    el('div', { class: 'grid2' },
      el('div', { class: 'field' }, el('label', { class: 'lbl', text: 'Versión' }), sel),
      el('div', { class: 'field' }, el('label', { class: 'lbl', text: `Vence (obligatorio · máx. ${PLAZO_MAX_DIAS} días)` }), fecha)),
    el('p', { class: 'zg-nota', text:
      'Se comparte solo el archivo de escucha (LISTEN); el MASTER nunca. Temas con voz invitada: no los compartas sin autorización escrita de quien canta.' }),
    btn, out);
}

function tarjetaColaboradores() {
  const out = status();
  const email = el('input', { type: 'email', placeholder: 'correo@ejemplo.cl', autocomplete: 'off' });
  const nombre = el('input', { type: 'text', placeholder: 'MillDiass', autocomplete: 'off' });
  const rol = el('select', {}, ROLES_COLAB.map((r) => el('option', { value: r, text: r })));
  const alta = el('button', { class: 'btn primary sm', type: 'button', text: 'Dar de alta' });
  alta.addEventListener('click', async () => {
    alta.disabled = true;
    await altaColaborador(email.value.trim(), nombre.value.trim(), rol.value, out);
    alta.disabled = false;
  });

  const lista = st.collabs.map((c) => {
    const estado = estadoColab(c);
    const suyos = st.shares.filter((s) => s.collaborator_id === c.user_id)
      .sort((a, b) => new Date(b.shared_at) - new Date(a.shared_at));
    const toggle = el('button', { class: 'btn sm' + (c.active ? ' danger' : ''), type: 'button', text: c.active ? 'Suspender' : 'Reactivar' });
    toggle.addEventListener('click', () => cambiarActivo(c, !c.active));

    return el('div', { class: 'track' },
      el('div', { class: 'track-head' },
        el('div', { class: 'track-id' },
          el('div', { class: 'track-title', text: c.display_name }),
          el('div', { class: 'meta' },
            el('span', { class: 'pill', text: c.role }),
            el('span', { class: 'pill' + (estado === 'ACTIVO' ? ' on' : estado === 'ACCESO VENCIDO' ? ' warn' : ' off'), text: estado }),
            el('span', { text: 'Alta ' + fmtFecha(c.created_at) }))),
        toggle),
      estado === 'ACCESO VENCIDO'
        ? el('p', { class: 'zg-nota', text: 'Figura activo pero ya no ve nada: todos sus accesos vencieron.' }) : null,
      suyos.length ? el('div', { class: 'zg-scroll' }, el('table', { class: 'zg-tabla' },
        el('thead', {}, el('tr', {}, ['Versión', 'Compartida', 'Vence', 'Estado', ''].map((h) => el('th', { text: h })))),
        el('tbody', {}, suyos.map((s) => {
          const v = versionDe(s.version_id);
          const e = estadoShare(s);
          const acc = [];
          if (e === 'VIGENTE') {
            const b = el('button', { class: 'btn danger sm', type: 'button', text: 'Revocar' });
            b.addEventListener('click', () => revocar(s));
            acc.push(b);
          } else {
            const b = el('button', { class: 'btn ghost sm', type: 'button', text: `Renovar ${PLAZO_DEFAULT_DIAS} días` });
            b.addEventListener('click', () => compartir(s.version_id, s.collaborator_id, hoyMas(PLAZO_DEFAULT_DIAS), root.querySelector('#zg-global')));
            acc.push(b);
          }
          return el('tr', {},
            el('td', { text: v ? etiquetaVersion(v) : s.version_id }),
            el('td', { text: fmtFecha(s.shared_at) }),
            el('td', { text: fmtFecha(s.expires_at) }),
            el('td', {}, el('span', { class: 'pill' + (e === 'VIGENTE' ? ' on' : ' off'), text: e })),
            el('td', {}, el('div', { class: 'row-actions' }, acc)));
        })))) : null,
      c.active ? formCompartir(c) : null);
  });

  return el('div', { class: 'card' },
    el('div', { class: 'head' }, el('h2', { text: 'Colaboradores' }), el('span', { class: 'pill', text: `${st.collabs.length}` })),
    el('div', { class: 'grid3' },
      el('div', { class: 'field' }, el('label', { class: 'lbl', text: 'Correo con cuenta' }), email),
      el('div', { class: 'field' }, el('label', { class: 'lbl', text: 'Nombre' }), nombre),
      el('div', { class: 'field' }, el('label', { class: 'lbl', text: 'Rol' }), rol)),
    alta, out,
    st.collabs.length === 0 ? el('div', { class: 'empty', text: 'Sin colaboradores todavía.' }) : null,
    lista);
}

/* ───────────── bitácora (HdU-16) ───────────── */

function describirAuditoria(a) {
  const f = a.fila_despues || a.fila_antes || {};
  const quien = st.collabs.find((c) => c.user_id === (f.user_id || f.collaborator_id));
  const nombre = quien ? quien.display_name : 'colaborador';
  if (a.tabla === 'collaborators') {
    if (a.accion === 'INSERT') return `Alta de ${nombre}`;
    if (a.accion === 'DELETE') return `Baja de ${nombre}`;
    if (a.fila_antes && a.fila_despues && a.fila_antes.active !== a.fila_despues.active) {
      return (a.fila_despues.active ? 'Reactivado ' : 'Suspendido ') + nombre;
    }
    return `Cambio en ${nombre}`;
  }
  const v = versionDe(f.version_id);
  const cual = v ? etiquetaVersion(v) : 'una versión';
  if (a.accion === 'INSERT') return `Compartido con ${nombre}: ${cual}`;
  if (a.accion === 'DELETE') return `Share borrado: ${nombre} · ${cual}`;
  if (a.fila_despues?.revoked_at && !a.fila_antes?.revoked_at) return `Revocado a ${nombre}: ${cual}`;
  return `Renovado/editado para ${nombre}: ${cual} (vence ${fmtFecha(a.fila_despues?.expires_at)})`;
}

function tarjetaBitacora() {
  return el('div', { class: 'card' },
    el('div', { class: 'head' }, el('h2', { text: 'Bitácora de acceso' }), el('span', { class: 'pill', text: 'últimos 25' })),
    el('p', { class: 'zg-nota', text: 'Registra altas, suspensiones, shares y revocaciones. No registra qué archivos se escucharon: sin servidor propio eso no se puede garantizar.' }),
    st.audit.length === 0 ? el('div', { class: 'empty', text: 'Sin movimientos.' }) :
      el('div', { class: 'zg-scroll' }, el('table', { class: 'zg-tabla' },
        el('tbody', {}, st.audit.map((a) => el('tr', {},
          el('td', { class: 'mono', text: fmtFechaHora(a.ocurrido_el) }),
          el('td', { text: describirAuditoria(a) })))))));
}

/* ───────────── pintar ───────────── */

function pintar() {
  const global = root.querySelector('#zg-global');
  const msg = global ? global.textContent : '';
  const kind = global?.classList.contains('err') ? 'err' : global?.classList.contains('ok') ? 'ok' : null;
  root.textContent = '';
  if (st.falta) {
    root.appendChild(el('div', { class: 'zg-banner', text:
      'Falta ejecutar sitio-zignalez/supabase/fix-08-produccion-colaboradores.sql en Supabase. ' +
      'Sin él no hay plazo obligatorio en los shares, ni bitácora, ni vista de productor: colaboradores y shares quedan deshabilitados.' }));
  }
  root.appendChild(status(msg, kind)).id = 'zg-global';
  root.appendChild(tarjetaCatalogo());
  if (!st.falta) {
    root.appendChild(tarjetaColaboradores());
    root.appendChild(tarjetaBitacora());
  }
}

/* ───────────── arranque ───────────── */

// HdU-19: el legado consulta esto antes de borrar un tema (admin.js).
window.ZignalezProduccion = {
  versionesDe: (trackId) => versionesDe(trackId).length
};

function arrancar() {
  ZA = window.ZignalezAdmin;
  root = document.getElementById('zg-produccion');
  if (!ZA || !root) return;
  root.textContent = '';
  root.appendChild(el('div', { class: 'card' }, el('div', { class: 'empty', text: 'Cargando producción…' })));
  recargar();
}

document.addEventListener('zg-admin-ready', arrancar);
document.addEventListener('zg-admin-signout', () => {
  ZA = null;
  st.abierto.clear();
  const r = document.getElementById('zg-produccion');
  if (r) r.textContent = '';
});
// El módulo carga diferido: si el admin ya quedó validado antes, arrancar ya.
if (window.ZignalezAdmin) arrancar();
