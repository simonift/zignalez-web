-- ═══════════════════════════════════════════════════════════════════
-- fix-02 · Versiones por etapa + escucha para fans y colaboradores
-- Zignalez · v3 · 17-09-2026
--
-- CAMBIO v1 → v2: el archivo deja de ser un campo de la versión y pasa a ser
-- una FILA en version_media, con rol (MASTER / LISTEN), content_type, delivery
-- y encoding versionado. Motivo medido: un WAV de 4 min pesa ~42 MB y un AAC
-- equivalente ~3,8 MB. Servir el original por datos móviles es inusable.
-- Modelo tomado de `media_urls` de Suno, observado el 16-09-2026.
--
-- REQUIERE: fix-01-captura-y-roles.sql YA EJECUTADO. El bloque 0 aborta si no.
-- IDEMPOTENTE: se puede correr más de una vez.
--
-- ⚠ REEMPLAZA la política "Miembros leen maquetas", que deja leer TODO el
--   bucket a cualquier usuario autenticado. Guarda su definición antes (runbook §0).
--
-- CAMBIO v2 → v3 (auditoría con roles, 17-09-2026). Cinco agujeros que yo
-- mismo abrí en v2 y que la revisión adversarial destapó:
--   C-1 CRÍTICO · version_media.file_path no se validaba contra la carpeta del
--       dueño. Como can_read_maqueta() es SECURITY DEFINER y confía en esa
--       fila, cualquier fan autenticado podía INSERTAR una fila reclamando la
--       ruta de un objeto huérfano del bucket -- es decir, las 6 maquetas que
--       hoy están arriba -- y descargarse el master. Cerrado en §3.5.
--   A-1 · un colaborador veía los metadatos del MASTER (nombre, peso, ruta) de
--       toda versión compartida. can_read_maqueta ya le negaba el archivo,
--       pero vm_select le entregaba la fila. Cerrado en §5.5.
--   A-2 · un fan podía crear versiones y medios COLGANDO DEL TRACK DE OTRO.
--       Cerrado con es_dueno_del_track() en §5.5.
--   M-4 · ninguna tabla tenía FORCE ROW LEVEL SECURITY: el propio dueño de las
--       tablas se saltaba las políticas. Cerrado en §8.5.
--   BAJA · search_path sin pg_temp en las funciones SECURITY DEFINER.
-- ═══════════════════════════════════════════════════════════════════


-- ============================================================
-- 0. PRECONDICIÓN
-- ============================================================
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'is_admin') THEN
    RAISE EXCEPTION 'FALTA public.is_admin(). Ejecuta fix-01-captura-y-roles.sql primero.';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_tables WHERE tablename = 'tracks') THEN
    RAISE EXCEPTION 'No existe public.tracks. Base de datos inesperada.';
  END IF;
  RAISE NOTICE 'Precondiciones OK.';
END $$;


-- ============================================================
-- 1. DUEÑO EN TRACKS
-- ============================================================
ALTER TABLE public.tracks
  ADD COLUMN IF NOT EXISTS owner_id UUID REFERENCES auth.users(id);

UPDATE public.tracks t
   SET owner_id = COALESCE(
         (SELECT a.user_id FROM public.admins a ORDER BY a.user_id LIMIT 1),
         (SELECT u.id FROM auth.users u ORDER BY u.created_at LIMIT 1))
 WHERE t.owner_id IS NULL;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM public.tracks WHERE owner_id IS NULL) THEN
    RAISE EXCEPTION 'Hay tracks sin owner_id y no se pudo inferir. Revisa public.admins.';
  END IF;
END $$;

ALTER TABLE public.tracks ALTER COLUMN owner_id SET NOT NULL;
ALTER TABLE public.tracks ALTER COLUMN owner_id SET DEFAULT auth.uid();

CREATE INDEX IF NOT EXISTS idx_tracks_file_path ON public.tracks (file_path);


