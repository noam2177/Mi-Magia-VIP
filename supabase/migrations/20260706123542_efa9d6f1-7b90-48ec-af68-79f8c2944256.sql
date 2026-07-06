
-- ============================================================================
-- Security hardening: roles + RLS + storage
-- ============================================================================

-- 1) Roles infrastructure
DO $$ BEGIN
  CREATE TYPE public.app_role AS ENUM ('admin');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);

GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "read own roles" ON public.user_roles;
CREATE POLICY "read own roles" ON public.user_roles
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
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

REVOKE ALL ON FUNCTION public.has_role(uuid, public.app_role) FROM public;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO anon, authenticated, service_role;

-- ============================================================================
-- 2) Ensure admin_notifications table exists (originally created by bootstrap)
-- ============================================================================
ALTER TABLE public.invitees
  ADD COLUMN IF NOT EXISTS is_self_registered boolean DEFAULT false;

CREATE TABLE IF NOT EXISTS public.admin_notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  type text NOT NULL CHECK (type IN (
    'rsvp_attending','rsvp_not_attending','rsvp_updated',
    'self_registration','guest_question','invite_added'
  )),
  invitee_id uuid REFERENCES public.invitees(id) ON DELETE SET NULL,
  title text NOT NULL,
  body text NOT NULL,
  meta jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now()
);
CREATE INDEX IF NOT EXISTS admin_notifications_created_at_idx
  ON public.admin_notifications (created_at DESC);

-- ============================================================================
-- 3) Drop wide-open policies (both known and existing)
-- ============================================================================
DROP POLICY IF EXISTS "anon_all_invitees" ON public.invitees;
DROP POLICY IF EXISTS "anon_all_site_settings" ON public.site_settings;
DROP POLICY IF EXISTS "anon_all_admin_notifications" ON public.admin_notifications;

-- ============================================================================
-- 4) Revoke overly-broad grants
-- ============================================================================
REVOKE ALL ON public.invitees FROM anon, authenticated;
REVOKE ALL ON public.site_settings FROM anon, authenticated;
REVOKE ALL ON public.admin_notifications FROM anon, authenticated;

-- ============================================================================
-- 5) Grants
--    RSVP writes go through server functions that use the service_role client,
--    so anon needs NO write grants. Public read on site_settings is required
--    for the landing page.
-- ============================================================================
GRANT SELECT, INSERT, UPDATE, DELETE ON public.invitees TO authenticated;
GRANT ALL ON public.invitees TO service_role;

GRANT SELECT ON public.site_settings TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.site_settings TO authenticated;
GRANT ALL ON public.site_settings TO service_role;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.admin_notifications TO authenticated;
GRANT ALL ON public.admin_notifications TO service_role;

-- ============================================================================
-- 6) Enable RLS (defensive)
-- ============================================================================
ALTER TABLE public.invitees ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.site_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_notifications ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- 7) invitees — admin only (all operations)
-- ============================================================================
DROP POLICY IF EXISTS "admin select invitees" ON public.invitees;
DROP POLICY IF EXISTS "admin insert invitees" ON public.invitees;
DROP POLICY IF EXISTS "admin update invitees" ON public.invitees;
DROP POLICY IF EXISTS "admin delete invitees" ON public.invitees;

CREATE POLICY "admin select invitees" ON public.invitees
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "admin insert invitees" ON public.invitees
  FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "admin update invitees" ON public.invitees
  FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "admin delete invitees" ON public.invitees
  FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- ============================================================================
-- 8) site_settings — public read; admin writes
-- ============================================================================
DROP POLICY IF EXISTS "public read site_settings" ON public.site_settings;
DROP POLICY IF EXISTS "admin insert site_settings" ON public.site_settings;
DROP POLICY IF EXISTS "admin update site_settings" ON public.site_settings;
DROP POLICY IF EXISTS "admin delete site_settings" ON public.site_settings;

CREATE POLICY "public read site_settings" ON public.site_settings
  FOR SELECT TO anon, authenticated
  USING (true);

CREATE POLICY "admin insert site_settings" ON public.site_settings
  FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "admin update site_settings" ON public.site_settings
  FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "admin delete site_settings" ON public.site_settings
  FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- ============================================================================
-- 9) admin_notifications — admin only
-- ============================================================================
DROP POLICY IF EXISTS "admin select admin_notifications" ON public.admin_notifications;
DROP POLICY IF EXISTS "admin insert admin_notifications" ON public.admin_notifications;
DROP POLICY IF EXISTS "admin update admin_notifications" ON public.admin_notifications;
DROP POLICY IF EXISTS "admin delete admin_notifications" ON public.admin_notifications;

CREATE POLICY "admin select admin_notifications" ON public.admin_notifications
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "admin insert admin_notifications" ON public.admin_notifications
  FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "admin update admin_notifications" ON public.admin_notifications
  FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "admin delete admin_notifications" ON public.admin_notifications
  FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- ============================================================================
-- 10) Storage: event-images bucket — restrict writes to admins
--     Reads on this bucket go through signed URLs (bucket is private) so no
--     public SELECT is required.
-- ============================================================================
DROP POLICY IF EXISTS "event_images_public_read"   ON storage.objects;
DROP POLICY IF EXISTS "event_images_public_insert" ON storage.objects;
DROP POLICY IF EXISTS "event_images_public_update" ON storage.objects;
DROP POLICY IF EXISTS "event_images_public_delete" ON storage.objects;

DROP POLICY IF EXISTS "event_images_admin_read"   ON storage.objects;
DROP POLICY IF EXISTS "event_images_admin_insert" ON storage.objects;
DROP POLICY IF EXISTS "event_images_admin_update" ON storage.objects;
DROP POLICY IF EXISTS "event_images_admin_delete" ON storage.objects;

CREATE POLICY "event_images_admin_read" ON storage.objects
  FOR SELECT TO authenticated
  USING (bucket_id = 'event-images' AND public.has_role(auth.uid(), 'admin'));

CREATE POLICY "event_images_admin_insert" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'event-images' AND public.has_role(auth.uid(), 'admin'));

CREATE POLICY "event_images_admin_update" ON storage.objects
  FOR UPDATE TO authenticated
  USING (bucket_id = 'event-images' AND public.has_role(auth.uid(), 'admin'))
  WITH CHECK (bucket_id = 'event-images' AND public.has_role(auth.uid(), 'admin'));

CREATE POLICY "event_images_admin_delete" ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'event-images' AND public.has_role(auth.uid(), 'admin'));

NOTIFY pgrst, 'reload schema';
