-- ═══════════════════════════════════════════════════════════════════
-- fix-09 · Borrado con guardas y bitácora (E6 de
-- PROMPT_MAESTRO_HDU_BORRADO_Y_LANZAMIENTO.md v1.0)
-- Zignalez · v1 · 24-09-2026
--
-- Cierra lo que el 24-09 no tenía salida desde el panel: borrar una versión
-- subida por error, quitar o cambiar de rol un archivo, y borrar un tema con
-- versiones sin dejar objetos huérfanos invisibles.
--
--   HdU-17 · borrar versión: guardas (pública, RELEASED, sostiene un
--            lanzamiento programado) + RPC que devuelve las rutas a limpiar.
--   HdU-18 · un medio de una versión pública no se borra ni cambia de rol.
--   HdU-19 · borrar tema completo por RPC; el legado deja de borrar a ciegas.
--   Bitácora: DELETE de song_versions y version_media en acceso_auditoria.
--   objetos_huerfanos(): lo que hay en el bucket y ninguna fila reclama.
--
-- REQUIERE: fix-08 v2. fix-03 y fix-06 son OPCIONALES (se detectan en runtime): la guarda de lanzamiento se
-- activa sola si public.releases existe.
-- IDEMPOTENTE. NO hace SECURITY DEFINER lo que no lo necesita.
-- ═══════════════════════════════════════════════════════════════════


-- ============================================================
-- 0. PRECONDICIONES
-- ============================================================
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                  WHERE table_schema='public' AND table_name='version_shares' AND column_name='revoked_at') THEN
    RAISE EXCEPTION 'FALTA fix-08 (version_shares.revoked_at). Ejecuta fix-08 primero.';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_proc WHERE proname='acceso_auditar' AND pronamespace='public'::regnamespace) THEN
    RAISE EXCEPTION 'FALTA public.acceso_auditar() (fix-08).';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                  WHERE table_schema='public' AND table_name='tracks' AND column_name='file_path_anterior') THEN
    RAISE NOTICE 'fix-06 no aplicado (verificado en producción 24-09): borrar_tema y objetos_huerfanos ignoran file_path_anterior hasta que exista.';
  END IF;
  IF to_regclass('public.releases') IS NULL THEN
    RAISE NOTICE 'fix-03 no aplicado: la guarda VERSION_EN_LANZAMIENTO queda latente hasta que exista public.releases.';
  END IF;
  RAISE NOTICE 'Precondiciones OK.';
END $$;


-- ============================================================
-- 1. HdU-17 · UNA VERSIÓN NO SE BORRA SI ALGO LA SOSTIENE
-- ============================================================
-- Primero el permiso: los triggers BEFORE corren antes que RLS y sus mensajes
-- filtran datos. Un no-admin recibe FORBIDDEN y nada más.
CREATE OR REPLACE FUNCTION public.song_versions_no_borrar()
RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE v_programado BOOLEAN := FALSE;
BEGIN
  IF auth.uid() IS NOT NULL AND NOT public.is_admin() THEN
    RAISE EXCEPTION 'FORBIDDEN' USING ERRCODE = '42501';
  END IF;

  IF OLD.is_public THEN
    RAISE EXCEPTION 'VERSION_PUBLICA: despublica el tema (unpublish_track) antes de borrar esta versión.'
      USING ERRCODE = '23514';
  END IF;
  IF OLD.stage = 'RELEASED' THEN
    RAISE EXCEPTION 'VERSION_RELEASED: una versión publicada no se borra; cambia la etapa primero.'
      USING ERRCODE = '23514';
  END IF;

  -- Con fix-03: si el tema está SCHEDULED/RELEASED y esta es la única versión
  -- que lo hace "listo para lanzar", borrarla dejaría el lanzamiento inválido
  -- sin que ninguna guarda lo note (releases_guardas solo valida al entrar).
  IF to_regclass('public.releases') IS NOT NULL THEN
    EXECUTE $q$
      SELECT EXISTS (
        SELECT 1 FROM public.release_tracks rt
          JOIN public.releases r ON r.id = rt.release_id
         WHERE rt.track_id = $1 AND r.status IN ('SCHEDULED','RELEASED'))
      AND NOT EXISTS (
        SELECT 1 FROM public.song_versions v
          JOIN public.version_media m ON m.version_id = v.id
         WHERE v.track_id = $1 AND v.id <> $2
           AND v.stage IN ('RELEASE_READY','RELEASED')
           AND m.role = 'MASTER' AND m.status = 'UPLOADED')
    $q$ INTO v_programado USING OLD.track_id, OLD.id;
    IF v_programado THEN
      RAISE EXCEPTION 'VERSION_EN_LANZAMIENTO: el tema está programado o publicado y esta versión lo sostiene; degrada o quita el lanzamiento primero.'
        USING ERRCODE = '23514';
    END IF;
  END IF;

  RETURN OLD;
