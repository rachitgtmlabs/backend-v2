/**
 * Email providers that are NOT tied to a single company. Users on these
 * domains are placed into per-user "personal" organizations so they stay
 * isolated from unrelated users on the same provider.
 */
export const PERSONAL_EMAIL_DOMAINS: ReadonlySet<string> = new Set([
  'gmail.com',
  'googlemail.com',
  'outlook.com',
  'hotmail.com',
  'live.com',
  'msn.com',
  'yahoo.com',
  'ymail.com',
  'icloud.com',
  'me.com',
  'mac.com',
  'proton.me',
  'protonmail.com',
  'aol.com',
]);

export function isPersonalDomain(domain: string): boolean {
  return PERSONAL_EMAIL_DOMAINS.has(domain.toLowerCase());
}
