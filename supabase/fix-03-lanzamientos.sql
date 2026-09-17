-- ═══════════════════════════════════════════════════════════════════
-- fix-03 · Lanzamientos: single, EP y álbum
-- Zignalez · v4 · 17-09-2026 (endurecido tras auditoría con roles)
--
-- REQUIERE: fix-01 y fix-02 ejecutados. El bloque 0 aborta si no.
-- IDEMPOTENTE.
--
-- Modelo extraído de artist-release-os/release-service, corrigiendo sus
-- seis defectos (ver PROMPT_MAESTRO_LANZAMIENTOS.md §1).
--
-- CAMBIO v3 → v4. Diez hallazgos de la revisión adversarial (DBA + seguridad):
--   D-1 · guardas de READY burlables por concurrencia: dos sesiones vaciaban
--         el tracklist y marcaban READY a la vez. Ahora hay FOR UPDATE.
--   D-2 · CREATE TABLE IF NOT EXISTS nunca corrige el CHECK de una tabla que
--         ya existe. La corrección de v3 no habría llegado a una base donde
--         v2 ya corrió. Ahora hay ALTER TABLE explícito.
--   D-3 · release_type era mutable en READY: SINGLE→ALBUM evadía el tamaño.
--   D-4 · UNIQUE(release_id, track_order) no diferible: reordenar el tracklist
--         en una sola sentencia era imposible.
--   D-5 · el trigger BEFORE degradaba a PLANNING incluso en un INSERT ... ON
--         CONFLICT DO NOTHING que no escribía nada. Degradación movida a AFTER.
--   D-6 · RELEASED protegía solo `status`: título, tipo y fecha seguían
--         editables, y el DELETE del lanzamiento no estaba bloqueado.
--   D-7 · SCHEDULED no tenía NINGUNA guarda: se programaba un álbum vacío.
--   D-8 · track_lista_para_lanzar no exigía MASTER: se "lanzaba" con solo una
--         derivada de escucha y sin el archivo fuente.
--   S-1 · un fan podía fijar los tracks del artista en su propio lanzamiento
--         y con ON DELETE RESTRICT dejarlos imborrables. DoS permanente.
--   S-2 · un lanzamiento podía NACER en RELEASED o SCHEDULED, saltándose la
--         máquina de estados entera.
-- ═══════════════════════════════════════════════════════════════════

-- ============================================================
-- 0. PRECONDICIONES
-- ============================================================
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_proc WHERE proname='is_admin') THEN
    RAISE EXCEPTION 'FALTA public.is_admin(). Ejecuta fix-01 primero.';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_tables WHERE tablename='song_versions') THEN
    RAISE EXCEPTION 'FALTA public.song_versions. Ejecuta fix-02 primero.';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_tables WHERE tablename='version_media') THEN
    RAISE EXCEPTION 'FALTA public.version_media. Ejecuta fix-02 primero.';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_proc WHERE proname='es_dueno_del_track') THEN
    RAISE EXCEPTION 'FALTA public.es_dueno_del_track(). Ejecuta fix-02 v3 (o superior) primero.';
  END IF;
  RAISE NOTICE 'Precondiciones OK.';
END $$;


-- ============================================================
-- 1. LANZAMIENTOS
-- ============================================================
CREATE TABLE IF NOT EXISTS public.releases (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id     UUID NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id),
  title        TEXT NOT NULL CHECK (length(btrim(title)) > 0),
  release_type TEXT NOT NULL CHECK (release_type IN ('SINGLE','EP','ALBUM')),
  status       TEXT NOT NULL DEFAULT 'PLANNING'
                 CHECK (status IN ('PLANNING','SCHEDULED','READY','RELEASED')),
  release_date TIMESTAMPTZ,
  platforms    TEXT[] NOT NULL DEFAULT '{}',
  cover_path   TEXT,
  notes        TEXT,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- L-3: programar sin fecha no es programar.
  -- CORREGIDO 17-09-2026: la version anterior decia (status='PLANNING' OR ...),
  -- lo que obligaba a tener fecha tambien en READY y bloqueaba el camino feliz
  -- PLANNING -> READY. Confundi "listo" con "programado": un lanzamiento puede
  -- estar listo sin fecha decidida. Solo SCHEDULED y RELEASED la exigen.
  CONSTRAINT fecha_obligatoria_al_programar
    CHECK (status NOT IN ('SCHEDULED','RELEASED') OR release_date IS NOT NULL),

  -- L-5: lista cerrada, no un VARCHAR con comas
  CONSTRAINT plataformas_validas
    CHECK (platforms <@ ARRAY['SPOTIFY','APPLE','YOUTUBE','DEEZER','TIDAL','AMAZON']::TEXT[])
);

