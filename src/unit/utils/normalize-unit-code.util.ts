/**
 * Normalize a unit code/name so duplicate detection ignores cosmetic
 * differences ("Suite 1200" vs "ste 1200" vs "Unit 1200" vs " 1200 ").
 *
 * Used by:
 *   - Unit creation (canonical `unit_code` derived from user-typed `unit_name`)
 *   - The `/v1/units/match` fuzzy lookup endpoint
 *   - The one-shot migration script that auto-creates default units
 *
 * Why: a unique compound index `{ property_id, unit_code }` only protects us
 * if both sides go through this function. Keep this file as the single source
 * of truth — do not inline the regex elsewhere.
 */
const LEADING_LABEL_REGEX = /^(suite|ste|unit|unt|apt|apartment|#)\s*/i;

export function normalizeUnitCode(input: string | null | undefined): string {
  if (!input) return '';
  return input
    .normalize('NFKC')
    .replace(LEADING_LABEL_REGEX, '')
    .replace(/\s+/g, ' ')
    .trim()
    .toUpperCase();
}
