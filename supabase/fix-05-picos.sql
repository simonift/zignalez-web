-- ═══════════════════════════════════════════════════════════════════
-- fix-05 · Picos de onda para el reproductor
-- Zignalez · v1 · 17-09-2026
--
-- REQUIERE: fix-01 y fix-02 v3. El bloque 0 aborta si no.
-- IDEMPOTENTE.
--
-- POR QUE UNA COLUMNA Y NO CALCULARLO EN EL NAVEGADOR:
-- dibujar la onda exige el PCM completo. decodeAudioData() sobre un WAV de
-- 40 MB descarga el archivo entero y lo expande a ~250 MB de Float32 en
-- memoria, por cada tema y en cada visita. En un telefono eso es la pestaña
-- cerrandose. Los picos se calculan UNA vez, al subir, con el archivo que ya
-- esta en el disco del que sube -- coste de red cero -- y se guardan aqui.
-- 400 numeros pesan ~2 KB. Es el mismo enfoque de SoundCloud.
-- ═══════════════════════════════════════════════════════════════════

-- ============================================================
-- 0. PRECONDICIONES
-- ============================================================
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_proc WHERE proname='is_admin') THEN
    RAISE EXCEPTION 'FALTA public.is_admin(). Ejecuta fix-01 primero.';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_tables WHERE schemaname='public' AND tablename='tracks') THEN
    RAISE EXCEPTION 'No existe public.tracks.';
  END IF;
  RAISE NOTICE 'Precondiciones OK.';
END $$;


-- ============================================================
-- 1. LA COLUMNA
-- ============================================================
-- Arreglo de numeros en [0,1]: la amplitud maxima de cada tramo temporal.
-- NULL significa "todavia no calculado" y el cliente dibuja una barra neutra.
-- NUNCA una onda inventada: una onda que no corresponde al audio es peor que
-- no tener onda, porque el usuario la usa para orientarse y le miente.
ALTER TABLE public.tracks
  ADD COLUMN IF NOT EXISTS peaks JSONB;

ALTER TABLE public.tracks
  ADD COLUMN IF NOT EXISTS peaks_updated_at TIMESTAMPTZ;

COMMENT ON COLUMN public.tracks.peaks IS
  'Amplitudes normalizadas [0,1] por tramo. NULL = sin calcular. Maximo 512.';


-- ============================================================
-- 2. VALIDACION
-- ============================================================
-- Un valor fuera de [0,1] no rompe nada visible: solo dibuja una barra que se
-- sale del lienzo y nadie sabe por que. Se corta aqui.

CREATE OR REPLACE FUNCTION public.tracks_validar_picos()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $$
DECLARE n INT; v NUMERIC; elem JSONB;
BEGIN
  IF NEW.peaks IS NULL THEN
    IF TG_OP = 'UPDATE' AND OLD.peaks IS NOT NULL THEN
      NEW.peaks_updated_at := NULL;
    END IF;
    RETURN NEW;
  END IF;

  IF jsonb_typeof(NEW.peaks) <> 'array' THEN
    RAISE EXCEPTION 'PICOS_NO_ES_ARREGLO' USING ERRCODE = '23514';
  END IF;

  n := jsonb_array_length(NEW.peaks);
  IF n = 0 THEN
    RAISE EXCEPTION 'PICOS_VACIO: usa NULL si no estan calculados, no un arreglo vacio.'
      USING ERRCODE = '23514';
  END IF;
  IF n > 512 THEN
    RAISE EXCEPTION 'PICOS_DEMASIADOS: maximo 512 (trae %).', n USING ERRCODE = '23514';
  END IF;

  FOR elem IN SELECT jsonb_array_elements(NEW.peaks) LOOP
    IF jsonb_typeof(elem) <> 'number' THEN
      RAISE EXCEPTION 'PICO_NO_NUMERICO' USING ERRCODE = '23514';
    END IF;
    v := elem::TEXT::NUMERIC;
    IF v < 0 OR v > 1 THEN
      RAISE EXCEPTION 'PICO_FUERA_DE_RANGO: % no esta en [0,1].', v USING ERRCODE = '23514';
    END IF;
  END LOOP;

  IF TG_OP = 'INSERT' OR NEW.peaks IS DISTINCT FROM OLD.peaks THEN
    NEW.peaks_updated_at := NOW();
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS tracks_validar_picos_trg ON public.tracks;
CREATE TRIGGER tracks_validar_picos_trg
  BEFORE INSERT OR UPDATE ON public.tracks
  FOR EACH ROW EXECUTE FUNCTION public.tracks_validar_picos();


-- ============================================================
-- 3. VERIFICACION
-- ============================================================
SELECT
  'col_peaks='   || (SELECT count(*) FROM information_schema.columns
                      WHERE table_schema='public' AND table_name='tracks'
                        AND column_name='peaks')::TEXT ||
  ' | col_fecha='|| (SELECT count(*) FROM information_schema.columns
                      WHERE table_schema='public' AND table_name='tracks'
                        AND column_name='peaks_updated_at')::TEXT ||
  ' | trg='      || (SELECT count(*) FROM pg_trigger
                      WHERE tgname='tracks_validar_picos_trg')::TEXT ||
  ' | con_picos='|| (SELECT count(*) FROM public.tracks WHERE peaks IS NOT NULL)::TEXT ||
  ' | sin_picos='|| (SELECT count(*) FROM public.tracks WHERE peaks IS NULL)::TEXT
  AS resultado;

-- ESPERADO la primera vez:
-- col_peaks=1 | col_fecha=1 | trg=1 | con_picos=0 | sin_picos=6
