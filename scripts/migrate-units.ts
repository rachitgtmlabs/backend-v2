/**
 * One-shot, idempotent migration introducing the Unit layer between
 * Property and Lease.
 *
 *  1. For each Property with no existing Unit: create a default Unit. The
 *     unit_name is derived from the most recent lease's
 *     `lease_information.spaceAndPremises.unit.value` when present; otherwise
 *     it falls back to "Main". sqft / parking / building / premises are
 *     pulled from the same spaceAndPremises block when available.
 *  2. For each Property: set `unit_id` on every Lease, Amendment, TaskAlert,
 *     and PropertyAlert under that property that does not yet have one,
 *     pointing at the property's (now guaranteed) sole unit.
 *  3. Verify there are no remaining orphans and print a JSON summary.
 *
 * Safe to re-run — step 1 skips properties that already have a unit, and
 * step 2 only updates documents whose unit_id is null/missing.
 *
 * Run from lease-backend-v2 (loads `.env` from this package root):
 *   npm run migrate:units
 */
import dotenv from 'dotenv';
import path from 'path';
import { randomBytes } from 'crypto';
import mongoose from 'mongoose';
import { normalizeUnitCode } from '../src/unit/utils/normalize-unit-code.util';

dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const uri =
  process.env.MONGODB_URI?.trim() ||
  'mongodb://127.0.0.1:27017/lease_iq';

