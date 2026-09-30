-- fix-13 · productor: picos para la onda (PROMPT_MAESTRO_PRODUCTOR_ZIGNALEZ §3.2) · 29-09-2026
--
-- mis_versiones_compartidas() (fix-08) devuelve todo lo que la vista del productor necesita
-- salvo tracks.peaks (fix-05), que el reproductor del sitio usa para dibujar la onda. Sin picos
-- pinta una barra neutra; nunca una onda inventada. Solo cambia la función: mismas condiciones
-- (share vigente, colaborador activo, LISTEN confirmado), mismas políticas, mismo MASTER = nunca.
--
-- Idempotente. Ejecutar en el SQL editor de Supabase después de fix-08.

DROP FUNCTION IF EXISTS public.mis_versiones_compartidas();

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
  duration_seconds INT,
  peaks            JSONB
)
LANGUAGE sql SECURITY DEFINER STABLE
SET search_path = public, pg_temp
AS $$
  SELECT v.id, t.title, v.stage, s.shared_at, s.expires_at,
         m.id, m.file_path, m.content_type, m.duration_seconds,
         t.peaks
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

-- Comprobación: como colaborador autenticado, `select peaks is not null from mis_versiones_compartidas()`
-- debe devolver true para los temas con onda calculada en el admin ("Calcular onda").
