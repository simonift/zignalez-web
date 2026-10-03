-- ═══════════════════════════════════════════════════════════════════
-- fix-13 · Ruleta de inéditos y señal de elección · Zignalez · 03-10-2026
--
--   DECISIÓN (Simón, 03-10-2026 · ADR-007): el sitio ofrece una ruleta
--   anónima sobre los temas con extracto publicado. Girar es gratis y no
--   pide nada. ELEGIR el tema cuesta el correo, y esa elección se guarda
--   como señal agregada para decidir el orden de lanzamiento.
--
--   Qué agrega:  elecciones (qué se eligió, sin quién)
--                eleccion_emitida (quién eligió, sin qué) — solo para evitar
--                  que una misma cuenta vote muchas veces
--                registrar_eleccion() · elecciones_resumen()
--
--   Qué NO agrega: nada de lectura. La ruleta lee preview_publico() de
--                fix-11, que ya devuelve exactamente los temas con
--                visible = TRUE y preview_path IS NOT NULL. No se crea un
--                segundo endpoint para lo mismo (ADR-006, decisión 2).
--
--   LÍMITE DECLARADO, no se disfraza: las dos tablas separan el qué del
--   quién, pero a este volumen (decenas de filas) un admin que lea ambas
--   correlaciona por marca de tiempo en segundos. Esto es seudonimización,
--   NO anonimización. La protección real es que ninguna de las dos es
--   legible por anon ni por authenticated: solo admin. Se declara así en
--   privacidad.html. Si algún día el volumen lo justifica, la correlación
--   se rompe con ruido temporal, no con más tablas.
--
-- REQUIERE: fix-11 (preview_publico, tracks.preview_path). IDEMPOTENTE.
-- Vuelta atrás al final.
-- ═══════════════════════════════════════════════════════════════════

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_proc WHERE proname='preview_publico' AND pronamespace='public'::regnamespace) THEN
    RAISE EXCEPTION 'FALTA fix-11: no existe preview_publico().';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                 WHERE table_schema='public' AND table_name='tracks' AND column_name='preview_path') THEN
    RAISE EXCEPTION 'FALTA fix-11: tracks.preview_path no existe.';
  END IF;
  RAISE NOTICE 'Precondiciones OK.';
END $$;

