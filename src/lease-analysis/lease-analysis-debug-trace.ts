import * as fs from 'node:fs/promises';
import * as path from 'node:path';

/** Root for NDJSON / Groq debugging artifacts (gitignored). */
export const LEASE_ANALYSIS_DEBUG_REL_PATH = path.join(
  'debug',
  'lease-analysis',
);

export function leaseAnalysisDebugRoot(): string {
  return path.join(process.cwd(), LEASE_ANALYSIS_DEBUG_REL_PATH);
}

export function isLeaseAnalysisFileTracingEnabled(): boolean {
  const v = process.env.LEASE_ANALYSIS_TRACE_FILES?.trim().toLowerCase();
  if (!v) return true;
  return v !== '0' && v !== 'false' && v !== 'off';
}

/**
 * Writes pretty-printed JSON under debug/lease-analysis/<traceId>/<filename>.
 * Returns absolute path, or null if tracing disabled.
 */
export async function writeLeaseAnalysisTraceFile(
  traceId: string,
  filename: string,
  body: unknown,
): Promise<string | null> {
  if (!isLeaseAnalysisFileTracingEnabled()) {
    return null;
  }
  const dir = path.join(leaseAnalysisDebugRoot(), traceId);
  await fs.mkdir(dir, { recursive: true });
  const fp = path.join(dir, filename);
  await fs.writeFile(fp, JSON.stringify(body, null, 2), 'utf8');
  return fp;
}
