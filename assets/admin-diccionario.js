/* Diccionario Zignalez · panel de administración · 03-10-2026
 *
 *   Herramienta de escritura: rimas, jerga y dobles sentidos para que una letra
 *   suene a persona y no a plantilla. Vive en el admin porque es material de
 *   trabajo del artista, no contenido para el fan.
 *
 *   No toca la base ni la red: los datos son una constante. Si mañana hay que
 *   editarlos desde el panel, la tabla se agrega entonces — hoy sería una tabla
 *   para una sola persona que edita un archivo.
 *
 *   PROCEDENCIA (contrato de evidencia): cada bloque declara de dónde sale y si
 *   está verificado. La mayor parte es recopilación propia SIN verificar contra
 *   letras, y así se muestra. El bloque "Pegando hoy" lleva fecha de corte y se
 *   marca solo cuando pasa de 30 días.
 */

const VERIFICADO = {
  dail:     { t: 'DAIL · análisis de 100 canciones de 10 artistas', u: 'https://www.dail.es/el-mensaje-de-las-canciones-de-reggaeton/' },
  univision:{ t: 'Univision · glosario del género', u: 'https://www.univision.com/entretenimiento/cultura-pop/significado-palabras-regueton-glosario' },
  kworb:    { t: 'kworb · Spotify Chile diario y YouTube Chile semanal', u: 'https://kworb.net/spotify/country/cl_daily.html' }
};
const PROPIO = { t: 'Recopilación propia · sin verificar contra letras', u: null };

/* Fechas de corte de los datos con número. Regla 4 del contrato: todo dato
   numérico lleva fecha, y sobre 30 días se declara. */
const CORTE_PEGANDO = '2026-09-29';
const DIAS_VIGENCIA = 30;

