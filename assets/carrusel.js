
(function(){
  var car=document.getElementById('estrenoCar'); if(!car)return;
  var track=car.querySelector('.track'), slides=[].slice.call(car.querySelectorAll('.slide'));
  var dots=[].slice.call(car.querySelectorAll('.dot')), vids=slides.map(function(s){return s.querySelector('video');});
  var now=document.getElementById('cNow'), i=0, n=slides.length, timer=null;
  var reduce=window.matchMedia&&window.matchMedia('(prefers-reduced-motion:reduce)').matches;
  function playOnly(k){vids.forEach(function(v,j){if(!v)return; if(j===k){v.play&&v.play().catch(function(){});} else {v.pause&&v.pause(); try{v.currentTime=0;}catch(e){}}});}
  function go(k){i=(k+n)%n; track.style.transform='translateX(-'+(i*100)+'%)';
    dots.forEach(function(d,j){d.classList.toggle('is-active',j===i);});
    slides.forEach(function(s,j){s.setAttribute('aria-hidden',j===i?'false':'true');});
    if(now)now.textContent=(i+1); playOnly(i); restart();}
  function restart(){if(reduce)return; clearInterval(timer); timer=setInterval(function(){go(i+1);},9000);}
  car.querySelector('.next').addEventListener('click',function(){go(i+1);});
  car.querySelector('.prev').addEventListener('click',function(){go(i-1);});
  dots.forEach(function(d){d.addEventListener('click',function(){go(+d.dataset.go);});});
  var x0=null; car.addEventListener('touchstart',function(e){x0=e.touches[0].clientX;},{passive:true});
  car.addEventListener('touchend',function(e){if(x0===null)return;var dx=e.changedTouches[0].clientX-x0;if(Math.abs(dx)>44)go(i+(dx<0?1:-1));x0=null;});
  playOnly(0); restart();
})();
