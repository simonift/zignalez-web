#!/bin/bash
# Guardian de la politica de privacidad.
#
# Invariante: la fecha de "Ultima actualizacion" de la cabecera es SIEMPRE la
# de la primera fila del historial de versiones. La fuente es el historial;
# la cabecera solo la repite. Si alguien edita la politica y no deja constancia,
# esto falla y el deploy no deberia salir.
#
# Uso:  ./comprobar-privacidad.sh [ruta-al-html]
# Sale 0 si todo cuadra, 1 si no.

set -u
ARCHIVO="${1:-deploy-web/privacidad.html}"

if [ ! -f "$ARCHIVO" ]; then
  echo "FALLA: no existe $ARCHIVO"; exit 1
fi

fallos=0
aviso(){ echo "FALLA: $1"; fallos=$((fallos+1)); }

# 1. La fecha de la cabecera
cabecera=$(grep -o 'Última actualización: <strong>[^<]*</strong>' "$ARCHIVO" \
           | head -1 | sed 's/.*<strong>//; s/<\/strong>//')
[ -z "$cabecera" ] && aviso "no encuentro la fecha de 'Última actualización' en la cabecera"

# 2. La fecha de la primera fila del historial
historial=$(awk '/id="historial"/,0' "$ARCHIVO" \
            | grep -o '<td>[0-9][0-9]-[0-9][0-9]-[0-9]\{4\}</td>' \
            | head -1 | sed 's/<td>//; s/<\/td>//')
[ -z "$historial" ] && aviso "no encuentro ninguna fila con fecha en el historial de versiones"

# 3. Tienen que ser la misma
if [ -n "$cabecera" ] && [ -n "$historial" ] && [ "$cabecera" != "$historial" ]; then
  aviso "la cabecera dice '$cabecera' y el historial '$historial'. Si cambiaste la politica, agrega la fila al historial; si agregaste la fila, copia su fecha a la cabecera."
fi

# 4. Nada de notas internas publicadas. Esto ya paso una vez: la nota de
#    'Quita esta nota al publicar' estuvo en produccion once dias.
#    'TODO' y 'PENDIENTE' se buscan en mayusculas y como palabra entera: en
#    minusculas son espanol corriente ("para todo lo demas").
for marca in "Quita esta nota" "Revision final antes de publicar" "class=\"falta\""; do
  if grep -qi -- "$marca" "$ARCHIVO"; then
    aviso "hay una marca de trabajo interno en el texto publicado: '$marca'"
  fi
done
for marca in "TODO" "FIXME" "PENDIENTE" "XXX"; do
  if grep -qw -- "$marca" "$ARCHIVO"; then
    aviso "hay una marca de trabajo interno en el texto publicado: '$marca'"
  fi
done

# 5. El RUT no se publica.
if grep -qE '[0-9]{1,2}\.[0-9]{3}\.[0-9]{3}-[0-9kK]' "$ARCHIVO"; then
  aviso "hay un RUT en el texto publicado"
fi

# 6. Coherencia interna: no se puede decir que no hay cookies y a la vez
#    nombrar las cookies de Clarity.
if grep -q "No usamos cookies de seguimiento" "$ARCHIVO" && grep -q "Clarity" "$ARCHIVO"; then
  aviso "la politica dice que no hay cookies de seguimiento y ademas describe Clarity"
fi

if [ "$fallos" -eq 0 ]; then
  echo "OK · politica coherente · ultima actualizacion: $cabecera"
  exit 0
fi
echo "$fallos problema(s). No publiques asi."
exit 1
