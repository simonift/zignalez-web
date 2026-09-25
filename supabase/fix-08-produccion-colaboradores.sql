-- ═══════════════════════════════════════════════════════════════════
-- fix-08 · Producción y colaboradores
-- Zignalez · v1 · 24-09-2026
--
-- Implementa la parte de base de PROMPT_MAESTRO_HDU_CATALOGO.md v1.1
-- (docs/prompts-maestros/). Cierra lo que la revisión por roles marcó como
-- SIN RESPALDO en fix-02:
--
--   HdU-13 · shares sin fecha = acceso eterno (B-3). shared_by sobrescribible.
--   HdU-06 · UPLOADED sin objeto real en el bucket.
--   HdU-07 · RELEASED sin MASTER. Sin registro de cambios de etapa.
--   HdU-12 · buscar un colaborador por correo sin exponer auth.users.
--   HdU-14 · la vista del productor filtrada en la BASE, no en JavaScript.
--   HdU-16 · bitácora de altas, shares y revocaciones.
--
-- REQUIERE: fix-01 y fix-02 v3. El bloque 0 aborta si faltan.
-- IDEMPOTENTE: se puede ejecutar dos veces.
-- NO toca fix-03 (releases): E4 queda pospuesta.
--
-- Toda función SECURITY DEFINER de este archivo fija search_path y revoca
-- EXECUTE a PUBLIC y anon (Supabase se lo concede por defecto).
-- ═══════════════════════════════════════════════════════════════════


-- ============================================================
-- 0. PRECONDICIONES
-- ============================================================
DO $$
DECLARE v_sin_fecha INT;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'is_admin'
                   AND pronamespace = 'public'::regnamespace) THEN
    RAISE EXCEPTION 'FALTA public.is_admin(). Ejecuta fix-01 primero.';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'confirm_version_media'
                   AND pronamespace = 'public'::regnamespace) THEN
    RAISE EXCEPTION 'FALTA public.confirm_version_media(). Ejecuta fix-02 v3 primero.';
  END IF;
  IF (SELECT count(*) FROM pg_tables WHERE schemaname = 'public'
        AND tablename IN ('song_versions','version_media','collaborators','version_shares')) <> 4 THEN
    RAISE EXCEPTION 'FALTAN tablas de fix-02 (song_versions, version_media, collaborators, version_shares).';
  END IF;

  -- expires_at pasa a NOT NULL. Si ya hay shares sin fecha, NO se les inventa
  -- una: se aborta y se decide a mano (fecha o borrado).
  SELECT count(*) INTO v_sin_fecha FROM public.version_shares WHERE expires_at IS NULL;
  IF v_sin_fecha > 0 THEN
    RAISE EXCEPTION 'HAY % SHARE(S) SIN FECHA. Dales expires_at o bórralos antes de ejecutar fix-08: '
                    'select * from public.version_shares where expires_at is null;', v_sin_fecha;
  END IF;
  RAISE NOTICE 'Precondiciones OK.';
END $$;


-- ============================================================
-- 1. HdU-13 · SHARES CON FECHA, PLAZO MÁXIMO Y AUTOR REAL
-- ============================================================
ALTER TABLE public.version_shares ADD COLUMN IF NOT EXISTS revoked_at TIMESTAMPTZ;
ALTER TABLE public.version_shares ALTER COLUMN expires_at SET NOT NULL;

COMMENT ON COLUMN public.version_shares.expires_at IS
  'Obligatorio. NULL significaba "para siempre" (B-3). Máximo: share_plazo_maximo().';
COMMENT ON COLUMN public.version_shares.revoked_at IS
  'Revocación manual. Se conserva la fila: la historia no se borra.';

-- Fuente única del plazo. Cambiarlo es editar esta línea y volver a ejecutar.
CREATE OR REPLACE FUNCTION public.share_plazo_maximo()
RETURNS INTERVAL LANGUAGE sql IMMUTABLE
SET search_path = public, pg_temp
AS $$ SELECT INTERVAL '30 days' $$;

-- Inofensiva (devuelve una constante), pero la regla del archivo es que ninguna
-- función nueva quede ejecutable por anon. Se omitió en la primera ejecución en
-- producción (24-09) y apareció al listar routine_privileges.
REVOKE ALL ON FUNCTION public.share_plazo_maximo() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.share_plazo_maximo() TO authenticated;