-- ============================================================
-- 2. LA VERSIÓN (lógica) — ya NO guarda rutas de archivo
-- ============================================================
CREATE TABLE IF NOT EXISTS public.song_versions (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  track_id   UUID NOT NULL REFERENCES public.tracks(id) ON DELETE CASCADE,
  owner_id   UUID NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id),
  stage      TEXT NOT NULL CHECK (stage IN (
               'IDEA','DEMO','RECORDING','MIXING',
               'MASTERING','RELEASE_READY','RELEASED')),
  notes      TEXT,
  is_public  BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_song_versions_track_stage
  ON public.song_versions (track_id, stage, created_at DESC);

-- Como máximo UNA versión pública por maqueta. Lo garantiza el índice.
CREATE UNIQUE INDEX IF NOT EXISTS uq_song_versions_one_public
  ON public.song_versions (track_id) WHERE is_public;

ALTER TABLE public.song_versions ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- 3. LOS ARCHIVOS — master y derivada de escucha
-- ============================================================
-- MASTER : el archivo tal como lo subiste (WAV/FLAC). Nunca se sirve a nadie
--          salvo a ti. Es el respaldo.
-- LISTEN : la derivada liviana (AAC ~128-192 kbps). Es lo que se REPRODUCE.
--
-- `delivery` es explícito a propósito: hoy solo 'progressive', pero el cliente
-- ramifica según el valor, así que cambiar de estrategia no obliga a redesplegar.
-- `encoding` se versiona para saber qué archivos re-procesar si mejora el perfil.

CREATE TABLE IF NOT EXISTS public.version_media (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  version_id   UUID NOT NULL REFERENCES public.song_versions(id) ON DELETE CASCADE,
  owner_id     UUID NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id),
  role         TEXT NOT NULL CHECK (role IN ('MASTER','LISTEN')),
  file_path    TEXT NOT NULL UNIQUE,
  file_name    TEXT NOT NULL,
  content_type TEXT NOT NULL,
  delivery     TEXT NOT NULL DEFAULT 'progressive'
                 CHECK (delivery IN ('progressive','blob','hls')),
  encoding     TEXT NOT NULL DEFAULT '1.0.0',
  size_bytes   BIGINT,
  bitrate_kbps INT,
  duration_seconds INT,
  status       TEXT NOT NULL DEFAULT 'PENDING'
                 CHECK (status IN ('PENDING','UPLOADED','FAILED')),
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  confirmed_at TIMESTAMPTZ,
  UNIQUE (version_id, role)
);

CREATE INDEX IF NOT EXISTS idx_version_media_version ON public.version_media (version_id);
CREATE INDEX IF NOT EXISTS idx_version_media_path    ON public.version_media (file_path);

ALTER TABLE public.version_media ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- 3.5 COHERENCIA DE version_media  (cierra C-1, CRÍTICO)
-- ============================================================
-- can_read_maqueta() es SECURITY DEFINER: se salta RLS y cree lo que dice la
-- fila. Por tanto la fila TIENE que ser verdad. Dos invariantes:
--   (a) file_path vive bajo la carpeta del dueño -- el mismo prefijo que ya
--       exige sv_storage_insert en storage.objects. Sin esto, reclamar la ruta
--       ajena es un INSERT de una línea.
--   (b) el medio pertenece a la misma persona que la versión de la que cuelga.
-- El admin queda exento de (a) para poder adoptar los objetos ya subidos antes
-- de fix-02, que no siguen la convención de carpetas.