CREATE INDEX IF NOT EXISTS idx_releases_owner ON public.releases (owner_id, status);


-- ============================================================
-- 2. TRACKLIST
-- ============================================================
CREATE TABLE IF NOT EXISTS public.release_tracks (
  release_id  UUID NOT NULL REFERENCES public.releases(id) ON DELETE CASCADE,
  -- RESTRICT a propósito: borrar una canción que está en un lanzamiento debe
  -- fallar. Primero se saca del lanzamiento, después se borra.
  track_id    UUID NOT NULL REFERENCES public.tracks(id) ON DELETE RESTRICT,
  track_order INT  NOT NULL CHECK (track_order > 0),
  added_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (release_id, track_id),
  -- L-4: dos canciones no ocupan la misma posicion
  CONSTRAINT orden_unico UNIQUE (release_id, track_order)
);

CREATE INDEX IF NOT EXISTS idx_release_tracks_track ON public.release_tracks (track_id);


-- ============================================================
-- 2.5 CONVERGENCIA DE RESTRICCIONES  (cierra D-2 y D-4)
-- ============================================================
-- CREATE TABLE IF NOT EXISTS no toca una tabla existente. Si una base ya corrió
-- una versión anterior de este archivo, el CHECK equivocado sigue ahí y el
-- comentario de arriba miente. Las restricciones que cambian se re-declaran.

ALTER TABLE public.releases DROP CONSTRAINT IF EXISTS fecha_obligatoria_al_programar;
ALTER TABLE public.releases ADD  CONSTRAINT fecha_obligatoria_al_programar
  CHECK (status NOT IN ('SCHEDULED','RELEASED') OR release_date IS NOT NULL);

-- D-4: sin DEFERRABLE, reordenar el tracklist con un solo UPDATE choca contra
-- el índice único a mitad de camino: 1→2 tropieza con el 2 que todavía existe.
--
-- MEDIDO 17-09-2026, contra mi propia expectativa: DEFERRABLE INITIALLY
-- IMMEDIATE no deja el comportamiento por defecto intacto, como yo había
-- escrito. Mueve la comprobación de "por fila" a "al final de la sentencia",
-- y con eso el UPDATE de intercambio ya pasa SIN necesidad de SET CONSTRAINTS.
-- Es el resultado que queríamos; el comentario anterior era falso.
-- SET CONSTRAINTS orden_unico DEFERRED sigue disponible para reordenamientos
-- que abarquen varias sentencias.
--
-- CONTRAPARTIDA, a tener presente en el cliente: una restricción DEFERRABLE no
-- sirve para inferir conflicto. `ON CONFLICT (release_id, track_order)` falla.
-- Usar `ON CONFLICT DO NOTHING` a secas, o la PK (release_id, track_id).
ALTER TABLE public.release_tracks DROP CONSTRAINT IF EXISTS orden_unico;
ALTER TABLE public.release_tracks ADD  CONSTRAINT orden_unico
  UNIQUE (release_id, track_order) DEFERRABLE INITIALLY IMMEDIATE;


-- ============================================================
-- 3. ¿ESTÁ LISTA PARA LANZAR?
-- ============================================================
-- Equivalente Zignalez del "readiness" de ARO. Se evalúa EN LA MISMA
-- TRANSACCIÓN: sin llamadas de red, sin el defecto L-2 (confundir un fallo
-- de red con "no elegible").

