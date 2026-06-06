-- הרחבת site_settings ו-invitees לתמיכה בקישורים, תוכן דף הבית, שאלות נפוצות ושאלות מוזמנים
ALTER TABLE site_settings
  ADD COLUMN IF NOT EXISTS waze_url text,
  ADD COLUMN IF NOT EXISTS google_maps_url text,
  ADD COLUMN IF NOT EXISTS landing_title text,
  ADD COLUMN IF NOT EXISTS landing_body text,
  ADD COLUMN IF NOT EXISTS faq_items jsonb DEFAULT '[]'::jsonb;

ALTER TABLE invitees
  ADD COLUMN IF NOT EXISTS guest_question text;

UPDATE site_settings
SET
  landing_title = COALESCE(NULLIF(landing_title, ''), NULLIF(main_text, ''), 'דני תומר אפטר חתונה !'),
  landing_body = COALESCE(landing_body, ''),
  waze_url = COALESCE(waze_url, ''),
  google_maps_url = COALESCE(google_maps_url, ''),
  faq_items = COALESCE(faq_items, '[]'::jsonb)
WHERE id = 1;

INSERT INTO site_settings (id, main_text, navigation_url, collage_images, carousel_images, landing_title, landing_body, waze_url, google_maps_url, faq_items)
SELECT
  1,
  'דני תומר אפטר חתונה !',
  '',
  '[]'::jsonb,
  '[]'::jsonb,
  'דני תומר אפטר חתונה !',
  '',
  '',
  '',
  '[]'::jsonb
WHERE NOT EXISTS (SELECT 1 FROM site_settings WHERE id = 1);
