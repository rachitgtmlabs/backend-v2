"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const dotenv_1 = __importDefault(require("dotenv"));
const path_1 = __importDefault(require("path"));
const mongoose_1 = __importDefault(require("mongoose"));
dotenv_1.default.config({ path: path_1.default.resolve(process.cwd(), '.env') });
const SEEDED_TITLES = [
    'Request prior-year CAM worksheets, invoices summary, and reconciliation from landlord.',
    'Schedule joint walk-through if lease ties CAM or repair obligations to inspection rights.',
    'Add calendar reminders for reconciliation receipt and tenant objection windows.',
    'Catalog excluded expense categories (capital, landlord-specific items) against actual billings.',
];
const uri = process.env.MONGODB_URI?.trim() || 'mongodb://127.0.0.1:27017/lease_iq';
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
    console.log(`Connecting to ${maskUri(uri)} …`);
    await mongoose_1.default.connect(uri);
    const coll = mongoose_1.default.connection.db.collection('property_task_alerts');
    const matchFilter = { title: { $in: SEEDED_TITLES } };
    const matchCount = await coll.countDocuments(matchFilter);
    console.log(`Found ${matchCount} task alerts matching seeded titles.`);
    if (matchCount === 0) {
        await mongoose_1.default.disconnect();
        return;
    }
    const result = await coll.deleteMany(matchFilter);
    console.log(`Deleted ${result.deletedCount} task alerts.`);
    await mongoose_1.default.disconnect();
}
main().catch((e) => {
    console.error(e);
    process.exit(1);
});
//# sourceMappingURL=cleanup-seeded-task-alerts.js.map