-- D-8: "lista" significa que existe el MASTER subido y confirmado. Con solo la
-- derivada de escucha no se entrega nada a una distribuidora.
CREATE OR REPLACE FUNCTION public.track_lista_para_lanzar(p_track_id UUID)
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT EXISTS (
    SELECT 1
      FROM public.song_versions v
      JOIN public.version_media m ON m.version_id = v.id
     WHERE v.track_id = p_track_id
       AND v.stage IN ('RELEASE_READY','RELEASED')
       AND m.role   = 'MASTER'
       AND m.status = 'UPLOADED'
  );
$$;

-- S-3: era un oráculo. Expuesta por PostgREST como RPC y siendo SECURITY
-- DEFINER, cualquier autenticado podía sondear el estado de producción de
-- CUALQUIER track ajeno con un UUID. Solo la usan los triggers de este archivo,
-- que ahora son SECURITY DEFINER y por tanto no necesitan el GRANT.
REVOKE ALL ON FUNCTION public.track_lista_para_lanzar(UUID) FROM PUBLIC, anon, authenticated;


-- ============================================================
-- 4. MÁQUINA DE ESTADOS + GUARDAS  (corrige L-1, D-1, D-3, D-6, D-7, S-2)
-- ============================================================
-- ARO aceptaba CUALQUIER transición: de RELEASED se volvía a PLANNING.
-- Aquí las transiciones válidas están declaradas y RELEASED es terminal --
-- terminal de verdad: ni estado, ni título, ni tipo, ni fecha, ni borrado.
--
-- SECURITY DEFINER a propósito: las guardas tienen que CONTAR el tracklist
-- completo. Con RLS por medio, un conteo parcial devuelve "0 canciones" y la
-- guarda se convierte en un adorno.

CREATE OR REPLACE FUNCTION public.releases_guardas()
RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  n_tracks INT;
  n_listas INT;
  max_orden INT;
  t RECORD;
