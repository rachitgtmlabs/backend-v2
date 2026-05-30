"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const dotenv_1 = __importDefault(require("dotenv"));
const path_1 = __importDefault(require("path"));
const crypto_1 = require("crypto");
const mongoose_1 = __importDefault(require("mongoose"));
dotenv_1.default.config({ path: path_1.default.resolve(process.cwd(), '.env') });
const uri = process.env.MONGODB_URI?.trim() ||
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
function newOrgId() {
    return `org_${(0, crypto_1.randomBytes)(8).toString('hex')}`;
}
function maskUri(u) {
    try {
        const parsed = new URL(u);
        if (parsed.username)
            parsed.username = '***';
        if (parsed.password)
            parsed.password = '***';
        return parsed.toString();
    }
    catch {
        return u.replace(/:\/\/[^/]+@/, '://***@');
    }
}
function resolveOrgKey(email) {
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
async function upsertOrg(orgs, domain, name, kind) {
    const now = new Date();
    const res = await orgs.findOneAndUpdate({ domain }, {
        $setOnInsert: {
            orgId: newOrgId(),
            domain,
            name,
            kind,
            createdAt: now,
            updatedAt: now,
        },
    }, { upsert: true, returnDocument: 'after' });
    const doc = res?.value
        ?? res;
    const orgId = doc?.orgId;
    if (!orgId)
        throw new Error(`Failed to upsert org for domain ${domain}`);
    return orgId;
}
async function main() {
    await mongoose_1.default.connect(uri);
    const db = mongoose_1.default.connection.db;
    if (!db)
        throw new Error('Mongoose connection has no db handle');
    const orgs = db.collection('organizations');
    const users = db.collection('users');
    const portfolios = db.collection('portfolios');
    let orgsCreatedBefore = await orgs.estimatedDocumentCount();
    const legacyOrgId = await upsertOrg(orgs, LEGACY_ORG_DOMAIN, 'Legacy/Demo', 'personal');
    let usersUpdated = 0;
    let usersSkippedNoEmail = 0;
    const userOrgMap = new Map();
    const cursor = users.find({});
    for await (const u of cursor) {
        const email = typeof u.email === 'string' ? u.email : '';
        if (!email) {
            usersSkippedNoEmail += 1;
            continue;
        }
        const resolved = resolveOrgKey(email);
        const orgId = await upsertOrg(orgs, resolved.key, resolved.name, resolved.kind);
        userOrgMap.set(String(u._id), orgId);
        if (u.organization_id !== orgId) {
            await users.updateOne({ _id: u._id }, { $set: { organization_id: orgId } });
            usersUpdated += 1;
        }
    }
    let portfoliosUpdated = 0;
    let portfoliosLegacy = 0;
    let portfoliosOrphaned = 0;
    const pCursor = portfolios.find({});
    for await (const p of pCursor) {
        const createdBy = typeof p.created_by === 'string' ? p.created_by : '';
        let targetOrgId;
        if (createdBy === LEGACY_OWNER_MARKER || !createdBy) {
            targetOrgId = legacyOrgId;
            portfoliosLegacy += 1;
        }
        else {
            const mapped = userOrgMap.get(createdBy);
            if (mapped) {
                targetOrgId = mapped;
            }
            else {
                targetOrgId = legacyOrgId;
                portfoliosOrphaned += 1;
            }
        }
        if (p.organization_id !== targetOrgId) {
            await portfolios.updateOne({ _id: p._id }, { $set: { organization_id: targetOrgId } });
            portfoliosUpdated += 1;
        }
    }
    const orgsCreatedAfter = await orgs.estimatedDocumentCount();
    console.log(JSON.stringify({
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
    }, null, 2));
    await mongoose_1.default.disconnect();
}
main().catch((e) => {
    console.error(e);
    process.exit(1);
});
//# sourceMappingURL=backfill-organizations.js.map