/**
 * One-time backfill for organization-level RBAC:
 *  1. Upsert an Organization for every existing user (by email domain).
 *  2. Stamp every existing portfolio with the org of its creator. Legacy
 *     `created_by: 'user_admin'` portfolios are reassigned to a dedicated
 *     `legacy.local` org so they no longer leak across users.
 *
 * Run from lease-backend-v2 (loads `.env` from this package root):
 *   npm run migrate:organizations
 *
 * Idempotent — re-running only touches docs whose organization_id changed
 * or is missing.
 */
import dotenv from 'dotenv';
import path from 'path';
import { randomBytes } from 'crypto';
import mongoose from 'mongoose';

dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const uri =
  process.env.MONGODB_URI?.trim() ||
  'mongodb://127.0.0.1:27017/lease_iq';

const PERSONAL_EMAIL_DOMAINS = new Set([
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

const LEGACY_OWNER_MARKER = 'user_admin';
const LEGACY_ORG_DOMAIN = 'legacy.local';

function newOrgId(): string {
  return `org_${randomBytes(8).toString('hex')}`;
}

function maskUri(u: string): string {
  try {
    const parsed = new URL(u);
    if (parsed.username) parsed.username = '***';
    if (parsed.password) parsed.password = '***';
    return parsed.toString();
  } catch {
    return u.replace(/:\/\/[^/]+@/, '://***@');
  }
}

function resolveOrgKey(email: string): {
  key: string;
  name: string;
  kind: 'domain' | 'personal';
} {
  const lc = email.trim().toLowerCase();
  const at = lc.indexOf('@');
  if (at <= 0 || at === lc.length - 1) {
    throw new Error(`Invalid email: ${email}`);
  }
  const domain = lc.slice(at + 1);
  const personal = PERSONAL_EMAIL_DOMAINS.has(domain);
  if (personal) {
    return { key: lc, name: `Personal: ${lc}`, kind: 'personal' };
  }
  return { key: domain, name: domain, kind: 'domain' };
}

async function upsertOrg(
  orgs: mongoose.mongo.Collection,
  domain: string,
  name: string,
  kind: 'domain' | 'personal',
): Promise<string> {
  const now = new Date();
  const res = await orgs.findOneAndUpdate(
    { domain },
    {
      $setOnInsert: {
        orgId: newOrgId(),
        domain,
        name,
        kind,
        createdAt: now,
        updatedAt: now,
      },
    },
    { upsert: true, returnDocument: 'after' },
  );
  // node-mongodb returns the document directly when returnDocument: 'after'
  const doc = (res as unknown as { value?: { orgId?: string } })?.value
    ?? (res as unknown as { orgId?: string });
  const orgId = (doc as { orgId?: string })?.orgId;
  if (!orgId) throw new Error(`Failed to upsert org for domain ${domain}`);
  return orgId;
}

async function main() {
  await mongoose.connect(uri);
  const db = mongoose.connection.db;
  if (!db) throw new Error('Mongoose connection has no db handle');

  const orgs = db.collection('organizations');
  const users = db.collection('users');
  const portfolios = db.collection('portfolios');

  let orgsCreatedBefore = await orgs.estimatedDocumentCount();

  // 1. Legacy/Demo org for `user_admin` portfolios.
  const legacyOrgId = await upsertOrg(
    orgs,
    LEGACY_ORG_DOMAIN,
    'Legacy/Demo',
    'personal',
  );

  // 2. Users — derive org per email.
  let usersUpdated = 0;
  let usersSkippedNoEmail = 0;
  const userOrgMap = new Map<string, string>(); // _id (string) -> orgId
  const cursor = users.find({});
  for await (const u of cursor) {
    const email = typeof u.email === 'string' ? u.email : '';
    if (!email) {
      usersSkippedNoEmail += 1;
      continue;
    }
    const resolved = resolveOrgKey(email);
    const orgId = await upsertOrg(
      orgs,
      resolved.key,
      resolved.name,
      resolved.kind,
    );
    userOrgMap.set(String(u._id), orgId);
    if (u.organization_id !== orgId) {
      await users.updateOne(
        { _id: u._id },
        { $set: { organization_id: orgId } },
      );
      usersUpdated += 1;
    }
  }

  // 3. Portfolios — copy org from creator, or assign to legacy org.
  let portfoliosUpdated = 0;
  let portfoliosLegacy = 0;
  let portfoliosOrphaned = 0;
  const pCursor = portfolios.find({});
  for await (const p of pCursor) {
    const createdBy = typeof p.created_by === 'string' ? p.created_by : '';
    let targetOrgId: string;
    if (createdBy === LEGACY_OWNER_MARKER || !createdBy) {
      targetOrgId = legacyOrgId;
      portfoliosLegacy += 1;
    } else {
      const mapped = userOrgMap.get(createdBy);
      if (mapped) {
        targetOrgId = mapped;
      } else {
        // created_by points at a user we couldn't resolve (deleted or no
        // email). Fall back to legacy and log.
        targetOrgId = legacyOrgId;
        portfoliosOrphaned += 1;
      }
    }
    if (p.organization_id !== targetOrgId) {
      await portfolios.updateOne(
        { _id: p._id },
        { $set: { organization_id: targetOrgId } },
      );
      portfoliosUpdated += 1;
    }
  }

  const orgsCreatedAfter = await orgs.estimatedDocumentCount();

  console.log(
    JSON.stringify(
      {
        uri: maskUri(uri),
        orgs_before: orgsCreatedBefore,
        orgs_after: orgsCreatedAfter,
        orgs_created: Math.max(0, orgsCreatedAfter - orgsCreatedBefore),
        users_updated: usersUpdated,
        users_skipped_no_email: usersSkippedNoEmail,
        portfolios_updated: portfoliosUpdated,
        portfolios_assigned_legacy: portfoliosLegacy,
        portfolios_orphaned_to_legacy: portfoliosOrphaned,
        legacy_org_id: legacyOrgId,
      },
      null,
      2,
    ),
  );

  await mongoose.disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
