-- ═══════════════════════════════════════════════════════════════════
-- fix-10 · Lanzamiento mínimo: un single por tema, fecha de estreno
-- (E4 recortada de PROMPT_MAESTRO_HDU_BORRADO_Y_LANZAMIENTO.md v1.0,
--  HdU-20/21/22). Zignalez · v1 · 25-09-2026
--
-- Lo que pide el artista (25-09): "si subo un master debo poder asignarle una
-- fecha de estreno opcional y editarla más adelante". La fecha vive en
-- releases.release_date (fix-03), no en la versión. Este archivo solo añade
-- lo que fix-03 no tiene: crear el lanzamiento de un tema en UNA operación y
-- la regla "un tema tiene como máximo un lanzamiento que no sea RELEASED".
--
-- DECISIÓN (25-09, confirmada por el usuario): poner fecha deja el lanzamiento
-- en PLANNING. Programar (SCHEDULED) es un acto aparte: dispara las guardas
-- de fix-03 y congela el tipo.
--
-- REQUIERE: fix-03 v4 y fix-08 v2. IDEMPOTENTE.
-- ═══════════════════════════════════════════════════════════════════


-- ============================================================
-- 0. PRECONDICIONES
-- ============================================================
DO $$
BEGIN
  IF to_regclass('public.releases') IS NULL OR to_regclass('public.release_tracks') IS NULL THEN
    RAISE EXCEPTION 'FALTA fix-03 (public.releases / release_tracks). Ejecuta fix-03 primero.';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_proc WHERE proname='releases_guardas' AND pronamespace='public'::regnamespace) THEN
    RAISE EXCEPTION 'FALTA releases_guardas() (fix-03 v4).';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                  WHERE table_schema='public' AND table_name='version_shares' AND column_name='revoked_at') THEN
    RAISE EXCEPTION 'FALTA fix-08.';
  END IF;
  RAISE NOTICE 'Precondiciones OK.';
END $$;


-- ============================================================
-- 1. UN TEMA, UN LANZAMIENTO ABIERTO
-- ============================================================
-- No se puede expresar con un índice parcial (cruza dos tablas). Trigger
-- BEFORE INSERT en release_tracks: si el tema ya está en un lanzamiento que
-- no sea RELEASED, se rechaza. Un tema puede volver a lanzarse (remix,
-- reedición) cuando el anterior ya está publicado.
CREATE OR REPLACE FUNCTION public.release_tracks_un_abierto()
RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  IF auth.uid() IS NOT NULL AND NOT public.is_admin() THEN
    RAISE EXCEPTION 'FORBIDDEN' USING ERRCODE = '42501';
  END IF;
  IF EXISTS (SELECT 1 FROM public.release_tracks rt
               JOIN public.releases r ON r.id = rt.release_id
              WHERE rt.track_id = NEW.track_id
                AND rt.release_id <> NEW.release_id
                AND r.status <> 'RELEASED') THEN
    RAISE EXCEPTION 'YA_TIENE_LANZAMIENTO: el tema ya está en un lanzamiento abierto; publícalo o elimínalo antes de crear otro.'
      USING ERRCODE = '23505';
  END IF;
  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.release_tracks_un_abierto() FROM PUBLIC, anon;

DROP TRIGGER IF EXISTS release_tracks_un_abierto_trg ON public.release_tracks;
CREATE TRIGGER release_tracks_un_abierto_trg
  BEFORE INSERT ON public.release_tracks
  FOR EACH ROW EXECUTE FUNCTION public.release_tracks_un_abierto();


-- ============================================================
-- 2. RPC · CREAR SINGLE (release + track en una transacción)
-- ============================================================
-- Dos escrituras separadas desde el cliente = un lanzamiento vacío si falla
-- la segunda. Sin SECURITY DEFINER: el admin es el dueño (rel_insert exige
-- owner_id = auth.uid(), que es el DEFAULT).
CREATE OR REPLACE FUNCTION public.crear_single(p_track_id UUID, p_release_date TIMESTAMPTZ DEFAULT NULL)
RETURNS UUID
LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $$
DECLARE v_title TEXT; v_id UUID;
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'FORBIDDEN' USING ERRCODE = '42501';
  END IF;
  SELECT coalesce(nullif(btrim(title), ''), slug) INTO v_title FROM public.tracks WHERE id = p_track_id;
  IF v_title IS NULL THEN
    RAISE EXCEPTION 'TRACK_NOT_FOUND' USING ERRCODE = 'P0002';
  END IF;
  INSERT INTO public.releases (title, release_type, status, release_date)
  VALUES (v_title, 'SINGLE', 'PLANNING', p_release_date)
  RETURNING id INTO v_id;
  INSERT INTO public.release_tracks (release_id, track_id, track_order)
  VALUES (v_id, p_track_id, 1);
  RETURN v_id;
END;
$$;

REVOKE ALL ON FUNCTION public.crear_single(UUID, TIMESTAMPTZ) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.crear_single(UUID, TIMESTAMPTZ) TO authenticated;


-- ============================================================
-- 3. VERIFICACIÓN
-- ============================================================
SELECT
  'trg_un_abierto=' || (SELECT count(*) FROM pg_trigger WHERE NOT tgisinternal AND tgname='release_tracks_un_abierto_trg')::TEXT ||
  ' | rpc_crear_single=' || (SELECT count(*) FROM pg_proc WHERE pronamespace='public'::regnamespace AND proname='crear_single')::TEXT ||
  ' | definer_sin_search_path=' || (SELECT count(*) FROM pg_proc
     WHERE pronamespace='public'::regnamespace AND prosecdef AND proconfig IS NULL)::TEXT ||
  ' | anon_ejecuta=' || (SELECT count(*) FROM information_schema.routine_privileges
     WHERE routine_schema='public' AND grantee='anon' AND routine_name='crear_single')::TEXT
  AS resultado;

-- ESPERADO: trg_un_abierto=1 | rpc_crear_single=1 | definer_sin_search_path=0 | anon_ejecuta=0


-- ============================================================
-- VUELTA ATRÁS
-- ============================================================
-- drop trigger if exists release_tracks_un_abierto_trg on public.release_tracks;
-- drop function if exists public.release_tracks_un_abierto(), public.crear_single(uuid, timestamptz);
