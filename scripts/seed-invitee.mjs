import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const envPath = resolve(__dirname, "../.env");

function loadEnv() {
  try {
    const raw = readFileSync(envPath, "utf8");
    for (const line of raw.split("\n")) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const eq = trimmed.indexOf("=");
      if (eq === -1) continue;
      const key = trimmed.slice(0, eq).trim();
      const val = trimmed.slice(eq + 1).trim().replace(/^["']|["']$/g, "");
      if (!process.env[key]) process.env[key] = val;
    }
  } catch {
    // .env optional
  }
}

loadEnv();

const url = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const key = process.env.VITE_SUPABASE_PUBLISHABLE_KEY || process.env.SUPABASE_PUBLISHABLE_KEY;

if (!url || !key) {
  console.error("Missing Supabase credentials in .env");
  process.exit(1);
}

const db = createClient(url, key);

const INVITEE = { full_name: "נעם מרוז", phone: "0523309070" };

const { data: existing } = await db
  .from("invitees")
  .select("id")
  .or(`phone.eq.${INVITEE.phone},full_name.eq.${INVITEE.full_name}`)
  .limit(1)
  .maybeSingle();

if (existing) {
  console.log("Invitee already exists:", existing.id);
} else {
  const { data, error } = await db.from("invitees").insert(INVITEE).select("id").single();
  if (error) {
    console.error("Insert failed:", error.message);
    process.exit(1);
  }
  console.log("Invitee added:", data.id);
}