CREATE OR REPLACE FUNCTION public.version_shares_reglas()
RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE v_reactiva BOOLEAN;
BEGIN
  -- Primero el permiso. Los triggers BEFORE corren ANTES que el WITH CHECK de
  -- RLS: sin esta línea, un fan que intenta compartir recibiría mensajes como
  -- NO_ES_COLABORADOR, que le confirman datos que no debe saber (verificado en
  -- prueba local 24-09). vs_admin_write lo rechazaría igual, pero después.
  IF auth.uid() IS NOT NULL AND NOT public.is_admin() THEN
    RAISE EXCEPTION 'FORBIDDEN' USING ERRCODE = '42501';
  END IF;

  IF TG_OP = 'INSERT' THEN
    -- El autor es quien ejecuta, nunca lo que mande el cliente. En el SQL
    -- Editor auth.uid() es NULL: ahí se respeta el valor explícito.
    NEW.shared_by  := COALESCE(auth.uid(), NEW.shared_by);
    NEW.shared_at  := NOW();
    NEW.revoked_at := NULL;
  ELSE
    -- Revocar: fija la hora real y corta el acceso ya. No hay vuelta atrás
    -- por UPDATE de revoked_at: reactivar es volver a compartir.
    IF NEW.revoked_at IS NOT NULL AND OLD.revoked_at IS NULL THEN
      NEW.revoked_at := NOW();
      NEW.expires_at := LEAST(OLD.expires_at, NOW());
      NEW.shared_by  := OLD.shared_by;
      NEW.shared_at  := OLD.shared_at;
      RETURN NEW;
    END IF;
    IF OLD.revoked_at IS NOT NULL AND NEW.revoked_at IS NOT NULL THEN
      RAISE EXCEPTION 'SHARE_REVOCADO: vuelve a compartir en vez de editar un share revocado.'
        USING ERRCODE = '23514';
    END IF;
    -- Volver a compartir (revocado o vencido → vigente) cuenta como un share
    -- nuevo: nuevo autor y nueva fecha. Cualquier otra edición conserva ambos.
    v_reactiva := NEW.revoked_at IS NULL
                  AND (OLD.revoked_at IS NOT NULL OR OLD.expires_at <= NOW());
    IF v_reactiva THEN
      NEW.shared_by := COALESCE(auth.uid(), OLD.shared_by);
      NEW.shared_at := NOW();
    ELSE
      NEW.shared_by := OLD.shared_by;
      NEW.shared_at := OLD.shared_at;
    END IF;
  END IF;

  IF NEW.expires_at IS NULL THEN
    RAISE EXCEPTION 'SHARE_SIN_FECHA: todo acceso compartido vence.' USING ERRCODE = '23502';
  END IF;
  IF NEW.expires_at <= NOW() THEN
    RAISE EXCEPTION 'SHARE_FECHA_PASADA: la fecha de vencimiento ya pasó.' USING ERRCODE = '23514';
  END IF;
  IF NEW.expires_at > NOW() + public.share_plazo_maximo() THEN
    RAISE EXCEPTION 'SHARE_PLAZO_EXCEDIDO: máximo %.', public.share_plazo_maximo() USING ERRCODE = '23514';
  END IF;

  -- Sin fila en collaborators, share_vigente() nunca lo autorizaría: sería un
  -- share que no sirve y que nadie ve fallar (M-7).
  IF NOT EXISTS (SELECT 1 FROM public.collaborators WHERE user_id = NEW.collaborator_id) THEN
    RAISE EXCEPTION 'NO_ES_COLABORADOR: da de alta a la persona antes de compartirle.'
      USING ERRCODE = '23503';
  END IF;

  -- El colaborador solo puede oír LISTEN (can_read_maqueta nivel 2). Una
  -- versión sin LISTEN confirmado le aparecería muda (ADR-003, riesgo abierto).
  IF NOT EXISTS (SELECT 1 FROM public.version_media
                  WHERE version_id = NEW.version_id AND role = 'LISTEN' AND status = 'UPLOADED') THEN
    RAISE EXCEPTION 'SHARE_SIN_ESCUCHA: la versión no tiene archivo LISTEN confirmado.'
      USING ERRCODE = '23514';
  END IF;

  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.version_shares_reglas() FROM PUBLIC, anon;

