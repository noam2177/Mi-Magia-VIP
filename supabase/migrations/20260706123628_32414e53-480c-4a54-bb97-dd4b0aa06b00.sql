
-- Move has_role out of the exposed public schema to silence the linter
-- warnings (SECURITY DEFINER + callable by anon/authenticated over PostgREST).
-- It remains callable from RLS policies where we reference it fully-qualified.

CREATE SCHEMA IF NOT EXISTS private;
REVOKE ALL ON SCHEMA private FROM public, anon, authenticated;
GRANT USAGE ON SCHEMA private TO authenticated, service_role;

CREATE OR REPLACE FUNCTION private.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  );
$$;

REVOKE ALL ON FUNCTION private.has_role(uuid, public.app_role) FROM public, anon;
GRANT EXECUTE ON FUNCTION private.has_role(uuid, public.app_role) TO authenticated, service_role;

-- Repoint every policy that referenced public.has_role to private.has_role
DROP POLICY IF EXISTS "admin select invitees"              ON public.invitees;
DROP POLICY IF EXISTS "admin insert invitees"              ON public.invitees;
DROP POLICY IF EXISTS "admin update invitees"              ON public.invitees;
DROP POLICY IF EXISTS "admin delete invitees"              ON public.invitees;
DROP POLICY IF EXISTS "admin insert site_settings"         ON public.site_settings;
DROP POLICY IF EXISTS "admin update site_settings"         ON public.site_settings;
DROP POLICY IF EXISTS "admin delete site_settings"         ON public.site_settings;
DROP POLICY IF EXISTS "admin select admin_notifications"   ON public.admin_notifications;
DROP POLICY IF EXISTS "admin insert admin_notifications"   ON public.admin_notifications;
DROP POLICY IF EXISTS "admin update admin_notifications"   ON public.admin_notifications;
DROP POLICY IF EXISTS "admin delete admin_notifications"   ON public.admin_notifications;
DROP POLICY IF EXISTS "event_images_admin_read"            ON storage.objects;
DROP POLICY IF EXISTS "event_images_admin_insert"          ON storage.objects;
DROP POLICY IF EXISTS "event_images_admin_update"          ON storage.objects;
DROP POLICY IF EXISTS "event_images_admin_delete"          ON storage.objects;

CREATE POLICY "admin select invitees" ON public.invitees
  FOR SELECT TO authenticated
  USING (private.has_role(auth.uid(), 'admin'));
CREATE POLICY "admin insert invitees" ON public.invitees
  FOR INSERT TO authenticated
  WITH CHECK (private.has_role(auth.uid(), 'admin'));
CREATE POLICY "admin update invitees" ON public.invitees
  FOR UPDATE TO authenticated
  USING (private.has_role(auth.uid(), 'admin'))
  WITH CHECK (private.has_role(auth.uid(), 'admin'));
CREATE POLICY "admin delete invitees" ON public.invitees
  FOR DELETE TO authenticated
  USING (private.has_role(auth.uid(), 'admin'));

CREATE POLICY "admin insert site_settings" ON public.site_settings
  FOR INSERT TO authenticated
  WITH CHECK (private.has_role(auth.uid(), 'admin'));
CREATE POLICY "admin update site_settings" ON public.site_settings
  FOR UPDATE TO authenticated
  USING (private.has_role(auth.uid(), 'admin'))
  WITH CHECK (private.has_role(auth.uid(), 'admin'));
CREATE POLICY "admin delete site_settings" ON public.site_settings
  FOR DELETE TO authenticated
  USING (private.has_role(auth.uid(), 'admin'));

CREATE POLICY "admin select admin_notifications" ON public.admin_notifications
  FOR SELECT TO authenticated
  USING (private.has_role(auth.uid(), 'admin'));
CREATE POLICY "admin insert admin_notifications" ON public.admin_notifications
  FOR INSERT TO authenticated
  WITH CHECK (private.has_role(auth.uid(), 'admin'));
CREATE POLICY "admin update admin_notifications" ON public.admin_notifications
  FOR UPDATE TO authenticated
  USING (private.has_role(auth.uid(), 'admin'))
  WITH CHECK (private.has_role(auth.uid(), 'admin'));
CREATE POLICY "admin delete admin_notifications" ON public.admin_notifications
  FOR DELETE TO authenticated
  USING (private.has_role(auth.uid(), 'admin'));

CREATE POLICY "event_images_admin_read" ON storage.objects
  FOR SELECT TO authenticated
  USING (bucket_id = 'event-images' AND private.has_role(auth.uid(), 'admin'));
CREATE POLICY "event_images_admin_insert" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'event-images' AND private.has_role(auth.uid(), 'admin'));
CREATE POLICY "event_images_admin_update" ON storage.objects
  FOR UPDATE TO authenticated
  USING (bucket_id = 'event-images' AND private.has_role(auth.uid(), 'admin'))
  WITH CHECK (bucket_id = 'event-images' AND private.has_role(auth.uid(), 'admin'));
CREATE POLICY "event_images_admin_delete" ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'event-images' AND private.has_role(auth.uid(), 'admin'));

-- Remove the public-schema copy so it isn't exposed via PostgREST anymore
DROP FUNCTION IF EXISTS public.has_role(uuid, public.app_role);

NOTIFY pgrst, 'reload schema';