const DATA = [
  { id:'saturadas', name:'Saturadas', type:'rank', fuente:VERIFICADO.dail,
    lede:'Las palabras que más se repiten en el género. Usarlas sin giro es lo que hace sonar genérica una letra.',
    items:['quiero','mami','dale','amor','gusta','vida','gata','noche','cuerpo','mujer'],
    extra:'En inglés las más usadas son baby, hey, girl, flow, bye, boom, yeah, music, ready y fancy.' },

  { id:'rimas', name:'Familias de rima', type:'fam', fuente:PROPIO,
    lede:'Agrupadas por la terminación que suena, desde la vocal acentuada. Las de una misma fila riman en consonante.',
    items:[
      { k:'-ao',   w:['pegao','mojao','pasao','volao','enamorao','apretao','malacostumbrao','cuidao','pesao','colao','dao vuelta','atrasao'], n:'Forma chilena de -ado. Rima larga: enamorao / malacostumbrao.' },
      { k:'-ío',   w:['prendío','perdío','corrío','aprendío','prohibío','encendío','vacío','frío','mío','lío','río','tío'] },
      { k:'-ai',   w:['estai','bailai','mirai','cachai','hablai','borrai','mandai','jurai','arrancai','te vai','llorai','pasai'], n:'Voseo de verbos en -ar. Riman entre sí y con -ay / -ái.' },
      { k:'-ís',   w:['querís','tenís','sabís','decís','venís','movís','mentís','sentís','París','feliz','nariz','desliz','cicatriz'], n:'Voseo de -er / -ir. Feliz, nariz y desliz entran por asonancia.' },
      { k:'-ente', w:['pendiente','frente','gente','mente','caliente','inocente','presente','diferente','de repente','consciente','transparente','demente','valiente'] },
      { k:'-ura',  w:['locura','cintura','ternura','dulzura','altura','aventura','travesura','captura','figura','segura','oscura','pura','dura','censura'] },
      { k:'-ón',   w:['bombón','corazón','canción','tentación','perdición','obsesión','adicción','conexión','sensación','rincón','balcón','colchón','presión','traición'], n:'Triple rima larga: tentación / perdición / obsesión.' },
      { k:'-oche', w:['noche','reproche','derroche','coche','broche','trasnoche','esta noche'] },
      { k:'-ama',  w:['cama','llama','fama','drama','pijama','programa','dama','te llama','flama'] },
      { k:'-ía',   w:['mía','todavía','fantasía','energía','melodía','manía','compañía','alegría','rebeldía','lejanía','día','vía'], n:'Ojo: química no rima aquí, es esdrújula.' },
      { k:'-era',  w:['polera','cadera','frontera','cartera','carretera','primavera','quimera','entera','sincera','bandera','quienquiera'] },
      { k:'-eta',  w:['violeta','discreta','coqueta','secreta','completa','receta','maleta','chaqueta','inquieta','planeta','silueta'] },
      { k:'-ita',  w:['mamita','bonita','cerquita','pegadita','lentito','bajito','poquito','postrecito','rapidito','calladita'], n:'Diminutivo: suaviza y da cercanía. No abusar.' },
      { k:'-ubo / -uvo', w:['tubo','subo','cubo','hubo','tuvo','estuvo','anduvo','detuvo','mantuvo','contuvo','sostuvo','retuvo','obtuvo','entretuvo'], n:'Familia corta. Alternar con asonante u-o: humo, turbo, puro, rumbo, seguro.' }
    ] },

  { id:'chile', name:'Jerga chilena', type:'def', fuente:PROPIO,
    lede:'Lo que te diferencia del reggaetón de Puerto Rico o Colombia. Úsala con naturalidad, sin explicarla.',
    items:[
      ['cachai','¿entiendes? / ¿te das cuenta?'],['po','muletilla de énfasis (ya po, sí po)'],['altiro','de inmediato'],['piola','tranquilo, discreto, bajo perfil'],
      ['carrete','fiesta, salida nocturna'],['la previa','juntarse a tomar antes de salir'],['pololo / polola','novio / novia'],['mina','mujer joven'],
      ['wacha','chica (jerga de calle)'],['brígido','intenso, difícil, fuerte'],['cuático','impresionante, exagerado'],['la raja','excelente'],
      ['fome','aburrido'],['bacán','genial'],['luca','mil pesos'],['chela','cerveza'],['piscola','pisco con bebida cola'],['terremoto','trago típico (pipeño, helado de piña)'],
      ['los cabros','los amigos, el grupo'],['la pobla','la población, el barrio'],['choro / chora','valiente, desafiante'],['flaite','estética de calle (puede ser despectivo)'],
      ['cuico','de clase alta (despectivo)'],['pelar','hablar mal de alguien'],['andar arriba de la pelota','estar muy prendido, eufórico'],['irse a la cresta','descontrolarse, salirse de madre'],
      ['al tiro y altiro','se escribe de las dos formas'],['tamo activo','estamos activos, en movimiento']
    ] },

  { id:'caribe', name:'Jerga caribeña', type:'def', fuente:VERIFICADO.univision,
    lede:'Vocabulario clásico del género. Úsalo con cuidado: en boca chilena puede sonar a imitación.',
    items:[
      ['bellaco / bellaca','con mucha energía sexual (Puerto Rico)'],['bellaquear','coquetear subido de tono'],['perreo','baile sensual del reggaetón'],
      ['janguear','salir a divertirse'],['corillo','grupo de amigos'],['arrebatarse','atreverse, lanzarse'],['pámpara','alguien con mucho éxito'],
      ['bichota / bichote','poderosa / poderoso'],['vaina','cualquier cosa'],['flow','estilo, forma de cantar o moverse'],['dembow','ritmo base del género']
    ] },

  { id:'digital', name:'Vocabulario digital', type:'def', fuente:PROPIO,
    lede:'Tu ventaja diferencial. Son detalles concretos y actuales que una plantilla no pone por defecto.',
    items:[
      ['modo efímero','mensajes que se borran al cerrar el chat'],['close friends','lista privada de historias'],
      ['me dejaste en visto','leíste y no respondiste'],['historia','story de 24 horas'],['like a una foto vieja','señal de que te revisó el perfil hacia atrás'],
      ['captura','screenshot'],['nota de voz','audio de WhatsApp'],['escribiendo...','el indicador que aparece y desaparece'],
      ['en línea','conectado ahora'],['ubicación en tiempo real','compartir dónde estás'],['me silenciaste','dejaste de ver mis historias sin bloquear'],
      ['archivaste el chat','escondiste la conversación'],['me bloqueaste / desbloqueaste','cortar y volver'],['reaccionaste con un fuego','respuesta mínima a una historia'],
      ['playlist compartida','señal de pareja'],['el Uber','la salida, el cierre de la noche']
    ] },

  { id:'noche', name:'La noche y la disco', type:'words', fuente:PROPIO,
    lede:'Escenario concreto. Mejor un objeto real que un adjetivo.',
    items:['luz negra','luz blanca del cierre','la fila','el guardia','la pulsera','el VIP','la mesa','la botella','la barra','el humo','el DJ','el bajo','la pista','el baño','el espejo','la previa','el after','el cover','cinco menos diez','el Uber de vuelta','la puerta trasera','el celu boca abajo','el labial corrido','la chaqueta prestada'] },

  { id:'dobles', name:'Dobles sentidos', type:'def', fuente:PROPIO,
    lede:'Palabras con dos lecturas. Un verso con dos o tres de estas ya se siente escrito por alguien.',
    items:[
      ['historia','la story de Instagram y la historia entre los dos'],['captura','screenshot y quedarse con algo en la memoria'],
      ['revelar','revelar una foto y mostrarse uno mismo'],['visto','dejar en visto y que te vean'],['bloquear','bloquear en redes y bloquearse emocionalmente'],
      ['subir','subir una foto y subir de tono'],['bajar','bajar hasta el piso y bajar la guardia'],['prender','prender la luz y prenderse'],
      ['quemar','quemar el chat y quemarse, salir herido'],['filtro','filtro de foto y no tener filtro al hablar'],
      ['seguir','seguir en redes y seguir juntos'],['borrar','borrar mensajes y borrar a alguien de tu vida'],
      ['efímero','mensaje que se borra y algo que no dura'],['química','química entre dos y lo que hay en el vaso'],
      ['neón','la luz de la disco y lo que brilla solo de noche'],['upgrade','mejora de celular y el que reemplaza al ex']
    ] },

  { id:'pegando', name:'Pegando hoy', type:'def', fuente:VERIFICADO.kworb, corte:CORTE_PEGANDO,
    lede:'Reggaetón romántico y nocturno con tracción en Chile. Spotify Chile diario al 29-09-2026; YouTube Chile semanal al 24-09-2026.',
    items:[
      ['De Lejitos (Remix)','Jay Wheeler ft. Omar Courtz · Spotify #5, 123 días'],
      ['KOKO','Omar Courtz · Spotify #8, 220 días'],
      ['POR SI MAÑANA NO ESTOY','Omar Courtz · Spotify #11, 221 días'],
      ['ZIZI','Ozuna ft. Omar Courtz · Spotify #12'],
      ['Donde Hubo Fuego Cenizas Quedan','Anuel AA · Spotify #14 · YouTube #11'],
      ['CARITA FELIZ','Myke Towers · Spotify #16'],
      ['Entre Tu y Yo','Bayriton ft. Piero 47, Raven la R · Spotify #18, 139 días'],
      ["Estoy Pa' Ti",'Brytiago · Spotify #29'],
      ['POLLYPOCKET','Martinwhite ft. Katteyes · Spotify #10, 166 días']
    ] },

  { id:'escuelas', name:'Escuelas', type:'def', fuente:PROPIO,
    lede:'Qué tomar de cada referente. Es lectura de estilo, sin verificar contra letras: confírmala escuchando.',
    items:[
      ['Omar Courtz','ambiente de madrugada, ganchos cortos repetidos, falsete, inglés suelto, beat mínimo'],
      ['Jay Wheeler','vulnerabilidad dicha de frente, vocales sostenidas al final de frase'],
      ['Myke Towers','rima interna densa, cambios de flow dentro del verso, juegos de palabras'],
      ['Ozuna','ganchos de vocal (ah-ah, eh-eh) que se corean sin saber la letra'],
      ['Anuel AA','romance tóxico, despecho con orgullo, ad-libs agresivos'],
      ['Brytiago','tempo bajo, frases largas y suaves'],
      ['Bayriton','jerga chilena de carrete, temas con varios invitados'],
      ['Arcángel','seguridad, referencias a sí mismo, remates con inglés']
    ] },

  { id:'patrones', name:'Patrones', type:'def', fuente:PROPIO,
    lede:'Lo que se repite en los temas que duran en lista. Lectura de estilo, no medición.',
    items:[
      ['Gancho corto','de 3 a 6 palabras, casi siempre es el título'],
      ['Firma propia','un ad-lib que aparece en todos tus temas (Ziggy)'],
      ['Un tercero en la historia','el ex, el novio de ella, la que se fue'],
      ['Celular y redes','visto, historia, efímero, close friends'],
      ['Vocal coreable','un ah-ah o eh-eh después del coro'],
      ['Colaboración','los temas con más días en lista son casi todos con invitados'],
      ['Contraste','verso denso e ingenioso, coro simple y repetible']
    ] },

  { id:'ingles', name:'Inglés que entra', type:'words', fuente:VERIFICADO.dail,
    lede:'Las diez más usadas del género según el estudio, más términos actuales. Una o dos por tema; más suena a pose.',
    items:['baby','hey','girl','flow','bye','boom','yeah','ready','fancy','vibe','upgrade','crush','lowkey','toxic','red flag','chill','close friends','story','DM','on fire'] },

  { id:'adlibs', name:'Ad-libs y ganchos de vocal', type:'words', fuente:PROPIO,
    lede:'Relleno con función: marca tu identidad y le da a la gente algo fácil que corear.',
    items:['Ziggy','ya po','tamo','ey, ey','uh-uh','ah-ah','eh-eh','oh-oh-oh','dale','lento','de frente','luz neón','yeah, yeah','mmm','¿qué?','prendío'] },

  { id:'plantilla', name:'Plantilla de análisis', type:'def', fuente:PROPIO,
    lede:'Para analizar un tema escuchándolo. Llena tres o cuatro y salen los patrones con datos reales.',
    items:[
      ['Tema y artista','—'],['Entra la voz','segundo'],['Aparece el gancho','segundo'],['Gancho','cuántas palabras y de qué tipo: pregunta, instrucción, remate, nombre'],
      ['Rimas','terminaciones que repite'],['Inglés','sí o no, y en qué parte'],['Punto de vista','ruega, arrogante, despechado, seductor'],
      ['Detalles concretos','marcas, lugares, celular'],['Firma o ad-lib','—']
    ] }
];

