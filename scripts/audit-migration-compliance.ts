/**
 * READ-ONLY audit. Inventories portfolios → properties → units → leases and
 * flags which portfolios are migration-compliant. Performs NO writes/deletes.
 *
 * Compliance per property:
 *   - has snake_case `portfolio_id` pointing at an existing portfolio
 *   - has at least one Unit
 *   - all its leases/amendments/units carry property_id AND unit_id
 *
 * Run from lease-backend-v2:
 *   npx tsx scripts/audit-migration-compliance.ts
 */
import dotenv from 'dotenv';
import path from 'path';
import mongoose from 'mongoose';

dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const uri = process.env.MONGODB_URI?.trim() || 'mongodb://127.0.0.1:27017/lease_iq';

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
  console.log(`Connected: ${maskUri(uri)}  (db: ${db.name})\n`);

  const portfolios = await db.collection('portfolios').find({}).toArray();
  const properties = await db.collection('properties').find({}).toArray();
  const units = await db.collection('units').find({}).toArray();
  const leases = await db.collection('leases').find({}).toArray();
  const amendments = await db.collection('amendments').find({}).toArray();

  const unitsByProp = new Map<string, any[]>();
  for (const u of units) {
    const pid = (u as any).property_id;
    if (!unitsByProp.has(pid)) unitsByProp.set(pid, []);
    unitsByProp.get(pid)!.push(u);
  }
  const leasesByProp = new Map<string, any[]>();
  for (const l of leases) {
    const pid = (l as any).property_id;
    if (!leasesByProp.has(pid)) leasesByProp.set(pid, []);
    leasesByProp.get(pid)!.push(l);
  }
  const portfolioIds = new Set(portfolios.map((p: any) => p.portfolioId));

  console.log(`=== TOTALS ===`);
  console.log(`portfolios=${portfolios.length} properties=${properties.length} units=${units.length} leases=${leases.length} amendments=${amendments.length}\n`);

  for (const pf of portfolios as any[]) {
    const props = properties.filter(
      (p: any) => p.portfolio_id === pf.portfolioId || p.portfolioId === pf.portfolioId,
    );
    console.log(`\n### PORTFOLIO "${pf.name ?? pf.portfolioId}"  (${pf.portfolioId})  org=${pf.organization_id ?? '—'}  properties=${props.length}`);
    for (const pr of props as any[]) {
      const reasons: string[] = [];
      if (!pr.portfolio_id) reasons.push('property missing snake_case portfolio_id');
      if (pr.portfolio_id && !portfolioIds.has(pr.portfolio_id)) reasons.push('portfolio_id points at missing portfolio');
      const pu = unitsByProp.get(pr.propertyId) ?? [];
      if (pu.length === 0) reasons.push('no units');
      const pl = leasesByProp.get(pr.propertyId) ?? [];
      const leasesNoUnit = pl.filter((l) => !l.unit_id).length;
      if (leasesNoUnit) reasons.push(`${leasesNoUnit}/${pl.length} leases without unit_id`);
      const unitsNoProp = pu.filter((u) => !u.property_id).length;
      if (unitsNoProp) reasons.push(`${unitsNoProp} units without property_id`);
      const ok = reasons.length === 0;
      console.log(`   ${ok ? '✅' : '❌'} "${pr.property_name ?? pr.propertyId}" (${pr.propertyId}) units=${pu.length} leases=${pl.length}${ok ? '' : '  ← ' + reasons.join('; ')}`);
    }
  }

  // Orphans: docs whose portfolio/property no longer exists
  const propIds = new Set(properties.map((p: any) => p.propertyId));
  const orphanLeases = leases.filter((l: any) => l.property_id && !propIds.has(l.property_id)).length;
  const orphanUnits = units.filter((u: any) => u.property_id && !propIds.has(u.property_id)).length;
  console.log(`\n=== ORPHANS (dangling refs) ===`);
  console.log(`leases pointing at missing property=${orphanLeases}  units pointing at missing property=${orphanUnits}`);

  await mongoose.disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
