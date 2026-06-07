-- התראות אדמין + הרשמה עצמית מוזמנים

ALTER TABLE public.invitees
  ADD COLUMN IF NOT EXISTS is_self_registered boolean DEFAULT false;

CREATE TABLE IF NOT EXISTS public.admin_notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  type text NOT NULL CHECK (type IN (
    'rsvp_attending', 'rsvp_not_attending', 'rsvp_updated',
    'self_registration', 'guest_question'
  )),
  invitee_id uuid REFERENCES public.invitees(id) ON DELETE SET NULL,
  title text NOT NULL,
  body text NOT NULL,
  meta jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS admin_notifications_created_at_idx
  ON public.admin_notifications (created_at DESC);

ALTER TABLE public.admin_notifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_all_admin_notifications" ON public.admin_notifications;
CREATE POLICY "anon_all_admin_notifications" ON public.admin_notifications
  FOR ALL USING (true) WITH CHECK (true);

GRANT ALL ON public.admin_notifications TO anon, authenticated, service_role;

NOTIFY pgrst, 'reload schema';
