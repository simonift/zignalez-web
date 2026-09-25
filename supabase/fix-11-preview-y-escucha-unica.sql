-- ═══════════════════════════════════════════════════════════════════
-- fix-11 · Preview público, escucha única (apagada) y contador honesto
-- PROMPT_MAESTRO_ESCUCHA_UNICA_Y_CAPTURA.md v1.0 · Zignalez · 25-09-2026
--
--   E8  · tracks.preview_seconds / preview_start / preview_path.
--         Prefijo previews/ del bucket maquetas legible por anon.
--         RPC preview_publico() para el hero, sin exponer file_path.
--         RPC admin registrar_preview().
--   E10 · Tabla escuchas + pedir_escucha / completar_escucha.
--         can_read_maqueta() v2: exige escucha vigente al fan SOLO si
--         escucha_unica_activa() = TRUE. HOY: FALSE (decisión del prompt:
--         se enciende tras 7 días de datos de E8/E9; cambiar una línea).
--   E11 · escuchas_de(track) para anon: NULL bajo umbral_contador() (100).
--
-- REQUIERE: fix-02 v3 (can_read_maqueta), fix-08 v2. IDEMPOTENTE.
-- Vuelta atrás al final.
-- ═══════════════════════════════════════════════════════════════════


-- ============================================================
-- 0. PRECONDICIONES
-- ============================================================
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_proc WHERE proname='can_read_maqueta' AND pronamespace='public'::regnamespace) THEN
    RAISE EXCEPTION 'FALTA can_read_maqueta() (fix-02 v3).';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                  WHERE table_schema='public' AND table_name='version_shares' AND column_name='revoked_at') THEN
    RAISE EXCEPTION 'FALTA fix-08.';
  END IF;
  RAISE NOTICE 'Precondiciones OK.';
END $$;


-- ============================================================
-- 1. E8 · PREVIEW POR TEMA
-- ============================================================
ALTER TABLE public.tracks ADD COLUMN IF NOT EXISTS preview_seconds INT NOT NULL DEFAULT 30;
ALTER TABLE public.tracks ADD COLUMN IF NOT EXISTS preview_start   INT NOT NULL DEFAULT 0;
ALTER TABLE public.tracks ADD COLUMN IF NOT EXISTS preview_path    TEXT;
ALTER TABLE public.tracks DROP CONSTRAINT IF EXISTS preview_seconds_rango;
ALTER TABLE public.tracks ADD  CONSTRAINT preview_seconds_rango CHECK (preview_seconds BETWEEN 15 AND 60);
ALTER TABLE public.tracks DROP CONSTRAINT IF EXISTS preview_start_no_negativo;
ALTER TABLE public.tracks ADD  CONSTRAINT preview_start_no_negativo CHECK (preview_start >= 0);
ALTER TABLE public.tracks DROP CONSTRAINT IF EXISTS preview_path_en_previews;
ALTER TABLE public.tracks ADD  CONSTRAINT preview_path_en_previews
  CHECK (preview_path IS NULL OR preview_path LIKE 'previews/%');

COMMENT ON COLUMN public.tracks.preview_seconds IS 'Duración del recorte público (15..60). El recorte es un objeto aparte en previews/.';
COMMENT ON COLUMN public.tracks.preview_start   IS 'Segundo del tema donde empieza el recorte: el gancho lo elige el artista.';
COMMENT ON COLUMN public.tracks.preview_path    IS 'Ruta del recorte en el bucket maquetas, prefijo previews/. NULL = sin preview: el hero no lo anuncia.';

-- El anónimo lee SOLO el prefijo previews/. maquetas sigue cerrado.
DROP POLICY IF EXISTS previews_anon_read ON storage.objects;
CREATE POLICY previews_anon_read ON storage.objects
  FOR SELECT TO anon, authenticated
  USING (bucket_id = 'maquetas' AND name LIKE 'previews/%');

-- El admin sube a previews/ (sv_storage_insert exige carpeta = uid; aquí no).
DROP POLICY IF EXISTS previews_admin_insert ON storage.objects;
CREATE POLICY previews_admin_insert ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'maquetas' AND name LIKE 'previews/%' AND public.is_admin());