CREATE OR REPLACE FUNCTION public.version_media_coherencia()
RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE v_owner UUID;
BEGIN
  SELECT owner_id INTO v_owner FROM public.song_versions WHERE id = NEW.version_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'VERSION_NO_EXISTE' USING ERRCODE = '23503';
  END IF;

  IF NEW.owner_id IS DISTINCT FROM v_owner THEN
    RAISE EXCEPTION 'DUENO_INCOHERENTE: el medio y su versión deben tener el mismo dueño.'
      USING ERRCODE = '23514';
  END IF;

  IF NOT public.is_admin()
     AND NEW.file_path NOT LIKE (NEW.owner_id::TEXT || '/%') THEN
    RAISE EXCEPTION 'RUTA_FUERA_DE_CARPETA: file_path debe empezar por %/', NEW.owner_id
      USING ERRCODE = '42501';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS version_media_coherencia_trg ON public.version_media;
CREATE TRIGGER version_media_coherencia_trg
  BEFORE INSERT OR UPDATE ON public.version_media
  FOR EACH ROW EXECUTE FUNCTION public.version_media_coherencia();


-- ============================================================
-- 4. COLABORADORES
-- ============================================================
CREATE TABLE IF NOT EXISTS public.collaborators (
  user_id      UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name TEXT NOT NULL,
  role         TEXT NOT NULL DEFAULT 'PRODUCTOR'
                 CHECK (role IN ('PRODUCTOR','FEATURE','SELLO','OTRO')),
  active       BOOLEAN NOT NULL DEFAULT TRUE,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.collaborators ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS collab_select_self ON public.collaborators;
CREATE POLICY collab_select_self ON public.collaborators
  FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.is_admin());

DROP POLICY IF EXISTS collab_admin_all ON public.collaborators;
CREATE POLICY collab_admin_all ON public.collaborators
  FOR ALL TO authenticated
  USING (public.is_admin()) WITH CHECK (public.is_admin());


-- ============================================================
-- 5. COMPARTIR VERSIÓN
-- ============================================================
CREATE TABLE IF NOT EXISTS public.version_shares (
  version_id      UUID NOT NULL REFERENCES public.song_versions(id) ON DELETE CASCADE,
  collaborator_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  shared_by       UUID NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id),
  shared_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at      TIMESTAMPTZ,
  PRIMARY KEY (version_id, collaborator_id)
);

CREATE INDEX IF NOT EXISTS idx_version_shares_collab
  ON public.version_shares (collaborator_id);

ALTER TABLE public.version_shares ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS vs_select ON public.version_shares;
CREATE POLICY vs_select ON public.version_shares
  FOR SELECT TO authenticated
  USING (collaborator_id = auth.uid() OR public.is_admin());

DROP POLICY IF EXISTS vs_admin_write ON public.version_shares;
CREATE POLICY vs_admin_write ON public.version_shares
  FOR ALL TO authenticated
  USING (public.is_admin()) WITH CHECK (public.is_admin());


-- ============================================================
-- 5.5 POLÍTICAS DE song_versions Y version_media
-- ============================================================
-- Van DESPUÉS de crear version_shares: las políticas la referencian y
-- Postgres valida la tabla al crear la policy, no al evaluarla.

-- Dos ayudantes SECURITY DEFINER. Existen porque las subconsultas dentro de
-- una policy SÍ respetan el RLS de la tabla referenciada, y eso hacía que la
-- validación fallara justo en los casos que debía permitir.

-- ¿El track es de quien dice? (cierra A-2)
CREATE OR REPLACE FUNCTION public.es_dueno_del_track(p_track_id UUID)
RETURNS BOOLEAN
LANGUAGE sql SECURITY DEFINER STABLE
SET search_path = public, pg_temp
AS $$
  SELECT public.is_admin()
      OR EXISTS (SELECT 1 FROM public.tracks t
                  WHERE t.id = p_track_id AND t.owner_id = auth.uid());
$$;

REVOKE ALL ON FUNCTION public.es_dueno_del_track(UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.es_dueno_del_track(UUID) TO authenticated;

-- ¿Hay un share vigente de esta versión para quien pregunta?
-- Fuente ÚNICA de la autorización de colaborador: antes esta condición estaba
-- escrita dos veces con reglas distintas (can_read_maqueta exigía collaborators
-- activo y expires_at; vm_select no exigía ninguna de las dos). Eso era A-1.
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
       AND (s.expires_at IS NULL OR s.expires_at > NOW()));
