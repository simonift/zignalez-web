
(function(){
  var wrap=document.getElementById('spWrap'); if(!wrap) return;
  var mount=document.getElementById('spPlayer');
  var API=null, ctrl=null, pend=null, curBtn=null;
  window.onSpotifyIframeApiReady=function(a){ API=a; if(pend){go(pend.uri,pend.btn);pend=null;} };
  function setBtn(b,on){ if(!b)return; b.classList.toggle('playing',on); b.textContent=on?'\u23F8':'\u25B6'; b.setAttribute('aria-pressed',on?'true':'false'); }
  function go(uri,btn){
    wrap.hidden=false;
    if(!API){ pend={uri:uri,btn:btn}; return; }
    if(curBtn&&curBtn!==btn) setBtn(curBtn,false);
    curBtn=btn; setBtn(btn,true);
    if(!ctrl){ API.createController(mount,{uri:uri,width:'100%',height:80},function(c){ ctrl=c; ctrl.addListener('playback_update',function(e){ if(e&&e.data&&typeof e.data.isPaused!=='undefined'){ setBtn(curBtn,!e.data.isPaused); } }); ctrl.play(); }); }
    else { ctrl.loadUri(uri); ctrl.play(); }
  }
  document.querySelectorAll('#musica .rplay').forEach(function(btn){
    btn.addEventListener('click',function(e){ e.preventDefault(); e.stopPropagation();
      var uri=btn.getAttribute('data-uri');
      if(curBtn===btn && ctrl){ if(btn.classList.contains('playing')){ctrl.pause();setBtn(btn,false);} else {ctrl.play();setBtn(btn,true);} return; }
      go(uri,btn);
    });
  });
  var track=document.getElementById('cfMusica');
  function step(d){ var c=track&&track.querySelector('.release'); if(!c)return; track.scrollBy({left:d*(c.getBoundingClientRect().width+16),behavior:'smooth'}); }
  var wrp=track?track.closest('.cf-wrap'):null;
  if(wrp){ var pv=wrp.querySelector('.cf-prev'), nx=wrp.querySelector('.cf-next'); if(pv)pv.addEventListener('click',function(){step(-1);}); if(nx)nx.addEventListener('click',function(){step(1);}); }
})();