function newUnitId(): string {
  return `unt_${randomBytes(6).toString('hex')}`;
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

/**
 * Pull a value off `spaceAndPremises.<field>` regardless of whether it lives
 * directly on the field or under a `.value` sub-key (the extractor varies by
 * version).
 */
function readSpaceField(sp: unknown, key: string): unknown {
  if (!sp || typeof sp !== 'object') return undefined;
  const node = (sp as Record<string, unknown>)[key];
  if (node && typeof node === 'object' && 'value' in node) {
    return (node as { value?: unknown }).value;
  }
  return node;
}

function toNumber(v: unknown): number | null {
  if (typeof v === 'number' && Number.isFinite(v)) return v;
  if (typeof v === 'string') {
    const cleaned = v.replace(/[^0-9.\-]/g, '');
    if (!cleaned) return null;
    const n = Number(cleaned);
    return Number.isFinite(n) ? n : null;
  }
  return null;
}

function toTrimmedString(v: unknown): string | null {
  if (typeof v !== 'string') return null;
  const t = v.trim();
  return t.length > 0 ? t : null;
}

async function main() {
  await mongoose.connect(uri);
  const db = mongoose.connection.db;
  if (!db) throw new Error('Mongoose connection has no db handle');

  const properties = db.collection('properties');
  const units = db.collection('units');
  const leases = db.collection('leases');
  const amendments = db.collection('amendments');
  const taskAlerts = db.collection('property_task_alerts');
  const propertyAlerts = db.collection('property_alerts');

  let propertiesSeen = 0;
  let unitsCreated = 0;
  let unitsSkippedExisting = 0;
  let leasesBackfilled = 0;
  let amendmentsBackfilled = 0;
  let taskAlertsBackfilled = 0;
  let propertyAlertsBackfilled = 0;
  const propertiesMissingUnit: string[] = [];

  // Step 1 — ensure every property has at least one unit.
  for await (const p of properties.find({})) {
    propertiesSeen += 1;
    const propertyId: string | undefined =
      typeof p.propertyId === 'string' ? p.propertyId : undefined;
    const portfolioId: string | undefined =
      typeof p.portfolio_id === 'string'
        ? p.portfolio_id
        : typeof p.portfolioId === 'string'
          ? p.portfolioId
          : undefined;

    if (!propertyId || !portfolioId) {
      console.warn(
        `Skipping property with missing ids: _id=${String(p._id)} ` +
          `propertyId=${propertyId ?? 'null'} portfolio_id=${portfolioId ?? 'null'}`,
      );
      continue;
    }

    const existing = await units.findOne({ property_id: propertyId });
    if (existing) {
      unitsSkippedExisting += 1;
      continue;
    }

    // Derive metadata from the most recent lease, if any.
    const latestLease = await leases
      .find({ property_id: propertyId })
      .sort({ updatedAt: -1 })
      .limit(1)
      .next();
    const sp = (latestLease?.lease_information as Record<string, unknown> | undefined)
      ?.spaceAndPremises;

    const extractedName = toTrimmedString(readSpaceField(sp, 'unit'));
    const unitName = extractedName || 'Main';
    const unitCode = normalizeUnitCode(unitName) || 'MAIN';

    const building = toTrimmedString(readSpaceField(sp, 'building'));
    const premises = toTrimmedString(readSpaceField(sp, 'premises'));
    const sqftRentable = toNumber(readSpaceField(sp, 'areaRentable'));
    const sqftUsable = toNumber(readSpaceField(sp, 'areaUsable'));
    const parkingRaw = readSpaceField(sp, 'parking');
    const parkingCount =
      parkingRaw && typeof parkingRaw === 'object' && 'count' in parkingRaw
        ? toNumber((parkingRaw as { count?: unknown }).count)
        : toNumber(parkingRaw);

    const now = new Date();
    try {
      await units.insertOne({
        unitId: newUnitId(),
        portfolio_id: portfolioId,
        property_id: propertyId,
        unit_code: unitCode,
        unit_name: unitName,
        building,
        premises,
        sqft_rentable: sqftRentable,
        sqft_usable: sqftUsable,
        parking_count: parkingCount,
        status: 'active',
        notes: null,
        is_default_migrated: true,
        createdAt: now,
        updatedAt: now,
      });
      unitsCreated += 1;
    } catch (err) {
      // Race: another runner just created one. Treat as skip.
      if ((err as { code?: number })?.code === 11000) {
        unitsSkippedExisting += 1;
        continue;
      }
      throw err;
    }
  }

  // Step 2 — backfill unit_id on dependent collections, per-property.
  for await (const p of properties.find({})) {
    const propertyId: string | undefined =
      typeof p.propertyId === 'string' ? p.propertyId : undefined;
    if (!propertyId) continue;

    const unit = await units.findOne({ property_id: propertyId });
    if (!unit?.unitId) {
      propertiesMissingUnit.push(propertyId);
      continue;
    }
    const unitId = unit.unitId as string;

    const missing = {
      $or: [{ unit_id: { $exists: false } }, { unit_id: null }, { unit_id: '' }],
    };

    const lr = await leases.updateMany(
      { property_id: propertyId, ...missing },
      { $set: { unit_id: unitId } },
    );
    leasesBackfilled += lr.modifiedCount ?? 0;

    const ar = await amendments.updateMany(
      { property_id: propertyId, ...missing },
      { $set: { unit_id: unitId } },
    );
    amendmentsBackfilled += ar.modifiedCount ?? 0;

    const tr = await taskAlerts.updateMany(
      { property_id: propertyId, ...missing },
      { $set: { unit_id: unitId } },
    );
    taskAlertsBackfilled += tr.modifiedCount ?? 0;

    const pr = await propertyAlerts.updateMany(
      { property_id: propertyId, ...missing },
      { $set: { unit_id: unitId } },
    );
    propertyAlertsBackfilled += pr.modifiedCount ?? 0;
  }

  // Step 3 — verify.
  const verify = async (
    coll: mongoose.mongo.Collection,
  ): Promise<number> =>
    coll.countDocuments({
      $or: [{ unit_id: { $exists: false } }, { unit_id: null }, { unit_id: '' }],
    });

  const remainingLeases = await verify(leases);
  const remainingAmendments = await verify(amendments);
  const remainingTaskAlerts = await verify(taskAlerts);
  const remainingPropertyAlerts = await verify(propertyAlerts);

  console.log(
    JSON.stringify(
      {
        uri: maskUri(uri),
        properties_seen: propertiesSeen,
        units_created: unitsCreated,
        units_skipped_existing: unitsSkippedExisting,
        leases_backfilled: leasesBackfilled,
        amendments_backfilled: amendmentsBackfilled,
        task_alerts_backfilled: taskAlertsBackfilled,
        property_alerts_backfilled: propertyAlertsBackfilled,
        properties_missing_unit: propertiesMissingUnit,
        remaining_unit_id_missing: {
          leases: remainingLeases,
          amendments: remainingAmendments,
          task_alerts: remainingTaskAlerts,
          property_alerts: remainingPropertyAlerts,
        },
      },
      null,
      2,
    ),
  );

  await mongoose.disconnect();

  const orphans =
    remainingLeases +
    remainingAmendments +
    remainingTaskAlerts +
    remainingPropertyAlerts;
  if (orphans > 0 || propertiesMissingUnit.length > 0) {
    // Non-zero exit so a deployment pipeline catches it.
    process.exit(2);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
