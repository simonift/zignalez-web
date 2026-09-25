// preview-recorte.js · Zignalez · 25-09-2026
//
// Recorta un tramo de audio ya decodificado y lo codifica a MP3 en el navegador
// (HdU-28: el recorte se hace desde el panel, sin ffmpeg). MP3 porque es lo
// único que el navegador puede codificar (con lamejs) y que suena en todo,
// incluido el WebView de Instagram. Puro: sin DOM, sin red — se prueba en node.
//
// Uso en el navegador: window.ZgRecorte.recortar(audioBuffer, ini, seg) →
// { canales: [Float32Array…], sampleRate } y luego .codificarMp3(...) → Uint8Array[].
(function (root) {
  'use strict';

  var FADE_IN = 0.3, FADE_OUT = 1.5;

  // Toma [ini, ini+seg) de cada canal, con fade-in/out. Si el tramo se sale del
  // final, se recorta a lo que hay (y se informa la duración real).
  function recortar(canales, sampleRate, ini, seg) {
    var desde = Math.max(0, Math.floor(ini * sampleRate));
    var largoTotal = canales[0].length;
    var hasta = Math.min(largoTotal, desde + Math.floor(seg * sampleRate));
    var n = Math.max(0, hasta - desde);
    var fi = Math.min(n, Math.floor(FADE_IN * sampleRate));
    var fo = Math.min(n, Math.floor(FADE_OUT * sampleRate));
    var out = canales.map(function (c) {
      var s = new Float32Array(n);
      for (var i = 0; i < n; i++) {
        var g = 1;
        if (i < fi) g = i / fi;
        if (i >= n - fo) g = Math.min(g, (n - 1 - i) / fo);
        s[i] = c[desde + i] * g;
      }
      return s;
    });
    return { canales: out, sampleRate: sampleRate, duracion: n / sampleRate };
  }

  function aInt16(f32) {
    var o = new Int16Array(f32.length);
    for (var i = 0; i < f32.length; i++) {
      var v = Math.max(-1, Math.min(1, f32[i]));
      o[i] = v < 0 ? v * 0x8000 : v * 0x7FFF;
    }
    return o;
  }

  // lamejs: bloques de 1152 muestras. Devuelve los trozos para armar el Blob.
  function codificarMp3(lame, canales, sampleRate, kbps) {
    var ch = Math.min(2, canales.length);
    var enc = new lame.Mp3Encoder(ch, sampleRate, kbps || 128);
    var L = aInt16(canales[0]);
    var R = ch === 2 ? aInt16(canales[1]) : null;
    var trozos = [], paso = 1152, d;
    for (var i = 0; i < L.length; i += paso) {
      d = ch === 2 ? enc.encodeBuffer(L.subarray(i, i + paso), R.subarray(i, i + paso))
                   : enc.encodeBuffer(L.subarray(i, i + paso));
      if (d.length) trozos.push(d);
    }
    d = enc.flush();
    if (d.length) trozos.push(d);
    return trozos;
  }

  var api = { recortar: recortar, codificarMp3: codificarMp3, aInt16: aInt16, FADE_IN: FADE_IN, FADE_OUT: FADE_OUT };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.ZgRecorte = api;
})(typeof window !== 'undefined' ? window : globalThis);
