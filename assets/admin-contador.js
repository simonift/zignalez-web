/* admin-contador.js — 03-10-2026
   Contador AGREGADO de escuchas por tema, en el panel de administrador.

   De dónde sale: escuchas_resumen() (fix-14). Devuelve una fila por tema
   visible con oyentes, completadas, primera y última. SIN user_id.

   Por qué no muestra quién: la política de privacidad publicada declara
   "entender el uso del sitio de forma agregada". Una lista por persona
   excede esa finalidad declarada y, según NORMATIVA-DATOS-CL.md §5, eso es
   infracción grave, no leve. El dato existe en public.escuchas desde fix-11;
   lo que falta es declararlo en una versión nueva de la política, no código.

   La columna que importa no es "oyentes" sino la diferencia entre oyentes y
   completadas: cuánta gente abrió un tema y no llegó al final. Un tema con
   muchos oyentes y pocas completadas no está funcionando, aunque el número
   grande diga lo contrario.

   Se monta con zg-admin-ready, igual que admin-produccion y
   admin-diccionario. El cliente viene de window.ZignalezAdmin.
*/
let ZA = null, root = null, cargando = false;

function estilos(){
  if(document.getElementById('zc-css')) return;
  const s = document.createElement('style');
  s.id = 'zc-css';
  s.textContent = `
    #zg-contador .zc-tabla{width:100%;border-collapse:collapse;margin-top:10px;font-size:13px}
    #zg-contador .zc-tabla th{text-align:left;font:400 9px/1 var(--font-m,monospace);letter-spacing:.14em;
      text-transform:uppercase;color:var(--fg-3,#8A86A0);padding:0 8px 8px 0;white-space:nowrap}
    #zg-contador .zc-tabla td{padding:9px 8px 9px 0;border-top:1px solid var(--line,rgba(199,204,209,.14));vertical-align:top}
    #zg-contador .zc-t{font-weight:700;min-width:0;overflow:hidden;text-overflow:ellipsis}
    #zg-contador .zc-n{font:700 15px/1 var(--font-m,monospace);text-align:right;white-space:nowrap}
    #zg-contador .zc-cero td{opacity:.45}
    #zg-contador .zc-caida{font:400 11px/1 var(--font-m,monospace);color:var(--uv,#8B3DFF);white-space:nowrap;padding-left:16px}
    #zg-contador .zc-tabla th:nth-child(4){padding-left:16px}
    #zg-contador .zc-fecha{font:400 11px/1.3 var(--font-m,monospace);color:var(--fg-3,#8A86A0);white-space:nowrap}
    #zg-contador .zc-nota{margin:12px 0 0;font-size:12px;line-height:1.5;color:var(--fg-3,#8A86A0)}
    @media(max-width:620px){ #zg-contador .zc-ocultable{display:none} }`;
  document.head.appendChild(s);
}

const fecha = v => v ? new Date(v).toLocaleDateString('es-CL',{day:'2-digit',month:'2-digit',year:'2-digit'}) : '—';

/* El título viene con la nomenclatura de trabajo (ZIGNALEZ - X (PRODUCTOR)).
   En un panel interno eso está bien, pero el prefijo del artista se repite en
   todas las filas y no aporta: se quita solo ese. */
const limpio = t => String(t || '').replace(/^\s*ZIGNALEZ\s*[-–—]\s*/i, '').trim() || '(sin título)';

function pintar(filas){
  const total = filas.reduce((a, f) => a + Number(f.oyentes || 0), 0);
  const cuerpo = filas.map(f => {
    const oy = Number(f.oyentes || 0), co = Number(f.completadas || 0);
    const caida = oy > 0 ? Math.round((1 - co / oy) * 100) : null;
    return `<tr class="${oy ? '' : 'zc-cero'}">
      <td class="zc-t">${limpio(f.titulo)}</td>
      <td class="zc-n">${oy}</td>
      <td class="zc-n">${co}</td>
      <td class="zc-caida">${caida === null ? '—' : caida + '%'}</td>
      <td class="zc-fecha zc-ocultable">${fecha(f.primera)}<br>${fecha(f.ultima)}</td>
    </tr>`;
  }).join('');

  root.querySelector('#zc-out').innerHTML = `
    <table class="zc-tabla">
      <thead><tr>
        <th>Tema</th><th style="text-align:right">Oyentes</th>
        <th style="text-align:right">Completas</th><th>Abandono</th>
        <th class="zc-ocultable">1ª / última</th>
      </tr></thead>
      <tbody>${cuerpo || '<tr><td colspan="5">Sin temas visibles.</td></tr>'}</tbody>
    </table>
    <p class="zc-nota">
      <strong>Oyentes</strong> son personas distintas con sesión, no reproducciones:
      la zona de miembros da una escucha por tema y por cuenta.
      <strong>Abandono</strong> es la parte que abrió el tema y no llegó al final —
      es la cifra que dice si el tema funciona, no el total.
      Los giros anónimos de la ruleta no entran aquí; eso lo cuenta
      <code>elecciones_resumen()</code>, que todavía no está aplicado (fix-13).
      Esta tabla es agregada a propósito: no guarda ni muestra quién escuchó qué.
    </p>`;
  root.querySelector('#zc-pill').textContent = total + (total === 1 ? ' escucha' : ' escuchas');
}

function cargar(){
  if(cargando || !ZA || !ZA.sb) return;
  cargando = true;
  const out = root.querySelector('#zc-out');
  out.innerHTML = '<div class="empty">Cargando…</div>';
  ZA.sb.rpc('escuchas_resumen').then(r => {
    cargando = false;
    if(r.error){
      /* 404 de PostgREST = la migración no está aplicada. Se dice cuál, en vez
         de un "error" que obliga a ir a mirar la consola. */
      const falta = /PGRST202|does not exist|schema cache/i.test(r.error.message || '');
      out.innerHTML = `<div class="empty">${falta
        ? 'Falta aplicar <code>supabase/fix-14-contador-escuchas.sql</code> en la base.'
        : 'No cargó: ' + (r.error.message || 'error desconocido')}</div>`;
      return;
    }
    pintar(r.data || []);
  });
}

function montar(){
  root = document.getElementById('zg-contador');
  if(!root || root.dataset.listo === '1') return;
  root.dataset.listo = '1';
  ZA = window.ZignalezAdmin || null;
  estilos();
  root.innerHTML = `
    <div class="card">
      <div class="head">
        <h2>Escuchas</h2>
        <span class="pill" id="zc-pill">—</span>
        <button class="btn ghost sm" id="zc-reload" type="button">Recargar</button>
      </div>
      <div id="zc-out"><div class="empty">Cargando…</div></div>
    </div>`;
  root.querySelector('#zc-reload').addEventListener('click', cargar);
  cargar();
}

document.addEventListener('zg-admin-ready', montar);
if(document.getElementById('zg-contador') && document.querySelector('#screen-panel.active')) montar();