$$;

REVOKE ALL ON FUNCTION public.share_vigente(UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.share_vigente(UUID) TO authenticated;


DROP POLICY IF EXISTS sv_select_own ON public.song_versions;
CREATE POLICY sv_select_own ON public.song_versions
  FOR SELECT TO authenticated
  USING (owner_id = auth.uid() OR public.is_admin()
         OR public.share_vigente(id));

DROP POLICY IF EXISTS sv_insert_own ON public.song_versions;
CREATE POLICY sv_insert_own ON public.song_versions
  FOR INSERT TO authenticated
  WITH CHECK (owner_id = auth.uid() AND public.es_dueno_del_track(track_id));

DROP POLICY IF EXISTS sv_update_own ON public.song_versions;
CREATE POLICY sv_update_own ON public.song_versions
  FOR UPDATE TO authenticated
  USING (owner_id = auth.uid())
  WITH CHECK (owner_id = auth.uid() AND public.es_dueno_del_track(track_id));

DROP POLICY IF EXISTS sv_delete_own ON public.song_versions;
CREATE POLICY sv_delete_own ON public.song_versions
  FOR DELETE TO authenticated
  USING (owner_id = auth.uid() OR public.is_admin());

-- El colaborador ve SOLO la derivada de escucha. El MASTER no aparece ni
-- siquiera como metadato: peso y nombre de archivo del original ya dicen
-- demasiado. Esto replica exactamente lo que decide can_read_maqueta().
DROP POLICY IF EXISTS vm_select ON public.version_media;
CREATE POLICY vm_select ON public.version_media
  FOR SELECT TO authenticated
  USING (owner_id = auth.uid() OR public.is_admin()
         OR (role = 'LISTEN' AND public.share_vigente(version_id)));

DROP POLICY IF EXISTS vm_insert ON public.version_media;
CREATE POLICY vm_insert ON public.version_media
  FOR INSERT TO authenticated
  WITH CHECK (owner_id = auth.uid()
              AND EXISTS (SELECT 1 FROM public.song_versions v
                           WHERE v.id = version_media.version_id
                             AND v.owner_id = auth.uid()));

DROP POLICY IF EXISTS vm_update ON public.version_media;
CREATE POLICY vm_update ON public.version_media
  FOR UPDATE TO authenticated
  USING (owner_id = auth.uid()) WITH CHECK (owner_id = auth.uid());

DROP POLICY IF EXISTS vm_delete ON public.version_media;
CREATE POLICY vm_delete ON public.version_media
  FOR DELETE TO authenticated
  USING (owner_id = auth.uid() OR public.is_admin());


-- ============================================================
-- 6. AUTORIZACIÓN DE LECTURA — FUENTE ÚNICA DE VERDAD
-- ============================================================
-- El permiso se deriva del DATO, nunca de la carpeta.
-- ⚠ Un colaborador SOLO puede leer la derivada LISTEN, jamás el MASTER.
--   Compartir una mezcla para opinar no es entregar el archivo fuente.

CREATE OR REPLACE FUNCTION public.can_read_maqueta(p_name TEXT)
RETURNS BOOLEAN
LANGUAGE sql SECURITY DEFINER STABLE
SET search_path = public, pg_temp
AS $$
  SELECT
    -- Nivel 3 · admin
    public.is_admin()
    -- Nivel 3 · dueño del archivo (cualquier rol, incluido MASTER)
    OR EXISTS (SELECT 1 FROM public.version_media m
                WHERE m.file_path = p_name AND m.owner_id = auth.uid())
    -- Nivel 1 · fan: la maqueta está visible y este es su archivo publicado
    OR EXISTS (SELECT 1 FROM public.tracks t
                WHERE t.file_path = p_name AND t.visible = TRUE)
    -- Nivel 2 · colaborador: versión compartida y vigente, SOLO rol LISTEN
    OR EXISTS (SELECT 1 FROM public.version_media m
                WHERE m.file_path = p_name
                  AND m.role = 'LISTEN'
                  AND public.share_vigente(m.version_id));
$$;

REVOKE ALL ON FUNCTION public.can_read_maqueta(TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.can_read_maqueta(TEXT) TO authenticated;

DROP POLICY IF EXISTS "Miembros leen maquetas" ON storage.objects;
DROP POLICY IF EXISTS sv_storage_select        ON storage.objects;  -- errata maestro v1
DROP POLICY IF EXISTS sv_storage_read          ON storage.objects;

CREATE POLICY sv_storage_read ON storage.objects
  FOR SELECT TO authenticated
  USING (bucket_id = 'maquetas' AND public.can_read_maqueta(name));

DROP POLICY IF EXISTS sv_storage_insert ON storage.objects;
CREATE POLICY sv_storage_insert ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'maquetas'
              AND (storage.foldername(name))[1] = auth.uid()::TEXT);


-- ============================================================
-- 7. CONFIRMAR UN ARCHIVO — el cliente no decide si existe
-- ============================================================
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
    UPDATE public.version_media SET status = 'FAILED' WHERE id = m.id;
    RAISE EXCEPTION 'OBJECT_NOT_FOUND' USING ERRCODE = 'P0002';
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


-- ============================================================
-- 8. PUBLICAR / DESPUBLICAR
-- ============================================================
-- Publica la derivada LISTEN. Si no existe, FALLA: no se sirve un WAV de
-- 42 MB a un fan en datos móviles "porque es lo que hay".

CREATE OR REPLACE FUNCTION public.publish_song_version(p_version_id UUID)
RETURNS public.tracks
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE v public.song_versions; m public.version_media; t public.tracks;
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'FORBIDDEN' USING ERRCODE = '42501';
  END IF;

  SELECT * INTO v FROM public.song_versions WHERE id = p_version_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'VERSION_NOT_FOUND' USING ERRCODE = 'P0002';
  END IF;

  SELECT * INTO m FROM public.version_media
   WHERE version_id = v.id AND role = 'LISTEN' AND status = 'UPLOADED';
  IF NOT FOUND THEN
    RAISE EXCEPTION 'SIN_DERIVADA_DE_ESCUCHA: sube un AAC (role=LISTEN) antes de publicar'
      USING ERRCODE = 'P0002';
  END IF;

  UPDATE public.song_versions SET is_public = FALSE
   WHERE track_id = v.track_id AND is_public;
  UPDATE public.song_versions SET is_public = TRUE WHERE id = v.id;

  UPDATE public.tracks
     SET file_path = m.file_path,
         duration_seconds = COALESCE(m.duration_seconds, duration_seconds)
   WHERE id = v.track_id
  RETURNING * INTO t;

  RETURN t;
END;
$$;

REVOKE ALL ON FUNCTION public.publish_song_version(UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.publish_song_version(UUID) TO authenticated;


CREATE OR REPLACE FUNCTION public.unpublish_track(p_track_id UUID)
RETURNS public.tracks
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE t public.tracks;
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'FORBIDDEN' USING ERRCODE = '42501';
  END IF;

  UPDATE public.song_versions SET is_public = FALSE
   WHERE track_id = p_track_id AND is_public;

  -- El reproductor de fans ya maneja file_path NULL: deshabilita el botón.
  UPDATE public.tracks SET file_path = NULL WHERE id = p_track_id
  RETURNING * INTO t;

  RETURN t;
END;
$$;

REVOKE ALL ON FUNCTION public.unpublish_track(UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.unpublish_track(UUID) TO authenticated;


-- ============================================================
-- 8.5 FORCE ROW LEVEL SECURITY  (cierra M-4)
-- ============================================================
-- ENABLE deja fuera al DUEÑO de la tabla. En Supabase el rol postgres y
-- cualquier función SECURITY DEFINER escrita a futuro por encima de estas
-- tablas se saltarían las políticas sin que nadie lo note. FORCE lo impide.
-- No afecta a las funciones SECURITY DEFINER de este archivo: esas consultan
-- a propósito y su lógica de permiso es explícita.

ALTER TABLE public.song_versions  FORCE ROW LEVEL SECURITY;
ALTER TABLE public.version_media  FORCE ROW LEVEL SECURITY;
ALTER TABLE public.collaborators  FORCE ROW LEVEL SECURITY;
ALTER TABLE public.version_shares FORCE ROW LEVEL SECURITY;

-- public.tracks es FUENTE DE AUTORIZACIÓN en can_read_maqueta (nivel 1: si
-- tracks.visible entonces cualquiera lo oye). Si tracks no tuviera RLS, un fan
-- podría marcarse visible un track ajeno. Se verifica, no se asume.
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_class c
                   JOIN pg_namespace n ON n.oid = c.relnamespace
                  WHERE n.nspname='public' AND c.relname='tracks' AND c.relrowsecurity) THEN
    RAISE EXCEPTION 'public.tracks SIN RLS y can_read_maqueta confía en ella. Aborto.';
  END IF;
END $$;


-- ============================================================
-- 9. VERIFICACIÓN
-- ============================================================
SELECT
  'song_versions='  || (SELECT count(*) FROM pg_tables WHERE tablename='song_versions')::TEXT ||
  ' | version_media='|| (SELECT count(*) FROM pg_tables WHERE tablename='version_media')::TEXT ||
  ' | collaborators='|| (SELECT count(*) FROM pg_tables WHERE tablename='collaborators')::TEXT ||
  ' | shares='      || (SELECT count(*) FROM pg_tables WHERE tablename='version_shares')::TEXT ||
  ' | fn_read='     || (SELECT count(*) FROM pg_proc WHERE proname='can_read_maqueta')::TEXT ||
  ' | fn_confirm='  || (SELECT count(*) FROM pg_proc WHERE proname='confirm_version_media')::TEXT ||
  ' | fn_publish='  || (SELECT count(*) FROM pg_proc WHERE proname='publish_song_version')::TEXT ||
  ' | pol_vm='      || (SELECT count(*) FROM pg_policies WHERE tablename='version_media')::TEXT ||
  ' | pol_read='    || (SELECT count(*) FROM pg_policies
                          WHERE tablename='objects' AND policyname='sv_storage_read')::TEXT ||
  ' | pol_vieja='   || (SELECT count(*) FROM pg_policies
                          WHERE tablename='objects' AND policyname='Miembros leen maquetas')::TEXT ||
  ' | owner_tracks='|| (SELECT count(*) FROM information_schema.columns
                          WHERE table_name='tracks' AND column_name='owner_id')::TEXT ||
  ' | trg_coher='   || (SELECT count(*) FROM pg_trigger
                          WHERE tgname='version_media_coherencia_trg')::TEXT ||
  ' | fn_dueno='    || (SELECT count(*) FROM pg_proc WHERE proname='es_dueno_del_track')::TEXT ||
  ' | fn_share='    || (SELECT count(*) FROM pg_proc WHERE proname='share_vigente')::TEXT ||
  ' | forced='      || (SELECT count(*) FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
                          WHERE n.nspname='public' AND c.relforcerowsecurity
                            AND c.relname IN ('song_versions','version_media',
                                              'collaborators','version_shares'))::TEXT
  AS resultado;

-- ESPERADO:
-- song_versions=1 | version_media=1 | collaborators=1 | shares=1 | fn_read=1
-- | fn_confirm=1 | fn_publish=1 | pol_vm=4 | pol_read=1 | pol_vieja=0 | owner_tracks=1
-- | trg_coher=1 | fn_dueno=1 | fn_share=1 | forced=4