BEGIN
  NEW.updated_at := NOW();

  -- ── 4.0 Nacimiento (S-2) ────────────────────────────────────────
  -- Un lanzamiento no nace publicado ni programado. Empieza en PLANNING y
  -- recorre la máquina como todos. Sin esto, un INSERT con status='RELEASED'
  -- se saltaba las guardas enteras: nunca hay OLD contra el que comparar.
  IF TG_OP = 'INSERT' AND NEW.status <> 'PLANNING' THEN
    RAISE EXCEPTION 'NACE_EN_PLANNING: un lanzamiento se crea en PLANNING (pediste %).', NEW.status
      USING ERRCODE = '23514';
  END IF;

  -- ── 4.1 Transiciones ────────────────────────────────────────────
  IF TG_OP = 'UPDATE' THEN
    -- D-6: RELEASED es terminal para TODA la fila, no solo para status.
    IF OLD.status = 'RELEASED' THEN
      IF NEW.status IS DISTINCT FROM OLD.status THEN
        RAISE EXCEPTION 'RELEASED_ES_TERMINAL: un lanzamiento publicado no vuelve atrás. Crea otro.'
          USING ERRCODE = '23514';
      END IF;
      IF (NEW.title, NEW.release_type, NEW.release_date, NEW.owner_id)
         IS DISTINCT FROM
         (OLD.title, OLD.release_type, OLD.release_date, OLD.owner_id) THEN
        RAISE EXCEPTION 'RELEASED_INMUTABLE: título, tipo, fecha y dueño quedan congelados al publicar.'
          USING ERRCODE = '23514';
      END IF;
    END IF;

    -- Camino válido: PLANNING → READY → (SCHEDULED) → RELEASED.
    -- Se publica desde READY o desde SCHEDULED; nunca desde PLANNING, que es
    -- precisamente el estado al que devuelve la regla de oro cuando el
    -- tracklist cambió después de haberse validado.
    IF NEW.status = 'RELEASED' AND OLD.status NOT IN ('READY','SCHEDULED') THEN
      RAISE EXCEPTION 'TRANSICION_INVALIDA: solo se publica desde READY o SCHEDULED (actual: %)', OLD.status
        USING ERRCODE = '23514';
    END IF;

    -- D-3: cambiar SINGLE→ALBUM estando en READY dejaba un READY que ninguna
    -- guarda de tamaño había visto nunca. El tipo solo se toca en PLANNING.
    IF NEW.release_type IS DISTINCT FROM OLD.release_type
       AND OLD.status <> 'PLANNING' THEN
      RAISE EXCEPTION 'TIPO_CONGELADO: el tipo solo se cambia en PLANNING (estado actual: %).', OLD.status
        USING ERRCODE = '23514';
    END IF;
  END IF;

  -- ── 4.2 Guardas al entrar en READY o SCHEDULED ──────────────────
  -- D-7: antes SCHEDULED no validaba nada. Se podía programar para el viernes
  -- un álbum sin canciones.
  IF NEW.status IN ('READY','SCHEDULED')
     AND (TG_OP = 'INSERT' OR OLD.status IS DISTINCT FROM NEW.status) THEN

    -- D-1: sin este bloqueo, dos transacciones simultáneas -- una vaciando el
    -- tracklist, otra marcando READY -- veían cada una un mundo válido y
    -- commiteaban ambas. El lanzamiento quedaba READY y vacío.
    PERFORM 1 FROM public.release_tracks WHERE release_id = NEW.id FOR UPDATE;

    SELECT count(*), coalesce(max(track_order),0)
      INTO n_tracks, max_orden
      FROM public.release_tracks WHERE release_id = NEW.id;

    IF n_tracks = 0 THEN
      RAISE EXCEPTION 'SIN_CANCIONES: agrega al menos una canción antes de marcar %.', NEW.status
        USING ERRCODE = '23514';
    END IF;

    -- Tamaños por tipo. ARO validaba EP y ALBUM igual, con lo cual el tipo
    -- no significaba nada. Aquí se distinguen.
    IF NEW.release_type = 'SINGLE' AND n_tracks <> 1 THEN
      RAISE EXCEPTION 'TAMANO_INVALIDO: un SINGLE lleva exactamente 1 canción (tiene %).', n_tracks
        USING ERRCODE = '23514';
    END IF;
    IF NEW.release_type = 'EP' AND (n_tracks < 2 OR n_tracks > 6) THEN
      RAISE EXCEPTION 'TAMANO_INVALIDO: un EP lleva entre 2 y 6 canciones (tiene %).', n_tracks
        USING ERRCODE = '23514';
    END IF;
    IF NEW.release_type = 'ALBUM' AND n_tracks < 7 THEN
      RAISE EXCEPTION 'TAMANO_INVALIDO: un ALBUM lleva 7 o más canciones (tiene %).', n_tracks
        USING ERRCODE = '23514';
    END IF;

    -- Orden contiguo desde 1, sin huecos
    IF max_orden <> n_tracks THEN
      RAISE EXCEPTION 'ORDEN_CON_HUECOS: el tracklist debe ir de 1 a % sin saltos (máximo actual: %).',
        n_tracks, max_orden USING ERRCODE = '23514';
    END IF;

    -- Cada canción, re-validada aquí y ahora (guarda de ARO §0.3)
    SELECT count(*) INTO n_listas
      FROM public.release_tracks rt
     WHERE rt.release_id = NEW.id
       AND public.track_lista_para_lanzar(rt.track_id);

    IF n_listas <> n_tracks THEN
      SELECT t2.title INTO t
        FROM public.release_tracks rt
        JOIN public.tracks t2 ON t2.id = rt.track_id
       WHERE rt.release_id = NEW.id
         AND NOT public.track_lista_para_lanzar(rt.track_id)
       ORDER BY rt.track_order LIMIT 1;
      RAISE EXCEPTION 'CANCION_NO_LISTA: "%" no tiene una versión RELEASE_READY con MASTER confirmado.',
        coalesce(t.title,'(sin título)') USING ERRCODE = '23514';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS releases_guardas_trg ON public.releases;
CREATE TRIGGER releases_guardas_trg
  BEFORE INSERT OR UPDATE ON public.releases
  FOR EACH ROW EXECUTE FUNCTION public.releases_guardas();


