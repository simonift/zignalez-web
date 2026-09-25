-- ═══════════════════════════════════════════════════════════════════
-- fix-12 · La lista oye SOLO extractos · Zignalez · 25-09-2026
--
--   DECISIÓN (Simón, 25-09-2026): el extracto de 15-60 s por tema es PARA
--   LOS FANS. La maqueta completa (LISTEN) queda para admin, dueño y
--   colaboradores con share vigente (productor.html). Un fan ya no puede
--   firmar tracks.file_path aunque conozca la ruta.
--
--   Qué cambia:  can_read_maqueta v3 = v2 SIN el nivel "fan lee file_path
--                de track visible". Lo demás idéntico.
--   Qué NO cambia: previews_anon_read (fix-11) ya deja leer previews/ a
--                anon y authenticated; el reproductor de miembros pasa a
--                firmar preview_path (assets/app.js, mismo commit).
--   Efecto colateral aceptado: la "escucha única" (fix-11, apagada) deja de
--                tener objeto sobre file_path. pedir_escucha sigue existiendo
--                y app.js la llama; con la bandera apagada no bloquea nada.
--
-- REQUIERE: fix-11. IDEMPOTENTE. Vuelta atrás al final.
-- ═══════════════════════════════════════════════════════════════════

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_proc WHERE proname='escucha_unica_activa' AND pronamespace='public'::regnamespace) THEN
    RAISE EXCEPTION 'FALTA fix-11.';
  END IF;
  RAISE NOTICE 'Precondiciones OK.';
END $$;

CREATE OR REPLACE FUNCTION public.can_read_maqueta(p_name TEXT)
RETURNS BOOLEAN
LANGUAGE sql SECURITY DEFINER STABLE
SET search_path = public, pg_temp
AS $$
  SELECT
    public.is_admin()
    OR EXISTS (SELECT 1 FROM public.version_media m
                WHERE m.file_path = p_name AND m.owner_id = auth.uid())
    OR EXISTS (SELECT 1 FROM public.version_media m
                WHERE m.file_path = p_name
                  AND m.role = 'LISTEN'
                  AND public.share_vigente(m.version_id));
$$;
REVOKE ALL ON FUNCTION public.can_read_maqueta(TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.can_read_maqueta(TEXT) TO authenticated;
COMMENT ON FUNCTION public.can_read_maqueta(TEXT) IS
  'v3 (fix-12): admin, dueño o colaborador con share vigente sobre LISTEN. El fan NO: oye previews/ (fix-11).';

-- Comprobación: un fan sin shares no debe poder firmar ningún file_path de tracks.
-- Ejecutar como ese usuario:  SELECT public.can_read_maqueta(file_path) FROM public.tracks;  -> todo FALSE.

-- ============================================================
-- VUELTA ATRÁS (no ejecutar salvo decisión explícita): re-aplicar el bloque
-- "can_read_maqueta v2" de fix-11-preview-y-escucha-unica.sql.
-- ============================================================
