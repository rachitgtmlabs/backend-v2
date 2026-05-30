"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const dotenv_1 = __importDefault(require("dotenv"));
const path_1 = __importDefault(require("path"));
const crypto_1 = require("crypto");
const mongoose_1 = __importDefault(require("mongoose"));
const normalize_unit_code_util_1 = require("../src/unit/utils/normalize-unit-code.util");
dotenv_1.default.config({ path: path_1.default.resolve(process.cwd(), '.env') });
const uri = process.env.MONGODB_URI?.trim() ||
    'mongodb://127.0.0.1:27017/lease_iq';
function newUnitId() {
    return `unt_${(0, crypto_1.randomBytes)(6).toString('hex')}`;
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
function readSpaceField(sp, key) {
    if (!sp || typeof sp !== 'object')
        return undefined;
    const node = sp[key];
    if (node && typeof node === 'object' && 'value' in node) {
        return node.value;
    }
    return node;
}
function toNumber(v) {
    if (typeof v === 'number' && Number.isFinite(v))
        return v;
    if (typeof v === 'string') {
        const cleaned = v.replace(/[^0-9.\-]/g, '');
        if (!cleaned)
            return null;
        const n = Number(cleaned);
        return Number.isFinite(n) ? n : null;
    }
    return null;
}
function toTrimmedString(v) {
    if (typeof v !== 'string')
        return null;
    const t = v.trim();
    return t.length > 0 ? t : null;
}
async function main() {
    await mongoose_1.default.connect(uri);
    const db = mongoose_1.default.connection.db;
    if (!db)
        throw new Error('Mongoose connection has no db handle');
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
    const propertiesMissingUnit = [];
    for await (const p of properties.find({})) {
        propertiesSeen += 1;
        const propertyId = typeof p.propertyId === 'string' ? p.propertyId : undefined;
        const portfolioId = typeof p.portfolio_id === 'string'
            ? p.portfolio_id
            : typeof p.portfolioId === 'string'
                ? p.portfolioId
                : undefined;
        if (!propertyId || !portfolioId) {
            console.warn(`Skipping property with missing ids: _id=${String(p._id)} ` +
                `propertyId=${propertyId ?? 'null'} portfolio_id=${portfolioId ?? 'null'}`);
            continue;
        }
        const existing = await units.findOne({ property_id: propertyId });
        if (existing) {
            unitsSkippedExisting += 1;
            continue;
        }
        const latestLease = await leases
            .find({ property_id: propertyId })
            .sort({ updatedAt: -1 })
            .limit(1)
            .next();
        const sp = latestLease?.lease_information
            ?.spaceAndPremises;
        const extractedName = toTrimmedString(readSpaceField(sp, 'unit'));
        const unitName = extractedName || 'Main';
        const unitCode = (0, normalize_unit_code_util_1.normalizeUnitCode)(unitName) || 'MAIN';
        const building = toTrimmedString(readSpaceField(sp, 'building'));
        const premises = toTrimmedString(readSpaceField(sp, 'premises'));
        const sqftRentable = toNumber(readSpaceField(sp, 'areaRentable'));
        const sqftUsable = toNumber(readSpaceField(sp, 'areaUsable'));
        const parkingRaw = readSpaceField(sp, 'parking');
        const parkingCount = parkingRaw && typeof parkingRaw === 'object' && 'count' in parkingRaw
            ? toNumber(parkingRaw.count)
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
        }
        catch (err) {
            if (err?.code === 11000) {
                unitsSkippedExisting += 1;
                continue;
            }
            throw err;
        }
    }
    for await (const p of properties.find({})) {
        const propertyId = typeof p.propertyId === 'string' ? p.propertyId : undefined;
        if (!propertyId)
            continue;
        const unit = await units.findOne({ property_id: propertyId });
        if (!unit?.unitId) {
            propertiesMissingUnit.push(propertyId);
            continue;
        }
        const unitId = unit.unitId;
        const missing = {
            $or: [{ unit_id: { $exists: false } }, { unit_id: null }, { unit_id: '' }],
        };
        const lr = await leases.updateMany({ property_id: propertyId, ...missing }, { $set: { unit_id: unitId } });
        leasesBackfilled += lr.modifiedCount ?? 0;
        const ar = await amendments.updateMany({ property_id: propertyId, ...missing }, { $set: { unit_id: unitId } });
        amendmentsBackfilled += ar.modifiedCount ?? 0;
        const tr = await taskAlerts.updateMany({ property_id: propertyId, ...missing }, { $set: { unit_id: unitId } });
        taskAlertsBackfilled += tr.modifiedCount ?? 0;
        const pr = await propertyAlerts.updateMany({ property_id: propertyId, ...missing }, { $set: { unit_id: unitId } });
        propertyAlertsBackfilled += pr.modifiedCount ?? 0;
    }
    const verify = async (coll) => coll.countDocuments({
        $or: [{ unit_id: { $exists: false } }, { unit_id: null }, { unit_id: '' }],
    });
    const remainingLeases = await verify(leases);
    const remainingAmendments = await verify(amendments);
    const remainingTaskAlerts = await verify(taskAlerts);
    const remainingPropertyAlerts = await verify(propertyAlerts);
    console.log(JSON.stringify({
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
    }, null, 2));
    await mongoose_1.default.disconnect();
    const orphans = remainingLeases +
        remainingAmendments +
        remainingTaskAlerts +
        remainingPropertyAlerts;
    if (orphans > 0 || propertiesMissingUnit.length > 0) {
        process.exit(2);
    }
}
main().catch((e) => {
    console.error(e);
    process.exit(1);
});
//# sourceMappingURL=migrate-units.js.map