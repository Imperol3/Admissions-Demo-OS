import "server-only";
import { Pool, type QueryResultRow } from "pg";

declare global {
  var admissionsDbPool: Pool | undefined;
}

function getConnectionString() {
  return (
    process.env.DATABASE_URL ??
    process.env.POSTGRES_URL ??
    process.env.POSTGRES_PRISMA_URL ??
    process.env.SUPABASE_DB_URL ??
    process.env.DB_URL ??
    ""
  ).trim();
}

function sslConfig() {
  const mode = process.env.DATABASE_SSL_MODE?.toLowerCase();

  if (mode === "disable") return false;
  if (mode === "verify-full") return { rejectUnauthorized: true };

  return { rejectUnauthorized: false };
}

export function getDb() {
  const connectionString = getConnectionString();

  if (!connectionString) {
    const detected = [
      "DATABASE_URL",
      "POSTGRES_URL",
      "POSTGRES_PRISMA_URL",
      "SUPABASE_DB_URL",
      "DB_URL",
    ].filter((key) => Boolean(process.env[key]));

    throw new Error(
      detected.length > 0
        ? `PostgreSQL connection variable is present but empty/unreadable. Detected: ${detected.join(", ")}`
        : "No PostgreSQL connection variable is visible to Next.js. Expected DATABASE_URL, POSTGRES_URL, POSTGRES_PRISMA_URL, SUPABASE_DB_URL, or DB_URL.",
    );
  }

  if (!global.admissionsDbPool) {
    global.admissionsDbPool = new Pool({
      connectionString,
      max: Number(process.env.DATABASE_POOL_MAX ?? 5),
      idleTimeoutMillis: 30_000,
      connectionTimeoutMillis: 10_000,
      ssl: sslConfig(),
    });
  }

  return global.admissionsDbPool;
}

export async function query<T extends QueryResultRow>(
  text: string,
  values: unknown[] = [],
): Promise<T[]> {
  const result = await getDb().query<T>(text, values);
  return result.rows;
}
