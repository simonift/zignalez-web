
/* "La Señal" — el reflector apunta hacia quien entra y el haz tiene la forma de la marca.
   Entra al cargar, resuelve la marca y baja a ambiente para no competir con el titular.
   Respeta prefers-reduced-motion. */
(function(){
  var cv=document.getElementById('herobg'); if(!cv) return;
  var hero=cv.closest('.hero'), ctx=cv.getContext('2d');
  var reduce=window.matchMedia&&window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var dpr=Math.min(window.devicePixelRatio||1,2), W=1, H=1, t0=0;

  /* La marca: dos Z espejadas + chevrón. Se pre-renderiza una vez y después
     solo se compone escalada — barato de animar. */
  var MS=256, MK=document.createElement('canvas'); MK.width=MK.height=MS;
  (function(){
    var c=MK.getContext('2d'), s=MS/100; c.setTransform(s,0,0,s,0,0); c.fillStyle='#fff';
    c.beginPath();c.moveTo(22,20);c.lineTo(50,20);c.lineTo(50,30);c.lineTo(34,48);
    c.lineTo(50,48);c.lineTo(50,58);c.lineTo(22,58);c.lineTo(22,48);c.lineTo(38,30);
    c.lineTo(22,30);c.closePath();c.fill();
    c.beginPath();c.moveTo(78,20);c.lineTo(50,20);c.lineTo(50,30);c.lineTo(66,48);
    c.lineTo(50,48);c.lineTo(50,58);c.lineTo(78,58);c.lineTo(78,48);c.lineTo(62,30);
    c.lineTo(78,30);c.closePath();c.fill();
    c.beginPath();c.moveTo(36,66);c.lineTo(50,80);c.lineTo(64,66);c.closePath();c.fill();
  })();

  var NW=200,NH=120,nz=document.createElement('canvas');nz.width=NW;nz.height=NH;var nc=nz.getContext('2d');
  function rnd(a){return function(){a|=0;a=a+0x6D2B79F5|0;var t=Math.imul(a^a>>>15,1|a);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296;};}
  var seed=1;
  function grain(al){var im=nc.createImageData(NW,NH),d=im.data,r=rnd(seed++);for(var i=0;i<d.length;i+=4){var v=r()*255;d[i]=d[i+1]=d[i+2]=v;d[i+3]=255;}nc.putImageData(im,0,0);ctx.save();ctx.globalAlpha=al;ctx.imageSmoothingEnabled=false;ctx.drawImage(nz,0,0,W,H);ctx.restore();}
  function size(){W=hero.clientWidth;H=hero.clientHeight;cv.width=Math.round(W*dpr);cv.height=Math.round(H*dpr);cv.style.width=W+'px';cv.style.height=H+'px';ctx.setTransform(dpr,0,0,dpr,0,0);}

  /* Silueta de Santiago: cerro, edificios y el Costanera. Vectorial, un color. */
  function skyline(){
    var base=H*0.995; ctx.save(); ctx.fillStyle='#07070b';
    ctx.beginPath();ctx.moveTo(W*0.02,base);
    ctx.quadraticCurveTo(W*0.12,base-H*0.075,W*0.24,base);ctx.closePath();ctx.fill();
    var r=rnd(11),x=0;
    while(x<W){var w=W*(0.016+r()*0.030),h=H*(0.014+r()*0.040);ctx.fillRect(x,base-h,w*0.93,h);x+=w;}
    var cw=W*0.020,cx=W*0.78,ch=H*0.115;
    ctx.fillRect(cx,base-ch,cw,ch);
    ctx.beginPath();ctx.moveTo(cx,base-ch);ctx.lineTo(cx+cw/2,base-ch-H*0.020);
    ctx.lineTo(cx+cw,base-ch);ctx.closePath();ctx.fill();
    ctx.restore();
  }

  function draw(ts){
    if(!t0) t0=ts;
    var t=ts-t0;
    ctx.setTransform(dpr,0,0,dpr,0,0);
    var g=ctx.createLinearGradient(0,0,0,H);
    g.addColorStop(0,'#08080c');g.addColorStop(0.55,'#0c0a13');g.addColorStop(1,'#100e18');
    ctx.fillStyle=g;ctx.fillRect(0,0,W,H);

    /* Llegada: entra fuerte, resuelve, y se queda respirando bajo.
       El techo de 0.34 es lo que impide que le pelee el foco al titular. */
    var k=Math.min(1,t/2400), ease=1-Math.pow(1-k,3);
    var amp=(0.10+0.90*ease)*(0.34+0.10*Math.sin(t*0.0008));
    var grow=0.45+0.55*ease;

    /* Posición: fuera del camino del texto en ambos formatos.
       Desktop → cuadrante inferior derecho, libre bajo el titular.
       Móvil   → esquina superior derecha, recortada y tenue: el hero es denso
                 de texto y cualquier otra posición queda debajo de una línea. */
    var narrow=W<760;
    var cx=narrow?W*0.86:W*0.835, cy=narrow?H*0.10:H*0.64;
    var baseScale=Math.min(W,H)/MS*(narrow?0.30:0.40)*grow;
    if(narrow) amp*=0.62;

    ctx.save();ctx.globalCompositeOperation='screen';
    var hg=ctx.createRadialGradient(cx,cy,0,cx,cy,Math.max(W,H)*0.62);
    hg.addColorStop(0,'rgba(139,61,255,'+(0.30*amp)+')');
    hg.addColorStop(0.45,'rgba(139,61,255,'+(0.10*amp)+')');
    hg.addColorStop(1,'rgba(139,61,255,0)');
    ctx.fillStyle=hg;ctx.fillRect(0,0,W,H);ctx.restore();

    /* El cono: la misma silueta escalando hacia el espectador. */
    var LAYERS=26, maxGrow=3.0;
    ctx.save();ctx.globalCompositeOperation='screen';
    for(var i=LAYERS-1;i>=0;i--){
      var f=i/(LAYERS-1), sc=baseScale*(1+f*(maxGrow-1));
      var a=amp*0.055*Math.pow(1-f,1.7);
      if(a<=0.0015) continue;
      ctx.globalAlpha=a;
      ctx.drawImage(MK,cx-MS*sc/2,cy-MS*sc/2,MS*sc,MS*sc);
    }
    ctx.restore();

    /* Núcleo: dos pasadas. La primera con glow da el halo; la segunda, sin blur
       y más opaca, es la que mantiene legible la silueta de las dos Z —
       con una sola pasada el glow se come la forma. */
    ctx.save();ctx.globalCompositeOperation='screen';
    ctx.globalAlpha=Math.min(1,0.45*amp);
    ctx.shadowColor='rgba(166,107,255,0.95)';ctx.shadowBlur=Math.min(W,H)*0.045*amp;
    ctx.drawImage(MK,cx-MS*baseScale/2,cy-MS*baseScale/2,MS*baseScale,MS*baseScale);
    ctx.shadowBlur=0;
    ctx.globalAlpha=Math.min(1,0.95*amp);
    var sc2=baseScale*0.97;
    ctx.drawImage(MK,cx-MS*sc2/2,cy-MS*sc2/2,MS*sc2,MS*sc2);
    ctx.restore();

    /* Destello anamórfico. */
    ctx.save();ctx.globalCompositeOperation='screen';
    var fl=ctx.createLinearGradient(0,cy,W,cy);
    fl.addColorStop(0,'rgba(166,107,255,0)');
    fl.addColorStop(0.5,'rgba(199,177,255,'+(0.14*amp)+')');
    fl.addColorStop(1,'rgba(166,107,255,0)');
    ctx.fillStyle=fl;ctx.fillRect(0,cy-Math.max(2,H*0.004),W,Math.max(4,H*0.008));ctx.restore();

    skyline();

    /* Micro-glitch ocasional — se conserva del fondo anterior. */
    var gp=t%7000; if(gp<160){var r2=rnd((t/40)|0);for(var k2=0;k2<3;k2++){var yy=r2()*H,hh=2+r2()*8;ctx.save();ctx.globalAlpha=0.08;ctx.fillStyle=(k2%2?'#8B3DFF':'#37d6ff');ctx.fillRect((r2()*2-1)*14,yy,W,hh);ctx.restore();}}

    ctx.save();ctx.globalAlpha=0.045;ctx.fillStyle='#000';for(var y2=0;y2<H;y2+=3)ctx.fillRect(0,y2,W,1);ctx.restore();
    grain(0.028);
    var fg=ctx.createLinearGradient(0,H*0.45,0,H);
    fg.addColorStop(0,'rgba(10,10,11,0)');fg.addColorStop(1,'rgba(10,10,11,1)');
    ctx.fillStyle=fg;ctx.fillRect(0,H*0.45,W,H*0.55);
  }

  size(); window.addEventListener('resize',function(){size();if(reduce)draw(3000);});
  if(reduce){draw(3000);return;}
  /* El bucle del hero corria a 60fps desde el load hasta cerrar la pestana,
     con la seccion fuera de pantalla incluida. Por cuadro: dos gradientes
     nuevos, 26 drawImage en modo screen, una pasada de shadowBlur, ~200
     fillRect de scanlines y un createImageData de 96 KB para el grano --
     5,7 MB/s de basura para el recolector. En un Android modesto son 10-25 ms
     por cuadro, y el reproductor corre DETRAS de eso en el mismo hilo.
     Ahora solo dibuja cuando el hero esta a la vista y la pestana visible. */
  var heroRAF = 0, heroVisible = true, heroUlt = 0;
  function loop(ts){
    heroRAF = requestAnimationFrame(loop);
    if(ts - heroUlt < 32) return;   /* ~30fps: es ambiente, no necesita 60 */
    heroUlt = ts;
    draw(ts);
  }
  function heroArranca(){ if(!heroRAF) heroRAF = requestAnimationFrame(loop); }
  function heroPara(){ if(heroRAF){ cancelAnimationFrame(heroRAF); heroRAF = 0; } }
  function heroEvalua(){
    if(heroVisible && !document.hidden) heroArranca(); else heroPara();
  }
  document.addEventListener('visibilitychange', heroEvalua);
  if(window.IntersectionObserver && cv){
    new IntersectionObserver(function(ents){
      heroVisible = ents[0].isIntersecting;
      heroEvalua();
    }, { threshold: 0 }).observe(cv);
  }
  heroEvalua();
})();
