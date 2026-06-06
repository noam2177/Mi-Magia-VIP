ALTER TABLE site_settings
  ADD COLUMN IF NOT EXISTS broadcast_message text;

UPDATE site_settings
SET broadcast_message = COALESCE(NULLIF(broadcast_message, ''), '')
WHERE id = 1;
