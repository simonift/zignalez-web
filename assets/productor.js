// productor.js · Zignalez · 29-09-2026
//
// Vista del productor (PROMPT_MAESTRO_HDU_CATALOGO HdU-14; PROMPT_MAESTRO_PRODUCTOR_ZIGNALEZ).
//
// Qué ve lo decide la BASE, no este archivo: todo sale de la RPC
// mis_versiones_compartidas() (fix-08, + peaks en fix-13), que solo devuelve versiones con
// share vigente, colaborador activo y archivo LISTEN confirmado. El MASTER no aparece nunca.
//
// El audio se baja con una URL firmada de 60 s y se reproduce desde memoria (blob): revocar
// corta el acceso a más tardar 60 s después (HdU-13). El reproductor del sitio (zp-player.js)
// recibe el blob por `fuente()`; nunca la URL firmada directa.

const SUPABASE_URL = 'https://fdahfltjaqzdgmsgedcp.supabase.co';
const SUPABASE_KEY = 'sb_publishable_TK7Jf1kWDATJ8o9Rmp7-Ew_61rPjCib';
const BUCKET = 'maquetas';
const URL_TTL_S = 60;
const NUEVO_H = 48;

const sb = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY, {
  auth: { flowType: 'pkce', detectSessionInUrl: true, persistSession: true, autoRefreshToken: true }
});

const $ = (id) => document.getElementById(id);
let blobActual = null;
let cargado = false;
let filas = [];

/* Etapas: etiqueta y color; nunca el enum crudo. Un valor desconocido se muestra tal cual. */
const ETAPAS = {
  IDEA: ['Idea', ''], DEMO: ['Demo', ''], RECORDING: ['Grabación', ''], MIXING: ['Mezcla', ''],
  MASTERING: ['Máster', ''], RELEASE_READY: ['Lista para lanzar', 'uv'], RELEASED: ['Lanzada', 'uv']
};

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
const fmtFecha = (iso) => new Date(iso).toLocaleDateString('es-CL', { day: '2-digit', month: '2-digit' });
function fmtDur(sec) {
  const n = parseInt(sec, 10);
  return isFinite(n) && n >= 0 ? Math.floor(n / 60) + ':' + String(n % 60).padStart(2, '0') : '';
}
const rtf = new Intl.RelativeTimeFormat('es-CL', { numeric: 'auto' });
function hace(iso) {
  const ms = Date.now() - new Date(iso).getTime();
  const h = Math.round(ms / 36e5);
  if (h < 1) return 'hace un momento';
  if (h < 24) return rtf.format(-h, 'hour');
  return rtf.format(-Math.round(h / 24), 'day');
}
/* Días enteros hasta el vencimiento (contados desde hoy a medianoche). */
function diasHasta(iso) {
  const hoy = new Date(); hoy.setHours(0, 0, 0, 0);
  return Math.ceil((new Date(iso).getTime() - hoy.getTime()) / 864e5);
}

/* Título limpio (cosmético; el dato no se altera):
   "ZIGNALEZ - CARAMELO (LE CARTER)" → { titulo:"CARAMELO", prod:"LE CARTER" }
   "ZIGNALEZ - LUCE BIEN FT ACHEH & D-FOX" → { titulo:"LUCE BIEN FT ACHEH & D-FOX" }
   Si no calza con el patrón, se muestra tal cual. */
