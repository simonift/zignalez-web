// productor.js · Zignalez · 24-09-2026
//
// Vista del productor (PROMPT_MAESTRO_HDU_CATALOGO v1.1, HdU-14).
//
// Qué ve lo decide la BASE, no este archivo: todo sale de la RPC
// mis_versiones_compartidas() (fix-08), que solo devuelve versiones con share
// vigente, colaborador activo y archivo LISTEN confirmado. Un fan o un
// colaborador sin shares recibe una lista vacía. El MASTER no aparece nunca.
//
// El audio se baja con una URL firmada de 60 s y se reproduce desde memoria:
// revocar corta el acceso a más tardar 60 s después (HdU-13, ventana declarada).

const SUPABASE_URL = 'https://fdahfltjaqzdgmsgedcp.supabase.co';
const SUPABASE_KEY = 'sb_publishable_TK7Jf1kWDATJ8o9Rmp7-Ew_61rPjCib';
const BUCKET = 'maquetas';
const URL_TTL_S = 60;

const sb = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY, {
  auth: { flowType: 'pkce', detectSessionInUrl: true, persistSession: true, autoRefreshToken: true }
});

const $ = (id) => document.getElementById(id);
let blobActual = null;
let cargado = false;

function show(screen) {
  document.querySelectorAll('.screen').forEach((s) => s.classList.remove('active'));
  $('screen-' + screen).classList.add('active');
}
function setStatus(n, msg, kind) {
  n.textContent = msg || '';
  n.classList.remove('ok', 'err');
  if (kind) n.classList.add(kind);
  n.classList.toggle('hidden', !msg);
}
function el(tag, cls, text) {
  const n = document.createElement(tag);
  if (cls) n.className = cls;
  if (text !== undefined) n.textContent = text;
  return n;
}
const fmtFecha = (iso) => new Date(iso).toLocaleDateString('es-CL', { day: '2-digit', month: '2-digit', year: 'numeric' });
function fmtDur(sec) {
  const n = parseInt(sec, 10);
  return isFinite(n) && n >= 0 ? Math.floor(n / 60) + ':' + String(n % 60).padStart(2, '0') : '';
}

/* ── login ── */
$('login-form').addEventListener('submit', async (ev) => {
  ev.preventDefault();
  const email = $('email').value.trim();
  const out = $('login-status');
  if (!email || email.indexOf('@') < 1) return setStatus(out, 'Escribe un correo válido.', 'err');
  $('btn-login').disabled = true;
  setStatus(out, 'Enviando enlace…');
  const { error } = await sb.auth.signInWithOtp({ email, options: { emailRedirectTo: window.location.href.split('#')[0] } });
  $('btn-login').disabled = false;
  if (error) return setStatus(out, error.message || 'No pudimos enviar el enlace.', 'err');
  setStatus(out, 'Listo. Revisa tu correo y abre el enlace desde este mismo dispositivo.', 'ok');
});

$('btn-logout').addEventListener('click', () => sb.auth.signOut());

function detener() {
  const p = $('player');
  try { p.pause(); } catch (e) { /* nada */ }
  p.removeAttribute('src');
  if (blobActual) { URL.revokeObjectURL(blobActual); blobActual = null; }
  $('player-bar').classList.remove('open');
}

/* ── reproducción: URL firmada corta → blob en memoria ── */
async function reproducir(item, btn) {
  const out = $('lista-status');
  btn.disabled = true;
  setStatus(out, '');
  try {
    const { data, error } = await sb.storage.from(BUCKET).createSignedUrl(item.file_path, URL_TTL_S);
    if (error || !data?.signedUrl) throw new Error(error?.message || 'Sin enlace. ¿El acceso venció? Recarga la página.');
    const r = await fetch(data.signedUrl);
    if (!r.ok) throw new Error('El archivo no está disponible (' + r.status + '). ¿El acceso venció?');
    const blob = await r.blob();
    detener();
    blobActual = URL.createObjectURL(blob);
    $('now').textContent = 'Sonando: ' + item.titulo;
    $('player-bar').classList.add('open');
    $('player').src = blobActual;
    $('player').play().catch(() => {});
  } catch (e) {
    setStatus(out, e.message, 'err');
  } finally {
    btn.disabled = false;
  }
}

/* ── lista ── */
async function cargar() {
  const lista = $('lista');
  const { data, error } = await sb.rpc('mis_versiones_compartidas');
  lista.textContent = '';
  if (error) {
    lista.appendChild(el('div', 'empty', 'No se pudo cargar el material. ' + (error.message || '')));
    return;
  }
  if (!data || data.length === 0) {
    lista.appendChild(el('div', 'empty', 'No tienes material compartido vigente.'));
    return;
  }
  data.forEach((item) => {
    const fila = el('div', 'item');
    const izq = el('div');
    izq.appendChild(el('div', 't', item.titulo));
    const meta = el('div', 'meta');
    meta.appendChild(el('span', null, item.etapa));
    if (item.duration_seconds) meta.appendChild(el('span', null, fmtDur(item.duration_seconds)));
    meta.appendChild(el('span', null, 'Vence ' + fmtFecha(item.vence_el)));
    izq.appendChild(meta);
    fila.appendChild(izq);
    const btn = el('button', 'btn sm', item.file_path ? 'Escuchar' : 'Sin audio');
    btn.type = 'button';
    if (item.file_path) btn.addEventListener('click', () => reproducir(item, btn));
    else btn.disabled = true;
    fila.appendChild(btn);
    lista.appendChild(fila);
  });
}

// Misma regla que el panel: solo onAuthStateChange, sin await dentro del callback.
sb.auth.onAuthStateChange((event, session) => {
  if (event === 'SIGNED_OUT' || !session?.user) {
    cargado = false;
    detener();
    show('login');
    return;
  }
  $('who').textContent = session.user.email || '';
  show('lista');
  if (!cargado) {
    cargado = true;
    setTimeout(cargar, 0);
  }
});
