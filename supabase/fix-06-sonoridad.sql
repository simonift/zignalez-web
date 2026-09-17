-- ═══════════════════════════════════════════════════════════════════
-- fix-06 · Sonoridad de la derivada de escucha
-- Zignalez · v2 · 17-09-2026
--
-- REQUIERE: fix-01, fix-02 v3, fix-05. El bloque 0 aborta si no.
-- IDEMPOTENTE.
--
-- CAMBIO v1 -> v2 (revision adversarial de arquitectura). La v1 ponia
-- estas columnas en `tracks` y guardaba solo measured_I. Dos errores:
--
--   ALTA-1 · La sonoridad es propiedad de un ARCHIVO, no de una cancion.
--     Un tema con master WAV y derivada AAC tiene dos sonoridades; en
--     `tracks` solo cabe una. Van en version_media, que es la tabla que
--     representa archivos.
--
--   ALTA-1b · El proposito declarado era "poder rehacerlo". Con solo
--     measured_I no se puede: la pasada 2 de loudnorm exige measured_I,
--     measured_TP, measured_LRA, measured_thresh y offset. Faltaban
--     cuatro de los cinco, y tampoco habia donde anotar la sonoridad
--     MEDIDA DE SALIDA, que es justo lo que afirma el criterio A2.1.
--
--   ALTA-2 · Subir el .m4a sin crear su fila en version_media deja al
--     colaborador invitado con 403 en la derivada mientras sigue
--     pudiendo leer el WAV de 42 MB, que si tiene fila. Es decir: el
--     ahorro de egress se lo lleva el fan y el colaborador se queda con
--     el archivo caro. Un test hecho como admin NO lo ve, porque la
--     rama is_admin() de can_read_maqueta() lo autoriza igual.
--     Lo cierra la RPC de §3, que sube la fila y la ficha a la vez.
-- ═══════════════════════════════════════════════════════════════════

-- ============================================================
-- 0. PRECONDICIONES
-- ============================================================
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_proc WHERE proname='is_admin') THEN
    RAISE EXCEPTION 'FALTA public.is_admin(). Ejecuta fix-01 primero.';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_tables WHERE schemaname='public' AND tablename='version_media') THEN
    RAISE EXCEPTION 'FALTA public.version_media. Ejecuta fix-02 v3 primero.';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                  WHERE table_schema='public' AND table_name='tracks' AND column_name='peaks') THEN
    RAISE EXCEPTION 'FALTA tracks.peaks. Ejecuta fix-05 primero.';
  END IF;
  RAISE NOTICE 'Precondiciones OK.';
END $$;


-- ============================================================
-- 1. COLUMNAS · los cinco parametros de entrada + lo medido a la salida
-- ============================================================
-- Los cinco primeros son EXACTAMENTE los que loudnorm pide en la pasada 2.
-- Guardarlos permite rehacer la derivada con otro objetivo (-16 LUFS para
-- pods, por ejemplo) sin volver a medir el master, que es la parte cara.
ALTER TABLE public.version_media
  ADD COLUMN IF NOT EXISTS ln_measured_i      NUMERIC(6,2),
  ADD COLUMN IF NOT EXISTS ln_measured_tp     NUMERIC(6,2),
  ADD COLUMN IF NOT EXISTS ln_measured_lra    NUMERIC(6,2),
  ADD COLUMN IF NOT EXISTS ln_measured_thresh NUMERIC(6,2),
  ADD COLUMN IF NOT EXISTS ln_offset          NUMERIC(6,2),
  ADD COLUMN IF NOT EXISTS ln_target_i        NUMERIC(6,2),
  ADD COLUMN IF NOT EXISTS ln_output_i        NUMERIC(6,2),  -- lo que A2.1 afirma
  ADD COLUMN IF NOT EXISTS ln_output_tp       NUMERIC(6,2),  -- lo que A2.2 afirma
  ADD COLUMN IF NOT EXISTS ln_linear          BOOLEAN,
  ADD COLUMN IF NOT EXISTS ln_measured_at     TIMESTAMPTZ;

COMMENT ON COLUMN public.version_media.ln_linear IS
  'TRUE = solo se movio el volumen. FALSE = loudnorm comprimio la mezcla. '
  'NULL = no se sabe. NUNCA asumir TRUE por defecto: el script de v1 lo hacia '
  'y marcaba como lineal todo lo que no supo leer.';

COMMENT ON COLUMN public.version_media.ln_output_i IS
  'LUFS medidos SOBRE EL ARCHIVO DE SALIDA con ebur128. No es el objetivo: '
  'es el resultado. Si difiere de ln_target_i en mas de 0,5 algo fallo.';


