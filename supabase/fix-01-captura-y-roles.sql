-- ============================================================
-- ZIGNALEZ · FIX 01 — captura de suscriptores rota + RLS por rol
-- Ejecutar en: Supabase Dashboard > SQL Editor (proyecto fdahfltjaqzdgmsgedcp)
--
-- DIAGNÓSTICO (verificado 2026-09-13 contra la base real):
--   AUTH_USERS = 1   pero   SUBSCRIBERS_ROWS = 0
--   Te autenticaste correctamente, pero el registro del fan NUNCA se guardó.
--
-- CAUSA RAÍZ (dos fallas encadenadas):
--   1. La policy de INSERT en `subscribers` es TO anon. El upsert que corre
--      después del login se ejecuta con el rol `authenticated`, que no matchea
--      esa policy → rechazado.
--   2. No existía policy de UPDATE. Un upsert con ON CONFLICT necesita UPDATE,
--      así que incluso desde anon fallaba en el segundo intento del mismo email.
--   Y el error era invisible: PostgREST resuelve con {data, error} en vez de
--   rechazar la promesa, y el código hacía .then(function(){}) vacío.
--
-- ESTE SCRIPT ES IDEMPOTENTE: se puede correr más de una vez sin romper nada.
-- ============================================================


-- ============================================================
-- 1. TABLA DE ROLES — reemplaza el email hardcodeado en las policies
-- ============================================================
-- Por qué: tener 'simon.faundezt@gmail.com' escrito dentro de 8 policies
-- significa que cambiar de correo = reescribir 8 policies. Y no escala a
-- un segundo admin (manager, sello). La documentación de Supabase recomienda
-- uid/tabla de roles, no comparación literal de email.

CREATE TABLE IF NOT EXISTS public.admins (
  user_id    UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email      TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.admins ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admin lee su fila admin" ON public.admins;
CREATE POLICY "Admin lee su fila admin" ON public.admins
  FOR SELECT TO authenticated
  USING (user_id = (SELECT auth.uid()));

-- Helper SECURITY DEFINER: evita recursión de RLS y permite que Postgres
-- cachee el plan (patrón recomendado en la guía de RLS de Supabase).
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT EXISTS (SELECT 1 FROM public.admins WHERE user_id = auth.uid())
$$;

-- Permitir que el frontend llame sb.rpc('is_admin')
GRANT EXECUTE ON FUNCTION public.is_admin() TO authenticated;

-- Sembrar al admin actual desde auth.users
INSERT INTO public.admins (user_id, email)
SELECT id, email FROM auth.users
WHERE email = 'simon.faundezt@gmail.com'
ON CONFLICT (user_id) DO NOTHING;


-- ============================================================
-- 2. ARREGLAR LAS POLICIES DE SUBSCRIBERS
-- ============================================================

DROP POLICY IF EXISTS "Anon puede registrarse"          ON public.subscribers;
DROP POLICY IF EXISTS "Fan lee su registro"             ON public.subscribers;
DROP POLICY IF EXISTS "Registro publico"                ON public.subscribers;
DROP POLICY IF EXISTS "Fan actualiza su registro"       ON public.subscribers;
DROP POLICY IF EXISTS "Admin lee todos los subscribers" ON public.subscribers;

-- Cualquiera puede registrarse: anon (form de captura) y authenticated (post-login)
CREATE POLICY "Registro publico" ON public.subscribers
  FOR INSERT TO anon, authenticated
  WITH CHECK (true);

-- El fan autenticado lee SOLO su propia fila
CREATE POLICY "Fan lee su registro" ON public.subscribers
  FOR SELECT TO authenticated
  USING (email = (SELECT auth.jwt() ->> 'email'));

-- El fan autenticado actualiza SOLO su propia fila → esto habilita el upsert
CREATE POLICY "Fan actualiza su registro" ON public.subscribers
  FOR UPDATE TO authenticated
  USING      (email = (SELECT auth.jwt() ->> 'email'))
  WITH CHECK (email = (SELECT auth.jwt() ->> 'email'));

-- El admin ve toda la lista (para exportar a CSV / mailing)
CREATE POLICY "Admin lee todos los subscribers" ON public.subscribers
  FOR SELECT TO authenticated
  USING (public.is_admin());


-- ============================================================
-- 3. AUTOMATIZAR LA CAPTURA CON UN TRIGGER
-- ============================================================
-- Por qué: que el registro del fan dependa de que el cliente JS haga el insert
-- correctamente es frágil — si el navegador falla, si RLS cambia, si el usuario
-- cierra la pestaña, pierdes el dato. Un trigger en auth.users lo hace atómico
-- y del lado del servidor. El cliente ya no necesita hacer upsert nunca.

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.subscribers (email, consent_ts, confirmed, confirmed_at, source)
  VALUES (
    NEW.email,
    (EXTRACT(EPOCH FROM NOW()) * 1000)::BIGINT,  -- consent_ts es BIGINT (ms), no timestamptz
    TRUE,
    NOW(),
    'magic_link'
  )
  ON CONFLICT (email) DO UPDATE
    SET confirmed = TRUE, confirmed_at = NOW();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_confirmed ON auth.users;
CREATE TRIGGER on_auth_user_confirmed
  AFTER INSERT OR UPDATE OF email_confirmed_at ON auth.users
  FOR EACH ROW
  WHEN (NEW.email_confirmed_at IS NOT NULL)
  EXECUTE FUNCTION public.handle_new_user();

-- Backfill: recuperar a los usuarios ya confirmados que nunca llegaron a subscribers
INSERT INTO public.subscribers (email, consent_ts, confirmed, confirmed_at, source)
SELECT
  email,
  (EXTRACT(EPOCH FROM created_at) * 1000)::BIGINT,
  TRUE,
  email_confirmed_at,
  'backfill'
FROM auth.users
WHERE email_confirmed_at IS NOT NULL
ON CONFLICT (email) DO UPDATE SET confirmed = TRUE;


-- ============================================================
-- 4. MIGRAR TRACKS Y STORAGE AL HELPER is_admin()
-- ============================================================

DROP POLICY IF EXISTS "Admin lee todos los tracks" ON public.tracks;
DROP POLICY IF EXISTS "Admin inserta tracks"       ON public.tracks;
DROP POLICY IF EXISTS "Admin actualiza tracks"     ON public.tracks;
DROP POLICY IF EXISTS "Admin elimina tracks"       ON public.tracks;
DROP POLICY IF EXISTS "Admin CRUD tracks"          ON public.tracks;

-- Se conserva intacta: "Miembros ven tracks visibles" (SELECT, visible = TRUE)

CREATE POLICY "Admin CRUD tracks" ON public.tracks
  FOR ALL TO authenticated
  USING      (public.is_admin())
  WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "Admin sube maquetas"     ON storage.objects;
DROP POLICY IF EXISTS "Admin actualiza maquetas" ON storage.objects;
DROP POLICY IF EXISTS "Admin elimina maquetas"   ON storage.objects;

-- Se conserva intacta: "Miembros leen maquetas" (SELECT en bucket maquetas)

CREATE POLICY "Admin sube maquetas" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'maquetas' AND public.is_admin());

