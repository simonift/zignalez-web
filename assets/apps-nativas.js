
/* Móvil: abrir apps nativas (Spotify / YouTube / Instagram) con fallback web */
(function(){
  var IS_MOBILE=/Android|iPhone|iPad|iPod/i.test(navigator.userAgent||'');
  if(!IS_MOBILE) return;
  function appUri(u){
    var m;
    if(m=u.match(/open\.spotify\.com\/(track|album|artist|playlist)\/([A-Za-z0-9]+)/)) return 'spotify:'+m[1]+':'+m[2];
    if(m=u.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([A-Za-z0-9_-]{6,})/)) return 'vnd.youtube://'+m[1];
    if(m=u.match(/instagram\.com\/([A-Za-z0-9_.]+)/)) return 'instagram://user?username='+m[1];
    return null; /* TikTok y canal de YouTube: el link https ya abre la app por universal link */
  }
  document.addEventListener('click',function(e){
    var a=e.target&&e.target.closest?e.target.closest('a[href]'):null; if(!a) return;
    var scheme=appUri(a.href); if(!scheme) return;
    e.preventDefault();
    var web=a.href, t=Date.now();
    var fb=setTimeout(function(){ if(Date.now()-t<1600 && !document.hidden) window.location.href=web; },700);
    window.addEventListener('pagehide',function(){clearTimeout(fb);},{once:true});
    window.location.href=scheme;
  },true);
})();
