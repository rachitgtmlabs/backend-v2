/**
 * One-time cleanup: deletes the four hardcoded boilerplate task alerts that
 * `seedForNewLease` used to insert for every new lease. Match is by exact
 * title — these strings are not produced by any other code path, so any row
 * matching is definitionally from the seed.
 *
 * Run from lease-backend-v2 (loads `.env` from this package root):
 *   npx ts-node scripts/cleanup-seeded-task-alerts.ts
 */
import dotenv from 'dotenv';
import path from 'path';
import mongoose from 'mongoose';

dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const SEEDED_TITLES = [
  'Request prior-year CAM worksheets, invoices summary, and reconciliation from landlord.',
  'Schedule joint walk-through if lease ties CAM or repair obligations to inspection rights.',
  'Add calendar reminders for reconciliation receipt and tenant objection windows.',
  'Catalog excluded expense categories (capital, landlord-specific items) against actual billings.',
];

const uri =
  process.env.MONGODB_URI?.trim() || 'mongodb://127.0.0.1:27017/lease_iq';

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

async function main() {
  console.log(`Connecting to ${maskUri(uri)} …`);
  await mongoose.connect(uri);
  const coll = mongoose.connection.db!.collection('property_task_alerts');

  const matchFilter = { title: { $in: SEEDED_TITLES } };
  const matchCount = await coll.countDocuments(matchFilter);
  console.log(`Found ${matchCount} task alerts matching seeded titles.`);

  if (matchCount === 0) {
    await mongoose.disconnect();
    return;
  }

  const result = await coll.deleteMany(matchFilter);
  console.log(`Deleted ${result.deletedCount} task alerts.`);

  await mongoose.disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