-- ── 1 · QUÉ se eligió, sin quién ─────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.elecciones (
  id         BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  track_id   UUID NOT NULL REFERENCES public.tracks(id) ON DELETE CASCADE,
  creado_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
COMMENT ON TABLE public.elecciones IS
  'Señal agregada: qué tema inédito eligen los que dejan su correo. SIN user_id a propósito. Ver fix-13 y ADR-007.';

CREATE INDEX IF NOT EXISTS elecciones_track_idx ON public.elecciones(track_id);

ALTER TABLE public.elecciones ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS elecciones_admin_select ON public.elecciones;
CREATE POLICY elecciones_admin_select ON public.elecciones
  FOR SELECT TO authenticated USING (public.is_admin());
REVOKE ALL ON public.elecciones FROM anon, authenticated;
GRANT SELECT ON public.elecciones TO authenticated;  -- filtrado por la política

-- ── 2 · QUIÉN eligió, sin qué ────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.eleccion_emitida (
  user_id    UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  creado_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
COMMENT ON TABLE public.eleccion_emitida IS
  'Marca de que una cuenta ya ejerció su elección. No guarda cuál. Solo evita el voto repetido.';

ALTER TABLE public.eleccion_emitida ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS eleccion_emitida_admin_select ON public.eleccion_emitida;
CREATE POLICY eleccion_emitida_admin_select ON public.eleccion_emitida
  FOR SELECT TO authenticated USING (public.is_admin());
REVOKE ALL ON public.eleccion_emitida FROM anon, authenticated;
GRANT SELECT ON public.eleccion_emitida TO authenticated;

-- ── 3 · Registrar la elección ────────────────────────────────────────
--   Solo authenticated: la elección se registra DESPUÉS del magic link, no
--   al enviar el formulario. Así anon no puede inflar la señal, y de paso
--   solo cuentan los correos que confirmaron (doble opt-in de hecho).
CREATE OR REPLACE FUNCTION public.registrar_eleccion(p_track_id UUID)
RETURNS TEXT
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_uid UUID := auth.uid();
BEGIN
  IF v_uid IS NULL THEN
    RETURN 'SIN_SESION';
  END IF;

  -- El tema tiene que ser uno de los sorteables. Fuente única: la misma
  -- condición de preview_publico(). Si no tiene extracto, no se puede elegir.
  IF NOT EXISTS (
    SELECT 1 FROM public.tracks t
     WHERE t.id = p_track_id AND t.visible = TRUE AND t.preview_path IS NOT NULL
  ) THEN
    RETURN 'TEMA_NO_DISPONIBLE';
  END IF;

  IF EXISTS (SELECT 1 FROM public.eleccion_emitida e WHERE e.user_id = v_uid) THEN
    RETURN 'YA_ELEGIDO';
  END IF;

  INSERT INTO public.eleccion_emitida(user_id) VALUES (v_uid);
  INSERT INTO public.elecciones(track_id) VALUES (p_track_id);
  RETURN 'OK';
END $$;

REVOKE ALL ON FUNCTION public.registrar_eleccion(UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.registrar_eleccion(UUID) TO authenticated;
COMMENT ON FUNCTION public.registrar_eleccion(UUID) IS
  'Registra una elección por cuenta. Devuelve OK · YA_ELEGIDO · TEMA_NO_DISPONIBLE · SIN_SESION.';

-- ── 4 · Resumen para el panel ────────────────────────────────────────
--   Solo admin. No se expone a anon: un ranking público de temas inéditos
--   con cuatro votos es una métrica de vanidad (CLAUDE.md, contadores).
CREATE OR REPLACE FUNCTION public.elecciones_resumen()
RETURNS TABLE (track_id UUID, titulo TEXT, votos BIGINT, primera TIMESTAMPTZ, ultima TIMESTAMPTZ)
LANGUAGE sql SECURITY DEFINER STABLE
SET search_path = public, pg_temp
AS $$
  SELECT t.id, t.title, count(e.id), min(e.creado_at), max(e.creado_at)
    FROM public.tracks t
    LEFT JOIN public.elecciones e ON e.track_id = t.id
   WHERE public.is_admin()
     AND t.visible = TRUE AND t.preview_path IS NOT NULL
   GROUP BY t.id, t.title, t.sort_order
   ORDER BY count(e.id) DESC, t.sort_order;
$$;

REVOKE ALL ON FUNCTION public.elecciones_resumen() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.elecciones_resumen() TO authenticated;
COMMENT ON FUNCTION public.elecciones_resumen() IS
  'Ranking de elecciones por tema. Vacío si quien llama no es admin.';

-- ── 5 · Comprobaciones (ejecutar a mano, por rol) ────────────────────
--   anon          : SELECT public.registrar_eleccion('<uuid>');  -> error de permiso
--   anon          : SELECT * FROM public.elecciones;             -> error de permiso
--   fan (sesión)  : SELECT public.registrar_eleccion('<uuid sin preview>'); -> TEMA_NO_DISPONIBLE
--   fan (sesión)  : SELECT public.registrar_eleccion('<uuid con preview>'); -> OK
--   fan, otra vez : el mismo                                     -> YA_ELEGIDO
--   fan           : SELECT * FROM public.elecciones;             -> 0 filas (RLS)
--   admin         : SELECT * FROM public.elecciones_resumen();   -> el ranking

-- ============================================================
-- VUELTA ATRÁS (no ejecutar salvo decisión explícita):
--   DROP FUNCTION IF EXISTS public.elecciones_resumen();
--   DROP FUNCTION IF EXISTS public.registrar_eleccion(UUID);
--   DROP TABLE IF EXISTS public.eleccion_emitida;
--   DROP TABLE IF EXISTS public.elecciones;
-- ============================================================
