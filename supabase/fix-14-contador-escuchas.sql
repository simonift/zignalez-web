-- ═══════════════════════════════════════════════════════════════════
-- fix-14 · Contador agregado de escuchas · Zignalez · 03-10-2026
--
--   INDEPENDIENTE DE fix-13. Se puede aplicar antes o después; no toca
--   elecciones ni eleccion_emitida. Verificado el 03-10-2026 contra
--   producción: pedir_escucha() responde 401 (existe, restringida), luego
--   fix-11 está aplicado y public.escuchas ya está acumulando filas.
--
--   QUÉ AGREGA:  escuchas_resumen() — una fila por tema visible con
--                oyentes, escuchas completadas, primera y última.
--                Nada más. No crea tablas ni cambia políticas.
--
--   QUÉ NO AGREGA, Y POR QUÉ:  ninguna función que devuelva QUIÉN escuchó
--                qué. La política de privacidad publicada (v. 07-09-2026)
--                declara en su punto 3 "entender el uso del sitio DE FORMA
--                AGREGADA". Una lista por persona excede esa finalidad.
--                Según NORMATIVA-DATOS-CL.md §5 eso es infracción GRAVE
--                (hasta 10.000 UTM) desde que rija la 21.719, no leve.
--                Para hacerlo hay que publicar primero una versión nueva
--                de la política que declare el dato, la finalidad y el
--                plazo de conservación. El dato ya existe en la tabla: lo
--                que falta es el permiso, no el SQL.
--
--   DEUDA DECLARADA, anterior a este fix: la política tampoco menciona
--   hoy que el sitio registre qué temas escucha cada miembro, aunque
--   fix-11 lo viene guardando. Es el control de escucha única y es
--   defendible como necesario para el servicio, pero no está escrito.
--   Corresponde declararlo en la misma versión nueva de la política.
-- ═══════════════════════════════════════════════════════════════════

-- ── 1 · Resumen agregado ─────────────────────────────────────────────
--   LEFT JOIN a propósito: un tema con CERO oyentes es la señal más útil
--   de la tabla y desaparecería con un INNER JOIN.
--   La PK de escuchas es (user_id, track_id), así que count(e.*) ya es
--   el número de personas distintas; no hace falta DISTINCT.
--   Solo admin, igual que elecciones_resumen: un contador público con
--   números de dos dígitos es métrica de vanidad (CLAUDE.md).
CREATE OR REPLACE FUNCTION public.escuchas_resumen()
RETURNS TABLE (
  track_id     UUID,
  titulo       TEXT,
  oyentes      BIGINT,
  completadas  BIGINT,
  primera      TIMESTAMPTZ,
  ultima       TIMESTAMPTZ
)
LANGUAGE sql SECURITY DEFINER STABLE
SET search_path = public, pg_temp
AS $$
  SELECT t.id,
         t.title,
         count(e.user_id),
         count(e.user_id) FILTER (WHERE e.completada),
         min(e.primera_at),
         max(e.primera_at)
    FROM public.tracks t
    LEFT JOIN public.escuchas e ON e.track_id = t.id
   WHERE public.is_admin()
     AND t.visible = TRUE
   GROUP BY t.id, t.title, t.sort_order
   ORDER BY count(e.user_id) DESC, t.sort_order NULLS LAST;
$$;

REVOKE ALL ON FUNCTION public.escuchas_resumen() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.escuchas_resumen() TO authenticated;
COMMENT ON FUNCTION public.escuchas_resumen() IS
  'Conteo AGREGADO de escuchas por tema. Sin user_id a propósito: la política declara uso agregado. Vacío si quien llama no es admin.';

-- ── 2 · Comprobaciones (ejecutar a mano, por rol) ────────────────────
--   anon          : SELECT * FROM public.escuchas_resumen();  -> error de permiso
--   fan (sesión)  : SELECT * FROM public.escuchas_resumen();  -> 0 filas (is_admin falso)
--   admin         : SELECT * FROM public.escuchas_resumen();  -> una fila por tema visible,
--                                                               incluidos los de 0 oyentes
--   admin         : comparar oyentes vs completadas: la diferencia es
--                   cuánta gente abrió y no terminó. Es la señal real.

-- ============================================================
-- VUELTA ATRÁS (no ejecutar salvo decisión explícita):
--   DROP FUNCTION IF EXISTS public.escuchas_resumen();
-- ============================================================
