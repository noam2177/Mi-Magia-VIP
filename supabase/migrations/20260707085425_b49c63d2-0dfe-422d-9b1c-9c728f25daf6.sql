
DROP POLICY IF EXISTS "admin select invitees" ON public.invitees;
DROP POLICY IF EXISTS "admin insert invitees" ON public.invitees;
DROP POLICY IF EXISTS "admin update invitees" ON public.invitees;
DROP POLICY IF EXISTS "admin delete invitees" ON public.invitees;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.invitees TO anon, authenticated;
GRANT ALL ON public.invitees TO service_role;

CREATE POLICY "public all invitees" ON public.invitees
  FOR ALL TO anon, authenticated
  USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "admin select admin_notifications" ON public.admin_notifications;
DROP POLICY IF EXISTS "admin insert admin_notifications" ON public.admin_notifications;
DROP POLICY IF EXISTS "admin update admin_notifications" ON public.admin_notifications;
DROP POLICY IF EXISTS "admin delete admin_notifications" ON public.admin_notifications;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.admin_notifications TO anon, authenticated;
GRANT ALL ON public.admin_notifications TO service_role;

CREATE POLICY "public all admin_notifications" ON public.admin_notifications
  FOR ALL TO anon, authenticated
  USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "admin insert site_settings" ON public.site_settings;
DROP POLICY IF EXISTS "admin update site_settings" ON public.site_settings;
DROP POLICY IF EXISTS "admin delete site_settings" ON public.site_settings;
DROP POLICY IF EXISTS "public read site_settings" ON public.site_settings;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.site_settings TO anon, authenticated;
GRANT ALL ON public.site_settings TO service_role;

CREATE POLICY "public all site_settings" ON public.site_settings
  FOR ALL TO anon, authenticated
  USING (true) WITH CHECK (true);