-- ============================================================
-- 2. VALIDACION
-- ============================================================
-- Rangos fisicos, no de gusto. Un LUFS positivo o un pico de +12 dBTP es
-- un error de parseo del script, no un tema muy fuerte.
CREATE OR REPLACE FUNCTION public.version_media_validar_sonoridad()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $$
BEGIN
  IF NEW.ln_measured_i IS NOT NULL AND (NEW.ln_measured_i < -70 OR NEW.ln_measured_i > 0) THEN
    RAISE EXCEPTION 'LUFS_ORIGEN_FUERA_DE_RANGO: % (esperado -70..0)', NEW.ln_measured_i
      USING ERRCODE='23514';
  END IF;
  IF NEW.ln_output_i IS NOT NULL AND (NEW.ln_output_i < -70 OR NEW.ln_output_i > 0) THEN
    RAISE EXCEPTION 'LUFS_SALIDA_FUERA_DE_RANGO: %', NEW.ln_output_i USING ERRCODE='23514';
  END IF;
  IF NEW.ln_target_i IS NOT NULL AND (NEW.ln_target_i < -36 OR NEW.ln_target_i > -5) THEN
    RAISE EXCEPTION 'OBJETIVO_ABSURDO: % (esperado -36..-5)', NEW.ln_target_i USING ERRCODE='23514';
  END IF;
  IF NEW.ln_output_tp IS NOT NULL AND (NEW.ln_output_tp < -70 OR NEW.ln_output_tp > 6) THEN
    RAISE EXCEPTION 'PICO_SALIDA_FUERA_DE_RANGO: %', NEW.ln_output_tp USING ERRCODE='23514';
  END IF;
  IF NEW.ln_measured_tp IS NOT NULL AND (NEW.ln_measured_tp < -70 OR NEW.ln_measured_tp > 20) THEN
    RAISE EXCEPTION 'PICO_ORIGEN_FUERA_DE_RANGO: %', NEW.ln_measured_tp USING ERRCODE='23514';
  END IF;
  IF NEW.ln_measured_lra IS NOT NULL AND (NEW.ln_measured_lra < 0 OR NEW.ln_measured_lra > 60) THEN
    RAISE EXCEPTION 'LRA_FUERA_DE_RANGO: %', NEW.ln_measured_lra USING ERRCODE='23514';
  END IF;

  -- Si hay cualquier dato de sonoridad, tiene que haber fecha.
  IF (NEW.ln_measured_i IS NOT NULL OR NEW.ln_output_i IS NOT NULL)
     AND NEW.ln_measured_at IS NULL THEN
    NEW.ln_measured_at := NOW();
  END IF;

  -- Coherencia: declarar lineal sin haber medido la salida es afirmar algo
  -- que nadie comprobo. Es exactamente el fallo que tenia el script v1.
  IF NEW.ln_linear IS TRUE AND NEW.ln_output_i IS NULL THEN
    RAISE EXCEPTION 'LINEAL_SIN_MEDICION: no se puede declarar lineal sin ln_output_i.'
      USING ERRCODE='23514';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS version_media_sonoridad_trg ON public.version_media;
CREATE TRIGGER version_media_sonoridad_trg
  BEFORE INSERT OR UPDATE ON public.version_media
  FOR EACH ROW EXECUTE FUNCTION public.version_media_validar_sonoridad();


-- ============================================================
-- 3. REGISTRAR LA DERIVADA  (cierra ALTA-2)
-- ============================================================
-- Una sola operacion atomica: crea/actualiza la fila LISTEN de
-- version_media Y apunta tracks.file_path al .m4a. Si se hicieran por
-- separado y fallara la segunda, el fan seguiria bajando el WAV mientras
-- la derivada existe sin que nadie la use.
--
-- El conflicto se resuelve por (version_id, role), la restriccion que ya
-- trae fix-02. Subir dos veces la misma derivada actualiza la fila: NO
-- crea una segunda ni choca contra el UNIQUE de file_path.
--
-- Deliberadamente NO es SECURITY DEFINER. Corre con los permisos de quien
-- llama, de modo que las politicas RLS de fix-02 -- incluido el trigger de
-- coherencia que valida la carpeta -- se evaluan igual que en un INSERT
-- normal. Una RPC DEFINER aqui seria una puerta trasera a version_media.
-- Columna de vuelta atras para A4. Va ANTES de la funcion que la usa.
ALTER TABLE public.tracks
  ADD COLUMN IF NOT EXISTS file_path_anterior TEXT;
COMMENT ON COLUMN public.tracks.file_path_anterior IS
  'Ruta que servia la ficha antes de apuntar a la derivada. Permite deshacer A4.';

CREATE OR REPLACE FUNCTION public.registrar_derivada(
  p_version_id   UUID,
  p_file_path    TEXT,
  p_file_name    TEXT,
  p_content_type TEXT,
  p_size_bytes   BIGINT,
  p_bitrate_kbps INT,
  p_duration_seconds INT,
  p_ln JSONB DEFAULT NULL       -- {measured_i, measured_tp, measured_lra,
                                --  measured_thresh, offset, target_i,
                                --  output_i, output_tp, linear}
)
RETURNS UUID
LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $$
DECLARE
  v_owner UUID;
  v_track UUID;
  v_id    UUID;
