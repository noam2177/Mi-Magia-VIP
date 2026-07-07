
DROP POLICY IF EXISTS "event-images admin all" ON storage.objects;
DROP POLICY IF EXISTS "event-images public all" ON storage.objects;

CREATE POLICY "event-images public all" ON storage.objects
  FOR ALL TO anon, authenticated
  USING (bucket_id = 'event-images')
  WITH CHECK (bucket_id = 'event-images');
