-- ═══════════════════════════════════════════════════════════════════
-- fix-07 · El slug tiene que ser unico
-- Zignalez · v1 · 17-09-2026
--
-- REQUIERE: public.tracks con columna slug. IDEMPOTENTE.
--
-- POR QUE EXISTE ESTE ARCHIVO:
-- El panel decide si una subida es "crear" o "actualizar" buscando el slug
-- en state.tracks, la lista que trae del servidor. El 17-09-2026 el listado
-- dejo de cargar (faltaba la columna peaks de fix-05) y esa lista quedo
-- VACIA. Con la lista vacia el panel no encuentra el slug repetido y hace
-- INSERT en vez de UPDATE: dos fichas con el mismo slug apuntando al mismo
-- archivo, y el fan viendo el tema dos veces.
--
-- La proteccion vivia solo en el navegador y dependia de que otra consulta
-- distinta hubiera funcionado. Eso no es una proteccion, es una casualidad.
-- Aqui abajo si lo es: el servidor rechaza el duplicado aunque el panel
-- este roto, aunque alguien llame a la API a mano, aunque yo me equivoque
-- en el JavaScript la proxima vez.
-- ═══════════════════════════════════════════════════════════════════

-- ============================================================
-- 0. PRECONDICIONES
-- ============================================================
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                  WHERE table_schema='public' AND table_name='tracks' AND column_name='slug') THEN
    RAISE EXCEPTION 'public.tracks no tiene columna slug. Base de datos inesperada.';
  END IF;
  RAISE NOTICE 'Precondiciones OK.';
END $$;


-- ============================================================
-- 1. ¿HAY DUPLICADOS YA?
-- ============================================================
-- Crear el indice sin mirar esto falla con un mensaje que no dice cual es
-- el problema. Preferimos parar nosotros y nombrar los slugs.
DO $$
DECLARE r RECORD; lista TEXT := '';
BEGIN
  FOR r IN
    SELECT slug, count(*) AS n
      FROM public.tracks
     WHERE slug IS NOT NULL
     GROUP BY slug HAVING count(*) > 1
     ORDER BY slug
  LOOP
    lista := lista || r.slug || ' (x' || r.n || ') ';
  END LOOP;

  IF lista <> '' THEN
    RAISE EXCEPTION 'SLUGS_DUPLICADOS: %. Arreglalos antes de crear el indice: decide cual ficha se queda y borra o renombra la otra.', lista;
  END IF;
  RAISE NOTICE 'Sin duplicados. Se puede crear el indice.';
END $$;


-- ============================================================
-- 2. EL INDICE
-- ============================================================
-- Parcial, sobre slug IS NOT NULL: varias fichas sin slug no se estorban
-- entre si. NULL nunca choca con NULL en un indice unico de PostgreSQL, asi
-- que el WHERE es documentacion mas que necesidad -- pero deja escrito que
-- el caso se penso.
CREATE UNIQUE INDEX IF NOT EXISTS uq_tracks_slug
  ON public.tracks (slug)
  WHERE slug IS NOT NULL;

COMMENT ON INDEX public.uq_tracks_slug IS
  'Dos maquetas no pueden compartir slug. El panel ya lo comprueba en el '
  'navegador, pero esa comprobacion depende de que el listado haya cargado. '
  'Esta no depende de nada.';


-- ============================================================
-- 3. VERIFICACION
-- ============================================================
SELECT
  'idx='        || (SELECT count(*) FROM pg_indexes
                     WHERE schemaname='public' AND indexname='uq_tracks_slug')::TEXT ||
  ' | tracks='  || (SELECT count(*) FROM public.tracks)::TEXT ||
  ' | con_slug='|| (SELECT count(*) FROM public.tracks WHERE slug IS NOT NULL)::TEXT ||
  ' | duplicados=' || (SELECT count(*) FROM (
                        SELECT slug FROM public.tracks
                         WHERE slug IS NOT NULL
                         GROUP BY slug HAVING count(*) > 1) d)::TEXT
  AS resultado;

-- ESPERADO:
-- idx=1 | tracks=6 | con_slug=6 | duplicados=0
