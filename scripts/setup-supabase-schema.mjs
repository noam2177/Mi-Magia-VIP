import { readFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";
import pg from "pg";

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
    // optional
  }
}

loadEnv();

const dbUrl =
  process.env.SUPABASE_DB_URL ||
  process.env.DATABASE_URL ||
  process.env.POSTGRES_URL;

if (!dbUrl) {
  console.error(
    "Missing database URL. Set SUPABASE_DB_URL or DATABASE_URL in .env\n" +
      "Or run supabase/setup-all.sql manually in Supabase SQL Editor.",
  );
  process.exit(1);
}

const sql = readFileSync(resolve(__dirname, "../supabase/setup-all.sql"), "utf8");
const client = new pg.Client({
  connectionString: dbUrl,
  ssl: dbUrl.includes("localhost") ? undefined : { rejectUnauthorized: false },
});

try {
  await client.connect();
  await client.query(sql);
  console.log("Schema setup completed successfully.");
} catch (err) {
  console.error("Schema setup failed:", err.message);
  process.exit(1);
} finally {
  await client.end().catch(() => undefined);
}
