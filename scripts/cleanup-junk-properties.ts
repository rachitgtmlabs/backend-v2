/**
 * Delete pre-migration junk: properties with NO valid portfolio_id (null/
 * missing/empty), plus everything attached to them (leases, amendments,
 * units, task-alerts, property-alerts). Also sweeps leases that have no
 * property_id at all (unreachable orphans).
 *
 * SAFETY:
 *   - Dry-run by default. Set DELETE=1 to actually delete.
 *   - Before any delete, dumps every doc to be removed into
 *     scripts/backups/junk-cleanup-<db>.json so it can be restored.
 *
 *   Dry run:  npx tsx scripts/cleanup-junk-properties.ts
 *   Live:     DELETE=1 npx tsx scripts/cleanup-junk-properties.ts
 */
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import mongoose from 'mongoose';

dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const uri = process.env.MONGODB_URI?.trim() || 'mongodb://127.0.0.1:27017/lease_iq';
const LIVE = process.env.DELETE === '1';

function maskUri(u: string): string {
  try {
    const p = new URL(u);
    if (p.username) p.username = '***';
    if (p.password) p.password = '***';
    return p.toString();
  } catch {
    return u.replace(/:\/\/[^/]+@/, '://***@');
  }
}

async function main() {
  await mongoose.connect(uri);
  const db = mongoose.connection;
  console.log(`Connected: ${maskUri(uri)}  (db: ${db.name})`);
  console.log(`Mode: ${LIVE ? '🔴 LIVE DELETE' : '🟢 DRY RUN (no writes)'}\n`);

  const portfolios = await db.collection('portfolios').find({}).toArray();
  const pfIds = new Set(portfolios.map((p: any) => p.portfolioId));

  const allProps = await db.collection('properties').find({}).toArray();
  const junkProps = (allProps as any[]).filter((p) => {
    const pid = p.portfolio_id ?? p.portfolioId;
    return !pid || !pfIds.has(pid);
  });
  const junkPropIds = new Set(junkProps.map((p) => p.propertyId));

  const leases = await db.collection('leases').find({}).toArray();
  const junkLeases = (leases as any[]).filter(
    (l) => (l.property_id && junkPropIds.has(l.property_id)) || !l.property_id,
  );
  const junkLeaseIds = new Set(junkLeases.map((l) => l.leaseId));

  const amendments = await db.collection('amendments').find({}).toArray();
  const junkAmendments = (amendments as any[]).filter(
    (a) => (a.property_id && junkPropIds.has(a.property_id)) || junkLeaseIds.has(a.lease_id),
  );

  const units = await db.collection('units').find({}).toArray();
  const junkUnits = (units as any[]).filter((u) => u.property_id && junkPropIds.has(u.property_id));

  const taskAlerts = await db.collection('property_task_alerts').find({}).toArray();
  const junkTaskAlerts = (taskAlerts as any[]).filter((t) => t.property_id && junkPropIds.has(t.property_id));

  const propAlerts = await db.collection('property_alerts').find({}).toArray();
  const junkPropAlerts = (propAlerts as any[]).filter((t) => t.property_id && junkPropIds.has(t.property_id));

  console.log('=== TO BE DELETED ===');
  console.log(`properties=${junkProps.length} leases=${junkLeases.length} amendments=${junkAmendments.length} units=${junkUnits.length} task_alerts=${junkTaskAlerts.length} property_alerts=${junkPropAlerts.length}`);
  const leasesNullPid = junkLeases.filter((l) => !l.property_id).length;
  console.log(`(of those leases, ${leasesNullPid} had null property_id; ${junkLeases.length - leasesNullPid} were attached to junk properties)`);
  console.log(`KEEPING properties=${allProps.length - junkProps.length} leases=${leases.length - junkLeases.length}\n`);

  if (!LIVE) {
    console.log('Dry run only. Re-run with DELETE=1 to execute.');
    await mongoose.disconnect();
    return;
  }

  // Backup before deleting
  const backupDir = path.resolve(process.cwd(), 'scripts/backups');
  fs.mkdirSync(backupDir, { recursive: true });
  const backupPath = path.join(backupDir, `junk-cleanup-${db.name}.json`);
  fs.writeFileSync(
    backupPath,
    JSON.stringify(
      { properties: junkProps, leases: junkLeases, amendments: junkAmendments, units: junkUnits, task_alerts: junkTaskAlerts, property_alerts: junkPropAlerts },
      null,
      2,
    ),
  );
  console.log(`Backup written: ${backupPath}\n`);

  const r1 = await db.collection('leases').deleteMany({ leaseId: { $in: [...junkLeaseIds] } });
  const r2 = await db.collection('amendments').deleteMany({ amendmentId: { $in: junkAmendments.map((a) => a.amendmentId) } });
  const r3 = await db.collection('units').deleteMany({ unitId: { $in: junkUnits.map((u) => u.unitId) } });
  const r4 = await db.collection('property_task_alerts').deleteMany({ property_id: { $in: [...junkPropIds] } });
  const r5 = await db.collection('property_alerts').deleteMany({ property_id: { $in: [...junkPropIds] } });
  const r6 = await db.collection('properties').deleteMany({ propertyId: { $in: [...junkPropIds] } });

  console.log('=== DELETED ===');
  console.log(`leases=${r1.deletedCount} amendments=${r2.deletedCount} units=${r3.deletedCount} task_alerts=${r4.deletedCount} property_alerts=${r5.deletedCount} properties=${r6.deletedCount}`);

  await mongoose.disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