/* ── utilidades ───────────────────────────────────────────────────── */
const norm = (s) => String(s).toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
const el = (tag, cls, txt) => { const n = document.createElement(tag); if (cls) n.className = cls; if (txt != null) n.textContent = txt; return n; };

function diasDesde(iso) {
  const d = (Date.now() - new Date(iso + 'T00:00:00Z').getTime()) / 86400000;
  return Math.floor(d);
}

let root = null, cat = 'all', term = '', aviso = null;

function copiar(t) {
  const ok = () => {
    if (!aviso) return;
    aviso.textContent = 'Copiado: ' + t;
    aviso.hidden = false;
    clearTimeout(copiar._t);
    copiar._t = setTimeout(() => { aviso.hidden = true; }, 1600);
  };
  try { navigator.clipboard.writeText(t).then(ok, ok); } catch (_) { ok(); }
}

function palabra(t) {
  const b = el('button', 'zd-w' + (term && norm(t).includes(term) ? ' hit' : ''), t);
  b.type = 'button';
  b.title = 'Copiar';
  b.addEventListener('click', () => copiar(t));
  return b;
}

function procedencia(d) {
  const p = el('p', 'zd-fuente');
  if (d.fuente.u) {
    p.append(document.createTextNode('Fuente: '));
    const a = el('a', null, d.fuente.t);
    a.href = d.fuente.u; a.target = '_blank'; a.rel = 'noopener';
    p.append(a);
  } else {
    p.append(document.createTextNode(d.fuente.t));
  }
  if (d.corte) {
    const dias = diasDesde(d.corte);
    const s = el('span', 'zd-corte' + (dias > DIAS_VIGENCIA ? ' viejo' : ''),
      dias > DIAS_VIGENCIA ? ` · ${dias} días de antigüedad: reverificar en kworb` : ` · corte ${d.corte}`);
    p.append(s);
  }
  return p;
}

