-- ═══════════════════════════════════════════════════════════════════
-- fix-04 · Letras sincronizadas
-- Zignalez · v1 · 17-09-2026
--
-- REQUIERE: fix-01 y fix-02 v3 ejecutados. El bloque 0 aborta si no.
-- IDEMPOTENTE.
--
-- No reutiliza can_read_maqueta(): esa función razona sobre rutas de archivo
-- en el bucket y aquí no hay archivo. Mezclarlas acoplaría dos permisos que
-- van a divergir.
-- ═══════════════════════════════════════════════════════════════════

-- ============================================================
-- 0. PRECONDICIONES
-- ============================================================
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_proc WHERE proname='is_admin') THEN
    RAISE EXCEPTION 'FALTA public.is_admin(). Ejecuta fix-01 primero.';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                  WHERE table_schema='public' AND table_name='tracks'
                    AND column_name='owner_id') THEN
    RAISE EXCEPTION 'FALTA public.tracks.owner_id. Ejecuta fix-02 v3 primero.';
  END IF;
  RAISE NOTICE 'Precondiciones OK.';
END $$;


-- ============================================================
-- 1. LA TABLA
-- ============================================================
-- `lines` se guarda YA PARSEADO, no como LRC. Parsear en el cliente en cada
-- reproducción es trabajo repetido y una superficie de error más.
-- Forma: [{"t": 12.34, "l": "texto de la línea"}, ...] ordenado por t.
--
-- `plain` es la letra completa sin tiempos: para quien no quiere la sincronía,
-- para copiar y pegar, y como respaldo si `lines` queda vacío.

CREATE TABLE IF NOT EXISTS public.track_lyrics (
  track_id   UUID PRIMARY KEY REFERENCES public.tracks(id) ON DELETE CASCADE,
  owner_id   UUID NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id),
  lines      JSONB NOT NULL DEFAULT '[]'::jsonb,
  plain      TEXT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT lines_es_arreglo CHECK (jsonb_typeof(lines) = 'array')
);

ALTER TABLE public.track_lyrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.track_lyrics FORCE  ROW LEVEL SECURITY;

-- GRANT explícito, a propósito. Supabase configura ALTER DEFAULT PRIVILEGES
-- para que las tablas nuevas del esquema public queden accesibles a
-- authenticated, así que normalmente esto sobra. Pero "normalmente" no es una
-- garantía: si ese ajuste no está o alguien lo cambió, el cliente recibe
-- "permission denied for table" y las políticas RLS ni siquiera se evalúan --
-- un fallo que parece de RLS y no lo es. Cuesta una línea. Va.
GRANT SELECT, INSERT, UPDATE, DELETE ON public.track_lyrics TO authenticated;


-- ============================================================
-- 2. LAS INVARIANTES  (en el servidor, no en el cliente)
-- ============================================================
-- El motor de sincronía del navegador hace búsqueda binaria sobre los tiempos.
-- Un solo par desordenado la rompe EN SILENCIO: el síntoma es una línea que
-- parpadea, y atribuir eso a los datos cuesta horas. Se valida aquí.

CREATE OR REPLACE FUNCTION public.track_lyrics_validar()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $$
DECLARE
  n         INT;
  t_prev    NUMERIC := NULL;
  elem      JSONB;
  t_actual  NUMERIC;
BEGIN
  NEW.updated_at := NOW();

  n := jsonb_array_length(NEW.lines);
  IF n > 300 THEN
    RAISE EXCEPTION 'DEMASIADAS_LINEAS: máximo 300 (trae %).', n
      USING ERRCODE = '23514';
  END IF;

  FOR elem IN SELECT jsonb_array_elements(NEW.lines) LOOP
    IF jsonb_typeof(elem) <> 'object' THEN
      RAISE EXCEPTION 'LINEA_NO_ES_OBJETO: cada entrada debe ser {"t":..,"l":".."}.'
        USING ERRCODE = '23514';
    END IF;

    -- Claves exactas: ni de más ni de menos. Una clave extra hoy es un campo
    -- fantasma que mañana alguien lee y nadie mantiene.
    IF NOT (elem ?& ARRAY['t','l']) OR (SELECT count(*) FROM jsonb_object_keys(elem)) <> 2 THEN
      RAISE EXCEPTION 'CLAVES_INVALIDAS: cada entrada lleva exactamente t y l.'
        USING ERRCODE = '23514';
    END IF;

    IF jsonb_typeof(elem->'t') <> 'number' THEN
      RAISE EXCEPTION 'T_NO_NUMERICO: t debe ser un número de segundos.'
        USING ERRCODE = '23514';
    END IF;
    IF jsonb_typeof(elem->'l') <> 'string' THEN
      RAISE EXCEPTION 'L_NO_TEXTO: l debe ser texto.'
        USING ERRCODE = '23514';
    END IF;

    t_actual := (elem->>'t')::NUMERIC;
    IF t_actual < 0 THEN
      RAISE EXCEPTION 'T_NEGATIVO: t = %.', t_actual USING ERRCODE = '23514';
    END IF;

    -- Estrictamente ascendente. Dos líneas en el mismo instante tampoco valen:
    -- el motor tendría que elegir una y la elección sería arbitraria.
    IF t_prev IS NOT NULL AND t_actual <= t_prev THEN
      RAISE EXCEPTION 'TIEMPOS_DESORDENADOS: % viene después de % y debe ser mayor.',
        t_actual, t_prev USING ERRCODE = '23514';
    END IF;
    t_prev := t_actual;
  END LOOP;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS track_lyrics_validar_trg ON public.track_lyrics;