CREATE POLICY "Admin actualiza maquetas" ON storage.objects
  FOR UPDATE TO authenticated
  USING (bucket_id = 'maquetas' AND public.is_admin());

CREATE POLICY "Admin elimina maquetas" ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'maquetas' AND public.is_admin());


-- ============================================================
-- 5. updated_at AUTOMÁTICO EN TRACKS
-- ============================================================
-- La columna existe pero nada la actualizaba: siempre quedaba en created_at.

CREATE OR REPLACE FUNCTION public.touch_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS tracks_touch ON public.tracks;
CREATE TRIGGER tracks_touch
  BEFORE UPDATE ON public.tracks
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();


-- ============================================================
-- 6. VERIFICACIÓN — debe devolver una fila con todo en verde
-- ============================================================

SELECT
  'admins='          || (SELECT count(*) FROM public.admins)::text          ||
  ' | subscribers='  || (SELECT count(*) FROM public.subscribers)::text     ||
  ' | auth_users='   || (SELECT count(*) FROM auth.users)::text             ||
  ' | is_admin_fn='  || (SELECT count(*) FROM pg_proc WHERE proname = 'is_admin')::text ||
  ' | pol_tracks='   || (SELECT count(*) FROM pg_policies WHERE tablename = 'tracks')::text ||
  ' | pol_storage='  || (SELECT count(*) FROM pg_policies WHERE schemaname = 'storage')::text
  AS verificacion;

-- ESPERADO tras ejecutar:
--   admins=1 | subscribers=1 | auth_users=1 | is_admin_fn=1 | pol_tracks=2 | pol_storage=4
--
-- Si subscribers sigue en 0 → el backfill no encontró usuarios confirmados;
-- revisa que auth.users.email_confirmed_at no sea NULL para tu usuario.
