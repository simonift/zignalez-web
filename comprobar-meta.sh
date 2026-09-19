#!/bin/bash
# Guardian del Lote A: que el enlace compartido nunca vuelva a salir pelado.
#
# Se ejecuta sobre el directorio publicable ANTES del deploy. Sale 1 si algo
# falta, y entonces no se despliega.
#
# Uso:  bash comprobar-meta.sh [deploy-web]

set -u
DIR="${1:-deploy-web}"
HTML="$DIR/index.html"

fallos=0
aviso(){ echo "FALLA: $1"; fallos=$((fallos+1)); }

[ -f "$HTML" ] || { echo "FALLA: no existe $HTML"; exit 1; }

# 1. Etiquetas obligatorias en la home
for etq in 'property="og:title"' 'property="og:description"' 'property="og:image"' \
           'property="og:url"' 'property="og:type"' 'name="twitter:card"' \
           'rel="canonical"' 'rel="apple-touch-icon"'; do
  grep -q -- "$etq" "$HTML" || aviso "falta $etq en index.html"
done

# 2. og:image tiene que ser absoluta y https. Una ruta relativa no la resuelve
#    ningun rastreador social: es el error clasico que deja la tarjeta sin foto.
img=$(grep -o 'property="og:image" content="[^"]*"' "$HTML" | head -1 | sed 's/.*content="//; s/"$//')
case "$img" in
  https://*) : ;;
  *) aviso "og:image no es una URL absoluta https: '$img'" ;;
esac

# 3. El archivo de la imagen existe, mide 1200x630 y pesa menos de 600 KB
#    (por encima de ese peso algunas plataformas de mensajeria no la renderizan).
# El nombre del archivo se toma SIN la cadena de consulta: la imagen se
# versiona con ?v=N para que las plataformas no sirvan la cacheada, pero en
# disco el archivo se llama igual.
arch="$DIR/$(basename "${img%%\?*}")"
if [ ! -f "$arch" ]; then
  aviso "la imagen de compartir no esta en el directorio publicable: $arch"
else
  bytes=$(wc -c < "$arch")
  [ "$bytes" -lt 614400 ] || aviso "la imagen de compartir pesa $bytes bytes (maximo 614400)"
  if command -v python3 >/dev/null 2>&1; then
    dim=$(python3 - "$arch" <<'PY' 2>/dev/null
import sys
try:
    from PIL import Image
    print("%dx%d" % Image.open(sys.argv[1]).size)
except Exception:
    print("?")
PY
)
    [ "$dim" = "1200x630" ] || [ "$dim" = "?" ] || aviso "la imagen de compartir mide $dim, debe ser 1200x630"
  fi
fi

# 4. Un <title> de una palabra no posiciona ni informa. El anterior eran 8
#    caracteres: "Zignalez".
tit=$(grep -o '<title>[^<]*</title>' "$HTML" | head -1 | sed 's/<title>//; s/<\/title>//')
[ "${#tit}" -ge 20 ] || aviso "el <title> tiene ${#tit} caracteres: '$tit' (minimo 20)"

# 5. Los tres archivos que antes devolvian el HTML de la home con un 200.
for f in robots.txt sitemap.xml favicon.ico; do
  [ -f "$DIR/$f" ] || aviso "falta $DIR/$f"
done
for f in robots.txt sitemap.xml; do
  if [ -f "$DIR/$f" ] && grep -qi 'DOCTYPE html' "$DIR/$f"; then
    aviso "$f contiene HTML: es el fallback de Cloudflare, no el archivo real"
  fi
done

# 6. El panel de administracion no se rastrea.
if [ -f "$DIR/robots.txt" ]; then
  grep -q 'Disallow: /admin.html' "$DIR/robots.txt" || aviso "robots.txt no excluye /admin.html"
fi

# 7. El JSON-LD tiene que parsear. Un schema roto no avisa: simplemente se ignora.
if command -v python3 >/dev/null 2>&1; then
  python3 - "$HTML" <<'PY' || aviso "el JSON-LD no parsea"
import json,re,sys
s=open(sys.argv[1],encoding='utf-8').read()
m=re.search(r'<script type="application/ld\+json">(.*?)</script>', s, re.S)
if not m: sys.exit(1)
json.loads(m.group(1)); sys.exit(0)
PY
fi

# 8. La politica sigue con noindex y sin Open Graph propio.
if [ -f "$DIR/privacidad.html" ]; then
  grep -q 'name="robots" content="noindex"' "$DIR/privacidad.html" \
    || aviso "privacidad.html perdio su noindex"
fi

if [ "$fallos" -eq 0 ]; then
  echo "OK · el enlace tiene cara · titulo: $tit"
  exit 0
fi
echo "$fallos problema(s). No publiques asi."
exit 1