DROP TRIGGER IF EXISTS version_shares_reglas_trg ON public.version_shares;
CREATE TRIGGER version_shares_reglas_trg
  BEFORE INSERT OR UPDATE ON public.version_shares
  FOR EACH ROW EXECUTE FUNCTION public.version_shares_reglas();

-- share_vigente() de fix-02, idéntica salvo dos cosas: la rama
-- "expires_at IS NULL" ya no existe (NOT NULL), y un share revocado no vale.
CREATE OR REPLACE FUNCTION public.share_vigente(p_version_id UUID)
RETURNS BOOLEAN
LANGUAGE sql SECURITY DEFINER STABLE
SET search_path = public, pg_temp
AS $$
  SELECT EXISTS (
    SELECT 1
      FROM public.version_shares s
      JOIN public.collaborators c ON c.user_id = s.collaborator_id
     WHERE s.version_id = p_version_id
       AND s.collaborator_id = auth.uid()
       AND c.active = TRUE
       AND s.revoked_at IS NULL
       AND s.expires_at > NOW());
$$;

REVOKE ALL ON FUNCTION public.share_vigente(UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.share_vigente(UUID) TO authenticated;


-- ============================================================
-- 2. HdU-06 · UPLOADED EXIGE EL OBJETO REAL
-- ============================================================
-- confirm_version_media() ya lo comprueba, pero vm_update deja al dueño poner
-- status='UPLOADED' directo, y registrar_derivada() (fix-06) inserta UPLOADED.
-- Este trigger hace la regla independiente del camino.
CREATE OR REPLACE FUNCTION public.version_media_exige_objeto()
RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, storage, pg_temp
AS $$
BEGIN
  -- Solo se evalúa para el dueño o el admin. Para cualquier otro, RLS rechazará
  -- la escritura; responder OBJETO_INEXISTENTE antes le diría qué rutas existen.
  IF NOT (NEW.owner_id = auth.uid() OR public.is_admin() OR auth.uid() IS NULL) THEN
    RETURN NEW;
  END IF;
  IF NEW.status = 'UPLOADED'
     AND (TG_OP = 'INSERT'
          OR OLD.status IS DISTINCT FROM 'UPLOADED'
          OR OLD.file_path IS DISTINCT FROM NEW.file_path) THEN
    IF NOT EXISTS (SELECT 1 FROM storage.objects
                    WHERE bucket_id = 'maquetas' AND name = NEW.file_path) THEN
      RAISE EXCEPTION 'OBJETO_INEXISTENTE: % no está en el bucket; no puede quedar UPLOADED.', NEW.file_path
        USING ERRCODE = '23514';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.version_media_exige_objeto() FROM PUBLIC, anon;

-- confirm_version_media() de fix-02 tenía un defecto verificado en prueba local
-- (24-09): hacía UPDATE ... status='FAILED' y a continuación RAISE. El RAISE
-- revierte la transacción entera, incluido ese UPDATE: la fila quedaba PENDING
-- para siempre, que es justo lo que decía evitar. Ahora el fallo se DEVUELVE
-- (fila con status='FAILED') en vez de lanzarse, y queda escrito.
-- Contrato para el cliente: revisar status en la respuesta.
CREATE OR REPLACE FUNCTION public.confirm_version_media(p_media_id UUID)
RETURNS public.version_media
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, storage, pg_temp
AS $$
DECLARE m public.version_media; o RECORD;
BEGIN
  SELECT * INTO m FROM public.version_media
   WHERE id = p_media_id AND (owner_id = auth.uid() OR public.is_admin());
  IF NOT FOUND THEN
    RAISE EXCEPTION 'MEDIA_NOT_FOUND' USING ERRCODE = 'P0002';
  END IF;

  SELECT * INTO o FROM storage.objects
   WHERE bucket_id = 'maquetas' AND name = m.file_path;
  IF NOT FOUND THEN
    UPDATE public.version_media SET status = 'FAILED' WHERE id = m.id
    RETURNING * INTO m;
    RETURN m;
  END IF;

  UPDATE public.version_media
     SET status = 'UPLOADED',
         size_bytes = (o.metadata->>'size')::BIGINT,
         confirmed_at = NOW()
   WHERE id = m.id
  RETURNING * INTO m;
  RETURN m;
END;
$$;

REVOKE ALL ON FUNCTION public.confirm_version_media(UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.confirm_version_media(UUID) TO authenticated;

DROP TRIGGER IF EXISTS version_media_exige_objeto_trg ON public.version_media;
CREATE TRIGGER version_media_exige_objeto_trg
  BEFORE INSERT OR UPDATE ON public.version_media
  FOR EACH ROW EXECUTE FUNCTION public.version_media_exige_objeto();


-- ============================================================
-- 3. HdU-07 · RELEASED EXIGE MASTER · BITÁCORA DE ETAPA
-- ============================================================
CREATE OR REPLACE FUNCTION public.song_versions_released_exige_master()
RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  IF NEW.stage = 'RELEASED'
     AND (TG_OP = 'INSERT' OR OLD.stage IS DISTINCT FROM 'RELEASED') THEN
    IF NOT EXISTS (SELECT 1 FROM public.version_media
                    WHERE version_id = NEW.id AND role = 'MASTER' AND status = 'UPLOADED') THEN
      RAISE EXCEPTION 'RELEASED_SIN_MASTER: sube y confirma el MASTER de esta versión antes de marcarla RELEASED.'
        USING ERRCODE = '23514';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.song_versions_released_exige_master() FROM PUBLIC, anon;

DROP TRIGGER IF EXISTS song_versions_released_exige_master_trg ON public.song_versions;
CREATE TRIGGER song_versions_released_exige_master_trg
  BEFORE INSERT OR UPDATE OF stage ON public.song_versions
  FOR EACH ROW EXECUTE FUNCTION public.song_versions_released_exige_master();

-- El reverso: no se puede quitar el MASTER a una versión ya RELEASED. Sin esto
-- la regla de arriba se cumple solo en el instante del cambio de etapa.
-- Al borrar la versión entera (CASCADE) la fila padre ya no existe y el borrado
-- de sus medios se permite.
CREATE OR REPLACE FUNCTION public.version_media_protege_master()
RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  IF OLD.role = 'MASTER' AND OLD.status = 'UPLOADED'
     AND (TG_OP = 'DELETE' OR NEW.status <> 'UPLOADED' OR NEW.role <> 'MASTER')
     AND EXISTS (SELECT 1 FROM public.song_versions
                  WHERE id = OLD.version_id AND stage = 'RELEASED') THEN
    RAISE EXCEPTION 'MASTER_DE_VERSION_RELEASED: cambia la etapa antes de quitar el MASTER.'
      USING ERRCODE = '23514';
  END IF;
  RETURN COALESCE(NEW, OLD);
END;
$$;

REVOKE ALL ON FUNCTION public.version_media_protege_master() FROM PUBLIC, anon;

DROP TRIGGER IF EXISTS version_media_protege_master_trg ON public.version_media;
CREATE TRIGGER version_media_protege_master_trg
  BEFORE UPDATE OR DELETE ON public.version_media
  FOR EACH ROW EXECUTE FUNCTION public.version_media_protege_master();

-- Bitácora de etapa. Sin FORCE RLS a propósito: la escribe solo el trigger
-- SECURITY DEFINER, y no hay política de INSERT para clientes.
CREATE TABLE IF NOT EXISTS public.song_version_stage_log (
  id          BIGSERIAL PRIMARY KEY,
  version_id  UUID NOT NULL REFERENCES public.song_versions(id) ON DELETE CASCADE,
  stage_from  TEXT,
  stage_to    TEXT NOT NULL,
  changed_by  UUID,
  changed_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_stage_log_version ON public.song_version_stage_log (version_id, changed_at DESC);

ALTER TABLE public.song_version_stage_log ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS stage_log_admin_select ON public.song_version_stage_log;
CREATE POLICY stage_log_admin_select ON public.song_version_stage_log
  FOR SELECT TO authenticated USING (public.is_admin());
REVOKE ALL ON public.song_version_stage_log FROM anon;
GRANT SELECT ON public.song_version_stage_log TO authenticated;

CREATE OR REPLACE FUNCTION public.song_versions_log_etapa()
RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  IF TG_OP = 'INSERT' OR OLD.stage IS DISTINCT FROM NEW.stage THEN
    INSERT INTO public.song_version_stage_log (version_id, stage_from, stage_to, changed_by)
    VALUES (NEW.id, CASE WHEN TG_OP = 'UPDATE' THEN OLD.stage END, NEW.stage, auth.uid());
  END IF;
  RETURN NULL;
END;
$$;

REVOKE ALL ON FUNCTION public.song_versions_log_etapa() FROM PUBLIC, anon;

DROP TRIGGER IF EXISTS song_versions_log_etapa_trg ON public.song_versions;
CREATE TRIGGER song_versions_log_etapa_trg
  AFTER INSERT OR UPDATE OF stage ON public.song_versions
  FOR EACH ROW EXECUTE FUNCTION public.song_versions_log_etapa();


-- ============================================================
-- 4. HdU-12 · BUSCAR COLABORADOR POR CORREO
-- ============================================================
-- auth.users tiene los correos de los fans. Mal protegida, esta función sería
-- un oráculo de "¿este correo es fan?". Por eso: admin en la primera línea,
-- devuelve solo el id (o NULL), y anon no puede ejecutarla.
CREATE OR REPLACE FUNCTION public.buscar_usuario_por_correo(p_email TEXT)
RETURNS UUID
LANGUAGE plpgsql SECURITY DEFINER STABLE
SET search_path = public, pg_temp
AS $$
DECLARE v_id UUID;
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'FORBIDDEN' USING ERRCODE = '42501';
  END IF;
  SELECT u.id INTO v_id FROM auth.users u
   WHERE lower(u.email) = lower(btrim(p_email))
   LIMIT 1;
  RETURN v_id;
END;
$$;

REVOKE ALL ON FUNCTION public.buscar_usuario_por_correo(TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.buscar_usuario_por_correo(TEXT) TO authenticated;


-- ============================================================
-- 5. HdU-14 · LO QUE ME COMPARTIERON (vista del productor)
-- ============================================================
-- El productor no puede leer tracks salvo los visibles al público, así que el
-- título tiene que venir de una función. El filtro vive AQUÍ, no en JS: sin
-- share vigente, la función no devuelve nada. No expone song_versions.notes
-- (notas internas del artista) ni nada del MASTER.
CREATE OR REPLACE FUNCTION public.mis_versiones_compartidas()
RETURNS TABLE (
  version_id       UUID,
  titulo           TEXT,
  etapa            TEXT,
  compartida_el    TIMESTAMPTZ,
  vence_el         TIMESTAMPTZ,
  media_id         UUID,
  file_path        TEXT,
  content_type     TEXT,
  duration_seconds INT
)
LANGUAGE sql SECURITY DEFINER STABLE
SET search_path = public, pg_temp
AS $$
  SELECT v.id, t.title, v.stage, s.shared_at, s.expires_at,
         m.id, m.file_path, m.content_type, m.duration_seconds
    FROM public.version_shares s
    JOIN public.song_versions v ON v.id = s.version_id
    JOIN public.tracks        t ON t.id = v.track_id
    LEFT JOIN public.version_media m
           ON m.version_id = v.id AND m.role = 'LISTEN' AND m.status = 'UPLOADED'
   WHERE s.collaborator_id = auth.uid()
     AND public.share_vigente(v.id)
   ORDER BY s.shared_at DESC;
$$;

REVOKE ALL ON FUNCTION public.mis_versiones_compartidas() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.mis_versiones_compartidas() TO authenticated;


-- ============================================================
-- 6. HdU-16 · BITÁCORA DE ACCESO
-- ============================================================
-- Quién dio de alta, suspendió, compartió o revocó, y cuándo. Límite declarado:
-- la LECTURA de archivos en storage no pasa por aquí y no queda registrada.
CREATE TABLE IF NOT EXISTS public.acceso_auditoria (
  id           BIGSERIAL PRIMARY KEY,
  tabla        TEXT NOT NULL,
  accion       TEXT NOT NULL,
  actor        UUID,
  fila_antes   JSONB,
  fila_despues JSONB,
  ocurrido_el  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_acceso_auditoria_fecha ON public.acceso_auditoria (ocurrido_el DESC);

ALTER TABLE public.acceso_auditoria ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS auditoria_admin_select ON public.acceso_auditoria;
CREATE POLICY auditoria_admin_select ON public.acceso_auditoria
  FOR SELECT TO authenticated USING (public.is_admin());
REVOKE ALL ON public.acceso_auditoria FROM anon;
GRANT SELECT ON public.acceso_auditoria TO authenticated;

CREATE OR REPLACE FUNCTION public.acceso_auditar()
RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  INSERT INTO public.acceso_auditoria (tabla, accion, actor, fila_antes, fila_despues)
  VALUES (TG_TABLE_NAME, TG_OP, auth.uid(),
          CASE WHEN TG_OP <> 'INSERT' THEN to_jsonb(OLD) END,
          CASE WHEN TG_OP <> 'DELETE' THEN to_jsonb(NEW) END);
  RETURN NULL;
END;
$$;

REVOKE ALL ON FUNCTION public.acceso_auditar() FROM PUBLIC, anon;

DROP TRIGGER IF EXISTS collaborators_auditoria_trg ON public.collaborators;
CREATE TRIGGER collaborators_auditoria_trg
  AFTER INSERT OR UPDATE OR DELETE ON public.collaborators
  FOR EACH ROW EXECUTE FUNCTION public.acceso_auditar();

DROP TRIGGER IF EXISTS version_shares_auditoria_trg ON public.version_shares;
CREATE TRIGGER version_shares_auditoria_trg
  AFTER INSERT OR UPDATE OR DELETE ON public.version_shares
  FOR EACH ROW EXECUTE FUNCTION public.acceso_auditar();


-- ============================================================
-- 7. VERIFICACIÓN
-- ============================================================
-- Describe el esquema, NO prueba las políticas: el SQL Editor corre como
-- postgres y se salta RLS (M-3). Las pruebas reales están en §6 del prompt.
SELECT
  'expires_not_null=' || (SELECT (is_nullable = 'NO')::TEXT FROM information_schema.columns
                           WHERE table_schema='public' AND table_name='version_shares'
                             AND column_name='expires_at') ||
  ' | revoked_at='     || (SELECT count(*) FROM information_schema.columns
                           WHERE table_schema='public' AND table_name='version_shares'
                             AND column_name='revoked_at')::TEXT ||
  ' | triggers='       || (SELECT count(*) FROM pg_trigger WHERE NOT tgisinternal AND tgname IN (
                             'version_shares_reglas_trg','version_media_exige_objeto_trg',
                             'song_versions_released_exige_master_trg','version_media_protege_master_trg',
                             'song_versions_log_etapa_trg','collaborators_auditoria_trg',
                             'version_shares_auditoria_trg'))::TEXT ||
  ' | definer_sin_search_path=' || (SELECT count(*) FROM pg_proc
                           WHERE pronamespace='public'::regnamespace AND prosecdef AND proconfig IS NULL)::TEXT ||
  ' | anon_ejecuta_rpc=' || (SELECT count(*) FROM information_schema.routine_privileges
                           WHERE routine_schema='public' AND grantee='anon'
                             AND routine_name IN ('buscar_usuario_por_correo','mis_versiones_compartidas',
                                                  'share_vigente','share_plazo_maximo'))::TEXT
  AS resultado;

-- ESPERADO:
-- expires_not_null=true | revoked_at=1 | triggers=7 | definer_sin_search_path=0 | anon_ejecuta_rpc=0
--
-- Si definer_sin_search_path > 0, NO es de este archivo: lista cuál es con
--   select proname from pg_proc where pronamespace='public'::regnamespace
--     and prosecdef and proconfig is null;


-- ============================================================
-- VUELTA ATRÁS (no ejecutar salvo decisión explícita)
-- ============================================================
-- drop trigger if exists version_shares_reglas_trg on public.version_shares;
-- drop trigger if exists version_media_exige_objeto_trg on public.version_media;
-- drop trigger if exists song_versions_released_exige_master_trg on public.song_versions;
-- drop trigger if exists version_media_protege_master_trg on public.version_media;
-- drop trigger if exists song_versions_log_etapa_trg on public.song_versions;
-- drop trigger if exists collaborators_auditoria_trg on public.collaborators;
-- drop trigger if exists version_shares_auditoria_trg on public.version_shares;
-- alter table public.version_shares alter column expires_at drop not null;
-- (share_vigente: re-ejecutar la definición de fix-02 §5.5)
-- Las tablas song_version_stage_log y acceso_auditoria se conservan: son historia.
