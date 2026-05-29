/**
 * CAM Reconciliation — Phase 1 migration (idempotent).
 *
 *  1. property_kind         — set to 'single_unit' on every existing property
 *                              that doesn't already have the field. The Units
 *                              migration created exactly one Unit per legacy
 *                              property, so single_unit is the correct default.
 *  2. occupancy_status      — set to 'occupied' on every existing Unit. The
 *                              CAM engine treats `vacant` as "skip"; legacy
 *                              units default to occupied to preserve existing
 *                              behavior. Admins can flip individual units to
 *                              vacant via the UI.
 *  3. expense_categories    — seed the 15 system defaults if they don't exist.
 *                              Custom (per-portfolio) categories untouched.
 *
 * Safe to re-run — each step is guarded by an existence check and a sparse
 * unique index in the schema. Prints a JSON summary on completion.
 *
 * Run from lease-backend-v2 (loads `.env` from this package root):
 *   npm run migrate:cam-phase1
 */
import dotenv from 'dotenv';
import path from 'path';
import { randomBytes } from 'crypto';
import mongoose from 'mongoose';

import { DEFAULT_EXPENSE_CATEGORIES } from '../src/cam/constants/default-expense-categories';

dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const uri =
  process.env.MONGODB_URI?.trim() || 'mongodb://127.0.0.1:27017/lease_iq';

function newCategoryId(): string {
  return `exc_${randomBytes(6).toString('hex')}`;
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

async function main() {
  await mongoose.connect(uri);
  const db = mongoose.connection.db;
  if (!db) throw new Error('Mongoose connection has no db handle');

  const properties = db.collection('properties');
  const units = db.collection('units');
  const expenseCategories = db.collection('expense_categories');

  // ── Step 1: property_kind ──────────────────────────────────────────
  const propertyKindResult = await properties.updateMany(
    {
      $or: [
        { property_kind: { $exists: false } },
        { property_kind: null },
        { property_kind: '' },
      ],
    },
    { $set: { property_kind: 'single_unit' } },
  );

  // ── Step 2: occupancy_status ───────────────────────────────────────
  const occupancyResult = await units.updateMany(
    {
      $or: [
        { occupancy_status: { $exists: false } },
        { occupancy_status: null },
        { occupancy_status: '' },
      ],
    },
    { $set: { occupancy_status: 'occupied' } },
  );

  // ── Step 3: seed system expense categories ────────────────────────
  let categoriesCreated = 0;
  let categoriesSkippedExisting = 0;
  const now = new Date();
  for (const cat of DEFAULT_EXPENSE_CATEGORIES) {
    // System categories have portfolio_id=null. We match case-insensitively
    // to avoid duplicate rows when the user ran a prior partial seed with
    // different casing.
    const existing = await expenseCategories.findOne({
      portfolio_id: null,
      is_system: true,
      name: { $regex: `^${escapeRegex(cat.name)}$`, $options: 'i' },
    });
    if (existing) {
      categoriesSkippedExisting += 1;
      continue;
    }
    try {
      await expenseCategories.insertOne({
        categoryId: newCategoryId(),
        portfolio_id: null,
        name: cat.name,
        description: cat.description,
        recoverable: true,
        is_system: true,
        notes: null,
        created_by: 'system',
        createdAt: now,
        updatedAt: now,
      });
      categoriesCreated += 1;
    } catch (err) {
      if ((err as { code?: number })?.code === 11000) {
        // Race or collation-strength-2 dedup caught it. Treat as skip.
        categoriesSkippedExisting += 1;
        continue;
      }
      throw err;
    }
  }

  // ── Step 4: verify ─────────────────────────────────────────────────
  const propertiesMissingKind = await properties.countDocuments({
    property_kind: { $exists: false },
  });
  const unitsMissingOccupancy = await units.countDocuments({
    occupancy_status: { $exists: false },
  });
  const systemCategoryCount = await expenseCategories.countDocuments({
    is_system: true,
    portfolio_id: null,
  });

  console.log(
    JSON.stringify(
      {
        uri: maskUri(uri),
        property_kind_set: propertyKindResult.modifiedCount,
        occupancy_status_set: occupancyResult.modifiedCount,
        categories_created: categoriesCreated,
        categories_skipped_existing: categoriesSkippedExisting,
        verify: {
          properties_missing_kind: propertiesMissingKind,
          units_missing_occupancy: unitsMissingOccupancy,
          system_category_count: systemCategoryCount,
          expected_system_categories: DEFAULT_EXPENSE_CATEGORIES.length,
        },
      },
      null,
      2,
    ),
  );

  await mongoose.disconnect();

  const failed =
    propertiesMissingKind > 0 ||
    unitsMissingOccupancy > 0 ||
    systemCategoryCount !== DEFAULT_EXPENSE_CATEGORIES.length;
  if (failed) {
    process.exit(2);
  }
}

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
