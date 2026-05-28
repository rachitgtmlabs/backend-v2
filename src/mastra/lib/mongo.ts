import mongoose from 'mongoose';

const connectionString =
  process.env.MONGODB_URI ?? 'mongodb://127.0.0.1:27017/lease_iq';

let cachedConnection: typeof mongoose | null = null;

export async function getConnection() {
  if (cachedConnection?.connection?.readyState === 1) {
    return cachedConnection;
  }
  cachedConnection = await mongoose.connect(connectionString);
  return cachedConnection;
}

export async function getDb() {
  const conn = await getConnection();
  const db = conn.connection.db;
  if (!db) throw new Error('Database connection not available');
  return db;
}

export function deepMerge<T extends Record<string, unknown>>(
  target: T,
  source: Partial<T>,
): T {
  const result = { ...target };
  for (const key of Object.keys(source) as Array<keyof T>) {
    const sourceValue = source[key];
    const targetValue = target[key];
    if (sourceValue === undefined || sourceValue === null) continue;
    if (isPlainObject(sourceValue) && isPlainObject(targetValue)) {
      result[key] = deepMerge(
        targetValue as Record<string, unknown>,
        sourceValue as Record<string, unknown>,
      ) as T[keyof T];
    } else {
      result[key] = sourceValue as T[keyof T];
    }
  }
  return result;
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return (
    value !== null &&
    typeof value === 'object' &&
    !Array.isArray(value) &&
    Object.getPrototypeOf(value) === Object.prototype
  );
}

export const SEVERITY_ORDER = ['critical', 'high', 'medium', 'low'] as const;

export function severityRank(severity: string): number {
  const i = SEVERITY_ORDER.indexOf(
    severity as (typeof SEVERITY_ORDER)[number],
  );
  return i === -1 ? SEVERITY_ORDER.length : i;
}
