-- הרחבת סוגי התראות — מוזמן חדש שנוסף בפאנל/ייבוא

ALTER TABLE public.admin_notifications DROP CONSTRAINT IF EXISTS admin_notifications_type_check;

ALTER TABLE public.admin_notifications
  ADD CONSTRAINT admin_notifications_type_check CHECK (type IN (
    'rsvp_attending', 'rsvp_not_attending', 'rsvp_updated',
    'self_registration', 'guest_question', 'invite_added'
  ));

NOTIFY pgrst, 'reload schema';
