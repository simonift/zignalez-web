/* pop-ruleta.js — 03-10-2026
   Tarjeta emergente de la ruleta de inéditos en la portada.

   Por qué existe, y por qué NO es un intersticial al cargar:
   - La franja `.hero-ruleta` lleva un día en el hero y no basta: la ruleta
     compite contra el estreno de LUCE BIEN (1-10-2026), que es lo primero que
     tiene que ver quien entra. Un modal al instante tapa el estreno.
   - Por eso la tarjeta espera: aparece a los 6 s o cuando la persona ya se
     llevó el hero por delante (scroll), lo que ocurra primero. Para entonces
     el estreno ya se vio.
   - Google penaliza el intersticial intrusivo en móvil cuando cubre el
     contenido al llegar desde búsqueda; esta tarjeta no cubre nada al llegar
     y se cierra con ✕, con "Ahora no", con Esc y tocando fuera.

   Reglas de supresión (una sola oportunidad por persona):
   - Si ya giró alguna vez (`zig_ruleta_oidas`), no se muestra.
   - Si ya se mostró y la cerró (`zig_pop_ruleta`), no se muestra nunca más.
   - Si viene de /ruleta (referrer o utm_content=ruleta), no se muestra.

   Medición: clarity('event', 'pop_ruleta_ver' | 'pop_ruleta_girar' |
   'pop_ruleta_cerrar'). Sin esto no sabemos si la tarjeta mueve algo y
   quedaríamos discutiendo de gusto.
*/
(function(){
  'use strict';

  var VISTO  = 'zig_pop_ruleta';
  var OIDAS  = 'zig_ruleta_oidas';
  var ESPERA = 6000;

  function leer(k){ try{ return localStorage.getItem(k); }catch(e){ return null; } }
  function marcar(){ try{ localStorage.setItem(VISTO, '1'); }catch(e){} }
  function clarity(n){ try{ if(typeof window.clarity === 'function') window.clarity('event', n); }catch(e){} }

  function sobra(){
    if(leer(VISTO)) return true;
    var o = leer(OIDAS);
    if(o && o !== '[]' && o !== '') return true;                 // ya jugó
    if(/[?&]utm_content=ruleta/.test(location.search)) return true;
    if(document.referrer && /\/ruleta/.test(document.referrer)) return true;
    return false;
  }

  function estilos(){
    if(document.getElementById('zpop-css')) return;
    var s = document.createElement('style');
    s.id = 'zpop-css';
    s.textContent = [
      '.zpop{position:fixed;inset:0;z-index:9000;display:flex;align-items:flex-end;justify-content:center;',
        'padding:18px;background:rgba(10,10,11,.72);backdrop-filter:blur(3px);',
        'opacity:0;transition:opacity .22s ease}',
      '.zpop.zpop-on{opacity:1}',
      '@media(min-width:720px){.zpop{align-items:center}}',
      '.zpop-caja{position:relative;width:100%;max-width:420px;background:var(--ink-2,#111116);',
        'border:1px solid var(--line,rgba(199,204,209,.14));border-radius:6px;padding:26px 22px 22px;',
        'text-align:center;transform:translateY(14px);transition:transform .22s ease;',
        'box-shadow:0 18px 60px rgba(0,0,0,.55)}',
      '.zpop.zpop-on .zpop-caja{transform:none}',
      '.zpop-x{position:absolute;top:8px;right:10px;width:32px;height:32px;line-height:30px;',
        'background:none;border:0;color:var(--smoke,#8A86A0);font-size:20px;cursor:pointer;border-radius:4px}',
      '.zpop-x:hover,.zpop-x:focus-visible{color:var(--white,#fff);outline:none;background:rgba(255,255,255,.06)}',
      '.zpop-ojo{display:inline-block;font-family:var(--font-m,monospace);font-size:9px;letter-spacing:.18em;',
        'text-transform:uppercase;color:var(--uv,#8B3DFF);border:1px solid var(--line,rgba(199,204,209,.14));',
        'border-radius:3px;padding:5px 8px;margin-bottom:16px}',
      '.zpop-rueda{position:relative;width:96px;height:96px;margin:0 auto 16px;border-radius:50%;',
        'background:conic-gradient(var(--uv,#8B3DFF) 0 25%,#17171d 0 50%,var(--uv-soft,#A66BFF) 0 75%,#1d1d25 0 100%);',
        'animation:zpop-girar 7s linear infinite;box-shadow:0 0 0 1px var(--line,rgba(199,204,209,.14)) inset}',
      '.zpop-cubo{position:absolute;top:50%;left:50%;width:26px;height:26px;margin:-13px 0 0 -13px;border-radius:50%;',
        'background:var(--ink-2,#111116);border:1px solid var(--line-2,rgba(199,204,209,.28))}',
      '.zpop-aguja{position:absolute;top:-7px;left:50%;margin-left:-6px;width:0;height:0;',
        'border-left:6px solid transparent;border-right:6px solid transparent;border-top:11px solid var(--chrome-hi,#E8EAED)}',
      '.zpop-caja h3{margin:0 0 8px;font-family:var(--font-d,sans-serif);font-size:23px;line-height:1.15;color:var(--white,#fff)}',
      '.zpop-caja p{margin:0 0 20px;font-size:14px;line-height:1.55;color:var(--smoke,#8A86A0)}',
      '.zpop-ir{display:block;padding:14px 18px;background:var(--uv,#8B3DFF);color:#fff;text-decoration:none;',
        'border-radius:4px;font-weight:700;font-size:15px;transition:background .15s}',
      '.zpop-ir:hover,.zpop-ir:focus-visible{background:var(--uv-soft,#A66BFF)}',
      '.zpop-no{display:block;width:100%;margin-top:12px;padding:8px;background:none;border:0;cursor:pointer;',
        'color:var(--smoke,#8A86A0);font-family:inherit;font-size:13px;text-decoration:underline}',
      '.zpop-no:hover,.zpop-no:focus-visible{color:var(--chrome,#C7CCD1)}',
      '@keyframes zpop-girar{to{transform:rotate(360deg)}}',
      '@media(prefers-reduced-motion:reduce){.zpop,.zpop-caja{transition:none}.zpop-rueda{animation:none}}'
    ].join('');
    document.head.appendChild(s);
  }

  function abrir(){
    if(document.getElementById('zpopRuleta')) return;
    marcar();                      // una sola oportunidad, se abra o no se use

    var foco = document.activeElement;
    var capa = document.createElement('div');
    capa.className = 'zpop';
    capa.id = 'zpopRuleta';
    capa.setAttribute('role','dialog');
    capa.setAttribute('aria-modal','true');
    capa.setAttribute('aria-labelledby','zpopTit');
    capa.innerHTML =
      '<div class="zpop-caja">' +
        '<button class="zpop-x" type="button" aria-label="Cerrar">&#10005;</button>' +
        '<span class="zpop-ojo">Inéditos</span>' +
        '<div class="zpop-rueda" aria-hidden="true"><span class="zpop-aguja"></span><span class="zpop-cubo"></span></div>' +
        '<h3 id="zpopTit">Hay temas que no están en ninguna plataforma</h3>' +
        '<p>Gira la ruleta y te toca uno. Lo escuchas ahí mismo, sin registrarte.</p>' +
        '<a class="zpop-ir" href="/ruleta?utm_source=home&amp;utm_medium=popup&amp;utm_content=ruleta">Girar la ruleta</a>' +
        '<button class="zpop-no" type="button">Ahora no</button>' +
      '</div>';
    document.body.appendChild(capa);

    var scrollY = window.scrollY;
    document.body.style.overflow = 'hidden';

    function cerrar(motivo){
      document.body.style.overflow = '';
      document.removeEventListener('keydown', tecla);
      capa.classList.remove('zpop-on');
      setTimeout(function(){ if(capa.parentNode) capa.parentNode.removeChild(capa); }, 220);
      clarity('pop_ruleta_cerrar');
      if(foco && foco.focus) try{ foco.focus(); }catch(e){}
      window.scrollTo(0, scrollY);
      if(motivo){} // el motivo queda en el nombre del evento si algún día separamos
    }

    function tecla(e){
      if(e.key === 'Escape'){ cerrar('esc'); return; }
      if(e.key !== 'Tab') return;
      var f = capa.querySelectorAll('button, a[href]');
      if(!f.length) return;
      var pri = f[0], ult = f[f.length - 1];
      if(e.shiftKey && document.activeElement === pri){ e.preventDefault(); ult.focus(); }
      else if(!e.shiftKey && document.activeElement === ult){ e.preventDefault(); pri.focus(); }
    }

    capa.querySelector('.zpop-x').addEventListener('click', function(){ cerrar('x'); });
    capa.querySelector('.zpop-no').addEventListener('click', function(){ cerrar('no'); });
    capa.addEventListener('click', function(e){ if(e.target === capa) cerrar('fuera'); });
    capa.querySelector('.zpop-ir').addEventListener('click', function(){ clarity('pop_ruleta_girar'); });
    document.addEventListener('keydown', tecla);

    requestAnimationFrame(function(){
      capa.classList.add('zpop-on');
      var ir = capa.querySelector('.zpop-ir');
      if(ir) try{ ir.focus({preventScroll:true}); }catch(e){ ir.focus(); }
    });
    clarity('pop_ruleta_ver');
  }

  function armar(){
    if(sobra()) return;
    var hecho = false;
    function disparar(){
      if(hecho) return;
      hecho = true;
      window.removeEventListener('scroll', porScroll);
      clearTimeout(reloj);
      if(document.visibilityState === 'visible') abrir();
      else document.addEventListener('visibilitychange', function una(){
        if(document.visibilityState === 'visible'){ document.removeEventListener('visibilitychange', una); abrir(); }
      });
    }
    function porScroll(){ if(window.scrollY > window.innerHeight * 0.55) disparar(); }
    var reloj = setTimeout(disparar, ESPERA);
    window.addEventListener('scroll', porScroll, {passive:true});
  }

  estilos();                       // 03-10-2026 · al cargar, no dentro de abrir():
                                   // el disco de miembros se rompió justo por eso.
  if(document.readyState === 'loading') document.addEventListener('DOMContentLoaded', armar);
  else armar();
})();