function limpiarTitulo(t) {
  let s = String(t || '').trim().replace(/^ZIGNALEZ\s*[-–—]\s*/i, '');
  let prod = '';
  const m = s.match(/^(.*?)\s*\(([^()]+)\)\s*$/);
  if (m && !/^(ft|feat)\b/i.test(m[2].trim())) { s = m[1].trim(); prod = m[2].trim(); }
  return { titulo: s || String(t || ''), prod };
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

/* ── disco quieto en el login (decorativo) ── */
function montarLoginDisco() {
  const raiz = $('login-disco');
  if (!raiz || raiz.childElementCount) return;
  // Solo la escena: sin transporte. Se construye a mano para no montar un <audio> en el login.
  const zona = el('div', 'zp-zona'), escena = el('div', 'zp-escena'), par = el('div', 'zp-par'), disco = el('div', 'zp-disco');
  par.appendChild(el('div', 'zp-canto2')); par.appendChild(el('div', 'zp-canto'));
  disco.appendChild(el('div', 'zp-iris'));
  const label = el('div', 'zp-label'); label.appendChild(el('span', null, 'Zignalez')); disco.appendChild(label);
  disco.appendChild(el('div', 'zp-hoyo'));
  par.appendChild(disco); escena.appendChild(par); zona.appendChild(escena); zona.appendChild(el('div', 'zp-sombra'));
  const zp = el('div', 'zp visible zp-quieto'); zp.appendChild(zona);
  raiz.appendChild(zp);
}

/* ── reproductor: un solo <audio> (dentro de ZP) alimentado con blobs ── */
function detener() {
  if (window.ZP) ZP.detener();
  if (blobActual) { URL.revokeObjectURL(blobActual); blobActual = null; }
  marcarFila(-1);
}

function marcarFila(i, estado) {
  filas.forEach((f, k) => {
    f.classList.toggle('on', k === i);
    f.classList.toggle('cargando', k === i && estado === 'cargando');
    f.setAttribute('aria-pressed', k === i ? 'true' : 'false');
    const err = f.querySelector('.item-err');
    if (err && k !== i) err.textContent = '';
  });
}

/* URL firmada corta → blob en memoria. Es la ÚNICA fuente que recibe el reproductor. */
async function fuenteDe(item) {
  const { data, error } = await sb.storage.from(BUCKET).createSignedUrl(item.file_path, URL_TTL_S);
  if (error || !data?.signedUrl) throw new Error(error?.message || 'Sin enlace. ¿El acceso venció? Recarga la página.');
  const r = await fetch(data.signedUrl);
  if (!r.ok) throw new Error('El archivo no está disponible (' + r.status + '). ¿El acceso venció?');
  const blob = await r.blob();
  if (blobActual) URL.revokeObjectURL(blobActual);
  blobActual = URL.createObjectURL(blob);
  return blobActual;
}

function montarReproductor() {
  const raiz = $('col-zp');
  raiz.textContent = '';
  ZP.montar(raiz, {
    conDisco: true,
    alReproducir: (item, i) => marcarFila(i, 'cargando'),
    decir: (msg) => {
      const i = ZP.indice();
      if (i < 0 || !filas[i]) return;
      const err = filas[i].querySelector('.item-err');
      const esError = /no se pudo|venció|no está disponible|sin enlace|sin audio/i.test(msg);
      if (err) err.textContent = esError ? msg : '';
      if (!/bajando|cargando/i.test(msg)) filas[i].classList.remove('cargando');
    }
  });
  // El reproductor pegado en móvil no debe tapar el foco (scroll-padding-bottom).
  const publicar = () => document.documentElement.style.setProperty('--zp-h', Math.ceil(raiz.getBoundingClientRect().height) + 'px');
  if (window.ResizeObserver) new ResizeObserver(publicar).observe(raiz);
  publicar();
}

/* ── tarjeta ── */
function tarjeta(item, i, lista) {
  const { titulo, prod } = limpiarTitulo(item.titulo);
  const b = el('button', 'item');
  b.type = 'button'; b.setAttribute('aria-pressed', 'false');
  const ico = el('span', 'item-ico'); ico.setAttribute('aria-hidden', 'true');
  ico.innerHTML = '<svg viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>';
  const txt = el('div', 'item-txt');
  txt.appendChild(el('div', 'item-t', titulo));

  const sub = el('div', 'item-sub');
  if (prod) sub.appendChild(el('span', null, 'prod. ' + prod));
  const et = ETAPAS[item.etapa] || [item.etapa, ''];
  const chip = el('span', 'chip' + (et[1] ? ' ' + et[1] : ''), et[0]);
  sub.appendChild(chip);
  if (item.duration_seconds) sub.appendChild(el('span', null, fmtDur(item.duration_seconds)));
  txt.appendChild(sub);

  const meta = el('div', 'item-meta');
  const dias = diasHasta(item.vence_el);
  if (item.compartida_el) meta.appendChild(el('span', null, 'Compartido ' + hace(item.compartida_el)));
  const venceTxt = dias <= 0 ? 'vence hoy' : dias === 1 ? 'vence mañana' : `vence en ${dias} días (${fmtFecha(item.vence_el)})`;
  meta.appendChild(dias <= 7 ? el('span', 'chip amber', venceTxt) : el('span', null, venceTxt));
  if (item.compartida_el && (Date.now() - new Date(item.compartida_el).getTime()) < NUEVO_H * 36e5) {
    meta.appendChild(el('span', 'chip nuevo', 'Nuevo'));
  }
  txt.appendChild(meta);
  txt.appendChild(el('div', 'item-err'));

  b.appendChild(ico); b.appendChild(txt);
  b.setAttribute('aria-label', `Escuchar ${titulo}${prod ? ', producido por ' + prod : ''}, ${et[0]}`);
  if (item.file_path) b.addEventListener('click', () => ZP.cargar(lista, i));
  else { b.disabled = true; b.querySelector('.item-err').textContent = 'Sin audio disponible'; }
  return b;
}

/* ── lista ── */
async function cargar() {
  const lista = $('lista');
  const { data, error } = await sb.rpc('mis_versiones_compartidas');
  lista.textContent = ''; filas = [];
  if (error) {
    lista.appendChild(el('div', 'empty', 'No se pudo cargar el material. ' + (error.message || '')));
    return;
  }
  if (!data || data.length === 0) {
    const e = el('div', 'empty');
    e.appendChild(el('b', null, 'Nada compartido todavía'));
    e.appendChild(document.createTextNode('Cuando Zignalez te comparta un tema, aparece aquí con su fecha de vencimiento.'));
    lista.appendChild(e);
    $('resumen').textContent = 'Cada acceso tiene fecha de vencimiento. Al vencer o ser revocado, deja de aparecer aquí.';
    return;
  }
  // Lista para el reproductor: la URL se resuelve al reproducir (blob), nunca antes.
  const pistas = data.map((item) => {
    const { titulo, prod } = limpiarTitulo(item.titulo);
    const et = (ETAPAS[item.etapa] || [item.etapa])[0];
    return {
      id: item.version_id, titulo, etiqueta: titulo,
      subtitulo: [prod ? 'prod. ' + prod : '', et, 'vence ' + fmtFecha(item.vence_el)].filter(Boolean).join(' · '),
      peaks: item.peaks || null, duration_seconds: item.duration_seconds || 0,
      fuente: item.file_path ? () => fuenteDe(item) : null
    };
  });
  data.forEach((item, i) => { const f = tarjeta(item, i, pistas); filas.push(f); lista.appendChild(f); });
  ZP.cargar(pistas);
  const masReciente = data.map((d) => d.compartida_el).filter(Boolean).sort().pop();
  $('resumen').textContent = `${data.length} ${data.length === 1 ? 'tema' : 'temas'}` +
    (masReciente ? ` · el más reciente compartido ${hace(masReciente)}` : '') +
    ' · cada acceso tiene fecha de vencimiento.';
}

// Misma regla que el panel: solo onAuthStateChange, sin await dentro del callback.
sb.auth.onAuthStateChange((event, session) => {
  if (event === 'SIGNED_OUT' || !session?.user) {
    cargado = false;
    detener();
    montarLoginDisco();
    show('login');
    return;
  }
  $('who').textContent = session.user.email || '';
  show('lista');
  if (!cargado) {
    cargado = true;
    montarReproductor();
    setTimeout(cargar, 0);
  }
});
