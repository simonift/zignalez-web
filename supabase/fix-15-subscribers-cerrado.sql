-- ═══════════════════════════════════════════════════════════════════
-- fix-15 · subscribers: el insert anónimo deja de aceptar cualquier cosa
-- Zignalez · 04-10-2026
--
--   EL PROBLEMA (verificado en fix-01, líneas 76-79):
--     CREATE POLICY "Registro publico" ... FOR INSERT TO anon, authenticated
--       WITH CHECK (true);
--   Cualquiera con la clave pública —que está en el código del sitio, como
--   corresponde a una clave pública— puede insertar filas arbitrarias. Lo
--   grave no es el volumen, es que puede insertar `confirmed = TRUE`:
--   fabricar un doble opt-in que nunca ocurrió. Si esa fila sale en el
--   CSV y se le escribe, se está tratando un correo sin consentimiento,
--   que NORMATIVA-DATOS-CL.md §5 califica como GRAVE.
--
--   POR QUÉ CLOUDFLARE NO LO ARREGLA: Supabase vive en *.supabase.co y no
--   pasa por el Cloudflare de zignalez.cl. Y el CAPTCHA de Supabase cubre
--   solo los formularios de Auth, no las inserciones por PostgREST
--   (documentación oficial, verificada el 04-10-2026).
--
--   QUÉ HACE: reemplaza el WITH CHECK (true) por condiciones que una fila
--   legítima siempre cumple y una fabricada no:
--     - nunca entra confirmada: confirmed y confirmed_at los pone SOLO el
--       trigger handle_new_user() (SECURITY DEFINER, no pasa por RLS);
--     - el correo tiene forma de correo y largo razonable;
--     - el WhatsApp, si viene, tiene forma de teléfono;
--     - source es uno de los dos que usa el sitio.
--
--   QUÉ NO HACE, Y SE DICE:
--     - No limita por IP. Postgres no ve la IP de forma fiable desde RLS.
--       Un bot puede seguir metiendo correos bien formados SIN confirmar.
--       Esos quedan en confirmed = FALSE y desde este commit no salen en
--       el CSV ni en el conteo del panel (admin.js), así que no llegan a
--       ningún envío.
--     - Caso borde no cubierto: un bot pre-inserta el correo de otra
--       persona con un WhatsApp falso; si esa persona se suscribe después,
--       el trigger confirma la fila y conserva el WhatsApp ajeno. Baja
--       probabilidad; el arreglo de fondo es mover el WhatsApp a después de
--       la confirmación. Queda como FALTA.
--
--   ORDEN DE DESPLIEGUE: el CHECK es permisivo con espacios, guiones y
--   paréntesis en el teléfono, así que el cliente antiguo sigue pasando
--   aunque esta migración se aplique antes que el deploy.
-- ═══════════════════════════════════════════════════════════════════

DROP POLICY IF EXISTS "Registro publico" ON public.subscribers;

CREATE POLICY "Registro publico" ON public.subscribers
  FOR INSERT TO anon, authenticated
  WITH CHECK (
        confirmed IS NOT TRUE
    AND confirmed_at IS NULL
    AND email IS NOT NULL
    AND length(email) BETWEEN 6 AND 254
    AND email ~* '^[^@[:space:]]+@[^@[:space:]]+\.[a-z]{2,}$'
    AND (whatsapp IS NULL OR whatsapp ~ '^[+0-9 ()-]{8,22}$')
    AND (source IS NULL OR source IN ('web', 'ruleta'))
  );

COMMENT ON POLICY "Registro publico" ON public.subscribers IS
  'fix-15 · Inserta solo filas sin confirmar y bien formadas. La confirmación la escribe handle_new_user().';

-- ── Comprobaciones (ejecutar a mano con la clave anon, p.ej. desde el
--    navegador o curl contra /rest/v1/subscribers) ─────────────────────
--   {"email":"a@b.cl"}                              -> 201
--   {"email":"a@b.cl","confirmed":true}             -> 403 (new row violates RLS)
--   {"email":"no-es-correo"}                        -> 403
--   {"email":"a@b.cl","whatsapp":"+56 9 1234 5678"} -> 201
--   {"email":"a@b.cl","whatsapp":"<script>"}        -> 403
--   {"email":"a@b.cl","source":"otro"}              -> 403
--   Borrar después las filas de prueba desde el SQL Editor.

-- ============================================================
-- VUELTA ATRÁS (no ejecutar salvo decisión explícita):
--   DROP POLICY IF EXISTS "Registro publico" ON public.subscribers;
--   CREATE POLICY "Registro publico" ON public.subscribers
--     FOR INSERT TO anon, authenticated WITH CHECK (true);
-- ============================================================