/* ── render ───────────────────────────────────────────────────────── */
function pintarChips(cont) {
  cont.innerHTML = '';
  const uno = (id, label) => {
    const b = el('button', 'zd-chip', label);
    b.type = 'button';
    b.setAttribute('aria-pressed', String(cat === id));
    b.addEventListener('click', () => { cat = id; pintar(); });
    return b;
  };
  cont.append(uno('all', 'Todo'));
  DATA.forEach((d) => cont.append(uno(d.id, d.name)));
}

function pintar() {
  const chips = root.querySelector('#zd-chips');
  const out = root.querySelector('#zd-out');
  pintarChips(chips);
  out.innerHTML = '';
  let total = 0;

  DATA.filter((d) => cat === 'all' || d.id === cat).forEach((d) => {
    const sec = el('section', 'zd-sec');
    sec.append(el('h3', null, d.name), el('p', 'zd-lede', d.lede), procedencia(d));
    let n = 0;

    if (d.type === 'rank') {
      const items = d.items.filter((x) => !term || norm(x).includes(term));
      if (items.length) {
        const r = el('div', 'zd-rank');
        items.forEach((x) => r.append(el('div', null, x)));
        sec.append(r);
        n = items.length;
        if (!term && d.extra) sec.append(el('p', 'zd-nota', d.extra));
      }
    } else if (d.type === 'fam') {
      d.items.forEach((f) => {
        if (term && !norm(f.k).includes(term) && !f.w.some((w) => norm(w).includes(term))) return;
        n++;
        const row = el('div', 'zd-fam');
        row.append(el('div', 'zd-key', f.k));
        const body = el('div');
        const ws = el('div', 'zd-words');
        f.w.forEach((w) => ws.append(palabra(w)));
        body.append(ws);
        if (f.n) body.append(el('div', 'zd-nota', f.n));
        row.append(body);
        sec.append(row);
      });
    } else if (d.type === 'def') {
      d.items.forEach(([w, m]) => {
        if (term && !norm(w).includes(term) && !norm(m).includes(term)) return;
        n++;
        const row = el('div', 'zd-def');
        const b = el('div');
        b.append(palabra(w));
        row.append(b, el('div', 'zd-m', m));
        sec.append(row);
      });
    } else {
      const items = d.items.filter((x) => !term || norm(x).includes(term));
      if (items.length) {
        const ws = el('div', 'zd-words');
        items.forEach((x) => ws.append(palabra(x)));
        sec.append(ws);
        n = items.length;
      }
    }

    if (n) { out.append(sec); total += n; }
  });

  if (!total) {
    out.append(el('p', 'zd-vacio', 'Nada coincide. Prueba con una terminación, como "ura" u "ón".'));
  }
}