END;
$$;

REVOKE ALL ON FUNCTION public.song_versions_no_borrar() FROM PUBLIC, anon;

DROP TRIGGER IF EXISTS song_versions_no_borrar_trg ON public.song_versions;
CREATE TRIGGER song_versions_no_borrar_trg
  BEFORE DELETE ON public.song_versions
  FOR EACH ROW EXECUTE FUNCTION public.song_versions_no_borrar();


-- ============================================================
-- 2. HdU-18 · EL LISTEN DE UNA VERSIÓN PÚBLICA NO SE TOCA
-- ============================================================
-- publish_song_version apunta tracks.file_path a ese archivo. Borrarlo o
-- cambiarle el rol deja la ficha pública sirviendo un objeto que no existe.
-- Complementa a version_media_protege_master (fix-08), que cubre RELEASED.
-- Al borrar la versión entera (CASCADE) la fila padre ya no existe y pasa.
CREATE OR REPLACE FUNCTION public.version_media_protege_publico()
RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  IF OLD.role = 'LISTEN' AND OLD.status = 'UPLOADED'
     AND (TG_OP = 'DELETE' OR NEW.role <> 'LISTEN' OR NEW.status <> 'UPLOADED'
          OR NEW.file_path IS DISTINCT FROM OLD.file_path)
     AND EXISTS (SELECT 1 FROM public.song_versions
                  WHERE id = OLD.version_id AND is_public) THEN
    RAISE EXCEPTION 'MEDIO_PUBLICO: este archivo es el que sirve la maqueta; despublica el tema antes de quitarlo o cambiarle el rol.'
      USING ERRCODE = '23514';
  END IF;
  RETURN COALESCE(NEW, OLD);
END;
$$;

REVOKE ALL ON FUNCTION public.version_media_protege_publico() FROM PUBLIC, anon;

DROP TRIGGER IF EXISTS version_media_protege_publico_trg ON public.version_media;
CREATE TRIGGER version_media_protege_publico_trg
  BEFORE UPDATE OR DELETE ON public.version_media
  FOR EACH ROW EXECUTE FUNCTION public.version_media_protege_publico();


-- ============================================================
-- 3. BITÁCORA DE BORRADOS
-- ============================================================
-- Solo DELETE: INSERT/UPDATE ya tienen song_version_stage_log, y el CASCADE de
-- medios generaría ruido. fila_antes conserva file_path, size_bytes, stage y
-- notes: es el único rastro de lo borrado.
DROP TRIGGER IF EXISTS song_versions_auditoria_trg ON public.song_versions;
CREATE TRIGGER song_versions_auditoria_trg
  AFTER DELETE ON public.song_versions
  FOR EACH ROW EXECUTE FUNCTION public.acceso_auditar();

DROP TRIGGER IF EXISTS version_media_auditoria_trg ON public.version_media;
CREATE TRIGGER version_media_auditoria_trg
  AFTER DELETE ON public.version_media
  FOR EACH ROW EXECUTE FUNCTION public.acceso_auditar();


