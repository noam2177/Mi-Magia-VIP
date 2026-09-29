// Thin untyped wrapper to use until Supabase regenerates types.
import { supabase } from "@/integrations/supabase/client";
export const db: any = supabase;