/* ── montaje ──────────────────────────────────────────────────────── */
function montar() {
  root = document.getElementById('zg-diccionario');
  if (!root || root.dataset.listo === '1') return;
  root.dataset.listo = '1';

  root.innerHTML = `
    <div class="card">
      <div class="head">
        <h2>Diccionario</h2>
        <span class="pill">${DATA.length} bloques</span>
      </div>
      <p class="zd-intro">Rimas, jerga y dobles sentidos para escribir sin caer en plantilla. Toca una palabra para copiarla.</p>
      <div class="field">
        <label class="lbl" for="zd-q">Buscar palabra o terminación</label>
        <input type="search" id="zd-q" autocomplete="off" placeholder="ura · cachai · noche">
      </div>
      <div class="zd-chips" id="zd-chips"></div>
      <div id="zd-out"></div>
      <div class="zd-aviso" id="zd-aviso" role="status" aria-live="polite" hidden></div>
    </div>`;

  aviso = root.querySelector('#zd-aviso');
  root.querySelector('#zd-q').addEventListener('input', (e) => {
    term = norm(e.target.value.trim());
    pintar();
  });
  pintar();
}

document.addEventListener('zg-admin-ready', montar);
if (document.getElementById('zg-diccionario') && document.querySelector('#screen-panel.active')) montar();
