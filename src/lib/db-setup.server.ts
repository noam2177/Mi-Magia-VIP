import { DB_SETUP_SQL } from "@/lib/db-setup-sql";

export function getDatabaseUrl(): string | null {
  return (
    process.env.SUPABASE_DB_URL ||
    process.env.DATABASE_URL ||
    process.env.POSTGRES_URL ||
    null
  );
}

export async function runDatabaseSetup(): Promise<{ ok: true } | { ok: false; reason: string }> {
  const dbUrl = getDatabaseUrl();
  if (!dbUrl) {
    return { ok: false, reason: "missing_db_url" };
  }

  const { default: pg } = await import("pg");
  const client = new pg.Client({
    connectionString: dbUrl,
    ssl: dbUrl.includes("localhost") ? undefined : { rejectUnauthorized: false },
  });

  try {
    await client.connect();
    await client.query(DB_SETUP_SQL);
    return { ok: true };
  } finally {
    await client.end().catch(() => undefined);
  }
}