-- ============================================================
-- 4. RPC · BORRAR VERSIÓN (devuelve las rutas a limpiar del bucket)
-- ============================================================
-- Sin SECURITY DEFINER: corre con los permisos del admin, que es el dueño.
-- Orden a propósito: primero la base (donde viven las guardas), luego el
-- cliente borra los objetos con storage.remove(). Si eso falla, la fila ya no
-- existe: el cliente lo registra (acceso_auditoria, DELETE_STORAGE_FALLIDO) y
-- objetos_huerfanos() lo encuentra después.
CREATE OR REPLACE FUNCTION public.borrar_version(p_version_id UUID)
RETURNS TEXT[]
LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $$
DECLARE v_rutas TEXT[]; v_n INT;
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'FORBIDDEN' USING ERRCODE = '42501';
  END IF;
  SELECT coalesce(array_agg(file_path), '{}') INTO v_rutas
    FROM public.version_media WHERE version_id = p_version_id;
  DELETE FROM public.song_versions WHERE id = p_version_id;
  GET DIAGNOSTICS v_n = ROW_COUNT;
  IF v_n = 0 THEN
    RAISE EXCEPTION 'VERSION_NOT_FOUND' USING ERRCODE = 'P0002';
  END IF;
  RETURN v_rutas;
END;
$$;

