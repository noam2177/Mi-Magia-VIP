
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
