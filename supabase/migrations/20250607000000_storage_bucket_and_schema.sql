-- טבלאות בסיס (אם לא קיימות) + bucket לאחסון תמונות + מדיניות גישה

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

INSERT INTO public.site_settings (id, main_text, landing_title)
SELECT 1, 'דני תומר אפטר חתונה !', 'דני תומר אפטר חתונה !'
WHERE NOT EXISTS (SELECT 1 FROM public.site_settings WHERE id = 1);

ALTER TABLE public.invitees ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.site_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_all_invitees" ON public.invitees;
CREATE POLICY "anon_all_invitees" ON public.invitees FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "anon_all_site_settings" ON public.site_settings;
CREATE POLICY "anon_all_site_settings" ON public.site_settings FOR ALL USING (true) WITH CHECK (true);

-- Storage bucket לתמונות האירוע
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'event-images',
  'event-images',
  true,
  10485760,
  ARRAY[
    'image/jpeg', 'image/png', 'image/webp', 'image/gif',
    'image/svg+xml', 'image/avif', 'image/heic', 'image/heif',
    'image/bmp', 'image/tiff'
  ]
)
ON CONFLICT (id) DO UPDATE SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

DROP POLICY IF EXISTS "event_images_public_read" ON storage.objects;
CREATE POLICY "event_images_public_read" ON storage.objects
  FOR SELECT USING (bucket_id = 'event-images');

DROP POLICY IF EXISTS "event_images_public_insert" ON storage.objects;
CREATE POLICY "event_images_public_insert" ON storage.objects
  FOR INSERT WITH CHECK (bucket_id = 'event-images');

DROP POLICY IF EXISTS "event_images_public_update" ON storage.objects;
CREATE POLICY "event_images_public_update" ON storage.objects
  FOR UPDATE USING (bucket_id = 'event-images');

DROP POLICY IF EXISTS "event_images_public_delete" ON storage.objects;
CREATE POLICY "event_images_public_delete" ON storage.objects
  FOR DELETE USING (bucket_id = 'event-images');