-- Lo que ve el hero: título y recorte de temas visibles con preview. Nunca file_path.
CREATE OR REPLACE FUNCTION public.preview_publico()
RETURNS TABLE (track_id UUID, titulo TEXT, preview_path TEXT, preview_seconds INT, sort_order INT)
LANGUAGE sql SECURITY DEFINER STABLE
SET search_path = public, pg_temp
AS $$
  SELECT t.id, t.title, t.preview_path, t.preview_seconds, t.sort_order
    FROM public.tracks t
   WHERE t.visible = TRUE AND t.preview_path IS NOT NULL
   ORDER BY t.sort_order NULLS LAST, t.created_at;
$$;
REVOKE ALL ON FUNCTION public.preview_publico() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.preview_publico() TO anon, authenticated;

-- El recorte se registra solo si el objeto existe y está en previews/.
CREATE OR REPLACE FUNCTION public.registrar_preview(p_track_id UUID, p_path TEXT, p_seconds INT, p_start INT)
RETURNS public.tracks
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, storage, pg_temp
AS $$
DECLARE t public.tracks;
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'FORBIDDEN' USING ERRCODE = '42501';
  END IF;
  IF p_path NOT LIKE 'previews/%' THEN
    RAISE EXCEPTION 'PREVIEW_FUERA_DE_PREFIJO: el recorte va en previews/.' USING ERRCODE = '23514';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM storage.objects WHERE bucket_id = 'maquetas' AND name = p_path) THEN
    RAISE EXCEPTION 'OBJETO_INEXISTENTE: % no está en el bucket.', p_path USING ERRCODE = '23514';
  END IF;
  UPDATE public.tracks
     SET preview_path = p_path, preview_seconds = p_seconds, preview_start = p_start
   WHERE id = p_track_id
  RETURNING * INTO t;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'TRACK_NOT_FOUND' USING ERRCODE = 'P0002';
  END IF;
  RETURN t;