CREATE TRIGGER track_lyrics_validar_trg
  BEFORE INSERT OR UPDATE ON public.track_lyrics
  FOR EACH ROW EXECUTE FUNCTION public.track_lyrics_validar();


-- ============================================================
-- 3. RLS
-- ============================================================
-- La letra es menos sensible que el audio, pero no es pública: es material
-- inédito. Se lee si el tema está visible, o si eres el dueño, o admin.

CREATE OR REPLACE FUNCTION public.track_es_visible(p_track_id UUID)
RETURNS BOOLEAN
LANGUAGE sql SECURITY DEFINER STABLE
SET search_path = public, pg_temp
AS $$
  SELECT EXISTS (SELECT 1 FROM public.tracks t
                  WHERE t.id = p_track_id AND t.visible = TRUE);
$$;

REVOKE ALL ON FUNCTION public.track_es_visible(UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.track_es_visible(UUID) TO authenticated;

DROP POLICY IF EXISTS tl_select ON public.track_lyrics;
CREATE POLICY tl_select ON public.track_lyrics
  FOR SELECT TO authenticated
  USING (owner_id = auth.uid()
         OR public.is_admin()
         OR public.track_es_visible(track_id));

-- Escribir exige ser dueño DEL TEMA, no solo declararse dueño de la fila.
-- Sin es_dueno_del_track un fan colgaba una letra de un tema ajeno: el mismo
-- patrón que A-2 en fix-02.
DROP POLICY IF EXISTS tl_insert ON public.track_lyrics;
CREATE POLICY tl_insert ON public.track_lyrics
  FOR INSERT TO authenticated
  WITH CHECK (owner_id = auth.uid() AND public.es_dueno_del_track(track_id));

DROP POLICY IF EXISTS tl_update ON public.track_lyrics;
CREATE POLICY tl_update ON public.track_lyrics
  FOR UPDATE TO authenticated
  USING (owner_id = auth.uid() OR public.is_admin())
  WITH CHECK ((owner_id = auth.uid() OR public.is_admin())
              AND public.es_dueno_del_track(track_id));

DROP POLICY IF EXISTS tl_delete ON public.track_lyrics;
CREATE POLICY tl_delete ON public.track_lyrics
  FOR DELETE TO authenticated
  USING (owner_id = auth.uid() OR public.is_admin());


-- ============================================================
-- 4. VERIFICACIÓN
-- ============================================================
SELECT
  'tabla='       || (SELECT count(*) FROM pg_tables
                      WHERE schemaname='public' AND tablename='track_lyrics')::TEXT ||
  ' | trg='      || (SELECT count(*) FROM pg_trigger
                      WHERE tgname='track_lyrics_validar_trg')::TEXT ||
  ' | fn_vis='   || (SELECT count(*) FROM pg_proc WHERE proname='track_es_visible')::TEXT ||
  ' | pol='      || (SELECT count(*) FROM pg_policies
                      WHERE schemaname='public' AND tablename='track_lyrics')::TEXT ||
  ' | forced='   || (SELECT count(*) FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
                      WHERE n.nspname='public' AND c.relname='track_lyrics'
                        AND c.relforcerowsecurity)::TEXT
  AS resultado;

-- ESPERADO:
-- tabla=1 | trg=1 | fn_vis=1 | pol=4 | forced=1
