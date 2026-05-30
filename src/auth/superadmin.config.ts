/**
 * Hardcoded superadmin allowlist.
 *
 * Superadmin is gated purely on the authenticated user's email — the app has no
 * role system. Add emails here (lowercase) to grant access to the /superadmin
 * surface (see SuperadminGuard + SuperadminController). The frontend mirrors
 * this list in `lib/config/superadmin.ts` for UI gating only; this constant is
 * the real authority enforced on every superadmin request.
 */
export const SUPERADMIN_EMAILS: readonly string[] = ['viveknagesh0301@gmail.com'];

export function isSuperadminEmail(email?: string | null): boolean {
  if (!email) return false;
  return SUPERADMIN_EMAILS.includes(email.trim().toLowerCase());
}