-- D-6 (segunda mitad): borrar un lanzamiento publicado es reescribir la
-- historia. Y con ON DELETE CASCADE se llevaba el tracklist por delante.
CREATE OR REPLACE FUNCTION public.releases_no_borrar_publicado()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $$
BEGIN
  IF OLD.status = 'RELEASED' THEN
    RAISE EXCEPTION 'RELEASED_NO_SE_BORRA: un lanzamiento publicado no se elimina.'
      USING ERRCODE = '23514';
  END IF;
  RETURN OLD;
END;
$$;

DROP TRIGGER IF EXISTS releases_no_borrar_trg ON public.releases;
CREATE TRIGGER releases_no_borrar_trg
  BEFORE DELETE ON public.releases
  FOR EACH ROW EXECUTE FUNCTION public.releases_no_borrar_publicado();


-- ============================================================
-- 5. LA REGLA DE ORO  (de ARO: el estado no sobrevive al contenido)
-- ============================================================
-- Cualquier cambio de tracklist en un lanzamiento READY o SCHEDULED lo
-- devuelve a PLANNING. Agregar, quitar o reordenar. Sin excepciones.
--
-- D-5: va en DOS triggers. El veto en BEFORE, porque debe rechazar antes de
-- escribir. La degradación en AFTER, porque un INSERT ... ON CONFLICT DO
-- NOTHING que no escribe nada NO debe tumbar un lanzamiento READY: el BEFORE
-- se dispara igual, el AFTER no.

CREATE OR REPLACE FUNCTION public.release_tracks_veto()
RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE est TEXT;
BEGIN
  SELECT status INTO est FROM public.releases
   WHERE id = COALESCE(NEW.release_id, OLD.release_id);

  -- Si RELEASED es terminal, su CONTENIDO también lo es. Sin esta guarda se
  -- podía vaciar el tracklist de un lanzamiento ya publicado (prueba T17).
  IF est = 'RELEASED' THEN
    RAISE EXCEPTION 'RELEASED_INMUTABLE: no se modifica el tracklist de un lanzamiento publicado.'
      USING ERRCODE = '23514';
  END IF;
  RETURN COALESCE(NEW, OLD);
END;
$$;

CREATE OR REPLACE FUNCTION public.release_tracks_degradar()
RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE rid UUID; est TEXT;
BEGIN
  rid := COALESCE(NEW.release_id, OLD.release_id);

  -- D-1: FOR UPDATE. Si otra transacción está marcando READY en este mismo
  -- instante, aquí se espera a que termine y se lee su estado ya commiteado,
  -- no el anterior. Es lo que convierte la regla de oro en una garantía.
  SELECT status INTO est FROM public.releases WHERE id = rid FOR UPDATE;

  IF est = 'RELEASED' THEN
    RAISE EXCEPTION 'RELEASED_INMUTABLE: no se modifica el tracklist de un lanzamiento publicado.'
      USING ERRCODE = '23514';
  END IF;

  IF est IN ('READY','SCHEDULED') THEN
    UPDATE public.releases SET status = 'PLANNING', updated_at = NOW() WHERE id = rid;
  END IF;
  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS release_tracks_degradar_trg ON public.release_tracks;
DROP TRIGGER IF EXISTS release_tracks_veto_trg     ON public.release_tracks;

CREATE TRIGGER release_tracks_veto_trg
  BEFORE INSERT OR UPDATE OR DELETE ON public.release_tracks
  FOR EACH ROW EXECUTE FUNCTION public.release_tracks_veto();

CREATE TRIGGER release_tracks_degradar_trg
  AFTER INSERT OR UPDATE OR DELETE ON public.release_tracks
  FOR EACH ROW EXECUTE FUNCTION public.release_tracks_degradar();


-- ============================================================
-- 6. RLS
-- ============================================================
ALTER TABLE public.releases       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.release_tracks ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS rel_select ON public.releases;
CREATE POLICY rel_select ON public.releases FOR SELECT TO authenticated
  USING (owner_id = auth.uid() OR public.is_admin());