BEGIN
  SELECT owner_id, track_id INTO v_owner, v_track
    FROM public.song_versions WHERE id = p_version_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'VERSION_NO_EXISTE' USING ERRCODE='23503';
  END IF;

  INSERT INTO public.version_media (
    version_id, owner_id, role, file_path, file_name, content_type,
    delivery, size_bytes, bitrate_kbps, duration_seconds, status, confirmed_at,
    ln_measured_i, ln_measured_tp, ln_measured_lra, ln_measured_thresh,
    ln_offset, ln_target_i, ln_output_i, ln_output_tp, ln_linear, ln_measured_at
  ) VALUES (
    p_version_id, v_owner, 'LISTEN', p_file_path, p_file_name, p_content_type,
    'progressive', p_size_bytes, p_bitrate_kbps, p_duration_seconds, 'UPLOADED', NOW(),
    (p_ln->>'measured_i')::NUMERIC,  (p_ln->>'measured_tp')::NUMERIC,
    (p_ln->>'measured_lra')::NUMERIC,(p_ln->>'measured_thresh')::NUMERIC,
    (p_ln->>'offset')::NUMERIC,      (p_ln->>'target_i')::NUMERIC,
    (p_ln->>'output_i')::NUMERIC,    (p_ln->>'output_tp')::NUMERIC,
    (p_ln->>'linear')::BOOLEAN,      NOW()
  )
  ON CONFLICT (version_id, role) DO UPDATE SET
    file_path        = EXCLUDED.file_path,
    file_name        = EXCLUDED.file_name,
    content_type     = EXCLUDED.content_type,
    size_bytes       = EXCLUDED.size_bytes,
    bitrate_kbps     = EXCLUDED.bitrate_kbps,
    duration_seconds = EXCLUDED.duration_seconds,
    status           = 'UPLOADED',
    confirmed_at     = NOW(),
    ln_measured_i    = EXCLUDED.ln_measured_i,
    ln_measured_tp   = EXCLUDED.ln_measured_tp,
    ln_measured_lra  = EXCLUDED.ln_measured_lra,
    ln_measured_thresh = EXCLUDED.ln_measured_thresh,
    ln_offset        = EXCLUDED.ln_offset,
    ln_target_i      = EXCLUDED.ln_target_i,
    ln_output_i      = EXCLUDED.ln_output_i,
    ln_output_tp     = EXCLUDED.ln_output_tp,
    ln_linear        = EXCLUDED.ln_linear,
    ln_measured_at   = NOW()
  RETURNING id INTO v_id;

  -- La ficha pasa a servir la derivada. file_path_anterior guarda el master
  -- para poder volver atras: sin esto, A4 es irreversible.
  UPDATE public.tracks
     SET file_path_anterior = COALESCE(file_path_anterior, file_path),
         file_path          = p_file_path,
         duration_seconds   = COALESCE(p_duration_seconds, duration_seconds)
   WHERE id = v_track;

  RETURN v_id;
END;
$$;

REVOKE ALL ON FUNCTION public.registrar_derivada(UUID,TEXT,TEXT,TEXT,BIGINT,INT,INT,JSONB) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.registrar_derivada(UUID,TEXT,TEXT,TEXT,BIGINT,INT,INT,JSONB) TO authenticated;


-- ============================================================
-- 4. GRANT EXPLICITO
-- ============================================================
GRANT SELECT, INSERT, UPDATE ON public.version_media TO authenticated;


-- ============================================================
-- 5. VERIFICACION
-- ============================================================
SELECT
  'cols_ln='   || (SELECT count(*) FROM information_schema.columns
                    WHERE table_schema='public' AND table_name='version_media'
                      AND column_name LIKE 'ln\_%')::TEXT ||
  ' | col_prev='|| (SELECT count(*) FROM information_schema.columns
                    WHERE table_schema='public' AND table_name='tracks'
                      AND column_name='file_path_anterior')::TEXT ||
  ' | trg='     || (SELECT count(*) FROM pg_trigger
                    WHERE tgname='version_media_sonoridad_trg')::TEXT ||
  ' | fn_reg='  || (SELECT count(*) FROM pg_proc WHERE proname='registrar_derivada')::TEXT ||
  ' | definer=' || (SELECT count(*) FROM pg_proc WHERE proname='registrar_derivada' AND prosecdef)::TEXT ||
  ' | listen='  || (SELECT count(*) FROM public.version_media WHERE role='LISTEN')::TEXT
  AS resultado;

-- ESPERADO la primera vez:
-- cols_ln=10 | col_prev=1 | trg=1 | fn_reg=1 | definer=0 | listen=0
--
-- definer=0 no es un descuido: es el punto. Si algun dia dice 1, alguien
-- convirtio esta RPC en una puerta que se salta RLS.
