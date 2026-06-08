ALTER TABLE public.site_settings REPLICA IDENTITY FULL;
ALTER TABLE public.invitees REPLICA IDENTITY FULL;
DO $$ BEGIN
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.site_settings;
  EXCEPTION WHEN duplicate_object THEN NULL; END;
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.invitees;
  EXCEPTION WHEN duplicate_object THEN NULL; END;
END $$;