DROP POLICY IF EXISTS rel_insert ON public.releases;
CREATE POLICY rel_insert ON public.releases FOR INSERT TO authenticated
  WITH CHECK (owner_id = auth.uid());

DROP POLICY IF EXISTS rel_update ON public.releases;
CREATE POLICY rel_update ON public.releases FOR UPDATE TO authenticated
  USING (owner_id = auth.uid() OR public.is_admin())
  WITH CHECK (owner_id = auth.uid() OR public.is_admin());

DROP POLICY IF EXISTS rel_delete ON public.releases;
CREATE POLICY rel_delete ON public.releases FOR DELETE TO authenticated
  USING (owner_id = auth.uid() OR public.is_admin());

-- S-1: la versión anterior solo miraba el DUEÑO DEL LANZAMIENTO. Un fan creaba
-- su propio lanzamiento y metía dentro las canciones del artista: como
-- release_tracks.track_id es ON DELETE RESTRICT, el artista quedaba sin poder
-- borrar sus propios temas, para siempre, sin ver jamás quién los retenía
-- (rel_select solo le muestra los suyos). Denegación de servicio permanente por
-- un INSERT. Ahora hay que ser dueño de AMBAS cosas.
DROP POLICY IF EXISTS rt_all ON public.release_tracks;
CREATE POLICY rt_all ON public.release_tracks FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.releases r
                  WHERE r.id = release_tracks.release_id
                    AND (r.owner_id = auth.uid() OR public.is_admin())))
  WITH CHECK (EXISTS (SELECT 1 FROM public.releases r
                       WHERE r.id = release_tracks.release_id
                         AND (r.owner_id = auth.uid() OR public.is_admin()))
              AND public.es_dueno_del_track(track_id));


-- FORCE: igual que en fix-02, ENABLE deja fuera al dueño de la tabla.
ALTER TABLE public.releases       FORCE ROW LEVEL SECURITY;
ALTER TABLE public.release_tracks FORCE ROW LEVEL SECURITY;


-- ============================================================
-- 7. VERIFICACIÓN
-- ============================================================
SELECT
  'releases='       || (SELECT count(*) FROM pg_tables WHERE schemaname='public' AND tablename='releases')::TEXT ||
  ' | tracks_tbl='  || (SELECT count(*) FROM pg_tables WHERE schemaname='public' AND tablename='release_tracks')::TEXT ||
  ' | fn_lista='    || (SELECT count(*) FROM pg_proc WHERE proname='track_lista_para_lanzar')::TEXT ||
  ' | trg_guardas=' || (SELECT count(*) FROM pg_trigger WHERE tgname='releases_guardas_trg')::TEXT ||
  ' | trg_oro='     || (SELECT count(*) FROM pg_trigger WHERE tgname='release_tracks_degradar_trg')::TEXT ||
  ' | pol_rel='     || (SELECT count(*) FROM pg_policies WHERE schemaname='public' AND tablename='releases')::TEXT ||
  ' | pol_rt='      || (SELECT count(*) FROM pg_policies WHERE schemaname='public' AND tablename='release_tracks')::TEXT ||
  ' | trg_veto='    || (SELECT count(*) FROM pg_trigger WHERE tgname='release_tracks_veto_trg')::TEXT ||
  ' | trg_nodel='   || (SELECT count(*) FROM pg_trigger WHERE tgname='releases_no_borrar_trg')::TEXT ||
  ' | forced='      || (SELECT count(*) FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
                          WHERE n.nspname='public' AND c.relforcerowsecurity
                            AND c.relname IN ('releases','release_tracks'))::TEXT ||
  ' | oraculo_rpc=' || (SELECT count(*) FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
                          WHERE n.nspname='public' AND p.proname='track_lista_para_lanzar'
                            AND has_function_privilege('authenticated', p.oid, 'EXECUTE'))::TEXT
  AS resultado;

-- ESPERADO:
-- releases=1 | tracks_tbl=1 | fn_lista=1 | trg_guardas=1 | trg_oro=1 | pol_rel=4 | pol_rt=1
-- | trg_veto=1 | trg_nodel=1 | forced=2 | oraculo_rpc=0
