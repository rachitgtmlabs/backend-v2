import { appendFileSync } from 'fs';

/**
 * Chat / RBAC debug instrumentation. Left in the codebase on purpose so the
 * org-propagation chain can be re-inspected if the "no data" issue ever recurs,
 * but gated behind the CHAT_DEBUG env var so it is completely silent (and
 * near-zero cost) unless explicitly switched on.
 *
 *   CHAT_DEBUG unset / empty   -> OFF. Nothing is written. Safe for demos/prod.
 *   CHAT_DEBUG=*               -> log EVERY tag
 *   CHAT_DEBUG=1 | true | on   -> same as *
 *   CHAT_DEBUG=rbac.*,chat.*   -> log only tags matching these globs ('*' = any run)
 *   CHAT_DEBUG=rbac.getOrgId   -> exact tag only
 *
 * Enable for a session:
 *   cd lease-backend-v2 && CHAT_DEBUG='*' npm run start:dev
 * (the env var is re-read on every call, so you can also export it and restart).
 *
 * Output: one JSON line per event to CHAT_DEBUG_FILE (default
 * /tmp/leaseiq-chat-debug.log) plus a [CHATDBG] line on stdout.
 */
export const CHAT_DEBUG_FILE =
  process.env.CHAT_DEBUG_FILE || '/tmp/leaseiq-chat-debug.log';

/** Turn a glob spec ("*", "rbac.*,chat.*", "1") into a list of matchers. */
function compileMatchers(specRaw: string): RegExp[] {
  const spec = specRaw.trim();
  if (!spec) return [];
  if (spec === '1' || spec === 'true' || spec === 'on') return [/.*/];
  return spec
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)
    .map((glob) => {
      const escaped = glob
        .replace(/[.+?^${}()|[\]\\]/g, '\\$&') // escape regex specials
        .replace(/\*/g, '.*'); // '*' -> wildcard
      return new RegExp('^' + escaped + '$');
    });
}

// Re-read the env each call but recompile only when the spec string changes,
// so toggling never requires touching this file.
let cachedSpec: string | null = null;
let cachedMatchers: RegExp[] = [];
function matchers(): RegExp[] {
  const spec = process.env.CHAT_DEBUG ?? '';
  if (spec !== cachedSpec) {
    cachedSpec = spec;
    cachedMatchers = compileMatchers(spec);
  }
  return cachedMatchers;
}

export function dbg(tag: string, data: unknown): void {
  const active = matchers();
  if (active.length === 0) return; // OFF — demo/prod safe
  if (!active.some((re) => re.test(tag))) return;
  try {
    const line =
      JSON.stringify({ t: new Date().toISOString(), tag, ...(data as object) }) +
      '\n';
    appendFileSync(CHAT_DEBUG_FILE, line);
    // eslint-disable-next-line no-console
    console.log('[CHATDBG]', tag, JSON.stringify(data));
  } catch {
    /* never let logging break the request */
  }
}
