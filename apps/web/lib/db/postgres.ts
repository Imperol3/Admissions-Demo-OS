import "server-only";
import { Pool, type QueryResultRow } from "pg";

declare global {
  var admissionsDbPool: Pool | undefined;
}

function sslConfig() {
  const mode = process.env.DATABASE_SSL_MODE?.toLowerCase();

  if (mode === "disable") return false;
  if (mode === "verify-full") return { rejectUnauthorized: true };

  return { rejectUnauthorized: false };
}

export function getDb() {
  const connectionString = process.env.DATABASE_URL;

  if (!connectionString) {
    throw new Error("DATABASE_URL is not configured");
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
