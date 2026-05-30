"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const dotenv_1 = __importDefault(require("dotenv"));
const path_1 = __importDefault(require("path"));
const crypto_1 = require("crypto");
const mongoose_1 = __importDefault(require("mongoose"));
const default_expense_categories_1 = require("../src/cam/constants/default-expense-categories");
dotenv_1.default.config({ path: path_1.default.resolve(process.cwd(), '.env') });
const uri = process.env.MONGODB_URI?.trim() || 'mongodb://127.0.0.1:27017/lease_iq';
function newCategoryId() {
    return `exc_${(0, crypto_1.randomBytes)(6).toString('hex')}`;
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
async function main() {
    await mongoose_1.default.connect(uri);
    const db = mongoose_1.default.connection.db;
    if (!db)
        throw new Error('Mongoose connection has no db handle');
    const properties = db.collection('properties');
    const units = db.collection('units');
    const expenseCategories = db.collection('expense_categories');
    const propertyKindResult = await properties.updateMany({
        $or: [
            { property_kind: { $exists: false } },
            { property_kind: null },
            { property_kind: '' },
        ],
    }, { $set: { property_kind: 'single_unit' } });
    const occupancyResult = await units.updateMany({
        $or: [
            { occupancy_status: { $exists: false } },
            { occupancy_status: null },
            { occupancy_status: '' },
        ],
    }, { $set: { occupancy_status: 'occupied' } });
    let categoriesCreated = 0;
    let categoriesSkippedExisting = 0;
    const now = new Date();
    for (const cat of default_expense_categories_1.DEFAULT_EXPENSE_CATEGORIES) {
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
        }
        catch (err) {
            if (err?.code === 11000) {
                categoriesSkippedExisting += 1;
                continue;
            }
            throw err;
        }
    }
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
    console.log(JSON.stringify({
        uri: maskUri(uri),
        property_kind_set: propertyKindResult.modifiedCount,
        occupancy_status_set: occupancyResult.modifiedCount,
        categories_created: categoriesCreated,
        categories_skipped_existing: categoriesSkippedExisting,
        verify: {
            properties_missing_kind: propertiesMissingKind,
            units_missing_occupancy: unitsMissingOccupancy,
            system_category_count: systemCategoryCount,
            expected_system_categories: default_expense_categories_1.DEFAULT_EXPENSE_CATEGORIES.length,
        },
    }, null, 2));
    await mongoose_1.default.disconnect();
    const failed = propertiesMissingKind > 0 ||
        unitsMissingOccupancy > 0 ||
        systemCategoryCount !== default_expense_categories_1.DEFAULT_EXPENSE_CATEGORIES.length;
    if (failed) {
        process.exit(2);
    }
}
function escapeRegex(s) {
    return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
main().catch((e) => {
    console.error(e);
    process.exit(1);
});
//# sourceMappingURL=migrate-cam-phase1.js.map