REVOKE ALL ON FUNCTION public.borrar_version(UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.borrar_version(UUID) TO authenticated;


-- ============================================================
-- 5. HdU-19 · RPC · BORRAR TEMA COMPLETO
-- ============================================================
-- Aplica las guardas de cada versión (una que no se pueda borrar aborta TODO:
-- es una transacción) y devuelve todas las rutas: versiones + archivo legado
-- + file_path_anterior. Con fix-03, release_tracks RESTRICT impide borrar un
-- tema que esté en cualquier lanzamiento: se traduce el error.
CREATE OR REPLACE FUNCTION public.borrar_tema(p_track_id UUID)
RETURNS TEXT[]
LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $$
DECLARE v_rutas TEXT[]; v_legado TEXT[]; v_n INT;
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'FORBIDDEN' USING ERRCODE = '42501';
  END IF;
  SELECT coalesce(array_agg(m.file_path), '{}') INTO v_rutas
    FROM public.version_media m
    JOIN public.song_versions v ON v.id = m.version_id
   WHERE v.track_id = p_track_id;
  -- file_path_anterior es de fix-06, que puede no estar: SQL dinámico.
  IF EXISTS (SELECT 1 FROM information_schema.columns
              WHERE table_schema='public' AND table_name='tracks' AND column_name='file_path_anterior') THEN
    EXECUTE 'SELECT array_remove(ARRAY[ltrim(file_path,''/''), ltrim(file_path_anterior,''/'')], NULL) FROM public.tracks WHERE id = $1'
       INTO v_legado USING p_track_id;
  ELSE
    SELECT array_remove(ARRAY[ltrim(file_path,'/')], NULL) INTO v_legado FROM public.tracks WHERE id = p_track_id;
  END IF;
  IF v_legado IS NULL THEN
    RAISE EXCEPTION 'TRACK_NOT_FOUND' USING ERRCODE = 'P0002';
  END IF;

  -- Con fix-03: si el tema está en cualquier lanzamiento, el mensaje correcto
  -- es este, no el de la versión (que saltaría antes que el RESTRICT).
  IF to_regclass('public.releases') IS NOT NULL THEN
    IF EXISTS (SELECT 1 FROM public.release_tracks WHERE track_id = p_track_id) THEN
      RAISE EXCEPTION 'TEMA_EN_LANZAMIENTO: el tema está en un lanzamiento; quítalo de ahí primero.'
        USING ERRCODE = '23514';
    END IF;
  END IF;

  -- Versión por versión, para que cada una pase por song_versions_no_borrar.
  DELETE FROM public.song_versions WHERE track_id = p_track_id;

  BEGIN
    DELETE FROM public.tracks WHERE id = p_track_id;
  EXCEPTION WHEN foreign_key_violation THEN
    RAISE EXCEPTION 'TEMA_EN_LANZAMIENTO: el tema está en un lanzamiento; quítalo de ahí primero.'
      USING ERRCODE = '23514';
  END;
  GET DIAGNOSTICS v_n = ROW_COUNT;
  IF v_n = 0 THEN
    RAISE EXCEPTION 'TRACK_NOT_FOUND' USING ERRCODE = 'P0002';
  END IF;

  RETURN (SELECT coalesce(array_agg(DISTINCT r), '{}')
            FROM unnest(v_rutas || v_legado) AS r WHERE r IS NOT NULL AND r <> '');
END;
$$;

REVOKE ALL ON FUNCTION public.borrar_tema(UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.borrar_tema(UUID) TO authenticated;


-- ============================================================
-- 6. OBJETOS HUÉRFANOS · lo que hay en el bucket y nadie reclama
-- ============================================================
-- SECURITY DEFINER porque lee storage.objects completo. Solo admin.
CREATE OR REPLACE FUNCTION public.objetos_huerfanos()
RETURNS TABLE (name TEXT, size_bytes BIGINT, created_at TIMESTAMPTZ)
LANGUAGE plpgsql SECURITY DEFINER STABLE
SET search_path = public, storage, pg_temp
AS $$
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'FORBIDDEN' USING ERRCODE = '42501';
  END IF;
  RETURN QUERY EXECUTE
    'SELECT o.name::TEXT, (o.metadata->>''size'')::BIGINT, o.created_at
       FROM storage.objects o
      WHERE o.bucket_id = ''maquetas''
        AND NOT EXISTS (SELECT 1 FROM public.version_media m WHERE m.file_path = o.name)
        AND NOT EXISTS (SELECT 1 FROM public.tracks t WHERE ltrim(t.file_path,''/'') = o.name'
    || CASE WHEN EXISTS (SELECT 1 FROM information_schema.columns
                          WHERE table_schema='public' AND table_name='tracks' AND column_name='file_path_anterior')
            THEN ' OR ltrim(t.file_path_anterior,''/'') = o.name' ELSE '' END
    || ') ORDER BY o.created_at DESC';
END;
$$;

REVOKE ALL ON FUNCTION public.objetos_huerfanos() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.objetos_huerfanos() TO authenticated;


-- ============================================================
-- 7. VERIFICACIÓN (describe el esquema; las pruebas reales son §6 del prompt)
-- ============================================================
SELECT
  'triggers=' || (SELECT count(*) FROM pg_trigger WHERE NOT tgisinternal AND tgname IN (
     'song_versions_no_borrar_trg','version_media_protege_publico_trg',
     'song_versions_auditoria_trg','version_media_auditoria_trg'))::TEXT ||
  ' | rpc=' || (SELECT count(*) FROM pg_proc WHERE pronamespace='public'::regnamespace
     AND proname IN ('borrar_version','borrar_tema','objetos_huerfanos'))::TEXT ||
  ' | definer_sin_search_path=' || (SELECT count(*) FROM pg_proc
     WHERE pronamespace='public'::regnamespace AND prosecdef AND proconfig IS NULL)::TEXT ||
  ' | anon_ejecuta=' || (SELECT count(*) FROM information_schema.routine_privileges
     WHERE routine_schema='public' AND grantee='anon'
       AND routine_name IN ('borrar_version','borrar_tema','objetos_huerfanos'))::TEXT ||
  ' | guarda_lanzamiento=' || (to_regclass('public.releases') IS NOT NULL)::TEXT
  AS resultado;

-- ESPERADO (sin fix-03):  triggers=4 | rpc=3 | definer_sin_search_path=0 | anon_ejecuta=0 | guarda_lanzamiento=false
-- ESPERADO (con fix-03):  ... | guarda_lanzamiento=true


-- ============================================================
-- VUELTA ATRÁS (no ejecutar salvo decisión explícita)
-- ============================================================
-- drop trigger if exists song_versions_no_borrar_trg on public.song_versions;
-- drop trigger if exists version_media_protege_publico_trg on public.version_media;
-- drop trigger if exists song_versions_auditoria_trg on public.song_versions;
-- drop trigger if exists version_media_auditoria_trg on public.version_media;
-- drop function if exists public.borrar_version(uuid), public.borrar_tema(uuid), public.objetos_huerfanos();
-- La bitácora se conserva: es historia.