END;
$$;
REVOKE ALL ON FUNCTION public.registrar_preview(UUID, TEXT, INT, INT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.registrar_preview(UUID, TEXT, INT, INT) TO authenticated;


-- ============================================================
-- 2. E10 · ESCUCHA ÚNICA — escrita, probada, APAGADA
-- ============================================================
-- Fuente única de la bandera. Encender = cambiar FALSE por TRUE y re-ejecutar.
CREATE OR REPLACE FUNCTION public.escucha_unica_activa()
RETURNS BOOLEAN LANGUAGE sql IMMUTABLE
SET search_path = public, pg_temp
AS $$ SELECT FALSE $$;
REVOKE ALL ON FUNCTION public.escucha_unica_activa() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.escucha_unica_activa() TO anon, authenticated;

CREATE TABLE IF NOT EXISTS public.escuchas (
  user_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  track_id    UUID NOT NULL REFERENCES public.tracks(id) ON DELETE CASCADE,
  primera_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expira_at   TIMESTAMPTZ NOT NULL,
  completada  BOOLEAN NOT NULL DEFAULT FALSE,
  PRIMARY KEY (user_id, track_id)
);
CREATE INDEX IF NOT EXISTS idx_escuchas_track ON public.escuchas (track_id) WHERE completada;

ALTER TABLE public.escuchas ENABLE ROW LEVEL SECURITY;
-- El fan ve su propia fila (para pintar "la escuchaste el…"); el admin todas.
DROP POLICY IF EXISTS escuchas_select ON public.escuchas;
CREATE POLICY escuchas_select ON public.escuchas
  FOR SELECT TO authenticated USING (user_id = auth.uid() OR public.is_admin());
-- Sin políticas de escritura para clientes: solo las RPC.
-- El admin puede reabrir una escucha (borrar la fila): queda en bitácora.
DROP POLICY IF EXISTS escuchas_admin_delete ON public.escuchas;
CREATE POLICY escuchas_admin_delete ON public.escuchas
  FOR DELETE TO authenticated USING (public.is_admin());
REVOKE ALL ON public.escuchas FROM anon;
GRANT SELECT, DELETE ON public.escuchas TO authenticated;

DROP TRIGGER IF EXISTS escuchas_auditoria_trg ON public.escuchas;
CREATE TRIGGER escuchas_auditoria_trg
  AFTER DELETE ON public.escuchas
  FOR EACH ROW EXECUTE FUNCTION public.acceso_auditar();

-- Ventana = duración + 120 s. Colaboradores con share vigente y admin: exentos
-- (no se les registra ventana; can_read_maqueta ya los deja pasar por otro nivel).
CREATE OR REPLACE FUNCTION public.pedir_escucha(p_track_id UUID)
RETURNS TABLE (estado TEXT, expira_at TIMESTAMPTZ, primera_at TIMESTAMPTZ)
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE v_dur INT; v_row public.escuchas;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'FORBIDDEN' USING ERRCODE = '42501';
  END IF;
  IF public.is_admin() THEN
    RETURN QUERY SELECT 'EXENTO'::TEXT, NULL::TIMESTAMPTZ, NULL::TIMESTAMPTZ; RETURN;
  END IF;
  SELECT duration_seconds INTO v_dur FROM public.tracks WHERE id = p_track_id AND visible;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'TRACK_NOT_FOUND' USING ERRCODE = 'P0002';
  END IF;
  IF NOT public.escucha_unica_activa() THEN
    RETURN QUERY SELECT 'LIBRE'::TEXT, NULL::TIMESTAMPTZ, NULL::TIMESTAMPTZ; RETURN;
  END IF;
  SELECT * INTO v_row FROM public.escuchas e WHERE e.user_id = auth.uid() AND e.track_id = p_track_id;
  IF NOT FOUND THEN
    INSERT INTO public.escuchas (user_id, track_id, expira_at)
    VALUES (auth.uid(), p_track_id, NOW() + make_interval(secs => coalesce(v_dur, 300) + 120))
    RETURNING * INTO v_row;
    RETURN QUERY SELECT 'NUEVA'::TEXT, v_row.expira_at, v_row.primera_at; RETURN;
  END IF;
  IF v_row.expira_at > NOW() THEN
    RETURN QUERY SELECT 'VIGENTE'::TEXT, v_row.expira_at, v_row.primera_at; RETURN;
  END IF;
  RETURN QUERY SELECT 'AGOTADA'::TEXT, v_row.expira_at, v_row.primera_at;
END;
$$;
REVOKE ALL ON FUNCTION public.pedir_escucha(UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.pedir_escucha(UUID) TO authenticated;

-- Declarativo (lo emite el cliente al llegar a 'ended'). Solo marca la propia.
CREATE OR REPLACE FUNCTION public.completar_escucha(p_track_id UUID)
RETURNS BOOLEAN
LANGUAGE sql SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  UPDATE public.escuchas SET completada = TRUE
   WHERE user_id = auth.uid() AND track_id = p_track_id
  RETURNING TRUE;
$$;
REVOKE ALL ON FUNCTION public.completar_escucha(UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.completar_escucha(UUID) TO authenticated;

-- can_read_maqueta v2 · idéntica a fix-02 salvo el nivel 1: con la bandera
-- encendida, el fan necesita escucha vigente. Admin, dueño y colaborador igual.
CREATE OR REPLACE FUNCTION public.can_read_maqueta(p_name TEXT)
RETURNS BOOLEAN
LANGUAGE sql SECURITY DEFINER STABLE
SET search_path = public, pg_temp
AS $$
  SELECT
    public.is_admin()
    OR EXISTS (SELECT 1 FROM public.version_media m
                WHERE m.file_path = p_name AND m.owner_id = auth.uid())
    OR EXISTS (SELECT 1 FROM public.tracks t
                WHERE t.file_path = p_name AND t.visible = TRUE
                  AND (NOT public.escucha_unica_activa()
                       OR EXISTS (SELECT 1 FROM public.escuchas e
                                   WHERE e.user_id = auth.uid() AND e.track_id = t.id
                                     AND e.expira_at > NOW())))
    OR EXISTS (SELECT 1 FROM public.version_media m
                WHERE m.file_path = p_name
                  AND m.role = 'LISTEN'
                  AND public.share_vigente(m.version_id));
$$;
REVOKE ALL ON FUNCTION public.can_read_maqueta(TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.can_read_maqueta(TEXT) TO authenticated;


-- ============================================================
-- 3. E11 · CONTADOR HONESTO
-- ============================================================
CREATE OR REPLACE FUNCTION public.umbral_contador()
RETURNS INT LANGUAGE sql IMMUTABLE
SET search_path = public, pg_temp
AS $$ SELECT 100 $$;
REVOKE ALL ON FUNCTION public.umbral_contador() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.umbral_contador() TO anon, authenticated;

-- NULL bajo el umbral: el cliente no pinta nada. Nunca expone la tabla.
CREATE OR REPLACE FUNCTION public.escuchas_de(p_track_id UUID)
RETURNS INT
LANGUAGE sql SECURITY DEFINER STABLE
SET search_path = public, pg_temp
AS $$
  SELECT CASE WHEN n >= public.umbral_contador() THEN n ELSE NULL END
    FROM (SELECT count(*)::INT AS n FROM public.escuchas
           WHERE track_id = p_track_id AND completada) s;
$$;
REVOKE ALL ON FUNCTION public.escuchas_de(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.escuchas_de(UUID) TO anon, authenticated;


-- ============================================================
-- 4. VERIFICACIÓN
-- ============================================================
SELECT
  'cols_preview=' || (SELECT count(*) FROM information_schema.columns
     WHERE table_schema='public' AND table_name='tracks'
       AND column_name IN ('preview_seconds','preview_start','preview_path'))::TEXT ||
  ' | pol_previews=' || (SELECT count(*) FROM pg_policies WHERE schemaname='storage' AND tablename='objects'
     AND policyname IN ('previews_anon_read','previews_admin_insert'))::TEXT ||
  ' | escuchas=' || (to_regclass('public.escuchas') IS NOT NULL)::TEXT ||
  ' | rpc=' || (SELECT count(*) FROM pg_proc WHERE pronamespace='public'::regnamespace
     AND proname IN ('preview_publico','registrar_preview','pedir_escucha','completar_escucha','escuchas_de','umbral_contador','escucha_unica_activa'))::TEXT ||
  ' | unica_activa=' || public.escucha_unica_activa()::TEXT ||
  ' | umbral=' || public.umbral_contador()::TEXT ||
  ' | definer_sin_search_path=' || (SELECT count(*) FROM pg_proc
     WHERE pronamespace='public'::regnamespace AND prosecdef AND proconfig IS NULL)::TEXT ||
  ' | anon_escribe=' || (SELECT count(*) FROM information_schema.routine_privileges
     WHERE routine_schema='public' AND grantee='anon'
       AND routine_name IN ('registrar_preview','pedir_escucha','completar_escucha','can_read_maqueta'))::TEXT
  AS resultado;

-- ESPERADO: cols_preview=3 | pol_previews=2 | escuchas=true | rpc=7 | unica_activa=false | umbral=100 | definer_sin_search_path=0 | anon_escribe=0


-- ============================================================
-- VUELTA ATRÁS (no ejecutar salvo decisión explícita)
-- ============================================================
-- (can_read_maqueta: re-ejecutar la definición de fix-02 §6)
-- drop policy if exists previews_anon_read on storage.objects;
-- drop policy if exists previews_admin_insert on storage.objects;
-- drop function if exists public.preview_publico(), public.registrar_preview(uuid,text,int,int),
--   public.pedir_escucha(uuid), public.completar_escucha(uuid), public.escuchas_de(uuid),
--   public.umbral_contador(), public.escucha_unica_activa();
-- alter table public.tracks drop column if exists preview_seconds, drop column if exists preview_start, drop column if exists preview_path;
-- La tabla escuchas se conserva: es historia.
