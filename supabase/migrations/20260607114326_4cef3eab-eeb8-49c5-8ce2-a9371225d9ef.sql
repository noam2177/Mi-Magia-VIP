
CREATE TABLE IF NOT EXISTS public.invitees (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name text,
  phone text,
  status text CHECK (status IS NULL OR status IN ('attending', 'not_attending')),
  guests int DEFAULT 1,
  sleep text,
  blessing text,
  guest_question text,
  message_sent boolean DEFAULT false,
  responded_at timestamptz,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.site_settings (
  id int PRIMARY KEY DEFAULT 1,
  main_text text DEFAULT '',
  navigation_url text DEFAULT '',
  collage_images jsonb DEFAULT '[]'::jsonb,
  carousel_images jsonb DEFAULT '[]'::jsonb,
  waze_url text DEFAULT '',
  google_maps_url text DEFAULT '',
  landing_title text DEFAULT '',
  landing_body text DEFAULT '',
  faq_items jsonb DEFAULT '[]'::jsonb,
  broadcast_message text DEFAULT ''
);

ALTER TABLE public.site_settings
  ADD COLUMN IF NOT EXISTS waze_url text,
  ADD COLUMN IF NOT EXISTS google_maps_url text,
  ADD COLUMN IF NOT EXISTS landing_title text,
  ADD COLUMN IF NOT EXISTS landing_body text,
  ADD COLUMN IF NOT EXISTS faq_items jsonb DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS broadcast_message text;

ALTER TABLE public.invitees
  ADD COLUMN IF NOT EXISTS guest_question text;

INSERT INTO public.site_settings (id, main_text, landing_title, landing_body, waze_url, google_maps_url, faq_items, broadcast_message)
SELECT 1, 'דני תומר אפטר חתונה !', 'דני תומר אפטר חתונה !', '', '', '', '[]'::jsonb, ''
WHERE NOT EXISTS (SELECT 1 FROM public.site_settings WHERE id = 1);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.invitees TO anon, authenticated;
GRANT ALL ON public.invitees TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.site_settings TO anon, authenticated;
GRANT ALL ON public.site_settings TO service_role;

ALTER TABLE public.invitees ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.site_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_all_invitees" ON public.invitees;
CREATE POLICY "anon_all_invitees" ON public.invitees FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "anon_all_site_settings" ON public.site_settings;
CREATE POLICY "anon_all_site_settings" ON public.site_settings FOR ALL USING (true) WITH CHECK (true);

NOTIFY pgrst, 'reload schema';
